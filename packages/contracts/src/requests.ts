import type { AgentName } from "./events";
import type { ToolName } from "./tools";

export type SubAgentName = Exclude<AgentName, "orchestrator">;

export type TypedRequest = { text: string; language?: string };

export const languageHeader = "x-yazd-language";

const languageCodePattern = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$/;

export const isLanguageCode = (value: unknown): value is string =>
  typeof value === "string" && languageCodePattern.test(value);

export type RequestFailure =
  | { reason: "tool_failed"; tool: ToolName; error: string }
  | { reason: "invalid_tool_call"; tool: string }
  | { reason: "too_many_steps" }
  | { reason: "unroutable" }
  | { reason: "llm_error"; message: string };

export type RequestResult =
  | { status: "succeeded"; agent: SubAgentName; reply: string }
  | { status: "clarification"; agent: "clarifier"; question: string }
  | { status: "failed"; agent?: SubAgentName; failure: RequestFailure };
