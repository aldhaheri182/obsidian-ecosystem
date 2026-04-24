'use client';

import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useRef } from 'react';
import type { RoomDef } from '@/data/openclawRooms';
import { useOpenClawStore } from '@/store/openclawStore';

// Interactable terminal at the centre of each room. Strong cinematic
// presentation: grooved pedestal, projected light cone, vertical beam
// to the ceiling, 2 expanding floor rings that pulse in sync, rotating
// hologram plate + glyph, a dedicated accent point-light, and a
// game-style "PRESS E" card that scales up when the player is near.
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
  const glyphGroup = useRef<THREE.Group>(null);
  const pillarMat = useRef<THREE.MeshStandardMaterial>(null);
  const beamMat = useRef<THREE.MeshBasicMaterial>(null);
  const pillarLight = useRef<THREE.PointLight>(null);

  const ring1 = useRef<THREE.Mesh>(null);
  const ring2 = useRef<THREE.Mesh>(null);

  const isNearest = useOpenClawStore((s) => s.nearestRoomId === room.id);
  const panelOpen = useOpenClawStore((s) => s.openPanelRoomId === room.id);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const nearFactor = isNearest ? 1 : 0;

    if (hologram.current) {
      hologram.current.rotation.y = t * 0.8;
      hologram.current.position.y = 1.05 + Math.sin(t * 1.8) * 0.06;
    }
    if (glyphGroup.current) {
      glyphGroup.current.rotation.y = -t * 0.9;
      glyphGroup.current.scale.setScalar(1 + nearFactor * 0.22);
    }
    if (pillarMat.current) {
      pillarMat.current.emissiveIntensity =
        1.6 + nearFactor * 2.4 + Math.sin(t * 2.2) * 0.3;
    }
    if (beamMat.current) {
      beamMat.current.opacity = 0.22 + nearFactor * 0.35 + Math.sin(t * 1.7) * 0.05;
    }
    if (pillarLight.current) {
      pillarLight.current.intensity = 1.3 + nearFactor * 2.5 + Math.sin(t * 2.4) * 0.25;
    }

    // Floor rings — two expanding circles, staggered in phase
    [ring1.current, ring2.current].forEach((m, idx) => {
      if (!m) return;
      const period = 2.2;
      const phase = ((t / period + idx * 0.5) % 1);
      const s = 0.4 + phase * 2.4;
      m.scale.set(s, s, 1);
      const mat = m.material as THREE.MeshBasicMaterial;
      mat.opacity = (1 - phase) * (0.55 + nearFactor * 0.45);
    });
  });

  return (
    <group position={position}>
      {/* Big grooved pedestal base — cylindrical with a top accent disc */}
      <mesh position={[0, 0.09, 0]} castShadow>
        <cylinderGeometry args={[0.52, 0.62, 0.18, 32]} />
        <meshStandardMaterial color="#0b1122" metalness={0.8} roughness={0.25} />
      </mesh>
      {/* Pedestal accent stripe */}
      <mesh position={[0, 0.18, 0]}>
        <torusGeometry args={[0.56, 0.012, 8, 48]} />
        <meshStandardMaterial color={room.accent} emissive={room.accent} emissiveIntensity={2.2} toneMapped={false} />
      </mesh>
      {/* Top disc — emissive — the light-cone emitter */}
      <mesh position={[0, 0.22, 0]}>
        <cylinderGeometry args={[0.42, 0.42, 0.04, 32]} />
        <meshStandardMaterial ref={pillarMat} color={room.accent} emissive={room.accent} emissiveIntensity={2.0} toneMapped={false} />
      </mesh>

      {/* Dedicated accent point light over the terminal — the source of
          the interior's color identity. Pulses. */}
      <pointLight
        ref={pillarLight}
        color={room.accent}
        intensity={1.8}
        distance={5.5}
        decay={1.4}
        position={[0, 1.2, 0]}
      />

      {/* Vertical light beam — tall narrow cylinder with additive blend
          reaching up to the ceiling. Much more dramatic than the old
          short cone. */}
      <mesh position={[0, 1.55, 0]}>
        <cylinderGeometry args={[0.06, 0.3, 2.8, 24, 1, true]} />
        <meshBasicMaterial
          ref={beamMat}
          color={room.accent}
          transparent
          opacity={0.3}
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>

      {/* Two expanding floor pulse rings */}
      <mesh ref={ring1} position={[0, 0.045, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.35, 0.38, 48]} />
        <meshBasicMaterial color={room.accent} transparent opacity={0.6} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <mesh ref={ring2} position={[0, 0.045, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.35, 0.38, 48]} />
        <meshBasicMaterial color={room.accent} transparent opacity={0.6} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>

      {/* Floating hologram plate + counter-rotating glyph layer */}
      <group ref={hologram} position={[0, 1.05, 0]}>
        <mesh>
          <ringGeometry args={[0.36, 0.40, 36]} />
          <meshBasicMaterial color={room.accent} transparent opacity={0.9} side={THREE.DoubleSide} toneMapped={false} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <ringGeometry args={[0.48, 0.50, 4]} />
          <meshBasicMaterial color={room.accent} transparent opacity={0.55} side={THREE.DoubleSide} toneMapped={false} />
        </mesh>
        <group ref={glyphGroup}>
          <Html center style={{ pointerEvents: 'none' }} distanceFactor={6.5}>
            <div
              style={{
                color: room.accent,
                textShadow: `0 0 14px ${room.accent}, 0 0 28px ${room.accent}66`,
                fontSize: 44,
                fontWeight: 700,
                fontFamily: 'Cinzel, serif',
                filter: `drop-shadow(0 0 6px ${room.accent})`,
              }}
            >
              {glyph}
            </div>
          </Html>
        </group>
      </group>

      {/* Press E game-style card — two-row card with key chip + title +
          codename/hint row, rotating border sheen, scales on approach. */}
      {isNearest && !panelOpen && (
        <Html
          position={[0, 2.15, 0]}
          center
          distanceFactor={8}
          occlude={false}
          style={{ pointerEvents: 'none' }}
        >
          <div
            className="font-mono"
            style={{
              whiteSpace: 'nowrap',
              position: 'relative',
              padding: '10px 16px 10px 14px',
              background: 'linear-gradient(140deg, rgba(10,14,26,0.95), rgba(4,6,12,0.95))',
              border: `1.5px solid ${room.accent}`,
              borderRadius: 8,
              color: room.accent,
              boxShadow: `0 0 22px ${room.accent}88, inset 0 0 18px ${room.accent}22`,
              textAlign: 'left',
              minWidth: 240,
            }}
          >
            {/* Rotating sheen ring */}
            <div
              aria-hidden
              style={{
                position: 'absolute',
                inset: -2,
                borderRadius: 10,
                background: `conic-gradient(from 0deg, transparent 0deg, ${room.accent}44 60deg, transparent 120deg)`,
                filter: 'blur(4px)',
                animation: 'spin 2.4s linear infinite',
                pointerEvents: 'none',
                zIndex: 0,
              }}
            />
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 12 }}>
              <span
                style={{
                  background: room.accent,
                  color: '#0a0a0f',
                  padding: '6px 10px',
                  borderRadius: 6,
                  fontWeight: 800,
                  fontSize: 15,
                  letterSpacing: 0.5,
                  boxShadow: `0 0 14px ${room.accent}`,
                  minWidth: 28,
                  textAlign: 'center',
                }}
              >
                E
              </span>
              <div style={{ lineHeight: 1.15 }}>
                <div style={{ fontSize: 13, letterSpacing: '0.22em', fontWeight: 700 }}>
                  {label.toUpperCase()}
                </div>
                <div style={{ fontSize: 9, letterSpacing: '0.32em', opacity: 0.6, marginTop: 2 }}>
                  {room.codename.toUpperCase()} — {room.name}
                </div>
              </div>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}
