import type { AssistantEvent } from "@mahmood/contracts";

export type AssistantEventListener = (event: AssistantEvent) => void;

export type AssistantEventSource = {
  subscribe(listener: AssistantEventListener): () => void;
};
