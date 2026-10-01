import React, { useContext, useMemo, useState, useEffect } from 'react';
import { ArrowUpIcon, ArrowDownIcon, SparklesIcon, CalendarIcon, InvoiceDollarIcon, CreditCardIcon, BankIcon, ChevronRightIcon, ChevronDownIcon, LoaderIcon, LockIcon, PlusIcon, ChartBarIcon, AlertTriangleIcon, PiggyBankIcon, WalletIcon, TrendingUpIcon, CalopsitaIcon } from '../icons';
import { formatCurrency, getMonthKey, calculate502030, validate502030, calculateAccountBalance, getEffectiveClosingDay, getSaldoLimitDate } from '../../utils/helpers';
import { Transaction, CreditCard, Account, Asset } from '../../types';
import { AppContext } from '../../context/AppContext';
import { getBankLogo } from '../BankLogo';
import { InvoiceChartWidget } from './DashboardCharts';
import { useTranslation } from '../../i18n';

export const SummaryWidget: React.FC<{
    saldoAtual: number;
    saldoPrevisto: number;
    totalReceitas: number;
    totalDespesas: number;
    balanceAnimationKey: number;
    onViewAnnualReport: () => void;
}> = ({ saldoAtual, saldoPrevisto, totalReceitas, totalDespesas, balanceAnimationKey, onViewAnnualReport }) => {
    const { t, locale } = useTranslation();
    const appLocale = locale === 'pt' ? 'pt-BR' : locale === 'en' ? 'en-US' : locale === 'es' ? 'es-ES' : locale === 'fr' ? 'fr-FR' : 'de-DE';
    const formatBalance = (value: number) => {
        const isNegative = value < 0;
        const formatted = formatCurrency(Math.abs(value), appLocale);
        return isNegative ? `-${formatted}` : formatted;
    };

    const isDifferent = Math.abs(saldoAtual - saldoPrevisto) > 0.01;
    const maxFlow = Math.max(totalReceitas, totalDespesas, 1);
    const cashFlow = totalReceitas - totalDespesas;

    return (
        <div className="flex flex-col">
            {/* Saldo em destaque */}
            <div className="flex flex-col items-center mb-3 mt-0.5">
                <span className="text-[11px] text-light-text-muted dark:text-dark-text-muted font-medium">{t('dashboard.balance')}</span>
                <span key={balanceAnimationKey} className={`text-xl font-bold mt-0.5 subtle-fade-in tracking-tight tabular-nums ${saldoAtual < 0 ? 'text-[#FF3B5C]' : 'text-light-text dark:text-dark-text'}`}>
                    {formatBalance(saldoAtual)}
                </span>
                {isDifferent && (
                    <div className="mt-1.5 bg-light-bg-secondary dark:bg-white/[0.04] px-2.5 py-0.5 rounded-full flex items-center justify-center gap-1.5 border border-light-border dark:border-white/[0.06]">
                        <span className="text-[10px] font-medium text-light-text-muted dark:text-dark-text-muted">{t('horizon.projected')}:</span>
                        <span className={`text-xs font-semibold tabular-nums ${saldoPrevisto < 0 ? 'text-[#FF3B5C]' : 'text-light-text-secondary dark:text-dark-text-secondary'}`}>
                            {formatBalance(saldoPrevisto)}
                        </span>
                    </div>
                )}
            </div>

            {/* Fluxo de Caixa — Barras horizontais */}
            <div className="space-y-2.5 pt-3 border-t border-light-border dark:border-white/[0.04]">
                {/* Entrada */}
                <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-[11px] font-medium text-light-text-secondary dark:text-dark-text-secondary">{t('dashboard.income')}</span>
                        <span className="text-xs font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">{formatBalance(totalReceitas)}</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 dark:bg-white/[0.04] rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full transition-all duration-700 ease-out" style={{ width: `${Math.min((totalReceitas / maxFlow) * 100, 100)}%` }} />
                    </div>
                </div>

                {/* Saída */}
                <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-[11px] font-medium text-light-text-secondary dark:text-dark-text-secondary">{t('dashboard.expenses')}</span>
                        <span className="text-xs font-semibold tabular-nums text-[#FF3B5C]">-{formatBalance(totalDespesas)}</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 dark:bg-white/[0.04] rounded-full overflow-hidden">
                        <div className="h-full bg-[#EF4444] dark:bg-[#FF3B5C] rounded-full transition-all duration-700 ease-out" style={{ width: `${Math.min((totalDespesas / maxFlow) * 100, 100)}%` }} />
                    </div>
                </div>

                {/* Fluxo de Caixa */}
                <div className="flex items-center justify-between pt-1.5 border-t border-light-border dark:border-white/[0.04]">
                    <span className="text-[11px] font-medium text-light-text-muted dark:text-dark-text-muted">{t('dashboard.cashFlow') || 'Fluxo de caixa'}</span>
                    <span className={`text-xs font-semibold tabular-nums ${cashFlow >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-[#FF3B5C]'}`}>
                        {cashFlow >= 0 ? '+' : ''}{formatBalance(cashFlow)}
                    </span>
                </div>
            </div>

            <button onClick={onViewAnnualReport} className="mt-3.5 w-full py-2 text-xs font-semibold text-[#EA580C] dark:text-[#F97316] bg-[#FFEDD5] dark:bg-[#431407] hover:bg-[#FFEDD5]/80 dark:hover:bg-[#431407]/80 border border-[#EA580C]/20 dark:border-[#EA580C]/20 rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 shadow-sm">
                <ChartBarIcon className="h-3.5 w-3.5" />
                {t('menu.annualReport')}
            </button>
        </div>
    );
};


