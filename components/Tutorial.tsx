
import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { SparklesIcon, ChevronRightIcon, XCircleIcon } from './icons';

interface TutorialStep {
    targetId: string;
    title: string;
    description: string;
    tab?: 'metas' | 'transacoes' | 'lancamento' | 'financas' | 'categorias';
    view?: 'main' | 'horizonte' | 'chat' | 'menu';
    position?: 'top' | 'bottom' | 'center';
}

const Tutorial: React.FC = () => {
    const { userProfile, updateUserProfile, currentTab, setCurrentTab, currentView, setCurrentView } = useContext(AppContext)!;
    const [isVisible, setIsVisible] = useState(false);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

    useEffect(() => {
        // Só mostra se o usuário ainda não viu
        if (!userProfile.hasSeenTutorial) {
            setIsVisible(true);
        }
    }, [userProfile.hasSeenTutorial]);

    const steps: TutorialStep[] = [
        {
            targetId: 'tour-home',
            title: "Crie Transações",
            description: "Para criar uma nova transação (receita ou despesa), basta dar um CLIQUE DUPLO neste ícone no centro!",
            tab: 'lancamento',
            position: 'top'
        },
        {
            targetId: 'tour-horizonte-btn',
            title: "Futuro Mensal",
            description: "Clique no ícone de documento (fatura) para ver a Futuro Mensal. Lá você projeta seu saldo para os próximos meses!",
            tab: 'lancamento',
            position: 'bottom'
        },
        {
            targetId: 'tour-metas',
            title: "Planeje seus Sonhos",
            description: "Aqui em Metas você pode criar cofrinhos para seus objetivos e acompanhar quanto falta para realizá-los.",
            tab: 'lancamento',
            position: 'top'
        },
        {
            targetId: 'tour-home',
            title: "Tudo Pronto!",
            description: "Agora você já conhece o básico para dominar suas finanças. Explore à vontade!",
            tab: 'lancamento',
            position: 'top'
        }
    ];

    const currentStep = steps[currentStepIndex];

    useEffect(() => {
        if (!isVisible) return;

        // Garante que estamos na aba correta (mesmo que temporariamente) para o tutorial mostrar os itens
        if (currentStep.tab && currentTab !== currentStep.tab) {
            setCurrentTab(currentStep.tab);
        }

        let attempts = 0;
        const maxAttempts = 15;

        const tryFindElement = () => {
            const element = document.getElementById(currentStep.targetId);
            if (element) {
                const rect = element.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                    setTargetRect(rect);
                    return true;
                }
            }
            return false;
        };

        setTargetRect(null);

        const interval = setInterval(() => {
            attempts++;
            if (tryFindElement() || attempts >= maxAttempts) {
                clearInterval(interval);
                if (attempts >= maxAttempts && !targetRect) {
                    const fallbackRect = {
                        top: window.innerHeight / 2,
                        left: window.innerWidth / 2,
                        width: 0,
                        height: 0,
                        bottom: window.innerHeight / 2,
                        right: window.innerWidth / 2,
                        x: window.innerWidth / 2,
                        y: window.innerHeight / 2,
                        toJSON: () => { }
                    } as DOMRect;
                    setTargetRect(fallbackRect);
                }
            }
        }, 300);

        return () => clearInterval(interval);
    }, [currentStepIndex, isVisible]);

    const handleNext = () => {
        if (currentStepIndex < steps.length - 1) {
            setCurrentStepIndex(prev => prev + 1);
        } else {
            handleComplete();
        }
    };

    const handleComplete = () => {
        setIsVisible(false);
        updateUserProfile({ hasSeenTutorial: true });
    };

    if (!isVisible) return null;

    if (!targetRect) return null;

    const isFallback = targetRect.width === 0;

    const balloonStyle: React.CSSProperties = {
        position: 'fixed',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 32px)',
        maxWidth: '320px',
        zIndex: 1001,
        transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
    };

    if (isFallback) {
        balloonStyle.top = '50%';
        balloonStyle.transform = 'translate(-50%, -50%)';
    } else if (currentStep.position === 'top') {
        balloonStyle.bottom = (window.innerHeight - targetRect.top) + 24;
    } else {
        balloonStyle.top = targetRect.bottom + 24;
    }

    return (
        <div className="fixed inset-0 z-[1000] overflow-hidden pointer-events-none">
            {!isFallback && (
                <>
                    <div className="absolute top-0 left-0 w-full bg-black/75 backdrop-blur-[2px] pointer-events-auto" style={{ height: `${Math.max(0, targetRect.top - 8)}px` }} />
                    <div className="absolute bottom-0 left-0 w-full bg-black/75 backdrop-blur-[2px] pointer-events-auto" style={{ top: `${targetRect.bottom + 8}px` }} />
                    <div className="absolute left-0 bg-black/75 backdrop-blur-[2px] pointer-events-auto" style={{ top: `${Math.max(0, targetRect.top - 8)}px`, height: `${targetRect.height + 16}px`, width: `${Math.max(0, targetRect.left - 8)}px` }} />
                    <div className="absolute right-0 bg-black/75 backdrop-blur-[2px] pointer-events-auto" style={{ top: `${Math.max(0, targetRect.top - 8)}px`, height: `${targetRect.height + 16}px`, left: `${targetRect.right + 8}px` }} />
                </>
            )}

            {isFallback && <div className="absolute inset-0 bg-black/75 backdrop-blur-[2px] pointer-events-auto" />}

            <div style={balloonStyle} className="pointer-events-auto">
                <div className="bg-white dark:bg-dark-surface p-6 rounded-[32px] shadow-2xl border border-white/20 animate-in fade-in zoom-in-95 duration-500">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2.5 bg-teal-100 dark:bg-teal-900/40 rounded-2xl shadow-inner">
                            <SparklesIcon className="h-5 w-5 text-light-accent dark:text-dark-accent" />
                        </div>
                    </div>

                    <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2 leading-tight uppercase tracking-tighter">
                        {currentStep.title}
                    </h3>
                    <p className="text-[13px] text-slate-600 dark:text-slate-300 mb-6 leading-relaxed font-semibold">
                        {currentStep.description}
                    </p>

                    <div className="flex items-center justify-between">
                        <div className="flex gap-1.5">
                            {steps.map((_, i) => (
                                <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i === currentStepIndex ? 'w-8 bg-light-accent' : 'w-1.5 bg-slate-200 dark:bg-slate-700'}`} />
                            ))}
                        </div>

                        <button
                            onClick={handleNext}
                            className="flex items-center gap-2 bg-light-accent hover:bg-dark-accent text-white pl-6 pr-4 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-light-accent/30 active:scale-95 transition-all"
                        >
                            {currentStepIndex === steps.length - 1 ? 'Começar' : 'Entendi'}
                            <ChevronRightIcon className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Tutorial;
