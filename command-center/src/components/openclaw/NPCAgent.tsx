'use client';

import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';

// Tiny agent character that walks a waypoint loop inside its room.
// Capsule body + sphere head + accent ID badge + walking bob.
export function NPCAgent({
  accent,
  waypoints,
  seed = 0,
}: {
  accent: string;
  waypoints: Array<[number, number, number]>;
  seed?: number;
}) {
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);

  const state = useMemo(
    () => ({ wp: 0, phase: ((seed * 127) % 628) / 100 }),
    [seed],
  );

  useFrame(({ clock }, dt) => {
    if (!root.current || waypoints.length === 0) return;
    const target = waypoints[state.wp];
    const dx = target[0] - root.current.position.x;
    const dz = target[2] - root.current.position.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.15) {
      state.wp = (state.wp + 1) % waypoints.length;
    } else {
      const spd = 0.6;
      root.current.position.x += (dx / d) * spd * dt;
      root.current.position.z += (dz / d) * spd * dt;
      root.current.rotation.y = Math.atan2(dx, dz);
    }
    if (body.current) {
      const t = clock.elapsedTime * 4 + state.phase;
      body.current.position.y = 0.22 + Math.abs(Math.sin(t)) * 0.03;
    }
  });

  return (
    <group ref={root}>
      <group ref={body}>
        {/* Body */}
        <mesh position={[0, 0.22, 0]} castShadow>
          <capsuleGeometry args={[0.09, 0.28, 4, 10]} />
          <meshStandardMaterial color="#1a1e2e" roughness={0.7} />
        </mesh>
        {/* Head */}
        <mesh position={[0, 0.45, 0]}>
          <sphereGeometry args={[0.08, 14, 14]} />
          <meshStandardMaterial color="#e0c7a8" roughness={0.8} />
        </mesh>
        {/* Visor */}
        <mesh position={[0, 0.46, 0.08]}>
          <boxGeometry args={[0.1, 0.02, 0.005]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.4} toneMapped={false} />
        </mesh>
        {/* ID badge */}
        <mesh position={[0.06, 0.22, 0.08]}>
          <boxGeometry args={[0.03, 0.03, 0.005]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.2} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}
