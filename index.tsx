import React from 'react';
import ReactDOM from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import App from './App';
// Fonte embutida no app (antes vinha do Google Fonts: sem internet, caía na fonte do sistema)
import '@fontsource-variable/inter/wght.css';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// O SobControle só é distribuído como app Android. Fora do `npm run dev`,
// não abre no navegador nem em outras plataformas.
const isSupportedPlatform = import.meta.env.DEV || Capacitor.getPlatform() === 'android';

const UnsupportedPlatform = () => (
  <div className="h-full flex flex-col items-center justify-center gap-3 p-6 text-center">
    <h1 className="text-xl font-bold">SobControle</h1>
    <p className="text-slate-600 dark:text-slate-400">
      O SobControle está disponível apenas no app Android.
    </p>
    <a
      className="text-brand-accent font-semibold"
      href="https://play.google.com/store/apps/details?id=com.sobcontrole.app"
    >
      Baixar na Google Play
    </a>
  </div>
);

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    {isSupportedPlatform ? <App /> : <UnsupportedPlatform />}
  </React.StrictMode>
);
