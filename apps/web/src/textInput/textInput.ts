import { strings } from "@mahmood/strings";
import { describeResult } from "./describeResult";
import type { Surface } from "../surfaces/surface";

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

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const text = input.value.trim();
      if (text === "") return;
      input.value = "";
      void context.requests.submit(text).then((result) => {
        const { text: message, tone } = describeResult(result);
        status.textContent = message;
        status.dataset.tone = tone;
      });
    });

    return () => {
      form.remove();
      status.remove();
    };
  },
};
