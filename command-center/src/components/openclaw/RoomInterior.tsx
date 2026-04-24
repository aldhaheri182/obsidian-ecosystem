'use client';

import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useRef, useMemo } from 'react';
import { Html } from '@react-three/drei';
import type { RoomDef } from '@/data/openclawRooms';
import { Terminal } from './Terminal';
import { AgoraRoom } from './AgoraRoom';

// Per-archetype interior. Every room has a central Terminal (interactable)
// plus archetype-specific props. Props stay inside room bounds [w, d].
// Each interior uses room.promptLabel for the "Press E — ..." prompt.
export function RoomInterior({ room }: { room: RoomDef }) {
  switch (room.archetype) {
    case 'strategy':   return <AgoraRoom room={room} />;
    case 'time':       return <TimeEngine room={room} />;
    case 'volatility': return <Volatility room={room} />;
    case 'risk':       return <RiskGate room={room} />;
    case 'execution':  return <Execution room={room} />;
    case 'vault':      return <Vault room={room} />;
    case 'news':       return <News room={room} />;
    case 'sentiment':  return <Sentiment room={room} />;
    case 'pattern':    return <PatternLab room={room} />;
    case 'hedge':      return <Hedge room={room} />;
    case 'kill':       return <KillChamber room={room} />;
    case 'approval':   return <Approval room={room} />;
  }
}

// ============================================================================

