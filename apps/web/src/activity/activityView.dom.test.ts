import { describe, expect, it } from "vitest";
import { createTestContext } from "../testing/testContext";
import { activityPanelSurface } from "./activityPanel";

describe("Details drawer View strip", () => {
  it("switches the vision level from inside the drawer", () => {
    const context = createTestContext();
    context.profile.update({ vision: "minimal", language: "en" });
    const host = document.createElement("section");
    activityPanelSurface.mount(host, context);
    const buttons = [...host.querySelectorAll("details [data-role=view] button")];

    expect(buttons.map((button) => button.textContent)).toEqual(["Full", "Low", "Minimal"]);
    buttons[0]?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(context.profile.get().vision).toBe("full");
  });
});
