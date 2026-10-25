import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.yazd.assistant",
  appName: "yazd",
  webDir: "www",
  server: {
    url: process.env.YAZD_SERVER_URL ?? "http://localhost:8787",
    cleartext: true,
  },
};

export default config;
