import React, {
  useState,
  useMemo,
  useEffect,
  ReactNode,
  useCallback,
  useContext,
  Suspense,
  ErrorInfo,
  useRef,
} from 'react';
import OnboardingTutorial from './components/OnboardingTutorial';
import { I18nProvider, useTranslation } from './i18n';
import { INITIAL_CATEGORIAS, INITIAL_CATEGORIA_CORES, AVAILABLE_BADGES } from './constants';
import {
  AllData,
  Categorias,
  CategoryColors,
  EditFormState,
  Transaction,
  TransactionType,
  ToastMessage,
  ToastType,
  Budgets,
  SavingsGoal,
  DashboardLayout,
  View,
  UserProfile,
  ImportHistoryItem,
  Account,
  CreditCard,
  ResetOptions,
  Asset,
  PatrimonioHistory,
  Subscription,
} from './types';
import {
  CloseIcon,
  SparklesIcon,
  LoaderIcon,
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon,
  TrashIcon,
  RepeatIcon,
  ChevronDownIcon,
  WifiOffIcon
} from './components/icons';
import {
  getMonthKey,
  calcularSaldoFinal,
  formatCurrency,
  parseCurrency,
  formatCurrencyForInput,
  sanitizeTransactions,
  formatDateToInput,
  analyzeStatement,
  getPreviousBalance,
  calculateStatementDate,
  calculateCreditCardDueDate,
  addMonthsSafely,
  recalculateBalancesFrom,
  generateMockTransactions
} from './utils/helpers';
import { fetchAllDataFromSupabase, saveAllDataToSupabase } from './utils/supabaseSync';
import { isEmptyState, isValidPayload, smartMerge, dataSummary, createSyncLogger } from './utils/syncEngine';
import { NotificationService } from './utils/notificationService';
import { supabase } from './utils/supabaseClient'; // Importação do cliente
import { BillingService } from './utils/billingService';
import { syncWidgetData } from './utils/widgetSync';
import confetti from 'canvas-confetti';

import { StatusBar, Animation } from '@capacitor/status-bar';
import { App as CapApp } from '@capacitor/app';
import { BankNotificationService, PendingBankTransaction } from './services/bankNotificationService';
import { PendingTransactionsModal } from './components/PendingTransactionsModal';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

import { BottomNav } from './components/BottomNav';
import LoginScreen from './components/LoginScreen';
import LockScreen from './components/LockScreen';
import SkeletonLoader from './components/SkeletonLoader';
import MenuScreen from './components/MenuScreen';
import Modal from './components/Modal';
import { Tutorial } from './components/Tutorial';
import ListPickerModal from './components/ListPickerModal';
import TransactionTypeMenu from './components/TransactionTypeMenu';
import { AppContext, Tab, Theme, MenuSubView } from './context/AppContext';
import { loadLocalData, saveLocalData, clearLocalData, clearAllUserData } from './utils/localStorageSync';

interface AppErrorBoundaryProps { children?: ReactNode; }
interface AppErrorBoundaryState { hasError: boolean; error: Error | null; }

class AppErrorBoundary extends React.Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full w-full bg-dark-bg flex flex-col items-center justify-center p-4 text-center overflow-auto">
          <h1 className="text-2xl font-bold text-white mb-2">Ops! Algo falhou.</h1>
          {this.state.error && (
            <div className="bg-red-900/40 border border-red-500/30 rounded-xl p-3 my-4 max-w-md text-left overflow-auto text-xs font-mono text-red-200">
              <p className="font-bold text-red-400 mb-1">{this.state.error.name}: {this.state.error.message}</p>
              <pre className="text-[10px] whitespace-pre-wrap text-red-300 opacity-80">{this.state.error.stack?.slice(0, 500)}</pre>
            </div>
          )}
          <button onClick={this.handleReload} className="px-6 py-3 rounded-2xl bg-blue-600 text-white font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-500/20">Recarregar App</button>
        </div>
      );
    }
    return this.props.children ?? null;
  }
}

const Toast: React.FC<{ toast: ToastMessage; onDismiss: (id: string) => void }> = ({ toast, onDismiss }) => {
  const [isExiting, setIsExiting] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onDismiss(toast.id), 200);
    }, 2500); // Aumentei um pouco o tempo para dar tempo de ler nomes longos
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const iconMap = {
    success: <CheckCircleIcon className="h-5 w-5 text-green-500" />,
    error: <XCircleIcon className="h-5 w-5 text-red-500" />,
    info: <InformationCircleIcon className="h-5 w-5 text-blue-500" />,
  };

  return (
    <div className={`fixed bottom-28 left-1/2 -translate-x-1/2 z-[100] px-5 py-3.5 bg-white dark:bg-dark-elevated rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-200/80 dark:border-white/10 transition-all duration-200 ${isExiting ? 'opacity-0 scale-95 translate-y-2' : 'opacity-100 scale-100 translate-y-0'}`}>
      <div className="flex-shrink-0">{iconMap[toast.type] || iconMap.info}</div>
      <p className="text-xs font-bold text-slate-900 dark:text-white whitespace-nowrap">{toast.message}</p>
    </div>
  );
};

// --- Tela de Sem Conexão ---
const NoInternetScreen = () => (
  <div className="h-full w-full bg-slate-100 dark:bg-dark-bg flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
    <div className="bg-slate-200 dark:bg-slate-800 p-6 rounded-full mb-6">
      <WifiOffIcon className="h-12 w-12 text-slate-400 dark:text-slate-400" />
    </div>
    <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tight">Sem Conexão</h2>
    <p className="text-sm font-medium text-slate-500 dark:text-slate-300 max-w-xs leading-relaxed">
      "Você está offline. Seus dados serão sincronizados automaticamente."
    </p>
  </div>
);

// Lazy Components
const Dashboard = React.lazy(() => import('./components/Dashboard').then(m => ({ default: m.Dashboard })));
const Management = React.lazy(() => import('./components/Management').then(m => ({ default: m.Management })));
const Categories = React.lazy(() => import('./components/Categories'));
const SavingsGoals = React.lazy(() => import('./components/SavingsGoals').then(m => ({ default: m.SavingsGoals })));
const Lancamento = React.lazy(() => import('./components/Lancamento'));
const HorizonteSaldos = React.lazy(() => import('./components/HorizonteSaldos'));
const RelatorioAnual = React.lazy(() => import('./components/RelatorioAnual'));
const AIChat = React.lazy(() => import('./components/AIChat'));
const PremiumScreen = React.lazy(() => import('./components/PremiumScreen'));
const GoalCalculator = React.lazy(() => import('./components/GoalCalculator'));
const AccountManager = React.lazy(() => import('./components/AccountManager'));
const InvestmentModule = React.lazy(() => import('./components/InvestmentModule'));
const NotificationAutomation = React.lazy(() => import('./components/NotificationAutomation'));
const NewTransactionScreen = React.lazy(() => import('./components/NewTransactionScreen'));
const NotificationPromptModal = React.lazy(() => import('./components/NotificationPromptModal'));
const UpdatePromptModal = React.lazy(() => import('./components/UpdatePromptModal'));
import { checkForAppUpdate, AppUpdateInfo } from './utils/updateChecker';

