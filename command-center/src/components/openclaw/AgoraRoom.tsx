'use client';

import * as THREE from 'three';
import { Html, Line } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import type { RoomDef } from '@/data/openclawRooms';
import { useOpenClawStore } from '@/store/openclawStore';

// AGORA — Strategy Council
// "Factory II" style AI command floor: dense, labeled, every corner has
// purpose. Local coords: x ∈ [-3.5, 3.5], z ∈ [-2.5, 2.5].
export function AgoraRoom({ room }: { room: RoomDef }) {
  return (
    <group>
      <AgoraBanner label={room.name} sub={room.codename} accent={room.accent} />
      <AgoraHexFloor accent={room.accent} />
      <AgoraFloorStations accent={room.accent} />
      <AgoraPipeline accent={room.accent} />
      <AgoraWallBoards accent={room.accent} />
      <AgoraWallScreens accent={room.accent} />
      <AgoraTaskChips accent={room.accent} />
      <AgoraCeiling accent={room.accent} />
      <AgoraConsoles accent={room.accent} />
      <AgoraCables accent={room.accent} />
      <AgoraCrew accent={room.accent} />
      <AgoraDrones accent={room.accent} />
      <AgoraTable accent={room.accent} />
      <AgoraMagic accent={room.accent} />
      <AgoraPrompt roomId={room.id} label={room.promptLabel} accent={room.accent} />
    </group>
  );
}

// ============================================================================
// HOLO BANNER — big floating room header ("AGORA · LV 1") above the table
// ============================================================================
function AgoraBanner({ label, sub, accent }: { label: string; sub: string; accent: string }) {
  return (
    <Html
      position={[0, 2.45, -0.4]}
      center
      distanceFactor={5}
      occlude={false}
      style={{ pointerEvents: 'none' }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: '10px 20px 10px 14px',
          background: 'linear-gradient(140deg, rgba(6,10,18,0.92), rgba(2,4,10,0.92))',
          border: `2px solid ${accent}`,
          borderRadius: 10,
          boxShadow: `0 0 28px ${accent}aa, inset 0 0 18px ${accent}33`,
          fontFamily: 'JetBrains Mono, monospace',
          whiteSpace: 'nowrap',
        }}
      >
        <span
          style={{
            background: accent,
            color: '#070a14',
            padding: '5px 9px',
            borderRadius: 5,
            fontSize: 12,
            fontWeight: 900,
            letterSpacing: '0.15em',
            boxShadow: `0 0 14px ${accent}`,
          }}
        >
          LV 1
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
          <span
            style={{
              color: accent,
              fontSize: 22,
              fontWeight: 900,
              letterSpacing: '0.28em',
              textShadow: `0 0 10px ${accent}`,
            }}
          >
            {label.toUpperCase()}
          </span>
          <span
            style={{
              color: '#cbd3e0',
              fontSize: 8,
              letterSpacing: '0.38em',
              marginTop: 4,
              opacity: 0.7,
              textTransform: 'uppercase',
            }}
          >
            {sub}
          </span>
        </div>
        <span className="pulse-dot" style={{
          width: 7, height: 7, borderRadius: 999, background: accent,
          boxShadow: `0 0 10px ${accent}`,
          animation: 'agora-blink 1.8s ease-in-out infinite',
        }} />
        <style>{`
          @keyframes agora-blink { 0%,100%{opacity:1} 50%{opacity:.3} }
        `}</style>
      </div>
    </Html>
  );
}

