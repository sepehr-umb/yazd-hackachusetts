import ambiguousTurnOn from "../orchestrator/fixtures/ambiguousTurnOn.json";
import callMom from "../orchestrator/fixtures/callMom.json";
import lightOn from "../orchestrator/fixtures/lightOn.json";
import pauseTv from "../orchestrator/fixtures/pauseTv.json";
import unroutable from "../orchestrator/fixtures/unroutable.json";
import type { RecordedConversation } from "../orchestrator/testing/replayLlmClient";

export const replayConversations = [
  callMom,
  lightOn,
  pauseTv,
  ambiguousTurnOn,
  unroutable,
] as RecordedConversation[];
