'use client';

// Per spec §5.2 — 11 per-city interior dioramas. Each implements the props,
// animations, and counts documented in the Command Center spec.

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { CityData } from '@/types';

export function Interior({ city }: { city: CityData }) {
  switch (city.archetype) {
    case 'trading_floor': return <Aletheia accent={city.accentColor} />;
    case 'library':       return <Mnemosyne accent={city.accentColor} />;
    case 'lab':           return <Prometheus accent={city.accentColor} />;
    case 'forge':         return <Hephaestus accent={city.accentColor} />;
    case 'court':         return <Themis accent={city.accentColor} />;
    case 'port':          return <Agora accent={city.accentColor} />;
    case 'observatory':   return <Iris accent={city.accentColor} />;
    case 'clocktower':    return <Chronos accent={city.accentColor} />;
    case 'mirror':        return <Narcissus accent={city.accentColor} />;
    case 'inverse':       return <Eris accent={city.accentColor} />;
    case 'bridge':        return <Janus />;
  }
}

// Aletheia — 9 desks + 9 monitors + 1 podium + ticker ring (rotating)
function Aletheia({ accent }: { accent: string }) {
  const ring = useRef<THREE.Group>(null);
  const monitorsMat = useRef<THREE.MeshStandardMaterial[]>([]);
  useFrame(({ clock }) => {
    if (ring.current) ring.current.rotation.y = clock.elapsedTime * 0.4;
    const t = clock.elapsedTime;
    monitorsMat.current.forEach((m, i) => {
      if (m) m.emissiveIntensity = 0.5 + Math.abs(Math.sin(t * 2 + i)) * 1.2;
    });
  });
  const desks = [];
  for (let i = 0; i < 9; i++) {
    const x = ((i % 3) - 1) * 0.3;
    const z = (Math.floor(i / 3) - 1) * 0.3;
    desks.push(
      <group key={i} position={[x, 0.05, z]}>
        <mesh>
          <boxGeometry args={[0.1, 0.05, 0.1]} />
          <meshStandardMaterial color="#1c2030" />
        </mesh>
        <mesh
          position={[0, 0.07, 0]}
          rotation={[-0.3, 0, 0]}
          ref={(m) => {
            if (m) monitorsMat.current[i] = m.material as THREE.MeshStandardMaterial;
          }}
        >
          <planeGeometry args={[0.08, 0.05]} />
          <meshStandardMaterial
            color="#0A1020"
            emissive={['#4ECDC4', '#FFD166', '#FF6B35'][i % 3]}
            emissiveIntensity={0.8}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>,
    );
  }
  return (
    <group>
      {desks}
      {/* Podium */}
      <mesh position={[0, 0.08, -0.55]}>
        <cylinderGeometry args={[0.04, 0.06, 0.15, 8]} />
        <meshStandardMaterial color="#2a2a3a" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Ticker ring */}
      <group ref={ring} position={[0, 0.85, 0]}>
        <mesh>
          <torusGeometry args={[0.55, 0.015, 8, 48]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.5} />
        </mesh>
      </group>
    </group>
  );
}

