export type LlmToolSchema = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
};

export type LlmTextBlock = { type: "text"; text: string };

export type LlmToolUseBlock = {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
};

export type LlmToolResultBlock = {
  type: "tool_result";
  toolUseId: string;
  content: string;
  isError: boolean;
};

export type LlmMessage =
  | { role: "user"; content: string | LlmToolResultBlock[] }
  | { role: "assistant"; content: Array<LlmTextBlock | LlmToolUseBlock> };

export type LlmRequest = {
  system: string;
  messages: LlmMessage[];
  tools: LlmToolSchema[];
};

export type LlmResponse = {
  content: Array<LlmTextBlock | LlmToolUseBlock>;
  stopReason: "end_turn" | "tool_use";
};

export interface LlmClient {
  complete(request: LlmRequest): Promise<LlmResponse>;
}
