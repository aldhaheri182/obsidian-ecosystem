// ORUX Agent Civilization — one connected futuristic headquarters.
// Rectangular building, 4 columns × 3 rows of rooms, all flush with
// shared walls. Two horizontal corridors split the rows. AGORA sits
// central. SENTINEL is caged behind a locked glass barrier.

export type RoomTheme =
  | 'cyan' | 'purple' | 'crimson' | 'red' | 'green' | 'amber' | 'pink'
  | 'blue' | 'gold' | 'emerald' | 'magenta' | 'white';

export type RoomArchetype =
  | 'strategy' | 'time' | 'volatility' | 'risk' | 'execution'
  | 'vault' | 'news' | 'sentiment' | 'pattern' | 'hedge'
  | 'kill' | 'approval';

export interface RoomDef {
  id: string;
  name: string;
  codename: string;
  subtitle: string;
  promptLabel: string;
  theme: RoomTheme;
  accent: string;
  glow: string;
  archetype: RoomArchetype;
  agentCount: number;
  /** World-space (x, z) room center. */
  center: [number, number];
  /** Room footprint (w, d). Rooms are flush so these tile the wings. */
  size: [number, number];
  /** Grid coordinates, col (0–3 L→R), row (0–2 back→front). */
  grid: [number, number];
  /** SENTINEL — caged behind a locked glass barrier. */
  locked?: boolean;
  stats: Array<{ label: string; value: string }>;
  actions: Array<{ label: string; variant: 'primary' | 'warn' | 'danger' | 'ghost' }>;
}

// ---- Building geometry ----
// Rooms are FLUSH: no gap between columns or rows. Corridors run
// horizontally between rows.

const ROOM_W = 7;
const ROOM_D = 5;
const CORRIDOR_H = 2.2;
export const BUILDING_W = ROOM_W * 4;                      // 28
export const BUILDING_D = ROOM_D * 3 + CORRIDOR_H * 2;     // 19.4

const halfD = BUILDING_D / 2;
const ROW_CENTERS_Z = [
  -halfD + ROOM_D / 2,
  -halfD + ROOM_D + CORRIDOR_H + ROOM_D / 2,
  -halfD + ROOM_D + CORRIDOR_H + ROOM_D + CORRIDOR_H + ROOM_D / 2,
];

export const CORRIDORS: Array<{ centerZ: number; depth: number }> = [
  { centerZ: -halfD + ROOM_D + CORRIDOR_H / 2, depth: CORRIDOR_H },
  { centerZ: -halfD + ROOM_D * 2 + CORRIDOR_H + CORRIDOR_H / 2, depth: CORRIDOR_H },
];

const halfW = BUILDING_W / 2;
const COL_CENTERS_X = [
  -halfW + ROOM_W / 2,
  -halfW + ROOM_W + ROOM_W / 2,
  -halfW + ROOM_W * 2 + ROOM_W / 2,
  -halfW + ROOM_W * 3 + ROOM_W / 2,
];

function at(col: number, row: number): [number, number] {
  return [COL_CENTERS_X[col], ROW_CENTERS_Z[row]];
}

