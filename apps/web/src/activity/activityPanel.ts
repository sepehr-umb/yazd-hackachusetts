import { strings } from "@mahmood/strings";
import type { Surface } from "../surfaces/surface";
import { describeEvent } from "./describeEvent";

export const MAX_ENTRIES = 100;

export const activityPanelSurface: Surface = {
  id: "activityPanel",
  mount(host, context) {
    const document = host.ownerDocument;
    const title = document.createElement("h2");
    title.textContent = strings.activity.title;
    const list = document.createElement("ul");
    list.setAttribute("role", "log");
    list.setAttribute("aria-live", "polite");
    host.append(title, list);

    const unsubscribe = context.events.subscribe((event) => {
      const { text, tone } = describeEvent(event);
      const item = document.createElement("li");
      item.textContent = text;
      item.dataset.tone = tone;
      list.append(item);
      while (list.children.length > MAX_ENTRIES) list.firstElementChild?.remove();
    });

    return () => {
      unsubscribe();
      title.remove();
      list.remove();
    };
  },
};
