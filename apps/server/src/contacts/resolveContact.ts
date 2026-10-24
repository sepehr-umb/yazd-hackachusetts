import { closestContacts, matchContact } from "@mahmood/contacts";
import type { Contact } from "@mahmood/contacts";

const MAX_CLOSEST = 3;

export type ContactResolution =
  | { ok: true; name: string }
  | { ok: false; reason: "no_match" | "ambiguous"; closest: string[] };

export function resolveContact(query: string, contacts: Contact[]): ContactResolution {
  const { candidates, ambiguous } = matchContact(query, contacts);
  const [match] = candidates;
  if (!match) {
    const closest = closestContacts(query, contacts, MAX_CLOSEST).map((contact) => contact.name);
    return { ok: false, reason: "no_match", closest };
  }
  if (ambiguous) {
    const closest = candidates.slice(0, MAX_CLOSEST).map((candidate) => candidate.contact.name);
    return { ok: false, reason: "ambiguous", closest };
  }
  return { ok: true, name: match.contact.name };
}
