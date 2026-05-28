
import React, { useState, useMemo, useContext, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AppContext } from '../context/AppContext';
import { SavingsGoal } from '../types';
import { PiggyBankIcon, PlusIcon, DotsVerticalIcon, EditIcon, TrashIcon, CalendarIcon, ChartBarIcon, LockIcon, CheckCircleIcon, ClipboardListIcon, LoaderIcon } from './icons';
import { formatCurrency, formatCurrencyForInput, parseCurrency, formatDateToInput } from '../utils/helpers';
import Modal from './Modal';
import Calendar from './Calendar';

// --- PROGRESS RING COMPONENT ---
const ProgressRing: React.FC<{ percentage: number; isCompleted: boolean; size?: number }> = ({ percentage, isCompleted, size = 56 }) => {
    const strokeWidth = 5;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (Math.min(percentage, 100) / 100) * circumference;

    const getColor = () => {
        if (isCompleted) return '#10b981';
        if (percentage >= 75) return '#22c55e';
        if (percentage >= 50) return '#6366f1';
        if (percentage >= 25) return '#3b82f6';
        return '#6366f1';
    };

    return (
        <svg width={size} height={size} className="flex-shrink-0 -rotate-90">
            <circle
                cx={size / 2} cy={size / 2} r={radius}
                stroke="currentColor"
                className="text-slate-100 dark:text-slate-800"
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
}> = ({ goal, onAddFunds, onEdit, onDelete, isPremium }) => {
    const [menuOpen, setMenuOpen] = useState(false);

    const percentage = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
    const remaining = goal.targetAmount - goal.currentAmount;

    return (
        <li className={`p-5 rounded-2xl space-y-4 shadow-sm border transition-all ${
            goal.isCompleted 
                ? 'bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/20 dark:to-dark-surface border-emerald-200 dark:border-emerald-800/40' 
                : 'bg-white dark:bg-dark-surface border-slate-100 dark:border-slate-800'
        }`}>
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-3.5">
                    {/* Progress Ring */}
                    <div className="relative">
                        <ProgressRing percentage={percentage} isCompleted={goal.isCompleted} />
                        <span className={`absolute inset-0 flex items-center justify-center text-[10px] font-black ${
                            goal.isCompleted ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-300'
                        }`}>
                            {goal.isCompleted ? '✓' : `${Math.min(percentage, 100).toFixed(0)}%`}
                        </span>
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900 dark:text-white text-base leading-tight">{goal.name}</h3>
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-tight mt-0.5">
                            Alvo: <span className="text-slate-600 dark:text-slate-200">{formatCurrency(goal.targetAmount)}</span>
                        </p>
                        {goal.targetDate && (
                            <p className="text-[9px] font-bold text-blue-500 dark:text-blue-400 uppercase tracking-tight mt-0.5 flex items-center gap-1">
                                <CalendarIcon className="h-2.5 w-2.5" />
                                {new Date(goal.targetDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                            </p>
                        )}
                    </div>
                </div>
                <div className="relative">
                    <button onClick={() => setMenuOpen(!menuOpen)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-dark-bg transition-colors">
                        <DotsVerticalIcon className="h-5 w-5 text-slate-400" />
                    </button>
                    {menuOpen && (
                        <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-dark-surface rounded-xl shadow-xl z-[10] border border-slate-200 dark:border-slate-800 overflow-hidden">
                            <button onClick={() => { onEdit(goal); setMenuOpen(false); }} className="flex items-center gap-3 w-full text-left px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-dark-bg">
                                <EditIcon className="h-4 w-4" /> EDITAR
                            </button>
                            <button onClick={() => { onDelete(goal); setMenuOpen(false); }} className="flex items-center gap-3 w-full text-left px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                                <TrashIcon className="h-4 w-4" /> EXCLUIR
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Progress Bar */}
            <div>
                <div className="flex justify-between text-[10px] font-black text-slate-500 dark:text-slate-300 mb-1.5 uppercase tracking-wide">
                    <span>{formatCurrency(goal.currentAmount)}</span>
                    <span className={goal.isCompleted ? "text-emerald-500" : "text-slate-400"}>{formatCurrency(goal.targetAmount)}</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-dark-bg rounded-full h-2 overflow-hidden">
                    <div className={`h-2 rounded-full transition-all duration-1000 ease-out ${goal.isCompleted ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${Math.min(percentage, 100)}%` }}></div>
                </div>
                <p className={`text-[10px] font-bold mt-1.5 text-right uppercase tracking-tighter ${goal.isCompleted ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                    {remaining > 0 ? `Faltam ${formatCurrency(remaining)}` : 'Meta Concluída! 🎉🏆'}
                </p>
            </div>

            {/* Aporte Sugerido (PRO) */}
            {isPremium && !goal.isCompleted && goal.targetDate && remaining > 0 && (
                <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800/50">
                    <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                        <ChartBarIcon className="h-3.5 w-3.5" />
                        Aporte Sugerido
                    </p>
                    {(() => {
                        const today = new Date();
                        const target = new Date(goal.targetDate + 'T00:00:00');
                        const diffMonths = (target.getFullYear() - today.getFullYear()) * 12 + (target.getMonth() - today.getMonth());
                        // Mínimo 3 meses para sugestão realista — nunca sugere pagar tudo de uma vez
                        const months = Math.max(3, diffMonths);
                        const suggested = remaining / months;
                        const isOverdue = diffMonths <= 0;
                        const isNearDeadline = diffMonths > 0 && diffMonths <= 2;
                        return (
                            <>
                                <p className="text-sm font-bold text-slate-700 dark:text-slate-200 mt-1">
                                    {formatCurrency(suggested)} / mês
                                </p>
                                <p className="text-[9px] font-bold text-slate-400 mt-0.5 uppercase tracking-tighter">
                                    {isOverdue
                                        ? `Prazo vencido — sugestão para ${months} meses`
                                        : isNearDeadline
                                        ? `Prazo próximo — sugestão para ${months} meses`
                                        : `Para concluir em ${new Date(goal.targetDate + 'T00:00:00').toLocaleDateString('pt-BR')}`
                                    }
                                </p>
                            </>
                        );
                    })()}
                </div>
            )}

            {/* Botão Aportar */}
            {!goal.isCompleted && (
                <button onClick={() => onAddFunds(goal)} className="w-full bg-dark-accent hover:bg-dark-accent/90 text-white font-bold py-3 rounded-xl text-xs shadow-lg shadow-dark-accent/20 active:scale-[0.98] transition-all uppercase tracking-widest">
                    Aportar Valor
                </button>
            )}
        </li>
    );
};

const SavingsGoals: React.FC = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error("SavingsGoals must be used within an AppProvider");

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
        if (!goalName.trim()) { setError('Nome obrigatório.'); return; }
        if (amount <= 0) { setError('Valor inválido.'); return; }
        if (modalMode === 'add') handleAddGoal(goalName.trim(), amount, targetDate || undefined);
        else if (modalMode === 'edit' && selectedGoal) handleEditGoal(selectedGoal.id, goalName.trim(), amount, targetDate || undefined);
        closeModal();
    };

    const handleFundsSubmit = () => {
        const amount = parseCurrency(fundsAmount);
        if (amount <= 0) { setError('Insira um valor positivo.'); return; }
        if (selectedGoal) handleAddFundsToGoal(selectedGoal.id, amount, fundsDate);
        closeModal();
    }

    const handleDeleteConfirm = () => {
        if (selectedGoal) handleDeleteGoal(selectedGoal.id);
        closeModal();
    }

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
        <div className="bg-slate-100 dark:bg-dark-bg text-slate-800 dark:text-slate-200 h-full p-4 flex flex-col transition-colors duration-300">
            <header className="flex justify-between items-center mb-4 flex-shrink-0">
                <button
                    onClick={handleCalculatorClick}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-black rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800 uppercase tracking-widest transition-all active:scale-95"
                >
                    <ChartBarIcon className="h-4 w-4" />
                    <span>Calculadora</span>
                    {!userProfile.isPremium && <LockIcon className="h-3 w-3 text-amber-500 ml-0.5" />}
                </button>
                <button onClick={() => openModal('add')} className="flex items-center gap-2 px-5 py-2.5 text-sm font-black rounded-full bg-slate-50 dark:bg-dark-surface text-dark-accent shadow-sm border border-slate-100 dark:border-slate-800 uppercase tracking-widest transition-all active:scale-95">
                    <PlusIcon className="h-4 w-4" />
                    <span>Nova Meta</span>
                </button>
            </header>

            {/* Filtros de Metas - Centralizado */}
            <div className="flex justify-center gap-2 mb-6 overflow-x-auto no-scrollbar pb-1 flex-shrink-0">
                {[
                    { id: 'all', label: 'Todas', icon: <ClipboardListIcon className="h-3 w-3" /> },
                    { id: 'active', label: 'Em Aberto', icon: <LoaderIcon className="h-3 w-3" /> },
                    { id: 'completed', label: 'Concluídas', icon: <CheckCircleIcon className="h-3 w-3" /> }
                ].map(btn => (
                    <button
                        key={btn.id}
                        onClick={() => setFilterMode(btn.id as any)}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap ${filterMode === btn.id ? 'bg-dark-accent border-dark-accent text-white shadow-md' : 'bg-slate-50 dark:bg-dark-surface border-slate-100 dark:border-slate-800 text-slate-500'}`}
                    >
                        {btn.icon}
                        {btn.label}
                    </button>
                ))}
            </div>

            <main className="flex-1 overflow-y-auto no-scrollbar pb-24">
                {visibleGoals.length === 0 ? (
                    <div className="text-center py-20 opacity-40">
                        {filterMode === 'all' ? (
                            <>
                                <PiggyBankIcon className="h-16 w-16 mx-auto mb-4" />
                                <h3 className="text-lg font-bold">Nenhuma meta</h3>
                                <p className="text-sm">Planeje seus sonhos aqui.</p>
                            </>
                        ) : (
                            <>
                                <ClipboardListIcon className="h-16 w-16 mx-auto mb-4" />
                                <h3 className="text-lg font-bold">Nenhum resultado</h3>
                                <p className="text-sm">Tente mudar o filtro.</p>
                            </>
                        )}
                    </div>
                ) : (
                    <ul className="space-y-5">
                        {visibleGoals.map(goal => (
                            <GoalCard key={goal.id} goal={goal} onAddFunds={(g) => openModal('fundsCalendar', g)} onEdit={(g) => openModal('edit', g)} onDelete={(g) => openModal('delete', g)} isPremium={userProfile.isPremium} />
                        ))}
                    </ul>
                )}
            </main>

            {/* Modais de Criar/Editar Meta */}
            <Modal isOpen={modalMode === 'add' || modalMode === 'edit'} onClose={closeModal}>
                <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 uppercase tracking-tight">{modalMode === 'add' ? 'Nova Meta' : 'Editar Meta'}</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase mb-1 ml-1 tracking-tight">Nome da Meta</label>
                            <input type="text" value={goalName} onChange={e => setGoalName(e.target.value)} className="w-full py-3.5 px-4 bg-slate-50 dark:bg-dark-bg text-slate-900 dark:text-white border border-slate-100 dark:border-slate-800 rounded-xl font-bold text-sm focus:border-dark-accent outline-none" placeholder="Viagem, Casa, etc..." autoFocus />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase mb-1 ml-1 tracking-tight">Valor Alvo</label>
                            <input type="tel" value={goalAmount} onChange={e => setGoalAmount(formatCurrencyForInput(e.target.value))} className="w-full py-3.5 px-4 bg-slate-50 dark:bg-dark-bg text-slate-900 dark:text-white border border-slate-100 dark:border-slate-800 rounded-xl font-bold text-sm focus:border-dark-accent outline-none" placeholder="R$ 0,00" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase mb-1 ml-1 tracking-tight font-black">Previsão de Conclusão (Opcional)</label>
                            <button
                                onClick={() => openModal('targetCalendar')}
                                className="w-full py-3.5 px-4 bg-slate-50 dark:bg-dark-bg text-slate-900 dark:text-white border border-slate-100 dark:border-slate-800 rounded-xl font-bold text-sm flex justify-between items-center transition-all active:scale-[0.99]"
                            >
                                <span className={targetDate ? "opacity-100" : "opacity-40"}>
                                    {targetDate ? new Date(targetDate + 'T00:00:00').toLocaleDateString('pt-BR') : 'dd/mm/aaaa'}
                                </span>
                                <CalendarIcon className="h-4 w-4 text-dark-accent" />
                            </button>
                        </div>
                        {error && <p className="text-red-500 text-[10px] font-bold uppercase">{error}</p>}
                    </div>
                    <div className="flex gap-3 mt-8">
                        <button onClick={closeModal} className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-dark-bg text-slate-600 dark:text-slate-200 font-bold text-sm uppercase tracking-wider">Cancelar</button>
                        <button onClick={handleGoalSubmit} className="flex-1 py-3 rounded-xl bg-dark-accent text-white font-bold text-sm shadow-lg shadow-dark-accent/30 uppercase tracking-wider">Salvar</button>
                    </div>
                </div>
            </Modal>

            {/* Modal de Calendário para Aporte */}
            <Modal isOpen={modalMode === 'fundsCalendar'} onClose={closeModal}>
                <div className="text-center mb-4">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-tight">Data do Aporte</h3>
                </div>
                <Calendar selectedDate={fundsDate} onDateSelect={handleFundsDateSelect} initialDisplayDate={new Date(fundsDate + 'T00:00:00')} transactions={allTransactions} />
            </Modal>

            {/* Modal de Calendário para Meta */}
            <Modal isOpen={modalMode === 'targetCalendar'} onClose={() => setModalMode(selectedGoal ? 'edit' : 'add')}>
                <div className="text-center mb-4">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-tight">Previsão de Conclusão</h3>
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
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 uppercase tracking-tight text-center">Adicionar Fundos</h3>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-400 mb-6 uppercase tracking-widest text-center">Meta: {selectedGoal?.name}</p>

                    <div className="space-y-5">
                        <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase ml-1 tracking-tight">Quando?</label>
                            <button onClick={() => setModalMode('fundsCalendar')} className="w-full py-3.5 px-4 bg-slate-50 dark:bg-dark-bg border border-slate-100 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-bold flex justify-between items-center text-sm">
                                <span>{new Date(fundsDate + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                                <CalendarIcon className="h-4 w-4 text-dark-accent" />
                            </button>
                        </div>

                        <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase ml-1 tracking-tight">Valor do Aporte</label>
                            <div className="relative">
                                <input
                                    type="tel"
                                    value={fundsAmount}
                                    onChange={e => setFundsAmount(formatCurrencyForInput(e.target.value))}
                                    className="w-full py-2.5 px-4 bg-slate-50 dark:bg-dark-bg border-2 border-dark-accent/20 dark:border-dark-accent/10 rounded-xl text-slate-900 dark:text-white font-bold text-base text-center outline-none focus:border-dark-accent transition-all"
                                    placeholder="R$ 0,00"
                                    autoFocus
                                />
                            </div>
                        </div>

                        {error && <p className="text-red-500 text-[10px] text-center font-bold uppercase">{error}</p>}
                    </div>

                    <button
                        onClick={handleFundsSubmit}
                        className="w-full mt-8 py-4 rounded-xl bg-dark-accent text-white font-bold text-sm shadow-lg shadow-dark-accent/30 uppercase tracking-widest active:scale-[0.98] transition-all"
                    >
                        Confirmar Aporte
                    </button>
                </div>
            </Modal>

            {/* Modal de Exclusão */}
            <Modal isOpen={modalMode === 'delete'} onClose={closeModal}>
                <div className="text-center">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 uppercase">Excluir Meta?</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-300 mb-8 font-medium">As contribuições registradas na planilha continuarão salvas, mas não estarão mais vinculadas a esta meta.</p>
                    <div className="flex gap-3">
                        <button onClick={closeModal} className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-dark-bg text-slate-600 dark:text-slate-200 font-bold text-sm uppercase">Não</button>
                        <button onClick={handleDeleteConfirm} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold text-sm uppercase">Sim, Excluir</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default SavingsGoals;