// ============================================================================
// HEX FLOOR — denser glowing grid + radial rays + ritual circle markings
// ============================================================================
function AgoraHexFloor({ accent }: { accent: string }) {
  const hexes = useMemo(() => {
    const arr: Array<{ x: number; z: number; hot: boolean; mid: boolean }> = [];
    const R = 0.26;
    const dx = R * Math.sqrt(3);
    const dz = R * 1.5;
    const cols = 14;
    const rows = 11;
    const x0 = -((cols - 1) * dx) / 2;
    const z0 = -((rows - 1) * dz) / 2;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = x0 + c * dx + (r % 2 === 0 ? 0 : dx / 2);
        const z = z0 + r * dz;
        if (Math.abs(x) > 3.15 || Math.abs(z) > 2.25) continue;
        const d = Math.hypot(x, z);
        arr.push({ x, z, hot: d < 1.1, mid: d < 1.9 });
      }
    }
    return { arr, R };
  }, []);

  const rayMat = useRef<THREE.MeshBasicMaterial[]>([]);
  const hotMat = useRef<Array<THREE.MeshStandardMaterial | null>>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    rayMat.current.forEach((m, i) => {
      if (m) m.opacity = 0.28 + Math.abs(Math.sin(t * 0.9 + i * 0.28)) * 0.4;
    });
    hotMat.current.forEach((m, i) => {
      if (!m) return;
      m.emissiveIntensity = 0.35 + Math.abs(Math.sin(t * 1.2 + i * 0.3)) * 0.25;
    });
  });

  return (
    <group position={[0, 0.042, 0]}>
      {/* Dark hex base layer */}
      <mesh position={[0, -0.005, 0]}>
        <boxGeometry args={[6.5, 0.003, 4.6]} />
        <meshStandardMaterial color="#030614" roughness={0.9} metalness={0.2} />
      </mesh>
      {/* Hex tiles */}
      {hexes.arr.map((h, i) => (
        <mesh key={i} position={[h.x, 0, h.z]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[hexes.R * 0.92, 6]} />
          <meshStandardMaterial
            ref={(m) => { if (h.hot) hotMat.current[i] = m; }}
            color={h.hot ? '#0d2236' : h.mid ? '#091a2c' : '#061221'}
            emissive={accent}
            emissiveIntensity={h.hot ? 0.45 : h.mid ? 0.18 : 0.08}
            roughness={0.45}
            metalness={0.2}
          />
        </mesh>
      ))}
      {/* Hex outlines */}
      {hexes.arr.map((h, i) => (
        <mesh key={`o-${i}`} position={[h.x, 0.004, h.z]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[hexes.R * 0.87, hexes.R * 0.92, 6]} />
          <meshBasicMaterial color={accent} transparent opacity={h.hot ? 0.9 : 0.45} side={THREE.DoubleSide} toneMapped={false} />
        </mesh>
      ))}
      {/* Three concentric ritual-circle rings */}
      {[1.55, 1.2, 0.92].map((r, i) => (
        <mesh key={`rc-${i}`} position={[0, 0.008, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[r, r + 0.018, 72]} />
          <meshBasicMaterial color={accent} transparent opacity={0.85 - i * 0.15} side={THREE.DoubleSide} toneMapped={false} />
        </mesh>
      ))}
      {/* Rune ticks around outer circle */}
      {Array.from({ length: 28 }).map((_, i) => {
        const a = (i / 28) * Math.PI * 2;
        return (
          <mesh
            key={`tk-${i}`}
            position={[Math.cos(a) * 1.55, 0.01, Math.sin(a) * 1.55]}
            rotation={[-Math.PI / 2, 0, -a + Math.PI / 2]}
          >
            <planeGeometry args={[0.085, 0.022]} />
            <meshBasicMaterial color={accent} transparent opacity={0.85} toneMapped={false} />
          </mesh>
        );
      })}
      {/* Convergent radial glow rays */}
      {Array.from({ length: 20 }).map((_, i) => {
        const a = (i / 20) * Math.PI * 2;
        const len = 2.0;
        return (
          <mesh
            key={`ray-${i}`}
            position={[Math.cos(a) * (len / 2 + 0.45), 0.011, Math.sin(a) * (len / 2 + 0.45)]}
            rotation={[-Math.PI / 2, 0, -a]}
          >
            <planeGeometry args={[len, 0.04]} />
            <meshBasicMaterial
              ref={(m) => { if (m) rayMat.current[i] = m; }}
              color={accent}
              transparent
              opacity={0.4}
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
// FLOOR STATIONS — labeled plates showing the strategy pipeline stages
// ============================================================================
const STATIONS: Array<{
  pos: [number, number];
  label: string;
  hue?: string;
}> = [
  { pos: [-2.7, -1.9], label: 'INGEST'  },
  { pos: [-1.5, -1.9], label: 'SIGNAL'  },
  { pos: [ 0.0, -1.9], label: 'BLEND'   },
  { pos: [ 1.5, -1.9], label: 'RISK'    },
  { pos: [ 2.7, -1.9], label: 'EXECUTE' },
];

function AgoraFloorStations({ accent }: { accent: string }) {
  const ledMat = useRef<Array<THREE.MeshBasicMaterial | null>>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    ledMat.current.forEach((m, i) => {
      if (!m) return;
      m.opacity = 0.5 + Math.abs(Math.sin(t * 1.6 + i * 0.5)) * 0.45;
    });
  });

  return (
    <group>
      {STATIONS.map((s, i) => (
        <group key={i} position={[s.pos[0], 0.05, s.pos[1]]}>
          {/* Plate */}
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[1.05, 0.42]} />
            <meshStandardMaterial color="#0a1324" emissive={accent} emissiveIntensity={0.22} toneMapped={false} />
          </mesh>
          {/* Plate border */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
            <ringGeometry args={[0, 0, 0]} />
          </mesh>
          {/* Actual rectangular border (four thin bars) */}
          {[
            { w: 1.05, h: 0.012, p: [0, 0.002,  0.21] as [number, number, number] },
            { w: 1.05, h: 0.012, p: [0, 0.002, -0.21] as [number, number, number] },
            { w: 0.012, h: 0.42, p: [ 0.525, 0.002, 0] as [number, number, number] },
            { w: 0.012, h: 0.42, p: [-0.525, 0.002, 0] as [number, number, number] },
          ].map((b, bi) => (
            <mesh key={bi} position={b.p} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[b.w, b.h]} />
              <meshBasicMaterial color={accent} transparent opacity={0.95} toneMapped={false} />
            </mesh>
          ))}
          {/* Blinking LED chip on corner */}
          <mesh position={[-0.47, 0.004, -0.17]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.03, 14]} />
            <meshBasicMaterial
              ref={(m) => { ledMat.current[i] = m; }}
              color={i === STATIONS.length - 1 ? '#FFD166' : accent}
              transparent
              opacity={0.9}
              toneMapped={false}
            />
          </mesh>
          {/* Label */}
          <Html
            position={[0, 0.01, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            transform
            center
            distanceFactor={3.4}
            style={{ pointerEvents: 'none' }}
          >
            <div
              className="font-mono"
              style={{
                color: accent,
                fontSize: 11,
                letterSpacing: '0.3em',
                textShadow: `0 0 6px ${accent}`,
                whiteSpace: 'nowrap',
                fontWeight: 700,
              }}
            >
              {s.label}
            </div>
          </Html>
        </group>
      ))}
    </group>
  );
}

// ============================================================================
// PIPELINE — dashed tracks between stations with travelling light pulses
// ============================================================================
function AgoraPipeline({ accent }: { accent: string }) {
  const pulseRefs = useRef<Array<THREE.Mesh | null>>([]);
  const pulseCount = 12;

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    pulseRefs.current.forEach((m, i) => {
      if (!m) return;
      const segIdx = i % (STATIONS.length - 1);
      const u = ((t * 0.45 + i * 0.23) % 1);
      const a = STATIONS[segIdx];
      const b = STATIONS[segIdx + 1];
      const x = a.pos[0] + (b.pos[0] - a.pos[0]) * u;
      const z = a.pos[1] + (b.pos[1] - a.pos[1]) * u;
      m.position.set(x, 0.055, z);
      const mat = m.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.4 + Math.sin(u * Math.PI) * 0.55;
    });
  });

  // Build dash segments
  const dashes = useMemo(() => {
    const arr: Array<{ x: number; z: number }> = [];
    for (let i = 0; i < STATIONS.length - 1; i++) {
      const a = STATIONS[i];
      const b = STATIONS[i + 1];
      const N = 10;
      for (let k = 1; k <= N - 1; k++) {
        const u = k / N;
        arr.push({
          x: a.pos[0] + (b.pos[0] - a.pos[0]) * u,
          z: a.pos[1] + (b.pos[1] - a.pos[1]) * u,
        });
      }
    }
    return arr;
  }, []);

  return (
    <group>
      {/* Dashes */}
      {dashes.map((d, i) => (
        <mesh key={i} position={[d.x, 0.052, d.z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.07, 0.014]} />
          <meshBasicMaterial color={accent} transparent opacity={0.55} toneMapped={false} />
        </mesh>
      ))}
      {/* Chevrons at each station transition */}
      {STATIONS.slice(0, -1).map((s, i) => {
        const n = STATIONS[i + 1];
        const mx = (s.pos[0] + n.pos[0]) / 2;
        const mz = (s.pos[1] + n.pos[1]) / 2;
        return (
          <group key={`ch-${i}`} position={[mx, 0.055, mz]} rotation={[-Math.PI / 2, 0, 0]}>
            <mesh>
              <planeGeometry args={[0.12, 0.04]} />
              <meshBasicMaterial color={accent} transparent opacity={0.9} toneMapped={false} />
            </mesh>
          </group>
        );
      })}
      {/* Travelling pulses */}
      {Array.from({ length: pulseCount }).map((_, i) => (
        <mesh
          key={`p-${i}`}
          ref={(el) => { pulseRefs.current[i] = el; }}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <circleGeometry args={[0.05, 12]} />
          <meshBasicMaterial color={i % 3 === 0 ? '#FFD166' : accent} transparent opacity={0} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

// ============================================================================
// WALL BOARDS — live-ish counter panels on each side wall
// ============================================================================
const BOARDS: Array<{
  pos: [number, number, number];
  rotY: number;
  label: string;
  value: string;
  trend: 'up' | 'down' | 'flat';
}> = [
  { pos: [-3.38, 1.75, -1.6], rotY: Math.PI / 2, label: 'SIGNALS',   value: '228', trend: 'up'   },
  { pos: [-3.38, 1.75,  0.0], rotY: Math.PI / 2, label: 'BLENDED',   value:  '47', trend: 'up'   },
  { pos: [-3.38, 1.75,  1.6], rotY: Math.PI / 2, label: 'CONFIDENCE',value: '0.82',trend: 'flat' },
  { pos: [ 3.38, 1.75, -1.6], rotY: -Math.PI / 2, label: 'ORDERS',   value:  '12', trend: 'up'   },
  { pos: [ 3.38, 1.75,  0.0], rotY: -Math.PI / 2, label: 'FILLS',    value: '1284',trend: 'up'   },
  { pos: [ 3.38, 1.75,  1.6], rotY: -Math.PI / 2, label: 'RISK',     value: '0.34',trend: 'down' },
];

function AgoraWallBoards({ accent }: { accent: string }) {
  const blinkMat = useRef<Array<THREE.MeshBasicMaterial | null>>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    blinkMat.current.forEach((m, i) => {
      if (!m) return;
      m.opacity = 0.45 + Math.abs(Math.sin(t * 1.8 + i * 0.7)) * 0.55;
    });
  });

  return (
    <group>
      {BOARDS.map((b, i) => {
        const trendColor = b.trend === 'up' ? '#4ECDC4' : b.trend === 'down' ? '#FF6B6B' : '#FFD166';
        const trendGlyph = b.trend === 'up' ? '▲' : b.trend === 'down' ? '▼' : '◆';
        return (
          <group key={i} position={b.pos} rotation={[0, b.rotY, 0]}>
            {/* Frame */}
            <mesh position={[0, 0, 0.005]}>
              <boxGeometry args={[1.1, 0.55, 0.03]} />
              <meshStandardMaterial color="#0b1530" roughness={0.4} metalness={0.55} />
            </mesh>
            {/* Inner screen */}
            <mesh position={[0, 0, 0.023]}>
              <planeGeometry args={[1.0, 0.45]} />
              <meshBasicMaterial color="#030914" toneMapped={false} />
            </mesh>
            {/* Accent border */}
            {[
              { w: 1.0, h: 0.01, p: [0, 0.225, 0.024] as [number, number, number] },
              { w: 1.0, h: 0.01, p: [0, -0.225, 0.024] as [number, number, number] },
              { w: 0.01, h: 0.45, p: [-0.5, 0, 0.024] as [number, number, number] },
              { w: 0.01, h: 0.45, p: [ 0.5, 0, 0.024] as [number, number, number] },
            ].map((bd, bi) => (
              <mesh key={bi} position={bd.p}>
                <planeGeometry args={[bd.w, bd.h]} />
                <meshBasicMaterial color={accent} transparent opacity={0.85} toneMapped={false} />
              </mesh>
            ))}
            {/* Corner LED */}
            <mesh position={[-0.44, 0.18, 0.025]}>
              <circleGeometry args={[0.018, 14]} />
              <meshBasicMaterial
                ref={(m) => { blinkMat.current[i] = m; }}
                color={trendColor}
                transparent
                opacity={0.85}
                toneMapped={false}
              />
            </mesh>
            {/* Bottom mini bar graph (static) */}
            {Array.from({ length: 10 }).map((_, k) => {
              const h = 0.02 + ((i * 7 + k * 3) % 6) * 0.015;
              return (
                <mesh key={k} position={[-0.42 + k * 0.09, -0.15 + h / 2, 0.026]}>
                  <planeGeometry args={[0.06, h]} />
                  <meshBasicMaterial color={accent} transparent opacity={0.75} toneMapped={false} />
                </mesh>
              );
            })}
            {/* HTML label + value */}
            <Html
              transform
              position={[0, 0.06, 0.033]}
              center
              distanceFactor={3.0}
              style={{ pointerEvents: 'none' }}
            >
              <div
                className="font-mono"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                  whiteSpace: 'nowrap',
                }}
              >
                <span
                  style={{
                    color: '#9fb4cf',
                    fontSize: 8,
                    letterSpacing: '0.34em',
                    textTransform: 'uppercase',
                  }}
                >
                  {b.label}
                </span>
                <span
                  style={{
                    color: accent,
                    fontSize: 22,
                    fontWeight: 900,
                    letterSpacing: '0.06em',
                    textShadow: `0 0 8px ${accent}`,
                  }}
                >
                  {b.value}
                </span>
                <span
                  style={{
                    color: trendColor,
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: '0.3em',
                  }}
                >
                  {trendGlyph} {b.trend.toUpperCase()}
                </span>
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
}

// ============================================================================
// WALL SCREENS — back wall chart/heatmap/signals trio
// ============================================================================
function AgoraWallScreens({ accent }: { accent: string }) {
  const screens = useMemo(() => [
    { pos: [-2.0, 1.15, -2.38] as [number, number, number], rotY: 0, w: 1.3, h: 0.7, kind: 'chart' as const, seed: 1 },
    { pos: [ 0.0, 1.15, -2.38] as [number, number, number], rotY: 0, w: 1.3, h: 0.7, kind: 'heatmap' as const, seed: 2 },
    { pos: [ 2.0, 1.15, -2.38] as [number, number, number], rotY: 0, w: 1.3, h: 0.7, kind: 'signals' as const, seed: 3 },
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
  const flickerMat = useRef<THREE.MeshBasicMaterial>(null);
  const line1 = useRef<THREE.Mesh>(null);
  const line2 = useRef<THREE.Mesh>(null);
  const heatMats = useRef<Array<THREE.MeshBasicMaterial | null>>([]);
  const sigMats = useRef<Array<THREE.MeshBasicMaterial | null>>([]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime + seed * 1.7;
    if (flickerMat.current) {
      flickerMat.current.opacity = 0.88 + (Math.random() < 0.02 ? -0.4 : 0) + Math.sin(t * 2) * 0.04;
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
      <mesh position={[0, 0, 0.01]}>
        <boxGeometry args={[w + 0.1, h + 0.1, 0.04]} />
        <meshStandardMaterial color="#0e1a2f" roughness={0.5} metalness={0.55} />
      </mesh>
      <mesh position={[0, 0, 0.033]}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial ref={flickerMat} color="#071528" transparent opacity={0.92} toneMapped={false} />
      </mesh>
      {kind === 'chart' && (
        <>
          <Line points={chartPts} color={accent} lineWidth={1.2} position={[0, 0.02, 0.04]} transparent opacity={0.95} toneMapped={false} />
          <mesh ref={line1} position={[0, 0, 0.041]}>
            <planeGeometry args={[0.01, h * 0.85]} />
            <meshBasicMaterial color={accent} transparent opacity={0.85} toneMapped={false} />
          </mesh>
          <mesh ref={line2} position={[0, 0, 0.041]}>
            <planeGeometry args={[0.01, h * 0.85]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.45} toneMapped={false} />
          </mesh>
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
                <mesh position={[col === 0 ? 0.18 : -0.18, 0, 0]}>
                  <planeGeometry args={[0.24, 0.02]} />
                  <meshBasicMaterial color={accent} transparent opacity={0.55} toneMapped={false} />
                </mesh>
              </group>
            );
          })}
        </group>
      )}
      <mesh position={[0, -h / 2 + 0.035, 0.042]}>
        <planeGeometry args={[w * 0.94, 0.05]} />
        <meshBasicMaterial color={accent} transparent opacity={0.28} toneMapped={false} />
      </mesh>
      <mesh position={[-w / 2 + 0.07, h / 2 - 0.07, 0.042]}>
        <circleGeometry args={[0.018, 10]} />
        <meshBasicMaterial color={index % 2 === 0 ? '#FFD166' : accent} toneMapped={false} />
      </mesh>
    </group>
  );
}

// ============================================================================
// TASK CHIPS — scattered floating HTML tags ("signal armed", "orders queued")
// ============================================================================
const CHIPS: Array<{
  pos: [number, number, number];
  text: string;
  kind: 'ok' | 'warn' | 'info';
}> = [
  { pos: [-2.6, 1.6,  1.1], text: 'Signal armed',   kind: 'ok'   },
  { pos: [ 2.5, 1.5, -0.9], text: 'Orders queued',  kind: 'info' },
  { pos: [-1.4, 1.55,  1.8], text: 'Confidence 0.82', kind: 'ok' },
  { pos: [ 1.7, 1.7,  1.4], text: 'Risk check OK',  kind: 'ok'   },
  { pos: [-2.3, 1.8, -0.2], text: 'Hedge pinged',   kind: 'warn' },
];

function AgoraTaskChips({ accent }: { accent: string }) {
  return (
    <group>
      {CHIPS.map((c, i) => {
        const col = c.kind === 'warn' ? '#FFD166' : c.kind === 'info' ? '#9BE0FF' : accent;
        return (
          <Html
            key={i}
            position={c.pos}
            center
            distanceFactor={5}
            occlude={false}
            style={{ pointerEvents: 'none' }}
          >
            <div
              className="font-mono"
              style={{
                padding: '3px 8px',
                background: 'rgba(6,10,18,0.8)',
                border: `1px solid ${col}`,
                borderRadius: 4,
                color: col,
                fontSize: 9,
                letterSpacing: '0.18em',
                whiteSpace: 'nowrap',
                boxShadow: `0 0 10px ${col}77`,
                textTransform: 'uppercase',
              }}
            >
              ● {c.text}
            </div>
          </Html>
        );
      })}
    </group>
  );
}

// ============================================================================
// CEILING — downlight fixture + dedicated key light
// ============================================================================
function AgoraCeiling({ accent }: { accent: string }) {
  const beamMat = useRef<THREE.MeshBasicMaterial>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (beamMat.current) beamMat.current.opacity = 0.24 + Math.sin(t * 1.3) * 0.05;
    if (lightRef.current) lightRef.current.intensity = 3.0 + Math.sin(t * 1.1) * 0.25;
  });
  return (
    <group position={[0, 2.35, 0]}>
      <mesh position={[0, 0.04, 0]}>
        <cylinderGeometry args={[1.4, 1.4, 0.04, 40]} />
        <meshStandardMaterial color="#14203a" roughness={0.6} metalness={0.5} />
      </mesh>
      <mesh>
        <torusGeometry args={[1.2, 0.04, 12, 64]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={2.6} toneMapped={false} />
      </mesh>
      <mesh>
        <torusGeometry args={[0.85, 0.025, 10, 64]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={2.8} toneMapped={false} />
      </mesh>
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 1.02, 0, Math.sin(a) * 1.02]} rotation={[0, -a, 0]}>
            <boxGeometry args={[0.35, 0.02, 0.02]} />
            <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.3} toneMapped={false} />
          </mesh>
        );
      })}
      <pointLight ref={lightRef} color="#d8f0ff" intensity={3.0} distance={5.5} decay={1.6} position={[0, -0.1, 0]} />
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
// CONSOLES — 4 side consoles (back row)
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

  const units = useMemo(() => [
    { pos: [-2.4, 0, -1.2] as [number, number, number], rotY: 0 },
    { pos: [ 2.4, 0, -1.2] as [number, number, number], rotY: 0 },
    { pos: [-3.0, 0,  1.3] as [number, number, number], rotY: Math.PI / 2 },
    { pos: [ 3.0, 0,  1.3] as [number, number, number], rotY: -Math.PI / 2 },
  ], []);

  return (
    <group>
      {units.map((u, i) => (
        <group key={i} position={u.pos} rotation={[0, u.rotY, 0]}>
          <mesh position={[0, 0.24, 0]} castShadow>
            <boxGeometry args={[0.95, 0.48, 0.38]} />
            <meshStandardMaterial color="#1a2542" roughness={0.4} metalness={0.55} />
          </mesh>
          <mesh position={[0, 0.55, -0.05]} rotation={[-0.35, 0, 0]}>
            <boxGeometry args={[0.92, 0.22, 0.3]} />
            <meshStandardMaterial color="#0f1a32" roughness={0.3} metalness={0.6} />
          </mesh>
          <mesh position={[0, 0.58, -0.02]} rotation={[-0.35, 0, 0]}>
            <planeGeometry args={[0.8, 0.14]} />
            <meshBasicMaterial color="#07142b" toneMapped={false} />
          </mesh>
          <mesh position={[-0.25, 0.58, 0.01]} rotation={[-0.35, 0, 0]}>
            <planeGeometry args={[0.25, 0.02]} />
            <meshBasicMaterial color={accent} transparent opacity={0.9} toneMapped={false} />
          </mesh>
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
          {Array.from({ length: 5 }).map((_, k) => (
            <mesh key={`v-${k}`} position={[0.472, 0.18 + k * 0.05, 0]} rotation={[0, Math.PI / 2, 0]}>
              <planeGeometry args={[0.22, 0.008]} />
              <meshBasicMaterial color={accent} transparent opacity={0.5} toneMapped={false} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

// ============================================================================
// CABLES — curved conduits from consoles to table
// ============================================================================
function AgoraCables({ accent }: { accent: string }) {
  const curves = useMemo(() => {
    const from: Array<[number, number, number]> = [
      [-2.4, 0.12, -1.15],
      [ 2.4, 0.12, -1.15],
      [-2.95, 0.12,  1.3],
      [ 2.95, 0.12,  1.3],
    ];
    return from.map((a) => {
      const b: [number, number, number] = [0, 0.15, 0];
      const mid: [number, number, number] = [a[0] * 0.5, 0.04, a[2] * 0.6];
      return new THREE.CatmullRomCurve3(
        [new THREE.Vector3(...a), new THREE.Vector3(...mid), new THREE.Vector3(...b)],
        false, 'catmullrom', 0.2,
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
            <Line points={pts} color="#1a2742" lineWidth={4} />
            <Line points={pts} color={accent} lineWidth={1.4} transparent opacity={0.75} toneMapped={false} />
          </group>
        );
      })}
      {curves.map((_, i) => (
        <mesh key={`p-${i}`} ref={(el) => { pulseRefs.current[i] = el; }}>
          <sphereGeometry args={[0.06, 10, 10]} />
          <meshBasicMaterial color={accent} transparent opacity={0} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

// ============================================================================
// CREW — cube-robot council members with face badges and nametag+LV HUD
// ============================================================================
const CREW: Array<{
  angle: number;
  callsign: string;
  badge: string;   // letter on chest plate
  face: 'Σ' | 'W' | '△' | '◆';
  level: number;
  status: 'idle' | 'thinking' | 'armed';
  bodyHue: string;
}> = [
  { angle:  0.0,           callsign: 'PRISM',  badge: 'W', face: 'W', level: 3, status: 'thinking', bodyHue: '#66d9d4' },
  { angle:  Math.PI / 2,   callsign: 'VYBES',  badge: 'Σ', face: 'Σ', level: 2, status: 'idle',     bodyHue: '#ffd166' },
  { angle:  Math.PI,       callsign: 'ATLAS',  badge: '△', face: '△', level: 4, status: 'armed',    bodyHue: '#ff6b6b' },
  { angle: -Math.PI / 2,   callsign: 'AEGIS',  badge: '◆', face: '◆', level: 3, status: 'thinking', bodyHue: '#b890ff' },
];

function AgoraCrew({ accent }: { accent: string }) {
  return (
    <group>
      {CREW.map((c, i) => {
        const r = 1.5;
        const x = Math.cos(c.angle) * r;
        const z = Math.sin(c.angle) * r;
        const yaw = Math.atan2(-x, -z);
        return (
          <CrewBot key={i} seed={i} position={[x, 0, z]} yaw={yaw} accent={accent} cfg={c} />
        );
      })}
    </group>
  );
}

function CrewBot({
  seed, position, yaw, accent, cfg,
}: {
  seed: number;
  position: [number, number, number];
  yaw: number;
  accent: string;
  cfg: (typeof CREW)[number];
}) {
  const head = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const visorMat = useRef<THREE.MeshStandardMaterial>(null);
  const ring = useRef<THREE.Mesh>(null);
  const statusCol = cfg.status === 'armed' ? '#FF6B6B' : cfg.status === 'thinking' ? '#FFD166' : '#4ECDC4';

  useFrame(({ clock }) => {
    const t = clock.elapsedTime + seed;
    if (body.current) body.current.position.y = Math.abs(Math.sin(t * 1.2)) * 0.02;
    if (head.current) head.current.rotation.y = Math.sin(t * 0.6) * 0.12;
    if (visorMat.current) {
      visorMat.current.emissiveIntensity = 2.0 + Math.sin(t * 3.1) * 0.5;
    }
    if (ring.current) {
      ring.current.rotation.y = t * 0.8;
    }
  });

  return (
    <group position={position} rotation={[0, yaw, 0]}>
      {/* Floor shadow + halo ring */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.3, 22]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.35} depthWrite={false} />
      </mesh>
      <mesh ref={ring} position={[0, 0.014, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.34, 0.4, 48]} />
        <meshBasicMaterial color={accent} transparent opacity={0.7} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.017, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.28, 0.3, 48]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.35} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>

      <group ref={body}>
        {/* Chunky cube body — wider than tall */}
        <mesh position={[0, 0.35, 0]} castShadow>
          <boxGeometry args={[0.48, 0.46, 0.4]} />
          <meshStandardMaterial color={cfg.bodyHue} roughness={0.45} metalness={0.15} />
        </mesh>
        {/* Darker belt */}
        <mesh position={[0, 0.17, 0]}>
          <boxGeometry args={[0.5, 0.08, 0.42]} />
          <meshStandardMaterial color="#101a2e" roughness={0.8} metalness={0.1} />
        </mesh>
        {/* Chest badge — big round letter disc */}
        <mesh position={[0, 0.4, 0.21]}>
          <circleGeometry args={[0.12, 28]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.5} />
        </mesh>
        <Html
          transform
          position={[0, 0.4, 0.215]}
          center
          distanceFactor={2.3}
          style={{ pointerEvents: 'none' }}
        >
          <div
            style={{
              color: '#0a0a12',
              fontSize: 28,
              fontWeight: 900,
              fontFamily: 'Impact, "Arial Black", sans-serif',
              textAlign: 'center',
              width: 36,
              lineHeight: 1,
            }}
          >
            {cfg.badge}
          </div>
        </Html>
        {/* Shoulder LEDs */}
        <mesh position={[-0.24, 0.48, 0.1]}>
          <sphereGeometry args={[0.03, 10, 10]} />
          <meshBasicMaterial color={statusCol} toneMapped={false} />
        </mesh>
        <mesh position={[0.24, 0.48, 0.1]}>
          <sphereGeometry args={[0.03, 10, 10]} />
          <meshBasicMaterial color={statusCol} toneMapped={false} />
        </mesh>

        {/* Head — chunky cube */}
        <group ref={head} position={[0, 0.78, 0]}>
          {/* Head cube */}
          <mesh castShadow>
            <boxGeometry args={[0.38, 0.36, 0.36]} />
            <meshStandardMaterial color={cfg.bodyHue} roughness={0.5} metalness={0.18} />
          </mesh>
          {/* Visor band — big wraparound */}
          <mesh position={[0, 0.02, 0.181]}>
            <boxGeometry args={[0.32, 0.13, 0.01]} />
            <meshStandardMaterial
              ref={visorMat}
              color="#07101e"
              emissive={accent}
              emissiveIntensity={2.4}
              toneMapped={false}
            />
          </mesh>
          {/* Face glyph inside visor */}
          <Html
            transform
            position={[0, 0.02, 0.19]}
            center
            distanceFactor={2.2}
            style={{ pointerEvents: 'none' }}
          >
            <div
              style={{
                color: '#07101e',
                fontSize: 22,
                fontWeight: 900,
                fontFamily: 'Impact, "Arial Black", sans-serif',
                textAlign: 'center',
                lineHeight: 1,
                textShadow: `0 0 10px ${accent}`,
                background: accent,
                padding: '0px 6px',
                borderRadius: 3,
              }}
            >
              {cfg.face}
            </div>
          </Html>
          {/* Antenna */}
          <mesh position={[0.12, 0.24, 0]}>
            <cylinderGeometry args={[0.012, 0.012, 0.18, 8]} />
            <meshStandardMaterial color="#10192c" />
          </mesh>
          <mesh position={[0.12, 0.35, 0]}>
            <sphereGeometry args={[0.03, 12, 12]} />
            <meshStandardMaterial color={statusCol} emissive={statusCol} emissiveIntensity={2} toneMapped={false} />
          </mesh>
          {/* Ear-caps */}
          <mesh position={[-0.2, 0, 0]}>
            <boxGeometry args={[0.04, 0.16, 0.16]} />
            <meshStandardMaterial color="#101a2e" />
          </mesh>
          <mesh position={[0.2, 0, 0]}>
            <boxGeometry args={[0.04, 0.16, 0.16]} />
            <meshStandardMaterial color="#101a2e" />
          </mesh>
        </group>
        {/* Short stubby legs */}
        <mesh position={[-0.12, 0.05, 0]} castShadow>
          <boxGeometry args={[0.13, 0.12, 0.16]} />
          <meshStandardMaterial color="#101a2e" />
        </mesh>
        <mesh position={[0.12, 0.05, 0]} castShadow>
          <boxGeometry args={[0.13, 0.12, 0.16]} />
          <meshStandardMaterial color="#101a2e" />
        </mesh>
      </group>

      {/* Floating callsign + LV chip + status dot — above head, always
          facing camera via billboard Html */}
      <Html
        position={[0, 1.55, 0]}
        center
        distanceFactor={5.2}
        occlude={false}
        style={{ pointerEvents: 'none' }}
      >
        <div
          className="font-mono"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 3,
            whiteSpace: 'nowrap',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '3px 9px',
              background: 'rgba(6,10,18,0.88)',
              border: `1.25px solid ${accent}`,
              borderRadius: 4,
              boxShadow: `0 0 12px ${accent}aa`,
              color: accent,
              fontSize: 10,
              letterSpacing: '0.28em',
              fontWeight: 800,
            }}
          >
            {cfg.callsign}
            <span
              style={{
                display: 'inline-block',
                width: 7,
                height: 7,
                borderRadius: 999,
                background: statusCol,
                boxShadow: `0 0 8px ${statusCol}`,
              }}
            />
          </div>
          <div
            style={{
              padding: '2px 6px',
              background: accent,
              color: '#070a14',
              fontSize: 8,
              letterSpacing: '0.22em',
              fontWeight: 900,
              borderRadius: 3,
              boxShadow: `0 0 8px ${accent}`,
            }}
          >
            LV {cfg.level}
          </div>
        </div>
      </Html>
    </group>
  );
}

// ============================================================================
// DRONES — utility drones circling the ceiling
// ============================================================================
function AgoraDrones({ accent }: { accent: string }) {
  const drones = useRef<Array<THREE.Group | null>>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    drones.current.forEach((g, i) => {
      if (!g) return;
      const r = 1.85 + i * 0.12;
      const speed = 0.42 + i * 0.08;
      const phase = (i * (Math.PI * 2)) / 3;
      const a = t * speed + phase;
      g.position.set(Math.cos(a) * r, 1.85 + Math.sin(t * 1.2 + i) * 0.08, Math.sin(a) * r);
      g.rotation.y = a + Math.PI / 2;
    });
  });
  return (
    <group>
      {Array.from({ length: 3 }).map((_, i) => (
        <group key={i} ref={(el) => { drones.current[i] = el; }}>
          <mesh castShadow>
            <boxGeometry args={[0.22, 0.07, 0.14]} />
            <meshStandardMaterial color="#0a1124" metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.05, 0]}>
            <boxGeometry args={[0.14, 0.01, 0.08]} />
            <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={2.2} toneMapped={false} />
          </mesh>
          <mesh position={[0, -0.04, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 0.015, 10]} />
            <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={2.5} toneMapped={false} />
          </mesh>
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
// CENTRAL HOLO TABLE — pedestal + rotating rings + vertical beam + particles
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
  const pulseRefs = useRef<Array<THREE.Mesh | null>>([]);

  const nearest = useOpenClawStore((s) => s.nearestRoomId === 'agora');

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (ringMkt.current) ringMkt.current.rotation.y = t * 0.25;
    if (ringNet.current) ringNet.current.rotation.y = -t * 0.45;
    if (ringSig.current) ringSig.current.rotation.y = t * 0.7;
    const near = nearest ? 1 : 0;
    if (topMat.current) topMat.current.emissiveIntensity = 0.9 + near * 1.4 + Math.sin(t * 2.1) * 0.15;
    if (beamMat.current) beamMat.current.opacity = 0.34 + near * 0.35 + Math.sin(t * 1.7) * 0.05;
    if (tableLight.current) tableLight.current.intensity = 1.8 + near * 2.5 + Math.sin(t * 2.4) * 0.25;

    particles.current.forEach((m, i) => {
      if (!m) return;
      const period = 3.2;
      const phase = ((t / period + i * 0.14) % 1);
      const r = 0.25 + (i % 4) * 0.08;
      const a = i * 0.8 + t * 0.3;
      m.position.set(Math.cos(a) * r, 0.7 + phase * 1.3, Math.sin(a) * r);
      const mat = m.material as THREE.MeshBasicMaterial;
      mat.opacity = (1 - phase) * 0.85;
      m.scale.setScalar(0.4 + (1 - phase) * 0.8);
    });

    pulseRefs.current.forEach((m, i) => {
      if (!m) return;
      const period = 2.5;
      const phase = ((t / period + i * 0.35) % 1);
      const s = 0.6 + phase * 3.2;
      m.scale.set(s, s, 1);
      const mat = pulseMats.current[i];
      if (mat) mat.opacity = (1 - phase) * 0.6;
    });
  });

  return (
    <group>
      <mesh position={[0, 0.08, 0]} castShadow>
        <cylinderGeometry args={[0.88, 0.95, 0.16, 40]} />
        <meshStandardMaterial color="#0a1022" roughness={0.35} metalness={0.8} />
      </mesh>
      <mesh position={[0, 0.165, 0]}>
        <torusGeometry args={[0.92, 0.012, 8, 60]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={2.0} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.28, 0]} castShadow>
        <cylinderGeometry args={[0.8, 0.8, 0.06, 40]} />
        <meshStandardMaterial color="#050a18" roughness={0.15} metalness={0.9} />
      </mesh>
      <mesh position={[0, 0.315, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.74, 40]} />
        <meshStandardMaterial
          ref={topMat}
          color={accent}
          emissive={accent}
          emissiveIntensity={1.2}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0, 0.32, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.46, 0.465, 60]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.85} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      {/* Holo beam */}
      <mesh position={[0, 1.6, 0]}>
        <cylinderGeometry args={[0.04, 0.25, 2.6, 24, 1, true]} />
        <meshBasicMaterial
          ref={beamMat}
          color={accent}
          transparent
          opacity={0.4}
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>

      {/* Ring 1 — market data bars */}
      <group ref={ringMkt} position={[0, 0.55, 0]}>
        <mesh>
          <ringGeometry args={[0.95, 0.97, 72]} />
          <meshBasicMaterial color={accent} transparent opacity={0.9} side={THREE.DoubleSide} toneMapped={false} />
        </mesh>
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

      {/* Ring 2 — network */}
      <group ref={ringNet} position={[0, 0.72, 0]}>
        <mesh>
          <ringGeometry args={[0.7, 0.715, 60]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.55} side={THREE.DoubleSide} toneMapped={false} />
        </mesh>
        {Array.from({ length: 10 }).map((_, i) => {
          const a = (i / 10) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(a) * 0.71, 0, Math.sin(a) * 0.71]}>
              <sphereGeometry args={[0.03, 10, 10]} />
              <meshBasicMaterial color={accent} toneMapped={false} />
            </mesh>
          );
        })}
        {[[0, 3], [1, 6], [2, 8], [4, 9]].map((pair, i) => {
          const a1 = (pair[0] / 10) * Math.PI * 2;
          const a2 = (pair[1] / 10) * Math.PI * 2;
          const p1 = new THREE.Vector3(Math.cos(a1) * 0.69, 0, Math.sin(a1) * 0.69);
          const p2 = new THREE.Vector3(Math.cos(a2) * 0.69, 0, Math.sin(a2) * 0.69);
          return (
            <Line key={i} points={[p1, p2]} color={accent} lineWidth={1.2} transparent opacity={0.45} toneMapped={false} />
          );
        })}
      </group>

      {/* Ring 3 — signal arcs */}
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
            <Line key={i} points={pts} color={accent} lineWidth={2} transparent opacity={0.95} toneMapped={false} />
          );
        })}
        <mesh>
          <sphereGeometry args={[0.06, 14, 14]} />
          <meshBasicMaterial color="#ffffff" toneMapped={false} />
        </mesh>
      </group>

      {/* Outward floor pulses */}
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

      {/* Rising particles */}
      {Array.from({ length: 12 }).map((_, i) => (
        <mesh key={i} ref={(el) => { particles.current[i] = el; }}>
          <sphereGeometry args={[0.022, 8, 8]} />
          <meshBasicMaterial color={accent} transparent opacity={0} toneMapped={false} />
        </mesh>
      ))}

      {/* Key light */}
      <pointLight
        ref={tableLight}
        color={accent}
        intensity={2.0}
        distance={5.8}
        decay={1.4}
        position={[0, 1.1, 0]}
      />
    </group>
  );
}

