import { describe, expect, it } from "vitest";
import { createProfileStore } from "../profile/profileStore";
import { createViewChoices } from "./viewChoices";

function made(onChoose?: () => void) {
  const profile = createProfileStore(new Map());
  profile.update({ vision: "full", language: "en" });
  const view = createViewChoices(document, profile, onChoose);
  const buttons = () => [...view.element.querySelectorAll("button")];
  return { profile, view, buttons };
}

describe("view choices", () => {
  it("offers Full, Low and Minimal in the profile's language, marking the current one", () => {
    const { view, buttons } = made();

    expect(view.element.querySelector("legend")?.textContent).toBe("View");
    expect(buttons().map((button) => [button.textContent, button.lang, button.type])).toEqual([
      ["Full", "en", "button"],
      ["Low", "en", "button"],
      ["Minimal", "en", "button"],
    ]);
    expect(buttons().map((button) => button.getAttribute("aria-pressed"))).toEqual([
      "true",
      "false",
      "false",
    ]);
  });

  it("applies a choice at once and tells the caller first", () => {
    const log: string[] = [];
    const { profile, buttons } = made(() => log.push(`chosen while ${profile.get().vision}`));

    buttons()[2]?.click();

    expect(log).toEqual(["chosen while full"]);
    expect(profile.get().vision).toBe("minimal");
    expect(buttons()[2]?.getAttribute("aria-pressed")).toBe("true");
  });

  it("relabels when the language changes, and stops following the profile when disposed", () => {
    const { profile, view, buttons } = made();

    profile.update({ language: "it" });
    expect(buttons().map((button) => button.textContent)).toEqual(["Completa", "Bassa", "Minima"]);

    view.dispose();
    profile.update({ language: "es" });
    expect(buttons()[0]?.textContent).toBe("Completa");
  });
});
