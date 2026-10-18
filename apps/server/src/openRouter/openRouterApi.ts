export const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

export function errorMessageOf(payload: unknown): string {
  const message = (payload as { error?: { message?: unknown } } | null)?.error?.message;
  return typeof message === "string" ? message : JSON.stringify(payload);
}

export async function readErrorMessage(response: Response): Promise<string> {
  const text = await response.text();
  try {
    return errorMessageOf(JSON.parse(text));
  } catch {
    return text;
  }
}
