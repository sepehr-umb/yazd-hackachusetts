import { matchContact } from "./matchContact";
import type { Contact } from "./types";

export const closestContacts = (query: string, contacts: Contact[], limit = 3): Contact[] =>
  matchContact(query, contacts, { threshold: 0 })
    .candidates.filter((candidate) => candidate.score > 0)
    .slice(0, limit)
    .map((candidate) => candidate.contact);
