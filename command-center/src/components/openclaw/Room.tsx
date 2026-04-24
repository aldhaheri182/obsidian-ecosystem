'use client';

import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { useOpenClawStore } from '@/store/openclawStore';
import type { RoomDef } from '@/data/openclawRooms';
import { RoomInterior } from './RoomInterior';
import { NPCAgent } from './NPCAgent';

const FLOOR_H = 0.05;
const WALL_H = 1.6;

// One room: glowing floor tile, transparent glass walls, neon trim,
// interior light, floating label, interior archetype, and NPC agents.
export function Room({ room }: { room: RoomDef }) {
  const [cx, cz] = room.center;
  const [w, d] = room.size;
  const selected = useOpenClawStore((s) => s.openPanelRoomId === room.id);
  const nearby = useOpenClawStore((s) => s.nearestRoomId === room.id);
  const trimMat = useRef<THREE.MeshStandardMaterial>(null);

  useFrame(({ clock }) => {
    if (trimMat.current) {
      const base = 1.8;
      const t = clock.elapsedTime;
      trimMat.current.emissiveIntensity =
        base + (nearby ? 1.4 : 0) + (selected ? 2 : 0) + Math.sin(t * 2 + cx) * 0.15;
    }
  });

  const edgeMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#1c2030',
        roughness: 0.5,
        metalness: 0.7,
      }),
    [],
  );

  // NPC waypoints — cross-pattern inside room (room-local coords)
  const waypoints = useMemo<Array<[number, number, number]>>(() => {
    const hw = w / 2 - 0.9;
    const hd = d / 2 - 0.9;
    return [
      [cx - hw, 0.12, cz - hd],
      [cx + hw, 0.12, cz - hd],
      [cx + hw, 0.12, cz + hd],
      [cx - hw, 0.12, cz + hd],
    ];
  }, [cx, cz, w, d]);

  return (
    <group position={[cx, 0, cz]}>
      {/* Floor inlay */}
      <mesh position={[0, FLOOR_H / 2 + 0.001, 0]}>
        <boxGeometry args={[w, FLOOR_H, d]} />
        <meshStandardMaterial
          color="#0f1428"
          emissive={room.accent}
          emissiveIntensity={0.08}
          roughness={0.6}
          metalness={0.2}
        />
      </mesh>

      {/* Transparent glass walls — 3 walls (leave front opening for camera) */}
      <Wall edgeMat={edgeMat} accent={room.accent} w={w} h={WALL_H} d={d} side="back" />
      <Wall edgeMat={edgeMat} accent={room.accent} w={w} h={WALL_H} d={d} side="left" />
      <Wall edgeMat={edgeMat} accent={room.accent} w={w} h={WALL_H} d={d} side="right" />

      {/* Neon floor trim — emissive ring outlining the tile */}
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[Math.min(w, d) / 2 - 0.1, Math.min(w, d) / 2 - 0.02, 48]} />
        <meshStandardMaterial
          ref={trimMat}
          color={room.accent}
          emissive={room.accent}
          emissiveIntensity={1.8}
          side={THREE.DoubleSide}
          toneMapped={false}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Interior point light */}
      <pointLight color={room.glow} intensity={1.2} distance={Math.max(w, d) * 1.8} position={[0, WALL_H - 0.2, 0]} />

      {/* Interior props (archetype-specific machines) */}
      <RoomInterior room={room} />

      {/* NPC agents */}
      {Array.from({ length: room.agentCount }).map((_, i) => (
        <NPCAgent
          key={`${room.id}-npc-${i}`}
          accent={room.accent}
          waypoints={[
            waypoints[(0 + i) % 4],
            waypoints[(1 + i) % 4],
            waypoints[(2 + i) % 4],
            waypoints[(3 + i) % 4],
          ].map((wp) => [wp[0] - cx, wp[1], wp[2] - cz] as [number, number, number])}
          seed={i * 71}
        />
      ))}

      {/* Floating label above room */}
      <Html
        position={[0, WALL_H + 1.2, 0]}
        center
        distanceFactor={22}
        occlude={false}
        style={{ pointerEvents: 'none' }}
      >
        <div
          className="font-ceremonial"
          style={{
            color: room.accent,
            textShadow: `0 0 10px ${room.accent}`,
            whiteSpace: 'nowrap',
            letterSpacing: '0.3em',
            fontSize: 13,
            fontWeight: 600,
            transform: `scale(${selected ? 1.2 : 1})`,
            transition: 'transform 0.2s',
          }}
        >
          {room.name.toUpperCase()}
        </div>
      </Html>
    </group>
  );
}

function Wall({
  edgeMat, accent, w, h, d, side,
}: {
  edgeMat: THREE.Material;
  accent: string;
  w: number;
  h: number;
  d: number;
  side: 'back' | 'left' | 'right';
}) {
  // Glass pane + neon top edge
  let pos: [number, number, number] = [0, h / 2, 0];
  let paneSize: [number, number] = [w, h];
  let rot: [number, number, number] = [0, 0, 0];
  if (side === 'back') {
    pos = [0, h / 2, -d / 2];
    paneSize = [w, h];
    rot = [0, 0, 0];
  } else if (side === 'left') {
    pos = [-w / 2, h / 2, 0];
    paneSize = [d, h];
    rot = [0, Math.PI / 2, 0];
  } else {
    pos = [w / 2, h / 2, 0];
    paneSize = [d, h];
    rot = [0, -Math.PI / 2, 0];
  }

  return (
    <group position={pos} rotation={rot}>
      {/* Frame outline (cheap: 4 slim boxes) */}
      <mesh position={[0, h / 2 - 0.01, 0]}>
        <boxGeometry args={[paneSize[0], 0.04, 0.04]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.8} toneMapped={false} />
      </mesh>
      <mesh position={[0, -h / 2 + 0.01, 0]}>
        <boxGeometry args={[paneSize[0], 0.04, 0.04]} />
        <primitive attach="material" object={edgeMat} />
      </mesh>
      {/* Glass pane */}
      <mesh>
        <planeGeometry args={[paneSize[0], paneSize[1]]} />
        <meshPhysicalMaterial
          color="#ffffff"
          roughness={0.12}
          metalness={0}
          clearcoat={0.25}
          transmission={0.92}
          ior={1.5}
          transparent
          opacity={0.15}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}
