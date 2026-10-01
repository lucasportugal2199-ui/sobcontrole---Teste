import React, { useState, useContext, useEffect } from 'react';
import {
  GoogleIcon,
  LoaderIcon,
  LogoIcon
} from './icons';
import { AppContext } from '../context/AppContext';
import { useTranslation } from '../i18n';
import { SocialLogin } from '@capgo/capacitor-social-login';
import { supabase } from '../utils/supabaseClient';
import { Capacitor } from '@capacitor/core';

const LoginScreen: React.FC = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('LoginScreen must be used within an AppProvider');

  const { showToast } = context;
  const { t } = useTranslation();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);



  // ✅ Inicializa Google uma única vez (apenas em plataforma nativa)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    SocialLogin.initialize({
      google: {
        webClientId:
          process.env.VITE_GOOGLE_CLIENT_ID ||
          '634092840111-5t9e5nta646q822hadboq4k9daoigk5o.apps.googleusercontent.com',
      },
    });
  }, []);

  const handleGoogleLogin = async () => {
    setError('');
    setSuccessMessage('');

    if (!agreedToTerms) {
      setError(t('login.error.acceptTerms'));
      return;
    }

    setIsLoading(true);

    try {
      await supabase.auth.signOut();

      if (!Capacitor.isNativePlatform()) {
        // ✅ Fluxo Web: OAuth padrão via redirect do browser
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        // O redirect acontece automaticamente — não precisa de mais ações aqui
        return;
      }

      // ✅ Fluxo Android Nativo: usa SocialLogin do Capacitor
      const { result } = await SocialLogin.login({
        provider: 'google',
        options: {}
      });

      const googleIdToken = (result as any).idToken;

      if (!googleIdToken) {
        throw new Error(t('login.error.noToken'));
      }

      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: googleIdToken,
      });

      if (error) throw error;
    } catch (err: any) {
      console.error('Erro Google Login:', err);
      let errorMessage = err?.message || 'Erro desconhecido';
      const msgLower = errorMessage.toLowerCase();

      if (msgLower.includes('popup closed') || msgLower.includes('cancel')) {
        errorMessage = t('login.error.cancelled');
      } else if (msgLower.includes('network error') || msgLower.includes('offline') || msgLower.includes('failed to fetch')) {
        errorMessage = t('login.error.network');
      } else if (msgLower.includes('10:') || msgLower.includes('developer error') || msgLower.includes('16:')) {
        errorMessage = t('login.error.playServices');
      } else if (msgLower.includes('timeout')) {
        errorMessage = t('login.error.timeout');
      } else if (msgLower.includes('token')) {
        errorMessage = t('login.error.authProvider');
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenLink = (url: string) => {
    window.open(url, '_system');
  };

  return (
    <div className="bg-dark-bg h-full w-full overflow-y-auto no-scrollbar flex flex-col font-sans text-white transition-all duration-300">
      <div className="w-full max-w-sm mx-auto px-6 pt-10 pb-24 min-h-full flex flex-col justify-center">

        <div className="flex flex-col items-center text-center mb-10">
          <LogoIcon className="h-28 w-28 mb-3 text-white drop-shadow-2xl" />
          <h1 className="text-3xl font-black uppercase tracking-tighter mb-2">
            SobControle
          </h1>
          <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-[280px]">
            {t('login.subtitle')}
          </p>
        </div>

        <div className="space-y-6">
          {/* Termos de Uso */}
          <div className="flex items-start gap-4 px-4 py-3.5 bg-slate-900/40 rounded-2xl border border-slate-800/60">
            <input
              type="checkbox"
              id="terms"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="mt-0.5 h-5 w-5 rounded border-slate-700 bg-slate-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-900 cursor-pointer accent-blue-500 flex-shrink-0"
            />
            <label htmlFor="terms" className="text-xs text-slate-400 leading-relaxed cursor-pointer select-none">
              {t('login.termsConsent')}{' '}
              <span className="text-white hover:text-blue-400 font-bold transition-colors" onClick={(e) => { e.preventDefault(); handleOpenLink('https://sites.google.com/view/sobcontrole-termos-de-uso/in%C3%ADcio'); }}>
                {t('login.termsOfUse')}
              </span>{' '}
              {t('login.and')}{' '}
              <span className="text-white hover:text-blue-400 font-bold transition-colors" onClick={(e) => { e.preventDefault(); handleOpenLink('https://sites.google.com/view/sobcontrole-politicas/in%C3%ADcio'); }}>
                {t('login.privacyPolicy')}
              </span>.
            </label>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={isLoading || !agreedToTerms}
            className="w-full flex items-center justify-center bg-white text-slate-900 font-black py-4 px-4 rounded-2xl shadow-xl shadow-white/10 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"
          >
            {isLoading ? <LoaderIcon className="h-5 w-5 animate-spin mr-3 text-slate-500" /> : <GoogleIcon className="h-6 w-6 mr-3" />}
            {t('login.signInGoogle')}
          </button>

          {import.meta.env.DEV && (
            <button
              onClick={() => {
                localStorage.setItem("lastUserId", "dev-user-id");
                window.location.reload();
              }}
              className="w-full flex items-center justify-center bg-transparent border border-slate-800 text-slate-500 font-bold py-3 px-4 rounded-2xl hover:bg-slate-900 transition-all text-xs uppercase tracking-widest mt-4"
            >
              {t('login.devBypass')}
            </button>
          )}

        </div>
      </div>
    </div>
  );
};

export default LoginScreen;