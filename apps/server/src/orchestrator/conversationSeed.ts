import type { LlmMessage } from "./llmClient";

export type ConversationHistory = { request: string; question: string };

export function conversationSeed(answer: string, history?: ConversationHistory): LlmMessage[] {
  if (!history) return [{ role: "user", content: answer }];
  return [
    { role: "user", content: history.request },
    { role: "assistant", content: [{ type: "text", text: history.question }] },
    { role: "user", content: answer },
  ];
}
