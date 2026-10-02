import React, { useState, useMemo, useEffect, useContext, useRef } from 'react';
import { AppContext } from '../context/AppContext';
import { useTranslation } from '../i18n';
import {
    ArrowLeftIcon, ArrowRightIcon, InvoiceDollarIcon, UserCircleIcon,
    TrendingUpIcon, TrendingDownIcon, InformationCircleIcon, ArrowsRightLeftIcon, MenuIcon
} from './icons';
import {
    formatarMesAno, getMonthKey, calculateDailyBalancesForMonth,
    formatCurrency, getPreviousBalance, calculateAccountBalance, getSaldoLimitDate
} from '../utils/helpers';
import MonthYearPickerModal from './MonthYearPickerModal';
import Modal from './Modal';
import { DailyBalance, Transaction } from '../types';
import { MESES_NOMES } from '../constants';


const Lancamento: React.FC = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error("Lancamento must be used within an AppProvider");
    const { currentDate, theme, changeMonth, allData, allTransactions, setCurrentDate, getSaldoColor, setCurrentView, setCurrentTab, userProfile, categoryColors, accounts, setIsNewTransactionOpen, setNewTransactionInitialType } = context;

    const { t, locale, currency, monthNames } = useTranslation();
    const appLocale = locale === 'pt' ? 'pt-BR' : locale === 'en' ? 'en-US' : locale === 'es' ? 'es-ES' : locale === 'fr' ? 'fr-FR' : 'de-DE';
    const appCurrency = currency || 'BRL';

    const [isMonthYearPickerOpen, setIsMonthYearPickerOpen] = useState(false);
    const [selectedDay, setSelectedDay] = useState<DailyBalance | null>(null);
    const todayListItemRef = useRef<HTMLLIElement | null>(null);
    const listContainerRef = useRef<HTMLDivElement | null>(null);
    const [isHeaderShadowed, setIsHeaderShadowed] = useState(false);
    const [isResumoCollapsed, setIsResumoCollapsed] = useState(() => {
        const saved = localStorage.getItem('sobcontrole_resumo_collapsed');
        return saved ? saved === 'true' : false;
    });

    const toggleResumoCollapse = () => {
        setIsResumoCollapsed(prev => {
            const next = !prev;
            localStorage.setItem('sobcontrole_resumo_collapsed', String(next));
            return next;
        });
    };

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

    // Sem contas cadastradas, a soma das contas seria sempre R$ 0,00: usa o saldo da
    // própria planilha no dia de referência (hoje / fim do mês passado / início do futuro).
    const hasAccounts = accounts.length > 0;
    const saldoEmContas = useMemo(() => {
        if (accounts.length > 0) {
            return accounts.reduce((acc, curr) => acc + calculateAccountBalance(curr.id, allTransactions, getSaldoLimitDate(currentDate)), 0);
        }
        const limit = getSaldoLimitDate(currentDate);
        const sameMonth = limit.getFullYear() === currentDate.getFullYear() && limit.getMonth() === currentDate.getMonth();
        if (!sameMonth) return getPreviousBalance(getMonthKey(currentDate), allData); // mês futuro: saldo inicial
        return diasComSaldo[limit.getDate() - 1]?.saldo ?? 0;
    }, [accounts, allTransactions, currentDate, diasComSaldo, allData]);

    const previsaoFimDoMes = useMemo(() => {
        return diasComSaldo[diasComSaldo.length - 1]?.saldo || 0;
    }, [diasComSaldo]);

    const totalReceitas = useMemo(() => {
        return diasComSaldo.reduce((sum, d) => sum + d.entrada, 0);
    }, [diasComSaldo]);

    const totalGasto = useMemo(() => {
        return diasComSaldo.reduce((sum, d) => sum + d.saida + d.saidaCredito, 0);
    }, [diasComSaldo]);

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
            className="bg-light-bg dark:bg-dark-bg text-slate-600 dark:text-slate-200 h-full flex flex-col relative transition-colors duration-300 animate-in fade-in duration-300"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
        >
            <header className="px-4 py-4 pt-[calc(1rem+env(safe-area-inset-top))] bg-light-bg dark:bg-dark-bg z-20 flex-shrink-0 sticky top-0">
                <div className="flex items-center justify-between">
                    {/* Avatar */}
                    <div 
                        id="tour-metas"
                        onClick={() => setCurrentView('menu')} role="button" aria-label={t('a11y.openMenu')}
                        className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0 cursor-pointer active:scale-95 transition-transform overflow-hidden ${
                            userProfile?.avatar
                                ? 'shadow-md'
                                : 'bg-gradient-to-br from-brand-accent to-brand-accent-hover text-white shadow-lg shadow-brand-accent/20'
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
                            onClick={() => changeMonth(-1)} aria-label={t('a11y.previousMonth')} 
                            className="h-9 w-9 flex items-center justify-center rounded-xl text-slate-400 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white active:scale-90 transition-transform"
                        >
                            <ArrowLeftIcon className="h-4 w-4" />
                        </button>
                        <button 
                            onClick={() => setIsMonthYearPickerOpen(true)} 
                            className="flex items-center gap-1.5 px-5 py-1.5 bg-slate-100 dark:bg-white/[0.06] rounded-full text-sm font-bold text-slate-900 dark:text-white border border-slate-200/80 dark:border-white/[0.08] active:scale-95 transition-transform shadow-sm"
                        >
                            {formatarMesAno(currentDate, appLocale, monthNames)}
                        </button>
                        <button 
                            onClick={() => changeMonth(1)} aria-label={t('a11y.nextMonth')} 
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

            {/* Card de Resumo Mensal Fixo no Topo */}
            <div className="px-4 flex-shrink-0">
                {!isResumoCollapsed ? (
                    /* Versão Expandida */
                    <div className="bg-slate-100 dark:bg-dark-card p-3.5 rounded-2xl border border-light-border dark:border-dark-elevated/80 shadow-sm mb-2 mt-2 space-y-3">
                        {/* Topo: Saldo e Previsão + Botão Recolher */}
                        <div className="flex justify-between items-center">
                            <div>
                                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block">{hasAccounts ? t('lancamento.accountBalance') : t('lancamento.currentBalance')}</span>
                                <p className={`text-xl font-bold mt-0.5 tabular-nums ${saldoEmContas < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                    {formatCurrency(saldoEmContas, appLocale, appCurrency)}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="text-right">
                                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block">{t('lancamento.forecastEndMonth')}</span>
                                    <p className={`text-base font-semibold mt-0.5 tabular-nums ${previsaoFimDoMes < 0 ? 'text-rose-500' : 'text-light-text dark:text-dark-text'}`}>
                                        {formatCurrency(previsaoFimDoMes, appLocale, appCurrency)}
                                    </p>
                                </div>
                                <button 
                                    onClick={toggleResumoCollapse} 
                                    className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-light-text-muted dark:text-dark-text-muted transition-colors self-start mt-0.5 ml-1"
                                    title={t('lancamento.collapseSummary')}
                                >
                                    <svg className="h-4 w-4 transform rotate-180 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                            <div className="p-2.5 bg-emerald-500/[0.04] dark:bg-emerald-500/[0.03] border border-emerald-500/10 dark:border-emerald-500/10 rounded-xl flex items-center gap-2">
                                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 flex-shrink-0">
                                    <TrendingUpIcon className="h-3.5 w-3.5" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">{t('lancamento.received')}</p>
                                    <p className="text-xs font-semibold text-emerald-500 truncate tabular-nums">{formatCurrency(totalReceitas, appLocale, appCurrency)}</p>
                                </div>
                            </div>
                            <div className="p-2.5 bg-rose-500/[0.04] dark:bg-rose-500/[0.03] border border-rose-500/10 dark:border-rose-500/10 rounded-xl flex items-center gap-2">
                                <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500 flex-shrink-0">
                                    <TrendingDownIcon className="h-3.5 w-3.5" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">{t('lancamento.spent')}</p>
                                    <p className="text-xs font-semibold text-rose-500 truncate tabular-nums">{formatCurrency(totalGasto, appLocale, appCurrency)}</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                            <button
                                onClick={() => {
                                    setNewTransactionInitialType('entrada');
                                    setIsNewTransactionOpen(true);
                                }}
                                className="py-2 px-3 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-white rounded-xl font-semibold text-xs transition-all shadow-sm flex items-center justify-center gap-1"
                            >
                                + {t('txType.income')}
                            </button>
                            <button
                                onClick={() => {
                                    setNewTransactionInitialType('saida');
                                    setIsNewTransactionOpen(true);
                                }}
                                className="py-2 px-3 bg-rose-500 hover:bg-rose-600 active:scale-[0.98] text-white rounded-xl font-semibold text-xs transition-all shadow-sm flex items-center justify-center gap-1"
                            >
                                - {t('txType.expense')}
                            </button>
                        </div>
                    </div>
                ) : (
                    /* Versão Compacta */
                    <div className="bg-slate-100 dark:bg-dark-card p-3 px-4 rounded-2xl border border-light-border dark:border-dark-elevated/80 shadow-md mb-2 mt-3 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 min-w-0 flex-1">
                            <div className="min-w-0">
                                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-[0.5px] block leading-none">{t('lancamento.balance')}</span>
                                <p className={`text-[15px] font-semibold mt-1 leading-none tabular-nums ${saldoEmContas < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                    {formatCurrency(saldoEmContas, appLocale, appCurrency)}
                                </p>
                            </div>
                            <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 flex-shrink-0 self-center" />
                            <div className="min-w-0">
                                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-[0.5px] block leading-none">{t('lancamento.forecastEndMonth').split(' ')[0]}</span>
                                <p className={`text-[15px] font-semibold mt-1 leading-none tabular-nums ${previsaoFimDoMes < 0 ? 'text-rose-500' : 'text-light-text dark:text-dark-text'}`}>
                                    {formatCurrency(previsaoFimDoMes, appLocale, appCurrency)}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                                onClick={() => {
                                    setNewTransactionInitialType('entrada');
                                    setIsNewTransactionOpen(true);
                                }}
                                className="h-8 w-8 bg-emerald-500 text-white rounded-xl flex items-center justify-center shadow-md shadow-emerald-500/10 active:scale-90 transition-all"
                                title={t('lancamento.newIncome')}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="h-3.5 w-3.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                </svg>
                            </button>
                            <button
                                onClick={() => {
                                    setNewTransactionInitialType('saida');
                                    setIsNewTransactionOpen(true);
                                }}
                                className="h-8 w-8 bg-rose-500 text-white rounded-xl flex items-center justify-center shadow-md shadow-rose-500/10 active:scale-90 transition-all"
                                title={t('lancamento.newExpense')}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="h-3.5 w-3.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
                                </svg>
                            </button>
                            <button 
                                onClick={toggleResumoCollapse} 
                                className="h-8 w-8 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-light-text-muted dark:text-dark-text-muted transition-colors flex items-center justify-center"
                                title={t('lancamento.expandSummary')}
                            >
                                <svg className="h-4 w-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                                </svg>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Cabeçalho da tabela — fora do scroll para não haver sobreposição */}
            <div className="flex-shrink-0 bg-slate-200 dark:bg-dark-elevated border-b border-light-border dark:border-dark-elevated/50 shadow-sm px-4">
                <div className="flex items-center gap-3 px-3 text-[11px] font-medium text-slate-500 dark:text-slate-400 py-1.5">
                    <div className="w-[58px] flex-shrink-0 text-left pl-1">{t('lancamento.day')}</div>
                    <div className="flex-grow grid grid-cols-3 gap-2 text-right">
                        <span>{t('lancamento.incomes')}</span>
                        <span>{t('lancamento.expenses')}</span>
                        <span>{t('lancamento.balance')}</span>
                    </div>
                </div>
            </div>

            <main className="flex-1 overflow-y-auto no-scrollbar" style={{ paddingBottom: 'calc(4.5rem + var(--sab))' }}>
                <div className="px-4">
                    <div className="pb-4">
                        <ul className="bg-slate-100 dark:bg-dark-card rounded-b-2xl overflow-hidden border-x border-b border-light-border dark:border-dark-elevated/80 shadow-md">
                            {diasComSaldo.map((dia, index) => {
                                const isToday = isCurrentMonthAndYear && dia.dia === todayDate;

                                const currentDayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), dia.dia);
                                const isWeekend = currentDayDate.getDay() === 0 || currentDayDate.getDay() === 6;
                                const weekdayFormatter = new Intl.DateTimeFormat(appLocale, { weekday: 'short' });
                                const dayOfWeekStr = weekdayFormatter.format(currentDayDate).replace('.', '').toUpperCase();

                                let dayCircleClass = 'h-7 w-7 flex-shrink-0 flex items-center justify-center rounded-full font-black text-[11px] relative transition-all ';
                                if (isToday) dayCircleClass += 'bg-light-accent text-white shadow-lg shadow-light-accent/40 ring-2 ring-light-accent/20';
                                // Fim de semana: cinza sutil (o vermelho parecia alerta de gasto)
                                else if (isWeekend) dayCircleClass += 'bg-transparent text-light-text-muted dark:text-dark-text-muted border border-light-border dark:border-dark-elevated';
                                else dayCircleClass += 'bg-slate-200/70 dark:bg-slate-700 text-light-text-secondary dark:text-dark-text-secondary border border-light-border dark:border-dark-elevated';

                                // #4: Saldo zero em cor neutra
                                const saldoColor = dia.saldo === 0 ? (undefined) : getSaldoColor(dia.saldo, theme);
                                const saldoClassName = dia.saldo === 0 ? 'text-light-text-muted dark:text-dark-text-muted' : '';

                                return (
                                    <li
                                        ref={isToday ? todayListItemRef : null}
                                        key={dia.dia}
                                        onClick={() => setSelectedDay(dia)}
                                        className={isToday
                                            ? 'py-2.5 px-3 flex items-center gap-3 transition-all active:scale-[0.99] cursor-pointer rounded-2xl mx-2 my-1.5 border border-light-accent/40 dark:border-dark-accent/40 bg-light-accent/[0.06] dark:bg-[#3B82F6]/[0.06] shadow-lg shadow-light-accent/10 dark:shadow-dark-accent/10 ring-2 ring-light-accent/10 dark:ring-dark-accent/10 z-10 scale-[1.01]'
                                            : `py-2 px-3 flex items-center gap-3 transition-all active:bg-slate-50 dark:active:bg-dark-surface cursor-pointer border-b border-slate-100 dark:border-dark-elevated/40 last:border-b-0 ${
                                                isWeekend
                                                    ? 'bg-slate-50 dark:bg-white/[0.02]'
                                                    : 'bg-white dark:bg-dark-card'
                                            }`
                                        }
                                    >
                                        <div className="flex items-center gap-1.5 flex-shrink-0 w-[58px]">
                                            <div className={dayCircleClass}>
                                                {String(dia.dia).padStart(2, '0')}
                                            </div>
                                            <span className={`text-[10px] font-extrabold uppercase tracking-tight text-light-text-muted dark:text-dark-text-muted`}>
                                                {dayOfWeekStr}
                                            </span>
                                        </div>
                                        <div className="flex-grow grid grid-cols-3 gap-2 text-[11px]">
                                            <div className="text-right"><p className={`font-semibold tabular-nums ${dia.entrada > 0 ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-700'}`}>{dia.entrada > 0 ? formatCurrency(dia.entrada, appLocale, appCurrency) : '—'}</p></div>
                                            <div className="text-right"><p className={`font-semibold tabular-nums ${(dia.saida + (dia.saidaCredito || 0)) > 0 ? 'text-rose-500' : 'text-slate-300 dark:text-slate-700'}`}>{(dia.saida + (dia.saidaCredito || 0)) > 0 ? `-${formatCurrency(dia.saida + (dia.saidaCredito || 0), appLocale, appCurrency)}` : '—'}</p></div>
                                            <div className="text-right"><p className={`font-semibold tabular-nums ${saldoClassName}`} style={saldoColor ? { color: saldoColor } : undefined}>{formatCurrency(dia.saldo, appLocale, appCurrency)}</p></div>
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
                            <h3 className="text-[18px] font-semibold text-light-text dark:text-dark-text tracking-tight">{t('lancamento.dayDetails', { day: selectedDay.dia })}</h3>
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
                                    <div key={tx.id} className="p-4 rounded-2xl bg-light-card-elevated dark:bg-dark-card border border-light-border dark:border-dark-elevated/50 flex justify-between items-center gap-2">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: tx.tipo === 'transferencia' ? '#94a3b8' : (categoryColors[tx.categoria] || '#cbd5e1') }}></div>
                                            <div className="min-w-0">
                                                <p className="font-medium text-[15px] text-light-text dark:text-dark-text tracking-tight truncate">{tx.descricao}</p>
                                                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-[0.5px]">
                                                        {tx.tipo === 'transferencia' ? t('txType.transfer') : tx.categoria}
                                                    </p>
                                                    {tx.paymentMethod === 'credito' && (
                                                        <span className="text-[11px] font-medium uppercase tracking-[0.5px] text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded border border-violet-500/20">
                                                            {t('payMethod.credit')}
                                                        </span>
                                                    )}
                                                    {tx.isRecurring && (
                                                        <span className="text-[11px] font-medium uppercase tracking-[0.5px] text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
                                                            ↻ {t('tx.recurring') || 'Recorrente'}
                                                        </span>
                                                    )}
                                                    {tx.installment && (
                                                        <span className="text-[11px] font-medium uppercase tracking-[0.5px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                                                            {tx.installment.current}/{tx.installment.total}x
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        {tx.tipo === 'transferencia' ? (
                                            <p className="font-semibold text-[15px] tabular-nums text-slate-400 flex items-center gap-1 flex-shrink-0">
                                                <ArrowsRightLeftIcon className="h-4 w-4" /> {formatCurrency(tx.valor, appLocale, appCurrency)}
                                            </p>
                                        ) : (
                                            <p className={`font-semibold text-[15px] tabular-nums flex-shrink-0 ${tx.tipo === 'entrada' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                {tx.tipo === 'entrada' ? '+' : '-'} {formatCurrency(tx.valor, appLocale, appCurrency)}
                                            </p>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="py-10 text-center space-y-2 opacity-40">
                                    <InformationCircleIcon className="h-10 w-10 mx-auto" />
                                    <p className="text-xs font-bold uppercase tracking-widest">{t('lancamento.noTransactionsDay')}</p>
                                </div>
                            )}
                        </div>

                        <div className="p-5 rounded-2xl bg-[#3B82F6]/5 border border-dark-accent/10 flex justify-between items-center mt-4">
                            <span className="text-[11px] font-medium text-[#3B82F6] dark:text-[#3B82F6] uppercase tracking-[0.5px]">{t('lancamento.projectedBalance')}</span>
                            <span className="text-base font-semibold tabular-nums text-light-text dark:text-dark-text" style={{ color: getSaldoColor(selectedDay.saldo, theme) }}>{formatCurrency(selectedDay.saldo, appLocale, appCurrency)}</span>
                        </div>

                        <button onClick={() => setSelectedDay(null)} className="w-full py-4 text-xs font-black uppercase tracking-[0.2em] bg-slate-200/70 dark:bg-slate-700 text-light-text-secondary dark:text-dark-text-secondary rounded-2xl transition active:scale-95">
                            {t('common.close')}
                        </button>
                    </div>
                )}
            </Modal>
        </div>
    );
};
export default Lancamento;