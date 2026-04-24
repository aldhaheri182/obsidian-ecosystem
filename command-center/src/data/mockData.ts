// Mock data strictly per docs/COMMAND_CENTER.md §5.2 + §13.1.
// All 11 cities with agents, metrics, logs, and initial signals.

import type { CityData, SystemHealth, Mission, Alert, Approval } from '@/types';

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function perfSeries(seed: string): number[] {
  const h = hashSeed(seed);
  const out: number[] = [];
  let v = (h % 50) / 100; // 0.00..0.50
  for (let i = 0; i < 20; i++) {
    v += ((((h >> (i & 15)) & 7) - 3.5) / 50);
    out.push(Math.max(-0.2, Math.min(1.2, v)));
  }
  return out;
}

// Positions computed per spec §5: i*(2π/11) − π/2, radius 10.
function cityPosition(i: number): { pos: [number, number, number]; rot: number } {
  const angle = i * ((Math.PI * 2) / 11) - Math.PI / 2;
  return {
    pos: [Math.cos(angle) * 10, 0, Math.sin(angle) * 10],
    rot: -angle, // face inward
  };
}

const CITY_DEFS: Array<{
  id: CityData['id'];
  name: string;
  color: string;
  archetype: CityData['archetype'];
  roster: Array<{ role: string; name: string }>;
}> = [
  {
    id: 'aletheia', name: 'Aletheia', color: '#4ECDC4', archetype: 'trading_floor',
    roster: [
      { role: 'Trader', name: 'momentum-signal-01' },
      { role: 'Risk', name: 'risk-overlord' },
      { role: 'Blender', name: 'signal-blender' },
      { role: 'Router', name: 'order-router' },
      { role: 'Executor', name: 'paper-executor' },
      { role: 'CEO', name: 'ceo-aletheia' },
    ],
  },
  {
    id: 'mnemosyne', name: 'Mnemosyne', color: '#FFD166', archetype: 'library',
    roster: [
      { role: 'Archivist', name: 'archivist' },
      { role: 'Keeper', name: 'memory-keeper-01' },
      { role: 'Auditor', name: 'causal-auditor' },
      { role: 'Search', name: 'semantic-search' },
    ],
  },
  {
    id: 'prometheus', name: 'Prometheus', color: '#00F5D4', archetype: 'lab',
    roster: [
      { role: 'Hypothesis', name: 'hypothesis-generator' },
      { role: 'Backtest', name: 'backtest-runner' },
      { role: 'Dreamer', name: 'dream-explorer' },
      { role: 'Replicator', name: 'paper-replicator' },
      { role: 'Adversary', name: 'adversarial-tester' },
    ],
  },
  {
    id: 'hephaestus', name: 'Hephaestus', color: '#FF6B35', archetype: 'forge',
    roster: [
      { role: 'Orchestrator', name: 'orchestrator' },
      { role: 'Security', name: 'security-sentinel' },
      { role: 'Latency', name: 'latency-optimizer' },
    ],
  },
  {
    id: 'themis', name: 'Themis', color: '#E0E0E0', archetype: 'court',
    roster: [
      { role: 'Enforcer', name: 'rule-enforcer' },
      { role: 'Ethics', name: 'ethics-watchdog' },
      { role: 'Auditor', name: 'legal-auditor' },
    ],
  },
  {
    id: 'agora', name: 'Agora', color: '#F8F9FA', archetype: 'port',
    roster: [
      { role: 'Gateway', name: 'api-gateway' },
      { role: 'Broker', name: 'broker-interface-alpaca' },
      { role: 'Vendor', name: 'data-vendor-negotiator' },
      { role: 'News', name: 'news-feed-ingestor' },
    ],
  },
  {
    id: 'iris', name: 'Iris', color: '#7209B7', archetype: 'observatory',
    roster: [
      { role: 'Health', name: 'health-monitor' },
      { role: 'Anomaly', name: 'anomaly-detector' },
      { role: 'Alert', name: 'alert-dispatcher' },
    ],
  },
  {
    id: 'chronos', name: 'Chronos', color: '#FFFFFF', archetype: 'clocktower',
    roster: [
      { role: 'Oracle', name: 'time-oracle' },
      { role: 'Sequencer', name: 'event-sequencer' },
    ],
  },
  {
    id: 'narcissus', name: 'Narcissus', color: '#B8E3FF', archetype: 'mirror',
    roster: [
      { role: 'Twin', name: 'digital-twin-synchronizer' },
      { role: 'Architect', name: 'architecture-proposal' },
    ],
  },
  {
    id: 'eris', name: 'Eris', color: '#E63946', archetype: 'inverse',
    roster: [
      { role: 'Inverse Momentum', name: 'inverse-momentum-signal' },
      { role: 'Inverse Risk', name: 'inverse-risk-overlord' },
      { role: 'Inverse Optimizer', name: 'inverse-portfolio-optimizer' },
    ],
  },
  {
    id: 'janus', name: 'Janus', color: '#A8B6D3', archetype: 'bridge',
    roster: [
      { role: 'IoT', name: 'iot-ingestor' },
      { role: 'Satellite', name: 'satellite-imagery-processor' },
    ],
  },
];

