import type { ToolName } from "@mahmood/contracts";
import type { SubAgentName } from "./result";

export type AgentDefinition = { system: string; tools: ToolName[] };

export const agentDefinitions: Partial<Record<SubAgentName, AgentDefinition>> = {
  comms: {
    system:
      "You handle phone calls for an elderly Farsi-speaking user. Use the tools to act on the request. After the tool succeeds, confirm in one short Farsi sentence.",
    tools: ["call_contact"],
  },
  home: {
    system:
      "You control smart home devices for an elderly Farsi-speaking user. Use the tools to act on the request. After the tool succeeds, confirm in one short Farsi sentence.",
    tools: ["set_light"],
  },
};
