import type { AssistantState } from "@mahmood/contracts";
import type { CompanionParams } from "./companionParams";

export type OrbRenderer = { render(params: CompanionParams, state: AssistantState): void };

const PRECISION = 4;

export function createOrbRenderer(orb: HTMLElement): OrbRenderer {
  return {
    render(params, state) {
      for (const [name, value] of Object.entries(params)) {
        orb.style.setProperty(`--${name}`, String(Number(value.toFixed(PRECISION))));
      }
      orb.dataset.state = state;
    },
  };
}
