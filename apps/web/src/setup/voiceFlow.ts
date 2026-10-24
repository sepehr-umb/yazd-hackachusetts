import { strings } from "@mahmood/strings";
import type { Language } from "../profile/languages";
import type { Vision } from "../profile/profile";
import type { TranscribeClient, Transcription } from "../request/transcribeClient";
import type { VoiceSession } from "../voice/voiceSession";
import { classifyVisionAnswer } from "./classifyVisionAnswer";
import type { Narrator } from "./narrator";

export type VoiceFlowDeps = {
  session: VoiceSession;
  transcribe: TranscribeClient;
  narrator: Narrator;
  onLanguage(language: Language | undefined): void;
  onVision(language: Language, vision: Vision): void;
};

export type VoiceFlow = {
  greet(): void;
  ask(language: Language): void;
  answer(language: Language): void;
  cancel(): void;
};

const MAX_TRIES = 2;

export function createVoiceFlow({
  session,
  transcribe,
  narrator,
  ...on
}: VoiceFlowDeps): VoiceFlow {
  let turn = 0;

  const hear = async (recording: Promise<Blob | undefined>): Promise<Transcription | undefined> => {
    const blob = await recording;
    if (!blob) return undefined;
    return transcribe.transcribe(blob).catch(() => undefined);
  };

  const listenFor = async (
    language: Language,
    tries: number,
    recording: Promise<Blob | undefined>,
  ) => {
    const mine = ++turn;
    const heard = await hear(recording);
    if (mine !== turn) return;
    const vision = heard ? classifyVisionAnswer(heard.text, language) : undefined;
    if (vision) return on.onVision(language, vision);
    if (tries + 1 >= MAX_TRIES) return;
    narrator.say(strings.setup[language].sayAgain, language, () => {
      if (mine === turn) void listenFor(language, tries + 1, session.listen());
    });
  };

  const ask = (language: Language) => {
    const mine = ++turn;
    narrator.say(strings.setup[language].visionQuestionSpoken, language, () => {
      if (mine === turn) void listenFor(language, 0, session.listen());
    });
  };

  return {
    greet() {
      const mine = ++turn;
      void hear(session.capture()).then((heard) => {
        if (mine === turn) on.onLanguage(heard?.language);
      });
    },
    ask,
    answer(language) {
      void listenFor(language, 0, session.capture());
    },
    cancel() {
      turn += 1;
      session.cancel();
      narrator.cancel();
    },
  };
}
