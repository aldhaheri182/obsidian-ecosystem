'use client';

// Zustand store for the OpenClaw playable world.
// Tracks player position, nearest terminal, opened panel, log, missions,
// camera mode, discovered rooms, and transient toast notifications.

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

export interface Toast {
  id: string;
  kind: 'discover' | 'agent' | 'info';
  accent: string;
  title: string;
  subtitle?: string;
  startedAt: number;
}

export type CameraMode = 'command' | 'explore';

interface OpenClawStore {
  // player
  playerPos: [number, number, number];
  playerFacing: number;
  setPlayerPos: (p: [number, number, number]) => void;
  setPlayerFacing: (yaw: number) => void;

  // interaction
  nearestRoomId: string | null;
  openPanelRoomId: string | null;
  setNearest: (id: string | null) => void;
  openPanel: (id: string | null) => void;

  targetRoomId: string | null;
  setTargetRoom: (id: string | null) => void;

  // camera mode
  cameraMode: CameraMode;
  setCameraMode: (m: CameraMode) => void;
  toggleCameraMode: () => void;

  // discovery + toasts
  discoveredRooms: Set<string>;
  discoverRoom: (id: string) => void; // idempotent
  toasts: Toast[];
  pushToast: (t: Omit<Toast, 'id' | 'startedAt'>) => void;
  dismissToast: (id: string) => void;

  // log + missions
  log: LogEntry[];
  pushLog: (e: LogEntry) => void;
  missions: Mission[];
  updateMission: (id: string, patch: Partial<Mission>) => void;
}

const LOG_CAP = 30;

// Dev-time: expose the store + a teleport helper on window for manual
// smoke testing. SSR-guarded.
declare global {
  interface Window {
    __opx?: {
      state: () => ReturnType<typeof useOpenClawStore.getState>;
      teleport: (roomId: string) => void;
    };
  }
}

const MISSIONS_INIT: Mission[] = [
  { id: 'm1', title: 'Walk to JANUS — Risk Gate', hint: 'Use WASD / arrows. Press E at the amber room.', progress: 0 },
  { id: 'm2', title: 'Open AGORA Strategy Council', hint: 'Cyan room, top-left.', progress: 0 },
  { id: 'm3', title: 'Review pending Owner approval', hint: 'Gold room, far right bottom.', progress: 0 },
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

  cameraMode: 'explore',
  setCameraMode: (m) => set({ cameraMode: m }),
  toggleCameraMode: () =>
    set((s) => ({ cameraMode: s.cameraMode === 'explore' ? 'command' : 'explore' })),

  discoveredRooms: new Set<string>(),
  discoverRoom: (id) =>
    set((s) => {
      if (s.discoveredRooms.has(id)) return {};
      const next = new Set(s.discoveredRooms);
      next.add(id);
      return { discoveredRooms: next };
    }),

  toasts: [],
  pushToast: (t) =>
    set((s) => ({
      toasts: [
        ...s.toasts,
        { ...t, id: `t-${Date.now()}-${Math.floor(Math.random() * 1000)}`, startedAt: Date.now() },
      ],
    })),
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  log: [
    { time: '00:00:00', room: 'system', message: 'Agent civilisation — boot OK. Walk with WASD. Press E to interact. TAB to toggle camera mode.' },
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