export const AIInsightsWidget: React.FC<{ filteredData: Transaction[] }> = ({ filteredData }) => {
    const context = useContext(AppContext);
    if (!context) return null;
    const { setCurrentView } = context;

    const calopsitaTip = useMemo(() => {
        const saidas = filteredData.filter(t => t.tipo === 'saida');
        if (saidas.length === 0) {
            return "Piu! Ainda não vi gastos este mês. Registre suas compras para eu te ajudar a economizar!";
        }
        
        const catMap: Record<string, number> = {};
        saidas.forEach(t => {
            catMap[t.categoria] = (catMap[t.categoria] || 0) + t.valor;
        });
        const topCat = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0];
        if (topCat && topCat[1] > 0) {
            return `Piu! Notei que "${topCat[0]}" é onde você mais gastou até agora. Quer dicas para poupar sementinhas e voar mais alto?`;
        }

        return "Piu! Estou calculando seus números. Toque aqui para conversar comigo e tirar qualquer dúvida sobre seu dinheiro!";
    }, [filteredData]);

    return (
        <div 
            onClick={() => setCurrentView('chat')}
            className="flex items-center justify-between gap-3.5 p-4 rounded-2xl bg-white dark:bg-[#111111] border border-light-border dark:border-[#1F1F1F] hover:border-[#EA580C]/40 dark:hover:border-[#EA580C]/40 shadow-sm cursor-pointer active:scale-[0.99] transition-all group"
        >
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <div className="w-12 h-12 rounded-2xl bg-[#FFEDD5] dark:bg-[#431407] border border-[#EA580C]/20 overflow-hidden flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform p-1">
                    <CalopsitaIcon className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-light-text dark:text-dark-text tracking-tight flex items-center gap-1.5">
                            Assistente IA
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            Ativa
                        </span>
                    </div>
                    <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary leading-snug line-clamp-2">
                        "{calopsitaTip}"
                    </p>
                </div>
            </div>

            <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-white/[0.05] border border-slate-200/60 dark:border-white/[0.06] flex items-center justify-center shrink-0 group-hover:bg-[#EA580C] group-hover:text-white group-hover:border-[#EA580C] text-slate-400 transition-all">
                <ChevronRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </div>
        </div>
    );
};

