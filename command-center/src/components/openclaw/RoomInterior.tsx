'use client';

import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useRef, useMemo } from 'react';
import type { RoomDef } from '@/data/openclawRooms';
import { Terminal } from './Terminal';

// Per-archetype interior. Every room has a central Terminal (interactable)
// plus archetype-specific props. Props stay inside room bounds [w, d].
export function RoomInterior({ room }: { room: RoomDef }) {
  switch (room.archetype) {
    case 'treasury':   return <Treasury room={room} />;
    case 'strategy':   return <Strategy room={room} />;
    case 'risk':       return <RiskGate room={room} />;
    case 'execution':  return <Execution room={room} />;
    case 'radar':      return <Radar room={room} />;
    case 'news':       return <News room={room} />;
    case 'sentiment':  return <Sentiment room={room} />;
    case 'vault':      return <Vault room={room} />;
    case 'hedge':      return <Hedge room={room} />;
    case 'kill':       return <KillChamber room={room} />;
    case 'compliance': return <Compliance room={room} />;
    case 'approval':   return <Approval room={room} />;
  }
}

// ------------------------------------------------------------

function Treasury({ room }: { room: RoomDef }) {
  return (
    <group>
      <Terminal room={room} label="Treasury Terminal" position={[0, 0, 0]} glyph="$" />
      {/* Vault door behind terminal */}
      <mesh position={[0, 0.9, -1.8]}>
        <boxGeometry args={[1.6, 1.5, 0.15]} />
        <meshStandardMaterial color="#3a2e12" metalness={0.7} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.9, -1.72]}>
        <torusGeometry args={[0.45, 0.05, 10, 24]} />
        <meshStandardMaterial color={room.accent} emissive={room.accent} emissiveIntensity={1.5} toneMapped={false} />
      </mesh>
      {/* Coin stacks */}
      {[-1.5, 1.5].map((x) => (
        <mesh key={x} position={[x, 0.15, 1.2]}>
          <cylinderGeometry args={[0.15, 0.15, 0.3, 14]} />
          <meshStandardMaterial color={room.accent} emissive={room.accent} emissiveIntensity={0.4} metalness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

function Strategy({ room }: { room: RoomDef }) {
  const ring = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ring.current) ring.current.rotation.y = clock.elapsedTime * 0.4;
  });
  return (
    <group>
      <Terminal room={room} label="Strategy Console" position={[0, 0, 0]} glyph="Σ" />
      {/* Circular radar table */}
      <mesh position={[0, 0.05, 1.5]}>
        <cylinderGeometry args={[0.8, 0.85, 0.1, 36]} />
        <meshStandardMaterial color="#0a1628" emissive={room.accent} emissiveIntensity={0.3} />
      </mesh>
      <group ref={ring} position={[0, 0.11, 1.5]}>
        <mesh>
          <ringGeometry args={[0.7, 0.72, 48]} />
          <meshStandardMaterial color={room.accent} emissive={room.accent} emissiveIntensity={1.8} side={THREE.DoubleSide} transparent opacity={0.9} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
          <planeGeometry args={[0.72, 0.04]} />
          <meshStandardMaterial color={room.accent} emissive={room.accent} emissiveIntensity={2.2} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  );
}

