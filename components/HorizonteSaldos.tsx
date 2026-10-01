import React, { useState, useMemo, useContext, useRef, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { ArrowLeftIcon, PlusIcon, ArrowRightIcon, TodayCalendarIcon, ChartBarIcon, InformationCircleIcon, TrendingUpIcon, TrendingDownIcon, AlertTriangleIcon } from './icons';
import { DailyBalance, Transaction } from '../types';
import { getMonthKey, calculateDailyBalancesForMonth, formatCurrency } from '../utils/helpers';
import { Theme } from '../context/AppContext';
import { LineChart, Line, ResponsiveContainer, YAxis, ReferenceLine } from 'recharts';
import Modal from './Modal';
import { ContextualTip } from './ContextualTip';
import { useTranslation } from '../i18n';

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
    isCenter,
    onClick
}: {
    item: DailyBalance | undefined,
    isToday: boolean,
    isWeekend: boolean,
    getSaldoColor: (saldo: number, theme: Theme) => string,
    theme: Theme,
    isCenter: boolean,
    onClick: (item: DailyBalance) => void
}) => {
    const { locale, currency } = useTranslation();
    const appLocale = locale === 'pt' ? 'pt-BR' : locale === 'en' ? 'en-US' : locale === 'es' ? 'es-ES' : locale === 'fr' ? 'fr-FR' : 'de-DE';
    const appCurrency = currency || 'BRL';
    const curSymbol = appCurrency === 'USD' ? '$' : appCurrency === 'EUR' ? '€' : 'R$';

    if (!item) {
        return <div className="h-[38px] bg-transparent"></div>;
    }

    const isZero = item.saldo === 0;
    const valueString = isZero ? '—' : new Intl.NumberFormat(appLocale, { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(item.saldo);
    const balanceColor = isZero ? undefined : getSaldoColor(item.saldo, theme);
    const hasTransactions = item.transactions && item.transactions.length > 0;

    let dayBgClass = "bg-slate-100 dark:bg-slate-800 text-light-text-muted dark:text-dark-text-muted border border-slate-200/50 dark:border-slate-700/50";
    if (isWeekend) {
        // Neutro: aqui o vermelho indica dia com gasto, não pode significar "fim de semana"
        dayBgClass = "bg-transparent text-light-text-muted dark:text-dark-text-muted border border-light-border dark:border-dark-elevated";
    }
    if (isToday) {
        dayBgClass = "bg-light-accent dark:bg-[#3B82F6] text-white border-transparent shadow-sm shadow-light-accent/30";
    } else {
        if (item.entrada > 0 && item.saida === 0) {
            dayBgClass = "bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 dark:border-emerald-500/30";
        } else if (item.saida > 0 && item.entrada === 0) {
            dayBgClass = "bg-rose-500/10 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20 dark:border-rose-500/30";
        } else if (item.entrada > 0 && item.saida > 0) {
            dayBgClass = "bg-violet-500/10 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400 border border-violet-500/20 dark:border-violet-500/30";
        }
    }

    return (
        <button
            onClick={() => onClick(item)}
            className={`flex flex-col w-full h-[38px] transition-all active:scale-95 ${isToday ? 'bg-light-accent/10 dark:bg-[#3B82F6]/10 ring-2 ring-inset ring-light-accent z-10 relative' : 'bg-transparent hover:opacity-80'}`}
        >
            <div className={`flex-grow flex flex-row items-center justify-between px-1.5 ${isToday ? 'bg-light-accent/20 dark:bg-[#3B82F6]/20' : ''} ${isCenter ? '' : 'opacity-40'}`}>
                {/* Dia — esquerda */}
                <div className={`h-5 w-5 flex-shrink-0 rounded-full flex items-center justify-center text-[10px] font-black tracking-tighter ${dayBgClass}`}>
                    {item.dia}
                </div>
                {/* Valor + bolinhas — direita */}
                <div className="flex items-center gap-1">
                    {hasTransactions && (
                        <div className="flex gap-[2px]">
                            {item.entrada > 0 && <div className="w-1 h-1 rounded-full bg-emerald-500"></div>}
                            {item.saida > 0 && <div className="w-1 h-1 rounded-full bg-rose-500"></div>}
                        </div>
                    )}
                    <div className={`flex items-center text-[10px] font-semibold tabular-nums tracking-tight ${isZero ? 'text-slate-350 dark:text-slate-655' : ''} ${isCenter ? '' : 'opacity-35'}`} style={(!isZero && balanceColor) ? { color: balanceColor } : undefined}>
                        {!isZero && <span className="opacity-40 text-[8.5px] mr-0.5">{curSymbol}</span>}
                        {valueString}
                    </div>
                </div>
            </div>
        </button>
    );
}, (prevProps, nextProps) => {
    if (prevProps.isToday !== nextProps.isToday) return false;
    if (prevProps.isWeekend !== nextProps.isWeekend) return false;
    if (prevProps.theme !== nextProps.theme) return false;
    if (prevProps.isCenter !== nextProps.isCenter) return false;
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
    const { t, locale, currency, monthNames } = useTranslation();
    const appLocale = locale === 'pt' ? 'pt-BR' : locale === 'en' ? 'en-US' : locale === 'es' ? 'es-ES' : locale === 'fr' ? 'fr-FR' : 'de-DE';
    const appCurrency = currency || 'BRL';

    const getMonthName = (monthIndex: number) => {
        const keys = [
            'month.january', 'month.february', 'month.march', 'month.april',
            'month.may', 'month.june', 'month.july', 'month.august',
            'month.september', 'month.october', 'month.november', 'month.december'
        ];
        return t(keys[monthIndex]) || keys[monthIndex];
    };

    const {
        allData, currentDate, setCurrentView, setIsTransactionMenuOpen,
        getSaldoColor, theme, categoryColors, userProfile
    } = context;

    const today = useMemo(() => new Date(), []);

    const [displayDate, setDisplayDate] = useState(() => new Date(currentDate.getFullYear(), currentDate.getMonth(), 1));
    const [animationClass, setAnimationClass] = useState('');
    const [selectedDay, setSelectedDay] = useState<DailyBalance | null>(null);
    const scrollContainerRef = useRef<HTMLElement>(null);
    const todayRowRef = useRef<HTMLDivElement>(null);

    const handleGoToToday = () => {
        setDisplayDate(new Date(today.getFullYear(), today.getMonth(), 1));
        setTimeout(() => {
            if (todayRowRef.current) {
                todayRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 150);
    };

    // Scroll para o dia atual ao abrir
    useEffect(() => {
        if (todayRowRef.current) {
            todayRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, []);

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
        <div className="bg-light-bg dark:bg-dark-bg h-full flex flex-col text-light-text dark:text-dark-text overflow-hidden">
            <header className="px-4 py-4 pt-[calc(1rem+env(safe-area-inset-top))] bg-light-bg dark:bg-dark-bg z-20 flex-shrink-0 sticky top-0 flex flex-col">
                {/* Linha única: Avatar + Mês + Hoje */}
                <div className="flex items-center justify-between">
                    {/* Avatar */}
                    <div 
                        onClick={() => setCurrentView('menu')} role="button" aria-label={t('a11y.openMenu')}
                        className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0 cursor-pointer active:scale-95 transition-transform overflow-hidden ${
                            userProfile?.avatar
                                ? 'shadow-md'
                                : 'bg-gradient-to-br from-[#EA580C] to-[#F97316] text-white shadow-lg shadow-[#EA580C]/20'
                        }`}
                        title="Configurações & Perfil"
                    >
                        {userProfile?.avatar ? (
                            <img src={userProfile.avatar} alt="" className="h-full w-full object-cover" />
                        ) : (
                            (userProfile?.name || '').split(' ')[0].charAt(0).toUpperCase() || '?'
                        )}
                    </div>

                    {/* Seletor de Mês */}
                    <div className="flex items-center gap-1">
                        <button 
                            onClick={handlePrevMonth} 
                            className="h-9 w-9 flex items-center justify-center rounded-xl text-slate-400 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white active:scale-90 transition-transform"
                        >
                            <ArrowLeftIcon className="h-4 w-4" />
                        </button>
                        <div className="flex items-center gap-1.5 px-5 py-1.5 bg-slate-100 dark:bg-white/[0.06] rounded-full text-sm font-bold text-slate-900 dark:text-white border border-slate-200/80 dark:border-white/[0.08] shadow-sm">
                            {getMonthName(displayDate.getMonth())} {displayDate.getFullYear()}
                        </div>
                        <button 
                            onClick={handleNextMonth} 
                            className="h-9 w-9 flex items-center justify-center rounded-xl text-slate-400 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white active:scale-90 transition-transform"
                        >
                            <ArrowRightIcon className="h-4 w-4" />
                        </button>
                    </div>

                    {/* Botão Hoje */}
                    <button 
                        onClick={handleGoToToday} aria-label={t('a11y.goToToday')} 
                        className="h-10 w-10 flex items-center justify-center rounded-full bg-slate-100 dark:bg-white/[0.06] border border-slate-200/80 dark:border-white/[0.08] text-blue-500 dark:text-blue-400 active:scale-95 transition-transform shadow-sm hover:bg-slate-200 dark:hover:bg-slate-800"
                        title={`${monthNames[today.getMonth()].substring(0, 3)} ${today.getDate()}`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                        </svg>
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-3 bg-slate-100/80 dark:bg-dark-card/50 border-b border-slate-200 dark:border-dark-elevated/40 flex-shrink-0 p-1.5 gap-1.5">
                {threeMonthsData.map((monthData, index) => {
                    const isCenter = index === 1;
                    const variation = monthData.finalBalance - monthData.initialBalance;
                    
                    const cardBorderClass = isCenter
                        ? (monthData.isRisky
                            ? 'border border-rose-500/70 dark:border-rose-500/80 shadow-[0_0_12px_rgba(244,63,94,0.3)] bg-white dark:bg-dark-card'
                            : 'border border-blue-500/70 dark:border-blue-500/80 shadow-[0_0_12px_rgba(59,130,246,0.3)] bg-white dark:bg-dark-card')
                        : 'border border-transparent bg-transparent opacity-45';

                    return (
                        <div key={monthData.date.toISOString()} className={`flex flex-col p-3 rounded-2xl transition-all duration-300 ${cardBorderClass}`}>
                            <div className="flex justify-between items-center mb-1">
                                <span className={`text-[11px] font-medium ${isCenter ? 'text-blue-500 dark:text-blue-400' : 'text-slate-400'}`}>{getMonthName(monthData.date.getMonth()).substring(0, 3)}</span>
                                {monthData.isRisky && <AlertTriangleIcon className="h-3 w-3 text-rose-500 animate-pulse" />}
                            </div>
                            <MiniTrendChart data={monthData.balances} color={monthData.isRisky ? '#f43f5e' : '#3b82f6'} />
                            <div className="mt-1 space-y-0.5">
                                <div className="flex justify-between items-center overflow-hidden gap-1">
                                    <span className="text-[10px] font-medium text-slate-400 truncate">
                                        {locale === 'en' ? 'Min' : locale === 'es' ? 'Mín' : locale === 'fr' ? 'Min' : locale === 'de' ? 'Min' : 'Mín'}
                                    </span>
                                    <span className={`text-[11px] font-semibold tabular-nums whitespace-nowrap tracking-tight ${monthData.lowestBalance < 0 ? 'text-rose-500' : 'text-slate-655 dark:text-slate-200'}`}>
                                        {formatCurrency(monthData.lowestBalance, appLocale, appCurrency)}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center overflow-hidden gap-1">
                                    <span className="text-[10px] font-medium text-slate-400 truncate">
                                        {locale === 'en' ? 'End' : locale === 'es' ? 'Fin' : locale === 'fr' ? 'Fin' : locale === 'de' ? 'Ende' : 'Fim'}
                                    </span>
                                    <span className={`text-[11px] font-semibold tabular-nums whitespace-nowrap tracking-tight ${isCenter ? 'text-light-text dark:text-dark-text' : 'text-light-text-muted dark:text-dark-text-muted'}`}>{formatCurrency(monthData.finalBalance, appLocale, appCurrency)}</span>
                                </div>
                                <div className="flex justify-between items-center overflow-hidden gap-1">
                                    <span className="text-[10px] font-medium text-slate-400 truncate">Var</span>
                                    <span className={`text-[11px] font-semibold tabular-nums whitespace-nowrap tracking-tight ${variation >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                        {variation >= 0 ? '↑' : '↓'} {formatCurrency(Math.abs(variation), appLocale, appCurrency)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Header fixo de colunas — fora do scroll */}
            <div className="flex-shrink-0 grid grid-cols-3 bg-slate-200/80 dark:bg-dark-elevated border-b border-slate-200 dark:border-dark-elevated/40">
                {threeMonthsData.map((monthData, index) => {
                    const isCenter = index === 1;
                    return (
                        <div
                            key={`header-${index}`}
                            className={`py-1.5 flex items-center justify-center gap-1 ${index < 2 ? 'border-r border-slate-200/50 dark:border-dark-elevated/30' : ''} ${isCenter ? 'bg-blue-50/50 dark:bg-dark-card/60' : ''}`}
                        >
                            <span className={`text-[11px] font-medium ${isCenter ? 'text-blue-500 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`}>
                                {getMonthName(monthData.date.getMonth()).substring(0, 3)}
                            </span>
                            {monthData.isRisky && isCenter && (
                                <AlertTriangleIcon className="h-2.5 w-2.5 text-rose-500" />
                            )}
                        </div>
                    );
                })}
            </div>

            <main
                ref={scrollContainerRef}
                className={`flex-grow overflow-y-auto no-scrollbar bg-slate-100 dark:bg-dark-bg ${animationClass}`}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                <div className="flex flex-col pb-24">
                    <ContextualTip
                        id="tip-horizonte-planejando"
                        title={`${t('common.tip') || 'Dica'}: ${locale === 'en' ? 'Planning the Future' : locale === 'es' ? 'Planificando el Futuro' : locale === 'fr' ? "Planifier l'Avenir" : locale === 'de' ? 'Die Zukunft Planen' : 'Planejando o Futuro'}`}
                        description={locale === 'en' ? 'The Monthly Future shows the projection of your balance day by day. It calculates the impact of future and recurring transactions to anticipate your financial health.' : locale === 'es' ? 'El Futuro Mensual muestra la proyección de tu saldo día a día. Calcula el impacto de las transacciones futuras y recurrentes para anticipar tu salud financiera.' : locale === 'fr' ? "L'Avenir Mensuel montre la projection de votre solde jour après jour. Il calcule l'impact des transactions futures et récurrentes pour anticiper votre santé financière." : locale === 'de' ? 'Die Monatliche Zukunft zeigt die tägliche Prognose Ihres Kontostands. Sie berechnet die Auswirkungen zukünftiger und wiederkehrender Transaktionen, um Ihre finanzielle Gesundheit vorherzusehen.' : 'O Futuro Mensal mostra a projeção do seu saldo dia a dia. Ele calcula o impacto das transações futuras e recorrentes para antecipar a sua saúde financeira.'}
                        className="my-3 px-4"
                    />
                    {daysArray.map(dayIndex => {
                        // Verifica se alguma coluna deste dayIndex é hoje (coluna central)
                        const centerMonth = threeMonthsData[1];
                        const centerItem = centerMonth?.balances[dayIndex];
                        const isRowToday = !!(centerItem &&
                            centerItem.dia === today.getDate() &&
                            centerMonth.date.getMonth() === today.getMonth() &&
                            centerMonth.date.getFullYear() === today.getFullYear());

                        return (
                            <div
                                key={dayIndex}
                                ref={isRowToday ? todayRowRef : null}
                                className="grid grid-cols-3 border-b border-slate-200/50 dark:border-dark-elevated/20"
                            >
                                {threeMonthsData.map((monthData, colIndex) => {
                                    const item = monthData.balances[dayIndex];
                                    const isToday = item && item.dia === today.getDate() &&
                                        monthData.date.getMonth() === today.getMonth() &&
                                        monthData.date.getFullYear() === today.getFullYear();
                                    const isCenter = colIndex === 1;
                                    const dayDate = item ? new Date(monthData.date.getFullYear(), monthData.date.getMonth(), item.dia) : null;
                                    const isWeekend = dayDate ? (dayDate.getDay() === 0 || dayDate.getDay() === 6) : false;
                                    return (
                                        <div key={`${monthData.date.toISOString()}-${dayIndex}`} className={`flex flex-col ${colIndex < 2 ? 'border-r border-slate-200/50 dark:border-dark-elevated/30' : ''} ${
                                            isCenter 
                                                ? 'bg-blue-50/50 dark:bg-dark-card shadow-inner' 
                                                : 'bg-white/80 dark:bg-dark-card/35'
                                        }`}>
                                            <SaldoCell
                                                item={item}
                                                isToday={!!isToday}
                                                isWeekend={isWeekend}
                                                getSaldoColor={getSaldoColor}
                                                theme={theme}
                                                isCenter={isCenter}
                                                onClick={setSelectedDay}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            </main>

            <Modal isOpen={!!selectedDay} onClose={() => setSelectedDay(null)}>
                {selectedDay && (
                    <div className="space-y-6">
                        <div className="text-center">
                            <h3 className="text-[18px] font-semibold text-light-text dark:text-dark-text tracking-tight">
                                {locale === 'en' ? `What happens on day ${selectedDay.dia}?` : locale === 'es' ? `¿Qué pasa el día ${selectedDay.dia}?` : locale === 'fr' ? `Que se passe-t-il le jour ${selectedDay.dia} ?` : locale === 'de' ? `Was passiert am Tag ${selectedDay.dia}?` : `O que acontece dia ${selectedDay.dia}?`}
                            </h3>
                            <div className="flex justify-center gap-4 mt-2">
                                <div className="text-emerald-500 font-semibold text-xs tabular-nums flex items-center gap-1">
                                    <TrendingUpIcon className="h-3 w-3" /> {formatCurrency(selectedDay.entrada, appLocale, appCurrency)}
                                </div>
                                <div className="text-rose-500 font-semibold text-xs tabular-nums flex items-center gap-1">
                                    <TrendingDownIcon className="h-3 w-3" /> {formatCurrency(selectedDay.saida, appLocale, appCurrency)}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3 max-h-[60vh] overflow-y-auto no-scrollbar px-1">
                            {selectedDay.transactions && selectedDay.transactions.length > 0 ? (
                                selectedDay.transactions.map((tx: Transaction) => (
                                    <div key={tx.id} className="p-4 rounded-2xl bg-light-card-elevated dark:bg-dark-card border border-light-border dark:border-dark-elevated/50 flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: categoryColors[tx.categoria] || '#cbd5e1' }}></div>
                                            <div>
                                                <p className="font-medium text-[15px] text-light-text dark:text-dark-text tracking-tight">{tx.descricao}</p>
                                                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-[0.5px]">{tx.categoria}</p>
                                            </div>
                                        </div>
                                        <p className={`font-semibold text-[15px] tabular-nums ${tx.tipo === 'entrada' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                            {tx.tipo === 'entrada' ? '+' : '-'} {formatCurrency(tx.valor, appLocale, appCurrency)}
                                        </p>
                                    </div>
                                ))
                            ) : (
                                <div className="py-10 text-center space-y-2 opacity-40">
                                    <InformationCircleIcon className="h-10 w-10 mx-auto" />
                                    <p className="text-xs font-bold uppercase tracking-widest">
                                        {locale === 'en' ? 'No transactions scheduled' : locale === 'es' ? 'Ninguna transacción prevista' : locale === 'fr' ? 'Aucune transaction prévue' : locale === 'de' ? 'Keine Transaktionen geplant' : 'Nenhuma transação prevista'}
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="p-5 rounded-2xl bg-[#3B82F6]/5 border border-dark-accent/10 flex justify-between items-center mt-4">
                            <span className="text-[11px] font-medium text-[#3B82F6] dark:text-[#3B82F6] uppercase tracking-[0.5px]">
                                {locale === 'en' ? 'Projected Balance' : locale === 'es' ? 'Saldo Proyectado' : locale === 'fr' ? 'Solde Projeté' : locale === 'de' ? 'Prognostizierter Kontostand' : 'Saldo Projetado'}
                            </span>
                            <span className="text-base font-semibold tabular-nums text-light-text dark:text-dark-text" style={{ color: getSaldoColor(selectedDay.saldo, theme) }}>{formatCurrency(selectedDay.saldo, appLocale, appCurrency)}</span>
                        </div>

                        <button onClick={() => setSelectedDay(null)} className="w-full py-4 text-[11px] font-medium uppercase tracking-[0.5px] bg-slate-100 dark:bg-dark-card text-light-text-secondary dark:text-dark-text-secondary rounded-2xl transition active:scale-95">
                            {t('common.close')}
                        </button>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export { HorizonteSaldos };
export default HorizonteSaldos;
