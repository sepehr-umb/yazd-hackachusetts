import type { AssistantEvent } from "@mahmood/contracts";
import { strings } from "@mahmood/strings";

export type Tone = "neutral" | "success" | "error";

export type EventDescription = { text: string; tone: Tone };

export function describeEvent(event: AssistantEvent): EventDescription {
  switch (event.type) {
    case "transcript":
      return { text: strings.activity.request(event.text), tone: "neutral" };
    case "state":
      return {
        text: strings.activity.state(event.state),
        tone: event.state === "error" ? "error" : "neutral",
      };
    case "agent":
      return { text: strings.activity.agent(event.agent), tone: "neutral" };
    case "tool_call":
      return {
        text: strings.activity.toolCall(event.tool, event.status),
        tone: { started: "neutral", succeeded: "success", failed: "error" }[event.status] as Tone,
      };
    case "speech":
      return { text: strings.activity.speech(event.audioUrl), tone: "neutral" };
    case "caption":
      return {
        text:
          event.speaker === "user"
            ? strings.activity.userCaption(event.text, event.english)
            : strings.activity.assistantCaption(event.text, event.english),
        tone: "neutral",
      };
  }
}