// Mnemosyne — central dome + orb + 20 shelves
function Mnemosyne({ accent }: { accent: string }) {
  const orbMat = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (orbMat.current) {
      orbMat.current.emissiveIntensity = 1.3 + Math.sin(clock.elapsedTime * 1.5) * 0.7;
    }
  });
  const shelves = [];
  for (let i = 0; i < 20; i++) {
    const side = i < 10 ? -1 : 1;
    const row = Math.floor((i % 10) / 5);
    const col = (i % 10) % 5;
    shelves.push(
      <mesh key={i} position={[(col - 2) * 0.18, 0.2 + row * 0.3, side * 0.75]}>
        <boxGeometry args={[0.13, 0.08, 0.06]} />
        <meshStandardMaterial color="#7a5a2b" emissive={accent} emissiveIntensity={0.1} />
      </mesh>,
    );
  }
  return (
    <group>
      {/* Dome */}
      <mesh position={[0, 0.25, 0]}>
        <sphereGeometry args={[0.6, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#1a1a22" transparent opacity={0.4} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.4, 0]}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial ref={orbMat} color={accent} emissive={accent} emissiveIntensity={1.5} />
      </mesh>
      {shelves}
    </group>
  );
}

// Prometheus — 2 domes, rings, lightning bolt
function Prometheus({ accent }: { accent: string }) {
  const ring1 = useRef<THREE.Mesh>(null);
  const ring2 = useRef<THREE.Mesh>(null);
  const boltMat = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (ring1.current) ring1.current.rotation.x = t * 0.7;
    if (ring2.current) ring2.current.rotation.z = t * 0.5;
    if (boltMat.current) {
      // Flicker randomly
      const flick = Math.random() < 0.05 ? 1 : 0;
      boltMat.current.opacity = flick;
    }
  });
  return (
    <group>
      {/* Dome 1 */}
      <mesh position={[-0.45, 0.35, 0]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshPhysicalMaterial color="#e8f6ff" roughness={0.15} transmission={0.85} ior={1.4} transparent opacity={0.45} />
      </mesh>
      <mesh ref={ring1} position={[-0.45, 0.35, 0]}>
        <torusGeometry args={[0.18, 0.01, 6, 24]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={2} />
      </mesh>
      {/* Dome 2 with lightning */}
      <mesh position={[0.45, 0.35, 0]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshPhysicalMaterial color="#e8f6ff" roughness={0.15} transmission={0.85} ior={1.4} transparent opacity={0.45} />
      </mesh>
      <mesh ref={ring2} position={[0.45, 0.35, 0]}>
        <torusGeometry args={[0.18, 0.01, 6, 24]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={2} />
      </mesh>
      {/* Lightning — zigzag line made from a series of tiny boxes */}
      <group position={[0.45, 0.35, 0]}>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} position={[((i % 2 ? 1 : -1) * 0.03), -0.1 + i * 0.06, 0]} rotation={[0, 0, (i % 2 ? 0.5 : -0.5)]}>
            <boxGeometry args={[0.01, 0.05, 0.01]} />
            <meshBasicMaterial ref={i === 0 ? boltMat : undefined} color="#ffffff" transparent opacity={1} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

// Hephaestus — 3 server racks with LEDs, cables pulsing
function Hephaestus({ accent }: { accent: string }) {
  const leds = useRef<THREE.MeshStandardMaterial[]>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    leds.current.forEach((m, i) => {
      if (m) m.emissiveIntensity = Math.sin(t * 3 + i * 0.8) > 0 ? 2 : 0.3;
    });
  });
  const racks = [-0.45, 0, 0.45];
  return (
    <group>
      {racks.map((x, i) => (
        <group key={i} position={[x, 0.4, 0]}>
          <mesh>
            <boxGeometry args={[0.22, 0.7, 0.4]} />
            <meshStandardMaterial color="#1a1620" roughness={0.5} metalness={0.4} />
          </mesh>
          {/* LED strip */}
          {Array.from({ length: 5 }).map((_, j) => (
            <mesh
              key={j}
              position={[0.12, 0.3 - j * 0.12, 0.15]}
              ref={(m) => {
                if (m) leds.current[i * 5 + j] = m.material as THREE.MeshStandardMaterial;
              }}
            >
              <boxGeometry args={[0.01, 0.05, 0.03]} />
              <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.5} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

// Themis — 6 columns + scale of justice
function Themis({ accent }: { accent: string }) {
  const scale = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (scale.current) scale.current.rotation.z = Math.sin(clock.elapsedTime * 0.8) * 0.1;
  });
  const cols: Array<[number, number, number]> = [
    [-0.5, 0.45, -0.5], [0, 0.45, -0.5], [0.5, 0.45, -0.5],
    [-0.5, 0.45, 0.5], [0, 0.45, 0.5], [0.5, 0.45, 0.5],
  ];
  return (
    <group>
      {cols.map((p, i) => (
        <mesh key={i} position={p}>
          <cylinderGeometry args={[0.04, 0.05, 0.9, 8]} />
          <meshStandardMaterial color="#d6d6dd" roughness={0.6} metalness={0.1} />
        </mesh>
      ))}
      <group ref={scale} position={[0, 0.55, 0]}>
        <mesh>
          <boxGeometry args={[0.04, 0.5, 0.04]} />
          <meshStandardMaterial color="#b0b0b8" metalness={0.6} roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.22, 0]}>
          <boxGeometry args={[0.5, 0.015, 0.04]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.5} />
        </mesh>
        <mesh position={[-0.22, 0.15, 0]}>
          <cylinderGeometry args={[0.07, 0.07, 0.02, 16]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.3} />
        </mesh>
        <mesh position={[0.22, 0.15, 0]}>
          <cylinderGeometry args={[0.07, 0.07, 0.02, 16]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.3} />
        </mesh>
      </group>
    </group>
  );
}

// Agora — 3 satellite dishes + 2 ships
function Agora({ accent }: { accent: string }) {
  const dishes = useRef<THREE.Group[]>([]);
  const ships = useRef<THREE.Mesh[]>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    dishes.current.forEach((d, i) => {
      if (d) d.rotation.y = t * 0.4 + i;
    });
    ships.current.forEach((s, i) => {
      if (s) s.position.x = Math.sin(t * 0.3 + i * 1.5) * 0.6;
    });
  });
  return (
    <group>
      {[-0.55, 0, 0.55].map((x, i) => (
        <group
          key={i}
          position={[x, 0.9, -0.4]}
          ref={(g) => {
            if (g) dishes.current[i] = g;
          }}
        >
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.1, 0.15, 16, 1, true]} />
            <meshStandardMaterial color="#e0e0ea" metalness={0.7} roughness={0.3} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, -0.08, 0]}>
            <cylinderGeometry args={[0.01, 0.01, 0.15, 6]} />
            <meshStandardMaterial color="#555" />
          </mesh>
        </group>
      ))}
      {/* Ships */}
      {[0.4, -0.4].map((z, i) => (
        <mesh
          key={i}
          ref={(m) => {
            if (m) ships.current[i] = m;
          }}
          position={[0, 0.08, z]}
        >
          <boxGeometry args={[0.15, 0.03, 0.06]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.25} />
        </mesh>
      ))}
    </group>
  );
}

