/**
 * Obsidian Ecosystem — Cinematic Typography Scale
 *
 * Authorized by: Cinematic UI spec Part 0.4, Part I.3.
 *
 * Three font families:
 *   - Primary UI (Inter): labels, metrics, agent names, 12px default.
 *   - System Monospace (JetBrains Mono): raw data, tape log, HLC timestamps.
 *   - Ceremonial (Cinzel): city names, era markers, annual reckoning title.
 *     Appears RARELY, always at large sizes, always letter-spaced.
 */

export type FontKind = 'ui' | 'mono' | 'ceremonial';

export const FONT_STACK: Record<FontKind, string> = {
  ui: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`,
  mono: `'JetBrains Mono', 'Fira Code', Menlo, Consolas, monospace`,
  ceremonial: `'Cinzel', 'Playfair Display', Georgia, serif`,
};

/** Named scale from Part 0.4. */
export const TYPE_SCALE = {
  atomic: { size: 10, weight: 400, lineHeight: 1.2, tracking: 0.02 },
  micro: { size: 11, weight: 400, lineHeight: 1.3, tracking: 0.01 },
  small: { size: 12, weight: 400, lineHeight: 1.4, tracking: 0 },
  body: { size: 14, weight: 400, lineHeight: 1.5, tracking: 0 },
  bodyStrong: { size: 14, weight: 600, lineHeight: 1.5, tracking: 0 },
  subheading: { size: 16, weight: 500, lineHeight: 1.4, tracking: 0.02 },
  heading: { size: 20, weight: 600, lineHeight: 1.3, tracking: 0.03 },
  title: { size: 28, weight: 700, lineHeight: 1.2, tracking: 0.04 },
  monumental: { size: 42, weight: 900, lineHeight: 1.1, tracking: 0.08 },
  ceremonial: { size: 64, weight: 400, lineHeight: 1.1, tracking: 0.15 },
} as const;

/** Generate CSS custom properties for the scale. */
export function typographyCss(): string {
  const lines: string[] = [':root {'];
  for (const [name, s] of Object.entries(TYPE_SCALE)) {
    lines.push(`  --type-${name}-size: ${s.size}px;`);
    lines.push(`  --type-${name}-weight: ${s.weight};`);
    lines.push(`  --type-${name}-line: ${s.lineHeight};`);
    lines.push(`  --type-${name}-track: ${s.tracking}em;`);
  }
  lines.push(`  --font-ui: ${FONT_STACK.ui};`);
  lines.push(`  --font-mono: ${FONT_STACK.mono};`);
  lines.push(`  --font-ceremonial: ${FONT_STACK.ceremonial};`);
  lines.push('}');
  return lines.join('\n');
}
