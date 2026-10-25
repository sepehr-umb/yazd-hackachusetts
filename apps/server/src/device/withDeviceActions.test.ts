import type { AssistantEvent } from "@mahmood/contracts";
import type { Contact } from "@mahmood/contacts";
import { describe, expect, it } from "vitest";
import { createStubTools } from "../orchestrator";
import { withContactResolution } from "../contacts/withContactResolution";
import { withDeviceActions } from "./withDeviceActions";

const contacts: Contact[] = [
  { id: "1", name: "فاطمه", aliases: ["مامان", "Mom"], phone: "+16175550100" },
  { id: "2", name: "Ali", phone: "" },
];

function setup() {
  const events: AssistantEvent[] = [];
  const bus = { emit: (event: AssistantEvent) => events.push(event) };
  const tools = withContactResolution(
    withDeviceActions(createStubTools().tools, contacts, bus),
    contacts,
  );
  return { tools, events };
}

describe("withDeviceActions", () => {
  it("emits a WhatsApp call for the resolved contact by default", async () => {
    const { tools, events } = setup();

    const result = await tools.call_contact.execute({ contact: "مامان" });

    expect(events).toEqual([
      { type: "device_action", action: "whatsapp_call", contact: "فاطمه", phone: "+16175550100" },
    ]);
    expect(result).toEqual({
      ok: true,
      output: { applied: true, via: "whatsapp", contact: "فاطمه" },
    });
  });

  it("emits a regular phone call when asked via phone", async () => {
    const { tools, events } = setup();

    await tools.call_contact.execute({ contact: "Mom", via: "phone" });

    expect(events[0]).toMatchObject({ action: "phone_call", phone: "+16175550100" });
  });

  it("opens a WhatsApp message and says the user must tap send", async () => {
    const { tools, events } = setup();

    const result = await tools.send_message.execute({ contact: "Mom", text: "دیر میام" });

    expect(events).toEqual([
      {
        type: "device_action",
        action: "whatsapp_message",
        contact: "فاطمه",
        phone: "+16175550100",
        text: "دیر میام",
      },
    ]);
    expect(result).toMatchObject({ ok: true, output: { applied: true, needsTap: true } });
  });

  it("reports applied false and emits nothing when the contact has no number", async () => {
    const { tools, events } = setup();

    const result = await tools.call_contact.execute({ contact: "Ali" });

    expect(events).toEqual([]);
    expect(result).toMatchObject({ ok: true, output: { applied: false } });
  });

  it("emits nothing when nobody matches", async () => {
    const { tools, events } = setup();

    await tools.call_contact.execute({ contact: "Zebediah" });

    expect(events).toEqual([]);
  });
});
