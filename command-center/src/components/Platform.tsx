'use client';

import { Grid } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

// Platform per spec §4. Hex disc radius 15, thickness 0.3, brushed metal
// #1E2330 roughness 0.7 metalness 0.9. Edge bevel emissive cyan #4ECDC4
// at 10%. Grid lines every 1u @ 8% cyan, fading with distance.
export function Platform() {
  // Hex with radius 15 = CylinderGeometry 6 radial segments.
  return (
    <group>
      {/* Top disc */}
      <mesh receiveShadow position={[0, -0.15, 0]}>
        <cylinderGeometry args={[15, 15, 0.3, 6]} />
        <meshStandardMaterial color="#1E2330" roughness={0.7} metalness={0.9} />
      </mesh>

      {/* Emissive cyan bevel — thin ring above the hex */}
      <mesh position={[0, 0.02, 0]}>
        <ringGeometry args={[14.95, 15.05, 64]} />
        <meshStandardMaterial
          color="#4ECDC4"
          emissive="#4ECDC4"
          emissiveIntensity={0.8}
          transparent
          opacity={0.9}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Grid per spec §4.1 */}
      <Grid
        position={[0, 0.01, 0]}
        args={[30, 30]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#4ECDC4"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#4ECDC4"
        fadeDistance={20}
        fadeStrength={1.5}
        infiniteGrid={false}
      />

      {/* Navigation lights per spec §4.2 */}
      <NavigationLights />

      {/* Particle fog per spec §4.3 */}
      <ParticleFog />
    </group>
  );
}

// Red/white sphere lights every 2u along the hex edge, blinking 1.2s period.
function NavigationLights() {
  const groupRef = useRef<THREE.Group>(null);
  const lights = useMemo(() => {
    const out: Array<{ pos: [number, number, number]; color: string; phase: number }> = [];
    // 6 hex corners at radius 15 — ring 30 lights spaced ~2u.
    const count = 24;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      out.push({
        pos: [Math.cos(a) * 14.7, 0.12, Math.sin(a) * 14.7],
        color: i % 2 === 0 ? '#E63946' : '#FFFFFF',
        phase: (i / count) * Math.PI * 2,
      });
    }
    return out;
  }, []);
  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.elapsedTime;
    groupRef.current.children.forEach((child, i) => {
      const l = lights[i];
      const mat = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
      // 1.2 s period, 50% duty cycle
      const on = Math.sin(t * (Math.PI / 0.6) + l.phase) > 0;
      mat.opacity = on ? 1 : 0.15;
    });
  });
  return (
    <group ref={groupRef}>
      {lights.map((l, i) => (
        <mesh key={i} position={l.pos}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshBasicMaterial color={l.color} transparent opacity={1} />
        </mesh>
      ))}
    </group>
  );
}

// Particle fog per spec §4.3: 500 tiny cyan particles drifting in a cylinder
// around the platform. Slow vertical drift + slight horizontal wander.
function ParticleFog() {
  const ref = useRef<THREE.Points>(null);
  const { geometry, count } = useMemo(() => {
    const count = 500;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 18 + Math.random() * 7;
      positions[i * 3 + 0] = Math.cos(a) * r;
      positions[i * 3 + 1] = Math.random() * 10 - 2;
      positions[i * 3 + 2] = Math.sin(a) * r;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return { geometry, count };
  }, []);

  useFrame((_, dt) => {
    if (!ref.current) return;
    const attr = ref.current.geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] += dt * 0.08; // slow upward drift
      arr[i * 3 + 0] += Math.sin(arr[i * 3 + 1] * 0.5 + i) * dt * 0.02;
      if (arr[i * 3 + 1] > 8) arr[i * 3 + 1] = -2;
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={ref} geometry={geometry}>
      <pointsMaterial color="#4ECDC4" size={0.02} transparent opacity={0.3} depthWrite={false} />
    </points>
  );
}
