import { strings } from "@mahmood/strings";
import { startFlip } from "../flip/startFlip";
import type { ProfileStore } from "../profile/profileStore";
import type { Unmount } from "../surfaces/surface";
import type { VoiceSession } from "../voice/voiceSession";
import type { FrameScheduler } from "./companionLoop";

export type LowVisionDeps = FrameScheduler & {
  host: HTMLElement;
  button: HTMLButtonElement;
  session: VoiceSession;
  profile: ProfileStore;
  reducedMotion: () => boolean;
};

export function mountLowVision({
  host,
  button,
  session,
  profile,
  ...rest
}: LowVisionDeps): Unmount {
  const hint = host.ownerDocument.createElement("p");
  hint.dataset.role = "hint";
  hint.dir = "auto";
  host.append(hint);
  const showHint = () => {
    const { language } = profile.get();
    hint.lang = language;
    hint.textContent = strings.flip[language].hint;
  };
  showHint();
  const unsubscribe = profile.subscribe(showHint);
  button.dataset.flip = "";
  const flip = startFlip({
    element: button,
    phase: () => session.phase,
    palette: () => ({ idle: profile.get().flipIdle, listening: profile.get().flipListening }),
    ...rest,
  });
  return () => {
    flip.stop();
    unsubscribe();
    delete button.dataset.flip;
    hint.remove();
  };
}