export const initialCities: CityData[] = CITY_DEFS.map((def, i) => {
  const { pos, rot } = cityPosition(i);
  const seed = hashSeed(def.id);
  return {
    id: def.id,
    name: def.name,
    color: def.color,
    accentColor: def.color,
    archetype: def.archetype,
    status: (['healthy', 'healthy', 'healthy', 'degraded', 'dreaming'] as const)[seed % 5],
    agents: def.roster.map((r, j) => ({
      id: r.name,
      name: r.name,
      role: r.role,
      status: (['active', 'active', 'active', 'sleeping', 'error'] as const)[(seed + j) % 5],
      task: `Routing ${['AAPL', 'MSFT', 'NVDA', 'GOOG', 'TSLA'][(seed + j) % 5]}`,
      performance: perfSeries(`${def.id}-${r.name}`),
      position_in_chamber: [
        ((j % 3) - 1) * 0.5,
        0,
        (Math.floor(j / 3) - 1) * 0.5,
      ],
    })),
    metrics: {
      cpu: 20 + (seed % 60),
      memory: 30 + ((seed * 7) % 50),
      risk: (seed * 13) % 80,
      sharpe: def.id === 'aletheia' ? 1.2 : undefined,
    },
    logs: [
      { time: '14:32:05', message: `${def.roster[0].name}: boot OK`, level: 'info' },
      { time: '14:33:01', message: `${def.roster[0].name}: heartbeat`, level: 'info' },
      { time: '14:34:12', message: `${def.name} cycle complete`, level: 'info' },
    ],
    signals:
      def.id === 'aletheia'
        ? [
            { symbol: 'AAPL', direction: 'BUY', confidence: 0.72 },
            { symbol: 'MSFT', direction: 'BUY', confidence: 0.64 },
            { symbol: 'NVDA', direction: 'SELL', confidence: 0.51 },
          ]
        : undefined,
    position: pos,
    rotation: rot,
  };
});

export const initialSystemHealth: SystemHealth = {
  cpu: 42,
  memory: 58,
  disk: 27,
  network: 73,
};

export const initialMissions: Mission[] = [
  { id: 'm1', title: 'Backtest momentum v2.4 (semis)', progress: 0.62 },
  { id: 'm2', title: 'Dream-replay 2023-03-13', progress: 0.88 },
  { id: 'm3', title: 'Causal audit — VIX regime', progress: 0.31 },
];

export const initialAlerts: Alert[] = [
  { id: 'a1', time: '14:21', level: 'info', message: 'Regime shift: LOW_VOL_BULL → HIGH_VOL_BULL' },
  { id: 'a2', time: '14:18', level: 'warning', message: 'Eris war-game score delta: +3.2%' },
  { id: 'a3', time: '14:04', level: 'info', message: 'Principle published: momentum decay in high VIX' },
];

export const initialApprovals: Approval[] = [
  { id: 'p1', title: 'Approve new strategy: carry-signal-03', description: 'passed CPCV + DSR' },
  { id: 'p2', title: 'Confirm parameter change', description: 'VIX threshold 30 → 28' },
];

// Connection map per whitepaper §2.2.
export const connections: Array<[string, string]> = [
  ['aletheia', 'mnemosyne'],
  ['aletheia', 'prometheus'],
  ['aletheia', 'agora'],
  ['aletheia', 'chronos'],
  ['aletheia', 'iris'],
  ['mnemosyne', 'prometheus'],
  ['hephaestus', 'aletheia'],
  ['themis', 'aletheia'],
  ['narcissus', 'aletheia'],
  ['eris', 'aletheia'],
  ['janus', 'agora'],
];
