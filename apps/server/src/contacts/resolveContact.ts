import { matchContact } from "@mahmood/contacts";
import type { Contact } from "@mahmood/contacts";

export type ContactResolution = { ok: true; name: string } | { ok: false; error: string };

export function resolveContact(query: string, contacts: Contact[]): ContactResolution {
  const { candidates, ambiguous } = matchContact(query, contacts);
  const [match] = candidates;
  if (!match) return { ok: false, error: `No contact matches "${query}"` };
  if (ambiguous) {
    const names = candidates.map((candidate) => candidate.contact.name).join(", ");
    return { ok: false, error: `Several contacts match "${query}": ${names}` };
  }
  return { ok: true, name: match.contact.name };
}
