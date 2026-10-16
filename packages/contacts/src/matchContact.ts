import { normalizeText } from "./normalizeText";
import { similarity } from "./similarity";
import type { Contact, ContactMatch, MatchOptions } from "./types";

export const DEFAULT_THRESHOLD = 0.6;
export const DEFAULT_AMBIGUITY_MARGIN = 0.05;

export const matchContact = (
  query: string,
  contacts: Contact[],
  { threshold = DEFAULT_THRESHOLD, ambiguityMargin = DEFAULT_AMBIGUITY_MARGIN }: MatchOptions = {},
): ContactMatch => {
  const normalizedQuery = normalizeText(query);
  const candidates = contacts
    .map((contact) => ({
      contact,
      score: similarity(normalizedQuery, normalizeText(contact.name)),
    }))
    .filter((candidate) => candidate.score >= threshold)
    .sort((a, b) => b.score - a.score);
  const [top, runnerUp] = candidates;
  const ambiguous =
    top !== undefined && runnerUp !== undefined && top.score - runnerUp.score < ambiguityMargin;
  return { candidates, ambiguous };
};
