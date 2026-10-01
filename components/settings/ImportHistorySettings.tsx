import React, { useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import { useTranslation } from '../../i18n';
import {
    ClipboardListIcon, TrashIcon, InvoiceDollarIcon, CheckCircleIcon
} from '../icons';

const ImportHistorySettings: React.FC = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error("ImportHistorySettings used outside AppContext");

    const { importHistory, setImportHistory, showToast, setMenuSubView } = context as any;
    const { t, locale } = useTranslation();
    const appLocale = locale === 'pt' ? 'pt-BR' : locale === 'en' ? 'en-US' : locale === 'es' ? 'es-ES' : locale === 'fr' ? 'fr-FR' : 'de-DE';

    const historyList = importHistory || [];

    const totalTransactions = historyList.reduce((acc: number, curr: any) => acc + (curr.transactionCount || 0), 0);

    const handleDeleteItem = (id: string) => {
        if (setImportHistory) {
            setImportHistory((prev: any[]) => prev.filter(item => item.id !== id));
            showToast(t('common.deleted') || 'Item removido', 'info');
        }
    };

    const handleClearAll = () => {
        if (setImportHistory) {
            setImportHistory([]);
            showToast(t('data.importHistoryCleared') || 'Histórico de importação limpo', 'info');
        }
    };

    const formatDate = (isoString: string) => {
        try {
            const d = new Date(isoString);
            return d.toLocaleDateString(appLocale, {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return isoString;
        }
    };

    return (
        <div className="space-y-5 max-w-lg mx-auto pb-8">
            {/* Header Summary Banner */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/60 rounded-2xl p-5 shadow-xl text-white relative overflow-hidden">
                <div className="relative z-10 flex items-center justify-between">
                    <div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                            {t('data.importHistory') || 'Histórico de Importação'}
                        </span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black text-white">
                                {historyList.length}
                            </span>
                            <span className="text-xs text-slate-400 font-medium">
                                {historyList.length === 1 ? 'arquivo importado' : 'arquivos importados'}
                            </span>
                        </div>
                        <p className="text-xs text-blue-400 font-semibold mt-1 flex items-center gap-1">
                            <CheckCircleIcon className="h-3.5 w-3.5 inline" />
                            {totalTransactions} {totalTransactions === 1 ? 'transação processada' : 'transações processadas no total'}
                        </p>
                    </div>

                    {historyList.length > 0 && (
                        <button
                            onClick={handleClearAll}
                            className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5"
                        >
                            <TrashIcon className="h-3.5 w-3.5" />
                            {t('common.clear') || 'Limpar'}
                        </button>
                    )}
                </div>
            </div>

            {/* List of imported files */}
            <div className="space-y-2.5">
                <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-semibold text-slate-500 dark:text-neutral-400">
                        {t('data.importedFiles') || 'Arquivos Processados'}
                    </span>
                    <span className="text-xs font-semibold text-blue-500">
                        {historyList.length}
                    </span>
                </div>

                {historyList.length === 0 ? (
                    <div className="text-center py-12 px-4 bg-white dark:bg-dark-card border border-dashed border-slate-200 dark:border-white/[0.08] rounded-2xl">
                        <ClipboardListIcon className="h-10 w-10 mx-auto mb-3 text-slate-400" />
                        <p className="font-bold text-sm text-light-text dark:text-dark-text-secondary">
                            {t('data.noImportHistory') !== 'data.noImportHistory' ? t('data.noImportHistory') : 'Nenhum histórico de importação'}
                        </p>
                        <p className="text-xs text-light-text-muted dark:text-dark-text-muted mt-1 max-w-xs mx-auto">
                            Seus arquivos OFX, recibos e extratos bancários importados aparecerão listados aqui.
                        </p>
                        <button
                            onClick={() => setMenuSubView && setMenuSubView('data')}
                            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 inline-flex items-center gap-2"
                        >
                            <InvoiceDollarIcon className="h-4 w-4" />
                            {t('data.import') || 'Importar Extrato'}
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col gap-2.5">
                        {historyList.map((item: any) => (
                            <div
                                key={item.id}
                                className="bg-white dark:bg-dark-card border border-slate-200 dark:border-white/[0.06] rounded-2xl p-4 flex items-center justify-between shadow-sm hover:border-blue-500/30 transition-all"
                            >
                                <div className="flex items-center gap-3.5 min-w-0">
                                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                                        <InvoiceDollarIcon className="h-5 w-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="text-sm font-bold text-light-text dark:text-dark-text leading-tight truncate">
                                            {item.fileName || 'Extrato Bancário'}
                                        </h4>
                                        <p className="text-xs text-slate-500 dark:text-[#94A3B8] truncate mt-0.5">
                                            {formatDate(item.importDate)}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 shrink-0 ml-3">
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                        {item.transactionCount || 0} tx
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => handleDeleteItem(item.id)}
                                        className="p-2 text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors"
                                        title={t('common.delete') || 'Excluir'}
                                    >
                                        <TrashIcon className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ImportHistorySettings;
