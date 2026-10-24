import ambiguousTurnOn from "../orchestrator/fixtures/ambiguousTurnOn.json";
import callAhmadi from "../orchestrator/fixtures/callAhmadi.json";
import callMom from "../orchestrator/fixtures/callMom.json";
import clock from "../orchestrator/fixtures/clock.json";
import lightOn from "../orchestrator/fixtures/lightOn.json";
import pauseTv from "../orchestrator/fixtures/pauseTv.json";
import resetSettings from "../orchestrator/fixtures/resetSettings.json";
import speakSlower from "../orchestrator/fixtures/speakSlower.json";
import unroutable from "../orchestrator/fixtures/unroutable.json";
import type { RecordedConversation } from "../orchestrator/testing/replayLlmClient";

export const replayConversations = [
  callMom,
  callAhmadi,
  lightOn,
  pauseTv,
  ambiguousTurnOn,
  speakSlower,
  resetSettings,
  clock,
  unroutable,
] as RecordedConversation[];
