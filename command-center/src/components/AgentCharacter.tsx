'use client';

// Agent character per spec §6. Capsule torso + sphere head + capsule limbs +
// feet boxes + procedural accessory. Walking (thigh ±0.3 sin; arms opposite;
// body bob ±0.03 double-freq). Idle sway (Z rot ±0.02). Gesture arm raise.
// Waypoint-loop movement at 0.3 u/s within chamber.

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

export type AgentOutfit =
  | 'suit'         // Aletheia trader: dark body + white collar
  | 'robe'         // Mnemosyne archivist: floating oval
  | 'labcoat'      // Prometheus scientist: white body + glasses
  | 'technician'   // Hephaestus: orange vest + dark pants
  | 'formal'       // Themis: black + white
  | 'comms'        // Agora: headset
  | 'dark'         // Iris: dark uniform + purple visor
  | 'clockwork'    // Chronos: brass gears on chest
  | 'mirror'       // Narcissus: reflective silver
  | 'spiky'        // Eris: dark spiky armor
  | 'silver'       // Janus left
  | 'blue';        // Janus right

interface AgentCharacterProps {
  agentId: string;
  role?: string;
  cityColor: string;
  outfit: AgentOutfit;
  waypoints: Array<[number, number, number]>;
  floating?: boolean;        // Mnemosyne robed agents bob + orbit
  glitchy?: boolean;         // Eris agents "glitch" — rapid pos changes
  speed?: number;
  seed?: number;
}

function outfitColors(outfit: AgentOutfit, accent: string) {
  switch (outfit) {
    case 'suit':       return { torso: '#141821', accent: '#FFFFFF', head: '#E9C9A8' };
    case 'robe':       return { torso: accent, accent: '#FFD166', head: '#F0D9B5' };
    case 'labcoat':    return { torso: '#F5F5F5', accent: '#222',   head: '#E9C9A8' };
    case 'technician': return { torso: '#2A1F18', accent: '#FF6B35', head: '#D4A988' };
    case 'formal':     return { torso: '#1A1A1E', accent: '#E0E0E0', head: '#E9C9A8' };
    case 'comms':      return { torso: '#E6E6EB', accent: '#00F5D4', head: '#E9C9A8' };
    case 'dark':       return { torso: '#10101A', accent: '#7209B7', head: '#D4A988' };
    case 'clockwork':  return { torso: '#3A2E1A', accent: '#C8A448', head: '#E9C9A8' };
    case 'mirror':     return { torso: '#C8D4E6', accent: '#00F5D4', head: '#FFFFFF' };
    case 'spiky':      return { torso: '#17080B', accent: '#E63946', head: '#D4A988' };
    case 'silver':     return { torso: '#D0D6DC', accent: '#FFFFFF', head: '#E9C9A8' };
    case 'blue':       return { torso: '#0B1D3A', accent: '#00F5D4', head: '#D4A988' };
  }
}