// Layout per user instruction:
//          col 0        col 1        col 2        col 3
// row 0    NYX          AURORA       CHRONOS      ATLAS
// row 1    VELA         AGORA        JANUS        SENTINEL
// row 2    HELIX        ORION        ERIS         HUMAN APPROVAL
export const ROOMS: RoomDef[] = [
  // Row 0 — back wall
  {
    id: 'nyx', name: 'NYX', codename: 'News Intelligence',
    subtitle: 'Real-time news ingestion + event extraction',
    promptLabel: 'News Feed',
    theme: 'magenta', accent: '#4B76FF', glow: '#8DA8FF',
    archetype: 'news', agentCount: 2,
    center: at(0, 0), size: [ROOM_W, ROOM_D], grid: [0, 0],
    stats: [
      { label: 'Headlines (1h)', value: '412' },
      { label: 'Top impact', value: 'NVDA +3.1%' },
      { label: 'Rumor score', value: '0.12' },
      { label: 'Sources online', value: '8 / 8' },
    ],
    actions: [
      { label: 'Pin headline', variant: 'ghost' },
      { label: 'Trace citation', variant: 'ghost' },
    ],
  },
  {
    id: 'aurora', name: 'AURORA', codename: 'Pattern Lab',
    subtitle: 'Pattern recognition + research probes',
    promptLabel: 'Pattern Lab',
    theme: 'cyan', accent: '#00F5D4', glow: '#9CFBEB',
    archetype: 'pattern', agentCount: 3,
    center: at(1, 0), size: [ROOM_W, ROOM_D], grid: [1, 0],
    stats: [
      { label: 'Patterns watched', value: '48' },
      { label: 'Breakouts (1d)', value: '7' },
      { label: 'Top ticker', value: 'META' },
      { label: 'Lab confidence', value: '0.71' },
    ],
    actions: [
      { label: 'Deploy pattern', variant: 'primary' },
      { label: 'Fork lab', variant: 'ghost' },
    ],
  },
  {
    id: 'chronos', name: 'CHRONOS', codename: 'Time Series',
    subtitle: 'Temporal sequencing and time-series modeling',
    promptLabel: 'Time Engine',
    theme: 'blue', accent: '#5C9EFF', glow: '#A8C5FF',
    archetype: 'time', agentCount: 2,
    center: at(2, 0), size: [ROOM_W, ROOM_D], grid: [2, 0],
    stats: [
      { label: 'HLC sequence', value: '69,619' },
      { label: 'Drift (max)', value: '0.4 ms' },
      { label: 'Horizons tracked', value: '1m · 5m · 1h · 1d' },
      { label: 'Cycle detector', value: 'ONLINE' },
    ],
    actions: [
      { label: 'Snapshot timeline', variant: 'primary' },
      { label: 'Re-calibrate drift', variant: 'ghost' },
    ],
  },
  {
    id: 'atlas', name: 'ATLAS', codename: 'Portfolio Engine',
    subtitle: 'Allocation map and capital cells — vault',
    promptLabel: 'Portfolio Vault',
    theme: 'purple', accent: '#B890FF', glow: '#D1B7FF',
    archetype: 'vault', agentCount: 2,
    center: at(3, 0), size: [ROOM_W, ROOM_D], grid: [3, 0],
    stats: [
      { label: 'Total NAV', value: 'AED 312M' },
      { label: 'Open positions', value: '38' },
      { label: 'Long / short', value: '71% / 29%' },
      { label: 'Locked reserve', value: 'AED 40M' },
    ],
    actions: [
      { label: 'Open allocation map', variant: 'primary' },
      { label: 'Unlock cell', variant: 'warn' },
    ],
  },

  // Row 1 — hub
  {
    id: 'vela', name: 'VELA', codename: 'Sentiment Engine',
    subtitle: 'FinBERT + social flow → aggregate mood',
    promptLabel: 'Sentiment Grid',
    theme: 'pink', accent: '#F78FB3', glow: '#FBB8CE',
    archetype: 'sentiment', agentCount: 2,
    center: at(0, 1), size: [ROOM_W, ROOM_D], grid: [0, 1],
    stats: [
      { label: 'Current mood', value: '+0.42 (risk-on)' },
      { label: 'Retail flow', value: '+ $240M' },
      { label: 'Fear / Greed', value: '63 (Greed)' },
      { label: 'Top ticker', value: 'TSLA' },
    ],
    actions: [
      { label: 'Aggregate snapshot', variant: 'primary' },
      { label: 'Tune FinBERT', variant: 'ghost' },
    ],
  },
  {
    id: 'agora', name: 'AGORA', codename: 'Strategy Council',
    subtitle: 'Central command — signal generation + strategy design',
    promptLabel: 'Strategy Console',
    theme: 'cyan', accent: '#4ECDC4', glow: '#8FE3DD',
    archetype: 'strategy', agentCount: 3,
    center: at(1, 1), size: [ROOM_W, ROOM_D], grid: [1, 1],
    stats: [
      { label: 'Active strategies', value: '14' },
      { label: 'Signals per hour', value: '228' },
      { label: 'Top signal', value: 'MOM-2.4' },
      { label: 'Win rate (7d)', value: '61.2%' },
    ],
    actions: [
      { label: 'Fork strategy', variant: 'primary' },
      { label: 'Run backtest', variant: 'primary' },
      { label: 'Promote to paper', variant: 'warn' },
    ],
  },
  {
    id: 'janus', name: 'JANUS', codename: 'Risk Gate',
    subtitle: 'Every signal must survive risk before execution',
    promptLabel: 'Risk Gate',
    theme: 'amber', accent: '#FFBE55', glow: '#FFE0A3',
    archetype: 'risk', agentCount: 2,
    center: at(2, 1), size: [ROOM_W, ROOM_D], grid: [2, 1],
    stats: [
      { label: 'Portfolio risk', value: 'Medium' },
      { label: 'Max drawdown guard', value: 'Active' },
      { label: 'Hedge coverage', value: '72%' },
      { label: 'Kill switch', value: 'Armed' },
    ],
    actions: [
      { label: 'Approve strategy', variant: 'primary' },
      { label: 'Send to hedge engine', variant: 'primary' },
      { label: 'Reject execution', variant: 'danger' },
    ],
  },
  {
    id: 'sentinel', name: 'SENTINEL', codename: 'Kill Switch',
    subtitle: 'Emergency shutdown — Owner authorization only',
    promptLabel: 'Kill Switch',
    theme: 'crimson', accent: '#E63946', glow: '#FF6E7A',
    archetype: 'kill', agentCount: 1, locked: true,
    center: at(3, 1), size: [ROOM_W, ROOM_D], grid: [3, 1],
    stats: [
      { label: 'Status', value: 'ARMED' },
      { label: 'Last drill', value: '7 days ago' },
      { label: 'Auto-trip', value: 'DD > 15%' },
      { label: 'Cooldown', value: '24 h' },
    ],
    actions: [
      { label: 'Run drill', variant: 'warn' },
      { label: 'FLATTEN ALL (3-sec hold)', variant: 'danger' },
    ],
  },

  // Row 2 — execution + owner
  {
    id: 'helix', name: 'HELIX', codename: 'Hedge Engine',
    subtitle: 'Derivative coverage + tail protection',
    promptLabel: 'Hedge Engine',
    theme: 'emerald', accent: '#2FE0C8', glow: '#8AF2E3',
    archetype: 'hedge', agentCount: 3,
    center: at(0, 2), size: [ROOM_W, ROOM_D], grid: [0, 2],
    stats: [
      { label: 'Hedge coverage', value: '72%' },
      { label: 'Active options', value: '14 puts' },
      { label: 'Vega exposure', value: '+0.38' },
      { label: 'Delta', value: '-0.12' },
    ],
    actions: [
      { label: 'Roll protection', variant: 'primary' },
      { label: 'Buy tail hedge', variant: 'warn' },
    ],
  },
  {
    id: 'orion', name: 'ORION', codename: 'Execution Desk',
    subtitle: 'Order routing and live trade queue',
    promptLabel: 'Execution Desk',
    theme: 'green', accent: '#2FE0C8', glow: '#8AF2E3',
    archetype: 'execution', agentCount: 3,
    center: at(1, 2), size: [ROOM_W, ROOM_D], grid: [1, 2],
    stats: [
      { label: 'Live orders', value: '7' },
      { label: 'Fills (24h)', value: '1,284' },
      { label: 'Avg slippage', value: '1.2 bps' },
      { label: 'Venues routed', value: '11' },
    ],
    actions: [
      { label: 'Pause routing', variant: 'warn' },
      { label: 'Rebalance queue', variant: 'primary' },
      { label: 'Cancel all', variant: 'danger' },
    ],
  },
  {
    id: 'eris', name: 'ERIS', codename: 'Volatility Regime',
    subtitle: 'Regime detection + volatility forecasting',
    promptLabel: 'Volatility Core',
    theme: 'red', accent: '#FF6B35', glow: '#FF9675',
    archetype: 'volatility', agentCount: 2,
    center: at(2, 2), size: [ROOM_W, ROOM_D], grid: [2, 2],
    stats: [
      { label: 'Current regime', value: 'HIGH_VOL_BULL' },
      { label: 'VIX reading', value: '22.4 (+1.8)' },
      { label: 'Realised vol (20d)', value: '18.3%' },
      { label: 'Alert level', value: 'YELLOW' },
    ],
    actions: [
      { label: 'Raise hedge coverage', variant: 'warn' },
      { label: 'Pause momentum signals', variant: 'warn' },
    ],
  },
  {
    id: 'approval', name: 'HUMAN APPROVAL', codename: 'Owner Gate',
    subtitle: 'Executive control — Owner-in-the-loop',
    promptLabel: 'Owner Approval',
    theme: 'gold', accent: '#FFD166', glow: '#FFE599',
    archetype: 'approval', agentCount: 1,
    center: at(3, 2), size: [ROOM_W, ROOM_D], grid: [3, 2],
    stats: [
      { label: 'Pending approvals', value: '2' },
      { label: 'Owner presence', value: 'CONNECTED' },
      { label: 'SLA window', value: '15 min' },
      { label: 'Last approval', value: '4 h ago' },
    ],
    actions: [
      { label: 'Approve pending', variant: 'primary' },
      { label: 'Defer (24 h)', variant: 'warn' },
      { label: 'Reject', variant: 'danger' },
    ],
  },
];

