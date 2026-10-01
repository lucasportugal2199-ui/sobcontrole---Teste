import React, { useState, useMemo, useContext, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AppContext } from '../context/AppContext';
import { SavingsGoal } from '../types';
import { ArrowLeftIcon, PiggyBankIcon, PlusIcon, DotsVerticalIcon, EditIcon, TrashIcon, CalendarIcon, ChartBarIcon, LockIcon, CheckCircleIcon, ClipboardListIcon, LoaderIcon } from './icons';
import { formatCurrency, formatCurrencyForInput, parseCurrency, formatDateToInput } from '../utils/helpers';
import Modal from './Modal';
import Calendar from './Calendar';
import { ContextualTip } from './ContextualTip';
import { useTranslation } from '../i18n';

// --- PROGRESS RING COMPONENT ---
const ProgressRing: React.FC<{ percentage: number; isCompleted: boolean; size?: number }> = ({ percentage, isCompleted, size = 56 }) => {
    const strokeWidth = 5;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (Math.min(percentage, 100) / 100) * circumference;

    const getColor = () => {
        if (isCompleted) return '#10b981';
        return '#EA580C';
    };

    return (
        <svg width={size} height={size} className="flex-shrink-0 -rotate-90">
            <circle
                cx={size / 2} cy={size / 2} r={radius}
                stroke="currentColor"
                className="text-slate-100 dark:text-white/10"
                strokeWidth={strokeWidth}
                fill="none"
            />
            <circle
                cx={size / 2} cy={size / 2} r={radius}
                stroke={getColor()}
                strokeWidth={strokeWidth}
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 1s ease-out, stroke 0.5s' }}
            />
        </svg>
    );
};

