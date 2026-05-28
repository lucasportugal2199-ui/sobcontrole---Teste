import React, { useContext, useState, useEffect } from 'react';
import {
    MoonIcon, MailIcon, SparklesIcon, ViewGridIcon, CalendarIcon,
    CreditCardIcon, ChartBarIcon, TrophyIcon, ClipboardListIcon, CategoryIcon, RepeatIcon,
    ArrowUpIcon, ArrowDownIcon, BankIcon, PiggyBankIcon, GripVerticalIcon
} from '../icons';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    MouseSensor,
    TouchSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AppContext } from '../../context/AppContext';

const DASHBOARD_LABELS: Record<string, string> = {
    resumo: "Resumo",
    contas: "Contas",
    distribuicao502030: "Método 50/30/20",
    invoices: "Faturas",
    insights: "CFO IA",
    resumoDiario: "Métricas",
    orcamento: "Orçamentos",
    tendencias: "Tendências",
    despesasCategoria: "Despesas por Categoria",
    receitasCategoria: "Receitas por Categoria",
    despesasRecorrentes: "Despesas Recorrentes",
    metodosPagamentoChart: "Métodos de Pagamento",
    fluxoDiario: "Fluxo Diário",
    taxaPoupanca: "Taxa de Poupança"
};

const ToggleSwitch = ({ checked, onChange, disabled }: { checked: boolean, onChange: () => void, disabled?: boolean }) => (
    <button
        onClick={onChange}
        disabled={disabled}
        className={`w-12 h-7 rounded-full p-1 transition-colors duration-200 ease-in-out relative ${disabled ? 'opacity-40 cursor-not-allowed' : ''} ${checked ? 'bg-dark-accent' : 'bg-slate-300 dark:bg-slate-700'}`}
    >
        <div className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
);



const SortableItem = ({ id, label, Icon, colorClass, bgClass, isVisible, onToggle }: any) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} className={`bg-white dark:bg-dark-surface p-3 rounded-2xl border ${isDragging ? 'border-light-accent dark:border-dark-accent shadow-lg shadow-light-accent/20' : 'border-slate-100 dark:border-slate-800/50'} flex items-center justify-between touch-pan-y`}>
            <div className="flex items-center gap-3">
                <div {...attributes} {...listeners} className="p-1 -ml-1 text-slate-300 dark:text-slate-600 hover:text-dark-accent active:text-dark-accent cursor-grab active:cursor-grabbing outline-none touch-none">
                    <GripVerticalIcon className="h-5 w-5" />
                </div>
                <div className={`p-2 rounded-xl flex-shrink-0 ${bgClass} ${colorClass}`}>
                    <Icon className="h-5 w-5" />
                </div>
                <span className="font-bold text-sm text-slate-900 dark:text-white">{label}</span>
            </div>
            <ToggleSwitch checked={isVisible} onChange={onToggle} />
        </div>
    );
};

interface LayoutSettingsProps {
    handleNotificationToggle: () => void;
    handleHapticToggle: () => void;
}

