'use client';

import { ThreeEvent, useFrame } from '@react-three/fiber';
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useEcosystemStore } from '@/store/ecosystemStore';
import type { CityData } from '@/types';
import { AgentCharacter, AgentOutfit } from './AgentCharacter';
import { Interior } from './interiors/Interior';

// Chamber exterior per spec §5.1:
// W 2.5, H 1.8, D 1.8. Frame 0.08u edges dark metal #1A1A2E (rough 0.4, metal 0.8).
// Six glass panels MeshPhysicalMaterial (transmission 0.9, ior 1.5).
// Neon trim 0.02u emissive (intensity 2.0) in city accent.

const W = 2.5;
const H = 1.8;
const D = 1.8;

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const OUTFIT_BY_ARCHETYPE: Record<CityData['archetype'], AgentOutfit[]> = {
  trading_floor: ['suit'],
  library: ['robe'],
  lab: ['labcoat'],
  forge: ['technician'],
  court: ['formal'],
  port: ['comms'],
  observatory: ['dark'],
  clocktower: ['clockwork'],
  mirror: ['mirror'],
  inverse: ['spiky'],
  bridge: ['silver', 'blue'],
};

export function CityChamber({ city }: { city: CityData }) {
  const selectCity = useEcosystemStore((s) => s.selectCity);
  const selectedCityId = useEcosystemStore((s) => s.selectedCityId);
  const [hover, setHover] = useState(false);

  const selected = selectedCityId === city.id;
  const accent = city.accentColor;

  // Frame material (shared per-chamber)
  const frameMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#1A1A2E',
        roughness: 0.4,
        metalness: 0.8,
      }),
    [],
  );

  // Emissive trim — intensity 2.0 per spec, boosted further on hover.
  const trimRef = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(() => {
    if (trimRef.current) {
      trimRef.current.emissiveIntensity = hover ? 3.0 : 2.0;
    }
  });

  const onPointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHover(true);
    document.body.style.cursor = 'pointer';
  };
  const onPointerOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHover(false);
    document.body.style.cursor = 'default';
  };
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    selectCity(selected ? null : city.id);
  };

  // Agents — one per roster member, rotating waypoints around chamber floor.
  const agentNodes = useMemo(() => {
    const outfits = OUTFIT_BY_ARCHETYPE[city.archetype];
    const waypointsFor = (i: number): Array<[number, number, number]> => {
      const wy = 0.15;
      // simple 4-corner loop inside chamber
      const x = 0.55 - (i % 3) * 0.3;
      return [
        [x, wy, -0.45],
        [0.5, wy, 0.0],
        [x, wy, 0.45],
        [-0.5, wy, 0.0],
      ];
    };
    return city.agents.map((a, i) => (
      <AgentCharacter
        key={a.id}
        agentId={a.id}
        role={a.role}
        cityColor={accent}
        outfit={outfits[i % outfits.length]}
        waypoints={waypointsFor(i)}
        floating={city.archetype === 'library'}
        glitchy={city.archetype === 'inverse'}
        speed={0.3 + (hashSeed(a.id) % 5) / 40}
        seed={hashSeed(a.id)}
      />
    ));
  }, [city.agents, city.archetype, accent]);

  return (
    <group position={city.position} rotation={[0, city.rotation, 0]}>
      {/* Invisible hit-box for the whole chamber — makes click reliable */}
      <mesh
        position={[0, H / 2, 0]}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
        onClick={onClick}
        visible={false}
      >
        <boxGeometry args={[W, H, D]} />
      </mesh>

      {/* Glass panels — 6 faces w/ transmission */}
      <group position={[0, H / 2, 0]}>
        <ChamberGlass opened={selected} />
      </group>

      {/* Dark frame edges */}
      <FrameEdges material={frameMat} />

      {/* Emissive neon trim */}
      <NeonTrim trimRef={trimRef} accent={accent} />

      {/* Accent point light inside the chamber (spec §9.1) */}
      <pointLight color={accent} intensity={0.5} distance={4} position={[0, 0.8, 0]} />

      {/* Floor plate (match platform but with a glow) */}
      <mesh position={[0, 0.015, 0]} receiveShadow>
        <boxGeometry args={[W - 0.04, 0.02, D - 0.04]} />
        <meshStandardMaterial
          color="#0E1020"
          emissive={accent}
          emissiveIntensity={0.08}
          roughness={0.5}
          metalness={0.3}
        />
      </mesh>

      {/* Interior dispatch */}
      <Interior city={city} />

      {/* Agents */}
      {agentNodes}
    </group>
  );
}

