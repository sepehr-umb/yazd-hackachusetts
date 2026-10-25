import { callMethods, mediaActions, settingSchemas } from "@mahmood/contracts";
import type { ToolName } from "@mahmood/contracts";
import type { LlmToolSchema } from "./llmClient";

export const toolSchemas: Record<ToolName, LlmToolSchema> = {
  call_contact: {
    name: "call_contact",
    description: "Place a phone call to a contact from the user's address book.",
    inputSchema: {
      type: "object",
      properties: {
        contact: { type: "string", description: "Contact name as the user said it" },
        via: {
          type: "string",
          enum: [...callMethods],
          description: "whatsapp by default; phone only when the user asks for a regular call",
        },
      },
      required: ["contact"],
    },
  },
  send_message: {
    name: "send_message",
    description: "Send a text message to a contact from the user's address book.",
    inputSchema: {
      type: "object",
      properties: {
        contact: { type: "string", description: "Contact name as the user said it" },
        text: { type: "string", description: "The message to send, in the user's words" },
      },
      required: ["contact", "text"],
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
    description: "Ask the user one short follow-up question in the user's language.",
    inputSchema: {
      type: "object",
      properties: { question: { type: "string" } },
      required: ["question"],
    },
  },
  update_setting: {
    name: "update_setting",
    description:
      "Set one assistant setting to an absolute value. speechRate: number from 0.5 to 1.5. captionSize: small, medium, large or extra-large. highContrast: true or false. silenceWaitMs: integer from 800 to 4000.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", enum: Object.keys(settingSchemas) },
        value: { description: "The new absolute value for the setting" },
      },
      required: ["name", "value"],
    },
  },
  reset_settings: {
    name: "reset_settings",
    description: "Restore every assistant setting to its normal default.",
    inputSchema: { type: "object", properties: {} },
  },
  get_time: {
    name: "get_time",
    description: "Return the current time (hour and minute) and the current day of the week.",
    inputSchema: { type: "object", properties: {} },
  },
};
