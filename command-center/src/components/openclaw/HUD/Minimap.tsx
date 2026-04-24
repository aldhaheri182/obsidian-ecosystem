'use client';

import { ROOMS, WORLD_BOUNDS } from '@/data/openclawRooms';
import { useOpenClawStore } from '@/store/openclawStore';

const MINI_W = 220;
const MINI_H = 150;

function xNorm(x: number) {
  return ((x - WORLD_BOUNDS.minX) / (WORLD_BOUNDS.maxX - WORLD_BOUNDS.minX)) * MINI_W;
}
function zNorm(z: number) {
  return ((z - WORLD_BOUNDS.minZ) / (WORLD_BOUNDS.maxZ - WORLD_BOUNDS.minZ)) * MINI_H;
}

export function Minimap() {
  const playerPos = useOpenClawStore((s) => s.playerPos);
  const openPanelRoomId = useOpenClawStore((s) => s.openPanelRoomId);
  const nearestRoomId = useOpenClawStore((s) => s.nearestRoomId);

  const px = xNorm(playerPos[0]);
  const pz = zNorm(playerPos[2]);

  return (
    <div
      className="fixed right-4 top-[360px] z-20 rounded-lg overflow-hidden
        bg-[rgba(10,14,26,0.8)] backdrop-blur-xl border border-[rgba(78,205,196,0.22)]"
      style={{ pointerEvents: 'auto' }}
    >
      <header className="px-3 pt-2 pb-1 flex items-center gap-2">
        <span className="font-mono text-[9px] tracking-[0.3em] text-solar-gold">MINIMAP</span>
        <span className="ml-auto font-mono text-[8px] text-ash-grey tabular-nums">
          x {playerPos[0].toFixed(1)}  z {playerPos[2].toFixed(1)}
        </span>
      </header>
      <svg
        width={MINI_W}
        height={MINI_H}
        viewBox={`0 0 ${MINI_W} ${MINI_H}`}
        className="block mx-2 mb-2 rounded"
        style={{ background: 'rgba(0,0,0,0.35)' }}
      >
        {/* Grid */}
        {Array.from({ length: 10 }).map((_, i) => (
          <line
            key={`gx-${i}`}
            x1={(i * MINI_W) / 10}
            x2={(i * MINI_W) / 10}
            y1={0}
            y2={MINI_H}
            stroke="#1a2b3c"
          />
        ))}
        {Array.from({ length: 6 }).map((_, i) => (
          <line
            key={`gz-${i}`}
            x1={0}
            x2={MINI_W}
            y1={(i * MINI_H) / 6}
            y2={(i * MINI_H) / 6}
            stroke="#1a2b3c"
          />
        ))}
        {/* Rooms */}
        {ROOMS.map((r) => {
          const cx = xNorm(r.center[0]);
          const cz = zNorm(r.center[1]);
          const w = (r.size[0] / (WORLD_BOUNDS.maxX - WORLD_BOUNDS.minX)) * MINI_W;
          const h = (r.size[1] / (WORLD_BOUNDS.maxZ - WORLD_BOUNDS.minZ)) * MINI_H;
          const active = nearestRoomId === r.id || openPanelRoomId === r.id;
          return (
            <g key={r.id}>
              <rect
                x={cx - w / 2}
                y={cz - h / 2}
                width={w}
                height={h}
                fill={`${r.accent}33`}
                stroke={r.accent}
                strokeWidth={active ? 2 : 1}
                rx={2}
                style={{ filter: active ? `drop-shadow(0 0 4px ${r.accent})` : undefined }}
              />
            </g>
          );
        })}
        {/* Player */}
        <circle cx={px} cy={pz} r={4} fill="#00F5D4" stroke="#0a0a0f" strokeWidth={1}>
          <animate attributeName="r" values="4;6;4" dur="1.5s" repeatCount="indefinite" />
        </circle>
      </svg>
    </div>
  );
}
