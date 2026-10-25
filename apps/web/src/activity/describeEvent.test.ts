import type { AssistantEvent } from "@mahmood/contracts";
import { strings } from "@mahmood/strings";
import { describe, expect, it } from "vitest";
import { describeEvent } from "./describeEvent";

describe("describeEvent", () => {
  it.each<[AssistantEvent, string, string]>([
    [{ type: "transcript", text: "به مامان زنگ بزن" }, "Request: به مامان زنگ بزن", "neutral"],
    [{ type: "state", state: "thinking" }, "State: thinking", "neutral"],
    [{ type: "state", state: "error" }, "State: error", "error"],
    [{ type: "agent", agent: "comms" }, "Agent: comms", "neutral"],
    [
      { type: "tool_call", tool: "call_contact", status: "started" },
      "Tool call_contact: started",
      "neutral",
    ],
    [
      { type: "tool_call", tool: "call_contact", status: "succeeded" },
      "Tool call_contact: succeeded",
      "success",
    ],
    [
      { type: "tool_call", tool: "call_contact", status: "failed" },
      "Tool call_contact: failed",
      "error",
    ],
    [{ type: "speech", audioUrl: "/audio/1.mp3" }, "Speech: /audio/1.mp3", "neutral"],
    [
      { type: "caption", speaker: "user", text: "به مامان زنگ بزن", english: "Call mom" },
      "You said: به مامان زنگ بزن · English: Call mom",
      "neutral",
    ],
    [
      { type: "caption", speaker: "assistant", text: "دارم زنگ می‌زنم", english: "Calling mom" },
      "Assistant said: دارم زنگ می‌زنم · English: Calling mom",
      "neutral",
    ],
  ])("describes %j as %j with tone %s", (event, text, tone) => {
    expect(describeEvent(event)).toEqual({ text, tone });
  });

  it("describes a numeric setting change using the strings package", () => {
    expect(describeEvent({ type: "setting_changed", name: "speechRate", value: 0.8 })).toEqual({
      text: strings.settings.changed(strings.settings.names.speechRate, "0.8"),
      tone: "neutral",
    });
  });

  it("describes a boolean setting change with the on and off labels", () => {
    expect(describeEvent({ type: "setting_changed", name: "highContrast", value: false })).toEqual({
      text: strings.settings.changed(
        strings.settings.names.highContrast,
        strings.settings.valueLabels.off,
      ),
      tone: "neutral",
    });
  });

  it("describes a settings reset using the strings package", () => {
    expect(describeEvent({ type: "settings_reset" })).toEqual({
      text: strings.settings.reset,
      tone: "neutral",
    });
  });

  it("describes a device action using the strings package", () => {
    expect(
      describeEvent({
        type: "device_action",
        action: "whatsapp_call",
        contact: "Mom",
        phone: "+16175550100",
      }),
    ).toEqual({ text: strings.activity.deviceAction("whatsapp_call", "Mom"), tone: "success" });
  });
});
