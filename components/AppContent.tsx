import React, { useState, useEffect, useContext, Suspense, useRef } from 'react';
import OnboardingTutorial from './OnboardingTutorial';
import { formatDateToInput } from '../utils/helpers';
import { NotificationService } from '../utils/notificationService';
import { App as CapApp } from '@capacitor/app';
import { BankNotificationService, PendingBankTransaction } from '../services/bankNotificationService';
import { PendingTransactionsModal } from './PendingTransactionsModal';
import { BottomNav } from './BottomNav';
import LoginScreen from './LoginScreen';
import LockScreen from './LockScreen';
import SkeletonLoader from './SkeletonLoader';
import MenuScreen from './MenuScreen';
import { Tutorial } from './Tutorial';
import TransactionTypeMenu from './TransactionTypeMenu';
import { AppContext } from '../context/AppContext';

// Telas carregadas sob demanda
const Dashboard = React.lazy(() => import('./Dashboard').then(m => ({ default: m.Dashboard })));
const Management = React.lazy(() => import('./Management').then(m => ({ default: m.Management })));
const Categories = React.lazy(() => import('./Categories'));
const SavingsGoals = React.lazy(() => import('./SavingsGoals').then(m => ({ default: m.SavingsGoals })));
const Lancamento = React.lazy(() => import('./Lancamento'));
const HorizonteSaldos = React.lazy(() => import('./HorizonteSaldos'));
const RelatorioAnual = React.lazy(() => import('./RelatorioAnual'));
const AIChat = React.lazy(() => import('./AIChat'));
const PremiumScreen = React.lazy(() => import('./PremiumScreen'));
const GoalCalculator = React.lazy(() => import('./GoalCalculator'));
const AccountManager = React.lazy(() => import('./AccountManager'));
const InvestmentModule = React.lazy(() => import('./InvestmentModule'));
const NotificationAutomation = React.lazy(() => import('./NotificationAutomation'));
const NewTransactionScreen = React.lazy(() => import('./NewTransactionScreen'));
const NotificationPromptModal = React.lazy(() => import('./NotificationPromptModal'));

/** Interface do app: login, bloqueio, abas, menus e telas. Os dados vêm do AppProvider (App.tsx). */
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
        const { getBiometricPreference } = await import('../utils/biometric');
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

export default AppContent;
