import { readFile } from "node:fs/promises";
import { join, normalize, resolve, sep, extname } from "node:path";
import type { FastifyInstance, FastifyReply } from "fastify";

const contentTypes: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".wav": "audio/wav",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".map": "application/json; charset=utf-8",
};

function contentTypeOf(path: string): string {
  return contentTypes[extname(path).toLowerCase()] ?? "application/octet-stream";
}

export type Resolution =
  | { kind: "file"; path: string }
  | { kind: "root" }
  | { kind: "escape" };

export function resolveWithin(root: string, requestPath: string): Resolution {
  const decoded = decodeRequestPath(requestPath);
  if (decoded === undefined) return { kind: "escape" };
  const base = resolve(root);
  const target = resolve(base, "." + sep + normalize(decoded));
  if (target === base) return { kind: "root" };
  if (!target.startsWith(base + sep)) return { kind: "escape" };
  return { kind: "file", path: target };
}

function decodeRequestPath(requestPath: string): string | undefined {
  try {
    return decodeURIComponent(requestPath);
  } catch {
    return undefined;
  }
}

async function readIfPresent(path: string): Promise<Buffer | undefined> {
  try {
    return await readFile(path);
  } catch {
    return undefined;
  }
}

export function registerStaticSite(app: FastifyInstance, root: string): void {
  const indexPath = join(root, "index.html");

  const serveIndex = async (reply: FastifyReply) => {
    const index = await readIfPresent(indexPath);
    if (index === undefined) return reply.code(404).send();
    return reply.type(contentTypeOf(indexPath)).send(index);
  };

  app.get("/", async (_request, reply) => serveIndex(reply));

  app.get("/*", async (request, reply) => {
    const requestPath = (request.params as Record<string, string>)["*"] ?? "";
    const resolution = resolveWithin(root, requestPath);

    if (resolution.kind === "escape") return reply.code(404).send();

    if (resolution.kind === "file") {
      const file = await readIfPresent(resolution.path);
      if (file !== undefined) {
        return reply.type(contentTypeOf(resolution.path)).send(file);
      }
    }

    return serveIndex(reply);
  });
}
