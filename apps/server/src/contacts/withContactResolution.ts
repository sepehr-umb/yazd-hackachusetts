import type { ToolInputs, ToolResult } from "@mahmood/contracts";
import type { Contact } from "@mahmood/contacts";
import type { Tool, ToolSet } from "../orchestrator";
import { resolveContact } from "./resolveContact";

type ContactTool = "call_contact" | "send_message";

const missReasons = {
  no_match: "No contact matched",
  ambiguous: "Several contacts matched",
} as const;

function resolving<N extends ContactTool>(tool: Tool<N>, contacts: Contact[]): Tool<N> {
  return {
    name: tool.name,
    async execute(input: ToolInputs[N]): Promise<ToolResult> {
      const resolution = resolveContact(input.contact, contacts);
      if (!resolution.ok) {
        return {
          ok: true,
          output: {
            applied: false,
            reason: missReasons[resolution.reason],
            closest: resolution.closest,
          },
        };
      }
      const result = await tool.execute({ ...input, contact: resolution.name });
      return result.ok
        ? { ok: true, output: { ...result.output, contact: resolution.name } }
        : result;
    },
  };
}

export function withContactResolution(tools: ToolSet, contacts: Contact[]): ToolSet {
  return {
    ...tools,
    call_contact: resolving(tools.call_contact, contacts),
    send_message: resolving(tools.send_message, contacts),
  };
}
