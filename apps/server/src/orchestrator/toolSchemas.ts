import { mediaActions } from "@mahmood/contracts";
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
  media_control: {
    name: "media_control",
    description: "Control TV playback, or start something by title.",
    inputSchema: {
      type: "object",
      properties: {
        action: { type: "string", enum: mediaActions },
        query: { type: "string", description: "Title to play, when the user named one" },
      },
      required: ["action"],
    },
  },
  ask_for_clarification: {
    name: "ask_for_clarification",
    description: "Ask the user one short follow-up question in Farsi.",
    inputSchema: {
      type: "object",
      properties: { question: { type: "string" } },
      required: ["question"],
    },
  },
};
