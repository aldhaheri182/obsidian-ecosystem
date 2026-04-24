'use client';

// Spec §7: Bezier curves between chambers, thickness 0.03, color = source city
// accent. Moving gradient (dash offset) indicates direction. New advancement
// events spawn a glowing orb that traverses the curve over 2s then fades.

import { Line } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { connections } from '@/data/mockData';
import { useEcosystemStore } from '@/store/ecosystemStore';

function cubicBetween(a: THREE.Vector3, b: THREE.Vector3): THREE.CubicBezierCurve3 {
  const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
  // Control points lift over the platform.
  const height = 2.5 + a.distanceTo(b) * 0.15;
  const ctrl1 = a.clone().lerp(mid, 0.4).setY(a.y + height);
  const ctrl2 = b.clone().lerp(mid, 0.4).setY(b.y + height);
  return new THREE.CubicBezierCurve3(a, ctrl1, ctrl2, b);
}

export function ConnectionLines() {
  const cities = useEcosystemStore((s) => s.cities);
  const cityMap = useMemo(() => {
    const m = new Map<string, (typeof cities)[number]>();
    for (const c of cities) m.set(c.id, c);
    return m;
  }, [cities]);

  const curves = useMemo(() => {
    return connections
      .map(([aId, bId]) => {
        const a = cityMap.get(aId);
        const b = cityMap.get(bId);
        if (!a || !b) return null;
        const start = new THREE.Vector3(a.position[0], 0.8, a.position[2]);
        const end = new THREE.Vector3(b.position[0], 0.8, b.position[2]);
        const curve = cubicBetween(start, end);
        const pts = curve.getPoints(32);
        return { aId, bId, a, b, curve, pts };
      })
      .filter(Boolean) as Array<{
        aId: string; bId: string; a: any; b: any; curve: THREE.CubicBezierCurve3; pts: THREE.Vector3[]
      }>;
  }, [cities, cityMap]);

  // Animated orbs per advancement event. For now, we spawn a periodic one.
  const [orbs, setOrbs] = useState<Array<{ id: number; pairIdx: number; startedAt: number; color: string }>>([]);
  const nextId = useRef(1);

  useEffect(() => {
    const iv = setInterval(() => {
      const idx = Math.floor(Math.random() * curves.length);
      const curve = curves[idx];
      if (!curve) return;
      setOrbs((prev) => [
        ...prev,
        { id: nextId.current++, pairIdx: idx, startedAt: performance.now(), color: curve.a.accentColor },
      ]);
    }, 2200);
    return () => clearInterval(iv);
  }, [curves]);

  // Clean up orbs
  useFrame(() => {
    const now = performance.now();
    setOrbs((prev) => prev.filter((o) => now - o.startedAt < 2000));
  });

  return (
    <group>
      {curves.map((c, i) => (
        <Line
          key={`${c.aId}-${c.bId}-${i}`}
          points={c.pts}
          color={c.a.accentColor}
          lineWidth={1.5}
          transparent
          opacity={0.55}
          dashed
          dashSize={0.2}
          gapSize={0.15}
        />
      ))}
      {orbs.map((o) => (
        <Orb key={o.id} curve={curves[o.pairIdx]?.curve} startedAt={o.startedAt} color={o.color} />
      ))}
    </group>
  );
}

function Orb({
  curve,
  startedAt,
  color,
}: {
  curve?: THREE.CubicBezierCurve3;
  startedAt: number;
  color: string;
}) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (!ref.current || !curve) return;
    const t = Math.min(1, (performance.now() - startedAt) / 2000);
    const p = curve.getPoint(t);
    ref.current.position.set(p.x, p.y, p.z);
    const mat = ref.current.material as THREE.MeshBasicMaterial;
    mat.opacity = Math.sin(t * Math.PI);
  });
  if (!curve) return null;
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.08, 8, 8]} />
      <meshBasicMaterial color={color} transparent opacity={0.9} toneMapped={false} />
    </mesh>
  );
}
