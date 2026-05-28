
import React, {
  useState,
  useMemo,
  useEffect,
  ReactNode,
  useCallback,
  useContext,
  Suspense,
  ErrorInfo,
} from 'react';
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
  CreditCard,
  ResetOptions,
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
  calculateCreditCardDueDate
} from './utils/helpers';
import { fetchAllDataFromSupabase, saveAllDataToSupabase } from './utils/supabaseSync';
import { NotificationService } from './utils/notificationService';
import { supabase } from './utils/supabaseClient'; // Importação do cliente
import confetti from 'canvas-confetti';

import { StatusBar, Animation } from '@capacitor/status-bar';
import { App as CapApp } from '@capacitor/app';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

import BottomNav from './components/BottomNav';
import LoginScreen from './components/LoginScreen';
import SkeletonLoader from './components/SkeletonLoader';
import MenuScreen from './components/MenuScreen';
import Modal from './components/Modal';
import ListPickerModal from './components/ListPickerModal';
import { AppContext, Tab, Theme, MenuSubView } from './context/AppContext';

// Removed getUserKey as localStorage is no longer used

interface AppErrorBoundaryProps { children?: ReactNode; }
interface AppErrorBoundaryState { hasError: boolean; }

class AppErrorBoundary extends React.Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(_: Error): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false });
    window.location.reload();
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full w-full bg-[#111827] flex flex-col items-center justify-center p-4 text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Ops! Algo falhou.</h1>
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
    <div className={`fixed bottom-28 left-1/2 -translate-x-1/2 z-[100] px-5 py-3 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-100 dark:border-slate-700 transition-all duration-200 ${isExiting ? 'opacity-0 scale-95 translate-y-2' : 'opacity-100 scale-100 translate-y-0'}`}>
      <div className="flex-shrink-0">{iconMap[toast.type] || iconMap.info}</div>
      <p className="text-sm font-bold text-gray-900 dark:text-white whitespace-nowrap">{toast.message}</p>
    </div>
  );
};

const Dashboard = React.lazy(() => import('./components/Dashboard'));
const Management = React.lazy(() => import('./components/Management'));
const Categories = React.lazy(() => import('./components/Categories'));
const SavingsGoals = React.lazy(() => import('./components/SavingsGoals'));
const CreditCardManager = React.lazy(() => import('./components/CreditCardManager'));
const Lancamento = React.lazy(() => import('./components/Lancamento'));
const HorizonteSaldos = React.lazy(() => import('./components/HorizonteSaldos'));
const RelatorioAnual = React.lazy(() => import('./components/RelatorioAnual'));
const AIChat = React.lazy(() => import('./components/AIChat'));
const PremiumScreen = React.lazy(() => import('./components/PremiumScreen'));
const GoalCalculator = React.lazy(() => import('./components/GoalCalculator'));

