import type { AddressInfo } from "node:net";
import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../app";
import lightOn from "../orchestrator/fixtures/lightOn.json";

const openApps: FastifyInstance[] = [];

afterEach(async () => {
  await Promise.all(openApps.splice(0).map((app) => app.close()));
});

describe("Govee light through createApp", () => {
  it("sends the light command to Govee when GOVEE variables are set", async () => {
    const urls: string[] = [];
    const fetchFn: typeof fetch = async (input) => {
      urls.push(String(input));
      return Response.json({ code: 200 });
    };
    const app = createApp(
      { GOVEE_API_KEY: "k", GOVEE_SKU: "H60B0", GOVEE_DEVICE: "11:F3" },
      { fetch: fetchFn },
    );
    openApps.push(app);
    await app.listen({ port: 0, host: "127.0.0.1" });
    const { port } = app.server.address() as AddressInfo;

    await fetch(`http://127.0.0.1:${port}/request`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: lightOn.transcript }),
    });

    expect(urls).toContain("https://openapi.api.govee.com/router/api/v1/device/control");
  });
});
