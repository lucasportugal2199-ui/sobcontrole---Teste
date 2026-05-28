
import React, { useState, useMemo, useContext, useRef } from 'react';
import { AppContext } from '../context/AppContext';
import { ArrowLeftIcon, PlusIcon, ArrowRightIcon, TodayCalendarIcon, ChartBarIcon, InformationCircleIcon, TrendingUpIcon, TrendingDownIcon, AlertTriangleIcon } from './icons';
import { DailyBalance, Transaction } from '../types';
import { getMonthKey, calculateDailyBalancesForMonth, formatCurrency } from '../utils/helpers';
import { MESES_NOMES } from '../constants';
import { Theme } from '../context/AppContext';
import { LineChart, Line, ResponsiveContainer, YAxis, ReferenceLine } from 'recharts';
import Modal from './Modal';

interface MonthData {
    date: Date;
    balances: DailyBalance[];
    lowestBalance: number;
    finalBalance: number;
    initialBalance: number;
    isRisky: boolean;
}

const SaldoCell = React.memo(({
    item,
    isToday,
    isWeekend,
    getSaldoColor,
    theme,
    onClick
}: {
    item: DailyBalance | undefined,
    isToday: boolean,
    isWeekend: boolean,
    getSaldoColor: (saldo: number, theme: Theme) => string,
    theme: Theme,
    onClick: (item: DailyBalance) => void
}) => {
    if (!item) {
        return <div className="h-[38px] bg-transparent"></div>;
    }

    const isZero = item.saldo === 0;
    const valueString = isZero ? '—' : new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(item.saldo);
    const balanceColor = isZero ? undefined : getSaldoColor(item.saldo, theme);
    const hasTransactions = item.transactions && item.transactions.length > 0;

    return (
        <button
            onClick={() => onClick(item)}
            className={`flex flex-col w-full h-[38px] transition-all active:scale-95 ${isToday ? 'bg-light-accent/10 dark:bg-dark-accent/10 ring-2 ring-inset ring-light-accent z-10 relative' : 'bg-transparent hover:opacity-80'}`}
        >
            <div className={`w-full flex justify-between items-center px-1.5 py-px ${isToday ? 'bg-light-accent/20 dark:bg-dark-accent/20' : ''}`}>
                <span className={`text-[10px] font-black ${isToday ? 'text-light-accent dark:text-dark-accent' : isWeekend ? 'text-rose-400 dark:text-rose-500' : 'text-slate-500 dark:text-slate-400'}`}>
                    {String(item.dia).padStart(2, '0')}
                </span>
                {hasTransactions && (
                    <div className="flex gap-[2px]">
                        {item.entrada > 0 && <div className="w-1 h-1 rounded-full bg-emerald-500"></div>}
                        {item.saida > 0 && <div className="w-1 h-1 rounded-full bg-rose-500"></div>}
                    </div>
                )}
            </div>
            <div className={`flex-grow flex items-center justify-center text-[10px] font-bold px-1 ${isZero ? 'text-slate-300 dark:text-slate-700' : ''}`} style={balanceColor ? { color: balanceColor } : undefined}>
                {!isZero && <span className="opacity-50 text-[8px] mr-1">R$</span>}
                {valueString}
            </div>
        </button>
    );
}, (prevProps, nextProps) => {
    if (prevProps.isToday !== nextProps.isToday) return false;
    if (prevProps.isWeekend !== nextProps.isWeekend) return false;
    if (prevProps.theme !== nextProps.theme) return false;
    if (!prevProps.item && !nextProps.item) return true;
    if (!prevProps.item || !nextProps.item) return false;
    return prevProps.item.saldo === nextProps.item.saldo && prevProps.item.dia === nextProps.item.dia;
});

const MiniTrendChart: React.FC<{ data: DailyBalance[], color: string }> = ({ data, color }) => (
    <div className="h-10 w-full opacity-60">
        <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
                <YAxis hide domain={['auto', 'auto']} />
                <ReferenceLine y={0} stroke="#64748b" strokeDasharray="3 3" />
                <Line
                    type="monotone"
                    dataKey="saldo"
                    stroke={color}
                    strokeWidth={2}
                    dot={false}
                    animationDuration={400}
                />
            </LineChart>
        </ResponsiveContainer>
    </div>
);

