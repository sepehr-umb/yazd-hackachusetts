import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { orbCharacter } from "../characters/orbCharacter";
import { mountCompanion } from "./companionHarness";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
});

describe("companion hint", () => {
  it("sits right under the character saying tap to talk in the profile's language, and shows no name", () => {
    const { context, host, button } = mountCompanion([orbCharacter], "full");
    const hint = host.querySelector<HTMLElement>("[data-role=hint]");

    expect(button.nextElementSibling).toBe(hint);
    expect(hint?.textContent).toBe("برای صحبت ضربه بزنید");
    expect(hint?.getAttribute("aria-hidden")).toBe("true");
    context.profile.update({ language: "en" });
    expect(hint?.textContent).toBe("Tap to talk");
    expect(host.querySelector("[data-role=name]")).toBeNull();
  });

  it("shows the status word while a session runs, then the hint again", async () => {
    const { context, host, click } = mountCompanion([orbCharacter], "full");
    context.profile.update({ language: "en" });
    const release = context.holdReply();
    const hint = () => host.querySelector("[data-role=hint]")?.textContent;

    await click();
    expect(hint()).toBe("Listening");
    await click();
    expect(hint()).toBe("Thinking");
    release({ status: "succeeded", agent: "comms", reply: "ok" });
    await vi.advanceTimersByTimeAsync(0);
    expect(hint()).toBe("Tap to talk");
  });
});
