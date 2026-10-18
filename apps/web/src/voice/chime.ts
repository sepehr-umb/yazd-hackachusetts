export type ChimeContext = Pick<
  AudioContext,
  "currentTime" | "destination" | "createOscillator" | "createGain"
>;

export type ChimeKind = "start" | "stop";

export type Chime = (kind: ChimeKind) => void;

const NOTE_SECONDS = 0.1;
const VOLUME = 0.2;
const RISING_HZ = [660, 880];

export function playChime(context: ChimeContext, kind: ChimeKind): void {
  const notes = kind === "start" ? RISING_HZ : [...RISING_HZ].reverse();
  const volume = context.createGain();
  volume.gain.value = VOLUME;
  volume.connect(context.destination);
  notes.forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    oscillator.frequency.value = frequency;
    oscillator.connect(volume);
    oscillator.start(context.currentTime + index * NOTE_SECONDS);
    oscillator.stop(context.currentTime + (index + 1) * NOTE_SECONDS);
  });
}
