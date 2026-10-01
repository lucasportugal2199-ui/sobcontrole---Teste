import React, { useContext } from 'react';
import {
    InvoiceDollarIcon, ArrowDownTrayIcon, TrashIcon, LoaderIcon, ClipboardListIcon, SparklesIcon, ChevronRightIcon
} from '../icons';
import { AppContext } from '../../context/AppContext';
import { exportTransactionsToExcel, exportTransactionsToCSV } from '../../utils/helpers';
import { useTranslation } from '../../i18n';

interface MenuItemProps {
    icon: React.ElementType;
    title: string;
    subtitle: string;
    onClick: () => void;
    iconColor: string;
    isPro?: boolean;
}

const MenuItem: React.FC<MenuItemProps> = ({
    icon: Icon, title, subtitle, onClick,
    iconColor = "text-slate-500",
    isPro = false,
}) => {
    const { userProfile } = useContext(AppContext);

    return (
        <div
            onClick={onClick}
            className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-white/[0.04] active:scale-[0.99] transition-all cursor-pointer text-left group"
        >
            <div className="flex items-center gap-3.5 min-w-0">
                <span className={`shrink-0 w-8 h-8 rounded-xl bg-slate-100 dark:bg-white/[0.05] flex items-center justify-center ${iconColor}`}>
                    <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-slate-800 dark:text-neutral-200 group-hover:text-blue-600 dark:group-hover:text-white transition-colors truncate">
                            {title}
                        </h4>
                        {isPro && !userProfile.isPremium && (
                            <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                                PRO
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-neutral-400 truncate mt-0.5 font-normal">{subtitle}</p>
                </div>
            </div>
            <ChevronRightIcon className="h-4 w-4 text-slate-400 dark:text-neutral-600 group-hover:text-slate-600 dark:group-hover:text-neutral-300 group-hover:translate-x-0.5 transition-all ml-2 shrink-0" />
        </div>
    );
};

interface DataSettingsProps {
    fileInputRef: React.RefObject<HTMLInputElement>;
    handleFileImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
    isImporting: boolean;
    handleProAction: (action: () => void) => void;
    setIsResetModalOpen: (isOpen: boolean) => void;
    setMenuSubView: (view: any) => void;
    setIsDeleteAccountModalOpen: (isOpen: boolean) => void;
}

const DataSettings: React.FC<DataSettingsProps> = ({
    fileInputRef,
    handleFileImport,
    isImporting,
    handleProAction,
    setIsResetModalOpen,
    setMenuSubView,
    setIsDeleteAccountModalOpen
}) => {
    const { allTransactions, importHistory, handleGenerateMockData } = useContext(AppContext)!;
    const { t } = useTranslation();

    return (
        <div className="space-y-4 max-w-lg mx-auto pb-8">
            {/* Seção: Importar e Exportar */}
            <div className="space-y-1.5">
                <div className="px-1 text-xs font-semibold text-slate-500 dark:text-neutral-400">
                    {t('data.importExportSection') || 'Importar e Exportar'}
                </div>
                <div className="bg-white dark:bg-[#111111] border border-slate-200/80 dark:border-white/[0.06] rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-white/[0.04] shadow-sm">
                    <MenuItem
                        icon={InvoiceDollarIcon}
                        title={t('data.import') || 'Importar Extrato'}
                        subtitle={t('data.importSubtitle') || 'OFX ou PDF do banco'}
                        iconColor="text-emerald-500"
                        onClick={() => handleProAction(() => fileInputRef.current?.click())}
                        isPro={true}
                    />
                    {/* Hidden input for file import */}
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileImport}
                        accept=".ofx,application/pdf"
                        className="hidden"
                    />

                    <MenuItem
                        icon={ClipboardListIcon}
                        title={t('data.importHistory') || 'Histórico de Importação'}
                        subtitle={importHistory && importHistory.length > 0 ? `${importHistory.length} ${importHistory.length === 1 ? 'arquivo registrado' : 'arquivos registrados'}` : (t('data.importHistorySubtitle') !== 'data.importHistorySubtitle' ? t('data.importHistorySubtitle') : 'Ver extratos e recibos importados')}
                        iconColor="text-blue-500"
                        onClick={() => setMenuSubView('importHistory')}
                    />
                    <MenuItem
                        icon={ArrowDownTrayIcon}
                        title={t('data.exportExcel') || 'Exportar Excel'}
                        subtitle={t('data.exportExcelDesc') || 'Baixar todas as transações (XLSX)'}
                        iconColor="text-emerald-500"
                        onClick={() => handleProAction(() => exportTransactionsToExcel(allTransactions))}
                        isPro={true}
                    />
                    <MenuItem
                        icon={ClipboardListIcon}
                        title={t('data.exportCsv') || 'Exportar CSV'}
                        subtitle={t('data.exportCsvDesc') || 'Formato compatível com planilhas'}
                        iconColor="text-cyan-500"
                        onClick={() => handleProAction(() => exportTransactionsToCSV(allTransactions))}
                        isPro={true}
                    />
                </div>
            </div>

            {/* Seção: Gerenciamento */}
            <div className="space-y-1.5">
                <div className="px-1 text-xs font-semibold text-slate-500 dark:text-neutral-400">
                    {t('data.managementSection') || 'Gerenciamento'}
                </div>
                <div className="bg-white dark:bg-[#111111] border border-slate-200/80 dark:border-white/[0.06] rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-white/[0.04] shadow-sm">
                    {import.meta.env.DEV && (
                        <MenuItem
                            icon={SparklesIcon}
                            title="Gerar Transações de Teste"
                            subtitle="Criar 18 lançamentos de exemplo para testes"
                            iconColor="text-indigo-500 dark:text-indigo-400"
                            onClick={() => handleGenerateMockData?.()}
                        />
                    )}
                    <MenuItem
                        icon={TrashIcon}
                        title={t('data.reset') || 'Limpar Dados'}
                        subtitle={t('data.resetSubtitle') || 'Resetar informações do app'}
                        iconColor="text-amber-500"
                        onClick={() => setIsResetModalOpen(true)}
                    />
                </div>
            </div>

            {/* Seção: Zona de Perigo */}
            <div className="space-y-1.5">
                <div className="px-1 text-xs font-semibold text-rose-500 dark:text-rose-400">
                    {t('data.dangerZone') || 'Zona de Perigo'}
                </div>
                <div className="bg-white dark:bg-[#111111] border border-rose-200 dark:border-rose-900/30 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-white/[0.04] shadow-sm">
                    <MenuItem
                        icon={TrashIcon}
                        title={t('data.deleteAccount') || 'Excluir Conta'}
                        subtitle={t('data.deleteAccountWarning') && t('data.deleteAccountWarning') !== 'data.deleteAccountWarning' ? t('data.deleteAccountWarning') : 'Excluir permanentemente sua conta e todos os dados'}
                        iconColor="text-rose-500"
                        onClick={() => setIsDeleteAccountModalOpen(true)}
                    />
                </div>
            </div>

            {isImporting && (
                <div className="flex flex-col items-center justify-center p-8 bg-white dark:bg-dark-card rounded-2xl border border-slate-200 dark:border-white/[0.06] shadow-sm">
                    <LoaderIcon className="h-8 w-8 text-blue-500 animate-spin mb-3" />
                    <p className="text-sm font-bold text-light-text dark:text-dark-text-secondary">{t('data.analyzingStatement') || 'Analisando extrato com IA...'}</p>
                </div>
            )}
        </div>
    );
};

export default DataSettings;
