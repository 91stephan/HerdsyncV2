import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.d79a399b404f4892b2ee7e7a48a1d26e',
  appName: 'herdsync',
  webDir: 'dist',
  server: {
    url: 'https://d79a399b-404f-4892-b2ee-7e7a48a1d26e.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    Keyboard: {
      // Pushes the WebView up so focused inputs aren't covered by the keyboard.
      resize: 'body',
      resizeOnFullScreen: true,
      style: 'DEFAULT',
    },
  },
};

export default config;
