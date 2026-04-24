'use client';

import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import {
  EffectComposer,
  Bloom,
  Vignette,
  SMAA,
} from '@react-three/postprocessing';
import { Suspense } from 'react';
import { Floor } from './Floor';
import { Room } from './Room';
import { Player } from './Player';
import { DataFlows } from './DataFlows';
import { ROOMS } from '@/data/openclawRooms';
import { StarField } from './StarField';
import { Drones } from './Drones';
import { AmbientDust } from './AmbientDust';

export function OpenClawScene() {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [14, 16, 14], fov: 35, near: 0.1, far: 200 }}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.0,
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
      <color attach="background" args={['#0b1020']} />
      {/* Soft far-fog — keeps the horizon pleasant without obscuring the
          building. Pokemon-lab style interior reads best in clean light. */}
      <fog attach="fog" args={['#0d1428', 48, 120]} />

      {/* Lights — bright, warm key + cool fill for a lived-in interior */}
      <ambientLight color="#ffffff" intensity={1.15} />
      <directionalLight
        color="#fff4d6"
        intensity={1.45}
        position={[18, 24, 12]}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <directionalLight color="#cfe2ff" intensity={0.75} position={[-14, 10, -12]} />
      <hemisphereLight color="#fff0d0" groundColor="#1a2238" intensity={0.55} />
      {/* Subtle neon accent rims — reduced so they tint, not drown */}
      <pointLight color="#4ECDC4" intensity={0.5} distance={40} position={[0, 4.5, -18]} />
      <pointLight color="#FFD166" intensity={0.45} distance={40} position={[0, 4.5, 18]} />

      <Suspense fallback={null}>
        <StarField />
        <Floor />
        <DataFlows />
        <Drones />
        {ROOMS.map((r) => (
          <Room key={r.id} room={r} />
        ))}
        <AmbientDust />
        <Player />
      </Suspense>

      <EffectComposer multisampling={2}>
        <SMAA />
        <Bloom intensity={0.55} luminanceThreshold={0.38} luminanceSmoothing={0.9} radius={0.75} mipmapBlur />
        <Vignette darkness={0.28} offset={0.35} />
      </EffectComposer>
    </Canvas>
  );
}
