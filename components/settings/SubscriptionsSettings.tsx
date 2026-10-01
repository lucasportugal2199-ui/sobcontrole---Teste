import React, { useContext, useState, useMemo } from 'react';
import {
    PlusIcon, EditIcon, TrashIcon, RepeatIcon, CreditCardIcon, BankIcon,
    SparklesIcon, CheckCircleIcon, ArrowRightIcon
} from '../icons';
import { AppContext } from '../../context/AppContext';
import { Transaction } from '../../types';
import { useTranslation } from '../../i18n';
import { formatCurrency, parseCurrency, formatCurrencyForInput } from '../../utils/helpers';
import {
    getInstallmentList,
    getFutureBurdenChart,
    getFinancialReliefInsight,
    getCurrentMonthKey,
    cleanServiceName
} from '../../utils/installmentsHelper';
import Modal from '../Modal';

interface SubscriptionsSettingsProps {
    isAddModalOpen?: boolean;
    setIsAddModalOpen?: (open: boolean) => void;
    initialTab?: 'installments' | 'subscriptions';
}

const SubscriptionsSettings: React.FC<SubscriptionsSettingsProps> = ({
    isAddModalOpen: externalIsAddModalOpen,
    setIsAddModalOpen: externalSetIsAddModalOpen,
    initialTab = 'installments'
}) => {
    const context = useContext(AppContext);
    if (!context) throw new Error("SubscriptionsSettings missing AppContext");

    const {
        allTransactions, creditCards, accounts,
        handleLancamentoSubmit, handleDeleteRecurringSeries, showToast,
        handleAddSubscription
    } = context;

    const { locale, currency } = useTranslation();
    const appLocale = locale === 'pt' ? 'pt-BR' : locale === 'en' ? 'en-US' : locale === 'es' ? 'es-ES' : locale === 'fr' ? 'fr-FR' : 'de-DE';
    const appCurrency = currency || 'BRL';

    // Aba principal: 'installments' (Compras Parceladas) ou 'subscriptions' (Assinaturas e Fixos)
    const [tabMode, setTabMode] = useState<'installments' | 'subscriptions'>(initialTab);

    // Filtro por cartão de crédito na aba de parcelas
    const [selectedCardId, setSelectedCardId] = useState<string>('all');

    // Mês focado no gráfico interativo de projeção (0 = mês atual, 1 = próximo...)
    const [focusedMonthIndex, setFocusedMonthIndex] = useState<number>(0);

    // State for modal
    const [internalIsAddModalOpen, setInternalIsAddModalOpen] = useState(false);
    const isModalOpen = externalIsAddModalOpen !== undefined ? externalIsAddModalOpen : internalIsAddModalOpen;
    const setIsModalOpen = externalSetIsAddModalOpen || setInternalIsAddModalOpen;

    const [editingTx, setEditingTx] = useState<Transaction | null>(null);
    const [deletingTx, setDeletingTx] = useState<Transaction | null>(null);

    const [form, setForm] = useState({
        name: '',
        price: '',
        day: '10',
        paymentType: 'credito' as 'credito' | 'debito',
        cardId: '',
        accountId: '',
        category: 'Assinaturas'
    });

    // Helper para limpar sufixos como (1/12) ou (12/12)
    const cleanServiceName = (rawDesc: string) => {
        return rawDesc.replace(/\s*\(\d+\/\d+\)\s*$/, '').trim();
    };

    // Ícone inteligente baseado no nome do serviço
    const getServiceDetails = (name: string) => {
        const lower = name.toLowerCase();
        if (lower.includes('netflix')) return { icon: '🎬', bg: '#E50914' };
        if (lower.includes('spotify')) return { icon: '🎵', bg: '#1DB954' };
        if (lower.includes('apple') || lower.includes('icloud')) return { icon: '🍎', bg: '#1E293B' };
        if (lower.includes('amazon') || lower.includes('prime')) return { icon: '📦', bg: '#00A8E1' };
        if (lower.includes('youtube')) return { icon: '▶️', bg: '#DC2626' };
        if (lower.includes('chatgpt') || lower.includes('openai')) return { icon: '🤖', bg: '#10B981' };
        if (lower.includes('disney')) return { icon: '🏰', bg: '#2563EB' };
        if (lower.includes('hbo') || lower.includes('max')) return { icon: '📺', bg: '#002BE7' };
        if (lower.includes('internet') || lower.includes('fibra') || lower.includes('claro') || lower.includes('vivo')) return { icon: '🌐', bg: '#0284C7' };
        if (lower.includes('luz') || lower.includes('energia') || lower.includes('enel') || lower.includes('copel')) return { icon: '⚡', bg: '#EAB308' };
        if (lower.includes('agua') || lower.includes('água') || lower.includes('sanepar') || lower.includes('sabesp')) return { icon: '💧', bg: '#06B6D4' };
        if (lower.includes('gym') || lower.includes('academia') || lower.includes('smart fit')) return { icon: '🏋️', bg: '#EA580C' };
        if (lower.includes('ifood') || lower.includes('delivery')) return { icon: '🍔', bg: '#EA1D2C' };
        if (lower.includes('google') || lower.includes('drive') || lower.includes('one')) return { icon: '☁️', bg: '#4285F4' };
        return { icon: '🔄', bg: '#6366F1' };
    };

    // Filtra e agrupa transações recorrentes (Assinaturas)
    // Apenas transações com categoria 'Assinaturas' aparecem aqui.
    // Transações fixas de outras categorias NÃO são exibidas.
    const recurringList = useMemo(() => {
        const list = allTransactions.filter(t => {
            if (t.installment && t.installment.total > 1) return false;
            if (t.recurrenceId?.startsWith('inst-')) return false;
            // Somente categoria Assinaturas ou descrição começando com 'assinatura'
            const lowerDesc = (t.descricao || '').toLowerCase();
            return t.categoria === 'Assinaturas' || lowerDesc.startsWith('assinatura ');
        });
        
        const map = new Map<string, Transaction>();
        list.forEach(tx => {
            const cleanKey = tx.recurrenceId || cleanServiceName(tx.descricao).toLowerCase();
            if (!map.has(cleanKey) || new Date(tx.data) > new Date(map.get(cleanKey)!.data)) {
                map.set(cleanKey, tx);
            }
        });

        return Array.from(map.values());
    }, [allTransactions]);

    // Total mensal de assinaturas
    const totalMonthlySubscriptions = useMemo(() => {
        return recurringList.reduce((acc, curr) => acc + (curr.tipo === 'saida' ? curr.valor : 0), 0);
    }, [recurringList]);

    const totalAnnualSubscriptions = totalMonthlySubscriptions * 12;

    // Mês atual em formato YYYY-MM
    const currentMonthKey = useMemo(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }, []);

    // Filtra e agrupa compras parceladas (Parcelas)
    const installmentList = useMemo(() => {
        return getInstallmentList(allTransactions, creditCards, appLocale, currentMonthKey, selectedCardId);
    }, [allTransactions, creditCards, selectedCardId, appLocale, currentMonthKey]);

    // Totais de parcelas
    const totalInstallmentsThisMonth = useMemo(() => {
        return installmentList.reduce((acc, item) => {
            const thisMonthTx = item.rawTransactions.find(t => t.data.substring(0, 7) === currentMonthKey);
            return acc + (thisMonthTx ? thisMonthTx.valor : 0);
        }, 0);
    }, [installmentList, currentMonthKey]);

    const totalInstallmentsRemaining = useMemo(() => {
        return installmentList.reduce((acc, curr) => acc + curr.totalRemaining, 0);
    }, [installmentList]);

    // Dados do gráfico de projeção futura (8 meses)
    const futureBurdenChart = useMemo(() => {
        return getFutureBurdenChart(installmentList, appLocale);
    }, [installmentList, appLocale]);

    // Mês atualmente selecionado para destaque
    const activeFocusedMonth = futureBurdenChart[focusedMonthIndex] || futureBurdenChart[0];

    // Insight inteligente de alívio financeiro
    const financialReliefInsight = useMemo(() => {
        return getFinancialReliefInsight(installmentList, totalInstallmentsThisMonth, futureBurdenChart);
    }, [installmentList, totalInstallmentsThisMonth, futureBurdenChart]);

    const openAddModal = () => {
        setEditingTx(null);
        setForm({
            name: '',
            price: '',
            day: '10',
            paymentType: creditCards.length > 0 ? 'credito' : 'debito',
            cardId: creditCards[0]?.id || '',
            accountId: accounts[0]?.id || '',
            category: 'Assinaturas'
        });
        setIsModalOpen(true);
    };

    const openEditModal = (tx: Transaction) => {
        setEditingTx(tx);
        const dayMatch = tx.data ? tx.data.split('-')[2] : '10';
        setForm({
            name: cleanServiceName(tx.descricao),
            price: formatCurrencyForInput(tx.valor.toFixed(2)),
            day: String(parseInt(dayMatch, 10) || 10),
            paymentType: (tx.paymentMethod === 'credito' ? 'credito' : 'debito') as any,
            cardId: tx.cardId || (creditCards[0]?.id || ''),
            accountId: tx.accountId || (accounts[0]?.id || ''),
            category: tx.categoria || 'Assinaturas'
        });
        setIsModalOpen(true);
    };

    const handleSave = () => {
        if (!form.name.trim() || !form.price) {
            showToast('Preencha o nome e o valor da assinatura.', 'error');
            return;
        }

        const valueNum = parseCurrency(form.price);
        if (valueNum <= 0) {
            showToast('Informe um valor válido.', 'error');
            return;
        }

        if (form.paymentType === 'credito' && creditCards.length > 0 && !form.cardId) {
            form.cardId = creditCards[0].id;
        }
        if (form.paymentType === 'debito' && accounts.length > 0 && !form.accountId) {
            form.accountId = accounts[0].id;
        }

        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const dayStr = String(form.day).padStart(2, '0');
        const dateFormatted = `${year}-${month}-${dayStr}`;

        const payload: any = {
            descricao: form.name.trim(),
            valor: valueNum,
            tipo: 'saida',
            categoria: form.category,
            data: dateFormatted,
            paymentMethod: form.paymentType,
            cardId: form.paymentType === 'credito' ? form.cardId : undefined,
            accountId: form.paymentType === 'debito' ? form.accountId : undefined,
            isRecurring: true,
            recurrenceQuantity: 12,
            isInstallment: false
        };

        if (editingTx) {
            handleDeleteRecurringSeries(editingTx);
        }

        handleLancamentoSubmit({ preventDefault: () => {} } as any, payload);

        if (!editingTx && handleAddSubscription) {
            handleAddSubscription({
                name: form.name.trim(),
                cost: valueNum,
                billingCycle: 'monthly',
                nextBillingDate: dateFormatted,
                color: '#6366F1'
            });
        }

        showToast(editingTx ? 'Assinatura atualizada!' : 'Assinatura cadastrada com sucesso!', 'success');
        setIsModalOpen(false);
    };

    const confirmDelete = () => {
        if (deletingTx) {
            handleDeleteRecurringSeries(deletingTx);
            setDeletingTx(null);
        }
    };

    return (
        <div className="space-y-5 max-w-lg mx-auto pb-8">
            {/* Seletor Segmentado */}
            <div className="bg-slate-200/80 dark:bg-dark-card p-1 rounded-2xl border border-slate-300/50 dark:border-white/[0.06] shadow-inner flex items-center gap-1 transition-colors">
                <button
                    type="button"
                    onClick={() => setTabMode('installments')}
                    className={`flex-1 py-2 px-2 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 ${
                        tabMode === 'installments'
                            ? 'bg-white dark:bg-dark-elevated text-slate-900 dark:text-white border border-transparent dark:border-white/10 shadow-sm font-extrabold'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                    <CreditCardIcon className="h-3.5 w-3.5 shrink-0 stroke-[2.2]" />
                    <span>Parceladas</span>
                    {installmentList.length > 0 && (
                        <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black shrink-0 ${
                            tabMode === 'installments'
                                ? 'bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white'
                                : 'bg-slate-300/60 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}>
                            {installmentList.length}
                        </span>
                    )}
                </button>

                <button
                    type="button"
                    onClick={() => setTabMode('subscriptions')}
                    className={`flex-1 py-2 px-2 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 ${
                        tabMode === 'subscriptions'
                            ? 'bg-white dark:bg-dark-elevated text-slate-900 dark:text-white border border-transparent dark:border-white/10 shadow-sm font-extrabold'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                    <RepeatIcon className="h-3.5 w-3.5 shrink-0 stroke-[2.2]" />
                    <span>Assinaturas</span>
                    {recurringList.length > 0 && (
                        <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black shrink-0 ${
                            tabMode === 'subscriptions'
                                ? 'bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white'
                                : 'bg-slate-300/60 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}>
                            {recurringList.length}
                        </span>
                    )}
                </button>
            </div>

            {/* CONTEÚDO DA ABA DE COMPRAS PARCELADAS (DESIGN ORIGINAL SOBCONTROLE) */}
            {tabMode === 'installments' && (
                <>
                    {/* Hero Card: Radar de Comprometimento Futuro */}
                    <div className="bg-white dark:bg-dark-card border border-slate-200/80 dark:border-white/[0.06] rounded-3xl p-5 shadow-lg relative overflow-hidden transition-colors">
                        {/* Ambient glow sutil */}
                        <div className="absolute -top-16 -right-16 w-44 h-44 bg-[#EA580C]/5 dark:bg-[#EA580C]/5 rounded-full blur-3xl pointer-events-none" />

                        {/* Top Header do Radar */}
                        <div className="flex items-center justify-between relative z-10 mb-4">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-[#FFEDD5] dark:bg-[#431407] text-[#EA580C] dark:text-[#F97316] flex items-center justify-center shrink-0">
                                    <SparklesIcon className="h-4 w-4 stroke-[2.5]" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight leading-none">
                                        Radar de Parcelamentos
                                    </h3>
                                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                                        Projeção do comprometimento de faturas
                                    </p>
                                </div>
                            </div>

                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-white/10">
                                {installmentList.length} {installmentList.length === 1 ? 'ativo' : 'ativos'}
                            </span>
                        </div>

                        {/* Métricas Principais em Grid */}
                        <div className="grid grid-cols-2 gap-3 relative z-10 mb-5">
                            <div className="bg-slate-50 dark:bg-dark-elevated/70 border border-slate-200/70 dark:border-white/[0.06] rounded-2xl p-3.5 shadow-sm">
                                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                                    Comprometido no Mês
                                </span>
                                <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight block">
                                    {formatCurrency(totalInstallmentsThisMonth, appLocale, appCurrency)}
                                </span>
                                <span className="text-[10px] font-semibold text-slate-500 dark:text-dark-text-muted mt-1 block">
                                    Próxima fatura
                                </span>
                            </div>

                            <div className="bg-slate-50 dark:bg-dark-elevated/70 border border-slate-200/70 dark:border-white/[0.06] rounded-2xl p-3.5 shadow-sm">
                                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                                    Saldo Devedor Futuro
                                </span>
                                <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight block">
                                    {formatCurrency(totalInstallmentsRemaining, appLocale, appCurrency)}
                                </span>
                                <span className="text-[10px] font-semibold text-slate-500 dark:text-dark-text-muted mt-1 block">
                                    Total a liquidar
                                </span>
                            </div>
                        </div>

                        {/* Gráfico Interativo de Projeção Mensal */}
                        <div className="relative z-10 pt-1">
                            <div className="flex items-center justify-between mb-2 px-0.5">
                                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                    Evolução (Próximos 8 Meses)
                                </span>
                                {activeFocusedMonth && (
                                    <span className="text-xs font-black text-slate-900 dark:text-[#EA580C]">
                                        {activeFocusedMonth.fullMonthName}: {formatCurrency(activeFocusedMonth.total, appLocale, appCurrency)}
                                    </span>
                                )}
                            </div>

                            <div className="bg-slate-50 dark:bg-dark-elevated/40 border border-slate-200/60 dark:border-white/[0.06] rounded-2xl p-3 flex items-end justify-between gap-1.5 h-28">
                                {futureBurdenChart.map((m) => {
                                    const isFocused = m.index === focusedMonthIndex;
                                    return (
                                        <button
                                            key={m.index}
                                            type="button"
                                            onClick={() => setFocusedMonthIndex(m.index)}
                                            className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group transition-all"
                                        >
                                            <div className="w-full bg-slate-200/70 dark:bg-white/5 rounded-xl overflow-hidden flex items-end h-full p-0.5">
                                                <div
                                                    className={`w-full transition-all duration-300 rounded-lg ${
                                                        isFocused
                                                            ? 'bg-[#EA580C] shadow-md shadow-[#EA580C]/30'
                                                            : m.isCurrent
                                                            ? 'bg-slate-700 dark:bg-white'
                                                            : 'bg-slate-300 dark:bg-white/20 group-hover:bg-[#EA580C]/60'
                                                    }`}
                                                    style={{ height: `${m.heightPercent}%` }}
                                                />
                                            </div>
                                            <span className={`text-[9px] font-bold tracking-tight transition-colors ${
                                                isFocused
                                                    ? 'text-slate-900 dark:text-[#EA580C] font-black scale-105'
                                                    : m.isCurrent
                                                    ? 'text-slate-900 dark:text-white font-extrabold'
                                                    : 'text-slate-500 dark:text-slate-400'
                                            }`}>
                                                {m.label}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Insight Inteligente de Alívio */}
                            {financialReliefInsight && (
                                <div className="mt-3 flex items-start gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs">
                                    <CheckCircleIcon className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                                    <p className="leading-snug">
                                        Em <strong>{financialReliefInsight.month}</strong> suas parcelas caem em <strong>{financialReliefInsight.percentDrop}%</strong>, liberando <strong>{formatCurrency(financialReliefInsight.amountRelieved, appLocale, appCurrency)}</strong> no seu orçamento mensal!
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Filtro por Cartão em Chips Modernos */}
                    {creditCards.length > 0 && (
                        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
                            <button
                                type="button"
                                onClick={() => setSelectedCardId('all')}
                                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                                    selectedCardId === 'all'
                                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-sm'
                                        : 'bg-white dark:bg-dark-card text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/[0.06] hover:border-slate-300 dark:hover:border-white/15'
                                }`}
                            >
                                Todos os Cartões ({installmentList.length})
                            </button>
                            {creditCards.map(card => {
                                const count = installmentList.filter(i => i.cardId === card.id).length;
                                const isSelected = selectedCardId === card.id;
                                return (
                                    <button
                                        key={card.id}
                                        type="button"
                                        onClick={() => setSelectedCardId(card.id)}
                                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border flex items-center gap-1.5 ${
                                            isSelected
                                                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-sm'
                                                : 'bg-white dark:bg-dark-card text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/[0.06] hover:border-slate-300 dark:hover:border-white/15'
                                        }`}
                                    >
                                        <div
                                            className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                                            style={{ backgroundColor: card.color || '#3B82F6' }}
                                        />
                                        <span>{card.name}</span>
                                        <span className="opacity-60 text-[11px]">({count})</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Lista de Compras Parceladas com Design SobControle */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                                Compras Parceladas Ativas
                            </span>
                            <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                                {installmentList.length} {installmentList.length === 1 ? 'parcelamento' : 'parcelamentos'}
                            </span>
                        </div>

                        {installmentList.length === 0 ? (
                            <div className="text-center py-12 px-5 bg-white dark:bg-dark-card border border-dashed border-slate-300 dark:border-white/[0.08] rounded-3xl transition-colors">
                                <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 flex items-center justify-center">
                                    <CreditCardIcon className="h-6 w-6 stroke-[2]" />
                                </div>
                                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                                    Nenhum parcelamento encontrado
                                </h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 max-w-xs mx-auto leading-relaxed">
                                    Ao lançar uma compra parcelada no botão <strong>+</strong>, ela será catalogada aqui automaticamente com todo o cronograma futuro.
                                </p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {installmentList.map(item => {
                                    const progressPercent = Math.min(100, Math.round((item.paidParcelsCount / item.totalParcels) * 100));

                                    return (
                                        <div
                                            key={item.id}
                                            className="bg-white dark:bg-dark-card border border-slate-200/80 dark:border-white/[0.06] rounded-3xl p-5 space-y-3.5 shadow-sm hover:border-slate-300 dark:hover:border-white/15 transition-all"
                                        >
                                            {/* Topo do Card de Parcela */}
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <h4 className="text-sm font-extrabold text-slate-900 dark:text-white leading-tight truncate">
                                                            {item.name}
                                                        </h4>
                                                        <span className="text-[10px] font-black text-slate-700 dark:text-white bg-slate-100 dark:bg-white/10 border border-slate-200/60 dark:border-white/10 px-2.5 py-0.5 rounded-full shrink-0">
                                                            {item.currentParcel} de {item.totalParcels}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
                                                        <span>{item.cardName}</span>
                                                        <span>•</span>
                                                        <span className="font-medium text-slate-700 dark:text-slate-300">
                                                            Quita em {item.lastDate}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="text-right shrink-0">
                                                    <span className="text-base font-black text-slate-900 dark:text-white block tracking-tight">
                                                        {formatCurrency(item.monthlyValue, appLocale, appCurrency)}
                                                    </span>
                                                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                                                        por mês
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Barra de Progresso Estilizada */}
                                            <div className="space-y-2">
                                                <div className="w-full bg-slate-100 dark:bg-dark-elevated h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-200/60 dark:border-white/[0.06]">
                                                    <div
                                                        className="bg-gradient-to-r from-amber-500 to-[#EA580C] h-full rounded-full transition-all duration-500 shadow-sm"
                                                        style={{ width: `${progressPercent}%` }}
                                                    />
                                                </div>

                                                <div className="flex justify-between items-center text-[11px] font-semibold text-slate-500 dark:text-slate-400 pt-0.5">
                                                    <span className="flex items-center gap-1.5">
                                                        <CheckCircleIcon className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                                        <span>Pago: {formatCurrency(item.totalPaid, appLocale, appCurrency)}</span>
                                                    </span>
                                                    <span className="font-bold text-slate-700 dark:text-slate-300">
                                                        Resta: {formatCurrency(item.totalRemaining, appLocale, appCurrency)} <span className="opacity-60 font-medium">({item.remainingParcelsCount}x)</span>
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* CONTEÚDO DA ABA DE ASSINATURAS (DESIGN ORIGINAL SOBCONTROLE) */}
            {tabMode === 'subscriptions' && (
                <>
                    {/* Banner de Compromisso Mensal Recorrente */}
                    <div className="bg-gradient-to-br from-slate-900 to-[#111111] dark:from-dark-elevated dark:to-dark-card rounded-3xl p-5 shadow-xl text-white relative overflow-hidden border border-slate-800 dark:border-white/[0.08]">
                        <div className="relative z-10 flex justify-between items-start">
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-[#EA580C] dark:text-[#F97316] block mb-1">
                                    Compromisso Mensal Recorrente
                                </span>
                                <div className="flex items-baseline gap-1.5 my-1">
                                    <span className="text-3xl sm:text-4xl font-black tracking-tight">
                                        {formatCurrency(totalMonthlySubscriptions, appLocale, appCurrency)}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-300 dark:text-dark-text-secondary font-medium mt-2">
                                    {recurringList.length} {recurringList.length === 1 ? 'assinatura ativa' : 'assinaturas ativas'} • ≈ {formatCurrency(totalAnnualSubscriptions, appLocale, appCurrency)}/ano
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={openAddModal}
                                className="px-3.5 py-2 bg-[#EA580C] hover:bg-[#F97316] text-white font-black text-xs rounded-2xl active:scale-95 transition-all shadow-md flex items-center gap-1.5"
                            >
                                <PlusIcon className="h-3.5 w-3.5 stroke-[3]" />
                                <span>Adicionar</span>
                            </button>
                        </div>
                        <div className="absolute -right-6 -bottom-6 w-36 h-36 bg-[#EA580C]/5 rounded-full blur-2xl pointer-events-none" />
                    </div>

                    {/* Lista de Assinaturas */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                                Assinaturas
                            </span>
                            <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                                {recurringList.length} ativas
                            </span>
                        </div>

                        {recurringList.length === 0 ? (
                            <div 
                                onClick={openAddModal}
                                className="text-center py-12 px-5 bg-white dark:bg-dark-card border border-dashed border-slate-300 dark:border-white/[0.08] rounded-3xl cursor-pointer hover:border-slate-400 dark:hover:border-white/20 transition-all group"
                            >
                                <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <RepeatIcon className="h-6 w-6 stroke-[2]" />
                                </div>
                                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                                    Nenhuma assinatura cadastrada
                                </h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                                    Toque aqui para cadastrar serviços com categoria <strong>Assinaturas</strong> como Netflix, Spotify ou academia.
                                </p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2.5">
                                {recurringList.map(tx => {
                                    const displayName = cleanServiceName(tx.descricao);
                                    const details = getServiceDetails(displayName);
                                    const day = tx.data ? tx.data.split('-')[2] : '10';

                                    let paymentLabel = 'Débito em Conta';
                                    if (tx.paymentMethod === 'credito') {
                                        const card = creditCards.find(c => c.id === tx.cardId);
                                        paymentLabel = card ? card.name : (creditCards[0]?.name || 'Cartão de Crédito');
                                    } else if (tx.accountId) {
                                        const acc = accounts.find(a => a.id === tx.accountId);
                                        paymentLabel = acc ? acc.bankName : (accounts[0]?.bankName || 'Conta Bancária');
                                    }

                                    return (
                                        <div
                                            key={tx.id}
                                            onClick={() => openEditModal(tx)}
                                            className="bg-white dark:bg-dark-card border border-slate-200/80 dark:border-white/[0.06] rounded-2xl p-4 flex items-center justify-between hover:border-slate-300 dark:hover:border-white/15 transition-all cursor-pointer group shadow-sm active:scale-[0.99]"
                                        >
                                            <div className="flex items-center gap-3.5 min-w-0">
                                                <div
                                                    className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg shrink-0 shadow-sm text-white"
                                                    style={{ backgroundColor: details.bg }}
                                                >
                                                    {details.icon}
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight truncate group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                                                        {displayName}
                                                    </h4>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                                        Dia {day} • {paymentLabel}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2.5 shrink-0 ml-3">
                                                <div className="text-right">
                                                    <span className="text-sm font-black text-slate-900 dark:text-white block">
                                                        {formatCurrency(tx.valor, appLocale, appCurrency)}
                                                    </span>
                                                    <span className="inline-block text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/10 border border-slate-200/50 dark:border-white/10 px-2 py-0.5 rounded-full mt-0.5">
                                                        Mensal
                                                    </span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); setDeletingTx(tx); }}
                                                    className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors"
                                                    title="Excluir Assinatura"
                                                >
                                                    <TrashIcon className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Modal de Adicionar / Editar Assinatura */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-[#FFEDD5] dark:bg-[#431407] text-[#EA580C] dark:text-[#F97316] flex items-center justify-center shrink-0">
                            <RepeatIcon className="h-5 w-5 stroke-[2.2]" />
                        </div>
                        <div>
                            <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                                {editingTx ? 'Editar Assinatura' : 'Nova Assinatura ou Fixo'}
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Custos mensais automáticos no seu fluxo
                            </p>
                        </div>
                    </div>

                    <div className="space-y-3.5">
                        {/* Nome do Serviço */}
                        <div>
                            <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5 block">
                                Nome do Serviço ou Despesa
                            </label>
                            <input
                                type="text"
                                value={form.name}
                                onChange={e => setForm({ ...form, name: e.target.value })}
                                placeholder="Ex: Netflix, Spotify, Internet, Gympass..."
                                className="w-full bg-slate-50 dark:bg-dark-elevated border border-slate-200 dark:border-white/10 rounded-2xl p-3.5 font-bold text-sm text-slate-900 dark:text-white outline-none focus:border-slate-400 dark:focus:border-[#EA580C] transition-all"
                            />
                        </div>

                        {/* Valor Mensal */}
                        <div>
                            <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5 block">
                                Valor da Cobrança Mensal
                            </label>
                            <input
                                type="tel"
                                value={form.price}
                                onChange={e => setForm({ ...form, price: formatCurrencyForInput(e.target.value) })}
                                placeholder="0,00"
                                className="w-full bg-slate-50 dark:bg-dark-elevated border border-slate-200 dark:border-white/10 rounded-2xl p-3.5 font-black text-base text-slate-900 dark:text-[#EA580C] outline-none focus:border-slate-400 dark:focus:border-[#EA580C] transition-all"
                            />
                        </div>

                        {/* Dia do Vencimento */}
                        <div>
                            <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5 block">
                                Dia da Cobrança no Mês
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    min="1"
                                    max="31"
                                    value={form.day}
                                    onChange={e => setForm({ ...form, day: e.target.value })}
                                    className="w-24 bg-slate-50 dark:bg-dark-elevated border border-slate-200 dark:border-white/10 rounded-2xl p-3 font-bold text-center text-sm text-slate-900 dark:text-white outline-none focus:border-slate-400 dark:focus:border-[#EA580C]"
                                />
                                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                    Todo dia {form.day || '1'} de cada mês
                                </span>
                            </div>
                        </div>

                        {/* Forma de Pagamento */}
                        <div>
                            <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5 block">
                                Forma de Pagamento
                            </label>
                            <div className="grid grid-cols-2 gap-2 mb-3">
                                <button
                                    type="button"
                                    onClick={() => setForm({ ...form, paymentType: 'credito', cardId: form.cardId || creditCards[0]?.id || '' })}
                                    className={`py-2.5 px-3 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all border flex items-center justify-center gap-2 ${
                                        form.paymentType === 'credito'
                                            ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-sm font-black'
                                            : 'bg-slate-50 dark:bg-dark-elevated text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10'
                                    }`}
                                >
                                    <CreditCardIcon className="h-4 w-4" />
                                    <span>Cartão de Crédito</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setForm({ ...form, paymentType: 'debito', accountId: form.accountId || accounts[0]?.id || '' })}
                                    className={`py-2.5 px-3 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all border flex items-center justify-center gap-2 ${
                                        form.paymentType === 'debito'
                                            ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-sm font-black'
                                            : 'bg-slate-50 dark:bg-dark-elevated text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10'
                                    }`}
                                >
                                    <BankIcon className="h-4 w-4" />
                                    <span>Conta / Débito</span>
                                </button>
                            </div>

                            {/* Seletor Visual de Cartão de Crédito */}
                            {form.paymentType === 'credito' && (
                                <div className="space-y-2">
                                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        Selecione o Cartão
                                    </span>
                                    {creditCards.length === 0 ? (
                                        <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 p-3 rounded-2xl border border-amber-500/20">
                                            Nenhum cartão de crédito cadastrado. Cadastre um cartão na seção "Contas e Cartões".
                                        </p>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {creditCards.map(card => {
                                                const isSelected = form.cardId === card.id || (!form.cardId && creditCards[0]?.id === card.id);
                                                return (
                                                    <button
                                                        key={card.id}
                                                        type="button"
                                                        onClick={() => setForm({ ...form, cardId: card.id })}
                                                        className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                                                            isSelected
                                                                ? 'border-slate-900 dark:border-white bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white shadow-sm'
                                                                : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-dark-elevated text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-white/20'
                                                        }`}
                                                    >
                                                        <div
                                                            className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                                                            style={{ backgroundColor: card.color || '#3B82F6' }}
                                                        />
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-xs font-bold truncate">
                                                                {card.name}
                                                            </p>
                                                            <p className="text-[10px] text-slate-400">
                                                                Vence dia {card.dueDay}
                                                            </p>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Seletor Visual de Conta Bancária */}
                            {form.paymentType === 'debito' && (
                                <div className="space-y-2">
                                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        Selecione a Conta Bancária
                                    </span>
                                    {accounts.length === 0 ? (
                                        <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 p-3 rounded-2xl border border-amber-500/20">
                                            Nenhum conta bancária cadastrada. Cadastre na seção "Contas e Cartões".
                                        </p>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {accounts.map(acc => {
                                                const isSelected = form.accountId === acc.id || (!form.accountId && accounts[0]?.id === acc.id);
                                                return (
                                                    <button
                                                        key={acc.id}
                                                        type="button"
                                                        onClick={() => setForm({ ...form, accountId: acc.id })}
                                                        className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                                                            isSelected
                                                                ? 'border-slate-900 dark:border-white bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white shadow-sm'
                                                                : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-dark-elevated text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-white/20'
                                                        }`}
                                                    >
                                                        <div
                                                            className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                                                            style={{ backgroundColor: acc.color || '#3B82F6' }}
                                                        />
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-xs font-bold truncate">
                                                                {acc.bankName}
                                                            </p>
                                                            <p className="text-[10px] text-slate-400">
                                                                {acc.accountType || 'Corrente'}
                                                            </p>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="pt-2">
                        <button
                            type="button"
                            onClick={handleSave}
                            className="w-full py-3.5 bg-[#EA580C] hover:bg-[#F97316] text-white dark:bg-[#EA580C] dark:hover:bg-[#F97316] dark:text-white rounded-2xl font-black uppercase tracking-wider text-xs active:scale-95 transition-all shadow-md shadow-[#EA580C]/20"
                        >
                            {editingTx ? 'Salvar Alterações' : 'Cadastrar Assinatura'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Modal de Confirmação de Exclusão */}
            <Modal isOpen={deletingTx !== null} onClose={() => setDeletingTx(null)} verticalAlign="popup">
                <div className="space-y-4 text-center p-1">
                    <div className="mx-auto w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 mb-2">
                        <TrashIcon className="h-6 w-6 stroke-[2]" />
                    </div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
                        Excluir Assinatura?
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                        Deseja remover <strong>{deletingTx ? cleanServiceName(deletingTx.descricao) : ''}</strong> e todas as suas recorrências de todos os meses?
                    </p>
                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <button
                            onClick={() => setDeletingTx(null)}
                            className="w-full py-3 bg-slate-100 dark:bg-dark-elevated text-slate-600 dark:text-slate-300 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={confirmDelete}
                            className="w-full py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-rose-500/20"
                        >
                            Excluir
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default SubscriptionsSettings;
