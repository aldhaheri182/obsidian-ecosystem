// Zustand store per docs/COMMAND_CENTER.md §12.1.

'use client';

import { create } from 'zustand';
import type { CityData, TimelineEntry, SystemHealth, Mission, Alert, Approval } from '@/types';
import {
  initialCities,
  initialSystemHealth,
  initialMissions,
  initialAlerts,
  initialApprovals,
} from '@/data/mockData';

interface EcosystemStore {
  cities: CityData[];
  selectedCityId: string | null;
  currentTime: number;
  timeline: TimelineEntry[];
  health: SystemHealth;
  missions: Mission[];
  alerts: Alert[];
  approvals: Approval[];
  selectCity: (id: string | null) => void;
  updateCity: (id: string, patch: Partial<CityData>) => void;
  appendTimeline: (entry: TimelineEntry) => void;
  tick: (nowMs: number) => void;
  setHealth: (h: SystemHealth) => void;
}

const TIMELINE_CAP = 60;

export const useEcosystemStore = create<EcosystemStore>((set) => ({
  cities: initialCities,
  selectedCityId: null,
  currentTime: Date.now(),
  timeline: [],
  health: initialSystemHealth,
  missions: initialMissions,
  alerts: initialAlerts,
  approvals: initialApprovals,

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
}));