const AppProvider: React.FC<{ children?: ReactNode }> = ({ children }) => {
  const { locale, setLocale, t } = useTranslation();

  // Apenas no `npm run dev` ativa os recursos PRO para testes.
  // Não usar o hostname: no Android (Capacitor) o app roda em https://localhost, o que liberaria o PRO para todos.
  const isDevMode = import.meta.env.DEV;

  // Constantes de Estado Inicial (para reuso no reset)
  const INITIAL_USER_PROFILE: UserProfile = {
    name: 'Usuário', email: '', badges: [], hapticsEnabled: true, notificationsEnabled: false, isPremium: false, currentStreak: 0, aiScansCount: 0, hasAnsweredNotificationPrompt: false
  };

  const INITIAL_DASHBOARD_LAYOUT: DashboardLayout = {
    order: [
      'resumo',
      'insights',
      'monthlyComparison',
      'contas',
      'patrimonio',
      'invoices',
      'installments',
      'endOfMonthForecast',
      'dailyCashFlow',
      'fixedVsVariable',
      'orcamento',
      'tendencias',
      'despesasCategoria',
      'receitasCategoria',
      'resumoDiario',
      'spendingPace',
      'savingsRateHistory',
      'taxaPoupanca',
      'distribuicao502030',
      'metodosPagamentoChart'
    ],
    visibility: {
      resumo: true,
      insights: true,
      smartAlerts: false,
      monthlyComparison: true,
      contas: true,
      patrimonio: true,
      invoices: true,
      installments: true,
      endOfMonthForecast: true,
      dailyCashFlow: true,
      fixedVsVariable: true,
      orcamento: true,
      tendencias: true,
      despesasCategoria: true,
      receitasCategoria: true,
      resumoDiario: true,
      spendingPace: true,
      savingsRateHistory: true,
      taxaPoupanca: true,
      distribuicao502030: true,
      metodosPagamentoChart: true
    },
  };

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isInitializingSession, setIsInitializingSession] = useState<boolean>(true);
  const currentUserIdRef = React.useRef<string | null>(null);
  const loadingUserIdRef = React.useRef<string | null>(null);

  // 🔒 HYDRATION GATES — 3 flags independentes que devem ser TODAS true antes de qualquer save/sync
  const isSessionValidatedRef = React.useRef<boolean>(false);   // Sessão Supabase confirmada
  const isRemoteLoadedRef = React.useRef<boolean>(false);       // Fetch remoto concluído (ou skip se offline)
  const isHydratedRef = React.useRef<boolean>(false);           // Estado local populado e pronto

  // Computed: SÓ permite save/sync quando TODAS as 3 flags são true
  const isSyncReady = () => isSessionValidatedRef.current && isRemoteLoadedRef.current && isHydratedRef.current;

  const [hasLocalSession, setHasLocalSession] = useState<boolean>(false);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Estado padrão
  const [theme, setTheme] = useState<Theme>('dark');
  const [currentTab, setCurrentTab] = useState<Tab>('lancamento');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [currentView, setCurrentViewRaw] = useState<View>('main');
  const previousViewRef = useRef<View>('main');

  const setCurrentView = useCallback((view: View) => {
    setCurrentViewRaw(prev => {
      if (prev !== view) {
        previousViewRef.current = prev;
      }
      return view;
    });
  }, []);

  const goBackView = useCallback(() => {
    setCurrentViewRaw(previousViewRef.current || 'main');
  }, []);
  const [activeEmail, setActiveEmail] = useState<string | null>(null);
  const [menuSubView, setMenuSubView] = useState<MenuSubView>('profile');
  const [showTutorial, setShowTutorial] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<AppUpdateInfo | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState<boolean>(false);

  useEffect(() => {
    if (isLoadingData) return;
    checkForAppUpdate().then(info => {
      if (info && info.hasUpdate) {
        setUpdateInfo(info);
        setIsUpdateModalOpen(true);
      }
    });
  }, [isLoadingData]);

  // Estados de Dados
  const [userProfile, setUserProfile] = useState<UserProfile>(INITIAL_USER_PROFILE);
  const effectiveUserProfile = useMemo<UserProfile>(() => {
    if (isDevMode) {
      return {
        ...userProfile,
        isPremium: true
      };
    }
    return userProfile;
  }, [userProfile, isDevMode]);

  const badgesRef = useRef<string[]>(userProfile.badges || []);
  useEffect(() => { badgesRef.current = userProfile.badges || []; }, [userProfile.badges]);

  // Sincronizar locale do perfil do usuário com o i18n
  useEffect(() => {
    if (userProfile.locale && userProfile.locale !== locale) {
      setLocale(userProfile.locale as any);
    }
  }, [userProfile.locale, locale, setLocale]);
  const [allData, setAllData] = useState<AllData>({});
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [importHistory, setImportHistory] = useState<ImportHistoryItem[]>([]);
  const [categorias, setCategorias] = useState<Categorias>(INITIAL_CATEGORIAS);
  const [categoryColors, setCategoryColors] = useState<CategoryColors>(INITIAL_CATEGORIA_CORES);
  const [budgets, setBudgets] = useState<Budgets>({});
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [dashboardLayout, setDashboardLayout] = useState<DashboardLayout>(INITIAL_DASHBOARD_LAYOUT);

  const [assets, setAssets] = useState<Asset[]>([]);
  const [patrimonioHistory, setPatrimonioHistory] = useState<PatrimonioHistory[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);

  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [confirmingDeleteFutureTx, setConfirmingDeleteFutureTx] = useState<Transaction | null>(null);
  const [isNewTransactionOpen, setIsNewTransactionOpen] = useState(false);
  const [isTransactionMenuOpen, setIsTransactionMenuOpen] = useState(false);
  const [newTransactionInitialType, setNewTransactionInitialType] = useState<'entrada' | 'saida' | 'credito' | 'transferencia' | null>(null);
  const [newTransactionInitialData, setNewTransactionInitialData] = useState<{
    valor?: number;
    descricao?: string;
    tipo?: 'entrada' | 'saida' | 'transferencia';
    paymentMethod?: 'debito' | 'credito';
  } | null>(null);
  const [showTutorialState, setShowTutorialState] = useState(false);
  const [managementFilter, setManagementFilter] = useState<{ method: 'all' | 'credito' | 'debito', cardId: string | 'all', accountId?: string | 'all' } | null>(null);

  // Verifica onboarding
  useEffect(() => {
    if (isAuthenticated && !isLoadingData && userProfile.email && !localStorage.getItem('tutorial_completed')) {
      const timer = setTimeout(() => setShowTutorialState(true), 1500); // pequeno atraso para a tela terminar de montar
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, isLoadingData, userProfile.email]);

  // Inicialização do faturamento In-App (Google Play) e sincronização do status PRO
  useEffect(() => {
    if (isAuthenticated && !isLoadingData) {
      BillingService.initialize(
        (isPremium) => {
          updateUserProfile({ isPremium });
        },
        (msg, type) => {
          showToast(msg, type);
        }
      );
    }
  }, [isAuthenticated, isLoadingData]);

  // Lógica de Streaks Diários
  useEffect(() => {
    if (!isAuthenticated || isLoadingData || !userProfile.email) return;

    const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const lastUsage = userProfile.lastUsageDate;
    
    if (lastUsage !== todayStr) {
      let newStreak = userProfile.currentStreak || 0;
      
      if (!lastUsage) {
        newStreak = 1;
      } else {
        const lastDate = new Date(lastUsage + 'T00:00:00');
        const today = new Date(todayStr + 'T00:00:00');
        const diffTime = Math.abs(today.getTime() - lastDate.getTime());
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          newStreak += 1;
        } else if (diffDays > 1) {
          newStreak = 1; // Reseta se pulou um dia
        }
      }

      setUserProfile(prev => ({
        ...prev,
        currentStreak: newStreak,
        lastUsageDate: todayStr
      }));
    }
  }, [isAuthenticated, isLoadingData]);


  // --- HELPER: ID Único Robusto ---
  // Combina timestamp com string aleatória para evitar duplicidade em loops rápidos
  const generateId = () => {
    return `${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;
  };

  const backHandlersRef = useRef<Record<string, () => boolean>>({});

  const registerBackHandler = useCallback((id: string, fn: () => boolean) => {
    backHandlersRef.current[id] = fn;
  }, []);

  const unregisterBackHandler = useCallback((id: string) => {
    delete backHandlersRef.current[id];
  }, []);

  // --- HAPTICS HELPER ---
  const triggerHaptic = useCallback(async (style: ImpactStyle = ImpactStyle.Light) => {
    if (userProfile.hapticsEnabled !== false && Capacitor.isNativePlatform()) { // Default true
      try {
        await Haptics.impact({ style });
      } catch (error) {
        // Ignora erro em ambientes onde haptics não é suportado
      }
    }
  }, [userProfile.hapticsEnabled]);

  // --- FUNÇÃO PARA LIMPAR TUDO (Logout/Troca de Conta) ---
  const resetAllState = useCallback(() => {
    // 🔒 Bloqueia TODAS as flags de sync até próxima hidratação
    isSessionValidatedRef.current = false;
    isRemoteLoadedRef.current = false;
    isHydratedRef.current = false;

    // Dados do Usuário
    setActiveEmail(null);
    setUserProfile(INITIAL_USER_PROFILE);
    setAllData({});
    setCreditCards([]);
    setImportHistory([]);
    setCategorias(INITIAL_CATEGORIAS);
    setCategoryColors(INITIAL_CATEGORIA_CORES);
    setBudgets({});
    setSavingsGoals([]);
    setDashboardLayout(INITIAL_DASHBOARD_LAYOUT);
    setSubscriptions([]);

    // UI / Preferências
    setTheme('dark');
    setCurrentTab('lancamento');
    setCurrentView('main');
    setMenuSubView('profile');
    setToasts([]);

    // Modais e Edições
    setEditingTxId(null);
    setIsEditModalOpen(false);
    setConfirmingDeleteId(null);
    setConfirmingDeleteFutureTx(null);
    setIsNewTransactionOpen(false);
    setAssets([]);
    setPatrimonioHistory([]);
    setAccounts([]);
    setManagementFilter(null);
  }, []);

  // --- INICIALIZAÇÃO DE SESSÃO E AUTH LISTENER ---
  useEffect(() => {
    let mounted = true;
    const authLog = createSyncLogger('Auth');

    const initSession = async () => {
      authLog.info('Inicializando sessão...');
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        authLog.error('Erro ao buscar sessão:', error);
        setIsInitializingSession(false);
        return;
      }

      const session = data.session;
      if (!mounted) return;

      if (session?.user) {
        const user = session.user;
        const userEmail = user.email ?? null;

        authLog.info(`Sessão encontrada: ${user.id.slice(0, 8)}... (${userEmail})`);

        currentUserIdRef.current = user.id;
        setActiveEmail(userEmail);

        // Seta AMBOS no mesmo batch para evitar renders intermediários
        setIsLoadingData(true);
        setIsAuthenticated(true);
        setHasLocalSession(true);

        localStorage.setItem("lastUserId", user.id);
      } else {
        // Sem sessão online — verifica cache local
        const lastUserId = localStorage.getItem("lastUserId");
        authLog.info(lastUserId
          ? `Sem sessão online, usando cache local: ${lastUserId.slice(0, 8)}...`
          : 'Sem sessão online e sem cache local');

        if (lastUserId) {
          currentUserIdRef.current = lastUserId;
          setIsLoadingData(true);
          setIsAuthenticated(true);
          setHasLocalSession(true);
        } else {
          setIsAuthenticated(false);
          setIsLoadingData(false);
        }
      }
      setIsInitializingSession(false);
    };

    initSession();

    const { data: { subscription } } =
      supabase.auth.onAuthStateChange((_event, session) => {
        if (!mounted) return;

        if (session?.user) {
          const userId = session.user.id;

          // 🔒 Impede re-processamento se já é o mesmo usuário
          if (currentUserIdRef.current === userId) {
            authLog.info(`Auth event para mesmo usuário (${userId.slice(0, 8)}...) — ignorando`);
            setIsInitializingSession(false);
            return;
          }

          authLog.info(`Troca de conta detectada: ${currentUserIdRef.current?.slice(0, 8) || 'null'} → ${userId.slice(0, 8)}`);

          // 🔒 Reseta TUDO antes de popular novo usuário
          // resetAllState já seta as 3 flags de hidratação para false
          resetAllState();
          currentUserIdRef.current = userId;

          const userEmail = session.user.email ?? null;

          // Seta email e profile ANTES de isAuthenticated para evitar render com dados errados
          setActiveEmail(userEmail);
          setUserProfile({
            ...INITIAL_USER_PROFILE,
            email: userEmail || ''
          });

          // Agora seta isLoadingData=true e isAuthenticated=true no mesmo batch
          // O useEffect de loadData será disparado com as flags de hidratação zeradas
          setIsLoadingData(true);
          setIsAuthenticated(true);

          localStorage.setItem("lastUserId", userId);
          setIsInitializingSession(false);
        } else {
          const lastUserId = localStorage.getItem("lastUserId");

          if (!lastUserId) {
            authLog.info('Sessão encerrada e sem cache local — redirecionando para login');
            setIsAuthenticated(false);
            setIsLoadingData(false);
          }
          setIsInitializingSession(false);
        }
      });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // --- CARREGAR DADOS DO SUPABASE AO LOGAR (COM HYDRATION GATES) ---

  useEffect(() => {
    if (!isAuthenticated) return;

    const loadData = async () => {
      const hydrationLog = createSyncLogger('Hydration');
      
      // 🔒 Garante que TODAS as flags de hidratação estão desligadas no início
      isSessionValidatedRef.current = false;
      isRemoteLoadedRef.current = false;
      isHydratedRef.current = false;
      setIsLoadingData(true);

      hydrationLog.group('Iniciando hidratação');

      // --- ETAPA 0: Validar sessão ---
      let user: any = null;
      try {
        const { data } = await supabase.auth.getUser();
        user = data?.user;
      } catch (err) {
        hydrationLog.warn('Erro ao buscar usuário (pode estar offline):', err);
      }

      const userIdAtStart = user?.id || localStorage.getItem("lastUserId");
      loadingUserIdRef.current = userIdAtStart;

      if (!userIdAtStart) {
        hydrationLog.warn('Nenhum userId encontrado — abortando');
        setIsLoadingData(false);
        hydrationLog.groupEnd();
        return;
      }

      // ✅ FLAG 1: Sessão validada
      isSessionValidatedRef.current = true;
      hydrationLog.info(`✅ Sessão validada — UserId: ${userIdAtStart.slice(0, 8)}...`);

      const fallbackUserId = localStorage.getItem("lastUserId");
      const effectiveUserId = user?.id || fallbackUserId || null;

      // --- ETAPA 1: Carregar dados locais ---
      let localData = effectiveUserId
        ? await loadLocalData(effectiveUserId)
        : null;

      if (localData && localData.__userId !== effectiveUserId) {
        hydrationLog.warn('Dados locais pertencem a outro usuário — descartando', {
          expected: effectiveUserId,
          found: localData.__userId
        });
        localData = null;
      }

      // Verifica se houve troca de conta durante o load
      if (currentUserIdRef.current && currentUserIdRef.current !== userIdAtStart) {
        hydrationLog.warn('Troca de conta detectada durante load — abortando');
        setIsLoadingData(false);
        hydrationLog.groupEnd();
        return;
      }

      const localIsEmpty = isEmptyState(localData);
      hydrationLog.info(`Local: ${localIsEmpty ? '⚠️ VAZIO/DEFAULT' : '✅ tem dados'}`, dataSummary(localData));

      // Migração: aplica ícones padrão nas categorias salvas que ainda não têm ícone
      const migrateCategoryIcons = (cats: typeof INITIAL_CATEGORIAS): typeof INITIAL_CATEGORIAS => {
        const allDefaults = [...INITIAL_CATEGORIAS.entrada, ...INITIAL_CATEGORIAS.saida];
        const applyIcons = (list: any[]) => list.map(cat => {
          if (cat.icon) return cat;
          const def = allDefaults.find(d => d.name === cat.name);
          return def?.icon ? { ...cat, icon: def.icon } : cat;
        });
        return { entrada: applyIcons(cats.entrada), saida: applyIcons(cats.saida) };
      };

      // Helper para aplicar dados no state
      const applyDataToState = (data: any, source: string) => {
        hydrationLog.info(`Aplicando dados da fonte: ${source}`, dataSummary(data));
        setAllData(data.allData || {});
        setCategorias(migrateCategoryIcons(data.categories || INITIAL_CATEGORIAS));
        setCategoryColors(data.categoryColors || INITIAL_CATEGORIA_CORES);
        setCreditCards(data.creditCards || []);
        setBudgets(data.budgets || {});
        setSavingsGoals(data.savingsGoals || []);
        const rawLayout = data.dashboardLayout || INITIAL_DASHBOARD_LAYOUT;
        let layoutOrder = [...(rawLayout.order || INITIAL_DASHBOARD_LAYOUT.order)];
        const currentInsightsIdx = layoutOrder.indexOf('insights');
        if (currentInsightsIdx === -1 || currentInsightsIdx > 3) {
          layoutOrder = layoutOrder.filter(k => k !== 'insights');
          const resumoIdx = layoutOrder.indexOf('resumo');
          layoutOrder.splice(resumoIdx >= 0 ? resumoIdx + 1 : 1, 0, 'insights');
        }
        setDashboardLayout({
          order: layoutOrder,
          visibility: {
            ...INITIAL_DASHBOARD_LAYOUT.visibility,
            ...(rawLayout.visibility || {}),
            insights: true
          }
        });
        setAssets(data.assets || []);
        setPatrimonioHistory(data.patrimonioHistory || []);
        setAccounts(data.accounts || []);
        setSubscriptions(data.subscriptions || []);
        setUserProfile({
          ...INITIAL_USER_PROFILE,
          ...(data.userProfile || {})
        });
        setImportHistory(data.importHistory || []);
        setTheme(data.theme || 'dark');
      };

      // --- ETAPA 2: Se tem dados locais válidos, popula estado imediatamente (fast-path) ---
      if (localData && localData.__userId === userIdAtStart && !localIsEmpty) {
        applyDataToState(localData, 'LOCAL (cache rápido)');
      }

      // --- ETAPA 3: Se online, busca dados remotos e faz merge ---
      if (isOnline) {
        let remote: any = null;
        try {
          remote = await fetchAllDataFromSupabase();
        } catch (error) {
          hydrationLog.error('Erro na busca remota. Mantendo cache local.', error);
          // Se temos dados locais válidos, finaliza com eles
          if (localData && !localIsEmpty) {
            isRemoteLoadedRef.current = true; // Marcamos como "tentou" mesmo com erro
            isHydratedRef.current = true;
            hydrationLog.info('✅ Hidratação completa (fallback local após erro remoto)');
          }
          setIsLoadingData(false);
          hydrationLog.groupEnd();
          return;
        }

        // ✅ FLAG 2: Fetch remoto concluído
        isRemoteLoadedRef.current = true;

        const remoteIsEmpty = isEmptyState(remote);
        hydrationLog.info(`Remoto: ${!remote ? '(inexistente)' : remoteIsEmpty ? '⚠️ VAZIO' : '✅ tem dados'}`, dataSummary(remote));

        // 🔒 Verifica troca de conta novamente após fetch assíncrono
        if (currentUserIdRef.current && currentUserIdRef.current !== userIdAtStart) {
          hydrationLog.warn('Troca de conta detectada após fetch remoto — abortando');
          setIsLoadingData(false);
          hydrationLog.groupEnd();
          return;
        }

        // --- DECISÃO DE MERGE ---
        
        // Caso 1: Ambos têm dados válidos → Smart Merge
        if (!localIsEmpty && remote && !remoteIsEmpty) {
          hydrationLog.info('🔀 Ambos têm dados — executando Smart Merge');
          const merged = smartMerge(localData!, remote);
          applyDataToState(merged, 'SMART MERGE');
          
          if (effectiveUserId) {
            await saveLocalData({ ...merged, __userId: effectiveUserId }, effectiveUserId);
          }
          await saveAllDataToSupabase(merged);
        }
        // Caso 2: Só remoto tem dados (fresh install / cache limpo) → Usa remoto
        // Após reinstalação, dados locais são apagados — remoto é a fonte de verdade
        else if ((localIsEmpty || !localData) && remote && !remoteIsEmpty) {
          hydrationLog.info('📥 Usando dados REMOTOS (local vazio/inexistente)');
          applyDataToState(remote, 'REMOTO');
          
          if (effectiveUserId) {
            await saveLocalData({ ...remote, lastUpdatedAt: new Date().toISOString(), __userId: effectiveUserId }, effectiveUserId);
          }
        }
        // Caso 3: Só local tem dados (remoto vazio/inexistente) → Usa local e faz upload
        else if (!localIsEmpty && localData && (!remote || remoteIsEmpty)) {
          hydrationLog.info('📤 Usando dados LOCAIS e fazendo upload para nuvem');
          await saveAllDataToSupabase({
            allData: localData.allData || {},
            categories: localData.categories || INITIAL_CATEGORIAS,
            categoryColors: localData.categoryColors || INITIAL_CATEGORIA_CORES,
            creditCards: localData.creditCards || [],
            budgets: localData.budgets || {},
            savingsGoals: localData.savingsGoals || [],
            dashboardLayout: localData.dashboardLayout || INITIAL_DASHBOARD_LAYOUT,
            userProfile: localData.userProfile || INITIAL_USER_PROFILE,
            importHistory: localData.importHistory || [],
            theme: localData.theme || 'dark',
            assets: localData.assets || [],
            patrimonioHistory: localData.patrimonioHistory || [],
            accounts: localData.accounts || [],
            subscriptions: localData.subscriptions || [],
            lastUpdatedAt: localData.lastUpdatedAt || new Date().toISOString()
          });
        }
        // Caso 4: Ambos vazios → Usuário novo, mantém defaults
        else {
          hydrationLog.info('🆕 Ambos vazios — usuário novo, mantendo defaults');
        }
      } else {
        // Offline: marca remoto como "carregado" (skip)
        isRemoteLoadedRef.current = true;

        if (localData && !localIsEmpty) {
          hydrationLog.info('📱 Offline — usando dados locais');
        } else {
          hydrationLog.info('📱 Offline e sem dados locais — mantendo defaults');
        }
      }

      // 🔓 HYDRATION GATE FINAL: Libera persistência e sync
      isHydratedRef.current = true;
      hydrationLog.info('✅ Hidratação completa — todas as 3 flags LIBERADAS', {
        isSessionValidated: isSessionValidatedRef.current,
        isRemoteLoaded: isRemoteLoadedRef.current,
        isHydrated: isHydratedRef.current
      });
      hydrationLog.groupEnd();

      setIsLoadingData(false);
    };

    loadData();
  }, [isAuthenticated]);

  // --- PERSISTÊNCIA LOCAL COM DEBOUNCE (500ms) ---
  useEffect(() => {
    const persistLog = createSyncLogger('LocalPersist');

    // 🔒 HYDRATION GATES: Todas as 3 flags devem ser true
    if (!isAuthenticated || isLoadingData || !isSyncReady()) {
      return;
    }

    const fallbackUserId = localStorage.getItem("lastUserId");
    if (!currentUserIdRef.current && !fallbackUserId) return;

    const timer = setTimeout(() => {
      (async () => {
        // Re-verifica as flags dentro do timeout (podem ter mudado)
        if (!isSyncReady()) {
          persistLog.warn('🛑 SAVE LOCAL BLOQUEADO: flags de hidratação mudaram durante debounce');
          return;
        }

        const effectiveUserId = currentUserIdRef.current || fallbackUserId;
        if (!effectiveUserId) return;

        const payload = {
          allData,
          categories: categorias,
          categoryColors,
          creditCards,
          budgets,
          savingsGoals,
          dashboardLayout,
          userProfile,
          importHistory,
          theme,
          assets,
          patrimonioHistory,
          accounts,
          subscriptions,
          lastUpdatedAt: new Date().toISOString(),
          __userId: effectiveUserId
        };

        // O guard de isEmptyState/isValidPayload é feito dentro do saveLocalData
        await saveLocalData(payload, effectiveUserId);
      })();
    }, 500);

    return () => clearTimeout(timer);

  }, [
    allData,
    categorias,
    categoryColors,
    creditCards,
    budgets,
    savingsGoals,
    dashboardLayout,
    userProfile,
    importHistory,
    theme,
    assets,
    patrimonioHistory,
    accounts,
    subscriptions,
    isAuthenticated,
    isLoadingData
  ]);


  // --- SINCRONIZAÇÃO AUTOMÁTICA SEGURA ---
  useEffect(() => {
    const syncLog = createSyncLogger('AutoSync');

    // 🔒 HYDRATION GATES: Todas as 3 flags devem ser true + online
    if (!isAuthenticated || !isOnline || isLoadingData || !isSyncReady()) {
      return;
    }

    const timer = setTimeout(async () => {
      try {
        // Re-verifica as flags dentro do timeout
        if (!isSyncReady()) {
          syncLog.warn('🛑 SYNC BLOQUEADO: flags de hidratação mudaram durante debounce');
          return;
        }

        const effectiveUserId = currentUserIdRef.current || localStorage.getItem("lastUserId");
        if (!effectiveUserId) return;

        // 🛑 Empty State Guard: verifica se o estado atual é vazio
        const currentData = {
          allData,
          categories: categorias,
          categoryColors,
          creditCards,
          budgets,
          savingsGoals,
          dashboardLayout,
          userProfile,
          importHistory,
          theme,
          assets,
          patrimonioHistory,
          accounts,
          subscriptions,
        } as any;

        // ℹ️ Log se estado local é considerado "vazio" (sem transações/metas)
        if (isEmptyState(currentData)) {
          syncLog.info('ℹ️ Estado local sem transações/metas — continuando sync mesmo assim');
        }

        // Compara timestamps local vs remoto para não sobrescrever à toa
        const localData = await loadLocalData(effectiveUserId);
        let remote: any = null;
        try {
          remote = await fetchAllDataFromSupabase();
        } catch (fetchErr) {
          syncLog.warn('Erro ao buscar remoto no auto-sync — abortando upload', fetchErr);
          return;
        }

        const remoteUpdated = new Date(remote?.lastUpdatedAt || 0).getTime();
        const localUpdated = new Date(localData?.lastUpdatedAt || 0).getTime();

        // 🛡️ Proteção: se remoto tem TRANSAÇÕES reais e local NÃO tem, NÃO sobrescrever
        if (remote && !isEmptyState(remote) && isEmptyState(currentData)) {
          syncLog.warn('🛡️ Remoto tem transações mas local não — NÃO sobrescrevendo remoto');
          return;
        }

        // Se o local for mais novo que o remoto (ou remoto não existir), sincroniza
        if (!remote || localUpdated > remoteUpdated) {
          syncLog.info('📤 Local mais recente — sincronizando para nuvem', {
            userId: effectiveUserId.slice(0, 8),
            summary: dataSummary(currentData)
          });
          await saveAllDataToSupabase({
            allData,
            categories: categorias,
            categoryColors,
            creditCards,
            budgets,
            savingsGoals,
            dashboardLayout,
            userProfile,
            importHistory,
            theme,
            assets,
            patrimonioHistory,
            accounts,
            subscriptions,
            lastUpdatedAt: localData?.lastUpdatedAt || new Date().toISOString()
          });
        } else {
          syncLog.info('☁️ Remoto mais recente ou igual — nenhum upload necessário');
        }
      } catch (err) {
        const syncLog2 = createSyncLogger('AutoSync');
        syncLog2.error('Erro inesperado no auto-sync:', err);
      }
    }, 5000);

    return () => clearTimeout(timer);

  }, [
    allData,
    categorias,
    categoryColors,
    creditCards,
    budgets,
    savingsGoals,
    dashboardLayout,
    userProfile,
    importHistory,
    theme,
    assets,
    patrimonioHistory,
    accounts,
    subscriptions,
    isAuthenticated,
    isOnline,
    isLoadingData
  ]);

  // --- LÓGICA DO BOTÃO VOLTAR (GLOBAL) ---
  useEffect(() => {
    const setupBackHandler = async () => {
      // Remover todos os listeners de backButton para evitar callbacks fantasmas com closure antigo
      await CapApp.removeAllListeners();
      await CapApp.addListener('backButton', () => {
        // Executa os handlers registrados dinamicamente do mais recente para o mais antigo
        const handlers = Object.values(backHandlersRef.current);
        for (let i = handlers.length - 1; i >= 0; i--) {
          if (handlers[i]()) {
            return;
          }
        }
        // Prioridade 1: Fechar Modais e Telas de Cadastro abertas
        if (isTransactionMenuOpen) {
          setIsTransactionMenuOpen(false);
          return;
        }

        if (isNewTransactionOpen) {
          setIsNewTransactionOpen(false);
          return;
        }

        if (isEditModalOpen || editingTxId) {
          setIsEditModalOpen(false);
          setEditingTxId(null);
          return;
        }

        if (confirmingDeleteId || confirmingDeleteFutureTx) {
          setConfirmingDeleteId(null);
          setConfirmingDeleteFutureTx(null);
          return;
        }

        // Prioridade 1.5: Navegação interna do Menu (Sub-telas)
        if (currentView === 'menu' && menuSubView !== 'profile') {
          setMenuSubView('profile');
          return;
        }

        // Prioridade 2: Voltar de visualizações secundárias para a Main
        if (currentView !== 'main') {
          setCurrentView('main');
          return;
        }

        // Prioridade 3: Se estiver na Main mas em outra aba, volta para 'lancamento'
        if (currentTab !== 'lancamento') {
          setCurrentTab('lancamento');
          return;
        }

        // Prioridade 4: Se já estiver na tela inicial, sai do app
        CapApp.exitApp();
      });
    };

    setupBackHandler();

    return () => {
      CapApp.removeAllListeners();
    };
  }, [currentView, currentTab, isTransactionMenuOpen, isNewTransactionOpen, isEditModalOpen, editingTxId, confirmingDeleteId, confirmingDeleteFutureTx, menuSubView]);

  const transactions = useMemo(() => {
    const monthKey = getMonthKey(currentDate);
    const monthData = allData[monthKey];
    return monthData?.transactions || [];
  }, [allData, currentDate]);

  const allTransactions = useMemo(() => {
    return Object.values(allData).flatMap((month: any) => month?.transactions || []);
  }, [allData]);

  const despesasPorCategoria = useMemo(() => {
    const despesasMap: Record<string, number> = {};
    transactions.forEach(tx => {
      if (tx.tipo === 'saida') {
        despesasMap[tx.categoria] = (despesasMap[tx.categoria] || 0) + tx.valor;
      }
    });
    return Object.entries(despesasMap).map(([name, value]) => ({ name, value }));
  }, [transactions]);

  // --- Efeito: Sincronizar dados com os Widgets Nativos do Android ---
  useEffect(() => {
    if (isLoadingData) return;
    const totalSaldo = accounts && accounts.length > 0
      ? accounts.reduce((acc, a) => acc + (a.balance || 0), 0)
      : (allTransactions || []).reduce((acc, t) => acc + (t.tipo === 'entrada' ? t.valor : t.tipo === 'saida' ? -t.valor : 0), 0);

    const todayStr = new Date().toISOString().slice(0, 10);
    const gastosHoje = (allTransactions || [])
      .filter(t => t.tipo === 'saida' && t.data === todayStr)
      .reduce((sum, t) => sum + (t.valor || 0), 0);

    const currentMonthKey = getMonthKey(currentDate);
    const currentMonthData = allData[currentMonthKey];
    const prevBalance = getPreviousBalance(currentMonthKey, allData);
    const monthEntradas = (currentMonthData?.transactions || []).filter(t => t.tipo === 'entrada').reduce((sum, t) => sum + t.valor, 0);
    const monthSaidas = (currentMonthData?.transactions || []).filter(t => t.tipo === 'saida').reduce((sum, t) => sum + t.valor, 0);
    const previsaoFimMes = prevBalance + monthEntradas - monthSaidas;

    const appLocale = locale === 'pt' ? 'pt-BR' : locale === 'en' ? 'en-US' : locale === 'es' ? 'es-ES' : locale === 'fr' ? 'fr-FR' : 'de-DE';
    const appCurrency = userProfile.currency || 'BRL';

    const formattedSaldo = formatCurrency(totalSaldo, appLocale, appCurrency);
    const formattedGastosHoje = formatCurrency(gastosHoje, appLocale, appCurrency);
    const formattedPrevisao = formatCurrency(previsaoFimMes, appLocale, appCurrency);

    syncWidgetData(formattedSaldo, 'Saldo em Contas', formattedGastosHoje, formattedPrevisao);
  }, [allTransactions, accounts, allData, currentDate, isLoadingData, locale, userProfile.currency]);

  // --- SISTEMA DE CONQUISTAS (BADGES) ---
  useEffect(() => {
    if (!isAuthenticated || isLoadingData) return;

    const currentBadges = new Set(badgesRef.current);
    let newBadges: string[] = [];
    
    // Filtra as transações reais do usuário, desconsiderando "Saldo Inicial" automático
    const realTransactions = allTransactions.filter(tx => tx.categoria !== 'Saldo Inicial');

    // Lógica das Conquistas
    if (!currentBadges.has('iniciante') && realTransactions.length > 0) {
      newBadges.push('iniciante');
    }
    if (!currentBadges.has('metas_1') && savingsGoals.length > 0) {
      newBadges.push('metas_1');
    }
    if (!currentBadges.has('planejador') && Object.keys(budgets).length > 0) {
      newBadges.push('planejador');
    }

    // Conquistas de Streaks Diários
    const streak = userProfile.currentStreak || 0;
    if (!currentBadges.has('streak_3') && streak >= 3) {
      newBadges.push('streak_3');
    }
    if (!currentBadges.has('streak_7') && streak >= 7) {
      newBadges.push('streak_7');
    }
    if (!currentBadges.has('streak_30') && streak >= 30) {
      newBadges.push('streak_30');
    }
    if (!currentBadges.has('streak_90') && streak >= 90) {
      newBadges.push('streak_90');
    }

    // Conquistas de Metas
    if (!currentBadges.has('goal_completed_1') && savingsGoals.some(g => {
      const amount = allTransactions.filter(tx => tx.goalId === g.id).reduce((acc, t) => acc + t.valor, 0);
      return amount >= g.targetAmount && g.targetAmount > 0;
    })) {
      newBadges.push('goal_completed_1');
    }

    if (!currentBadges.has('goal_deposit_5') && allTransactions.filter(tx => tx.goalId).length >= 5) {
      newBadges.push('goal_deposit_5');
    }

    if (!currentBadges.has('goal_active_3') && savingsGoals.filter(g => {
      const amount = allTransactions.filter(tx => tx.goalId === g.id).reduce((acc, t) => acc + t.valor, 0);
      return amount < g.targetAmount;
    }).length >= 3) {
      newBadges.push('goal_active_3');
    }

    if (!currentBadges.has('saldo_1000')) {
      const totalSaved = savingsGoals.reduce((total, goal) => {
        return total + allTransactions.filter(tx => tx.goalId === goal.id).reduce((sum, t) => sum + t.valor, 0);
      }, 0);
      if (totalSaved >= 1000) newBadges.push('saldo_1000');
    }

    if (!currentBadges.has('ai_explorer') && (userProfile.aiScansCount || 0) >= 10) {
      newBadges.push('ai_explorer');
    }

    // --- LOGICA DOS BADGES NOVOS E PENDENTES ATIVOS ---

    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const todayDateStr = now.toISOString().slice(0, 10);

    // Apenas transações que já aconteceram ou pertencem ao mês corrente (NUNCA lançamentos futuros agendados/recorrentes)
    const pastAndCurrentTransactions = realTransactions.filter(tx => tx.data.substring(0, 7) <= currentMonthKey);

    const transacoesPorMes: { [mes: string]: Transaction[] } = {};
    pastAndCurrentTransactions.forEach(tx => {
      const mes = tx.data.substring(0, 7);
      if (!transacoesPorMes[mes]) transacoesPorMes[mes] = [];
      transacoesPorMes[mes].push(tx);
    });

    // --- LOGICA DOS BADGES NOVOS E PENDENTES ATIVOS ---

    // 1. zero_spend_weekend: Fim de semana (sábado e domingo) sem nenhuma despesa ('saida') que JÁ OCORREU
    if (!currentBadges.has('zero_spend_weekend') && pastAndCurrentTransactions.filter(tx => tx.tipo === 'saida').length >= 3) {
      let hasZeroSpendWeekend = false;
      for (const [mesKey, txs] of Object.entries(transacoesPorMes)) {
        const [year, month] = mesKey.split('-').map(Number);
        const date = new Date(year, month, 0);
        const totalDias = date.getDate();

        for (let dia = 1; dia < totalDias; dia++) {
          const d1 = new Date(year, month - 1, dia);
          const d2 = new Date(year, month - 1, dia + 1);

          if (d1.getDay() === 6 && d2.getDay() === 0) {
            const s1 = `${mesKey}-${String(dia).padStart(2, '0')}`;
            const s2 = `${mesKey}-${String(dia + 1).padStart(2, '0')}`;

            // Só valida fins de semana que já terminaram no mundo real
            if (s2 <= todayDateStr) {
              const temGasto = txs.some(tx => tx.tipo === 'saida' && (tx.data === s1 || tx.data === s2));
              if (!temGasto) {
                hasZeroSpendWeekend = true;
                break;
              }
            }
          }
        }
        if (hasZeroSpendWeekend) break;
      }
      if (hasZeroSpendWeekend) {
        newBadges.push('zero_spend_weekend');
      }
    }

    // 2. conscious_investor: >= 10% da receita alocada em Investimentos em algum mês
    if (!currentBadges.has('conscious_investor') && pastAndCurrentTransactions.length > 0) {
      let isConsciousInvestor = false;
      for (const txs of Object.values(transacoesPorMes)) {
        const receitaTotal = txs.filter(tx => tx.tipo === 'entrada').reduce((sum, tx) => sum + tx.valor, 0);
        const investimentoTotal = txs
          .filter(tx => tx.tipo === 'saida' && (tx.categoria?.toLowerCase() === 'investimentos' || tx.categoria === 'Investimentos'))
          .reduce((sum, tx) => sum + tx.valor, 0);

        if (receitaTotal > 0 && (investimentoTotal / receitaTotal) >= 0.10) {
          isConsciousInvestor = true;
          break;
        }
      }
      if (isConsciousInvestor) {
        newBadges.push('conscious_investor');
      }
    }

    // 3. emergency_ready: Metas possuem saldo >= média de gastos mensais ou R$ 1.500
    if (!currentBadges.has('emergency_ready') && pastAndCurrentTransactions.length > 0 && savingsGoals.length > 0) {
      const totalSaved = savingsGoals.reduce((total, goal) => {
        return total + allTransactions.filter(tx => tx.goalId === goal.id).reduce((sum, t) => sum + t.valor, 0);
      }, 0);

      const saidas = pastAndCurrentTransactions.filter(tx => tx.tipo === 'saida');
      const mesesSet = new Set(pastAndCurrentTransactions.map(tx => tx.data.substring(0, 7)));
      const qtdMeses = mesesSet.size || 1;
      const totalSaidas = saidas.reduce((sum, tx) => sum + tx.valor, 0);
      const mediaGastos = totalSaidas / qtdMeses;

      if (totalSaved >= 1500 || (mediaGastos > 0 && totalSaved >= mediaGastos)) {
        newBadges.push('emergency_ready');
      }
    }

    // 4. budget_master: Terminou um mês completo passado sem estourar nenhum limite de categoria
    if (!currentBadges.has('budget_master') && Object.keys(budgets).length > 0 && pastAndCurrentTransactions.length > 0) {
      let budgetMasterDesbloqueado = false;
      // Só avalia meses que já foram concluídos (anteriores ao mês atual)
      for (const [mesKey, txs] of Object.entries(transacoesPorMes)) {
        if (mesKey >= currentMonthKey) continue; // Mês corrente ou futuro ainda não terminou!

        const despesasSaida = txs.filter(tx => tx.tipo === 'saida');
        if (despesasSaida.length === 0) continue;

        let algumEstouro = false;
        let peloMenosUmGastoEmBudget = false;

        for (const [catName, limite] of Object.entries(budgets)) {
          const totalGastoCat = despesasSaida
            .filter(tx => tx.categoria === catName)
            .reduce((sum, tx) => sum + tx.valor, 0);

          if (totalGastoCat > 0) {
            peloMenosUmGastoEmBudget = true;
          }
          if (totalGastoCat > limite) {
            algumEstouro = true;
            break;
          }
        }
        if (peloMenosUmGastoEmBudget && !algumEstouro) {
          budgetMasterDesbloqueado = true;
          break;
        }
      }
      if (budgetMasterDesbloqueado) {
        newBadges.push('budget_master');
      }
    }

    // 5. save_ratio_50: Poupar >= 50% das receitas em um único mês já ocorrido
    if (!currentBadges.has('save_ratio_50') && pastAndCurrentTransactions.length > 0) {
      let saveRatio50Desbloqueado = false;
      for (const txs of Object.values(transacoesPorMes)) {
        const receitaTotal = txs.filter(tx => tx.tipo === 'entrada').reduce((sum, tx) => sum + tx.valor, 0);
        const despesaTotal = txs.filter(tx => tx.tipo === 'saida').reduce((sum, tx) => sum + tx.valor, 0);

        if (receitaTotal > 0 && despesaTotal > 0) {
          const poupado = receitaTotal - despesaTotal;
          if ((poupado / receitaTotal) >= 0.50) {
            saveRatio50Desbloqueado = true;
            break;
          }
        }
      }
      if (saveRatio50Desbloqueado) {
        newBadges.push('save_ratio_50');
      }
    }

    // 6. no_credit_spend: Passar um mês com >= 5 despesas sem usar o cartão de crédito (débito/dinheiro)
    if (!currentBadges.has('no_credit_spend') && pastAndCurrentTransactions.length > 0) {
      let noCreditSpendDesbloqueado = false;
      for (const txs of Object.values(transacoesPorMes)) {
        const despesas = txs.filter(tx => tx.tipo === 'saida');
        const temCredito = despesas.some(tx => tx.paymentMethod === 'credito');
        if (despesas.length >= 5 && !temCredito) {
          noCreditSpendDesbloqueado = true;
          break;
        }
      }
      if (noCreditSpendDesbloqueado) {
        newBadges.push('no_credit_spend');
      }
    }

    // 7. frequent_logger: Alcançar >= 15 lançamentos no app
    if (!currentBadges.has('frequent_logger') && realTransactions.length >= 15) {
      newBadges.push('frequent_logger');
    }

    // 8. cfo_consultant: Interagir pelo menos 5 vezes com o chat de IA
    if (!currentBadges.has('cfo_consultant') && (userProfile.cfoInteractionsCount || 0) >= 5) {
      newBadges.push('cfo_consultant');
    }

    // 9. Longevidade real: quantidade de meses CONSECUTIVOS usando o app sem falhar até o mês atual
    // Meses no futuro (gerados por compras parceladas ou assinaturas fixas) são expressamente ignorados.
    const activePastMonths = new Set(Object.keys(transacoesPorMes));
    let consecutiveMonths = 0;
    let checkDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}`;

    if (!activePastMonths.has(currentMonthStr)) {
      checkDate.setMonth(checkDate.getMonth() - 1);
    }

    while (true) {
      const mStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}`;
      if (activePastMonths.has(mStr)) {
        consecutiveMonths++;
        checkDate.setMonth(checkDate.getMonth() - 1);
      } else {
        break;
      }
    }

    // 🛡️ Auto-correção: Revoga badges de longevidade que foram concedidos indevidamente por lançamentos futuros
    const invalidLongevityBadges: string[] = [];
    if (currentBadges.has('usage_3m') && consecutiveMonths < 3) invalidLongevityBadges.push('usage_3m');
    if (currentBadges.has('usage_6m') && consecutiveMonths < 6) invalidLongevityBadges.push('usage_6m');
    if (currentBadges.has('usage_12m') && consecutiveMonths < 12) invalidLongevityBadges.push('usage_12m');

    if (invalidLongevityBadges.length > 0) {
      setUserProfile(prev => {
        const cleaned = (prev.badges || []).filter(b => !invalidLongevityBadges.includes(b));
        const withoutCompletionist = cleaned.filter(b => b !== 'completionist');
        const finalBadges = withoutCompletionist.length >= 10 ? cleaned : withoutCompletionist;
        return {
          ...prev,
          badges: finalBadges
        };
      });
      return;
    }

    if (!currentBadges.has('usage_3m') && consecutiveMonths >= 3) {
      newBadges.push('usage_3m');
    }
    if (!currentBadges.has('usage_6m') && consecutiveMonths >= 6) {
      newBadges.push('usage_6m');
    }
    if (!currentBadges.has('usage_12m') && consecutiveMonths >= 12) {
      newBadges.push('usage_12m');
    }

    // 10. completionist: Obter >= 10 outras conquistas
    if (!currentBadges.has('completionist')) {
      const totalOutrasConquistadas = Array.from(currentBadges).filter(id => id !== 'completionist').length + newBadges.filter(id => id !== 'completionist').length;
      if (totalOutrasConquistadas >= 10) {
        newBadges.push('completionist');
      }
    }

    if (newBadges.length > 0) {
      setUserProfile(prev => ({
        ...prev,
        badges: [...new Set([...(prev.badges || []), ...newBadges])]
      }));

      // Notificar usuário e Confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        zIndex: 2000
      });

      // Mapear IDs para Nomes Traduzidos
      const badgeNames = newBadges
        .map(id => {
          const b = AVAILABLE_BADGES.find(x => x.id === id);
          return b ? (t(`badge.${b.id}`) || b.name) : '';
        })
        .filter(Boolean)
        .join(', ');

      showToast(`Conquista desbloqueada: ${badgeNames}!`, "success");
    }
  }, [allTransactions, savingsGoals, budgets, userProfile.aiScansCount, userProfile.currentStreak, userProfile.cfoInteractionsCount, isAuthenticated, isLoadingData]);


  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    if (Capacitor.isNativePlatform()) {
      StatusBar.setOverlaysWebView({ overlay: true }).catch(() => { });
      StatusBar.hide().catch(() => { });
    }
  }, [theme]);

  // --- ASSETS HANDLERS ---
  const handleAddAsset = (asset: Omit<Asset, 'id'>) => {
    const newAsset = { ...asset, id: generateId() };
    setAssets(prev => [...prev, newAsset]);
    showToast("Ativo adicionado!", "success");
    triggerHaptic(ImpactStyle.Medium);
  };

  const handleUpdateAsset = (id: string, updates: Partial<Asset>) => {
    setAssets(prev => prev.map(a => a.id === id ? { ...a, ...updates, lastUpdated: new Date().toISOString() } : a));
    showToast("Ativo atualizado.", "success");
  };

  const handleDeleteAsset = (id: string) => {
    setAssets(prev => prev.filter(a => a.id !== id));
    showToast("Ativo removido.", "info");
  };

  // --- ACCOUNTS HANDLERS ---
  const handleCreateBankAccount = (account: Omit<Account, 'id'>) => {
    const accountId = generateId();
    // Inicia a conta com saldo 0, pois a transação de "Saldo Inicial" vai atualizar o saldo corretamente
    const newAccount = { ...account, id: accountId, balance: 0 };
    setAccounts(prev => [...prev, newAccount]);

    const isFirstAccount = accounts.length === 0;

    setAllData((prev: AllData) => {
      let next = { ...prev };
      let oldestModifiedMonth: string | null = null;

      // 1. Vinculação Retroativa se for a primeira conta
      if (isFirstAccount) {
        Object.keys(next).forEach(monthKey => {
          if (next[monthKey]?.transactions) {
            let monthModified = false;
            next[monthKey].transactions = next[monthKey].transactions.map(tx => {
              // Associa TODAS as transações sem conta à primeira conta criada
              if (!tx.accountId) {
                monthModified = true;
                return { ...tx, accountId };
              }
              return tx;
            });
            if (monthModified) {
              if (!oldestModifiedMonth || monthKey < oldestModifiedMonth) {
                oldestModifiedMonth = monthKey;
              }
            }
          }
        });
      }

      // 2. Transação de Saldo Inicial
      if (account.balance > 0) {
        const initialDate = account.initialDate || new Date().toISOString().split('T')[0];
        const txId = generateId();
        const initialTxMonthKey = getMonthKey(new Date(initialDate + 'T00:00:00'));

        const initialTx: Transaction = {
          id: txId,
          data: initialDate,
          descricao: `Saldo Inicial - ${account.bankName}`,
          valor: account.balance,
          tipo: 'entrada',
          categoria: 'Saldo Inicial',
          paymentMethod: 'debito',
          accountId: accountId
        };

        const monthData = next[initialTxMonthKey] || { transactions: [], saldoFinal: 0 };
        next[initialTxMonthKey] = {
          ...monthData,
          transactions: [...monthData.transactions, initialTx]
        };
        
        // Atualiza a conta de referência
        setAccounts(prevAccounts => prevAccounts.map(a => a.id === accountId ? { ...a, balance: account.balance } : a));

        if (!oldestModifiedMonth || initialTxMonthKey < oldestModifiedMonth) {
          oldestModifiedMonth = initialTxMonthKey;
        }
      }

      // 3. Recalcula a partir do mês mais antigo modificado
      return oldestModifiedMonth ? recalculateBalancesFrom(oldestModifiedMonth, next) : next;
    });

    showToast("Conta criada!", "success");
    triggerHaptic(ImpactStyle.Medium);
  };

  const handleUpdateBankAccount = (id: string, updates: Partial<Account>) => {
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  };

  const handleDeleteBankAccount = (id: string) => {
    setAccounts(prev => prev.filter(a => a.id !== id));
    showToast("Conta removida.", "info");
  };

  const toggleTheme = useCallback(() => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const handleLoginSuccess = async (email: string) => {
    resetAllState();

    // Busca o userId REAL da sessão Supabase autenticada
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;

    if (user) {
      // Usuário autenticado com Supabase — usa userId real
      localStorage.setItem("lastUserId", user.id);
      currentUserIdRef.current = user.id;
    } else {
      // Fallback: tenta usar o último userId salvo
      const lastUserId = localStorage.getItem("lastUserId");
      if (lastUserId) {
        currentUserIdRef.current = lastUserId;
      } else {
        console.warn('[handleLoginSuccess] Nenhuma sessão Supabase encontrada e sem cache local');
      }
    }

    setActiveEmail(email);
    setUserProfile({
      ...INITIAL_USER_PROFILE,
      email
    });

    // Seta isAuthenticated=true — o useEffect de loadData cuidará da hidratação completa
    // (validação de sessão, fetch remoto, merge e liberação das flags de sync)
    setIsAuthenticated(true);
    setIsLoadingData(true);
    setCurrentView('main');
  };


  const handleLogout = async () => {
    const logoutLog = createSyncLogger('Logout');
    logoutLog.info('Iniciando logout...');

    // 🔒 Bloqueia sync IMEDIATAMENTE antes de qualquer operação async
    isSessionValidatedRef.current = false;
    isRemoteLoadedRef.current = false;
    isHydratedRef.current = false;

    try {
      // Limpar dados locais do Capacitor Preferences ANTES do signOut
      const userId = currentUserIdRef.current || localStorage.getItem("lastUserId");
      if (userId) {
        await clearLocalData(userId);
        logoutLog.info(`Dados locais do user ${userId.slice(0, 8)} removidos`);
      }

      await supabase.auth.signOut();
      logoutLog.info('SignOut Supabase concluído');
    } catch (error) {
      logoutLog.error('Erro no logout:', error);
    }

    // Remove sessão offline
    localStorage.removeItem("lastUserId");
    currentUserIdRef.current = null;
    loadingUserIdRef.current = null;

    // Reseta todo o estado (as flags já foram zeradas acima)
    resetAllState();
    setIsLoadingData(false);
    setIsAuthenticated(false);
    setHasLocalSession(false);

    logoutLog.info('✅ Logout completo — estado limpo');
  };

  const handleDeleteAccount = async () => {
    const deleteLog = createSyncLogger('DeleteAccount');
    deleteLog.info('Iniciando exclusão de conta...');

    // 🔒 Bloqueia sync IMEDIATAMENTE
    isSessionValidatedRef.current = false;
    isRemoteLoadedRef.current = false;
    isHydratedRef.current = false;

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Usuário não autenticado.");
      }

      // Limpa Preferences ANTES do delete remoto
      await clearLocalData(user.id);
      deleteLog.info(`Dados locais do user ${user.id.slice(0, 8)} removidos`);

      // Deleta dados remotos do usuário
      const { error } = await supabase
        .from('finance_all_data')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;
      deleteLog.info('Dados remotos deletados');

      await supabase.auth.signOut();
      deleteLog.info('SignOut concluído');

      // Limpeza completa (mesma sequência do handleLogout)
      localStorage.removeItem("lastUserId");
      currentUserIdRef.current = null;
      loadingUserIdRef.current = null;
      resetAllState();
      setIsLoadingData(false);
      setIsAuthenticated(false);
      setHasLocalSession(false);

      showToast("Conta excluída com sucesso.", "success");
      deleteLog.info('✅ Exclusão completa — estado limpo');
    } catch (error) {
      deleteLog.error('Erro ao excluir conta:', error);
      showToast("Erro ao excluir conta.", "error");
    }
  };


  const updateUserProfile = (updates: Partial<UserProfile>) => {
    if (!isAuthenticated) return;
    setUserProfile(prev => ({ ...prev, ...updates }));
  };

  const changeMonth = useCallback((d: number) => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + d, 1));
    triggerHaptic(ImpactStyle.Light);
  }, [triggerHaptic]);

  const handleLancamentoSubmit = (_: React.FormEvent, form: any) => {
    const card = form.paymentMethod === 'credito' && form.cardId ? creditCards.find(c => c.id === form.cardId) : null;

    // A data da compra é sempre a informada no formulário
    const purchaseDate = form.data;

    // Se for cartão de crédito, calculamos a data efetiva baseada no vencimento escolhido (ou padrão)
    let effectiveDate = purchaseDate;
    let baseStatement = form.customStatementDate;

    if (card && form.paymentMethod === 'credito') {
      if (!baseStatement) {
        // Se não veio uma data de fatura customizada, calculamos a padrão
        baseStatement = calculateStatementDate(purchaseDate, card);
      }

      // A data efetiva (para descontar do caixa) será o dia de vencimento do cartão
      // no MÊS da fatura escolhida/calculada.
      const [statementYear, statementMonth] = baseStatement.split('-').map(Number);
      const dueDay = card.dueDay;

      // CUIDADO: Se o dia de vencimento (dueDay) for *menor* que o dia de fechamento (closingDay),
      // significa que o mês da fatura fecha num mês, e vence no *próximo*.
      // Ex: Fatura Mês 02 (Fevereiro). Fecha dia 25/02. Vence 05/03.
      // O `calculateStatementDate` do helpers.ts já se baseia no vencimento!
      // Portanto, a "fatura de Março (2024-03)" engloba as compras até 25/02 e vence 05/03.
      // Então `baseStatement` já é "2024-03". Logo, o vencimento é `dueDay` do próprio `baseStatement`.

      // Monta a data eXata de vencimento baseada no statementMonth
      effectiveDate = formatDateToInput(new Date(statementYear, statementMonth - 1, dueDay));
    }
    const baseValue = form.isInstallment ? form.valor / (parseInt(form.installmentCount, 10) || 1) : form.valor;

    const baseTx = {
      descricao: (form.descricao || '').trim() || 'Sem Descrição',
      valor: baseValue,
      tipo: form.tipo,
      categoria: form.categoria,
      paymentMethod: form.paymentMethod || 'debito',
      isRecurring: form.isRecurring,
      cardId: form.cardId,
      accountId: form.accountId,
      destinationAccountId: form.destinationAccountId,
      ...(form.goalId && { goalId: form.goalId })
    };

    const byMonth: { [key: string]: Transaction[] } = {};

    // --- ATUALIZAÇÃO DE SALDO DE CONTA (MANUAL) REMOVIDA ---
    // A partir de agora, o AccountManager e os Widgets consultam 'calculateAccountBalance' 
    // com base apenas no 'allTransactions', o que elimina a possibilidade de saldos fantasmas.

    if (form.isRecurring || form.isInstallment) {
      const qty = parseInt(form.isRecurring ? form.recurrenceQuantity : form.installmentCount, 10) || 1;
      const recId = `${form.isRecurring ? 'rec' : 'inst'}-${generateId()}`;

      for (let i = 0; i < qty; i++) {
        const txPurchaseStr = form.isInstallment ? purchaseDate : addMonthsSafely(purchaseDate, i);
        const txEffectiveStr = addMonthsSafely(effectiveDate, i);

        const storageMonthKey = getMonthKey(new Date(txEffectiveStr + 'T00:00:00'));

        let statementDate: string | undefined = undefined;
        if (card) {
          statementDate = storageMonthKey;
        }

        if (!byMonth[storageMonthKey]) byMonth[storageMonthKey] = [];
        byMonth[storageMonthKey].push({
          ...baseTx,
          id: `${generateId()}-${i}`,
          data: txEffectiveStr, // Data real onde debita
          compraData: card ? txPurchaseStr : undefined,
          recurrenceId: recId,
          descricao: (form.isInstallment && qty > 1) ? `${baseTx.descricao} (${i + 1}/${qty})` : baseTx.descricao,
          installment: form.isInstallment ? { current: i + 1, total: qty } : undefined,
          isRecurring: !!form.isRecurring,
          statementDate
        } as Transaction);
      }
    } else {
      let statementDate: string | undefined = card ? getMonthKey(new Date(effectiveDate + 'T00:00:00')) : undefined;
      const txId = generateId();
      const storageMonthKey = getMonthKey(new Date(effectiveDate + 'T00:00:00'));

      const tx: Transaction = {
        ...baseTx,
        id: txId,
        data: effectiveDate, // Data real onde debita
        compraData: card ? purchaseDate : undefined,
        isRecurring: false,
        statementDate
      };
      // For single transactions, we append to the same byMonth structure to be uniformly processed
      if (!byMonth[storageMonthKey]) byMonth[storageMonthKey] = [];
      byMonth[storageMonthKey].push(tx);
    }

    setAllData((prev: AllData) => {
      const next = { ...prev };
      let first: string | null = null;
      Object.keys(byMonth).forEach(k => {
        if (!first || k < first) first = k;
        const existing = prev[k]?.transactions || [];
        next[k] = { saldoFinal: prev[k]?.saldoFinal || 0, transactions: [...existing, ...byMonth[k]].sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime()) };
      });
      return first ? recalculateBalancesFrom(first, next) : next;
    });

    triggerHaptic(ImpactStyle.Medium);
    showToast('Lançamento adicionado!', 'success');
  };

  // --- Handlers para Categorias ---
  const handleAddCategory = (type: TransactionType, name: string, bucket?: 'necessidades' | 'desejos' | 'futuro', group?: 'Gastos Fixos' | 'Gastos Variáveis' | 'Reserva Financeira', icon?: string) => {
    setCategorias(prev => ({
      ...prev,
      [type]: [...prev[type], { id: name.toLowerCase().replace(/\s+/g, '-'), name, bucket, group, icon }]
    }));
    showToast("Categoria adicionada!", "success");
  };

  const handleEditCategory = (type: TransactionType, oldName: string, newName: string, bucket?: 'necessidades' | 'desejos' | 'futuro', group?: 'Gastos Fixos' | 'Gastos Variáveis' | 'Reserva Financeira', icon?: string) => {
    setCategorias(prev => ({
      ...prev,
      [type]: prev[type].map(c => c.name === oldName ? { ...c, name: newName, bucket, group, icon } : c)
    }));
    // Atualizar transações que usam esta categoria
    setAllData(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(key => {
        if (next[key]?.transactions) {
          next[key]!.transactions = next[key]!.transactions.map(tx =>
            tx.categoria === oldName ? { ...tx, categoria: newName } : tx
          );
        }
      });
      return next;
    });
    // Atualizar cores
    if (categoryColors[oldName]) {
      const color = categoryColors[oldName];
      setCategoryColors(prev => {
        const next = { ...prev };
        delete next[oldName];
        next[newName] = color;
        return next;
      });
    }
    showToast("Categoria atualizada!", "success");
  };

  const handleDeleteCategory = (type: TransactionType, name: string) => {
    setCategorias(prev => ({
      ...prev,
      [type]: prev[type].filter(c => c.name !== name)
    }));
    showToast("Categoria removida.", "info");
  };

  const handleUpdateCategoryColor = (category: string, color: string) => {
    setCategoryColors(prev => ({ ...prev, [category]: color }));
  };

  const handleSetBudget = (category: string, amount: number) => {
    setBudgets(prev => ({ ...prev, [category]: amount }));
    showToast("Orçamento definido!", "success");
  };

  const handleAddGoal = (name: string, targetAmount: number, targetDate?: string) => {
    const newGoal: SavingsGoal = {
      id: generateId(),
      name,
      targetAmount,
      createdAt: new Date().toISOString(),
      targetDate
    };
    setSavingsGoals(prev => [...prev, newGoal]);
    showToast("Meta criada com sucesso!", "success");
  };

  const handleEditGoal = (id: string, name: string, targetAmount: number, targetDate?: string) => {
    setSavingsGoals(prev => prev.map(g => g.id === id ? { ...g, name, targetAmount, targetDate } : g));
    showToast("Meta atualizada!", "success");
  };

  const handleDeleteGoal = (id: string) => {
    setSavingsGoals(prev => prev.filter(g => g.id !== id));
    showToast("Meta excluída.", "info");
  };

  const handleAddFundsToGoal = (goalId: string, amount: number, date: string) => {
    const goal = savingsGoals.find(g => g.id === goalId);
    if (!goal) return;

    // Garantir que a categoria existe
    const categoryName = 'Investimentos';
    const categoryExists = categorias.saida.some(c => c.name === categoryName);
    if (!categoryExists) {
      handleAddCategory('saida', categoryName, 'futuro', 'Reserva Financeira');
    }

    const tx: Transaction = {
      id: generateId(),
      data: date,
      descricao: `Aporte: ${goal.name}`,
      valor: amount,
      tipo: 'saida', // É uma saída do saldo disponível para a meta
      categoria: categoryName,
      paymentMethod: 'debito',
      goalId: goalId
    };

    setAllData((prev: AllData) => {
      const monthKey = getMonthKey(new Date(date + 'T00:00:00'));
      const existingTransactions = prev[monthKey]?.transactions || [];
      const next = { ...prev };
      next[monthKey] = {
        saldoFinal: prev[monthKey]?.saldoFinal || 0, // Recalculado abaixo
        transactions: [...existingTransactions, tx].sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())
      };
      return recalculateBalancesFrom(monthKey, next);
    });

    showToast(`${formatCurrency(amount)} adicionado à meta!`, "success");
  };

  const handleAddCreditCard = (card: Omit<CreditCard, 'id'>) => {
    const newCard = { ...card, id: generateId() };
    setCreditCards(prev => [...prev, newCard]);
    showToast("Cartão adicionado!", "success");
  };

  const handleEditCreditCard = (id: string, card: Omit<CreditCard, 'id'>) => {
    setCreditCards(prev => prev.map(c => c.id === id ? { ...c, ...card } : c));
    showToast("Cartão atualizado!", "success");
  };

  const handleDeleteCreditCard = (id: string) => {
    setCreditCards(prev => prev.filter(c => c.id !== id));
    showToast("Cartão removido.", "info");
  };

  const handleUpdateLayout = (newLayout: DashboardLayout) => {
    setDashboardLayout(newLayout);
  };

  const handleResetData = async (options: ResetOptions) => {
    if (options.transactions) setAllData({});
    if (options.categories) {
      setCategorias(INITIAL_CATEGORIAS);
      setCategoryColors(INITIAL_CATEGORIA_CORES);
    }
    if (options.goals) setSavingsGoals([]);
    if (options.cards) setCreditCards([]);
    if (options.budgets) setBudgets({});
    if (options.importHistory) setImportHistory([]);
    if (options.layout) {
      setDashboardLayout(INITIAL_DASHBOARD_LAYOUT);
    }
    // Campos que estavam faltando no reset
    if ((options as any).assets) setAssets([]);
    if ((options as any).accounts) setAccounts([]);
    if ((options as any).patrimonio) setPatrimonioHistory([]);
    if ((options as any).subscriptions) setSubscriptions([]);

    showToast("Dados resetados com sucesso.", "success");
  };

  const handleGenerateMockData = () => {
    const mocks = generateMockTransactions();
    setAllData((prevAllData: AllData) => {
      let updated = { ...prevAllData };
      mocks.forEach((tx) => {
        const key = tx.data.substring(0, 7);
        const monthData = updated[key] || { transactions: [], saldoFinal: 0 };
        updated[key] = {
          ...monthData,
          transactions: [tx, ...monthData.transactions],
        };
      });
      const firstKey = mocks.map(t => t.data.substring(0, 7)).sort()[0];
      return recalculateBalancesFrom(firstKey, updated);
    });
    showToast("18 transações de teste geradas com sucesso!", "success");
  };

  // Funcao de update atualizada para aceitar escopo (single ou future)
  const handleUpdateTransaction = (e: React.FormEvent, editForm: EditFormState, scope: 'single' | 'future' = 'single') => {
    e.preventDefault();
    if (!editingTxId) return;

    const newTxBaseProps: Partial<Transaction> = {
      descricao: editForm.descricao,
      valor: parseCurrency(editForm.valor),
      categoria: editForm.categoria,
      paymentMethod: editForm.paymentMethod,
      cardId: editForm.cardId,
      accountId: editForm.accountId,
    };

    setAllData((prev: AllData) => {
      const next = { ...prev };
      let oldestModifiedMonth: string | null = null;

      // Se for update em massa para o futuro
      if (scope === 'future') {
        const originalTx = allTransactions.find(t => t.id === editingTxId);
        if (originalTx && originalTx.recurrenceId) {
          const pivotDate = new Date(originalTx.data + 'T00:00:00');
          const recId = originalTx.recurrenceId;

          // Se a data foi alterada no formulário, precisamos calcular o novo dia
          // para replicar nos meses seguintes
          const newFormDateObj = new Date(editForm.data + 'T00:00:00');
          const newDayOfMonth = newFormDateObj.getDate();

          Object.keys(next).forEach(monthKey => {
            if (next[monthKey]?.transactions) {
              let modified = false;
              next[monthKey]!.transactions = next[monthKey]!.transactions.map(t => {
                // Atualiza se for da mesma recorrência e data >= data original
                // OU se for exatamente a transação sendo editada (mesmo que a data tenha mudado)
                if (t.recurrenceId === recId) {
                  const tDate = new Date(t.data + 'T00:00:00');
                  if (tDate.getTime() >= pivotDate.getTime()) {
                    // Se a transação for a que estamos editando ou futura
                    modified = true;

                    // Calcula a nova data mantendo o mês/ano original da transação, mas com o novo dia
                    // exceto para a transação atual que usa a data exata do form
                    let updatedDateStr = t.data;
                    if (t.id === editingTxId) {
                      updatedDateStr = editForm.data;
                    } else {
                      const futureDate = new Date(tDate.getFullYear(), tDate.getMonth(), newDayOfMonth);
                      updatedDateStr = formatDateToInput(futureDate);
                    }

                    return { ...t, ...newTxBaseProps, data: updatedDateStr };
                  }
                }
                return t;
              });
              if (modified) {
                if (!oldestModifiedMonth || monthKey < oldestModifiedMonth) oldestModifiedMonth = monthKey;
              }
            }
          });
        }
      }

      // Lógica padrão: remove a transação antiga (a específica selecionada) e insere a nova
      // Isso lida com a mudança de data, que move a transação de mês
      let oldDateKey: string | null = null;
      Object.keys(next).forEach(key => {
        if (next[key]?.transactions.some(t => t.id === editingTxId)) {
          oldDateKey = key;
          next[key]!.transactions = next[key]!.transactions.filter(t => t.id !== editingTxId);
        }
      });

      // Recria a transação editada com os novos dados (incluindo data nova)
      // Preserva recurrenceId e isRecurring da original
      const originalTx = allTransactions.find(t => t.id === editingTxId);
      if (originalTx) {

        let effectiveDate = editForm.data || originalTx.data;
        const card = editForm.paymentMethod === 'credito' && editForm.cardId ? creditCards.find(c => c.id === editForm.cardId) : null;
        let baseStatement = editForm.statementDate;
        let finalStatementDate: string | undefined = undefined;

        if (card && editForm.paymentMethod === 'credito') {
          if (!baseStatement) {
            baseStatement = calculateStatementDate(effectiveDate, card);
          }
          finalStatementDate = baseStatement;

          const [statementYear, statementMonth] = baseStatement.split('-').map(Number);
          const dueDay = card.dueDay;
          effectiveDate = formatDateToInput(new Date(statementYear, statementMonth - 1, dueDay));
        }

        const newTx: Transaction = {
          ...originalTx,
          ...newTxBaseProps,
          data: effectiveDate, // Data de caixa calculada 
          compraData: card ? (editForm.data || originalTx.data) : undefined, // Data real apenas se crédito
          statementDate: finalStatementDate
        };

        const newMonthKey = getMonthKey(new Date(newTx.data + 'T00:00:00'));
        if (!next[newMonthKey]) next[newMonthKey] = { transactions: [], saldoFinal: 0 };

        next[newMonthKey]!.transactions.push(newTx);
        next[newMonthKey]!.transactions.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

        // Determina a partir de onde recalcular saldos
        const txDateKey = oldDateKey && oldDateKey < newMonthKey ? oldDateKey : newMonthKey;
        if (!oldestModifiedMonth || txDateKey < oldestModifiedMonth) {
          oldestModifiedMonth = txDateKey;
        }
      }

      return oldestModifiedMonth ? recalculateBalancesFrom(oldestModifiedMonth, next) : next;
    });

    setIsEditModalOpen(false);
    setEditingTxId(null);
    showToast(scope === 'future' ? "Série atualizada com sucesso." : "Transação atualizada.", "success");
  };

  const handleConfirmDelete = () => {
    if (!confirmingDeleteId) return;
    setAllData((prev: AllData) => {
      let updated = { ...prev };
      let affectedKey: string | null = null;
      Object.keys(updated).forEach(key => {
        if (updated[key]?.transactions.some(t => t.id === confirmingDeleteId)) {
          affectedKey = key;
          updated[key]!.transactions = updated[key]!.transactions.filter(t => t.id !== confirmingDeleteId);
        }
      });
      return affectedKey ? recalculateBalancesFrom(affectedKey, updated) : updated;
    });
    setConfirmingDeleteId(null);
    showToast("Transação excluída.", "success");
  };

  // Implementação da exclusão de recorrentes futuras
  const handleStartDeleteFuture = (tx: Transaction) => {
    setConfirmingDeleteFutureTx(tx);
  };

  const handleConfirmDeleteFuture = () => {
    if (!confirmingDeleteFutureTx || !confirmingDeleteFutureTx.recurrenceId) {
      setConfirmingDeleteFutureTx(null);
      return;
    }

    const startDeleteDate = new Date(confirmingDeleteFutureTx.data + 'T00:00:00');
    const recId = confirmingDeleteFutureTx.recurrenceId;

    setAllData((prev: AllData) => {
      const updated = { ...prev };
      let earliestModifiedMonth: string | null = null;

      Object.keys(updated).forEach(monthKey => {
        const monthData = updated[monthKey];
        if (!monthData) return;

        const initialLength = monthData.transactions.length;

        monthData.transactions = monthData.transactions.filter(t => {
          if (t.recurrenceId !== recId) return true; // Mantém se não for da série

          // Se for da série, verifica a data
          const tDate = new Date(t.data + 'T00:00:00');
          // Remove se for igual ou posterior à data selecionada
          return tDate.getTime() < startDeleteDate.getTime();
        });

        if (monthData.transactions.length !== initialLength) {
          if (!earliestModifiedMonth || monthKey < earliestModifiedMonth) {
            earliestModifiedMonth = monthKey;
          }
        }
      });

      return earliestModifiedMonth ? recalculateBalancesFrom(earliestModifiedMonth, updated) : updated;
    });

    setConfirmingDeleteFutureTx(null);
    showToast("Série de lançamentos atualizada.", "success");
    triggerHaptic(ImpactStyle.Medium);
  };

  // --- Handlers memoizados para estabilidade do Context ---
  const memoizedHandleStartEdit = useCallback((tx: Transaction) => {
    setEditingTxId(tx.id);
    setIsEditModalOpen(true);
  }, []);

  const memoizedHandleDeleteTx = useCallback((tx: Transaction) => {
    setConfirmingDeleteId(tx.id);
  }, []);

  const handleDeleteRecurringSeries = useCallback((tx: Transaction) => {
    const recId = tx.recurrenceId;
    const cleanDesc = tx.descricao.replace(/\s*\(\d+\/\d+\)\s*$/, '').trim().toLowerCase();

    setAllData((prev: AllData) => {
      const updated = { ...prev };
      let affectedKey: string | null = null;

      Object.keys(updated).forEach(monthKey => {
        const monthData = updated[monthKey];
        if (!monthData) return;

        const initialCount = monthData.transactions.length;
        monthData.transactions = monthData.transactions.filter(t => {
          if (recId && t.recurrenceId === recId) return false;
          if (t.id === tx.id) return false;
          const tClean = t.descricao.replace(/\s*\(\d+\/\d+\)\s*$/, '').trim().toLowerCase();
          if (tClean === cleanDesc && (t.isRecurring || t.recurrenceId)) return false;
          return true;
        });

        if (monthData.transactions.length !== initialCount && !affectedKey) {
          affectedKey = monthKey;
        }
      });

      return affectedKey ? recalculateBalancesFrom(affectedKey, updated) : updated;
    });
    showToast("Assinatura e todas as suas recorrências foram removidas.", "info");
  }, [recalculateBalancesFrom, showToast]);

  const getSaldoColor = useCallback((s: number, t: string) => {
    if (s <= 0) return '#ef4444'; // Crítico
    if (s <= 1000) return '#f97316'; // Moderado
    if (s <= 5000) return t === 'light' ? '#16a34a' : '#92d050'; // Saudável
    return t === 'light' ? '#059669' : '#10b981'; // Excelente
  }, []);



  // --- Efeito: Processar cobranças automáticas de Assinaturas ---
  useEffect(() => {
    if (isLoadingData || !subscriptions || subscriptions.length === 0) return;

    const todayStr = new Date().toISOString().slice(0, 10);
    let updated = false;

    const updatedSubscriptions = subscriptions.map(sub => {
      if (sub.nextBillingDate && sub.nextBillingDate <= todayStr) {
        const txDate = sub.nextBillingDate;
        const monthKey = getMonthKey(new Date(txDate + 'T00:00:00'));

        setAllData(prevAllData => {
          const monthObj = prevAllData[monthKey] || { transactions: [], saldoFinal: 0 };
          const exists = (monthObj.transactions || []).some(t =>
            t.descricao.toLowerCase().includes(sub.name.toLowerCase()) && t.data === txDate
          );
          if (!exists) {
            const newTx: Transaction = {
              id: `sub-${sub.id}-${txDate}`,
              data: txDate,
              descricao: sub.name,
              valor: sub.cost,
              tipo: 'saida',
              categoria: 'Assinatura',
              paymentMethod: 'debito',
              isRecurring: true
            };
            const updatedTxs = [...(monthObj.transactions || []), newTx];
            const updatedAllData = {
              ...prevAllData,
              [monthKey]: {
                transactions: updatedTxs,
                saldoFinal: prevAllData[monthKey]?.saldoFinal || 0
              }
            };
            return recalculateBalancesFrom(monthKey, updatedAllData);
          }
          return prevAllData;
        });

        // Avançar próxima data de cobrança
        const [yStr, mStr, dStr] = sub.nextBillingDate.split('-');
        const nextDate = new Date(parseInt(yStr, 10), parseInt(mStr, 10) - 1, parseInt(dStr, 10));
        if (sub.billingCycle === 'yearly') {
          nextDate.setFullYear(nextDate.getFullYear() + 1);
        } else {
          nextDate.setMonth(nextDate.getMonth() + 1);
        }
        const nextDateFormatted = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`;
        updated = true;
        return { ...sub, nextBillingDate: nextDateFormatted };
      }
      return sub;
    });

    if (updated) {
      setSubscriptions(updatedSubscriptions);
    }
  }, [subscriptions, isLoadingData]);

  const handleAddSubscription = useCallback((sub: Omit<Subscription, 'id'>) => {
    const newSubId = generateId();
    const todayStr = new Date().toISOString().slice(0, 10);
    const billingDate = sub.nextBillingDate || todayStr;
    const newSub = { ...sub, id: newSubId, nextBillingDate: billingDate };

    setSubscriptions(prev => [...prev, newSub]);

    // Gera lançamento de recorrência para a assinatura
    const mockEvent = { preventDefault: () => {} } as React.FormEvent;
    handleLancamentoSubmit(mockEvent, {
      descricao: sub.name,
      valor: sub.cost,
      tipo: 'saida',
      categoria: 'Assinatura',
      data: billingDate,
      paymentMethod: 'debito',
      isRecurring: true,
      recurrenceQuantity: sub.billingCycle === 'yearly' ? 1 : 12
    });

    showToast("Assinatura adicionada e cobrança agendada!", "success");
  }, [handleLancamentoSubmit, showToast]);

  const handleEditSubscription = useCallback((id: string, sub: Partial<Subscription>) => {
    setSubscriptions(prev => prev.map(s => s.id === id ? { ...s, ...sub } : s));
    showToast("Assinatura atualizada!", "success");
  }, []);

  const handleDeleteSubscription = useCallback((id: string) => {
    setSubscriptions(prev => prev.filter(s => s.id !== id));
    showToast("Assinatura excluída.", "info");
  }, []);

  const memoizedIncrementAiScans = useCallback(() => {
    setUserProfile(prev => ({ ...prev, aiScansCount: (prev.aiScansCount || 0) + 1 }));
  }, []);

  const incrementCfoInteractions = useCallback(() => {
    setUserProfile(prev => ({ ...prev, cfoInteractionsCount: (prev.cfoInteractionsCount || 0) + 1 }));
  }, []);

  const dismissTip = useCallback((tipId: string) => {
    setUserProfile(prev => {
      const dismissedTips = prev.dismissedTips || [];
      if (dismissedTips.includes(tipId)) return prev;
      return {
        ...prev,
        dismissedTips: [...dismissedTips, tipId]
      };
    });
  }, []);

  const noopClearDirection = useCallback(() => { }, []);
  const noopImportStatement = useCallback(async () => { }, []);
  const noopPayInvoice = useCallback(() => { }, []);

  const contextValue = useMemo(() => ({
    locale, setLocale,
    isAuthenticated, isInitializingSession, currentDate, theme, allData, categorias,
    categoryColors, currentTab, editingTxId, isEditModalOpen, confirmingDeleteId,
    transactions, allTransactions, budgets, savingsGoals, despesasPorCategoria,
    confirmingDeleteFutureTx, dashboardLayout,
    isNewTransactionOpen, setIsNewTransactionOpen,
    isTransactionMenuOpen, setIsTransactionMenuOpen,
    newTransactionInitialType, setNewTransactionInitialType,
    newTransactionInitialData, setNewTransactionInitialData,
    handleLoginSuccess, handleLogout, handleDeleteAccount, setCurrentDate,
    changeMonth, toggleTheme, setCurrentTab,
    handleLancamentoSubmit,
    handleStartEdit: memoizedHandleStartEdit,
    handleUpdateTransaction,
    setIsEditModalOpen, setEditingTxId,
    handleDeleteTransaction: memoizedHandleDeleteTx,
    handleDeleteRecurringSeries,
    handleConfirmDelete,
    setConfirmingDeleteId,
    handleAddCategory, handleEditCategory, handleDeleteCategory, handleUpdateCategoryColor,
    showToast, getSaldoColor,
    handleSetBudget,
    handleStartDeleteFuture, handleConfirmDeleteFuture, setConfirmingDeleteFutureTx,
    handleAddGoal, handleEditGoal, handleDeleteGoal, handleAddFundsToGoal,
    handleUpdateLayout,
    monthChangeDirection: null as any,
    clearMonthChangeDirection: noopClearDirection,
    currentView, setCurrentView, previousView: previousViewRef.current, goBackView,
    handleImportStatement: noopImportStatement,
    userProfile: effectiveUserProfile, updateUserProfile, importHistory, setImportHistory,
    handleResetData,
    handleGenerateMockData,
    creditCards, menuSubView, setMenuSubView,
    handleAddCreditCard, handleEditCreditCard, handleDeleteCreditCard,
    handlePayInvoice: noopPayInvoice,
    incrementAiScans: memoizedIncrementAiScans,
    incrementCfoInteractions: incrementCfoInteractions,
    triggerHaptic,
    registerBackHandler,
    unregisterBackHandler,
    isLoadingData,
    isOnline,
    assets,
    patrimonioHistory,
    accounts,
    handleAddAsset,
    handleUpdateAsset,
    handleDeleteAsset,
    handleCreateBankAccount,
    handleUpdateBankAccount,
    handleDeleteBankAccount,
    subscriptions,
    handleAddSubscription,
    handleEditSubscription,
    handleDeleteSubscription,
    showTutorial: showTutorialState,
    setShowTutorial: setShowTutorialState,
    managementFilter, setManagementFilter,
    dismissTip
  }), [
    isAuthenticated, isInitializingSession, currentDate, theme, allData, categorias,
    categoryColors, currentTab, editingTxId, isEditModalOpen, confirmingDeleteId,
    transactions, allTransactions, budgets, savingsGoals, despesasPorCategoria,
    confirmingDeleteFutureTx, dashboardLayout, isNewTransactionOpen, isTransactionMenuOpen,
    newTransactionInitialType, newTransactionInitialData, handleLoginSuccess, handleLogout, handleDeleteAccount,
    changeMonth, toggleTheme, handleLancamentoSubmit, memoizedHandleStartEdit,
    handleUpdateTransaction, handleConfirmDelete, handleAddCategory, handleEditCategory,
    handleDeleteCategory, handleUpdateCategoryColor, showToast, getSaldoColor,
    handleSetBudget, handleStartDeleteFuture, handleConfirmDeleteFuture,
    handleAddGoal, handleEditGoal, handleDeleteGoal, handleAddFundsToGoal,
    handleUpdateLayout, currentView, goBackView, effectiveUserProfile, updateUserProfile, importHistory, setImportHistory,
    handleResetData, creditCards, menuSubView, handleAddCreditCard, handleEditCreditCard,
    handleDeleteCreditCard, memoizedIncrementAiScans, incrementCfoInteractions, triggerHaptic, isLoadingData,
    isOnline, assets, patrimonioHistory, accounts, handleAddAsset, handleUpdateAsset,
    handleDeleteAsset, handleCreateBankAccount, handleUpdateBankAccount,
    handleDeleteBankAccount, subscriptions, handleAddSubscription, handleEditSubscription,
    handleDeleteSubscription, showTutorialState, managementFilter, registerBackHandler, unregisterBackHandler, dismissTip, locale, setLocale
  ]);

  return (
    <AppContext.Provider value={contextValue as any}>
      {children}
      <Suspense fallback={null}>
        <UpdatePromptModal
          isOpen={isUpdateModalOpen}
          onClose={() => setIsUpdateModalOpen(false)}
          updateInfo={updateInfo}
        />
      </Suspense>
      <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-[100] pointer-events-none flex flex-col items-center gap-3 w-full max-sm px-4">
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto">
            <Toast toast={t} onDismiss={() => setToasts(prev => prev.filter(x => x.id !== t.id))} />
          </div>
        ))}
      </div>
    </AppContext.Provider>
  );
};

