import { describe, expect, it } from "vitest";
import { createTestContext } from "../testing/testContext";
import { activityPanelSurface } from "./activityPanel";

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
});