// ============================================================================
// AI MAGIC LAYER — spell arcs, rune circles, thought glyphs, beam rain
// ============================================================================
const MAGIC_SPOTS: Array<{ x: number; z: number }> = [
  { x:  1.5, z:  0   },
  { x:  0,   z:  1.5 },
  { x: -1.5, z:  0   },
  { x:  0,   z: -1.5 },
];

function AgoraMagic({ accent }: { accent: string }) {
  return (
    <group>
      {MAGIC_SPOTS.map((s, i) => (
        <group key={i}>
          <SpellArc x={s.x} z={s.z} seed={i} accent={accent} />
          <RuneCircle x={s.x} z={s.z} seed={i} accent={accent} />
          <ThoughtGlyphs x={s.x} z={s.z} seed={i} accent={accent} />
        </group>
      ))}
      <BeamRain accent={accent} />
      <AuraShockwave accent={accent} />
      <AIActiveBadge accent={accent} />
    </group>
  );
}

// Big floating "AI ACTIVE" badge above the table — fixed pixel size
// so it stays readable at any camera distance.
function AIActiveBadge({ accent }: { accent: string }) {
  return (
    <Html
      position={[0, 2.05, 0]}
      center
      occlude={false}
      zIndexRange={[100, 0]}
      style={{ pointerEvents: 'none' }}
    >
      <div
        className="font-mono"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '8px 16px 8px 12px',
          background: 'linear-gradient(140deg, rgba(6,10,18,0.92), rgba(2,4,10,0.92))',
          border: `2px solid ${accent}`,
          borderRadius: 999,
          color: accent,
          fontSize: 15,
          letterSpacing: '0.34em',
          fontWeight: 900,
          whiteSpace: 'nowrap',
          boxShadow: `0 0 26px ${accent}cc, inset 0 0 14px ${accent}33`,
          textShadow: `0 0 10px ${accent}`,
          animation: 'ai-active-float 2.4s ease-in-out infinite',
        }}
      >
        <style>{`
          @keyframes ai-active-float {
            0%,100% { transform: translateY(0); opacity: 1; }
            50%     { transform: translateY(-5px); opacity: 0.88; }
          }
          @keyframes ai-active-pulse {
            0%,100% { transform: scale(1); box-shadow: 0 0 6px currentColor; }
            50%     { transform: scale(1.55); box-shadow: 0 0 18px currentColor; }
          }
        `}</style>
        <span
          style={{
            display: 'inline-block',
            width: 11,
            height: 11,
            borderRadius: 999,
            background: accent,
            animation: 'ai-active-pulse 1.1s ease-in-out infinite',
          }}
        />
        AI · ACTIVE
      </div>
    </Html>
  );
}

