'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Spec §4.4:
// Stars: 3000 random points, sizes 0.01–0.04, 90% white/blue-white, 10% gold/cyan.
// Twinkling via shader multiplying by smooth noise(time, position).
// Nebula: sphere radius 80 at z=-50, deep purple #1A1030 fading to transparent
// with cyan #00F5D4 wisps via procedural cloud noise.

const STAR_VERT = /* glsl */ `
  attribute float aSize;
  attribute vec3 aColor;
  varying vec3 vColor;
  varying float vSeed;
  uniform float uTime;
  void main() {
    vColor = aColor;
    vSeed = mod(position.x * 12.9898 + position.y * 78.233 + position.z * 37.719, 6.2831);
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    float twinkle = 0.6 + 0.4 * sin(uTime * 1.5 + vSeed);
    gl_PointSize = aSize * 200.0 / -mvPos.z * twinkle;
    gl_Position = projectionMatrix * mvPos;
  }
`;

const STAR_FRAG = /* glsl */ `
  varying vec3 vColor;
  varying float vSeed;
  uniform float uTime;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    float alpha = 1.0 - smoothstep(0.15, 0.5, d);
    float twinkle = 0.8 + 0.2 * sin(uTime * 2.0 + vSeed);
    gl_FragColor = vec4(vColor * twinkle, alpha);
  }
`;

const NEBULA_VERT = /* glsl */ `
  varying vec3 vPos;
  void main() {
    vPos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// fBm noise + two-color nebula: deep purple #1A1030 to cyan #00F5D4 wisps.
const NEBULA_FRAG = /* glsl */ `
  varying vec3 vPos;
  uniform float uTime;
  float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
  float noise(vec3 p) {
    vec3 i = floor(p); vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
      mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y),
      f.z
    );
  }
  float fbm(vec3 p) {
    float v = 0.0; float a = 0.5;
    for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.02; a *= 0.5; }
    return v;
  }
  void main() {
    vec3 p = normalize(vPos) * 2.0;
    p += vec3(uTime * 0.01, uTime * 0.005, -uTime * 0.008);
    float n = fbm(p);
    float n2 = fbm(p * 2.2 + 5.0);
    vec3 deep = vec3(0.102, 0.063, 0.188);       // #1A1030
    vec3 cyan = vec3(0.0, 0.961, 0.831);          // #00F5D4 wisps
    vec3 col = mix(deep, cyan, smoothstep(0.55, 0.85, n2) * 0.5);
    float alpha = smoothstep(0.25, 0.8, n) * 0.7;
    // Fade at sphere edge — only inside-facing
    if (gl_FrontFacing) alpha *= 0.2;
    gl_FragColor = vec4(col, alpha);
  }
`;

export function StarsAndNebula() {
  const starsRef = useRef<THREE.Points>(null);
  const nebulaRef = useRef<THREE.Mesh>(null);
  const starsUniforms = useRef({ uTime: { value: 0 } });
  const nebulaUniforms = useRef({ uTime: { value: 0 } });

  const { geometry } = useMemo(() => {
    const count = 3000;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const colors = new Float32Array(count * 3);
    const whiteBlue = [0.85, 0.9, 1.0];
    const blueWhite = [0.9, 0.95, 1.0];
    const gold = [1.0, 0.82, 0.4];
    const cyan = [0.0, 0.96, 0.83];
    for (let i = 0; i < count; i++) {
      // Random points on a large sphere shell (far background).
      const theta = Math.acos(1 - 2 * Math.random());
      const phi = 2 * Math.PI * Math.random();
      const r = 90 + Math.random() * 20;
      positions[i * 3 + 0] = r * Math.sin(theta) * Math.cos(phi);
      positions[i * 3 + 1] = r * Math.cos(theta);
      positions[i * 3 + 2] = r * Math.sin(theta) * Math.sin(phi);
      sizes[i] = 0.01 + Math.random() * 0.03; // 0.01–0.04
      const rand = Math.random();
      let col: number[];
      if (rand < 0.9) col = rand < 0.45 ? whiteBlue : blueWhite;
      else col = rand < 0.95 ? gold : cyan;
      colors[i * 3 + 0] = col[0];
      colors[i * 3 + 1] = col[1];
      colors[i * 3 + 2] = col[2];
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    g.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    return { geometry: g };
  }, []);

  useFrame(({ clock }) => {
    starsUniforms.current.uTime.value = clock.elapsedTime;
    nebulaUniforms.current.uTime.value = clock.elapsedTime;
  });

  return (
    <group>
      <points ref={starsRef} geometry={geometry} frustumCulled={false}>
        <shaderMaterial
          vertexShader={STAR_VERT}
          fragmentShader={STAR_FRAG}
          uniforms={starsUniforms.current}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      <mesh ref={nebulaRef} position={[0, 0, -50]} scale={[80, 80, 80]}>
        <sphereGeometry args={[1, 32, 32]} />
        <shaderMaterial
          vertexShader={NEBULA_VERT}
          fragmentShader={NEBULA_FRAG}
          uniforms={nebulaUniforms.current}
          transparent
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
