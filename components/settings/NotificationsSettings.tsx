import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import { useTranslation } from '../../i18n';
import { CheckCircleIcon, CalopsitaIcon, ChevronDownIcon } from '../icons';
import { BankNotificationService } from '../../services/bankNotificationService';
import { CALOPSITA_REMINDERS } from '../../utils/notificationService';

const BellIcon: React.FC<{ className?: string }> = ({ className = "h-5 w-5" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
);

interface NotificationsSettingsProps {
    handleNotificationToggle: () => void;
}

const ToggleSwitch: React.FC<{ checked: boolean; onChange: () => void; label?: string }> = ({ checked, onChange, label }) => (
    <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label || 'Alternar'}
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            checked ? 'bg-[#EA580C]' : 'bg-slate-300 dark:bg-[#1F1F1F]'
        }`}
    >
        <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                checked ? 'translate-x-5' : 'translate-x-0'
            }`}
        />
    </button>
);

const NotificationsSettings: React.FC<NotificationsSettingsProps> = ({ handleNotificationToggle }) => {
    const { userProfile, showToast, setCurrentView } = useContext(AppContext)!;
    const { t } = useTranslation();

    const [isBankSupported, setIsBankSupported] = useState<boolean>(false);
    const [isPermissionGranted, setIsPermissionGranted] = useState<boolean>(false);
    const [isBankListenerEnabled, setIsBankListenerEnabled] = useState<boolean>(true);
    const [showCalopsitaTimeline, setShowCalopsitaTimeline] = useState(false);

    const refreshBankNotificationStatus = async () => {
        const supported = BankNotificationService.isSupported();
        setIsBankSupported(supported);
        if (supported) {
            const granted = await BankNotificationService.isPermissionGranted();
            setIsPermissionGranted(granted);
            const enabled = await BankNotificationService.isEnabled();
            setIsBankListenerEnabled(enabled);
        }
    };

    useEffect(() => {
        refreshBankNotificationStatus();
        const handleFocus = () => refreshBankNotificationStatus();
        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, []);

    const handleToggleBankListener = async () => {
        const nextState = !isBankListenerEnabled;
        setIsBankListenerEnabled(nextState);
        await BankNotificationService.setEnabled(nextState);
        showToast(nextState ? 'Captura de notificações bancárias ativada' : 'Captura de notificações bancárias desativada', 'info');
        if (nextState) {
            setCurrentView('automacao');
        }
    };

    const handleRequestBankPermission = async () => {
        await BankNotificationService.requestPermission();
    };

    return (
        <div className="space-y-6 max-w-lg mx-auto pb-8">
            {/* Seção 1: Lembretes da Calopsita CFO */}
            <div className="space-y-2">
                <div className="px-1 text-xs font-black text-slate-400 dark:text-[#64748B] uppercase tracking-wider">
                    Alertas do Aplicativo
                </div>
                <div className="bg-white dark:bg-[#111111] border border-slate-200/80 dark:border-[#1F1F1F] rounded-3xl p-5 shadow-xl space-y-4">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3.5">
                            <div className="w-11 h-11 rounded-2xl bg-[#FFEDD5] dark:bg-[#431407] border border-[#EA580C]/20 p-1 flex items-center justify-center shrink-0">
                                <CalopsitaIcon className="w-full h-full object-cover" />
                            </div>
                            <div>
                                <h4 className="font-bold text-light-text dark:text-dark-text text-sm flex items-center gap-1.5">
                                    Lembretes da Calopsita CFO
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FFEDD5] dark:bg-[#431407] text-[#EA580C] dark:text-[#F97316] font-extrabold">
                                        CFO 🦜
                                    </span>
                                </h4>
                                <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                                    Avisos bem-humorados para não deixar os gastos voarem
                                </p>
                            </div>
                        </div>
                        <ToggleSwitch
                            checked={userProfile.notificationsEnabled || false}
                            onChange={handleNotificationToggle}
                            label="Ativar lembretes da Calopsita CFO"
                        />
                    </div>

                    {/* Régua de Prazos e Mensagens da Calopsita CFO */}
                    <div className="pt-2 border-t border-slate-100 dark:border-[#1F1F1F]">
                        <button
                            type="button"
                            onClick={() => setShowCalopsitaTimeline(!showCalopsitaTimeline)}
                            className="w-full flex items-center justify-between text-xs font-bold text-[#EA580C] dark:text-[#F97316] py-1.5 hover:opacity-80 transition-opacity"
                        >
                            <span className="flex items-center gap-1.5">
                                <span>Ver cronograma de avisos da Calopsita ({CALOPSITA_REMINDERS.length} prazos)</span>
                            </span>
                            <ChevronDownIcon className={`h-4 w-4 transition-transform duration-200 ${showCalopsitaTimeline ? 'rotate-180' : ''}`} />
                        </button>

                        {showCalopsitaTimeline && (
                            <div className="mt-3 space-y-2.5 pt-2 border-t border-slate-100 dark:border-[#1F1F1F]">
                                {CALOPSITA_REMINDERS.map(reminder => (
                                    <div
                                        key={reminder.id}
                                        className="p-3 bg-slate-50 dark:bg-[#1A1A1A] rounded-2xl border border-slate-200/70 dark:border-[#1F1F1F] space-y-1 transition-all"
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-xs font-bold text-light-text dark:text-dark-text truncate">
                                                {reminder.title}
                                            </span>
                                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-[#FFEDD5] dark:bg-[#431407] text-[#EA580C] dark:text-[#F97316] shrink-0 tabular-nums">
                                                {reminder.days === 1 ? '1 dia' : `${reminder.days} dias`}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-slate-500 dark:text-[#B0B0B0] leading-relaxed">
                                            {reminder.body}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Seção 2: Importação de Notificações de Bancos (Em segundo plano) */}
            <div className="space-y-2">
                <div className="px-1 flex items-center justify-between text-xs font-black text-slate-400 dark:text-[#64748B] uppercase tracking-wider">
                    <span>Notificações de Bancos</span>
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-bold">
                        100% Offline
                    </span>
                </div>

                <div className="bg-white dark:bg-[#111111] border border-slate-200/80 dark:border-[#1F1F1F] rounded-3xl p-4 shadow-xl space-y-4">
                    <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                            <h4 className="text-sm font-bold text-slate-800 dark:text-[#F1F5F9]">
                                Leitura Automática de Compras
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-[#94A3B8] leading-relaxed">
                                Detecta compras no cartão ou PIX e sugere criar a transação na hora com 1 toque, mesmo com o app fechado.
                            </p>
                            <button
                                type="button"
                                onClick={() => setCurrentView('automacao')}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline pt-1"
                            >
                                ⚡ Ver como funciona a automação bancária ›
                            </button>
                        </div>

                        <ToggleSwitch
                            checked={isBankListenerEnabled}
                            onChange={handleToggleBankListener}
                            label="Ativar captura de compras bancárias"
                        />
                    </div>

                    {/* Status de Permissão Android */}
                    <div className="pt-2 border-t border-slate-100 dark:border-white/[0.04]">
                        {isBankSupported ? (
                            isPermissionGranted ? (
                                <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-3.5 py-2.5">
                                    <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-emerald-400">
                                        <CheckCircleIcon className="w-4 h-4 text-emerald-500 shrink-0" />
                                        <span>Permissão ativa no Android</span>
                                    </div>
                                    <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold uppercase">
                                        Monitorando
                                    </span>
                                </div>
                            ) : (
                                <div className="space-y-2 bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3.5">
                                    <div className="text-xs text-amber-800 dark:text-amber-300 font-medium">
                                        Para o app identificar as compras automaticamente, você precisa conceder permissão de leitura de notificações nas configurações do Android.
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleRequestBankPermission}
                                        className="w-full py-2 px-3 bg-amber-600 hover:bg-amber-700 active:scale-[0.98] text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5"
                                    >
                                        <span>Habilitar nas Configurações do Android</span>
                                        <span>›</span>
                                    </button>
                                </div>
                            )
                        ) : (
                            <div className="bg-slate-100 dark:bg-white/[0.03] rounded-2xl px-3.5 py-2.5 text-xs text-slate-500 dark:text-slate-400">
                                Disponível exclusivamente no aplicativo instalado no Android.
                            </div>
                        )}
                    </div>

                    {/* Bancos Suportados */}
                    <div className="pt-1">
                        <div className="text-[11px] font-semibold text-slate-600 dark:text-[#94A3B8] mb-1.5">
                            Bancos compatíveis:
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {['Nubank', 'Inter', 'Itaú', 'Bradesco', 'Santander', 'C6 Bank', 'Caixa', 'Banco do Brasil', 'Mercado Pago', 'PicPay'].map(banco => (
                                <span
                                    key={banco}
                                    className="text-[10px] px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-white/[0.05] text-slate-600 dark:text-slate-300 font-medium border border-slate-200/50 dark:border-white/[0.03]"
                                >
                                    {banco}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Privacidade */}
                    <div className="text-[10px] text-slate-600 dark:text-slate-300 leading-tight">
                        🔒 <span className="font-semibold text-slate-700 dark:text-slate-300">Privacidade Blindada:</span> Todas as notificações são lidas exclusivamente no seu aparelho. Nenhum dado é enviado a servidores externos ou terceiros.
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NotificationsSettings;
