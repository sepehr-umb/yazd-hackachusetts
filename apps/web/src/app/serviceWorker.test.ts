import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("../../public/sw.js", import.meta.url), "utf8");

type Handler = (event: Record<string, unknown>) => void;

function loadWorker() {
  const handlers = new Map<string, Handler>();
  const stores = new Map<string, Map<string, string>>([["yazd-old", new Map([["/x", "old"]])]]);
  const calls = { skipWaiting: 0, claim: 0, fetched: [] as string[] };
  let online = true;
  const self = {
    addEventListener: (type: string, handler: Handler) => handlers.set(type, handler),
    skipWaiting: async () => {
      calls.skipWaiting += 1;
    },
    clients: {
      claim: async () => {
        calls.claim += 1;
      },
    },
  };
  const caches = {
    open: async (name: string) => {
      const store = stores.get(name) ?? new Map<string, string>();
      stores.set(name, store);
      return { add: async (url: string) => void store.set(url, `cached ${url}`) };
    },
    keys: async () => [...stores.keys()],
    delete: async (name: string) => stores.delete(name),
    match: async (url: string) => [...stores.values()].find((store) => store.has(url))?.get(url),
  };
  const fetch = async (request: { url: string }) => {
    calls.fetched.push(request.url);
    if (!online) throw new TypeError("Failed to fetch");
    return `network ${request.url}`;
  };
  new Function("self", "caches", "fetch", source)(self, caches, fetch);
  const dispatch = async (type: string, extra: Record<string, unknown> = {}) => {
    let waited: Promise<unknown> | undefined;
    let answer: Promise<unknown> | undefined;
    handlers.get(type)?.({
      ...extra,
      waitUntil: (promise: Promise<unknown>) => {
        waited = promise;
      },
      respondWith: (promise: Promise<unknown>) => {
        answer = promise;
      },
    });
    await waited;
    return { answered: answer !== undefined, response: await answer };
  };
  const navigate = (url: string) => dispatch("fetch", { request: { url, mode: "navigate" } });
  const goOffline = () => {
    online = false;
  };
  return { stores, calls, dispatch, navigate, goOffline };
}

describe("service worker", () => {
  it("caches only the offline page when it installs, and takes over at once", async () => {
    const worker = loadWorker();

    await worker.dispatch("install");

    const caches = [...worker.stores.entries()].filter(([name]) => name !== "yazd-old");
    expect(caches.map(([, store]) => [...store.keys()])).toEqual([["/offline.html"]]);
    expect(worker.calls.skipWaiting).toBe(1);
  });

  it("removes older caches when it activates", async () => {
    const worker = loadWorker();
    await worker.dispatch("install");

    await worker.dispatch("activate");

    expect([...worker.stores.keys()]).not.toContain("yazd-old");
    expect(worker.stores.size).toBe(1);
    expect(worker.calls.claim).toBe(1);
  });

  it("answers a navigation from the network while online", async () => {
    const worker = loadWorker();
    await worker.dispatch("install");

    expect((await worker.navigate("/")).response).toBe("network /");
  });

  it("answers a failed navigation with the cached offline page", async () => {
    const worker = loadWorker();
    await worker.dispatch("install");
    worker.goOffline();

    expect((await worker.navigate("/")).response).toBe("cached /offline.html");
  });

  it("leaves every other request alone, so a deploy is never stale", async () => {
    const worker = loadWorker();
    await worker.dispatch("install");

    const asset = await worker.dispatch("fetch", {
      request: { url: "/assets/main.js", mode: "cors" },
    });

    expect(asset.answered).toBe(false);
    expect(worker.calls.fetched).toEqual([]);
  });
});
