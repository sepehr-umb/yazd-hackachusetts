import type { AssistantEvent } from "@mahmood/contracts";
import { strings } from "@mahmood/strings";

export type Tone = "neutral" | "success" | "error";

export type EventDescription = { text: string; tone: Tone };

function describeValue(value: string | number | boolean): string {
  if (typeof value === "boolean") {
    return value ? strings.settings.valueLabels.on : strings.settings.valueLabels.off;
  }
  return String(value);
}

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
    case "setting_changed":
      return {
        text: strings.settings.changed(
          strings.settings.names[event.name],
          describeValue(event.value),
        ),
        tone: "neutral",
      };
    case "settings_reset":
      return { text: strings.settings.reset, tone: "neutral" };
  }
}
