import { describe, expect, it } from "vitest";
import { validateToolInput } from "./validateToolInput";

const schema = {
  type: "object",
  properties: { contact: { type: "string" }, text: { type: "string" } },
  required: ["contact"],
};

describe("validateToolInput", () => {
  it("accepts input that has every required field", () => {
    expect(validateToolInput(schema, { contact: "مامان" })).toBe(true);
  });

  it("rejects input missing a required field", () => {
    expect(validateToolInput(schema, { text: "سلام" })).toBe(false);
  });

  it.each([
    ["string", { contact: 42 }],
    ["number", { contact: "مامان", brightness: "high" }],
    ["boolean", { contact: "مامان", on: "yes" }],
  ])("rejects a value that is not a %s", (_type, input) => {
    const typed = {
      type: "object",
      properties: {
        contact: { type: "string" },
        brightness: { type: "number" },
        on: { type: "boolean" },
      },
      required: ["contact"],
    };
    expect(validateToolInput(typed, input)).toBe(false);
  });

  it("rejects a value outside an enum and accepts one inside it", () => {
    const enumSchema = {
      type: "object",
      properties: { action: { type: "string", enum: ["play", "pause"] } },
      required: ["action"],
    };
    expect(validateToolInput(enumSchema, { action: "explode" })).toBe(false);
    expect(validateToolInput(enumSchema, { action: "pause" })).toBe(true);
  });

  it.each([
    [-1, false],
    [0, true],
    [100, true],
    [101, false],
  ])("checks brightness %s against minimum and maximum", (brightness, expected) => {
    const ranged = {
      type: "object",
      properties: { brightness: { type: "number", minimum: 0, maximum: 100 } },
    };
    expect(validateToolInput(ranged, { brightness })).toBe(expected);
  });
});