// AGORA — Strategy Council
//   Circular hologram table, rotating strategy rings, 3 agents, floating map lines
function Strategy({ room }: { room: RoomDef }) {
  const ringA = useRef<THREE.Group>(null);
  const ringB = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ringA.current) ringA.current.rotation.y = clock.elapsedTime * 0.35;
    if (ringB.current) ringB.current.rotation.y = -clock.elapsedTime * 0.25;
  });
  return (
    <group>
      <Terminal room={room} label={room.promptLabel} position={[0, 0, 0]} glyph="Σ" />
      <mesh position={[0, 0.05, 1.5]}>
        <cylinderGeometry args={[0.85, 0.9, 0.1, 40]} />
        <meshStandardMaterial color="#0a1628" emissive={room.accent} emissiveIntensity={0.35} />
      </mesh>
      <group ref={ringA} position={[0, 0.18, 1.5]}>
        <mesh>
          <ringGeometry args={[0.72, 0.74, 48]} />
          <meshStandardMaterial color={room.accent} emissive={room.accent} emissiveIntensity={1.9} side={THREE.DoubleSide} transparent opacity={0.9} toneMapped={false} />
        </mesh>
      </group>
      <group ref={ringB} position={[0, 0.28, 1.5]}>
        <mesh>
          <ringGeometry args={[0.45, 0.47, 36]} />
          <meshStandardMaterial color={room.accent} emissive={room.accent} emissiveIntensity={1.4} side={THREE.DoubleSide} transparent opacity={0.7} toneMapped={false} />
        </mesh>
      </group>
      {/* Floating map lines */}
      {Array.from({ length: 6 }).map((_, i) => (
        <mesh key={i} position={[0, 0.55 + i * 0.06, 1.5]} rotation={[-Math.PI / 2, 0, (i * Math.PI) / 6]}>
          <planeGeometry args={[0.9, 0.01]} />
          <meshBasicMaterial color={room.accent} transparent opacity={0.22 + (i % 2) * 0.18} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

// CHRONOS — Time Series (NEW)
//   Glowing timeline wall, rotating clock rings, small chart screens
function TimeEngine({ room }: { room: RoomDef }) {
  const ringOuter = useRef<THREE.Group>(null);
  const ringInner = useRef<THREE.Group>(null);
  const tick = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (ringOuter.current) ringOuter.current.rotation.z = t * 0.2;
    if (ringInner.current) ringInner.current.rotation.z = -t * 0.4;
    if (tick.current) tick.current.emissiveIntensity = 1 + Math.sin(t * Math.PI * 2) * 0.8;
  });
  return (
    <group>
      <Terminal room={room} label={room.promptLabel} position={[0, 0, 0]} glyph="◴" />
      {/* Timeline wall behind */}
      <mesh position={[0, 0.9, -1.65]}>
        <boxGeometry args={[2.6, 1.3, 0.04]} />
        <meshStandardMaterial color="#060d1d" emissive={room.accent} emissiveIntensity={0.25} />
      </mesh>
      {/* Scrolling chart lines across the wall */}
      {Array.from({ length: 5 }).map((_, i) => (
        <mesh key={i} position={[0, 0.45 + i * 0.22, -1.63]}>
          <boxGeometry args={[2.4, 0.015, 0.01]} />
          <meshStandardMaterial color={room.accent} emissive={room.accent} emissiveIntensity={1.4} toneMapped={false} />
        </mesh>
      ))}
      {/* Clock-face: outer + inner rotating rings */}
      <group position={[0, 0.9, -1.6]}>
        <group ref={ringOuter}>
          <mesh>
            <ringGeometry args={[0.35, 0.37, 48]} />
            <meshStandardMaterial color={room.accent} emissive={room.accent} emissiveIntensity={1.6} side={THREE.DoubleSide} toneMapped={false} />
          </mesh>
        </group>
        <group ref={ringInner}>
          <mesh>
            <ringGeometry args={[0.22, 0.24, 36]} />
            <meshStandardMaterial color={room.accent} emissive={room.accent} emissiveIntensity={1.2} side={THREE.DoubleSide} toneMapped={false} />
          </mesh>
          <mesh position={[0, 0.22, 0]}>
            <boxGeometry args={[0.015, 0.1, 0.005]} />
            <meshStandardMaterial ref={tick} color="#ffffff" emissive="#ffffff" emissiveIntensity={2} />
          </mesh>
        </group>
      </group>
      {/* Small chart screens */}
      {[-1.6, 1.6].map((x) => (
        <mesh key={x} position={[x, 0.4, 1.4]} rotation={[-0.3, 0, 0]}>
          <boxGeometry args={[0.55, 0.32, 0.03]} />
          <meshStandardMaterial color="#061022" emissive={room.accent} emissiveIntensity={0.6} />
        </mesh>
      ))}
    </group>
  );
}

// ERIS — Volatility Regime (NEW)
//   Warning meter, pulsing danger lights, glitchy red particles
function Volatility({ room }: { room: RoomDef }) {
  const meter = useRef<THREE.Mesh>(null);
  const danger = useRef<THREE.MeshStandardMaterial[]>([]);
  const particles = useRef<THREE.Points>(null);
  const geo = useMemo(() => {
    const n = 60;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 3.5;
      pos[i * 3 + 1] = 0.2 + Math.random() * 1.4;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 2.5;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    if (meter.current) {
      meter.current.rotation.z = Math.sin(t * 2.2) * 0.35 - 0.2;
    }
    danger.current.forEach((m, i) => {
      if (m) m.emissiveIntensity = Math.abs(Math.sin(t * 4 + i)) * 2.0;
    });
    if (particles.current) {
      const a = particles.current.geometry.getAttribute('position') as THREE.BufferAttribute;
      const arr = a.array as Float32Array;
      for (let i = 0; i < arr.length; i += 3) {
        arr[i] += (Math.random() - 0.5) * 0.2;
        arr[i + 1] += dt * 0.5;
        if (arr[i + 1] > 2.0) arr[i + 1] = 0.1;
      }
      a.needsUpdate = true;
    }
  });

  return (
    <group>
      <Terminal room={room} label={room.promptLabel} position={[0, 0, 0]} glyph="⚠" />
      {/* Volatility meter — half-circle gauge on the back wall */}
      <group position={[0, 0.9, -1.6]}>
        <mesh>
          <ringGeometry args={[0.42, 0.6, 32, 1, Math.PI, Math.PI]} />
          <meshStandardMaterial color="#2a0b10" emissive={room.accent} emissiveIntensity={0.3} side={THREE.DoubleSide} />
        </mesh>
        <mesh ref={meter} position={[0, 0, 0.01]}>
          <boxGeometry args={[0.02, 0.55, 0.01]} />
          <meshStandardMaterial color={room.accent} emissive={room.accent} emissiveIntensity={2.5} toneMapped={false} />
        </mesh>
      </group>
      {/* 4 pulsing warning lamps around the room corners */}
      {[[-1.6, 1.4], [1.6, 1.4], [-1.6, -1.4], [1.6, -1.4]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.12, z]}>
          <sphereGeometry args={[0.1, 10, 10]} />
          <meshStandardMaterial
            ref={(m) => { if (m) danger.current[i] = m; }}
            color={room.accent} emissive={room.accent}
            emissiveIntensity={1.5} toneMapped={false}
          />
        </mesh>
      ))}
      {/* Red glitch particles */}
      <points ref={particles} geometry={geo}>
        <pointsMaterial color={room.accent} size={0.05} transparent opacity={0.6} depthWrite={false} toneMapped={false} />
      </points>
    </group>
  );
}

