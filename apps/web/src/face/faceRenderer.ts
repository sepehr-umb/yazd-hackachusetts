import { fragmentShader, vertexShader } from "./faceShader";
import type { FaceUniforms } from "./uniforms";

export type FaceRenderer = { render(uniforms: FaceUniforms): void };

function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Could not create shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) ?? "Shader compile failed");
  }
  return shader;
}

function link(gl: WebGL2RenderingContext): WebGLProgram {
  const program = gl.createProgram();
  if (!program) throw new Error("Could not create program");
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, vertexShader));
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, fragmentShader));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program) ?? "Program link failed");
  }
  return program;
}

export function createFaceRenderer(canvas: HTMLCanvasElement): FaceRenderer {
  const gl = canvas.getContext("webgl2");
  if (!gl) throw new Error("WebGL2 is not available");
  const program = link(gl);
  const resolution = gl.getUniformLocation(program, "uResolution");

  return {
    render(uniforms) {
      const ratio = window.devicePixelRatio || 1;
      const width = Math.round(canvas.clientWidth * ratio);
      const height = Math.round(canvas.clientHeight * ratio);
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      gl.viewport(0, 0, width, height);
      gl.useProgram(program);
      gl.uniform2f(resolution, width, height);
      for (const [name, value] of Object.entries(uniforms)) {
        gl.uniform1f(gl.getUniformLocation(program, name), value);
      }
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
  };
}
