'use client';

import * as THREE from 'three';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useMemo, useRef, useState } from 'react';
import { Html } from '@react-three/drei';
import { useOpenClawStore } from '@/store/openclawStore';

// Tiny Pokémon-lab style NPC — chunky low-poly character with hair,
// jacket, legs, and a ground shadow. The whole character is clickable:
// pressing it opens the Agent Panel (store.selectedAgent).
export function NPCAgent({
  accent,
  waypoints,
  seed = 0,
  roomId,
  roomName,
  index = 0,
  callsign,
  role,
}: {
  accent: string;
  waypoints: Array<[number, number, number]>;
  seed?: number;
  roomId: string;
  roomName: string;
  index?: number;
  callsign: string;
  role: string;
}) {
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const haloMat = useRef<THREE.MeshBasicMaterial>(null);

  const [hover, setHover] = useState(false);
  const selectAgent = useOpenClawStore((s) => s.selectAgent);
  const selectedAgent = useOpenClawStore((s) => s.selectedAgent);
  const isSelected =
    selectedAgent?.roomId === roomId && selectedAgent?.index === index;

  const state = useMemo(
    () => ({ wp: 0, phase: ((seed * 127) % 628) / 100 }),
    [seed],
  );

  // Deterministic pseudo-random look per agent — hair colour, jacket
  // colour, so the group of agents feels varied.
  const look = useMemo(() => {
    const hairs = ['#3d2713', '#7a4a1e', '#1a1a1a', '#c0a060', '#8b3a2f'];
    const shirts = ['#e7eaf2', '#cfe5ff', '#ffd7a8', '#ffd9e4', '#d0f0cf'];
    const pants = ['#22344a', '#1f2730', '#3d2d1c', '#454545'];
    const h = Math.abs(seed * 93) % hairs.length;
    const s = Math.abs(seed * 41 + 7) % shirts.length;
    const p = Math.abs(seed * 17 + 3) % pants.length;
    return { hair: hairs[h], shirt: shirts[s], pants: pants[p] };
  }, [seed]);

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
      const spd = 0.55;
      root.current.position.x += (dx / d) * spd * dt;
      root.current.position.z += (dz / d) * spd * dt;
      root.current.rotation.y = Math.atan2(dx, dz);
    }
    const t = clock.elapsedTime * 4 + state.phase;
    if (body.current) {
      body.current.position.y = 0.0 + Math.abs(Math.sin(t)) * 0.035;
    }
    if (legL.current && legR.current) {
      const sw = walking ? Math.sin(t) * 0.45 : 0;
      legL.current.rotation.x = sw;
      legR.current.rotation.x = -sw;
    }
    if (armL.current && armR.current) {
      const sw = walking ? Math.sin(t) * 0.35 : 0;
      armL.current.rotation.x = -sw * 0.7;
      armR.current.rotation.x = sw * 0.7;
    }
    if (haloMat.current) {
      const tc = clock.elapsedTime * 2;
      haloMat.current.opacity =
        (isSelected ? 0.9 : hover ? 0.7 : 0.0) + Math.sin(tc) * 0.05;
    }
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    selectAgent({
      roomId,
      roomName,
      accent,
      index,
      callsign,
      role,
    });
  };

  return (
    <group
      ref={root}
      onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = 'pointer'; }}
      onPointerOut={(e) => { e.stopPropagation(); setHover(false); document.body.style.cursor = ''; }}
      onClick={handleClick}
    >
      {/* Soft ground shadow — dark, opaque-ish disc under feet */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.22, 20]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.25} depthWrite={false} />
      </mesh>
      {/* Accent halo — visible on hover/select */}
      <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.26, 0.34, 36]} />
        <meshBasicMaterial ref={haloMat} color={accent} transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>

      <group ref={body} position={[0, 0.0, 0]}>
        {/* Chunky hips/pants */}
        <mesh position={[0, 0.24, 0]} castShadow>
          <boxGeometry args={[0.22, 0.18, 0.16]} />
          <meshStandardMaterial color={look.pants} roughness={0.8} />
        </mesh>
        {/* Torso / jacket */}
        <mesh position={[0, 0.44, 0]} castShadow>
          <boxGeometry args={[0.26, 0.24, 0.18]} />
          <meshStandardMaterial color={look.shirt} roughness={0.75} metalness={0.05} />
        </mesh>
        {/* Collar / neck accent */}
        <mesh position={[0, 0.57, 0.05]}>
          <boxGeometry args={[0.14, 0.04, 0.08]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.35} toneMapped={false} />
        </mesh>
        {/* Accent shoulder stripe */}
        <mesh position={[0, 0.525, 0]}>
          <boxGeometry args={[0.27, 0.04, 0.19]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.5} toneMapped={false} />
        </mesh>
        {/* Head */}
        <mesh position={[0, 0.7, 0]} castShadow>
          <boxGeometry args={[0.22, 0.22, 0.22]} />
          <meshStandardMaterial color="#f1d9b5" roughness={0.85} />
        </mesh>
        {/* Hair — slab on top of head, slight tilt */}
        <mesh position={[0, 0.83, -0.02]} castShadow>
          <boxGeometry args={[0.24, 0.08, 0.23]} />
          <meshStandardMaterial color={look.hair} roughness={0.9} />
        </mesh>
        {/* Hair front tuft */}
        <mesh position={[0.06, 0.79, 0.09]}>
          <boxGeometry args={[0.1, 0.08, 0.06]} />
          <meshStandardMaterial color={look.hair} roughness={0.9} />
        </mesh>
        {/* Eyes — two black pixels */}
        <mesh position={[-0.05, 0.72, 0.113]}>
          <boxGeometry args={[0.03, 0.04, 0.005]} />
          <meshBasicMaterial color="#0a0a10" toneMapped={false} />
        </mesh>
        <mesh position={[0.05, 0.72, 0.113]}>
          <boxGeometry args={[0.03, 0.04, 0.005]} />
          <meshBasicMaterial color="#0a0a10" toneMapped={false} />
        </mesh>
        {/* Arms */}
        <group ref={armL} position={[-0.15, 0.54, 0]}>
          <mesh position={[0, -0.13, 0]} castShadow>
            <boxGeometry args={[0.07, 0.26, 0.1]} />
            <meshStandardMaterial color={look.shirt} roughness={0.75} />
          </mesh>
          {/* Hand */}
          <mesh position={[0, -0.28, 0]}>
            <boxGeometry args={[0.075, 0.06, 0.1]} />
            <meshStandardMaterial color="#f1d9b5" roughness={0.85} />
          </mesh>
        </group>
        <group ref={armR} position={[0.15, 0.54, 0]}>
          <mesh position={[0, -0.13, 0]} castShadow>
            <boxGeometry args={[0.07, 0.26, 0.1]} />
            <meshStandardMaterial color={look.shirt} roughness={0.75} />
          </mesh>
          <mesh position={[0, -0.28, 0]}>
            <boxGeometry args={[0.075, 0.06, 0.1]} />
            <meshStandardMaterial color="#f1d9b5" roughness={0.85} />
          </mesh>
        </group>
        {/* Legs */}
        <group ref={legL} position={[-0.06, 0.16, 0]}>
          <mesh position={[0, -0.1, 0]} castShadow>
            <boxGeometry args={[0.08, 0.2, 0.1]} />
            <meshStandardMaterial color={look.pants} roughness={0.85} />
          </mesh>
          {/* Shoe */}
          <mesh position={[0, -0.23, 0.01]}>
            <boxGeometry args={[0.09, 0.06, 0.14]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
          </mesh>
        </group>
        <group ref={legR} position={[0.06, 0.16, 0]}>
          <mesh position={[0, -0.1, 0]} castShadow>
            <boxGeometry args={[0.08, 0.2, 0.1]} />
            <meshStandardMaterial color={look.pants} roughness={0.85} />
          </mesh>
          <mesh position={[0, -0.23, 0.01]}>
            <boxGeometry args={[0.09, 0.06, 0.14]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
          </mesh>
        </group>
      </group>

      {/* Hover/selected floating nameplate */}
      {(hover || isSelected) && (
        <Html
          position={[0, 1.25, 0]}
          center
          distanceFactor={7}
          occlude={false}
          style={{ pointerEvents: 'none' }}
        >
          <div
            style={{
              background: 'linear-gradient(140deg, rgba(14,20,36,0.96), rgba(6,10,20,0.96))',
              border: `1.5px solid ${accent}`,
              borderRadius: 6,
              padding: '6px 10px',
              fontFamily: 'JetBrains Mono, monospace',
              color: accent,
              fontSize: 11,
              letterSpacing: '0.18em',
              whiteSpace: 'nowrap',
              boxShadow: `0 0 14px ${accent}66`,
              textAlign: 'center',
            }}
          >
            <div style={{ fontWeight: 700 }}>{callsign.toUpperCase()}</div>
            <div style={{ opacity: 0.65, fontSize: 9, marginTop: 2, letterSpacing: '0.25em' }}>
              CLICK TO OPEN
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}
