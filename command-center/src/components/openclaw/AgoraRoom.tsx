'use client';

import * as THREE from 'three';
import { Html, Line } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import type { RoomDef } from '@/data/openclawRooms';
import { useOpenClawStore } from '@/store/openclawStore';

// AGORA — Strategy Council
// The "brain" of the facility. Premium AI war room.
//
// Room footprint: 7 × 5  (local coords: x ∈ [-3.5, 3.5], z ∈ [-2.5, 2.5])
// Height: partitions sit at 1.6, ceiling fixture at ~2.35.
export function AgoraRoom({ room }: { room: RoomDef }) {
  return (
    <group>
      <AgoraHexFloor accent={room.accent} />
      <AgoraCeiling accent={room.accent} />
      <AgoraWallScreens accent={room.accent} />
      <AgoraWallPanels />
      <AgoraConsoles accent={room.accent} />
      <AgoraCables accent={room.accent} />
      <AgoraCouncil accent={room.accent} />
      <AgoraDrones accent={room.accent} />
      <AgoraTable accent={room.accent} />
      <AgoraPrompt roomId={room.id} label={room.promptLabel} accent={room.accent} />
    </group>
  );
}

// ============================================================================
// 1. Floor — hex tiles + radiating glow lines + ritual markings
// ============================================================================
function AgoraHexFloor({ accent }: { accent: string }) {
  // Hex grid across the room interior. Uses point-up hexagons laid in
  // staggered rows.
  const hexes = useMemo(() => {
    const arr: Array<{ x: number; z: number; dim: boolean }> = [];
    const R = 0.31; // hex circumradius
    const dx = R * Math.sqrt(3);
    const dz = R * 1.5;
    const cols = 12;
    const rows = 9;
    const x0 = -((cols - 1) * dx) / 2;
    const z0 = -((rows - 1) * dz) / 2;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = x0 + c * dx + (r % 2 === 0 ? 0 : dx / 2);
        const z = z0 + r * dz;
        if (Math.abs(x) > 3.1 || Math.abs(z) > 2.2) continue;
        const d = Math.hypot(x, z);
        arr.push({ x, z, dim: d < 1.2 });
      }
    }
    return { arr, R };
  }, []);

  // Radial glowing lines converging on the centre.
  const rays = useMemo(() => {
    const arr: Array<{ angle: number }> = [];
    const N = 16;
    for (let i = 0; i < N; i++) arr.push({ angle: (i / N) * Math.PI * 2 });
    return arr;
  }, []);

  const rayMat = useRef<THREE.MeshBasicMaterial[]>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    rayMat.current.forEach((m, i) => {
      if (m) m.opacity = 0.22 + Math.abs(Math.sin(t * 0.9 + i * 0.3)) * 0.3;
    });
  });

  return (
    <group position={[0, 0.045, 0]}>
      {/* Hex tiles — slightly lifted above the base white tiles from
          Room.tsx. Alternate subtle tints between rim and centre. */}
      {hexes.arr.map((h, i) => (
        <mesh key={i} position={[h.x, 0, h.z]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[hexes.R * 0.93, 6]} />
          <meshStandardMaterial
            color={h.dim ? '#eef5f6' : '#dfeeef'}
            emissive={accent}
            emissiveIntensity={h.dim ? 0.08 : 0.03}
            roughness={0.35}
            metalness={0.15}
          />
        </mesh>
      ))}
      {/* Hex outlines — thin accent ring per hex, dimmer further from centre */}
      {hexes.arr.map((h, i) => (
        <mesh key={`o-${i}`} position={[h.x, 0.005, h.z]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[hexes.R * 0.88, hexes.R * 0.93, 6]} />
          <meshBasicMaterial color={accent} transparent opacity={0.22} side={THREE.DoubleSide} toneMapped={false} />
        </mesh>
      ))}

      {/* Ritual circle markings — three concentric rings */}
      {[1.6, 1.25, 0.95].map((r, i) => (
        <mesh key={`rc-${i}`} position={[0, 0.008, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[r, r + 0.02, 72]} />
          <meshBasicMaterial color={accent} transparent opacity={0.55 - i * 0.1} side={THREE.DoubleSide} toneMapped={false} />
        </mesh>
      ))}
      {/* Rune tick marks around the outer circle */}
      {Array.from({ length: 24 }).map((_, i) => {
        const a = (i / 24) * Math.PI * 2;
        return (
          <mesh
            key={`tk-${i}`}
            position={[Math.cos(a) * 1.6, 0.01, Math.sin(a) * 1.6]}
            rotation={[-Math.PI / 2, 0, -a + Math.PI / 2]}
          >
            <planeGeometry args={[0.08, 0.02]} />
            <meshBasicMaterial color={accent} transparent opacity={0.7} toneMapped={false} />
          </mesh>
        );
      })}

      {/* Radial glow lines converging on the centre */}
      {rays.map((r, i) => {
        const len = 1.95;
        return (
          <mesh
            key={`ray-${i}`}
            position={[Math.cos(r.angle) * (len / 2 + 0.45), 0.011, Math.sin(r.angle) * (len / 2 + 0.45)]}
            rotation={[-Math.PI / 2, 0, -r.angle]}
          >
            <planeGeometry args={[len, 0.035]} />
            <meshBasicMaterial
              ref={(m) => { if (m) rayMat.current[i] = m; }}
              color={accent}
              transparent
              opacity={0.32}
              side={THREE.DoubleSide}
              toneMapped={false}
            />
          </mesh>
        );
      })}
    </group>
  );
}

