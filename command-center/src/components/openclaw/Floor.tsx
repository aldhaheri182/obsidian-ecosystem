'use client';

import * as THREE from 'three';
import { useMemo } from 'react';
import { Grid } from '@react-three/drei';
import { WORLD_BOUNDS } from '@/data/openclawRooms';

// Platform floor spanning the full grid. Dark brushed metal + faint cyan grid.
export function Floor() {
  const W = (WORLD_BOUNDS.maxX - WORLD_BOUNDS.minX) + 6;
  const D = (WORLD_BOUNDS.maxZ - WORLD_BOUNDS.minZ) + 6;

  const starMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#0c0f1d',
        roughness: 0.8,
        metalness: 0.15,
      }),
    [],
  );

  return (
    <group>
      <mesh receiveShadow position={[0, -0.15, 0]}>
        <boxGeometry args={[W, 0.3, D]} />
        <primitive attach="material" object={starMat} />
      </mesh>
      {/* Cyan grid over the platform */}
      <Grid
        position={[0, 0.01, 0]}
        args={[W - 2, D - 2]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#3ca9ff"
        sectionSize={5}
        sectionThickness={1.2}
        sectionColor="#3ca9ff"
        fadeDistance={60}
        fadeStrength={2}
        infiniteGrid={false}
      />
      {/* Edge neon strip */}
      <mesh position={[0, 0.02, 0]}>
        <ringGeometry args={[Math.max(W, D) * 0.52, Math.max(W, D) * 0.54, 64]} />
        <meshStandardMaterial color="#4ECDC4" emissive="#4ECDC4" emissiveIntensity={1.2} transparent opacity={0.6} />
      </mesh>
    </group>
  );
}
