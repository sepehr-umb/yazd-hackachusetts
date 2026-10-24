import { afterEach, describe, expect, it } from "vitest";
import { applyProfile } from "./applyProfile";
import { defaultProfile } from "./profile";

const root = document.documentElement;

afterEach(() => {
  root.removeAttribute("lang");
  root.removeAttribute("dir");
  root.removeAttribute("data-vision");
  root.removeAttribute("style");
});

describe("applyProfile", () => {
  it("sets the page language and direction from the profile", () => {
    applyProfile(document, { ...defaultProfile, language: "fa" });
    expect(root.lang).toBe("fa");
    expect(root.dir).toBe("rtl");

    applyProfile(document, { ...defaultProfile, language: "es" });
    expect(root.lang).toBe("es");
    expect(root.dir).toBe("ltr");
  });

  it("publishes the flip colors and the ink that reads on each", () => {
    applyProfile(document, defaultProfile);

    expect(root.style.getPropertyValue("--flip-idle")).toBe("#000000");
    expect(root.style.getPropertyValue("--flip-listening")).toBe("#FFE600");
    expect(root.style.getPropertyValue("--flip-idle-ink")).toBe("#FFFFFF");
    expect(root.style.getPropertyValue("--flip-listening-ink")).toBe("#000000");
  });

  it("marks the vision level, and removes the mark while it is unset", () => {
    applyProfile(document, { ...defaultProfile, vision: "low" });
    expect(root.dataset.vision).toBe("low");

    applyProfile(document, defaultProfile);
    expect(root.dataset.vision).toBeUndefined();
  });
});
