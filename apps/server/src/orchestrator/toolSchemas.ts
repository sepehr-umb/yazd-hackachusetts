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
  set_light: {
    name: "set_light",
    description: "Turn a light on or off in a room, optionally setting brightness from 0 to 100.",
    inputSchema: {
      type: "object",
      properties: {
        room: { type: "string", description: "Room name as the user said it" },
        on: { type: "boolean" },
        brightness: { type: "number", minimum: 0, maximum: 100 },
      },
      required: ["room", "on"],
    },
  },
};
