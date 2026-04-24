'use client';

import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette, Scanline, Noise } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { Suspense } from 'react';
import { Floor } from './Floor';
import { Room } from './Room';
import { Player } from './Player';
import { DataFlows } from './DataFlows';
import { ROOMS } from '@/data/openclawRooms';
import { StarField } from './StarField';

export function OpenClawScene() {
  return (
    <Canvas
      shadows
      camera={{ position: [14, 16, 14], fov: 35, near: 0.1, far: 200 }}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.1,
      }}
      style={{
        width: '100vw',
        height: '100vh',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 0,
      }}
    >
      <color attach="background" args={['#05060e']} />
      <fog attach="fog" args={['#05060e', 25, 70]} />

      {/* Lights */}
      <ambientLight color="#2a2f45" intensity={0.55} />
      <directionalLight
        color="#fff3e0"
        intensity={0.8}
        position={[18, 24, 12]}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <directionalLight color="#8ec7ff" intensity={0.3} position={[-10, 8, -12]} />
      <hemisphereLight color="#ffd2a6" groundColor="#0a0f20" intensity={0.2} />

      <Suspense fallback={null}>
        <StarField />
        <Floor />
        <DataFlows />
        {ROOMS.map((r) => (
          <Room key={r.id} room={r} />
        ))}
        <Player />
      </Suspense>

      <EffectComposer multisampling={0}>
        <Bloom intensity={0.55} luminanceThreshold={0.18} luminanceSmoothing={0.9} radius={0.9} mipmapBlur />
        <Vignette darkness={0.4} offset={0.15} />
        <Scanline density={1600} opacity={0.03} blendFunction={BlendFunction.OVERLAY} />
        <Noise opacity={0.015} blendFunction={BlendFunction.SOFT_LIGHT} />
      </EffectComposer>
    </Canvas>
  );
}
