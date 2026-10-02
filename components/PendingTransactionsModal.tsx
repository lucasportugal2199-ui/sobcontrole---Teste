import React, { useState } from 'react';
import { PendingBankTransaction, BankNotificationService } from '../services/bankNotificationService';
import { formatCurrency } from '../utils/helpers';
import { useTranslation } from '../i18n';
import { CheckCircleIcon, TrashIcon, CloseIcon, SparklesIcon, CreditCardIcon, BankIcon, EditIcon } from './icons';

interface PendingTransactionsModalProps {
    isOpen: boolean;
    pendingTransactions: PendingBankTransaction[];
    onClose: () => void;
    onConfirmAll: (transactions: PendingBankTransaction[]) => void;
    onConfirmSingle: (transaction: PendingBankTransaction) => void;
    onDiscardSingle: (id: string) => void;
    onDiscardAll: () => void;
}

export const PendingTransactionsModal: React.FC<PendingTransactionsModalProps> = ({
    isOpen,
    pendingTransactions,
    onClose,
    onConfirmAll,
    onConfirmSingle,
    onDiscardSingle,
    onDiscardAll,
}) => {
    const { locale } = useTranslation();
    const appLocale = locale === 'pt' ? 'pt-BR' : 'en-US';

    if (!isOpen || pendingTransactions.length === 0) return null;

    return (
        <div className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-lg bg-white dark:bg-dark-card rounded-t-[32px] sm:rounded-3xl border border-slate-200/80 dark:border-white/[0.08] shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
                {/* Header */}
                <div className="p-5 pb-3 border-b border-slate-100 dark:border-white/[0.06] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20">
                            <SparklesIcon className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-black text-slate-900 dark:text-white leading-tight">
                                Transações Detectadas ({pendingTransactions.length})
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                Capturadas automaticamente do seu banco
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-all"
                    >
                        <CloseIcon className="h-5 w-5" />
                    </button>
                </div>

                {/* Lista de Transações */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
                    {pendingTransactions.map((tx) => (
                        <div
                            key={tx.id}
                            className="p-3.5 bg-slate-50 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/[0.06] rounded-2xl flex items-center justify-between gap-3 hover:border-slate-300 dark:hover:border-white/[0.12] transition-all"
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                                    {tx.paymentMethod === 'credito' ? (
                                        <CreditCardIcon className="h-5 w-5" />
                                    ) : (
                                        <BankIcon className="h-5 w-5" />
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold text-slate-800 dark:text-white truncate">
                                            {tx.descricao || 'Compra sem nome'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                            {tx.bankName}
                                        </span>
                                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase">
                                            {tx.paymentMethod === 'credito' ? 'Crédito' : 'Débito / PIX'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                                <div className="text-right">
                                    <span className="text-sm font-black text-rose-600 dark:text-rose-400">
                                        -{formatCurrency(tx.valor, appLocale)}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => onConfirmSingle(tx)}
                                        title="Editar / Confirmar"
                                        className="p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 transition-all active:scale-90"
                                    >
                                        <CheckCircleIcon className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => onDiscardSingle(tx.id)}
                                        title="Descartar"
                                        className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 transition-all active:scale-90"
                                    >
                                        <TrashIcon className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer com Ações em Lote */}
                <div className="p-4 border-t border-slate-100 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.01] flex flex-col sm:flex-row items-center gap-2.5">
                    <button
                        onClick={() => onConfirmAll(pendingTransactions)}
                        className="w-full py-3.5 px-4 rounded-xl bg-brand-accent text-white hover:bg-brand-accent-hover font-black text-xs uppercase tracking-wider shadow-lg shadow-brand-accent/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                        <CheckCircleIcon className="h-4 w-4" />
                        <span>Aprovar Todas ({pendingTransactions.length})</span>
                    </button>
                    <button
                        onClick={onDiscardAll}
                        className="w-full sm:w-auto py-3 px-4 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 font-bold text-xs uppercase tracking-wider transition-all"
                    >
                        Descartar Fila
                    </button>
                </div>
            </div>
        </div>
    );
};
