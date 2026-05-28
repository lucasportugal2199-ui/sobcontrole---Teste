import React, { useContext, useMemo, useState, useEffect } from 'react';
import { ArrowUpIcon, ArrowDownIcon, SparklesIcon, CalendarIcon, InvoiceDollarIcon, CreditCardIcon, BankIcon, ChevronRightIcon, ChevronDownIcon, LoaderIcon, LockIcon, PlusIcon, ChartBarIcon, AlertTriangleIcon } from '../icons';
import { formatCurrency, getMonthKey, calculate502030, validate502030, calculateAccountBalance, getEffectiveClosingDay } from '../../utils/helpers';
import { Transaction, CreditCard, Account } from '../../types';
import { AppContext } from '../../context/AppContext';
import { getBankLogo } from '../BankLogo';
import { InvoiceChartWidget } from './DashboardCharts';

export const SummaryWidget: React.FC<{
    saldoAtual: number;
    saldoPrevisto: number;
    totalReceitas: number;
    totalDespesas: number;
    balanceAnimationKey: number;
    onViewAnnualReport: () => void;
}> = ({ saldoAtual, saldoPrevisto, totalReceitas, totalDespesas, balanceAnimationKey, onViewAnnualReport }) => {
    const formatBalance = (value: number) => {
        const isNegative = value < 0;
        const formatted = formatCurrency(Math.abs(value));
        return isNegative ? `-${formatted}` : formatted;
    };

    const isDifferent = Math.abs(saldoAtual - saldoPrevisto) > 0.01;

    return (
        <div className="flex flex-col">
            <div className="flex flex-col items-center mb-6 mt-2">
                <span className="text-[10px] text-slate-500 dark:text-slate-300 font-black uppercase tracking-[0.2em]">Saldo Liquido Atual</span>
                <span key={balanceAnimationKey} className={`text-4xl font-black mt-1 subtle-fade-in ${saldoAtual < 0 ? 'text-red-500' : 'text-slate-900 dark:text-white'}`}>
                    {formatBalance(saldoAtual)}
                </span>
                {isDifferent && (
                    <div className="mt-2.5 bg-slate-100 dark:bg-slate-800/50 px-3 py-1 rounded-full flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 w-full max-w-[240px]">
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Previsto Fim do Mês:</span>
                        <span className={`text-[11px] font-black ${saldoPrevisto < 0 ? 'text-red-500' : 'text-slate-700 dark:text-slate-200'}`}>
                            {formatBalance(saldoPrevisto)}
                        </span>
                    </div>
                )}
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-700/50">
                <div className="flex flex-col items-center p-2">
                    <div className="flex items-center gap-1.5 mb-1.5">
                        <div className="p-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                            <ArrowUpIcon className="h-3 w-3" />
                        </div>
                        <span className="text-[10px] font-black text-slate-500 dark:text-slate-300 uppercase tracking-widest">Receitas</span>
                    </div>
                    <span className="text-base font-bold text-slate-800 dark:text-slate-100">{formatCurrency(totalReceitas)}</span>
                </div>
                <div className="flex flex-col items-center p-2 relative">
                    <div className="absolute left-0 top-3 bottom-3 w-px bg-slate-100 dark:bg-slate-700"></div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                        <div className="p-1.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                            <ArrowDownIcon className="h-3 w-3" />
                        </div>
                        <span className="text-[10px] font-black text-slate-500 dark:text-slate-300 uppercase tracking-widest">Despesas</span>
                    </div>
                    <span className="text-base font-bold text-slate-800 dark:text-slate-100">{formatCurrency(totalDespesas)}</span>
                </div>
            </div>
            <button onClick={onViewAnnualReport} className="mt-4 w-full py-3 text-xs font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/15 hover:bg-blue-100 dark:hover:bg-blue-900/30 border border-blue-100 dark:border-blue-800/30 rounded-xl transition-all uppercase tracking-widest active:scale-[0.98] flex items-center justify-center gap-2">
                <ChartBarIcon className="h-3.5 w-3.5" />
                Ver Relatório Anual
            </button>
        </div>
    );
};

