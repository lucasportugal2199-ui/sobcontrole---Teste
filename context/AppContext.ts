import { createContext, FormEvent, useContext } from "react";
import {
    CategoryType,
    Account,
    AllData,
    Asset,
    Budgets,
    Categorias,
    CategoryColors,
    CreditCard,
    DashboardLayout,
    EditFormState,
    ImportHistoryItem,
    PatrimonioHistory,
    SavingsGoal,
    Subscription,
    ToastType,
    Transaction,
    TransactionType,
    UserProfile,
    View,
} from "../types";
import { ImpactStyle } from "@capacitor/haptics";

export type Tab =
    | "lancamento"
    | "transacoes"
    | "metas"
    | "financas"
    | "horizonte"
    | "categorias";
export type Theme = "light" | "dark";
export type MenuSubView =
    | "profile"
    | "settings"
    | "data"
    | "achievements"
    | "editProfile"
    | "privacy"
    | "help"
    | "cards"
    | "layout"
    | "categories"
    | "subscriptions"
    | "importHistory"
    | "notifications";

export interface IAppContext {
    // State
    isAuthenticated: boolean;
    isInitializingSession: boolean;
    currentDate: Date;
    theme: Theme;
    allData: AllData;
    categorias: Categorias;
    categoryColors: CategoryColors;
    currentTab: Tab;
    editingTxId: string | null;
    isEditModalOpen: boolean;
    confirmingDeleteId: string | null;
    budgets: Budgets;
    confirmingDeleteFutureTx: Transaction | null;
    savingsGoals: SavingsGoal[];
    dashboardLayout: DashboardLayout;
    isNewTransactionOpen: boolean;
    isTransactionMenuOpen: boolean;
    newTransactionInitialType:
        | "entrada"
        | "saida"
        | "credito"
        | "transferencia"
        | null;
    newTransactionInitialData?: {
        valor?: number;
        descricao?: string;
        tipo?: "entrada" | "saida" | "transferencia";
        paymentMethod?: "debito" | "credito";
    } | null;
    currentView: View;
    previousView: View;
    goBackView: () => void;
    creditCards: CreditCard[];
    menuSubView: MenuSubView;
    setMenuSubView: (subView: MenuSubView) => void;
    isLoadingData: boolean;
    isOnline: boolean;
    assets: Asset[];
    patrimonioHistory: PatrimonioHistory[];
    accounts: Account[];
    subscriptions: Subscription[];
    showTutorial: boolean;
    setShowTutorial: (show: boolean) => void;
    managementFilter: {
        method: "all" | "credito" | "debito";
        cardId: string | "all";
        accountId?: string | "all";
    } | null;
    setManagementFilter: (
        filter: {
            method: "all" | "credito" | "debito";
            cardId: string | "all";
            accountId?: string | "all";
        } | null,
    ) => void;

    // User Profile
    userProfile: UserProfile;

    // Import History
    importHistory: ImportHistoryItem[];
    setImportHistory: React.Dispatch<React.SetStateAction<ImportHistoryItem[]>>;

    // Derived State
    transactions: Transaction[];
    allTransactions: Transaction[];
    despesasPorCategoria: { name: string; value: number }[];

