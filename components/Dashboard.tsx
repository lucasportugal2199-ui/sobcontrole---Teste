
import React, { useMemo, useContext, useEffect, useState, useRef, Suspense } from 'react';
import { getMonthKey, formatarMesAno, getPreviousBalance, calculateDailyBalancesForMonth } from '../utils/helpers';
import { Transaction } from '../types';
import { ArrowLeftIcon, ArrowRightIcon, PlusIcon, ChartBarIcon, CreditCardIcon, InformationCircleIcon } from './icons';
import { AppContext } from '../context/AppContext';
import MonthYearPickerModal from './MonthYearPickerModal';
import { ContextualTip } from './ContextualTip';
import { SummaryWidget, AIInsightsWidget, QuickStatsWidget, BudgetWidget, PaymentMethodWidget, CreditCardInvoicesWidget, AccountBalancesWidget, Distribution502030Widget, PatrimonioWidget } from './dashboard/DashboardCards';
import { InstallmentsWidget } from './dashboard/InstallmentsWidget';
import SubscriptionsSettings from './settings/SubscriptionsSettings';
import { getInstallmentList } from '../utils/installmentsHelper';
import { useTranslation } from '../i18n';
import { FinancialHealthScore, MonthlyComparison, SmartAlerts, DailyCashFlow, FixedVsVariable, TopCategoriesRanking, EndOfMonthForecast, SpendingPace, SavingsRateHistory } from './dashboard/templates/NewWidgets';

const TrendsWidget = React.lazy(() => import('./dashboard/DashboardCharts').then(module => ({ default: module.TrendsWidget })));
const CategoryPieWidget = React.lazy(() => import('./dashboard/DashboardCharts').then(module => ({ default: module.CategoryPieWidget })));
const SavingsRateWidget = React.lazy(() => import('./dashboard/DashboardCharts').then(module => ({ default: module.SavingsRateWidget })));

const ChartSkeleton = () => (
    <div className="w-full h-full min-h-[200px] flex items-center justify-center bg-light-bg dark:bg-dark-card/30 rounded-lg">
        <div className="h-40 w-40 rounded-full bg-slate-200 dark:bg-slate-600/50"></div>
    </div>
);

// --- 1. Novo Componente Empty State Visual ---
const EmptyGraphState = ({ message, onAction }: { message: string, onAction: () => void }) => {
    const { t } = useTranslation();
    return (
        <div className="flex flex-col items-center justify-center py-8 px-4 text-center h-full min-h-[200px] animate-in fade-in duration-500">
            <div className="bg-light-bg-secondary dark:bg-white/[0.04] p-4 rounded-full mb-3">
                <ChartBarIcon className="h-8 w-8 text-slate-400 dark:text-dark-text-muted" />
            </div>
            <p className="text-sm font-medium text-light-text-muted dark:text-dark-text-muted mb-5 max-w-[220px] leading-relaxed">{message}</p>
            <button
                onClick={onAction}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#EA580C] hover:bg-[#F97316] text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-[#EA580C]/20"
            >
                <PlusIcon className="h-4 w-4" />
                {t('dashboard.launchNow')}
            </button>
        </div>
    );
};

// ...
// e no avatar fallback e streak:

