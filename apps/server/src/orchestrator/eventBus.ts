import type { AssistantEvent } from "@mahmood/contracts";

export interface EventBus {
  emit(event: AssistantEvent): void;
}