export const PatrimonioWidget: React.FC<{ assets: Asset[]; onClick: () => void }> = ({ assets, onClick }) => {
    const total = (assets || []).reduce((sum, a) => sum + (a.value || 0), 0);
    const { locale } = useTranslation();
    const appLocale = locale === 'pt' ? 'pt-BR' : 'en-US';

    return (
        <div 
            onClick={onClick}
            className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/20 hover:border-emerald-500/40 cursor-pointer active:scale-[0.99] transition-all group"
        >
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                        <TrendingUpIcon className="h-4 w-4" />
                    </span>
                    <div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Patrimônio & Investimentos
                        </h4>
                        <p className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                            {formatCurrency(total, appLocale)}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 group-hover:translate-x-0.5 transition-transform">
                    <span>{assets.length} ativos</span>
                    <ChevronRightIcon className="h-4 w-4" />
                </div>
            </div>
            {assets.length === 0 ? (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Toque para registrar suas ações, renda fixa, criptoativos ou patrimônio físico.
                </p>
            ) : (
                <div className="flex flex-wrap gap-1.5 mt-2">
                    {assets.slice(0, 4).map(asset => (
                        <span key={asset.id} className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-white/70 dark:bg-dark-card border border-emerald-500/15 text-slate-700 dark:text-slate-300">
                            {asset.name}: {formatCurrency(asset.value, appLocale)}
                        </span>
                    ))}
                    {assets.length > 4 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-lg text-emerald-600 dark:text-emerald-400">
                            +{assets.length - 4} mais
                        </span>
                    )}
                </div>
            )}
        </div>
    );
};

export const QuickStatsWidget: React.FC<{ currentDate: Date; totalDespesas: number; maxExpense: Transaction | null; }> = ({ currentDate, totalDespesas, maxExpense }) => {
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const today = new Date();
    const isCurrentMonth = currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear();
    const dayOfMonth = isCurrentMonth ? today.getDate() : daysInMonth;
    const dailyAverage = dayOfMonth > 0 ? totalDespesas / dayOfMonth : 0;
    const { t, locale } = useTranslation();
    const appLocale = locale === 'pt' ? 'pt-BR' : locale === 'en' ? 'en-US' : locale === 'es' ? 'es-ES' : locale === 'fr' ? 'fr-FR' : 'de-DE';

    return (
        <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 dark:bg-white/[0.03] p-4 rounded-2xl border border-light-border dark:border-white/[0.04]">
                <div className="flex items-center gap-2 mb-2 text-light-text-muted dark:text-dark-text-muted">
                    <CalendarIcon className="h-4 w-4" />
                    <span className="text-[11px] font-medium uppercase tracking-[0.5px]">{t('dashboard.avgDailyExpense')}</span>
                </div>
                <p className="text-[18px] font-semibold text-light-text dark:text-dark-text leading-tight tabular-nums">{formatCurrency(dailyAverage, appLocale)}</p>
            </div>
            <div className="bg-slate-50 dark:bg-white/[0.03] p-4 rounded-2xl border border-light-border dark:border-white/[0.04]">
                <div className="flex items-center gap-2 mb-2 text-light-text-secondary dark:text-dark-text-secondary">
                    <ArrowDownIcon className="h-4 w-4" />
                    <span className="text-[11px] font-medium uppercase tracking-[0.5px]">{t('dashboard.biggestExpense')}</span>
                </div>
                <p className="text-[18px] font-semibold text-light-text dark:text-dark-text leading-tight tabular-nums">{maxExpense ? formatCurrency(maxExpense.valor, appLocale) : formatCurrency(0, appLocale)}</p>
            </div>
        </div>
    );
};

