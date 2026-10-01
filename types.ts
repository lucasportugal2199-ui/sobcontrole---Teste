export type TransactionType = 'entrada' | 'saida' | 'transferencia';
export type PaymentMethod = 'debito' | 'credito';

export interface CreditCard {
  id: string;
  name: string;
  closingDay: number;
  closingType?: 'fixed' | 'dynamic'; // 'fixed' = dia fixo (padrão), 'dynamic' = X dias antes do vencimento
  closingDaysBefore?: number;         // Usado quando closingType = 'dynamic' (máx 30)
  dueDay: number;
  limit: number;
  color: string;
  accountId?: string;
}

export interface UserProfile {
  name: string;
  email: string;
  avatar?: string;
  hapticsEnabled?: boolean;
  notificationsEnabled?: boolean;
  isPremium?: boolean;
  badges?: string[];
  // Novos campos para gamificação
  currentStreak?: number;
  lastUsageDate?: string;
  aiScansCount?: number;
  cfoInteractionsCount?: number;
  cfoDailyQueriesCount?: number;
  cfoLastQueryDate?: string;
  hasSeenTutorial?: boolean;
  hasAnsweredNotificationPrompt?: boolean;
  simplifiedMode?: boolean;
  dismissedTips?: string[];
  locale?: string;
  currency?: string;
}

export type AssetType = 'acao' | 'crypto' | 'fixa' | 'fisico' | 'outros';

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  value: number;
  color: string;
  lastUpdated: string; // ISO string
}

export interface PatrimonioHistory {
  monthKey: string; // YYYY-MM
  totalValue: number;
}

export interface Account {
  id: string;
  bankName: string; // Ex: Nubank, Dinheiro, Itaú
  bankLogo?: string;
  accountType: string;
  balance: number;
  initialDate?: string; // YYYY-MM-DD
  color: string;
  lastSync?: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  createdAt: string; // ISO date string
  targetDate?: string; // ISO date string (YYYY-MM-DD)
}

export interface Subscription {
  id: string;
  name: string;
  cost: number;
  billingCycle: 'monthly' | 'yearly';
  nextBillingDate: string; // YYYY-MM-DD
  color: string;
}

export interface Category {
  id: string;
  name: string;
  icon?: string; // emoji
  bucket?: 'necessidades' | 'desejos' | 'futuro';
  group?: 'Gastos Fixos' | 'Gastos Variáveis' | 'Reserva Financeira';
}

export interface Installment {
  current: number;
  total: number;
}

export interface Transaction {
  id: string;
  data: string;
  compraData?: string; // Data real em que a compra foi feita (YYYY-MM-DD)
  descricao: string;
  valor: number;
  tipo: TransactionType;
  categoria: string;
  paymentMethod: PaymentMethod;
  isRecurring?: boolean;
  recurrenceId?: string;
  goalId?: string;
  installment?: Installment;
  cardId?: string;       // ID do cartão usado (se crédito)
  accountId?: string;    // Conta de débito/crédito (Origem)
  destinationAccountId?: string; // Conta de destino (apenas para transferências)
  statementDate?: string; // Mês da fatura "YYYY-MM" (se crédito)
}

export interface Categorias {
  entrada: Category[];
  saida: Category[];
}

export interface CategoryColors {
  [key: string]: string;
}

export interface AllData {
  [key: string]: {
    transactions: Transaction[];
    saldoFinal: number;
  } | undefined;
}

export interface DailyBalance {
  dia: number;
  entrada: number;
  saida: number;
  saidaCredito: number;
  saldo: number;
  transactions?: Transaction[];
}

export interface EditFormState {
  valor: string;
  descricao: string;
  categoria: string;
  paymentMethod: PaymentMethod;
  cardId?: string;
  accountId?: string;
  destinationAccountId?: string;
  data: string;
  statementDate?: string;
}

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

export interface Budgets {
  [category: string]: number;
}

export interface ReceiptAnalysisResult {
  valor: number;
  descricao: string;
  data: string; // YYYY-MM-DD
  categoria: string;
}

export interface DashboardLayout {
  order: string[];
  visibility: { [key: string]: boolean };
}

export interface ImportedTransaction {
  data: string; // YYYY-MM-DD
  descricao: string;
  valor: number;
  tipo: TransactionType;
  categoria: string;
}

export interface ImportHistoryItem {
  id: string;
  fileName: string;
  importDate: string; // ISO string
  transactionCount: number;
}

export interface ResetOptions {
  transactions: boolean;
  categories: boolean;
  goals: boolean;
  cards: boolean;
  budgets: boolean;
  achievements: boolean;
  layout: boolean;
  importHistory: boolean;
}

export type View = 'main' | 'horizonte' | 'anual' | 'menu' | 'chat' | 'premium' | 'calculadora' | 'investimentos' | 'automacao' | 'openfinance' | 'assinaturas';

// Interface consolidada para salvar no Supabase (coluna JSONB)
export interface UserData {
  allData: AllData;
  categories: Categorias;
  categoryColors: CategoryColors;
  creditCards: CreditCard[];
  budgets: Budgets;
  savingsGoals: SavingsGoal[];
  dashboardLayout: DashboardLayout;
  userProfile: UserProfile;
  importHistory: ImportHistoryItem[];
  theme: 'light' | 'dark';
  assets?: Asset[];
  patrimonioHistory?: PatrimonioHistory[];
  accounts?: Account[];
  subscriptions?: Subscription[];
  lastUpdatedAt?: string
}