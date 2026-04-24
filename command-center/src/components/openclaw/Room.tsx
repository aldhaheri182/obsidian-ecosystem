'use client';

import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { useOpenClawStore } from '@/store/openclawStore';
import type { RoomDef } from '@/data/openclawRooms';
import { RoomInterior } from './RoomInterior';
import { NPCAgent } from './NPCAgent';

// One room inside the connected headquarters. Walls come from the
// building shell (Floor.tsx InternalPartitions); this component just
// draws the floor tint, the accent trim ring, the interior diorama,
// the NPC agents, and the floating name label above the room.
export function Room({ room }: { room: RoomDef }) {
  const [cx, cz] = room.center;
  const [w, d] = room.size;
  const selected = useOpenClawStore((s) => s.openPanelRoomId === room.id);
  const nearby = useOpenClawStore((s) => s.nearestRoomId === room.id);
  const trimMat = useRef<THREE.MeshStandardMaterial>(null);

  useFrame(({ clock }) => {
    if (trimMat.current) {
      const t = clock.elapsedTime;
      trimMat.current.emissiveIntensity =
        1.5 + (nearby ? 1.2 : 0) + (selected ? 1.8 : 0) + Math.sin(t * 2 + cx) * 0.15;
    }
  });

  // NPC waypoints — small cross-pattern inside the room in local coords.
  const waypoints = useMemo<Array<[number, number, number]>>(() => {
    const hw = w / 2 - 0.9;
    const hd = d / 2 - 0.9;
    return [
      [-hw, 0.12, -hd],
      [ hw, 0.12, -hd],
      [ hw, 0.12,  hd],
      [-hw, 0.12,  hd],
    ];
  }, [w, d]);

  // Build a grid of tiles (checkerboard feel) so the floor reads like a
  // Pokemon-lab interior rather than a dark slab.
  const tiles = useMemo(() => {
    const arr: Array<{ x: number; z: number; dark: boolean }> = [];
    const tileSize = 0.6;
    const cols = Math.floor((w - 0.5) / tileSize);
    const rows = Math.floor((d - 0.5) / tileSize);
    const x0 = -((cols - 1) * tileSize) / 2;
    const z0 = -((rows - 1) * tileSize) / 2;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        arr.push({ x: x0 + c * tileSize, z: z0 + r * tileSize, dark: (r + c) % 2 === 0 });
      }
    }
    return { arr, tileSize };
  }, [w, d]);

  return (
    <group position={[cx, 0, cz]}>
      {/* Warm tile floor — two alternating tile colours, both tinted
          slightly with the room accent so each room feels branded. */}
      <group position={[0, 0.034, 0]}>
        {tiles.arr.map((t, i) => (
          <mesh key={i} position={[t.x, 0, t.z]}>
            <boxGeometry args={[tiles.tileSize * 0.96, 0.012, tiles.tileSize * 0.96]} />
            <meshStandardMaterial
              color={t.dark ? '#dfe6ef' : '#f4f6fa'}
              emissive={room.accent}
              emissiveIntensity={0.04}
              roughness={0.4}
              metalness={0.1}
            />
          </mesh>
        ))}
      </group>

      {/* Accent trim ring on the floor — pulses on proximity/selection */}
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[Math.min(w, d) / 2 - 0.55, Math.min(w, d) / 2 - 0.45, 48]} />
        <meshStandardMaterial
          ref={trimMat}
          color={room.accent}
          emissive={room.accent}
          emissiveIntensity={1.6}
          side={THREE.DoubleSide}
          toneMapped={false}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Warm interior spotlight — simulates ceiling fixture, casts the
          main "Pokemon-lab" key light onto the characters + props below. */}
      <pointLight color="#fff0c0" intensity={1.6} distance={Math.max(w, d) * 1.8} position={[0, 2.1, 0]} castShadow />
      {/* Accent bounce light — adds the brand tint */}
      <pointLight color={room.glow} intensity={0.7} distance={Math.max(w, d) * 1.5} position={[0, 1.1, 0]} />

      {/* Floor decal — room codename, tinted */}
      <mesh position={[0, 0.055, d / 2 - 1.0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w - 1.8, 0.55]} />
        <meshBasicMaterial color="#0a0f1d" transparent opacity={0.55} toneMapped={false} />
      </mesh>
      <Html
        position={[0, 0.06, d / 2 - 1.0]}
        rotation={[-Math.PI / 2, 0, 0]}
        transform
        distanceFactor={14}
        center
        style={{ pointerEvents: 'none' }}
      >
        <div
          className="font-mono"
          style={{
            color: room.accent,
            textShadow: `0 0 6px ${room.accent}`,
            fontSize: 10,
            letterSpacing: '0.3em',
            whiteSpace: 'nowrap',
            opacity: 0.75,
          }}
        >
          {room.codename.toUpperCase()}
        </div>
      </Html>

      {/* Interior diorama */}
      <RoomInterior room={room} />

      {/* NPC agents — AGORA renders its own council members inside
          AgoraRoom, so we skip the default patrol spawn for it. */}
      {room.archetype !== 'strategy' && Array.from({ length: room.agentCount }).map((_, i) => {
        const callsigns = ['oracle', 'scout', 'keeper', 'analyst', 'forge', 'warden', 'herald', 'sentry'];
        const callsign = `${room.id}-${callsigns[i % callsigns.length]}-${String(i + 1).padStart(2, '0')}`;
        const role = room.promptLabel;
        return (
          <NPCAgent
            key={`${room.id}-npc-${i}`}
            accent={room.accent}
            roomId={room.id}
            roomName={room.name}
            index={i}
            callsign={callsign}
            role={role}
            waypoints={[
              waypoints[(0 + i) % 4],
              waypoints[(1 + i) % 4],
              waypoints[(2 + i) % 4],
              waypoints[(3 + i) % 4],
            ]}
            seed={i * 71 + 13}
          />
        );
      })}

      {/* Floating room name label above the rooftop (rooms share cornice,
          so we keep the label just above it) */}
      <Html
        position={[0, 3.0, 0]}
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
            textAlign: 'center',
          }}
        >
          <div>{room.name.toUpperCase()}</div>
          <div
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 8,
              letterSpacing: '0.28em',
              opacity: 0.7,
              marginTop: 1,
            }}
          >
            {room.codename.toUpperCase()}
          </div>
        </div>
      </Html>
    </group>
  );
}
