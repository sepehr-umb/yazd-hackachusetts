import { levelOf } from "./silence";

export type Recording = { level(): number; stop(): Promise<Blob> };

export type Microphone = { start(): Promise<Recording> };

export type MicrophoneDeps = {
  context: Pick<AudioContext, "resume" | "createMediaStreamSource" | "createAnalyser">;
  getUserMedia: (constraints: MediaStreamConstraints) => Promise<MediaStream>;
  createRecorder: (stream: MediaStream) => MediaRecorder;
};

export function createMicrophone({
  context,
  getUserMedia,
  createRecorder,
}: MicrophoneDeps): Microphone {
  return {
    async start() {
      await context.resume();
      const stream = await getUserMedia({ audio: true });
      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      source.connect(analyser);
      const samples = new Uint8Array(analyser.fftSize);
      const recorder = createRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => chunks.push(event.data);
      recorder.start();
      return {
        level() {
          analyser.getByteTimeDomainData(samples);
          return levelOf(samples);
        },
        stop() {
          return new Promise<Blob>((resolve) => {
            recorder.onstop = () => {
              stream.getTracks().forEach((track) => track.stop());
              source.disconnect();
              resolve(new Blob(chunks, { type: recorder.mimeType }));
            };
            recorder.stop();
          });
        },
      };
    },
  };
}
