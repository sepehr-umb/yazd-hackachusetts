import { matchContact } from "@mahmood/contacts";
import type { Contact } from "@mahmood/contacts";
import type { Tool, ToolSet } from "../orchestrator";

export function withContactResolution(tools: ToolSet, contacts: Contact[]): ToolSet {
  const callContact: Tool<"call_contact"> = {
    name: "call_contact",
    async execute(input) {
      const { candidates, ambiguous } = matchContact(input.contact, contacts);
      const [match] = candidates;
      if (!match) return { ok: false, error: `No contact matches "${input.contact}"` };
      if (ambiguous) {
        const names = candidates.map((candidate) => candidate.contact.name).join(", ");
        return { ok: false, error: `Several contacts match "${input.contact}": ${names}` };
      }
      const name = match.contact.name;
      const result = await tools.call_contact.execute({ contact: name });
      return result.ok ? { ok: true, output: { ...result.output, contact: name } } : result;
    },
  };
  return { ...tools, call_contact: callContact };
}