    // Setters & Handlers
    handleLoginSuccess: (email: string) => Promise<void>;
    handleLogout: () => void;
    handleDeleteAccount: () => Promise<void>;
    setCurrentDate: (date: Date) => void;
    changeMonth: (direction: number) => void;
    toggleTheme: () => void;
    setCurrentTab: (tab: Tab) => void;
    handleLancamentoSubmit: (e: FormEvent, formData: any) => void;
    handleStartEdit: (tx: Transaction) => void;
    handleUpdateTransaction: (
        e: FormEvent,
        editForm: EditFormState,
        scope?: "single" | "future",
    ) => void;
    setIsEditModalOpen: (isOpen: boolean) => void;
    setEditingTxId: (id: string | null) => void;
    handleDeleteTransaction: (tx: Transaction) => void;
    handleDeleteRecurringSeries: (tx: Transaction) => void;
    handleConfirmDelete: () => void;
    setConfirmingDeleteId: (id: string | null) => void;
    handleAddCategory: (
        type: CategoryType,
        name: string,
        bucket?: "necessidades" | "desejos" | "futuro",
        group?: "Gastos Fixos" | "Gastos Variáveis" | "Reserva Financeira",
        icon?: string,
    ) => void;
    handleEditCategory: (
        type: CategoryType,
        oldName: string,
        newName: string,
        bucket?: "necessidades" | "desejos" | "futuro",
        group?: "Gastos Fixos" | "Gastos Variáveis" | "Reserva Financeira",
        icon?: string,
    ) => void;
    handleDeleteCategory: (type: CategoryType, name: string) => void;
    handleUpdateCategoryColor: (category: string, color: string) => void;
    showToast: (message: string, type?: ToastType) => void;
    handleSetBudget: (category: string, amount: number) => void;
    handleStartDeleteFuture: (tx: Transaction) => void;
    handleConfirmDeleteFuture: () => void;
    setConfirmingDeleteFutureTx: (tx: Transaction | null) => void;
    handleAddGoal: (
        name: string,
        targetAmount: number,
        targetDate?: string,
    ) => void;
    handleEditGoal: (
        id: string,
        name: string,
        targetAmount: number,
        targetDate?: string,
    ) => void;
    handleDeleteGoal: (id: string) => void;
    handleAddFundsToGoal: (
        goalId: string,
        amount: number,
        date: string,
    ) => void;
    handleUpdateLayout: (newLayout: DashboardLayout) => void;
    monthChangeDirection: "prev" | "next" | null;
    clearMonthChangeDirection: () => void;
    setIsNewTransactionOpen: (isOpen: boolean) => void;
    setIsTransactionMenuOpen: (isOpen: boolean) => void;
    setNewTransactionInitialType: (
        type: "entrada" | "saida" | "credito" | "transferencia" | null,
    ) => void;
    setNewTransactionInitialData?: (data: {
        valor?: number;
        descricao?: string;
        tipo?: "entrada" | "saida" | "transferencia";
        paymentMethod?: "debito" | "credito";
    } | null) => void;
    setCurrentView: (view: View) => void;
    handleImportStatement: (file: File) => Promise<void>;
    getSaldoColor: (saldo: number, theme: Theme) => string;
    updateUserProfile: (profile: Partial<UserProfile>) => void;
    handleResetData: (options: any) => Promise<void>;
    handleAddCreditCard: (card: Omit<CreditCard, "id">) => void;
    handleEditCreditCard: (id: string, card: Omit<CreditCard, "id">) => void;
    handleDeleteCreditCard: (id: string) => void;
    handlePayInvoice: (card: CreditCard) => void;
    incrementAiScans: () => void;
    incrementCfoInteractions: () => void;
    triggerHaptic: (style?: ImpactStyle) => void;
    dismissTip: (tipId: string) => void;

    // Assets Handlers
    handleAddAsset: (asset: Omit<Asset, "id">) => void;
    handleUpdateAsset: (id: string, asset: Partial<Asset>) => void;
    handleDeleteAsset: (id: string) => void;

    // Account Handlers
    /** Cria a conta e devolve o id */
    handleCreateBankAccount: (account: Omit<Account, "id">) => string;
    handleUpdateBankAccount: (id: string, account: Partial<Account>) => void;
    handleDeleteBankAccount: (id: string) => void;

    // Subscriptions Handlers
    handleAddSubscription: (sub: Omit<Subscription, "id">) => void;
    handleEditSubscription: (id: string, sub: Partial<Subscription>) => void;
    handleDeleteSubscription: (id: string) => void;

    // Back Handlers
    registerBackHandler: (id: string, fn: () => boolean) => void;
    unregisterBackHandler: (id: string) => void;
    handleGenerateMockData: () => void;
    locale: string;
    setLocale: (locale: any) => void;
}

export const AppContext = createContext<IAppContext | null>(null);

/** Contexto do app. Só pode ser usado dentro do AppContext.Provider. */
export const useAppContext = (): IAppContext => {
    const context = useContext(AppContext);
    if (!context) throw new Error("useAppContext usado fora do AppContext.Provider");
    return context;
};
