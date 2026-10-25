import { describe, expect, it } from "vitest";
import { createGoveeLight, selectGoveeLight } from "./goveeLight";

type Sent = { url: string; headers: Record<string, string>; body: { payload: unknown } };

function recordingFetch(reply: () => Response = () => Response.json({ code: 200 })) {
  const sent: Sent[] = [];
  const fetchFn: typeof fetch = async (input, init) => {
    sent.push({
      url: String(input),
      headers: init?.headers as Record<string, string>,
      body: JSON.parse(String(init?.body)),
    });
    return reply();
  };
  return { sent, fetchFn };
}

const config = { apiKey: "govee-key", sku: "H60B0", device: "11:F3" };

function capabilities(sent: Sent[]) {
  return sent.map((request) => (request.body.payload as { capability: unknown }).capability);
}

describe("createGoveeLight", () => {
  it("turns the light on with the key header and device payload", async () => {
    const { sent, fetchFn } = recordingFetch();
    const light = createGoveeLight({ ...config, fetch: fetchFn });

    const result = await light.execute({ room: "kitchen", on: true });

    expect(sent[0]?.url).toBe("https://openapi.api.govee.com/router/api/v1/device/control");
    expect(sent[0]?.headers["Govee-API-Key"]).toBe("govee-key");
    expect(sent[0]?.body.payload).toMatchObject({ sku: "H60B0", device: "11:F3" });
    expect(capabilities(sent)).toEqual([
      { type: "devices.capabilities.on_off", instance: "powerSwitch", value: 1 },
    ]);
    expect(result).toEqual({ ok: true, output: { applied: true, on: true } });
  });

  it("turns the light off", async () => {
    const { sent, fetchFn } = recordingFetch();

    await createGoveeLight({ ...config, fetch: fetchFn }).execute({ room: "kitchen", on: false });

    expect(capabilities(sent)).toEqual([
      { type: "devices.capabilities.on_off", instance: "powerSwitch", value: 0 },
    ]);
  });

  it("turns on and then sets brightness", async () => {
    const { sent, fetchFn } = recordingFetch();
    const light = createGoveeLight({ ...config, fetch: fetchFn });

    const result = await light.execute({ room: "kitchen", on: true, brightness: 30 });

    expect(capabilities(sent)).toEqual([
      { type: "devices.capabilities.on_off", instance: "powerSwitch", value: 1 },
      { type: "devices.capabilities.range", instance: "brightness", value: 30 },
    ]);
    expect(result).toEqual({ ok: true, output: { applied: true, on: true, brightness: 30 } });
  });

  it("treats brightness 0 as off", async () => {
    const { sent, fetchFn } = recordingFetch();

    await createGoveeLight({ ...config, fetch: fetchFn }).execute({
      room: "kitchen",
      on: true,
      brightness: 0,
    });

    expect(capabilities(sent)).toEqual([
      { type: "devices.capabilities.on_off", instance: "powerSwitch", value: 0 },
    ]);
  });

  it("fails without leaking the key when Govee rejects the request", async () => {
    const { fetchFn } = recordingFetch(() => Response.json({ code: 400, msg: "offline" }));

    const result = await createGoveeLight({ ...config, fetch: fetchFn }).execute({
      room: "kitchen",
      on: true,
    });

    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).not.toContain("govee-key");
  });

  it("fails when the network throws", async () => {
    const fetchFn: typeof fetch = async () => {
      throw new Error("network down");
    };

    const result = await createGoveeLight({ ...config, fetch: fetchFn }).execute({
      room: "kitchen",
      on: true,
    });

    expect(result).toEqual({ ok: false, error: "Light unreachable: network down" });
  });
});

describe("selectGoveeLight", () => {
  it("returns a light only when key, sku and device are all set", () => {
    const full = { GOVEE_API_KEY: "k", GOVEE_SKU: "s", GOVEE_DEVICE: "d" };

    expect(selectGoveeLight(full)).toBeDefined();
    expect(selectGoveeLight({ ...full, GOVEE_DEVICE: " " })).toBeUndefined();
    expect(selectGoveeLight({})).toBeUndefined();
  });
});
