import React, { useContext, useState, useEffect } from 'react';
import { AppContext, MenuSubView } from '../../context/AppContext';
import { useTranslation } from '../../i18n';
import { Capacitor } from '@capacitor/core';
import { useAppVersion } from '../../utils/useAppVersion';
import { isBiometricAvailable, verifyBiometric, getBiometricPreference, setBiometricPreference } from '../../utils/biometric';
import { ChevronRightIcon, CrownIcon, TargetIcon, ChartBarIcon, CalculatorIcon } from '../icons';
import Modal from '../Modal';

interface SettingsMainMenuProps {
    setMenuSubView: (view: MenuSubView) => void;
    setCurrentView: (view: any) => void;
    handleLogout: () => void;
}

// Crisp Vector Icons for Menu matching exact Figma/HTML designs
const CardIcon: React.FC<{ className?: string }> = ({ className = "h-5 w-5" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect width="20" height="14" x="2" y="5" rx="2" />
        <line x1="2" x2="22" y1="10" y2="10" />
    </svg>
);

const TagIcon: React.FC<{ className?: string }> = ({ className = "h-5 w-5" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z" />
        <path d="M7 7h.01" />
    </svg>
);

const TrendingUpIcon: React.FC<{ className?: string }> = ({ className = "h-5 w-5" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
        <polyline points="17 6 23 6 23 12" />
    </svg>
);

const RecurrenceIcon: React.FC<{ className?: string }> = ({ className = "h-5 w-5" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
        <path d="M21 3v5h-5" />
        <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
        <path d="M8 16H3v5" />
    </svg>
);

const GlobeIcon: React.FC<{ className?: string }> = ({ className = "h-5 w-5" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="10" />
        <line x1="2" x2="22" y1="12" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
);

const CloudIcon: React.FC<{ className?: string }> = ({ className = "h-5 w-5" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
    </svg>
);

const BellIconSolid: React.FC<{ className?: string }> = ({ className = "h-5 w-5" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
);

const PaletteIcon: React.FC<{ className?: string }> = ({ className = "h-5 w-5" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
        <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
        <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
        <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.563-2.512 5.563-5.563C22 6.5 17.5 2 12 2Z" />
    </svg>
);

const LockIconSolid: React.FC<{ className?: string }> = ({ className = "h-5 w-5" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
);

const ShieldCheckIcon: React.FC<{ className?: string }> = ({ className = "h-5 w-5" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="m9 12 2 2 4-4" />
    </svg>
);

const HelpCircleIcon: React.FC<{ className?: string }> = ({ className = "h-5 w-5" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <line x1="12" x2="12.01" y1="17" y2="17" />
    </svg>
);

const SparklesIcon: React.FC<{ className?: string }> = ({ className = "h-5 w-5" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
    </svg>
);

const LogoutIcon: React.FC<{ className?: string }> = ({ className = "h-4 w-4" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" x2="9" y1="12" y2="12" />
    </svg>
);

const getInitials = (name?: string) => {
    if (!name) return 'LP';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const SettingsMainMenu: React.FC<SettingsMainMenuProps> = ({
    setMenuSubView, setCurrentView, handleLogout
}) => {
    const context = useContext(AppContext);
    if (!context) throw new Error("SettingsMainMenu missing AppContext");
    
    const { userProfile, showToast, updateUserProfile, setCurrentTab } = context;
    const { t } = useTranslation();
    const appVersion = useAppVersion();

    const [biometricAvailable, setBiometricAvailable] = useState(false);
    const [biometricEnabled, setBiometricEnabled] = useState(false);
    const [biometricLoading, setBiometricLoading] = useState(true);

    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
    const [feedbackType, setFeedbackType] = useState<'suggestion' | 'bug' | 'praise'>('suggestion');
    const [feedbackText, setFeedbackText] = useState('');

    const handleSendFeedback = async () => {
        if (!feedbackText.trim()) {
            showToast(t('feedback.emptyFields') || 'Por favor, preencha todos os campos.', 'error');
            return;
        }

        const subject = encodeURIComponent(`SobControle - Feedback: [${feedbackType.toUpperCase()}]`);
        
        const deviceDetails = `
--- Informações do Dispositivo ---
Plataforma: ${Capacitor.getPlatform()}
Versão do App: SobControle ${appVersion || 'desconhecida'}
User Agent: ${navigator.userAgent}
Usuário: ${userProfile.name} (${userProfile.email})
---------------------------------
`;

        const bodyText = `Tipo: ${feedbackType.toUpperCase()}\n\nDescrição:\n${feedbackText}\n\n${deviceDetails}`;
        const body = encodeURIComponent(bodyText);
        
        const mailtoUrl = `mailto:suporte@sobcontrole.app?subject=${subject}&body=${body}`;

        try {
            window.open(mailtoUrl, '_system');
            showToast(t('feedback.success') || 'Feedback enviado com sucesso!', 'success');
            setFeedbackText('');
            setIsFeedbackOpen(false);
        } catch {
            showToast(t('feedback.error') || 'Erro ao enviar feedback.', 'error');
        }
    };

    useEffect(() => {
        (async () => {
            try {
                const available = await isBiometricAvailable();
                setBiometricAvailable(available);
                const pref = await getBiometricPreference();
                setBiometricEnabled(pref);
            } catch {
                setBiometricAvailable(false);
            } finally {
                setBiometricLoading(false);
            }
        })();
    }, []);

    const handleToggleBiometric = async () => {
        setBiometricLoading(true);
        try {
            if (!biometricEnabled) {
                const success = await verifyBiometric();
                if (success) {
                    await setBiometricPreference(true);
                    setBiometricEnabled(true);
                    showToast(t('settings.biometricEnabled') || 'Biometria ativada com sucesso!', 'success');
                } else {
                    showToast(t('settings.biometricAuthFailed') || 'Falha ao autenticar biometria. Verifique se o seu dispositivo tem senha/digital configurada.', 'error');
                }
            } else {
                const success = await verifyBiometric();
                if (success) {
                    await setBiometricPreference(false);
                    setBiometricEnabled(false);
                    showToast(t('settings.biometricDisabled') || 'Biometria desativada com sucesso.', 'info');
                } else {
                    showToast(t('settings.biometricCancelled') || 'Ação cancelada ou falha na autenticação.', 'error');
                }
            }
        } catch { 
            showToast(t('settings.biometricError') || 'Ocorreu um erro ao processar a biometria.', 'error');
        }
        setBiometricLoading(false);
    };

    const handleRestartTutorial = () => {
        updateUserProfile({
            hasSeenTutorial: false,
            dismissedTips: []
        });
        showToast(t('settings.interactiveGuideRestarted') || 'Guia interativo reiniciado!', 'success');
        setCurrentView('main');
    };

    const renderRow = ({
        icon: Icon,
        iconColor,
        title,
        onClick,
        rightElement,
    }: {
        icon: React.ElementType;
        iconColor: string;
        title: string;
        onClick?: () => void;
        rightElement?: React.ReactNode;
    }) => (
        <div
            onClick={onClick}
            className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-white/[0.04] active:scale-[0.99] transition-all cursor-pointer text-left group"
        >
            <div className="flex items-center gap-3.5 min-w-0">
                <span className={`shrink-0 w-8 h-8 rounded-xl bg-slate-100 dark:bg-white/[0.05] flex items-center justify-center ${iconColor}`}>
                    <Icon className="h-4 w-4" />
                </span>
                <span className="text-sm font-semibold text-slate-800 dark:text-neutral-200 group-hover:text-blue-600 dark:group-hover:text-white transition-colors truncate">
                    {title}
                </span>
            </div>
            {rightElement ? (
                rightElement
            ) : (
                <ChevronRightIcon className="h-4 w-4 text-slate-400 dark:text-neutral-600 group-hover:text-slate-600 dark:group-hover:text-neutral-300 group-hover:translate-x-0.5 transition-all ml-2 shrink-0" />
            )}
        </div>
    );

    const currentStreak = userProfile.currentStreak || 0;

    return (
        <div className="space-y-4 pb-8 max-w-lg mx-auto">
            {/* Profile Card */}
            <div 
                onClick={() => setMenuSubView('editProfile')}
                className="bg-white dark:bg-[#111111] border border-slate-200/80 dark:border-white/[0.06] rounded-2xl p-4 flex items-center gap-3.5 shadow-sm cursor-pointer hover:border-slate-300 dark:hover:border-white/[0.12] transition-all active:scale-[0.99] group"
            >
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-slate-900 text-sm shrink-0 border border-amber-500/20 bg-gradient-to-br from-amber-400 to-amber-500 shadow-sm overflow-hidden relative">
                    {userProfile.avatar ? (
                        <img src={userProfile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                        <span>{getInitials(userProfile.name)}</span>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                        <h3 className="text-base font-semibold text-slate-900 dark:text-white leading-tight truncate group-hover:text-blue-600 dark:group-hover:text-white transition-colors">
                            {userProfile.name || 'Lucas Portugal'}
                        </h3>
                        <ChevronRightIcon className="h-4 w-4 text-slate-400 dark:text-neutral-600 group-hover:text-slate-600 dark:group-hover:text-neutral-300 group-hover:translate-x-0.5 transition-all ml-2 shrink-0" />
                    </div>
                    <p className="text-xs text-slate-500 dark:text-neutral-400 truncate mt-0.5 font-normal">
                        {userProfile.email || 'lucas@exemplo.com'}
                    </p>
                    {userProfile.isPremium && (
                        <span className="inline-flex items-center gap-1 mt-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            👑 {t('menu.proMember')}
                        </span>
                    )}
                </div>
            </div>

            {/* Plano */}
            {userProfile.isPremium ? (
                <div className="bg-white dark:bg-[#111111] border border-amber-500/25 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-sm">
                    <div className="flex items-center gap-3 min-w-0">
                        <span className="shrink-0 w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                            <CrownIcon className="h-5 w-5 text-amber-500" />
                        </span>
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">{t('menu.planProActive')}</p>
                            <p className="text-xs text-slate-500 dark:text-neutral-400 truncate">{t('menu.planProDesc')}</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => window.open('https://play.google.com/store/account/subscriptions?sku=sobcontrole_premium&package=com.sobcontrole.app', '_system')}
                        className="shrink-0 text-xs font-semibold text-amber-600 dark:text-amber-400 px-3 py-2 rounded-xl bg-amber-500/10 active:scale-95 transition-transform"
                    >
                        {t('menu.manageSubscription')}
                    </button>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => setCurrentView('premium')}
                    className="w-full text-left rounded-2xl p-4 bg-gradient-to-br from-brand-accent to-brand-accent-hover text-white shadow-lg shadow-brand-accent/20 active:scale-[0.99] transition-transform"
                >
                    <div className="flex items-center gap-3">
                        <span className="shrink-0 w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                            <CrownIcon className="h-5 w-5 text-white" />
                        </span>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold">{t('menu.planFreeTitle')}</p>
                            <p className="text-xs text-white/85 leading-snug">{t('menu.planFreeDesc')}</p>
                        </div>
                        <ChevronRightIcon className="h-5 w-5 text-white/90 shrink-0" />
                    </div>
                </button>
            )}

            {/* Atalhos */}
            <div className="grid grid-cols-4 gap-2">
                {[
                    { label: t('menu.shortcut.goals'), icon: TargetIcon, color: 'text-emerald-500', onClick: () => { setCurrentView('main'); setCurrentTab('metas'); } },
                    { label: t('menu.shortcut.assistant'), icon: SparklesIcon, color: 'text-brand-accent', onClick: () => setCurrentView('chat') },
                    { label: t('menu.shortcut.annualReport'), icon: ChartBarIcon, color: 'text-sky-500', onClick: () => setCurrentView('anual') },
                    { label: t('menu.shortcut.calculator'), icon: CalculatorIcon, color: 'text-violet-500', onClick: () => setCurrentView('calculadora') },
                ].map(item => (
                    <button
                        key={item.label}
                        type="button"
                        onClick={item.onClick}
                        className="flex flex-col items-center gap-1.5 py-3 px-1 rounded-2xl bg-white dark:bg-[#111111] border border-slate-200/80 dark:border-white/[0.06] shadow-sm active:scale-95 transition-transform"
                    >
                        <span className={`w-9 h-9 rounded-xl bg-slate-100 dark:bg-white/[0.05] flex items-center justify-center ${item.color}`}>
                            <item.icon className="h-5 w-5" />
                        </span>
                        <span className="text-[11px] font-semibold text-slate-700 dark:text-neutral-300 text-center leading-tight">{item.label}</span>
                    </button>
                ))}
            </div>

            {/* Sequência e conquistas */}
            <div
                onClick={() => setMenuSubView('achievements')}
                className="bg-white dark:bg-[#111111] border border-slate-200/80 dark:border-white/[0.06] rounded-2xl p-3.5 flex items-center justify-between cursor-pointer hover:border-amber-500/40 dark:hover:border-white/[0.12] active:scale-[0.99] transition-all shadow-sm group"
            >
                <div className="flex items-center gap-3 min-w-0">
                    <span className="text-base w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 shrink-0">🔥</span>
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 dark:text-neutral-200 truncate">
                            {currentStreak > 0
                                ? t(currentStreak === 1 ? 'menu.streakOne' : 'menu.streakMany', { days: currentStreak })
                                : t('menu.streakNone')}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-neutral-400">{t('menu.badgesCount', { count: (userProfile.badges || []).length })}</p>
                    </div>
                </div>
                <ChevronRightIcon className="h-4 w-4 text-slate-400 dark:text-neutral-600 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </div>

            {/* GESTÃO & FINANÇAS */}
            <div className="space-y-1.5">
                <div className="px-1 text-xs font-semibold text-slate-500 dark:text-neutral-400">
                    Gestão & Finanças
                </div>
                <div className="bg-white dark:bg-[#111111] border border-slate-200/80 dark:border-white/[0.06] rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-white/[0.04] shadow-sm">
                    {renderRow({
                        icon: CardIcon,
                        iconColor: "text-sky-500 dark:text-sky-400",
                        title: "Contas e Cartões",
                        onClick: () => setMenuSubView('cards')
                    })}
                    {renderRow({
                        icon: TagIcon,
                        iconColor: "text-amber-500 dark:text-amber-400",
                        title: "Categorias e Limites",
                        onClick: () => setMenuSubView('categories')
                    })}
                    {renderRow({
                        icon: TrendingUpIcon,
                        iconColor: "text-emerald-500 dark:text-emerald-400",
                        title: "Patrimônio & Investimentos",
                        onClick: () => setCurrentView('investimentos')
                    })}
                    {renderRow({
                        icon: RecurrenceIcon,
                        iconColor: "text-pink-500 dark:text-pink-400",
                        title: "Assinaturas & Parcelas",
                        onClick: () => setMenuSubView('subscriptions')
                    })}
                </div>
            </div>

            {/* SISTEMA & PREFERÊNCIAS */}
            <div className="space-y-1.5">
                <div className="px-1 text-xs font-semibold text-slate-500 dark:text-neutral-400">
                    Sistema & Preferências
                </div>
                <div className="bg-white dark:bg-[#111111] border border-slate-200/80 dark:border-white/[0.06] rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-white/[0.04] shadow-sm">
                    {renderRow({
                        icon: CloudIcon,
                        iconColor: "text-emerald-500 dark:text-emerald-400",
                        title: "Gerenciador de Dados",
                        onClick: () => setMenuSubView('data')
                    })}
                    {renderRow({
                        icon: BellIconSolid,
                        iconColor: "text-amber-500 dark:text-amber-400",
                        title: "Notificações e Lembretes",
                        onClick: () => setMenuSubView('notifications')
                    })}
                    {renderRow({
                        icon: PaletteIcon,
                        iconColor: "text-rose-500 dark:text-rose-400",
                        title: "Tema e Customização",
                        onClick: () => setMenuSubView('layout')
                    })}
                    {renderRow({
                        icon: LockIconSolid,
                        iconColor: "text-indigo-500 dark:text-indigo-400",
                        title: "Bloqueio por Biometria",
                        onClick: handleToggleBiometric,
                        rightElement: (
                            <div className="flex items-center gap-2.5">
                                <span className="text-xs font-normal text-slate-400 dark:text-neutral-500 hidden sm:inline">
                                    {biometricLoading ? '...' : biometricEnabled ? 'Ativo' : 'Desativado'}
                                </span>
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleToggleBiometric(); }}
                                    disabled={biometricLoading || !biometricAvailable}
                                    className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${biometricEnabled ? 'bg-blue-600 dark:bg-blue-500' : 'bg-slate-300 dark:bg-neutral-700'} ${(biometricLoading || !biometricAvailable) ? 'opacity-50' : ''}`}
                                >
                                    <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-200 ${biometricEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                                </button>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* AJUDA & PRIVACIDADE */}
            <div className="space-y-1.5">
                <div className="px-1 text-xs font-semibold text-slate-500 dark:text-neutral-400">
                    {t('feedback.supportSection') || 'Ajuda & Suporte'}
                </div>
                <div className="bg-white dark:bg-[#111111] border border-slate-200/80 dark:border-white/[0.06] rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-white/[0.04] shadow-sm">
                    {renderRow({
                        icon: HelpCircleIcon,
                        iconColor: "text-blue-500 dark:text-blue-400",
                        title: t('feedback.menuTitle') || "Enviar Feedback / Suporte",
                        onClick: () => setIsFeedbackOpen(true)
                    })}
                    {renderRow({
                        icon: SparklesIcon,
                        iconColor: "text-teal-500 dark:text-teal-400",
                        title: t('settings.interactiveGuide') || "Reiniciar Guia Interativo",
                        onClick: handleRestartTutorial
                    })}
                    {renderRow({
                        icon: ShieldCheckIcon,
                        iconColor: "text-slate-400 dark:text-slate-400",
                        title: t('settings.privacyPolicy') || "Termos de Uso & Privacidade",
                        onClick: () => setMenuSubView('privacy')
                    })}
                </div>
            </div>

            {/* Botão Sair da Conta */}
            <button
                onClick={handleLogout}
                className="w-full py-3 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 font-semibold text-xs hover:bg-rose-500/15 active:scale-[0.99] transition-all flex items-center justify-center gap-2 border border-rose-500/20 shadow-sm"
            >
                <LogoutIcon className="h-4 w-4" />
                {t('settings.logout') || 'Sair da Conta'}
            </button>

            <div className="text-center pt-1 pb-2">
                <p className="text-xs font-normal text-slate-400 dark:text-neutral-600">
                    SobControle{appVersion && ` v${appVersion}`}
                </p>
            </div>

            {/* Modal de Feedback */}
            <Modal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)}>
                <div className="space-y-4 p-1 text-light-text dark:text-dark-text">
                    <div>
                        <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                            {t('feedback.modalTitle') || 'Como podemos ajudar?'}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1 leading-relaxed">
                            {t('feedback.deviceInfoLabel') || 'Detalhes do app serão incluídos para ajudar no suporte.'}
                        </p>
                    </div>

                    {/* Seletor de Tipo */}
                    <div>
                        <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1.5 block">
                            {t('feedback.typeLabel') || 'Tipo de Feedback'}
                        </label>
                        <div className="flex gap-2">
                            {(['suggestion', 'bug', 'praise'] as const).map(type => (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => setFeedbackType(type)}
                                    className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all border ${
                                        feedbackType === type
                                            ? 'bg-blue-600 border-blue-500 text-white shadow-sm'
                                            : 'bg-slate-50 dark:bg-white/[0.04] border-slate-200 dark:border-white/[0.06] text-slate-600 dark:text-neutral-300'
                                    }`}
                                >
                                    {type === 'suggestion' && (t('feedback.typeSuggestion') || 'Sugestão')}
                                    {type === 'bug' && (t('feedback.typeBug') || 'Problema')}
                                    {type === 'praise' && (t('feedback.typePraise') || 'Elogio')}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Descrição */}
                    <div>
                        <textarea
                            value={feedbackText}
                            onChange={(e) => setFeedbackText(e.target.value)}
                            placeholder={t('feedback.messagePlaceholder') || "Escreva aqui seu feedback..."}
                            rows={4}
                            className="w-full bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] rounded-xl py-2.5 px-3.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-all resize-none"
                        />
                    </div>

                    {/* Botões do Modal */}
                    <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setIsFeedbackOpen(false)}
                          className="flex-1 py-2.5 border border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-neutral-400 font-semibold text-xs rounded-xl active:scale-95 transition-all"
                        >
                          {t('common.cancel') || 'Cancelar'}
                        </button>
                        <button
                          type="button"
                          onClick={handleSendFeedback}
                          className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl active:scale-95 transition-all shadow-sm"
                        >
                          {t('feedback.sendBtn') || 'Enviar'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default SettingsMainMenu;
