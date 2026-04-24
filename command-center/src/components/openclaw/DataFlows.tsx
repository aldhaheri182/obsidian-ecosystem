'use client';

import * as THREE from 'three';
import { Line } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, useState } from 'react';
import { CONNECTIONS, ROOMS } from '@/data/openclawRooms';

// Corridor data flows — neon ground lines between room centres + orb
// packets that pulse along them every few seconds. Reads accent from
// the source room.
export function DataFlows() {
  const byId = useMemo(() => new Map(ROOMS.map((r) => [r.id, r])), []);

  const pairs = useMemo(() => {
    const out: Array<{
      aId: string;
      bId: string;
      points: THREE.Vector3[];
      curve: THREE.CatmullRomCurve3;
      color: string;
    }> = [];
    // Overhead data nervous system — curves arc across the ceiling
    // (y = 3.2) with a gentle lift at the midpoint, connecting rooms
    // through the ceiling rather than along the floor.
    const CEIL_Y = 3.2;
    const LIFT = 0.6;
    for (const [aId, bId] of CONNECTIONS) {
      const a = byId.get(aId);
      const b = byId.get(bId);
      if (!a || !b) continue;
      const ax = a.center[0];
      const az = a.center[1];
      const bx = b.center[0];
      const bz = b.center[1];
      const midX = (ax + bx) / 2;
      const midZ = (az + bz) / 2;
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(ax, CEIL_Y, az),
        new THREE.Vector3((ax + midX) / 2, CEIL_Y + LIFT * 0.7, (az + midZ) / 2),
        new THREE.Vector3(midX, CEIL_Y + LIFT, midZ),
        new THREE.Vector3((bx + midX) / 2, CEIL_Y + LIFT * 0.7, (bz + midZ) / 2),
        new THREE.Vector3(bx, CEIL_Y, bz),
      ], false, 'catmullrom', 0.3);
      out.push({
        aId, bId,
        points: curve.getPoints(40),
        curve,
        color: a.accent,
      });
    }
    return out;
  }, [byId]);

  // Orb packets — one per pair, cycling in waves
  const [tick, setTick] = useState(0);
  useFrame(() => setTick((t) => (t + 1) % 100000));

  return (
    <group>
      {pairs.map((p, i) => (
        <group key={`${p.aId}-${p.bId}-${i}`}>
          <Line
            points={p.points}
            color={p.color}
            lineWidth={1.2}
            transparent
            opacity={0.45}
            dashed
            dashSize={0.2}
            gapSize={0.3}
          />
          <Orb curve={p.curve} color={p.color} seedMs={i * 370} />
        </group>
      ))}
    </group>
  );
}

function Orb({
  curve, color, seedMs,
}: {
  curve: THREE.CatmullRomCurve3;
  color: string;
  seedMs: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (!ref.current) return;
    const now = performance.now() + seedMs;
    const period = 4000;
    const t = (now % period) / period;
    const p = curve.getPoint(t);
    ref.current.position.set(p.x, p.y, p.z);
    const mat = ref.current.material as THREE.MeshBasicMaterial;
    mat.opacity = Math.sin(t * Math.PI) * 0.9;
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.1, 10, 10]} />
      <meshBasicMaterial color={color} transparent opacity={0} toneMapped={false} />
    </mesh>
  );
}
