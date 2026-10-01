import React from 'react';
import { PlusIcon, ArrowDownIcon, ArrowUpIcon, CreditCardIcon, ArrowsRightLeftIcon } from './icons';
import { useTranslation } from '../i18n';

interface TransactionTypeMenuProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectType: (type: 'entrada' | 'saida' | 'credito' | 'transferencia') => void;
}

const TransactionTypeMenu: React.FC<TransactionTypeMenuProps> = ({ isOpen, onClose, onSelectType }) => {
    const { t } = useTranslation();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] flex flex-col justify-end pointer-events-none">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm pointer-events-auto transition-opacity"
                onClick={onClose}
            />

            {/* Menu Container */}
            <div className="relative z-10 w-full max-w-md mx-auto px-4 pb-32 flex flex-col gap-3 pointer-events-auto animate-in slide-in-from-bottom-8 fade-in duration-300">
                <button
                    onClick={() => { onSelectType('saida'); onClose(); }}
                    className="flex items-center gap-4 bg-white dark:bg-dark-card p-4 rounded-2xl shadow-xl w-full text-left active:scale-95 transition-transform border border-light-border dark:border-dark-elevated"
                >
                    <div className="bg-red-100 dark:bg-red-900/40 p-3 rounded-full">
                        <ArrowUpIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-black text-light-text dark:text-dark-text uppercase tracking-tight text-sm">{t('txMenu.newExpense')}</h3>
                        <p className="text-xs text-slate-500 font-medium">{t('txMenu.expenseDesc')}</p>
                    </div>
                </button>

                <button
                    onClick={() => { onSelectType('entrada'); onClose(); }}
                    className="flex items-center gap-4 bg-white dark:bg-dark-card p-4 rounded-2xl shadow-xl w-full text-left active:scale-95 transition-transform border border-light-border dark:border-dark-elevated"
                >
                    <div className="bg-emerald-100 dark:bg-emerald-900/40 p-3 rounded-full">
                        <ArrowDownIcon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-black text-light-text dark:text-dark-text uppercase tracking-tight text-sm">{t('txMenu.newIncome')}</h3>
                        <p className="text-xs text-slate-500 font-medium">{t('txMenu.incomeDesc')}</p>
                    </div>
                </button>

                <button
                    onClick={() => { onSelectType('transferencia'); onClose(); }}
                    className="flex items-center gap-4 bg-white dark:bg-dark-card p-4 rounded-2xl shadow-xl w-full text-left active:scale-95 transition-transform border border-light-border dark:border-dark-elevated"
                >
                    <div className="bg-slate-100 dark:bg-slate-800/40 p-3 rounded-full">
                        <ArrowsRightLeftIcon className="h-6 w-6 text-light-text-secondary dark:text-dark-text-muted" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-black text-light-text dark:text-dark-text uppercase tracking-tight text-sm">{t('txMenu.transfer')}</h3>
                        <p className="text-xs text-slate-500 font-medium">{t('txMenu.transferDesc')}</p>
                    </div>
                </button>

                <button
                    onClick={() => { onSelectType('credito'); onClose(); }}
                    className="flex items-center gap-4 bg-white dark:bg-dark-card p-4 rounded-2xl shadow-xl w-full text-left active:scale-95 transition-transform border border-light-border dark:border-dark-elevated"
                >
                    <div className="bg-blue-100 dark:bg-blue-900/40 p-3 rounded-full">
                        <CreditCardIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-black text-light-text dark:text-dark-text uppercase tracking-tight text-sm">{t('txMenu.creditCard')}</h3>
                        <p className="text-xs text-slate-500 font-medium">{t('txMenu.creditCardDesc')}</p>
                    </div>
                </button>
            </div>
        </div>
    );
};

export default TransactionTypeMenu;