export const AIInsightsWidget: React.FC<{ filteredData: Transaction[] }> = ({ filteredData }) => {
    const context = useContext(AppContext);
    if (!context) return null;
    const { setCurrentView, userProfile } = context;
    const isPremium = userProfile.isPremium;

    const handleAction = () => {
        if (isPremium) {
            setCurrentView('chat');
        } else {
            setCurrentView('premium');
        }
    };

    return (
        <div className="flex items-center justify-between gap-3 bg-slate-50 dark:bg-dark-surface/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-2.5 flex-1">
                <div className="p-1.5 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                    <SparklesIcon className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
                </div>
                <div className="flex flex-col">
                    {!isPremium && <span className="text-[7px] text-slate-400 uppercase tracking-widest font-bold mb-0.5">Recurso PRO</span>}
                    <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-tight font-medium pr-1">
                        {isPremium 
                            ? "Dicas e análises sobre os seus gastos."
                            : "Desbloqueie consultoria financeira."}
                    </p>
                </div>
            </div>
            <button 
                onClick={handleAction} 
                className={`py-2 px-3 rounded-lg font-bold uppercase text-[9px] tracking-wider transition-all flex items-center justify-center gap-1.5 active:scale-95 shrink-0 ${
                    isPremium 
                        ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 border border-indigo-100 dark:border-indigo-800/50' 
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700'
                }`}
            >
                {isPremium ? (
                    <>Chat IA <SparklesIcon className="h-2.5 w-2.5" /></>
                ) : (
                    <>Assinar <LockIcon className="h-2.5 w-2.5" /></>
                )}
            </button>
        </div>
    );
};

export const QuickStatsWidget: React.FC<{ currentDate: Date; totalDespesas: number; maxExpense: Transaction | null; }> = ({ currentDate, totalDespesas, maxExpense }) => {
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const today = new Date();
    const isCurrentMonth = currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear();
    const dayOfMonth = isCurrentMonth ? today.getDate() : daysInMonth;
    const dailyAverage = dayOfMonth > 0 ? totalDespesas / dayOfMonth : 0;

    return (
        <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 dark:bg-dark-surface/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                <div className="flex items-center gap-2 mb-2 text-slate-500 dark:text-slate-300">
                    <CalendarIcon className="h-4 w-4" />
                    <span className="text-[9px] font-black uppercase tracking-wider">Média Diária</span>
                </div>
                <p className="text-lg font-black text-slate-800 dark:text-white leading-tight">{formatCurrency(dailyAverage)}</p>
            </div>
            <div className="bg-slate-50 dark:bg-dark-surface/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                <div className="flex items-center gap-2 mb-2 text-slate-500 dark:text-slate-300">
                    <ArrowDownIcon className="h-4 w-4" />
                    <span className="text-[9px] font-black uppercase tracking-wider">Maior Gasto</span>
                </div>
                <p className="text-lg font-black text-slate-800 dark:text-white leading-tight">{maxExpense ? formatCurrency(maxExpense.valor) : 'R$ 0,00'}</p>
            </div>
        </div>
    );
};

