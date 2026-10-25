import { describe, expect, it } from "vitest";
import { isAssistantEvent } from "./isAssistantEvent";

const call = {
  type: "device_action",
  action: "whatsapp_call",
  contact: "مامان",
  phone: "+16175550100",
};

describe("device action events", () => {
  it.each(["whatsapp_call", "phone_call"])("accepts a %s", (action) => {
    expect(isAssistantEvent({ ...call, action })).toBe(true);
  });

  it("accepts a whatsapp message with text", () => {
    expect(isAssistantEvent({ ...call, action: "whatsapp_message", text: "سلام" })).toBe(true);
  });

  it("rejects a whatsapp message without text", () => {
    expect(isAssistantEvent({ ...call, action: "whatsapp_message" })).toBe(false);
  });

  it("rejects an unknown action", () => {
    expect(isAssistantEvent({ ...call, action: "fax" })).toBe(false);
  });

  it.each(["", 16175550100, undefined])("rejects phone %j", (phone) => {
    expect(isAssistantEvent({ ...call, phone })).toBe(false);
  });

  it("rejects a missing contact", () => {
    expect(isAssistantEvent({ type: "device_action", action: "phone_call", phone: "+1" })).toBe(
      false,
    );
  });

  it("survives a JSON round trip", () => {
    expect(isAssistantEvent(JSON.parse(JSON.stringify(call)))).toBe(true);
  });
});
