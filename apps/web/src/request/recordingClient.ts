import { isRequestResult, languageHeader } from "@mahmood/contracts";
import { strings } from "@mahmood/strings";
import type { RequestResult } from "@mahmood/contracts";
import { errorMessageOf } from "./errorMessageOf";

export type RecordingClient = { submit(recording: Blob): Promise<RequestResult> };

export type RecordingClientConfig = {
  fetch?: typeof fetch;
  url?: string;
  getLanguage?: () => string | undefined;
};

export function createRecordingClient({
  fetch: fetchImpl = (input, init) => fetch(input, init),
  url = "/audio",
  getLanguage = () => undefined,
}: RecordingClientConfig = {}): RecordingClient {
  return {
    async submit(recording) {
      const language = getLanguage();
      const headers: Record<string, string> = { "content-type": recording.type };
      if (language !== undefined) headers[languageHeader] = language;
      const response = await fetchImpl(url, { method: "POST", headers, body: recording });
      const payload: unknown = await response.json();
      if (!response.ok) throw new Error(errorMessageOf(payload));
      if (!isRequestResult(payload)) throw new Error(strings.request.unexpectedResponse);
      return payload;
    },
  };
}