// JANUS — Risk Gate
//   Gate + barrier + approval scanner + risk-score display
function RiskGate({ room }: { room: RoomDef }) {
  const barrier = useRef<THREE.Mesh>(null);
  const scanner = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (barrier.current) {
      const mat = barrier.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 1.5 + Math.sin(t * 3) * 0.6;
    }
    if (scanner.current) {
      // Scanner sweeps left-right across the gate
      scanner.current.position.x = Math.sin(t * 1.2) * 1.1;
    }
  });
  return (
    <group>
      <Terminal room={room} label={room.promptLabel} position={[0, 0, 0]} glyph="⊞" />
      {/* Gate posts */}
      {[-1.3, 1.3].map((x) => (
        <mesh key={x} position={[x, 0.9, -1.4]}>
          <boxGeometry args={[0.2, 1.7, 0.35]} />
          <meshStandardMaterial color="#2a1410" metalness={0.6} />
        </mesh>
      ))}
      {/* Barrier beam */}
      <mesh ref={barrier} position={[0, 1.55, -1.4]}>
        <boxGeometry args={[2.6, 0.15, 0.25]} />
        <meshStandardMaterial color={room.accent} emissive={room.accent} emissiveIntensity={2} toneMapped={false} />
      </mesh>
      {/* Approval scanner — thin line under the barrier */}
      <mesh ref={scanner} position={[0, 0.9, -1.22]}>
        <boxGeometry args={[0.05, 0.8, 0.04]} />
        <meshStandardMaterial color="#ffffff" emissive={room.accent} emissiveIntensity={2.5} toneMapped={false} />
      </mesh>
      {/* Risk-score display on the front of the room */}
      <mesh position={[0, 0.55, 1.5]} rotation={[-0.25, 0, 0]}>
        <boxGeometry args={[0.9, 0.4, 0.04]} />
        <meshStandardMaterial color="#060a14" emissive={room.accent} emissiveIntensity={0.7} />
      </mesh>
      <Html position={[0, 0.55, 1.52]} rotation={[-0.25, 0, 0]} transform distanceFactor={8} occlude={false} center>
        <div style={{
          color: room.accent,
          textShadow: `0 0 8px ${room.accent}`,
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 10,
          letterSpacing: '0.18em',
          width: 110, textAlign: 'center',
        }}>
          <div style={{ opacity: 0.7 }}>RISK SCORE</div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>0.42 · MED</div>
        </div>
      </Html>
    </group>
  );
}

