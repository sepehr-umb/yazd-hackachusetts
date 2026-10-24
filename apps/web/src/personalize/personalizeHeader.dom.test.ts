import { afterEach, describe, expect, it } from "vitest";
import { createTestContext } from "../testing/testContext";
import { createPersonalizeSurface } from "./personalizeSurface";

afterEach(() => {
  document.body.replaceChildren();
});

describe("personalize header", () => {
  it("is a header bar with the companion's name at the start and the round control at the end", () => {
    const context = createTestContext();
    const host = document.createElement("section");
    createPersonalizeSurface().mount(host, context);
    const header = host.querySelector("header") as HTMLElement;
    const name = header.querySelector("[data-role=name]") as HTMLElement;

    expect([...header.children]).toEqual([name, host.querySelector("[data-role=opener]")]);
    expect(name.textContent).toBe("yazd");
    expect(name.dir).toBe("auto");
    context.profile.update({ name: "ماهی" });
    expect(name.textContent).toBe("ماهی");
  });
});
