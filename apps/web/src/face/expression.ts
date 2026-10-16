import type { AssistantState } from "@mahmood/contracts";
import type { FaceParams } from "./faceParams";

const idle: FaceParams = { mouthOpen: 0, mouthWidth: 0.6, mouthRound: 0, blink: 0, browRaise: 0 };

const expressions: Record<AssistantState, FaceParams> = {
  idle,
  listening: { ...idle, browRaise: 0.6 },
  thinking: idle,
  speaking: idle,
  error: idle,
};

export function expressionFor(state: AssistantState): FaceParams {
  return { ...expressions[state] };
}
