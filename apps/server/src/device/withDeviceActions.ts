import type { ToolInputs, ToolResult } from "@mahmood/contracts";
import type { Contact } from "@mahmood/contacts";
import type { EventBus, Tool, ToolSet } from "../orchestrator";

function phoneOf(name: string, contacts: Contact[]): string | undefined {
  const phone = contacts.find((contact) => contact.name === name)?.phone?.trim();
  return phone ? phone : undefined;
}

function noNumber(name: string): ToolResult {
  return { ok: true, output: { applied: false, reason: `No phone number saved for ${name}` } };
}

function calling(contacts: Contact[], bus: EventBus): Tool<"call_contact"> {
  return {
    name: "call_contact",
    async execute({ contact, via = "whatsapp" }: ToolInputs["call_contact"]) {
      const phone = phoneOf(contact, contacts);
      if (!phone) return noNumber(contact);
      const action = via === "phone" ? "phone_call" : "whatsapp_call";
      bus.emit({ type: "device_action", action, contact, phone });
      return { ok: true, output: { applied: true, via } };
    },
  };
}

function messaging(contacts: Contact[], bus: EventBus): Tool<"send_message"> {
  return {
    name: "send_message",
    async execute({ contact, text }: ToolInputs["send_message"]) {
      const phone = phoneOf(contact, contacts);
      if (!phone) return noNumber(contact);
      bus.emit({ type: "device_action", action: "whatsapp_message", contact, phone, text });
      return {
        ok: true,
        output: {
          applied: true,
          needsTap: true,
          note: "The message is open in WhatsApp. Tell the user to tap send.",
        },
      };
    },
  };
}

export function withDeviceActions(tools: ToolSet, contacts: Contact[], bus: EventBus): ToolSet {
  return {
    ...tools,
    call_contact: calling(contacts, bus),
    send_message: messaging(contacts, bus),
  };
}