const AppContent: React.FC = () => {
  const context = useContext(AppContext);

  if (!context) return null;

  const { isAuthenticated, isInitializingSession, currentView, currentTab, isNewTransactionOpen, isLoadingData, isOnline, isTransactionMenuOpen, setIsTransactionMenuOpen, setNewTransactionInitialType, setNewTransactionInitialData, setIsNewTransactionOpen: setGlobalNewTxOpen, showTutorial, setShowTutorial, userProfile, updateUserProfile, setCurrentView, setCurrentTab, handleLancamentoSubmit, showToast, categorias } = context;

  // Fila de transações bancárias pendentes (captura automática Android)
  const [pendingBankList, setPendingBankList] = useState<PendingBankTransaction[]>([]);
  const [isPendingBankModalOpen, setIsPendingBankModalOpen] = useState(false);

  // Biometric lock — cold start + app resume (volta do background)
  const [isLocked, setIsLocked] = useState<boolean | null>(null); // null = ainda não checou
  const biometricEnabledRef = React.useRef(false);

  // Atalhos do Android (Deep Links e Notificações Bancárias)
  useEffect(() => {
    if (!isAuthenticated || isLoadingData) return;

    const handleDeepLink = (url: string) => {
      if (!url) return;
      try {
        const parsedUrl = new URL(url);
        const path = parsedUrl.hostname || parsedUrl.pathname.replace(/^\/+/, '');
        
        if (path === 'novo-lancamento') {
          const valorParam = parsedUrl.searchParams.get('valor');
          const descParam = parsedUrl.searchParams.get('desc');
          const tipoParam = parsedUrl.searchParams.get('tipo') as 'entrada' | 'saida' | 'transferencia' | null;
          const pagParam = parsedUrl.searchParams.get('pagamento') as 'debito' | 'credito' | null;

          if (valorParam || descParam) {
            setNewTransactionInitialData?.({
              valor: valorParam ? parseFloat(valorParam) : undefined,
              descricao: descParam ? decodeURIComponent(descParam) : undefined,
              tipo: tipoParam || 'saida',
              paymentMethod: pagParam || 'debito',
            });
            setNewTransactionInitialType(pagParam === 'credito' ? 'credito' : (tipoParam || 'saida'));
            setGlobalNewTxOpen(true);
            setIsTransactionMenuOpen(false);
          } else {
            setCurrentView('main');
            setCurrentTab('lancamento');
            setIsTransactionMenuOpen(true);
          }
        } else if (path === 'metas') {
          setCurrentView('main');
          setCurrentTab('metas');
          setIsTransactionMenuOpen(false);
        } else if (path === 'futuro') {
          setCurrentView('main');
          setCurrentTab('horizonte');
          setIsTransactionMenuOpen(false);
        } else if (path === 'cfo') {
          setCurrentView('chat');
          setIsTransactionMenuOpen(false);
        }
      } catch (e) {
        if (url.includes('novo-lancamento')) {
          setCurrentView('main');
          setCurrentTab('lancamento');
          setIsTransactionMenuOpen(true);
        } else if (url.includes('metas')) {
          setCurrentView('main');
          setCurrentTab('metas');
          setIsTransactionMenuOpen(false);
        } else if (url.includes('futuro')) {
          setCurrentView('main');
          setCurrentTab('horizonte');
          setIsTransactionMenuOpen(false);
        } else if (url.includes('cfo')) {
          setCurrentView('chat');
          setIsTransactionMenuOpen(false);
        }
      }
    };

    // 1. Escuta eventos quando o app está aberto/segundo plano
    const listener = CapApp.addListener('appUrlOpen', (event: any) => {
      handleDeepLink(event.url);
    });

    // 2. Trata cold start (app fechado e aberto pelo link)
    CapApp.getLaunchUrl().then((launchUrl) => {
      if (launchUrl && launchUrl.url) {
        handleDeepLink(launchUrl.url);
      }
    });

    return () => {
      listener.then(l => l.remove());
    };
  }, [isAuthenticated, isLoadingData, setCurrentView, setCurrentTab, setIsTransactionMenuOpen, setNewTransactionInitialData, setNewTransactionInitialType, setGlobalNewTxOpen]);

  // Checa preferência no cold start (com timeout de segurança)
  useEffect(() => {
    if (!isAuthenticated || isLoadingData) return;
    let resolved = false;
    
    // Timeout de segurança: se a checagem biométrica não resolver em 10s, desbloqueia
    const timeout = setTimeout(() => {
      if (!resolved) {
        console.warn('[Biometric] Timeout na checagem de preferência — desbloqueando');
        resolved = true;
        biometricEnabledRef.current = false;
        setIsLocked(false);
      }
    }, 10000);
    
    (async () => {
      try {
        const { getBiometricPreference } = await import('./utils/biometric');
        const enabled = await getBiometricPreference();
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          biometricEnabledRef.current = enabled;
          setIsLocked(enabled);
        }
      } catch {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          setIsLocked(false);
        }
      }
    })();
    
    return () => clearTimeout(timeout);
  }, [isAuthenticated, isLoadingData]);

  // Re-lock quando o app volta do background, re-agendar lembretes e checar notificações bancárias pendentes
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkPendingBankTransactions = async () => {
      if (!BankNotificationService.isSupported()) return;
      try {
        const pending = await BankNotificationService.getPendingTransactions();
        if (pending && pending.length > 0) {
          if (pending.length === 1) {
            const latest = pending[0];
            setNewTransactionInitialData?.({
              valor: latest.valor,
              descricao: latest.descricao,
              tipo: latest.tipo,
              paymentMethod: latest.paymentMethod,
            });
            setNewTransactionInitialType(latest.paymentMethod === 'credito' ? 'credito' : latest.tipo);
            setGlobalNewTxOpen(true);
            setIsTransactionMenuOpen(false);
            await BankNotificationService.clearPendingTransactions();
          } else {
            setPendingBankList(pending);
            setIsPendingBankModalOpen(true);
          }
        }
      } catch (e) {
        console.warn('Erro ao verificar transações bancárias pendentes:', e);
      }
    };

    // Checagem inicial
    checkPendingBankTransactions();

    const listener = CapApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        if (biometricEnabledRef.current) setIsLocked(true);
        if (userProfile?.notificationsEnabled) NotificationService.scheduleInactivityReminders();
        checkPendingBankTransactions();
      }
    });
    return () => { listener.then(l => l.remove()); };
  }, [isAuthenticated, userProfile?.notificationsEnabled, setNewTransactionInitialData, setNewTransactionInitialType, setGlobalNewTxOpen, setIsTransactionMenuOpen]);

  const handleConfirmSingleBankTx = async (tx: PendingBankTransaction) => {
    setNewTransactionInitialData?.({
      valor: tx.valor,
      descricao: tx.descricao,
      tipo: tx.tipo,
      paymentMethod: tx.paymentMethod,
    });
    setNewTransactionInitialType(tx.paymentMethod === 'credito' ? 'credito' : tx.tipo);
    setGlobalNewTxOpen(true);
    setIsTransactionMenuOpen(false);
    
    const nextList = pendingBankList.filter(item => item.id !== tx.id);
    setPendingBankList(nextList);
    if (nextList.length === 0) {
      setIsPendingBankModalOpen(false);
      await BankNotificationService.clearPendingTransactions();
    }
  };

  const handleConfirmAllBankTx = async (transactions: PendingBankTransaction[]) => {
    for (const tx of transactions) {
      handleLancamentoSubmit({ preventDefault: () => {} } as any, {
        valor: tx.valor,
        descricao: tx.descricao,
        tipo: tx.tipo,
        paymentMethod: tx.paymentMethod,
        data: formatDateToInput(new Date(tx.timestamp || Date.now())),
        categoria: tx.tipo === 'entrada' ? (categorias.entrada[0]?.name || 'Outros') : (categorias.saida[0]?.name || 'Outros')
      });
    }
    showToast(`${transactions.length} transações registradas com sucesso!`, 'success');
    setPendingBankList([]);
    setIsPendingBankModalOpen(false);
    await BankNotificationService.clearPendingTransactions();
  };

  const handleDiscardSingleBankTx = async (id: string) => {
    const nextList = pendingBankList.filter(item => item.id !== id);
    setPendingBankList(nextList);
    if (nextList.length === 0) {
      setIsPendingBankModalOpen(false);
      await BankNotificationService.clearPendingTransactions();
    }
  };

  const handleDiscardAllBankTx = async () => {
    setPendingBankList([]);
    setIsPendingBankModalOpen(false);
    await BankNotificationService.clearPendingTransactions();
    showToast('Fila de transações descartada', 'info');
  };

  // Agendar no cold start se estiver ativado
  useEffect(() => {
    if (isAuthenticated && !isLoadingData && userProfile?.notificationsEnabled) {
      NotificationService.scheduleInactivityReminders();
    }
  }, [isAuthenticated, isLoadingData, userProfile?.notificationsEnabled]);

  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);

  useEffect(() => {
    // Só mostra o prompt de notificação DEPOIS do tutorial interativo ter sido concluído
    const tutorialDone = localStorage.getItem('tutorial_completed');
    if (isAuthenticated && !isLoadingData && isLocked === false && userProfile && !showTutorial && userProfile.hasSeenTutorial) {
        if (!userProfile.hasAnsweredNotificationPrompt && tutorialDone) {
            // Pequeno delay para não aparecer abruptamente após o tutorial fechar
            const timer = setTimeout(() => setShowNotificationPrompt(true), 800);
            return () => clearTimeout(timer);
        }
    }
  }, [isAuthenticated, isLoadingData, isLocked, userProfile?.hasAnsweredNotificationPrompt, userProfile?.hasSeenTutorial, showTutorial]);

  const handleNotificationPromptAccept = () => {
      updateUserProfile({ notificationsEnabled: true, hasAnsweredNotificationPrompt: true });
      setShowNotificationPrompt(false);
  };

  const handleNotificationPromptDecline = () => {
      updateUserProfile({ hasAnsweredNotificationPrompt: true });
      setShowNotificationPrompt(false);
  };

  if (isInitializingSession || isLoadingData) return <SkeletonLoader />;
  if (!isAuthenticated) return <LoginScreen />;
  if (isLocked === null) return <SkeletonLoader />;
  if (isLocked) return <LockScreen onUnlock={() => { biometricEnabledRef.current = false; setIsLocked(false); }} />;
  let content;

  if (isNewTransactionOpen) {
    content = (
      <Suspense fallback={<SkeletonLoader />}>
        <NewTransactionScreen />
      </Suspense>
    );
  } else {
    switch (currentView) {
      case 'menu':
        content = <MenuScreen />;
        break;
      case 'horizonte':
        content = (
          <Suspense fallback={<SkeletonLoader />}>
            <HorizonteSaldos />
          </Suspense>
        );
        break;
      case 'anual':
        content = (
          <Suspense fallback={<SkeletonLoader />}>
            <RelatorioAnual />
          </Suspense>
        );
        break;
      case 'chat':
        content = (
          <Suspense fallback={<SkeletonLoader />}>
            <AIChat />
          </Suspense>
        );
        break;
      case 'premium':
        content = (
          <Suspense fallback={<SkeletonLoader />}>
            <PremiumScreen />
          </Suspense>
        );
        break;
      case 'calculadora':
        content = (
          <Suspense fallback={<SkeletonLoader />}>
            <GoalCalculator />
          </Suspense>
        );
        break;
      case 'openfinance':
        content = (
          <Suspense fallback={<SkeletonLoader />}>
            <AccountManager />
          </Suspense>
        );
        break;
      case 'investimentos':
        content = (
          <Suspense fallback={<SkeletonLoader />}>
            <InvestmentModule />
          </Suspense>
        );
        break;
      case 'automacao':
        content = (
          <Suspense fallback={<SkeletonLoader />}>
            <NotificationAutomation />
          </Suspense>
        );
        break;

      default:
        content = (
          <div className="h-full flex flex-col relative bg-slate-100 dark:bg-dark-bg fade-in pt-6 pb-2 px-1">
            <main className="flex-1 overflow-hidden pb-[calc(72px+env(safe-area-inset-bottom))] rounded-xl">
              <Suspense fallback={<SkeletonLoader />}>
                <div className="h-full pt-0 pl-0 pr-0">
                  {currentTab === 'lancamento' && <Lancamento />}
                  {currentTab === 'transacoes' && <Management />}
                  {currentTab === 'metas' && <SavingsGoals />}
                  {currentTab === 'financas' && <Dashboard />}
                  {currentTab === 'categorias' && <Categories />}
                  {currentTab === 'horizonte' && <HorizonteSaldos />}
                </div>
              </Suspense>
            </main>
            <BottomNav />
          </div>
        );
    }
  }

  return (
    <>
      {!isOnline && (
        <div className="bg-yellow-500 text-black text-xs text-center py-1 font-bold">
          Você está offline. Seus dados serão sincronizados automaticamente.
        </div>
      )}
      {content}

      {pendingBankList.length > 0 && !isPendingBankModalOpen && (
        <div 
          onClick={() => setIsPendingBankModalOpen(true)}
          className="fixed top-12 left-4 right-4 z-[90] p-3 rounded-2xl bg-amber-500 text-white font-bold shadow-xl flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all"
        >
          <div className="flex items-center gap-2">
            <span className="text-base">🔔</span>
            <span className="text-xs">{pendingBankList.length} compras bancárias detectadas</span>
          </div>
          <span className="text-[11px] uppercase tracking-wider bg-white/20 px-2.5 py-1 rounded-xl font-black">Revisar ›</span>
        </div>
      )}

      <PendingTransactionsModal
        isOpen={isPendingBankModalOpen}
        pendingTransactions={pendingBankList}
        onClose={() => setIsPendingBankModalOpen(false)}
        onConfirmAll={handleConfirmAllBankTx}
        onConfirmSingle={handleConfirmSingleBankTx}
        onDiscardSingle={handleDiscardSingleBankTx}
        onDiscardAll={handleDiscardAllBankTx}
      />
      
      {showNotificationPrompt && (
        <Suspense fallback={null}>
            <NotificationPromptModal 
                isOpen={showNotificationPrompt} 
                onClose={() => setShowNotificationPrompt(false)} 
                onAccept={handleNotificationPromptAccept} 
                onDecline={handleNotificationPromptDecline} 
            />
        </Suspense>
      )}

      <TransactionTypeMenu 
        isOpen={isTransactionMenuOpen} 
        onClose={() => setIsTransactionMenuOpen(false)}
        onSelectType={(type: 'entrada' | 'saida' | 'credito' | 'transferencia') => {
          setNewTransactionInitialType(type);
          setGlobalNewTxOpen(true);
        }}
      />
      <OnboardingTutorial 
        isOpen={showTutorial} 
        onClose={() => setShowTutorial(false)} 
      />
      <Tutorial />
    </>
  );
};

const App: React.FC = () => (
  <AppErrorBoundary>
    <I18nProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </I18nProvider>
  </AppErrorBoundary>
);

export default App;