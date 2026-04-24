'use client';

// Zustand store for the OpenClaw playable world.
// Tracks player position, nearest terminal, opened panel, and log scroll.

import { create } from 'zustand';

export interface LogEntry {
  time: string;
  room: string;
  message: string;
}

export interface Mission {
  id: string;
  title: string;
  hint: string;
  progress: number;
}

interface OpenClawStore {
  // player
  playerPos: [number, number, number];
  playerFacing: number;           // yaw in radians
  setPlayerPos: (p: [number, number, number]) => void;
  setPlayerFacing: (yaw: number) => void;

  // interaction
  nearestRoomId: string | null;
  openPanelRoomId: string | null;
  setNearest: (id: string | null) => void;
  openPanel: (id: string | null) => void;

  // minimap target (optional click-zoom later)
  targetRoomId: string | null;
  setTargetRoom: (id: string | null) => void;

  // live log + missions
  log: LogEntry[];
  pushLog: (e: LogEntry) => void;
  missions: Mission[];
  updateMission: (id: string, patch: Partial<Mission>) => void;
}

const LOG_CAP = 30;

// Dev-time: expose the store + a teleport helper on window for manual
// smoke testing (e.g. `__opx.teleport('treasury')`). SSR-guarded.
declare global {
  interface Window {
    __opx?: {
      state: () => ReturnType<typeof useOpenClawStore.getState>;
      teleport: (roomId: string) => void;
    };
  }
}

const MISSIONS_INIT: Mission[] = [
  { id: 'm1', title: 'Walk to Risk Gate', hint: 'Use WASD / arrows. Press E at the terminal.', progress: 0 },
  { id: 'm2', title: 'Approve a liquidity release at Treasury', hint: 'Gold room on the far left.', progress: 0 },
  { id: 'm3', title: 'Review pending owner approval', hint: 'White room, far right bottom.', progress: 0 },
];

export const useOpenClawStore = create<OpenClawStore>((set) => ({
  playerPos: [0, 0, 0],
  playerFacing: 0,
  setPlayerPos: (p) => set({ playerPos: p }),
  setPlayerFacing: (yaw) => set({ playerFacing: yaw }),

  nearestRoomId: null,
  openPanelRoomId: null,
  setNearest: (id) => set({ nearestRoomId: id }),
  openPanel: (id) => set({ openPanelRoomId: id }),

  targetRoomId: null,
  setTargetRoom: (id) => set({ targetRoomId: id }),

  log: [
    { time: '00:00:00', room: 'system', message: 'OpenClaw Command — boot OK. Walk with WASD. Press E to interact.' },
  ],
  pushLog: (e) =>
    set((s) => {
      const next = [e, ...s.log];
      if (next.length > LOG_CAP) next.length = LOG_CAP;
      return { log: next };
    }),
  missions: MISSIONS_INIT,
  updateMission: (id, patch) =>
    set((s) => ({
      missions: s.missions.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    })),
}));