// ORION — Execution Desk
//   Green consoles, order-queue hologram, glowing trade pipes
function Execution({ room }: { room: RoomDef }) {
  const queueBars = useRef<THREE.MeshStandardMaterial[]>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    queueBars.current.forEach((m, i) => {
      if (m) m.emissiveIntensity = 0.8 + (Math.sin(t * 3 + i * 0.7) * 0.5 + 0.5) * 1.3;
    });
  });
  return (
    <group>
      <Terminal room={room} label={room.promptLabel} position={[0, 0, 0]} glyph="⇋" />
      {/* Curved desk in front */}
      <mesh position={[0, 0.25, 1.4]}>
        <boxGeometry args={[2.4, 0.1, 0.6]} />
        <meshStandardMaterial color="#08261f" metalness={0.5} />
      </mesh>
      {/* 3 console screens on the desk */}
      {[-0.8, 0, 0.8].map((x, i) => (
        <mesh key={i} position={[x, 0.6, 1.5]} rotation={[-0.35, 0, 0]}>
          <boxGeometry args={[0.5, 0.34, 0.03]} />
          <meshStandardMaterial color="#04180f" emissive={room.accent} emissiveIntensity={0.7 + i * 0.2} />
        </mesh>
      ))}
      {/* Order-queue hologram — stacked bars */}
      <group position={[0, 1.3, -1.3]}>
        {Array.from({ length: 6 }).map((_, i) => (
          <mesh
            key={i}
            position={[-0.6 + (i % 3) * 0.6, 0.1 + Math.floor(i / 3) * 0.18, 0]}
            rotation={[-0.1, 0, 0]}
          >
            <boxGeometry args={[0.5, 0.12, 0.02]} />
            <meshStandardMaterial
              ref={(m) => { if (m) queueBars.current[i] = m; }}
              color={room.accent} emissive={room.accent} emissiveIntensity={1.0} toneMapped={false}
            />
          </mesh>
        ))}
      </group>
      {/* Trade pipes exiting room toward the back */}
      {[-1.8, 1.8].map((x) => (
        <mesh key={x} position={[x, 0.35, -0.5]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.1, 0.1, 3.5, 10]} />
          <meshStandardMaterial color={room.accent} emissive={room.accent} emissiveIntensity={1.3} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

// ATLAS — Portfolio Vault
//   Vault cells + allocation map projected on back wall
function Vault({ room }: { room: RoomDef }) {
  return (
    <group>
      <Terminal room={room} label={room.promptLabel} position={[0, 0, 0]} glyph="⬢" />
      {/* 6-cell grid on back wall */}
      {[-0.8, 0, 0.8].map((x) =>
        [-0.3, 0.4].map((y) => (
          <mesh key={`${x}-${y}`} position={[x, 0.6 + y, -1.65]}>
            <boxGeometry args={[0.55, 0.55, 0.06]} />
            <meshStandardMaterial color="#1a0f28" emissive={room.accent} emissiveIntensity={0.55} />
          </mesh>
        )),
      )}
      {/* Holographic allocation map at the front */}
      {Array.from({ length: 5 }).map((_, i) => (
        <mesh key={i} position={[-1 + i * 0.5, 0.4, 1.4]} rotation={[-0.35, 0, 0]}>
          <boxGeometry args={[0.4, 0.1 + (i % 3) * 0.15, 0.03]} />
          <meshStandardMaterial color={room.accent} emissive={room.accent} emissiveIntensity={1.2} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

// NYX — News Intelligence
//   Scrolling headline wall + satellite dish
function News({ room }: { room: RoomDef }) {
  const dish = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (dish.current) dish.current.rotation.y = clock.elapsedTime * 0.4;
  });
  return (
    <group>
      <Terminal room={room} label={room.promptLabel} position={[0, 0, 0]} glyph="✎" />
      {/* Headline wall — many thin horizontal bars = scrolling text */}
      <mesh position={[0, 0.9, -1.65]}>
        <boxGeometry args={[2.6, 1.3, 0.04]} />
        <meshStandardMaterial color="#060a1f" emissive={room.accent} emissiveIntensity={0.25} />
      </mesh>
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh key={i} position={[0, 0.35 + i * 0.14, -1.62]}>
          <boxGeometry args={[2.2 - (i % 3) * 0.4, 0.035, 0.01]} />
          <meshStandardMaterial color={room.accent} emissive={room.accent} emissiveIntensity={0.9 + (i % 2) * 0.6} toneMapped={false} />
        </mesh>
      ))}
      {/* Satellite dish */}
      <group ref={dish} position={[1.5, 0.9, 1.2]}>
        <mesh rotation={[-Math.PI / 3, 0, 0]}>
          <coneGeometry args={[0.35, 0.25, 18, 1, true]} />
          <meshStandardMaterial color="#d0e0f0" metalness={0.7} side={THREE.DoubleSide} />
        </mesh>
      </group>
      <mesh position={[1.5, 0.55, 1.2]}>
        <cylinderGeometry args={[0.03, 0.03, 0.5, 8]} />
        <meshStandardMaterial color="#3a4a5a" />
      </mesh>
    </group>
  );
}

// VELA — Sentiment Engine
//   Floating sentiment nodes + colorful pulse waves
function Sentiment({ room }: { room: RoomDef }) {
  const wave = useRef<THREE.Mesh[]>([]);
  const nodes = useRef<THREE.Group[]>([]);
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
    nodes.current.forEach((g, i) => {
      if (g) {
        g.position.y = 0.9 + Math.sin(t * 0.9 + i * 1.1) * 0.15;
        g.rotation.y = t * 0.3 + i;
      }
    });
  });
  return (
    <group>
      <Terminal room={room} label={room.promptLabel} position={[0, 0, 0]} glyph="♥" />
      {/* Heart-rate bars (front) */}
      <group position={[0, 0.2, 1.5]}>
        {Array.from({ length: 11 }).map((_, i) => (
          <mesh
            key={i}
            ref={(el) => { if (el) wave.current[i] = el; }}
            position={[(i - 5) * 0.2, 0.3, 0]}
          >
            <boxGeometry args={[0.06, 0.6, 0.06]} />
            <meshStandardMaterial color={room.accent} emissive={room.accent} emissiveIntensity={1} toneMapped={false} />
          </mesh>
        ))}
      </group>
      {/* Floating sentiment nodes (back half) */}
      {Array.from({ length: 5 }).map((_, i) => (
        <group
          key={i}
          ref={(el) => { if (el) nodes.current[i] = el; }}
          position={[-1.3 + i * 0.65, 0.9, -1.0]}
        >
          <mesh>
            <icosahedronGeometry args={[0.12, 0]} />
            <meshStandardMaterial color={room.accent} emissive={room.accent} emissiveIntensity={1.6} transparent opacity={0.85} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// AURORA — Pattern Lab (NEW)
//   Pattern holograms + waveform bars
function PatternLab({ room }: { room: RoomDef }) {
  const bars = useRef<THREE.Mesh[]>([]);
  const BAR_COUNT = 28;
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    bars.current.forEach((m, i) => {
      if (m) {
        const x = (i / (BAR_COUNT - 1)) * 2.2 - 1.1;
        const y = 0.5 + Math.abs(Math.sin(x * 4 + t * 2) * 0.45 + Math.sin(x * 9 + t * 1.3) * 0.18);
        m.scale.y = y;
        const mat = m.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = 0.7 + y;
      }
    });
  });
  return (
    <group>
      <Terminal room={room} label={room.promptLabel} position={[0, 0, 0]} glyph="∿" />
      {/* Back wall with the waveform screen */}
      <mesh position={[0, 0.9, -1.65]}>
        <boxGeometry args={[2.6, 1.3, 0.04]} />
        <meshStandardMaterial color="#030a14" emissive={room.accent} emissiveIntensity={0.3} />
      </mesh>
      {/* Live waveform rendered as animated bar stack */}
      <group position={[0, 0.9, -1.62]}>
        {Array.from({ length: BAR_COUNT }).map((_, i) => {
          const x = (i / (BAR_COUNT - 1)) * 2.2 - 1.1;
          return (
            <mesh
              key={i}
              ref={(m) => { if (m) bars.current[i] = m; }}
              position={[x, 0, 0]}
            >
              <boxGeometry args={[0.055, 0.08, 0.015]} />
              <meshStandardMaterial color={room.accent} emissive={room.accent} emissiveIntensity={1.1} toneMapped={false} />
            </mesh>
          );
        })}
      </group>
      {/* Pattern hologram cubes floating in the centre of the room */}
      {[[-0.9, 1.0, 0.5], [0, 1.15, 0.4], [0.9, 0.95, 0.6]].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]} rotation={[i * 0.3, i * 0.5, 0]}>
          <boxGeometry args={[0.22, 0.22, 0.22]} />
          <meshStandardMaterial color={room.accent} emissive={room.accent} emissiveIntensity={0.9} transparent opacity={0.55} wireframe />
        </mesh>
      ))}
      {/* Pink accent secondary line */}
      <mesh position={[0, 0.45, -1.62]}>
        <boxGeometry args={[2.3, 0.015, 0.01]} />
        <meshStandardMaterial color="#F78FB3" emissive="#F78FB3" emissiveIntensity={1.5} toneMapped={false} />
      </mesh>
    </group>
  );
}

