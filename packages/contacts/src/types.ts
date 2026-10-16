export type Contact = {
  id: string;
  name: string;
};

export type ContactCandidate = {
  contact: Contact;
  score: number;
};

export type ContactMatch = {
  candidates: ContactCandidate[];
  ambiguous: boolean;
};

export type MatchOptions = {
  threshold?: number;
};
