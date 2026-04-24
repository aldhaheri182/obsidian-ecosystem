'use client';

// Ambient drone fleet — tiny utility bots that glide through the two
// corridors at ceiling height. Pure eye candy for 'lived-in' density.

import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { BUILDING_W, CORRIDORS } from '@/data/openclawRooms';

const DRONE_COUNT = 8;
const DRONE_Y = 2.65;

export function Drones() {
  // Pre-compute drone state: corridor index, phase, speed, sign.
  const drones = useMemo(() => {
    return Array.from({ length: DRONE_COUNT }).map((_, i) => ({
      corridor: i % 2,
      phase: (i / DRONE_COUNT) * Math.PI * 2,
      speed: 0.35 + (i % 3) * 0.12,
      dir: i % 2 === 0 ? 1 : -1,
    }));
  }, []);

  const refs = useRef<Array<THREE.Group | null>>([]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    drones.forEach((d, i) => {
      const g = refs.current[i];
      if (!g) return;
      const c = CORRIDORS[d.corridor];
      const span = BUILDING_W * 0.9;
      const localT = (t * d.speed * d.dir + d.phase) / (Math.PI * 2);
      const x = ((localT % 1) + 1) % 1;
      g.position.x = -span / 2 + x * span;
      g.position.z = c.centerZ + Math.sin(t * 1.4 + i) * 0.25;
      g.position.y = DRONE_Y + Math.sin(t * 2 + i * 0.7) * 0.08;
      g.rotation.y = d.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    });
  });

  return (
    <group>
      {drones.map((d, i) => (
        <group
          key={i}
          ref={(g) => { refs.current[i] = g; }}
        >
          {/* Central body */}
          <mesh castShadow>
            <boxGeometry args={[0.26, 0.09, 0.14]} />
            <meshStandardMaterial color="#1a2238" metalness={0.7} roughness={0.3} />
          </mesh>
          {/* Top accent strip */}
          <mesh position={[0, 0.07, 0]}>
            <boxGeometry args={[0.18, 0.02, 0.08]} />
            <meshStandardMaterial color="#4ECDC4" emissive="#4ECDC4" emissiveIntensity={2.5} toneMapped={false} />
          </mesh>
          {/* Underside spotlight */}
          <mesh position={[0, -0.06, 0]}>
            <cylinderGeometry args={[0.06, 0.1, 0.05, 12]} />
            <meshStandardMaterial color="#FFD166" emissive="#FFD166" emissiveIntensity={2.8} toneMapped={false} />
          </mesh>
          <pointLight color="#FFD166" intensity={0.6} distance={1.8} position={[0, -0.25, 0]} />
          {/* Four rotor glow dots */}
          {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => (
            <mesh key={`${sx}-${sz}`} position={[sx * 0.17, 0.04, sz * 0.09]}>
              <sphereGeometry args={[0.018, 6, 6]} />
              <meshBasicMaterial color="#00F5D4" transparent opacity={0.9} toneMapped={false} />
            </mesh>
          )))}
        </group>
      ))}
    </group>
  );
}