// HELIX — Hedge Engine
//   Spiral helix hologram + shield generator
function Hedge({ room }: { room: RoomDef }) {
  const helix = useRef<THREE.Group>(null);
  const shield = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (helix.current) helix.current.rotation.y = t * 0.7;
    if (shield.current) shield.current.emissiveIntensity = 1.0 + Math.sin(t * 1.5) * 0.6;
  });
  return (
    <group>
      <Terminal room={room} label={room.promptLabel} position={[0, 0, 0]} glyph="≋" />
      {/* Double-helix hologram */}
      <group ref={helix} position={[0, 1.0, -1.2]}>
        {Array.from({ length: 18 }).map((_, i) => {
          const t = (i / 17) * Math.PI * 2;
          const y = i * 0.07 - 0.6;
          return (
            <group key={i}>
              <mesh position={[Math.cos(t) * 0.22, y, Math.sin(t) * 0.22]}>
                <sphereGeometry args={[0.04, 8, 8]} />
                <meshStandardMaterial color={room.accent} emissive={room.accent} emissiveIntensity={1.6} toneMapped={false} />
              </mesh>
              <mesh position={[Math.cos(t + Math.PI) * 0.22, y, Math.sin(t + Math.PI) * 0.22]}>
                <sphereGeometry args={[0.04, 8, 8]} />
                <meshStandardMaterial color="#FFD166" emissive="#FFD166" emissiveIntensity={1.6} toneMapped={false} />
              </mesh>
            </group>
          );
        })}
      </group>
      {/* Shield generator dome in front */}
      <mesh position={[0, 0.35, 1.4]}>
        <sphereGeometry args={[0.32, 20, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial ref={shield} color={room.accent} emissive={room.accent} emissiveIntensity={1} transparent opacity={0.55} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.1, 1.4]}>
        <cylinderGeometry args={[0.35, 0.38, 0.06, 24]} />
        <meshStandardMaterial color="#0f2a1f" metalness={0.6} />
      </mesh>
    </group>
  );
}