const HorizonteSaldos: React.FC = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error("HorizonteSaldos must be used within AppProvider");

    const {
        allData, currentDate, setCurrentView, setIsTransactionMenuOpen,
        getSaldoColor, theme, categoryColors
    } = context;

    const today = useMemo(() => new Date(), []);
    const [displayDate, setDisplayDate] = useState(() => new Date(currentDate.getFullYear(), currentDate.getMonth(), 1));
    const [animationClass, setAnimationClass] = useState('');
    const [selectedDay, setSelectedDay] = useState<DailyBalance | null>(null);

    // Touch tracking refs
    const touchStartPos = useRef({ x: 0, y: 0 });
    const isHorizontalSwipe = useRef(false);
    const hasDeterminedDirection = useRef(false);
    const touchEndPos = useRef({ x: 0, y: 0 });

    const minSwipeDistance = 50;

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartPos.current = { x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY };
        hasDeterminedDirection.current = false;
        isHorizontalSwipe.current = false;
        touchEndPos.current = { x: 0, y: 0 };
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        const currentX = e.targetTouches[0].clientX;
        const currentY = e.targetTouches[0].clientY;
        if (!hasDeterminedDirection.current) {
            const deltaX = Math.abs(currentX - touchStartPos.current.x);
            const deltaY = Math.abs(currentY - touchStartPos.current.y);
            if (deltaX > 10 || deltaY > 10) {
                hasDeterminedDirection.current = true;
                if (deltaX > deltaY) {
                    isHorizontalSwipe.current = true;
                    document.body.classList.add('swiping');
                }
            }
        }
        if (isHorizontalSwipe.current) touchEndPos.current = { x: currentX, y: currentY };
    };

    const triggerAnimation = (direction: 'left' | 'right') => {
        setAnimationClass(direction === 'left' ? 'month-slide-enter-left' : 'month-slide-enter-right');
        setTimeout(() => setAnimationClass(''), 400);
    };

    const handleNextMonth = () => {
        triggerAnimation('right');
        setDisplayDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    };

    const handlePrevMonth = () => {
        triggerAnimation('left');
        setDisplayDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    };

    const handleTouchEnd = () => {
        document.body.classList.remove('swiping');
        if (isHorizontalSwipe.current) {
            const distance = touchStartPos.current.x - touchEndPos.current.x;
            if (Math.abs(distance) > minSwipeDistance && touchEndPos.current.x !== 0) {
                if (distance > 0) handleNextMonth();
                else handlePrevMonth();
            }
        }
    };

    const threeMonthsData = useMemo((): MonthData[] => {
        const months: MonthData[] = [];

        // Função auxiliar para buscar o saldo acumulado total ATÉ uma data específica
        const getAccumulatedBalanceAt = (targetDate: Date) => {
            const targetKey = getMonthKey(targetDate);
            const sortedKeys = Object.keys(allData).sort();
            let lastKey = null;
            for (const key of sortedKeys) {
                if (key < targetKey) lastKey = key;
                else break;
            }
            return lastKey ? allData[lastKey]?.saldoFinal || 0 : 0;
        };

        // Para mostrar [displayDate-1, displayDate, displayDate+1],
        // o runningBalance inicial deve ser o final de [displayDate-2].
        const twoMonthsAgo = new Date(displayDate.getFullYear(), displayDate.getMonth() - 1, 1);
        let runningBalance = getAccumulatedBalanceAt(twoMonthsAgo);

        for (let i = -1; i <= 1; i++) {
            const date = new Date(displayDate.getFullYear(), displayDate.getMonth() + i, 1);
            const monthKey = getMonthKey(date);
            const transactions = allData[monthKey]?.transactions || [];

            // Recalcula os saldos diários do mês garantindo que o saldo inicial venha do runningBalance
            const balances = calculateDailyBalancesForMonth(transactions, runningBalance, date.getFullYear(), date.getMonth());

            const finalBalance = balances.length > 0 ? balances[balances.length - 1].saldo : runningBalance;
            const lowestBalance = balances.length > 0 ? Math.min(...balances.map(b => b.saldo)) : runningBalance;

            months.push({
                date,
                balances,
                lowestBalance,
                finalBalance,
                initialBalance: runningBalance,
                isRisky: lowestBalance < 0
            });
            runningBalance = finalBalance;
        }
        return months;
    }, [displayDate, allData]);

    const maxDays = useMemo(() => Math.max(...threeMonthsData.map(m => m.balances.length)), [threeMonthsData]);
    const daysArray = useMemo(() => Array.from({ length: maxDays }, (_, i) => i), [maxDays]);

    return (
        <div className="bg-light-bg dark:bg-dark-bg h-full flex flex-col text-slate-900 dark:text-white overflow-hidden">
            <header className="flex justify-between items-center p-4 border-b border-light-bg dark:border-dark-surface bg-light-bg dark:bg-dark-bg flex-shrink-0 z-10 pt-[calc(1rem+env(safe-area-inset-top))]">
                <button onClick={() => setCurrentView('main')} className="p-2.5 rounded-2xl bg-slate-100 dark:bg-dark-surface border border-slate-200 dark:border-slate-800 transition active:scale-95">
                    <ArrowLeftIcon className="h-5 w-5 text-slate-500" />
                </button>

                <div className="flex flex-col items-center">
                    <h1 className="text-[10px] font-black uppercase tracking-[0.2em] text-light-accent dark:text-dark-accent mb-0.5">Futuro Mensal</h1>
                    <div className="flex items-center gap-3">
                        <button onClick={handlePrevMonth} className="p-1 text-slate-300 hover:text-light-accent transition-colors"><ArrowLeftIcon className="h-4 w-4" /></button>
                        <span className="font-black text-sm tracking-tight">{MESES_NOMES[displayDate.getMonth()].toUpperCase()} {displayDate.getFullYear()}</span>
                        <button onClick={handleNextMonth} className="p-1 text-slate-300 hover:text-light-accent transition-colors"><ArrowRightIcon className="h-4 w-4" /></button>
                    </div>
                </div>

                <button onClick={() => { setCurrentView('main'); setIsTransactionMenuOpen(true); }} className="p-2.5 rounded-2xl bg-light-accent text-white shadow-lg shadow-light-accent/30 transition active:scale-95">
                    <PlusIcon className="h-5 w-5" />
                </button>
            </header>

            <div className="grid grid-cols-3 bg-light-bg/50 dark:bg-dark-surface/10 border-b border-light-bg dark:border-slate-800 flex-shrink-0">
                {threeMonthsData.map((monthData, index) => {
                    const isCenter = index === 1;
                    const variation = monthData.finalBalance - monthData.initialBalance;
                    return (
                        <div key={monthData.date.toISOString()} className={`flex flex-col p-3 ${index < 2 ? 'border-r border-slate-100 dark:border-slate-800/50' : ''} ${isCenter ? '' : 'opacity-60'}`}>
                            <div className="flex justify-between items-center mb-1">
                                <span className={`text-[10px] font-black uppercase tracking-wider ${isCenter ? 'text-light-accent dark:text-dark-accent' : 'text-slate-400'}`}>{MESES_NOMES[monthData.date.getMonth()].substring(0, 3)}</span>
                                {monthData.isRisky && <AlertTriangleIcon className="h-3 w-3 text-rose-500 animate-pulse" />}
                            </div>
                            <MiniTrendChart data={monthData.balances} color={monthData.isRisky ? '#f43f5e' : '#3b82f6'} />
                            <div className="mt-1 space-y-0.5">
                                <div className="flex justify-between items-center overflow-hidden gap-1">
                                    <span className="text-[8px] font-bold text-slate-400 uppercase truncate">Mín</span>
                                    <span className={`text-[9.5px] font-black whitespace-nowrap tracking-tighter ${monthData.lowestBalance < 0 ? 'text-rose-500' : 'text-slate-600 dark:text-slate-200'}`}>
                                        {formatCurrency(monthData.lowestBalance)}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center overflow-hidden gap-1">
                                    <span className="text-[8px] font-bold text-slate-400 uppercase truncate">Fim</span>
                                    <span className="text-[9.5px] font-black text-slate-900 dark:text-white whitespace-nowrap tracking-tighter">{formatCurrency(monthData.finalBalance)}</span>
                                </div>
                                <div className="flex justify-between items-center overflow-hidden gap-1">
                                    <span className="text-[8px] font-bold text-slate-400 uppercase truncate">Var</span>
                                    <span className={`text-[9.5px] font-black whitespace-nowrap tracking-tighter ${variation >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                        {variation >= 0 ? '↑' : '↓'} {formatCurrency(Math.abs(variation))}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <main
                className={`flex-grow overflow-y-auto no-scrollbar bg-slate-50 dark:bg-dark-bg ${animationClass}`}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                <div className="flex flex-col pb-24">
                    {daysArray.map(dayIndex => (
                        <div key={dayIndex} className={`grid grid-cols-3 border-b border-slate-100/50 dark:border-slate-800/30 ${dayIndex % 2 === 0 ? 'bg-white dark:bg-dark-bg' : 'bg-slate-50/70 dark:bg-slate-900/30'}`}>
                            {threeMonthsData.map((monthData, colIndex) => {
                                const item = monthData.balances[dayIndex];
                                const isToday = item && item.dia === today.getDate() &&
                                    monthData.date.getMonth() === today.getMonth() &&
                                    monthData.date.getFullYear() === today.getFullYear();
                                const isCenter = colIndex === 1;
                                const dayDate = item ? new Date(monthData.date.getFullYear(), monthData.date.getMonth(), item.dia) : null;
                                const isWeekend = dayDate ? (dayDate.getDay() === 0 || dayDate.getDay() === 6) : false;
                                return (
                                    <div key={`${monthData.date.toISOString()}-${dayIndex}`} className={`flex flex-col ${colIndex < 2 ? 'border-r border-slate-100 dark:border-slate-800/50' : ''} ${isCenter ? 'bg-blue-50/30 dark:bg-blue-950/10' : 'opacity-70 bg-slate-100/30 dark:bg-slate-900/20'}`}>
                                        <SaldoCell
                                            item={item}
                                            isToday={!!isToday}
                                            isWeekend={isWeekend}
                                            getSaldoColor={getSaldoColor}
                                            theme={theme}
                                            onClick={setSelectedDay}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </main>

            {/* Modal de Detalhamento do Dia */}
            <Modal isOpen={!!selectedDay} onClose={() => setSelectedDay(null)}>
                {selectedDay && (
                    <div className="space-y-6">
                        <div className="text-center">
                            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">O que acontece dia {selectedDay.dia}?</h3>
                            <div className="flex justify-center gap-4 mt-2">
                                <div className="text-emerald-500 font-bold text-xs flex items-center gap-1">
                                    <TrendingUpIcon className="h-3 w-3" /> {formatCurrency(selectedDay.entrada)}
                                </div>
                                <div className="text-rose-500 font-bold text-xs flex items-center gap-1">
                                    <TrendingDownIcon className="h-3 w-3" /> {formatCurrency(selectedDay.saida)}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3 max-h-[60vh] overflow-y-auto no-scrollbar px-1">
                            {selectedDay.transactions && selectedDay.transactions.length > 0 ? (
                                selectedDay.transactions.map((tx: Transaction) => (
                                    <div key={tx.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-dark-surface border border-slate-100 dark:border-slate-800/50 flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: categoryColors[tx.categoria] || '#cbd5e1' }}></div>
                                            <div>
                                                <p className="text-sm font-black text-slate-900 dark:text-white tracking-tight">{tx.descricao}</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{tx.categoria}</p>
                                            </div>
                                        </div>
                                        <p className={`text-sm font-black ${tx.tipo === 'entrada' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                            {tx.tipo === 'entrada' ? '+' : '-'} {formatCurrency(tx.valor)}
                                        </p>
                                    </div>
                                ))
                            ) : (
                                <div className="py-10 text-center space-y-2 opacity-40">
                                    <InformationCircleIcon className="h-10 w-10 mx-auto" />
                                    <p className="text-xs font-bold uppercase tracking-widest">Nenhuma transação prevista</p>
                                </div>
                            )}
                        </div>

                        <div className="p-5 rounded-2xl bg-dark-accent/5 border border-dark-accent/10 flex justify-between items-center mt-4">
                            <span className="text-[10px] font-black text-dark-accent dark:text-dark-accent uppercase tracking-widest">Saldo Projetado</span>
                            <span className="text-base font-black text-slate-900 dark:text-white" style={{ color: getSaldoColor(selectedDay.saldo, theme) }}>{formatCurrency(selectedDay.saldo)}</span>
                        </div>

                        <button onClick={() => setSelectedDay(null)} className="w-full py-4 text-xs font-black uppercase tracking-[0.2em] bg-slate-100 dark:bg-dark-surface text-slate-600 dark:text-slate-300 rounded-2xl transition active:scale-95">
                            Fechar
                        </button>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default HorizonteSaldos;

