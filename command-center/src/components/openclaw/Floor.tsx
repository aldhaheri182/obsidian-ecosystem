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
      <CornerPylons />
      <DeepFogBand />
    </group>
  );
}

// Platform the building sits on — much larger than the building to
// convey massive scale, with nested chevron rims, concentric rings, and
// a faint grid around the outside (gives isometric depth cues).
function Platform() {
  const W = (WORLD_BOUNDS.maxX - WORLD_BOUNDS.minX) + 26;
  const D = (WORLD_BOUNDS.maxZ - WORLD_BOUNDS.minZ) + 24;
  const R = Math.max(W, D) / 2;

  // Pulsing chevron rim — subtle breathing of the outer neon rings
  const rimA = useRef<THREE.MeshStandardMaterial>(null);
  const rimB = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (rimA.current) rimA.current.emissiveIntensity = 1.4 + Math.sin(t * 0.8) * 0.35;
    if (rimB.current) rimB.current.emissiveIntensity = 1.0 + Math.sin(t * 0.8 + 1.2) * 0.25;
  });

  // Chevron teeth positioned around perimeter — 40 of them, alternating
  // outward/inward direction for a mechanical "installation plate" feel.
  const chevrons = useMemo(() => {
    const arr: Array<{ pos: [number, number, number]; rot: number }> = [];
    const count = 56;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      // Squircle-ish placement: clamp to rectangle-ish outline
      const cx = Math.cos(a) * (W / 2 - 1.0);
      const cz = Math.sin(a) * (D / 2 - 1.0);
      arr.push({ pos: [cx, 0.02, cz], rot: -a });
    }
    return arr;
  }, [W, D]);

  return (
    <group>
      {/* Deep base — thicker, slight bevel */}
      <mesh receiveShadow position={[0, -0.5, 0]}>
        <boxGeometry args={[W, 0.5, D]} />
        <meshStandardMaterial color="#05080f" roughness={0.82} metalness={0.32} />
      </mesh>
      {/* Mid platform shelf (visual step, creates depth) */}
      <mesh receiveShadow position={[0, -0.18, 0]}>
        <boxGeometry args={[W - 2.2, 0.08, D - 2.2]} />
        <meshStandardMaterial color="#0a1020" roughness={0.7} metalness={0.45} />
      </mesh>
      <Grid
        position={[0, -0.12, 0]}
        args={[W - 1, D - 1]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#24324a"
        sectionSize={5}
        sectionThickness={1.1}
        sectionColor="#3ca9ff"
        fadeDistance={95}
        fadeStrength={1.6}
        infiniteGrid={false}
      />
      {/* Two concentric outer neon rings (chevron rim) */}
      <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[R - 0.9, R - 0.65, 6]} />
        <meshStandardMaterial ref={rimA} color="#4ECDC4" emissive="#4ECDC4" emissiveIntensity={1.5} side={THREE.DoubleSide} transparent opacity={0.65} toneMapped={false} />
      </mesh>
      <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[R - 2.1, R - 1.95, 6]} />
        <meshStandardMaterial ref={rimB} color="#7AD7FF" emissive="#7AD7FF" emissiveIntensity={1.0} side={THREE.DoubleSide} transparent opacity={0.45} toneMapped={false} />
      </mesh>
      {/* Chevron teeth along the perimeter */}
      {chevrons.map((c, i) => (
        <mesh key={i} position={c.pos} rotation={[-Math.PI / 2, 0, c.rot]}>
          <planeGeometry args={[0.35, 0.11]} />
          <meshBasicMaterial color={i % 3 === 0 ? '#FFD166' : '#4ECDC4'} transparent opacity={0.85} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

// Four corner pylons — tall illuminated beacons marking the facility
// footprint. Read instantly on the isometric camera.
function CornerPylons() {
  const beacons = useRef<Array<THREE.MeshBasicMaterial | null>>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    beacons.current.forEach((m, i) => {
      if (!m) return;
      m.opacity = 0.55 + Math.abs(Math.sin(t * 1.5 + i * 0.9)) * 0.45;
    });
  });

  const W = (WORLD_BOUNDS.maxX - WORLD_BOUNDS.minX) + 18;
  const D = (WORLD_BOUNDS.maxZ - WORLD_BOUNDS.minZ) + 16;
  const spots: Array<[number, number]> = [
    [-W / 2, -D / 2],
    [W / 2, -D / 2],
    [-W / 2, D / 2],
    [W / 2, D / 2],
  ];
  return (
    <group>
      {spots.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          {/* Pylon base */}
          <mesh position={[0, 0.25, 0]} castShadow>
            <cylinderGeometry args={[0.35, 0.55, 0.5, 12]} />
            <meshStandardMaterial color="#0a0f1e" metalness={0.8} roughness={0.3} />
          </mesh>
          {/* Pylon shaft */}
          <mesh position={[0, 2.0, 0]} castShadow>
            <cylinderGeometry args={[0.12, 0.18, 3.4, 10]} />
            <meshStandardMaterial color="#10182b" metalness={0.85} roughness={0.28} />
          </mesh>
          {/* Beacon top */}
          <mesh position={[0, 3.85, 0]}>
            <sphereGeometry args={[0.28, 16, 16]} />
            <meshStandardMaterial color="#4ECDC4" emissive="#4ECDC4" emissiveIntensity={2.4} toneMapped={false} />
          </mesh>
          {/* Beacon flare — additive plane */}
          <mesh position={[0, 3.85, 0]} rotation={[0, 0, 0]}>
            <sphereGeometry args={[0.55, 16, 16]} />
            <meshBasicMaterial
              ref={(m) => { beacons.current[i] = m; }}
              color="#4ECDC4"
              transparent
              opacity={0.6}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              toneMapped={false}
            />
          </mesh>
          {/* Beacon pointlight — casts colored ambient */}
          <pointLight color="#4ECDC4" intensity={1.4} distance={7} decay={1.6} position={[0, 3.8, 0]} />
          {/* Vertical antenna streak */}
          <mesh position={[0, 4.7, 0]}>
            <cylinderGeometry args={[0.015, 0.03, 1.5, 6]} />
            <meshStandardMaterial color="#4ECDC4" emissive="#4ECDC4" emissiveIntensity={1.6} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// Volumetric fog band hugging the platform — reinforces depth when
// viewed isometrically.
function DeepFogBand() {
  const ring = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (ring.current) ring.current.opacity = 0.14 + Math.sin(t * 0.5) * 0.03;
  });
  const R = (WORLD_BOUNDS.maxX - WORLD_BOUNDS.minX) / 2 + 18;
  return (
    <group>
      {/* Wide flat disc — simulates ground fog */}
      <mesh position={[0, -0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[R * 0.62, R * 1.05, 64]} />
        <meshBasicMaterial
          ref={ring}
          color="#3ca9ff"
          transparent
          opacity={0.16}
          depthWrite={false}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

// Building slab — the main floor of the facility.
function Slab() {
  return (
    <group>
      {/* Warm interior slab — tiled visual comes from rooms/corridors. */}
      <mesh receiveShadow position={[0, 0.01, 0]}>
        <boxGeometry args={[BUILDING_W, 0.02, BUILDING_D]} />
        <meshStandardMaterial color="#d6ccb4" roughness={0.9} metalness={0.05} />
      </mesh>
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
          {/* Corridor floor tint — warm light runway */}
          <mesh>
            <boxGeometry args={[BUILDING_W - 0.4, 0.012, c.depth]} />
            <meshStandardMaterial color="#c4b999" roughness={0.75} metalness={0.05} />
          </mesh>
          {/* Centre guide stripe */}
          <mesh position={[0, 0.007, 0]}>
            <boxGeometry args={[BUILDING_W - 1.0, 0.003, 0.05]} />
            <meshStandardMaterial color="#4ECDC4" emissive="#4ECDC4" emissiveIntensity={1.2} toneMapped={false} />
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
        color: '#ece4d0',
        roughness: 0.82,
        metalness: 0.08,
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
  const PART_H = 1.6;
  const T = 0.12;

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
          {/* Solid interior wall — warm off-white, so rooms read as
              distinct enclosed spaces in the Pokemon-lab style. */}
          <mesh castShadow receiveShadow>
            <boxGeometry args={p.size} />
            <meshStandardMaterial color="#f3efe4" roughness={0.75} metalness={0.05} />
          </mesh>
          {/* Warm baseboard at floor */}
          <mesh position={[0, -p.size[1] / 2 + 0.08, 0]}>
            <boxGeometry args={[p.size[0] + 0.01, 0.16, p.size[2] + 0.01]} />
            <meshStandardMaterial color="#d8cfba" roughness={0.8} metalness={0.02} />
          </mesh>
          {/* Neon top edge — brand accent */}
          <mesh position={[0, p.size[1] / 2 + 0.02, 0]}>
            <boxGeometry args={[p.size[0], 0.04, p.size[2]]} />
            <meshStandardMaterial color="#4ECDC4" emissive="#4ECDC4" emissiveIntensity={1.2} toneMapped={false} />
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
