
import React, { useState, useMemo, useContext, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { useTranslation } from '../i18n';
import { ArrowLeftIcon, ChartBarIcon, TargetIcon, PiggyBankIcon, CalendarIcon, SparklesIcon, LockIcon, ArrowDownIcon, ArrowUpIcon, CrownIcon } from './icons';
import { formatCurrency, formatCurrencyForInput, parseCurrency } from '../utils/helpers';
import { SavingsGoal } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

const MAX_MONTHS = 600; // Cap: 50 anos

const GoalCalculator: React.FC = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error("GoalCalculator missing context");

    const { savingsGoals, allTransactions, setCurrentView, theme, userProfile } = context;
    const { t, locale } = useTranslation();
    const appLocale = locale === 'pt' ? 'pt-BR' : locale === 'en' ? 'en-US' : locale === 'es' ? 'es-ES' : locale === 'fr' ? 'fr-FR' : 'de-DE';

    // --- PRO CHECK ---
    if (!userProfile.isPremium) {
        return (
            <div className="bg-light-card-elevated dark:bg-dark-bg h-full flex flex-col items-center justify-center p-8 text-center">
                 <button onClick={() => setCurrentView('main')} className="absolute top-4 left-4 p-2 rounded-full hover:bg-slate-200 dark:hover:bg-dark-surface transition">
                    <ArrowLeftIcon className="h-6 w-6 text-slate-700 dark:text-white" />
                </button>
                <div className="bg-amber-100 dark:bg-amber-900/30 p-8 rounded-[40px] mb-8 shadow-inner shadow-amber-200/50 dark:shadow-none">
                    <LockIcon className="h-16 w-16 text-amber-600 dark:text-amber-400" />
                </div>
                <h1 className="text-2xl font-black text-light-text dark:text-dark-text mb-3 uppercase tracking-tighter">{t('goalCalc.exclusivePro')}</h1>
                <p className="text-light-text-secondary dark:text-dark-text-secondary mb-8 max-w-xs mx-auto font-semibold leading-relaxed">
                    {t('goalCalc.proDesc')}
                </p>
                <button 
                    onClick={() => setCurrentView('premium')}
                    className="w-full max-w-xs bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 text-white py-3.5 rounded-2xl font-black uppercase tracking-[0.1em] shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.45)] active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2 group"
                >
                    <CrownIcon className="h-5 w-5 flex-shrink-0 text-white/95 group-hover:rotate-12 transition-transform duration-300" />
                    <span>{t('goalCalc.subscribeNow')}</span>
                </button>
            </div>
        );
    }

    const [selectedGoalId, setSelectedGoalId] = useState<string>(savingsGoals[0]?.id || '');
    const [monthlyContribution, setMonthlyContribution] = useState<string>('');
    const [sliderValue, setSliderValue] = useState<number>(0);
    const [annualRate, setAnnualRate] = useState<number>(10);

    // Dados da meta selecionada
    const currentGoal = useMemo(() => 
        savingsGoals.find(g => g.id === selectedGoalId)
    , [selectedGoalId, savingsGoals]);

    const currentAmount = useMemo(() => {
        if (!selectedGoalId) return 0;
        return allTransactions
            .filter(tx => tx.goalId === selectedGoalId)
            .reduce((sum, tx) => sum + Number(tx.valor || 0), 0);
    }, [allTransactions, selectedGoalId]);

    const remaining = useMemo(() => {
        if (!currentGoal) return 0;
        return Math.max(0, currentGoal.targetAmount - currentAmount);
    }, [currentGoal, currentAmount]);

    // Média histórica de aportes para esta meta
    const averageMonthlyAporte = useMemo(() => {
        if (!selectedGoalId || !currentGoal) return 0;
        const goalTxs = allTransactions.filter(tx => tx.goalId === selectedGoalId);
        if (goalTxs.length === 0) return 0;

        const monthsMap = new Set();
        let total = 0;
        goalTxs.forEach(tx => {
            const key = tx.data.substring(0, 7); // YYYY-MM
            monthsMap.add(key);
            total += tx.valor;
        });

        const monthCount = Math.max(1, monthsMap.size);
        return total / monthCount;
    }, [allTransactions, selectedGoalId, currentGoal]);

    // Slider max: 2x o necessário/mês para prazo, ou R$ 5000 min
    const sliderMax = useMemo(() => {
        if (!currentGoal?.targetDate || remaining <= 0) return 5000;
        const today = new Date();
        const target = new Date(currentGoal.targetDate + 'T00:00:00');
        const diffMonths = Math.max(1, (target.getFullYear() - today.getFullYear()) * 12 + (target.getMonth() - today.getMonth()));
        const idealAporte = remaining / diffMonths;
        return Math.max(5000, Math.ceil((idealAporte * 3) / 100) * 100);
    }, [currentGoal, remaining]);

    // Inicializar campo de aporte com a média
    useEffect(() => {
        if (averageMonthlyAporte > 0 && !monthlyContribution) {
            const val = Math.round(averageMonthlyAporte * 100);
            setMonthlyContribution(formatCurrencyForInput(String(val)));
            setSliderValue(averageMonthlyAporte);
        }
    }, [averageMonthlyAporte]);

    // Reset quando muda de meta
    useEffect(() => {
        setMonthlyContribution('');
        setSliderValue(0);
    }, [selectedGoalId]);

    const handleInputChange = (value: string) => {
        setMonthlyContribution(formatCurrencyForInput(value));
        setSliderValue(parseCurrency(formatCurrencyForInput(value)));
    };

    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = Number(e.target.value);
        setSliderValue(val);
        setMonthlyContribution(formatCurrencyForInput(String(Math.round(val * 100))));
    };

    const handleQuickAmount = (amount: number) => {
        setSliderValue(amount);
        setMonthlyContribution(formatCurrencyForInput(String(Math.round(amount * 100))));
    };

    const aporte = parseCurrency(monthlyContribution) || 0;
    const isValidSimulation = aporte > 0 && remaining > 0;

    const simulation = useMemo(() => {
        if (!currentGoal || !isValidSimulation) return null;
        
        const target = currentGoal.targetAmount;
        let monthsToFinish = 0;
        const r_annual = annualRate / 100;
        const r_monthly = r_annual / 12;

        if (r_monthly > 0) {
             const num = target + (aporte / r_monthly);
             const den = currentAmount + (aporte / r_monthly);
             monthsToFinish = Math.ceil(Math.log(num / den) / Math.log(1 + r_monthly));
        } else {
             monthsToFinish = Math.ceil(remaining / aporte);
        }

        monthsToFinish = Math.min(Math.max(1, monthsToFinish), MAX_MONTHS);
        
        const finishDate = new Date();
        finishDate.setMonth(finishDate.getMonth() + monthsToFinish);

        // Gerar dados para o gráfico de projeção (max 12 pontos)
        const chartData = [];
        const monthsPerStep = Math.max(1, Math.ceil(monthsToFinish / 12));

        for (let i = 0; i <= 12; i++) {
            const mCount = i * monthsPerStep;
            if (mCount > monthsToFinish) break;
            
            const date = new Date();
            date.setMonth(date.getMonth() + mCount);
            
            let valAtMonth = 0;
            if (r_monthly > 0) {
                 valAtMonth = currentAmount * Math.pow(1 + r_monthly, mCount) + aporte * ((Math.pow(1 + r_monthly, mCount) - 1) / r_monthly);
            } else {
                 valAtMonth = currentAmount + (mCount * aporte);
            }

            chartData.push({
                name: date.toLocaleDateString(appLocale, { month: 'short', year: '2-digit' }),
                valor: Math.min(target, valAtMonth)
            });
        }

        // Garantir que o último ponto seja o alvo
        const lastEntry = chartData[chartData.length - 1];
        if (lastEntry && lastEntry.valor < target) {
            const endDate = new Date();
            endDate.setMonth(endDate.getMonth() + monthsToFinish);
            chartData.push({
                name: endDate.toLocaleDateString(appLocale, { month: 'short', year: '2-digit' }),
                valor: target
            });
        }

        return {
            monthsToFinish,
            finishDate,
            remaining,
            chartData,
            aporte
        };
    }, [currentGoal, currentAmount, aporte, isValidSimulation, remaining, annualRate]);

    // Comparação com aporte atual vs médio
    const comparison = useMemo(() => {
        if (!simulation || averageMonthlyAporte <= 0 || !isValidSimulation || !currentGoal) return null;
        let currentMonths = 0;
        const r_annual = annualRate / 100;
        const r_monthly = r_annual / 12;
        
        if (r_monthly > 0) {
             const num = currentGoal.targetAmount + (averageMonthlyAporte / r_monthly);
             const den = currentAmount + (averageMonthlyAporte / r_monthly);
             currentMonths = Math.ceil(Math.log(num / den) / Math.log(1 + r_monthly));
        } else {
             currentMonths = Math.ceil(remaining / averageMonthlyAporte);
        }
        currentMonths = Math.min(Math.max(1, currentMonths), MAX_MONTHS);

        const diff = currentMonths - simulation.monthsToFinish;
        return {
            currentMonths,
            diffMonths: diff,
            isFaster: diff > 0,
            isSlower: diff < 0
        };
    }, [simulation, averageMonthlyAporte, remaining, isValidSimulation, currentGoal, currentAmount, annualRate]);

    if (savingsGoals.length === 0) {
        return (
            <div className="bg-light-card-elevated dark:bg-dark-bg h-full flex flex-col items-center justify-center p-8 text-center">
                <TargetIcon className="h-16 w-16 text-slate-300 mb-4" />
                <h2 className="text-xl font-bold mb-2">{t('goalCalc.noGoalsRegistered')}</h2>
                <p className="text-sm text-slate-500 mb-6">{t('goalCalc.createGoalFirst')}</p>
                <button onClick={() => setCurrentView('main')} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold">{t('common.back')}</button>
            </div>
        );
    }

    const gridColor = theme === 'light' ? '#e2e8f0' : '#334155';
    const textColor = theme === 'light' ? '#64748b' : '#94a3b8';

    const formatMonths = (months: number) => {
        if (months >= 12) {
            const years = Math.floor(months / 12);
            const remainingMonths = months % 12;
            return remainingMonths > 0 ? `${years}a ${remainingMonths}m` : `${years} ${years > 1 ? t('common.years') : t('common.year')}`;
        }
        return `${months} ${months > 1 ? t('common.months') : t('common.month')}`;
    };

    return (
        <div className="bg-light-card-elevated dark:bg-dark-bg h-full flex flex-col text-light-text dark:text-dark-text-secondary">
            <header className="p-4 border-b border-light-border dark:border-dark-elevated bg-white dark:bg-dark-bg flex items-center gap-4 z-10 shadow-sm flex-shrink-0">
                <button onClick={() => setCurrentView('main')} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition">
                    <ArrowLeftIcon className="h-6 w-6" />
                </button>
                <div className="flex items-center gap-2">
                    <ChartBarIcon className="h-5 w-5 text-fin-info dark:text-blue-400" />
                    <h1 className="text-lg font-bold">{t('goalCalc.title')}</h1>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-4 space-y-5 no-scrollbar pb-10">
                {/* Seletor de Meta */}
                <div className="bg-white dark:bg-dark-card p-5 rounded-2xl border border-light-border dark:border-dark-elevated shadow-sm">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">{t('goalCalc.labelGoal')}</label>
                    <div className="flex flex-wrap gap-2">
                        {savingsGoals.map(g => (
                            <button
                                key={g.id}
                                onClick={() => setSelectedGoalId(g.id)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${selectedGoalId === g.id ? 'bg-fin-info border-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-light-card-elevated dark:bg-dark-bg/50 border-light-border dark:border-dark-elevated text-slate-500'}`}
                            >
                                {g.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Card de Projeção Principal */}
                {isValidSimulation && simulation ? (
                    <div className="bg-gradient-to-br from-blue-600 to-purple-700 p-5 rounded-3xl text-white shadow-xl shadow-blue-600/20">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <p className="text-indigo-200 text-[10px] font-bold uppercase tracking-widest mb-1">{t('goalCalc.simulationHeader', { aporte: formatCurrency(aporte) })}</p>
                                <h2 className="text-2xl font-black">
                                    {simulation.finishDate.toLocaleDateString(appLocale, { month: 'long', year: 'numeric' })}
                                </h2>
                                <p className="text-indigo-200 text-[11px] mt-0.5">{t('goalCalc.concludeMetaDesc')}</p>
                            </div>
                            <div className="bg-white/20 p-2 rounded-xl">
                                <CalendarIcon className="h-6 w-6" />
                            </div>
                        </div>

                        {/* Barra de progresso */}
                        {currentGoal && (
                            <div className="mb-4">
                                <div className="flex justify-between text-[10px] text-indigo-200 font-bold mb-1">
                                    <span>{t('goalCalc.alreadySaved', { amount: formatCurrency(currentAmount) })}</span>
                                    <span>{t('goalCalc.targetAmount', { amount: formatCurrency(currentGoal.targetAmount) })}</span>
                                </div>
                                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-white rounded-full transition-all duration-500"
                                        style={{ width: `${Math.min(100, (currentAmount / currentGoal.targetAmount) * 100).toFixed(1)}%` }}
                                    />
                                </div>
                                <p className="text-right text-[10px] text-indigo-200 mt-1">
                                    {t('goalCalc.completedPercent', { percent: ((currentAmount / currentGoal.targetAmount) * 100).toFixed(0) })}
                                </p>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white/10 p-3 rounded-2xl">
                                <p className="text-[10px] text-indigo-200 font-bold uppercase mb-1">{t('goalCalc.timeToTarget')}</p>
                                <p className="text-xl font-black">{formatMonths(simulation.monthsToFinish)}</p>
                                <p className="text-[10px] text-blue-300 mt-0.5">{t('goalCalc.fromToday')}</p>
                            </div>
                            <div className="bg-white/10 p-3 rounded-2xl">
                                <p className="text-[10px] text-indigo-200 font-bold uppercase mb-1">{t('goalCalc.stillMissing')}</p>
                                <p className="text-xl font-black">{formatCurrency(simulation.remaining)}</p>
                                <p className="text-[10px] text-blue-300 mt-0.5">{t('goalCalc.toReachTarget')}</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-gradient-to-br from-slate-700 to-slate-800 p-6 rounded-3xl text-white shadow-xl">
                        <div className="flex flex-col items-center text-center py-4">
                            <div className="bg-white/10 p-4 rounded-2xl mb-4">
                                <PiggyBankIcon className="h-10 w-10 text-slate-400" />
                            </div>
                            {remaining <= 0 ? (
                                <>
                                    <p className="text-lg font-black text-emerald-400">{t('goalCalc.goalCompleted')}</p>
                                    <p className="text-xs text-slate-400 mt-1">{t('goalCalc.congratsGoalReached')}</p>
                                </>
                            ) : (
                                <>
                                    <p className="text-sm font-bold text-slate-300">{t('goalCalc.defineMonthlyAporte')}</p>
                                    <p className="text-xs text-slate-500 mt-1">{t('goalCalc.simulateScenariosDesc')}</p>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Simulador de Aporte com Slider */}
                <div className="bg-white dark:bg-dark-card p-5 rounded-2xl border border-light-border dark:border-dark-elevated shadow-sm">
                    <div className="flex justify-between items-center mb-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('goalCalc.simulateMonthlyAporte')}</label>
                        {averageMonthlyAporte > 0 && (
                            <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full font-bold">{t('goalCalc.yourAverage', { average: formatCurrency(averageMonthlyAporte) })}</span>
                        )}
                    </div>
                    <p className="text-[10px] text-light-text-muted dark:text-dark-text-muted mb-3 ml-1">{t('goalCalc.howMuchToSave')}</p>

                    {/* Input de valor */}
                    <input 
                        type="tel"
                        value={monthlyContribution}
                        onChange={e => handleInputChange(e.target.value)}
                        className="w-full py-4 px-5 bg-light-card-elevated dark:bg-dark-bg text-2xl font-black text-center text-fin-info dark:text-blue-400 rounded-2xl border border-light-border dark:border-dark-elevated outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                        placeholder={t('goalCalc.placeholderAporte')}
                    />

                    {/* Slider Real */}
                    <input
                        type="range"
                        min={0}
                        max={sliderMax}
                        step={50}
                        value={sliderValue}
                        onChange={handleSliderChange}
                        className="goal-slider w-full h-2 rounded-full appearance-none cursor-pointer mb-1"
                        style={{
                            background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${(sliderValue / sliderMax) * 100}%, ${theme === 'dark' ? '#1e293b' : '#e2e8f0'} ${(sliderValue / sliderMax) * 100}%, ${theme === 'dark' ? '#1e293b' : '#e2e8f0'} 100%)`
                        }}
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 font-bold px-0.5">
                        <span>{t('goalCalc.minAporte')}</span>
                        <span>{formatCurrency(sliderMax)}</span>
                    </div>

                    {/* Botões de atalho */}
                    <div className="flex gap-2 mt-4">
                        {[100, 500, 1000, 2000].map(amount => (
                            <button
                                key={amount}
                                onClick={() => handleQuickAmount(amount)}
                                className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase border transition-all active:scale-95 ${
                                    Math.abs(aporte - amount) < 1 
                                        ? 'bg-fin-info border-blue-600 text-white shadow-md shadow-blue-500/20' 
                                        : 'bg-light-card-elevated dark:bg-dark-bg/50 border-light-border dark:border-dark-elevated text-light-text-muted dark:text-dark-text-muted'
                                }`}
                            >
                                {amount >= 1000 ? `${amount / 1000}k` : amount}
                            </button>
                        ))}
                    </div>

                    {/* Taxa de Rendimento Anual */}
                    <div className="mt-5 pt-4 border-t border-light-border dark:border-dark-elevated">
                        <div className="flex justify-between items-center mb-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1"><SparklesIcon className="h-3 w-3 text-emerald-500" /> {t('goalCalc.investmentInterest')}</label>
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{t('goalCalc.percentPerYear', { rate: annualRate })}</span>
                        </div>
                        <p className="text-[10px] text-light-text-muted dark:text-dark-text-muted mb-2 ml-1">{t('goalCalc.interestExplanation')}</p>
                        <input
                            type="range"
                            min={0}
                            max={20}
                            step={1}
                            value={annualRate}
                            onChange={(e) => setAnnualRate(Number(e.target.value))}
                            className="goal-slider w-full h-2 rounded-full appearance-none cursor-pointer mb-1"
                            style={{
                                background: `linear-gradient(to right, #10b981 0%, #10b981 ${(annualRate / 20) * 100}%, ${theme === 'dark' ? '#1e293b' : '#e2e8f0'} ${(annualRate / 20) * 100}%, ${theme === 'dark' ? '#1e293b' : '#e2e8f0'} 100%)`
                            }}
                        />
                        <div className="flex justify-between text-[10px] text-slate-400 font-bold px-0.5">
                            <span>{t('goalCalc.noYield')}</span>
                            <span>{t('goalCalc.variableYield')}</span>
                        </div>
                    </div>
                </div>

                {/* Card de Comparação */}
                {comparison && isValidSimulation && (
                    <div className={`p-4 rounded-2xl border flex items-start gap-3 ${
                        comparison.isFaster 
                            ? 'bg-emerald-50 dark:bg-emerald-900/15 border-emerald-100 dark:border-emerald-800/30' 
                            : comparison.isSlower
                            ? 'bg-amber-50 dark:bg-amber-900/15 border-amber-100 dark:border-amber-800/30'
                            : 'bg-light-card-elevated dark:bg-dark-card border-light-border dark:border-dark-elevated'
                    }`}>
                        <div className={`p-2 rounded-xl flex-shrink-0 ${comparison.isFaster ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-amber-100 dark:bg-amber-900/30'}`}>
                            {comparison.isFaster 
                                ? <ArrowUpIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" /> 
                                : <ArrowDownIcon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                            }
                        </div>
                        <div className="flex-1">
                            <p className={`text-xs font-bold mb-1 ${
                                comparison.isFaster ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'
                            }`}>
                                {comparison.isFaster 
                                    ? t('goalCalc.fasterThanCurrent', { months: Math.abs(comparison.diffMonths) })
                                    : t('goalCalc.slowerThanCurrent', { months: Math.abs(comparison.diffMonths) })
                                }
                            </p>
                            <p className="text-[10px] text-light-text-muted dark:text-dark-text-muted font-medium leading-relaxed">
                                {comparison.isFaster
                                    ? t('goalCalc.fasterDesc', { aporte: formatCurrency(aporte), average: formatCurrency(averageMonthlyAporte) })
                                    : t('goalCalc.slowerDesc', { aporte: formatCurrency(aporte), average: formatCurrency(averageMonthlyAporte) })
                                }
                            </p>
                        </div>
                    </div>
                )}

                {/* Gráfico de Projeção */}
                {isValidSimulation && simulation && simulation.chartData.length > 1 && (
                    <div className="bg-white dark:bg-dark-card p-5 rounded-2xl border border-light-border dark:border-dark-elevated shadow-sm">
                        <div className="mb-4">
                            <h3 className="text-sm font-bold flex items-center gap-2 mb-1">
                                <ChartBarIcon className="h-4 w-4 text-emerald-500" />
                                {t('goalCalc.growthCurve')}
                            </h3>
                            <p className="text-[10px] text-light-text-muted dark:text-dark-text-muted leading-relaxed">
                                {t('goalCalc.chartExplanation', { amount: formatCurrency(currentGoal?.targetAmount || 0) })}
                            </p>
                        </div>
                        <div className="h-48 w-full -ml-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={simulation.chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                                    <XAxis dataKey="name" tick={{ fill: textColor, fontSize: 10 }} axisLine={false} tickLine={false} />
                                    <YAxis hide domain={[0, currentGoal?.targetAmount || 'auto']} />
                                    <Tooltip 
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', backgroundColor: theme === 'dark' ? '#1E293B' : '#FFF' }}
                                        formatter={(v: number) => [formatCurrency(v), t('goalCalc.accumulatedBalance')]}
                                        labelFormatter={(label) => `📅 ${label}`}
                                        cursor={false}
                                    />
                                    <Line type="monotone" dataKey="valor" stroke="#6366f1" strokeWidth={3} dot={{ r: 4, fill: '#6366f1' }} activeDot={{ r: 6 }} animationDuration={800} />
                                    <ReferenceLine y={currentGoal?.targetAmount} stroke="#10b981" strokeDasharray="5 5" label={{ position: 'insideTopRight', value: t('goalCalc.chartTargetLabel'), fill: '#10b981', fontSize: 9, fontWeight: 'bold' }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex items-center gap-4 justify-center mt-3">
                            <div className="flex items-center gap-1.5">
                                <div className="w-6 h-1 rounded-full bg-blue-500"></div>
                                <span className="text-[10px] text-slate-400 font-medium">{t('goalCalc.accumulatedBalance')}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-6 h-0.5 border-t-2 border-dashed border-emerald-500"></div>
                                <span className="text-[10px] text-slate-400 font-medium">{t('goalCalc.metaWithAmount', { amount: formatCurrency(currentGoal?.targetAmount || 0) })}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Dicas de IA / Insights */}
                {isValidSimulation && simulation && simulation.aporte > 0 && simulation.monthsToFinish > 1 && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-2xl border border-blue-100 dark:border-blue-800/30 flex gap-4">
                        <div className="bg-white dark:bg-dark-card p-2 h-fit rounded-xl shadow-sm">
                            <SparklesIcon className="h-5 w-5 text-fin-info dark:text-blue-400" />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-blue-900 dark:text-indigo-200 mb-1">{t('goalCalc.increaseAporteTip')}</h4>
                            <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                                {t('goalCalc.increaseAporteTipDesc', { amount: formatCurrency(simulation.aporte * 1.2), beforeTime: formatMonths(Math.max(1, Math.ceil(simulation.monthsToFinish * 0.15))) })}
                            </p>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default GoalCalculator;
