import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createProfileStore, PROFILE_KEY } from "../profile/profileStore";
import { setupSurface } from "../setup/setupSurface";
import { shortcutsSurface } from "../shortcuts/shortcutsSurface";
import { mountForProfile } from "../surfaces/mountForProfile";
import { settingsFor } from "../surfaces/settingsFor";
import { createTestContext } from "../testing/testContext";
import { personalizeSurface } from "./personalizeSurface";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
});

function mounted() {
  const storage = new Map<string, string>();
  const context = createTestContext();
  context.profile = createProfileStore(storage);
  context.profile.update({ vision: "full", language: "it", name: "Maman" });
  const root = document.createElement("div");
  document.body.append(root);
  const unmount = mountForProfile({
    registry: [shortcutsSurface, personalizeSurface, setupSurface],
    settingsFor,
    root,
    context,
  });
  const open = () => root.querySelector<HTMLButtonElement>("[data-role=opener]")?.click();
  const sheet = () => root.querySelector<HTMLElement>('[data-surface="personalize"] [role=dialog]');
  return { storage, context, root, unmount, open, sheet };
}

describe("personalize Start over", () => {
  it("is the last row of the sheet, labelled in the profile's language", () => {
    const { open, sheet, unmount } = mounted();
    open();
    const last = sheet()?.lastElementChild as HTMLButtonElement;

    expect(last.dataset.role).toBe("start-over");
    expect(last.type).toBe("button");
    expect([last.textContent, last.lang, last.dir]).toEqual(["Ricomincia da capo", "it", "auto"]);
    unmount();
  });

  it("clears the saved profile and brings back the welcome", () => {
    const { storage, context, root, open, sheet, unmount } = mounted();
    open();

    (sheet()?.lastElementChild as HTMLButtonElement).click();

    expect(storage.has(PROFILE_KEY)).toBe(false);
    expect(context.profile.get().vision).toBeUndefined();
    expect([...root.querySelectorAll("section")].map((section) => section.dataset.surface)).toEqual(
      ["setup"],
    );
    const welcome = root.querySelector<HTMLElement>('[data-surface="setup"] [role=dialog]');
    expect(welcome?.hidden).toBe(false);
    expect(welcome?.dataset.step).toBe("welcome");
    unmount();
  });
});