const Dashboard: React.FC = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error("Dashboard must be used within an AppProvider");
    const { currentDate, changeMonth, setCurrentDate, allData, categoryColors, categorias, theme, dashboardLayout, handleUpdateLayout, savingsGoals, allTransactions, budgets, setCurrentView, creditCards, accounts, setIsTransactionMenuOpen, userProfile, handleAddCreditCard, handleLancamentoSubmit, setShowTutorial, assets } = context;
    const { t, monthNames, locale } = useTranslation();

    // Mocks já injetados em sessão anterior

    useEffect(() => {
        const idealOrder = [
            'resumo',
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
            'metodosPagamentoChart',
            'insights'
        ];
        
        // Filtra chaves do layout atual que não pertencem ao idealOrder (remove obsoletos)
        const currentValidOrder = dashboardLayout.order.filter(k => idealOrder.includes(k));
        
        // Encontra chaves que faltam no layout atual
        const missingKeys = idealOrder.filter(k => !currentValidOrder.includes(k));
        
        // Se houver qualquer discrepância (obsoletos a remover ou novos a adicionar)
        if (missingKeys.length > 0 || currentValidOrder.length !== dashboardLayout.order.length) {
            const nextOrder = [...currentValidOrder, ...missingKeys];
            const nextVisibility = { ...dashboardLayout.visibility };
            
            // Garante visibilidade das novas chaves
            missingKeys.forEach(k => {
                nextVisibility[k] = true;
            });
            
            // Limpa chaves obsoletas da visibilidade
            Object.keys(nextVisibility).forEach(k => {
                if (!idealOrder.includes(k)) {
                    delete nextVisibility[k];
                }
            });

            handleUpdateLayout({
                order: nextOrder,
                visibility: nextVisibility
            });
        }
    }, [dashboardLayout.order, dashboardLayout.visibility, handleUpdateLayout]);

    const [isMonthYearPickerOpen, setIsMonthYearPickerOpen] = useState(false);
    const [balanceAnimationKey, setBalanceAnimationKey] = useState(0);
    const [financasSubTab, setFinancasSubTab] = useState<'geral' | 'parcelas'>('geral');
    const [isInfoTooltipOpen, setIsInfoTooltipOpen] = useState(false);
    const mainScrollRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (mainScrollRef.current) {
            mainScrollRef.current.scrollTop = 0;
        }
    }, [financasSubTab]);

    const activeInstallmentsCount = useMemo(() => {
        return getInstallmentList(allTransactions, creditCards).length;
    }, [allTransactions, creditCards]);

    // --- Lógica de Swipe (refs para evitar re-renders nos gráficos) ---
    const touchStartRef = useRef<{ x: number, y: number } | null>(null);
    const touchEndRef = useRef<{ x: number, y: number } | null>(null);
    const minSwipeDistance = 50;

    const onTouchStart = (e: React.TouchEvent) => {
        touchEndRef.current = null;
        touchStartRef.current = { x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY };
    };

    const onTouchMove = (e: React.TouchEvent) => {
        touchEndRef.current = { x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY };
    };

    const onTouchEnd = () => {
        if (financasSubTab !== 'geral') return;
        const start = touchStartRef.current;
        const end = touchEndRef.current;
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

    const filteredData = useMemo(() => {
        const monthKey = getMonthKey(currentDate);
        return (allData[monthKey]?.transactions || []).filter(tx => tx && typeof tx === 'object');
    }, [allData, currentDate]);

    const previousBalance = useMemo(() => {
        const currentMonthKey = getMonthKey(currentDate);
        return getPreviousBalance(currentMonthKey, allData);
    }, [currentDate, allData]);

    const { totalReceitas, totalDespesas, saldoAtual, saldoPrevisto, despesasPorCategoria, receitasPorCategoria, maxExpense, statsMetodoPagamento, savingsRate } = useMemo(() => {
        let receitas = 0; let despesas = 0;
        const despesasMap: Record<string, number> = {};
        const receitasMap: Record<string, number> = {};
        let biggest: Transaction | null = null;

        // Stats para o gráfico de método de pagamento
        let debitoTotal = 0;
        let creditoTotal = 0;

        for (const tx of filteredData) {
            const val = Number(tx.valor) || 0;
            if (tx.tipo === 'entrada') {
                if (tx.paymentMethod === 'credito') {
                    // É um reembolso de cartão: abate das despesas e do creditoTotal
                    despesas -= val;
                    despesasMap[tx.categoria] = (despesasMap[tx.categoria] || 0) - val;
                    creditoTotal -= val;
                } else {
                    receitas += val;
                    receitasMap[tx.categoria] = (receitasMap[tx.categoria] || 0) + val;
                }
            } else {
                despesas += val;
                despesasMap[tx.categoria] = (despesasMap[tx.categoria] || 0) + val;
                if (!biggest || val > Number(biggest.valor)) biggest = tx;

                // Contagem por método de pagamento (apenas despesas)
                if (tx.paymentMethod === 'credito') creditoTotal += val;
                else debitoTotal += val;
            }
        }

        // LÓGICA DE SALDO ACUMULADO (Cross-year e Cross-month)
        const currentMonthKey = getMonthKey(currentDate);
        const previousBalance = getPreviousBalance(currentMonthKey, allData);
        const calculatedSaldoPrevisto = previousBalance + receitas - despesas;

        const today = new Date();
        const isPastMonth = currentDate.getFullYear() < today.getFullYear() || (currentDate.getFullYear() === today.getFullYear() && currentDate.getMonth() < today.getMonth());
        const isCurrentMonth = currentDate.getFullYear() === today.getFullYear() && currentDate.getMonth() === today.getMonth();

        let calculatedSaldoAtual = 0;
        if (isPastMonth) {
            calculatedSaldoAtual = calculatedSaldoPrevisto;
        } else if (isCurrentMonth) {
            const dailyBalances = calculateDailyBalancesForMonth(filteredData, previousBalance, currentDate.getFullYear(), currentDate.getMonth());
            const dayIndex = today.getDate() - 1;
            calculatedSaldoAtual = dailyBalances[dayIndex]?.saldo || previousBalance;
        } else {
            // Future month
            calculatedSaldoAtual = previousBalance;
        }

        const groupCategories = (dataObj: Record<string, number>) => {
            const sorted = Object.entries(dataObj).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
            if (sorted.length <= 5) return sorted;
            const top5 = sorted.slice(0, 5);
            const others = sorted.slice(5).reduce((sum, item) => sum + item.value, 0);
            return [...top5, { name: t('catIcon.box') || 'Outros', value: others }];
        };

        const chartDataMetodoPagamento = [
            { name: t('txType.debit') || 'Débito', value: debitoTotal },
            { name: t('txType.credit') || 'Crédito', value: creditoTotal }
        ];

        return {
            totalReceitas: receitas,
            totalDespesas: despesas,
            saldoAtual: calculatedSaldoAtual,
            saldoPrevisto: calculatedSaldoPrevisto,
            despesasPorCategoria: groupCategories(despesasMap),
            receitasPorCategoria: groupCategories(receitasMap),
            maxExpense: biggest,
            statsMetodoPagamento: chartDataMetodoPagamento,
            savingsRate: receitas > 0 ? ((receitas - despesas) / receitas) * 100 : (despesas > 0 ? -100 : 0)
        };
    }, [filteredData, allData, currentDate]);



    const budgetLimit = useMemo(() => {
        return Object.values(budgets).reduce((sum, val) => sum + (val as number), 0);
    }, [budgets]);

    useEffect(() => { setBalanceAnimationKey(prev => prev + 1); }, [saldoAtual, saldoPrevisto]);

    const trendsData = useMemo(() => {
        const data = [];

        // 1. Determina a data de início da janela do gráfico (5 meses atrás)
        const startWindowDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 5, 1);
        const startWindowKey = getMonthKey(startWindowDate);

        // 2. Busca o saldo acumulado ATÉ o momento imediatamente anterior a essa janela
        let currentRunningBalance = getPreviousBalance(startWindowKey, allData);

        const currentMonthToday = new Date().getMonth();
        const currentYearToday = new Date().getFullYear();

        for (let i = 5; i >= -1; i--) {
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
            const isFutureMonth = (date.getFullYear() > currentYearToday) || (date.getFullYear() === currentYearToday && date.getMonth() > currentMonthToday);
            const isCurrentMonth = date.getFullYear() === currentYearToday && date.getMonth() === currentMonthToday;

            const monthKey = getMonthKey(date);
            const monthData = allData[monthKey];
            const monthTxs = monthData?.transactions || [];

            let rec = 0, desp = 0;
            for (const tx of monthTxs) {
                if (tx.tipo === 'entrada') rec += Number(tx.valor || 0);
                else desp += Number(tx.valor || 0);
            }

            // 3. Aplica o fluxo deste mês ao saldo acumulado (running balance)
            currentRunningBalance += (rec - desp);

            const nameBase = monthNames[date.getMonth()].substring(0, 3);

            data.push({
                name: nameBase,
                Receitas: rec,
                Despesas: desp,
                Saldo: !isFutureMonth ? currentRunningBalance : undefined,
                SaldoPrevisto: (isFutureMonth || isCurrentMonth) ? currentRunningBalance : undefined
            });
        }
        return data;
    }, [allData, currentDate]);

    // --- 3. Lógica Atualizada para Gráficos Vazios ---
    // Se não houver dados, passamos array vazio para o componente filho, 
    // mas o renderCard vai decidir mostrar o EmptyGraphState em vez do gráfico.
    const pieDataDespesas = useMemo(() => despesasPorCategoria, [despesasPorCategoria]);
    const pieDataReceitas = useMemo(() => receitasPorCategoria, [receitasPorCategoria]);

    const renderCard = (cardId: string) => {
        switch (cardId) {
            case 'resumo': return <SummaryWidget saldoAtual={saldoAtual} saldoPrevisto={saldoPrevisto} totalReceitas={totalReceitas} totalDespesas={totalDespesas} balanceAnimationKey={balanceAnimationKey} onViewAnnualReport={() => setCurrentView('anual')} />;
            case 'contas': return <AccountBalancesWidget accounts={accounts} allTransactions={allTransactions} currentDate={currentDate} />;
            case 'patrimonio': return <PatrimonioWidget assets={assets || []} onClick={() => setCurrentView('investimentos')} />;
            case 'distribuicao502030': return <Distribution502030Widget transactions={filteredData} categorias={categorias} />;
            case 'invoices': return <CreditCardInvoicesWidget cards={creditCards} allTransactions={allTransactions} currentDate={currentDate} />;
            case 'installments': return <InstallmentsWidget allTransactions={allTransactions} creditCards={creditCards} currentDate={currentDate} onOpenFullView={() => setFinancasSubTab('parcelas')} />;
            case 'insights': return filteredData.length > 0 ? <AIInsightsWidget filteredData={filteredData} /> : null;
            case 'resumoDiario': return <div className="space-y-6"><QuickStatsWidget currentDate={currentDate} totalDespesas={totalDespesas} maxExpense={maxExpense} /><div className="pt-2 border-t border-light-border dark:border-dark-elevated"><h3 className="text-[10px] font-black uppercase tracking-widest text-light-text-muted dark:text-dark-text-muted mb-3">{t('dashboard.paymentMethodUsage')}</h3><PaymentMethodWidget transactions={filteredData} /></div></div>;
            case 'orcamento': return Object.keys(budgets).length > 0 ? <BudgetWidget budgets={budgets} despesasPorCategoria={despesasPorCategoria} /> : null;

            case 'tendencias':
                // Exibe empty state se não houver NENHUMA transação no app inteiro
                return allTransactions.length > 0
                    ? <Suspense fallback={<ChartSkeleton />}><TrendsWidget data={trendsData} theme={theme} /></Suspense>
                    : <EmptyGraphState message={t('dashboard.emptyGraph')} onAction={() => setIsTransactionMenuOpen(true)} />;
            case 'despesasCategoria':
                return totalDespesas > 0
                    ? <Suspense fallback={<ChartSkeleton />}><CategoryPieWidget data={pieDataDespesas} total={totalDespesas} categoryColors={categoryColors} theme={theme} type="despesas" /></Suspense>
                    : <EmptyGraphState message={t('management.noTransactions')} onAction={() => setIsTransactionMenuOpen(true)} />;
            case 'receitasCategoria':
                return totalReceitas > 0
                    ? <Suspense fallback={<ChartSkeleton />}><CategoryPieWidget data={pieDataReceitas} total={totalReceitas} categoryColors={categoryColors} theme={theme} type="receitas" /></Suspense>
                    : <EmptyGraphState message={t('management.noTransactions')} onAction={() => setIsTransactionMenuOpen(true)} />;
            case 'metodosPagamentoChart':
                return totalDespesas > 0
                    ? <Suspense fallback={<ChartSkeleton />}><CategoryPieWidget data={statsMetodoPagamento} total={totalDespesas} categoryColors={{}} theme={theme} type="recurring" customColors={['#10B981', '#9333EA']} /></Suspense>
                    : <EmptyGraphState message={t('management.noTransactions')} onAction={() => setIsTransactionMenuOpen(true)} />;

            case 'taxaPoupanca':
                return (totalReceitas > 0 || totalDespesas > 0)
                    ? <Suspense fallback={<ChartSkeleton />}><SavingsRateWidget rate={savingsRate} theme={theme} /></Suspense>
                    : <EmptyGraphState message={t('management.noTransactions')} onAction={() => setIsTransactionMenuOpen(true)} />;

            // ========== NOVOS WIDGETS ==========
            case 'monthlyComparison':
                return <MonthlyComparison totalReceitas={totalReceitas} totalDespesas={totalDespesas} saldoPrevisto={saldoPrevisto} allData={allData} currentDate={currentDate} />;
            case 'smartAlerts':
                return null;
            case 'dailyCashFlow':
                return filteredData.length > 0
                    ? <DailyCashFlow filteredData={filteredData} currentDate={currentDate} previousBalance={previousBalance} theme={theme} />
                    : <EmptyGraphState message={t('management.noTransactions')} onAction={() => setIsTransactionMenuOpen(true)} />;
            case 'fixedVsVariable':
                return totalDespesas > 0 ? <FixedVsVariable filteredData={filteredData} /> : null;
            case 'endOfMonthForecast':
                return <EndOfMonthForecast filteredData={filteredData} totalReceitas={totalReceitas} totalDespesas={totalDespesas} currentDate={currentDate} saldoPrevisto={saldoPrevisto} />;
            case 'spendingPace':
                return allTransactions.length > 0
                    ? <SpendingPace filteredData={filteredData} allData={allData} currentDate={currentDate} theme={theme} />
                    : <EmptyGraphState message={t('management.noTransactions')} onAction={() => setIsTransactionMenuOpen(true)} />;
            case 'savingsRateHistory':
                return <SavingsRateHistory allData={allData} currentDate={currentDate} theme={theme} />;
            default: return null;
        }
    };

    const cardTitles: { [key: string]: string } = { 
        contas: t('dashboard.accounts'), 
        patrimonio: 'Patrimônio & Investimentos',
        distribuicao502030: t('dashboard.distribution502030'), 
        resumo: t('dashboard.summary'), 
        invoices: t('dashboard.invoices'), 
        installments: 'Parcelas & Assinaturas',
        insights: 'Assistente IA', 
        resumoDiario: t('dashboard.dailySummary'), 
        orcamento: t('dashboard.budget'), 
        tendencias: t('dashboard.trends'), 
        despesasCategoria: t('dashboard.expensesByCategory'), 
        receitasCategoria: t('dashboard.incomeByCategory'), 
        despesasRecorrentes: t('dashboard.recurringExpenses'), 
        metodosPagamentoChart: t('dashboard.paymentMethods'), 
        taxaPoupanca: t('dashboard.savingsRate'),
        monthlyComparison: 'Comparativo Mensal',
        smartAlerts: 'Alertas Inteligentes',
        dailyCashFlow: 'Fluxo de Caixa Diário',
        fixedVsVariable: 'Fixos vs Variáveis',
        endOfMonthForecast: 'Projeção do Mês',
        spendingPace: 'Ritmo de Gastos',
        savingsRateHistory: 'Histórico de Poupança',
    };

    // Saudação dinâmica baseada no horário
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return t('dashboard.goodMorning') || 'Bom dia';
        if (hour < 18) return t('dashboard.goodAfternoon') || 'Boa tarde';
        return t('dashboard.goodEvening') || 'Boa noite';
    };

    const firstName = (userProfile.name || '').split(' ')[0] || '';

    return (
        <div 
            className="bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text-secondary h-full flex flex-col transition-colors duration-300 relative"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
        >
            {/* Header: Avatar | Seletor de Mês | Foguinho */}
            <header className="px-4 py-4 pt-[calc(1rem+env(safe-area-inset-top))] bg-light-bg dark:bg-dark-bg z-20 flex-shrink-0 sticky top-0">
                {/* Linha única: Avatar + Mês + Streak */}
                <div className="flex items-center justify-between mb-2.5">
                    {/* Avatar */}
                    <div 
                        onClick={() => setCurrentView('menu')} role="button" aria-label={t('a11y.openMenu')}
                        className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0 cursor-pointer active:scale-95 transition-transform overflow-hidden ${
                            userProfile.avatar
                                ? 'shadow-md'
                                : 'bg-gradient-to-br from-[#EA580C] to-[#F97316] text-white shadow-lg shadow-[#EA580C]/20'
                        }`}
                        title="Configurações & Perfil"
                    >
                        {userProfile.avatar ? (
                            <img src={userProfile.avatar} alt="" className="h-full w-full object-cover" />
                        ) : (
                            firstName.charAt(0).toUpperCase() || '?'
                        )}
                    </div>

                    {/* Seletor de Mês centralizado */}
                    <div className="flex items-center gap-1">
                        <button onClick={() => changeMonth(-1)} aria-label={t('a11y.previousMonth')} className="h-9 w-9 flex items-center justify-center rounded-xl text-slate-400 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white active:scale-90 transition-transform">
                            <ArrowLeftIcon className="h-4 w-4" />
                        </button>
                        <button onClick={() => setIsMonthYearPickerOpen(true)} className="flex items-center gap-1.5 px-5 py-1.5 bg-slate-100 dark:bg-white/[0.06] rounded-full text-sm font-bold text-slate-900 dark:text-white border border-[#D7E0EB] dark:border-[#1F1F1F] active:scale-95 transition-transform shadow-sm">
                            {formatarMesAno(currentDate, locale, monthNames)}
                        </button>
                        <button onClick={() => changeMonth(1)} aria-label={t('a11y.nextMonth')} className="h-9 w-9 flex items-center justify-center rounded-xl text-slate-400 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white active:scale-90 transition-transform">
                            <ArrowRightIcon className="h-4 w-4" />
                        </button>
                    </div>

                    {/* Foguinho diário */}
                    <div
                        className={`h-10 w-10 flex items-center justify-center rounded-full text-xs font-black flex-shrink-0 border shadow-sm ${
                            (userProfile.currentStreak || 0) > 0
                                ? 'bg-[#FFEDD5] dark:bg-[#431407] border-[#EA580C]/20 text-[#EA580C] dark:text-[#F97316]'
                                : 'bg-slate-100 dark:bg-white/[0.06] border-[#D7E0EB] dark:border-[#1F1F1F] text-slate-400'
                        }`}
                        title={`${userProfile.currentStreak || 0} dias seguidos!`}
                    >
                        {(userProfile.currentStreak || 0) > 0 ? (
                            <><span>🔥</span><span className="text-[10px]">{userProfile.currentStreak}</span></>
                        ) : (
                            <span>🔥</span>
                        )}
                    </div>
                </div>

                {/* Sub-Aba: Visão Geral vs Compras Parceladas */}
                <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 dark:bg-dark-card rounded-2xl border border-slate-300/40 dark:border-white/[0.06]">
                    <button
                        type="button"
                        onClick={() => setFinancasSubTab('geral')}
                        className={`flex-1 py-1.5 px-2 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1 ${
                            financasSubTab === 'geral'
                                ? 'bg-white dark:bg-dark-elevated text-slate-900 dark:text-white border border-transparent dark:border-white/10 shadow-sm font-extrabold'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        <ChartBarIcon className="h-3 w-3 shrink-0" />
                        <span>Visão Geral</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setFinancasSubTab('parcelas')}
                        className={`flex-1 py-1.5 px-2 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1 ${
                            financasSubTab === 'parcelas'
                                ? 'bg-white dark:bg-dark-elevated text-slate-900 dark:text-white border border-transparent dark:border-white/10 shadow-sm font-extrabold'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        <CreditCardIcon className="h-3 w-3 shrink-0" />
                        <span>Parceladas</span>
                        {activeInstallmentsCount > 0 && (
                            <span className={`px-1 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                                financasSubTab === 'parcelas'
                                    ? 'bg-slate-200 dark:bg-white/15 text-slate-900 dark:text-white'
                                    : 'bg-slate-300/80 dark:bg-slate-800 text-slate-700 dark:text-slate-400'
                            }`}>
                                {activeInstallmentsCount}
                            </span>
                        )}
                    </button>
                </div>

                {/* Info sobre a tela quando na aba de parcelas */}
                {financasSubTab === 'parcelas' && (
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-light-border/60 dark:border-white/[0.05]">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                            Assinaturas &amp; Parcelas
                        </span>
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setIsInfoTooltipOpen(v => !v)}
                                className="flex items-center gap-1 px-2 py-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-all"
                                title="O que aparece aqui?"
                            >
                                <InformationCircleIcon className="h-4 w-4" />
                            </button>
                            {isInfoTooltipOpen && (
                                <>
                                    <div className="fixed inset-0 z-30" onClick={() => setIsInfoTooltipOpen(false)} />
                                    <div className="absolute right-0 top-full mt-2 z-40 w-72 bg-white dark:bg-dark-elevated border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <h4 className="text-sm font-black text-slate-900 dark:text-white mb-2">O que aparece aqui?</h4>
                                        <div className="space-y-2.5">
                                            <div className="flex items-start gap-2">
                                                <span className="text-base shrink-0">💳</span>
                                                <div>
                                                    <p className="text-xs font-bold text-slate-900 dark:text-white">Compras Parceladas</p>
                                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">Lançamentos do tipo <strong>Parcelado</strong> feitos no botão +, com cronograma de parcelas.</p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-2">
                                                <span className="text-base shrink-0">🔄</span>
                                                <div>
                                                    <p className="text-xs font-bold text-slate-900 dark:text-white">Assinaturas</p>
                                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">Apenas lançamentos com categoria <strong>Assinaturas</strong> (Netflix, Spotify, academia, etc.).</p>
                                                </div>
                                            </div>
                                            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                                                <p className="text-[11px] text-amber-700 dark:text-amber-300 font-medium leading-snug">
                                                    💡 Lançamentos <strong>Fixos</strong> de outras categorias (aluguel, etc.) <strong>não aparecem</strong> aqui. Eles ficam no extrato normal.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </header>

            {financasSubTab === 'parcelas' ? (
                <main ref={mainScrollRef} className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar p-4 pb-28">
                    <SubscriptionsSettings
                        initialTab="installments"
                    />
                </main>
            ) : (
                <main ref={mainScrollRef} className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar p-4 grid grid-cols-1 gap-4 pb-24">
                    {!userProfile.hasSeenTutorial && (
                        <div className="w-full flex-shrink-0">
                            <ContextualTip
                                id="tip-onboarding-tutorial"
                                title={t('tip.onboarding.title')}
                                description={t('tip.onboarding.desc')}
                                actionLabel={t('tip.onboarding.action')}
                                onAction={() => setShowTutorial(true)}
                            />
                        </div>
                    )}
                    <div className="w-full flex-shrink-0">
                        <ContextualTip
                            id="tip-personalizar-painel"
                            title={t('tip.personalizar-painel.title')}
                            description={t('tip.personalizar-painel.desc')}
                        />
                    </div>
                    {dashboardLayout.order.map((cardId, index) => {
                        if (cardId === 'distribuicao502030' && !userProfile.isPremium) return null;
                        if (!dashboardLayout.visibility[cardId]) return null;
                        const content = renderCard(cardId);
                        if (!content) return null;

                        // Se for o widget de insights da Calopsita CFO, renderiza como card direto sem moldura dupla nem título redundante
                        if (cardId === 'insights') {
                            return (
                                <div
                                    key={cardId}
                                    id="tour-cfo-ia"
                                    className="stagger-card"
                                    style={{ animationDelay: `${index * 60}ms` }}
                                >
                                    {content}
                                </div>
                            );
                        }

                        return (
                            <div
                                key={cardId}
                                className="bg-white dark:bg-dark-card p-4 rounded-2xl shadow-sm border border-light-border dark:border-white/[0.05] relative stagger-card"
                                style={{ animationDelay: `${index * 60}ms` }}
                            >
                                {cardTitles[cardId] && <h2 className="text-[15px] font-semibold text-light-text dark:text-dark-text mb-3 flex items-center gap-2">{cardTitles[cardId]}</h2>}
                                <div>{content}</div>
                            </div>
                        );
                    })}
                </main>
            )}
            <MonthYearPickerModal isOpen={isMonthYearPickerOpen} onClose={() => setIsMonthYearPickerOpen(false)} currentDate={currentDate} allData={allData} onSelectDate={setCurrentDate} />
        </div>
    );
};
export { Dashboard };
export default Dashboard;
