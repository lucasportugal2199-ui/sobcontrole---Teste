
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sobcontrole.app',
  appName: 'SobControle',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    allowNavigation: [
      'generativelanguage.googleapis.com',
      '*.googleapis.com',
      'ksxsynsbfqvrcnhzvytk.supabase.co'
    ]
  },
  plugins: {
    StatusBar: {
      style: 'dark',
      overlaysWebView: true,
      backgroundColor: '#111827'
    },
    Keyboard: {
      resize: 'native',
      style: 'dark',
      resizeOnFullScreen: true,
    },
    SocialLogin: {
      providers: {
        google: true,
        facebook: false,
        apple: false,
        twitter: false,
      },
    },
  },
  android: {
    buildOptions: {
      releaseType: 'AAB',
    },
  }
};

export default config;
