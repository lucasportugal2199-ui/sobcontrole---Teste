
import React, { useContext } from 'react';
import { AppContext } from '../context/AppContext';
import {
    ArrowLeftIcon, SparklesIcon, LockIcon,
    BellIcon, ZapIcon, CheckCircleIcon
} from './icons';

const NotificationAutomation: React.FC = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error("NotificationAutomation missing AppContext");

    const { setCurrentView, userProfile } = context;
    const isPremium = userProfile.isPremium;

    if (!isPremium) {
        return (
            <div className="bg-slate-50 dark:bg-dark-bg h-full flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
                <button onClick={() => setCurrentView('main')} className="absolute top-4 left-4 p-2 rounded-full hover:bg-slate-200 dark:hover:bg-dark-surface transition">
                    <ArrowLeftIcon className="h-6 w-6 text-slate-700 dark:text-white" />
                </button>
                <div className="bg-amber-100 dark:bg-amber-900/30 p-8 rounded-[40px] mb-8 shadow-inner shadow-amber-200/50 dark:shadow-none animate-pulse">
                    <LockIcon className="h-16 w-16 text-amber-600 dark:text-amber-400" />
                </div>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-3 uppercase tracking-tighter">Automação Inteligente</h1>
                <p className="text-slate-600 dark:text-slate-300 mb-8 max-w-xs mx-auto font-semibold leading-relaxed">
                    Deixe que o SobControle leia suas notificações de banco e sugira lançamentos automaticamente. Fricção zero.
                </p>
                <button
                    onClick={() => setCurrentView('premium')}
                    className="w-full max-w-xs bg-amber-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-amber-600/30 active:scale-95 transition-all"
                >
                    Assinar Agora
                </button>
            </div>
        );
    }

    return (
        <div className="bg-slate-50 dark:bg-dark-bg h-full flex flex-col overflow-hidden text-slate-900 dark:text-white">
            <header className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-dark-bg/80 backdrop-blur-md sticky top-0 z-20 flex items-center gap-4 pt-[calc(1rem+env(safe-area-inset-top))]">
                <button onClick={() => setCurrentView('main')} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-dark-surface transition">
                    <ArrowLeftIcon className="h-6 w-6 " />
                </button>
                <div>
                    <h1 className="text-lg font-black tracking-tighter uppercase">Automação</h1>
                    <span className="text-[10px] text-amber-500 font-black uppercase tracking-widest">Ativado com IA</span>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-4 space-y-8 no-scrollbar pb-24">
                <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-8 rounded-[40px] text-white shadow-xl shadow-amber-500/20 relative overflow-hidden">
                    <ZapIcon className="absolute -right-8 -bottom-8 h-48 w-48 opacity-20 rotate-12" />
                    <h2 className="text-2xl font-black leading-none mb-3">Sua vida no<br />automático.</h2>
                    <p className="text-sm font-bold opacity-90 max-w-[200px]">Identificamos gastos via notificações de bancos brasileiros.</p>
                </div>

                <section className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-2">Como Funciona</h3>
                    <div className="space-y-3">
                        {[
                            { title: 'Passo 1', desc: 'Você ativa a permissão de leitura de notificações.', icon: <BellIcon /> },
                            { title: 'Passo 2', desc: 'Ao fazer um PIX ou usar o cartão, recebemos o alerta.', icon: <SparklesIcon /> },
                            { title: 'Passo 3', desc: 'Sugerimos o lançamento. Você só precisa confirmar.', icon: <CheckCircleIcon /> }
                        ].map((step, i) => (
                            <div key={i} className="bg-white dark:bg-dark-surface p-5 rounded-3xl border border-slate-100 dark:border-slate-800 flex gap-4 items-center">
                                <div className="h-12 w-12 bg-slate-50 dark:bg-dark-bg rounded-2xl flex items-center justify-center text-amber-500">
                                    {React.cloneElement(step.icon as React.ReactElement<any>, { className: 'h-6 w-6' })}
                                </div>
                                <div className="flex-1">
                                    <p className="text-[10px] font-black uppercase text-amber-600 tracking-widest">{step.title}</p>
                                    <p className="text-sm font-bold leading-snug">{step.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/40 rounded-3xl">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Pronto para uso</span>
                    </div>
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 leading-relaxed">
                        No Android, acesse as configurações do sistema para garantir que o SobControle tenha acesso às notificações.
                    </p>
                </div>
            </main>
        </div>
    );
};

export default NotificationAutomation;