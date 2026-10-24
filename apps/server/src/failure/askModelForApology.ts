import type { LlmClient } from "../orchestrator";

export const APOLOGY_TIMEOUT_MS = 3000;

const apologySystemPrompt =
  "The user made a request that could not be completed. Reply with one short, kind apology in the user's language, " +
  "saying you could not do that and asking them to try again. Use plain everyday words and no technical terms. " +
  "Reply with the apology only.";

async function requestApology(llm: LlmClient, requestText: string): Promise<string | undefined> {
  const response = await llm.complete({
    system: apologySystemPrompt,
    messages: [{ role: "user", content: requestText }],
    tools: [],
  });
  const block = response.content.find((item) => item.type === "text");
  const text = block?.type === "text" ? block.text.trim() : "";
  return text.length > 0 ? text : undefined;
}

export async function askModelForApology(
  llm: LlmClient,
  requestText: string,
  timeoutMs: number = APOLOGY_TIMEOUT_MS,
): Promise<string | undefined> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<undefined>((resolve) => {
    timer = setTimeout(() => resolve(undefined), timeoutMs);
  });
  try {
    return await Promise.race([requestApology(llm, requestText), timeout]);
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}
