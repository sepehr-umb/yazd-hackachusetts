import { randomUUID } from "node:crypto";
import type { ToolInputs, ToolResult } from "@mahmood/contracts";
import type { Env } from "../llm/selectLlmClient";
import type { Tool } from "../orchestrator";

const CONTROL_URL = "https://openapi.api.govee.com/router/api/v1/device/control";

export type GoveeConfig = { apiKey: string; sku: string; device: string; fetch?: typeof fetch };

type Capability = { type: string; instance: string; value: number };

const power = (on: boolean): Capability => ({
  type: "devices.capabilities.on_off",
  instance: "powerSwitch",
  value: on ? 1 : 0,
});

const brightness = (value: number): Capability => ({
  type: "devices.capabilities.range",
  instance: "brightness",
  value,
});

function commandsFor({ on, brightness: level }: ToolInputs["set_light"]): Capability[] {
  if (!on || level === 0) return [power(false)];
  return level === undefined ? [power(true)] : [power(true), brightness(level)];
}

async function send(config: GoveeConfig, capability: Capability): Promise<string | undefined> {
  const response = await (config.fetch ?? fetch)(CONTROL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Govee-API-Key": config.apiKey },
    body: JSON.stringify({
      requestId: randomUUID(),
      payload: { sku: config.sku, device: config.device, capability },
    }),
  });
  const body = (await response.json().catch(() => ({}))) as { code?: number; msg?: string };
  if (response.ok && body.code === 200) return undefined;
  return `Light refused the command (${body.code ?? response.status} ${body.msg ?? ""})`.trim();
}

export function createGoveeLight(config: GoveeConfig): Tool<"set_light"> {
  return {
    name: "set_light",
    async execute(input): Promise<ToolResult> {
      try {
        for (const capability of commandsFor(input)) {
          const error = await send(config, capability);
          if (error) return { ok: false, error };
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { ok: false, error: `Light unreachable: ${message}` };
      }
      const on = input.on && input.brightness !== 0;
      const output =
        on && input.brightness !== undefined
          ? { applied: true, on, brightness: input.brightness }
          : { applied: true, on };
      return { ok: true, output };
    },
  };
}

export function selectGoveeLight(env: Env, fetchFn?: typeof fetch): Tool<"set_light"> | undefined {
  const apiKey = env.GOVEE_API_KEY?.trim();
  const sku = env.GOVEE_SKU?.trim();
  const device = env.GOVEE_DEVICE?.trim();
  if (!apiKey || !sku || !device) return undefined;
  return createGoveeLight({ apiKey, sku, device, fetch: fetchFn });
}
