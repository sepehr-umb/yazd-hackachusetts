import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { registerStaticSite, resolveWithin } from "./staticSite";

let root: string;
let parent: string;
const openApps: FastifyInstance[] = [];

beforeEach(() => {
  parent = mkdtempSync(join(tmpdir(), "yazd-static-"));
  root = join(parent, "dist");
  mkdirSync(root);
  writeFileSync(join(root, "index.html"), "<!doctype html><title>home</title>");
  writeFileSync(join(root, "app.js"), "export const x = 1;\n");
  mkdirSync(join(root, "assets"));
  writeFileSync(join(root, "assets", "logo.svg"), "<svg></svg>");
  writeFileSync(join(parent, "secret.txt"), "TOP SECRET");
});

afterEach(async () => {
  await Promise.all(openApps.splice(0).map((app) => app.close()));
  rmSync(parent, { recursive: true, force: true });
});

function setup() {
  const app = Fastify();
  app.get("/speech/:id", async (_request, reply) => reply.code(404).send());
  app.post("/request", async (_request, reply) => reply.code(400).send({ error: "bad" }));
  registerStaticSite(app, root);
  openApps.push(app);
  return app;
}

describe("registerStaticSite", () => {
  it("serves index.html at the root path", async () => {
    const app = setup();

    const response = await app.inject({ method: "GET", url: "/" });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("text/html");
    expect(response.body).toContain("home");
  });

  it("serves a known static file with its content type", async () => {
    const app = setup();

    const response = await app.inject({ method: "GET", url: "/app.js" });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("javascript");
    expect(response.body).toContain("export const x");
  });

  it("serves a nested static asset", async () => {
    const app = setup();

    const response = await app.inject({ method: "GET", url: "/assets/logo.svg" });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("svg");
    expect(response.body).toContain("<svg>");
  });

  it("falls back to index.html for an unknown UI path", async () => {
    const app = setup();

    const response = await app.inject({ method: "GET", url: "/settings/voice" });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("text/html");
    expect(response.body).toContain("home");
  });

  it("does not intercept API routes, preserving their status and body", async () => {
    const app = setup();

    const speech = await app.inject({ method: "GET", url: "/speech/missing" });
    const request = await app.inject({ method: "POST", url: "/request", payload: {} });

    expect(speech.statusCode).toBe(404);
    expect(request.statusCode).toBe(400);
    expect(request.json()).toEqual({ error: "bad" });
  });

  it("never serves a file outside the root, whatever the client requests", async () => {
    const app = setup();
    const escapes = [
      "/../secret.txt",
      "/..%2fsecret.txt",
      "/%2e%2e/secret.txt",
      "/assets/../../secret.txt",
      "/./../secret.txt",
    ];

    for (const url of escapes) {
      const response = await app.inject({ method: "GET", url });
      expect(response.body).not.toContain("TOP SECRET");
    }
  });
});

describe("resolveWithin", () => {
  it("resolves an in-root path to the file under the root", () => {
    const resolution = resolveWithin(root, "assets/logo.svg");

    expect(resolution).toEqual({ kind: "file", path: join(root, "assets", "logo.svg") });
  });

  it("treats the empty path as the root itself", () => {
    expect(resolveWithin(root, "")).toEqual({ kind: "root" });
  });

  it.each([
    "../secret.txt",
    "../../secret.txt",
    "assets/../../secret.txt",
    "..",
    "../",
  ])("rejects %j as an escape instead of resolving a file", (requestPath) => {
    const resolution = resolveWithin(root, requestPath);

    expect(resolution.kind).toBe("escape");
    expect(resolution).not.toHaveProperty("path", join(parent, "secret.txt"));
  });

  it("rejects a path whose characters cannot be decoded", () => {
    expect(resolveWithin(root, "%E0%A4%A").kind).toBe("escape");
  });
});