// Iris — radar + 2 floating eye triangles
function Iris({ accent }: { accent: string }) {
  const radar = useRef<THREE.Mesh>(null);
  const eye1 = useRef<THREE.Mesh>(null);
  const eye2 = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (radar.current) radar.current.rotation.z = t * 0.8;
    [eye1, eye2].forEach((e, i) => {
      if (e.current) {
        const mat = e.current.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = 1 + Math.sin(t * 2 + i) * 0.8;
      }
    });
  });
  return (
    <group>
      {/* Radar dish */}
      <group position={[0, 0.05, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.15, 0.35, 32]} />
          <meshStandardMaterial color="#1a1228" side={THREE.DoubleSide} />
        </mesh>
        <mesh ref={radar} position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.35, 0.02]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={2} side={THREE.DoubleSide} />
        </mesh>
      </group>
      {/* Floating eye triangles */}
      <mesh ref={eye1} position={[-0.5, 0.7, 0.2]}>
        <tetrahedronGeometry args={[0.06]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.4} />
      </mesh>
      <mesh ref={eye2} position={[0.5, 0.7, -0.2]}>
        <tetrahedronGeometry args={[0.06]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.4} />
      </mesh>
    </group>
  );
}

// Chronos — giant pendulum + 3 wall clocks
function Chronos({ accent }: { accent: string }) {
  const pend = useRef<THREE.Group>(null);
  const hands = useRef<THREE.Group[]>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (pend.current) pend.current.rotation.z = Math.sin(t * 1.2) * 0.4;
    hands.current.forEach((h, i) => {
      if (h) h.rotation.z = -t * (i === 0 ? 1.0 : i === 1 ? 0.083 : 0.007);
    });
  });
  return (
    <group>
      {/* Pendulum */}
      <group position={[0, 1.4, 0]}>
        <mesh>
          <sphereGeometry args={[0.02, 8, 8]} />
          <meshStandardMaterial color="#333" />
        </mesh>
        <group ref={pend} position={[0, 0, 0]}>
          <mesh position={[0, -0.6, 0]}>
            <boxGeometry args={[0.02, 1.2, 0.02]} />
            <meshStandardMaterial color="#c8a448" metalness={0.6} />
          </mesh>
          <mesh position={[0, -1.2, 0]}>
            <sphereGeometry args={[0.1, 16, 16]} />
            <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.3} metalness={0.7} roughness={0.2} />
          </mesh>
        </group>
      </group>
      {/* 3 wall clocks */}
      {[-0.6, 0, 0.6].map((x, i) => (
        <group key={i} position={[x, 1.0, -0.85]}>
          <mesh>
            <cylinderGeometry args={[0.1, 0.1, 0.02, 24]} />
            <meshStandardMaterial color="#f8f8f8" />
          </mesh>
          <group
            ref={(g) => {
              if (g) hands.current[i] = g;
            }}
            position={[0, 0.01, 0]}
          >
            <mesh position={[0, 0, 0.05]}>
              <boxGeometry args={[0.005, 0.005, 0.1]} />
              <meshStandardMaterial color="#111" />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  );
}

// Narcissus — mini hex replica + mirror pool
function Narcissus({ accent }: { accent: string }) {
  const mini = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (mini.current) mini.current.rotation.y = clock.elapsedTime * 0.3;
  });
  return (
    <group>
      {/* Mirror pool */}
      <mesh position={[0, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.2, 1.4]} />
        <meshStandardMaterial color="#0a0a14" metalness={1} roughness={0.1} />
      </mesh>
      {/* Mini hex replica */}
      <group ref={mini} position={[0, 0.4, 0]}>
        <mesh>
          <cylinderGeometry args={[0.5, 0.5, 0.05, 6]} />
          <meshStandardMaterial color="#1E2330" metalness={0.8} roughness={0.4} />
        </mesh>
        {Array.from({ length: 6 }).map((_, i) => {
          const a = (i / 6) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(a) * 0.35, 0.08, Math.sin(a) * 0.35]}>
              <boxGeometry args={[0.08, 0.1, 0.08]} />
              <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.6} />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}

