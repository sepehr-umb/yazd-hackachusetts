export const vertexShader = `#version 300 es
void main() {
  vec2 corner = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(corner * 2.0 - 1.0, 0.0, 1.0);
}
`;

export const fragmentShader = `#version 300 es
precision highp float;

uniform vec2 uResolution;
uniform float uMouthOpen;
uniform float uMouthWidth;
uniform float uMouthRound;
uniform float uBlink;
uniform float uBrowRaise;
uniform float uTime;

out vec4 outColor;

float sdEllipse(vec2 p, vec2 r) {
  float k0 = length(p / r);
  float k1 = max(length(p / (r * r)), 1e-5);
  return k0 * (k0 - 1.0) / k1;
}

float sdCapsule(vec2 p, vec2 a, vec2 b, float r) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h) - r;
}

float sdRoundBox(vec2 p, vec2 halfSize, float radius) {
  vec2 q = abs(p) - halfSize + radius;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;
}

float coverage(float distance, float edge) {
  return 1.0 - smoothstep(-edge, edge, distance);
}

void main() {
  float scale = min(uResolution.x, uResolution.y);
  float edge = 1.5 / scale;
  vec2 p = (gl_FragCoord.xy - 0.5 * uResolution) / (0.5 * scale);
  p.y -= 0.012 * sin(uTime * 1.3);

  float anger = max(-uBrowRaise, 0.0);

  vec3 background = mix(vec3(0.05, 0.07, 0.15), vec3(0.11, 0.14, 0.27), 0.5 + 0.5 * p.y);
  vec3 skin = mix(vec3(1.0, 0.83, 0.58), vec3(1.0, 0.55, 0.45), anger * 0.7);
  skin *= 1.0 - 0.18 * dot(p, p);
  vec3 ink = vec3(0.17, 0.10, 0.11);
  vec3 mouthInside = vec3(0.30, 0.06, 0.09);
  vec3 tongue = vec3(0.92, 0.38, 0.42);

  float headDistance = length(p) - 0.86;
  vec3 color = background + vec3(1.0, 0.8, 0.5) * 0.12 * exp(-headDistance * 5.0);
  color = mix(color, skin, coverage(headDistance, edge));

  vec2 gaze = 0.008 * vec2(sin(uTime * 0.7), cos(uTime * 0.5));
  float eyeHeight = mix(0.115, 0.012, uBlink);
  vec2 eyeCenter = vec2(0.30, 0.16);
  vec2 eyeP = vec2(abs(p.x), p.y) - eyeCenter - gaze;
  float eyeDistance = sdEllipse(eyeP, vec2(0.085, eyeHeight));
  color = mix(color, ink, coverage(eyeDistance, edge));
  float glintDistance = length(eyeP - vec2(0.026, 0.04 * (1.0 - uBlink))) - 0.022 * (1.0 - uBlink);
  color = mix(color, vec3(1.0), coverage(glintDistance, edge));

  vec2 browP = vec2(abs(p.x), p.y);
  float lift = uBrowRaise * 0.09;
  vec2 browInner = vec2(0.17, 0.40 + lift - anger * 0.07);
  vec2 browOuter = vec2(0.44, 0.40 + lift + anger * 0.03);
  color = mix(color, ink, coverage(sdCapsule(browP, browInner, browOuter, 0.018), edge));

  float bend = (uMouthWidth - 0.45) * 1.1 * (1.0 - uMouthOpen) * (1.0 - uMouthRound);
  vec2 mouthP = p - vec2(0.0, -0.40);
  mouthP.y -= 2.5 * bend * mouthP.x * mouthP.x;
  float halfHeight = mix(0.014, 0.11, uMouthOpen);
  float wideHalfWidth = mix(0.07, 0.24, uMouthWidth);
  float halfWidth = mix(wideHalfWidth, max(halfHeight, 0.04), uMouthRound);
  float cornerRadius = min(halfWidth, halfHeight) * mix(0.7, 1.0, uMouthRound);
  float mouthDistance = sdRoundBox(mouthP, vec2(halfWidth, halfHeight), cornerRadius);
  float openness = smoothstep(0.08, 0.35, uMouthOpen);
  vec3 mouthColor = mix(ink, mouthInside, openness);
  float tongueDistance = sdEllipse(mouthP - vec2(0.0, -halfHeight * 0.6), vec2(halfWidth * 0.6, halfHeight * 0.45));
  mouthColor = mix(mouthColor, tongue, openness * coverage(tongueDistance, edge));
  color = mix(color, mouthColor, coverage(mouthDistance, edge));

  outColor = vec4(color, 1.0);
}
`;
