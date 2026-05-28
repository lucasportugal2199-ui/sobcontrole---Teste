
import React, { useMemo, useContext, useEffect, useState, useRef, Suspense } from 'react';
import { getMonthKey, formatarMesAno, formatCurrency, getPreviousBalance, calculateDailyBalancesForMonth } from '../utils/helpers';
import { MESES_NOMES } from '../constants';
import { Transaction } from '../types';
import { ArrowLeftIcon, ArrowRightIcon, PlusIcon, ChartBarIcon } from './icons';
import { AppContext } from '../context/AppContext';
import MonthYearPickerModal from './MonthYearPickerModal';
import { SummaryWidget, AIInsightsWidget, QuickStatsWidget, BudgetWidget, PaymentMethodWidget, CreditCardInvoicesWidget, AccountBalancesWidget, Distribution502030Widget } from './dashboard/DashboardCards';

const TrendsWidget = React.lazy(() => import('./dashboard/DashboardCharts').then(module => ({ default: module.TrendsWidget })));
const CategoryPieWidget = React.lazy(() => import('./dashboard/DashboardCharts').then(module => ({ default: module.CategoryPieWidget })));
const DailySpendingWidget = React.lazy(() => import('./dashboard/DashboardCharts').then(module => ({ default: module.DailySpendingWidget })));
const SavingsRateWidget = React.lazy(() => import('./dashboard/DashboardCharts').then(module => ({ default: module.SavingsRateWidget })));

const ChartSkeleton = () => (
    <div className="w-full h-full min-h-[200px] flex items-center justify-center bg-light-bg dark:bg-dark-surface/30 rounded-lg">
        <div className="h-40 w-40 rounded-full bg-slate-200 dark:bg-slate-600/50"></div>
    </div>
);

// --- 1. Novo Componente Empty State Visual ---
const EmptyGraphState = ({ message, onAction }: { message: string, onAction: () => void }) => (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center h-full min-h-[200px] animate-in fade-in duration-500">
        <div className="bg-light-bg dark:bg-dark-surface p-4 rounded-full mb-3">
            <ChartBarIcon className="h-8 w-8 text-slate-400 dark:text-slate-400" />
        </div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-300 mb-5 max-w-[220px] leading-relaxed">{message}</p>
        <button
            onClick={onAction}
            className="flex items-center gap-2 px-5 py-2.5 bg-light-accent hover:opacity-90 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-light-accent/20"
        >
            <PlusIcon className="h-4 w-4" />
            Lançar Agora
        </button>
    </div>
);

