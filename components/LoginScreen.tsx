import React, { useState, useContext, useEffect } from 'react';
import {
  GoogleIcon,
  LoaderIcon,
  LogoIcon
} from './icons';
import { AppContext } from '../context/AppContext';
import { SocialLogin } from '@capgo/capacitor-social-login';
import { supabase } from '../utils/supabaseClient';

const LoginScreen: React.FC = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('LoginScreen must be used within an AppProvider');

  const { handleLoginSuccess } = context;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // ✅ Inicializa Google uma única vez
  useEffect(() => {
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

    if (!agreedToTerms) {
      setError('Para continuar, você precisa aceitar os Termos de Uso e Política de Privacidade.');
      return;
    }

    setIsLoading(true);

    try {
      // ✅ força seletor de conta e evita erro 16
      await supabase.auth.signOut();

      const { result } = await SocialLogin.login({
        provider: 'google',
        options: {}
      });

      const googleIdToken = (result as any).idToken;

      if (!googleIdToken) {
        throw new Error('Não foi possível obter o token do Google.');
      }

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: googleIdToken,
      });

      if (error) throw error;

      // 🔄 O `onAuthStateChange` no App.tsx detectará o login e fará todo o processo de inicialização de forma segura.

    } catch (err: any) {
      console.error('Erro Google Login:', err);
      let errorMessage = err?.message || 'Erro desconhecido';
      const msgLower = errorMessage.toLowerCase();

      if (msgLower.includes('popup closed') || msgLower.includes('cancel')) {
        errorMessage = 'Login cancelado. Tente novamente.';
      } else if (msgLower.includes('network error') || msgLower.includes('offline') || msgLower.includes('failed to fetch')) {
        errorMessage = 'Erro de conexão. Verifique sua internet e tente novamente.';
      } else if (msgLower.includes('10:') || msgLower.includes('developer error') || msgLower.includes('16:')) {
        errorMessage = 'Erro de serviços do Google. Verifique se o Google Play Services está atualizado.';
      } else if (msgLower.includes('timeout')) {
        errorMessage = 'O tempo limite da conexão esgotou.';
      } else if (msgLower.includes('token')) {
        errorMessage = 'Ocorreu um erro de autenticação com o provedor.';
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

        <div className="flex flex-col items-center text-center mb-14">
          <LogoIcon className="h-32 w-32 mb-3 text-white drop-shadow-2xl" />
          <h1 className="text-4xl font-black uppercase tracking-tighter mb-3">
            SobControle
          </h1>
          <p className="text-slate-400 text-base font-medium leading-relaxed max-w-[280px]">
            Sua vida financeira organizada em um único lugar.
          </p>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs font-bold text-center animate-in fade-in slide-in-from-bottom-2 uppercase tracking-widest">
            {error}
          </div>
        )}

        <div className="space-y-8">
          <div className="flex items-start gap-4 px-2 p-4 bg-slate-900/50 rounded-2xl border border-slate-800">
            <input
              type="checkbox"
              id="terms"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="mt-0.5 h-5 w-5 rounded border-slate-700 bg-slate-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-900 cursor-pointer accent-blue-500 flex-shrink-0"
            />
            <label htmlFor="terms" className="text-xs text-slate-400 leading-relaxed cursor-pointer select-none">
              Eu li e concordo com os{' '}
              <span className="text-white hover:text-blue-400 font-bold transition-colors" onClick={(e) => { e.preventDefault(); handleOpenLink('https://sites.google.com/view/sobcontrole-termos-de-uso/in%C3%ADcio'); }}>
                Termos de Uso
              </span>{' '}
              e a{' '}
              <span className="text-white hover:text-blue-400 font-bold transition-colors" onClick={(e) => { e.preventDefault(); handleOpenLink('https://sites.google.com/view/sobcontrole-politicas/in%C3%ADcio'); }}>
                Política de Privacidade
              </span>.
            </label>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={isLoading || !agreedToTerms}
            className="w-full flex items-center justify-center bg-white text-slate-900 font-black py-4 px-4 rounded-2xl shadow-xl shadow-white/10 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"
          >
            {isLoading ? <LoaderIcon className="h-5 w-5 animate-spin mr-3 text-slate-500" /> : <GoogleIcon className="h-6 w-6 mr-3" />}
            Entrar com Google
          </button>

          {import.meta.env.DEV && (
            <button
              onClick={() => {
                localStorage.setItem("lastUserId", "dev-user-id");
                window.location.reload();
              }}
              className="w-full flex items-center justify-center bg-transparent border border-slate-700 text-slate-400 font-bold py-3 px-4 rounded-2xl hover:bg-slate-800 transition-all text-xs uppercase tracking-widest mt-4"
            >
              Acesso Dev (Bypass)
            </button>
          )}

        </div>
      </div>
    </div>
  );
};

export default LoginScreen;