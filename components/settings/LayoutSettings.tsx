import React, { useContext, useState } from 'react';
import {
    MoonIcon, MailIcon, SparklesIcon, ViewGridIcon, CalendarIcon,
    CreditCardIcon, ChartBarIcon, ClipboardListIcon, CategoryIcon, RepeatIcon,
    BankIcon, PiggyBankIcon, GripVerticalIcon, ChevronDownIcon, AlertTriangleIcon, TrendingUpIcon
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
import { useTranslation } from '../../i18n';

const DASHBOARD_LABELS: Record<string, string> = {
    resumo: "Resumo",
    contas: "Contas",
    distribuicao502030: "Método 50/30/20",
    invoices: "Faturas",
    installments: "Radar de Parcelamentos",
    insights: "Assistente IA",
    resumoDiario: "Métricas",
    orcamento: "Orçamentos",
    tendencias: "Tendências",
    despesasCategoria: "Despesas por Categoria",
    receitasCategoria: "Receitas por Categoria",
    despesasRecorrentes: "Despesas Recorrentes",
    metodosPagamentoChart: "Métodos de Pagamento",
    taxaPoupanca: "Taxa de Poupança",
    monthlyComparison: "Comparativo Mensal",
    smartAlerts: "Alertas Inteligentes",
    dailyCashFlow: "Fluxo de Caixa Diário",
    fixedVsVariable: "Fixos vs Variáveis",
    endOfMonthForecast: "Projeção do Mês",
    spendingPace: "Ritmo de Gastos",
    savingsRateHistory: "Histórico de Poupança"
};

const ToggleSwitch = ({ checked, onChange, disabled }: { checked: boolean, onChange: () => void, disabled?: boolean }) => (
    <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        disabled={disabled}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            checked ? 'bg-blue-600 dark:bg-blue-500' : 'bg-slate-300 dark:bg-white/10'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
        <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                checked ? 'translate-x-5' : 'translate-x-0'
            }`}
        />
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
        <div 
            ref={setNodeRef} 
            style={style} 
            className={`bg-white dark:bg-dark-card p-3 sm:p-3.5 rounded-2xl border ${isDragging ? 'border-blue-500 shadow-lg shadow-blue-500/10' : 'border-slate-200/80 dark:border-white/[0.06]'} flex items-center justify-between touch-pan-y transition-all`}
        >
            <div className="flex items-center gap-3 min-w-0">
                <div {...attributes} {...listeners} className="p-1 -ml-1 text-slate-400 dark:text-neutral-500 hover:text-blue-500 active:text-blue-500 cursor-grab active:cursor-grabbing outline-none touch-none shrink-0">
                    <GripVerticalIcon className="h-4 w-4" />
                </div>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${bgClass} ${colorClass}`}>
                    <Icon className="h-4 w-4" />
                </div>
                <span className="font-semibold text-xs sm:text-sm text-slate-800 dark:text-neutral-200 truncate">{label}</span>
            </div>
            <div className="shrink-0 ml-3">
                <ToggleSwitch checked={isVisible} onChange={onToggle} />
            </div>
        </div>
    );
};

interface LayoutSettingsProps {
    handleNotificationToggle?: () => void;
    handleHapticToggle: () => void;
}

