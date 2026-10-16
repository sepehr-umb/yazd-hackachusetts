import { toolNames } from "./tools";
import type { ToolName } from "./tools";

export function isToolName(value: unknown): value is ToolName {
  return typeof value === "string" && (toolNames as readonly string[]).includes(value);
}
