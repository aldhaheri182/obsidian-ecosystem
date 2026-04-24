// Types strictly per docs/COMMAND_CENTER.md §12.1.

export type CityStatus = 'healthy' | 'degraded' | 'critical' | 'dreaming';

export type AgentStatus = 'active' | 'sleeping' | 'error' | 'retired';

export type LogLevel = 'info' | 'warning' | 'error';

export type SignalDirection = 'BUY' | 'SELL' | 'HOLD';

export type ChamberArchetype =
  | 'trading_floor' // Aletheia
  | 'library'       // Mnemosyne
  | 'lab'           // Prometheus
  | 'forge'         // Hephaestus
  | 'court'         // Themis
  | 'port'          // Agora
  | 'observatory'   // Iris
  | 'clocktower'    // Chronos
  | 'mirror'        // Narcissus
  | 'inverse'       // Eris
  | 'bridge';       // Janus

export interface LogEntry {
  time: string;
  message: string;
  level: LogLevel;
}

export interface Signal {
  symbol: string;
  direction: SignalDirection;
  confidence: number;
}

export interface AgentData {
  id: string;
  name: string;
  role: string;
  status: AgentStatus;
  task: string;
  performance: number[];
  position_in_chamber: [number, number, number];
}

export interface CityMetrics {
  cpu: number;
  memory: number;
  risk: number;
  sharpe?: number;
}

export interface CityData {
  id: string;
  name: string;
  color: string;
  accentColor: string;
  archetype: ChamberArchetype;
  status: CityStatus;
  agents: AgentData[];
  metrics: CityMetrics;
  logs: LogEntry[];
  signals?: Signal[];
  position: [number, number, number];
  rotation: number;
}

export interface TimelineEntry {
  time: string;
  cityId: string;
  cityColor: string;
  text: string;
}

export interface Mission {
  id: string;
  title: string;
  progress: number; // 0..1
}

export interface Alert {
  id: string;
  time: string;
  level: LogLevel;
  message: string;
}

export interface Approval {
  id: string;
  title: string;
  description: string;
}

export interface SystemHealth {
  cpu: number;
  memory: number;
  disk: number;
  network: number;
}
