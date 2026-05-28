import React, { useState, useEffect } from 'react';
import { SparklesIcon, BankIcon, CreditCardIcon, ViewGridIcon, TrophyIcon, ArrowRightIcon, CloseIcon } from './icons';

interface OnboardingTutorialProps {
    isOpen: boolean;
    onClose: () => void;
}

const slides = [
    {
        title: "Bem-vindo ao Sob Controle!",
        text: "O seu novo painel financeiro inteligente. Vamos te mostrar rapidamente onde encontrar tudo o que você precisa.",
        icon: SparklesIcon,
        color: "text-amber-500",
        bg: "bg-amber-100 dark:bg-amber-900/40"
    },
    {
        title: "Suas Contas Bancárias",
        text: "Para adicionar ou gerenciar os saldos das suas contas, basta acessar as Configurações pelo menu inferior e ir em 'Contas'.",
        icon: BankIcon,
        color: "text-blue-500 dark:text-blue-400",
        bg: "bg-blue-100 dark:bg-blue-900/40"
    },
    {
        title: "Cartões de Crédito",
        text: "As faturas do mês e limites dos seus cartões ficam todos agrupados. Cadastre os seus cartões na opção 'Cartões' das configurações.",
        icon: CreditCardIcon,
        color: "text-purple-500 dark:text-purple-400",
        bg: "bg-purple-100 dark:bg-purple-900/40"
    },
    {
        title: "Seu Painel, Suas Regras",
        text: "Você pode personalizar esta tela inicial! Role até o final do painel e clique em 'Editar Layout' para esconder ou reordenar qualquer card.",
        icon: ViewGridIcon,
        color: "text-teal-500 dark:text-teal-400",
        bg: "bg-teal-100 dark:bg-teal-900/40"
    },
    {
        title: "Desbloqueie Conquistas!",
        text: "Ao registrar seus gastos diários e bater metas de economia, você ganha medalhas! Acompanhe o seu progresso na aba 'Conquistas'.",
        icon: TrophyIcon,
        color: "text-yellow-500 dark:text-yellow-400",
        bg: "bg-yellow-100 dark:bg-yellow-900/40"
    }
];

export default function OnboardingTutorial({ isOpen, onClose }: OnboardingTutorialProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setMounted(true);
            setCurrentStep(0);
        } else {
            setTimeout(() => setMounted(false), 300);
        }
    }, [isOpen]);

    if (!mounted && !isOpen) return null;

    const handleNext = () => {
        if (currentStep < slides.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            handleClose();
        }
    };

    const handleClose = () => {
        localStorage.setItem('tutorial_completed', 'true');
        onClose();
    };

    const slide = slides[currentStep];
    const Icon = slide.icon;

    return (
        <div className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-all duration-300 ${isOpen ? 'bg-slate-900/60 backdrop-blur-sm opacity-100' : 'bg-transparent opacity-0 pointer-events-none'}`}>
            <div className={`bg-white dark:bg-dark-surface w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden transition-all duration-500 transform ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-8'}`}>
                
                {/* Header Actions */}
                <div className="flex justify-between items-center p-4">
                    <div className="flex gap-1.5">
                        {slides.map((_, idx) => (
                            <div 
                                key={idx} 
                                className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentStep ? 'w-6 bg-indigo-600 dark:bg-indigo-400' : 'w-2 bg-slate-200 dark:bg-slate-700'}`}
                            />
                        ))}
                    </div>
                    <button 
                        onClick={handleClose}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
                    >
                        <CloseIcon className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="px-8 py-6 flex flex-col items-center text-center">
                    <div className={`p-6 rounded-3xl ${slide.bg} mb-6 transition-colors duration-500`}>
                        <Icon className={`h-16 w-16 ${slide.color} animate-bounce-slow`} />
                    </div>
                    
                    <h2 className="text-xl font-black text-slate-900 dark:text-white mb-3">
                        {slide.title}
                    </h2>
                    
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed min-h-[60px]">
                        {slide.text}
                    </p>
                </div>

                {/* Footer */}
                <div className="p-6 pt-2">
                    <button 
                        onClick={handleNext}
                        className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-black uppercase tracking-widest text-sm shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
                    >
                        {currentStep === slides.length - 1 ? 'Começar a usar!' : 'Próximo'}
                        {currentStep !== slides.length - 1 && <ArrowRightIcon className="h-4 w-4" />}
                    </button>
                    
                    {currentStep !== slides.length - 1 && (
                        <button 
                            onClick={handleClose}
                            className="w-full mt-3 py-2 text-xs font-bold text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 uppercase tracking-wider transition-colors"
                        >
                            Pular Tutorial
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
