import { describe, expect, it } from "vitest";
import { createTestContext } from "../testing/testContext";
import { MAX_ENTRIES, activityPanelSurface } from "./activityPanel";

function mounted() {
  const context = createTestContext();
  const host = document.createElement("section");
  const unmount = activityPanelSurface.mount(host, context);
  const entries = () => [...host.querySelectorAll("li")].map((li) => li.textContent);
  return { context, host, unmount, entries };
}

describe("activityPanelSurface", () => {
  it("has the id the settings object uses to toggle it", () => {
    expect(activityPanelSurface.id).toBe("activityPanel");
  });

  it("lists each event as it arrives, oldest first", () => {
    const { context, entries } = mounted();

    context.emit({ type: "transcript", text: "به مامان زنگ بزن" });
    context.emit({ type: "agent", agent: "comms" });
    context.emit({ type: "tool_call", tool: "call_contact", status: "succeeded" });

    expect(entries()).toEqual([
      "Request: به مامان زنگ بزن",
      "Agent: comms",
      "Tool call_contact: succeeded",
    ]);
  });

  it("marks each entry with the tone of its event", () => {
    const { context, host } = mounted();

    context.emit({ type: "tool_call", tool: "call_contact", status: "succeeded" });
    context.emit({ type: "tool_call", tool: "call_contact", status: "failed" });

    const tones = [...host.querySelectorAll("li")].map((li) => li.dataset.tone);
    expect(tones).toEqual(["success", "error"]);
  });

  it("keeps only the newest entries once the cap is exceeded", () => {
    const { context, entries } = mounted();

    for (let index = 0; index < MAX_ENTRIES + 3; index += 1) {
      context.emit({ type: "transcript", text: `request ${index}` });
    }

    expect(entries()).toHaveLength(MAX_ENTRIES);
    expect(entries()[0]).toBe("Request: request 3");
    expect(entries().at(-1)).toBe(`Request: request ${MAX_ENTRIES + 2}`);
  });
});
