'use client';

import * as THREE from 'three';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Grid } from '@react-three/drei';
import {
  BUILDING_W, BUILDING_D, CORRIDORS, ROOMS, WORLD_BOUNDS,
} from '@/data/openclawRooms';

// The connected building — outer walls, floor, lit corridors, shared
// internal partitions forming a single operations facility rather than
// scattered cubes.
export function Floor() {
  return (
    <group>
      <Platform />
      <Slab />
      <Corridors />
      <OuterShell />
      <InternalPartitions />
    </group>
  );
}

// Platform the building sits on — slightly larger than the building,
// with a faint grid around the outside (gives isometric depth cues).
function Platform() {
  const W = (WORLD_BOUNDS.maxX - WORLD_BOUNDS.minX) + 16;
  const D = (WORLD_BOUNDS.maxZ - WORLD_BOUNDS.minZ) + 14;
  return (
    <group>
      <mesh receiveShadow position={[0, -0.4, 0]}>
        <boxGeometry args={[W, 0.4, D]} />
        <meshStandardMaterial color="#060912" roughness={0.8} metalness={0.25} />
      </mesh>
      <Grid
        position={[0, -0.18, 0]}
        args={[W - 1, D - 1]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#24324a"
        sectionSize={5}
        sectionThickness={1.1}
        sectionColor="#3ca9ff"
        fadeDistance={70}
        fadeStrength={1.8}
        infiniteGrid={false}
      />
      {/* Outer edge neon ring on the platform */}
      <mesh position={[0, 0.0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[Math.max(W, D) / 2 - 0.5, Math.max(W, D) / 2 - 0.3, 6]} />
        <meshStandardMaterial color="#4ECDC4" emissive="#4ECDC4" emissiveIntensity={1.3} side={THREE.DoubleSide} transparent opacity={0.55} toneMapped={false} />
      </mesh>
    </group>
  );
}

// Building slab — the main floor of the facility.
function Slab() {
  return (
    <group>
      {/* Floor slab slightly above the platform */}
      <mesh receiveShadow position={[0, 0.01, 0]}>
        <boxGeometry args={[BUILDING_W, 0.02, BUILDING_D]} />
        <meshStandardMaterial color="#0c1120" roughness={0.9} metalness={0.2} />
      </mesh>
      {/* Faint cyan grid over the whole floor */}
      <Grid
        position={[0, 0.03, 0]}
        args={[BUILDING_W - 0.2, BUILDING_D - 0.2]}
        cellSize={0.5}
        cellThickness={0.25}
        cellColor="#1b2c44"
        sectionSize={7}
        sectionThickness={0.8}
        sectionColor="#3ca9ff"
        fadeDistance={40}
        fadeStrength={1.4}
        infiniteGrid={false}
      />
    </group>
  );
}

// Two horizontal corridor strips with pulsing floor lights running L→R.
function Corridors() {
  const pulseMat = useRef<THREE.MeshStandardMaterial[]>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    pulseMat.current.forEach((m, i) => {
      if (m) {
        m.emissiveIntensity = 1.2 + Math.abs(Math.sin(t * 1.5 + i * 0.4)) * 1.4;
      }
    });
  });

  return (
    <group>
      {CORRIDORS.map((c, idx) => (
        <group key={idx} position={[0, 0.04, c.centerZ]}>
          {/* Corridor floor tint */}
          <mesh>
            <boxGeometry args={[BUILDING_W - 0.4, 0.012, c.depth]} />
            <meshStandardMaterial color="#0b1428" emissive="#4ECDC4" emissiveIntensity={0.18} />
          </mesh>
          {/* Centre guide stripe */}
          <mesh position={[0, 0.007, 0]}>
            <boxGeometry args={[BUILDING_W - 1.0, 0.003, 0.04]} />
            <meshStandardMaterial color="#4ECDC4" emissive="#4ECDC4" emissiveIntensity={1.4} toneMapped={false} />
          </mesh>
          {/* Pulsing floor dots along both edges */}
          {Array.from({ length: 12 }).map((_, i) => {
            const x = ((i / 11) - 0.5) * (BUILDING_W - 1.2);
            const zEdge = c.depth / 2 - 0.18;
            return (
              <group key={i}>
                <mesh position={[x, 0.006, zEdge]}>
                  <boxGeometry args={[0.22, 0.003, 0.05]} />
                  <meshStandardMaterial
                    ref={(m) => { if (m) pulseMat.current[idx * 24 + i] = m; }}
                    color="#4ECDC4" emissive="#4ECDC4" emissiveIntensity={1.5} toneMapped={false}
                  />
                </mesh>
                <mesh position={[x, 0.006, -zEdge]}>
                  <boxGeometry args={[0.22, 0.003, 0.05]} />
                  <meshStandardMaterial
                    ref={(m) => { if (m) pulseMat.current[idx * 24 + 12 + i] = m; }}
                    color="#4ECDC4" emissive="#4ECDC4" emissiveIntensity={1.5} toneMapped={false}
                  />
                </mesh>
              </group>
            );
          })}
        </group>
      ))}
    </group>
  );
}

