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
import { useTranslation } from '../i18n';

// Import Settings Subcomponents
import ProfileSettings from './settings/ProfileSettings';
import LayoutSettings from './settings/LayoutSettings';
import CardsSettings from './settings/CardsSettings';
import DataSettings from './settings/DataSettings';
import PrivacySettings from './settings/PrivacySettings';
import AchievementsViewer from './settings/AchievementsViewer';
import SettingsMainMenu from './settings/SettingsMainMenu';
import Categories from './Categories';
import SubscriptionsSettings from './settings/SubscriptionsSettings';
import ImportHistorySettings from './settings/ImportHistorySettings';
import NotificationsSettings from './settings/NotificationsSettings';

const CardPreview: React.FC<{ name: string; color: string; closingDay: string; closingType: 'fixed' | 'dynamic'; closingDaysBefore: string; dueDay: string }> = ({ name, color, closingDay, closingType, closingDaysBefore, dueDay }) => {
    const { locale } = useTranslation();
    const closingLabel = closingType === 'dynamic'
        ? (locale === 'en' ? `Closes ${closingDaysBefore || '--'} days before` : locale === 'es' ? `Cierra ${closingDaysBefore || '--'} días antes` : locale === 'fr' ? `Ferme ${closingDaysBefore || '--'} jours avant` : locale === 'de' ? `Schließt ${closingDaysBefore || '--'} Tage vor` : `Fecha ${closingDaysBefore || '--'} dias antes`)
        : (locale === 'en' ? `Closes on day ${closingDay || '--'}` : locale === 'es' ? `Cierra el día ${closingDay || '--'}` : locale === 'fr' ? `Ferme le jour ${closingDay || '--'}` : locale === 'de' ? `Schließt am Tag ${closingDay || '--'}` : `Fecha dia ${closingDay || '--'}`);

    return (
        <div className="w-full flex justify-center mb-5 mt-1 shrink-0">
            <div
                className="w-full rounded-[20px] relative overflow-hidden shadow-2xl transition-all duration-500"
                style={{
                    backgroundColor: color,
                    backgroundImage: `linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 60%, rgba(0,0,0,0.18) 100%)`,
                    aspectRatio: '1.586 / 1',
                    maxWidth: '280px',
                }}
            >
                {/* Brilho de luz no topo */}
                <div className="absolute -top-12 -left-12 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />

                {/* Chip EMV — absoluto no topo esquerdo */}
                <div
                    className="absolute top-4 left-4 w-10 h-7 rounded-lg overflow-hidden flex-shrink-0"
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
                <div className="absolute inset-0 p-5 flex flex-col justify-end pb-4">
                    <div className="space-y-1">
                        <h4 className="text-white font-black text-base tracking-tight leading-none truncate max-w-[80%] uppercase drop-shadow">
                            {name || (locale === 'en' ? 'Card Name' : locale === 'es' ? 'Nombre de la Tarjeta' : locale === 'fr' ? 'Nom de la Carte' : locale === 'de' ? 'Kartenname' : 'Nome do Cartão')}
                        </h4>
                        <div className="flex gap-3 mt-1">
                            <span className="text-[10px] text-white/90 font-black uppercase tracking-wider">
                                {closingLabel}
                            </span>
                            <span className="text-[10px] text-white/90 font-black uppercase tracking-wider">
                                {locale === 'en' ? `Due on day ${dueDay || '--'}` : locale === 'es' ? `Vence el día ${dueDay || '--'}` : locale === 'fr' ? `Échéance le ${dueDay || '--'}` : locale === 'de' ? `Fällig am Tag ${dueDay || '--'}` : `Vence dia ${dueDay || '--'}`}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Logo Mastercard */}
                <div className="absolute bottom-4 right-4 flex -space-x-3">
                    <div className="w-8 h-8 rounded-full opacity-90" style={{ backgroundColor: '#eb001b' }} />
                    <div className="w-8 h-8 rounded-full opacity-80" style={{ backgroundColor: '#f79e1b' }} />
                </div>
            </div>
        </div>
    );
};

