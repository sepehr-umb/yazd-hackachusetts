import { matchContact } from "@mahmood/contacts";
import type { Contact } from "@mahmood/contacts";
import type { Tool, ToolSet } from "../orchestrator";

export function withContactResolution(tools: ToolSet, contacts: Contact[]): ToolSet {
  const callContact: Tool<"call_contact"> = {
    name: "call_contact",
    async execute(input) {
      const [match] = matchContact(input.contact, contacts).candidates;
      const result = await tools.call_contact.execute({ contact: match!.contact.name });
      return result.ok ? { ok: true, output: { ...result.output, contact: match!.contact.name } } : result;
    },
  };
  return { ...tools, call_contact: callContact };
}
