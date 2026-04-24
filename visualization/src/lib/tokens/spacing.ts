/**
 * Obsidian Ecosystem — Spacing Grid
 * Authorized by: Cinematic UI spec Part 0.5. 4px base unit.
 */

export const SPACING = {
  s1: 4,    // micro gap
  s2: 8,    // inline gap
  s3: 12,   // component padding
  s4: 16,   // section gap
  s5: 20,   // panel padding
  s6: 24,   // major section gap
  s8: 32,   // view margin
  s12: 48,  // hero spacing
  s16: 64,  // ceremonial spacing
} as const;

export function spacingCss(): string {
  const lines: string[] = [':root {'];
  for (const [name, v] of Object.entries(SPACING)) {
    lines.push(`  --${name}: ${v}px;`);
  }
  lines.push('}');
  return lines.join('\n');
}

/**
 * Z-index layer stack from Part 0.2.
 * The PixiJS world uses its own internal z-order (Container.addChildAt);
 * these values apply to HTML overlays on top.
 */
export const Z = {
  voidBackground: 0,
  starfield: 10,
  planet: 20,
  timelineRing: 30,
  atmosphere: 40,
  nexusMap: 100,
  cityTerrain: 200,
  cityBuilding: 300,
  cityAgent: 400,
  cityPacket: 500,
  cityWeather: 600,
  cityUi: 700,
  hudOverlay: 1000,
  emergencyOverlay: 2000,
  cursor: 3000,
} as const;
