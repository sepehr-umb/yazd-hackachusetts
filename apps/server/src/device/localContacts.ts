import type { Contact } from "@mahmood/contacts";
import type { Env } from "../llm/selectLlmClient";

type Entry = Record<string, unknown>;

function isText(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

function isEntry(value: unknown): value is Entry {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toContact(entry: unknown, index: number): Contact {
  if (!isEntry(entry) || !isText(entry.name) || !isText(entry.phone)) {
    throw new Error(`Local contacts entry ${index + 1} needs a name and a phone`);
  }
  const { aliases } = entry;
  if (aliases !== undefined && !(Array.isArray(aliases) && aliases.every(isText))) {
    throw new Error(`Local contacts entry ${index + 1} has aliases that are not text`);
  }
  const contact: Contact = { id: String(index + 1), name: entry.name, phone: entry.phone };
  return aliases === undefined ? contact : { ...contact, aliases };
}

export function parseContacts(value: unknown): Contact[] {
  if (!Array.isArray(value)) throw new Error("Local contacts must be a list");
  return value.map(toContact);
}

export function loadLocalContacts(env: Env, read: (path: string) => string): Contact[] | undefined {
  const path = env.CONTACTS_FILE?.trim();
  if (!path) return undefined;
  return parseContacts(JSON.parse(read(path)));
}
