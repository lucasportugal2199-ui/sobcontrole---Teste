import React, { useMemo } from 'react';
import { Transaction, CreditCard } from '../../types';
import { useTranslation } from '../../i18n';
import { formatCurrency, getMonthKey } from '../../utils/helpers';
import {
    getInstallmentList,
    getCurrentMonthKey,
    cleanServiceName
} from '../../utils/installmentsHelper';
import { ArrowRightIcon, CreditCardIcon, RepeatIcon } from '../icons';

interface InstallmentsWidgetProps {
    allTransactions: Transaction[];
    creditCards: CreditCard[];
    currentDate?: Date;
    onOpenFullView?: () => void;
}

export const InstallmentsWidget: React.FC<InstallmentsWidgetProps> = ({
    allTransactions,
    creditCards,
    currentDate,
    onOpenFullView
}) => {
    const { locale, currency } = useTranslation();
    const appLocale = locale === 'pt' ? 'pt-BR' : locale === 'en' ? 'en-US' : locale === 'es' ? 'es-ES' : locale === 'fr' ? 'fr-FR' : 'de-DE';
    const appCurrency = currency || 'BRL';

    // Chave do mês selecionado
    const selectedMonthKey = useMemo(() => {
        if (currentDate) return getMonthKey(currentDate);
        return getCurrentMonthKey();
    }, [currentDate]);

    // 1. Todas as compras parceladas estruturadas
    const allInstallments = useMemo(() => {
        return getInstallmentList(allTransactions, creditCards, appLocale, selectedMonthKey, 'all');
    }, [allTransactions, creditCards, appLocale, selectedMonthKey]);

    // 2. Parcelas que possuem lançamento no mês selecionado
    const monthInstallments = useMemo(() => {
        return allInstallments
            .map(item => {
                const txInMonth = item.rawTransactions.find(t => t.data.substring(0, 7) === selectedMonthKey);
                return {
                    ...item,
                    thisMonthTx: txInMonth,
                    effectiveMonthlyValue: txInMonth ? txInMonth.valor : item.monthlyValue
                };
            })
            .filter(item => Boolean(item.thisMonthTx));
    }, [allInstallments, selectedMonthKey]);

    const totalInstallmentsThisMonth = useMemo(() => {
        return monthInstallments.reduce((acc, item) => acc + item.effectiveMonthlyValue, 0);
    }, [monthInstallments]);

    // 3. Assinaturas (apenas categoria 'Assinaturas')
    const monthSubscriptions = useMemo(() => {
        const list = allTransactions.filter(t => {
            if (t.installment && t.installment.total > 1) return false;
            if (t.recurrenceId?.startsWith('inst-')) return false;
            const lowerDesc = (t.descricao || '').toLowerCase();
            return t.categoria === 'Assinaturas' || lowerDesc.startsWith('assinatura ');
        });
        const map = new Map<string, Transaction>();
        list.forEach(tx => {
            const cleanKey = tx.recurrenceId || cleanServiceName(tx.descricao).toLowerCase();
            if (!map.has(cleanKey) || new Date(tx.data) > new Date(map.get(cleanKey)!.data)) {
                map.set(cleanKey, tx);
            }
        });
        return Array.from(map.values()).filter(t => t.tipo === 'saida');
    }, [allTransactions]);

    const totalSubscriptionsThisMonth = useMemo(() => {
        return monthSubscriptions.reduce((acc, curr) => acc + curr.valor, 0);
    }, [monthSubscriptions]);

    const totalItemsCount = monthInstallments.length + monthSubscriptions.length;

    if (totalItemsCount === 0) {
        return (
            <div className="py-8 flex flex-col items-center justify-center text-center bg-slate-50 dark:bg-white/[0.02] rounded-2xl border border-dashed border-light-border dark:border-white/[0.06] p-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
                    <CreditCardIcon className="h-6 w-6 stroke-[2]" />
                </div>
                <h4 className="text-sm font-bold text-light-text dark:text-dark-text mb-1">
                    Sem parcelas ou assinaturas neste mês
                </h4>
                <p className="text-xs text-light-text-muted dark:text-dark-text-muted max-w-[240px] mb-4">
                    Nenhuma parcela ou assinatura com cobrança prevista para este mês.
                </p>
                {onOpenFullView && (
                    <button
                        type="button"
                        onClick={onOpenFullView}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-dark-card dark:hover:bg-dark-elevated text-white rounded-xl text-xs font-bold transition-all border border-slate-700 dark:border-white/10 active:scale-95"
                    >
                        <span>Ver visão completa de parcelas &amp; assinaturas</span>
                        <ArrowRightIcon className="h-3.5 w-3.5" />
                    </button>
                )}
            </div>
        );
    }

    const totalCommittedThisMonth = totalInstallmentsThisMonth + totalSubscriptionsThisMonth;
    const installmentsPercent = totalCommittedThisMonth > 0 ? (totalInstallmentsThisMonth / totalCommittedThisMonth) * 100 : 0;
    const subscriptionsPercent = totalCommittedThisMonth > 0 ? (totalSubscriptionsThisMonth / totalCommittedThisMonth) * 100 : 0;

    return (
        <div className="space-y-4">
            {/* Grid com Parcelas & Assinaturas do Mês com Cores Fintech Vibrantes */}
            {/* Grid com Parcelas & Assinaturas do Mês com Cores Elegantes e Harmonizadas */}
            <div className="grid grid-cols-2 gap-3">
                {/* Card Parcelas (Roxo / Violeta) */}
                <div className="bg-slate-50/80 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-500/20 rounded-2xl p-3.5 relative overflow-hidden shadow-sm transition-all duration-300">
                    <div className="flex items-center justify-between mb-1.5 relative z-10">
                        <span className="text-[11px] font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-[0.5px] block">
                            Parcelas no Mês
                        </span>
                        <div className="w-7 h-7 rounded-xl bg-purple-500/15 dark:bg-purple-500/20 text-purple-600 dark:text-purple-300 flex items-center justify-center shrink-0">
                            <CreditCardIcon className="h-3.5 w-3.5" />
                        </div>
                    </div>
                    <span className="text-[20px] sm:text-[22px] font-bold text-slate-900 dark:text-white tracking-tight tabular-nums block relative z-10">
                        {formatCurrency(totalInstallmentsThisMonth, appLocale, appCurrency)}
                    </span>
                    <div className="mt-2 relative z-10">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[11px] font-medium bg-purple-500/10 dark:bg-purple-400/10 text-purple-700 dark:text-purple-300 border border-purple-500/20 dark:border-purple-400/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                            {monthInstallments.length} {monthInstallments.length === 1 ? 'compra ativa' : 'compras ativas'}
                        </span>
                    </div>
                </div>

                {/* Card Assinaturas (Azul Elétrico / Ciano) */}
                <div className="bg-slate-50/80 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-500/20 rounded-2xl p-3.5 relative overflow-hidden shadow-sm transition-all duration-300">
                    <div className="flex items-center justify-between mb-1.5 relative z-10">
                        <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-[0.5px] block">
                            Assinaturas
                        </span>
                        <div className="w-7 h-7 rounded-xl bg-blue-500/15 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300 flex items-center justify-center shrink-0">
                            <RepeatIcon className="h-3.5 w-3.5" />
                        </div>
                    </div>
                    <span className="text-[20px] sm:text-[22px] font-bold text-slate-900 dark:text-white tracking-tight tabular-nums block relative z-10">
                        {formatCurrency(totalSubscriptionsThisMonth, appLocale, appCurrency)}
                    </span>
                    <div className="mt-2 relative z-10">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[11px] font-medium bg-blue-500/10 dark:bg-blue-400/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 dark:border-blue-400/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                            {monthSubscriptions.length} {monthSubscriptions.length === 1 ? 'assinatura' : 'assinaturas'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Barra de Distribuição de Comprometimento Mensal */}
            {totalCommittedThisMonth > 0 && (
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.05] space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                        <span className="font-medium text-slate-500 dark:text-slate-400 uppercase tracking-[0.5px]">
                            Comprometimento no Mês
                        </span>
                        <span className="font-bold tabular-nums text-slate-900 dark:text-white text-[13px]">
                            {formatCurrency(totalCommittedThisMonth, appLocale, appCurrency)}
                        </span>
                    </div>
                    <div className="h-2 w-full bg-slate-200 dark:bg-white/[0.06] rounded-full overflow-hidden flex gap-0.5">
                        {installmentsPercent > 0 && (
                            <div
                                className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-500"
                                style={{ width: `${installmentsPercent}%` }}
                                title={`Parcelas: ${installmentsPercent.toFixed(0)}%`}
                            />
                        )}
                        {subscriptionsPercent > 0 && (
                            <div
                                className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-500"
                                style={{ width: `${subscriptionsPercent}%` }}
                                title={`Assinaturas: ${subscriptionsPercent.toFixed(0)}%`}
                            />
                        )}
                    </div>
                </div>
            )}

            {/* Ação para ver tela completa com estilo refinado */}
            {onOpenFullView && (
                <button
                    type="button"
                    onClick={onOpenFullView}
                    className="w-full py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.08] text-slate-900 dark:text-white border border-slate-200/80 dark:border-white/10 text-[12px] font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98] group shadow-sm"
                >
                    <span>Ver Parcelas &amp; Assinaturas</span>
                    <ArrowRightIcon className="h-4 w-4 text-purple-600 dark:text-purple-400 group-hover:translate-x-1 transition-transform" />
                </button>
            )}
        </div>
    );
};
