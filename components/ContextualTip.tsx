import React, { useContext, useEffect, useSyncExternalStore } from 'react';
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

// Só uma dica aparece por vez: as dicas visíveis se registram aqui, na ordem em
// que aparecem, e apenas a primeira da fila é mostrada. Ao dispensar, a próxima surge.
let tipQueue: string[] = [];
const listeners = new Set<() => void>();
const tipStore = {
    subscribe(listener: () => void) {
        listeners.add(listener);
        return () => { listeners.delete(listener); };
    },
    getSnapshot: () => tipQueue,
    add(id: string) {
        if (!tipQueue.includes(id)) { tipQueue = [...tipQueue, id]; listeners.forEach(l => l()); }
    },
    remove(id: string) {
        if (tipQueue.includes(id)) { tipQueue = tipQueue.filter(x => x !== id); listeners.forEach(l => l()); }
    },
};

const ContextualTip: React.FC<ContextualTipProps> = ({ id, title, description, className = '', actionLabel, onAction }) => {
    const context = useContext(AppContext);
    const { t } = useTranslation();
    const isDismissed = !!context?.userProfile?.dismissedTips?.includes(id);
    const queue = useSyncExternalStore(tipStore.subscribe, tipStore.getSnapshot);

    useEffect(() => {
        if (isDismissed) return;
        tipStore.add(id);
        return () => tipStore.remove(id);
    }, [id, isDismissed]);

    if (!context || isDismissed) return null;
    // Outra dica está na frente: espera a vez
    if (queue[0] !== id) return null;

    const { dismissTip } = context;

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
