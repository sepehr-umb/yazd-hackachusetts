import type { ToolName } from "@mahmood/contracts";
import type { SubAgentName } from "./result";

export type AgentDefinition = { system: string; tools: ToolName[] };

export const agentDefinitions: Record<SubAgentName, AgentDefinition> = {
  comms: {
    system:
      "You handle phone calls and text messages for an elderly Farsi-speaking user. Use the tools to act on the request. After the tool succeeds, confirm in one short Farsi sentence.",
    tools: ["call_contact", "send_message"],
  },
  home: {
    system:
      "You control smart home devices for an elderly Farsi-speaking user. Use the tools to act on the request. After the tool succeeds, confirm in one short Farsi sentence.",
    tools: ["set_light"],
  },
  media: {
    system:
      "You control the TV and media playback for an elderly Farsi-speaking user. Use the tools to act on the request. After the tool succeeds, confirm in one short Farsi sentence.",
    tools: ["media_control"],
  },
  clarifier: {
    system:
      "The user's request was ambiguous. Call ask_for_clarification once with one short Farsi question that resolves the ambiguity. Do not guess.",
    tools: ["ask_for_clarification"],
  },
};
