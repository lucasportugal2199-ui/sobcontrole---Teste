import React, { useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { InformationCircleIcon } from './icons';
import { useTranslation } from '../i18n';

interface ContextualTipProps {
    id: string;
    title: string;
    description: string;
    className?: string;
    actionLabel?: string;
    onAction?: () => void;
}

const ContextualTip: React.FC<ContextualTipProps> = ({ id, title, description, className = '', actionLabel, onAction }) => {
    const context = useContext(AppContext);
    if (!context) return null;

    const { userProfile, dismissTip } = context;
    const { t } = useTranslation();

    // Se a dica já foi descartada, não renderiza
    if (userProfile?.dismissedTips?.includes(id)) {
        return null;
    }

    return (
        <div className={`bg-gradient-to-r from-teal-500/10 to-blue-500/10 dark:from-teal-500/5 dark:to-blue-500/5 border border-teal-500/20 dark:border-teal-500/10 p-3 rounded-2xl flex items-start gap-2.5 relative overflow-hidden h-fit min-h-fit max-w-full flex-shrink-0 animate-in fade-in slide-in-from-top-2 duration-300 box-border ${className}`}>
            
            <div className="p-1 bg-teal-500/20 text-teal-600 dark:text-teal-400 rounded-lg flex-shrink-0">
                <InformationCircleIcon className="h-3.5 w-3.5" />
            </div>
            
            <div className="flex-grow min-w-0 space-y-1">
                <h4 className="text-[13px] font-semibold text-light-text dark:text-dark-text leading-tight">{title}</h4>
                <p className="text-[12px] font-normal text-light-text-muted dark:text-dark-text-muted leading-relaxed">{description}</p>
                <div className="flex items-center gap-4 pt-1">
                    {actionLabel && onAction && (
                        <button
                            onClick={onAction}
                            className="text-[11px] font-medium uppercase tracking-[0.5px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 active:scale-95 transition-all"
                        >
                            {actionLabel}
                        </button>
                    )}
                    <button
                        onClick={() => dismissTip(id)}
                        className="text-[11px] font-medium uppercase tracking-[0.5px] text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1 active:scale-95 transition-all"
                    >
                        {t('common.understoodDismiss') || 'Entendi, dispensar'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export { ContextualTip };
export default ContextualTip;