// --- GOAL CARD COMPONENT ---
const GoalCard: React.FC<{
    goal: SavingsGoal & { currentAmount: number; isCompleted: boolean };
    onAddFunds: (goal: SavingsGoal) => void;
    onEdit: (goal: SavingsGoal) => void;
    onDelete: (goal: SavingsGoal) => void;
    isPremium?: boolean;
    appLocale: string;
    appCurrency: string;
}> = ({ goal, onAddFunds, onEdit, onDelete, isPremium, appLocale, appCurrency }) => {
    const { t, locale } = useTranslation();
    const [menuOpen, setMenuOpen] = useState(false);

    const percentage = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
    const remaining = goal.targetAmount - goal.currentAmount;

    return (
        <li className={`p-4 rounded-2xl space-y-3.5 shadow-sm border transition-all ${
            goal.isCompleted 
                ? 'bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/20 dark:to-dark-card border-emerald-200 dark:border-emerald-800/40' 
                : 'bg-white dark:bg-dark-card border-light-border dark:border-white/[0.05]'
        }`}>
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                    {/* Progress Ring */}
                    <div className="relative">
                        <ProgressRing percentage={percentage} isCompleted={goal.isCompleted} size={46} />
                        <span className={`absolute inset-0 flex items-center justify-center text-[10px] font-bold tabular-nums ${
                            goal.isCompleted ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-200'
                        }`}>
                            {goal.isCompleted ? '✓' : `${Math.min(percentage, 100).toFixed(0)}%`}
                        </span>
                    </div>
                    <div>
                        <h3 className="font-semibold text-light-text dark:text-dark-text text-[15px] leading-tight">{goal.name}</h3>
                        <p className="text-[11px] font-normal text-slate-500 dark:text-slate-400 mt-0.5">
                            {locale === 'en' ? 'Target' : locale === 'es' ? 'Objetivo' : locale === 'fr' ? 'Cible' : locale === 'de' ? 'Ziel' : 'Alvo'}: <span className="font-semibold tabular-nums text-slate-700 dark:text-slate-300">{formatCurrency(goal.targetAmount, appLocale, appCurrency)}</span>
                        </p>
                        {goal.targetDate && (() => {
                            const today = new Date();
                            const target = new Date(goal.targetDate + 'T00:00:00');
                            const daysLeft = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                            const isOverdue = daysLeft < 0;
                            const isUrgent = daysLeft >= 0 && daysLeft <= 7;
                            const isNear = daysLeft > 7 && daysLeft <= 30;
                            const colorClass = isOverdue || isUrgent
                                ? 'text-rose-500 dark:text-rose-400'
                                : isNear
                                ? 'text-amber-500 dark:text-amber-400'
                                : 'text-slate-500 dark:text-slate-400';
                            return (
                                <p className={`text-[11px] font-normal mt-0.5 flex items-center gap-1 ${colorClass}`}>
                                    <CalendarIcon className="h-3 w-3" />
                                    {target.toLocaleDateString(appLocale)}
                                    {isOverdue && <span className="ml-0.5 font-medium">⚠️ {locale === 'en' ? 'Overdue' : 'Vencida'}</span>}
                                    {isUrgent && !isOverdue && <span className="ml-0.5 font-medium">🔴 {daysLeft}d</span>}
                                    {isNear && <span className="ml-0.5 font-medium">🟡 {daysLeft}d</span>}
                                </p>
                            );
                        })()}
                    </div>
                </div>
                <div className="relative">
                    <button onClick={() => setMenuOpen(!menuOpen)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                        <DotsVerticalIcon className="h-4 w-4 text-slate-400" />
                    </button>
                    {menuOpen && (
                        <div className="absolute right-0 mt-2 w-36 bg-white dark:bg-dark-elevated rounded-xl shadow-xl z-[10] border border-light-border dark:border-white/10 overflow-hidden">
                            <button onClick={() => { onEdit(goal); setMenuOpen(false); }} className="flex items-center gap-2.5 w-full text-left px-3.5 py-2.5 text-xs font-medium text-light-text dark:text-dark-text-secondary hover:bg-slate-50 dark:hover:bg-white/5">
                                <EditIcon className="h-3.5 w-3.5" /> {t('common.edit')}
                            </button>
                            <button onClick={() => { onDelete(goal); setMenuOpen(false); }} className="flex items-center gap-2.5 w-full text-left px-3.5 py-2.5 text-xs font-medium text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20">
                                <TrashIcon className="h-3.5 w-3.5" /> {t('common.delete')}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Progress Bar */}
            <div>
                <div className="flex justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1 tabular-nums">
                    <span>{formatCurrency(goal.currentAmount, appLocale, appCurrency)}</span>
                    <span className={goal.isCompleted ? "text-emerald-500 font-semibold" : "text-slate-400"}>{formatCurrency(goal.targetAmount, appLocale, appCurrency)}</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-white/[0.06] rounded-full h-2 overflow-hidden">
                    <div
                        className={`h-2 rounded-full transition-all duration-1000 ease-out ${
                            goal.isCompleted 
                                ? 'bg-emerald-500 shadow-sm shadow-emerald-500/30' 
                                : 'bg-gradient-to-r from-amber-500 to-[#EA580C] dark:from-[#EA580C] dark:to-[#F97316] shadow-sm shadow-[#EA580C]/25'
                        }`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                </div>
                <p className={`text-[11px] font-medium mt-1 text-right tabular-nums ${goal.isCompleted ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
                    {remaining > 0 
                        ? `${locale === 'en' ? 'Remaining' : locale === 'es' ? 'Falta' : locale === 'fr' ? 'Restant' : locale === 'de' ? 'Verbleibend' : 'Faltam'} ${formatCurrency(remaining, appLocale, appCurrency)}` 
                        : (locale === 'en' ? 'Goal Completed! 🎉🏆' : locale === 'es' ? '¡Meta Completada! 🎉🏆' : locale === 'fr' ? 'Objectif Atteint ! 🎉🏆' : locale === 'de' ? 'Ziel erreicht! 🎉🏆' : 'Meta Concluída! 🎉🏆')}
                </p>
            </div>

            {/* Aporte Sugerido (PRO) */}
            {isPremium && !goal.isCompleted && goal.targetDate && remaining > 0 && (
                <div className="p-2.5 bg-slate-50 dark:bg-white/[0.03] rounded-xl border border-slate-200/80 dark:border-white/[0.06]">
                    <p className="text-[10px] font-semibold text-[#EA580C] dark:text-[#F97316] uppercase tracking-[0.5px] flex items-center gap-1.5">
                        <ChartBarIcon className="h-3 w-3" />
                        {locale === 'en' ? 'Suggested Contribution' : locale === 'es' ? 'Aporte Sugerido' : locale === 'fr' ? 'Contribution Suggérée' : locale === 'de' ? 'Vorgeschlagener Beitrag' : 'Aporte Sugerido'}
                    </p>
                    {(() => {
                        const today = new Date();
                        const target = new Date(goal.targetDate + 'T00:00:00');
                        const diffMonths = (target.getFullYear() - today.getFullYear()) * 12 + (target.getMonth() - today.getMonth());
                        const months = Math.max(3, diffMonths);
                        const suggested = remaining / months;
                        const isOverdue = diffMonths <= 0;
                        const isNearDeadline = diffMonths > 0 && diffMonths <= 2;
                        return (
                            <>
                                <p className="text-xs font-semibold text-light-text dark:text-white mt-0.5 tabular-nums">
                                    {formatCurrency(suggested, appLocale, appCurrency)} / {locale === 'en' ? 'mo' : locale === 'es' ? 'mes' : locale === 'fr' ? 'mois' : locale === 'de' ? 'Mon.' : 'mês'}
                                </p>
                                <p className="text-[10px] font-normal text-slate-400 mt-0.5">
                                    {isOverdue
                                        ? (locale === 'en' ? `Overdue — suggestion for ${months} months` : locale === 'es' ? `Plazo vencido — sugerencia para ${months} meses` : locale === 'fr' ? `En retard — suggestion pour ${months} mois` : locale === 'de' ? `Überfällig — Vorschlag für ${months} Monate` : `Prazo vencido — sugestão para ${months} meses`)
                                        : isNearDeadline
                                        ? (locale === 'en' ? `Near deadline — suggestion for ${months} months` : locale === 'es' ? `Plazo próximo — sugerencia para ${months} meses` : locale === 'fr' ? `Échéance proche — suggestion pour ${months} mois` : locale === 'de' ? `Kurz vor Fristende — Vorschlag für ${months} Monate` : `Prazo próximo — sugestão para ${months} meses`)
                                        : (locale === 'en' ? `To complete by ${new Date(goal.targetDate + 'T00:00:00').toLocaleDateString(appLocale)}` : locale === 'es' ? `Para completar el ${new Date(goal.targetDate + 'T00:00:00').toLocaleDateString(appLocale)}` : locale === 'fr' ? `À réaliser d'ici le ${new Date(goal.targetDate + 'T00:00:00').toLocaleDateString(appLocale)}` : locale === 'de' ? `Fertigstellung bis ${new Date(goal.targetDate + 'T00:00:00').toLocaleDateString(appLocale)}` : `Para concluir em ${new Date(goal.targetDate + 'T00:00:00').toLocaleDateString(appLocale)}`)
                                    }
                                </p>
                            </>
                        );
                    })()}
                </div>
            )}

            {/* Botão Aportar */}
            {!goal.isCompleted && (
                <button
                    onClick={() => onAddFunds(goal)}
                    className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/10 text-slate-900 dark:text-white border border-slate-200/80 dark:border-white/10 font-semibold py-2.5 rounded-xl text-xs active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 shadow-sm"
                >
                    <PlusIcon className="h-3.5 w-3.5 text-[#EA580C] dark:text-[#F97316]" />
                    <span>{locale === 'en' ? 'Contribute funds' : locale === 'es' ? 'Aportar fondos' : locale === 'fr' ? 'Contribuer' : locale === 'de' ? 'Beitrag leisten' : 'Aportar valor'}</span>
                </button>
            )}
        </li>
    );
};

