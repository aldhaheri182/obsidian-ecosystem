'use client';

import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { Suspense, useState, useEffect } from 'react';
import { Platform } from './Platform';
import { CityChamber } from './CityChamber';
import { ConnectionLines } from './ConnectionLines';
import { StarsAndNebula } from './StarsAndNebula';
import { PostProcessing } from './PostProcessing';
import { CameraController } from './CameraController';
import { useEcosystemStore } from '@/store/ecosystemStore';

// Per spec §3.1: Canvas with shadows, ACES tonemapping, exposure 1.2,
// camera (0, 20, 30) fov 45. Style fixed fullscreen z-index 0.
export function Scene() {
  const cities = useEcosystemStore((s) => s.cities);
  const selectCity = useEcosystemStore((s) => s.selectCity);
  const [webglOk, setWebglOk] = useState(true);

  // WebGL probe — show a graceful fallback if it's unavailable.
  useEffect(() => {
    try {
      const c = document.createElement('canvas');
      const gl = c.getContext('webgl2') ?? c.getContext('webgl');
      if (!gl) setWebglOk(false);
    } catch {
      setWebglOk(false);
    }
  }, []);

  if (!webglOk) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-void-black">
        <div className="text-center font-mono text-ash-grey max-w-md px-6">
          <div className="text-solar-gold text-lg mb-3 font-ceremonial tracking-[0.3em]">
            WebGL UNAVAILABLE
          </div>
          The Command Center needs hardware-accelerated WebGL (or WebGL2).
          Enable it in your browser, update your GPU driver, or open this page
          in a desktop Chromium / Firefox / Safari.
        </div>
      </div>
    );
  }

  return (
    <Canvas
      shadows
      camera={{ position: [0, 20, 30], fov: 45, near: 0.1, far: 200 }}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.2,
      }}
      style={{ width: '100vw', height: '100vh', position: 'fixed', top: 0, left: 0, zIndex: 0 }}
      onDoubleClick={(e) => {
        // Double-click on empty sky deselects. Chamber onClick stops
        // propagation so this only fires when nothing else caught it.
        e.stopPropagation();
        selectCity(null);
      }}
    >
      {/* Spec §9.1 lighting */}
      <ambientLight color="#404060" intensity={0.4} />
      <directionalLight
        color="#FFF3E0"
        intensity={1.5}
        position={[20, 30, 10]}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <directionalLight color="#AAC8FF" intensity={0.5} position={[-10, 10, -10]} />

      <Suspense fallback={null}>
        <StarsAndNebula />
        <Platform />
        {cities.map((c) => (
          <CityChamber key={c.id} city={c} />
        ))}
        <ConnectionLines />
      </Suspense>

      <CameraController />
      <PostProcessing />
    </Canvas>
  );
}
