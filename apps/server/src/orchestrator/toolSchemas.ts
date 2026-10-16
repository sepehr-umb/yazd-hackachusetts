import type { ToolName } from "@mahmood/contracts";
import type { LlmToolSchema } from "./llmClient";

export const toolSchemas: Partial<Record<ToolName, LlmToolSchema>> = {
  call_contact: {
    name: "call_contact",
    description: "Place a phone call to a contact from the user's address book.",
    inputSchema: {
      type: "object",
      properties: { contact: { type: "string", description: "Contact name as the user said it" } },
      required: ["contact"],
    },
  },
};
