import React from 'react';
import { ShieldCheckIcon, ClipboardListIcon } from '../icons';

interface PrivacySettingsProps {
    handleOpenLink: (url: string) => void;
}

const PrivacySettings: React.FC<PrivacySettingsProps> = ({ handleOpenLink }) => {
    return (
        <div>
            <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest mb-3 ml-4">Documentos Legais</h3>
            <div className="bg-white dark:bg-dark-surface rounded-3xl overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm">
                <button
                    onClick={() => handleOpenLink('https://sites.google.com/view/sobcontrole-politicas/in%C3%ADcio')}
                    className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-dark-surface/50 transition-colors group"
                >
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 bg-blue-100 dark:bg-blue-900/20 text-blue-500">
                            <ShieldCheckIcon className="h-5 w-5" />
                        </div>
                        <div className="text-left">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-dark-accent transition-colors">Política de Privacidade</h4>
                            <p className="text-[10px] text-slate-500 font-medium leading-tight">Como tratamos seus dados</p>
                        </div>
                    </div>
                </button>

                <div className="h-px bg-slate-100 dark:bg-dark-surface mx-16" />

                <button
                    onClick={() => handleOpenLink('https://sites.google.com/view/sobcontrole-termos-de-uso/in%C3%ADcio')}
                    className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-dark-surface/50 transition-colors group"
                >
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 bg-indigo-100 dark:bg-indigo-900/20 text-indigo-500">
                            <ClipboardListIcon className="h-5 w-5" />
                        </div>
                        <div className="text-left">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-dark-accent transition-colors">Termos de Uso</h4>
                            <p className="text-[10px] text-slate-500 font-medium leading-tight">Regras de utilização do app</p>
                        </div>
                    </div>
                </button>
            </div>
        </div>
    );
};

export default PrivacySettings;
