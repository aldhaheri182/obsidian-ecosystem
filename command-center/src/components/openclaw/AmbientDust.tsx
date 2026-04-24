'use client';

// Ambient volumetric dust — slow-drifting motes inside the building,
// plus a second, slightly larger outdoor layer for atmospheric depth.

import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { BUILDING_W, BUILDING_D } from '@/data/openclawRooms';

export function AmbientDust() {
  const interior = useMotes(420, {
    xRange: BUILDING_W,
    yMin: 0.2,
    yMax: 2.4,
    zRange: BUILDING_D,
    color: '#4ECDC4',
    size: 0.04,
    opacity: 0.35,
    rise: 0.06,
  });
  const exterior = useMotes(260, {
    xRange: BUILDING_W + 30,
    yMin: 0.1,
    yMax: 6.0,
    zRange: BUILDING_D + 24,
    color: '#7AA0D6',
    size: 0.06,
    opacity: 0.22,
    rise: 0.03,
  });
  return (
    <group>
      <points ref={interior.ref} geometry={interior.geo} frustumCulled={false}>
        <pointsMaterial
          color={interior.params.color}
          size={interior.params.size}
          transparent
          opacity={interior.params.opacity}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </points>
      <points ref={exterior.ref} geometry={exterior.geo} frustumCulled={false}>
        <pointsMaterial
          color={exterior.params.color}
          size={exterior.params.size}
          transparent
          opacity={exterior.params.opacity}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </points>
    </group>
  );
}

function useMotes(
  count: number,
  params: {
    xRange: number;
    yMin: number;
    yMax: number;
    zRange: number;
    color: string;
    size: number;
    opacity: number;
    rise: number;
  },
) {
  const ref = useRef<THREE.Points>(null);
  const { geo, pos } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * params.xRange;
      pos[i * 3 + 1] = params.yMin + Math.random() * (params.yMax - params.yMin);
      pos[i * 3 + 2] = (Math.random() - 0.5) * params.zRange;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return { geo: g, pos };
  }, [count, params.xRange, params.yMin, params.yMax, params.zRange]);

  useFrame((_, dt) => {
    if (!ref.current) return;
    const a = ref.current.geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = a.array as Float32Array;
    for (let i = 0; i < arr.length; i += 3) {
      arr[i + 1] += dt * params.rise;
      arr[i] += Math.sin((arr[i + 1] + i) * 0.6) * dt * 0.04;
      if (arr[i + 1] > params.yMax) {
        arr[i + 1] = params.yMin;
        arr[i] = (Math.random() - 0.5) * params.xRange;
        arr[i + 2] = (Math.random() - 0.5) * params.zRange;
      }
    }
    a.needsUpdate = true;
  });
  return { ref, geo, params, pos };
}
