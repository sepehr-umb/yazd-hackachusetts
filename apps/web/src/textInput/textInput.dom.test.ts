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
});
