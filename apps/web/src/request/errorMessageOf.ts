import { strings } from "@mahmood/strings";

export function errorMessageOf(payload: unknown): string {
  const message = (payload as { error?: unknown } | null)?.error;
  return typeof message === "string" ? message : strings.request.unexpectedResponse;
}
