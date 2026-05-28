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
};

export default config;
