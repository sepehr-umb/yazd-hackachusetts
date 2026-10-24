import { describe, expect, it } from "vitest";
import { conversationSeed } from "./conversationSeed";

describe("conversationSeed", () => {
  it("is one user message without history", () => {
    expect(conversationSeed("حسین")).toEqual([{ role: "user", content: "حسین" }]);
  });

  it("is request, question, answer in user, assistant, user order with history", () => {
    const seed = conversationSeed("حسین", {
      request: "به احمدی زنگ بزن",
      question: "حسین احمدی یا حسن احمدی؟",
    });

    expect(seed).toEqual([
      { role: "user", content: "به احمدی زنگ بزن" },
      { role: "assistant", content: [{ type: "text", text: "حسین احمدی یا حسن احمدی؟" }] },
      { role: "user", content: "حسین" },
    ]);
  });
});
