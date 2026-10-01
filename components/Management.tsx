import React, { useMemo, useState, useContext, useRef, useEffect } from 'react';
import { Transaction, PaymentMethod } from '../types';
import { formatCurrency, getMonthKey, formatarMesAno, formatCurrencyForInput, parseCurrency, calculateStatementDate, getPreviousBalance, getCorPorCategoria, getTranslatedCategoryName, getCategoriesForType } from '../utils/helpers';
import {
    ArrowRightIcon, ArrowLeftIcon, EditIcon, TrashIcon, FilterIcon,
    RepeatIcon, ClipboardListIcon, CreditCardIcon, BankIcon,
    ChevronDownIcon, CalendarIcon, SearchIcon, TrendingUpIcon, TrendingDownIcon,
    WalletIcon, ArrowsRightLeftIcon, InformationCircleIcon
} from './icons';
import CategoryIcon from './CategoryIcon';
import { getBankLogo } from './BankLogo';
import { AppContext } from '../context/AppContext';
import MonthYearPickerModal from './MonthYearPickerModal';
import { FilterModal } from './management/FilterModal';
import Modal from './Modal';
import Calendar from './Calendar';
import ListPickerModal from './ListPickerModal';
import InvoicePickerModal from './InvoicePickerModal';
import { MESES_NOMES } from '../constants';
import { ContextualTip } from './ContextualTip';
import { useTranslation } from '../i18n';

const formatDateForDisplay = (dateString: string, t: any, locale: string): string => {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const date = new Date(dateString + 'T00:00:00');
    const appLocale = locale === 'pt' ? 'pt-BR' : locale === 'en' ? 'en-US' : locale === 'es' ? 'es-ES' : locale === 'fr' ? 'fr-FR' : 'de-DE';
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' };
    if (date.toDateString() === today.toDateString()) return `${t('common.today')}, ${date.toLocaleDateString(appLocale, options)}`;
    if (date.toDateString() === yesterday.toDateString()) return `${t('common.yesterday')}, ${date.toLocaleDateString(appLocale, options)}`;
    return date.toLocaleDateString(appLocale, options);
};

const PaymentMethodBadge: React.FC<{ method: PaymentMethod }> = ({ method }) => {
    const { t } = useTranslation();
    const methods = {
        credito: { label: t('payMethod.credit'), icon: <CreditCardIcon className="h-3 w-3" /> },
        debito: { label: t('payMethod.debit'), icon: <BankIcon className="h-3 w-3" /> },
    };

    const config = methods[method] || methods.debito;

    return (
        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 dark:text-slate-400 bg-light-card-elevated dark:bg-dark-card px-2 py-0.5 rounded-full border border-light-border dark:border-dark-elevated">
            {config.icon}
            {config.label}
        </span>
    );
};

