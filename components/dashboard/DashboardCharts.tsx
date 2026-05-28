
import React, { useState, useCallback } from 'react';
import {
    PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid,
    ComposedChart, Line, Area, ReferenceLine, LabelList, Sector
} from 'recharts';
import { formatCurrency, getCorPorCategoria } from '../../utils/helpers';

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
                            <span>Receitas:</span> <span>{formatCurrency(data.Receitas || 0)}</span>
                        </p>
                        <p className="text-sm font-bold flex justify-between gap-4" style={{ color: '#FF6384' }}>
                            <span>Despesas:</span> <span>{formatCurrency(data.Despesas || 0)}</span>
                        </p>
                        <p className="text-sm font-bold flex justify-between gap-4 mt-2 pt-1 border-t border-slate-100 dark:border-slate-700" style={{ color: data.SaldoPrevisto !== undefined && data.Saldo === undefined ? '#94A3B8' : '#3B82F6' }}>
                            <span>Patrimônio:</span> <span>{formatCurrency(data.Saldo !== undefined ? data.Saldo : (data.SaldoPrevisto || 0))}</span>
                        </p>
                    </div>
                </div>
            );
        }

        if (isDailyChart) {
            return (
                <div className="bg-white/95 dark:bg-dark-surface/95 backdrop-blur-md p-3 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200">
                    <p className="label text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Dia {label || data.day}</p>
                    <div className="space-y-1">
                        {data.value !== undefined && (
                            <p className="text-sm font-bold flex justify-between gap-4" style={{ color: '#FF6384' }}>
                                <span>Gasto Acumulado:</span> <span>{formatCurrency(data.value)}</span>
                            </p>
                        )}
                        {data.SaldoRealizado !== undefined && (
                            <p className="text-sm font-bold flex justify-between gap-4" style={{ color: '#3B82F6' }}>
                                <span>Saldo Real:</span> <span>{formatCurrency(data.SaldoRealizado)}</span>
                            </p>
                        )}
                        {data.SaldoPrevisto !== undefined && data.SaldoRealizado === undefined && (
                            <p className="text-sm font-bold flex justify-between gap-4" style={{ color: '#94A3B8' }}>
                                <span>Proj. Saldo:</span> <span>{formatCurrency(data.SaldoPrevisto)}</span>
                            </p>
                        )}
                    </div>
                </div>
            );
        }

        // Gráficos de Pizza/Barras (Categorias/Métodos de Pagamento)
        return (
            <div className="bg-white/95 dark:bg-dark-surface/95 backdrop-blur-md p-3 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200">
                <p className="label text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{label || data.name}</p>
                <p className="text-sm font-black flex items-center gap-2" style={{ color: payload[0]?.fill || '#FF6384' }}>
                    <span>{formatCurrency(data.value || 0)}</span>
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
    const tickColor = theme === 'light' ? '#475569' : '#94a3b8';
    const gridColor = theme === 'light' ? '#e2e8f0' : '#374151';

    const axisTickFormatter = (value: number) => {
        if (typeof value !== 'number') return value;
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
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
                    <Bar dataKey="Receitas" fill="#10B981" name="Receitas" radius={[4, 4, 0, 0]} barSize={20} isAnimationActive={true} animationDuration={800} animationEasing="ease-out" />
                    <Bar dataKey="Despesas" fill="#FF6384" name="Despesas" radius={[4, 4, 0, 0]} barSize={20} isAnimationActive={true} animationDuration={800} animationEasing="ease-out" />
                    <Line type="monotone" dataKey="Saldo" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4, fill: '#3B82F6', strokeWidth: 2, stroke: '#fff' }} activeDot={<PulsatingDot fill="#3B82F6" />} name="Patrimônio" isAnimationActive={true} animationDuration={1200} animationEasing="ease-out" />
                    <Line type="monotone" dataKey="SaldoPrevisto" stroke="#94A3B8" strokeWidth={3} strokeDasharray="5 5" dot={{ r: 4, fill: '#94A3B8', strokeWidth: 2, stroke: '#fff' }} activeDot={<PulsatingDot fill="#94A3B8" />} name="Previsto" isAnimationActive={true} animationDuration={1200} animationEasing="ease-out" />
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
    const tickColor = theme === 'light' ? '#475569' : '#94a3b8';
    const gridColor = theme === 'light' ? '#e2e8f0' : '#374151';

    return (
        <div className="h-64 w-full -ml-4">
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorDaily" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#FF6384" stopOpacity={0.1} />
                            <stop offset="95%" stopColor="#FF6384" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                    <XAxis
                        dataKey="day"
                        tick={{ fill: tickColor, fontSize: 10, fontWeight: 'bold' }}
                        axisLine={false}
                        tickLine={false}
                        interval={4}
                    />
                    <YAxis
                        hide
                        domain={['auto', 'auto']}
                    />
                    <Tooltip
                        content={<CustomTooltip />}
                        cursor={{ stroke: 'rgba(156, 163, 175, 0.4)', strokeWidth: 1, strokeDasharray: '3 3' }}
                        isAnimationActive={false}
                    />
                    <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#FF6384"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorDaily)"
                        isAnimationActive={true}
                        animationDuration={1000}
                        animationEasing="ease-out"
                        name="Gasto Acumulado"
                    />
                    <Line type="monotone" dataKey="SaldoRealizado" stroke="#3B82F6" strokeWidth={3} dot={false} activeDot={<PulsatingDot fill="#3B82F6" />} isAnimationActive={true} animationDuration={1200} animationEasing="ease-out" name="Saldo Realizado" />
                    <Line type="monotone" dataKey="SaldoPrevisto" stroke="#94A3B8" strokeWidth={3} strokeDasharray="5 5" dot={false} activeDot={<PulsatingDot fill="#94A3B8" />} isAnimationActive={true} animationDuration={1200} animationEasing="ease-out" name="Saldo Previsto" />
                    
                    {expectedLimit && (
                        <ReferenceLine
                            y={expectedLimit}
                            stroke="#94a3b8"
                            strokeDasharray="5 5"
                            label={{ value: 'Meta de Gastos', position: 'right', fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }}
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
    // Definir cor baseada na taxa
    const getColor = (r: number) => {
        if (r < 0) return '#EF4444'; // Red (Negative)
        if (r < 10) return '#F59E0B'; // Amber (Low)
        if (r < 25) return '#10B981'; // Emerald (Good)
        return '#3B82F6'; // Blue (Premium/Ideal)
    };

    const color = getColor(rate);
    const safeRate = Math.max(0, Math.min(rate, 100));

    return (
        <div className="flex flex-col items-center justify-center py-4">
            <div className="relative h-40 w-40">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={[
                                { name: 'Saved', value: safeRate },
                                { name: 'Remaining', value: 100 - safeRate }
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius="75%"
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
                            <Cell key="cell-bg" fill={theme === 'dark' ? '#1E293B' : '#F1F5F9'} />
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pt-2">
                    <span className="text-3xl font-black text-slate-800 dark:text-white leading-none">
                        {rate.toFixed(0)}%
                    </span>
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">Taxa de Poupança</span>
                </div>
            </div>

            <div className="text-center mt-2">
                <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    {rate <= 0
                        ? "Você gastou mais do que recebeu este mês."
                        : rate < 20
                            ? "Bom! Tente chegar aos 20% para sua reserva."
                            : "Excelente! Você está no caminho da liberdade."}
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
    const onPieEnter = useCallback((_: any, index: number) => setActiveIndex(index), []);
    const onPieLeave = useCallback(() => setActiveIndex(-1), []);

    let colors: string[] = [];
    if (customColors) {
        colors = data.map((_, index) => customColors[index % customColors.length]);
    } else {
        const getColor = (name: string) => {
            return getCorPorCategoria(name, categoryColors);
        };
        colors = data.map(item => getColor(item.name));
        if (data.length === 1 && (data[0].name === 'Nenhuma despesa' || data[0].name === 'Nenhuma receita')) {
            colors[0] = theme === 'dark' ? '#334155' : '#cbd5e1';
        }
    }

    const displayData = showAll ? data : data.slice(0, 5);

    return (
        <div>
            <div className="h-60 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius="72%"
                            outerRadius="92%"
                            paddingAngle={4}
                            stroke="none"
                            isAnimationActive={true}
                            animationDuration={1000}
                            animationEasing="ease-out"
                            {...{activeIndex, activeShape: renderActiveShape, onMouseEnter: onPieEnter, onMouseLeave: onPieLeave} as any}
                        >
                            {data.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} style={{ cursor: 'pointer', transition: 'opacity 0.3s' }} />
                            ))}
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-[0.2em] mb-0.5">Total</span>
                    <span className="text-xl font-black text-slate-900 dark:text-white leading-none">
                        {formatCurrency(total)}
                    </span>
                </div>
            </div>
            <div className="mt-4 space-y-2.5 px-1">
                {data.length > 0 && data[0].name !== 'Nenhuma despesa' && data[0].name !== 'Nenhuma receita' ? (
                    displayData.map((entry: any, index: number) => {
                        const perc = total > 0 ? ((entry.value / total) * 100).toFixed(0) : '0';
                        return (
                            <div key={`legend-${index}`} className="flex items-center justify-between text-xs font-bold">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="h-2.5 w-2.5 rounded-full flex-shrink-0 shadow-sm" style={{ backgroundColor: colors[index % colors.length] }} />
                                    <span className="text-slate-600 dark:text-slate-300 truncate">{entry.name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[9px] bg-slate-100 dark:bg-dark-surface px-1.5 py-0.5 rounded text-slate-500">{perc}%</span>
                                    <span className="text-slate-900 dark:text-white tabular-nums">{formatCurrency(entry.value)}</span>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <p className="text-center text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-widest py-4">Sem registros no período</p>
                )}
                {data.length > 5 && (
                    <button 
                        onClick={() => setShowAll(!showAll)} 
                        className="w-full text-center text-[9px] text-light-accent dark:text-dark-accent font-bold uppercase tracking-widest pt-2 pb-1 transition-colors hover:opacity-80 active:scale-95"
                    >
                        {showAll ? '− Mostrar menos' : `+ Todas as ${data.length} categorias`}
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
    const tickColor = theme === 'light' ? '#475569' : '#94a3b8';
    const gridColor = theme === 'light' ? '#e2e8f0' : '#374151';

    const axisTickFormatter = (value: number) => {
        if (typeof value !== 'number') return value;
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
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
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}
            </text>
            {isCurrent && (
                <text x={x} y={y - 45} fill="#64748b" textAnchor="middle" fontSize="9" fontWeight="bold">
                    Fatura aberta
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
