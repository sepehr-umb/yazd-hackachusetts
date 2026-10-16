import { normalizeText } from "./normalizeText";
import { similarity } from "./similarity";
import type { Contact, ContactMatch } from "./types";

export const matchContact = (query: string, contacts: Contact[]): ContactMatch => {
  const normalizedQuery = normalizeText(query);
  return {
    candidates: contacts.map((contact) => ({
      contact,
      score: similarity(normalizedQuery, normalizeText(contact.name)),
    })),
    ambiguous: false,
  };
};