function ChamberGlass({ opened }: { opened: boolean }) {
  const mat = useRef<THREE.MeshPhysicalMaterial>(null);
  useFrame(() => {
    if (mat.current) {
      mat.current.opacity = opened ? 0.3 : 1;
    }
  });
  // Four side panels (front, back, left, right) + top + bottom
  const panels: Array<[[number, number, number], [number, number, number]]> = [
    [[0, 0, D / 2], [0, 0, 0]],             // front
    [[0, 0, -D / 2], [0, Math.PI, 0]],      // back
    [[W / 2, 0, 0], [0, -Math.PI / 2, 0]],  // right
    [[-W / 2, 0, 0], [0, Math.PI / 2, 0]],  // left
    [[0, H / 2, 0], [Math.PI / 2, 0, 0]],   // top
    [[0, -H / 2, 0], [-Math.PI / 2, 0, 0]], // bottom
  ];
  return (
    <group>
      {panels.map(([p, r], i) => (
        <mesh key={i} position={p} rotation={r}>
          <planeGeometry args={[W, H]} />
          <meshPhysicalMaterial
            ref={i === 0 ? mat : undefined}
            color="#ffffff"
            roughness={0.1}
            metalness={0}
            clearcoat={0.2}
            transmission={0.9}
            ior={1.5}
            transparent
            opacity={1}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function FrameEdges({ material }: { material: THREE.Material }) {
  const t = 0.08; // frame thickness
  const ys = [0, H]; // top + bottom rails
  const xs = [-W / 2, W / 2];
  const zs = [-D / 2, D / 2];
  return (
    <group>
      {/* Horizontal rails along X (x-spanning edges at corners in Z,y) */}
      {ys.map((y) =>
        zs.map((z) => (
          <mesh key={`x-${y}-${z}`} position={[0, y, z]}>
            <boxGeometry args={[W + t, t, t]} />
            <primitive attach="material" object={material} />
          </mesh>
        )),
      )}
      {/* Horizontal rails along Z */}
      {ys.map((y) =>
        xs.map((x) => (
          <mesh key={`z-${y}-${x}`} position={[x, y, 0]}>
            <boxGeometry args={[t, t, D + t]} />
            <primitive attach="material" object={material} />
          </mesh>
        )),
      )}
      {/* Vertical posts at the 4 corners */}
      {xs.map((x) =>
        zs.map((z) => (
          <mesh key={`y-${x}-${z}`} position={[x, H / 2, z]}>
            <boxGeometry args={[t, H, t]} />
            <primitive attach="material" object={material} />
          </mesh>
        )),
      )}
    </group>
  );
}

function NeonTrim({
  accent,
  trimRef,
}: {
  accent: string;
  trimRef: React.RefObject<THREE.MeshStandardMaterial>;
}) {
  const t = 0.02;
  const gap = 0.005;
  const y0 = gap;
  const y1 = H - gap;
  return (
    <group>
      <meshStandardMaterial
        ref={trimRef}
        color={accent}
        emissive={accent}
        emissiveIntensity={2.0}
        toneMapped={false}
        attach="material"
      />
      {/* Bottom ring */}
      <mesh position={[0, y0, D / 2 - 0.001]}>
        <boxGeometry args={[W - 0.02, t, t]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={2.0} toneMapped={false} />
      </mesh>
      <mesh position={[0, y0, -D / 2 + 0.001]}>
        <boxGeometry args={[W - 0.02, t, t]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={2.0} toneMapped={false} />
      </mesh>
      <mesh position={[W / 2 - 0.001, y0, 0]}>
        <boxGeometry args={[t, t, D - 0.02]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={2.0} toneMapped={false} />
      </mesh>
      <mesh position={[-W / 2 + 0.001, y0, 0]}>
        <boxGeometry args={[t, t, D - 0.02]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={2.0} toneMapped={false} />
      </mesh>

      {/* Top ring */}
      <mesh position={[0, y1, D / 2 - 0.001]}>
        <boxGeometry args={[W - 0.02, t, t]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={2.0} toneMapped={false} />
      </mesh>
      <mesh position={[0, y1, -D / 2 + 0.001]}>
        <boxGeometry args={[W - 0.02, t, t]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={2.0} toneMapped={false} />
      </mesh>
      <mesh position={[W / 2 - 0.001, y1, 0]}>
        <boxGeometry args={[t, t, D - 0.02]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={2.0} toneMapped={false} />
      </mesh>
      <mesh position={[-W / 2 + 0.001, y1, 0]}>
        <boxGeometry args={[t, t, D - 0.02]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={2.0} toneMapped={false} />
      </mesh>
    </group>
  );
}
