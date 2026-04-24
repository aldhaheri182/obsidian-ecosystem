/**
 * P&L Aurora shader for the Orbit View.
 *
 * Animated fragment shader producing a shimmering aurora band with smooth
 * color transitions based on P&L. Uses simplex-ish noise offset over time
 * to create organic movement.
 */

export const AURORA_VERT = /* glsl */ `
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

export const AURORA_FRAG = /* glsl */ `
in vec2 vUv;
out vec4 finalColor;

uniform float uTime;
uniform float uPnl;        // -1 (loss) .. +1 (profit)
uniform float uIntensity;  // 0..1 master
uniform vec2  uResolution;

// 2D hash
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// Value noise
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
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
  // Normalized coord
  vec2 uv = vUv;
  // Distance from center-horizontal used as vertical gradient within band
  float bandCenter = 0.5;
  float bandWidth = 0.5;
  float dist = abs(uv.y - bandCenter) / bandWidth;
  float bandMask = smoothstep(1.0, 0.2, dist);

  // Moving noise
  vec2 np = uv * vec2(3.0, 5.0) + vec2(uTime * 0.05, uTime * 0.02);
  float shimmer = fbm(np);
  float alpha = bandMask * (0.4 + shimmer * 0.6);

  // Color interpolation verdigris -> crimson based on P&L
  vec3 profit = vec3(0.306, 0.804, 0.769);
  vec3 loss   = vec3(0.902, 0.212, 0.275);
  float mixT = clamp((1.0 - uPnl) * 0.5, 0.0, 1.0);
  vec3 base = mix(profit, loss, mixT);

  // Add slight gold tone at peak shimmer
  base = mix(base, vec3(1.0, 0.82, 0.4), shimmer * 0.2);

  finalColor = vec4(base * alpha * uIntensity, alpha * uIntensity * 0.8);
}
`;