function RiskGate({ room }: { room: RoomDef }) {
  const barrier = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (barrier.current) {
      const mat = barrier.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 1.5 + Math.sin(clock.elapsedTime * 3) * 0.6;
    }
  });
  return (
    <group>
      <Terminal room={room} label="Risk Gate" position={[0, 0, 0]} glyph="!" />
      {/* Gate barrier behind */}
      <mesh position={[-1.3, 0.9, -1.5]}>
        <boxGeometry args={[0.2, 1.5, 0.5]} />
        <meshStandardMaterial color="#2a1010" />
      </mesh>
      <mesh position={[1.3, 0.9, -1.5]}>
        <boxGeometry args={[0.2, 1.5, 0.5]} />
        <meshStandardMaterial color="#2a1010" />
      </mesh>
      <mesh ref={barrier} position={[0, 1.5, -1.5]}>
        <boxGeometry args={[2.6, 0.15, 0.3]} />
        <meshStandardMaterial color={room.accent} emissive={room.accent} emissiveIntensity={2} toneMapped={false} />
      </mesh>
      {/* Warning lights */}
      {[-1.5, 1.5].map((x) => (
        <mesh key={x} position={[x, 0.15, 1.5]}>
          <sphereGeometry args={[0.1, 12, 12]} />
          <meshStandardMaterial color={room.accent} emissive={room.accent} emissiveIntensity={2} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

function Execution({ room }: { room: RoomDef }) {
  return (
    <group>
      <Terminal room={room} label="Execution Desk" position={[0, 0, 0]} glyph="⇋" />
      {/* Execution pipes */}
      <mesh position={[-1.8, 0.3, 1.2]}>
        <cylinderGeometry args={[0.08, 0.08, 1.5, 10]} />
        <meshStandardMaterial color={room.accent} emissive={room.accent} emissiveIntensity={1.2} toneMapped={false} />
      </mesh>
      <mesh position={[1.8, 0.3, 1.2]}>
        <cylinderGeometry args={[0.08, 0.08, 1.5, 10]} />
        <meshStandardMaterial color={room.accent} emissive={room.accent} emissiveIntensity={1.2} toneMapped={false} />
      </mesh>
      {/* Desk */}
      <mesh position={[0, 0.15, 1.5]}>
        <boxGeometry args={[2.2, 0.3, 0.7]} />
        <meshStandardMaterial color="#11241c" />
      </mesh>
    </group>
  );
}

function Radar({ room }: { room: RoomDef }) {
  const dish = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (dish.current) dish.current.rotation.y = clock.elapsedTime * 0.6;
  });
  return (
    <group>
      <Terminal room={room} label="Market Radar" position={[0, 0, 0]} glyph="◎" />
      {/* Dish */}
      <group ref={dish} position={[0, 0.8, 1.3]}>
        <mesh rotation={[-Math.PI / 3, 0, 0]}>
          <coneGeometry args={[0.45, 0.3, 24, 1, true]} />
          <meshStandardMaterial color="#d0e0f0" metalness={0.6} side={THREE.DoubleSide} />
        </mesh>
      </group>
      <mesh position={[0, 0.45, 1.3]}>
        <cylinderGeometry args={[0.04, 0.04, 0.6, 8]} />
        <meshStandardMaterial color="#40607a" />
      </mesh>
    </group>
  );
}

function News({ room }: { room: RoomDef }) {
  return (
    <group>
      <Terminal room={room} label="News Intelligence" position={[0, 0, 0]} glyph="✎" />
      {/* Stacked screens */}
      {[-0.7, 0, 0.7].map((x, i) => (
        <group key={i} position={[x, 0.9, -1.5]}>
          <mesh>
            <boxGeometry args={[0.55, 0.35, 0.04]} />
            <meshStandardMaterial color="#0a0f1d" emissive={room.accent} emissiveIntensity={0.5 + (i % 2) * 0.4} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Sentiment({ room }: { room: RoomDef }) {
  const wave = useRef<THREE.Mesh[]>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    wave.current.forEach((m, i) => {
      if (m) {
        const s = 0.4 + (Math.sin(t * 1.6 + i * 0.5) * 0.5 + 0.5) * 0.8;
        m.scale.y = s;
        const mat = m.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = 0.8 + s;
      }
    });
  });
  return (
    <group>
      <Terminal room={room} label="Sentiment Engine" position={[0, 0, 0]} glyph="♥" />
      {/* Heart-rate wave bars */}
      <group position={[0, 0.2, 1.5]}>
        {Array.from({ length: 11 }).map((_, i) => (
          <mesh
            key={i}
            ref={(el) => {
              if (el) wave.current[i] = el;
            }}
            position={[(i - 5) * 0.2, 0.3, 0]}
          >
            <boxGeometry args={[0.06, 0.6, 0.06]} />
            <meshStandardMaterial color={room.accent} emissive={room.accent} emissiveIntensity={1} toneMapped={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function Vault({ room }: { room: RoomDef }) {
  return (
    <group>
      <Terminal room={room} label="Portfolio Vault" position={[0, 0, 0]} glyph="⬢" />
      {/* Vault cells (3x2 grid) */}
      {[-0.8, 0, 0.8].map((x) =>
        [-0.3, 0.4].map((y) => (
          <mesh key={`${x}-${y}`} position={[x, 0.6 + y, -1.65]}>
            <boxGeometry args={[0.55, 0.55, 0.06]} />
            <meshStandardMaterial
              color="#1a0f28"
              emissive={room.accent}
              emissiveIntensity={0.5}
            />
          </mesh>
        )),
      )}
    </group>
  );
}

function Hedge({ room }: { room: RoomDef }) {
  const options = useRef<THREE.Group[]>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    options.current.forEach((o, i) => {
      if (o) o.position.y = 1.0 + Math.sin(t * 1.2 + i * 1.3) * 0.15;
    });
  });
  return (
    <group>
      <Terminal room={room} label="Hedge Room" position={[0, 0, 0]} glyph="⚐" />
      {/* Floating option "umbrellas" */}
      {[-1.2, 0, 1.2].map((x, i) => (
        <group
          key={i}
          ref={(el) => {
            if (el) options.current[i] = el;
          }}
          position={[x, 1.0, -1.3]}
        >
          <mesh rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[0.4, 0.3, 14, 1, true]} />
            <meshStandardMaterial color={room.accent} emissive={room.accent} emissiveIntensity={0.8} side={THREE.DoubleSide} transparent opacity={0.8} />
          </mesh>
          <mesh position={[0, -0.3, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.3, 6]} />
            <meshStandardMaterial color="#222" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function KillChamber({ room }: { room: RoomDef }) {
  const ring = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (ring.current) ring.current.emissiveIntensity = 1.5 + Math.sin(clock.elapsedTime * 4) * 1.2;
  });
  return (
    <group>
      <Terminal room={room} label="Kill Switch" position={[0, 0, 0]} glyph="✖" />
      {/* Big red button on pedestal */}
      <mesh position={[0, 0.35, 1.4]}>
        <cylinderGeometry args={[0.35, 0.45, 0.1, 24]} />
        <meshStandardMaterial color="#1a0a0a" />
      </mesh>
      <mesh position={[0, 0.5, 1.4]}>
        <sphereGeometry args={[0.22, 24, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial ref={ring} color={room.accent} emissive={room.accent} emissiveIntensity={2} toneMapped={false} />
      </mesh>
    </group>
  );
}

function Compliance({ room }: { room: RoomDef }) {
  return (
    <group>
      <Terminal room={room} label="Compliance Office" position={[0, 0, 0]} glyph="§" />
      {/* Columns + scale of justice */}
      {[-1.5, 1.5].map((x) => (
        <mesh key={x} position={[x, 0.85, -1.5]}>
          <cylinderGeometry args={[0.1, 0.12, 1.7, 10]} />
          <meshStandardMaterial color="#c8cfd8" roughness={0.5} />
        </mesh>
      ))}
      <mesh position={[0, 1.1, -1.5]}>
        <boxGeometry args={[0.9, 0.04, 0.06]} />
        <meshStandardMaterial color={room.accent} emissive={room.accent} emissiveIntensity={0.7} />
      </mesh>
    </group>
  );
}

function Approval({ room }: { room: RoomDef }) {
  return (
    <group>
      <Terminal room={room} label="Human Approval Bridge" position={[0, 0, 0]} glyph="✓" />
      {/* Command chair */}
      <mesh position={[0, 0.4, 1.3]}>
        <boxGeometry args={[0.6, 0.8, 0.5]} />
        <meshStandardMaterial color="#1a1810" metalness={0.4} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.5, 1.6]}>
        <boxGeometry args={[0.55, 0.5, 0.05]} />
        <meshStandardMaterial color={room.accent} emissive={room.accent} emissiveIntensity={0.4} />
      </mesh>
    </group>
  );
}
