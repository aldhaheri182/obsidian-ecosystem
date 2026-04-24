/**
 * Generate reusable textures at runtime.
 * We prefer small procedural textures over committed PNGs so the build
 * stays lean and the palette can be tuned without swapping assets.
 */

import { Application, Graphics, RenderTexture, Sprite, Texture, Container } from 'pixi.js';

/** Soft radial glow texture, pure white, 64×64, used for lens flares and stars. */
export function softGlowTexture(app: Application, size = 64): Texture {
  const g = new Graphics();
  const r = size / 2;
  // Radial gradient approximated via concentric fills with falling alpha.
  const steps = 16;
  for (let i = steps; i >= 0; i--) {
    const t = i / steps;
    const alpha = Math.pow(1 - t, 2);
    g.circle(r, r, t * r).fill({ color: 0xffffff, alpha: alpha * 0.6 });
  }
  return app.renderer.generateTexture({ target: g, resolution: 2 });
}

/** Four-ray lens flare star, white, 96×96. */
export function lensFlareTexture(app: Application, size = 96): Texture {
  const g = new Graphics();
  const c = size / 2;
  // Core
  for (let i = 10; i >= 0; i--) {
    const t = i / 10;
    g.circle(c, c, t * 6).fill({ color: 0xffffff, alpha: (1 - t) * 0.8 });
  }
  // Rays
  const ray = (angle: number, len: number, width: number) => {
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    for (let i = 0; i < 20; i++) {
      const t = i / 20;
      g.circle(c + dx * t * len, c + dy * t * len, (1 - t) * width)
        .fill({ color: 0xffffff, alpha: (1 - t) * 0.4 });
    }
  };
  ray(0, c, 1.5);
  ray(Math.PI / 2, c, 1.5);
  ray(Math.PI, c, 1.5);
  ray(-Math.PI / 2, c, 1.5);
  ray(Math.PI / 4, c * 0.7, 0.7);
  ray(-Math.PI / 4, c * 0.7, 0.7);
  ray((3 * Math.PI) / 4, c * 0.7, 0.7);
  ray(-(3 * Math.PI) / 4, c * 0.7, 0.7);
  return app.renderer.generateTexture({ target: g, resolution: 2 });
}

/** Small particle texture for trails / dust / rain. */
export function dotTexture(app: Application, size = 8, color = 0xffffff): Texture {
  const g = new Graphics();
  const r = size / 2;
  for (let i = 10; i >= 0; i--) {
    const t = i / 10;
    g.circle(r, r, t * r).fill({ color, alpha: (1 - t) * 0.9 });
  }
  return app.renderer.generateTexture({ target: g, resolution: 2 });
}

/** Plus-shape used for bright pulsing stars. */
export function plusStarTexture(app: Application, size = 24): Texture {
  const g = new Graphics();
  const c = size / 2;
  g.rect(c - 0.5, c - 10, 1, 20).fill({ color: 0xffffff, alpha: 0.6 });
  g.rect(c - 10, c - 0.5, 20, 1).fill({ color: 0xffffff, alpha: 0.6 });
  g.circle(c, c, 2).fill({ color: 0xffffff });
  return app.renderer.generateTexture({ target: g, resolution: 2 });
}
