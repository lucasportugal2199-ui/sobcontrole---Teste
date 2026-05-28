import React, { useState, useMemo, useEffect, useContext, useRef } from 'react';
import { AppContext } from '../context/AppContext';
import {
    ArrowLeftIcon, ArrowRightIcon, TodayCalendarIcon, InvoiceDollarIcon, UserCircleIcon,
    TrendingUpIcon, TrendingDownIcon, InformationCircleIcon, ArrowsRightLeftIcon
} from './icons';
import {
    formatarMesAno, getMonthKey, calculateDailyBalancesForMonth,
    formatCurrency, getPreviousBalance
} from '../utils/helpers';
import MonthYearPickerModal from './MonthYearPickerModal';
import Modal from './Modal';
import { DailyBalance, Transaction } from '../types';

const Lancamento: React.FC = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error("Lancamento must be used within an AppProvider");
    const { currentDate, theme, changeMonth, allData, allTransactions, setCurrentDate, getSaldoColor, setCurrentView, userProfile, categoryColors } = context;

    const [isMonthYearPickerOpen, setIsMonthYearPickerOpen] = useState(false);
    const [selectedDay, setSelectedDay] = useState<DailyBalance | null>(null);
    const todayListItemRef = useRef<HTMLLIElement | null>(null);
    const listContainerRef = useRef<HTMLDivElement | null>(null);
    const [isHeaderShadowed, setIsHeaderShadowed] = useState(false);

    // --- Lógica de Swipe (refs para evitar re-renders) ---
    const touchStartSwipeRef = useRef<{ x: number, y: number } | null>(null);
    const touchEndSwipeRef = useRef<{ x: number, y: number } | null>(null);
    const minSwipeDistance = 50;

    const onTouchStart = (e: React.TouchEvent) => {
        touchEndSwipeRef.current = null;
        touchStartSwipeRef.current = { x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY };
    };

    const onTouchMove = (e: React.TouchEvent) => {
        touchEndSwipeRef.current = { x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY };
    };

    const onTouchEnd = () => {
        const start = touchStartSwipeRef.current;
        const end = touchEndSwipeRef.current;
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

    const today = new Date();
    const isCurrentMonthAndYear = currentDate.getFullYear() === today.getFullYear() && currentDate.getMonth() === today.getMonth();
    const todayDate = today.getDate();

    const { diasComSaldo } = useMemo(() => {
        const ano = currentDate.getFullYear(); const mes = currentDate.getMonth();
        const currentMonthKey = getMonthKey(currentDate);

        // Busca o saldo anterior de forma robusta através dos meses e anos
        const saldoInicial = getPreviousBalance(currentMonthKey, allData);

        // Filtra TODAS as transações (agora usando estritamente a data do VENCIMENTO/SAÍDA do caixa)
        const transactionsForMonth = allTransactions.filter(tx => {
            return tx.data.startsWith(currentMonthKey);
        });

        return { diasComSaldo: calculateDailyBalancesForMonth(transactionsForMonth, saldoInicial, ano, mes) };
    }, [currentDate, allData, allTransactions]);

    useEffect(() => {
        if (isCurrentMonthAndYear && todayListItemRef.current) {
            const timer = setTimeout(() => {
                todayListItemRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [isCurrentMonthAndYear, currentDate]);

    const handleGoToToday = () => {
        if (isCurrentMonthAndYear) { todayListItemRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
        else { setCurrentDate(new Date()); }
    };

    return (
        <div 
            className="bg-light-bg dark:bg-dark-bg text-slate-600 dark:text-slate-200 h-full flex flex-col relative transition-colors duration-300"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
        >
            <header className="glass-header dark:glass-header z-20 p-4 pt-8 border-b border-light-bg/50 dark:border-slate-800 sticky top-0">
                <div className="relative flex items-center justify-center min-h-[40px]">
                    <div className="absolute left-0">
                        <button
                            onClick={() => setCurrentView('menu')}
                            className="h-10 w-10 rounded-full border-2 border-light-bg dark:border-dark-surface overflow-hidden bg-gradient-to-tr from-light-accent to-blue-500 flex items-center justify-center active:scale-95 transition-all shadow-lg shadow-light-accent/30 ring-4 ring-light-accent/10"
                        >
                            {userProfile.avatar ? (
                                <img src={userProfile.avatar} alt="Perfil" className="h-full w-full object-cover" />
                            ) : (
                                <UserCircleIcon className="h-7 w-7 text-white" />
                            )}
                        </button>
                    </div>
                    <h1 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter">Planilha diária</h1>
                    <div className="absolute right-0 flex items-center gap-3">
                        <button onClick={handleGoToToday} className="active:scale-90 transition-transform hover:opacity-80"><TodayCalendarIcon day={today.getDate()} className="h-9 w-9" /></button>
                        <button id="tour-horizonte-btn" onClick={() => setCurrentView('horizonte')} className="active:scale-90 transition-transform hover:opacity-80"><InvoiceDollarIcon className="h-9 w-9 text-emerald-500" /></button>
                    </div>
                </div>
                <div className="flex items-center justify-between mt-4 bg-light-bg/50 dark:bg-dark-surface backdrop-blur-md rounded-2xl p-1.5 w-full border border-light-bg dark:border-slate-800/50 shadow-inner">
                    <button onClick={() => changeMonth(-1)} className="p-2.5 text-slate-400 hover:text-light-accent dark:hover:text-dark-accent active:scale-75 transition-all"><ArrowLeftIcon className="h-5 w-5" /></button>
                    <button onClick={() => setIsMonthYearPickerOpen(true)} className="flex-grow text-center font-black text-sm uppercase tracking-widest text-slate-800 dark:text-slate-200 py-2 hover:opacity-70 transition-opacity">{formatarMesAno(currentDate)}</button>
                    <button onClick={() => changeMonth(1)} className="p-2.5 text-slate-400 hover:text-light-accent dark:hover:text-dark-accent active:scale-75 transition-all"><ArrowRightIcon className="h-5 w-5" /></button>
                </div>
            </header>
            <main className="flex-1 overflow-y-auto no-scrollbar pb-24">
                <div className="px-4">
                    <div className={`sticky top-0 glass z-10 py-3 border-b border-slate-200 dark:border-slate-800/50 mt-2 rounded-t-2xl`}>
                        <div className="flex items-center gap-4 px-3 text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">
                            <div className="w-9 flex-shrink-0 text-center">Dia</div>
                            <div className="flex-grow grid grid-cols-3 gap-2 text-right">
                                <span>Entradas</span>
                                <span>Saídas</span>
                                <span>Saldo</span>
                            </div>
                        </div>
                    </div>
                    <div className="pb-4">
                        <ul className="bg-slate-200 dark:bg-dark-surface/30 rounded-b-2xl overflow-hidden border-x border-b border-slate-200/50 dark:border-slate-800/50 shadow-sm">
                            {diasComSaldo.map((dia, index) => {
                                const isToday = isCurrentMonthAndYear && dia.dia === todayDate;

                                const currentDayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), dia.dia);
                                const isWeekend = currentDayDate.getDay() === 0 || currentDayDate.getDay() === 6;
                                const isEvenRow = index % 2 === 0;

                                let dayCircleClass = 'h-7 w-7 flex-shrink-0 flex items-center justify-center rounded-full font-black text-[11px] relative transition-all ';
                                if (isToday) dayCircleClass += 'bg-light-accent text-white shadow-lg shadow-light-accent/40 ring-2 ring-light-accent/20';
                                else if (isWeekend) dayCircleClass += 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30';
                                else dayCircleClass += 'bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800';

                                // #4: Saldo zero em cor neutra
                                const saldoColor = dia.saldo === 0 ? (undefined) : getSaldoColor(dia.saldo, theme);
                                const saldoClassName = dia.saldo === 0 ? 'text-slate-400 dark:text-slate-500' : '';

                                return (
                                    <li
                                        ref={isToday ? todayListItemRef : null}
                                        key={dia.dia}
                                        onClick={() => setSelectedDay(dia)}
                                        className={isToday
                                            ? 'py-2.5 px-3 flex items-center gap-3 transition-all active:scale-[0.99] cursor-pointer rounded-2xl mx-2 my-1.5 border border-light-accent/40 dark:border-dark-accent/40 bg-light-accent/[0.06] dark:bg-dark-accent/[0.06] shadow-lg shadow-light-accent/10 dark:shadow-dark-accent/10 ring-2 ring-light-accent/10 dark:ring-dark-accent/10 z-10 scale-[1.01]'
                                            : `py-2 px-3 flex items-center gap-3 transition-all active:bg-slate-50 dark:active:bg-dark-surface cursor-pointer border-b border-slate-100/50 dark:border-slate-800/30 last:border-b-0 ${
                                                isEvenRow 
                                                    ? 'bg-white dark:bg-dark-bg' 
                                                    : 'bg-slate-50/70 dark:bg-slate-900/30'
                                            }`
                                        }
                                    >
                                        <div className={dayCircleClass}>
                                            {String(dia.dia).padStart(2, '0')}
                                        </div>
                                        <div className="flex-grow grid grid-cols-3 gap-2 text-[11px]">
                                            <div className="text-right"><p className={`font-bold ${dia.entrada > 0 ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-700'}`}>{dia.entrada > 0 ? formatCurrency(dia.entrada) : '—'}</p></div>
                                            <div className="text-right"><p className={`font-bold ${(dia.saida + (dia.saidaCredito || 0)) > 0 ? 'text-rose-500' : 'text-slate-300 dark:text-slate-700'}`}>{(dia.saida + (dia.saidaCredito || 0)) > 0 ? `-${formatCurrency(dia.saida + (dia.saidaCredito || 0))}` : '—'}</p></div>
                                            <div className="text-right"><p className={`font-black ${saldoClassName}`} style={saldoColor ? { color: saldoColor } : undefined}>{formatCurrency(dia.saldo)}</p></div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                </div>
            </main>
            <MonthYearPickerModal isOpen={isMonthYearPickerOpen} onClose={() => setIsMonthYearPickerOpen(false)} currentDate={currentDate} allData={allData} onSelectDate={setCurrentDate} />

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
                                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tx.tipo === 'transferencia' ? '#94a3b8' : (categoryColors[tx.categoria] || '#cbd5e1') }}></div>
                                            <div>
                                                <p className="text-sm font-black text-slate-900 dark:text-white tracking-tight">{tx.descricao}</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                    {tx.tipo === 'transferencia' ? 'Transferência' : tx.categoria}
                                                </p>
                                            </div>
                                        </div>
                                        {tx.tipo === 'transferencia' ? (
                                            <p className="text-sm font-black text-slate-400 flex items-center gap-1">
                                                <ArrowsRightLeftIcon className="h-4 w-4" /> {formatCurrency(tx.valor)}
                                            </p>
                                        ) : (
                                            <p className={`text-sm font-black ${tx.tipo === 'entrada' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                {tx.tipo === 'entrada' ? '+' : '-'} {formatCurrency(tx.valor)}
                                            </p>
                                        )}
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

                        <button onClick={() => setSelectedDay(null)} className="w-full py-4 text-xs font-black uppercase tracking-[0.2em] bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl transition active:scale-95">
                            Fechar
                        </button>
                    </div>
                )}
            </Modal>
        </div>
    );
};
export default Lancamento;