// Data flow — follows the actual trading pipeline.
export const CONNECTIONS: Array<[string, string]> = [
  ['nyx', 'aurora'],
  ['aurora', 'agora'],
  ['chronos', 'agora'],
  ['vela', 'agora'],
  ['agora', 'janus'],
  ['janus', 'orion'],
  ['janus', 'eris'],
  ['janus', 'helix'],
  ['orion', 'atlas'],
  ['approval', 'janus'],
  ['approval', 'atlas'],
  ['sentinel', 'janus'],
  ['sentinel', 'approval'],
];

// World bounds — player can roam the full building interior + a small
// outer walkway. The player won't clip through outer walls because
// Player.tsx clamps to these bounds.
const OUTER_PAD = 0.6;
export const WORLD_BOUNDS = {
  minX: -BUILDING_W / 2 - OUTER_PAD,
  maxX:  BUILDING_W / 2 + OUTER_PAD,
  minZ: -BUILDING_D / 2 - OUTER_PAD,
  maxZ:  BUILDING_D / 2 + OUTER_PAD,
};

// Player starts in the upper corridor, facing south.
export const PLAYER_SPAWN: [number, number, number] = [
  COL_CENTERS_X[1],
  0,
  CORRIDORS[0].centerZ,
];

export const ROOM_W_EXPORT = ROOM_W;
export const ROOM_D_EXPORT = ROOM_D;