// Three bright "cast orbs" stream from each robot's antenna to the
// table, with fading glow halos. Much more visible than thin lines.
function SpellArc({
  x, z, seed, accent,
}: { x: number; z: number; seed: number; accent: string }) {
  const ORBS = 3;
  const orbRefs = useRef<Array<THREE.Mesh | null>>([]);
  const haloRefs = useRef<Array<THREE.Mesh | null>>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime + seed * 0.6;
    orbRefs.current.forEach((m, i) => {
      if (!m) return;
      const period = 2.2;
      const u = ((t / period + i / ORBS) % 1);
      // Curved path — lerp with a hump in y
      const sx = x * 0.85;
      const sz = z * 0.85;
      const sy = 1.3;
      const ex = 0;
      const ez = 0;
      const ey = 0.95;
      const px = sx + (ex - sx) * u;
      const pz = sz + (ez - sz) * u;
      // Arc up then down
      const py = sy + (ey - sy) * u + Math.sin(u * Math.PI) * 0.35;
      m.position.set(px, py, pz);
      // Fade in then out
      const mat = m.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.sin(u * Math.PI);
      const halo = haloRefs.current[i];
      if (halo) {
        halo.position.set(px, py, pz);
        const hm = halo.material as THREE.MeshBasicMaterial;
        hm.opacity = Math.sin(u * Math.PI) * 0.55;
        const s = 1 + (1 - u) * 0.4;
        halo.scale.setScalar(s);
      }
    });
  });
  return (
    <group>
      {Array.from({ length: ORBS }).map((_, i) => (
        <group key={i}>
          {/* Halo — larger additive sphere */}
          <mesh ref={(el) => { haloRefs.current[i] = el; }}>
            <sphereGeometry args={[0.12, 14, 14]} />
            <meshBasicMaterial
              color={accent}
              transparent
              opacity={0}
              toneMapped={false}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
          {/* Bright core orb */}
          <mesh ref={(el) => { orbRefs.current[i] = el; }}>
            <sphereGeometry args={[0.05, 12, 12]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// Rotating rune circle on the floor beneath each cube-robot.
function RuneCircle({
  x, z, seed, accent,
}: { x: number; z: number; seed: number; accent: string }) {
  const ring = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ring.current) return;
    const dir = seed % 2 === 0 ? 1 : -1;
    ring.current.rotation.y = clock.elapsedTime * (0.55 + seed * 0.08) * dir;
  });
  return (
    <group ref={ring} position={[x, 0.028, z]}>
      {/* Outer ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.5, 0.52, 56]} />
        <meshBasicMaterial color={accent} transparent opacity={0.7} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      {/* Inner thin ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.42, 0.428, 56]} />
        <meshBasicMaterial color={accent} transparent opacity={0.45} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      {/* 8 rune ticks around the outer ring */}
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * 0.48, 0.001, Math.sin(a) * 0.48]}
            rotation={[-Math.PI / 2, 0, -a]}
          >
            <planeGeometry args={[0.1, 0.028]} />
            <meshBasicMaterial color={accent} transparent opacity={0.95} toneMapped={false} />
          </mesh>
        );
      })}
      {/* 4 diamond notches on inner ring */}
      {Array.from({ length: 4 }).map((_, i) => {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 8;
        return (
          <mesh
            key={`d-${i}`}
            position={[Math.cos(a) * 0.425, 0.002, Math.sin(a) * 0.425]}
            rotation={[-Math.PI / 2, 0, -a + Math.PI / 4]}
          >
            <planeGeometry args={[0.04, 0.04]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.8} toneMapped={false} />
          </mesh>
        );
      })}
    </group>
  );
}

