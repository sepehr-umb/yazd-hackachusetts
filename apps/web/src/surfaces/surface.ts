import type { AssistantEventSource } from "../events/assistantEventSource";
import type { AudioFrame } from "../face/faceAnimator";
import type { RecordingClient } from "../request/recordingClient";
import type { RequestClient } from "../request/requestClient";
import type { Chime } from "../voice/chime";
import type { Microphone } from "../voice/microphone";

export type SurfaceContext = {
  events: AssistantEventSource;
  requests: RequestClient;
  recordings: RecordingClient;
  microphone: Microphone;
  chime: Chime;
  speech: { frame(): AudioFrame | null };
};

export type Unmount = () => void;

export type Surface = {
  id: string;
  mount(host: HTMLElement, context: SurfaceContext): Unmount;
};

export type Settings = { surfaces: Record<string, boolean> };
