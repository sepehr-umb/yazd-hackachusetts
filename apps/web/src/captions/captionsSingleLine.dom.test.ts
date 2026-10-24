import { describe, expect, it } from "vitest";
import { createTestContext } from "../testing/testContext";
import { captionsSurface } from "./captionsSurface";

function mounted() {
  const context = createTestContext();
  const host = document.createElement("section");
  captionsSurface.mount(host, context);
  const english = () => host.querySelector<HTMLElement>('[data-role="english"]');
  const say = (text: string, translation: string) =>
    context.emit({ type: "caption", speaker: "assistant", text, english: translation });
  return { english, say };
}

describe("captions surface with an identical translation", () => {
  it("shows only the original line when the English matches it", () => {
    const { english, say } = mounted();

    say("Calling Mom now", "Calling Mom now");

    expect(english()?.hidden).toBe(true);
  });

  it("shows the English line again when the next caption differs", () => {
    const { english, say } = mounted();
    say("Calling Mom now", "Calling Mom now");

    say("دارم زنگ می‌زنم", "Calling now");

    expect(english()?.hidden).toBe(false);
    expect(english()?.textContent).toBe("Calling now");
  });
});
