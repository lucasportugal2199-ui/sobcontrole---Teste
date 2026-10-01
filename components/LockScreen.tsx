import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LogoIcon, LoaderIcon } from './icons';
import { useTranslation } from '../i18n';
import { verifyBiometric } from '../utils/biometric';

interface LockScreenProps {
    onUnlock: () => void;
}

const LockScreen: React.FC<LockScreenProps> = ({ onUnlock }) => {
    const { t } = useTranslation();
    const [isVerifying, setIsVerifying] = useState(false);
    const [error, setError] = useState('');
    const [showSkip, setShowSkip] = useState(false);
    const hasTriedRef = useRef(false);
    const onUnlockRef = useRef(onUnlock);
    onUnlockRef.current = onUnlock;

    const handleVerify = useCallback(async () => {
        setIsVerifying(true);
        setError('');
        try {
            const success = await verifyBiometric();
            if (success) {
                onUnlockRef.current();
            } else {
                setError(t('lock.authFailed'));
            }
        } catch {
            setError(t('lock.verifyError'));
        }
        setIsVerifying(false);
    }, []);

    // Tenta verificar automaticamente ao montar (apenas uma vez)
    useEffect(() => {
        if (hasTriedRef.current) return;
        hasTriedRef.current = true;
        handleVerify();
    }, [handleVerify]);

    // Timeout de segurança: se após 8s ainda estiver verificando, mostra skip
    useEffect(() => {
        const timer = setTimeout(() => {
            setShowSkip(true);
        }, 8000);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="fixed inset-0 z-[200] bg-dark-bg flex flex-col items-center justify-center text-white px-8">
            <div className="flex flex-col items-center text-center">
                <LogoIcon className="h-24 w-24 mb-4 text-white drop-shadow-2xl" />
                <h1 className="text-2xl font-black uppercase tracking-tighter mb-2">
                    SobControle
                </h1>
                <p className="text-slate-400 text-sm font-medium mb-10">
                    {t('lock.subtitle')}
                </p>

                {error && (
                    <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-bold text-center uppercase tracking-widest animate-in fade-in">
                        {error}
                    </div>
                )}

                <button
                    onClick={handleVerify}
                    disabled={isVerifying}
                    className="w-full max-w-xs flex items-center justify-center gap-3 bg-[#3B82F6] hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-2xl shadow-lg shadow-dark-accent/30 active:scale-95 transition-all disabled:opacity-50 uppercase tracking-widest text-sm"
                >
                    {isVerifying ? (
                        <>
                            <LoaderIcon className="h-5 w-5 animate-spin" />
                            {t('lock.verifying')}
                        </>
                    ) : (
                        <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 10V14M7.5 7.5C7.5 4.5 9 2 12 2s4.5 2.5 4.5 5.5M5.5 12c0-3 1-5.5 3-7M15.5 5c2 1.5 3 4 3 7M3.5 14c0-3 .5-6 2.5-8.5M18 9.5c1.5 2 2.5 4 2.5 7" />
                            </svg>
                            {t('lock.unlock')}
                        </>
                    )}
                </button>

                {/* Botão de skip — aparece após timeout de segurança */}
                {showSkip && (
                    <button
                        onClick={() => onUnlockRef.current()}
                        className="mt-4 w-full max-w-xs flex items-center justify-center gap-2 bg-transparent border border-slate-700 text-slate-400 font-bold py-3 px-6 rounded-2xl active:scale-95 transition-all uppercase tracking-widest text-[10px] animate-in fade-in duration-300"
                    >
                        {t('lock.skipBiometric')}
                    </button>
                )}
            </div>

            <p className="absolute bottom-8 text-[10px] font-black text-slate-700 uppercase tracking-[0.3em]">
                {t('lock.protectedBy')}
            </p>
        </div>
    );
};

export default LockScreen;

