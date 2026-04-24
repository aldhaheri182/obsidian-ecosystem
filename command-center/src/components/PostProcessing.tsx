'use client';

// Spec §9.2 order: Bloom, Vignette, ChromaticAberration, Scanline, Noise.
import {
  EffectComposer,
  Bloom,
  Vignette,
  ChromaticAberration,
  Scanline,
  Noise,
} from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { Vector2 } from 'three';

export function PostProcessing() {
  return (
    <EffectComposer multisampling={0}>
      <Bloom intensity={0.5} luminanceThreshold={0.2} luminanceSmoothing={0.9} radius={1} mipmapBlur />
      <Vignette darkness={0.3} offset={0.1} />
      <ChromaticAberration offset={new Vector2(0.001, 0.001)} radialModulation={false} modulationOffset={0} />
      <Scanline density={2048} opacity={0.03} blendFunction={BlendFunction.OVERLAY} />
      <Noise opacity={0.01} blendFunction={BlendFunction.SOFT_LIGHT} />
    </EffectComposer>
  );
}
