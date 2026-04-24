// Zustand store per docs/COMMAND_CENTER.md §12.1, extended with live-bus
// integration (Phase C) — mode toggle, live agent heartbeats, per-kind
// event counters driving the HUD stats, and activity-pulse broadcasts.

'use client';

import { create } from 'zustand';
import type { CityData, TimelineEntry, SystemHealth, Mission, Alert, Approval } from '@/types';
import type { ConnState, MessageKind } from '@/lib/nats-client';
import {
  initialCities,
  initialSystemHealth,
  initialMissions,
  initialAlerts,
  initialApprovals,
} from '@/data/mockData';

export type EcosystemMode = 'simulation' | 'real-time';

export interface LiveCounters {
  MARKET_DATA: number;
  SIGNAL: number;
  BLENDED: number;
  ORDER: number;
  FILL: number;
  RISK_OVERRIDE: number;
  TIME_TICK: number;
  HEARTBEAT: number;
  EXECUTIVE_DIRECTIVE: number;
  KNOWLEDGE_PUBLICATION: number;
  OTHER: number;
  TOTAL: number;
}

interface EcosystemStore {
  cities: CityData[];
  selectedCityId: string | null;
  currentTime: number;
  timeline: TimelineEntry[];
  health: SystemHealth;
  missions: Mission[];
  alerts: Alert[];
  approvals: Approval[];

  // --- Phase C (live NATS) ---
  mode: EcosystemMode;
  natsState: ConnState;
  liveAgents: Record<string, number>;         // agent_id -> last-heartbeat ms
  counters: LiveCounters;
  activityPulses: Record<string, number>;     // cityId -> expiration ms

  selectCity: (id: string | null) => void;
  updateCity: (id: string, patch: Partial<CityData>) => void;
  appendTimeline: (entry: TimelineEntry) => void;
  tick: (nowMs: number) => void;
  setHealth: (h: SystemHealth) => void;

  setMode: (m: EcosystemMode) => void;
  setNatsState: (s: ConnState) => void;
  noteHeartbeat: (agentId: string, tsMs: number) => void;
  bumpCounter: (kind: MessageKind) => void;
  pulseCity: (cityId: string, untilMs: number) => void;
}

const TIMELINE_CAP = 60;

const ZERO_COUNTERS: LiveCounters = {
  MARKET_DATA: 0,
  SIGNAL: 0,
  BLENDED: 0,
  ORDER: 0,
  FILL: 0,
  RISK_OVERRIDE: 0,
  TIME_TICK: 0,
  HEARTBEAT: 0,
  EXECUTIVE_DIRECTIVE: 0,
  KNOWLEDGE_PUBLICATION: 0,
  OTHER: 0,
  TOTAL: 0,
};

export const useEcosystemStore = create<EcosystemStore>((set) => ({
  cities: initialCities,
  selectedCityId: null,
  currentTime: Date.now(),
  timeline: [],
  health: initialSystemHealth,
  missions: initialMissions,
  alerts: initialAlerts,
  approvals: initialApprovals,

  mode: 'real-time',
  natsState: 'connecting',
  liveAgents: {},
  counters: ZERO_COUNTERS,
  activityPulses: {},

  selectCity: (id) => set({ selectedCityId: id }),

  updateCity: (id, patch) =>
    set((s) => ({
      cities: s.cities.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    })),

  appendTimeline: (entry) =>
    set((s) => {
      const next = [entry, ...s.timeline];
      if (next.length > TIMELINE_CAP) next.length = TIMELINE_CAP;
      return { timeline: next };
    }),

  tick: (nowMs) => set({ currentTime: nowMs }),

  setHealth: (h) => set({ health: h }),

  setMode: (mode) => set({ mode }),
  setNatsState: (natsState) => set({ natsState }),

  noteHeartbeat: (agentId, tsMs) =>
    set((s) => ({
      liveAgents: { ...s.liveAgents, [agentId]: tsMs },
    })),

  bumpCounter: (kind) =>
    set((s) => {
      const c = { ...s.counters };
      c[kind] = (c[kind] ?? 0) + 1;
      c.TOTAL += 1;
      return { counters: c };
    }),

  pulseCity: (cityId, untilMs) =>
    set((s) => ({
      activityPulses: { ...s.activityPulses, [cityId]: untilMs },
    })),
}));
