import type { AssistantEventSource } from "../events/assistantEventSource";
import type { RequestClient } from "../request/requestClient";

export type SurfaceContext = { events: AssistantEventSource; requests: RequestClient };

export type Unmount = () => void;

export type Surface = {
  id: string;
  mount(host: HTMLElement, context: SurfaceContext): Unmount;
};

export type Settings = { surfaces: Record<string, boolean> };