const SavingsGoals: React.FC = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error("SavingsGoals must be used within an AppProvider");
    const { t, locale, currency } = useTranslation();
    const appLocale = locale === 'pt' ? 'pt-BR' : locale === 'en' ? 'en-US' : locale === 'es' ? 'es-ES' : locale === 'fr' ? 'fr-FR' : 'de-DE';
    const appCurrency = currency || 'BRL';

    const {
        savingsGoals, handleAddGoal, handleEditGoal,
        handleDeleteGoal, handleAddFundsToGoal, allTransactions, setCurrentView,
        userProfile
    } = context;

    const [modalMode, setModalMode] = useState<'add' | 'edit' | 'delete' | 'addFunds' | 'fundsCalendar' | 'targetCalendar' | null>(null);
    const [selectedGoal, setSelectedGoal] = useState<SavingsGoal | null>(null);
    const [goalName, setGoalName] = useState('');
    const [goalAmount, setGoalAmount] = useState('');
    const [fundsAmount, setFundsAmount] = useState('');
    const [fundsDate, setFundsDate] = useState(formatDateToInput(new Date()));
    const [targetDate, setTargetDate] = useState('');
    const [error, setError] = useState('');

    // Filtro de estado das metas
    const [filterMode, setFilterMode] = useState<'all' | 'active' | 'completed'>('all');

    const visibleGoals = useMemo(() => {
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        return savingsGoals.map(goal => {
            const currentAmount = allTransactions
                .filter(tx => tx.goalId === goal.id && tx.data <= todayStr)
                .reduce((sum, tx) => sum + Number(tx.valor || 0), 0);
            const isCompleted = currentAmount >= goal.targetAmount;
            return { ...goal, currentAmount, isCompleted };
        }).filter(g => {
            if (filterMode === 'active') return !g.isCompleted;
            if (filterMode === 'completed') return g.isCompleted;
            return true;
        }).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }, [savingsGoals, allTransactions, filterMode]);

    const openModal = (mode: 'add' | 'edit' | 'delete' | 'addFunds' | 'fundsCalendar' | 'targetCalendar', goal?: SavingsGoal) => {
        setModalMode(mode);
        if (goal) setSelectedGoal(goal);
        if (goal && mode === 'edit') {
            setGoalName(goal.name);
            setGoalAmount(formatCurrencyForInput(String(Math.round(goal.targetAmount * 100))));
            setTargetDate(goal.targetDate || '');
        }
    };

    const closeModal = () => {
        setModalMode(null);
        setSelectedGoal(null);
        setGoalName('');
        setGoalAmount('');
        setFundsAmount('');
        setFundsDate(formatDateToInput(new Date()));
        setError('');
    };

    const handleGoalSubmit = () => {
        const amount = parseCurrency(goalAmount);
        if (!goalName.trim()) { 
            setError(locale === 'en' ? 'Name is required.' : locale === 'es' ? 'Nombre obligatorio.' : locale === 'fr' ? 'Nom requis.' : locale === 'de' ? 'Name erforderlich.' : 'Nome obrigatório.'); 
            return; 
        }
        if (amount <= 0) { 
            setError(locale === 'en' ? 'Invalid amount.' : locale === 'es' ? 'Monto inválido.' : locale === 'fr' ? 'Montant invalide.' : locale === 'de' ? 'Ungültiger Betrag.' : 'Valor inválido.'); 
            return; 
        }
        if (modalMode === 'add') handleAddGoal(goalName.trim(), amount, targetDate || undefined);
        else if (modalMode === 'edit' && selectedGoal) handleEditGoal(selectedGoal.id, goalName.trim(), amount, targetDate || undefined);
        closeModal();
    };

    const handleFundsSubmit = () => {
        const amount = parseCurrency(fundsAmount);
        if (amount <= 0) { 
            setError(locale === 'en' ? 'Enter a positive amount.' : locale === 'es' ? 'Ingrese un monto positivo.' : locale === 'fr' ? 'Entrez un montant positif.' : locale === 'de' ? 'Geben Sie einen positiven Betrag ein.' : 'Insira um valor positivo.'); 
            return; 
        }
        if (selectedGoal) handleAddFundsToGoal(selectedGoal.id, amount, fundsDate);
        closeModal();
    };

    const handleDeleteConfirm = () => {
        if (selectedGoal) handleDeleteGoal(selectedGoal.id);
        closeModal();
    };

    const handleFundsDateSelect = (date: string) => {
        setFundsDate(date);
        setModalMode('addFunds');
    };

    const handleTargetDateSelect = (date: string) => {
        setTargetDate(date);
        setModalMode(selectedGoal ? 'edit' : 'add');
    };

    const handleCalculatorClick = () => {
        if (!userProfile.isPremium) {
            setCurrentView('premium');
            return;
        }
        setCurrentView('calculadora');
    };

    return (
        <div className="bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text-secondary h-full p-4 flex flex-col transition-colors duration-300">
            {/* Título: Metas é aberta pelo Menu (não tem aba na barra) */}
            <div className="flex items-center gap-2 mb-3 flex-shrink-0">
                <button
                    onClick={() => setCurrentView('menu')}
                    aria-label={t('common.back')}
                    className="h-9 w-9 flex items-center justify-center rounded-xl bg-white dark:bg-dark-card border border-light-border dark:border-white/[0.08] text-light-text dark:text-dark-text active:scale-95 transition-transform"
                >
                    <ArrowLeftIcon className="h-4 w-4" />
                </button>
                <h1 className="text-lg font-bold text-light-text dark:text-dark-text">{t('menu.shortcut.goals')}</h1>
            </div>

            <header className="flex justify-between items-center mb-4 flex-shrink-0">
                <button
                    onClick={handleCalculatorClick}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 text-[11px] font-medium rounded-full bg-white dark:bg-dark-card text-light-text dark:text-dark-text border border-light-border dark:border-white/[0.08] transition-all active:scale-95 shadow-sm hover:bg-slate-50 dark:hover:bg-dark-elevated"
                >
                    <ChartBarIcon className="h-3.5 w-3.5 text-[#EA580C] dark:text-[#F97316]" />
                    <span>{locale === 'en' ? 'Calculator' : locale === 'es' ? 'Calculadora' : locale === 'fr' ? 'Calculatrice' : locale === 'de' ? 'Taschenrechner' : 'Calculadora'}</span>
                    {!userProfile.isPremium && <LockIcon className="h-3 w-3 text-amber-500 ml-0.5" />}
                </button>
                <button
                    onClick={() => openModal('add')}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 text-[11px] font-semibold rounded-full bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 shadow-sm transition-all active:scale-95"
                >
                    <PlusIcon className="h-3.5 w-3.5 stroke-[2.2]" />
                    <span>{locale === 'en' ? 'New goal' : locale === 'es' ? 'Nueva meta' : locale === 'fr' ? 'Nouvel objectif' : locale === 'de' ? 'Neues Ziel' : 'Nova meta'}</span>
                </button>
            </header>

            {/* Filtros de Metas - Centralizado */}
            <div className="flex justify-center gap-1.5 mb-4 overflow-x-auto no-scrollbar pb-1 flex-shrink-0">
                {[
                    { id: 'all', label: t('common.all'), icon: <ClipboardListIcon className="h-3 w-3" /> },
                    { id: 'active', label: locale === 'en' ? 'Active' : locale === 'es' ? 'Activas' : locale === 'fr' ? 'Actifs' : locale === 'de' ? 'Aktiv' : 'Em aberto', icon: <LoaderIcon className="h-3 w-3" /> },
                    { id: 'completed', label: locale === 'en' ? 'Completed' : locale === 'es' ? 'Completadas' : locale === 'fr' ? 'Terminés' : locale === 'de' ? 'Abgeschlossen' : 'Concluídas', icon: <CheckCircleIcon className="h-3 w-3" /> }
                ].map(btn => (
                    <button
                        key={btn.id}
                        onClick={() => setFilterMode(btn.id as any)}
                        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] transition-all whitespace-nowrap ${
                            filterMode === btn.id
                                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold shadow-sm'
                                : 'bg-white dark:bg-dark-card border border-light-border dark:border-white/[0.06] text-slate-500 dark:text-slate-400 font-medium hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        {btn.icon}
                        <span>{btn.label}</span>
                    </button>
                ))}
            </div>

            <main className="flex-1 overflow-y-auto no-scrollbar pb-24">
                <ContextualTip
                    id="tip-metas-poupanca"
                    title={`${t('common.tip') || 'Dica'}: ${locale === 'en' ? 'Goals and piggy banks' : locale === 'es' ? 'Metas y alcancías' : locale === 'fr' ? 'Objectifs et tirelires' : locale === 'de' ? 'Ziele und Sparschweine' : 'Metas e Cofrinhos'}`}
                    description={locale === 'en' ? 'Create goals for your dreams and make contributions. The contribution amount is automatically debited from the selected account balance.' : locale === 'es' ? 'Crea metas para tus sueños y haz aportes. El valor aportado se debita automáticamente del saldo de la cuenta selecionada.' : locale === 'fr' ? 'Créez des objectifs pour vos rêves et faites des contributions. Le montant versé est automatiquement débité du solde du compte sélectionné.' : locale === 'de' ? 'Erstellen Sie Ziele für Ihre Träume und leisten Sie Beiträge. Der eingezahlte Betrag wird automatisch vom ausgewählten Kontoguthaben abgezogen.' : 'Crie metas para seus sonhos e faça aportes. O valor aportado é debitado automaticamente do saldo da conta selecionada.'}
                    className="mb-4"
                />
                {visibleGoals.length === 0 ? (
                    <div className="text-center py-20 opacity-40">
                        {filterMode === 'all' ? (
                            <>
                                <PiggyBankIcon className="h-16 w-16 mx-auto mb-4" />
                                <h3 className="text-lg font-bold">{locale === 'en' ? 'No goals' : locale === 'es' ? 'Ninguna meta' : locale === 'fr' ? 'Aucun objectif' : locale === 'de' ? 'Keine Ziele' : 'Nenhuma meta'}</h3>
                                <p className="text-sm">{locale === 'en' ? 'Plan your dreams here.' : locale === 'es' ? 'Planifica tus sueños aquí.' : locale === 'fr' ? 'Planifiez vos rêves ici.' : locale === 'de' ? 'Planen Sie Ihre Träume hier.' : 'Planeje seus sonhos aqui.'}</p>
                            </>
                        ) : (
                            <>
                                <ClipboardListIcon className="h-16 w-16 mx-auto mb-4" />
                                <h3 className="text-lg font-bold">{locale === 'en' ? 'No results' : locale === 'es' ? 'Sin resultados' : locale === 'fr' ? 'Aucun résultat' : locale === 'de' ? 'Keine Ergebnisse' : 'Nenhum resultado'}</h3>
                                <p className="text-sm">{locale === 'en' ? 'Try changing the filter.' : locale === 'es' ? 'Intente cambiar el filtro.' : locale === 'fr' ? 'Essayez de changer le filtre.' : locale === 'de' ? 'Versuchen Sie, den Filter zu ändern.' : 'Tente mudar o filtro.'}</p>
                            </>
                        )}
                    </div>
                ) : (
                    <ul className="space-y-5">
                        {visibleGoals.map(goal => (
                            <GoalCard key={goal.id} goal={goal} onAddFunds={(g) => openModal('fundsCalendar', g)} onEdit={(g) => openModal('edit', g)} onDelete={(g) => openModal('delete', g)} isPremium={userProfile.isPremium} appLocale={appLocale} appCurrency={appCurrency} />
                        ))}
                    </ul>
                )}
            </main>

            {/* Modais de Criar/Editar Meta */}
            <Modal isOpen={modalMode === 'add' || modalMode === 'edit'} onClose={closeModal}>
                <div>
                    <h3 className="text-lg font-bold text-light-text dark:text-dark-text mb-6 uppercase tracking-tight">
                        {modalMode === 'add' 
                            ? (locale === 'en' ? 'New Goal' : locale === 'es' ? 'Nueva Meta' : locale === 'fr' ? 'Nouvel Objectif' : locale === 'de' ? 'Neues Ziel' : 'Nova Meta') 
                            : (locale === 'en' ? 'Edit Goal' : locale === 'es' ? 'Editar Meta' : locale === 'fr' ? "Modifier l'Objectif" : locale === 'de' ? 'Ziel Bearbeiten' : 'Editar Meta')}
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase mb-1 ml-1 tracking-tight">
                                {locale === 'en' ? 'Goal Name' : locale === 'es' ? 'Nombre de la Meta' : locale === 'fr' ? "Nom de l'Objectif" : locale === 'de' ? 'Zielname' : 'Nome da Meta'}
                            </label>
                            <input type="text" value={goalName} onChange={e => setGoalName(e.target.value)} className="w-full py-3.5 px-4 bg-light-card-elevated dark:bg-dark-bg text-light-text dark:text-dark-text border border-light-border dark:border-dark-elevated rounded-xl font-bold text-sm focus:border-[#EA580C] dark:focus:border-[#EA580C] outline-none" placeholder={locale === 'en' ? 'Trip, House, etc...' : locale === 'es' ? 'Viaje, Casa, etc...' : locale === 'fr' ? 'Voyage, Maison, etc...' : locale === 'de' ? 'Reise, Haus, etc...' : 'Viagem, Casa, etc...'} autoFocus />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase mb-1 ml-1 tracking-tight">
                                {locale === 'en' ? 'Target Value' : locale === 'es' ? 'Monto Objetivo' : locale === 'fr' ? 'Cible de Valeur' : locale === 'de' ? 'Zielwert' : 'Valor Alvo'}
                            </label>
                            <input type="tel" value={goalAmount} onChange={e => setGoalAmount(formatCurrencyForInput(e.target.value))} className="w-full py-3.5 px-4 bg-light-card-elevated dark:bg-dark-bg text-light-text dark:text-dark-text border border-light-border dark:border-dark-elevated rounded-xl font-bold text-sm focus:border-[#EA580C] dark:focus:border-[#EA580C] outline-none tabular-nums" placeholder={formatCurrency(0, appLocale, appCurrency)} />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase mb-1 ml-1 tracking-tight font-black">
                                {locale === 'en' ? 'Completion Forecast (Optional)' : locale === 'es' ? 'Previsión de Finalización (Opcional)' : locale === 'fr' ? 'Prévision de Réalisation (Optionnel)' : locale === 'de' ? 'Prognose zur Fertigstellung (Optional)' : 'Previsão de Conclusão (Opcional)'}
                            </label>
                            <button
                                onClick={() => openModal('targetCalendar')}
                                className="w-full py-3.5 px-4 bg-light-card-elevated dark:bg-dark-bg text-light-text dark:text-dark-text border border-light-border dark:border-dark-elevated rounded-xl font-bold text-sm flex justify-between items-center transition-all active:scale-[0.99]"
                            >
                                <span className={targetDate ? "opacity-100" : "opacity-40"}>
                                    {targetDate ? new Date(targetDate + 'T00:00:00').toLocaleDateString(appLocale) : (locale === 'en' ? 'mm/dd/yyyy' : 'dd/mm/aaaa')}
                                </span>
                                <CalendarIcon className="h-4 w-4 text-[#EA580C] dark:text-[#F97316]" />
                            </button>
                        </div>
                        {error && <p className="text-rose-500 text-[10px] font-bold uppercase">{error}</p>}
                    </div>
                    <div className="flex gap-3 mt-8">
                        <button onClick={closeModal} className="flex-1 py-3.5 rounded-xl bg-slate-100 dark:bg-dark-bg text-slate-600 dark:text-slate-300 font-bold text-xs uppercase tracking-wider">{t('common.cancel')}</button>
                        <button onClick={handleGoalSubmit} className="flex-1 py-3.5 rounded-xl bg-[#EA580C] hover:bg-[#F97316] text-white font-black text-xs shadow-lg shadow-[#EA580C]/20 uppercase tracking-widest active:scale-95 transition-all">{t('common.save')}</button>
                    </div>
                </div>
            </Modal>

            {/* Modal de Calendário para Aporte */}
            <Modal isOpen={modalMode === 'fundsCalendar'} onClose={closeModal}>
                <div className="text-center mb-4">
                    <h3 className="text-lg font-bold text-light-text dark:text-dark-text uppercase tracking-tight">
                        {locale === 'en' ? 'Contribution Date' : locale === 'es' ? 'Fecha del Aporte' : locale === 'fr' ? 'Date de Contribution' : locale === 'de' ? 'Beitragsdatum' : 'Data do Aporte'}
                    </h3>
                </div>
                <Calendar selectedDate={fundsDate} onDateSelect={handleFundsDateSelect} initialDisplayDate={new Date(fundsDate + 'T00:00:00')} transactions={allTransactions} />
            </Modal>

            {/* Modal de Calendário para Meta */}
            <Modal isOpen={modalMode === 'targetCalendar'} onClose={() => setModalMode(selectedGoal ? 'edit' : 'add')}>
                <div className="text-center mb-4">
                    <h3 className="text-lg font-bold text-light-text dark:text-dark-text uppercase tracking-tight">
                        {locale === 'en' ? 'Completion Forecast' : locale === 'es' ? 'Previsión de Finalización' : locale === 'fr' ? 'Prévision de Réalisation' : locale === 'de' ? 'Prognose zur Fertigstellung' : 'Previsão de Conclusão'}
                    </h3>
                </div>
                <Calendar
                    selectedDate={targetDate}
                    onDateSelect={handleTargetDateSelect}
                    initialDisplayDate={targetDate ? new Date(targetDate + 'T00:00:00') : new Date()}
                    transactions={allTransactions}
                />
            </Modal>

            {/* Modal ADICIONAR FUNDOS */}
            <Modal isOpen={modalMode === 'addFunds'} onClose={closeModal}>
                <div>
                    <h3 className="text-lg font-bold text-light-text dark:text-dark-text mb-2 uppercase tracking-tight text-center">
                        {locale === 'en' ? 'Add Funds' : locale === 'es' ? 'Adicionar Fondos' : locale === 'fr' ? 'Ajouter des Fonds' : locale === 'de' ? 'Guthaben Hinzufügen' : 'Adicionar Fundos'}
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-400 mb-6 uppercase tracking-widest text-center">
                        {locale === 'en' ? 'Goal:' : locale === 'es' ? 'Meta:' : locale === 'fr' ? 'Objectif:' : locale === 'de' ? 'Ziel:' : 'Meta:'} {selectedGoal?.name}
                    </p>

                    <div className="space-y-5">
                        <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase ml-1 tracking-tight">
                                {locale === 'en' ? 'When?' : locale === 'es' ? '¿Cuándo?' : locale === 'fr' ? 'Quand?' : locale === 'de' ? 'Wann?' : 'Quando?'}
                            </label>
                            <button onClick={() => setModalMode('fundsCalendar')} className="w-full py-3.5 px-4 bg-light-card-elevated dark:bg-dark-bg border border-light-border dark:border-dark-elevated rounded-xl text-light-text dark:text-dark-text font-bold flex justify-between items-center text-sm">
                                <span>{new Date(fundsDate + 'T00:00:00').toLocaleDateString(appLocale)}</span>
                                <CalendarIcon className="h-4 w-4 text-[#EA580C] dark:text-[#F97316]" />
                            </button>
                        </div>

                        <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase ml-1 tracking-tight">
                                {locale === 'en' ? 'Contribution Amount' : locale === 'es' ? 'Monto del Aporte' : locale === 'fr' ? 'Montant de la Contribution' : locale === 'de' ? 'Beitragsbetrag' : 'Valor do Aporte'}
                            </label>
                            <div className="relative">
                                <input
                                    type="tel"
                                    value={fundsAmount}
                                    onChange={e => setFundsAmount(formatCurrencyForInput(e.target.value))}
                                    className="w-full py-2.5 px-4 bg-light-card-elevated dark:bg-dark-bg border-2 border-slate-200 dark:border-white/10 rounded-xl text-light-text dark:text-dark-text font-bold text-base text-center outline-none focus:border-[#EA580C] dark:focus:border-[#EA580C] transition-all tabular-nums"
                                    placeholder={formatCurrency(0, appLocale, appCurrency)}
                                    autoFocus
                                />
                            </div>
                        </div>

                        {error && <p className="text-rose-500 text-[10px] text-center font-bold uppercase">{error}</p>}
                    </div>

                    <button
                        onClick={handleFundsSubmit}
                        className="w-full mt-8 py-3.5 rounded-2xl bg-[#EA580C] hover:bg-[#F97316] text-white font-black text-xs shadow-lg shadow-[#EA580C]/20 uppercase tracking-widest active:scale-[0.98] transition-all"
                    >
                        {locale === 'en' ? 'Confirm Contribution' : locale === 'es' ? 'Confirmar Aporte' : locale === 'fr' ? 'Confirmer la Contribution' : locale === 'de' ? 'Beitrag Bestätigen' : 'Confirmar Aporte'}
                    </button>
                </div>
            </Modal>

            {/* Modal de Exclusão */}
            <Modal isOpen={modalMode === 'delete'} onClose={closeModal}>
                <div className="text-center">
                    <h3 className="text-lg font-bold text-light-text dark:text-dark-text mb-4 uppercase">
                        {locale === 'en' ? 'Delete Goal?' : locale === 'es' ? '¿Excluir Meta?' : locale === 'fr' ? "Supprimer l'Objectif ?" : locale === 'de' ? 'Ziel Löschen?' : 'Excluir Meta?'}
                    </h3>
                    <p className="text-sm text-light-text-muted dark:text-dark-text-secondary mb-8 font-medium">
                        {locale === 'en' ? 'Contributions recorded in the statement will remain saved but will no longer be linked to this goal.' : locale === 'es' ? 'Las contribuciones registradas en la planilha continuarão salvas, mas não estarão mais vinculadas a esta meta.' : locale === 'fr' ? 'Les contributions enregistrées dans le relevé resteront sauvegardées, mais ne serão plus liées à cet objectif.' : locale === 'de' ? 'Die im Beleg erfassten Beiträge bleiben gespeichert, sind jedoch nicht mehr mit diesem Ziel verknüpft.' : 'As contribuições registradas na planilha continuarão salvas, mas não estarão mais vinculadas a esta meta.'}
                    </p>
                    <div className="flex gap-3">
                        <button onClick={closeModal} className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-dark-bg text-slate-600 dark:text-slate-200 font-bold text-sm uppercase">
                            {locale === 'en' ? 'No' : locale === 'es' ? 'No' : locale === 'fr' ? 'Non' : locale === 'de' ? 'Nein' : 'Não'}
                        </button>
                        <button onClick={handleDeleteConfirm} className="flex-1 py-3 rounded-xl bg-rose-600 text-white font-bold text-sm uppercase">
                            {locale === 'en' ? 'Yes, Delete' : locale === 'es' ? 'Sí, Excluir' : locale === 'fr' ? 'Oui, Supprimer' : locale === 'de' ? 'Ja, Löschen' : 'Sim, Excluir'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export { SavingsGoals };
export default SavingsGoals;
