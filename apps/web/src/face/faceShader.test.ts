import { describe, expect, it } from "vitest";
import { expressionFor } from "./expression";
import { fragmentShader, vertexShader } from "./faceShader";
import { uniformsFor } from "./uniforms";

describe("face shader sources", () => {
  it("target WebGL2 (GLSL ES 3.00) on the very first line", () => {
    expect(fragmentShader.startsWith("#version 300 es\n")).toBe(true);
    expect(vertexShader.startsWith("#version 300 es\n")).toBe(true);
  });

  it("declare every uniform the pure modules produce", () => {
    for (const name of Object.keys(uniformsFor(expressionFor("idle"), 0))) {
      expect(fragmentShader).toContain(`uniform float ${name};`);
    }
  });

  it("declare the resolution the renderer supplies", () => {
    expect(fragmentShader).toContain("uniform vec2 uResolution;");
  });
});