// Two drifting "thought" glyph symbols above each robot, animated via refs.
function ThoughtGlyphs({
  x, z, seed, accent,
}: { x: number; z: number; seed: number; accent: string }) {
  const glyphs = useMemo(() => {
    const pool = ['∑', '∇', 'λ', 'ψ', 'π', 'α', 'β', 'ξ', 'μ', 'σ', 'φ', '∂'];
    return [
      pool[(seed * 3) % pool.length],
      pool[(seed * 3 + 5) % pool.length],
      pool[(seed * 3 + 9) % pool.length],
    ];
  }, [seed]);
  const refs = useRef<Array<HTMLDivElement | null>>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime + seed * 0.6;
    refs.current.forEach((el, i) => {
      if (!el) return;
      const period = 2.6 + i * 0.4;
      const phase = ((t / period + i * 0.33) % 1);
      const ty = -phase * 66;
      const tx = Math.sin(phase * Math.PI * 2 + i + seed) * 10;
      el.style.transform = `translate(${tx}px, ${ty}px) scale(${0.55 + phase * 0.55})`;
      el.style.opacity = String(Math.sin(phase * Math.PI).toFixed(3));
    });
  });
  return (
    <group>
      {glyphs.map((g, k) => (
        <Html
          key={k}
          position={[x, 1.32, z]}
          center
          distanceFactor={5.5}
          occlude={false}
          style={{ pointerEvents: 'none' }}
        >
          <div
            ref={(el) => { refs.current[k] = el; }}
            style={{
              color: accent,
              fontSize: 22,
              fontWeight: 900,
              fontFamily: 'Cinzel, serif',
              textShadow: `0 0 12px ${accent}, 0 0 26px ${accent}88`,
              opacity: 0,
              willChange: 'transform, opacity',
            }}
          >
            {g}
          </div>
        </Html>
      ))}
    </group>
  );
}

