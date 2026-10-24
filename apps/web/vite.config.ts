import { defineConfig } from "vite";

const serverTarget = "http://127.0.0.1:8787";

export default defineConfig({
  server: {
    proxy: {
      "/request": serverTarget,
      "/audio": serverTarget,
      "/transcribe": serverTarget,
      "/speech": serverTarget,
      "/events": { target: serverTarget, ws: true },
    },
  },
  build: {
    rollupOptions: { input: { main: "index.html", dev: "dev.html" } },
  },
});
