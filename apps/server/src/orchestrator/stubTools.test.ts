import { describe, expect, it } from "vitest";
import { toolNames } from "@mahmood/contracts";
import type { ToolInputs } from "@mahmood/contracts";
import { createStubTools } from "./stubTools";

const sampleInputs: ToolInputs = {
  call_contact: { contact: "مامان" },
  send_message: { contact: "مامان", text: "سلام" },
  set_light: { room: "اتاق خواب", on: true },
  media_control: { action: "pause" },
  ask_for_clarification: { question: "کدام چراغ؟" },
};

describe("stub tools", () => {
  it("provides all five tools", () => {
    const { tools } = createStubTools();
    expect(Object.keys(tools).sort()).toEqual([...toolNames].sort());
  });

  it.each(toolNames)("%s records its call and returns success", async (name) => {
    const { tools, calls } = createStubTools();
    const tool = tools[name] as { execute(input: unknown): Promise<{ ok: boolean }> };

    const result = await tool.execute(sampleInputs[name]);

    expect(result.ok).toBe(true);
    expect(calls).toEqual([{ tool: name, input: sampleInputs[name] }]);
  });

  it("records calls across tools in order", async () => {
    const { tools, calls } = createStubTools();

    await tools.call_contact.execute({ contact: "مامان" });
    await tools.set_light.execute({ room: "آشپزخانه", on: false });

    expect(calls.map((call) => call.tool)).toEqual(["call_contact", "set_light"]);
  });

  it("echoes the question from ask_for_clarification so it can be spoken back", async () => {
    const { tools } = createStubTools();

    const result = await tools.ask_for_clarification.execute({ question: "کدام چراغ؟" });

    expect(result).toEqual({ ok: true, output: { question: "کدام چراغ؟" } });
  });

  it("fails with the configured error and still records the call", async () => {
    const { tools, calls } = createStubTools({ failures: { call_contact: "no network" } });

    const result = await tools.call_contact.execute({ contact: "مامان" });

    expect(result).toEqual({ ok: false, error: "no network" });
    expect(calls).toEqual([{ tool: "call_contact", input: { contact: "مامان" } }]);
  });

  it("only fails the configured tool", async () => {
    const { tools } = createStubTools({ failures: { call_contact: "no network" } });

    const result = await tools.set_light.execute({ room: "آشپزخانه", on: true });

    expect(result).toEqual({ ok: true });
  });
});