const Dashboard: React.FC = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error("Dashboard must be used within an AppProvider");
    // --- 2. Adicionado setIsNewTransactionOpen ao destructure do context ---
    const { currentDate, changeMonth, setCurrentDate, allData, categoryColors, categorias, theme, dashboardLayout, handleUpdateLayout, savingsGoals, allTransactions, budgets, setCurrentView, creditCards, accounts, setIsTransactionMenuOpen, userProfile, handleAddCreditCard, handleLancamentoSubmit } = context;

    // Mocks já injetados em sessão anterior

    useEffect(() => {
        const idealOrder = [
            'resumo', 'contas', 'invoices', 'resumoDiario', 'fluxoDiario', 
            'orcamento', 'insights', 'distribuicao502030', 'tendencias', 
            'despesasCategoria', 'receitasCategoria', 'metodosPagamentoChart', 'taxaPoupanca'
        ];
        
        const hasAllKeys = idealOrder.every(k => dashboardLayout.order.includes(k));
        
        // Se estiver faltando alguma chave (novo widget), forçamos o layout ideal para organizar tudo
        if (!hasAllKeys) {
            handleUpdateLayout({
                order: idealOrder,
                visibility: idealOrder.reduce((acc, key) => ({ ...acc, [key]: true }), { ...dashboardLayout.visibility })
            });
        }
    }, [dashboardLayout.order, dashboardLayout.visibility, handleUpdateLayout]);

    const [isMonthYearPickerOpen, setIsMonthYearPickerOpen] = useState(false);
    const [balanceAnimationKey, setBalanceAnimationKey] = useState(0);

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
            return [...top5, { name: 'Outros', value: others }];
        };

        const chartDataMetodoPagamento = [
            { name: 'Débito', value: debitoTotal },
            { name: 'Crédito', value: creditoTotal }
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

    const dailySpendingData = useMemo(() => {
        const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
        const data = [];
        let accumulated = 0;

        // Mapear gastos por dia
        const spendingByDay: Record<number, number> = {};
        filteredData.forEach(tx => {
            if (tx.tipo === 'saida') {
                const day = new Date(tx.data + 'T00:00:00').getDate();
                spendingByDay[day] = (spendingByDay[day] || 0) + Number(tx.valor || 0);
            }
        });

        const today = new Date();
        const isPastMonth = currentDate.getFullYear() < today.getFullYear() || (currentDate.getFullYear() === today.getFullYear() && currentDate.getMonth() < today.getMonth());
        const isCurrentMonth = currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear();
        const lastDayToShow = isPastMonth ? daysInMonth : (isCurrentMonth ? today.getDate() : 0);

        const currentMonthKey = getMonthKey(currentDate);
        const previousBalance = getPreviousBalance(currentMonthKey, allData);
        const dailyBalances = calculateDailyBalancesForMonth(filteredData, previousBalance, currentDate.getFullYear(), currentDate.getMonth());

        for (let i = 1; i <= daysInMonth; i++) {
            const saldoNoDia = dailyBalances[i - 1]?.saldo || 0;
            if (i <= lastDayToShow) {
                accumulated += (spendingByDay[i] || 0);
                data.push({ 
                    day: i, 
                    value: accumulated,
                    SaldoRealizado: saldoNoDia,
                    SaldoPrevisto: i === lastDayToShow ? saldoNoDia : undefined
                });
            } else {
                data.push({ 
                    day: i,
                    SaldoPrevisto: saldoNoDia
                });
            }
        }
        return data;
    }, [filteredData, currentDate, allData]);

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

            const nameBase = MESES_NOMES[date.getMonth()].substring(0, 3);

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
            case 'distribuicao502030': return <Distribution502030Widget transactions={filteredData} categorias={categorias} />;
            case 'invoices': return <CreditCardInvoicesWidget cards={creditCards} allTransactions={allTransactions} currentDate={currentDate} />;
            case 'insights': return filteredData.length > 0 ? <AIInsightsWidget filteredData={filteredData} /> : null;
            case 'resumoDiario': return <div className="space-y-6"><QuickStatsWidget currentDate={currentDate} totalDespesas={totalDespesas} maxExpense={maxExpense} /><div className="pt-2 border-t border-slate-100 dark:border-slate-700"><h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Uso por Modo de Pagamento</h3><PaymentMethodWidget transactions={filteredData} /></div></div>;
            case 'orcamento': return Object.keys(budgets).length > 0 ? <BudgetWidget budgets={budgets} despesasPorCategoria={despesasPorCategoria} /> : null;

            case 'tendencias':
                // Exibe empty state se não houver NENHUMA transação no app inteiro
                return allTransactions.length > 0
                    ? <Suspense fallback={<ChartSkeleton />}><TrendsWidget data={trendsData} theme={theme} /></Suspense>
                    : <EmptyGraphState message="Seu histórico financeiro aparecerá aqui." onAction={() => setIsTransactionMenuOpen(true)} />;
            case 'despesasCategoria':
                return totalDespesas > 0
                    ? <Suspense fallback={<ChartSkeleton />}><CategoryPieWidget data={pieDataDespesas} total={totalDespesas} categoryColors={categoryColors} theme={theme} type="despesas" /></Suspense>
                    : <EmptyGraphState message="Nenhuma despesa registrada neste mês." onAction={() => setIsTransactionMenuOpen(true)} />;
            case 'receitasCategoria':
                return totalReceitas > 0
                    ? <Suspense fallback={<ChartSkeleton />}><CategoryPieWidget data={pieDataReceitas} total={totalReceitas} categoryColors={categoryColors} theme={theme} type="receitas" /></Suspense>
                    : <EmptyGraphState message="Nenhuma receita registrada neste mês." onAction={() => setIsTransactionMenuOpen(true)} />;
            case 'metodosPagamentoChart':
                return totalDespesas > 0
                    ? <Suspense fallback={<ChartSkeleton />}><CategoryPieWidget data={statsMetodoPagamento} total={totalDespesas} categoryColors={{}} theme={theme} type="recurring" customColors={['#10B981', '#9333EA']} /></Suspense>
                    : <EmptyGraphState message="Acompanhe seus métodos de pagamento aqui." onAction={() => setIsTransactionMenuOpen(true)} />;
            case 'fluxoDiario':
                return totalDespesas > 0
                    ? <Suspense fallback={<ChartSkeleton />}><DailySpendingWidget data={dailySpendingData} theme={theme} expectedLimit={budgetLimit > 0 ? budgetLimit : undefined} /></Suspense>
                    : <EmptyGraphState message="Veja seu fluxo de gastos diários aqui." onAction={() => setIsTransactionMenuOpen(true)} />;
            case 'taxaPoupanca':
                return (totalReceitas > 0 || totalDespesas > 0)
                    ? <Suspense fallback={<ChartSkeleton />}><SavingsRateWidget rate={savingsRate} theme={theme} /></Suspense>
                    : <EmptyGraphState message="Analise sua economia mensal aqui." onAction={() => setIsTransactionMenuOpen(true)} />;
            default: return null;
        }
    };

    const cardTitles: { [key: string]: string } = { contas: "Minhas Contas", distribuicao502030: "Método 50/30/20", resumo: "Resumo Mensal", invoices: "Minhas Faturas", insights: "CFO de Bolso", resumoDiario: "Métricas Rápidas", orcamento: "Orçamentos", tendencias: "Patrimônio e Fluxo", despesasCategoria: "Gastos por Categoria", receitasCategoria: "Receitas por Categoria", despesasRecorrentes: "Despesas Recorrentes", metodosPagamentoChart: "Métodos de Pagamento", fluxoDiario: "Fluxo Diário", taxaPoupanca: "Taxa de Poupança" };

    return (
        <div 
            className="bg-light-bg dark:bg-dark-bg text-slate-800 dark:text-slate-200 h-full flex flex-col transition-colors duration-300 relative"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
        >
            <header className="bg-light-bg/95 dark:bg-dark-bg/95 backdrop-blur-md z-20 p-4 pt-[calc(1rem+env(safe-area-inset-top))] border-b border-slate-200 dark:border-dark-surface flex-shrink-0 sticky top-0">
                <div className="flex items-center justify-between bg-white dark:bg-dark-surface rounded-2xl p-1.5 w-full shadow-sm border border-slate-100 dark:border-slate-700">
                    <button onClick={() => changeMonth(-1)} className="h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-300"><ArrowLeftIcon className="h-5 w-5" /></button>
                    <button onClick={() => setIsMonthYearPickerOpen(true)} className="flex-grow flex items-center justify-center gap-2 text-center font-bold text-lg text-slate-800 dark:text-white py-2 px-2 rounded-xl">
                        {formatarMesAno(currentDate)}
                        {(userProfile.currentStreak || 0) > 0 && (
                            <div className="flex items-center gap-1 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-full text-xs font-black shadow-sm" title={`${userProfile.currentStreak} dias seguidos!`}>
                                <span className="animate-pulse">🔥</span> {userProfile.currentStreak}
                            </div>
                        )}
                    </button>
                    <button onClick={() => changeMonth(1)} className="h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-300"><ArrowRightIcon className="h-5 w-5" /></button>
                </div>
            </header>
            <main className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar p-4 grid grid-cols-1 gap-5 pb-24">
                {dashboardLayout.order.map(cardId => {
                    if (cardId === 'distribuicao502030' && !userProfile.isPremium) return null;
                    if (!dashboardLayout.visibility[cardId]) return null;
                    const content = renderCard(cardId);
                    if (!content) return null;
                    return (
                        <div
                            key={cardId}
                            id={cardId === 'insights' ? 'tour-cfo-ia' : undefined}
                            className="bg-white dark:bg-dark-surface p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 relative"
                        >
                            {cardTitles[cardId] && <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-5 flex items-center gap-2">{cardTitles[cardId]}</h2>}
                            <div>{content}</div>
                        </div>
                    );
                })}
            </main>
            <MonthYearPickerModal isOpen={isMonthYearPickerOpen} onClose={() => setIsMonthYearPickerOpen(false)} currentDate={currentDate} allData={allData} onSelectDate={setCurrentDate} />
        </div>
    );
};
export default Dashboard;