const Management: React.FC = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error("Management missing context");
    const { t, locale, currency, monthNames } = useTranslation();
    const appLocale = locale === 'pt' ? 'pt-BR' : locale === 'en' ? 'en-US' : locale === 'es' ? 'es-ES' : locale === 'fr' ? 'fr-FR' : 'de-DE';
    const appCurrency = currency || 'BRL';

    const {
        allData, currentDate, changeMonth, allTransactions,
        handleStartEdit, handleDeleteTransaction, handleStartDeleteFuture,
        categorias, getSaldoColor, theme, creditCards, categoryColors,
        confirmingDeleteId, handleConfirmDelete, setConfirmingDeleteId,
        confirmingDeleteFutureTx, handleConfirmDeleteFuture, setConfirmingDeleteFutureTx,
        isEditModalOpen, setIsEditModalOpen, editingTxId, handleUpdateTransaction,
        setCurrentDate, setCurrentView, setCurrentTab, accounts,
        managementFilter, setManagementFilter, userProfile
    } = context;

    const firstName = (userProfile?.name || '').split(' ')[0] || '';

    const [isMonthYearPickerOpen, setIsMonthYearPickerOpen] = useState(false);
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    // Infinite Scroll State
    const [visibleDaysCount, setVisibleDaysCount] = useState(10);
    const [filterMethod, setFilterMethod] = useState<PaymentMethod | 'all'>('all');
    const [filterCardId, setFilterCardId] = useState<string | 'all'>('all');
    const [filterAccountId, setFilterAccountId] = useState<string | 'all'>('all');

    useEffect(() => {
        if (managementFilter) {
            setFilterMethod(managementFilter.method);
            setFilterCardId(managementFilter.cardId);
            if (managementFilter.accountId) setFilterAccountId(managementFilter.accountId);
            // We clear the filter after consuming it so it doesn't persist on normal navigations
            setManagementFilter(null); 
        }
    }, [managementFilter, setManagementFilter]);
    const [openSwipeId, setOpenSwipeId] = useState<string | null>(null);
    const [detailsTxId, setDetailsTxId] = useState<string | null>(null);

    const detailsTx = useMemo(() => allTransactions.find(t => t.id === detailsTxId), [allTransactions, detailsTxId]);

    // Mapa de ícones de categorias para exibir nas transações
    const categoryIconMap = useMemo(() => {
        const map: Record<string, string> = {};
        [...categorias.entrada, ...categorias.saida].forEach(cat => {
            if (cat.icon) map[cat.name] = cat.icon;
        });
        return map;
    }, [categorias]);

    const touchStartRef = useRef<{ x: number, y: number }>({ x: 0, y: 0 });
    const isSwipingRef = useRef(false);
    const isScrollRef = useRef(false);

    const handleItemTouchStart = (e: React.TouchEvent) => {
        e.stopPropagation();
        const touch = e.touches[0];
        touchStartRef.current = { x: touch.clientX, y: touch.clientY };
        isSwipingRef.current = false;
        isScrollRef.current = false;
    };

    const handleItemTouchMove = (e: React.TouchEvent) => {
        e.stopPropagation();
        if (isScrollRef.current) return;
        const touch = e.touches[0];
        const deltaX = touchStartRef.current.x - touch.clientX;
        const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);

        if (deltaY > 10 && !isSwipingRef.current) {
            isScrollRef.current = true;
            return;
        }

        if (Math.abs(deltaX) > 10 && Math.abs(deltaX) > deltaY) {
            isSwipingRef.current = true;
            if (e.cancelable) {
                e.preventDefault();
            }
        }
    };

    const handleItemTouchEnd = (e: React.TouchEvent, txId: string) => {
        e.stopPropagation();
        if (isScrollRef.current || !isSwipingRef.current) {
            isSwipingRef.current = false;
            return;
        }
        const touch = e.changedTouches[0];
        const deltaX = touchStartRef.current.x - touch.clientX;
        const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);

        if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > deltaY) {
            if (deltaX > 40) {
                setOpenSwipeId(txId);
            } else if (deltaX < -40) {
                setOpenSwipeId(null);
            }
        }

        setTimeout(() => {
            isSwipingRef.current = false;
        }, 50);
    };

    // Edit Form State
    const [editForm, setEditForm] = useState({
        descricao: '',
        valor: '',
        categoria: '',
        data: '',
        paymentMethod: 'debito' as PaymentMethod,
        cardId: '',
        accountId: '',
        statementDate: undefined as string | undefined
    });
    const [isInnerCalendarOpen, setIsInnerCalendarOpen] = useState(false);
    const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false);
    const [isCardPickerOpen, setIsCardPickerOpen] = useState(false);
    const [isStatementPickerOpen, setIsStatementPickerOpen] = useState(false);
    const [isAccountPickerOpen, setIsAccountPickerOpen] = useState(false);

    // Modal para escopo de edição (recorrente)
    const [isEditScopeModalOpen, setIsEditScopeModalOpen] = useState(false);

    // Sincronizar formulário de edição quando abrir o modal
    useEffect(() => {
        if (isEditModalOpen && editingTxId) {
            const tx = allTransactions.find(t => t.id === editingTxId);
            if (tx) {
                setEditForm({
                    descricao: tx.descricao,
                    valor: formatCurrencyForInput(String(Math.round(tx.valor * 100))),
                    categoria: tx.categoria,
                    data: tx.compraData || tx.data, // Prioriza a data da compra no formulário
                    paymentMethod: tx.paymentMethod,
                    cardId: tx.cardId || '',
                    accountId: tx.accountId || '',
                    statementDate: tx.statementDate
                });
            }
        }
    }, [isEditModalOpen, editingTxId, allTransactions]);

    const selectedCard = creditCards.find(c => c.id === editForm.cardId);

    // Data padrão da fatura se não houver statementDate definido
    const defaultStatementDate = useMemo(() => {
        if (!selectedCard || !editForm.data) return '';
        return calculateStatementDate(editForm.data, selectedCard);
    }, [editForm.data, selectedCard]);

    // Helper para buscar nome do mês traduzido
    const getMonthName = (monthIndex: number) => {
        const keys = [
            'month.january', 'month.february', 'month.march', 'month.april',
            'month.may', 'month.june', 'month.july', 'month.august',
            'month.september', 'month.october', 'month.november', 'month.december'
        ];
        return t(keys[monthIndex]) || keys[monthIndex];
    };

    // Gerar lista de meses para seleção de fatura (no modal de edição)
    const invoiceOptions = useMemo(() => {
        if (!selectedCard || !editForm.data) return [];
        // Base para o range é a data calculada "padrão" da fatura
        const baseStatement = calculateStatementDate(editForm.data, selectedCard);
        const baseDate = new Date(baseStatement + '-01T00:00:00');

        const months = [];
        // 12 meses antes e 12 meses depois
        for (let i = -12; i <= 12; i++) {
            const d = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, 1);
            const key = getMonthKey(d);
            const label = `${getMonthName(d.getMonth())} ${d.getFullYear()}`;
            months.push({ id: key, name: label });
        }
        return months;
    }, [editForm.data, selectedCard, locale]);

    const currentStatementLabel = useMemo(() => {
        const key = editForm.statementDate || defaultStatementDate;
        if (!key) return t('common.select') || 'Selecione';
        const [year, month] = key.split('-');
        return `${getMonthName(parseInt(month, 10) - 1)} ${year}`;
    }, [editForm.statementDate, defaultStatementDate, locale]);

    const monthTransactions = useMemo(() => {
        const monthKey = getMonthKey(currentDate);

        // Base de transações: Procura em TUDO para filtrar por Impacto (vencimento do cartão ou data da transação)
        let txs = allTransactions.filter(tx => {
            const impactMonth = getMonthKey(new Date(tx.data + 'T00:00:00'));
            return impactMonth === monthKey;
        });

        // Filtro de Busca
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            txs = txs.filter(t =>
                t.descricao.toLowerCase().includes(q) ||
                t.categoria.toLowerCase().includes(q) ||
                formatCurrency(t.valor).includes(q)
            );
        }

        if (selectedCategories.length > 0) txs = txs.filter(tx => selectedCategories.includes(`${tx.tipo}:${tx.categoria}`));
        if (filterMethod !== 'all') txs = txs.filter(tx => tx.paymentMethod === filterMethod);
        if (filterCardId !== 'all') txs = txs.filter(tx => tx.cardId === filterCardId);
        if (filterAccountId !== 'all') txs = txs.filter(tx => tx.accountId === filterAccountId);

        return [...txs].sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
    }, [allTransactions, currentDate, selectedCategories, filterMethod, filterCardId, filterAccountId, searchQuery]);

    const monthSummary = useMemo(() => {
        const monthKey = getMonthKey(currentDate);
        const hasFilters = selectedCategories.length > 0 || filterMethod !== 'all' || filterCardId !== 'all' || filterAccountId !== 'all' || searchQuery.trim() !== '';

        if (hasFilters) {
            let entradas = 0;
            let saidas = 0;
            monthTransactions.forEach(t => {
                if (t.tipo === 'entrada') {
                    if (t.paymentMethod === 'credito') saidas -= (Number(t.valor) || 0);
                    else entradas += (Number(t.valor) || 0);
                } else {
                    saidas += (Number(t.valor) || 0);
                }
            });
            return { entradas, saidas, total: entradas - saidas, isFiltered: true };
        }

        // Resumo baseado apenas no IMPACTO FINANCEIRO (o que de fato mexe no saldo deste mês)
        const relevantTxs = (allData[monthKey]?.transactions || []).filter(tx => !!tx);
        
        const entradas = relevantTxs
            .filter(t => t.tipo === 'entrada' && t.paymentMethod !== 'credito')
            .reduce((acc, t) => acc + (Number(t.valor) || 0), 0);
            
        const saidas = relevantTxs.reduce((acc, t) => {
            if (t.tipo === 'saida') return acc + (Number(t.valor) || 0);
            if (t.tipo === 'entrada' && t.paymentMethod === 'credito') return acc - (Number(t.valor) || 0);
            return acc;
        }, 0);

        // Busca o saldo anterior para mostrar o saldo acumulado total no cabeçalho
        const previousBalance = getPreviousBalance(monthKey, allData);

        return { entradas, saidas, total: previousBalance + entradas - saidas, isFiltered: false };
    }, [allData, currentDate, monthTransactions, selectedCategories, filterMethod, filterCardId, filterAccountId, searchQuery]);

    const dailyData = useMemo(() => {
        const grouped = new Map<string, { transactions: Transaction[], dayTotal: number, closingBalance?: number }>();
        let runningBalance = 0;

        // Agrupamento visual: usa a data que pertence ao mês sendo visualizado (impacto/vencimento)
        const getDisplayDate = (tx: Transaction) => {
            return tx.data;
        };

        if (selectedCategories.length === 0 && filterMethod === 'all' && filterCardId === 'all' && filterAccountId === 'all') {
            const prev = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
            runningBalance = allData[getMonthKey(prev)]?.saldoFinal || 0;
        }
        monthTransactions.forEach(tx => {
            const displayDate = getDisplayDate(tx);
            if (!grouped.has(displayDate)) grouped.set(displayDate, { transactions: [], dayTotal: 0 });
            const g = grouped.get(displayDate)!;
            g.transactions.push(tx);
            
            const monthKey = getMonthKey(currentDate);
            const impactMonth = getMonthKey(new Date(tx.data + 'T00:00:00'));
            
            if (impactMonth === monthKey) {
                g.dayTotal += tx.tipo === 'entrada' ? tx.valor : -tx.valor;
            }
        });
        if (selectedCategories.length === 0 && filterMethod === 'all' && filterCardId === 'all' && filterAccountId === 'all') {
            Array.from(grouped.keys()).sort().forEach(d => {
                const g = grouped.get(d)!;
                runningBalance += g.dayTotal;
                g.closingBalance = runningBalance;
            });
        }
        return Array.from(grouped.entries()).sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime());
    }, [monthTransactions, selectedCategories, filterMethod, filterCardId, filterAccountId, allData, currentDate]);

    // Reset pagination when data or filters change
    useEffect(() => {
        setVisibleDaysCount(10);
    }, [dailyData.length, currentDate, selectedCategories, filterMethod, filterCardId, filterAccountId]);

    // Scroll Handler for Infinite Scroll
    const handleScroll = (e: React.UIEvent<HTMLElement>) => {
        const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
        // Infinite scroll — only update if there are more days to show
        if (scrollHeight - scrollTop <= clientHeight + 200) {
            setVisibleDaysCount(prev => {
                const next = Math.min(prev + 5, dailyData.length);
                return next === prev ? prev : next; // Avoid unnecessary re-render
            });
        }
    };

    const toggleActions = (id: string) => {
        setOpenSwipeId(openSwipeId === id ? null : id);
    };

    const handleSaveEdit = (e: React.FormEvent) => {
        e.preventDefault();

        // Verifica se é transação recorrente
        const tx = allTransactions.find(t => t.id === editingTxId);
        if (tx && tx.recurrenceId) {
            setIsEditScopeModalOpen(true);
        } else {
            submitEdit('single');
        }
    };

    const submitEdit = (scope: 'single' | 'future') => {
        const finalForm = {
            ...editForm,
            cardId: editForm.paymentMethod === 'credito' ? editForm.cardId : undefined
        };
        // Mock event object since we are calling it programmatically in some cases
        const e = { preventDefault: () => { } } as React.FormEvent;
        handleUpdateTransaction(e, finalForm as any, scope);
        setIsEditScopeModalOpen(false);
    };

    const currentTxType = useMemo(() => {
        const tx = allTransactions.find(t => t.id === editingTxId);
        return tx?.tipo || 'saida';
    }, [editingTxId, allTransactions]);

    // --- Lógica de Swipe (usando refs para evitar re-renders a cada touchMove) ---
    const globalTouchStartRef = useRef<{ x: number, y: number } | null>(null);
    const globalTouchEndRef = useRef<{ x: number, y: number } | null>(null);
    const minSwipeDistance = 50;

    const onTouchStartGlobal = (e: React.TouchEvent) => {
        globalTouchEndRef.current = null;
        globalTouchStartRef.current = { x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY };
    };

    const onTouchMoveGlobal = (e: React.TouchEvent) => {
        globalTouchEndRef.current = { x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY };
    };

    const onTouchEndGlobal = () => {
        const start = globalTouchStartRef.current;
        const end = globalTouchEndRef.current;
        if (!start || !end) return;
        const distanceX = start.x - end.x;
        const distanceY = start.y - end.y;
        
        // Exige um gesto predominantemente horizontal (3x maior que vertical) e distância mínima de 100px
        if (Math.abs(distanceX) > Math.abs(distanceY) * 3) {
            const isLeftSwipe = distanceX > 100;
            const isRightSwipe = distanceX < -100;

            if (isLeftSwipe) changeMonth(1);
            else if (isRightSwipe) changeMonth(-1);
        }
    };

    return (
        <div 
            className="bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text-secondary h-full flex flex-col transition-colors duration-300 relative"
            onTouchStart={onTouchStartGlobal}
            onTouchMove={onTouchMoveGlobal}
            onTouchEnd={onTouchEndGlobal}
        >
            <header className="px-4 py-4 pt-[calc(1rem+env(safe-area-inset-top))] bg-light-bg dark:bg-dark-bg z-20 flex-shrink-0 sticky top-0">
                <div className="flex items-center justify-between">
                    <div 
                        onClick={() => setCurrentView('menu')}
                        className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0 cursor-pointer active:scale-95 transition-transform overflow-hidden ${
                            userProfile?.avatar
                                ? 'shadow-md'
                                : 'bg-gradient-to-br from-[#EA580C] to-[#F97316] text-white shadow-lg shadow-[#EA580C]/20'
                        }`}
                        title="Configurações & Perfil"
                    >
                        {userProfile?.avatar ? (
                            <img src={userProfile.avatar} alt="" className="h-full w-full object-cover" />
                        ) : (
                            firstName.charAt(0).toUpperCase() || '?'
                        )}
                    </div>

                    {/* Seletor de Mês */}
                    <div className="flex items-center gap-1">
                        <button 
                            onClick={() => changeMonth(-1)} 
                            className="h-9 w-9 flex items-center justify-center rounded-xl text-slate-400 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white active:scale-90 transition-transform"
                        >
                            <ArrowLeftIcon className="h-4 w-4" />
                        </button>
                        <button 
                            onClick={() => setIsMonthYearPickerOpen(true)} 
                            className="flex items-center gap-1.5 px-5 py-1.5 bg-slate-100 dark:bg-white/[0.06] rounded-full text-sm font-bold text-slate-900 dark:text-white border border-slate-200/80 dark:border-white/[0.08] active:scale-95 transition-transform shadow-sm"
                        >
                            {formatarMesAno(currentDate, locale, monthNames)}
                        </button>
                        <button 
                            onClick={() => changeMonth(1)} 
                            className="h-9 w-9 flex items-center justify-center rounded-xl text-slate-400 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white active:scale-90 transition-transform"
                        >
                            <ArrowRightIcon className="h-4 w-4" />
                        </button>
                    </div>

                    {/* Espaço do mesmo tamanho do avatar: mantém o mês centralizado.
                        O filtro fica ao lado da busca (que gruda no topo ao rolar). */}
                    <div className="h-10 w-10" aria-hidden="true" />
                </div>
            </header>

            <main className="flex-1 overflow-y-auto no-scrollbar pb-8" onScroll={handleScroll}>
                {/* Resumo do Mês */}
                <div className="px-4 mb-3">
                    <div className="grid grid-cols-3 gap-2">
                        <div className={`p-2.5 rounded-xl border transition-colors ${monthSummary.isFiltered ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800/30' : 'bg-slate-100 dark:bg-dark-card border-light-border dark:border-dark-elevated'}`}>
                            <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-0.5">{monthSummary.isFiltered ? `${t('dashboard.income')} (${t('common.filter')})` : t('dashboard.income')}</p>
                            <p className="text-xs font-semibold text-emerald-500 truncate tabular-nums">{formatCurrency(monthSummary.entradas, appLocale, appCurrency)}</p>
                        </div>
                        <div className={`p-2.5 rounded-xl border transition-colors ${monthSummary.isFiltered ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800/30' : 'bg-slate-100 dark:bg-dark-card border-light-border dark:border-dark-elevated'}`}>
                            <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-0.5">{monthSummary.isFiltered ? `${t('dashboard.expenses')} (${t('common.filter')})` : t('dashboard.expenses')}</p>
                            <p className="text-xs font-semibold text-rose-500 truncate tabular-nums">{formatCurrency(monthSummary.saidas, appLocale, appCurrency)}</p>
                        </div>
                        <div className={`p-2.5 rounded-xl border transition-colors ${monthSummary.isFiltered ? 'bg-indigo-55/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800/30' : 'bg-slate-100 dark:bg-dark-card border-light-accent/30 dark:border-dark-accent/30'}`}>
                            <p className={`text-[10px] font-medium mb-0.5 ${monthSummary.isFiltered ? 'text-fin-info dark:text-blue-400' : 'text-light-accent dark:text-[#3B82F6]'}`}>{monthSummary.isFiltered ? t('dashboard.monthBalance') : t('dashboard.balance')}</p>
                            <p className="text-xs font-semibold truncate tabular-nums" style={{ color: getSaldoColor(monthSummary.total, theme) }}>{formatCurrency(monthSummary.total, appLocale, appCurrency)}</p>
                        </div>
                    </div>
                </div>

                {/* Filtros e Busca Fixos no Topo ao Rolar */}
                <div className="sticky top-0 z-20 bg-light-bg dark:bg-dark-bg px-4 pb-3 pt-1 border-b border-light-border dark:border-dark-elevated/50">
                    <div className="flex gap-2">
                        <div className="relative flex-grow">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder={t('management.searchPlaceholder')}
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-slate-100 dark:bg-dark-card border border-light-border dark:border-dark-elevated rounded-xl text-xs font-medium outline-none focus:border-dark-accent transition-all placeholder:text-slate-400"
                            />
                        </div>
                        <button onClick={() => setIsFilterModalOpen(true)} className={`p-2 rounded-xl border transition active:scale-95 ${selectedCategories.length > 0 || filterMethod !== 'all' || filterCardId !== 'all' || filterAccountId !== 'all' ? 'bg-[#3B82F6] border-dark-accent text-white shadow-lg' : 'bg-slate-100 dark:bg-dark-card border-light-border dark:border-dark-elevated text-slate-500'}`}>
                            <FilterIcon className="h-4 w-4" />
                        </button>
                    </div>

                    {/* Filtros Rápidos */}
                    <div className="flex gap-1.5 mt-2.5 overflow-x-auto no-scrollbar pb-1">
                        {[
                            { id: 'all', label: t('common.all'), icon: <WalletIcon className="h-3 w-3" /> },
                            { id: 'debito', label: t('payMethod.debit'), icon: <BankIcon className="h-3 w-3" /> },
                            { id: 'credito', label: t('payMethod.credit'), icon: <CreditCardIcon className="h-3 w-3" /> }
                        ].map(btn => (
                            <button
                                key={btn.id}
                                onClick={() => {
                                    setFilterMethod(btn.id as any);
                                    if (btn.id !== 'credito') setFilterCardId('all');
                                    if (btn.id !== 'debito') setFilterAccountId('all');
                                }}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap ${filterMethod === btn.id ? 'bg-slate-800 dark:bg-white text-white dark:text-slate-900 border-slate-800 dark:border-white shadow-sm' : 'bg-slate-100 dark:bg-dark-card border-light-border dark:border-dark-elevated text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
                            >
                                {btn.icon}
                                {btn.label}
                            </button>
                        ))}
                    </div>

                    {filterMethod === 'credito' && creditCards.length > 0 && (
                        <div className="flex gap-1.5 mt-2 overflow-x-auto no-scrollbar pb-1 animate-in fade-in slide-in-from-top-1 duration-200">
                            <button
                                onClick={() => setFilterCardId('all')}
                                className={`px-3 py-1 rounded-full text-[10px] font-medium border transition-all ${filterCardId === 'all' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/50' : 'bg-transparent text-slate-400 border-light-border dark:border-dark-elevated'}`}
                            >
                                {t('common.all')}
                            </button>
                            {creditCards.map(card => (
                                <button
                                    key={card.id}
                                    onClick={() => setFilterCardId(card.id)}
                                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-medium border transition-all whitespace-nowrap ${filterCardId === card.id ? 'bg-white dark:bg-slate-800 text-light-text dark:text-dark-text border-slate-300 dark:border-slate-600 shadow-sm' : 'bg-transparent text-slate-500 border-light-border dark:border-dark-elevated'}`}
                                >
                                    <div className="h-2 w-2 rounded-full shadow-sm" style={{ backgroundColor: card.color }} />
                                    {card.name}
                                </button>
                            ))}
                        </div>
                    )}

                    {filterMethod === 'debito' && accounts && accounts.length > 0 && (
                        <div className="flex gap-1.5 mt-2 overflow-x-auto no-scrollbar pb-1 animate-in fade-in slide-in-from-top-1 duration-200">
                            <button
                                onClick={() => setFilterAccountId('all')}
                                className={`px-3 py-1 rounded-full text-[10px] font-medium border transition-all ${filterAccountId === 'all' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/50' : 'bg-transparent text-slate-400 border-light-border dark:border-dark-elevated'}`}
                            >
                                {t('common.all')}
                            </button>
                            {accounts.map(account => (
                                <button
                                    key={account.id}
                                    onClick={() => setFilterAccountId(account.id)}
                                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-medium border transition-all whitespace-nowrap ${filterAccountId === account.id ? 'bg-white dark:bg-slate-800 text-light-text dark:text-dark-text border-slate-300 dark:border-slate-600 shadow-sm' : 'bg-transparent text-slate-500 border-light-border dark:border-dark-elevated'}`}
                                >
                                    <div className="h-2 w-2 rounded-full shadow-sm" style={{ backgroundColor: account.color || '#3B82F6' }} />
                                    {account.bankName}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="pt-2">
                    <ContextualTip
                        id="tip-filtros-avancados"
                        title={`${t('common.tip')}: ${t('management.filter')}`}
                        description={t('management.filterTip')}
                        className="mx-4 mb-4"
                    />
                    {dailyData.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 opacity-40">
                            <ClipboardListIcon className="h-16 w-16 mb-4" />
                            <p className="text-center font-medium">{t('management.noTransactions')}</p>
                        </div>
                    ) : dailyData.slice(0, visibleDaysCount).map(([date, data]) => (
                        <div key={date} className="px-4 pt-4 first:pt-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <div className="flex justify-between items-end mb-2.5 px-1">
                            <h2 className="text-[15px] font-semibold text-light-text dark:text-dark-text">{formatDateForDisplay(date, t, locale)}</h2>
                            {data.closingBalance !== undefined && (
                                <div className="text-right">
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{t('management.dayBalance')}</p>
                                    <span className="font-semibold text-sm tabular-nums" style={{ color: getSaldoColor(data.closingBalance || 0, theme) }}>
                                        {formatCurrency(data.closingBalance, appLocale, appCurrency)}
                                    </span>
                                </div>
                            )}
                        </div>
                        <div className="space-y-2">
                            {data.transactions.map(tx => {
                                const card = tx.cardId ? creditCards.find(c => c.id === tx.cardId) : null;
                                const account = tx.accountId ? accounts.find(a => a.id === tx.accountId) : null;
                                return (
                                    <div key={tx.id} className="relative group overflow-hidden rounded-xl border border-light-border dark:border-dark-elevated/50 shadow-sm transition-all duration-300">
                                        <div className={`absolute inset-y-0 right-0 flex transition-opacity duration-200 ${openSwipeId === tx.id ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                                            <button
                                                onClick={() => { setDetailsTxId(tx.id); setOpenSwipeId(null); }}
                                                className="w-16 bg-slate-600 text-white flex flex-col items-center justify-center transition-colors hover:bg-slate-700 border-r border-slate-700/30"
                                            >
                                                <InformationCircleIcon className="h-5 w-5" />
                                                <span className="text-[10px] font-medium mt-1">{t('common.details')}</span>
                                            </button>
                                            <button
                                                onClick={() => { handleStartEdit(tx); setOpenSwipeId(null); }}
                                                className="w-16 bg-blue-500 text-white flex flex-col items-center justify-center transition-colors hover:bg-blue-600 border-r border-blue-600/30"
                                            >
                                                <EditIcon className="h-5 w-5" />
                                                <span className="text-[10px] font-medium mt-1">{t('common.edit')}</span>
                                            </button>
                                            <button
                                                onClick={() => { handleDeleteTransaction(tx); setOpenSwipeId(null); }}
                                                className="w-16 bg-red-500 text-white flex flex-col items-center justify-center transition-colors hover:bg-red-600"
                                            >
                                                <TrashIcon className="h-5 w-5" />
                                                <span className="text-[10px] font-medium mt-1">{t('common.delete')}</span>
                                            </button>
                                            {tx.recurrenceId && (
                                                <button
                                                    onClick={() => { handleStartDeleteFuture(tx); setOpenSwipeId(null); }}
                                                    className="w-16 bg-slate-700 text-white flex flex-col items-center justify-center transition-colors hover:bg-slate-900 border-l border-slate-800/30"
                                                >
                                                    <RepeatIcon className="h-5 w-5" />
                                                    <span className="text-[10px] font-medium mt-1">{t('common.recurrence')}</span>
                                                </button>
                                            )}
                                        </div>
                                        <div
                                            className={`relative z-10 bg-white dark:bg-dark-card p-3 flex items-center transition-transform duration-300 ${openSwipeId === tx.id ? (tx.recurrenceId ? '-translate-x-64' : '-translate-x-48') : 'translate-x-0'} cursor-pointer`}
                                            onClick={() => {
                                                setOpenSwipeId(openSwipeId === tx.id ? null : tx.id);
                                            }}
                                        >
                                            {/* Ícone da Categoria ou do Banco */}
                                            {account && (tx.tipo === 'transferencia' || tx.descricao.toLowerCase().startsWith('ajuste de saldo')) && getBankLogo(account.bankName, "w-9 h-9 flex-shrink-0 mr-3") ? (
                                                getBankLogo(account.bankName, "w-9 h-9 flex-shrink-0 mr-3")
                                            ) : (
                                                <div
                                                    className="flex-shrink-0 mr-3 w-9 h-9 rounded-xl flex items-center justify-center text-white"
                                                    style={{ backgroundColor: getCorPorCategoria(tx.categoria, categoryColors) + '33', }}
                                                >
                                                    {categoryIconMap[tx.categoria] ? (
                                                        <span style={{ color: getCorPorCategoria(tx.categoria, categoryColors) }}>
                                                            <CategoryIcon name={categoryIconMap[tx.categoria]} className="h-5 w-5" />
                                                        </span>
                                                    ) : (
                                                        <span className="text-light-text-muted dark:text-dark-text-muted text-xs font-bold">—</span>
                                                    )}
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0 pr-4">
                                                <div className="flex items-center gap-1.5 mb-0.5">
                                                    <p className="font-medium text-sm text-light-text dark:text-dark-text truncate">{tx.descricao}</p>
                                                    {tx.isRecurring && <RepeatIcon className="h-3 w-3 text-[#3B82F6]" />}
                                                </div>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <p className="text-xs text-light-text-muted dark:text-dark-text-secondary font-normal truncate max-w-[130px]">
                                                        {tx.tipo === 'transferencia' ? t('payMethod.transfer') : `${getTranslatedCategoryName(tx.categoria, t)} ${tx.installment ? `(${tx.installment.current}/${tx.installment.total})` : ''}`}
                                                    </p>
                                                    {tx.compraData && tx.compraData !== tx.data && (
                                                        <span className="text-[10px] font-medium text-[#3B82F6] bg-blue-50 dark:bg-[#3B82F6]/10 px-1.5 py-0.5 rounded border border-blue-100 dark:border-dark-accent/20 flex items-center gap-1">
                                                            <CalendarIcon className="h-2 w-2" />
                                                            {t('management.consumption') || 'Consumo'} ({t('month.of') || 'em'} {new Date(tx.compraData + 'T00:00:00').toLocaleDateString(appLocale, { month: 'short' })})
                                                        </span>
                                                    )}

                                                    <PaymentMethodBadge method={tx.paymentMethod} />
                                                </div>
                                                {(account || card) && (
                                                    <div className="flex items-center gap-3 mt-1.5">
                                                        {account && (
                                                            <span className="text-[12px] font-normal text-light-text-muted dark:text-dark-text-muted flex items-center gap-1.5 whitespace-nowrap">
                                                                {getBankLogo(account.bankName, "w-3.5 h-3.5 rounded-full flex-shrink-0") || (
                                                                    <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: account.color || '#3B82F6' }} />
                                                                )}
                                                                {account.bankName}
                                                            </span>
                                                        )}
                                                        {card && (
                                                            <span className="text-[12px] font-normal text-light-text-muted dark:text-dark-text-muted flex items-center gap-1.5 whitespace-nowrap">
                                                                <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: card.color }} />
                                                                {card.name}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                {tx.tipo === 'transferencia' ? (
                                                    <span className="font-semibold text-sm tabular-nums text-slate-400 flex items-center justify-end gap-1">
                                                        <ArrowsRightLeftIcon className="h-4 w-4" /> {formatCurrency(tx.valor, appLocale, appCurrency)}
                                                    </span>
                                                ) : (
                                                    <span className={`font-semibold text-sm tabular-nums ${tx.tipo === 'entrada' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                        {tx.tipo === 'entrada' ? '+' : '-'}{formatCurrency(tx.valor, appLocale, appCurrency)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
                </div>
                {/* Espaçador para garantir visibilidade do último item acima da BottomNav */}
                <div className="h-16 flex-shrink-0" aria-hidden="true" />
            </main>

            <MonthYearPickerModal isOpen={isMonthYearPickerOpen} onClose={() => setIsMonthYearPickerOpen(false)} currentDate={currentDate} allData={allData} onSelectDate={setCurrentDate} />
            <FilterModal isOpen={isFilterModalOpen} onClose={() => setIsFilterModalOpen(false)} incomeCategories={categorias.entrada.map(c => c.name)} expenseCategories={categorias.saida.map(c => c.name)} selectedCategories={selectedCategories} onApply={setSelectedCategories} />

            {/* Modal de EDIÇÃO */}
            <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)}>
                <div>
                    <h3 className="text-lg font-bold text-light-text dark:text-dark-text mb-6 uppercase tracking-tight">{t('management.editTransaction')}</h3>
                    <form onSubmit={handleSaveEdit} className="space-y-4">
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase ml-1 tracking-tight">{t('newTx.value')}</label>
                            <input
                                type="tel"
                                value={editForm.valor}
                                onChange={e => setEditForm({ ...editForm, valor: formatCurrencyForInput(e.target.value) })}
                                className="w-full py-3 px-4 bg-light-card-elevated dark:bg-dark-bg text-light-text dark:text-dark-text border border-light-border dark:border-dark-elevated rounded-xl font-bold text-sm outline-none focus:border-dark-accent"
                                placeholder={formatCurrency(0, appLocale, appCurrency)}
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase ml-1 tracking-tight">{t('newTx.description')}</label>
                            <input
                                type="text"
                                value={editForm.descricao}
                                onChange={e => setEditForm({ ...editForm, descricao: e.target.value })}
                                className="w-full py-3 px-4 bg-light-card-elevated dark:bg-dark-bg text-light-text dark:text-dark-text border border-light-border dark:border-dark-elevated rounded-xl font-bold text-sm outline-none focus:border-dark-accent"
                                placeholder={t('management.descriptionPlaceholder')}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase ml-1 tracking-tight">{t('newTx.date')}</label>
                                <button type="button" onClick={() => setIsInnerCalendarOpen(true)} className="w-full py-3 px-4 bg-light-card-elevated dark:bg-dark-bg text-light-text dark:text-dark-text border border-light-border dark:border-dark-elevated rounded-xl text-left flex justify-between items-center font-bold text-xs">
                                    <span>{new Date(editForm.data + 'T00:00:00').toLocaleDateString(appLocale, { day: '2-digit', month: '2-digit' })}</span>
                                    <CalendarIcon className="h-4 w-4 text-[#3B82F6]" />
                                </button>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase ml-1 tracking-tight">{t('newTx.category')}</label>
                                <button type="button" onClick={() => setIsCategoryPickerOpen(true)} className="w-full py-3 px-4 bg-light-card-elevated dark:bg-dark-bg text-light-text dark:text-dark-text border border-light-border dark:border-dark-elevated rounded-xl text-left flex justify-between items-center font-bold text-xs truncate">
                                    <div className="flex items-center gap-2.5 truncate">
                                        {(() => {
                                            const cat = getCategoriesForType(categorias, currentTxType).find(c => c.name === editForm.categoria);
                                            return cat?.icon
                                                ? <div className="text-light-text-secondary dark:text-dark-text-secondary flex items-center justify-center flex-shrink-0"><CategoryIcon name={cat.icon} className="h-5 w-5" /></div>
                                                : <div className="h-3 w-3 rounded-full flex-shrink-0 border border-slate-200 dark:border-slate-700" style={{ backgroundColor: getCorPorCategoria(editForm.categoria, categoryColors) }} />;
                                        })()}
                                        <span className="truncate">{getTranslatedCategoryName(editForm.categoria, t)}</span>
                                    </div>
                                    <ChevronDownIcon className="h-4 w-4 text-slate-400" />
                                </button>
                            </div>
                        </div>

                        {/* Banco / Conta Selection */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase ml-1 tracking-tight">{t('newTx.whichAccount')}</label>
                            <button type="button" onClick={() => setIsAccountPickerOpen(true)} className="w-full py-3.5 px-4 bg-light-card-elevated dark:bg-dark-bg text-light-text dark:text-dark-text rounded-xl text-left flex justify-between items-center font-bold text-sm border border-light-border dark:border-dark-elevated transition-all">
                                <div className="flex items-center gap-2.5 truncate">
                                    {(() => {
                                        const account = accounts.find(a => a.id === editForm.accountId);
                                        if (!account) return <div className="h-3 w-3 rounded-full flex-shrink-0 bg-slate-400" />;
                                        const logo = getBankLogo(account.bankName, "w-5 h-5 rounded-full flex-shrink-0 overflow-hidden");
                                        return logo || <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: account.color || '#3B82F6' }} />;
                                    })()}
                                    <span className="truncate">{accounts.find(a => a.id === editForm.accountId)?.bankName || t('newTx.noAccountLinked')}</span>
                                </div>
                                <ChevronDownIcon className="h-4 w-4 text-slate-400" />
                            </button>
                        </div>

                        {/* Edição de Modo de Pagamento */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase ml-1 tracking-tight">{t('newTx.paymentMethod')}</label>
                            <div className="flex gap-2">
                                {[
                                    { id: 'debito', label: t('payMethod.debit'), icon: <BankIcon /> },
                                    { id: 'credito', label: t('payMethod.credit'), icon: <CreditCardIcon /> },
                                ].map((m) => (
                                    <button
                                        key={m.id}
                                        type="button"
                                        onClick={() => setEditForm({ ...editForm, paymentMethod: m.id as PaymentMethod })}
                                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-[10px] font-bold uppercase transition-all ${editForm.paymentMethod === m.id ? 'bg-[#3B82F6] border-dark-accent text-white shadow-md' : 'bg-light-card-elevated dark:bg-dark-bg border-light-border dark:border-dark-elevated text-slate-400'}`}
                                    >
                                        {m.icon}
                                        {m.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Seletor de Cartão se for Crédito */}
                        {editForm.paymentMethod === 'credito' && creditCards.length > 0 && (
                            <div className="space-y-4">
                                <div className="animate-in slide-in-from-top-2 duration-300 space-y-1">
                                    <label className="text-[10px] font-bold text-purple-500 uppercase ml-1 tracking-tight">{t('newTx.whichCard')}</label>
                                    <button type="button" onClick={() => setIsCardPickerOpen(true)} className="w-full py-3.5 px-4 bg-purple-50 dark:bg-purple-900/10 text-purple-900 dark:text-purple-100 rounded-xl text-left flex justify-between items-center border border-purple-200 dark:border-purple-900/30">
                                        <div className="flex items-center gap-3">
                                            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: selectedCard?.color || '#9333EA' }} />
                                            <span className="font-bold text-sm">
                                                {selectedCard?.name || t('newTx.selectCard')}
                                            </span>
                                        </div>
                                        <ChevronDownIcon className="h-5 w-5 text-purple-400" />
                                    </button>
                                </div>

                                {/* Seletor de Fatura (Edição) */}
                                <div className="animate-in slide-in-from-top-2 duration-300 space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase ml-1 tracking-tight">{t('newTx.changeInvoice')}</label>
                                    <button type="button" onClick={() => setIsStatementPickerOpen(true)} className="w-full py-3.5 px-4 bg-light-card-elevated dark:bg-dark-bg text-light-text dark:text-dark-text rounded-xl text-left flex justify-between items-center border border-light-border dark:border-dark-elevated focus:border-dark-accent transition-all">
                                        <span className="font-bold text-sm">{currentStatementLabel}</span>
                                        <ChevronDownIcon className="h-5 w-5 text-slate-400" />
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="flex gap-3 mt-6">
                            <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 font-bold text-xs uppercase tracking-widest">{t('common.cancel')}</button>
                            <button type="submit" className="flex-1 py-3 rounded-xl bg-[#3B82F6] text-white font-bold text-xs uppercase tracking-widest shadow-lg shadow-dark-accent/20">{t('common.save')}</button>
                        </div>
                    </form>
                </div>
            </Modal>

            {/* Modal de Calendário Interno (para Edição) */}
            <Modal isOpen={isInnerCalendarOpen} onClose={() => setIsInnerCalendarOpen(false)}>
                <Calendar
                    selectedDate={editForm.data}
                    onDateSelect={d => { setEditForm({ ...editForm, data: d }); setIsInnerCalendarOpen(false); }}
                    initialDisplayDate={new Date(editForm.data + 'T00:00:00')}
                    transactions={allTransactions}
                />
            </Modal>

            {/* Modal de Seletor de Categoria (para Edição) */}
            <ListPickerModal
                isOpen={isCategoryPickerOpen}
                onClose={() => setIsCategoryPickerOpen(false)}
                title={t('newTx.category')}
                items={getCategoriesForType(categorias, currentTxType).map(c => ({ id: c.name, name: getTranslatedCategoryName(c.name, t), icon: c.icon, color: getCorPorCategoria(c.name, categoryColors) }))}
                selectedId={editForm.categoria}
                onSelect={i => setEditForm({ ...editForm, categoria: i.id })}
            />

            {/* Modal de Seletor de Conta (para Edição) */}
            <ListPickerModal
                isOpen={isAccountPickerOpen}
                onClose={() => setIsAccountPickerOpen(false)}
                title={t('newTx.whichAccount')}
                items={accounts.map(a => ({ 
                    id: a.id, 
                    name: a.bankName,
                    icon: getBankLogo(a.bankName, "w-6 h-6") || '🏦'
                }))}
                selectedId={editForm.accountId}
                onSelect={i => setEditForm({ ...editForm, accountId: i.id })}
            />

            {/* Modal de Seletor de Cartão (para Edição) */}
            <ListPickerModal
                isOpen={isCardPickerOpen}
                onClose={() => setIsCardPickerOpen(false)}
                title={t('newTx.whichCard')}
                items={creditCards.map(c => ({ 
                    id: c.id, 
                    name: c.name,
                    icon: <CreditCardIcon className="h-5 w-5" />,
                    color: c.color
                }))}
                selectedId={editForm.cardId}
                onSelect={i => setEditForm({ ...editForm, cardId: i.id })}
            />

            {/* Modal de Seletor de Fatura (para Edição) */}
            <InvoicePickerModal
                isOpen={isStatementPickerOpen}
                onClose={() => setIsStatementPickerOpen(false)}
                selectedId={editForm.statementDate || defaultStatementDate}
                onSelect={i => setEditForm({ ...editForm, statementDate: i.id })}
            />

            {/* Modal de Confirmação de Exclusão Simples */}
            <Modal isOpen={!!confirmingDeleteId} onClose={() => setConfirmingDeleteId(null)}>
                <div className="text-center">
                    <div className="bg-red-100 dark:bg-red-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <TrashIcon className="h-8 w-8 text-red-600" />
                    </div>
                    <h3 className="text-lg font-bold mb-2 text-light-text dark:text-dark-text">{t('management.deleteTxQuestion')}</h3>
                    <p className="text-sm text-slate-500 mb-8">{t('management.deleteTxWarning')}</p>
                    <div className="flex gap-3">
                        <button onClick={() => setConfirmingDeleteId(null)} className="flex-1 p-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 font-bold rounded-xl text-sm uppercase">{t('common.cancel')}</button>
                        <button onClick={handleConfirmDelete} className="flex-1 p-3 bg-red-600 text-white font-bold rounded-xl text-sm uppercase shadow-lg shadow-red-500/20">{t('common.delete')}</button>
                    </div>
                </div>
            </Modal>

            {/* Modal de Confirmação de Exclusão de Série (Futuras) */}
            <Modal isOpen={!!confirmingDeleteFutureTx} onClose={() => setConfirmingDeleteFutureTx(null)}>
                <div className="text-center">
                    <div className="bg-orange-100 dark:bg-orange-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <RepeatIcon className="h-8 w-8 text-orange-600" />
                    </div>
                    <h3 className="text-lg font-bold mb-2 text-light-text dark:text-dark-text">{t('management.deleteSeriesQuestion')}</h3>
                    <p className="text-sm text-slate-500 mb-8 leading-relaxed">
                        {t('management.deleteSeriesWarning')}
                    </p>
                    <div className="flex gap-3">
                        <button onClick={() => setConfirmingDeleteFutureTx(null)} className="flex-1 p-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 font-bold rounded-xl text-xs uppercase">{t('common.cancel')}</button>
                        <button onClick={handleConfirmDeleteFuture} className="flex-1 p-3 bg-red-600 text-white font-bold rounded-xl text-xs uppercase shadow-lg shadow-dark-accent/20">{t('management.deleteAll')}</button>
                    </div>
                </div>
            </Modal>

            {/* Modal de Escopo de Edição (Recorrente) */}
            <Modal isOpen={isEditScopeModalOpen} onClose={() => setIsEditScopeModalOpen(false)}>
                <div className="text-center">
                    <div className="bg-blue-100 dark:bg-[#3B82F6]/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <RepeatIcon className="h-8 w-8 text-[#3B82F6]" />
                    </div>
                    <h3 className="text-lg font-bold mb-2 text-light-text dark:text-dark-text">{t('management.editSeriesTitle')}</h3>
                    <p className="text-sm text-slate-500 mb-8 leading-relaxed">
                        {t('management.editSeriesWarning')}
                    </p>
                    <div className="flex flex-col gap-3">
                        <button onClick={() => submitEdit('single')} className="w-full p-4 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-light-text dark:text-dark-text font-bold rounded-xl text-sm uppercase transition-colors">
                            {t('management.onlyThis')}
                        </button>
                        <button onClick={() => submitEdit('future')} className="w-full p-4 bg-[#3B82F6] hover:bg-blue-700 text-white font-bold rounded-xl text-sm uppercase shadow-lg shadow-dark-accent/20 transition-colors">
                            {t('management.thisAndNext')}
                        </button>
                    </div>
                    <button onClick={() => setIsEditScopeModalOpen(false)} className="mt-4 text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-widest">
                        {t('common.cancel')}
                    </button>
                </div>
            </Modal>

            {/* Modal de Detalhes da Transação */}
            {detailsTx && (
                <Modal isOpen={!!detailsTxId} onClose={() => setDetailsTxId(null)}>
                    <div className="space-y-5">
                        {/* Cabeçalho: Valor + Tipo */}
                        <div className="text-center pb-4 border-b border-light-border dark:border-dark-elevated">
                            <span className={`text-3xl font-black ${detailsTx.tipo === 'entrada' ? 'text-emerald-500' : detailsTx.tipo === 'saida' ? 'text-rose-500' : 'text-slate-500'}`}>
                                {detailsTx.tipo === 'entrada' ? '+' : detailsTx.tipo === 'saida' ? '-' : ''}{formatCurrency(detailsTx.valor, appLocale, appCurrency)}
                            </span>
                            <p className="font-bold text-base text-light-text dark:text-dark-text mt-2">{detailsTx.descricao}</p>
                            <div className="flex items-center justify-center gap-2 mt-2">
                                <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${
                                    detailsTx.tipo === 'entrada' 
                                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' 
                                        : detailsTx.tipo === 'saida'
                                        ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400'
                                        : 'bg-slate-100 dark:bg-slate-800 text-light-text-secondary dark:text-dark-text-secondary'
                                }}`}>
                                    {detailsTx.tipo === 'entrada' ? t('dashboard.income') : detailsTx.tipo === 'saida' ? t('dashboard.expenses') : t('payMethod.transfer')}
                                </span>
                                {detailsTx.isRecurring && (
                                    <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 flex items-center gap-1">
                                        <RepeatIcon className="h-2.5 w-2.5" /> {t('common.recurrence')}
                                    </span>
                                )}
                                {detailsTx.installment && (
                                    <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400">
                                        {detailsTx.installment.current}/{detailsTx.installment.total}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Seção: Informações */}
                        <div className="bg-light-card-elevated dark:bg-dark-bg rounded-2xl border border-light-border dark:border-dark-elevated overflow-hidden">
                            <div className="px-4 py-2.5 border-b border-light-border dark:border-dark-elevated">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">{t('common.details')}</p>
                            </div>
                            
                            {/* Categoria */}
                            <div className="px-4 py-3 flex justify-between items-center border-b border-slate-100/70 dark:border-slate-800/50">
                                <span className="text-xs text-light-text-muted dark:text-dark-text-muted font-medium">{t('newTx.category')}</span>
                                <span className="font-bold text-sm text-light-text dark:text-dark-text">{detailsTx.categoria}</span>
                            </div>

                            {/* Data */}
                            <div className="px-4 py-3 flex justify-between items-center border-b border-slate-100/70 dark:border-slate-800/50">
                                <span className="text-xs text-light-text-muted dark:text-dark-text-muted font-medium">{t('newTx.date')}</span>
                                <span className="font-bold text-sm text-light-text dark:text-dark-text">
                                    {new Date(detailsTx.data + 'T00:00:00').toLocaleDateString(appLocale)}
                                </span>
                            </div>

                            {/* Data da Compra (se diferente) */}
                            {detailsTx.compraData && detailsTx.compraData !== detailsTx.data && (
                                <div className="px-4 py-3 flex justify-between items-center border-b border-slate-100/70 dark:border-slate-800/50">
                                    <span className="text-xs text-light-text-muted dark:text-dark-text-muted font-medium">{t('management.purchaseDate')}</span>
                                    <span className="font-bold text-sm text-light-text dark:text-dark-text">
                                        {new Date(detailsTx.compraData + 'T00:00:00').toLocaleDateString(appLocale)}
                                    </span>
                                </div>
                            )}

                            {/* Método */}
                            <div className="px-4 py-3 flex justify-between items-center">
                                <span className="text-xs text-light-text-muted dark:text-dark-text-muted font-medium">{t('newTx.paymentMethod')}</span>
                                <span className="font-bold text-sm text-light-text dark:text-dark-text flex items-center gap-1.5">
                                    {detailsTx.paymentMethod === 'credito' 
                                        ? <><CreditCardIcon className="h-3.5 w-3.5 text-purple-500" /> {t('payMethod.credit')}</>
                                        : <><BankIcon className="h-3.5 w-3.5 text-emerald-500" /> {t('payMethod.debit')}</>
                                    }
                                </span>
                            </div>
                        </div>

                        {/* Seção: Pagamento (Conta / Cartão / Fatura) — só aparece se houver dados */}
                        {(detailsTx.accountId || detailsTx.cardId || (detailsTx.paymentMethod === 'credito' && detailsTx.statementDate)) && (
                            <div className="bg-light-card-elevated dark:bg-dark-bg rounded-2xl border border-light-border dark:border-dark-elevated overflow-hidden">
                                <div className="px-4 py-2.5 border-b border-light-border dark:border-dark-elevated">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">{t('newTx.paymentMethod')}</p>
                                </div>

                                {detailsTx.accountId && (
                                    <div className="px-4 py-3 flex justify-between items-center border-b border-slate-100/70 dark:border-slate-800/50 last:border-b-0">
                                        <span className="text-xs text-light-text-muted dark:text-dark-text-muted font-medium">{t('newTx.whichAccount')}</span>
                                        <div className="flex items-center gap-2">
                                            <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: accounts.find(a => a.id === detailsTx.accountId)?.color || '#3B82F6' }} />
                                            <span className="font-bold text-sm text-light-text dark:text-dark-text">
                                                {accounts.find(a => a.id === detailsTx.accountId)?.bankName || 'N/A'}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {detailsTx.cardId && (
                                    <div className="px-4 py-3 flex justify-between items-center border-b border-slate-100/70 dark:border-slate-800/50 last:border-b-0">
                                        <span className="text-xs text-light-text-muted dark:text-dark-text-muted font-medium">{t('newTx.whichCard')}</span>
                                        <div className="flex items-center gap-2">
                                            <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: creditCards.find(c => c.id === detailsTx.cardId)?.color || '#9333EA' }} />
                                            <span className="font-bold text-sm text-light-text dark:text-dark-text">
                                                {creditCards.find(c => c.id === detailsTx.cardId)?.name || 'N/A'}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {detailsTx.paymentMethod === 'credito' && detailsTx.statementDate && (
                                    <div className="px-4 py-3 flex justify-between items-center">
                                        <span className="text-xs text-light-text-muted dark:text-dark-text-muted font-medium">{t('newTx.changeInvoice')}</span>
                                        <span className="font-bold text-sm text-light-text dark:text-dark-text">
                                            {(() => {
                                                const [y, m] = detailsTx.statementDate.split('-');
                                                return `${getMonthName(parseInt(m, 10) - 1)} ${y}`;
                                            })()}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </Modal>
            )}
        </div>
    );
};

export { Management };
export default Management;
