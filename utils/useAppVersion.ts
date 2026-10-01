import { useEffect, useState } from 'react';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

/**
 * Versão do app instalado (versionName do Android, ex.: "1.9.2").
 * No navegador (npm run dev) não há app instalado: devolve "dev".
 */
export const useAppVersion = (): string => {
  const [version, setVersion] = useState(Capacitor.isNativePlatform() ? '' : 'dev');

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    CapApp.getInfo()
      .then(info => setVersion(info.version))
      .catch(() => setVersion(''));
  }, []);

  return version;
};
