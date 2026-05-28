import React, { useContext, useState, useRef, useEffect, useMemo } from 'react';
import { AppContext } from '../context/AppContext';
import {
    ArrowLeftIcon, PlusIcon, HelpCircleIcon, CheckCircleIcon,
    TrashIcon, InformationCircleIcon, XCircleIcon, ChevronDownIcon
} from './icons';
import { CreditCard, ResetOptions } from '../types';
import { supabase } from '../utils/supabaseClient';
import { NotificationService } from '../utils/notificationService';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import Modal from './Modal';
import { parseCurrency, formatCurrencyForInput, fileToBase64, analyzeStatement, exportTransactionsToExcel } from '../utils/helpers';
import { COLOR_PALETTE, AVAILABLE_BADGES, MESES_NOMES } from '../constants';
import ListPickerModal from './ListPickerModal';

// Import Settings Subcomponents
import ProfileSettings from './settings/ProfileSettings';
import LayoutSettings from './settings/LayoutSettings';
import CardsSettings from './settings/CardsSettings';
import DataSettings from './settings/DataSettings';
import PrivacySettings from './settings/PrivacySettings';
import AchievementsViewer from './settings/AchievementsViewer';
import SettingsMainMenu from './settings/SettingsMainMenu';

const CardPreview: React.FC<{ name: string; color: string; closingDay: string; closingType: 'fixed' | 'dynamic'; closingDaysBefore: string; dueDay: string }> = ({ name, color, closingDay, closingType, closingDaysBefore, dueDay }) => {
    const closingLabel = closingType === 'dynamic'
        ? `Fecha ${closingDaysBefore || '--'} dias antes`
        : `Fecha dia ${closingDay || '--'}`;

    return (
        <div
            className="w-full mx-auto rounded-[22px] relative overflow-hidden shadow-2xl transition-all duration-500 mb-6 mt-1 shrink-0"
            style={{
                backgroundColor: color,
                backgroundImage: `linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 60%, rgba(0,0,0,0.18) 100%)`,
                aspectRatio: '1.586 / 1',
                maxWidth: '100%',
            }}
        >
            {/* Brilho de luz no topo */}
            <div className="absolute -top-12 -left-12 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />

            {/* Chip EMV — absoluto no topo esquerdo */}
            <div
                className="absolute top-5 left-5 w-11 h-8 rounded-lg overflow-hidden flex-shrink-0"
                style={{ backgroundColor: '#e8c84a', backgroundImage: 'linear-gradient(135deg, #f5dc6e 0%, #c9a227 100%)' }}
            >
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-px p-1 opacity-40">
                    {[...Array(9)].map((_, i) => (
                        <div key={i} className="bg-yellow-900/30 rounded-sm" />
                    ))}
                </div>
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-yellow-900/20" />
                <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-yellow-900/20" />
            </div>

            {/* Nome e datas — centralizados verticalmente à esquerda */}
            <div className="absolute inset-0 p-5 flex flex-col justify-center">
                <div className="space-y-1">
                    <h4 className="text-white font-black text-lg tracking-tight leading-none truncate max-w-[75%] uppercase drop-shadow">
                        {name || 'Nome do Cartão'}
                    </h4>
                    <div className="flex gap-4">
                        <span className="text-[9px] text-white/75 font-bold uppercase tracking-widest">
                            {closingLabel}
                        </span>
                        <span className="text-[9px] text-white/75 font-bold uppercase tracking-widest">
                            Vence dia {dueDay || '--'}
                        </span>
                    </div>
                </div>
            </div>


            {/* Logo Mastercard */}
            <div className="absolute bottom-5 right-5 flex -space-x-3">
                <div className="w-9 h-9 rounded-full opacity-90" style={{ backgroundColor: '#eb001b' }} />
                <div className="w-9 h-9 rounded-full opacity-80" style={{ backgroundColor: '#f79e1b' }} />
            </div>
        </div>
    );
};