// ============================================================================
// 2. Ceiling — ring light fixture + downward beam + soft glow
// ============================================================================
function AgoraCeiling({ accent }: { accent: string }) {
  const beamMat = useRef<THREE.MeshBasicMaterial>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (beamMat.current) beamMat.current.opacity = 0.22 + Math.sin(t * 1.3) * 0.05;
    if (lightRef.current) lightRef.current.intensity = 3.2 + Math.sin(t * 1.1) * 0.25;
  });
  return (
    <group position={[0, 2.35, 0]}>
      {/* Dark ceiling plate — gives the fixture something to mount on */}
      <mesh position={[0, 0.04, 0]}>
        <cylinderGeometry args={[1.4, 1.4, 0.04, 40]} />
        <meshStandardMaterial color="#14203a" roughness={0.6} metalness={0.5} />
      </mesh>
      {/* Outer torus ring — the "fixture" */}
      <mesh>
        <torusGeometry args={[1.2, 0.04, 12, 64]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={2.6} toneMapped={false} />
      </mesh>
      {/* Inner narrower torus */}
      <mesh>
        <torusGeometry args={[0.85, 0.025, 10, 64]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={2.8} toneMapped={false} />
      </mesh>
      {/* Radial spokes */}
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 1.02, 0, Math.sin(a) * 1.02]} rotation={[0, -a, 0]}>
            <boxGeometry args={[0.35, 0.02, 0.02]} />
            <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.3} toneMapped={false} />
          </mesh>
        );
      })}
      {/* Dedicated bright downward light */}
      <pointLight ref={lightRef} color="#d8f0ff" intensity={3.2} distance={5.5} decay={1.6} position={[0, -0.1, 0]} />
      {/* Soft downward cone beam (additive) */}
      <mesh position={[0, -1.15, 0]}>
        <coneGeometry args={[1.15, 2.25, 40, 1, true]} />
        <meshBasicMaterial
          ref={beamMat}
          color="#cfeaff"
          transparent
          opacity={0.22}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

// ============================================================================
// 3. Wall screens — 6 embedded animated displays
// ============================================================================
function AgoraWallScreens({ accent }: { accent: string }) {
  // Screen positions + orientations — 3 on the back wall (z=-2.4), 1 on each
  // side wall (x=±3.4), 1 on the front-right next to the doorway.
  const screens = useMemo(() => [
    { pos: [-2.0, 1.15, -2.38] as [number, number, number], rotY: 0, w: 1.3, h: 0.7, kind: 'chart' as const, seed: 1 },
    { pos: [ 0.0, 1.15, -2.38] as [number, number, number], rotY: 0, w: 1.3, h: 0.7, kind: 'heatmap' as const, seed: 2 },
    { pos: [ 2.0, 1.15, -2.38] as [number, number, number], rotY: 0, w: 1.3, h: 0.7, kind: 'signals' as const, seed: 3 },
    { pos: [-3.38, 1.15, -0.9] as [number, number, number], rotY: Math.PI / 2, w: 1.3, h: 0.7, kind: 'chart' as const, seed: 4 },
    { pos: [-3.38, 1.15,  0.9] as [number, number, number], rotY: Math.PI / 2, w: 1.3, h: 0.7, kind: 'heatmap' as const, seed: 5 },
    { pos: [ 3.38, 1.15, -0.9] as [number, number, number], rotY: -Math.PI / 2, w: 1.3, h: 0.7, kind: 'signals' as const, seed: 6 },
  ], []);

  return (
    <group>
      {screens.map((s, i) => (
        <ScreenPanel key={i} {...s} accent={accent} index={i} />
      ))}
    </group>
  );
}

