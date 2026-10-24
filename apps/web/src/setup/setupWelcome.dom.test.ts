import { strings } from "@mahmood/strings";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { languages } from "../profile/languages";
import { mountSetup } from "./setupHarness";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
});

const hello = (index: number) => strings.setup[languages[index % 4] ?? "fa"].sayHello;

describe("setup welcome", () => {
  it("greets a new profile with the welcome button as the first control, labelled in every language", () => {
    const { sheet, welcome } = mountSetup();

    expect(sheet.hidden).toBe(false);
    expect(sheet.firstElementChild).toBe(welcome());
    for (const language of languages) {
      expect(welcome().getAttribute("aria-label")).toContain(strings.setup[language].sayHello);
    }
  });

  it("asks to say hello in Farsi first, in its own language and direction", () => {
    const { sentence: heading } = mountSetup();

    expect(heading().textContent).toBe("دکمه را فشار بده و بگو «سلام»");
    expect(heading().lang).toBe("fa");
    expect(heading().dir).toBe("auto");
  });

  it("changes the sentence every 3 s with a 300 ms crossfade, through all four languages", () => {
    const { sentence: heading } = mountSetup();

    vi.advanceTimersByTime(3000);
    expect(heading().dataset.fading).toBe("true");
    expect(heading().textContent).toBe(hello(0));
    vi.advanceTimersByTime(300);
    expect(heading().dataset.fading).toBeUndefined();
    expect([heading().textContent, heading().lang]).toEqual([hello(1), "en"]);

    vi.advanceTimersByTime(3300 * 3);
    expect([heading().textContent, heading().lang]).toEqual([hello(0), "fa"]);
  });

  it("changes instantly, with no fade, when motion is reduced", () => {
    const { sentence: heading } = mountSetup({ reduced: true });

    vi.advanceTimersByTime(3000);

    expect(heading().dataset.fading).toBeUndefined();
    expect(heading().textContent).toBe(hello(1));
  });

  it("stops rotating when unmounted", () => {
    const { sentence: heading, unmount } = mountSetup();
    const before = heading().textContent;

    unmount();
    vi.advanceTimersByTime(10000);

    expect(heading().textContent).toBe(before);
  });
});
