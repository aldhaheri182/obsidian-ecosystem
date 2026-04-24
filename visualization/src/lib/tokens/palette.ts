/**
 * Obsidian Ecosystem — Cinematic Palette
 *
 * Authorized by: Cinematic UI spec Part I.2.
 * Every color has a hex, a use case, and a prohibition. No color exists
 * without purpose. Adding a color here is an ADR-level change.
 */

export const PALETTE = {
  // Deepest background. Space, void between cities.
  voidBlack: 0x0a0a0f,
  // Panel backgrounds, city shadows.
  abyssBlue: 0x121624,
  // Active agents, healthy systems, buy signals.
  verdigris: 0x4ecdc4,
  // Sell signals, market volatility, energy.
  ember: 0xff6b35,
  // Risk alerts, errors, emergency stop.
  crimsonForge: 0xe63946,
  // Owner presence, executive commands, advancements.
  solarGold: 0xffd166,
  // Primary text, UI chrome.
  lunarSilver: 0xe0e0e0,
  // Highest emphasis, selected items.
  ghostWhite: 0xf8f9fa,
  // Dreaming / sleeping agents, simulation.
  deepAmethyst: 0x7209b7,
  // Data flows, knowledge publication, insights.
  cyanAurora: 0x00f5d4,
  // Retired agents, deprecated knowledge.
  ashGrey: 0x6c757d,
} as const;

/** Hex strings for CSS consumption. */
export const PALETTE_CSS = Object.fromEntries(
  Object.entries(PALETTE).map(([k, v]) => [
    k,
    '#' + v.toString(16).padStart(6, '0'),
  ]),
) as Record<keyof typeof PALETTE, string>;

/** Mapped lifecycle → aura color. */
export const LIFECYCLE_COLOR: Record<string, number> = {
  unregistered: PALETTE.ashGrey,
  registering: PALETTE.ashGrey,
  booting: PALETTE.ember,
  active: PALETTE.verdigris,
  sleeping: PALETTE.deepAmethyst,
  dreaming: PALETTE.cyanAurora,
  probation: PALETTE.ember,
  error: PALETTE.crimsonForge,
  retired: PALETTE.ashGrey,
};

/** MessageType → packet color. */
export const MESSAGE_COLOR: Record<string, number> = {
  MARKET_DATA: PALETTE.cyanAurora,
  SIGNAL: PALETTE.verdigris,
  ORDER_REQUEST: PALETTE.solarGold,
  FILL_REPORT: PALETTE.verdigris,
  RISK_OVERRIDE: PALETTE.crimsonForge,
  HEARTBEAT: PALETTE.ashGrey,
  TIME_TICK: PALETTE.lunarSilver,
  EXECUTIVE_DIRECTIVE: PALETTE.solarGold,
  EXECUTIVE_REPORT: PALETTE.solarGold,
  KNOWLEDGE_PUBLICATION: PALETTE.ghostWhite,
  ADVANCEMENT_ORB: PALETTE.solarGold,
  ALERT: PALETTE.crimsonForge,
};

/** Memory node types (for Agent View memory graph). */
export const MEMORY_NODE_COLOR: Record<string, number> = {
  OBSERVATION: PALETTE.crimsonForge,
  INFERENCE: PALETTE.cyanAurora,
  OUTCOME: PALETTE.verdigris,
  PRINCIPLE: PALETTE.solarGold,
  EXTERNAL: PALETTE.deepAmethyst,
  COUNTERFACTUAL: PALETTE.ghostWhite,
};

/** Pretty names for debugging / tooltips. */
export const COLOR_NAMES: Record<number, string> = Object.fromEntries(
  Object.entries(PALETTE).map(([k, v]) => [v, k]),
);