function ScreenPanel({
  pos, rotY, w, h, kind, seed, accent, index,
}: {
  pos: [number, number, number]; rotY: number; w: number; h: number;
  kind: 'chart' | 'heatmap' | 'signals'; seed: number; accent: string; index: number;
}) {
  // The screen's content materials — a few distinct pieces we animate.
  const flickerMat = useRef<THREE.MeshBasicMaterial>(null);
  const line1 = useRef<THREE.Mesh>(null);
  const line2 = useRef<THREE.Mesh>(null);
  const heatMats = useRef<Array<THREE.MeshBasicMaterial | null>>([]);
  const sigMats = useRef<Array<THREE.MeshBasicMaterial | null>>([]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime + seed * 1.7;
    if (flickerMat.current) {
      flickerMat.current.opacity = 0.86 + (Math.random() < 0.02 ? -0.5 : 0) + Math.sin(t * 2) * 0.04;
    }
    if (line1.current) line1.current.position.x = ((t * 0.4) % 1) * w - w / 2;
    if (line2.current) line2.current.position.x = ((t * 0.25 + 0.6) % 1) * w - w / 2;

    if (kind === 'heatmap') {
      heatMats.current.forEach((m, i) => {
        if (!m) return;
        const v = 0.3 + (Math.sin(t + i * 0.6) * 0.5 + 0.5) * 0.7;
        m.opacity = v;
      });
    }
    if (kind === 'signals') {
      sigMats.current.forEach((m, i) => {
        if (!m) return;
        const blink = Math.sin(t * 3 + i * 1.1) > 0.6 ? 1 : 0.25;
        m.opacity = 0.35 + blink * 0.55;
      });
    }
  });

  // Generate static chart points for the chart kind
  const chartPts = useMemo(() => {
    const arr: THREE.Vector3[] = [];
    const N = 32;
    let y = 0;
    for (let i = 0; i < N; i++) {
      y += (Math.sin(i * 0.6 + seed) + Math.cos(i * 0.21 + seed * 2)) * 0.018;
      arr.push(new THREE.Vector3(-w / 2 + (i / (N - 1)) * w, y * 0.6, 0.005));
    }
    return arr;
  }, [w, seed]);

  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      {/* Bezel frame */}
      <mesh position={[0, 0, 0.01]}>
        <boxGeometry args={[w + 0.1, h + 0.1, 0.04]} />
        <meshStandardMaterial color="#0e1a2f" roughness={0.5} metalness={0.55} />
      </mesh>
      {/* Screen surface (dark emissive) */}
      <mesh position={[0, 0, 0.033]}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial
          ref={flickerMat}
          color="#071528"
          transparent
          opacity={0.92}
          toneMapped={false}
        />
      </mesh>
      {/* Content by kind */}
      {kind === 'chart' && (
        <>
          <Line points={chartPts} color={accent} lineWidth={1.1} position={[0, 0.02, 0.04]} transparent opacity={0.95} toneMapped={false} />
          {/* Vertical sweep lines */}
          <mesh ref={line1} position={[0, 0, 0.041]}>
            <planeGeometry args={[0.01, h * 0.85]} />
            <meshBasicMaterial color={accent} transparent opacity={0.85} toneMapped={false} />
          </mesh>
          <mesh ref={line2} position={[0, 0, 0.041]}>
            <planeGeometry args={[0.01, h * 0.85]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.45} toneMapped={false} />
          </mesh>
          {/* Baseline grid */}
          {Array.from({ length: 3 }).map((_, gi) => (
            <mesh key={gi} position={[0, -h / 2 + (gi + 1) * (h / 4), 0.04]}>
              <planeGeometry args={[w * 0.96, 0.003]} />
              <meshBasicMaterial color={accent} transparent opacity={0.18} toneMapped={false} />
            </mesh>
          ))}
        </>
      )}
      {kind === 'heatmap' && (
        <group position={[0, 0, 0.04]}>
          {Array.from({ length: 8 * 5 }).map((_, i) => {
            const col = i % 8;
            const row = Math.floor(i / 8);
            const cellW = (w * 0.92) / 8;
            const cellH = (h * 0.82) / 5;
            return (
              <mesh
                key={i}
                position={[
                  -w / 2 + w * 0.04 + col * cellW + cellW / 2,
                  -h / 2 + h * 0.09 + row * cellH + cellH / 2,
                  0.001,
                ]}
              >
                <planeGeometry args={[cellW * 0.88, cellH * 0.8]} />
                <meshBasicMaterial
                  ref={(m) => { heatMats.current[i] = m; }}
                  color={accent}
                  transparent
                  opacity={0.45}
                  toneMapped={false}
                />
              </mesh>
            );
          })}
        </group>
      )}
      {kind === 'signals' && (
        <group position={[0, 0, 0.04]}>
          {/* Signal dot stack — blinking indicators */}
          {Array.from({ length: 10 }).map((_, i) => {
            const row = Math.floor(i / 2);
            const col = i % 2;
            return (
              <group
                key={i}
                position={[
                  -w / 2 + 0.12 + col * (w - 0.24),
                  h / 2 - 0.1 - row * (h * 0.18),
                  0.001,
                ]}
              >
                <mesh>
                  <circleGeometry args={[0.04, 16]} />
                  <meshBasicMaterial
                    ref={(m) => { sigMats.current[i] = m; }}
                    color={i % 3 === 0 ? '#FFD166' : accent}
                    transparent
                    opacity={0.6}
                    toneMapped={false}
                  />
                </mesh>
                {/* Tiny bar next to it */}
                <mesh position={[col === 0 ? 0.18 : -0.18, 0, 0]}>
                  <planeGeometry args={[0.24, 0.02]} />
                  <meshBasicMaterial color={accent} transparent opacity={0.55} toneMapped={false} />
                </mesh>
              </group>
            );
          })}
        </group>
      )}
      {/* Lower ticker bar */}
      <mesh position={[0, -h / 2 + 0.035, 0.042]}>
        <planeGeometry args={[w * 0.94, 0.05]} />
        <meshBasicMaterial color={accent} transparent opacity={0.28} toneMapped={false} />
      </mesh>
      {/* Top-left indicator LED */}
      <mesh position={[-w / 2 + 0.07, h / 2 - 0.07, 0.042]}>
        <circleGeometry args={[0.018, 10]} />
        <meshBasicMaterial color={index % 2 === 0 ? '#FFD166' : accent} toneMapped={false} />
      </mesh>
    </group>
  );
}

