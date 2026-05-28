
import React, { useContext, useState } from 'react';
import { AppContext } from '../context/AppContext';
import { ArrowLeftIcon, SparklesIcon, CrownIcon, InvoiceDollarIcon, ArrowDownTrayIcon, ChartBarIcon, LoaderIcon, CheckCircleIcon, PiggyBankIcon } from './icons';
import { BillingService } from '../utils/billingService';

const PremiumScreen: React.FC = () => {
    const context = useContext(AppContext);
    if (!context) return null;
    const { setCurrentView, updateUserProfile, showToast, dashboardLayout, handleUpdateLayout, userProfile } = context;

    const [isProcessing, setIsProcessing] = useState(false);
    const [step, setStep] = useState<'idle' | 'billing' | 'verifying' | 'success'>('idle');

    const handleUpgrade = async (planType: 'Mensal' | 'Anual') => {
        setIsProcessing(true);
        setStep('billing');

        try {
            const productId = planType === 'Mensal' ? BillingService.PRODUCTS.MONTHLY : BillingService.PRODUCTS.ANNUAL;
            const purchase = await BillingService.requestPurchase(productId);

            if (purchase.success && purchase.receipt) {
                setStep('verifying');
                const isValid = await BillingService.verifyPurchase(purchase.receipt);

                if (isValid) {
                    setStep('success');
                    updateUserProfile({ isPremium: true });

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
                        showToast(`Plano ${planType} ativado com sucesso!`, "success");
                        setCurrentView('menu');
                    }, 1500);
                }
            } else {
                showToast(purchase.error || "Pagamento não concluído.", "error");
                setIsProcessing(false);
                setStep('idle');
            }
        } catch (err) {
            showToast("Erro inesperado no sistema de pagamentos.", "error");
            setIsProcessing(false);
            setStep('idle');
        }
    };

    const benefits = [
        { title: "IA Ilimitada", desc: "Consultoria financeira 24h sem restrições.", icon: <SparklesIcon className="h-5 w-5 text-indigo-500 dark:text-indigo-400" /> },
        { title: "Exportação Excel e PDF", desc: "Relatórios profissionais e planilhas reais.", icon: <ArrowDownTrayIcon className="h-5 w-5 text-blue-500 dark:text-blue-400" /> },
        { title: "Importação Inteligente", desc: "Processe extratos PDF e OFX automaticamente.", icon: <InvoiceDollarIcon className="h-5 w-5 text-emerald-500 dark:text-emerald-400" /> },
        { title: "Calculadora de Metas", desc: "Simule cenários e planeje seu futuro financeiro.", icon: <ChartBarIcon className="h-5 w-5 text-purple-500 dark:text-purple-400" /> },
        { title: "Método 50/30/20", desc: "Acompanhe e valide a distribuição ideal das suas receitas.", icon: <PiggyBankIcon className="h-5 w-5 text-amber-500 dark:text-amber-400" /> },
    ];

    if (isProcessing) {
        return (
            <div className="bg-white dark:bg-dark-bg h-full flex flex-col items-center justify-center p-8 text-center">
                <div className="bg-slate-50 dark:bg-dark-surface/50 p-10 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-xs shadow-2xl">
                    {step !== 'success' ? (
                        <LoaderIcon className="h-16 w-16 text-dark-accent animate-spin mx-auto mb-6" />
                    ) : (
                        <div className="bg-emerald-500/20 p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
                            <CheckCircleIcon className="h-12 w-12 text-emerald-500" />
                        </div>
                    )}

                    <h2 className="text-slate-900 dark:text-white text-xl font-black mb-2">
                        {step === 'billing' && "Aguardando Google Play..."}
                        {step === 'verifying' && "Confirmando Assinatura..."}
                        {step === 'success' && "Parabéns, você é PRO!"}
                    </h2>
                    <p className="text-slate-500 dark:text-slate-300 text-sm leading-relaxed">
                        {step === 'billing' && "Conclua o pagamento na janela que o Android abriu."}
                        {step === 'verifying' && "Estamos processando seu acesso premium agora."}
                        {step === 'success' && "Todas as funções premium foram liberadas."}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-dark-bg text-slate-900 dark:text-white h-full flex flex-col overflow-y-auto no-scrollbar">
            <header className="p-4 flex items-center justify-between sticky top-0 bg-white/80 dark:bg-dark-bg/80 backdrop-blur-md z-10">
                <button onClick={() => setCurrentView('menu')} className="p-2 rounded-full text-slate-500 dark:text-slate-300">
                    <ArrowLeftIcon className="h-6 w-6" />
                </button>
                <div className="flex items-center gap-1.5">
                    <CrownIcon className="h-5 w-5 text-amber-500" />
                    <span className="font-bold text-lg uppercase tracking-tighter text-slate-900 dark:text-white">PRO</span>
                </div>
                <div className="w-10"></div>
            </header>

            <main className="flex-1 px-6 pt-4 pb-12">
                {userProfile.isPremium ? (
                    <div className="animate-in fade-in duration-500">
                        <div className="text-center mb-8">
                            <div className="h-20 w-20 bg-gradient-to-tr from-emerald-500 to-green-400 rounded-2xl mx-auto flex items-center justify-center shadow-2xl shadow-emerald-500/20 mb-5">
                                <CheckCircleIcon className="h-10 w-10 text-white" />
                            </div>
                            <h1 className="text-2xl font-black mb-2 text-slate-900 dark:text-white leading-tight">Você é PRO!</h1>
                            <p className="text-slate-500 dark:text-slate-300 text-sm px-4">Todas as ferramentas exclusivas já estão desbloqueadas para você.</p>
                        </div>

                        <div className="space-y-3 mb-10">
                            {benefits.map((b, i) => (
                                <div key={i} className="flex gap-4 p-4 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl shadow-sm">
                                    <div className="flex-shrink-0 mt-0.5">{b.icon}</div>
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">{b.title}</h3>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">{b.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="space-y-4">
                            <button
                                onClick={() => window.open('https://play.google.com/store/account/subscriptions', '_system')}
                                className="w-full bg-slate-100 dark:bg-dark-surface text-slate-700 dark:text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-sm active:scale-95 transition-all border border-slate-200 dark:border-slate-700"
                            >
                                Gerenciar Assinatura
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="text-center mb-8">
                            <div className="h-20 w-20 bg-gradient-to-tr from-amber-600 to-yellow-300 rounded-2xl mx-auto flex items-center justify-center shadow-2xl shadow-amber-500/20 mb-5 rotate-3">
                                <CrownIcon className="h-10 w-10 text-white" />
                            </div>
                            <h1 className="text-2xl font-black mb-2 text-slate-900 dark:text-white leading-tight">Sua liberdade financeira começa aqui</h1>
                            <p className="text-slate-500 dark:text-slate-300 text-sm px-4">Desbloqueie ferramentas exclusivas para dominar seu orçamento.</p>
                        </div>

                        <div className="space-y-3 mb-8">
                            {benefits.map((b, i) => (
                                <div key={i} className="flex gap-4 p-4 bg-slate-50 dark:bg-dark-surface/30 border border-slate-100 dark:border-slate-800/30 rounded-2xl shadow-sm">
                                    <div className="flex-shrink-0 mt-0.5">{b.icon}</div>
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">{b.title}</h3>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">{b.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="space-y-4">
                            <div className="bg-slate-50 dark:bg-dark-surface/60 p-5 rounded-3xl border border-slate-200 dark:border-slate-800/50 flex items-center justify-between shadow-sm">
                                <div className="text-left">
                                    <h2 className="text-base font-bold mb-0.5 text-slate-900 dark:text-white">Plano Mensal</h2>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-widest">Sem fidelidade</p>
                                </div>
                                <div className="text-right flex flex-col items-end">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-[10px] text-slate-400 font-bold">R$</span>
                                        <span className="text-xl font-black text-slate-900 dark:text-white">19,90</span>
                                        <span className="text-[10px] text-slate-500">/mês</span>
                                    </div>
                                    <button
                                        onClick={() => handleUpgrade('Mensal')}
                                        className="mt-2 bg-slate-200 dark:bg-dark-surface text-slate-700 dark:text-white px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
                                    >
                                        Escolher mensal
                                    </button>
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-3xl shadow-xl shadow-blue-500/20 text-center relative overflow-hidden ring-2 ring-blue-400/30">
                                <div className="absolute top-0 right-0 p-3">
                                    <span className="bg-amber-400 text-amber-950 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter">Melhor Valor</span>
                                </div>
                                <h2 className="text-lg font-black mb-1 text-white uppercase tracking-tight">Plano Anual</h2>
                                <div className="flex items-center justify-center gap-2 mb-2">
                                    <span className="text-blue-200/50 line-through text-xs italic">R$ 238,80</span>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-xs text-blue-100 font-bold">R$</span>
                                        <span className="text-3xl font-black text-white">199,90</span>
                                        <span className="text-xs text-blue-100">/ano</span>
                                    </div>
                                </div>

                                <div className="space-y-2 mb-6">
                                    <div className="inline-block bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full">
                                        <p className="text-white text-[10px] font-bold">Apenas R$ 16,65 por mês</p>
                                    </div>
                                    <p className="text-blue-100 text-[11px] font-bold px-4 leading-tight">
                                        Economize R$ 38,90 por ano<br />
                                        <span className="text-amber-300 uppercase tracking-tighter text-[10px]">Equivalente a 2 meses grátis</span>
                                    </p>
                                </div>

                                <button
                                    onClick={() => handleUpgrade('Anual')}
                                    className="w-full bg-white text-blue-700 py-4 rounded-xl font-black text-sm uppercase tracking-widest shadow-lg active:scale-95 transition-all"
                                >
                                    Assinar com Desconto
                                </button>
                                <p className="text-[9px] text-blue-100 mt-4 opacity-70 italic">Pagamento único anual.</p>
                            </div>
                        </div>

                        <button onClick={() => setCurrentView('menu')} className="w-full mt-8 py-3 text-slate-400 dark:text-slate-400 text-xs font-bold uppercase tracking-widest">
                            Continuar com a versão gratuita
                        </button>
                    </>
                )}
            </main>
        </div>
    );
};

export default PremiumScreen;
