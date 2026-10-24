import { strings } from "@mahmood/strings";
import type { Surface } from "../surfaces/surface";
import { describeEvent } from "./describeEvent";

export const MAX_ENTRIES = 100;

export const activityPanelSurface: Surface = {
  id: "activityPanel",
  mount(host, context) {
    const document = host.ownerDocument;
    const drawer = document.createElement("details");
    const summary = document.createElement("summary");
    summary.textContent = strings.activity.details;
    const list = document.createElement("ul");
    list.setAttribute("role", "log");
    list.setAttribute("aria-live", "polite");
    drawer.append(summary, list);
    host.append(drawer);

    const unsubscribe = context.events.subscribe((event) => {
      const { text, tone } = describeEvent(event);
      const item = document.createElement("li");
      item.textContent = text;
      item.dir = "auto";
      item.dataset.tone = tone;
      list.append(item);
      while (list.children.length > MAX_ENTRIES) list.firstElementChild?.remove();
    });

    return () => {
      unsubscribe();
      drawer.remove();
    };
  },
};
