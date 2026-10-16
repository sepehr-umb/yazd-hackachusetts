import type { LlmMessage } from "../orchestrator/llmClient";

export type ChatMessage =
  | { role: "system" | "user"; content: string }
  | {
      role: "assistant";
      content: string | null;
      tool_calls?: Array<{
        id: string;
        type: "function";
        function: { name: string; arguments: string };
      }>;
    }
  | { role: "tool"; tool_call_id: string; content: string };

function fromMessage(message: LlmMessage): ChatMessage[] {
  if (message.role === "user") {
    if (typeof message.content === "string") return [{ role: "user", content: message.content }];
    return message.content.map((result) => ({
      role: "tool",
      tool_call_id: result.toolUseId,
      content: result.isError ? `Error: ${result.content}` : result.content,
    }));
  }
  const text = message.content.flatMap((block) => (block.type === "text" ? [block.text] : []));
  const toolCalls = message.content.flatMap((block) =>
    block.type === "tool_use"
      ? [
          {
            id: block.id,
            type: "function" as const,
            function: { name: block.name, arguments: JSON.stringify(block.input) },
          },
        ]
      : [],
  );
  return [
    {
      role: "assistant",
      content: text.length > 0 ? text.join("") : null,
      ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
    },
  ];
}

export function toChatMessages(system: string, messages: LlmMessage[]): ChatMessage[] {
  return [{ role: "system", content: system }, ...messages.flatMap(fromMessage)];
}
