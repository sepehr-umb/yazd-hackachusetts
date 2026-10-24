import { describe, expect, it } from "vitest";
import { createTestContext } from "../testing/testContext";
import { textInputSurface } from "./textInput";

function mounted() {
  const context = createTestContext();
  const host = document.createElement("section");
  const unmount = textInputSurface.mount(host, context);
  const input = host.querySelector("input") as HTMLInputElement;
  const button = host.querySelector("button") as HTMLButtonElement;
  const form = host.querySelector("form") as HTMLFormElement;
  const status = host.querySelector("[role=status]") as HTMLElement;
  const submit = (text: string) => {
    input.value = text;
    form.dispatchEvent(new Event("submit", { cancelable: true }));
  };
  const settle = () => new Promise((resolve) => setTimeout(resolve, 0));
  return { context, host, unmount, input, button, form, status, submit, settle };
}

describe("textInputSurface", () => {
  it("has the id the settings object uses to toggle it", () => {
    expect(textInputSurface.id).toBe("textInput");
  });

  it("shows the send button as a labelled arrow icon inside the field, with no word", () => {
    const { button, form } = mounted();

    expect(button.getAttribute("aria-label")).toBe("Send");
    expect(button.textContent).toBe("");
    expect(button.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    expect(button.parentElement).toBe(form);
  });

  it("sends the trimmed text on submit and clears the box", () => {
    const { context, input, submit } = mounted();

    submit("  به مامان زنگ بزن  ");

    expect(context.submitted).toEqual(["به مامان زنگ بزن"]);
    expect(input.value).toBe("");
  });

  it.each(["", "   "])("does not send blank input %j", (blank) => {
    const { context, submit } = mounted();

    submit(blank);

    expect(context.submitted).toEqual([]);
  });

  it("shows the reply once the request succeeds", async () => {
    const { context, status, submit, settle } = mounted();
    context.replyWith({ status: "succeeded", agent: "comms", reply: "دارم زنگ می‌زنم" });

    submit("به مامان زنگ بزن");
    await settle();

    expect(status.textContent).toBe("دارم زنگ می‌زنم");
    expect(status.dataset.tone).toBe("neutral");
  });

  it("shows a failure with the error tone", async () => {
    const { context, status, submit, settle } = mounted();
    context.replyWith({ status: "failed", failure: { reason: "unroutable" } });

    submit("what is the weather");
    await settle();

    expect(status.textContent).toBe("The assistant does not know how to help with that");
    expect(status.dataset.tone).toBe("error");
  });

  it("shows the error message when the request itself fails", async () => {
    const { context, status, submit, settle } = mounted();
    context.replyWith(new Error("Failed to fetch"));

    submit("به مامان زنگ بزن");
    await settle();

    expect(status.textContent).toBe("Failed to fetch");
    expect(status.dataset.tone).toBe("error");
  });

  it("disables the box and button while a request is in flight and re-enables them after", async () => {
    const { context, input, button, submit, settle } = mounted();
    const release = context.holdReply();

    submit("به مامان زنگ بزن");
    expect(input.disabled).toBe(true);
    expect(button.disabled).toBe(true);

    submit("again");
    expect(context.submitted).toEqual(["به مامان زنگ بزن"]);

    release({ status: "succeeded", agent: "comms", reply: "ok" });
    await settle();
    expect(input.disabled).toBe(false);
    expect(button.disabled).toBe(false);
  });

  it("lets the box and the status line pick their own text direction", () => {
    const { input, status } = mounted();

    expect(input.getAttribute("dir")).toBe("auto");
    expect(status.getAttribute("dir")).toBe("auto");
  });
});
