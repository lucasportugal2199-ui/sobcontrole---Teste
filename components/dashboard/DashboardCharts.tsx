
import React, { useState, useCallback, useMemo } from 'react';
import {
    PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid,
    ComposedChart, Line, Area, ReferenceLine, LabelList, Sector
} from 'recharts';
import { formatCurrency, getCorPorCategoria, getTranslatedCategoryName } from '../../utils/helpers';
import { useTranslation } from '../../i18n';

// --- Dot Pulsante para ActiveDot ---
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

// --- ActiveShape para PieChart interativo (sutil) ---
const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    return (
        <g>
            <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 4} startAngle={startAngle} endAngle={endAngle} fill={fill} />
        </g>
    );
};

// --- Componentes Auxiliares ---

const CustomTooltip = ({ active, payload, label, type, totalReceitas, totalDespesas }: any) => {
    const { t, locale, currency } = useTranslation();
    const appLocale = locale === 'pt' ? 'pt-BR' : locale === 'en' ? 'en-US' : locale === 'es' ? 'es-ES' : locale === 'fr' ? 'fr-FR' : 'de-DE';
    const appCurrency = currency || 'BRL';

    if (active && payload && payload.length) {
        const data = payload[0].payload;

        let total = 0;
        if (type === 'receitas') total = totalReceitas;
        else if (type === 'despesas') total = totalDespesas;
        else if (type === 'recurring') total = totalDespesas;
        else if (type === 'payment') total = totalDespesas;

        const percentage = total > 0 && data.value ? ((data.value / total) * 100).toFixed(0) : '0';

        // Determina se é gráfico Mensal (Trends) ou Gráfico Diário (Daily)
        const isMonthlyTrend = data.Receitas !== undefined;
        const isDailyChart = data.day !== undefined && data.value !== undefined;

        if (isMonthlyTrend) {
            return (
                <div className="bg-white/95 dark:bg-dark-surface/95 backdrop-blur-md p-3 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200">
                    <p className="label text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{label || data.name}</p>
                    <div className="space-y-1">
                        <p className="text-sm font-bold flex justify-between gap-4" style={{ color: '#10B981' }}>
                            <span>{t('dashboard.income')}:</span> <span>{formatCurrency(data.Receitas || 0, appLocale, appCurrency)}</span>
                        </p>
                        <p className="text-sm font-bold flex justify-between gap-4" style={{ color: '#FF6384' }}>
                            <span>{t('dashboard.expenses')}:</span> <span>{formatCurrency(data.Despesas || 0, appLocale, appCurrency)}</span>
                        </p>
                        <p className="text-sm font-bold flex justify-between gap-4 mt-2 pt-1 border-t border-light-border dark:border-dark-elevated" style={{ color: data.SaldoPrevisto !== undefined && data.Saldo === undefined ? '#94A3B8' : '#3B82F6' }}>
                            <span>{t('dashboard.balance')}:</span> <span>{formatCurrency(data.Saldo !== undefined ? data.Saldo : (data.SaldoPrevisto || 0), appLocale, appCurrency)}</span>
                        </p>
                    </div>
                </div>
            );
        }

        if (isDailyChart) {
            return (
                <div className="bg-white/95 dark:bg-dark-surface/95 backdrop-blur-md p-3 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200">
                    <p className="label text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{t('common.day')} {label || data.day}</p>
                    <div className="space-y-1">
                        {data.value !== undefined && (
                            <p className="text-sm font-bold flex justify-between gap-4" style={{ color: '#FF6384' }}>
                                <span>{t('dashboard.expenses')}:</span> <span>{formatCurrency(data.value, appLocale, appCurrency)}</span>
                            </p>
                        )}
                        {data.SaldoRealizado !== undefined && (
                            <p className="text-sm font-bold flex justify-between gap-4" style={{ color: '#3B82F6' }}>
                                <span>{t('dashboard.balance')}:</span> <span>{formatCurrency(data.SaldoRealizado, appLocale, appCurrency)}</span>
                            </p>
                        )}
                        {data.SaldoPrevisto !== undefined && data.SaldoRealizado === undefined && (
                            <p className="text-sm font-bold flex justify-between gap-4" style={{ color: '#94A3B8' }}>
                                <span>{t('horizon.projected')}:</span> <span>{formatCurrency(data.SaldoPrevisto, appLocale, appCurrency)}</span>
                            </p>
                        )}
                    </div>
                </div>
            );
        }

        // Gráficos de Pizza/Barras (Categorias/Métodos de Pagamento)
        return (
            <div className="bg-white/95 dark:bg-dark-surface/95 backdrop-blur-md p-3 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200">
                <p className="label text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{getTranslatedCategoryName(label || data.name, t)}</p>
                <p className="text-sm font-black flex items-center gap-2" style={{ color: payload[0]?.fill || '#FF6384' }}>
                    <span>{formatCurrency(data.value || 0, appLocale, appCurrency)}</span>
                    <span className="text-[10px] bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded-md font-black">{percentage}%</span>
                </p>
            </div>
        );
    }
    return null;
};

