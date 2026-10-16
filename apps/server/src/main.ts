import { createApp } from "./app";

const PORT = 8787;
const IDLE_AFTER_MS = 4000;

const app = createApp(process.env, { idleAfterMs: IDLE_AFTER_MS });

await app.listen({ port: PORT, host: "127.0.0.1" });
