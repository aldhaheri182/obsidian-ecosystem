'use client';

import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';

// Tiny agent character that walks a waypoint loop inside its room.
// Capsule body + sphere head + brighter accented visor, badge halo,
// pulsing ground disc under feet and a fading micro walk-trail for
// a more alive, game-like presence.
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
  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);
  const visorMat = useRef<THREE.MeshStandardMaterial>(null);
  const haloMat = useRef<THREE.MeshBasicMaterial>(null);
  const discMat = useRef<THREE.MeshBasicMaterial>(null);

  const state = useMemo(
    () => ({ wp: 0, phase: ((seed * 127) % 628) / 100 }),
    [seed],
  );

  // Micro walk-trail — 4 small fading dots
  const trailRefs = useRef<Array<THREE.Mesh | null>>([]);
  const trailPositions = useRef<Array<[number, number]>>(
    Array.from({ length: 4 }, () => [0, 0]),
  );
  const trailTick = useRef(0);

  useFrame(({ clock }, dt) => {
    if (!root.current || waypoints.length === 0) return;
    const target = waypoints[state.wp];
    const dx = target[0] - root.current.position.x;
    const dz = target[2] - root.current.position.z;
    const d = Math.hypot(dx, dz);
    let walking = false;
    if (d < 0.15) {
      state.wp = (state.wp + 1) % waypoints.length;
    } else {
      walking = true;
      const spd = 0.6;
      root.current.position.x += (dx / d) * spd * dt;
      root.current.position.z += (dz / d) * spd * dt;
      root.current.rotation.y = Math.atan2(dx, dz);
    }
    const t = clock.elapsedTime * 4 + state.phase;
    if (body.current) {
      body.current.position.y = 0.22 + Math.abs(Math.sin(t)) * 0.03;
    }
    if (legL.current && legR.current) {
      const sw = walking ? Math.sin(t) * 0.4 : 0;
      legL.current.rotation.x = sw;
      legR.current.rotation.x = -sw;
    }
    if (visorMat.current) {
      visorMat.current.emissiveIntensity = 2.2 + Math.sin(clock.elapsedTime * 2.3 + state.phase) * 0.35;
    }
    if (haloMat.current) {
      haloMat.current.opacity = 0.4 + Math.sin(clock.elapsedTime * 2.0) * 0.12;
    }
    if (discMat.current) {
      discMat.current.opacity = (walking ? 0.55 : 0.35) + Math.sin(clock.elapsedTime * 3.0) * 0.08;
    }

    // Update trail every ~0.15s
    trailTick.current += dt;
    if (walking && trailTick.current > 0.15) {
      trailTick.current = 0;
      const positions = trailPositions.current;
      for (let i = positions.length - 1; i > 0; i--) {
        positions[i] = positions[i - 1];
      }
      positions[0] = [root.current.position.x, root.current.position.z];
    }
    trailRefs.current.forEach((m, i) => {
      if (!m || !root.current) return;
      const [tx, tz] = trailPositions.current[i];
      m.position.set(tx - root.current.position.x, 0.015, tz - root.current.position.z);
      const mat = m.material as THREE.MeshBasicMaterial;
      const fade = 1 - i / trailRefs.current.length;
      mat.opacity = walking ? fade * 0.35 : mat.opacity * 0.9;
    });
  });

  return (
    <group ref={root}>
      {/* Ground disc under feet — marker of presence */}
      <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.22, 20]} />
        <meshBasicMaterial ref={discMat} color={accent} transparent opacity={0.45} depthWrite={false} toneMapped={false} />
      </mesh>
      {/* Halo ring — gently pulses */}
      <mesh position={[0, 0.014, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.26, 0.32, 32]} />
        <meshBasicMaterial ref={haloMat} color={accent} transparent opacity={0.4} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <group ref={body}>
        {/* Body */}
        <mesh position={[0, 0.22, 0]} castShadow>
          <capsuleGeometry args={[0.095, 0.3, 4, 10]} />
          <meshStandardMaterial color="#1a1e2e" roughness={0.7} />
        </mesh>
        {/* Shoulder accent stripe */}
        <mesh position={[0, 0.3, 0]}>
          <boxGeometry args={[0.19, 0.028, 0.03]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.0} toneMapped={false} />
        </mesh>
        {/* Head */}
        <mesh position={[0, 0.47, 0]}>
          <sphereGeometry args={[0.085, 14, 14]} />
          <meshStandardMaterial color="#e0c7a8" roughness={0.8} />
        </mesh>
        {/* Visor — brighter, slightly larger */}
        <mesh position={[0, 0.48, 0.085]}>
          <boxGeometry args={[0.13, 0.028, 0.008]} />
          <meshStandardMaterial ref={visorMat} color={accent} emissive={accent} emissiveIntensity={2.4} toneMapped={false} />
        </mesh>
        {/* Badge halo — small glowing disc on chest */}
        <mesh position={[0.065, 0.24, 0.09]}>
          <sphereGeometry args={[0.022, 10, 10]} />
          <meshBasicMaterial color={accent} toneMapped={false} />
        </mesh>
        {/* Back antenna tip */}
        <mesh position={[0, 0.56, -0.02]}>
          <cylinderGeometry args={[0.005, 0.01, 0.12, 6]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.3} toneMapped={false} />
        </mesh>
        {/* Legs — now animated */}
        <group ref={legL} position={[-0.04, 0.1, 0]}>
          <mesh position={[0, -0.06, 0]} castShadow>
            <capsuleGeometry args={[0.03, 0.12, 4, 8]} />
            <meshStandardMaterial color="#0e121f" />
          </mesh>
        </group>
        <group ref={legR} position={[0.04, 0.1, 0]}>
          <mesh position={[0, -0.06, 0]} castShadow>
            <capsuleGeometry args={[0.03, 0.12, 4, 8]} />
            <meshStandardMaterial color="#0e121f" />
          </mesh>
        </group>
      </group>
      {/* Walk-trail motes (world-space, corrected to local in useFrame) */}
      {Array.from({ length: 4 }).map((_, i) => (
        <mesh
          // eslint-disable-next-line react/no-array-index-key
          key={i}
          ref={(el) => {
            trailRefs.current[i] = el;
          }}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <circleGeometry args={[0.06, 14]} />
          <meshBasicMaterial color={accent} transparent opacity={0} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}
