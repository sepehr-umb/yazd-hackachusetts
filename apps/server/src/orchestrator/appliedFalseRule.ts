export const appliedFalseRule =
  "If a tool result has applied false, the action did not happen: explain briefly in the user's language, the language the user spoke, ask one short question if it helps, and never mention tool names.";

export const contactChoiceRule =
  "When the result lists several matching contacts, ask one short question in the user's language naming up to 3 of the options from the result, and do not guess. When no contact matched, say so in the user's language and offer the closest names from the result, up to 3.";