export const BudgetWidget: React.FC<{ budgets: any, despesasPorCategoria: any[] }> = ({ budgets, despesasPorCategoria }) => {
    const { t, locale } = useTranslation();
    const appLocale = locale === 'pt' ? 'pt-BR' : locale === 'en' ? 'en-US' : locale === 'es' ? 'es-ES' : locale === 'fr' ? 'fr-FR' : 'de-DE';
    return (
        <div className="space-y-3">
            {Object.entries(budgets).map(([category, amount]) => {
                const spent = despesasPorCategoria.find(d => d.name === category)?.value || 0;
                const total = amount as number;
                const rawPercentage = (spent / total) * 100;
                const percentage = Math.min(rawPercentage, 100);
                const isOverBudget = spent > total;
                const overAmount = spent - total;

                return (
                    <div key={category} className={`space-y-2 p-3 rounded-2xl border transition-colors ${isOverBudget ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50' : 'bg-transparent border-transparent'}`}>
                        <div className="flex justify-between items-center gap-2 text-[12px] font-medium">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                <span className={isOverBudget ? 'text-red-700 dark:text-red-400 font-semibold' : 'text-light-text dark:text-dark-text-secondary'}>
                                    {category}
                                </span>
                                {isOverBudget && (
                                    <span className="flex items-center gap-1 text-[11px] font-medium bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded uppercase tracking-[0.5px] shadow-sm tabular-nums">
                                        <AlertTriangleIcon className="h-3 w-3" /> {t('dashboard.budgetExceeded')} {formatCurrency(overAmount, appLocale)}
                                    </span>
                                )}
                            </div>
                            <span className={`${isOverBudget ? 'text-red-600 dark:text-red-400' : 'text-light-text-muted dark:text-dark-text-secondary'} font-semibold uppercase whitespace-nowrap tabular-nums text-[12px]`}>
                                {formatCurrency(spent, appLocale)} <span className="opacity-40 mx-0.5">/</span> {formatCurrency(total, appLocale)}
                            </span>
                        </div>
                        <div className={`h-2.5 rounded-full overflow-hidden border ${isOverBudget ? 'bg-red-200 dark:bg-red-900/40 border-red-300 dark:border-red-800/50' : 'bg-slate-100 dark:bg-dark-bg border-light-border dark:border-dark-elevated'}`}>
                            <div className={`h-full transition-all duration-700 ease-out ${isOverBudget ? 'bg-red-600 dark:bg-red-500 shadow-[0_0_10px_rgba(220,38,38,0.5)]' : percentage > 90 ? 'bg-red-500' : percentage > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${percentage}%` }} />
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export const PaymentMethodWidget: React.FC<{ transactions: Transaction[] }> = ({ transactions }) => {
    const stats = useMemo(() => {
        const methods = { credito: 0, debito: 0 };
        transactions.forEach(t => { if (t.tipo === 'saida') methods[t.paymentMethod] += t.valor; });
        return methods;
    }, [transactions]);
    const { t, locale } = useTranslation();
    const appLocale = locale === 'pt' ? 'pt-BR' : locale === 'en' ? 'en-US' : locale === 'es' ? 'es-ES' : locale === 'fr' ? 'fr-FR' : 'de-DE';

    return (
        <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-4 bg-emerald-500/[0.04] dark:bg-emerald-500/[0.03] rounded-2xl border border-emerald-500/15 dark:border-emerald-500/10 transition-all">
                <div className="h-10 w-10 bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-2"><BankIcon className="h-5 w-5" /></div>
                <p className="text-[11px] font-medium text-light-text-muted dark:text-dark-text-muted uppercase tracking-[0.5px] mb-1">{t('payMethod.debit')}</p>
                <p className="text-[15px] font-semibold text-light-text dark:text-dark-text tabular-nums">{formatCurrency(stats.debito, appLocale)}</p>
            </div>
            <div className="text-center p-4 bg-purple-500/[0.04] dark:bg-purple-500/[0.03] rounded-2xl border border-purple-500/15 dark:border-purple-500/10 transition-all">
                <div className="h-10 w-10 bg-purple-100 dark:bg-purple-500/15 text-purple-600 dark:text-purple-300 rounded-2xl flex items-center justify-center mx-auto mb-2"><CreditCardIcon className="h-5 w-5" /></div>
                <p className="text-[11px] font-medium text-light-text-muted dark:text-dark-text-muted uppercase tracking-[0.5px] mb-1">{t('payMethod.credit')}</p>
                <p className="text-[15px] font-semibold text-light-text dark:text-dark-text tabular-nums">{formatCurrency(stats.credito, appLocale)}</p>
            </div>
        </div>
    );
};

// --- MINIATURA ELEGANTE DE CARTÃO DE CRÉDITO ---
const MiniCreditCardBadge: React.FC<{ name: string; color: string }> = ({ name, color }) => {
    const initials = (name || 'CC').trim().slice(0, 3).toUpperCase();
    const bgColor = color || '#3B82F6';

    return (
        <div 
            className="w-10 h-6.5 rounded-lg shrink-0 flex flex-col justify-between p-1 relative overflow-hidden shadow-sm border border-white/20 select-none group-hover:scale-105 transition-transform"
            style={{ 
                background: `linear-gradient(135deg, ${bgColor} 0%, ${bgColor}dd 100%)` 
            }}
        >
            {/* Brilho suave */}
            <div className="absolute inset-0 bg-gradient-to-tr from-black/25 via-transparent to-white/25 pointer-events-none" />
            
            {/* Chip EMV metálico e ícone de cartão */}
            <div className="flex items-center justify-between relative z-10">
                <div className="w-2.5 h-1.5 rounded-[1px] bg-gradient-to-br from-amber-200 to-amber-400 border border-amber-500/50 shadow-inner flex items-center justify-center">
                    <div className="w-1 h-[0.5px] bg-amber-600/70" />
                </div>
                <CreditCardIcon className="h-2.5 w-2.5 text-white/70" />
            </div>

            {/* Sigla do Cartão na base */}
            <span className="text-[8px] font-black tracking-wider text-white truncate relative z-10 leading-none drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]">
                {initials}
            </span>
        </div>
    );
};

export const CreditCardInvoicesWidget: React.FC<{ cards: CreditCard[], allTransactions: Transaction[], currentDate: Date, theme?: string }> = ({ cards, allTransactions, currentDate, theme = 'dark' }) => {
    const context = useContext(AppContext);
    const [expandedCards, setExpandedCards] = useState<string[]>([]);
    const { t, locale } = useTranslation();
    const appLocale = locale === 'pt' ? 'pt-BR' : locale === 'en' ? 'en-US' : locale === 'es' ? 'es-ES' : locale === 'fr' ? 'fr-FR' : 'de-DE';
    
    if (cards.length === 0) return (
        <div className="py-10 flex flex-col items-center justify-center text-center bg-slate-50 dark:bg-white/[0.03] rounded-2xl border border-dashed border-light-border dark:border-white/[0.06]">
            <div className="bg-purple-100 dark:bg-purple-500/10 p-4 rounded-full mb-4">
                <CreditCardIcon className="h-8 w-8 text-purple-500 dark:text-purple-400" />
            </div>
            <p className="text-sm font-bold text-light-text dark:text-dark-text-secondary mb-1">{t('dashboard.noCards')}</p>
            <p className="text-xs text-light-text-muted dark:text-dark-text-muted font-medium mb-4 max-w-[200px]">{t('newTx.addCardFirst')}</p>
            <button 
                onClick={() => { if (context) { context.setCurrentView('menu'); context.setMenuSubView('cards'); } }}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#EA580C] hover:bg-[#F97316] text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-[#EA580C]/25"
            >
                <PlusIcon className="h-4 w-4" /> {t('dashboard.addCard')}
            </button>
        </div>
    );

    const toggleCard = (id: string) => {
        setExpandedCards(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
    };

    return (
        <div className="space-y-4">
            {cards.map(card => {
                const currentMonthStr = getMonthKey(currentDate);
                const allUnpaidTxs = allTransactions.filter(t => t.cardId === card.id && t.statementDate && t.statementDate >= currentMonthStr);
                const totalUnpaid = allUnpaidTxs.reduce((sum, t) => {
                    if (t.tipo === 'saida') return sum + t.valor;
                    if (t.tipo === 'entrada') return sum - t.valor;
                    return sum;
                }, 0);

                const limitAvailable = Math.max(0, card.limit - totalUnpaid);
                
                const isExpanded = expandedCards.includes(card.id);

                // Criar histórico de faturas (3 meses: anterior, atual, próximo)
                const invoiceHistory = [];
                for (let i = -1; i <= 1; i++) {
                    const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
                    const monthKey = getMonthKey(date);
                    const txs = allTransactions.filter(t => t.cardId === card.id && t.statementDate === monthKey);
                    const monthTotal = txs.reduce((sum, t) => {
                        if (t.tipo === 'saida') return sum + t.valor;
                        if (t.tipo === 'entrada') return sum - t.valor;
                        return sum;
                    }, 0);
                    
                    const nomeMes = new Intl.DateTimeFormat(appLocale, { month: 'long' }).format(date);
                    invoiceHistory.push({
                        name: nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1),
                        value: monthTotal,
                        isCurrent: i === 0
                    });
                }

                // Data de vencimento atual
                const currentInvoiceTotal = invoiceHistory.find(h => h.isCurrent)?.value || 0;

                const dueDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), card.dueDay);
                const nomeMesAtual = new Intl.DateTimeFormat(appLocale, { month: 'long' }).format(dueDate);
                
                // Melhor dia de compra (fechamento)
                const closingDay = getEffectiveClosingDay(card, currentDate);
                const closingDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), closingDay);
                if (card.dueDay < closingDay) {
                    closingDate.setMonth(closingDate.getMonth() - 1);
                }
                const nomeMesFechamento = new Intl.DateTimeFormat(appLocale, { month: 'long' }).format(closingDate);

                return (
                    <div key={card.id} className="p-4 bg-white dark:bg-white/[0.02] rounded-2xl border border-light-border dark:border-white/[0.05] overflow-hidden transition-all duration-300 hover:border-slate-300 dark:hover:border-white/10 group">
                        <div 
                            className="flex justify-between items-center cursor-pointer mb-3" 
                            onClick={() => toggleCard(card.id)}
                        >
                            <div className="flex items-center gap-3">
                                <MiniCreditCardBadge name={card.name} color={card.color} />
                                <div className="min-w-0">
                                    <span className="text-[15px] font-semibold text-light-text dark:text-dark-text tracking-tight block truncate">{card.name}</span>
                                    <span className="text-[11px] font-medium text-light-text-muted dark:text-dark-text-muted block">
                                        Vence dia {card.dueDay}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex flex-col items-end">
                                    <span className="text-[11px] font-medium uppercase tracking-[0.5px] text-light-text-muted dark:text-dark-text-muted">{t('dashboard.currentInvoice')}</span>
                                    <span className="text-[15px] font-semibold tabular-nums text-light-text dark:text-dark-text">{formatCurrency(currentInvoiceTotal, appLocale)}</span>
                                </div>
                                <div className="text-light-text-muted dark:text-dark-text-muted ml-1">
                                    {isExpanded ? <ChevronDownIcon className="h-5 w-5" /> : <ChevronRightIcon className="h-5 w-5" />}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2 pt-2.5 pb-1 border-t border-light-border dark:border-white/[0.05]">
                            <div className="flex justify-between items-center text-[12px]">
                                <div className="flex items-center gap-1 text-light-text-muted dark:text-dark-text-muted">
                                    <span className="font-normal">{t('cards.limit')}</span>
                                    <div className="h-3 w-3 border border-slate-300 dark:border-slate-500 rounded-full flex items-center justify-center">
                                        <span className="text-[7px] font-bold">i</span>
                                    </div>
                                </div>
                                <span className="text-[13px] font-semibold tabular-nums text-light-text-secondary dark:text-dark-text-secondary">{formatCurrency(limitAvailable, appLocale)}</span>
                            </div>
                            {card.limit > 0 && (
                                <div className="h-1.5 w-full bg-slate-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
                                    <div 
                                        className="h-full rounded-full transition-all duration-500 opacity-80"
                                        style={{ 
                                            width: `${Math.min(100, Math.max(0, ((card.limit - limitAvailable) / card.limit) * 100))}%`,
                                            backgroundColor: card.color || '#3B82F6'
                                        }}
                                    />
                                </div>
                            )}
                        </div>

                        {isExpanded && (
                            <div className="animate-in slide-in-from-top-2 fade-in duration-300 pt-3 border-t border-light-border dark:border-white/[0.05] mt-3">
                                <InvoiceChartWidget data={invoiceHistory} theme={theme} />
                                
                                <div className="text-center pt-2">
                                    <p className="text-[13px] font-semibold text-light-text dark:text-dark-text">
                                        {t('dashboard.dueDate')} {card.dueDay} {t('month.of')} {nomeMesAtual.charAt(0).toUpperCase() + nomeMesAtual.slice(1)}
                                    </p>
                                    <p className="text-[12px] font-normal text-light-text-muted dark:text-dark-text-muted mt-0.5 mb-4">
                                        {t('dashboard.closingDate')} {closingDay} {t('month.of')} {nomeMesFechamento.charAt(0).toUpperCase() + nomeMesFechamento.slice(1)}
                                    </p>
                                    <button
                                        onClick={(e) => {
                                             e.stopPropagation();
                                            if (context) {
                                                context.setManagementFilter({ method: 'credito', cardId: card.id });
                                                context.setCurrentTab('transacoes');
                                            }
                                        }}
                                        className="w-full py-2.5 bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-700/50 text-light-text-secondary dark:text-dark-text-secondary rounded-xl text-[11px] font-medium uppercase tracking-[0.5px] transition-colors flex items-center justify-center gap-2"
                                    >
                                        <InvoiceDollarIcon className="h-4 w-4" />
                                        {t('dashboard.seeAll')}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

const getAccountIcon = (type: string, className = "h-6 w-6") => {
    switch (type) {
        case 'Poupança':
            return <PiggyBankIcon className={className} />;
        case 'Dinheiro':
            return <WalletIcon className={className} />;
        case 'Investimento':
            return <TrendingUpIcon className={className} />;
        default:
            return <BankIcon className={className} />;
    }
};

export const AccountBalancesWidget: React.FC<{ accounts: Account[], allTransactions: Transaction[], currentDate: Date }> = ({ accounts, allTransactions, currentDate }) => {
    const context = useContext(AppContext);
    const { t, locale } = useTranslation();
    const appLocale = locale === 'pt' ? 'pt-BR' : locale === 'en' ? 'en-US' : locale === 'es' ? 'es-ES' : locale === 'fr' ? 'fr-FR' : 'de-DE';
    
    if (accounts.length === 0) return (
        <div className="py-10 flex flex-col items-center justify-center text-center bg-slate-50 dark:bg-white/[0.03] rounded-2xl border border-dashed border-light-border dark:border-white/[0.06]">
            <div className="bg-blue-100 dark:bg-blue-500/10 p-4 rounded-full mb-4">
                <BankIcon className="h-8 w-8 text-blue-500 dark:text-blue-400" />
            </div>
            <p className="text-sm font-bold text-light-text dark:text-dark-text-secondary mb-1">{t('dashboard.noAccounts')}</p>
            <p className="text-xs text-light-text-muted dark:text-dark-text-muted font-medium mb-4 max-w-[200px]">{t('newTx.addAccountFirst')}</p>
            <button 
                onClick={() => { if (context) { context.setCurrentView('openfinance'); } }}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#EA580C] hover:bg-[#F97316] text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-[#EA580C]/25"
            >
                <PlusIcon className="h-4 w-4" /> {t('dashboard.addAccount')}
            </button>
        </div>
    );
    
    // Calcula o saldo total de todas as contas dinamicamente até o mês exibido
    const calculatedAccounts = accounts.map(acc => ({
        ...acc,
        balance: calculateAccountBalance(acc.id, allTransactions, getSaldoLimitDate(currentDate))
    }));

    const handleWidgetClick = () => {
        if (context) {
            context.setCurrentView('openfinance');
        }
    };
 
    return (
        <div 
            onClick={handleWidgetClick}
            className="divide-y divide-light-border dark:divide-dark-elevated/40 cursor-pointer active:opacity-90 transition-all"
        >
            {calculatedAccounts.map(account => {
                const logo = getBankLogo(account.bankName, "w-6 h-6 rounded-lg flex-shrink-0 overflow-hidden");
                return (
                    <div key={account.id} className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0">
                        <div className="flex items-center gap-4">
                            {logo || (
                                <div style={{ color: account.color }}>
                                    {getAccountIcon(account.accountType, "h-6 w-6 flex-shrink-0")}
                                </div>
                            )}
                            <span className="font-medium text-[15px] text-light-text dark:text-dark-text">{account.bankName}</span>
                        </div>
                        <span className={`font-semibold text-[15px] tabular-nums ${account.balance < 0 ? 'text-rose-500' : 'text-light-text dark:text-dark-text'}`}>
                            {formatCurrency(account.balance, appLocale)}
                        </span>
                    </div>
                );
            })}
        </div>
    );
};



export const Distribution502030Widget: React.FC<{ transactions: Transaction[], categorias: any }> = ({ transactions, categorias }) => {
    const distribution = useMemo(() => {
        return calculate502030(transactions, categorias);
    }, [transactions, categorias]);

    const validation = useMemo(() => {
        return validate502030(distribution);
    }, [distribution]);

    const { t, locale } = useTranslation();
    const appLocale = locale === 'pt' ? 'pt-BR' : locale === 'en' ? 'en-US' : locale === 'es' ? 'es-ES' : locale === 'fr' ? 'fr-FR' : 'de-DE';

    if (distribution.receitas <= 0) {
        return (
            <div className="py-4 text-center">
                <p className="text-xs text-light-text-muted dark:text-dark-text-muted font-semibold italic">{t('dashboard.emptyGraph')}</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <p className="text-[11px] text-slate-500 font-medium leading-relaxed">{t('premium.benefit.distributionDesc')}</p>
            
            {validation.status === 'warning' && (
                <div className="p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/30 rounded-xl space-y-1">
                    <p className="text-[10px] font-black text-rose-700 dark:text-rose-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                        {t('dashboard.budgetExceeded')}
                    </p>
                    <ul className="text-xs text-rose-600 dark:text-rose-300 list-disc pl-4 space-y-0.5 font-medium">
                        {validation.mensagens.map((msg, idx) => <li key={idx}>{msg}</li>)}
                    </ul>
                </div>
            )}

            <div className="space-y-3">
                {/* Gastos Fixos */}
                <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-blue-900 dark:text-blue-100 flex items-center gap-1.5">
                            {t('categories.groupFixed')} <span className="text-[10px] font-medium text-blue-700/70 dark:text-blue-300/70 bg-blue-500/10 px-1.5 rounded">(50% = {formatCurrency(distribution.receitas * 0.5, appLocale)})</span>
                        </span>
                        <span className="font-black text-blue-700 dark:text-blue-400">
                            {formatCurrency(distribution['Gastos Fixos'], appLocale)} <span className="opacity-50 mx-1">•</span> {distribution.percentuais['Gastos Fixos'].toFixed(1)}%
                        </span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 dark:bg-dark-bg rounded-full overflow-hidden border border-light-border dark:border-dark-elevated">
                        <div className={`h-full transition-all duration-1000 ${distribution.percentuais['Gastos Fixos'] > 50 ? 'bg-rose-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(distribution.percentuais['Gastos Fixos'], 100)}%` }} />
                    </div>
                </div>

                {/* Gastos Variáveis */}
                <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-rose-900 dark:text-rose-100 flex items-center gap-1.5">
                            {t('categories.groupVariable')} <span className="text-[10px] font-medium text-rose-700/70 dark:text-rose-300/70 bg-rose-500/10 px-1.5 rounded">(30% = {formatCurrency(distribution.receitas * 0.3, appLocale)})</span>
                        </span>
                        <span className="font-black text-rose-700 dark:text-rose-400">
                            {formatCurrency(distribution['Gastos Variáveis'], appLocale)} <span className="opacity-50 mx-1">•</span> {distribution.percentuais['Gastos Variáveis'].toFixed(1)}%
                        </span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 dark:bg-dark-bg rounded-full overflow-hidden border border-light-border dark:border-dark-elevated">
                        <div className={`h-full transition-all duration-1000 ${distribution.percentuais['Gastos Variáveis'] > 30 ? 'bg-rose-500' : 'bg-rose-400'}`} style={{ width: `${Math.min(distribution.percentuais['Gastos Variáveis'], 100)}%` }} />
                    </div>
                </div>

                {/* Reserva Financeira */}
                <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-emerald-900 dark:text-emerald-100 flex items-center gap-1.5">
                            {t('categories.groupReserve')} <span className="text-[10px] font-medium text-emerald-700/70 dark:text-emerald-300/70 bg-emerald-500/10 px-1.5 rounded">(20% = {formatCurrency(distribution.receitas * 0.2, appLocale)})</span>
                        </span>
                        <span className="font-black text-emerald-700 dark:text-emerald-400">
                            {formatCurrency(distribution['Reserva Financeira'], appLocale)} <span className="opacity-50 mx-1">•</span> {distribution.percentuais['Reserva Financeira'].toFixed(1)}%
                        </span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 dark:bg-dark-bg rounded-full overflow-hidden border border-light-border dark:border-dark-elevated">
                        <div className={`h-full transition-all duration-1000 ${distribution.percentuais['Reserva Financeira'] < 20 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(distribution.percentuais['Reserva Financeira'], 100)}%` }} />
                    </div>
                </div>
            </div>
        </div>
    );
};
