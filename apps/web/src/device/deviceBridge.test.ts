import type { AssistantEvent } from "@mahmood/contracts";
import { describe, expect, it } from "vitest";
import type { AssistantEventListener } from "../events/assistantEventSource";
import { startDeviceBridge } from "./deviceBridge";
import type { DeviceRequest } from "./deviceBridge";

function fakeEvents() {
  const listeners = new Set<AssistantEventListener>();
  return {
    subscribe(listener: AssistantEventListener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    emit(event: AssistantEvent) {
      listeners.forEach((listener) => listener(event));
    },
  };
}

function setup(fail?: Error) {
  const events = fakeEvents();
  const performed: DeviceRequest[] = [];
  const errors: unknown[] = [];
  const stop = startDeviceBridge({
    events,
    device: {
      async perform(request) {
        performed.push(request);
        if (fail) throw fail;
      },
    },
    onError: (error) => errors.push(error),
  });
  return { events, performed, errors, stop };
}

describe("startDeviceBridge", () => {
  it("hands a WhatsApp call to the device", () => {
    const { events, performed } = setup();

    events.emit({ type: "device_action", action: "whatsapp_call", contact: "Mom", phone: "+1617" });

    expect(performed).toEqual([{ action: "whatsapp_call", phone: "+1617" }]);
  });

  it("passes the message text for a WhatsApp message", () => {
    const { events, performed } = setup();

    events.emit({
      type: "device_action",
      action: "whatsapp_message",
      contact: "Mom",
      phone: "+1617",
      text: "سلام",
    });

    expect(performed).toEqual([{ action: "whatsapp_message", phone: "+1617", text: "سلام" }]);
  });

  it("ignores every other event", () => {
    const { events, performed } = setup();

    events.emit({ type: "state", state: "speaking" });
    events.emit({ type: "tool_call", tool: "call_contact", status: "succeeded" });

    expect(performed).toEqual([]);
  });

  it("reports device failures instead of throwing", async () => {
    const { events, errors } = setup(new Error("no WhatsApp"));

    events.emit({ type: "device_action", action: "phone_call", contact: "Mom", phone: "+1617" });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(errors).toEqual([new Error("no WhatsApp")]);
  });

  it("stops listening when stopped", () => {
    const { events, performed, stop } = setup();

    stop();
    events.emit({ type: "device_action", action: "phone_call", contact: "Mom", phone: "+1617" });

    expect(performed).toEqual([]);
  });
});
