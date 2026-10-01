import React, { useMemo, useContext } from 'react';
import { formatCurrency, getMonthKey, getPreviousBalance, calculateDailyBalancesForMonth, getCorPorCategoria, getTranslatedCategoryName } from '../../../utils/helpers';
import { Transaction, CreditCard, AllData, Budgets } from '../../../types';
import { AppContext } from '../../../context/AppContext';
import { ArrowUpIcon, ArrowDownIcon, AlertTriangleIcon, CalendarIcon, CreditCardIcon, ChartBarIcon, TrendingUpIcon } from '../../icons';
import { useTranslation } from '../../../i18n';
import {
    ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
    CartesianGrid, Tooltip, ComposedChart, Line, Area, Legend
} from 'recharts';

// ==========================================
// HELPERS COMPARTILHADOS
// ==========================================

const useAppLocale = () => {
    const { locale, currency } = useTranslation();
    const appLocale = locale === 'pt' ? 'pt-BR' : locale === 'en' ? 'en-US' : locale === 'es' ? 'es-ES' : locale === 'fr' ? 'fr-FR' : 'de-DE';
    const appCurrency = currency || 'BRL';
    return { appLocale, appCurrency, locale };
};

const PercentageBadge: React.FC<{ current: number; previous: number; invertColors?: boolean }> = ({ current, previous, invertColors }) => {
    if (previous === 0 && current === 0) return <span className="text-[9px] font-bold text-slate-400 bg-slate-100 dark:bg-white/5 px-1.5 py-0.5 rounded-full">—</span>;
    const diff = previous > 0 ? ((current - previous) / previous) * 100 : (current > 0 ? 100 : 0);
    const isUp = diff > 0;
    const colorUp = invertColors ? 'text-rose-500 bg-rose-50 dark:bg-rose-950/30' : 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30';
    const colorDown = invertColors ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30' : 'text-rose-500 bg-rose-50 dark:bg-rose-950/30';
    return (
        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5 ${isUp ? colorUp : colorDown}`}>
            {isUp ? '▲' : '▼'} {Math.abs(diff).toFixed(0)}%
        </span>
    );
};

// ==========================================
// 1. FINANCIAL HEALTH SCORE
// ==========================================

export const FinancialHealthScore: React.FC<{
    totalReceitas: number;
    totalDespesas: number;
    budgets: Budgets;
    despesasPorCategoria: { name: string; value: number }[];
    creditCards: CreditCard[];
    allTransactions: Transaction[];
    currentDate: Date;
    streak: number;
}> = ({ totalReceitas, totalDespesas, budgets, despesasPorCategoria, creditCards, allTransactions, currentDate, streak }) => {
    const { appLocale, appCurrency } = useAppLocale();

    const { score, label, color, breakdown } = useMemo(() => {
        // 1. Taxa de poupança (40 pts)
        let savingsScore = 0;
        if (totalReceitas > 0) {
            const rate = ((totalReceitas - totalDespesas) / totalReceitas) * 100;
            savingsScore = Math.min(40, Math.max(0, rate * 2)); // 20% = 40 pts
        }

        // 2. Orçamento (30 pts)
        let budgetScore = 30;
        const budgetEntries = Object.entries(budgets);
        if (budgetEntries.length > 0) {
            let overCount = 0;
            budgetEntries.forEach(([cat, limit]) => {
                const spent = despesasPorCategoria.find(d => d.name === cat)?.value || 0;
                if (spent > (limit as number)) overCount++;
            });
            const overRate = overCount / budgetEntries.length;
            budgetScore = Math.round(30 * (1 - overRate));
        }

        // 3. Uso de crédito (20 pts)
        let creditScore = 20;
        if (creditCards.length > 0) {
            const monthKey = getMonthKey(currentDate);
            const totalUsed = allTransactions.filter(t => t.cardId && t.statementDate && t.statementDate >= monthKey && t.tipo === 'saida').reduce((s, t) => s + t.valor, 0);
            const totalLimit = creditCards.reduce((s, c) => s + c.limit, 0);
            if (totalLimit > 0) {
                const usage = totalUsed / totalLimit;
                creditScore = usage > 0.7 ? 5 : usage > 0.5 ? 10 : usage > 0.3 ? 15 : 20;
            }
        }

        // 4. Consistência (10 pts)
        const streakScore = Math.min(10, streak);

        const total = Math.round(savingsScore + budgetScore + creditScore + streakScore);
        const clampedTotal = Math.min(100, Math.max(0, total));

        let lbl = 'Crítico';
        let clr = '#EF4444';
        if (clampedTotal >= 80) { lbl = 'Excelente'; clr = '#10B981'; }
        else if (clampedTotal >= 60) { lbl = 'Bom'; clr = '#3B82F6'; }
        else if (clampedTotal >= 40) { lbl = 'Atenção'; clr = '#F59E0B'; }

        return {
            score: clampedTotal,
            label: lbl,
            color: clr,
            breakdown: {
                savings: Math.round(savingsScore),
                budget: budgetScore,
                credit: creditScore,
                streak: streakScore
            }
        };
    }, [totalReceitas, totalDespesas, budgets, despesasPorCategoria, creditCards, allTransactions, currentDate, streak]);

    const safeScore = Math.max(0, Math.min(score, 100));

    return (
        <div className="flex flex-col items-center gap-4">
            {/* Gauge */}
            <div className="relative h-36 w-36">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={[
                                { name: 'Score', value: safeScore },
                                { name: 'Remaining', value: 100 - safeScore }
                            ]}
                            cx="50%" cy="50%"
                            innerRadius="70%" outerRadius="95%"
                            startAngle={225} endAngle={-45}
                            paddingAngle={0} dataKey="value" stroke="none"
                            isAnimationActive animationDuration={1200} animationEasing="ease-out"
                        >
                            <Cell fill={color} />
                            <Cell fill="currentColor" className="text-slate-100 dark:text-slate-800" />
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-black text-light-text dark:text-dark-text">{score}</span>
                    <span className="text-[9px] font-black uppercase tracking-widest mt-0.5" style={{ color }}>{label}</span>
                </div>
            </div>

            {/* Breakdown */}
            <div className="w-full grid grid-cols-2 gap-2">
                {[
                    { label: 'Poupança', value: breakdown.savings, max: 40, icon: '💰' },
                    { label: 'Orçamento', value: breakdown.budget, max: 30, icon: '🎯' },
                    { label: 'Crédito', value: breakdown.credit, max: 20, icon: '💳' },
                    { label: 'Consistência', value: breakdown.streak, max: 10, icon: '🔥' },
                ].map(item => (
                    <div key={item.label} className="bg-slate-50 dark:bg-dark-surface/40 p-2.5 rounded-xl border border-light-border dark:border-dark-elevated/50">
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{item.icon} {item.label}</span>
                            <span className="text-[10px] font-black text-light-text dark:text-dark-text">{item.value}/{item.max}</span>
                        </div>
                        <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(item.value / item.max) * 100}%`, backgroundColor: color }} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ==========================================
