// ORUX OpenClaw Command — 12 rooms, 4 columns × 3 rows, each on its own
// floor tile. Positions are world-space (x, z) for the room center, with a
// +Y up convention.

export type RoomTheme = 'gold' | 'cyan' | 'red' | 'green' | 'purple' | 'white' | 'crimson' | 'amber' | 'pink' | 'blue' | 'teal' | 'silver';

export interface RoomDef {
  id: string;
  name: string;           // "Treasury Terminal"
  subtitle: string;       // one line explaining what happens here
  theme: RoomTheme;       // accent color key
  accent: string;         // hex
  glow: string;           // hex of interior light (slightly tinted)
  agentCount: number;     // how many NPC agents walk inside
  /** World-space center of the room */
  center: [number, number];
  /** Room footprint, whole integers (grid cells) */
  size: [number, number]; // width × depth
  /** Room interior archetype — selects props */
  archetype:
    | 'treasury'
    | 'strategy'
    | 'risk'
    | 'execution'
    | 'radar'
    | 'news'
    | 'sentiment'
    | 'vault'
    | 'hedge'
    | 'kill'
    | 'compliance'
    | 'approval';
  stats: Array<{ label: string; value: string }>;
  actions: Array<{ label: string; variant: 'primary' | 'warn' | 'danger' | 'ghost' }>;
}

const ROOM_W = 7;
const ROOM_D = 5;
const GAP = 2; // corridor width between rooms
const COL_STRIDE = ROOM_W + GAP;
const ROW_STRIDE = ROOM_D + GAP;

// 4×3 grid. Columns left → right, rows top → bottom. World origin is grid center.
function gridPos(col: number, row: number): [number, number] {
  const cx = (col - 1.5) * COL_STRIDE;
  const cz = (row - 1.0) * ROW_STRIDE;
  return [cx, cz];
}

