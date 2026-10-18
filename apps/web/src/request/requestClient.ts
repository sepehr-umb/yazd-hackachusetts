import { isRequestResult } from "@mahmood/contracts";
import { strings } from "@mahmood/strings";
import type { RequestResult, TypedRequest } from "@mahmood/contracts";
import { errorMessageOf } from "./errorMessageOf";

export type RequestClient = { submit(text: string): Promise<RequestResult> };

export type RequestClientConfig = { fetch?: typeof fetch; url?: string };

export function createRequestClient({
  fetch: fetchImpl = (input, init) => fetch(input, init),
  url = "/request",
}: RequestClientConfig = {}): RequestClient {
  return {
    async submit(text) {
      const body: TypedRequest = { text };
      const response = await fetchImpl(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload: unknown = await response.json();
      if (!response.ok) throw new Error(errorMessageOf(payload));
      if (!isRequestResult(payload)) throw new Error(strings.request.unexpectedResponse);
      return payload;
    },
  };
}