const LayoutSettings: React.FC<LayoutSettingsProps> = ({ handleNotificationToggle, handleHapticToggle }) => {
    const {
        userProfile,
        theme,
        toggleTheme,
        dashboardLayout,
        handleUpdateLayout,
        showToast
    } = useContext(AppContext);



    const sensors = useSensors(
        useSensor(MouseSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 150,
                tolerance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = dashboardLayout.order.indexOf(active.id as string);
            const newIndex = dashboardLayout.order.indexOf(over.id as string);
            
            handleUpdateLayout({
                ...dashboardLayout,
                order: arrayMove(dashboardLayout.order, oldIndex, newIndex)
            });
        }
    };

    const toggleVisibility = (key: string) => {
        handleUpdateLayout({
            ...dashboardLayout,
            visibility: {
                ...dashboardLayout.visibility,
                [key]: !dashboardLayout.visibility[key]
            }
        });
    };

    return (
        <div>
            <div className="space-y-4 mb-8">
                {/* Theme */}
                <div className="bg-white dark:bg-dark-surface p-4 rounded-2xl border border-slate-100 dark:border-slate-800/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-teal-100 dark:bg-dark-accent/20 rounded-xl text-light-accent dark:text-dark-accent">
                            <MoonIcon className="h-6 w-6" />
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-900 dark:text-white text-sm">Tema Visual</h4>
                            <p className="text-[10px] text-slate-500 font-bold uppercase">Escuro / Claro</p>
                        </div>
                    </div>
                    <ToggleSwitch checked={theme === 'dark'} onChange={toggleTheme} />
                </div>

                {/* Notifications */}
                <div className="bg-white dark:bg-dark-surface p-4 rounded-2xl border border-slate-100 dark:border-slate-800/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl text-indigo-600 dark:text-indigo-400">
                            <MailIcon className="h-6 w-6" />
                        </div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm">Notificações</h4>
                    </div>
                    <ToggleSwitch
                        checked={userProfile.notificationsEnabled || false}
                        onChange={handleNotificationToggle}
                    />
                </div>

                {/* Haptics */}
                <div className="bg-white dark:bg-dark-surface p-4 rounded-2xl border border-slate-100 dark:border-slate-800/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-xl text-purple-600 dark:text-purple-400">
                            <SparklesIcon className="h-6 w-6" />
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-900 dark:text-white text-sm">Vibração</h4>
                            <p className="text-[10px] text-slate-500 font-bold uppercase">Feedback ao tocar</p>
                        </div>
                    </div>
                    <ToggleSwitch
                        checked={userProfile.hapticsEnabled !== false}
                        onChange={handleHapticToggle}
                    />
                </div>


            </div>

            <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest mb-3 ml-4">Ordem do Dashboard</h3>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={dashboardLayout.order} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                        {dashboardLayout.order.map((key) => {
                            if (key === 'distribuicao502030' && !userProfile.isPremium) return null;
                            const label = DASHBOARD_LABELS[key] || key;
                            let Icon = ViewGridIcon;
                            let colorClass = "text-slate-500";
                            let bgClass = "bg-slate-200/70 dark:bg-slate-700";

                            if (key === 'resumo') { Icon = CalendarIcon; colorClass = "text-emerald-500"; bgClass = "bg-emerald-100 dark:bg-emerald-900/20"; }
                            else if (key === 'contas') { Icon = BankIcon; colorClass = "text-blue-500"; bgClass = "bg-blue-100 dark:bg-blue-900/20"; }
                            else if (key === 'distribuicao502030') { Icon = PiggyBankIcon; colorClass = "text-amber-500"; bgClass = "bg-amber-100 dark:bg-amber-900/20"; }
                            else if (key === 'invoices') { Icon = CreditCardIcon; colorClass = "text-pink-500"; bgClass = "bg-pink-100 dark:bg-pink-900/20"; }
                            else if (key === 'insights') { Icon = SparklesIcon; colorClass = "text-indigo-500"; bgClass = "bg-indigo-100 dark:bg-indigo-900/20"; }
                            else if (key === 'resumoDiario') { Icon = ChartBarIcon; colorClass = "text-blue-500"; bgClass = "bg-blue-100 dark:bg-blue-900/20"; }
                            else if (key === 'orcamento') { Icon = ClipboardListIcon; colorClass = "text-purple-500"; bgClass = "bg-purple-100 dark:bg-purple-900/20"; }
                            else if (key === 'tendencias') { Icon = ChartBarIcon; colorClass = "text-cyan-500"; bgClass = "bg-cyan-100 dark:bg-cyan-900/20"; }
                            else if (key === 'despesasCategoria') { Icon = CategoryIcon; colorClass = "text-red-500"; bgClass = "bg-red-100 dark:bg-red-900/20"; }
                            else if (key === 'receitasCategoria') { Icon = CategoryIcon; colorClass = "text-teal-500"; bgClass = "bg-teal-100 dark:bg-teal-900/20"; }
                            else if (key === 'despesasRecorrentes') { Icon = RepeatIcon; colorClass = "text-orange-500"; bgClass = "bg-orange-100 dark:bg-orange-900/20"; }
                            else if (key === 'metodosPagamentoChart') { Icon = ChartBarIcon; colorClass = "text-indigo-500"; bgClass = "bg-indigo-100 dark:bg-indigo-900/20"; }
                            else if (key === 'fluxoDiario') { Icon = ChartBarIcon; colorClass = "text-pink-500"; bgClass = "bg-pink-100 dark:bg-pink-900/20"; }
                            else if (key === 'taxaPoupanca') { Icon = ChartBarIcon; colorClass = "text-emerald-500"; bgClass = "bg-emerald-100 dark:bg-emerald-900/20"; }

                            return (
                                <SortableItem
                                    key={key}
                                    id={key}
                                    label={label}
                                    Icon={Icon}
                                    colorClass={colorClass}
                                    bgClass={bgClass}
                                    isVisible={dashboardLayout.visibility[key]}
                                    onToggle={() => toggleVisibility(key)}
                                />
                            );
                        })}
                    </div>
                </SortableContext>
            </DndContext>
        </div>
    );
};

export default LayoutSettings;