// --- Widgets Exportados ---

export const TrendsWidget: React.FC<{
    data: any[];
    theme: string;
}> = ({ data, theme }) => {
    const { t, locale, currency } = useTranslation();
    const appLocale = locale === 'pt' ? 'pt-BR' : locale === 'en' ? 'en-US' : locale === 'es' ? 'es-ES' : locale === 'fr' ? 'fr-FR' : 'de-DE';
    const appCurrency = currency || 'BRL';
    const tickColor = theme === 'light' ? '#475569' : '#94a3b8';
    const gridColor = theme === 'light' ? '#e2e8f0' : '#374151';

    const axisTickFormatter = (value: number) => {
        if (typeof value !== 'number') return value;
        return new Intl.NumberFormat(appLocale, {
            style: 'currency',
            currency: appCurrency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    return (
        <div className="h-64 md:h-72 -ml-4">
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data}>
                    <defs>
                        <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1} />
                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: tickColor, fontSize: 10, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={axisTickFormatter} tick={{ fill: tickColor, fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={false} isAnimationActive={false} />
                    <Legend wrapperStyle={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", paddingTop: "20px" }} iconType="circle" />

                    <Area type="monotone" dataKey="Saldo" fill="url(#colorSaldo)" stroke="transparent" isAnimationActive={true} animationDuration={1000} animationEasing="ease-out" />
                    <Bar dataKey="Receitas" fill="#10B981" name={t('dashboard.income')} radius={[4, 4, 0, 0]} barSize={20} isAnimationActive={true} animationDuration={800} animationEasing="ease-out" />
                    <Bar dataKey="Despesas" fill="#FF6384" name={t('dashboard.expenses')} radius={[4, 4, 0, 0]} barSize={20} isAnimationActive={true} animationDuration={800} animationEasing="ease-out" />
                    <Line type="monotone" dataKey="Saldo" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4, fill: '#3B82F6', strokeWidth: 2, stroke: '#fff' }} activeDot={<PulsatingDot fill="#3B82F6" />} name={t('dashboard.balance')} isAnimationActive={true} animationDuration={1200} animationEasing="ease-out" />
                    <Line type="monotone" dataKey="SaldoPrevisto" stroke="#94A3B8" strokeWidth={3} strokeDasharray="5 5" dot={{ r: 4, fill: '#94A3B8', strokeWidth: 2, stroke: '#fff' }} activeDot={<PulsatingDot fill="#94A3B8" />} name={t('horizon.projected')} isAnimationActive={true} animationDuration={1200} animationEasing="ease-out" />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
};

export const DailySpendingWidget: React.FC<{
    data: any[];
    theme: string;
    expectedLimit?: number;
}> = ({ data, theme, expectedLimit }) => {
    const { t, locale, currency } = useTranslation();
    const appLocale = locale === 'pt' ? 'pt-BR' : locale === 'en' ? 'en-US' : locale === 'es' ? 'es-ES' : locale === 'fr' ? 'fr-FR' : 'de-DE';
    const appCurrency = currency || 'BRL';
    const tickColor = theme === 'light' ? '#475569' : '#94a3b8';
    const gridColor = theme === 'light' ? '#e2e8f0' : '#374151';

    const axisTickFormatter = (value: number) => {
        if (typeof value !== 'number') return value;
        return new Intl.NumberFormat(appLocale, {
            style: 'currency',
            currency: appCurrency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    return (
        <div className="h-64 md:h-72 -ml-4">
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data}>
                    <defs>
                        <linearGradient id="colorSaldoRealizado" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1} />
                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                    <XAxis
                        dataKey="day"
                        tick={{ fill: tickColor, fontSize: 10, fontWeight: 'bold' }}
                        axisLine={false}
                        tickLine={false}
                        interval={4}
                    />
                    <YAxis
                        tickFormatter={axisTickFormatter}
                        tick={{ fill: tickColor, fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        width={70}
                    />
                    <Tooltip
                        content={<CustomTooltip />}
                        cursor={false}
                        isAnimationActive={false}
                    />
                    <Legend
                        wrapperStyle={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", paddingTop: "20px" }}
                        iconType="circle"
                    />

                    {/* Área de fundo sob a linha de Saldo Realizado */}
                    <Area
                        type="monotone"
                        dataKey="SaldoRealizado"
                        fill="url(#colorSaldoRealizado)"
                        stroke="transparent"
                        isAnimationActive={true}
                        animationDuration={1000}
                        animationEasing="ease-out"
                        legendType="none"
                        name="_area_saldo"
                    />

                    {/* Barras de entradas e saídas do dia */}
                    <Bar
                        dataKey="Entradas"
                        fill="#10B981"
                        name={t('dashboard.income')}
                        radius={[4, 4, 0, 0]}
                        barSize={8}
                        isAnimationActive={true}
                        animationDuration={800}
                        animationEasing="ease-out"
                    />
                    <Bar
                        dataKey="Saidas"
                        fill="#FF6384"
                        name={t('dashboard.expenses')}
                        radius={[4, 4, 0, 0]}
                        barSize={8}
                        isAnimationActive={true}
                        animationDuration={800}
                        animationEasing="ease-out"
                    />

                    {/* Linhas de saldo */}
                    <Line
                        type="monotone"
                        dataKey="SaldoRealizado"
                        stroke="#3B82F6"
                        strokeWidth={3}
                        dot={{ r: 4, fill: '#3B82F6', strokeWidth: 2, stroke: '#fff' }}
                        activeDot={<PulsatingDot fill="#3B82F6" />}
                        name={t('dashboard.balance')}
                        isAnimationActive={true}
                        animationDuration={1200}
                        animationEasing="ease-out"
                    />
                    <Line
                        type="monotone"
                        dataKey="SaldoPrevisto"
                        stroke="#94A3B8"
                        strokeWidth={3}
                        strokeDasharray="5 5"
                        dot={{ r: 4, fill: '#94A3B8', strokeWidth: 2, stroke: '#fff' }}
                        activeDot={<PulsatingDot fill="#94A3B8" />}
                        name={t('horizon.projected')}
                        isAnimationActive={true}
                        animationDuration={1200}
                        animationEasing="ease-out"
                    />

                    {expectedLimit && (
                        <ReferenceLine
                            y={expectedLimit}
                            stroke="#94a3b8"
                            strokeDasharray="5 5"
                            label={{ value: t('goals.target'), position: 'insideTopRight', fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }}
                        />
                    )}
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
};

export const SavingsRateWidget: React.FC<{
    rate: number;
    theme: string;
}> = ({ rate, theme }) => {
    const { t, locale } = useTranslation();
    // Definir cor baseada na taxa
    const getColor = (r: number) => {
        if (r < 0) return '#FF3B5C'; // Red (Negative)
        if (r < 10) return '#FFB800'; // Amber (Low)
        if (r < 25) return '#EA580C'; // Accent (Good)
        return '#3B82F6'; // Blue (Premium/Ideal)
    };

    const color = getColor(rate);
    const safeRate = Math.max(0, Math.min(rate, 100));

    const getFeedbackMessage = () => {
        if (locale === 'en') {
            if (rate <= 0) return "You spent more than you earned this month.";
            if (rate < 20) return "Try to save 20% for your financial reserve.";
            return "Excellent! You are on the way to financial freedom.";
        }
        if (locale === 'es') {
            if (rate <= 0) return "Gastaste más de lo que ganaste este mes.";
            if (rate < 20) return "Intenta llegar al 20% para tu reserva financiera.";
            return "¡Excelente! Camino a la libertad financiera.";
        }
        if (locale === 'fr') {
            if (rate <= 0) return "Vous avez dépensé plus que vous n'avez gagné ce mois-ci.";
            if (rate < 20) return "Essayez d'atteindre 20% pour votre réserve financière.";
            return "Excellent! En route vers la liberté financière.";
        }
        if (locale === 'de') {
            if (rate <= 0) return "Sie haben diesen Monat mehr ausgegeben als eingenommen.";
            if (rate < 20) return "Versuchen Sie, 20% für Ihre Finanzreserve zu sparen.";
            return "Ausgezeichnet! Auf dem Weg zur finanziellen Freiheit.";
        }
        // Fallback pt
        if (rate <= 0) return "Você gastou mais do que recebeu este mês.";
        if (rate < 20) return "Tente chegar aos 20% para sua reserva.";
        return "Excelente! Caminho da liberdade financeira.";
    };

    return (
        <div className="flex flex-col items-center justify-center py-4">
            <div className="relative h-36 w-36">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={[
                                { name: 'Saved', value: safeRate },
                                { name: 'Remaining', value: 100 - safeRate }
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius="70%"
                            outerRadius="95%"
                            startAngle={225}
                            endAngle={-45}
                            paddingAngle={0}
                            dataKey="value"
                            stroke="none"
                            isAnimationActive={true}
                            animationDuration={1200}
                            animationEasing="ease-out"
                        >
                            <Cell key="cell-rate" fill={color} />
                            <Cell key="cell-bg" fill={theme === 'dark' ? '#1A1A1A' : '#F1F5F9'} />
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-black text-light-text dark:text-dark-text leading-none">
                        {rate.toFixed(0)}%
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">{t('dashboard.savingsRate')}</span>
                </div>
            </div>

            <div className="text-center mt-3">
                <p className="text-[10px] font-semibold text-light-text-muted dark:text-dark-text-muted leading-relaxed max-w-[200px]">
                    {getFeedbackMessage()}
                </p>
            </div>
        </div>
    );
};

export const CategoryPieWidget: React.FC<{
    data: any[];
    total: number;
    categoryColors: any;
    theme: string;
    type: 'despesas' | 'receitas' | 'recurring';
    customColors?: string[];
}> = ({ data, total, categoryColors, theme, type, customColors }) => {
    const [activeIndex, setActiveIndex] = useState(-1);
    const [showAll, setShowAll] = useState(false);
    const [viewMode, setViewMode] = useState<'categories' | 'groups'>('categories');

    const onPieEnter = useCallback((_: any, index: number) => setActiveIndex(index), []);
    const onPieLeave = useCallback(() => setActiveIndex(-1), []);
    const { t, locale, currency } = useTranslation();
    const appLocale = locale === 'pt' ? 'pt-BR' : locale === 'en' ? 'en-US' : locale === 'es' ? 'es-ES' : locale === 'fr' ? 'fr-FR' : 'de-DE';
    const appCurrency = currency || 'BRL';

    // Agrupamento dinâmico para Visão Macro (Grupos)
    const groupedData = useMemo(() => {
        if (viewMode === 'categories') return data;
        const groups: Record<string, { name: string; value: number; color: string }> = {
            'Essenciais': { name: 'Essenciais (Fixos)', value: 0, color: '#3B82F6' },
            'Estilo de Vida': { name: 'Estilo de Vida (Desejos)', value: 0, color: '#EC4899' },
            'Reserva & Futuro': { name: 'Reserva & Futuro', value: 0, color: '#10B981' },
            'Outros': { name: 'Outros', value: 0, color: '#8B5CF6' }
        };

        const essenciaisKeys = ['moradia', 'saúde', 'saude', 'educação', 'educacao', 'contas', 'transporte', 'salario', 'salário', 'saldo inicial', 'luz', 'água', 'agua', 'aluguel', 'farmácia', 'farmacia'];
        const futuroKeys = ['investimentos', 'reserva', 'poupança', 'poupanca', 'futuro', 'metas'];

        data.forEach((item) => {
            const nameLower = (item.name || '').toLowerCase();
            if (essenciaisKeys.some(k => nameLower.includes(k))) {
                groups['Essenciais'].value += item.value;
            } else if (futuroKeys.some(k => nameLower.includes(k))) {
                groups['Reserva & Futuro'].value += item.value;
            } else if (nameLower) {
                groups['Estilo de Vida'].value += item.value;
            } else {
                groups['Outros'].value += item.value;
            }
        });

        return Object.values(groups).filter(g => g.value > 0);
    }, [data, viewMode]);

    const activeData = viewMode === 'categories' ? data : groupedData;

    // Abreviação inteligente para o centro do donut
    const formatAbbrev = (value: number) => {
        if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)} mi`;
        if (value >= 1000) return `R$ ${(value / 1000).toFixed(1)} mil`;
        return formatCurrency(value, appLocale, appCurrency);
    };

    let colors: string[] = [];
    if (viewMode === 'groups') {
        colors = activeData.map((item: any) => item.color);
    } else if (customColors) {
        colors = activeData.map((_, index) => customColors[index % customColors.length]);
    } else {
        const getColor = (name: string) => {
            return getCorPorCategoria(name, categoryColors);
        };
        colors = activeData.map(item => getColor(item.name));
        if (activeData.length === 1 && (activeData[0].name === t('dashboard.noData') || activeData[0].name === 'Nenhuma despesa' || activeData[0].name === 'Nenhuma receita')) {
            colors[0] = theme === 'dark' ? '#1A1A1A' : '#cbd5e1';
        }
    }

    const displayData = showAll ? activeData : activeData.slice(0, 5);

    return (
        <div>
            {/* Seletor Pill: Categorias vs Grupos Macro */}
            {type === 'despesas' && (
                <div className="flex justify-center mb-4">
                    <div className="inline-flex p-1 bg-slate-100 dark:bg-white/[0.05] rounded-2xl border border-slate-200/60 dark:border-white/[0.06] shadow-inner">
                        <button
                            type="button"
                            onClick={() => setViewMode('categories')}
                            className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all duration-200 ${
                                viewMode === 'categories'
                                    ? 'bg-white dark:bg-dark-elevated text-brand-accent dark:text-brand-accent-hover shadow-md border border-slate-200/80 dark:border-dark-border'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            Categorias
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('groups')}
                            className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all duration-200 ${
                                viewMode === 'groups'
                                    ? 'bg-white dark:bg-dark-elevated text-brand-accent dark:text-brand-accent-hover shadow-md border border-slate-200/80 dark:border-dark-border'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            Grupos Macro
                        </button>
                    </div>
                </div>
            )}

            <div className="h-56 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={activeData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius="70%"
                            outerRadius="92%"
                            paddingAngle={activeData.length > 1 ? 6 : 0}
                            stroke="none"
                            cornerRadius={10}
                            isAnimationActive={true}
                            animationDuration={1000}
                            animationEasing="ease-out"
                            {...{activeIndex, activeShape: renderActiveShape, onMouseEnter: onPieEnter, onMouseLeave: onPieLeave} as any}
                        >
                            {activeData.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} style={{ cursor: 'pointer', transition: 'opacity 0.3s' }} />
                            ))}
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>
                {/* Valor abreviado no centro — estilo Pierre */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-black text-light-text dark:text-dark-text leading-none tracking-tight">
                        {formatAbbrev(total)}
                    </span>
                    <span className="text-[10px] font-medium text-light-text-muted dark:text-dark-text-muted mt-1">
                        {type === 'despesas' ? (t('dashboard.expenseThisMonth') || 'gastos esse mês') : type === 'receitas' ? (t('dashboard.incomeThisMonth') || 'receitas esse mês') : t('common.total')}
                    </span>
                </div>
            </div>
            {/* Legenda redesenhada */}
            <div className="mt-4 space-y-3 px-1">
                {activeData.length > 0 && activeData[0].name !== t('dashboard.noData') && activeData[0].name !== 'Nenhuma despesa' && activeData[0].name !== 'Nenhuma receita' ? (
                    displayData.map((entry: any, index: number) => {
                        const perc = total > 0 ? ((entry.value / total) * 100).toFixed(0) : '0';
                        return (
                            <div key={`legend-${index}`} className="flex items-center justify-between">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: colors[index % colors.length] + '18' }}>
                                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-xs font-bold text-light-text dark:text-dark-text-secondary truncate">{getTranslatedCategoryName(entry.name, t)}</span>
                                        <span className="text-[10px] text-light-text-muted dark:text-dark-text-muted">{perc}%</span>
                                    </div>
                                </div>
                                <span className="text-sm font-black text-light-text dark:text-dark-text tabular-nums">{formatCurrency(entry.value, appLocale, appCurrency)}</span>
                            </div>
                        );
                    })
                ) : (
                    <p className="text-center text-light-text-muted dark:text-dark-text-muted text-[10px] font-bold uppercase tracking-widest py-4">{t('common.noResults')}</p>
                )}
                {activeData.length > 5 && (
                    <button 
                        onClick={() => setShowAll(!showAll)} 
                        className="w-full text-center text-[10px] text-brand-accent dark:text-brand-accent-hover font-bold uppercase tracking-widest pt-2 pb-1 transition-colors hover:opacity-80 active:scale-95"
                    >
                        {showAll ? `− ${t('common.close')}` : `+ ${t('common.all')} (${activeData.length})`}
                    </button>
                )}
            </div>
        </div>
    );
};


export const PaymentMethodChart: React.FC<{
    data: any[];
    total: number;
    theme: string;
}> = ({ data, total, theme }) => {
    const { t, locale, currency } = useTranslation();
    const appLocale = locale === 'pt' ? 'pt-BR' : locale === 'en' ? 'en-US' : locale === 'es' ? 'es-ES' : locale === 'fr' ? 'fr-FR' : 'de-DE';
    const appCurrency = currency || 'BRL';
    const tickColor = theme === 'light' ? '#475569' : '#94a3b8';
    const gridColor = theme === 'light' ? '#e2e8f0' : '#374151';

    const axisTickFormatter = (value: number) => {
        if (typeof value !== 'number') return value;
        return new Intl.NumberFormat(appLocale, {
            style: 'currency',
            currency: appCurrency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    return (
        <div className="h-64 w-full -ml-2">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                    <XAxis dataKey="name" tick={{ fill: tickColor, fontSize: 11, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={axisTickFormatter} tick={{ fill: tickColor, fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip type="payment" totalDespesas={total} />} cursor={false} isAnimationActive={false} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={60} isAnimationActive={true} animationDuration={800} animationEasing="ease-out">
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.id === 'credito' ? '#9333EA' : '#10B981'} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

const InvoiceCustomLabel = (props: any) => {
    const { x, y, value, isCurrent } = props;
    const { t, locale, currency } = useTranslation();
    const appLocale = locale === 'pt' ? 'pt-BR' : locale === 'en' ? 'en-US' : locale === 'es' ? 'es-ES' : locale === 'fr' ? 'fr-FR' : 'de-DE';
    const appCurrency = currency || 'BRL';
    if (value === undefined || value === null) return null;
    
    return (
        <g>
            <rect 
                x={x - 40} 
                y={y - 35} 
                width="80" 
                height="22" 
                fill="#ffffff" 
                rx="4" 
                stroke={isCurrent ? "#f97316" : "#e2e8f0"}
                strokeWidth={isCurrent ? "1.5" : "1"}
            />
            <text 
                x={x} 
                y={y - 20} 
                fill="#1e293b" 
                textAnchor="middle" 
                fontSize="10" 
                fontWeight={isCurrent ? "900" : "600"}
            >
                {new Intl.NumberFormat(appLocale, { style: 'currency', currency: appCurrency }).format(value)}
            </text>
            {isCurrent && (
                <text x={x} y={y - 45} fill="#64748b" textAnchor="middle" fontSize="9" fontWeight="bold">
                    {t('dashboard.openInvoice')}
                </text>
            )}
        </g>
    );
};

export const InvoiceChartWidget: React.FC<{
    data: any[];
    theme: string;
}> = ({ data, theme }) => {
    const tickColor = theme === 'light' ? '#64748b' : '#94a3b8';
    
    return (
        <div className="h-44 w-full mt-8 mb-4 pointer-events-none">
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data} margin={{ top: 30, right: 45, left: 45, bottom: 0 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={theme === 'light' ? '#f1f5f9' : '#334155'} />
                    <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={({ x, y, payload }) => {
                            const isCurrent = data.find(d => d.name === payload.value)?.isCurrent;
                            return (
                                <g transform={`translate(${x},${y})`}>
                                    <text 
                                        x={0} 
                                        y={0} 
                                        dy={16} 
                                        textAnchor="middle" 
                                        fill={isCurrent ? '#f97316' : tickColor}
                                        fontSize="11"
                                        fontWeight={isCurrent ? "bold" : "normal"}
                                    >
                                        {payload.value}
                                    </text>
                                    {isCurrent && (
                                        <line x1="-15" y1="24" x2="15" y2="24" stroke="#f97316" strokeWidth="2" />
                                    )}
                                </g>
                            );
                        }}
                    />
                    <YAxis hide domain={['auto', 'auto']} padding={{ top: 40, bottom: 20 }} />
                    <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#f97316" 
                        strokeWidth={2} 
                        dot={{ r: 4, fill: '#fff', stroke: '#f97316', strokeWidth: 2 }} 
                        activeDot={<PulsatingDot fill="#f97316" />} 
                        isAnimationActive={true} 
                        animationDuration={1200}
                        animationEasing="ease-out"
                    >
                        <LabelList dataKey="value" content={<InvoiceCustomLabel />} />
                    </Line>
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
};