const LayoutSettings: React.FC<LayoutSettingsProps> = ({ handleHapticToggle }) => {
    const {
        userProfile,
        theme,
        toggleTheme,
        dashboardLayout,
        handleUpdateLayout,
        showToast,
        updateUserProfile,
        locale,
        setLocale
    } = useContext(AppContext);

    const { t } = useTranslation();

    React.useEffect(() => {
        const validKeys = Object.keys(DASHBOARD_LABELS);
        const filteredOrder = dashboardLayout.order.filter(key => validKeys.includes(key));
        if (filteredOrder.length !== dashboardLayout.order.length) {
            const nextVisibility = { ...dashboardLayout.visibility };
            Object.keys(nextVisibility).forEach(key => {
                if (!validKeys.includes(key)) {
                    delete nextVisibility[key];
                }
            });
            handleUpdateLayout({
                order: filteredOrder,
                visibility: nextVisibility
            });
        }
    }, [dashboardLayout.order, handleUpdateLayout]);

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
        <div className="space-y-4 max-w-lg mx-auto pb-8">
            {/* Preferências Gerais */}
            <div className="space-y-2">
                <div className="px-1 text-xs font-semibold text-slate-500 dark:text-neutral-400">
                    Aparência & Preferências
                </div>
                <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-white/[0.06] rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-white/5 shadow-sm">
                    {/* Theme */}
                    <div className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-amber-500/10 text-amber-500 shrink-0">
                                <MoonIcon className="h-4 w-4" />
                            </div>
                            <div>
                                <h4 className="font-semibold text-slate-800 dark:text-white text-sm">{t('layout.themeTitle') || 'Tema Visual'}</h4>
                                <p className="text-xs text-slate-500 dark:text-neutral-400">{theme === 'dark' ? 'Modo Escuro Ativo' : 'Modo Claro Ativo'}</p>
                            </div>
                        </div>
                        <ToggleSwitch checked={theme === 'dark'} onChange={toggleTheme} />
                    </div>

                    {/* Language Selection */}
                    <div className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-blue-500/10 text-blue-500 shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 002 2h2m-4-3h1.5a2.5 2.5 0 012.5 2.5V12M9 9h.01M12 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <h4 className="font-semibold text-slate-800 dark:text-white text-sm">{t('settings.language') || 'Idioma'}</h4>
                                <p className="text-xs text-slate-500 dark:text-neutral-400">{t('settings.languageSubtitle') || 'Idioma da interface'}</p>
                            </div>
                        </div>
                        
                        <div className="relative flex-shrink-0">
                            <select
                                value={locale}
                                onChange={(e) => {
                                    const newLang = e.target.value;
                                    setLocale(newLang as any);
                                    updateUserProfile({ locale: newLang });
                                    showToast(t('settings.languageChanged') || 'Idioma alterado!');
                                }}
                                className="appearance-none bg-slate-100 dark:bg-[#1A1A1A] text-slate-800 dark:text-white font-semibold text-xs px-3.5 py-2 pr-8 rounded-xl border border-slate-200 dark:border-white/[0.08] focus:outline-none focus:border-blue-500 transition-all cursor-pointer shadow-sm"
                            >
                                <option value="pt">🇧🇷 Português</option>
                                <option value="en">🇺🇸 English</option>
                                <option value="es">🇪🇸 Español</option>
                                <option value="fr">🇫🇷 Français</option>
                                <option value="de">🇩🇪 Deutsch</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-slate-400">
                                <ChevronDownIcon className="h-3.5 w-3.5" />
                            </div>
                        </div>
                    </div>

                    {/* Haptics */}
                    <div className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-purple-500/10 text-purple-500 shrink-0">
                                <SparklesIcon className="h-4 w-4" />
                            </div>
                            <div>
                                <h4 className="font-semibold text-slate-800 dark:text-white text-sm">{t('layout.haptics') || 'Vibração (Haptic)'}</h4>
                                <p className="text-xs text-slate-500 dark:text-neutral-400">{t('layout.hapticsDesc') || 'Feedback tátil ao tocar'}</p>
                            </div>
                        </div>
                        <ToggleSwitch
                            checked={userProfile.hapticsEnabled !== false}
                            onChange={handleHapticToggle}
                        />
                    </div>
                </div>
            </div>

            {/* Organização do Dashboard */}
            <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-semibold text-slate-500 dark:text-neutral-400">
                        {t('layout.dashboardOrder') || 'Ordem dos Cards do Dashboard'}
                    </span>
                    <span className="text-[11px] text-slate-400 dark:text-neutral-500 font-medium">
                        Arraste para organizar
                    </span>
                </div>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={dashboardLayout.order} strategy={verticalListSortingStrategy}>
                        <div className="space-y-2">
                            {dashboardLayout.order.map((key) => {
                                if (key === 'distribuicao502030' && !userProfile.isPremium) return null;
                                const keyMap: Record<string, string> = {
                                    resumo: 'dashboard.summary',
                                    contas: 'dashboard.accounts',
                                    distribuicao502030: 'dashboard.distribution502030',
                                    invoices: 'dashboard.invoices',
                                    insights: 'dashboard.insights',
                                    resumoDiario: 'dashboard.dailySummary',
                                    orcamento: 'dashboard.budget',
                                    tendencias: 'dashboard.trends',
                                    despesasCategoria: 'dashboard.expensesByCategory',
                                    receitasCategoria: 'dashboard.incomeByCategory',
                                    despesasRecorrentes: 'dashboard.recurringExpenses',
                                    metodosPagamentoChart: 'dashboard.paymentMethods',
                                    taxaPoupanca: 'dashboard.savingsRate'
                                };
                                const tKey = keyMap[key];
                                const label = tKey ? t(tKey) : (DASHBOARD_LABELS[key] || key);
                                let Icon = ViewGridIcon;
                                let colorClass = "text-slate-500";
                                let bgClass = "bg-slate-100 dark:bg-white/5";

                                if (key === 'resumo') { Icon = CalendarIcon; colorClass = "text-emerald-500"; bgClass = "bg-emerald-500/10"; }
                                else if (key === 'contas') { Icon = BankIcon; colorClass = "text-blue-500"; bgClass = "bg-blue-500/10"; }
                                else if (key === 'distribuicao502030') { Icon = PiggyBankIcon; colorClass = "text-amber-500"; bgClass = "bg-amber-500/10"; }
                                else if (key === 'invoices') { Icon = CreditCardIcon; colorClass = "text-pink-500"; bgClass = "bg-pink-500/10"; }
                                else if (key === 'installments') { Icon = SparklesIcon; colorClass = "text-blue-500"; bgClass = "bg-blue-500/10"; }
                                else if (key === 'insights') { Icon = SparklesIcon; colorClass = "text-blue-500"; bgClass = "bg-blue-500/10"; }
                                else if (key === 'resumoDiario') { Icon = ChartBarIcon; colorClass = "text-blue-500"; bgClass = "bg-blue-500/10"; }
                                else if (key === 'orcamento') { Icon = ClipboardListIcon; colorClass = "text-purple-500"; bgClass = "bg-purple-500/10"; }
                                else if (key === 'tendencias') { Icon = ChartBarIcon; colorClass = "text-cyan-500"; bgClass = "bg-cyan-500/10"; }
                                else if (key === 'despesasCategoria') { Icon = CategoryIcon; colorClass = "text-red-500"; bgClass = "bg-red-500/10"; }
                                else if (key === 'receitasCategoria') { Icon = CategoryIcon; colorClass = "text-teal-500"; bgClass = "bg-teal-500/10"; }
                                else if (key === 'despesasRecorrentes') { Icon = RepeatIcon; colorClass = "text-orange-500"; bgClass = "bg-orange-500/10"; }
                                else if (key === 'metodosPagamentoChart') { Icon = ChartBarIcon; colorClass = "text-blue-500"; bgClass = "bg-blue-500/10"; }
                                else if (key === 'taxaPoupanca') { Icon = ChartBarIcon; colorClass = "text-emerald-500"; bgClass = "bg-emerald-500/10"; }
                                else if (key === 'monthlyComparison') { Icon = ChartBarIcon; colorClass = "text-indigo-500"; bgClass = "bg-indigo-500/10"; }
                                else if (key === 'smartAlerts') { Icon = AlertTriangleIcon; colorClass = "text-amber-500"; bgClass = "bg-amber-500/10"; }
                                else if (key === 'dailyCashFlow') { Icon = ChartBarIcon; colorClass = "text-sky-500"; bgClass = "bg-sky-500/10"; }
                                else if (key === 'fixedVsVariable') { Icon = RepeatIcon; colorClass = "text-blue-500"; bgClass = "bg-blue-500/10"; }
                                else if (key === 'endOfMonthForecast') { Icon = CalendarIcon; colorClass = "text-violet-500"; bgClass = "bg-violet-500/10"; }
                                else if (key === 'spendingPace') { Icon = TrendingUpIcon; colorClass = "text-rose-500"; bgClass = "bg-rose-500/10"; }
                                else if (key === 'savingsRateHistory') { Icon = PiggyBankIcon; colorClass = "text-emerald-500"; bgClass = "bg-emerald-500/10"; }

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
        </div>
    );
};

export default LayoutSettings;
