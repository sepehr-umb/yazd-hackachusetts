import type { VoicePhase } from "../voice/voiceSession";
import { inkFor } from "./color";

export type FlipPalette = { idle: string; listening: string };
export type FlipState = { color: string; ink: string; flash: boolean };
export type FlipMemory = { target?: string; flashes: readonly number[] };

export const FLASH_COLOR = "#FFFFFF";
export const FLASH_MS = 120;
const FLASH_WINDOW_MS = 1000;
const MAX_FLASHES_PER_WINDOW = 3;

export const initialFlip: FlipMemory = { flashes: [] };

function nextFlashes(memory: FlipMemory, target: string, nowMs: number, reducedMotion: boolean) {
  const recent = memory.flashes.filter((at) => nowMs - at < FLASH_WINDOW_MS);
  const changed = memory.target !== undefined && memory.target !== target;
  if (!changed || reducedMotion || recent.length >= MAX_FLASHES_PER_WINDOW) return recent;
  return [...recent, nowMs];
}

export function flipState(
  memory: FlipMemory,
  phase: VoicePhase,
  nowMs: number,
  palette: FlipPalette,
  reducedMotion = false,
): { memory: FlipMemory; state: FlipState } {
  const target = phase === "recording" ? palette.listening : palette.idle;
  const flashes = nextFlashes(memory, target, nowMs, reducedMotion);
  const lastFlash = flashes.at(-1);
  const flash = lastFlash !== undefined && nowMs - lastFlash < FLASH_MS;
  const color = flash ? FLASH_COLOR : target;
  return { memory: { target, flashes }, state: { color, ink: inkFor(color), flash } };
}
