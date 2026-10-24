import { afterEach, describe, expect, it } from "vitest";
import type { Language } from "../profile/languages";
import { createTestContext } from "../testing/testContext";
import type { Shortcut } from "./shortcuts";
import { createShortcutsSurface } from "./shortcutsSurface";

const data: Shortcut[] = [
  {
    id: "callMom",
    kind: "call",
    text: {
      fa: { label: "مامان", phrase: "به مامان زنگ بزن" },
      en: { label: "Mom", phrase: "Call Mom" },
    },
  },
  {
    id: "tvPlay",
    kind: "tv",
    text: {
      fa: { label: "پخش", phrase: "تلویزیون را پخش کن" },
      en: { label: "Play", phrase: "Play TV" },
    },
  },
];

afterEach(() => {
  document.body.replaceChildren();
});

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

function mounted(language: Language = "fa") {
  const context = createTestContext();
  const host = document.createElement("section");
  document.body.append(host);
  context.profile.update({ language });
  const unmount = createShortcutsSurface({ shortcuts: data }).mount(host, context);
  const buttons = [...host.querySelectorAll("button")];
  return { context, host, unmount, buttons };
}

describe("shortcuts surface", () => {
  it("has the id the settings object uses to toggle it", () => {
    expect(createShortcutsSurface().id).toBe("shortcuts");
  });

  it("renders one keyboard-reachable button per shortcut, in data order, inside a labelled group", () => {
    const { host, buttons } = mounted();

    expect(host.querySelector("[role=group]")?.getAttribute("aria-label")).toBe("Shortcuts");
    expect(buttons.map((button) => button.dataset.shortcut)).toEqual(["callMom", "tvPlay"]);
    expect(buttons.every((button) => button.type === "button" && button.tabIndex === 0)).toBe(true);
  });

  it("captions each button with one line only: the label in the profile's language", () => {
    const { buttons } = mounted();
    const captions = buttons[0]?.querySelectorAll("span") ?? [];
    const label = captions[0] as HTMLElement;

    expect(captions).toHaveLength(1);
    expect(label.dataset.role).toBe("label");
    expect(label.textContent).toBe("مامان");
    expect(label.lang).toBe("fa");
    expect(label.dir).toBe("auto");
    expect(buttons[0]?.querySelector("[data-role=sublabel]")).toBeNull();
  });

  it("draws the icon for each shortcut's kind, hidden from screen readers", () => {
    const { buttons } = mounted();
    const icons = buttons.map((button) => button.querySelector("svg"));

    expect(icons.map((icon) => icon?.dataset.icon)).toEqual(["call", "tv"]);
    expect(icons.every((icon) => icon?.getAttribute("aria-hidden") === "true")).toBe(true);
    expect(icons.every((icon) => icon?.getAttribute("fill") === "currentColor")).toBe(true);
    expect(icons.every((icon) => !icon?.hasAttribute("stroke"))).toBe(true);
  });

  it("submits the phrase exactly as written in the data", async () => {
    const { context, buttons } = mounted();

    buttons[0]?.click();
    await settle();

    expect(context.submitted).toEqual(["به مامان زنگ بزن"]);
  });

  it("submits the phrase of the profile's language", async () => {
    const { context, buttons } = mounted("en");

    buttons[0]?.click();
    await settle();

    expect(buttons[0]?.querySelector("[data-role=label]")?.textContent).toBe("Mom");
    expect(context.submitted).toEqual(["Call Mom"]);
  });

  it("disables the whole grid and marks the pressed button until the result returns", async () => {
    const { context, buttons } = mounted();
    const release = context.holdReply();

    buttons[0]?.click();
    buttons[1]?.click();
    await settle();

    expect(context.submitted).toHaveLength(1);
    expect(buttons.every((button) => button.getAttribute("aria-disabled") === "true")).toBe(true);
    expect(buttons[0]?.dataset.pressed).toBe("true");
    release({ status: "succeeded", agent: "comms", reply: "ok" });
    await settle();
    expect(buttons.every((button) => button.getAttribute("aria-disabled") === "false")).toBe(true);
    expect(buttons[0]?.dataset.pressed).toBeUndefined();
  });

  it("frees the grid again when the request fails", async () => {
    const { context, buttons } = mounted();
    context.replyWith(new Error("offline"));

    buttons[0]?.click();
    await settle();
    buttons[1]?.click();
    await settle();

    expect(context.submitted).toEqual(["به مامان زنگ بزن", "تلویزیون را پخش کن"]);
  });

  it("removes the grid when unmounted", () => {
    const { host, unmount } = mounted();

    unmount();

    expect(host.children).toHaveLength(0);
  });

  it("relabels at once when the profile language changes, and sends that language's phrase", async () => {
    const { context, host } = mounted();

    context.profile.update({ language: "en" });
    const button = host.querySelector("button") as HTMLButtonElement;
    button.click();
    await settle();

    expect(button.querySelector("[data-role=label]")?.textContent).toBe("Mom");
    expect(button.querySelector("[data-role=sublabel]")).toBeNull();
    expect(context.submitted).toEqual(["Call Mom"]);
  });

  it("falls back to the first language in the data when the profile's is missing", () => {
    const { buttons } = mounted("es");

    expect(buttons[0]?.querySelector("[data-role=label]")?.textContent).toBe("مامان");
  });
});
