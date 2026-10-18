import { isRequestResult } from "@mahmood/contracts";
import { strings } from "@mahmood/strings";
import type { RequestResult } from "@mahmood/contracts";
import { errorMessageOf } from "./errorMessageOf";

export type RecordingClient = { submit(recording: Blob): Promise<RequestResult> };

export type RecordingClientConfig = { fetch?: typeof fetch; url?: string };

export function createRecordingClient({
  fetch: fetchImpl = (input, init) => fetch(input, init),
  url = "/audio",
}: RecordingClientConfig = {}): RecordingClient {
  return {
    async submit(recording) {
      const response = await fetchImpl(url, {
        method: "POST",
        headers: { "content-type": recording.type },
        body: recording,
      });
      const payload: unknown = await response.json();
      if (!response.ok) throw new Error(errorMessageOf(payload));
      if (!isRequestResult(payload)) throw new Error(strings.request.unexpectedResponse);
      return payload;
    },
  };
}