const DayGridPicker: React.FC<{ label: string; selectedDay: string; onSelect: (day: string) => void }> = ({ label, selectedDay, onSelect }) => {
    const [isOpen, setIsOpen] = useState(false);
    const context = useContext(AppContext);
    const { locale } = useTranslation();

    useEffect(() => {
        if (!context) return;
        const { registerBackHandler, unregisterBackHandler } = context;
        if (isOpen) {
            registerBackHandler(`picker-${label}`, () => {
                setIsOpen(false);
                return true;
            });
        } else {
            unregisterBackHandler(`picker-${label}`);
        }
        return () => unregisterBackHandler(`picker-${label}`);
    }, [isOpen, label, context]);

    return (
        <div className="relative">
            <label className="block text-[10px] font-black text-light-text-muted dark:text-dark-text-muted uppercase tracking-widest mb-2">{label}</label>
            <button
                type="button"
                onClick={() => {
                    Haptics.impact({ style: ImpactStyle.Light }).catch(() => { });
                    setIsOpen(true);
                }}
                className="w-full py-4 px-4 bg-slate-200/70 dark:bg-slate-700 border-2 border-transparent rounded-2xl font-semibold text-sm text-light-text dark:text-dark-text flex justify-between items-center transition-all cursor-pointer"
            >
                {selectedDay ? `${locale === 'en' ? 'Day' : locale === 'es' ? 'Día' : locale === 'fr' ? 'Jour' : locale === 'de' ? 'Tag' : 'Dia'} ${selectedDay}` : (locale === 'en' ? 'Select' : locale === 'es' ? 'Seleccionar' : locale === 'fr' ? 'Sélectionner' : locale === 'de' ? 'Auswählen' : 'Selecionar')}
                <ChevronDownIcon className="h-4 w-4 text-slate-400" />
            </button>

            <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} verticalAlign="popup">
                <div className="flex flex-col">
                    <h3 className="text-sm font-black text-light-text dark:text-dark-text mb-4 uppercase tracking-widest text-center">{label}</h3>
                    <div className="bg-slate-100 dark:bg-slate-800/80 p-3.5 rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
                        <div className="grid grid-cols-7 gap-1.5 text-center">
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
                                        className={`h-9 w-full flex items-center justify-center rounded-xl text-xs font-black transition-all ${
                                            isSelected
                                                ? 'bg-light-accent text-white shadow-md shadow-light-accent/30 scale-105 ring-2 ring-light-accent/40'
                                                : 'bg-white dark:bg-dark-card text-light-text dark:text-dark-text-secondary hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200/40 dark:border-slate-700/20'
                                        }`}
                                    >
                                        {day}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

const getDashboardLabel = (key: string, locale: string) => {
    const labels: Record<string, Record<string, string>> = {
        resumo: { pt: "Resumo", en: "Summary", es: "Resumen", fr: "Résumé", de: "Zusammenfassung" },
        invoices: { pt: "Faturas", en: "Invoices", es: "Facturas", fr: "Factures", de: "Rechnungen" },
        insights: { pt: "CFO IA", en: "CFO AI", es: "CFO IA", fr: "CFO IA", de: "CFO KI" },
        resumoDiario: { pt: "Métricas", en: "Metrics", es: "Métricas", fr: "Métriques", de: "Metriken" },
        orcamento: { pt: "Orçamentos", en: "Budgets", es: "Presupuestos", fr: "Budgets", de: "Budgets" },
        tendencias: { pt: "Tendências", en: "Trends", es: "Tendencias", fr: "Tendances", de: "Trends" },
        despesasCategoria: { pt: "Despesas por Categoria", en: "Expenses by Category", es: "Gastos por Categoría", fr: "Dépenses par Catégorie", de: "Ausgaben nach Kategorie" },
        receitasCategoria: { pt: "Receitas por Categoria", en: "Income by Category", es: "Ingresos por Categoría", fr: "Revenus par Catégorie", de: "Einnahmen nach Kategorie" },
        despesasRecorrentes: { pt: "Despesas Recorrentes", en: "Recurring Expenses", es: "Gastos Recurrentes", fr: "Dépenses Récurrentes", de: "Wiederkehrende Ausgaben" },
        metodosPagamentoChart: { pt: "Débito vs Crédito", en: "Debit vs Credit", es: "Débito vs Crédito", fr: "Débit vs Crédit", de: "Debit vs Kredit" }
    };
    return labels[key]?.[locale] || labels[key]?.pt || key;
};

const getResetLabel = (key: string, locale: string) => {
    const labels: Record<string, Record<string, string>> = {
        transactions: { pt: "Todas as Transações", en: "All Transactions", es: "Todas las Transacciones", fr: "Toutes les Transactions", de: "Alle Transaktionen" },
        categories: { pt: "Categorias Personalizadas", en: "Custom Categories", es: "Categorías Personalizadas", fr: "Catégories Personnalisées", de: "Benutzerdefinierte Kategorien" },
        goals: { pt: "Metas de Poupança", en: "Savings Goals", es: "Metas de Ahorro", fr: "Objectifs d'Épargne", de: "Sparziele" },
        cards: { pt: "Cartões de Crédito", en: "Credit Cards", es: "Tarjetas de Crédito", fr: "Cartes de Crédit", de: "Kreditkarten" },
        budgets: { pt: "Orçamentos Definidos", en: "Defined Budgets", es: "Presupuestos Definidos", fr: "Budgets Définis", de: "Definierte Budgets" },
        achievements: { pt: "Conquistas (Badges)", en: "Achievements (Badges)", es: "Logros (Insignias)", fr: "Succès (Badges)", de: "Erfolge (Badges)" },
        layout: { pt: "Layout do Dashboard", en: "Dashboard Layout", es: "Diseño del Dashboard", fr: "Disposition du Tableau de Bord", de: "Dashboard-Layout" },
        importHistory: { pt: "Histórico de Importação", en: "Import History", es: "Historial de Importación", fr: "Historique d'Importation", de: "Importverlauf" }
    };
    return labels[key]?.[locale] || labels[key]?.pt || key;
};

const MenuScreen: React.FC = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error("MenuScreen used outside provider");

    const { t, locale, currency } = useTranslation();
    const appLocale = locale === 'pt' ? 'pt-BR' : locale === 'en' ? 'en-US' : locale === 'es' ? 'es-ES' : locale === 'fr' ? 'fr-FR' : 'de-DE';
    const appCurrency = currency || 'BRL';
    const curSymbol = appCurrency === 'USD' ? '$' : appCurrency === 'EUR' ? '€' : 'R$';

    const {
        userProfile, handleLogout, setCurrentView, menuSubView, setMenuSubView,
        creditCards, handleAddCreditCard, handleEditCreditCard, handleDeleteCreditCard,
        allTransactions, handleResetData, toggleTheme, showToast, theme, handleDeleteAccount,
        dashboardLayout, handleUpdateLayout, updateUserProfile, categorias, handleLancamentoSubmit,
        setImportHistory, registerBackHandler, unregisterBackHandler
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
        color: COLOR_PALETTE[0],
        accountId: ''
    });

    const [isDueDayPickerOpen, setIsDueDayPickerOpen] = useState(false);
    const [isClosingDayPickerOpen, setIsClosingDayPickerOpen] = useState(false);
    const [isClosingTypePickerOpen, setIsClosingTypePickerOpen] = useState(false);
    const [isAccountPickerOpen, setIsAccountPickerOpen] = useState(false);

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

    useEffect(() => {
        if (!registerBackHandler || !unregisterBackHandler) return;
        if (isCardModalOpen) {
            registerBackHandler('menu-card-modal', () => {
                setIsCardModalOpen(false);
                return true;
            });
        } else {
            unregisterBackHandler('menu-card-modal');
        }
        return () => unregisterBackHandler('menu-card-modal');
    }, [isCardModalOpen, registerBackHandler, unregisterBackHandler]);

    useEffect(() => {
        if (!registerBackHandler || !unregisterBackHandler) return;
        if (deletingCardId) {
            registerBackHandler('menu-delete-card-modal', () => {
                setDeletingCardId(null);
                return true;
            });
        } else {
            unregisterBackHandler('menu-delete-card-modal');
        }
        return () => unregisterBackHandler('menu-delete-card-modal');
    }, [deletingCardId, registerBackHandler, unregisterBackHandler]);

    useEffect(() => {
        if (!registerBackHandler || !unregisterBackHandler) return;
        if (isResetModalOpen) {
            registerBackHandler('menu-reset-modal', () => {
                setIsResetModalOpen(false);
                setIsResetConfirming(false);
                return true;
            });
        } else {
            unregisterBackHandler('menu-reset-modal');
        }
        return () => unregisterBackHandler('menu-reset-modal');
    }, [isResetModalOpen, registerBackHandler, unregisterBackHandler]);

    useEffect(() => {
        if (!registerBackHandler || !unregisterBackHandler) return;
        if (isDeleteAccountModalOpen) {
            registerBackHandler('menu-delete-account-modal', () => {
                setIsDeleteAccountModalOpen(false);
                return true;
            });
        } else {
            unregisterBackHandler('menu-delete-account-modal');
        }
        return () => unregisterBackHandler('menu-delete-account-modal');
    }, [isDeleteAccountModalOpen, registerBackHandler, unregisterBackHandler]);

    // Add Choice State for Contas & Cartões
    const [isAddChoiceOpen, setIsAddChoiceOpen] = useState(false);
    // Add State for Assinaturas & Fixos
    const [isAddSubscriptionOpen, setIsAddSubscriptionOpen] = useState(false);

    // Configuração Dinâmica do Cabeçalho Unificado
    const headerConfig = useMemo(() => {
        if (menuSubView === 'profile') {
            return {
                title: t('settings.title') || 'Menu',
                onBack: () => setCurrentView('main'),
                action: null
            };
        }

        const titles: Record<string, Record<string, string>> = {
            editProfile: { pt: 'Minhas Informações', en: 'My Information', es: 'Mis Datos', fr: 'Mes Informations', de: 'Meine Informationen' },
            layout: { pt: 'Layout e Visual', en: 'Layout & Theme', es: 'Diseño y Visual', fr: 'Disposition & Visuel', de: 'Layout & Design' },
            cards: { pt: 'Contas & Cartões', en: 'Accounts & Cards', es: 'Cuentas y Tarjetas', fr: 'Comptes & Cartes', de: 'Konten & Karten' },
            subscriptions: { pt: 'Assinaturas & Fixos', en: 'Subscriptions & Recurring', es: 'Suscripciones y Fijos', fr: 'Abonnements & Récurrents', de: 'Abonnements & Wiederkehrend' },
            data: { pt: 'Gerenciar Dados', en: 'Manage Data', es: 'Gestionar Dados', fr: 'Gérer les Données', de: 'Daten Verwalten' },
            achievements: { pt: 'Minhas Conquistas', en: 'My Achievements', es: 'Mis Logros', fr: 'Mes Succès', de: 'Meine Erfolge' },
            privacy: { pt: 'Legal e Privacidade', en: 'Legal & Privacy', es: 'Legal y Privacidad', fr: 'Légal & Confidentialité', de: 'Rechtliches & Datenschutz' },
            categories: { pt: 'Gerenciar Categorias', en: 'Manage Categories', es: 'Gestionar Categorías', fr: 'Gérer les Catégories', de: 'Kategorien Verwalten' },
            importHistory: { pt: 'Histórico de Importação', en: 'Import History', es: 'Historial de Importación', fr: "Historique d'Importation", de: 'Importverlauf' },
            notifications: { pt: 'Notificações e Lembretes', en: 'Notifications & Reminders', es: 'Notificaciones y Recordatorios', fr: 'Notifications & Rappels', de: 'Benachrichtigungen & Erinnerungen' }
        };

        const title = titles[menuSubView]?.[locale] || titles[menuSubView]?.pt || 'Voltar';

        let action = null;
        if (menuSubView === 'cards') {
            action = (
                <button 
                    onClick={() => setIsAddChoiceOpen(true)} 
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-all"
                >
                    <PlusIcon className="h-4 w-4" />
                    <span>Adicionar</span>
                </button>
            );
        } else if (menuSubView === 'subscriptions') {
            action = (
                <button 
                    onClick={() => setIsAddSubscriptionOpen(true)} 
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-bold shadow-md shadow-pink-500/20 active:scale-95 transition-all"
                >
                    <PlusIcon className="h-4 w-4" />
                    <span>Adicionar</span>
                </button>
            );
        }

        return {
            title,
            onBack: () => menuSubView === 'importHistory' ? setMenuSubView('data') : setMenuSubView('profile'),
            action
        };
    }, [menuSubView, setCurrentView, setMenuSubView, locale]);

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
                color: card.color,
                accountId: card.accountId || ''
            });
        } else {
            setEditingCardId(null);
            setCardForm({ name: '', limit: '', closingDay: '', closingType: 'fixed', closingDaysBefore: '', dueDay: '', color: COLOR_PALETTE[0], accountId: '' });
        }
        setCardModalTab('dados');
        setIsCardModalOpen(true);
    };

    const handleCardSubmit = () => {
        const isFixed = cardForm.closingType === 'fixed';
        const isDynamic = cardForm.closingType === 'dynamic';

        if (!cardForm.name || !cardForm.limit || !cardForm.dueDay) {
            showToast(locale === 'en' ? 'Fill in all fields.' : locale === 'es' ? 'Complete todos los campos.' : locale === 'fr' ? 'Remplissez tous les champs.' : locale === 'de' ? 'Füllen Sie alle Felder aus.' : 'Preencha todos os campos.', "error");
            return;
        }

        if (isFixed && !cardForm.closingDay) {
            showToast(locale === 'en' ? 'Select the closing day.' : locale === 'es' ? 'Seleccione el día de cierre.' : locale === 'fr' ? 'Sélectionnez le jour de fermeture.' : locale === 'de' ? 'Wählen Sie den Schlusstag.' : 'Selecione o dia de fechamento.', "error");
            return;
        }

        if (isDynamic && !cardForm.closingDaysBefore) {
            showToast(locale === 'en' ? 'Enter how many days before due date.' : locale === 'es' ? 'Indique cuántos días antes del vencimiento.' : locale === 'fr' ? "Indiquez combien de jours avant l'échéance." : locale === 'de' ? 'Geben Sie an, wie viele Tage vor Fälligkeit.' : 'Informe quantos dias antes do vencimento.', "error");
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
            color: cardForm.color,
            accountId: cardForm.accountId || undefined
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
            showToast(locale === 'en' ? 'Select at least one item to clear.' : locale === 'es' ? 'Seleccione al menos un elemento para limpiar.' : locale === 'fr' ? 'Sélectionnez au moins un élément à effacer.' : locale === 'de' ? 'Wählen Sie mindestens ein Element zum Löschen.' : 'Selecione pelo menos um item para limpar.', "error");
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
        if (!userProfile.isPremium) return;

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

            if (addedCount > 0 && setImportHistory) {
                setImportHistory(prev => [
                    {
                        id: `imp-${Date.now()}`,
                        fileName: file.name,
                        importDate: new Date().toISOString(),
                        transactionCount: addedCount
                    },
                    ...(prev || [])
                ]);
            }

            showToast(locale === 'en' ? `${addedCount} transactions imported successfully!` : locale === 'es' ? `${addedCount} transacciones importadas con éxito!` : locale === 'fr' ? `${addedCount} transactions importées avec succès !` : locale === 'de' ? `${addedCount} Transaktionen erfolgreich importiert!` : `${addedCount} transações importadas com sucesso!`, "success");
        } catch (error) {
            console.error(error);
            showToast(locale === 'en' ? 'Failed to import statement. Check the file.' : locale === 'es' ? 'Error al importar el extracto. Verifique el archivo.' : locale === 'fr' ? "Échec de l'importation du relevé. Vérifiez le fichier." : locale === 'de' ? 'Fehler beim Importieren des Belegs. Datei überprüfen.' : 'Falha ao importar extrato. Verifique o arquivo.', "error");
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
                showToast(locale === 'en' ? 'Notifications enabled!' : locale === 'es' ? '¡Notificaciones activadas!' : locale === 'fr' ? 'Notifications activées !' : locale === 'de' ? 'Benachrichtigungen aktiviert!' : 'Notificações ativadas!', "success");
            } else {
                showToast(locale === 'en' ? 'Notification permission denied.' : locale === 'es' ? 'Permiso de notificación denegado.' : locale === 'fr' ? 'Permission de notification refusée.' : locale === 'de' ? 'Benachrichtigungsberechtigung verweigert.' : 'Permissão de notificação negada.', "error");
            }
        } else {
            await NotificationService.cancelAll();
            updateUserProfile({ notificationsEnabled: false });
            showToast(locale === 'en' ? 'Notifications disabled.' : locale === 'es' ? 'Notificaciones desactivadas.' : locale === 'fr' ? 'Notifications désactivées.' : locale === 'de' ? 'Benachrichtigungen deaktiviert.' : 'Notificações desativadas.', "info");
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
        <div className="bg-slate-50 dark:bg-[#050505] h-full overflow-hidden text-slate-900 dark:text-[#F1F5F9] flex flex-col font-sans transition-colors duration-300">
            <header className="p-4 pt-[calc(1rem+var(--sat))] bg-white/95 dark:bg-[#050505]/95 backdrop-blur-xl border-b border-slate-200/80 dark:border-white/[0.06] sticky top-0 z-20 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                    <button onClick={headerConfig.onBack} className="p-2 rounded-xl bg-slate-100 dark:bg-white/[0.06] border border-slate-200/60 dark:border-white/[0.08] text-slate-700 dark:text-white hover:bg-slate-200 dark:hover:bg-white/10 active:scale-95 transition-all">
                        <ArrowLeftIcon className="h-4 w-4" />
                    </button>
                    <h1 className="text-base font-semibold text-slate-900 dark:text-white tracking-tight">{headerConfig.title}</h1>
                </div>
                {headerConfig.action && (
                    <div className="flex items-center">{headerConfig.action}</div>
                )}
            </header>

            <main 
                ref={scrollContainerRef} 
                className={`flex-1 overflow-y-auto ${menuSubView === 'categories' ? 'overflow-hidden p-0' : 'p-4'} overscroll-contain`}
                style={{ paddingBottom: menuSubView === 'categories' ? '0px' : 'calc(6rem + var(--sab))' }}
            >
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
                        isAddChoiceOpen={isAddChoiceOpen}
                        setIsAddChoiceOpen={setIsAddChoiceOpen}
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
                {menuSubView === 'subscriptions' && (
                    <SubscriptionsSettings
                        isAddModalOpen={isAddSubscriptionOpen}
                        setIsAddModalOpen={setIsAddSubscriptionOpen}
                    />
                )}
                {menuSubView === 'privacy' && <PrivacySettings handleOpenLink={handleOpenLink} />}
                {menuSubView === 'achievements' && <AchievementsViewer />}
                {menuSubView === 'categories' && <Categories />}
                {menuSubView === 'importHistory' && <ImportHistorySettings />}
                {menuSubView === 'notifications' && (
                    <NotificationsSettings handleNotificationToggle={handleNotificationToggle} />
                )}
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
                        <h3 className="text-base font-black text-light-text dark:text-dark-text uppercase tracking-tight flex-1">
                            {editingCardId 
                                ? (locale === 'en' ? 'Edit Card' : locale === 'es' ? 'Editar Tarjeta' : locale === 'fr' ? 'Modifier la Carte' : locale === 'de' ? 'Karte Bearbeiten' : 'Editar Cartão') 
                                : (locale === 'en' ? 'New Card' : locale === 'es' ? 'Nueva Tarjeta' : locale === 'fr' ? 'Nouvelle Carte' : locale === 'de' ? 'Neue Karte' : 'Novo Cartão')}
                        </h3>
                    </div>

                    {/* Abas DADOS / VISUAL */}
                    <div className="flex border-b border-slate-200 dark:border-slate-700 mb-5 flex-shrink-0">
                        <button
                            onClick={() => setCardModalTab('dados')}
                            className={`flex-1 pb-2.5 text-[11px] font-black uppercase tracking-widest transition-all ${
                                cardModalTab === 'dados'
                                    ? 'text-light-accent border-b-2 border-light-accent'
                                    : 'text-light-text-muted dark:text-dark-text-muted'
                            }`}
                        >
                            {locale === 'en' ? 'Data' : locale === 'es' ? 'Datos' : locale === 'fr' ? 'Données' : locale === 'de' ? 'Daten' : 'Dados'}
                        </button>
                        <button
                            onClick={() => setCardModalTab('visual')}
                            className={`flex-1 pb-2.5 text-[11px] font-black uppercase tracking-widest transition-all ${
                                cardModalTab === 'visual'
                                    ? 'text-light-accent border-b-2 border-light-accent'
                                    : 'text-light-text-muted dark:text-dark-text-muted'
                            }`}
                        >
                            {locale === 'en' ? 'Visual' : locale === 'es' ? 'Visual' : locale === 'fr' ? 'Visuel' : locale === 'de' ? 'Design' : 'Visual'}
                        </button>
                    </div>

                    {/* Conteúdo scrollável */}
                    <div className="flex-1 overflow-y-auto no-scrollbar px-1">

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
                            <div className="space-y-4 pb-2">

                                {/* Apelido */}
                                <div>
                                    <label className="block text-[10px] font-black text-light-text-muted dark:text-dark-text-muted uppercase tracking-widest mb-2">
                                        {locale === 'en' ? 'Card Nickname' : locale === 'es' ? 'Apodo de la Tarjeta' : locale === 'fr' ? 'Nom de la Carte' : locale === 'de' ? 'Kartenname' : 'Apelido do Cartão'}
                                    </label>
                                    <input
                                        type="text"
                                        value={cardForm.name}
                                        onChange={e => setCardForm({ ...cardForm, name: e.target.value })}
                                        className="w-full py-4 px-4 bg-slate-200/70 dark:bg-slate-700 border-2 border-transparent rounded-2xl font-semibold text-sm text-light-text dark:text-dark-text placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-light-accent outline-none transition-all"
                                        placeholder={locale === 'en' ? 'e.g. Chase, Amex...' : locale === 'es' ? 'Ej: Santander, BBVA...' : locale === 'fr' ? 'Ex : Bourso, Fortuneo...' : locale === 'de' ? 'z.B. Sparkasse, N26...' : 'Ex: Nubank, Inter...'}
                                        autoComplete="off"
                                    />
                                </div>

                                {/* Limite */}
                                <div>
                                    <label className="block text-[10px] font-black text-light-text-muted dark:text-dark-text-muted uppercase tracking-widest mb-2">
                                        {locale === 'en' ? 'Monthly Limit' : locale === 'es' ? 'Límite Mensual' : locale === 'fr' ? 'Limite Mensuelle' : locale === 'de' ? 'Monatliches Limit' : 'Limite Mensal'}
                                    </label>
                                    <input
                                        type="tel"
                                        value={cardForm.limit}
                                        onChange={e => setCardForm({ ...cardForm, limit: formatCurrencyForInput(e.target.value) })}
                                        className="w-full py-4 px-4 bg-slate-200/70 dark:bg-slate-700 border-2 border-transparent rounded-2xl font-semibold text-sm text-light-text dark:text-dark-text placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-light-accent outline-none transition-all"
                                        placeholder={`${curSymbol} 0,00`}
                                        autoComplete="off"
                                    />
                                </div>

                                {/* Dia Vencimento e Dia Fechamento lado a lado */}
                                <div className="grid grid-cols-2 gap-3">
                                    <DayGridPicker
                                        label={locale === 'en' ? 'Due Day' : locale === 'es' ? 'Día de Vencimiento' : locale === 'fr' ? "Jour d'Échéance" : locale === 'de' ? 'Fälligkeitstag' : 'Dia Vencimento'}
                                        selectedDay={cardForm.dueDay}
                                        onSelect={day => setCardForm(prev => ({ ...prev, dueDay: day }))}
                                    />

                                    {cardForm.closingType === 'fixed' && (
                                        <DayGridPicker
                                            label={locale === 'en' ? 'Closing Day' : locale === 'es' ? 'Día de Cierre' : locale === 'fr' ? 'Jour de Fermeture' : locale === 'de' ? 'Schlusstag' : 'Dia Fechamento'}
                                            selectedDay={cardForm.closingDay}
                                            onSelect={day => setCardForm(prev => ({ ...prev, closingDay: day }))}
                                        />
                                    )}

                                    {cardForm.closingType === 'dynamic' && (
                                        <div>
                                            <label className="block text-[10px] font-black text-light-text-muted dark:text-dark-text-muted uppercase tracking-widest mb-2">
                                                {locale === 'en' ? 'Days before due date' : locale === 'es' ? 'Días antes del venc.' : locale === 'fr' ? "Jours avant l'éch." : locale === 'de' ? 'Tage vor Fälligkeit' : 'Dias antes do venci.'}
                                            </label>
                                            <input
                                                type="tel"
                                                value={cardForm.closingDaysBefore}
                                                onChange={e => {
                                                    const val = e.target.value.replace(/\D/g, '');
                                                    if (val === '') { setCardForm(prev => ({ ...prev, closingDaysBefore: '' })); return; }
                                                    const num = parseInt(val, 10);
                                                    if (num >= 1 && num <= 30) setCardForm(prev => ({ ...prev, closingDaysBefore: val }));
                                                }}
                                                className="w-full py-4 px-4 bg-slate-200/70 dark:bg-slate-700 border-2 border-transparent rounded-2xl font-semibold text-sm text-light-text dark:text-dark-text placeholder:text-slate-400 focus:border-light-accent outline-none transition-all"
                                                placeholder={locale === 'en' ? 'e.g. 7' : locale === 'es' ? 'Ej: 7' : locale === 'fr' ? 'Ex : 7' : locale === 'de' ? 'z.B. 7' : 'Ex: 7'}
                                                autoComplete="off"
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Tipo de Fechamento */}
                                <div>
                                    <label className="block text-[10px] font-black text-light-text-muted dark:text-dark-text-muted uppercase tracking-widest mb-2">
                                        {locale === 'en' ? 'Closing Type' : locale === 'es' ? 'Tipo de Cierre' : locale === 'fr' ? 'Type de Fermeture' : locale === 'de' ? 'Abrechnungsart' : 'Tipo de Fechamento'}
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => { Haptics.impact({ style: ImpactStyle.Light }).catch(() => {}); setCardForm(prev => ({ ...prev, closingType: 'fixed' })); }}
                                            className={`py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                                                cardForm.closingType === 'fixed'
                                                    ? 'bg-light-accent text-white shadow-lg shadow-light-accent/30'
                                                    : 'bg-slate-200/70 dark:bg-slate-700 text-light-text-muted dark:text-dark-text-secondary'
                                            }`}
                                        >
                                            {locale === 'en' ? 'Fixed Date' : locale === 'es' ? 'Fecha Fija' : locale === 'fr' ? 'Date Fixe' : locale === 'de' ? 'Festes Datum' : 'Data Fixa'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { Haptics.impact({ style: ImpactStyle.Light }).catch(() => {}); setCardForm(prev => ({ ...prev, closingType: 'dynamic' })); }}
                                            className={`py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                                                cardForm.closingType === 'dynamic'
                                                    ? 'bg-light-accent text-white shadow-lg shadow-light-accent/30'
                                                    : 'bg-slate-200/70 dark:bg-slate-700 text-light-text-muted dark:text-dark-text-secondary'
                                            }`}
                                        >
                                            {locale === 'en' ? 'Dynamic' : locale === 'es' ? 'Dinámico' : locale === 'fr' ? 'Dynamique' : locale === 'de' ? 'Dynamisch' : 'Dinâmico'}
                                        </button>
                                    </div>
                                    {cardForm.closingType === 'dynamic' && cardForm.closingDaysBefore && cardForm.dueDay && (
                                        <p className="text-[10px] text-slate-400 mt-2 font-medium">
                                            {locale === 'en'
                                                ? `Closes ${cardForm.closingDaysBefore} days before the due date (day ${cardForm.dueDay})`
                                                : locale === 'es'
                                                ? `Cierra ${cardForm.closingDaysBefore} días antes del vencimiento (día ${cardForm.dueDay})`
                                                : locale === 'fr'
                                                ? `Ferme ${cardForm.closingDaysBefore} jours avant l'échéance (jour ${cardForm.dueDay})`
                                                : locale === 'de'
                                                ? `Schließt ${cardForm.closingDaysBefore} Tage vor der Fälligkeit (Tag ${cardForm.dueDay})`
                                                : `Fecha ${cardForm.closingDaysBefore} dias antes do vencimento (dia ${cardForm.dueDay})`}
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
                                    <label className="block text-[10px] font-black text-light-text-muted dark:text-dark-text-muted uppercase tracking-widest mb-4">
                                        {locale === 'en' ? 'Card Color' : locale === 'es' ? 'Color de la Tarjeta' : locale === 'fr' ? 'Couleur de la Carte' : locale === 'de' ? 'Kartenfarbe' : 'Cor do Cartão'}
                                    </label>
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
                            className="w-full py-3 rounded-xl bg-teal-600 dark:bg-teal-700 text-white font-bold text-xs uppercase tracking-widest active:scale-[0.98] transition-all shadow-md hover:bg-teal-700 dark:hover:bg-teal-600"
                        >
                            {editingCardId 
                                ? (locale === 'en' ? 'Save Changes' : locale === 'es' ? 'Guardar Cambios' : locale === 'fr' ? 'Sauvegarder' : locale === 'de' ? 'Änderungen Speichern' : 'Salvar Alterações')
                                : (locale === 'en' ? 'Create Card' : locale === 'es' ? 'Crear Tarjeta' : locale === 'fr' ? 'Créer la Carte' : locale === 'de' ? 'Karte Erstellen' : 'Criar Cartão')}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Modal de Reset */}
            <Modal isOpen={isResetModalOpen} onClose={() => { setIsResetModalOpen(false); setTimeout(() => setIsResetConfirming(false), 200); }}>
                <div>
                    {!isResetConfirming ? (
                        <>
                            <h3 className="text-lg font-bold text-light-text dark:text-dark-text mb-2 uppercase tracking-tight">
                                {locale === 'en' ? 'Clear Data' : locale === 'es' ? 'Limpar Datos' : locale === 'fr' ? 'Effacer les Données' : locale === 'de' ? 'Daten Bereinigen' : 'Limpar Dados'}
                            </h3>
                            <p className="text-xs text-light-text-muted dark:text-dark-text-secondary mb-6 font-medium">
                                {locale === 'en' ? 'Select what you want to delete.' : locale === 'es' ? 'Seleccione lo que deseja borrar.' : locale === 'fr' ? 'Sélectionnez ce que vous souhaitez effacer.' : locale === 'de' ? 'Wählen Sie aus, was Sie löschen möchten.' : 'Selecione o que deseja apagar.'}
                            </p>

                            <div className="space-y-3 mb-6 max-h-60 overflow-y-auto no-scrollbar">
                                <button onClick={handleSelectAllReset} className="text-[10px] font-bold text-light-accent uppercase tracking-widest mb-2">
                                    {locale === 'en' ? 'Toggle All' : locale === 'es' ? 'Alternar Todos' : locale === 'fr' ? 'Tout Inverser' : locale === 'de' ? 'Alle Umschalten' : 'Alternar Todos'}
                                </button>
                                {Object.entries(resetSelection).map(([key, value]) => (
                                    <div key={key} className="flex items-center justify-between p-3 bg-light-bg dark:bg-dark-surface/50 rounded-xl border border-light-border dark:border-dark-elevated" onClick={() => handleResetToggle(key as keyof ResetOptions)}>
                                        <span className="text-sm font-bold text-light-text dark:text-dark-text-secondary capitalize">
                                            {getResetLabel(key, locale)}
                                        </span>
                                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center ${value ? 'bg-red-500 border-red-500' : 'bg-white dark:bg-dark-card border-slate-300 dark:border-slate-600'}`}>
                                            {value && <CheckCircleIcon className="h-3.5 w-3.5 text-white" />}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex gap-3">
                                <button onClick={cancelReset} className="flex-1 py-3 rounded-xl bg-light-bg dark:bg-slate-700 text-slate-600 dark:text-slate-200 font-bold text-xs uppercase">{t('common.cancel')}</button>
                                <button onClick={proceedToResetConfirmation} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold text-xs uppercase shadow-lg shadow-red-600/20">
                                    {locale === 'en' ? 'Clear Selected' : locale === 'es' ? 'Borrar Seleccionados' : locale === 'fr' ? 'Effacer la Sélection' : locale === 'de' ? 'Ausgewählte Löschen' : 'Apagar Selecionados'}
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="text-center">
                            <div className="bg-red-100 dark:bg-red-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                                <XCircleIcon className="h-8 w-8 text-red-600" />
                            </div>
                            <h3 className="text-lg font-bold mb-2 text-light-text dark:text-dark-text uppercase tracking-tight">
                                {locale === 'en' ? 'Are you absolutely sure?' : locale === 'es' ? '¿Está absolutamente seguro?' : locale === 'fr' ? 'Êtes-vous absolutement sûr ?' : locale === 'de' ? 'Sind Sie absolut sicher?' : 'Tem certeza absoluta?'}
                            </h3>
                            <p className="text-xs text-light-text-muted dark:text-dark-text-secondary mb-4 leading-relaxed font-medium">
                                {locale === 'en' ? 'You are about to permanently delete the following items:' : locale === 'es' ? 'Está a punto de borrar permanentemente los siguientes elementos:' : locale === 'fr' ? 'Vous êtes sur le point de supprimer définitivement les éléments suivants :' : locale === 'de' ? 'Sie sind im Begriff, die folgenden Elemente dauerhaft zu löschen:' : 'Você está prestes a excluir permanentemente os seguintes itens:'}
                            </p>

                            <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-xl mb-6 text-left border border-red-100 dark:border-red-900/20 max-h-40 overflow-y-auto no-scrollbar">
                                <ul className="space-y-1">
                                    {Object.entries(resetSelection).map(([key, isSelected]) => {
                                        if (!isSelected) return null;
                                        return (
                                            <li key={key} className="text-[11px] font-bold text-red-700 dark:text-red-300 flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                                                {getResetLabel(key, locale)}
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>

                            <div className="flex gap-3">
                                <button onClick={cancelReset} className="flex-1 py-3 rounded-xl bg-light-bg dark:bg-slate-700 text-slate-600 dark:text-slate-200 font-bold text-xs uppercase">
                                    {locale === 'en' ? 'Back' : locale === 'es' ? 'Volver' : locale === 'fr' ? 'Retour' : locale === 'de' ? 'Zurück' : 'Voltar'}
                                </button>
                                <button onClick={confirmFinalReset} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold text-xs uppercase shadow-lg shadow-red-500/20">
                                    {locale === 'en' ? 'Yes, Delete All' : locale === 'es' ? 'Sí, Borrar Todo' : locale === 'fr' ? 'Oui, Tout Effacer' : locale === 'de' ? 'Ja, Alles Löschen' : 'Sim, Apagar Tudo'}
                                </button>
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
                    <h3 className="text-lg font-bold mb-2 text-light-text dark:text-dark-text uppercase tracking-tight">
                        {locale === 'en' ? 'Permanently Delete Account?' : locale === 'es' ? '¿Borrar Cuenta Permanentemente?' : locale === 'fr' ? 'Supprimer le Compte Définitivement ?' : locale === 'de' ? 'Konto dauerhaft löschen?' : 'Excluir Conta Permanentemente?'}
                    </h3>
                    <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 p-4 rounded-xl mb-6 text-left">
                        <p className="text-xs text-red-700 dark:text-red-400 font-medium leading-relaxed">
                            {locale === 'en' ? 'This action is irreversible. All your data, transactions, settings, and history will be deleted immediately.' : locale === 'es' ? 'Esta acción es irreversible. Todos seus data, transacciones, configuraciones e historial se borrarán inmediatamente.' : locale === 'fr' ? 'Cette action est irréversible. Toutes vos données, transactions, paramètres et historique seront immédiatement effacés.' : locale === 'de' ? 'Diese Aktion ist unumkehrbar. Alle Ihre Daten, Transaktionen, Einstellungen und Verläufe werden sofort gelöscht.' : 'Esta ação é irreversível. Todos os seus dados, transações, configurações e histórico serão apagados imediatamente.'}
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => setIsDeleteAccountModalOpen(false)} className="flex-1 py-3 rounded-xl bg-light-bg dark:bg-dark-card text-slate-600 dark:text-slate-200 font-bold text-xs uppercase tracking-widest">{t('common.cancel')}</button>
                        <button onClick={() => { setIsDeleteAccountModalOpen(false); handleDeleteAccount(); }} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold text-xs uppercase tracking-widest shadow-lg shadow-red-500/20">
                            {locale === 'en' ? 'Yes, Delete' : locale === 'es' ? 'Sí, Excluir' : locale === 'fr' ? 'Oui, Supprimer' : locale === 'de' ? 'Ja, Löschen' : 'Sim, Excluir'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Modal de Confirmação de Exclusão de Cartão */}
            <Modal isOpen={!!deletingCardId} onClose={() => setDeletingCardId(null)}>
                <div className="text-center">
                    <div className="bg-red-100 dark:bg-red-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <TrashIcon className="h-8 w-8 text-red-600" />
                    </div>
                    <h3 className="text-lg font-bold mb-4 text-light-text dark:text-dark-text uppercase tracking-tight">
                        {locale === 'en' ? 'Delete Card?' : locale === 'es' ? '¿Excluir Tarjeta?' : locale === 'fr' ? 'Supprimer la Carte ?' : locale === 'de' ? 'Karte Löschen?' : 'Excluir Cartão?'}
                    </h3>

                    {(() => {
                        const usageCount = allTransactions.filter(t => t.cardId === deletingCardId).length;
                        if (usageCount > 0) {
                            return (
                                <div className="mb-6">
                                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30 p-4 rounded-xl flex items-start gap-3 mb-3 text-left">
                                        <InformationCircleIcon className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                                        <div>
                                            <p className="text-sm text-amber-800 dark:text-amber-200 font-bold mb-1">
                                                {locale === 'en' ? 'Warning!' : locale === 'es' ? '¡Atención!' : locale === 'fr' ? 'Attention !' : locale === 'de' ? 'Achtung!' : 'Atenção!'}
                                            </p>
                                            <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                                                {locale === 'en'
                                                    ? `This card is linked to ${usageCount} entries. If you delete it, the financial history will be kept, but the transactions will lose the link to the card.`
                                                    : locale === 'es'
                                                    ? `Esta tarjeta está vinculada a ${usageCount} transacciones. Si la borra, se mantendrá el historial financiero, mas las transacciones perderán el vínculo com la tarjeta.`
                                                    : locale === 'fr'
                                                    ? `Cette carte est liée à ${usageCount} écritures. Si vous la supprimez, l'historique financier sera conservé, mais les transactions perdront le lien avec la carte.`
                                                    : locale === 'de'
                                                    ? `Diese Karte ist mit ${usageCount} Einträgen verknüpft. Wenn Sie sie löschen, bleibt der Finanzverlauf erhalten, aber die Transaktionen verlieren die Verknüpfung mit der Karte.`
                                                    : `Este cartão está vinculado a ${usageCount} lançamentos. Se você excluir, o histórico financeiro será mantido, mas as transações perderão o vínculo com o cartão.`}
                                            </p>
                                        </div>
                                    </div>
                                    <p className="text-xs text-light-text-muted dark:text-dark-text-secondary font-medium">
                                        {locale === 'en' ? 'Do you want to continue anyway?' : locale === 'es' ? '¿Desea continuar de todos modos?' : locale === 'fr' ? 'Voulez-vous continuer quand même ?' : locale === 'de' ? 'Möchten Sie trotzdem fortfahren?' : 'Deseja continuar mesmo assim?'}
                                    </p>
                                </div>
                            );
                        }
                        return (
                            <p className="text-sm text-light-text-muted dark:text-dark-text-secondary mb-8 font-medium">
                                {locale === 'en' ? 'Are you sure you want to remove this card? This action cannot be undone.' : locale === 'es' ? '¿Está seguro de que desea eliminar esta tarjeta? Esta acción no se puede deshacer.' : locale === 'fr' ? 'Êtes-vous sûr de vouloir retirer cette carte ? Cette action ne peut pas être annulée.' : locale === 'de' ? 'Sind Sie sicher, dass Sie diese Karte entfernen möchten? Diese Aktion kann nicht rückgängig gemacht werden.' : 'Tem certeza que deseja remover este cartão? Esta ação não pode ser desfeita.'}
                            </p>
                        );
                    })()}

                    <div className="flex gap-3">
                        <button onClick={() => setDeletingCardId(null)} className="flex-1 py-3 rounded-xl bg-light-bg dark:bg-dark-card text-slate-600 dark:text-slate-200 font-bold text-xs uppercase tracking-widest">{t('common.cancel')}</button>
                        <button onClick={confirmDeleteCard} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold text-xs uppercase tracking-widest shadow-lg shadow-red-500/20">
                            {locale === 'en' ? 'Delete' : locale === 'es' ? 'Excluir' : locale === 'fr' ? 'Supprimer' : locale === 'de' ? 'Löschen' : 'Excluir'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default MenuScreen;