const DayGridPicker: React.FC<{ label: string; selectedDay: string; onSelect: (day: string) => void }> = ({ label, selectedDay, onSelect }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative">
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1 tracking-tight">{label}</label>
            <button
                type="button"
                onClick={() => {
                    Haptics.impact({ style: ImpactStyle.Light }).catch(() => { });
                    setIsOpen(true);
                }}
                className={`w-full py-3.5 px-4 bg-light-bg dark:bg-dark-surface border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-sm text-slate-900 dark:text-white flex justify-between items-center transition-all`}
            >
                {selectedDay ? `Dia ${selectedDay}` : 'Selecionar'}
                <ChevronDownIcon className={`h-4 w-4 text-slate-400`} />
            </button>

            <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
                <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 uppercase tracking-tight text-center">{label}</h3>
                    <div className="grid grid-cols-7 gap-y-4 gap-x-2 text-center">
                        {Array.from({ length: 31 }, (_, i) => i + 1).map(day => {
                            const isSelected = String(day) === selectedDay;
                            return (
                                <button
                                    key={day}
                                    type="button"
                                    onClick={() => {
                                        Haptics.impact({ style: ImpactStyle.Medium }).catch(() => { });
                                        onSelect(String(day));
                                        setIsOpen(false);
                                    }}
                                    className={`h-10 w-full flex items-center justify-center rounded-full text-sm font-bold transition-all mx-auto max-w-[40px] ${isSelected ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 ring-2 ring-blue-400/50' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                                >
                                    {day}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </Modal>
        </div>
    );
};

const DASHBOARD_LABELS: Record<string, string> = {
    resumo: "Resumo",
    invoices: "Faturas",
    insights: "CFO IA",
    resumoDiario: "Métricas",
    orcamento: "Orçamentos",
    tendencias: "Tendências",
    despesasCategoria: "Despesas por Categoria",
    receitasCategoria: "Receitas por Categoria",
    despesasRecorrentes: "Despesas Recorrentes",
    metodosPagamentoChart: "Débito vs Crédito"
};

const RESET_LABELS: Record<string, string> = {
    transactions: "Todas as Transações",
    categories: "Categorias Personalizadas",
    goals: "Metas de Poupança",
    cards: "Cartões de Crédito",
    budgets: "Orçamentos Definidos",
    achievements: "Conquistas (Badges)",
    layout: "Layout do Dashboard",
    importHistory: "Histórico de Importação"
};

const MenuScreen: React.FC = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error("MenuScreen used outside provider");

    const {
        userProfile, handleLogout, setCurrentView, menuSubView, setMenuSubView,
        creditCards, handleAddCreditCard, handleEditCreditCard, handleDeleteCreditCard,
        allTransactions, handleResetData, toggleTheme, showToast, theme, handleDeleteAccount,
        dashboardLayout, handleUpdateLayout, updateUserProfile, categorias, handleLancamentoSubmit
    } = context;

    // Ref para o container de scroll
    const scrollContainerRef = useRef<HTMLElement>(null);

    // Efeito para resetar o scroll ao mudar a sub-tela
    useEffect(() => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = 0;
        }
    }, [menuSubView]);

    const [isCardModalOpen, setIsCardModalOpen] = useState(false);
    const [editingCardId, setEditingCardId] = useState<string | null>(null);
    const [deletingCardId, setDeletingCardId] = useState<string | null>(null); // Estado para confirmação de exclusão
    const [cardModalTab, setCardModalTab] = useState<'dados' | 'visual'>('dados');
    const [cardForm, setCardForm] = useState({
        name: '',
        limit: '',
        closingDay: '',
        closingType: 'fixed' as 'fixed' | 'dynamic',
        closingDaysBefore: '',
        dueDay: '',
        color: COLOR_PALETTE[0]
    });

    // Reset Modal State
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [isResetConfirming, setIsResetConfirming] = useState(false); // Novo estado para etapa de confirmação
    const [isDeleteAccountModalOpen, setIsDeleteAccountModalOpen] = useState(false); // Modal de exclusão de conta
    const [resetSelection, setResetSelection] = useState<ResetOptions>({
        transactions: true,
        categories: false,
        goals: false,
        cards: false,
        budgets: false,
        achievements: false,
        layout: false,
        importHistory: false
    });

    // Import State
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isImporting, setIsImporting] = useState(false);

    // Configuração Dinâmica do Cabeçalho Unificado
    const headerConfig = useMemo(() => {
        if (menuSubView === 'profile') {
            return {
                title: 'Menu',
                onBack: () => setCurrentView('main'),
                action: null
            };
        }

        const titles: Record<string, string> = {
            editProfile: 'Minhas Informações',
            layout: 'Layout e Visual',
            cards: 'Meus Cartões',
            data: 'Gerenciar Dados',
            achievements: 'Minhas Conquistas',
            privacy: 'Legal e Privacidade'
        };

        const title = titles[menuSubView] || 'Voltar';

        let action = null;
        if (menuSubView === 'cards') {
            action = (
                <button onClick={() => openCardModal()} className="p-2 bg-light-accent text-white rounded-full shadow-lg shadow-light-accent/20 active:scale-95 transition-all">
                    <PlusIcon className="h-5 w-5" />
                </button>
            );
        }

        return {
            title,
            onBack: () => setMenuSubView('profile'),
            action
        };
    }, [menuSubView, setCurrentView, setMenuSubView]);

    const openCardModal = (card?: CreditCard) => {
        if (card) {
            setEditingCardId(card.id);
            setCardForm({
                name: card.name,
                // Fix: Ensure we format with 2 decimals so the helper function treats it as a full amount, not cents
                limit: formatCurrencyForInput(card.limit.toFixed(2)),
                closingDay: String(card.closingDay),
                closingType: card.closingType || 'fixed',
                closingDaysBefore: card.closingDaysBefore != null ? String(card.closingDaysBefore) : '',
                dueDay: String(card.dueDay),
                color: card.color
            });
        } else {
            setEditingCardId(null);
            setCardForm({ name: '', limit: '', closingDay: '', closingType: 'fixed', closingDaysBefore: '', dueDay: '', color: COLOR_PALETTE[0] });
        }
        setCardModalTab('dados');
        setIsCardModalOpen(true);
    };

    const handleCardSubmit = () => {
        const isFixed = cardForm.closingType === 'fixed';
        const isDynamic = cardForm.closingType === 'dynamic';

        if (!cardForm.name || !cardForm.limit || !cardForm.dueDay) {
            showToast("Preencha todos os campos.", "error");
            return;
        }

        if (isFixed && !cardForm.closingDay) {
            showToast("Selecione o dia de fechamento.", "error");
            return;
        }

        if (isDynamic && !cardForm.closingDaysBefore) {
            showToast("Informe quantos dias antes do vencimento.", "error");
            return;
        }

        const limitValue = parseCurrency(cardForm.limit);
        const closingDaysBefore = isDynamic ? parseInt(cardForm.closingDaysBefore) : undefined;

        const newCard = {
            name: cardForm.name,
            limit: limitValue, // Fix: Do not multiply by 100, parseCurrency already returns the unit value (float)
            closingDay: isFixed ? parseInt(cardForm.closingDay) : (closingDaysBefore != null ? Math.max(1, parseInt(cardForm.dueDay) - closingDaysBefore) : 1),
            closingType: cardForm.closingType,
            closingDaysBefore,
            dueDay: parseInt(cardForm.dueDay),
            color: cardForm.color
        };

        if (editingCardId) {
            handleEditCreditCard(editingCardId, newCard);
        } else {
            handleAddCreditCard(newCard);
        }
        setIsCardModalOpen(false);
    };

    const confirmDeleteCard = () => {
        if (deletingCardId) {
            handleDeleteCreditCard(deletingCardId);
            setDeletingCardId(null);
        }
    };

    const handleDayInput = (value: string, field: 'closingDay' | 'dueDay') => {
        const numericValue = value.replace(/\D/g, '');
        if (numericValue === '') {
            setCardForm(prev => ({ ...prev, [field]: '' }));
            return;
        }
        const day = parseInt(numericValue, 10);
        if (day >= 1 && day <= 31) {
            setCardForm(prev => ({ ...prev, [field]: numericValue }));
        }
    };

    const moveItem = (index: number, direction: 'up' | 'down') => {
        const newOrder = [...dashboardLayout.order];
        if (direction === 'up' && index > 0) {
            [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
        } else if (direction === 'down' && index < newOrder.length - 1) {
            [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
        }
        handleUpdateLayout({ ...dashboardLayout, order: newOrder });
    };

    const toggleVisibility = (key: string) => {
        handleUpdateLayout({
            ...dashboardLayout,
            visibility: {
                ...dashboardLayout.visibility,
                [key]: !dashboardLayout.visibility[key]
            }
        });
    };

    const handleResetToggle = (key: keyof ResetOptions) => {
        setResetSelection(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleSelectAllReset = () => {
        const allSelected = Object.values(resetSelection).every(v => v);
        const newValue = !allSelected;
        setResetSelection({
            transactions: newValue,
            categories: newValue,
            goals: newValue,
            cards: newValue,
            budgets: newValue,
            achievements: newValue,
            layout: newValue,
            importHistory: newValue
        });
    };

    const proceedToResetConfirmation = () => {
        const hasSelection = Object.values(resetSelection).some(v => v);
        if (!hasSelection) {
            showToast("Selecione pelo menos um item para limpar.", "error");
            return;
        }
        setIsResetConfirming(true);
    };

    const cancelReset = () => {
        if (isResetConfirming) {
            setIsResetConfirming(false);
        } else {
            setIsResetModalOpen(false);
        }
    };

    const confirmFinalReset = () => {
        handleResetData(resetSelection);
        setIsResetModalOpen(false);
        setTimeout(() => setIsResetConfirming(false), 300); // Reset state after closing
    };

    // Wrapper para proteger funções PRO
    const handleProAction = (action: () => void) => {
        if (userProfile.isPremium) {
            action();
        } else {
            setCurrentView('premium' as any);
        }
    };

    const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!userProfile.isPremium) return; // Segurança extra

        const file = e.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        try {
            const transactions = await analyzeStatement(file, categorias);

            let addedCount = 0;
            for (const tx of transactions) {
                const mockEvent = { preventDefault: () => { } } as React.FormEvent;
                handleLancamentoSubmit(mockEvent, {
                    ...tx,
                    paymentMethod: 'debito',
                    isRecurring: false
                });
                addedCount++;
            }

            showToast(`${addedCount} transações importadas com sucesso!`, "success");
        } catch (error) {
            console.error(error);
            showToast("Falha ao importar extrato. Verifique o arquivo.", "error");
        } finally {
            setIsImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleNotificationToggle = async () => {
        if (!userProfile.notificationsEnabled) {
            const granted = await NotificationService.requestPermission();
            if (granted) {
                await NotificationService.scheduleInactivityReminders();
                updateUserProfile({ notificationsEnabled: true });
                showToast("Notificações ativadas!", "success");
            } else {
                showToast("Permissão de notificação negada.", "error");
            }
        } else {
            await NotificationService.cancelAll();
            updateUserProfile({ notificationsEnabled: false });
            showToast("Notificações desativadas.", "info");
        }
    };

    const handleHapticToggle = () => {
        const newValue = !userProfile.hapticsEnabled;
        updateUserProfile({ hapticsEnabled: newValue });
        if (newValue) {
            Haptics.impact({ style: ImpactStyle.Medium }).catch(() => { });
        }
    };

    const handleOpenLink = (url: string) => {
        // Usa _system para abrir no navegador padrão do Android/iOS, não dentro do app
        window.open(url, '_system');
    };

    // Main render switch
    return (
        <div className="bg-light-bg dark:bg-dark-bg h-full text-slate-800 dark:text-slate-200 flex flex-col transition-colors duration-300">
            <header className="p-4 pt-[calc(1rem+env(safe-area-inset-top))] bg-light-bg/95 dark:bg-dark-bg border-b border-light-bg dark:border-slate-800 sticky top-0 z-20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={headerConfig.onBack} className="p-2 rounded-full hover:bg-light-bg dark:hover:bg-dark-surface transition">
                        <ArrowLeftIcon className="h-6 w-6 text-slate-700 dark:text-slate-200" />
                    </button>
                    <h1 className="text-lg font-bold">{headerConfig.title}</h1>
                </div>
                {headerConfig.action && (
                    <div className="flex items-center">{headerConfig.action}</div>
                )}
            </header>

            <main ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 pb-[calc(6rem+env(safe-area-inset-bottom))] no-scrollbar">
                {menuSubView === 'profile' && (
                    <SettingsMainMenu
                        setMenuSubView={setMenuSubView}
                        setCurrentView={setCurrentView as any}
                        handleLogout={handleLogout}
                    />
                )}
                {menuSubView === 'editProfile' && <ProfileSettings />}
                {menuSubView === 'layout' && (
                    <LayoutSettings
                        handleNotificationToggle={handleNotificationToggle}
                        handleHapticToggle={handleHapticToggle}
                    />
                )}
                {menuSubView === 'cards' && (
                    <CardsSettings
                        openCardModal={openCardModal}
                        setDeletingCardId={setDeletingCardId}
                    />
                )}
                {menuSubView === 'data' && (
                    <DataSettings
                        fileInputRef={fileInputRef}
                        handleFileImport={handleFileImport}
                        isImporting={isImporting}
                        handleProAction={handleProAction}
                        setIsResetModalOpen={setIsResetModalOpen}
                        setMenuSubView={setMenuSubView}
                        setIsDeleteAccountModalOpen={setIsDeleteAccountModalOpen}
                    />
                )}
                {menuSubView === 'privacy' && <PrivacySettings handleOpenLink={handleOpenLink} />}
                {menuSubView === 'achievements' && <AchievementsViewer />}
            </main>

            {/* Modal de Cartão — Redesenhado */}
            <Modal isOpen={isCardModalOpen} onClose={() => setIsCardModalOpen(false)}>
                <div className="flex flex-col" style={{ maxHeight: '88vh' }}>

                    {/* Header */}
                    <div className="flex items-center gap-3 mb-5 flex-shrink-0">
                        <div className="w-8 h-8 rounded-xl bg-light-accent/10 dark:bg-light-accent/20 flex items-center justify-center">
                            <svg className="h-4 w-4 text-light-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <rect x="2" y="5" width="20" height="14" rx="2" />
                                <path d="M2 10h20" />
                            </svg>
                        </div>
                        <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight flex-1">
                            {editingCardId ? 'Editar Cartão' : 'Novo Cartão'}
                        </h3>
                    </div>

                    {/* Abas DADOS / VISUAL */}
                    <div className="flex border-b border-slate-200 dark:border-slate-700 mb-5 flex-shrink-0">
                        <button
                            onClick={() => setCardModalTab('dados')}
                            className={`flex-1 pb-2.5 text-[11px] font-black uppercase tracking-widest transition-all ${
                                cardModalTab === 'dados'
                                    ? 'text-light-accent border-b-2 border-light-accent'
                                    : 'text-slate-400 dark:text-slate-500'
                            }`}
                        >
                            Dados
                        </button>
                        <button
                            onClick={() => setCardModalTab('visual')}
                            className={`flex-1 pb-2.5 text-[11px] font-black uppercase tracking-widest transition-all ${
                                cardModalTab === 'visual'
                                    ? 'text-light-accent border-b-2 border-light-accent'
                                    : 'text-slate-400 dark:text-slate-500'
                            }`}
                        >
                            Visual
                        </button>
                    </div>

                    {/* Conteúdo scrollável */}
                    <div className="flex-1 overflow-y-auto no-scrollbar">

                        {/* Preview do cartão — sempre visível */}
                        <CardPreview
                            name={cardForm.name}
                            color={cardForm.color}
                            closingDay={cardForm.closingDay}
                            closingType={cardForm.closingType}
                            closingDaysBefore={cardForm.closingDaysBefore}
                            dueDay={cardForm.dueDay}
                        />

                        {/* Aba DADOS */}
                        {cardModalTab === 'dados' && (
                            <div className="space-y-4">

                                {/* Apelido */}
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Apelido do Cartão</label>
                                    <input
                                        type="text"
                                        value={cardForm.name}
                                        onChange={e => setCardForm({ ...cardForm, name: e.target.value })}
                                        className="w-full py-4 px-4 bg-slate-200/70 dark:bg-slate-700 border-0 rounded-2xl font-semibold text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-light-accent outline-none transition-all"
                                        placeholder="Ex: Nubank, Inter..."
                                        autoComplete="off"
                                    />
                                </div>

                                {/* Limite */}
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Limite Mensal</label>
                                    <input
                                        type="tel"
                                        value={cardForm.limit}
                                        onChange={e => setCardForm({ ...cardForm, limit: formatCurrencyForInput(e.target.value) })}
                                        className="w-full py-4 px-4 bg-slate-200/70 dark:bg-slate-700 border-0 rounded-2xl font-semibold text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-light-accent outline-none transition-all"
                                        placeholder="R$ 0,00"
                                        autoComplete="off"
                                    />
                                </div>

                                {/* Dia Vencimento e Dia Fechamento lado a lado */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Dia Vencimento</label>
                                        <div className="relative">
                                            <select
                                                value={cardForm.dueDay}
                                                onChange={e => setCardForm(prev => ({ ...prev, dueDay: e.target.value }))}
                                                className="w-full py-4 px-4 pr-8 bg-slate-200/70 dark:bg-slate-700 border-0 rounded-2xl font-semibold text-sm text-slate-900 dark:text-white appearance-none focus:ring-2 focus:ring-light-accent outline-none transition-all cursor-pointer"
                                            >
                                                <option value="">Selecionar</option>
                                                {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                                                    <option key={d} value={String(d)}>Dia {d}</option>
                                                ))}
                                            </select>
                                            <ChevronDownIcon className="h-4 w-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                        </div>
                                    </div>

                                    {cardForm.closingType === 'fixed' && (
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Dia Fechamento</label>
                                            <div className="relative">
                                                <select
                                                    value={cardForm.closingDay}
                                                    onChange={e => setCardForm(prev => ({ ...prev, closingDay: e.target.value }))}
                                                    className="w-full py-4 px-4 pr-8 bg-slate-200/70 dark:bg-slate-700 border-0 rounded-2xl font-semibold text-sm text-slate-900 dark:text-white appearance-none focus:ring-2 focus:ring-light-accent outline-none transition-all cursor-pointer"
                                                >
                                                    <option value="">Selecionar</option>
                                                    {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                                                        <option key={d} value={String(d)}>Dia {d}</option>
                                                    ))}
                                                </select>
                                                <ChevronDownIcon className="h-4 w-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                            </div>
                                        </div>
                                    )}

                                    {cardForm.closingType === 'dynamic' && (
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Dias antes Venc.</label>
                                            <input
                                                type="tel"
                                                value={cardForm.closingDaysBefore}
                                                onChange={e => {
                                                    const val = e.target.value.replace(/\D/g, '');
                                                    if (val === '') { setCardForm(prev => ({ ...prev, closingDaysBefore: '' })); return; }
                                                    const num = parseInt(val, 10);
                                                    if (num >= 1 && num <= 30) setCardForm(prev => ({ ...prev, closingDaysBefore: val }));
                                                }}
                                                className="w-full py-4 px-4 bg-slate-200/70 dark:bg-slate-700 border-0 rounded-2xl font-semibold text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-light-accent outline-none transition-all"
                                                placeholder="Ex: 7"
                                                autoComplete="off"
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Tipo de Fechamento */}
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Tipo de Fechamento</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => { Haptics.impact({ style: ImpactStyle.Light }).catch(() => {}); setCardForm(prev => ({ ...prev, closingType: 'fixed' })); }}
                                            className={`py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                                                cardForm.closingType === 'fixed'
                                                    ? 'bg-light-accent text-white shadow-lg shadow-light-accent/30'
                                                    : 'bg-slate-200/70 dark:bg-slate-700 text-slate-500 dark:text-slate-300'
                                            }`}
                                        >
                                            Data Fixa
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { Haptics.impact({ style: ImpactStyle.Light }).catch(() => {}); setCardForm(prev => ({ ...prev, closingType: 'dynamic' })); }}
                                            className={`py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                                                cardForm.closingType === 'dynamic'
                                                    ? 'bg-light-accent text-white shadow-lg shadow-light-accent/30'
                                                    : 'bg-slate-200/70 dark:bg-slate-700 text-slate-500 dark:text-slate-300'
                                            }`}
                                        >
                                            Dinâmico
                                        </button>
                                    </div>
                                    {cardForm.closingType === 'dynamic' && cardForm.closingDaysBefore && cardForm.dueDay && (
                                        <p className="text-[10px] text-slate-400 mt-2 font-medium">
                                            Fecha {cardForm.closingDaysBefore} dias antes do vencimento (dia {cardForm.dueDay})
                                        </p>
                                    )}
                                </div>

                                <div className="pb-2" />
                            </div>
                        )}

                        {/* Aba VISUAL */}
                        {cardModalTab === 'visual' && (
                            <div className="space-y-6 pb-2">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Cor do Cartão</label>
                                    <div className="grid grid-cols-6 gap-3 px-1">
                                        {COLOR_PALETTE.map(color => (
                                            <button
                                                key={color}
                                                type="button"
                                                onClick={() => { Haptics.impact({ style: ImpactStyle.Light }).catch(() => {}); setCardForm({ ...cardForm, color }); }}
                                                className={`h-10 w-10 mx-auto rounded-full border-2 transition-all ${
                                                    cardForm.color.toLowerCase() === color.toLowerCase()
                                                        ? 'border-light-accent ring-4 ring-light-accent/25 scale-110 shadow-lg'
                                                        : 'border-transparent opacity-75 hover:opacity-100 hover:scale-105'
                                                }`}
                                                style={{ backgroundColor: color }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Botão salvar fixo na base */}
                    <div className="flex-shrink-0 pt-4">
                        <button
                            onClick={handleCardSubmit}
                            className="w-full py-4 rounded-2xl bg-light-accent text-white font-black text-sm uppercase tracking-widest shadow-xl shadow-light-accent/30 active:scale-[0.98] transition-all"
                        >
                            {editingCardId ? 'Salvar Alterações' : 'Criar Cartão'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Modal de Reset */}
            <Modal isOpen={isResetModalOpen} onClose={() => { setIsResetModalOpen(false); setTimeout(() => setIsResetConfirming(false), 200); }}>
                <div>
                    {!isResetConfirming ? (
                        <>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 uppercase tracking-tight">Limpar Dados</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-300 mb-6 font-medium">Selecione o que deseja apagar.</p>

                            <div className="space-y-3 mb-6 max-h-60 overflow-y-auto no-scrollbar">
                                <button onClick={handleSelectAllReset} className="text-[10px] font-bold text-light-accent uppercase tracking-widest mb-2">Alternar Todos</button>
                                {Object.entries(resetSelection).map(([key, value]) => (
                                    <div key={key} className="flex items-center justify-between p-3 bg-light-bg dark:bg-dark-surface/50 rounded-xl border border-slate-100 dark:border-slate-800" onClick={() => handleResetToggle(key as keyof ResetOptions)}>
                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200 capitalize">
                                            {RESET_LABELS[key] || key}
                                        </span>
                                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center ${value ? 'bg-red-500 border-red-500' : 'bg-white dark:bg-dark-surface border-slate-300 dark:border-slate-600'}`}>
                                            {value && <CheckCircleIcon className="h-3.5 w-3.5 text-white" />}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex gap-3">
                                <button onClick={cancelReset} className="flex-1 py-3 rounded-xl bg-light-bg dark:bg-slate-700 text-slate-600 dark:text-slate-200 font-bold text-xs uppercase">Cancelar</button>
                                <button onClick={proceedToResetConfirmation} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold text-xs uppercase shadow-lg shadow-red-600/20">Apagar Selecionados</button>
                            </div>
                        </>
                    ) : (
                        <div className="text-center">
                            <div className="bg-red-100 dark:bg-red-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                                <XCircleIcon className="h-8 w-8 text-red-600" />
                            </div>
                            <h3 className="text-lg font-bold mb-2 text-slate-900 dark:text-white uppercase tracking-tight">Tem certeza absoluta?</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-300 mb-4 leading-relaxed font-medium">
                                Você está prestes a excluir permanentemente os seguintes itens:
                            </p>

                            <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-xl mb-6 text-left border border-red-100 dark:border-red-900/20 max-h-40 overflow-y-auto no-scrollbar">
                                <ul className="space-y-1">
                                    {Object.entries(resetSelection).map(([key, isSelected]) => {
                                        if (!isSelected) return null;
                                        return (
                                            <li key={key} className="text-[11px] font-bold text-red-700 dark:text-red-300 flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                                                {RESET_LABELS[key] || key}
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>

                            <div className="flex gap-3">
                                <button onClick={cancelReset} className="flex-1 py-3 rounded-xl bg-light-bg dark:bg-slate-700 text-slate-600 dark:text-slate-200 font-bold text-xs uppercase">Voltar</button>
                                <button onClick={confirmFinalReset} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold text-xs uppercase shadow-lg shadow-red-500/20">Sim, Apagar Tudo</button>
                            </div>
                        </div>
                    )}
                </div>
            </Modal>

            {/* Modal de Exclusão de Conta */}
            <Modal isOpen={isDeleteAccountModalOpen} onClose={() => setIsDeleteAccountModalOpen(false)}>
                <div className="text-center">
                    <div className="bg-red-100 dark:bg-red-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <TrashIcon className="h-8 w-8 text-red-600" />
                    </div>
                    <h3 className="text-lg font-bold mb-2 text-slate-900 dark:text-white uppercase tracking-tight">Excluir Conta Permanentemente?</h3>
                    <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 p-4 rounded-xl mb-6 text-left">
                        <p className="text-xs text-red-700 dark:text-red-400 font-medium leading-relaxed">
                            Esta ação é <b>irreversível</b>. Todos os seus dados, transações, configurações e histórico serão apagados imediatamente.
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => setIsDeleteAccountModalOpen(false)} className="flex-1 py-3 rounded-xl bg-light-bg dark:bg-dark-surface text-slate-600 dark:text-slate-200 font-bold text-xs uppercase tracking-widest">Cancelar</button>
                        <button onClick={() => { setIsDeleteAccountModalOpen(false); handleDeleteAccount(); }} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold text-xs uppercase tracking-widest shadow-lg shadow-red-500/20">Sim, Excluir</button>
                    </div>
                </div>
            </Modal>

            {/* Modal de Confirmação de Exclusão de Cartão */}
            <Modal isOpen={!!deletingCardId} onClose={() => setDeletingCardId(null)}>
                <div className="text-center">
                    <div className="bg-red-100 dark:bg-red-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <TrashIcon className="h-8 w-8 text-red-600" />
                    </div>
                    <h3 className="text-lg font-bold mb-4 text-slate-900 dark:text-white uppercase tracking-tight">Excluir Cartão?</h3>

                    {(() => {
                        const usageCount = allTransactions.filter(t => t.cardId === deletingCardId).length;
                        if (usageCount > 0) {
                            return (
                                <div className="mb-6">
                                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30 p-4 rounded-xl flex items-start gap-3 mb-3 text-left">
                                        <InformationCircleIcon className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                                        <div>
                                            <p className="text-sm text-amber-800 dark:text-amber-200 font-bold mb-1">
                                                Atenção!
                                            </p>
                                            <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                                                Este cartão está vinculado a <b>{usageCount}</b> lançamentos. Se você excluir, o histórico financeiro será mantido, mas as transações perderão o vínculo com o cartão.
                                            </p>
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-300 font-medium">Deseja continuar mesmo assim?</p>
                                </div>
                            );
                        }
                        return <p className="text-sm text-slate-500 dark:text-slate-300 mb-8 font-medium">Tem certeza que deseja remover este cartão? Esta ação não pode ser desfeita.</p>;
                    })()}

                    <div className="flex gap-3">
                        <button onClick={() => setDeletingCardId(null)} className="flex-1 py-3 rounded-xl bg-light-bg dark:bg-dark-surface text-slate-600 dark:text-slate-200 font-bold text-xs uppercase tracking-widest">Cancelar</button>
                        <button onClick={confirmDeleteCard} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold text-xs uppercase tracking-widest shadow-lg shadow-red-500/20">Excluir</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default MenuScreen;
