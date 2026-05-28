import React, { useContext, useState, useEffect } from 'react';
import {
    UserCircleIcon, CrownIcon, TrophyIcon, CreditCardIcon, ViewGridIcon,
    ArrowUpTrayIcon, LogoutIcon, GoogleIcon, BankIcon, RefreshIcon
} from '../icons';
import { AppContext, MenuSubView } from '../../context/AppContext';
import { App as CapApp } from '@capacitor/app';
import { isBiometricAvailable, verifyBiometric, getBiometricPreference, setBiometricPreference } from '../../utils/biometric';

interface SettingsMainMenuProps {
    setMenuSubView: (view: MenuSubView) => void;
    setCurrentView: (view: any) => void;
    handleLogout: () => void;
}

// Ícone de escudo para biometria
const ShieldCheckIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="m9 12 2 2 4-4" />
    </svg>
);

const SettingsMainMenu: React.FC<SettingsMainMenuProps> = ({
    setMenuSubView, setCurrentView, handleLogout
}) => {
    const { userProfile, showToast } = useContext(AppContext);

    const [biometricAvailable, setBiometricAvailable] = useState(false);
    const [biometricEnabled, setBiometricEnabled] = useState(false);
    const [biometricLoading, setBiometricLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const available = await isBiometricAvailable();
                setBiometricAvailable(available);
                // Carrega a preferência salva independente de disponibilidade
                // (para dispositivos nativos que suportam biometria)
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
                // Ativando: testa primeiro
                const success = await verifyBiometric();
                if (success) {
                    await setBiometricPreference(true);
                    setBiometricEnabled(true);
                    showToast('Biometria ativada com sucesso!', 'success');
                } else {
                    showToast('Falha ao autenticar biometria. Verifique se o seu dispositivo tem senha/digital configurada.', 'error');
                }
            } else {
                // Desativando: pede confirmação biométrica
                const success = await verifyBiometric();
                if (success) {
                    await setBiometricPreference(false);
                    setBiometricEnabled(false);
                    showToast('Biometria desativada com sucesso.', 'info');
                } else {
                    showToast('Ação cancelada ou falha na autenticação.', 'error');
                }
            }
        } catch { 
            showToast('Ocorreu um erro ao processar a biometria.', 'error');
        }
        setBiometricLoading(false);
    };

    const renderMenuItem = (
        icon: React.ElementType, title: string, subtitle: string, onClick: () => void,
        colorClass = "text-slate-500 dark:text-slate-300", iconBgClass = "bg-light-bg dark:bg-dark-surface", isPro = false
    ) => (
        <button onClick={onClick} className="w-full flex items-center justify-between p-4 hover:bg-light-bg/50 dark:hover:bg-dark-surface/50 transition-colors group">
            <div className="flex items-center gap-4">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${iconBgClass} ${colorClass}`}>
                    {React.createElement(icon, { className: "h-5 w-5" })}
                </div>
                <div className="text-left">
                    <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-light-accent dark:group-hover:text-dark-accent transition-colors">{title}</h4>
                        {isPro && !userProfile.isPremium && <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-[9px] font-black px-1.5 py-0.5 rounded uppercase">PRO</span>}
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium leading-tight">{subtitle}</p>
                </div>
            </div>
        </button>
    );

    return (
        <div className="space-y-6 pb-8">
            <div className="flex flex-col items-center mb-6 -mt-2">
                <div className="h-16 w-16 rounded-full p-1 bg-gradient-to-tr from-light-accent to-indigo-600 mb-3 shadow-xl">
                    <div className="h-full w-full rounded-full border-2 border-light-bg dark:border-dark-bg overflow-hidden bg-slate-200 dark:bg-dark-surface relative">
                        {userProfile.avatar ? (
                            <img src={userProfile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-slate-800 text-white">
                                <UserCircleIcon className="h-8 w-8 text-slate-400" />
                            </div>
                        )}
                    </div>
                </div>

                <h2 className="text-xl font-black text-slate-900 dark:text-white mb-0.5">{userProfile.name}</h2>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-300 mb-4">{userProfile.email}</p>

                <div className="flex items-center gap-3">
                    {userProfile.isPremium ? (
                        <div className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-500 text-white rounded-full shadow-lg shadow-amber-500/20 active:scale-95 transition-transform" onClick={() => setCurrentView('premium')}>
                            <CrownIcon className="h-3.5 w-3.5" />
                            <span className="text-[10px] font-black uppercase tracking-wider">Membro PRO</span>
                        </div>
                    ) : (
                        <button onClick={() => setCurrentView('premium')} className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full active:scale-95 transition-transform shadow-lg shadow-amber-500/30">
                            <CrownIcon className="h-3.5 w-3.5" />
                            <span className="text-[10px] font-black uppercase tracking-wider">Seja PRO</span>
                        </button>
                    )}

                    <div className="flex items-center gap-1.5 px-4 py-1.5 bg-slate-800 text-white rounded-full shadow-lg shadow-black/20">
                        <GoogleIcon className="h-3 w-3" />
                        <span className="text-[10px] font-black uppercase tracking-wider">Conta Google</span>
                    </div>
                </div>
            </div>

            {/* Seção Minha Conta */}
            <div>
                <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest mb-3 ml-4">Minha Conta</h3>
                <div className="bg-light-bg dark:bg-dark-surface rounded-3xl overflow-hidden border border-light-bg dark:border-slate-800 shadow-sm">
                    {renderMenuItem(
                        CrownIcon, "Minha Assinatura", userProfile.isPremium ? "Você já é um membro PRO" : "Faça upgrade agora",
                        () => setCurrentView('premium'), "text-amber-500", "bg-amber-100 dark:bg-amber-900/20"
                    )}
                    <div className="h-px bg-slate-100 dark:bg-dark-surface mx-16" />
                    {renderMenuItem(
                        TrophyIcon, "Minhas Conquistas", "Veja seus marcos e medalhas",
                        () => setMenuSubView('achievements'), "text-red-500", "bg-red-100 dark:bg-red-900/20"
                    )}
                    <div className="h-px bg-slate-100 dark:bg-dark-surface mx-16" />
                    {renderMenuItem(
                        UserCircleIcon, "Informações Pessoais", "Visualizar perfil",
                        () => setMenuSubView('editProfile'), "text-indigo-500", "bg-indigo-100 dark:bg-indigo-900/20"
                    )}
                </div>
            </div>

            {/* Seção Preferências */}
            <div>
                <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest mb-3 ml-4">Preferências</h3>
                <div className="bg-light-bg dark:bg-dark-surface rounded-3xl overflow-hidden border border-light-bg dark:border-slate-800 shadow-sm">
                    {renderMenuItem(
                        CreditCardIcon, "Gerenciar Cartões", "Bancos, limites e faturas",
                        () => setMenuSubView('cards'), "text-purple-500", "bg-purple-100 dark:bg-purple-900/20"
                    )}
                    <div className="h-px bg-slate-100 dark:bg-dark-surface mx-16" />
                    {renderMenuItem(
                        BankIcon, "Minhas Contas", "Gerencie bancos e saldos manuais",
                        () => setCurrentView('openfinance'), "text-light-accent", "bg-light-accent/10"
                    )}

                    <div className="h-px bg-slate-100 dark:bg-dark-surface mx-16" />
                    {renderMenuItem(
                        ViewGridIcon, "Layout e Visual", "Personalize sua experiência",
                        () => setMenuSubView('layout'), "text-sky-500", "bg-sky-100 dark:bg-sky-900/20"
                    )}
                </div>
            </div>

            {/* Seção Segurança e Dados */}
            <div>
                <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest mb-3 ml-4">Segurança e Dados</h3>
                <div className="bg-light-bg dark:bg-dark-surface rounded-3xl overflow-hidden border border-light-bg dark:border-slate-800 shadow-sm">
                    {/* Toggle Biometria */}
                    <div className="w-full flex items-center justify-between p-4 hover:bg-light-bg/50 dark:hover:bg-dark-surface/50 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-500">
                                <ShieldCheckIcon className="h-5 w-5" />
                            </div>
                            <div className="text-left">
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Bloqueio por Biometria</h4>
                                <p className="text-[10px] text-slate-500 font-medium leading-tight">
                                    {biometricLoading ? 'Verificando...' : biometricAvailable ? 'Digital ou senha do dispositivo' : 'Indisponível neste dispositivo'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleToggleBiometric}
                            disabled={biometricLoading || !biometricAvailable}
                            className={`relative w-12 h-7 rounded-full transition-colors duration-200 ${biometricEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'} ${(biometricLoading || !biometricAvailable) ? 'opacity-50' : ''}`}
                        >
                            <div className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-200 ${biometricEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                    </div>
                    <div className="h-px bg-slate-100 dark:bg-dark-surface mx-16" />
                    {renderMenuItem(
                        ArrowUpTrayIcon, "Gerenciar Dados", "Importar, exportar ou limpar registros",
                        () => setMenuSubView('data'), "text-light-accent", "bg-light-accent/10"
                    )}
                    <div className="h-px bg-slate-100 dark:bg-dark-surface mx-16" />
                    {renderMenuItem(
                        ShieldCheckIcon, "Política e Privacidade", "Termos e condições de uso",
                        () => setMenuSubView('privacy'), "text-slate-500 dark:text-slate-400", "bg-slate-200 dark:bg-slate-800"
                    )}
                </div>
            </div>

            {/* Botão Sair da Conta */}
            <button
                onClick={handleLogout}
                className="w-full py-4 rounded-2xl bg-red-50 dark:bg-red-900/10 text-red-500 dark:text-red-400 font-bold text-xs uppercase tracking-widest hover:bg-red-100 dark:hover:bg-red-900/20 transition-all flex items-center justify-center gap-2 border border-red-100 dark:border-red-900/20"
            >
                <LogoutIcon className="h-4 w-4" />
                Sair da Conta
            </button>

            <div className="text-center">
                <p className="text-[9px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-[0.3em]">SobControle V1.0.0</p>
            </div>
        </div>
    );
};

export default SettingsMainMenu;