export const BudgetWidget: React.FC<{ budgets: any, despesasPorCategoria: any[] }> = ({ budgets, despesasPorCategoria }) => {
    return (
        <div className="space-y-3">
            {Object.entries(budgets).map(([category, amount]) => {
                const spent = despesasPorCategoria.find(d => d.name === category)?.value || 0;
                const total = amount as number;
                const rawPercentage = (spent / total) * 100;
                const percentage = Math.min(rawPercentage, 100);
                const isOverBudget = spent > total;
                const overAmount = spent - total;

                return (
                    <div key={category} className={`space-y-2 p-3 rounded-2xl border transition-colors ${isOverBudget ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50' : 'bg-transparent border-transparent'}`}>
                        <div className="flex justify-between items-center gap-2 text-[11px] font-bold">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                <span className={isOverBudget ? 'text-red-700 dark:text-red-400 font-black' : 'text-slate-700 dark:text-slate-200'}>
                                    {category}
                                </span>
                                {isOverBudget && (
                                    <span className="flex items-center gap-1 text-[9px] bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded uppercase tracking-widest shadow-sm">
                                        <AlertTriangleIcon className="h-3 w-3" /> Excedeu {formatCurrency(overAmount)}
                                    </span>
                                )}
                            </div>
                            <span className={`${isOverBudget ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-300'} font-black uppercase whitespace-nowrap`}>
                                {formatCurrency(spent)} <span className="opacity-40 mx-0.5">/</span> {formatCurrency(total)}
                            </span>
                        </div>
                        <div className={`h-2.5 rounded-full overflow-hidden border ${isOverBudget ? 'bg-red-200 dark:bg-red-900/40 border-red-300 dark:border-red-800/50' : 'bg-slate-100 dark:bg-dark-bg border-slate-100 dark:border-slate-800'}`}>
                            <div className={`h-full transition-all duration-700 ease-out ${isOverBudget ? 'bg-red-600 dark:bg-red-500 shadow-[0_0_10px_rgba(220,38,38,0.5)]' : percentage > 90 ? 'bg-red-500' : percentage > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${percentage}%` }} />
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export const PaymentMethodWidget: React.FC<{ transactions: Transaction[] }> = ({ transactions }) => {
    const stats = useMemo(() => {
        const methods = { credito: 0, debito: 0 };
        transactions.forEach(t => { if (t.tipo === 'saida') methods[t.paymentMethod] += t.valor; });
        return methods;
    }, [transactions]);

    return (
        <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-slate-50 dark:bg-dark-bg/30 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="h-10 w-10 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-2 shadow-sm"><BankIcon className="h-5 w-5" /></div>
                <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Débito</p>
                <p className="text-sm font-black text-slate-800 dark:text-white">{formatCurrency(stats.debito)}</p>
            </div>
            <div className="text-center p-4 bg-slate-50 dark:bg-dark-bg/30 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="h-10 w-10 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full flex items-center justify-center mx-auto mb-2 shadow-sm"><CreditCardIcon className="h-5 w-5" /></div>
                <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Cartão</p>
                <p className="text-sm font-black text-slate-800 dark:text-white">{formatCurrency(stats.credito)}</p>
            </div>
        </div>
    );
};

export const CreditCardInvoicesWidget: React.FC<{ cards: CreditCard[], allTransactions: Transaction[], currentDate: Date, theme?: string }> = ({ cards, allTransactions, currentDate, theme = 'dark' }) => {
    const context = useContext(AppContext);
    const [expandedCards, setExpandedCards] = useState<string[]>([]);
    
    if (cards.length === 0) return (
        <div className="py-10 flex flex-col items-center justify-center text-center bg-slate-50 dark:bg-dark-surface/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700/50">
            <div className="bg-purple-100 dark:bg-purple-900/20 p-4 rounded-full mb-4">
                <CreditCardIcon className="h-8 w-8 text-purple-500 dark:text-purple-400" />
            </div>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">Nenhum cartão cadastrado</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mb-4 max-w-[200px]">Cadastre seus cartões para acompanhar faturas e limites</p>
            <button 
                onClick={() => { if (context) { context.setCurrentView('menu'); context.setMenuSubView('cards'); } }}
                className="flex items-center gap-2 px-5 py-2.5 bg-light-accent hover:opacity-90 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-light-accent/20"
            >
                <PlusIcon className="h-4 w-4" /> Criar Cartão
            </button>
        </div>
    );

    const toggleCard = (id: string) => {
        setExpandedCards(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
    };

    return (
        <div className="space-y-4">
            {cards.map(card => {
                const currentMonthStr = getMonthKey(currentDate);
                const allUnpaidTxs = allTransactions.filter(t => t.cardId === card.id && t.statementDate && t.statementDate >= currentMonthStr);
                const totalUnpaid = allUnpaidTxs.reduce((sum, t) => {
                    if (t.tipo === 'saida') return sum + t.valor;
                    if (t.tipo === 'entrada') return sum - t.valor;
                    return sum;
                }, 0);

                const limitAvailable = Math.max(0, card.limit - totalUnpaid);
                
                const isExpanded = expandedCards.includes(card.id);

                // Criar histórico de faturas (3 meses: anterior, atual, próximo)
                const invoiceHistory = [];
                for (let i = -1; i <= 1; i++) {
                    const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
                    const monthKey = getMonthKey(date);
                    const txs = allTransactions.filter(t => t.cardId === card.id && t.statementDate === monthKey);
                    const monthTotal = txs.reduce((sum, t) => {
                        if (t.tipo === 'saida') return sum + t.valor;
                        if (t.tipo === 'entrada') return sum - t.valor;
                        return sum;
                    }, 0);
                    
                    const nomeMes = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(date);
                    invoiceHistory.push({
                        name: nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1),
                        value: monthTotal,
                        isCurrent: i === 0
                    });
                }

                // Data de vencimento atual
                const currentInvoiceTotal = invoiceHistory.find(h => h.isCurrent)?.value || 0;

                const dueDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), card.dueDay);
                const nomeMesAtual = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(dueDate);
                
                // Melhor dia de compra (fechamento)
                const closingDay = getEffectiveClosingDay(card, currentDate);
                const closingDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), closingDay);
                if (card.dueDay < closingDay) {
                    closingDate.setMonth(closingDate.getMonth() - 1);
                }
                const nomeMesFechamento = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(closingDate);

                return (
                    <div key={card.id} className="p-4 bg-white dark:bg-dark-surface/40 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm overflow-hidden transition-all duration-300">
                        <div 
                            className="flex justify-between items-center cursor-pointer mb-2" 
                            onClick={() => toggleCard(card.id)}
                        >
                            <div className="flex items-center gap-2.5">
                                <div className="h-3.5 w-3.5 rounded-full shadow-sm" style={{ backgroundColor: card.color }} />
                                <span className="text-base font-black uppercase text-slate-900 dark:text-white tracking-tight">{card.name}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex flex-col items-end">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Fatura Atual</span>
                                    <span className="text-sm font-black text-slate-900 dark:text-white">{formatCurrency(currentInvoiceTotal)}</span>
                                </div>
                                <div className="text-slate-400 dark:text-slate-500 ml-1">
                                    {isExpanded ? <ChevronDownIcon className="h-5 w-5" /> : <ChevronRightIcon className="h-5 w-5" />}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                                <span className="text-[11px] font-medium">Limite disponível hoje</span>
                                <div className="h-3 w-3 border border-slate-300 dark:border-slate-500 rounded-full flex items-center justify-center">
                                    <span className="text-[7px] font-bold">i</span>
                                </div>
                            </div>
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{formatCurrency(limitAvailable)}</span>
                        </div>

                        {isExpanded && (
                            <div className="animate-in slide-in-from-top-2 fade-in duration-300">
                                <InvoiceChartWidget data={invoiceHistory} theme={theme} />
                                
                                <div className="text-center pt-2">
                                    <p className="text-[13px] font-black text-slate-900 dark:text-white">
                                        Vencimento {card.dueDay} de {nomeMesAtual.charAt(0).toUpperCase() + nomeMesAtual.slice(1)}
                                    </p>
                                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5 mb-4">
                                        Melhor data de compra em {closingDay} de {nomeMesFechamento.charAt(0).toUpperCase() + nomeMesFechamento.slice(1)}
                                    </p>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (context) {
                                                context.setManagementFilter({ method: 'credito', cardId: card.id });
                                                context.setCurrentTab('transacoes');
                                            }
                                        }}
                                        className="w-full py-2.5 bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                                    >
                                        <InvoiceDollarIcon className="h-4 w-4" />
                                        Ver Lançamentos
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export const AccountBalancesWidget: React.FC<{ accounts: Account[], allTransactions: Transaction[], currentDate: Date }> = ({ accounts, allTransactions, currentDate }) => {
    const context = useContext(AppContext);
    
    if (accounts.length === 0) return (
        <div className="py-10 flex flex-col items-center justify-center text-center bg-slate-50 dark:bg-dark-surface/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700/50">
            <div className="bg-blue-100 dark:bg-blue-900/20 p-4 rounded-full mb-4">
                <BankIcon className="h-8 w-8 text-blue-500 dark:text-blue-400" />
            </div>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">Nenhuma conta cadastrada</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mb-4 max-w-[200px]">Cadastre suas contas bancárias para controlar seus saldos</p>
            <button 
                onClick={() => { if (context) { context.setCurrentView('openfinance'); } }}
                className="flex items-center gap-2 px-5 py-2.5 bg-light-accent hover:opacity-90 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-light-accent/20"
            >
                <PlusIcon className="h-4 w-4" /> Criar Conta
            </button>
        </div>
    );
    
    // Calcula o saldo total de todas as contas dinamicamente até o mês exibido
    const calculatedAccounts = accounts.map(acc => ({
        ...acc,
        balance: calculateAccountBalance(acc.id, allTransactions, currentDate)
    }));
    const totalBalance = calculatedAccounts.reduce((acc, account) => acc + account.balance, 0);

    return (
        <div className="space-y-4">
            {/* Resumo do Saldo Total */}
            <div className="flex flex-col mb-4 bg-slate-50 dark:bg-dark-surface/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                <span className="text-[10px] text-slate-500 dark:text-slate-300 font-black uppercase tracking-widest mb-1 text-center">Saldo nas Contas</span>
                <span className={`text-3xl font-black text-center ${totalBalance >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {formatCurrency(totalBalance)}
                </span>
            </div>

            {/* Grid ou Lista de Contas */}
            <div className="grid grid-cols-2 gap-3">
                {calculatedAccounts.map(account => {
                    const perc = totalBalance > 0 && account.balance > 0 
                        ? Math.min((account.balance / totalBalance) * 100, 100) 
                        : 0;

                    return (
                        <div key={account.id} className="p-3 bg-white dark:bg-dark-bg rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                            <div className="flex items-center gap-2 mb-2">
                                {getBankLogo(account.bankName, "w-8 h-8 rounded-xl shadow-inner flex-shrink-0") || (
                                    <div 
                                        className="h-8 w-8 rounded-xl flex items-center justify-center text-white text-xs font-black shadow-inner flex-shrink-0"
                                        style={{ backgroundColor: account.color }}
                                    >
                                        {account.bankName.charAt(0).toUpperCase()}
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-slate-800 dark:text-white truncate" title={account.bankName}>{account.bankName}</p>
                                    <p className="text-[9px] font-black tracking-widest uppercase text-slate-400">{account.accountType}</p>
                                </div>
                            </div>
                            
                            <div className="mt-2">
                                <p className={`text-sm font-black mb-1 ${account.balance >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    {formatCurrency(account.balance)}
                                </p>
                                {/* Barra de proporção (infográfico) */}
                                <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full rounded-full transition-all duration-1000" 
                                        style={{ width: `${perc}%`, backgroundColor: account.color }} 
                                    />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};



export const Distribution502030Widget: React.FC<{ transactions: Transaction[], categorias: any }> = ({ transactions, categorias }) => {
    const distribution = useMemo(() => {
        return calculate502030(transactions, categorias);
    }, [transactions, categorias]);

    const validation = useMemo(() => {
        return validate502030(distribution);
    }, [distribution]);

    if (distribution.receitas <= 0) {
        return (
            <div className="py-4 text-center">
                <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold italic">Registre receitas neste mês para ver a Distribuição 50/30/20.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <p className="text-[11px] text-slate-500 font-medium leading-relaxed">Sua distribuição real em relação às receitas do mês.</p>
            
            {validation.status === 'warning' && (
                <div className="p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/30 rounded-xl space-y-1">
                    <p className="text-[10px] font-black text-rose-700 dark:text-rose-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                        Atenção aos limites
                    </p>
                    <ul className="text-xs text-rose-600 dark:text-rose-300 list-disc pl-4 space-y-0.5 font-medium">
                        {validation.mensagens.map((msg, idx) => <li key={idx}>{msg}</li>)}
                    </ul>
                </div>
            )}

            <div className="space-y-3">
                {/* Gastos Fixos */}
                <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-indigo-900 dark:text-indigo-100 flex items-center gap-1.5">
                            Gastos Fixos <span className="text-[10px] font-medium text-indigo-700/70 dark:text-indigo-300/70 bg-indigo-500/10 px-1.5 rounded">(50% = {formatCurrency(distribution.receitas * 0.5)})</span>
                        </span>
                        <span className="font-black text-indigo-700 dark:text-indigo-400">
                            {formatCurrency(distribution['Gastos Fixos'])} <span className="opacity-50 mx-1">•</span> {distribution.percentuais['Gastos Fixos'].toFixed(1)}%
                        </span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 dark:bg-dark-bg rounded-full overflow-hidden border border-slate-100 dark:border-slate-800">
                        <div className={`h-full transition-all duration-1000 ${distribution.percentuais['Gastos Fixos'] > 50 ? 'bg-rose-500' : 'bg-indigo-500'}`} style={{ width: `${Math.min(distribution.percentuais['Gastos Fixos'], 100)}%` }} />
                    </div>
                </div>

                {/* Gastos Variáveis */}
                <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-rose-900 dark:text-rose-100 flex items-center gap-1.5">
                            Gastos Variáveis <span className="text-[10px] font-medium text-rose-700/70 dark:text-rose-300/70 bg-rose-500/10 px-1.5 rounded">(30% = {formatCurrency(distribution.receitas * 0.3)})</span>
                        </span>
                        <span className="font-black text-rose-700 dark:text-rose-400">
                            {formatCurrency(distribution['Gastos Variáveis'])} <span className="opacity-50 mx-1">•</span> {distribution.percentuais['Gastos Variáveis'].toFixed(1)}%
                        </span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 dark:bg-dark-bg rounded-full overflow-hidden border border-slate-100 dark:border-slate-800">
                        <div className={`h-full transition-all duration-1000 ${distribution.percentuais['Gastos Variáveis'] > 30 ? 'bg-rose-500' : 'bg-rose-400'}`} style={{ width: `${Math.min(distribution.percentuais['Gastos Variáveis'], 100)}%` }} />
                    </div>
                </div>

                {/* Reserva Financeira */}
                <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-emerald-900 dark:text-emerald-100 flex items-center gap-1.5">
                            Reserva Financeira <span className="text-[10px] font-medium text-emerald-700/70 dark:text-emerald-300/70 bg-emerald-500/10 px-1.5 rounded">(20% = {formatCurrency(distribution.receitas * 0.2)})</span>
                        </span>
                        <span className="font-black text-emerald-700 dark:text-emerald-400">
                            {formatCurrency(distribution['Reserva Financeira'])} <span className="opacity-50 mx-1">•</span> {distribution.percentuais['Reserva Financeira'].toFixed(1)}%
                        </span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 dark:bg-dark-bg rounded-full overflow-hidden border border-slate-100 dark:border-slate-800">
                        <div className={`h-full transition-all duration-1000 ${distribution.percentuais['Reserva Financeira'] < 20 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(distribution.percentuais['Reserva Financeira'], 100)}%` }} />
                    </div>
                </div>
            </div>
        </div>
    );
};
