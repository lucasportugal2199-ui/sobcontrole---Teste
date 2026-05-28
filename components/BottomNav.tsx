
import React, { useContext, useRef, useState, useEffect } from 'react';
import { PlusIcon, ClipboardListIcon, ChartBarIcon, CategoryIcon, TargetIcon } from './icons';
import { AppContext } from '../context/AppContext';

const NavItem: React.FC<{
    label: string;
    icon: React.ElementType;
    isActive: boolean;
    onClick: () => void;
    id?: string;
}> = ({ label, icon: Icon, isActive, onClick, id }) => (
    <button
        id={id}
        onClick={onClick}
        className="flex flex-col items-center justify-center w-full h-full pb-1 pt-2 transition-all duration-200 focus:outline-none active:scale-90 group"
    >
        <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-light-accent/10 dark:bg-dark-accent/10' : 'group-hover:bg-light-bg dark:group-hover:bg-dark-surface/50'}`}>
            <Icon className={`h-5 w-5 mb-0.5 transition-colors ${isActive ? 'text-light-accent dark:text-dark-accent' : 'text-slate-400 dark:text-slate-400'}`} />
        </div>
        <span className={`text-[9px] font-black uppercase tracking-tighter transition-colors mt-0.5 ${isActive ? 'text-light-accent dark:text-dark-accent' : 'text-slate-400 dark:text-slate-400'}`}>{label}</span>
    </button>
);

const BottomNav: React.FC = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error("BottomNav must be used within an AppProvider");

    const { currentTab, setCurrentTab, setIsTransactionMenuOpen, setCurrentDate } = context;

    const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [showHint, setShowHint] = useState(false);
    const [pulseAnimation, setPulseAnimation] = useState(false);

    // Mostra a dica "Toque 2x" apenas nas primeiras interações
    useEffect(() => {
        const hasSeenHint = localStorage.getItem('fab_hint_seen');
        if (!hasSeenHint) {
            setShowHint(true);
        }
    }, []);

    const handleCenterClick = (e: React.MouseEvent) => {
        e.preventDefault();
        if (clickTimeoutRef.current) {
            clearTimeout(clickTimeoutRef.current);
            clickTimeoutRef.current = null;
            setIsTransactionMenuOpen(true);
            // Esconde a dica permanentemente após primeiro uso bem-sucedido
            if (showHint) {
                setShowHint(false);
                localStorage.setItem('fab_hint_seen', 'true');
            }
        } else {
            setCurrentTab('lancamento');
            setCurrentDate(new Date());
            // Feedback visual: pulsa brevemente para indicar que registrou o primeiro toque
            setPulseAnimation(true);
            setTimeout(() => setPulseAnimation(false), 300);
            clickTimeoutRef.current = setTimeout(() => {
                clickTimeoutRef.current = null;
            }, 300);
        }
    };

    return (
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto glass dark:bg-dark-bg/95 backdrop-blur-xl z-[100] shadow-[0_-8px_40px_rgba(0,0,0,0.15)] transition-colors duration-300 pb-[env(safe-area-inset-bottom)] rounded-t-[32px] border-t border-slate-200/50 dark:border-slate-800/50">
            <div className="grid grid-cols-5 items-center h-16 sm:h-20 px-2">
                <NavItem id="tour-metas" label="Metas" icon={TargetIcon} isActive={currentTab === 'metas'} onClick={() => setCurrentTab('metas')} />
                <NavItem label="Movimentar" icon={ClipboardListIcon} isActive={currentTab === 'transacoes'} onClick={() => setCurrentTab('transacoes')} />

                {/* Botão Central Elevado — Ícone + para adicionar transação */}
                <div className="relative flex flex-col justify-center items-center h-full">
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 w-14 h-14">
                        <div className="relative w-full h-full">
                            {/* Dica visual "2x" — desaparece após primeiro duplo toque */}
                            {showHint && (
                                <div className="absolute -top-10 left-[-60px] right-[-60px] flex flex-col items-center z-10 animate-bounce pointer-events-none">
                                    <span className="bg-slate-800 dark:bg-white text-white dark:text-slate-900 text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow-lg whitespace-nowrap">
                                        Toque 2x
                                    </span>
                                    <div className="w-2 h-2 bg-slate-800 dark:bg-white rotate-45 -mt-1"></div>
                                </div>
                            )}
                            <button
                                id="tour-home"
                                onClick={handleCenterClick}
                                className={`relative flex items-center justify-center h-14 w-14 rounded-full bg-light-accent text-white shadow-[0_8px_25px_rgba(20,184,166,0.5)] ring-4 ring-light-bg dark:ring-dark-bg transition-all transform active:scale-90 ${pulseAnimation ? 'scale-110' : ''}`}
                                aria-label="Novo lançamento"
                            >
                                <PlusIcon className="h-7 w-7" />
                                {/* Anel de pulso sutil para chamar atenção */}
                                {showHint && (
                                    <span className="absolute inset-0 rounded-full animate-ping bg-light-accent/30 pointer-events-none" style={{ animationDuration: '2s' }}></span>
                                )}
                            </button>
                        </div>
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-400 mt-10">Novo</span>
                </div>

                <NavItem label="Finanças" icon={ChartBarIcon} isActive={currentTab === 'financas'} onClick={() => setCurrentTab('financas')} />
                <NavItem label="Categorias" icon={CategoryIcon} isActive={currentTab === 'categorias'} onClick={() => setCurrentTab('categorias')} />
            </div>
        </div>
    );
};

export default BottomNav;

