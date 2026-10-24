import { assistantStates, type AssistantEvent, type AssistantState } from "@mahmood/contracts";
import {
  createFakeEventSource,
  createFaceAnimator,
  createFaceRenderer,
  fakeSpectrum,
  startFaceLoop,
} from "./face";

const SPECTRUM_BINS = 256;
const SPECTRUM_HZ_PER_BIN = 50;

const canvas = document.querySelector<HTMLCanvasElement>("#face");
const controls = document.querySelector<HTMLDivElement>("#controls");
if (!canvas || !controls) throw new Error("Dev page markup is missing");

const animator = createFaceAnimator();
const source = createFakeEventSource();

const stateButtons = new Map<AssistantState, HTMLButtonElement>();
const autoButton = document.createElement("button");

function showState(state: AssistantState) {
  for (const [name, button] of stateButtons)
    button.setAttribute("aria-pressed", String(name === state));
}

function setAuto(on: boolean) {
  autoButton.setAttribute("aria-pressed", String(on));
  if (on) source.start();
  else source.stop();
}

function handle(event: AssistantEvent) {
  animator.apply(event);
  if (event.type === "state") showState(event.state);
}

for (const state of assistantStates) {
  const button = document.createElement("button");
  button.textContent = state;
  button.addEventListener("click", () => {
    setAuto(false);
    handle({ type: "state", state });
  });
  stateButtons.set(state, button);
  controls.append(button);
}

autoButton.textContent = "auto cycle";
autoButton.addEventListener("click", () =>
  setAuto(autoButton.getAttribute("aria-pressed") !== "true"),
);
controls.append(autoButton);

source.subscribe(handle);

startFaceLoop({
  animator,
  renderer: createFaceRenderer(canvas),
  getAudio: () =>
    animator.state === "speaking"
      ? {
          bins: fakeSpectrum(performance.now() / 1000, SPECTRUM_BINS, SPECTRUM_HZ_PER_BIN),
          hzPerBin: SPECTRUM_HZ_PER_BIN,
        }
      : null,
  requestFrame: (callback) => requestAnimationFrame(callback),
  cancelFrame: (handle) => cancelAnimationFrame(handle),
});

setAuto(true);
