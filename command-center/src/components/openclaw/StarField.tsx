'use client';

import * as THREE from 'three';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';

// Simple starfield + far purple nebula backdrop.
export function StarField() {
  const stars = useMemo(() => {
    const n = 1800;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const theta = Math.acos(1 - 2 * Math.random());
      const phi = Math.random() * Math.PI * 2;
      const r = 70 + Math.random() * 30;
      pos[i * 3] = r * Math.sin(theta) * Math.cos(phi);
      pos[i * 3 + 1] = r * Math.cos(theta) * 0.6;
      pos[i * 3 + 2] = r * Math.sin(theta) * Math.sin(phi);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);

  const nebulaMat = useRef<THREE.ShaderMaterial>(null);
  useFrame(({ clock }) => {
    if (nebulaMat.current) nebulaMat.current.uniforms.uTime.value = clock.elapsedTime;
  });

  return (
    <group>
      <points geometry={stars} frustumCulled={false}>
        <pointsMaterial color="#d0e0ff" size={0.12} transparent opacity={0.75} sizeAttenuation depthWrite={false} />
      </points>

      <mesh position={[0, 4, -40]} scale={[60, 30, 1]}>
        <planeGeometry args={[1, 1]} />
        <shaderMaterial
          ref={nebulaMat}
          transparent
          depthWrite={false}
          uniforms={{ uTime: { value: 0 } }}
          vertexShader={`
            varying vec2 vUv;
            void main() {
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `}
          fragmentShader={`
            varying vec2 vUv;
            uniform float uTime;
            float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
            float noise(vec2 p) {
              vec2 i = floor(p); vec2 f = fract(p);
              f = f*f*(3.0-2.0*f);
              return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),
                         mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y);
            }
            float fbm(vec2 p) {
              float s=0.0, a=0.5;
              for (int i=0;i<5;i++){ s+=a*noise(p); p*=2.05; a*=0.5; }
              return s;
            }
            void main() {
              vec2 uv = vUv;
              vec2 p = uv * 2.0 + vec2(uTime*0.01, -uTime*0.008);
              float n = fbm(p);
              vec3 purple = vec3(0.22, 0.08, 0.45);
              vec3 cyan   = vec3(0.0, 0.60, 0.70);
              vec3 col = mix(vec3(0.02,0.02,0.05), purple, smoothstep(0.25, 0.75, n));
              col = mix(col, cyan, smoothstep(0.55, 0.9, fbm(p*2.2+3.0))*0.35);
              float alpha = smoothstep(0.2, 0.8, n) * 0.8;
              alpha *= smoothstep(0.0, 0.15, uv.y) * smoothstep(1.0, 0.85, uv.y);
              gl_FragColor = vec4(col, alpha);
            }
          `}
        />
      </mesh>
    </group>
  );
}
