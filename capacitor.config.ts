import type { CapacitorConfig } from '@capacitor/cli';

const developmentServerUrl = process.env.CAPACITOR_SERVER_URL?.trim();

const config: CapacitorConfig = {
  appId: 'com.IAuniver.storehub',
  appName: 'StoreHub',
  webDir: 'dist-mobile',
  server: developmentServerUrl
    ? {
        url: developmentServerUrl,
        cleartext: developmentServerUrl.startsWith('http://'),
      }
    : {
        androidScheme: 'https',
      },
  android: {
    allowMixedContent: false,
  },
};

export default config;
