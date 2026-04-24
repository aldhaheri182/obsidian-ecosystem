'use client';

import { useOpenClawStore } from '@/store/openclawStore';
import { Target } from 'lucide-react';

export function MissionPanel() {
  const missions = useOpenClawStore((s) => s.missions);

  return (
    <aside
      className="fixed right-4 top-20 w-[300px] z-20
        bg-[rgba(10,14,26,0.78)] backdrop-blur-xl
        border border-[rgba(78,205,196,0.22)] rounded-lg
        text-lunar-silver"
      style={{ pointerEvents: 'auto' }}
    >
      <header className="px-3.5 py-2.5 border-b border-[rgba(255,255,255,0.07)] flex items-center gap-2">
        <Target className="w-3.5 h-3.5 text-solar-gold" />
        <span className="font-mono text-[10px] tracking-[0.3em] text-solar-gold">MISSION TRACKER</span>
      </header>
      <ul className="p-3 space-y-3">
        {missions.map((m) => (
          <li key={m.id}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-mono text-ghost-white">{m.title}</span>
              <span className="text-[9px] font-mono text-cyan-aurora">
                {Math.round(m.progress * 100)}%
              </span>
            </div>
            <div className="text-[9px] font-mono text-ash-grey leading-tight mb-1.5">{m.hint}</div>
            <div className="h-1 bg-[rgba(255,255,255,0.06)] rounded overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-verdigris to-cyan-aurora"
                style={{
                  width: `${m.progress * 100}%`,
                  boxShadow: '0 0 6px rgba(0,245,212,0.5)',
                }}
              />
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
}
