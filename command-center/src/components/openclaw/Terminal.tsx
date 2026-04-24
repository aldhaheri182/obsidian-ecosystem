'use client';

import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useRef } from 'react';
import type { RoomDef } from '@/data/openclawRooms';
import { useOpenClawStore } from '@/store/openclawStore';

// Interactable terminal at the centre of each room. Proximity to the
// player is detected in World.tsx; this component just renders the
// hologram + floating "Press E" label when the player is near.
export function Terminal({
  room,
  label,
  position = [0, 0, 0],
  glyph = '◆',
}: {
  room: RoomDef;
  label: string;
  position?: [number, number, number];
  glyph?: string;
}) {
  const hologram = useRef<THREE.Group>(null);
  const pillar = useRef<THREE.MeshStandardMaterial>(null);
  const isNearest = useOpenClawStore((s) => s.nearestRoomId === room.id);
  const panelOpen = useOpenClawStore((s) => s.openPanelRoomId === room.id);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (hologram.current) {
      hologram.current.rotation.y = t * 0.8;
      hologram.current.position.y = 1.0 + Math.sin(t * 1.8) * 0.05;
    }
    if (pillar.current) {
      pillar.current.emissiveIntensity = 1.2 + (isNearest ? 1.5 : 0) + Math.sin(t * 2) * 0.2;
    }
  });

  return (
    <group position={position}>
      {/* Base pedestal */}
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.45, 0.55, 0.2, 24]} />
        <meshStandardMaterial color="#12172a" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.23, 0]}>
        <cylinderGeometry args={[0.38, 0.38, 0.03, 24]} />
        <meshStandardMaterial ref={pillar} color={room.accent} emissive={room.accent} emissiveIntensity={1.5} toneMapped={false} />
      </mesh>

      {/* Hologram pillar (projected beam) */}
      <mesh position={[0, 0.7, 0]}>
        <cylinderGeometry args={[0.04, 0.24, 0.9, 20]} />
        <meshBasicMaterial color={room.accent} transparent opacity={0.25} depthWrite={false} toneMapped={false} />
      </mesh>

      {/* Floating hologram glyph */}
      <group ref={hologram} position={[0, 1.0, 0]}>
        <mesh>
          <ringGeometry args={[0.35, 0.38, 32]} />
          <meshBasicMaterial color={room.accent} transparent opacity={0.85} side={THREE.DoubleSide} toneMapped={false} />
        </mesh>
        <Html center style={{ pointerEvents: 'none' }} distanceFactor={8}>
          <div
            style={{
              color: room.accent,
              textShadow: `0 0 10px ${room.accent}`,
              fontSize: 32,
              fontWeight: 700,
              fontFamily: 'Cinzel, serif',
            }}
          >
            {glyph}
          </div>
        </Html>
      </group>

      {/* Press E prompt, only when nearest */}
      {isNearest && !panelOpen && (
        <Html
          position={[0, 1.8, 0]}
          center
          distanceFactor={10}
          occlude={false}
          style={{ pointerEvents: 'none' }}
        >
          <div
            className="font-mono"
            style={{
              whiteSpace: 'nowrap',
              background: 'rgba(10,10,15,0.9)',
              border: `1px solid ${room.accent}`,
              borderRadius: 4,
              padding: '4px 10px',
              color: room.accent,
              fontSize: 11,
              letterSpacing: '0.22em',
              boxShadow: `0 0 12px ${room.accent}66`,
              animation: 'pulse-dot 1.4s ease-in-out infinite',
            }}
          >
            <span style={{ background: room.accent, color: '#0a0a0f', padding: '1px 5px', borderRadius: 2, marginRight: 6, fontWeight: 700 }}>E</span>
            {label.toUpperCase()}
          </div>
        </Html>
      )}
    </group>
  );
}