// Eris — inverted spires + smoke
function Eris({ accent }: { accent: string }) {
  const spires = useRef<THREE.Mesh[]>([]);
  const smokeRef = useRef<THREE.Points>(null);
  const smokeGeo = useMemo(() => {
    const n = 80;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 1.5;
      pos[i * 3 + 1] = Math.random() * 1.3;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 1.2;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);
  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    spires.current.forEach((s, i) => {
      if (s) s.rotation.y = t * 0.3 + i;
    });
    if (smokeRef.current) {
      const a = smokeRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
      const arr = a.array as Float32Array;
      for (let i = 0; i < arr.length; i += 3) {
        arr[i] += Math.sin(t + i) * dt * 0.2;
        arr[i + 1] += dt * 0.15;
        if (arr[i + 1] > 1.5) arr[i + 1] = 0;
      }
      a.needsUpdate = true;
    }
  });
  const spirePositions: Array<[number, number, number]> = [
    [-0.4, 1.5, -0.3], [0.4, 1.5, -0.3], [-0.4, 1.5, 0.3], [0.4, 1.5, 0.3],
  ];
  return (
    <group>
      {spirePositions.map((p, i) => (
        <mesh
          key={i}
          position={p}
          rotation={[Math.PI, 0, 0]}
          ref={(m) => {
            if (m) spires.current[i] = m;
          }}
        >
          <coneGeometry args={[0.08, 0.5, 6]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.8} />
        </mesh>
      ))}
      <points ref={smokeRef} geometry={smokeGeo}>
        <pointsMaterial color={accent} size={0.03} transparent opacity={0.4} depthWrite={false} />
      </points>
    </group>
  );
}

// Janus — two-faced archway + satellite + robotic arm
function Janus() {
  const armRef = useRef<THREE.Group>(null);
  const satRef = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (armRef.current) {
      armRef.current.rotation.y = Math.sin(t * 1.0) * 0.6;
    }
    if (satRef.current) satRef.current.rotation.y = t * 0.4;
  });
  return (
    <group>
      {/* Archway */}
      <mesh position={[0, 0.5, 0]}>
        <torusGeometry args={[0.45, 0.03, 6, 24, Math.PI]} />
        <meshStandardMaterial color="#c0c0ca" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Silver side — satellite */}
      <group ref={satRef} position={[-0.55, 0.6, 0]}>
        <mesh>
          <boxGeometry args={[0.1, 0.1, 0.1]} />
          <meshStandardMaterial color="#D0D6DC" metalness={0.8} />
        </mesh>
        <mesh position={[0.12, 0, 0]}>
          <boxGeometry args={[0.12, 0.01, 0.08]} />
          <meshStandardMaterial color="#4050a0" emissive="#4050a0" emissiveIntensity={0.5} />
        </mesh>
        <mesh position={[-0.12, 0, 0]}>
          <boxGeometry args={[0.12, 0.01, 0.08]} />
          <meshStandardMaterial color="#4050a0" emissive="#4050a0" emissiveIntensity={0.5} />
        </mesh>
      </group>
      {/* Blue side — robotic arm */}
      <group position={[0.55, 0.1, 0]}>
        <mesh position={[0, 0.05, 0]}>
          <cylinderGeometry args={[0.05, 0.07, 0.1, 10]} />
          <meshStandardMaterial color="#0B1D3A" metalness={0.6} />
        </mesh>
        <group ref={armRef} position={[0, 0.1, 0]}>
          <mesh position={[0, 0.15, 0]}>
            <boxGeometry args={[0.04, 0.3, 0.04]} />
            <meshStandardMaterial color="#0B1D3A" metalness={0.6} />
          </mesh>
          <mesh position={[0, 0.3, 0.05]}>
            <boxGeometry args={[0.06, 0.06, 0.06]} />
            <meshStandardMaterial color="#00F5D4" emissive="#00F5D4" emissiveIntensity={0.6} />
          </mesh>
        </group>
      </group>
    </group>
  );
}
