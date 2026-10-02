import React from 'react';
import { ShieldCheckIcon, ClipboardListIcon, ChevronRightIcon, LockIcon } from '../icons';
import { useTranslation } from '../../i18n';

interface PrivacySettingsProps {
    handleOpenLink: (url: string) => void;
}

const PrivacySettings: React.FC<PrivacySettingsProps> = ({ handleOpenLink }) => {
    const { t, locale } = useTranslation();

    return (
        <div className="space-y-5 max-w-lg mx-auto pb-8">
            {/* Seção Documentos */}
            <div className="space-y-2">
                <div className="px-1 text-xs font-semibold text-slate-500 dark:text-neutral-400">
                    {t('privacy.legalDocuments') || (locale === 'en' ? 'Legal Documents & Privacy' : 'Documentos Legais & Privacidade')}
                </div>
                <div className="bg-white dark:bg-dark-card border border-light-border dark:border-white/[0.06] rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-white/[0.05] shadow-sm">
                    {/* Política de Privacidade */}
                    <div
                        onClick={() => handleOpenLink('https://sites.google.com/view/sobcontrole-politicas/in%C3%ADcio')}
                        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-white/[0.04] active:scale-[0.99] transition-all cursor-pointer group"
                    >
                        <div className="flex items-center gap-3.5 min-w-0">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-blue-500/10 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 shrink-0">
                                <ShieldCheckIcon className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                                <h4 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                                    {t('privacy.privacyPolicy') || (locale === 'en' ? 'Privacy Policy' : 'Política de Privacidade')}
                                </h4>
                                <p className="text-xs text-slate-500 dark:text-neutral-400 truncate mt-0.5 font-normal">
                                    {t('privacy.privacyPolicySubtitle') || (locale === 'en' ? 'How we handle your data and security' : 'Como tratamos seus dados e segurança')}
                                </p>
                            </div>
                        </div>
                        <ChevronRightIcon className="h-4 w-4 text-slate-400 dark:text-neutral-600 group-hover:text-slate-600 dark:group-hover:text-neutral-300 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                    </div>

                    {/* Termos de Uso */}
                    <div
                        onClick={() => handleOpenLink('https://sites.google.com/view/sobcontrole-termos-de-uso/in%C3%ADcio')}
                        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-white/[0.04] active:scale-[0.99] transition-all cursor-pointer group"
                    >
                        <div className="flex items-center gap-3.5 min-w-0">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-brand-accent-light-subtle dark:bg-brand-accent-dark-subtle text-brand-accent dark:text-brand-accent-hover shrink-0">
                                <ClipboardListIcon className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                                <h4 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-brand-accent dark:group-hover:text-brand-accent-hover transition-colors truncate">
                                    {t('privacy.terms') || (locale === 'en' ? 'Terms of Use' : 'Termos de Uso')}
                                </h4>
                                <p className="text-xs text-slate-500 dark:text-neutral-400 truncate mt-0.5 font-normal">
                                    {t('privacy.termsSubtitle') || (locale === 'en' ? 'Rules and guidelines for using the app' : 'Regras e termos de utilização do app')}
                                </p>
                            </div>
                        </div>
                        <ChevronRightIcon className="h-4 w-4 text-slate-400 dark:text-neutral-600 group-hover:text-slate-600 dark:group-hover:text-neutral-300 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                    </div>
                </div>
            </div>

            {/* Card Informativo de Segurança e Privacidade no padrão Dark OLED */}
            <div className="bg-slate-100/80 dark:bg-dark-card border border-light-border dark:border-dark-border rounded-2xl p-4 shadow-sm space-y-2.5">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-brand-accent-light-subtle dark:bg-brand-accent-dark-subtle text-brand-accent dark:text-brand-accent-hover flex items-center justify-center shrink-0">
                        <LockIcon className="h-4 w-4" />
                    </div>
                    <div>
                        <h5 className="text-xs font-semibold text-slate-900 dark:text-white">
                            {locale === 'en' ? 'Privacy First' : locale === 'es' ? 'Privacidad Primero' : locale === 'fr' ? 'Confidentialité d’abord' : locale === 'de' ? 'Datenschutz zuerst' : 'Privacidade em Primeiro Lugar'}
                        </h5>
                        <p className="text-[11px] text-slate-500 dark:text-neutral-400 font-normal">
                            {locale === 'en' ? 'Your financial data belongs exclusively to you.' : locale === 'es' ? 'Tus datos financieros te pertenecen exclusivamente a ti.' : 'Seus dados financeiros pertencem exclusivamente a você.'}
                        </p>
                    </div>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-neutral-400 leading-relaxed pl-1 border-t border-slate-200/60 dark:border-white/[0.05] pt-2">
                    {locale === 'en' 
                        ? 'SobControle never sells your personal or financial data. All synced transactions are protected with end-to-end industry encryption and stored in secure infrastructure.'
                        : locale === 'es'
                        ? 'SobControle no vende tus datos personales ni financieros. Toda la información sincronizada cuenta con encriptación de nivel bancario y almacenamiento seguro.'
                        : 'O SobControle não comercializa seus dados pessoais ou financeiros com terceiros. Todas as informações sincronizadas contam com criptografia de ponta a ponta e armazenamento em infraestrutura segura.'}
                </p>
            </div>
        </div>
    );
};

export default PrivacySettings;