// SENTINEL — Kill Switch
//   Big armed button + red hazard lights + locked warning gate
function KillChamber({ room }: { room: RoomDef }) {
  const dome = useRef<THREE.MeshStandardMaterial>(null);
  const hazard = useRef<THREE.MeshStandardMaterial[]>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (dome.current) dome.current.emissiveIntensity = 1.5 + Math.sin(t * 4) * 1.2;
    hazard.current.forEach((m, i) => {
      if (m) m.emissiveIntensity = Math.sin(t * 3 + i * 1.2) > 0 ? 2.4 : 0.3;
    });
  });
  return (
    <group>
      <Terminal room={room} label={room.promptLabel} position={[0, 0, 0]} glyph="✖" />
      {/* Pedestal + armed button */}
      <mesh position={[0, 0.35, 1.4]}>
        <cylinderGeometry args={[0.36, 0.48, 0.12, 24]} />
        <meshStandardMaterial color="#1a0a0a" metalness={0.6} />
      </mesh>
      <mesh position={[0, 0.5, 1.4]}>
        <sphereGeometry args={[0.23, 24, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial ref={dome} color={room.accent} emissive={room.accent} emissiveIntensity={2} toneMapped={false} />
      </mesh>
      {/* Locked warning gate at the back */}
      <mesh position={[0, 0.9, -1.5]}>
        <boxGeometry args={[2.3, 1.5, 0.1]} />
        <meshStandardMaterial color="#220808" />
      </mesh>
      {/* Diagonal hazard stripes — 5 */}
      {Array.from({ length: 5 }).map((_, i) => (
        <mesh key={i} position={[-0.8 + i * 0.4, 0.9, -1.44]} rotation={[0, 0, Math.PI / 5]}>
          <boxGeometry args={[0.25, 1.6, 0.01]} />
          <meshStandardMaterial
            ref={(m) => { if (m) hazard.current[i] = m; }}
            color={room.accent} emissive={room.accent} emissiveIntensity={2}
            transparent opacity={0.7} toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

// HUMAN APPROVAL — Owner Gate
//   Command chair + approval terminal + crown-icon hologram
function Approval({ room }: { room: RoomDef }) {
  const crown = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (crown.current) {
      crown.current.rotation.y = clock.elapsedTime * 0.4;
      crown.current.position.y = 1.25 + Math.sin(clock.elapsedTime * 1.5) * 0.06;
    }
  });
  return (
    <group>
      <Terminal room={room} label={room.promptLabel} position={[0, 0, 0]} glyph="✓" />
      {/* Command chair at the front */}
      <mesh position={[0, 0.42, 1.3]}>
        <boxGeometry args={[0.7, 0.85, 0.55]} />
        <meshStandardMaterial color="#1a1810" metalness={0.4} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.5, 1.6]}>
        <boxGeometry args={[0.6, 0.5, 0.05]} />
        <meshStandardMaterial color={room.accent} emissive={room.accent} emissiveIntensity={0.5} />
      </mesh>
      {/* Crown hologram floating over the chair */}
      <group ref={crown} position={[0, 1.25, 1.3]}>
        {/* 5 spikes */}
        {[-0.4, -0.2, 0, 0.2, 0.4].map((x, i) => (
          <mesh key={i} position={[x, i === 0 || i === 4 ? 0 : 0.05, 0]}>
            <coneGeometry args={[0.05, 0.18 + (i === 2 ? 0.05 : 0), 6]} />
            <meshStandardMaterial color={room.accent} emissive={room.accent} emissiveIntensity={1.8} toneMapped={false} />
          </mesh>
        ))}
        <mesh position={[0, -0.08, 0]}>
          <torusGeometry args={[0.22, 0.035, 8, 18]} />
          <meshStandardMaterial color={room.accent} emissive={room.accent} emissiveIntensity={1.8} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}