export const ROOMS: RoomDef[] = [
  {
    id: 'treasury', name: 'Treasury Terminal',
    subtitle: 'Capital allocation and liquidity control',
    theme: 'gold', accent: '#FFD166', glow: '#FFE599',
    agentCount: 3, center: gridPos(0, 0), size: [ROOM_W, ROOM_D],
    archetype: 'treasury',
    stats: [
      { label: 'Available liquidity', value: 'AED 48.2M' },
      { label: 'Active credit lines', value: 'AED 120M' },
      { label: 'Utilization', value: '41%' },
      { label: 'Reserve buffer', value: '12.5%' },
    ],
    actions: [
      { label: 'Simulate cash movement', variant: 'primary' },
      { label: 'Approve liquidity release', variant: 'primary' },
      { label: 'Lock reserve', variant: 'warn' },
    ],
  },
  {
    id: 'strategy', name: 'Strategy Lab',
    subtitle: 'Signal generation and strategy design',
    theme: 'cyan', accent: '#4ECDC4', glow: '#8FE3DD',
    agentCount: 4, center: gridPos(1, 0), size: [ROOM_W, ROOM_D],
    archetype: 'strategy',
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
    id: 'risk', name: 'Risk Gate',
    subtitle: 'Every signal must survive risk before execution',
    theme: 'red', accent: '#FF6B35', glow: '#FF9675',
    agentCount: 2, center: gridPos(2, 0), size: [ROOM_W, ROOM_D],
    archetype: 'risk',
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
    id: 'execution', name: 'Execution Desk',
    subtitle: 'Order routing and live trade queue',
    theme: 'green', accent: '#4ECDC4', glow: '#67F7C7',
    agentCount: 3, center: gridPos(3, 0), size: [ROOM_W, ROOM_D],
    archetype: 'execution',
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
    id: 'radar', name: 'Market Radar',
    subtitle: 'Cross-venue market surveillance',
    theme: 'blue', accent: '#5C9EFF', glow: '#A8C5FF',
    agentCount: 2, center: gridPos(0, 1), size: [ROOM_W, ROOM_D],
    archetype: 'radar',
    stats: [
      { label: 'Instruments tracked', value: '4,128' },
      { label: 'Anomalies (1h)', value: '3' },
      { label: 'Venue latency', value: '11 ms' },
      { label: 'Regime', value: 'LOW_VOL_BULL' },
    ],
    actions: [
      { label: 'Focus symbol', variant: 'primary' },
      { label: 'Snapshot book', variant: 'ghost' },
    ],
  },
  {
    id: 'news', name: 'News Intelligence',
    subtitle: 'Real-time news ingestion + event extraction',
    theme: 'amber', accent: '#FFBE55', glow: '#FFE0A3',
    agentCount: 2, center: gridPos(1, 1), size: [ROOM_W, ROOM_D],
    archetype: 'news',
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
    id: 'sentiment', name: 'Sentiment Engine',
    subtitle: 'FinBERT + social flow → aggregate mood',
    theme: 'pink', accent: '#F78FB3', glow: '#FBB8CE',
    agentCount: 2, center: gridPos(2, 1), size: [ROOM_W, ROOM_D],
    archetype: 'sentiment',
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
    id: 'vault', name: 'Portfolio Vault',
    subtitle: 'Allocation map + locked capital cells',
    theme: 'purple', accent: '#B890FF', glow: '#D1B7FF',
    agentCount: 2, center: gridPos(3, 1), size: [ROOM_W, ROOM_D],
    archetype: 'vault',
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

  {
    id: 'hedge', name: 'Hedge Room',
    subtitle: 'Derivative coverage + tail protection',
    theme: 'teal', accent: '#2FE0C8', glow: '#8AF2E3',
    agentCount: 3, center: gridPos(0, 2), size: [ROOM_W, ROOM_D],
    archetype: 'hedge',
    stats: [
      { label: 'Hedge coverage', value: '72%' },
      { label: 'Active options', value: '14 puts' },
      { label: 'Vega exposure', value: '+ 0.38' },
      { label: 'Delta', value: '-0.12' },
    ],
    actions: [
      { label: 'Roll protection', variant: 'primary' },
      { label: 'Buy tail hedge', variant: 'warn' },
    ],
  },
  {
    id: 'kill', name: 'Kill Switch Chamber',
    subtitle: 'Emergency shutdown — owner authorization only',
    theme: 'crimson', accent: '#E63946', glow: '#FF6E7A',
    agentCount: 1, center: gridPos(1, 2), size: [ROOM_W, ROOM_D],
    archetype: 'kill',
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
  {
    id: 'compliance', name: 'Compliance Office',
    subtitle: 'Regulatory checks + ethical constraints',
    theme: 'silver', accent: '#D6DDE8', glow: '#EEF2F8',
    agentCount: 2, center: gridPos(2, 2), size: [ROOM_W, ROOM_D],
    archetype: 'compliance',
    stats: [
      { label: 'Rules active', value: '184' },
      { label: 'Jurisdictions', value: 'AE · EU · US' },
      { label: 'Open findings', value: '0' },
      { label: 'Next filing', value: '3 days' },
    ],
    actions: [
      { label: 'Generate report', variant: 'primary' },
      { label: 'Open rulebook', variant: 'ghost' },
    ],
  },
  {
    id: 'approval', name: 'Human Approval Bridge',
    subtitle: 'Owner-in-the-loop for Tier-Big+ decisions',
    theme: 'white', accent: '#FFE9A6', glow: '#FFF7D1',
    agentCount: 1, center: gridPos(3, 2), size: [ROOM_W, ROOM_D],
    archetype: 'approval',
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

// Corridor connection graph for the data-flow lines.
export const CONNECTIONS: Array<[string, string]> = [
  ['treasury', 'strategy'],
  ['strategy', 'risk'],
  ['risk', 'execution'],
  ['execution', 'vault'],
  ['radar', 'strategy'],
  ['news', 'sentiment'],
  ['sentiment', 'strategy'],
  ['risk', 'hedge'],
  ['hedge', 'vault'],
  ['risk', 'kill'],
  ['compliance', 'risk'],
  ['compliance', 'approval'],
  ['approval', 'treasury'],
];

export const WORLD_BOUNDS = {
  minX: -2 * COL_STRIDE - ROOM_W,
  maxX: 2 * COL_STRIDE + ROOM_W,
  minZ: -1.5 * ROW_STRIDE - ROOM_D,
  maxZ: 1.5 * ROW_STRIDE + ROOM_D,
};

export const ROOM_W_EXPORT = ROOM_W;
export const ROOM_D_EXPORT = ROOM_D;
