import React, { useContext, useState } from 'react';
import { AppContext } from '../context/AppContext';
import { useTranslation } from '../i18n';
import { CrownIcon, LoaderIcon, CheckCircleIcon } from './icons';
import { BillingService } from '../utils/billingService';
import confetti from 'canvas-confetti';

const CloseIcon: React.FC<{ className?: string }> = ({ className = "h-5 w-5" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

const CheckIcon: React.FC<{ className?: string }> = ({ className = "h-4 w-4" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

const PremiumScreen: React.FC = () => {
    const context = useContext(AppContext);
    if (!context) return null;
    const { goBackView, updateUserProfile, showToast, dashboardLayout, handleUpdateLayout, userProfile } = context;

    const { t, locale } = useTranslation();
    const [selectedPlan, setSelectedPlan] = useState<'Anual' | 'Mensal'>('Anual');
    const [isProcessing, setIsProcessing] = useState(false);
    const [step, setStep] = useState<'idle' | 'billing' | 'verifying' | 'success'>('idle');

    const handleUpgrade = async (planType: 'Mensal' | 'Anual') => {
        setIsProcessing(true);
        setStep('billing');

        try {
            const productId = planType === 'Mensal' ? BillingService.PRODUCTS.MONTHLY : BillingService.PRODUCTS.ANNUAL;
            const purchase = await BillingService.requestPurchase(productId);

            if (purchase.success) {
                setStep('verifying');
                const isValid = await BillingService.verifyPurchase(purchase.receipt);

                if (isValid) {
                    setStep('success');
                    updateUserProfile({ isPremium: true });

                    try {
                        confetti({
        disableForReducedMotion: true,
                            particleCount: 100,
                            spread: 70,
                            origin: { y: 0.6 }
                        });
                    } catch { }

                    if (dashboardLayout && handleUpdateLayout) {
                        handleUpdateLayout({
                            ...dashboardLayout,
                            visibility: {
                                ...dashboardLayout.visibility,
                                distribuicao502030: true
                            }
                        });
                    }

                    setTimeout(() => {
                        showToast(t('premium.toast.planActivated', { plan: planType }) || `Plano ${planType} ativado com sucesso!`, "success");
                        goBackView();
                    }, 1800);
                } else {
                    // O servidor/Google Play não confirmou a assinatura
                    showToast(t('premium.toast.paymentError') || "Erro ao processar assinatura.", "error");
                    setIsProcessing(false);
                    setStep('idle');
                }
            } else {
                showToast(purchase.error || t('premium.toast.paymentNotCompleted') || "Pagamento não concluído.", "error");
                setIsProcessing(false);
                setStep('idle');
            }
        } catch (err) {
            showToast(t('premium.toast.paymentError') || "Erro ao processar assinatura.", "error");
            setIsProcessing(false);
            setStep('idle');
        }
    };

    const handleRestorePurchases = async () => {
        setIsProcessing(true);
        try {
            await BillingService.restorePurchases((isPremium) => {
                if (isPremium) {
                    updateUserProfile({ isPremium: true });
                    showToast("Assinatura restaurada com sucesso!", "success");
                    goBackView();
                } else {
                    showToast("Nenhuma assinatura ativa encontrada.", "info");
                }
            });
        } catch {
            showToast("Erro ao restaurar compras.", "error");
        } finally {
            setIsProcessing(false);
        }
    };

    const featureList = [
        "CFO de Bolso com Inteligência Artificial",
        "Scanner de comprovantes com IA",
        "Relatórios anuais e exportação em PDF/Excel",
        "Criação de categorias ilimitadas"
    ];

    if (isProcessing) {
        return (
            <div className="bg-dark-bg text-white h-full flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-300">
                <div className="bg-dark-card p-8 sm:p-10 rounded-3xl border border-white/[0.08] w-full max-w-xs shadow-2xl">
                    {step !== 'success' ? (
                        <LoaderIcon className="h-14 w-14 text-amber-400 animate-spin mx-auto mb-6" />
                    ) : (
                        <div className="bg-emerald-500/20 p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/20">
                            <CheckCircleIcon className="h-10 w-10 text-emerald-400" />
                        </div>
                    )}

                    <h2 className="text-white text-lg font-extrabold mb-2">
                        {step === 'billing' && (t('premium.status.waitingGooglePlay') || 'Aguardando Pagamento...')}
                        {step === 'verifying' && (t('premium.status.confirmingSubscription') || 'Confirmando Assinatura...')}
                        {step === 'success' && (t('premium.status.congratsPro') || 'Parabéns, você é PRO!')}
                    </h2>
                    <p className="text-slate-400 text-xs leading-relaxed">
                        {step === 'billing' && (t('premium.status.completePaymentDesc') || 'Conclua o pagamento na janela que o Google Play abriu.')}
                        {step === 'verifying' && (t('premium.status.processingAccessDesc') || 'Estamos liberando seus recursos premium agora.')}
                        {step === 'success' && (t('premium.status.allFunctionsReleasedDesc') || 'Todas as ferramentas ilimitadas estão prontas para você.')}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-dark-bg text-slate-100 h-full flex flex-col justify-between overflow-y-auto no-scrollbar selection:bg-amber-500 selection:text-black">
            {/* Header com botão fechar */}
            <header className="px-5 pt-[calc(1rem+var(--sat))] pb-2 flex items-center justify-end sticky top-0 z-20">
                <button
                    onClick={goBackView}
                    className="h-9 w-9 rounded-full bg-dark-card border border-white/[0.08] text-slate-300 hover:text-white flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all shadow-md"
                    aria-label="Fechar"
                >
                    <CloseIcon className="h-4 w-4" />
                </button>
            </header>

            {/* Conteúdo Principal */}
            <main className="flex-1 px-5 py-2 flex flex-col justify-center max-w-md mx-auto w-full">
                {userProfile.isPremium ? (
                    <div className="animate-in fade-in duration-500 text-center py-6">
                        <div className="h-20 w-20 bg-gradient-to-tr from-amber-400 to-amber-600 rounded-3xl mx-auto flex items-center justify-center shadow-2xl shadow-amber-500/30 mb-5 border-2 border-amber-300">
                            <CrownIcon className="h-10 w-10 text-slate-950" />
                        </div>
                        <h1 className="text-2xl font-black mb-2 text-white tracking-tight">Você é Assinante PRO</h1>
                        <p className="text-slate-400 text-xs px-4 mb-8">Todos os recursos avançados, inteligência artificial e sincronização em tempo real estão ativos.</p>

                        <div className="bg-dark-card border border-white/[0.08] rounded-2xl p-4 space-y-3 mb-8 text-left">
                            {featureList.map((feature, idx) => (
                                <div key={idx} className="flex items-center gap-3">
                                    <div className="h-6 w-6 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center flex-shrink-0">
                                        <CheckIcon className="h-3.5 w-3.5" />
                                    </div>
                                    <span className="text-xs font-semibold text-slate-200">{feature}</span>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={() => window.open('https://play.google.com/store/account/subscriptions', '_system')}
                            className="w-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 text-slate-950 py-4 rounded-2xl font-black text-sm uppercase tracking-wider shadow-lg shadow-amber-500/25 active:scale-[0.98] transition-all"
                        >
                            Gerenciar Assinatura
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6 animate-in fade-in duration-500">
                        {/* Hero PRO */}
                        <div className="text-center pt-2">
                            <div className="inline-flex items-center justify-center mb-2">
                                <span className="text-4xl drop-shadow-[0_4px_16px_rgba(245,158,11,0.5)]">👑</span>
                            </div>
                            <h1 className="text-3xl font-black text-white tracking-tight leading-tight mb-2">
                                SobControle PRO
                            </h1>
                            <p className="text-slate-400 text-xs sm:text-sm max-w-xs mx-auto leading-relaxed">
                                Desbloqueie todo o poder da inteligência financeira sem limites.
                            </p>
                        </div>

                        {/* Lista de Benefícios */}
                        <div className="space-y-3 px-1">
                            {featureList.map((feature, idx) => (
                                <div key={idx} className="flex items-center gap-3">
                                    <div className="h-6 w-6 rounded-lg bg-amber-500/15 border border-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0">
                                        <CheckIcon className="h-3.5 w-3.5" />
                                    </div>
                                    <span className="text-xs sm:text-sm font-semibold text-slate-100">
                                        {feature}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Cards de Seleção de Plano */}
                        <div className="space-y-3.5 pt-2">
                            {/* Plano Anual */}
                            <div
                                onClick={() => setSelectedPlan('Anual')}
                                className={`relative rounded-2xl p-4 sm:p-5 flex items-center justify-between cursor-pointer transition-all duration-200 border-2 ${
                                    selectedPlan === 'Anual'
                                        ? 'bg-gradient-to-r from-[#181818] to-[#121212] border-amber-500 shadow-xl shadow-amber-500/10 ring-1 ring-amber-500/40'
                                        : 'bg-dark-card border-white/[0.08] hover:border-white/20'
                                }`}
                            >
                                {/* Badge de Desconto */}
                                <div className="absolute -top-3 right-4 bg-amber-500 text-slate-950 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-md">
                                    ECONOMIZE 50%
                                </div>

                                <div>
                                    <h3 className="text-base font-extrabold text-white">{t('premium.yearlyPlan')}</h3>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        {locale === 'en' ? 'Billed annually' : locale === 'es' ? 'Cobrado anualmente' : locale === 'fr' ? 'Facturé annuellement' : locale === 'de' ? 'Jährlich abgerechnet' : 'Cobrado anualmente'} ({t('premium.currencySymbol')} {t('premium.annualPrice')})
                                    </p>
                                </div>

                                <div className="text-right">
                                    <div className="text-xl sm:text-2xl font-black text-white leading-none">
                                        {t('premium.currencySymbol')} {t('premium.annualPriceMonthlyEq')}
                                    </div>
                                    <span className="text-[11px] text-slate-400 font-medium">{t('premium.perMonth')}</span>
                                </div>
                            </div>

                            {/* Plano Mensal */}
                            <div
                                onClick={() => setSelectedPlan('Mensal')}
                                className={`relative rounded-2xl p-4 sm:p-5 flex items-center justify-between cursor-pointer transition-all duration-200 border-2 ${
                                    selectedPlan === 'Mensal'
                                        ? 'bg-gradient-to-r from-[#181818] to-[#121212] border-amber-500 shadow-xl shadow-amber-500/10 ring-1 ring-amber-500/40'
                                        : 'bg-dark-card border-white/[0.08] hover:border-white/20'
                                }`}
                            >
                                <div>
                                    <h3 className="text-base font-extrabold text-white">{t('premium.monthlyPlan')}</h3>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        {locale === 'en' ? 'Cancel anytime' : locale === 'es' ? 'Cancela cuando quieras' : locale === 'fr' ? 'Annulez à tout moment' : locale === 'de' ? 'Jederzeit kündbar' : 'Cancele quando quiser'}
                                    </p>
                                </div>

                                <div className="text-right">
                                    <div className="text-xl sm:text-2xl font-black text-white leading-none">
                                        {t('premium.currencySymbol')} {t('premium.monthlyPrice')}
                                    </div>
                                    <span className="text-[11px] text-slate-400 font-medium">{t('premium.perMonth')}</span>
                                </div>
                            </div>
                        </div>

                        {/* Botão de Ação Principal (CTA) */}
                        <div className="pt-2">
                            <button
                                onClick={() => handleUpgrade(selectedPlan)}
                                className="w-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 py-4 rounded-2xl font-black text-sm sm:text-base uppercase tracking-wider shadow-[0_10px_25px_rgba(245,158,11,0.3)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 group"
                            >
                                <span>
                                    {selectedPlan === 'Anual'
                                        ? (locale === 'en' ? 'Subscribe Yearly Plan (7 Days Free)' : locale === 'es' ? 'Suscribirse Plan Anual (7 Días Gratis)' : locale === 'fr' ? 'S\'abonner au Forfait Annuel (7 Jours Gratuits)' : locale === 'de' ? 'Jahresplan abonnieren (7 Tage kostenlos)' : 'Assinar Plano Anual (7 Dias Grátis)')
                                        : (locale === 'en' ? 'Subscribe Monthly Plan' : locale === 'es' ? 'Suscribirse Plan Mensal' : locale === 'fr' ? 'S\'abonner au Forfait Mensuel' : locale === 'de' ? 'Monatsplan abonnieren' : 'Assinar Plano Mensal')}
                                </span>
                            </button>
                        </div>
                    </div>
                )}
            </main>

            {/* Footer com links de restauração e termos */}
            <footer className="px-5 py-4 pb-[calc(1.5rem+var(--sab))] text-center space-y-2">
                <button
                    onClick={handleRestorePurchases}
                    className="text-xs font-bold text-slate-400 hover:text-amber-400 transition-colors uppercase tracking-wider"
                >
                    Restaurar Compras
                </button>
                <div className="text-[10px] text-slate-500 space-x-2">
                    <span
                        onClick={() => window.open('https://sobcontrole.app/termos', '_system')}
                        className="cursor-pointer hover:underline"
                    >
                        Termos de Uso
                    </span>
                    <span>•</span>
                    <span
                        onClick={() => window.open('https://sobcontrole.app/privacidade', '_system')}
                        className="cursor-pointer hover:underline"
                    >
                        Política de Privacidade
                    </span>
                </div>
            </footer>
        </div>
    );
};

export default PremiumScreen;
