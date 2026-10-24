import { describe, expect, it } from "vitest";
import { createTestContext } from "../testing/testContext";
import { captionsSurface } from "./captionsSurface";

function mounted() {
  const context = createTestContext();
  const host = document.createElement("section");
  const unmount = captionsSurface.mount(host, context);
  const lines = (speaker: string) => {
    const block = host.querySelector(`[data-speaker="${speaker}"]`);
    return {
      original: block?.querySelector<HTMLElement>('[data-role="original"]') ?? null,
      english: block?.querySelector<HTMLElement>('[data-role="english"]') ?? null,
    };
  };
  return { context, host, unmount, lines };
}

describe("captionsSurface", () => {
  it("has the id the settings object uses to toggle it", () => {
    expect(captionsSurface.id).toBe("captions");
  });

  it("shows nothing until a caption arrives", () => {
    const { host } = mounted();

    expect(host.querySelectorAll("[data-speaker]")).toHaveLength(0);
  });

  it("shows the user's words as original text with automatic direction and English below with left-to-right direction", () => {
    const { context, lines } = mounted();

    context.emit({
      type: "caption",
      speaker: "user",
      text: "به مامان زنگ بزن",
      english: "Call mom",
    });

    const { original, english } = lines("user");
    expect(original?.textContent).toBe("به مامان زنگ بزن");
    expect(original?.dir).toBe("auto");
    expect(english?.textContent).toBe("Call mom");
    expect(english?.dir).toBe("ltr");
    expect(original?.nextElementSibling).toBe(english);
  });

  it("shows the assistant caption separately from the user caption", () => {
    const { context, lines } = mounted();

    context.emit({ type: "caption", speaker: "user", text: "سلام", english: "Hello" });
    context.emit({
      type: "caption",
      speaker: "assistant",
      text: "دارم زنگ می‌زنم",
      english: "Calling",
    });

    expect(lines("user").original?.textContent).toBe("سلام");
    expect(lines("assistant").original?.textContent).toBe("دارم زنگ می‌زنم");
    expect(lines("assistant").english?.textContent).toBe("Calling");
  });

  it("keeps only the latest caption of each speaker", () => {
    const { context, host, lines } = mounted();

    context.emit({ type: "caption", speaker: "user", text: "اول", english: "First" });
    context.emit({ type: "caption", speaker: "user", text: "دوم", english: "Second" });

    expect(host.querySelectorAll('[data-speaker="user"]')).toHaveLength(1);
    expect(lines("user").original?.textContent).toBe("دوم");
    expect(lines("user").english?.textContent).toBe("Second");
  });

  it("ignores events that are not captions", () => {
    const { context, host } = mounted();

    context.emit({ type: "transcript", text: "سلام" });

    expect(host.querySelectorAll("[data-speaker]")).toHaveLength(0);
  });

  it("marks the host with the stored caption size and contrast at mount", () => {
    const { host } = mounted();

    expect(host.dataset.captionSize).toBe("large");
    expect(host.dataset.contrast).toBe("high");
  });

  it("restyles captions already on screen when size or contrast changes", () => {
    const { context, host } = mounted();
    context.emit({ type: "caption", speaker: "user", text: "سلام", english: "Hello" });

    context.emit({ type: "setting_changed", name: "captionSize", value: "extra-large" });
    context.emit({ type: "setting_changed", name: "highContrast", value: false });

    expect(host.dataset.captionSize).toBe("extra-large");
    expect(host.dataset.contrast).toBe("normal");
    expect(host.querySelectorAll("[data-speaker]")).toHaveLength(1);
  });

  it("renders later captions under the new attributes", () => {
    const { context, host } = mounted();
    context.emit({ type: "setting_changed", name: "captionSize", value: "small" });

    context.emit({ type: "caption", speaker: "user", text: "سلام", english: "Hello" });

    expect(host.dataset.captionSize).toBe("small");
    expect(host.querySelectorAll("[data-speaker]")).toHaveLength(1);
  });

  it("returns to the defaults on reset", () => {
    const { context, host } = mounted();
    context.emit({ type: "setting_changed", name: "captionSize", value: "small" });
    context.emit({ type: "setting_changed", name: "highContrast", value: false });

    context.emit({ type: "settings_reset" });

    expect(host.dataset.captionSize).toBe("large");
    expect(host.dataset.contrast).toBe("high");
  });

  it("stops listening and clears itself when unmounted", () => {
    const { context, host, unmount } = mounted();
    context.emit({ type: "caption", speaker: "user", text: "سلام", english: "Hello" });

    unmount();

    expect(context.listenerCount()).toBe(0);
    expect(host.children).toHaveLength(0);
  });
});
