import fc from "fast-check";

type Recorded = { url: string; headers: Record<string, string>; body: Record<string, unknown> };

export function recordingFetch(respond: () => Response) {
  const calls: Recorded[] = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    calls.push({
      url: String(input),
      headers: init?.headers as Record<string, string>,
      body: JSON.parse(String(init?.body)),
    });
    return respond();
  };
  return { fetchImpl, calls };
}

export const whitespace = fc
  .array(fc.constantFrom(" ", "\t", "\n"), { maxLength: 4 })
  .map((chars) => chars.join(""));
export const word = fc.stringMatching(/^[A-Za-z0-9]{1,12}$/);
export const maybeText = fc.option(fc.string(), { nil: undefined });
export const providerBytes = fc
  .uint8Array({ maxLength: 64 })
  .map((bytes) => Buffer.from(bytes));
export const contentType = fc.option(fc.constantFrom("audio/mpeg", "audio/ogg", "audio/x-test"), {
  nil: undefined,
});
export const mp3Setting = fc.oneof(
  fc.constant(undefined),
  whitespace,
  whitespace.chain((pad) => fc.constant(`${pad}mp3${pad}`)),
);
export const modelId = word.map((id) => `vendor/${id}`);

export function responseFor(bytes: Buffer, type: string | undefined) {
  return new Response(
    new Uint8Array(bytes),
    type ? { headers: { "content-type": type } } : undefined,
  );
}
