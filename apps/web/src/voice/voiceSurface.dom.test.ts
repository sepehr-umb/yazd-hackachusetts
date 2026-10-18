import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestContext } from "../testing/testContext";
import { createVoiceSurface } from "./voiceSurface";

const config = { silenceThreshold: 0.1, silenceTimeoutMs: 1000 };

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
});

function mounted() {
  const context = createTestContext();
  const host = document.createElement("section");
  document.body.append(host);
  const unmount = createVoiceSurface({ config }).mount(host, context);
  const button = host.querySelector("button") as HTMLButtonElement;
  const status = host.querySelector("[role=status]") as HTMLElement;
  const press = async (key: string, target: EventTarget = document.body) => {
    const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });
    target.dispatchEvent(event);
    await vi.advanceTimersByTimeAsync(0);
    return event;
  };
  const click = async () => {
    button.click();
    await vi.advanceTimersByTimeAsync(0);
  };
  return { context, host, unmount, button, status, press, click };
}

describe("voice surface", () => {
  it("has the id the settings object uses to toggle it", () => {
    expect(createVoiceSurface().id).toBe("voice");
  });

  it("renders one button that offers to start recording", () => {
    const { host, button } = mounted();

    expect(host.querySelectorAll("button")).toHaveLength(1);
    expect(button.getAttribute("aria-label")).toBe("Start recording");
  });

  it("starts recording with a chime when the button is clicked", async () => {
    const { context, button, status, click } = mounted();

    await click();

    expect(context.mic.starts).toBe(1);
    expect(context.chimes).toEqual(["start"]);
    expect(button.getAttribute("aria-label")).toBe("Stop recording");
    expect(status.textContent).toBe("Listening");
  });

  it("stops, chimes and sends the recording when clicked again, then shows the reply", async () => {
    const { context, button, status, click } = mounted();
    context.replyWith({ status: "succeeded", agent: "comms", reply: "دارم زنگ می‌زنم" });
    await click();

    await click();

    expect(context.mic.stops).toBe(1);
    expect(context.chimes).toEqual(["start", "stop"]);
    expect(context.recorded).toHaveLength(1);
    expect(context.recorded[0]?.type).toBe("audio/webm");
    expect(status.textContent).toBe("دارم زنگ می‌زنم");
    expect(button.getAttribute("aria-label")).toBe("Start recording");
  });

  it("stops by itself after the silence timeout", async () => {
    const { context, click } = mounted();
    await click();

    await vi.advanceTimersByTimeAsync(900);
    expect(context.mic.stops).toBe(0);
    await vi.advanceTimersByTimeAsync(200);

    expect(context.mic.stops).toBe(1);
    expect(context.chimes).toEqual(["start", "stop"]);
    expect(context.recorded).toHaveLength(1);
  });

  it("keeps recording while the input stays above the silence threshold", async () => {
    const { context, click } = mounted();
    await click();
    context.mic.level = 0.5;

    await vi.advanceTimersByTimeAsync(5000);

    expect(context.mic.stops).toBe(0);
  });

  it.each([" ", "Enter"])("toggles recording when %j is pressed on the page", async (key) => {
    const { context, press } = mounted();

    const started = await press(key);
    expect(context.mic.starts).toBe(1);
    expect(started.defaultPrevented).toBe(true);

    await press(key);
    expect(context.recorded).toHaveLength(1);
  });

  it("ignores other keys, held-down repeats and shortcuts", async () => {
    const { context, press } = mounted();

    await press("a");
    document.body.dispatchEvent(new KeyboardEvent("keydown", { key: " ", repeat: true }));
    document.body.dispatchEvent(new KeyboardEvent("keydown", { key: " ", ctrlKey: true }));
    await vi.advanceTimersByTimeAsync(0);

    expect(context.mic.starts).toBe(0);
  });

  it("leaves Enter and Space alone while typing in a field or pressing another button", async () => {
    const { context, host, press } = mounted();
    const input = document.createElement("input");
    const other = document.createElement("button");
    host.append(input, other);

    await press("Enter", input);
    await press(" ", other);

    expect(context.mic.starts).toBe(0);
  });

  it("does not double-toggle when the focused button gets a key press", async () => {
    const { context, button, press } = mounted();

    await press("Enter", button);

    expect(context.mic.starts).toBe(0);
  });

  it("ignores toggles while the recording is being processed", async () => {
    const { context, click, button } = mounted();
    const release = context.holdReply();
    await click();
    await click();

    await click();

    expect(context.mic.starts).toBe(1);
    expect(button.disabled).toBe(true);
    release({ status: "failed", failure: { reason: "unroutable" } });
    await vi.advanceTimersByTimeAsync(0);
    expect(button.disabled).toBe(false);
  });

  it("shows the error and stays usable when the microphone is refused", async () => {
    const { context, status, button, click } = mounted();
    context.mic.refuse(new Error("Permission denied"));

    await click();

    expect(status.textContent).toBe("Permission denied");
    expect(status.dataset.tone).toBe("error");
    expect(button.getAttribute("aria-label")).toBe("Start recording");
    expect(context.chimes).toEqual([]);
  });

  it("shows the error when sending the recording fails", async () => {
    const { context, status, click } = mounted();
    context.replyWith(new Error("Nothing was heard in the recording"));
    await click();

    await click();

    expect(status.textContent).toBe("Nothing was heard in the recording");
    expect(status.dataset.tone).toBe("error");
  });

  it("shows a failed result with the error tone", async () => {
    const { context, status, click } = mounted();
    context.replyWith({ status: "failed", failure: { reason: "unroutable" } });
    await click();

    await click();

    expect(status.dataset.tone).toBe("error");
  });

  it("releases the microphone without sending when unmounted mid-recording", async () => {
    const { context, host, unmount, click, press } = mounted();
    await click();

    unmount();
    await vi.advanceTimersByTimeAsync(5000);
    await press(" ");

    expect(context.mic.stops).toBe(1);
    expect(context.recorded).toHaveLength(0);
    expect(context.mic.starts).toBe(1);
    expect(host.querySelectorAll("button")).toHaveLength(0);
  });
});
