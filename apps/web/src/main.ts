import { eventsUrl } from "./events/eventsUrl";
import { createLiveEventSource } from "./events/liveEventSource";
import { createRequestClient } from "./request/requestClient";
import { mountSurfaces } from "./surfaces/mountSurfaces";
import { defaultSettings, surfaceRegistry } from "./surfaces/registry";

const root = document.querySelector<HTMLElement>("#app");
if (!root) throw new Error("Page markup is missing #app");

const events = createLiveEventSource({ url: eventsUrl(location) });

mountSurfaces({
  registry: surfaceRegistry,
  settings: defaultSettings,
  root,
  context: { events, requests: createRequestClient() },
});

events.start();
