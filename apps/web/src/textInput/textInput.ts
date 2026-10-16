import { strings } from "@mahmood/strings";
import type { Tone } from "../activity/describeEvent";
import type { Surface } from "../surfaces/surface";
import { describeResult } from "./describeResult";

export const textInputSurface: Surface = {
  id: "textInput",
  mount(host, context) {
    const document = host.ownerDocument;
    const form = document.createElement("form");
    const input = document.createElement("input");
    input.type = "text";
    input.setAttribute("aria-label", strings.textInput.label);
    const button = document.createElement("button");
    button.type = "submit";
    button.textContent = strings.textInput.send;
    const status = document.createElement("p");
    status.setAttribute("role", "status");
    form.append(input, button);
    host.append(form, status);

    const show = (message: string, tone: Tone) => {
      status.textContent = message;
      status.dataset.tone = tone;
    };

    let busy = false;
    const setBusy = (value: boolean) => {
      busy = value;
      input.disabled = value;
      button.disabled = value;
    };

    const send = async (text: string) => {
      setBusy(true);
      try {
        const { text: message, tone } = describeResult(await context.requests.submit(text));
        show(message, tone);
      } catch (error) {
        show(error instanceof Error ? error.message : String(error), "error");
      } finally {
        setBusy(false);
      }
    };

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const text = input.value.trim();
      if (busy || text === "") return;
      input.value = "";
      void send(text);
    });

    return () => {
      form.remove();
      status.remove();
    };
  },
};
