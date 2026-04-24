'use client';

import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import {
  EffectComposer,
  Bloom,
  Vignette,
  Scanline,
  Noise,
  ChromaticAberration,
  DepthOfField,
  SMAA,
} from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { Vector2 } from 'three';
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
        toneMappingExposure: 1.25,
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
      <color attach="background" args={['#03040a']} />
      {/* Deeper fog pulls the horizon in, gives the base presence */}
      <fog attach="fog" args={['#05080f', 18, 62]} />

      {/* Lights */}
      <ambientLight color="#1e2336" intensity={0.45} />
      <directionalLight
        color="#fff3e0"
        intensity={0.85}
        position={[18, 24, 12]}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <directionalLight color="#8ec7ff" intensity={0.38} position={[-14, 10, -12]} />
      <hemisphereLight color="#ffd2a6" groundColor="#040814" intensity={0.22} />
      {/* Low-slung rim light to silhouette the building against the fog */}
      <pointLight color="#4ECDC4" intensity={0.8} distance={60} position={[0, 3.5, -18]} />
      <pointLight color="#FFD166" intensity={0.6} distance={55} position={[0, 3.5, 18]} />

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

      <EffectComposer multisampling={0}>
        <SMAA />
        {/* Depth of field — foreground crisp, platform edges softly blurred
            for cinematic depth. Focus tracks camera forward ~14 u. */}
        <DepthOfField focusDistance={0.018} focalLength={0.04} bokehScale={2.5} />
        <Bloom intensity={0.95} luminanceThreshold={0.14} luminanceSmoothing={0.92} radius={0.95} mipmapBlur />
        <ChromaticAberration
          offset={new Vector2(0.0015, 0.0015)}
          radialModulation={false}
          modulationOffset={0}
        />
        <Scanline density={1800} opacity={0.05} blendFunction={BlendFunction.OVERLAY} />
        <Noise opacity={0.025} blendFunction={BlendFunction.SOFT_LIGHT} />
        <Vignette darkness={0.55} offset={0.12} />
      </EffectComposer>
    </Canvas>
  );
}