const AppProvider: React.FC<{ children?: ReactNode }> = ({ children }) => {
  // Constantes de Estado Inicial (para reuso no reset)
  const INITIAL_USER_PROFILE: UserProfile = { 
    name: 'Usuário', email: '', badges: [], hapticsEnabled: true, notificationsEnabled: false, isPremium: false, currentStreak: 0, aiScansCount: 0 
  };
  
  const INITIAL_DASHBOARD_LAYOUT: DashboardLayout = {
    order: ['resumo', 'invoices', 'insights', 'resumoDiario', 'metas', 'metodosPagamentoChart', 'orcamento', 'tendencias', 'despesasCategoria', 'receitasCategoria', 'despesasRecorrentes'],
    visibility: { resumo: true, invoices: true, insights: true, resumoDiario: true, metas: true, metodosPagamentoChart: true, orcamento: true, tendencias: true, despesasCategoria: true, receitasCategoria: true, despesasRecorrentes: true },
  };

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  
  // Estado padrão
  const [theme, setTheme] = useState<Theme>('dark');
  const [currentTab, setCurrentTab] = useState<Tab>('lancamento');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [currentView, setCurrentView] = useState<View>('main');
  const [menuSubView, setMenuSubView] = useState<MenuSubView>('profile');

  // Estados de Dados
  const [userProfile, setUserProfile] = useState<UserProfile>(INITIAL_USER_PROFILE);
  const [allData, setAllData] = useState<AllData>({});
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [importHistory, setImportHistory] = useState<ImportHistoryItem[]>([]);
  const [categorias, setCategorias] = useState<Categorias>(INITIAL_CATEGORIAS);
  const [categoryColors, setCategoryColors] = useState<CategoryColors>(INITIAL_CATEGORIA_CORES);
  const [budgets, setBudgets] = useState<Budgets>({});
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [dashboardLayout, setDashboardLayout] = useState<DashboardLayout>(INITIAL_DASHBOARD_LAYOUT);

  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [confirmingDeleteFutureTx, setConfirmingDeleteFutureTx] = useState<Transaction | null>(null);
  const [isNewTransactionOpen, setIsNewTransactionOpen] = useState(false);

  // --- HELPER: ID Único Robusto ---
  // Combina timestamp com string aleatória para evitar duplicidade em loops rápidos
  const generateId = () => {
    return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
  };

  // --- HAPTICS HELPER ---
  const triggerHaptic = useCallback(async (style: ImpactStyle = ImpactStyle.Light) => {
    if (userProfile.hapticsEnabled !== false) { // Default true
      try {
        await Haptics.impact({ style });
      } catch (error) {
        // Ignora erro em ambientes onde haptics não é suportado
      }
    }
  }, [userProfile.hapticsEnabled]);

  // --- FUNÇÃO PARA LIMPAR TUDO (Logout/Troca de Conta) ---
  const resetAllState = useCallback(() => {
      // Dados do Usuário
      setUserProfile(INITIAL_USER_PROFILE);
      setAllData({});
      setCreditCards([]);
      setImportHistory([]);
      setCategorias(INITIAL_CATEGORIAS);
      setCategoryColors(INITIAL_CATEGORIA_CORES);
      setBudgets({});
      setSavingsGoals([]);
      setDashboardLayout(INITIAL_DASHBOARD_LAYOUT);
      
      // UI / Preferências
      setTheme('dark'); // Reseta tema para evitar inconsistência
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
  }, []);
  
// LOGIN
 useEffect(() => {
  const initSession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error("Erro ao recuperar sessão:", error);
        return;
      }

      if (session?.user) {
        setIsAuthenticated(true);
        localStorage.setItem("wasAuthenticated", "true");
      } else {
        const wasAuthenticated = localStorage.getItem("wasAuthenticated");

        if (!navigator.onLine && wasAuthenticated === "true") {
          console.log("Offline - mantendo sessão local.");
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
          resetAllState();
          localStorage.removeItem("wasAuthenticated");
        }
      }
    } catch (err) {
      console.error("Falha inesperada:", err);
    }
  };

  initSession();

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
      setIsAuthenticated(true);
      localStorage.setItem("wasAuthenticated", "true");
    } else {
      if (navigator.onLine) {
        setIsAuthenticated(false);
        resetAllState();
        localStorage.removeItem("wasAuthenticated");
      }
    }
  });

  return () => subscription.unsubscribe();
}, [resetAllState]);


  // --- CARREGAR DADOS DO SUPABASE AO LOGAR ---
  useEffect(() => {
    if (isAuthenticated) {
        setIsLoadingData(true);
        fetchAllDataFromSupabase().then(data => {
            if (data) {
                // Se existirem dados remotos, popula o estado
                if (data.allData) {
                    const sanitized: AllData = {};
                    for (const key in data.allData) {
                        sanitized[key] = {
                            transactions: sanitizeTransactions(data.allData[key]?.transactions || []),
                            saldoFinal: Number(data.allData[key]?.saldoFinal) || 0,
                        };
                    }
                    setAllData(sanitized);
                }
                if (data.categories) setCategorias(data.categories);
                if (data.categoryColors) setCategoryColors(data.categoryColors);
                if (data.creditCards) setCreditCards(data.creditCards);
                if (data.budgets) setBudgets(data.budgets);
                if (data.savingsGoals) setSavingsGoals(data.savingsGoals);
                if (data.dashboardLayout) setDashboardLayout(data.dashboardLayout);
                if (data.userProfile) setUserProfile({ ...data.userProfile,});
                if (data.importHistory) setImportHistory(data.importHistory);
                if (data.theme) setTheme(data.theme);
            } else {
                // Se for primeiro login, inicializa com email e defaults
               setUserProfile(prev => ({ ...prev }));
            }
            setIsLoadingData(false);
        });
    }
  }, [isAuthenticated]);

  // --- PERSISTÊNCIA DE DADOS CENTRALIZADA (DEBOUNCED) ---
  useEffect(() => {
    if (!isAuthenticated || isLoadingData) return;
    
    const timer = setTimeout(() => {
       saveAllDataToSupabase({
  allData,            // ← FALTAVA ISSO
  categories: categorias,
  categoryColors,
  creditCards,
  budgets,
  savingsGoals,
  dashboardLayout,
  userProfile,
  importHistory,
  theme
});

    }, 2000); // Salva 2 segundos após a última alteração para evitar spam na API

    return () => clearTimeout(timer);
  }, [allData, categorias, categoryColors, creditCards, budgets, savingsGoals, dashboardLayout, userProfile, importHistory, theme, isAuthenticated, isLoadingData]);


  // --- LÓGICA DO BOTÃO VOLTAR (GLOBAL) ---
  useEffect(() => {
    let backListener: any;

    const setupBackHandler = async () => {
      backListener = await CapApp.addListener('backButton', () => {
        // Prioridade 1: Fechar Modais e Telas de Cadastro abertas
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
      if (backListener) backListener.remove();
    };
  }, [currentView, currentTab, isNewTransactionOpen, isEditModalOpen, editingTxId, confirmingDeleteId, confirmingDeleteFutureTx, menuSubView]);

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

  // --- SISTEMA DE CONQUISTAS (BADGES) ---
  useEffect(() => {
if (!isAuthenticated || isLoadingData) return;

    const currentBadges = new Set(userProfile.badges || []);
    let newBadges: string[] = [];

    // Lógica das Conquistas
    if (!currentBadges.has('iniciante') && allTransactions.length > 0) {
      newBadges.push('iniciante');
    }
    if (!currentBadges.has('metas_1') && savingsGoals.length > 0) {
      newBadges.push('metas_1');
    }
    if (!currentBadges.has('planejador') && Object.keys(budgets).length > 0) {
        newBadges.push('planejador');
    }
    
    // Conquistas de Metas
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

    if (newBadges.length > 0) {
      const updatedProfile = { ...userProfile, badges: [...Array.from(currentBadges), ...newBadges] };
      setUserProfile(updatedProfile);
      
      // Notificar usuário e Confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        zIndex: 2000
      });

      // Mapear IDs para Nomes
      const badgeNames = newBadges
        .map(id => AVAILABLE_BADGES.find(b => b.id === id)?.name)
        .filter(Boolean)
        .join(', ');

      showToast(`Conquista desbloqueada: ${badgeNames}!`, "success");
    }
  }, [allTransactions, savingsGoals, budgets, userProfile.aiScansCount, isAuthenticated, isLoadingData]);


  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
    StatusBar.hide().catch(() => {});
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const handleLoginSuccess = async () => {
  setIsAuthenticated(true);
  showToast("Bem-vindo de volta!", "success");
  setCurrentView('main');
};

  const handleLogout = async () => { 
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    resetAllState(); // Garante limpeza total no logout manual
  };

 const handleDeleteAccount = async () => {
  try {
    const { error } = await supabase
      .from('finance_all_data')
      .delete(); // 🔥 sem email

    if (error) throw error;

    await supabase.auth.signOut();
    setIsAuthenticated(false);
    resetAllState();

    showToast("Conta excluída com sucesso.", "success");
  } catch (error) {
    console.error(error);
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
  
  const recalculateBalancesFrom = (startKey: string, data: AllData): AllData => {
    const updated: AllData = { ...data };
    const sorted = Object.keys(updated).sort();
    const idx = sorted.indexOf(startKey);
    if (idx === -1) return updated;
    let lastSaldo = getPreviousBalance(startKey, updated);
    for (let i = idx; i < sorted.length; i++) {
      const key = sorted[i];
      const dt = new Date(key + '-01T00:00:00');
      const days = new Date(dt.getFullYear(), dt.getMonth() + 1, 0).getDate();
      const monthData = updated[key] as any;
      if (monthData) {
        const saldo = calcularSaldoFinal(monthData.transactions, lastSaldo, days);
        updated[key] = { ...monthData, saldoFinal: saldo };
        lastSaldo = saldo;
      }
    }
    return updated;
  };

  const handleLancamentoSubmit = (_: React.FormEvent, form: any) => {
    const card = form.paymentMethod === 'credito' && form.cardId ? creditCards.find(c => c.id === form.cardId) : null;
    
    // Se for cartão de crédito, calculamos a data efetiva baseada no vencimento
    let effectiveDate = form.data;
    if (card && form.paymentMethod === 'credito') {
        effectiveDate = calculateCreditCardDueDate(form.data, card);
    }

    const baseTx = { 
        descricao: form.descricao.trim() || 'Sem Descrição', 
        valor: form.valor, 
        tipo: form.tipo, 
        categoria: form.categoria, 
        paymentMethod: form.paymentMethod || 'debito', 
        isRecurring: form.isRecurring, 
        cardId: form.cardId, 
        ...(form.goalId && { goalId: form.goalId }) 
    };
    
    const byMonth: { [key: string]: Transaction[] } = {};
    // A data base para recorrência passa a ser a data efetiva (vencimento se for crédito)
    const start = new Date(effectiveDate + 'T00:00:00');

    if (form.isRecurring || form.isInstallment) {
      const qty = parseInt(form.isRecurring ? form.recurrenceQuantity : form.installmentCount, 10) || 1;
      const recId = `${form.isRecurring ? 'rec' : 'inst'}-${generateId()}`;
      for (let i = 0; i < qty; i++) {
        let d = new Date(start); d.setMonth(start.getMonth() + i); 
        const txDateStr = formatDateToInput(d);
        const storageMonthKey = getMonthKey(d);
        
        let statementDate: string | undefined = undefined;
        if (card) {
            // Para parcelas subsequentes, recalcula a chave do mês da fatura
            // Nota: Se a primeira parcela já foi jogada para o vencimento, as próximas seguem o fluxo mensal
            // Ex: Compra 20/01 -> Vence 05/02.
            // 1ª Parc: 05/02
            // 2ª Parc: 05/03
            // A função getMonthKey(d) já pega "2024-02", "2024-03" etc.
            statementDate = storageMonthKey;
        }

        if (!byMonth[storageMonthKey]) byMonth[storageMonthKey] = [];
        byMonth[storageMonthKey].push({ ...baseTx, id: `${generateId()}-${i}`, data: txDateStr, recurrenceId: recId, descricao: qty > 1 ? `${baseTx.descricao} (${i + 1}/${qty})` : baseTx.descricao, installment: form.isInstallment ? { current: i + 1, total: qty } : undefined, statementDate } as Transaction);
      }
    } else {
      let statementDate: string | undefined = card ? getMonthKey(start) : undefined;
      const tx: Transaction = { ...baseTx, id: generateId(), data: effectiveDate, isRecurring: false, paymentMethod: form.paymentMethod || 'debito', statementDate };
      byMonth[getMonthKey(start)] = [tx];
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
    
    // Se for entrada em meta, adicionar aos fundos da meta automaticamente
    if (form.goalId) {
        // Se for crédito, o dinheiro só sai na data efetiva (vencimento), mas para metas,
        // o registro visual é importante. Mantemos a data efetiva calculada.
        handleAddFundsToGoal(form.goalId, form.valor, effectiveDate);
    }
    
    triggerHaptic(ImpactStyle.Medium);
    showToast('Lançamento adicionado!', 'success');
  };

  // --- Handlers para Categorias ---
  const handleAddCategory = (type: TransactionType, name: string) => {
    setCategorias(prev => ({
        ...prev,
        [type]: [...prev[type], { id: name.toLowerCase().replace(/\s+/g, '-'), name }]
    }));
    showToast("Categoria adicionada!", "success");
  };

  const handleEditCategory = (type: TransactionType, oldName: string, newName: string) => {
    setCategorias(prev => ({
        ...prev,
        [type]: prev[type].map(c => c.name === oldName ? { ...c, name: newName } : c)
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

  const handleAddGoal = (name: string, targetAmount: number) => {
    const newGoal: SavingsGoal = {
        id: generateId(),
        name,
        targetAmount,
        createdAt: new Date().toISOString()
    };
    setSavingsGoals(prev => [...prev, newGoal]);
    showToast("Meta criada com sucesso!", "success");
  };

  const handleEditGoal = (id: string, name: string, targetAmount: number) => {
    setSavingsGoals(prev => prev.map(g => g.id === id ? { ...g, name, targetAmount } : g));
    showToast("Meta atualizada!", "success");
  };

  const handleDeleteGoal = (id: string) => {
    setSavingsGoals(prev => prev.filter(g => g.id !== id));
    showToast("Meta excluída.", "info");
  };

  const handleAddFundsToGoal = (goalId: string, amount: number, date: string) => {
    const goal = savingsGoals.find(g => g.id === goalId);
    if (!goal) return;

    const tx: Transaction = {
        id: generateId(),
        data: date,
        descricao: `Aporte: ${goal.name}`,
        valor: amount,
        tipo: 'saida', // É uma saída do saldo disponível para a meta
        categoria: 'Metas de Poupança',
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
    
    showToast(`R$ ${formatCurrency(amount)} adicionado à meta!`, "success");
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
      
      showToast("Dados resetados com sucesso.", "success");
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
                        const newTx: Transaction = {
                            ...originalTx,
                            ...newTxBaseProps,
                            data: editForm.data || originalTx.data, // Usa a nova data do form
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
  
  const contextValue = {
    isAuthenticated, currentDate, theme, allData, categorias, categoryColors, currentTab, editingTxId, isEditModalOpen, confirmingDeleteId, transactions, allTransactions, budgets, savingsGoals, despesasPorCategoria, confirmingDeleteFutureTx, dashboardLayout, isNewTransactionOpen, setIsNewTransactionOpen: (o: boolean) => setIsNewTransactionOpen(o), handleLoginSuccess, handleLogout, handleDeleteAccount, setCurrentDate, changeMonth, toggleTheme, setCurrentTab: (t: Tab) => setCurrentTab(t), 
    handleLancamentoSubmit, 
    handleStartEdit: (tx: any) => { setEditingTxId(tx.id); setIsEditModalOpen(true); }, 
    handleUpdateTransaction, 
    setIsEditModalOpen, setEditingTxId, handleDeleteTransaction: (tx: any) => setConfirmingDeleteId(tx.id), 
    handleConfirmDelete, 
    setConfirmingDeleteId, 
    handleAddCategory, handleEditCategory, handleDeleteCategory, handleUpdateCategoryColor, 
    showToast, getSaldoColor: (s: any, t: any) => s > 500 ? (t === 'light' ? '#16a34a' : '#92d050') : s < 1 ? '#ef4444' : '#f97316', 
    handleSetBudget, 
    handleStartDeleteFuture, handleConfirmDeleteFuture, setConfirmingDeleteFutureTx, 
    handleAddGoal, handleEditGoal, handleDeleteGoal, handleAddFundsToGoal, 
    handleUpdateLayout, 
    monthChangeDirection: null, clearMonthChangeDirection: () => {}, currentView, setCurrentView: (v: View) => setCurrentView(v), handleImportStatement: () => {}, userProfile, updateUserProfile, importHistory, 
    handleResetData, 
    creditCards, menuSubView, setMenuSubView,
    handleAddCreditCard, handleEditCreditCard, handleDeleteCreditCard, handlePayInvoice: () => {}, incrementAiScans: () => {},
    triggerHaptic
  };

  return (
    <AppContext.Provider value={contextValue as any}>
      <AppErrorBoundary>
        <AppContent isLoading={isLoadingData} />
      </AppErrorBoundary>
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

const AppContent: React.FC<{ isLoading: boolean }> = ({ isLoading }) => {
  const context = useContext(AppContext);
  if (!context) return null;

  const { isAuthenticated, currentView, currentTab, isNewTransactionOpen } = context;
  
  if (isLoading) return <SkeletonLoader />;
  if (!isAuthenticated) return <LoginScreen />;
  if (isNewTransactionOpen) return <Suspense fallback={<SkeletonLoader />}><CreditCardManager /></Suspense>;

  let content;
  switch (currentView) {
    case 'menu': content = <MenuScreen />; break;
    case 'horizonte': content = <Suspense fallback={<SkeletonLoader />}><HorizonteSaldos /></Suspense>; break;
    case 'anual': content = <Suspense fallback={<SkeletonLoader />}><RelatorioAnual /></Suspense>; break;
    case 'chat': content = <Suspense fallback={<SkeletonLoader />}><AIChat /></Suspense>; break;
    case 'premium': content = <Suspense fallback={<SkeletonLoader />}><PremiumScreen /></Suspense>; break;
    case 'calculadora': content = <Suspense fallback={<SkeletonLoader />}><GoalCalculator /></Suspense>; break;
    default:
      content = (
        <div className="h-full flex flex-col relative bg-white dark:bg-[#111827] fade-in">
          <main className="flex-1 overflow-hidden pb-[calc(72px+env(safe-area-inset-bottom))]">
            <Suspense fallback={<SkeletonLoader />}>
              <div className="h-full pt-0 pl-0 pr-0">
                {currentTab === 'lancamento' && <Lancamento />}
                {currentTab === 'transacoes' && <Management />}
                {currentTab === 'metas' && <SavingsGoals />}
                {currentTab === 'financas' && <Dashboard />}
                {currentTab === 'categorias' && <Categories />}
              </div>
            </Suspense>
          </main>
          <BottomNav />
        </div>
      );
  }
  return content;
};

const App: React.FC = () => <AppErrorBoundary><AppProvider><AppContent isLoading={false} /></AppProvider></AppErrorBoundary>;
export default App;
