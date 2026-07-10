import type { CapacitorConfig } from "@capacitor/cli";

const serverUrl =
  process.env.CAPACITOR_SERVER_URL ?? "https://vocali-zeta.vercel.app/";

const config: CapacitorConfig = {
  appId: "com.vocali.app",
  appName: "Vocali",
  webDir: "public",
  server: {
    url: serverUrl,
    cleartext: false,
  },
  ios: {
    allowsLinkPreview: false,
  },
  plugins: {
    SocialLogin: {
      providers: {
        apple: true,
        facebook: false,
        google: false,
        twitter: false,
      },
    },
  },
};

export default config;
