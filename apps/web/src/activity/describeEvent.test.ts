import type { AssistantEvent } from "@mahmood/contracts";
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
});
