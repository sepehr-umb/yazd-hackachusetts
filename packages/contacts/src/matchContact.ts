import { normalizeText } from "./normalizeText";
import { similarity } from "./similarity";
import type { Contact, ContactMatch, MatchOptions } from "./types";

export const DEFAULT_THRESHOLD = 0.6;

export const matchContact = (
  query: string,
  contacts: Contact[],
  { threshold = DEFAULT_THRESHOLD }: MatchOptions = {},
): ContactMatch => {
  const normalizedQuery = normalizeText(query);
  return {
    candidates: contacts
      .map((contact) => ({
        contact,
        score: similarity(normalizedQuery, normalizeText(contact.name)),
      }))
      .filter((candidate) => candidate.score >= threshold)
      .sort((a, b) => b.score - a.score),
    ambiguous: false,
  };
};
