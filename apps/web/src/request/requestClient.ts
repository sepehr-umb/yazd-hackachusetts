import type { RequestResult, TypedRequest } from "@mahmood/contracts";

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
      return (await response.json()) as RequestResult;
    },
  };
}
