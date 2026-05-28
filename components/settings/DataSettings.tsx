import React, { useContext } from 'react';
import {
    InvoiceDollarIcon, ArrowDownTrayIcon, TrashIcon, ShieldCheckIcon, LoaderIcon, ClipboardListIcon
} from '../icons';
import { AppContext } from '../../context/AppContext';
import { exportTransactionsToExcel, exportTransactionsToCSV } from '../../utils/helpers';

interface MenuItemProps {
    icon: React.ElementType;
    title: string;
    subtitle: string;
    onClick: () => void;
    colorClass?: string;
    iconBgClass?: string;
    isPro?: boolean;
}

const MenuItem: React.FC<MenuItemProps> = ({
    icon: Icon, title, subtitle, onClick,
    colorClass = "text-slate-500 dark:text-slate-300",
    iconBgClass = "bg-slate-100 dark:bg-dark-surface",
    isPro = false
}) => {
    const { userProfile } = useContext(AppContext);

    return (
        <button onClick={onClick} className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-dark-surface/50 transition-colors group">
            <div className="flex items-center gap-4">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${iconBgClass} ${colorClass}`}>
                    <Icon className="h-5 w-5" />
                </div>
                <div className="text-left">
                    <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-dark-accent transition-colors">{title}</h4>
                        {isPro && !userProfile.isPremium && <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-[9px] font-black px-1.5 py-0.5 rounded uppercase">PRO</span>}
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium leading-tight">{subtitle}</p>
                </div>
            </div>
        </button>
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
    const { allTransactions } = useContext(AppContext);

    return (
        <div>
            {/* Seção: Importar e Exportar */}
            <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 ml-4">Importar e Exportar</h3>
            <div className="bg-white dark:bg-dark-surface rounded-3xl overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm mb-6">
                <MenuItem
                    icon={InvoiceDollarIcon}
                    title="Importar Extrato"
                    subtitle="OFX ou PDF do banco"
                    colorClass="text-emerald-500"
                    iconBgClass="bg-emerald-100 dark:bg-emerald-900/20"
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

                <div className="h-px bg-slate-100 dark:bg-dark-surface mx-16" />
                <MenuItem
                    icon={ArrowDownTrayIcon}
                    title="Exportar Excel"
                    subtitle="Baixar todas as transações (XLSX)"
                    colorClass="text-emerald-500"
                    iconBgClass="bg-emerald-100 dark:bg-emerald-900/20"
                    onClick={() => handleProAction(() => exportTransactionsToExcel(allTransactions))}
                    isPro={true}
                />
                <div className="h-px bg-slate-100 dark:bg-dark-surface mx-16" />
                <MenuItem
                    icon={ClipboardListIcon}
                    title="Exportar CSV"
                    subtitle="Formato compatível com planilhas"
                    colorClass="text-cyan-500"
                    iconBgClass="bg-cyan-100 dark:bg-cyan-900/20"
                    onClick={() => handleProAction(() => exportTransactionsToCSV(allTransactions))}
                    isPro={true}
                />
            </div>

            {/* Seção: Gerenciamento */}
            <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 ml-4">Gerenciamento</h3>
            <div className="bg-white dark:bg-dark-surface rounded-3xl overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm mb-6">
                <MenuItem
                    icon={TrashIcon}
                    title="Limpar Dados"
                    subtitle="Resetar informações do app"
                    colorClass="text-red-500"
                    iconBgClass="bg-red-100 dark:bg-red-900/20"
                    onClick={() => setIsResetModalOpen(true)}
                />
            </div>

            {/* Seção: Zona de Perigo */}
            <h3 className="text-[10px] font-black text-red-400 dark:text-red-500 uppercase tracking-widest mb-3 ml-4">Zona de Perigo</h3>
            <div className="bg-white dark:bg-dark-surface rounded-3xl overflow-hidden border border-red-100 dark:border-red-900/30 shadow-sm mb-6">
                <MenuItem
                    icon={TrashIcon}
                    title="Excluir Minha Conta"
                    subtitle="Apagar conta e dados permanentemente"
                    colorClass="text-red-600"
                    iconBgClass="bg-red-100 dark:bg-red-900/20"
                    onClick={() => setIsDeleteAccountModalOpen(true)}
                />
            </div>

            {isImporting && (
                <div className="flex flex-col items-center justify-center p-8 bg-white dark:bg-dark-surface rounded-2xl border border-slate-100 dark:border-slate-800/50">
                    <LoaderIcon className="h-8 w-8 text-dark-accent animate-spin mb-4" />
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Analisando extrato com IA...</p>
                </div>
            )}
        </div>
    );
};

export default DataSettings;