// 2. MONTHLY COMPARISON
// ==========================================

export const MonthlyComparison: React.FC<{
    totalReceitas: number;
    totalDespesas: number;
    saldoPrevisto: number;
    allData: AllData;
    currentDate: Date;
}> = ({ totalReceitas, totalDespesas, saldoPrevisto, allData, currentDate }) => {
    const { appLocale, appCurrency } = useAppLocale();

    const prev = useMemo(() => {
        const prevDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
        const prevKey = getMonthKey(prevDate);
        const prevTxs = allData[prevKey]?.transactions || [];
        let rec = 0, desp = 0;
        for (const tx of prevTxs) {
            if (tx.tipo === 'entrada') {
                if (tx.paymentMethod === 'credito') desp -= tx.valor;
                else rec += tx.valor;
            } else {
                desp += tx.valor;
            }
        }
        const prevBalance = getPreviousBalance(prevKey, allData);
        return { receitas: rec, despesas: desp, saldo: prevBalance + rec - desp };
    }, [allData, currentDate]);

    const items = [
        { label: 'Receitas', current: totalReceitas, previous: prev.receitas, icon: <ArrowUpIcon className="h-3.5 w-3.5" />, iconBg: 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' },
        { label: 'Despesas', current: totalDespesas, previous: prev.despesas, icon: <ArrowDownIcon className="h-3.5 w-3.5" />, iconBg: 'bg-rose-100 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400', invertColors: true },
        { label: 'Saldo Previsto', current: saldoPrevisto, previous: prev.saldo, icon: <TrendingUpIcon className="h-3.5 w-3.5" />, iconBg: 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' },
    ];

    return (
        <div className="space-y-3">
            {items.map(item => (
                <div key={item.label} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-dark-surface/40 rounded-xl border border-light-border dark:border-dark-elevated/50">
                    <div className="flex items-center gap-2.5">
                        <div className={`p-1.5 rounded-lg ${item.iconBg}`}>{item.icon}</div>
                        <div>
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">{item.label}</span>
                            <span className="text-sm font-black text-light-text dark:text-dark-text">
                                {formatCurrency(item.current, appLocale, appCurrency)}
                            </span>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        <PercentageBadge current={item.current} previous={item.previous} invertColors={item.invertColors} />
                        <span className="text-[9px] text-slate-400 font-medium">
                            ant: {formatCurrency(item.previous, appLocale, appCurrency)}
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );
};

// ==========================================
// 3. SMART ALERTS
// ==========================================

export const SmartAlerts: React.FC<{
    totalReceitas: number;
    totalDespesas: number;
    allData: AllData;
    currentDate: Date;
    budgets: Budgets;
    despesasPorCategoria: { name: string; value: number }[];
    creditCards: CreditCard[];
    allTransactions: Transaction[];
}> = ({ totalReceitas, totalDespesas, allData, currentDate, budgets, despesasPorCategoria, creditCards, allTransactions }) => {
    const { appLocale, appCurrency } = useAppLocale();

    const alerts = useMemo(() => {
        const list: { type: 'warning' | 'danger' | 'info'; message: string }[] = [];

        // 1. Taxa de poupança baixa
        if (totalReceitas > 0) {
            const rate = ((totalReceitas - totalDespesas) / totalReceitas) * 100;
            if (rate < 0) list.push({ type: 'danger', message: `Gastos ultrapassaram receitas em ${formatCurrency(Math.abs(totalReceitas - totalDespesas), appLocale, appCurrency)}` });
            else if (rate < 10) list.push({ type: 'warning', message: `Taxa de poupança em apenas ${rate.toFixed(0)}%. Tente chegar a 20%.` });
        }

        // 2. Categorias acima do orçamento
        Object.entries(budgets).forEach(([cat, limit]) => {
            const spent = despesasPorCategoria.find(d => d.name === cat)?.value || 0;
            if (spent > (limit as number)) {
                const over = spent - (limit as number);
                list.push({ type: 'danger', message: `${cat} estourou o orçamento em ${formatCurrency(over, appLocale, appCurrency)}` });
            } else if (spent > (limit as number) * 0.9) {
                list.push({ type: 'warning', message: `${cat} está em ${((spent / (limit as number)) * 100).toFixed(0)}% do orçamento` });
            }
        });

        // 3. Comparativo com mês anterior por categoria
        const prevDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
        const prevKey = getMonthKey(prevDate);
        const prevTxs = allData[prevKey]?.transactions || [];
        const prevCatMap: Record<string, number> = {};
        prevTxs.forEach(tx => { if (tx.tipo === 'saida') prevCatMap[tx.categoria] = (prevCatMap[tx.categoria] || 0) + tx.valor; });

        despesasPorCategoria.forEach(cat => {
            const prev = prevCatMap[cat.name] || 0;
            if (prev > 0 && cat.value > prev * 1.3) {
                const pct = (((cat.value - prev) / prev) * 100).toFixed(0);
                list.push({ type: 'warning', message: `${cat.name} está ${pct}% acima do mês anterior` });
            }
        });

        // 4. Faturas próximas do vencimento
        const today = new Date();
        creditCards.forEach(card => {
            const dueDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), card.dueDay);
            const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            if (daysUntil > 0 && daysUntil <= 5) {
                list.push({ type: 'info', message: `Fatura do ${card.name} vence em ${daysUntil} dia${daysUntil > 1 ? 's' : ''}` });
            }
        });

        // 5. Projeção de fim de mês negativa
        const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
        const currentDay = today.getMonth() === currentDate.getMonth() && today.getFullYear() === currentDate.getFullYear() ? today.getDate() : daysInMonth;
        if (currentDay > 0 && currentDay < daysInMonth) {
            const dailyRate = totalDespesas / currentDay;
            const projected = dailyRate * daysInMonth;
            if (projected > totalReceitas * 1.1) {
                list.push({ type: 'warning', message: `No ritmo atual, despesas podem chegar a ${formatCurrency(projected, appLocale, appCurrency)} no fim do mês` });
            }
        }

        return list.slice(0, 4);
    }, [totalReceitas, totalDespesas, allData, currentDate, budgets, despesasPorCategoria, creditCards, appLocale, appCurrency]);

    if (alerts.length === 0) {
        return (
            <div className="text-center py-6">
                <span className="text-2xl mb-2 block">✅</span>
                <p className="text-sm font-bold text-light-text dark:text-dark-text">Tudo sob controle!</p>
                <p className="text-xs text-slate-500 mt-1">Nenhum alerta no momento</p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {alerts.map((alert, i) => (
                <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${
                    alert.type === 'danger' ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50' :
                    alert.type === 'warning' ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50' :
                    'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50'
                }`}>
                    <span className="text-sm mt-0.5">{alert.type === 'danger' ? '🔴' : alert.type === 'warning' ? '🟡' : '🔵'}</span>
                    <p className={`text-xs font-semibold leading-relaxed ${
                        alert.type === 'danger' ? 'text-rose-700 dark:text-rose-300' :
                        alert.type === 'warning' ? 'text-amber-700 dark:text-amber-300' :
                        'text-blue-700 dark:text-blue-300'
                    }`}>{alert.message}</p>
                </div>
            ))}
        </div>
    );
};

// ==========================================
// 4. DAILY CASH FLOW
// ==========================================

export const DailyCashFlow: React.FC<{
    filteredData: Transaction[];
    currentDate: Date;
    previousBalance: number;
    theme: string;
}> = ({ filteredData, currentDate, previousBalance, theme }) => {
    const { appLocale, appCurrency } = useAppLocale();
    const tickColor = theme === 'light' ? '#475569' : '#94a3b8';
    const gridColor = theme === 'light' ? '#e2e8f0' : '#374151';

    const chartData = useMemo(() => {
        const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
        const days: { day: number; Entradas: number; Saidas: number; Saldo: number }[] = [];
        let running = previousBalance;

        for (let d = 1; d <= daysInMonth; d++) {
            let entradas = 0, saidas = 0;
            filteredData.forEach(tx => {
                const txDay = parseInt(tx.data.split('-')[2], 10);
                if (txDay === d) {
                    if (tx.tipo === 'entrada' && tx.paymentMethod !== 'credito') entradas += tx.valor;
                    else if (tx.tipo === 'saida') saidas += tx.valor;
                    else if (tx.tipo === 'entrada' && tx.paymentMethod === 'credito') saidas -= tx.valor;
                }
            });
            running += entradas - saidas;
            days.push({ day: d, Entradas: entradas, Saidas: saidas, Saldo: running });
        }
        return days;
    }, [filteredData, currentDate, previousBalance]);

    return (
        <div className="h-64 -ml-4">
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData}>
                    <defs>
                        <linearGradient id="colorSaldoDaily" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1} />
                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                    <XAxis dataKey="day" tick={{ fill: tickColor, fontSize: 9, fontWeight: 'bold' }} axisLine={false} tickLine={false} interval={4} />
                    <YAxis tick={{ fill: tickColor, fontSize: 9 }} axisLine={false} tickLine={false}
                        tickFormatter={(v: number) => new Intl.NumberFormat(appLocale, { style: 'currency', currency: appCurrency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v)} />
                    <Tooltip
                        content={({ active, payload }: any) => {
                            if (!active || !payload?.length) return null;
                            const d = payload[0].payload;
                            return (
                                <div className="bg-white/95 dark:bg-dark-surface/95 backdrop-blur-md p-3 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Dia {d.day}</p>
                                    {d.Entradas > 0 && <p className="text-xs font-bold text-emerald-600">Entradas: {formatCurrency(d.Entradas, appLocale, appCurrency)}</p>}
                                    {d.Saidas > 0 && <p className="text-xs font-bold text-rose-500">Saídas: {formatCurrency(d.Saidas, appLocale, appCurrency)}</p>}
                                    <p className="text-xs font-bold text-blue-600 mt-1 pt-1 border-t border-slate-200 dark:border-slate-700">Saldo: {formatCurrency(d.Saldo, appLocale, appCurrency)}</p>
                                </div>
                            );
                        }}
                        cursor={false}
                    />
                    <Legend wrapperStyle={{ fontSize: "9px", fontWeight: "bold", textTransform: "uppercase", paddingTop: "16px" }} iconType="circle" />
                    <Area type="monotone" dataKey="Saldo" fill="url(#colorSaldoDaily)" stroke="transparent" legendType="none" name="_area" />
                    <Bar dataKey="Entradas" fill="#10B981" name="Entradas" radius={[3, 3, 0, 0]} barSize={6} />
                    <Bar dataKey="Saidas" fill="#FF6384" name="Saídas" radius={[3, 3, 0, 0]} barSize={6} />
                    <Line type="monotone" dataKey="Saldo" stroke="#3B82F6" strokeWidth={2} dot={false} name="Saldo" />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
};

// ==========================================
// 5. FIXED VS VARIABLE
// ==========================================

export const FixedVsVariable: React.FC<{
    filteredData: Transaction[];
}> = ({ filteredData }) => {
    const { appLocale, appCurrency } = useAppLocale();

    const { fixed, variable, total } = useMemo(() => {
        let f = 0, v = 0;
        filteredData.forEach(tx => {
            if (tx.tipo !== 'saida') return;
            if (tx.isRecurring || tx.recurrenceId) f += tx.valor;
            else v += tx.valor;
        });
        return { fixed: f, variable: v, total: f + v };
    }, [filteredData]);

    const fixedPct = total > 0 ? (fixed / total) * 100 : 0;
    const varPct = total > 0 ? (variable / total) * 100 : 0;

    return (
        <div className="space-y-4">
            {/* Barra de proporção */}
            <div className="h-3 w-full bg-slate-100 dark:bg-dark-bg rounded-full overflow-hidden flex">
                <div className="h-full bg-blue-500 transition-all duration-700" style={{ width: `${fixedPct}%` }} />
                <div className="h-full bg-amber-500 transition-all duration-700" style={{ width: `${varPct}%` }} />
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 bg-blue-50 dark:bg-blue-950/20 rounded-xl border border-blue-100 dark:border-blue-900/30">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                        <span className="text-[10px] font-black text-blue-700 dark:text-blue-300 uppercase tracking-wider">Fixos / Recorrentes</span>
                    </div>
                    <p className="text-lg font-black text-blue-900 dark:text-blue-100">{formatCurrency(fixed, appLocale, appCurrency)}</p>
                    <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 mt-0.5">{fixedPct.toFixed(0)}% do total</p>
                </div>
                <div className="p-3.5 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-100 dark:border-amber-900/30">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                        <span className="text-[10px] font-black text-amber-700 dark:text-amber-300 uppercase tracking-wider">Variáveis / Avulsos</span>
                    </div>
                    <p className="text-lg font-black text-amber-900 dark:text-amber-100">{formatCurrency(variable, appLocale, appCurrency)}</p>
                    <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 mt-0.5">{varPct.toFixed(0)}% do total</p>
                </div>
            </div>
        </div>
    );
};

// ==========================================
// 6. TOP CATEGORIES RANKING
// ==========================================

export const TopCategoriesRanking: React.FC<{
    despesasPorCategoria: { name: string; value: number }[];
    totalDespesas: number;
    allData: AllData;
    currentDate: Date;
    categoryColors: Record<string, string>;
}> = ({ despesasPorCategoria, totalDespesas, allData, currentDate, categoryColors }) => {
    const { appLocale, appCurrency } = useAppLocale();
    const { t } = useTranslation();

    const ranked = useMemo(() => {
        const prevDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
        const prevKey = getMonthKey(prevDate);
        const prevTxs = allData[prevKey]?.transactions || [];
        const prevMap: Record<string, number> = {};
        prevTxs.forEach(tx => { if (tx.tipo === 'saida') prevMap[tx.categoria] = (prevMap[tx.categoria] || 0) + tx.valor; });

        return despesasPorCategoria.slice(0, 5).map(cat => ({
            ...cat,
            previous: prevMap[cat.name] || 0,
            percentage: totalDespesas > 0 ? (cat.value / totalDespesas) * 100 : 0,
            color: getCorPorCategoria(cat.name, categoryColors)
        }));
    }, [despesasPorCategoria, totalDespesas, allData, currentDate, categoryColors]);

    const maxValue = ranked.length > 0 ? ranked[0].value : 1;

    return (
        <div className="space-y-3">
            {ranked.map((cat, i) => (
                <div key={cat.name} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <span className="text-[10px] font-black text-slate-400 w-4 text-right">{i + 1}.</span>
                            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                            <span className="text-xs font-bold text-light-text dark:text-dark-text">{getTranslatedCategoryName(cat.name, t)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <PercentageBadge current={cat.value} previous={cat.previous} invertColors />
                            <span className="text-xs font-black text-light-text dark:text-dark-text tabular-nums">{formatCurrency(cat.value, appLocale, appCurrency)}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 pl-[26px]">
                        <div className="flex-1 h-2 bg-slate-100 dark:bg-dark-bg rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(cat.value / maxValue) * 100}%`, backgroundColor: cat.color }} />
                        </div>
                        <span className="text-[9px] font-bold text-slate-400 w-8 text-right">{cat.percentage.toFixed(0)}%</span>
                    </div>
                </div>
            ))}
        </div>
    );
};

// ==========================================
// 7. END OF MONTH FORECAST
// ==========================================

export const EndOfMonthForecast: React.FC<{
    totalReceitas: number;
    totalDespesas: number;
    currentDate: Date;
    saldoPrevisto: number;
}> = ({ totalReceitas, totalDespesas, currentDate, saldoPrevisto }) => {
    const { appLocale, appCurrency } = useAppLocale();

    const forecast = useMemo(() => {
        const today = new Date();
        const isCurrentMonth = currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear();
        const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
        const currentDay = isCurrentMonth ? today.getDate() : daysInMonth;

        const dailyRate = currentDay > 0 ? totalDespesas / currentDay : 0;
        const projectedExpenses = dailyRate * daysInMonth;
        const projectedBalance = totalReceitas - projectedExpenses;
        const monthProgress = (currentDay / daysInMonth) * 100;
        const budgetUsed = totalReceitas > 0 ? (totalDespesas / totalReceitas) * 100 : 0;

        return { dailyRate, projectedExpenses, projectedBalance, monthProgress, budgetUsed, currentDay, daysInMonth, isCurrentMonth };
    }, [totalReceitas, totalDespesas, currentDate]);

    const isOverBudget = forecast.projectedExpenses > totalReceitas;

    return (
        <div className="space-y-4">
            {/* Termômetro do mês */}
            <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Progresso do Mês</span>
                    <span className="text-[10px] font-bold text-slate-500">Dia {forecast.currentDay} de {forecast.daysInMonth}</span>
                </div>
                <div className="h-3 bg-slate-100 dark:bg-dark-bg rounded-full overflow-hidden relative border border-light-border dark:border-dark-elevated">
                    <div className="h-full bg-blue-500 rounded-full transition-all duration-700" style={{ width: `${forecast.monthProgress}%` }} />
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Orçamento Consumido</span>
                    <span className={`text-[10px] font-black ${forecast.budgetUsed > 100 ? 'text-rose-500' : forecast.budgetUsed > 80 ? 'text-amber-500' : 'text-emerald-500'}`}>
                        {forecast.budgetUsed.toFixed(0)}%
                    </span>
                </div>
                <div className={`h-3 rounded-full overflow-hidden border ${isOverBudget ? 'bg-rose-100 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800' : 'bg-slate-100 dark:bg-dark-bg border-light-border dark:border-dark-elevated'}`}>
                    <div className={`h-full rounded-full transition-all duration-700 ${forecast.budgetUsed > 100 ? 'bg-rose-500' : forecast.budgetUsed > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                        style={{ width: `${Math.min(forecast.budgetUsed, 100)}%` }} />
                </div>
            </div>

            {/* Projeções */}
            <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 bg-slate-50 dark:bg-dark-surface/40 rounded-xl border border-light-border dark:border-dark-elevated/50">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block mb-1">Gasto Diário Médio</span>
                    <span className="text-base font-black text-light-text dark:text-dark-text">{formatCurrency(forecast.dailyRate, appLocale, appCurrency)}</span>
                </div>
                <div className={`p-3.5 rounded-xl border ${isOverBudget ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/50' : 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/50'}`}>
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block mb-1">Saldo Projetado</span>
                    <span className={`text-base font-black ${isOverBudget ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {formatCurrency(forecast.projectedBalance, appLocale, appCurrency)}
                    </span>
                </div>
            </div>

            {isOverBudget && forecast.isCurrentMonth && (
                <div className="flex items-start gap-2.5 p-3 bg-rose-50 dark:bg-rose-950/20 rounded-xl border border-rose-200 dark:border-rose-800/50">
                    <AlertTriangleIcon className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                    <p className="text-[11px] font-semibold text-rose-700 dark:text-rose-300 leading-relaxed">
                        No ritmo atual, as despesas devem chegar a {formatCurrency(forecast.projectedExpenses, appLocale, appCurrency)}, superando as receitas.
                    </p>
                </div>
            )}
        </div>
    );
};

// ==========================================
// 8. SPENDING PACE (Ritmo de Gastos)
// ==========================================

export const SpendingPace: React.FC<{
    filteredData: Transaction[];
    allData: AllData;
    currentDate: Date;
    theme: string;
}> = ({ filteredData, allData, currentDate, theme }) => {
    const { appLocale, appCurrency } = useAppLocale();
    const tickColor = theme === 'light' ? '#475569' : '#94a3b8';
    const gridColor = theme === 'light' ? '#e2e8f0' : '#374151';

    const chartData = useMemo(() => {
        const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
        const prevDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
        const prevKey = getMonthKey(prevDate);
        const prevTxs = allData[prevKey]?.transactions || [];

        const data: { day: number; Atual: number; Anterior: number }[] = [];
        let accCurrent = 0, accPrev = 0;

        for (let d = 1; d <= daysInMonth; d++) {
            filteredData.forEach(tx => {
                if (tx.tipo === 'saida' && parseInt(tx.data.split('-')[2], 10) === d) accCurrent += tx.valor;
            });
            prevTxs.forEach(tx => {
                if (tx.tipo === 'saida' && parseInt(tx.data.split('-')[2], 10) === d) accPrev += tx.valor;
            });
            data.push({ day: d, Atual: accCurrent, Anterior: accPrev });
        }
        return data;
    }, [filteredData, allData, currentDate]);

    return (
        <div className="h-56 -ml-4">
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                    <XAxis dataKey="day" tick={{ fill: tickColor, fontSize: 9, fontWeight: 'bold' }} axisLine={false} tickLine={false} interval={4} />
                    <YAxis tick={{ fill: tickColor, fontSize: 9 }} axisLine={false} tickLine={false}
                        tickFormatter={(v: number) => new Intl.NumberFormat(appLocale, { style: 'currency', currency: appCurrency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v)} />
                    <Tooltip
                        content={({ active, payload }: any) => {
                            if (!active || !payload?.length) return null;
                            const d = payload[0].payload;
                            return (
                                <div className="bg-white/95 dark:bg-dark-surface/95 backdrop-blur-md p-3 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Dia {d.day}</p>
                                    <p className="text-xs font-bold text-rose-500">Mês Atual: {formatCurrency(d.Atual, appLocale, appCurrency)}</p>
                                    <p className="text-xs font-bold text-slate-400">Mês Anterior: {formatCurrency(d.Anterior, appLocale, appCurrency)}</p>
                                </div>
                            );
                        }}
                        cursor={false}
                    />
                    <Legend wrapperStyle={{ fontSize: "9px", fontWeight: "bold", textTransform: "uppercase", paddingTop: "16px" }} iconType="circle" />
                    <Area type="monotone" dataKey="Atual" fill="#FF638420" stroke="transparent" legendType="none" name="_area" />
                    <Line type="monotone" dataKey="Atual" stroke="#FF6384" strokeWidth={2.5} dot={false} name="Mês Atual" />
                    <Line type="monotone" dataKey="Anterior" stroke="#94A3B8" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Mês Anterior" />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
};

// ==========================================
// 9. SAVINGS RATE HISTORY
// ==========================================

export const SavingsRateHistory: React.FC<{
    allData: AllData;
    currentDate: Date;
    theme: string;
}> = ({ allData, currentDate, theme }) => {
    const { appLocale, locale } = useAppLocale();
    const tickColor = theme === 'light' ? '#475569' : '#94a3b8';

    const chartData = useMemo(() => {
        const months: string[] = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const data: { name: string; rate: number; color: string }[] = [];

        for (let i = 5; i >= 0; i--) {
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
            const key = getMonthKey(date);
            const txs = allData[key]?.transactions || [];
            let rec = 0, desp = 0;
            txs.forEach(tx => {
                if (tx.tipo === 'entrada' && tx.paymentMethod !== 'credito') rec += tx.valor;
                else if (tx.tipo === 'saida') desp += tx.valor;
                else if (tx.tipo === 'entrada' && tx.paymentMethod === 'credito') desp -= tx.valor;
            });
            const rate = rec > 0 ? ((rec - desp) / rec) * 100 : (desp > 0 ? -10 : 0);
            const color = rate >= 20 ? '#10B981' : rate >= 0 ? '#F59E0B' : '#EF4444';
            data.push({ name: months[date.getMonth()], rate: Math.round(rate), color });
        }
        return data;
    }, [allData, currentDate]);

    return (
        <div className="space-y-3">
            <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                        <XAxis dataKey="name" tick={{ fill: tickColor, fontSize: 10, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: tickColor, fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}%`} />
                        <Tooltip
                            content={({ active, payload }: any) => {
                                if (!active || !payload?.length) return null;
                                return (
                                    <div className="bg-white/95 dark:bg-dark-surface/95 backdrop-blur-md p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xl">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{payload[0].payload.name}</p>
                                        <p className="text-sm font-black" style={{ color: payload[0].payload.color }}>{payload[0].payload.rate}%</p>
                                    </div>
                                );
                            }}
                            cursor={false}
                        />
                        <Bar dataKey="rate" radius={[4, 4, 0, 0]} barSize={30} isAnimationActive animationDuration={800} animationEasing="ease-out">
                            {chartData.map((entry, i) => (
                                <Cell key={i} fill={entry.color} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-4 text-[9px] font-bold text-slate-500">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />≥ 20% Ideal</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" />0-20% Atenção</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500" />&lt; 0% Crítico</span>
            </div>
        </div>
    );
};
