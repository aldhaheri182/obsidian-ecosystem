/**
 * Parchment shader for the Nexus Overworld background.
 * A noise-based gradient that feels hand-drawn and ancient.
 */

export const PARCHMENT_VERT = /* glsl */ `
in vec2 aPosition;
out vec2 vUv;

uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uOutputTexture;

vec4 filterVertexPosition() {
  vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
  position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
  position.y = position.y * (2.0 * uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;
  return vec4(position, 0.0, 1.0);
}

vec2 filterTextureCoord() {
  return aPosition * (uOutputFrame.zw * uInputSize.zw);
}

void main(void) {
  gl_Position = filterVertexPosition();
  vUv = filterTextureCoord();
}
`;

export const PARCHMENT_FRAG = /* glsl */ `
in vec2 vUv;
out vec4 finalColor;

uniform float uTime;
uniform vec2  uCenter; // normalized 0-1

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1, 0));
  float c = hash(i + vec2(0, 1));
  float d = hash(i + vec2(1, 1));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p *= 2.0;
    a *= 0.5;
  }
  return v;
}

void main(void) {
  vec2 uv = vUv;
  float n = fbm(uv * 4.0);
  // Subtle warm parchment mixed with abyss blue.
  vec3 warm = vec3(0.07, 0.08, 0.14);
  vec3 dark = vec3(0.04, 0.05, 0.08);
  vec3 color = mix(dark, warm, n * 0.7 + 0.2);

  // Vignette toward edges.
  float vignette = smoothstep(0.9, 0.3, length(uv - uCenter) * 1.2);
  color *= vignette;

  // Subtle grain.
  float grain = (hash(uv * 1000.0 + uTime) - 0.5) * 0.03;
  color += grain;

  finalColor = vec4(color, 1.0);
}
`;
