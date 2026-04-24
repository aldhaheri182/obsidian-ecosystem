'use client';

import { useOpenClawStore } from '@/store/openclawStore';
import { ROOMS } from '@/data/openclawRooms';
import { Terminal as TerminalIcon } from 'lucide-react';

export function BottomLog() {
  const log = useOpenClawStore((s) => s.log);
  return (
    <footer
      className="fixed bottom-0 left-0 right-0 h-[82px] z-20 pl-4 pr-4 pb-2
        bg-[rgba(6,8,14,0.82)] backdrop-blur-xl border-t border-[rgba(78,205,196,0.15)]"
      style={{ pointerEvents: 'auto' }}
    >
      <div className="flex items-center gap-2 pt-1.5 pb-1">
        <TerminalIcon className="w-3.5 h-3.5 text-verdigris" />
        <span className="font-mono text-[9px] tracking-[0.3em] text-verdigris">TERMINAL LOG</span>
        <span className="ml-auto font-mono text-[8px] tracking-[0.2em] text-ash-grey">
          WASD / ARROWS · E INTERACT · SHIFT RUN · ESC CLOSE
        </span>
      </div>
      <div className="h-[50px] overflow-hidden relative">
        <ul className="font-mono text-[10px] leading-tight">
          {log.slice(0, 6).map((e, i) => {
            const room = ROOMS.find((r) => r.id === e.room);
            const color = room?.accent ?? '#6C757D';
            return (
              <li key={i} className="flex items-center gap-3 opacity-90">
                <span className="text-ash-grey tabular-nums">{e.time}</span>
                <span
                  className="tracking-widest"
                  style={{ color, minWidth: 100 }}
                >
                  {(room?.name ?? e.room).toUpperCase()}
                </span>
                <span className="text-lunar-silver truncate">{e.message}</span>
              </li>
            );
          })}
        </ul>
        <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-[rgba(6,8,14,0.82)] to-transparent pointer-events-none" />
      </div>
    </footer>
  );
}