export function AgentCharacter({
  agentId, role = '', cityColor, outfit, waypoints, floating = false, glitchy = false, speed = 0.3,
  seed = 0,
}: AgentCharacterProps) {
  const root = useRef<THREE.Group>(null);
  const torso = useRef<THREE.Group>(null);
  const leftThigh = useRef<THREE.Group>(null);
  const rightThigh = useRef<THREE.Group>(null);
  const leftShoulder = useRef<THREE.Group>(null);
  const rightShoulder = useRef<THREE.Group>(null);

  const c = outfitColors(outfit, cityColor);

  const state = useMemo(
    () => ({
      wpIdx: 0,
      gestureTimer: Math.random() * 3,
      lastGlitch: 0,
      startPhase: Math.random() * Math.PI * 2,
    }),
    [],
  );

  useFrame(({ clock }, dt) => {
    if (!root.current) return;
    const t = clock.elapsedTime + state.startPhase;

    // Floating agents just bob + orbit a center (Mnemosyne pattern).
    if (floating) {
      const center = waypoints[0] ?? [0, 0, 0];
      const a = t * 0.4 + seed;
      const r = 0.3;
      root.current.position.set(
        center[0] + Math.cos(a) * r,
        center[1] + 0.6 + Math.sin(t * 2 + seed) * 0.05,
        center[2] + Math.sin(a) * r,
      );
      root.current.rotation.y = a + Math.PI / 2;
    } else if (glitchy) {
      // Eris: teleport between waypoints every 0.7–1.5 s
      state.lastGlitch += dt;
      if (state.lastGlitch > 0.7 + Math.random() * 0.8) {
        state.lastGlitch = 0;
        state.wpIdx = (state.wpIdx + 1) % waypoints.length;
      }
      const target = waypoints[state.wpIdx];
      root.current.position.lerp(new THREE.Vector3(target[0], target[1], target[2]), 0.6);
    } else {
      // Normal: march toward current waypoint at `speed` u/s.
      const target = waypoints[state.wpIdx] ?? [0, 0, 0];
      const dx = target[0] - root.current.position.x;
      const dz = target[2] - root.current.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.08) {
        state.wpIdx = (state.wpIdx + 1) % waypoints.length;
      } else {
        root.current.position.x += (dx / dist) * speed * dt;
        root.current.position.z += (dz / dist) * speed * dt;
        root.current.rotation.y = Math.atan2(dx, dz);
      }
    }

    // Walking body bob ±0.03 at double frequency
    if (torso.current) {
      torso.current.position.y = 0.4 + Math.abs(Math.sin(t * 5)) * 0.03;
      torso.current.rotation.z = Math.sin(t * 1.2) * 0.02; // idle sway
    }

    // Thigh swing ±0.3 rad
    const thigh = Math.sin(t * 5) * 0.3;
    if (leftThigh.current) leftThigh.current.rotation.x = thigh;
    if (rightThigh.current) rightThigh.current.rotation.x = -thigh;

    // Arms opposite
    if (leftShoulder.current) leftShoulder.current.rotation.x = -thigh * 0.8;
    if (rightShoulder.current) rightShoulder.current.rotation.x = thigh * 0.8;

    // Gesture: every 3–6 s, raise one arm ~45° for 0.5s
    state.gestureTimer -= dt;
    if (state.gestureTimer <= 0) {
      state.gestureTimer = 3 + Math.random() * 3;
    }
    const gesting = state.gestureTimer > 2.5 && state.gestureTimer < 3;
    if (gesting && rightShoulder.current) {
      rightShoulder.current.rotation.x = -Math.PI / 4;
    }
  });

  return (
    <group ref={root}>
      <group ref={torso}>
        {/* Torso 0.12 radius, 0.35 length */}
        <mesh castShadow position={[0, 0, 0]}>
          <capsuleGeometry args={[0.05, 0.18, 4, 8]} />
          <meshStandardMaterial color={c.torso} roughness={0.7} metalness={0.15} />
        </mesh>

        {/* Collar / accent stripe */}
        <mesh position={[0, 0.09, 0.052]}>
          <boxGeometry args={[0.1, 0.035, 0.01]} />
          <meshStandardMaterial color={c.accent} emissive={c.accent} emissiveIntensity={0.4} />
        </mesh>

        {/* Head */}
        <mesh castShadow position={[0, 0.2, 0]}>
          <sphereGeometry args={[0.055, 12, 12]} />
          <meshStandardMaterial color={c.head} roughness={0.8} metalness={0.05} />
        </mesh>

        {/* Eyes */}
        <mesh position={[-0.02, 0.21, 0.05]}>
          <sphereGeometry args={[0.008, 6, 6]} />
          <meshBasicMaterial color="#101018" />
        </mesh>
        <mesh position={[0.02, 0.21, 0.05]}>
          <sphereGeometry args={[0.008, 6, 6]} />
          <meshBasicMaterial color="#101018" />
        </mesh>

        {/* Glasses (lab coat) */}
        {outfit === 'labcoat' && (
          <group position={[0, 0.21, 0.055]}>
            <mesh position={[-0.02, 0, 0]}>
              <torusGeometry args={[0.013, 0.003, 6, 12]} />
              <meshStandardMaterial color="#111" />
            </mesh>
            <mesh position={[0.02, 0, 0]}>
              <torusGeometry args={[0.013, 0.003, 6, 12]} />
              <meshStandardMaterial color="#111" />
            </mesh>
          </group>
        )}

        {/* Visor (Iris) */}
        {outfit === 'dark' && (
          <mesh position={[0, 0.21, 0.055]}>
            <boxGeometry args={[0.075, 0.018, 0.002]} />
            <meshStandardMaterial color="#7209B7" emissive="#7209B7" emissiveIntensity={1.4} />
          </mesh>
        )}

        {/* Headset (Agora) */}
        {outfit === 'comms' && (
          <mesh position={[0.04, 0.21, 0]}>
            <sphereGeometry args={[0.012, 6, 6]} />
            <meshStandardMaterial color="#00F5D4" emissive="#00F5D4" emissiveIntensity={1.0} />
          </mesh>
        )}

        {/* ID badge glow */}
        <mesh position={[0.035, 0.03, 0.052]}>
          <boxGeometry args={[0.012, 0.02, 0.002]} />
          <meshStandardMaterial color={c.accent} emissive={c.accent} emissiveIntensity={1.2} />
        </mesh>

        {/* Shoulders + arms */}
        <group ref={leftShoulder} position={[-0.065, 0.07, 0]}>
          <mesh castShadow position={[0, -0.095, 0]}>
            <capsuleGeometry args={[0.02, 0.12, 4, 6]} />
            <meshStandardMaterial color={c.torso} roughness={0.7} />
          </mesh>
          <mesh position={[0, -0.17, 0]}>
            <sphereGeometry args={[0.018, 6, 6]} />
            <meshStandardMaterial color={c.head} />
          </mesh>
        </group>
        <group ref={rightShoulder} position={[0.065, 0.07, 0]}>
          <mesh castShadow position={[0, -0.095, 0]}>
            <capsuleGeometry args={[0.02, 0.12, 4, 6]} />
            <meshStandardMaterial color={c.torso} roughness={0.7} />
          </mesh>
          <mesh position={[0, -0.17, 0]}>
            <sphereGeometry args={[0.018, 6, 6]} />
            <meshStandardMaterial color={c.head} />
          </mesh>
        </group>

        {/* Hips + thighs + calves + feet */}
        <group ref={leftThigh} position={[-0.03, -0.12, 0]}>
          <mesh castShadow position={[0, -0.1, 0]}>
            <capsuleGeometry args={[0.025, 0.15, 4, 6]} />
            <meshStandardMaterial color={c.torso} roughness={0.8} />
          </mesh>
          <mesh castShadow position={[0.01, -0.21, 0.04]}>
            <boxGeometry args={[0.05, 0.02, 0.07]} />
            <meshStandardMaterial color="#0a0a0f" roughness={0.6} />
          </mesh>
        </group>
        <group ref={rightThigh} position={[0.03, -0.12, 0]}>
          <mesh castShadow position={[0, -0.1, 0]}>
            <capsuleGeometry args={[0.025, 0.15, 4, 6]} />
            <meshStandardMaterial color={c.torso} roughness={0.8} />
          </mesh>
          <mesh castShadow position={[-0.01, -0.21, 0.04]}>
            <boxGeometry args={[0.05, 0.02, 0.07]} />
            <meshStandardMaterial color="#0a0a0f" roughness={0.6} />
          </mesh>
        </group>
      </group>
    </group>
  );
}