// Outer building shell — four walls + a low-profile cornice with neon
// trim. Front/back walls have small openings so data pipes can exit.
function OuterShell() {
  const H = 2.6;
  const T = 0.18;
  const outerMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#121827',
        roughness: 0.55,
        metalness: 0.7,
      }),
    [],
  );

  return (
    <group>
      {/* Back wall */}
      <mesh position={[0, H / 2, -BUILDING_D / 2]}>
        <boxGeometry args={[BUILDING_W, H, T]} />
        <primitive attach="material" object={outerMat} />
      </mesh>
      {/* Front wall */}
      <mesh position={[0, H / 2, BUILDING_D / 2]}>
        <boxGeometry args={[BUILDING_W, H, T]} />
        <primitive attach="material" object={outerMat} />
      </mesh>
      {/* Left wall */}
      <mesh position={[-BUILDING_W / 2, H / 2, 0]}>
        <boxGeometry args={[T, H, BUILDING_D]} />
        <primitive attach="material" object={outerMat} />
      </mesh>
      {/* Right wall */}
      <mesh position={[BUILDING_W / 2, H / 2, 0]}>
        <boxGeometry args={[T, H, BUILDING_D]} />
        <primitive attach="material" object={outerMat} />
      </mesh>

      {/* Neon cornice strip running along the top of the outer walls */}
      {[
        [0, H + 0.04, -BUILDING_D / 2, BUILDING_W, 0.04, 0.04],
        [0, H + 0.04,  BUILDING_D / 2, BUILDING_W, 0.04, 0.04],
        [-BUILDING_W / 2, H + 0.04, 0, 0.04, 0.04, BUILDING_D],
        [BUILDING_W / 2, H + 0.04, 0, 0.04, 0.04, BUILDING_D],
      ].map((p, i) => (
        <mesh key={i} position={[p[0], p[1], p[2]] as [number, number, number]}>
          <boxGeometry args={[p[3], p[4], p[5]]} />
          <meshStandardMaterial color="#4ECDC4" emissive="#4ECDC4" emissiveIntensity={2.2} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

// Internal partitions — low glass walls between every pair of rooms
// (vertical column lines) and between rooms + corridors (horizontal
// lines not covering corridors). Half-height so the isometric camera
// still sees room interiors clearly.
function InternalPartitions() {
  const PART_H = 1.4;
  const T = 0.06;

  const partitions = useMemo(() => {
    const items: Array<{ pos: [number, number, number]; size: [number, number, number]; accent?: string; locked?: boolean }> = [];

    // Vertical column partitions — between every pair of adjacent columns,
    // spanning the full building depth (will be drawn continuously, rooms
    // abut corridors so the partitions pass through corridors too, giving
    // a real building-floorplan feel with doorways punched by absence).
    for (let col = 1; col < 4; col++) {
      const x = -BUILDING_W / 2 + col * (BUILDING_W / 4);
      // Draw 3 partition segments (per row), skipping corridor strips for
      // a sense of door openings.
      for (const r of ROOMS) {
        if (r.grid[0] !== col - 1) continue; // only take one per row
      }
      // Simpler: 3 segments per column line — each ROOM_D tall.
      for (const row of [0, 1, 2]) {
        const zCenter =
          -BUILDING_D / 2 +
          (row === 0 ? 2.5
           : row === 1 ? 5 + 2.2 + 2.5
           : 5 + 2.2 + 5 + 2.2 + 2.5);
        items.push({
          pos: [x, PART_H / 2, zCenter],
          size: [T, PART_H, 5 - 0.4], // leave 0.4 gap each side as a pass-through
        });
      }
    }

    // Horizontal row partitions — between rooms and corridors. 4 segments
    // per horizontal line (one per column), skipping centre-corridor x=0
    // doorway so player can cross between rows.
    const colSegments: Array<[number, number]> = [
      [-BUILDING_W / 2 + 0.3, -BUILDING_W / 2 + 7 - 0.3],      // col 0
      [-BUILDING_W / 2 + 7 + 0.3, -BUILDING_W / 2 + 14 - 0.3], // col 1
      [-BUILDING_W / 2 + 14 + 0.3, -BUILDING_W / 2 + 21 - 0.3],// col 2
      [-BUILDING_W / 2 + 21 + 0.3, -BUILDING_W / 2 + 28 - 0.3],// col 3
    ];
    // Row 0 / corridor A boundary:
    const zA = -BUILDING_D / 2 + 5;
    // Corridor A / row 1 boundary:
    const zAA = zA + 2.2;
    // Row 1 / corridor B boundary:
    const zB = zAA + 5;
    // Corridor B / row 2 boundary:
    const zBB = zB + 2.2;

    for (const z of [zA, zAA, zB, zBB]) {
      for (const [x0, x1] of colSegments) {
        const cx = (x0 + x1) / 2;
        const len = x1 - x0;
        items.push({
          pos: [cx, PART_H / 2, z],
          size: [len, PART_H, T],
        });
      }
    }

    return items;
  }, []);

  return (
    <group>
      {partitions.map((p, i) => (
        <group key={i} position={p.pos}>
          <mesh>
            <boxGeometry args={p.size} />
            <meshPhysicalMaterial
              color="#8fcfff"
              roughness={0.15}
              metalness={0}
              transmission={0.9}
              ior={1.4}
              transparent
              opacity={0.18}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
          {/* Neon top edge */}
          <mesh position={[0, p.size[1] / 2 + 0.02, 0]}>
            <boxGeometry args={[p.size[0], 0.03, p.size[2]]} />
            <meshStandardMaterial color="#4ECDC4" emissive="#4ECDC4" emissiveIntensity={1.5} toneMapped={false} />
          </mesh>
        </group>
      ))}

      {/* SENTINEL locked-glass barrier — a red tinted partition blocking
          the doorway to col 3 / row 1 from the corridor. */}
      <LockedBarrier />
    </group>
  );
}

// Red locked-glass barrier in front of SENTINEL (col 3, row 1). Acts as
// a visual gate — the corridor openings still exist, but this adds a
// red translucent pane across the front of the SENTINEL doorway.
function LockedBarrier() {
  const sentinel = ROOMS.find((r) => r.id === 'sentinel');
  if (!sentinel) return null;
  const [sx, sz] = sentinel.center;
  const PART_H = 1.4;
  return (
    <group position={[sx, PART_H / 2, sz - 2.5 - 1.1]}>
      <mesh>
        <boxGeometry args={[7 - 0.4, PART_H, 0.04]} />
        <meshPhysicalMaterial
          color="#ff4040"
          roughness={0.18}
          metalness={0}
          transmission={0.78}
          ior={1.45}
          transparent
          opacity={0.35}
          side={THREE.DoubleSide}
          emissive="#ff2020"
          emissiveIntensity={0.35}
        />
      </mesh>
      {/* LOCKED placard */}
      <mesh position={[0, 0.2, 0.05]}>
        <boxGeometry args={[1.2, 0.28, 0.02]} />
        <meshStandardMaterial color="#2a0b0b" emissive="#E63946" emissiveIntensity={1.5} toneMapped={false} />
      </mesh>
    </group>
  );
}
