import { fileURLToPath } from "node:url";
import { createApp } from "./app";

const DEFAULT_PORT = 8787;
const IDLE_AFTER_MS = 4000;

const port = Number(process.env.PORT) || DEFAULT_PORT;
const staticDir = fileURLToPath(new URL("../../web/dist", import.meta.url));

const app = createApp(process.env, { idleAfterMs: IDLE_AFTER_MS, staticDir });

await app.listen({ port, host: "0.0.0.0" });
