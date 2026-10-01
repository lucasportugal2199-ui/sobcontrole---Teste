
import React, { useContext } from 'react';
import { AppContext } from '../context/AppContext';
import {
    ArrowLeftIcon, SparklesIcon, LockIcon,
    BellIcon, ZapIcon, CheckCircleIcon, CrownIcon
} from './icons';
import { useTranslation } from '../i18n';
import { BankNotificationService } from '../services/bankNotificationService';

const NotificationAutomation: React.FC = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error("NotificationAutomation missing AppContext");

    const { setCurrentView, userProfile } = context;
    const { t } = useTranslation();

    const steps = [
        { title: t('notifAuto.step1Title'), desc: t('notifAuto.step1Desc'), icon: <BellIcon /> },
        { title: t('notifAuto.step2Title'), desc: t('notifAuto.step2Desc'), icon: <SparklesIcon /> },
        { title: t('notifAuto.step3Title'), desc: t('notifAuto.step3Desc'), icon: <CheckCircleIcon /> }
    ];

    const heroTitleParts = t('notifAuto.heroTitle').split('\n');

    return (
        <div className="bg-light-card-elevated dark:bg-dark-bg h-full flex flex-col overflow-hidden text-light-text dark:text-dark-text">
            <header className="p-4 border-b border-light-border dark:border-dark-elevated bg-white/80 dark:bg-dark-bg/80 backdrop-blur-md sticky top-0 z-20 flex items-center gap-4 pt-[calc(1rem+var(--sat))]">
                <button onClick={() => setCurrentView('main')} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-dark-surface transition">
                    <ArrowLeftIcon className="h-6 w-6 " />
                </button>
                <div>
                    <h1 className="text-lg font-black tracking-tighter uppercase">{t('notifAuto.title')}</h1>
                    <span className="text-[10px] text-amber-500 font-black uppercase tracking-widest">{t('notifAuto.aiEnabled')}</span>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-4 space-y-8 no-scrollbar" style={{ paddingBottom: 'calc(4.5rem + var(--sab))' }}>
                <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-8 rounded-[40px] text-white shadow-xl shadow-amber-500/20 relative overflow-hidden">
                    <ZapIcon className="absolute -right-8 -bottom-8 h-48 w-48 opacity-20 rotate-12" />
                    <h2 className="text-2xl font-black leading-none mb-3">{heroTitleParts.map((part, i) => <React.Fragment key={i}>{i > 0 && <br />}{part}</React.Fragment>)}</h2>
                    <p className="text-sm font-bold opacity-90 max-w-[200px]">{t('notifAuto.heroDesc')}</p>
                </div>

                <section className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-2">{t('notifAuto.howItWorks')}</h3>
                    <div className="space-y-3">
                        {steps.map((step, i) => (
                            <div key={i} className="bg-white dark:bg-dark-card p-5 rounded-3xl border border-light-border dark:border-dark-elevated flex gap-4 items-center">
                                <div className="h-12 w-12 bg-light-card-elevated dark:bg-dark-bg rounded-2xl flex items-center justify-center text-amber-500">
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
                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{t('notifAuto.readyToUse')}</span>
                    </div>
                    <p className="text-xs font-semibold text-light-text-secondary dark:text-dark-text-secondary leading-relaxed">
                        {t('notifAuto.androidNote')}
                    </p>
                </div>

                <div className="pt-2">
                    <button
                        onClick={async () => {
                            if (BankNotificationService.isSupported()) {
                                await BankNotificationService.requestPermission();
                            } else {
                                setCurrentView('main');
                            }
                        }}
                        className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:via-orange-600 hover:to-amber-700 text-white py-4 rounded-2xl font-black uppercase tracking-wider shadow-lg shadow-amber-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                        <span>{BankNotificationService.isSupported() ? 'Configurar Permissão no Android' : 'Voltar ao Início'}</span>
                        <ZapIcon className="h-5 w-5" />
                    </button>
                </div>
            </main>
        </div>
    );
};

export default NotificationAutomation;