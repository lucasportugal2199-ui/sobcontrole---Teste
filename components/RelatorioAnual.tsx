
import React, { useState, useMemo, useContext, useCallback } from 'react';
import { AppContext } from '../context/AppContext';
import { ArrowLeftIcon, ArrowRightIcon, ArrowUpIcon, ArrowDownIcon, PiggyBankIcon, InformationCircleIcon, ChartBarIcon, SparklesIcon, InvoiceDollarIcon, ClipboardListIcon, ArrowDownTrayIcon, LockIcon } from './icons';
import { ComposedChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, Sector } from 'recharts';
import { MESES_NOMES } from '../constants';
import { formatCurrency, getCorPorCategoria, exportTransactionsToExcel, exportTransactionsToCSV, calculate502030, calculatePercentageChange } from '../utils/helpers';

// --- Dot Pulsante ---
const PulsatingDot = (props: any) => {
    const { cx, cy, fill } = props;
    if (cx == null || cy == null) return null;
    return (
        <g>
            <circle cx={cx} cy={cy} r={8} fill={fill} opacity={0.15}>
                <animate attributeName="r" from="6" to="16" dur="1.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="0.3" to="0" dur="1.5s" repeatCount="indefinite" />
            </circle>
            <circle cx={cx} cy={cy} r={5} fill={fill} stroke="#fff" strokeWidth={2.5} />
        </g>
    );
};

// --- ActiveShape interativo para PieChart (sutil) ---
const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    return (
        <g>
            <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 4} startAngle={startAngle} endAngle={endAngle} fill={fill} />
        </g>
    );
};

// --- Tooltip Glassmorphism ---
const AnnualTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white/95 dark:bg-dark-surface/95 backdrop-blur-md p-3 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{label}</p>
            <div className="space-y-1">
                {payload.map((entry: any, i: number) => (
                    <p key={i} className="text-sm font-bold flex justify-between gap-4" style={{ color: entry.color || entry.stroke }}>
                        <span>{entry.name}:</span>
                        <span>{formatCurrency(entry.value)}</span>
                    </p>
                ))}
            </div>
        </div>
    );
};

const SavingsRateItem: React.FC<{
    label: string;
    income: number;
    saved: number;
    isTotal?: boolean;
}> = ({ label, income, saved, isTotal = false }) => {
    const safeSaved = Math.max(0, saved);
    const percentage = income > 0 ? (safeSaved / income) * 100 : 0;
    const displayPercentage = income > 0 ? ((saved / income) * 100).toFixed(0) : '0';

    const isPositive = saved >= 0;
    const barColor = isPositive ? 'bg-emerald-500' : 'bg-red-500';
    const textColor = isPositive ? 'text-emerald-500' : 'text-red-500';
    const trackBorderColor = isPositive ? 'border-emerald-500/30' : 'border-red-500/30';

    return (
        <div className={`py-4 ${!isTotal ? 'border-b border-slate-100 dark:border-slate-700/50 last:border-0' : ''}`}>
            <div className="flex justify-between items-end mb-2">
                <span className={`font-semibold ${isTotal ? 'text-lg text-slate-900 dark:text-white' : 'text-base text-slate-700 dark:text-slate-200'}`}>
                    {label}
                </span>
                <span className={`font-bold ${isTotal ? 'text-3xl' : 'text-xl'} ${textColor}`}>
                    {displayPercentage}%
                </span>
            </div>

            <div className={`h-3 w-full rounded-full border ${trackBorderColor} bg-slate-100 dark:bg-dark-bg relative overflow-hidden mb-2`}>
                <div
                    className={`absolute top-0 left-0 h-full rounded-full ${barColor} transition-all duration-1000 ease-out`}
                    style={{ width: `${Math.min(Math.max(percentage, 0), 100)}%` }}
                />
            </div>

            <div className="flex justify-between text-xs">
                <div>
                    <span className="text-slate-400 block mb-0.5">Economias</span>
                    <span className={`font-medium ${textColor}`}>{formatCurrency(saved)}</span>
                </div>
                <div className="text-right">
                    <span className="text-slate-400 block mb-0.5">Entradas</span>
                    <span className="font-medium text-slate-600 dark:text-slate-200">{formatCurrency(income)}</span>
                </div>
            </div>
        </div>
    );
};