// ============================================================================
// 4. Curved wall panel inserts — break the rectangular feel
// ============================================================================
function AgoraWallPanels() {
  return (
    <group>
      {/* Inward-facing concave arcs on each wall — tall narrow cylinder
          sections that read as curved metal cladding. */}
      {[
        { pos: [ 0,    0.8, -2.33] as [number, number, number], rotY: 0 },
        { pos: [ 0,    0.8,  2.33] as [number, number, number], rotY: Math.PI },
        { pos: [-3.33, 0.8,  0   ] as [number, number, number], rotY: Math.PI / 2 },
        { pos: [ 3.33, 0.8,  0   ] as [number, number, number], rotY: -Math.PI / 2 },
      ].map((w, i) => (
        <group key={i} position={w.pos} rotation={[0, w.rotY, 0]}>
          {/* Dark metal concave section */}
          <mesh position={[0, 0, 0]}>
            <cylinderGeometry args={[2.6, 2.6, 1.5, 40, 1, true, -Math.PI / 4, Math.PI / 2]} />
            <meshStandardMaterial color="#11192e" roughness={0.4} metalness={0.75} side={THREE.BackSide} />
          </mesh>
          {/* Accent trim top */}
          <mesh position={[0, 0.78, 0]}>
            <torusGeometry args={[2.15, 0.01, 6, 24, Math.PI / 2]} rotation={[0, 0, 0]} />
            <meshStandardMaterial color="#4ECDC4" emissive="#4ECDC4" emissiveIntensity={1.4} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ============================================================================
// 5. Side consoles — low utility boxes along walls
// ============================================================================
function AgoraConsoles({ accent }: { accent: string }) {
  const led = useRef<Array<THREE.MeshBasicMaterial | null>>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    led.current.forEach((m, i) => {
      if (!m) return;
      m.opacity = 0.4 + Math.abs(Math.sin(t * (1.5 + i * 0.3) + i)) * 0.55;
    });
  });

  // 4 consoles: back-left, back-right, left, right
  const units = useMemo(() => [
    { pos: [-2.4,  0,  -2.1] as [number, number, number], rotY: 0 },
    { pos: [ 2.4,  0,  -2.1] as [number, number, number], rotY: 0 },
    { pos: [-3.0,  0,   1.5] as [number, number, number], rotY: Math.PI / 2 },
    { pos: [ 3.0,  0,   1.5] as [number, number, number], rotY: -Math.PI / 2 },
  ], []);

  return (
    <group>
      {units.map((u, i) => (
        <group key={i} position={u.pos} rotation={[0, u.rotY, 0]}>
          {/* Console base */}
          <mesh position={[0, 0.24, 0]} castShadow>
            <boxGeometry args={[0.95, 0.48, 0.38]} />
            <meshStandardMaterial color="#1a2542" roughness={0.4} metalness={0.55} />
          </mesh>
          {/* Angled top */}
          <mesh position={[0, 0.55, -0.05]} rotation={[-0.35, 0, 0]}>
            <boxGeometry args={[0.92, 0.22, 0.3]} />
            <meshStandardMaterial color="#0f1a32" roughness={0.3} metalness={0.6} />
          </mesh>
          {/* Mini screen on top */}
          <mesh position={[0, 0.58, -0.02]} rotation={[-0.35, 0, 0]}>
            <planeGeometry args={[0.8, 0.14]} />
            <meshBasicMaterial color="#07142b" toneMapped={false} />
          </mesh>
          {/* Bar readout on screen */}
          <mesh position={[-0.25, 0.58, 0.01]} rotation={[-0.35, 0, 0]}>
            <planeGeometry args={[0.25, 0.02]} />
            <meshBasicMaterial color={accent} transparent opacity={0.9} toneMapped={false} />
          </mesh>
          {/* Row of LED indicators on front */}
          {Array.from({ length: 5 }).map((_, k) => (
            <mesh key={k} position={[-0.35 + k * 0.17, 0.14, 0.2]}>
              <circleGeometry args={[0.025, 10]} />
              <meshBasicMaterial
                ref={(m) => { led.current[i * 5 + k] = m; }}
                color={k === 2 ? '#FFD166' : accent}
                transparent
                opacity={0.65}
                toneMapped={false}
              />
            </mesh>
          ))}
          {/* Side vents */}
          <mesh position={[0.47, 0.3, 0]} rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[0.26, 0.3]} />
            <meshStandardMaterial color="#0a1124" side={THREE.DoubleSide} />
          </mesh>
          {Array.from({ length: 5 }).map((_, k) => (
            <mesh key={`v-${k}`} position={[0.472, 0.18 + k * 0.05, 0]} rotation={[0, Math.PI / 2, 0]}>
              <planeGeometry args={[0.22, 0.008]} />
              <meshBasicMaterial color={accent} transparent opacity={0.5} toneMapped={false} />
            </mesh>
          ))}
          {/* Cable bundle at back (short stub — AgoraCables handles the arc) */}
          <mesh position={[0, 0.24, -0.22]}>
            <cylinderGeometry args={[0.03, 0.03, 0.08, 8]} />
            <meshStandardMaterial color="#0a0f1c" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ============================================================================
// 6. Cables — curved conduits arcing from consoles to table
// ============================================================================
function AgoraCables({ accent }: { accent: string }) {
  const curves = useMemo(() => {
    const from: Array<[number, number, number]> = [
      [-2.4, 0.12, -2.05],
      [ 2.4, 0.12, -2.05],
      [-2.95, 0.12,  1.5],
      [ 2.95, 0.12,  1.5],
    ];
    return from.map((a) => {
      const b: [number, number, number] = [0, 0.15, 0];
      const mid: [number, number, number] = [a[0] * 0.5, 0.05, a[2] * 0.6];
      return new THREE.CatmullRomCurve3(
        [
          new THREE.Vector3(...a),
          new THREE.Vector3(...mid),
          new THREE.Vector3(...b),
        ],
        false,
        'catmullrom',
        0.2,
      );
    });
  }, []);

  const pulseRefs = useRef<Array<THREE.Mesh | null>>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    pulseRefs.current.forEach((m, i) => {
      if (!m) return;
      const u = ((t * 0.35 + i * 0.22) % 1);
      const p = curves[i % curves.length].getPoint(u);
      m.position.set(p.x, p.y + 0.05, p.z);
      const mat = m.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.sin(u * Math.PI);
    });
  });

  return (
    <group>
      {curves.map((c, i) => {
        const pts = c.getPoints(30);
        return (
          <group key={i}>
            {/* Base cable (dark rubbery tube proxy: thick line) */}
            <Line points={pts} color="#1a2742" lineWidth={4} />
            {/* Accent glow along cable */}
            <Line points={pts} color={accent} lineWidth={1.4} transparent opacity={0.75} toneMapped={false} />
          </group>
        );
      })}
      {/* Travelling data pulses */}
      {curves.map((_, i) => (
        <mesh
          key={`p-${i}`}
          ref={(el) => { pulseRefs.current[i] = el; }}
        >
          <sphereGeometry args={[0.06, 10, 10]} />
          <meshBasicMaterial color={accent} transparent opacity={0} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

// ============================================================================
// 7. Council — 4 static figures around the central table
// ============================================================================
function AgoraCouncil({ accent }: { accent: string }) {
  // Placements around radius 1.5 with small variations.
  const stations = useMemo(() => [
    { angle: 0.0 }, { angle: Math.PI / 2 }, { angle: Math.PI }, { angle: -Math.PI / 2 },
  ], []);

  return (
    <group>
      {stations.map((s, i) => {
        const r = 1.55;
        const x = Math.cos(s.angle) * r;
        const z = Math.sin(s.angle) * r;
        // Face inward toward the table
        const yaw = Math.atan2(-x, -z);
        return <CouncilAgent key={i} seed={i} position={[x, 0, z]} yaw={yaw} accent={accent} />;
      })}
    </group>
  );
}

function CouncilAgent({
  seed, position, yaw, accent,
}: {
  seed: number; position: [number, number, number]; yaw: number; accent: string;
}) {
  const body = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);

  const look = useMemo(() => {
    const hairs = ['#3d2713', '#7a4a1e', '#1a1a1a', '#c0a060'];
    const shirts = ['#e7eaf2', '#cfe5ff', '#ffd7a8', '#ffd9e4'];
    const pants = ['#22344a', '#1f2730', '#3d2d1c', '#454545'];
    return {
      hair: hairs[seed % hairs.length],
      shirt: shirts[(seed * 3 + 1) % shirts.length],
      pants: pants[(seed * 7 + 2) % pants.length],
    };
  }, [seed]);

  // Idle — subtle breathing bob + slow head turn
  useFrame(({ clock }) => {
    const t = clock.elapsedTime + seed;
    if (body.current) body.current.position.y = Math.abs(Math.sin(t * 1.2)) * 0.02;
    if (head.current) head.current.rotation.y = Math.sin(t * 0.6) * 0.15;
  });

  return (
    <group position={position} rotation={[0, yaw, 0]}>
      {/* Dark shadow disc */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.24, 20]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.28} depthWrite={false} />
      </mesh>
      {/* Accent halo ring under foot */}
      <mesh position={[0, 0.013, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.28, 0.33, 36]} />
        <meshBasicMaterial color={accent} transparent opacity={0.5} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>

      <group ref={body}>
        {/* Hips */}
        <mesh position={[0, 0.24, 0]} castShadow>
          <boxGeometry args={[0.22, 0.18, 0.16]} />
          <meshStandardMaterial color={look.pants} roughness={0.85} />
        </mesh>
        {/* Torso */}
        <mesh position={[0, 0.44, 0]} castShadow>
          <boxGeometry args={[0.26, 0.24, 0.18]} />
          <meshStandardMaterial color={look.shirt} roughness={0.75} />
        </mesh>
        {/* Collar accent */}
        <mesh position={[0, 0.57, 0.05]}>
          <boxGeometry args={[0.14, 0.04, 0.08]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.45} toneMapped={false} />
        </mesh>
        {/* Shoulder stripe */}
        <mesh position={[0, 0.525, 0]}>
          <boxGeometry args={[0.27, 0.04, 0.19]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.55} toneMapped={false} />
        </mesh>
        {/* Head group (turns independently) */}
        <group ref={head} position={[0, 0.7, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.22, 0.22, 0.22]} />
            <meshStandardMaterial color="#f1d9b5" roughness={0.85} />
          </mesh>
          <mesh position={[0, 0.13, -0.02]} castShadow>
            <boxGeometry args={[0.24, 0.08, 0.23]} />
            <meshStandardMaterial color={look.hair} roughness={0.9} />
          </mesh>
          <mesh position={[0.06, 0.09, 0.09]}>
            <boxGeometry args={[0.1, 0.08, 0.06]} />
            <meshStandardMaterial color={look.hair} roughness={0.9} />
          </mesh>
          <mesh position={[-0.05, 0.02, 0.113]}>
            <boxGeometry args={[0.03, 0.04, 0.005]} />
            <meshBasicMaterial color="#0a0a10" toneMapped={false} />
          </mesh>
          <mesh position={[0.05, 0.02, 0.113]}>
            <boxGeometry args={[0.03, 0.04, 0.005]} />
            <meshBasicMaterial color="#0a0a10" toneMapped={false} />
          </mesh>
        </group>
        {/* Arms — slight forward angle toward the table */}
        <group position={[-0.15, 0.54, 0]} rotation={[-0.25, 0, 0]}>
          <mesh position={[0, -0.13, 0]} castShadow>
            <boxGeometry args={[0.07, 0.26, 0.1]} />
            <meshStandardMaterial color={look.shirt} roughness={0.75} />
          </mesh>
          <mesh position={[0, -0.28, 0.05]}>
            <boxGeometry args={[0.075, 0.06, 0.1]} />
            <meshStandardMaterial color="#f1d9b5" roughness={0.85} />
          </mesh>
        </group>
        <group position={[0.15, 0.54, 0]} rotation={[-0.25, 0, 0]}>
          <mesh position={[0, -0.13, 0]} castShadow>
            <boxGeometry args={[0.07, 0.26, 0.1]} />
            <meshStandardMaterial color={look.shirt} roughness={0.75} />
          </mesh>
          <mesh position={[0, -0.28, 0.05]}>
            <boxGeometry args={[0.075, 0.06, 0.1]} />
            <meshStandardMaterial color="#f1d9b5" roughness={0.85} />
          </mesh>
        </group>
        {/* Legs */}
        <mesh position={[-0.06, 0.06, 0]} castShadow>
          <boxGeometry args={[0.08, 0.2, 0.1]} />
          <meshStandardMaterial color={look.pants} roughness={0.85} />
        </mesh>
        <mesh position={[0.06, 0.06, 0]} castShadow>
          <boxGeometry args={[0.08, 0.2, 0.1]} />
          <meshStandardMaterial color={look.pants} roughness={0.85} />
        </mesh>
        <mesh position={[-0.06, -0.04, 0.01]}>
          <boxGeometry args={[0.09, 0.06, 0.14]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
        </mesh>
        <mesh position={[0.06, -0.04, 0.01]}>
          <boxGeometry args={[0.09, 0.06, 0.14]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
        </mesh>
      </group>
    </group>
  );
}

// ============================================================================
// 8. Drones — small utility drones drifting near the ceiling
// ============================================================================
function AgoraDrones({ accent }: { accent: string }) {
  const drones = useRef<Array<THREE.Group | null>>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    drones.current.forEach((g, i) => {
      if (!g) return;
      const r = 1.9 + i * 0.1;
      const speed = 0.4 + i * 0.08;
      const phase = (i * (Math.PI * 2)) / 3;
      const a = t * speed + phase;
      g.position.set(Math.cos(a) * r, 1.85 + Math.sin(t * 1.2 + i) * 0.08, Math.sin(a) * r);
      g.rotation.y = a + Math.PI / 2;
    });
  });

  return (
    <group>
      {Array.from({ length: 3 }).map((_, i) => (
        <group
          key={i}
          ref={(el) => { drones.current[i] = el; }}
        >
          <mesh castShadow>
            <boxGeometry args={[0.22, 0.07, 0.14]} />
            <meshStandardMaterial color="#0a1124" metalness={0.7} roughness={0.3} />
          </mesh>
          {/* Top LED */}
          <mesh position={[0, 0.05, 0]}>
            <boxGeometry args={[0.14, 0.01, 0.08]} />
            <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={2.2} toneMapped={false} />
          </mesh>
          {/* Underside spotlight */}
          <mesh position={[0, -0.04, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 0.015, 10]} />
            <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={2.5} toneMapped={false} />
          </mesh>
          {/* 4 rotor dots */}
          {[[-0.1, 0, 0.06], [0.1, 0, 0.06], [-0.1, 0, -0.06], [0.1, 0, -0.06]].map((p, k) => (
            <mesh key={k} position={p as [number, number, number]}>
              <sphereGeometry args={[0.018, 8, 8]} />
              <meshBasicMaterial color={accent} toneMapped={false} />
            </mesh>
          ))}
          <pointLight color={accent} intensity={0.45} distance={1.2} decay={1.4} position={[0, -0.1, 0]} />
        </group>
      ))}
    </group>
  );
}

// ============================================================================
// 9. Central table + rotating holo rings + vertical beam + particles + pulses
// ============================================================================
function AgoraTable({ accent }: { accent: string }) {
  const ringMkt = useRef<THREE.Group>(null);
  const ringNet = useRef<THREE.Group>(null);
  const ringSig = useRef<THREE.Group>(null);
  const topMat = useRef<THREE.MeshStandardMaterial>(null);
  const beamMat = useRef<THREE.MeshBasicMaterial>(null);
  const tableLight = useRef<THREE.PointLight>(null);
  const particles = useRef<Array<THREE.Mesh | null>>([]);
  const pulseMats = useRef<Array<THREE.MeshBasicMaterial | null>>([]);

  const nearest = useOpenClawStore((s) => s.nearestRoomId === 'agora');

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (ringMkt.current) ringMkt.current.rotation.y = t * 0.25;
    if (ringNet.current) ringNet.current.rotation.y = -t * 0.45;
    if (ringSig.current) ringSig.current.rotation.y = t * 0.7;

    const near = nearest ? 1 : 0;
    if (topMat.current) {
      topMat.current.emissiveIntensity = 0.8 + near * 1.2 + Math.sin(t * 2.1) * 0.15;
    }
    if (beamMat.current) {
      beamMat.current.opacity = 0.3 + near * 0.35 + Math.sin(t * 1.7) * 0.05;
    }
    if (tableLight.current) {
      tableLight.current.intensity = 1.6 + near * 2.5 + Math.sin(t * 2.4) * 0.25;
    }

    // Particles rise from table
    particles.current.forEach((m, i) => {
      if (!m) return;
      const period = 3.2;
      const phase = ((t / period + i * 0.14) % 1);
      const r = 0.25 + (i % 4) * 0.08;
      const a = i * 0.8 + t * 0.3;
      m.position.set(
        Math.cos(a) * r,
        0.7 + phase * 1.3,
        Math.sin(a) * r,
      );
      const mat = m.material as THREE.MeshBasicMaterial;
      mat.opacity = (1 - phase) * 0.85;
      const s = 0.4 + (1 - phase) * 0.8;
      m.scale.setScalar(s);
    });

    // Outward data pulses — 3 expanding rings
    pulseMats.current.forEach((mat, i) => {
      if (!mat) return;
      const period = 2.5;
      const phase = ((t / period + i * 0.35) % 1);
      mat.opacity = (1 - phase) * 0.6;
    });
  });

  // Pulses need their corresponding mesh scaled each frame too — pack both.
  const pulseRefs = useRef<Array<THREE.Mesh | null>>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    pulseRefs.current.forEach((m, i) => {
      if (!m) return;
      const period = 2.5;
      const phase = ((t / period + i * 0.35) % 1);
      const s = 0.6 + phase * 3.2;
      m.scale.set(s, s, 1);
    });
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Table base — wide pedestal */}
      <mesh position={[0, 0.08, 0]} castShadow>
        <cylinderGeometry args={[0.88, 0.95, 0.16, 40]} />
        <meshStandardMaterial color="#0a1022" roughness={0.35} metalness={0.8} />
      </mesh>
      {/* Accent stripe ring around the pedestal */}
      <mesh position={[0, 0.165, 0]}>
        <torusGeometry args={[0.92, 0.012, 8, 60]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={2.0} toneMapped={false} />
      </mesh>
      {/* Table top — dark glass plate with emissive holo surface */}
      <mesh position={[0, 0.28, 0]} castShadow>
        <cylinderGeometry args={[0.8, 0.8, 0.06, 40]} />
        <meshStandardMaterial color="#050a18" roughness={0.15} metalness={0.9} />
      </mesh>
      {/* Table-top emissive wafer */}
      <mesh position={[0, 0.315, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.74, 40]} />
        <meshStandardMaterial
          ref={topMat}
          color={accent}
          emissive={accent}
          emissiveIntensity={1.0}
          toneMapped={false}
        />
      </mesh>
      {/* Table top grid — hair-line cross on the wafer */}
      <mesh position={[0, 0.32, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.46, 0.465, 60]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.8} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.321, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.38, 0.006]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.65} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.322, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
        <planeGeometry args={[1.38, 0.006]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.65} toneMapped={false} />
      </mesh>

      {/* Vertical hologram beam — additive */}
      <mesh position={[0, 1.6, 0]}>
        <cylinderGeometry args={[0.04, 0.25, 2.6, 24, 1, true]} />
        <meshBasicMaterial
          ref={beamMat}
          color={accent}
          transparent
          opacity={0.35}
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>

      {/* Ring 1 — market data lines (outer, slow spin) */}
      <group ref={ringMkt} position={[0, 0.55, 0]}>
        <mesh>
          <ringGeometry args={[0.95, 0.97, 72]} />
          <meshBasicMaterial color={accent} transparent opacity={0.9} side={THREE.DoubleSide} toneMapped={false} />
        </mesh>
        {/* Market data ticks — 24 vertical bars varying in height */}
        {Array.from({ length: 24 }).map((_, i) => {
          const a = (i / 24) * Math.PI * 2;
          const h = 0.04 + ((i * 37) % 9) * 0.02;
          return (
            <mesh key={i} position={[Math.cos(a) * 0.96, h / 2, Math.sin(a) * 0.96]}>
              <boxGeometry args={[0.02, h, 0.02]} />
              <meshBasicMaterial color={accent} transparent opacity={0.9} toneMapped={false} />
            </mesh>
          );
        })}
      </group>

      {/* Ring 2 — network connections (middle, reverse spin, node dots) */}
      <group ref={ringNet} position={[0, 0.72, 0]}>
        <mesh>
          <ringGeometry args={[0.7, 0.715, 60]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.55} side={THREE.DoubleSide} toneMapped={false} />
        </mesh>
        {/* Node dots */}
        {Array.from({ length: 10 }).map((_, i) => {
          const a = (i / 10) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(a) * 0.71, 0, Math.sin(a) * 0.71]}>
              <sphereGeometry args={[0.03, 10, 10]} />
              <meshBasicMaterial color={accent} toneMapped={false} />
            </mesh>
          );
        })}
        {/* Chord lines between a few nodes */}
        {[[0, 3], [1, 6], [2, 8], [4, 9]].map((pair, i) => {
          const a1 = (pair[0] / 10) * Math.PI * 2;
          const a2 = (pair[1] / 10) * Math.PI * 2;
          const p1 = new THREE.Vector3(Math.cos(a1) * 0.69, 0, Math.sin(a1) * 0.69);
          const p2 = new THREE.Vector3(Math.cos(a2) * 0.69, 0, Math.sin(a2) * 0.69);
          return (
            <Line
              key={i}
              points={[p1, p2]}
              color={accent}
              lineWidth={1.2}
              transparent
              opacity={0.45}
              toneMapped={false}
            />
          );
        })}
      </group>

      {/* Ring 3 — signal paths (inner, fast spin, 8 segmented arcs) */}
      <group ref={ringSig} position={[0, 0.9, 0]}>
        {Array.from({ length: 8 }).map((_, i) => {
          const start = (i / 8) * Math.PI * 2;
          const len = Math.PI * 0.1;
          const pts: THREE.Vector3[] = [];
          const segs = 12;
          for (let j = 0; j <= segs; j++) {
            const a = start + (j / segs) * len;
            pts.push(new THREE.Vector3(Math.cos(a) * 0.48, 0, Math.sin(a) * 0.48));
          }
          return (
            <Line
              key={i}
              points={pts}
              color={accent}
              lineWidth={2}
              transparent
              opacity={0.95}
              toneMapped={false}
            />
          );
        })}
        {/* Central pip */}
        <mesh>
          <sphereGeometry args={[0.06, 14, 14]} />
          <meshBasicMaterial color="#ffffff" toneMapped={false} />
        </mesh>
      </group>

      {/* Outward data pulses — expanding rings on the floor around the table */}
      {Array.from({ length: 3 }).map((_, i) => (
        <mesh
          key={i}
          ref={(el) => { pulseRefs.current[i] = el; }}
          position={[0, 0.03, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[0.82, 0.86, 72]} />
          <meshBasicMaterial
            ref={(m) => { pulseMats.current[i] = m; }}
            color={accent}
            transparent
            opacity={0.4}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>
      ))}

      {/* Rising particles — 12 small spheres orbiting + rising */}
      {Array.from({ length: 12 }).map((_, i) => (
        <mesh
          key={i}
          ref={(el) => { particles.current[i] = el; }}
        >
          <sphereGeometry args={[0.022, 8, 8]} />
          <meshBasicMaterial color={accent} transparent opacity={0} toneMapped={false} />
        </mesh>
      ))}

      {/* Dedicated table pointlight — the key light of the room */}
      <pointLight
        ref={tableLight}
        color={accent}
        intensity={1.8}
        distance={5.5}
        decay={1.4}
        position={[0, 1.1, 0]}
      />
    </group>
  );
}

// ============================================================================
// 10. Game-style Press E prompt — only when the player is near
// ============================================================================
function AgoraPrompt({ roomId, label, accent }: { roomId: string; label: string; accent: string }) {
  const isNearest = useOpenClawStore((s) => s.nearestRoomId === roomId);
  const panelOpen = useOpenClawStore((s) => s.openPanelRoomId === roomId);
  if (!isNearest || panelOpen) return null;

  return (
    <Html
      position={[0, 1.7, 0]}
      center
      distanceFactor={7}
      occlude={false}
      style={{ pointerEvents: 'none' }}
    >
      <div
        className="font-mono"
        style={{
          whiteSpace: 'nowrap',
          position: 'relative',
          padding: '12px 20px 12px 16px',
          background: 'linear-gradient(140deg, rgba(10,14,26,0.96), rgba(4,6,12,0.96))',
          border: `1.75px solid ${accent}`,
          borderRadius: 10,
          color: accent,
          boxShadow: `0 0 28px ${accent}99, inset 0 0 22px ${accent}22`,
          textAlign: 'left',
          minWidth: 280,
          animation: 'float-gentle 3.2s ease-in-out infinite',
        }}
      >
        <style>{`
          @keyframes float-gentle {
            0%, 100% { transform: translateY(0px); opacity: 1; }
            50%      { transform: translateY(-3px); opacity: 0.95; }
          }
          @keyframes sweep-sheen {
            0%   { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
        {/* Rotating sheen */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: -2,
            borderRadius: 12,
            background: `conic-gradient(from 0deg, transparent 0deg, ${accent}55 70deg, transparent 140deg)`,
            filter: 'blur(5px)',
            animation: 'sweep-sheen 2.6s linear infinite',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 14 }}>
          <span
            style={{
              background: accent,
              color: '#0a0a0f',
              padding: '7px 12px',
              borderRadius: 7,
              fontWeight: 900,
              fontSize: 16,
              letterSpacing: 0.5,
              boxShadow: `0 0 16px ${accent}`,
              minWidth: 30,
              textAlign: 'center',
            }}
          >
            E
          </span>
          <div style={{ lineHeight: 1.15 }}>
            <div style={{ fontSize: 14, letterSpacing: '0.24em', fontWeight: 700 }}>
              {label.toUpperCase()}
            </div>
            <div style={{ fontSize: 9, letterSpacing: '0.32em', opacity: 0.6, marginTop: 3 }}>
              AGORA · STRATEGY COUNCIL
            </div>
          </div>
        </div>
      </div>
    </Html>
  );
}