// Matrix-style light motes falling down inside the central beam.
function BeamRain({ accent }: { accent: string }) {
  const refs = useRef<Array<THREE.Mesh | null>>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    refs.current.forEach((m, i) => {
      if (!m) return;
      const period = 2.1 + (i % 3) * 0.45;
      const phase = ((t / period + i * 0.12) % 1);
      const y = 2.6 - phase * 2.2;
      const angle = i * 0.85 + t * 0.18;
      const rad = 0.08 + (i % 2) * 0.06;
      m.position.set(Math.cos(angle) * rad, y, Math.sin(angle) * rad);
      const mat = m.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.sin(phase * Math.PI) * 0.9;
    });
  });
  return (
    <group>
      {Array.from({ length: 22 }).map((_, i) => (
        <mesh key={i} ref={(el) => { refs.current[i] = el; }}>
          <boxGeometry args={[0.03, 0.065, 0.008]} />
          <meshBasicMaterial color={i % 4 === 0 ? '#ffffff' : accent} transparent opacity={0} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

// Three staggered bright shockwave rings that fire outward from the
// table — reads as "AI broadcast" pulses radiating through the room.
function AuraShockwave({ accent }: { accent: string }) {
  const rings = useRef<Array<THREE.Mesh | null>>([]);
  const mats = useRef<Array<THREE.MeshBasicMaterial | null>>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    rings.current.forEach((m, i) => {
      if (!m) return;
      const mat = mats.current[i];
      if (!mat) return;
      const period = 2.4;
      const phase = (((t / period) + i * 0.33) % 1);
      const s = 0.4 + phase * 5.8;
      m.scale.set(s, s, 1);
      mat.opacity = (1 - phase) * 0.85;
    });
  });
  return (
    <group>
      {Array.from({ length: 3 }).map((_, i) => (
        <mesh
          key={i}
          ref={(el) => { rings.current[i] = el; }}
          position={[0, 0.034, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[0.75, 0.84, 72]} />
          <meshBasicMaterial
            ref={(m) => { mats.current[i] = m; }}
            color={accent}
            transparent
            opacity={0}
            side={THREE.DoubleSide}
            toneMapped={false}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

// ============================================================================
// PROMPT — game-style Press E card (only when nearest + panel closed)
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
          @keyframes float-gentle { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }
          @keyframes sweep-sheen { from{transform:rotate(0)} to{transform:rotate(360deg)} }
        `}</style>
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