const RelatorioAnual: React.FC = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error("RelatorioAnual must be used within an AppProvider");

    const { setCurrentView, allTransactions, categoryColors, theme, userProfile, categorias, savingsGoals } = context;
    const isPremium = userProfile.isPremium;

    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [activeTab, setActiveTab] = useState<'geral' | 'economia'>('geral');
    const [chartMode, setChartMode] = useState<'absolute' | 'cumulative'>('absolute');
    const [activeCatIndex, setActiveCatIndex] = useState(-1);
    const [activePayIndex, setActivePayIndex] = useState(-1);
    const onCatEnter = useCallback((_: any, index: number) => setActiveCatIndex(index), []);
    const onCatLeave = useCallback(() => setActiveCatIndex(-1), []);
    const onPayEnter = useCallback((_: any, index: number) => setActivePayIndex(index), []);
    const onPayLeave = useCallback(() => setActivePayIndex(-1), []);

    const availableYears = useMemo(() => {
        const years = new Set(allTransactions.map(tx => new Date(tx.data + 'T00:00:00').getFullYear()));
        if (!years.has(new Date().getFullYear())) {
            years.add(new Date().getFullYear());
        }
        return Array.from(years).sort((a: number, b: number) => a - b);
    }, [allTransactions]);

    const annualTransactions = useMemo(() => {
        return allTransactions.filter(tx => new Date(tx.data + 'T00:00:00').getFullYear() === selectedYear);
    }, [allTransactions, selectedYear]);

    const previousYearTransactions = useMemo(() => {
        return allTransactions.filter(tx => new Date(tx.data + 'T00:00:00').getFullYear() === selectedYear - 1);
    }, [allTransactions, selectedYear]);

    const previousYearTotals = useMemo(() => {
        const receitas = previousYearTransactions.filter(tx => tx.tipo === 'entrada').reduce((sum, tx) => sum + Number(tx.valor || 0), 0);
        const despesas = previousYearTransactions.filter(tx => tx.tipo === 'saida').reduce((sum, tx) => sum + Number(tx.valor || 0), 0);
        return { receitas, despesas };
    }, [previousYearTransactions]);

    const { totalReceitas, totalDespesas, saldoAnual, interpretationText } = useMemo(() => {
        const receitas = annualTransactions
            .filter(tx => tx.tipo === 'entrada')
            .reduce((sum, tx) => sum + Number(tx.valor || 0), 0);
        const despesas = annualTransactions
            .filter(tx => tx.tipo === 'saida')
            .reduce((sum, tx) => sum + Number(tx.valor || 0), 0);

        const saldo = receitas - despesas;
        let text = "";
        if (saldo > 0) {
            text = `Você poupou ${formatCurrency(saldo)} em ${selectedYear}. Parabéns pelo controle!`;
        } else if (saldo < 0) {
            text = `Você gastou ${formatCurrency(Math.abs(saldo))} a mais do que ganhou em ${selectedYear}.`;
        } else {
            text = `Suas contas fecharam exatamente no zero em ${selectedYear}.`;
        }

        return { totalReceitas: receitas, totalDespesas: despesas, saldoAnual: saldo, interpretationText: text };
    }, [annualTransactions, selectedYear]);

    const monthlyData = useMemo(() => {
        const data = MESES_NOMES.map((nome, index) => ({
            name: nome,
            shortName: nome.substring(0, 3),
            Receitas: 0,
            Despesas: 0,
            Saldo: 0,
            index
        }));

        annualTransactions.forEach(tx => {
            const month = new Date(tx.data + 'T00:00:00').getMonth();
            if (tx.tipo === 'entrada') {
                data[month].Receitas += Number(tx.valor || 0);
            } else {
                data[month].Despesas += Number(tx.valor || 0);
            }
        });

        let runningBalance = 0;
        data.forEach(d => {
            d.Saldo = d.Receitas - d.Despesas;
            runningBalance += d.Saldo;
            // @ts-ignore
            d.Acumulado = runningBalance;
        });

        return data;
    }, [annualTransactions]);

    const activeMonthsCount = useMemo(() => {
        const active = monthlyData.filter(m => m.Receitas > 0 || m.Despesas > 0).length;
        return active > 0 ? active : 1;
    }, [monthlyData]);

    const mediaMensalReceitas = totalReceitas / activeMonthsCount;
    const mediaMensalDespesas = totalDespesas / activeMonthsCount;

    const yoYReceitas = calculatePercentageChange(totalReceitas, previousYearTotals.receitas);
    const yoYDespesas = calculatePercentageChange(totalDespesas, previousYearTotals.despesas);

    const paymentMethodsData = useMemo(() => {
        const methods = annualTransactions
            .filter(tx => tx.tipo === 'saida')
            .reduce((acc, tx) => {
                const method = tx.paymentMethod || 'debito';
                acc[method] = (acc[method] || 0) + Number(tx.valor || 0);
                return acc;
            }, {} as Record<string, number>);

        const formatted = Object.entries(methods).map(([name, value]) => ({
            name: name === 'credito' ? 'Crédito' : name === 'debito' ? 'Débito' : name === 'pix' ? 'PIX' : 'Dinheiro',
            value: Number(value),
            id: name
        })).sort((a, b) => b.value - a.value);

        return formatted.length > 0 ? formatted : [{ name: 'Sem dados', value: 1, id: 'none' }];
    }, [annualTransactions]);

    const annual503020 = useMemo(() => {
        return calculate502030(annualTransactions, categorias);
    }, [annualTransactions, categorias]);

    const metasAllocations = useMemo(() => {
        const allocations: Record<string, number> = {};
        annualTransactions.forEach(tx => {
            if (tx.tipo === 'saida' && tx.goalId) {
                allocations[tx.goalId] = (allocations[tx.goalId] || 0) + Number(tx.valor || 0);
            }
        });
        
        let totalAllocated = 0;
        const details = Object.entries(allocations).map(([goalId, amount]) => {
            const goal = savingsGoals.find(g => g.id === goalId);
            totalAllocated += amount;
            return {
                id: goalId,
                name: goal ? goal.name : 'Meta Excluída',
                amount
            };
        }).sort((a, b) => b.amount - a.amount);

        return {
            details,
            totalAllocated,
            freeSavings: Math.max(0, saldoAnual - totalAllocated)
        };
    }, [annualTransactions, savingsGoals, saldoAnual]);

    const insights = useMemo(() => {
        if (annualTransactions.length === 0) return null;

        const activeMonths = monthlyData.filter(m => m.Receitas > 0 || m.Despesas > 0);
        if (activeMonths.length === 0) return null;

        const worstMonth = [...activeMonths].sort((a, b) => a.Despesas - b.Despesas).pop();
        const bestMonth = [...activeMonths].sort((a, b) => a.Saldo - b.Saldo).pop();
        const highestIncomeMonth = [...activeMonths].sort((a, b) => a.Receitas - b.Receitas).pop();

        return { worstMonth, bestMonth, highestIncomeMonth };
    }, [monthlyData, annualTransactions]);

    const annualCategoryData = useMemo(() => {
        const despesasPorCat = annualTransactions
            .filter(tx => tx.tipo === 'saida')
            .reduce((acc, tx) => {
                acc[tx.categoria] = (acc[tx.categoria] || 0) + Number(tx.valor || 0);
                return acc;
            }, {} as Record<string, number>);

        const sorted = Object.entries(despesasPorCat)
            .map(([name, value]) => ({ name, value: Number(value) }))
            .sort((a, b) => b.value - a.value);

        if (sorted.length > 6) {
            const top6 = sorted.slice(0, 6);
            const othersValue = sorted.slice(6).reduce((sum, item) => sum + Number(item.value), 0);
            return [...top6, { name: 'Outros', value: othersValue }];
        }

        return sorted.length > 0 ? sorted : [{ name: 'Nenhuma despesa', value: 1 }];
    }, [annualTransactions]);

    const COLORS = annualCategoryData.map(item => getCorPorCategoria(item.name, categoryColors));
    if (annualCategoryData.length === 1 && annualCategoryData[0].name === 'Nenhuma despesa') {
        COLORS[0] = theme === 'dark' ? '#334155' : '#cbd5e1';
    }

    const tickColor = theme === 'light' ? '#475569' : '#94a3b8';
    const gridColor = theme === 'light' ? '#e2e8f0' : '#374151';

    const axisTickFormatter = (value: number) => {
        if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
        return value.toString();
    };

    const formatBalance = (value: number) => {
        const isNegative = value < 0;
        const formatted = formatCurrency(Math.abs(value));
        return isNegative ? `-${formatted}` : formatted;
    };

    return (
        <div className="bg-slate-50 dark:bg-dark-bg h-full flex flex-col text-slate-800 dark:text-slate-200">
            <header className="sticky top-0 bg-slate-50/80 dark:bg-dark-bg/80 backdrop-blur-sm z-30 p-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex justify-between items-center pt-[env(safe-area-inset-top)]">
                    <button onClick={() => setCurrentView('main')} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-dark-surface transition">
                        <ArrowLeftIcon className="h-6 w-6 text-slate-800 dark:text-white" />
                    </button>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">Relatório Anual</h1>
                    <div className="w-10"></div>
                </div>

                <div className="flex items-center justify-between mt-4 bg-white dark:bg-dark-surface rounded-xl p-2 w-full shadow-sm border border-slate-100 dark:border-slate-800">
                    <button onClick={() => setSelectedYear(y => y - 1)} disabled={!availableYears.includes(selectedYear - 1)} className="h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-full text-slate-600 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-dark-bg transition-colors disabled:opacity-30">
                        <ArrowLeftIcon className="h-6 w-6" />
                    </button>
                    <div className="flex-grow text-center font-black text-lg text-slate-900 dark:text-white">{selectedYear}</div>
                    <button onClick={() => setSelectedYear(y => y + 1)} disabled={!availableYears.includes(selectedYear + 1)} className="h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-full text-slate-600 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-dark-bg transition-colors disabled:opacity-30">
                        <ArrowRightIcon className="h-6 w-6" />
                    </button>
                </div>

                <div className="flex mt-4 bg-white dark:bg-dark-surface p-1 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800">
                    <button onClick={() => setActiveTab('geral')} className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'geral' ? 'bg-slate-100 dark:bg-dark-bg text-slate-900 dark:text-white shadow-sm' : 'text-slate-400'}`}>Geral</button>
                    <button onClick={() => setActiveTab('economia')} className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'economia' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 shadow-sm' : 'text-slate-400'}`}>Economia</button>
                </div>
            </header>

            <main className="p-4 overflow-y-auto overflow-x-hidden no-scrollbar pb-24 flex-1">
                {activeTab === 'geral' ? (
                    <div className="grid grid-cols-1 gap-6 animate-in fade-in duration-500">
                        {/* Resumo Anual */}
                        <div className="bg-white dark:bg-dark-surface p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 stagger-card" style={{ animationDelay: '0ms' }}>
                            <div className="flex flex-col items-center text-center">
                                <span className="text-[10px] text-slate-400 dark:text-slate-400 font-black uppercase tracking-[0.2em] mb-1">Saldo Final do Ano</span>
                                <span className={`text-4xl font-black mb-3 ${saldoAnual < 0 ? 'text-red-500' : 'text-slate-900 dark:text-white'}`}>
                                    {formatBalance(saldoAnual)}
                                </span>
                                <div className="flex items-start gap-2 bg-slate-50 dark:bg-dark-bg/50 p-3 rounded-xl border border-slate-100 dark:border-dark-bg">
                                    <InformationCircleIcon className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                                    <p className="text-xs font-bold text-slate-600 dark:text-slate-200 leading-relaxed text-left">
                                        {interpretationText}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-slate-50 dark:border-slate-700/50">
                                <div className="flex flex-col items-center">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <div className="p-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"><ArrowUpIcon className="h-3 w-3" /></div>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Receitas</span>
                                    </div>
                                    <span className="text-base font-bold text-slate-800 dark:text-slate-100">{formatCurrency(totalReceitas)}</span>
                                    {previousYearTotals.receitas > 0 && (
                                        <span className={`text-[9px] font-bold mt-1 px-1.5 py-0.5 rounded ${yoYReceitas.isPositive ? 'bg-emerald-50 text-emerald-500 dark:bg-emerald-900/30' : 'bg-red-50 text-red-500 dark:bg-red-900/30'}`}>
                                            {yoYReceitas.value} vs Ano Ant.
                                        </span>
                                    )}
                                </div>
                                <div className="flex flex-col items-center relative">
                                    <div className="absolute left-0 top-1 bottom-1 w-px bg-slate-100 dark:bg-dark-bg"></div>
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <div className="p-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"><ArrowDownIcon className="h-3 w-3" /></div>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Despesas</span>
                                    </div>
                                    <span className="text-base font-bold text-slate-800 dark:text-slate-100">{formatCurrency(totalDespesas)}</span>
                                    {previousYearTotals.despesas > 0 && (
                                        <span className={`text-[9px] font-bold mt-1 px-1.5 py-0.5 rounded ${yoYDespesas.isPositive ? 'bg-red-50 text-red-500 dark:bg-red-900/30' : 'bg-emerald-50 text-emerald-500 dark:bg-emerald-900/30'}`}>
                                            {yoYDespesas.value} vs Ano Ant.
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-50 dark:border-slate-700/50">
                                <div className="flex flex-col items-center">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Média / Mês</span>
                                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(mediaMensalReceitas)}</span>
                                </div>
                                <div className="flex flex-col items-center relative">
                                    <div className="absolute left-0 top-1 bottom-1 w-px bg-slate-100 dark:bg-dark-bg"></div>
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Média / Mês</span>
                                    <span className="text-sm font-bold text-red-600 dark:text-red-400">{formatCurrency(mediaMensalDespesas)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Insights */}
                        {insights && (
                            <div className="grid grid-cols-1 gap-3 stagger-card" style={{ animationDelay: '100ms' }}>
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Fatos de {selectedYear}</h3>
                                <div className="bg-white dark:bg-dark-surface p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
                                    <div className="h-12 w-12 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                                        <ArrowDownIcon className="h-7 w-7" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">Mês com maior gasto</h4>
                                        <p className="text-xs text-slate-500 font-medium">Em <b>{insights.worstMonth?.name}</b> você gastou {formatCurrency(insights.worstMonth?.Despesas || 0)}</p>
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-dark-surface p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
                                    <div className="h-12 w-12 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                                        <SparklesIcon className="h-7 w-7" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">Mês mais econômico</h4>
                                        <p className="text-xs text-slate-500 font-medium"><b>{insights.bestMonth?.name}</b> teve o melhor saldo: {formatCurrency(insights.bestMonth?.Saldo || 0)}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Evolução */}
                        <div className="bg-white dark:bg-dark-surface p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 stagger-card" style={{ animationDelay: '200ms' }}>
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Evolução</h2>
                                <div className="flex bg-slate-100 dark:bg-dark-bg p-1 rounded-lg">
                                    <button onClick={() => setChartMode('absolute')} className={`px-3 py-1 text-[10px] font-black uppercase rounded-md transition-all ${chartMode === 'absolute' ? 'bg-white dark:bg-dark-surface text-dark-accent shadow-sm' : 'text-slate-400'}`}>Mensal</button>
                                    <button onClick={() => setChartMode('cumulative')} className={`px-3 py-1 text-[10px] font-black uppercase rounded-md transition-all ${chartMode === 'cumulative' ? 'bg-white dark:bg-dark-surface text-dark-accent shadow-sm' : 'text-slate-400'}`}>Acumulado</button>
                                </div>
                            </div>
                            <div className="h-64 w-full -ml-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    {chartMode === 'absolute' ? (
                                        <ComposedChart data={monthlyData}>
                                            <defs>
                                                <linearGradient id="annualGradReceitas" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.12} />
                                                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                                                </linearGradient>
                                                <linearGradient id="annualGradDespesas" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#FF6384" stopOpacity={0.12} />
                                                    <stop offset="95%" stopColor="#FF6384" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                                            <XAxis dataKey="shortName" tick={{ fill: tickColor, fontSize: 10, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                                            <YAxis tickFormatter={axisTickFormatter} tick={{ fill: tickColor, fontSize: 10 }} axisLine={false} tickLine={false} />
                                            <Tooltip content={<AnnualTooltip />} cursor={{ fill: 'rgba(156, 163, 175, 0.08)' }} isAnimationActive={false} />
                                            <Legend iconType="circle" wrapperStyle={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", paddingTop: "10px" }} />
                                            <Area type="monotone" dataKey="Receitas" fill="url(#annualGradReceitas)" stroke="transparent" isAnimationActive={true} animationDuration={1000} animationEasing="ease-out" />
                                            <Area type="monotone" dataKey="Despesas" fill="url(#annualGradDespesas)" stroke="transparent" isAnimationActive={true} animationDuration={1000} animationEasing="ease-out" />
                                            <Line type="monotone" dataKey="Receitas" stroke="#10B981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: theme === 'dark' ? '#1E293B' : '#FFF' }} activeDot={<PulsatingDot fill="#10B981" />} name="Receitas" isAnimationActive={true} animationDuration={1200} animationEasing="ease-out" />
                                            <Line type="monotone" dataKey="Despesas" stroke="#FF6384" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: theme === 'dark' ? '#1E293B' : '#FFF' }} activeDot={<PulsatingDot fill="#FF6384" />} name="Despesas" isAnimationActive={true} animationDuration={1200} animationEasing="ease-out" />
                                        </ComposedChart>
                                    ) : (
                                        <AreaChart data={monthlyData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                                            <XAxis dataKey="shortName" tick={{ fill: tickColor, fontSize: 10, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                                            <YAxis tickFormatter={axisTickFormatter} tick={{ fill: tickColor, fontSize: 10 }} axisLine={false} tickLine={false} />
                                            <Tooltip content={<AnnualTooltip />} cursor={{ fill: 'rgba(156, 163, 175, 0.08)' }} isAnimationActive={false} />
                                            <defs>
                                                <linearGradient id="colorAcum" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor={(() => { const last = monthlyData[monthlyData.length - 1] as any; return last?.Acumulado >= 0 ? '#10B981' : '#EF4444'; })()} stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor={(() => { const last = monthlyData[monthlyData.length - 1] as any; return last?.Acumulado >= 0 ? '#10B981' : '#EF4444'; })()} stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <Area type="monotone" dataKey="Acumulado" stroke={(() => { const last = monthlyData[monthlyData.length - 1] as any; return last?.Acumulado >= 0 ? '#10B981' : '#EF4444'; })()} strokeWidth={3} fillOpacity={1} fill="url(#colorAcum)" name="Saldo Acumulado" isAnimationActive={true} animationDuration={1000} animationEasing="ease-out" />
                                        </AreaChart>
                                    )}
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Categorias (Pizza Refinada) */}
                        <div className="bg-white dark:bg-dark-surface p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 stagger-card" style={{ animationDelay: '300ms' }}>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Gastos por Categoria</h2>
                            <div className="grid grid-cols-1 gap-6 items-center">
                                <div className="h-64 relative">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={annualCategoryData}
                                                dataKey="value"
                                                nameKey="name"
                                                cx="50%"
                                                cy="50%"
                                                innerRadius="72%"
                                                outerRadius="92%"
                                                paddingAngle={4}
                                                cornerRadius={6}
                                                isAnimationActive={true}
                                                animationDuration={1000}
                                                animationEasing="ease-out"
                                                stroke="none"
                                                {...{activeIndex: activeCatIndex, activeShape: renderActiveShape, onMouseEnter: onCatEnter, onMouseLeave: onCatLeave} as any}
                                            >
                                                {annualCategoryData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} style={{ cursor: 'pointer' }} />
                                                ))}
                                            </Pie>
                                            <Tooltip content={<AnnualTooltip />} isAnimationActive={false} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-4 text-center">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Top Gasto</span>
                                        <span className="text-xs font-black text-slate-800 dark:text-white truncate max-w-full">{annualCategoryData[0]?.name}</span>
                                    </div>
                                </div>
                                <div className="space-y-2.5">
                                    {annualCategoryData.map((entry, index) => {
                                        const perc = totalDespesas > 0 ? ((entry.value / totalDespesas) * 100).toFixed(0) : '0';
                                        return (
                                            <div key={`legend-${index}`} className="flex items-center justify-between text-xs font-bold">
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className="h-2.5 w-2.5 rounded-full flex-shrink-0 shadow-sm" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                                    <span className="text-slate-600 dark:text-slate-200 truncate">{entry.name}</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-[9px] font-black bg-slate-50 dark:bg-dark-bg px-2 py-0.5 rounded text-slate-500">{perc}%</span>
                                                    <span className="text-slate-900 dark:text-white tabular-nums">{formatCurrency(entry.value)}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Meios de Pagamento */}
                        <div className="bg-white dark:bg-dark-surface p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 stagger-card" style={{ animationDelay: '400ms' }}>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Meios de Pagamento</h2>
                            <div className="grid grid-cols-1 gap-6 items-center">
                                <div className="h-64 relative">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={paymentMethodsData}
                                                dataKey="value"
                                                nameKey="name"
                                                cx="50%"
                                                cy="50%"
                                                innerRadius="72%"
                                                outerRadius="92%"
                                                paddingAngle={4}
                                                cornerRadius={6}
                                                isAnimationActive={true}
                                                animationDuration={1000}
                                                animationEasing="ease-out"
                                                stroke="none"
                                                {...{activeIndex: activePayIndex, activeShape: renderActiveShape, onMouseEnter: onPayEnter, onMouseLeave: onPayLeave} as any}
                                            >
                                                {paymentMethodsData.map((entry, index) => {
                                                    let color = '#94a3b8';
                                                    if (entry.id === 'credito') color = '#9333EA';
                                                    else if (entry.id === 'debito') color = '#10B981';
                                                    else if (entry.id === 'pix') color = '#06B6D4';
                                                    else if (entry.id === 'dinheiro') color = '#F59E0B';
                                                    return <Cell key={`cell-${index}`} fill={color} style={{ cursor: 'pointer' }} />;
                                                })}
                                            </Pie>
                                            <Tooltip content={<AnnualTooltip />} isAnimationActive={false} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-4 text-center">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Principal</span>
                                        <span className="text-xs font-black text-slate-800 dark:text-white truncate max-w-full">{paymentMethodsData[0]?.name}</span>
                                    </div>
                                </div>
                                <div className="space-y-2.5">
                                    {paymentMethodsData.map((entry, index) => {
                                        const perc = totalDespesas > 0 ? ((entry.value / totalDespesas) * 100).toFixed(0) : '0';
                                        let color = '#94a3b8';
                                        if (entry.id === 'credito') color = '#9333EA';
                                        else if (entry.id === 'debito') color = '#10B981';
                                        else if (entry.id === 'pix') color = '#06B6D4';
                                        else if (entry.id === 'dinheiro') color = '#F59E0B';
                                        return (
                                            <div key={`legend-pay-${index}`} className="flex items-center justify-between text-xs font-bold">
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className="h-2.5 w-2.5 rounded-full flex-shrink-0 shadow-sm" style={{ backgroundColor: color }} />
                                                    <span className="text-slate-600 dark:text-slate-200 truncate">{entry.name}</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-[9px] font-black bg-slate-50 dark:bg-dark-bg px-2 py-0.5 rounded text-slate-500">{perc}%</span>
                                                    <span className="text-slate-900 dark:text-white tabular-nums">{formatCurrency(entry.value)}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* 50/30/20 Anual */}
                        <div className="bg-white dark:bg-dark-surface p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 mb-6 stagger-card" style={{ animationDelay: '500ms' }}>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Regra 50/30/20 Anual</h2>
                            <div className="space-y-5">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs font-bold">
                                        <span className="text-slate-600 dark:text-slate-300">Gastos Fixos (Necessidades)</span>
                                        <span className="text-slate-900 dark:text-white">{annual503020.percentuais['Gastos Fixos'].toFixed(0)}% <span className="text-slate-400 font-medium ml-1">/ 50%</span></span>
                                    </div>
                                    <div className="h-2.5 w-full bg-slate-100 dark:bg-dark-bg rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full ${annual503020.percentuais['Gastos Fixos'] > 50 ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(100, annual503020.percentuais['Gastos Fixos'])}%` }} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs font-bold">
                                        <span className="text-slate-600 dark:text-slate-300">Gastos Variáveis (Desejos)</span>
                                        <span className="text-slate-900 dark:text-white">{annual503020.percentuais['Gastos Variáveis'].toFixed(0)}% <span className="text-slate-400 font-medium ml-1">/ 30%</span></span>
                                    </div>
                                    <div className="h-2.5 w-full bg-slate-100 dark:bg-dark-bg rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full ${annual503020.percentuais['Gastos Variáveis'] > 30 ? 'bg-red-500' : 'bg-purple-500'}`} style={{ width: `${Math.min(100, annual503020.percentuais['Gastos Variáveis'])}%` }} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs font-bold">
                                        <span className="text-slate-600 dark:text-slate-300">Reserva (Economias)</span>
                                        <span className="text-slate-900 dark:text-white">{annual503020.percentuais['Reserva Financeira'].toFixed(0)}% <span className="text-slate-400 font-medium ml-1">/ 20%</span></span>
                                    </div>
                                    <div className="h-2.5 w-full bg-slate-100 dark:bg-dark-bg rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full ${annual503020.percentuais['Reserva Financeira'] < 20 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, annual503020.percentuais['Reserva Financeira'])}%` }} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden animate-in fade-in duration-500">
                        <div className="p-6 border-b border-slate-50 dark:border-slate-800 bg-slate-50/30 dark:bg-dark-surface">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl shadow-sm">
                                    <PiggyBankIcon className="h-8 w-8" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Taxa de Poupança</h2>
                                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Percentual da renda que sobrou</p>
                                </div>
                            </div>

                            <SavingsRateItem label="Consolidado do Ano" income={totalReceitas} saved={saldoAnual} isTotal />
                        </div>

                        <div className="p-6">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Detalhamento por Mês</h3>
                            <div className="space-y-2">
                                {monthlyData.map((month, idx) => (
                                    <SavingsRateItem key={idx} label={month.name} income={month.Receitas} saved={month.Saldo} />
                                ))}
                            </div>
                        </div>
                        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-dark-surface/50">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Destino da Economia</h3>
                            
                            <div className="bg-white dark:bg-dark-bg rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-800 space-y-4">
                                <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Alocado em Metas</span>
                                    <span className="text-sm font-black text-emerald-500">{formatCurrency(metasAllocations.totalAllocated)}</span>
                                </div>
                                
                                {metasAllocations.details.map((meta, idx) => (
                                    <div key={idx} className="flex justify-between items-center text-xs">
                                        <div className="flex items-center gap-2">
                                            <div className="h-2 w-2 rounded-full bg-emerald-400"></div>
                                            <span className="text-slate-600 dark:text-slate-400">{meta.name}</span>
                                        </div>
                                        <span className="font-bold text-slate-700 dark:text-slate-300">{formatCurrency(meta.amount)}</span>
                                    </div>
                                ))}

                                {metasAllocations.details.length === 0 && (
                                    <p className="text-xs text-slate-400 text-center py-2 italic">Nenhum aporte em metas este ano.</p>
                                )}

                                <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-800">
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Sobra Livre em Caixa</span>
                                    <span className="text-sm font-black text-blue-500">{formatCurrency(metasAllocations.freeSavings)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default RelatorioAnual;
