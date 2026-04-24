'use client';

// Spec §10.1 — Top bar, 56px, full-width, z-10.
// Left: ORUX AGENT COMMAND logo (Cinzel gold). Center: pulsing green LIVE dot,
// SIMULATION/REAL-TIME pills, search input. Right: UTC time + crown.

import { Crown, Search } from 'lucide-react';
import { useEffect, useState } from 'react';

function fmtUtc(t: number): string {
  const d = new Date(t);
  return d.toISOString().slice(11, 19);
}

export function TopBar() {
  const [utc, setUtc] = useState<string>(() => fmtUtc(Date.now()));
  useEffect(() => {
    const id = setInterval(() => setUtc(fmtUtc(Date.now())), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header
      className="fixed top-0 left-0 right-0 h-14 z-10 px-5
        bg-[rgba(10,10,15,0.7)] backdrop-blur-xl
        border-b border-[rgba(42,42,62,0.5)]
        flex items-center justify-between text-lunar-silver"
      style={{ pointerEvents: 'auto' }}
    >
      <div className="flex items-center gap-6">
        <div className="font-ceremonial text-solar-gold text-[18px] tracking-[0.25em] drop-shadow-[0_0_12px_rgba(255,209,102,0.5)]">
          ORUX AGENT COMMAND
        </div>
      </div>

      <div className="flex items-center gap-6">
        {/* Status */}
        <div className="flex items-center gap-2">
          <span className="pulse-dot w-2 h-2 rounded-full bg-verdigris" />
          <span className="font-mono text-[11px] tracking-[0.2em] text-verdigris">LIVE</span>
        </div>

        {/* Mode pills */}
        <div className="flex items-center rounded-full border border-[rgba(42,42,62,0.8)] bg-[rgba(10,10,15,0.6)] overflow-hidden">
          <button className="px-3 py-1 text-[10px] tracking-[0.18em] font-mono text-solar-gold bg-[rgba(255,209,102,0.1)]">
            SIMULATION
          </button>
          <button className="px-3 py-1 text-[10px] tracking-[0.18em] font-mono text-ash-grey">
            REAL-TIME
          </button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[rgba(18,22,36,0.6)] border border-[rgba(42,42,62,0.6)]">
          <Search className="w-3.5 h-3.5 text-ash-grey" />
          <input
            placeholder="Find agent, task, signal…"
            className="bg-transparent text-[11px] font-mono text-lunar-silver placeholder:text-ash-grey outline-none w-48"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="font-mono text-[12px] text-lunar-silver tracking-widest">{utc} UTC</div>
        <div
          className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-[rgba(255,209,102,0.45)] bg-[rgba(255,209,102,0.08)]"
          title="Owner Connected"
        >
          <Crown className="w-3.5 h-3.5 text-solar-gold" />
          <span className="text-[10px] font-mono text-solar-gold tracking-wider">OWNER</span>
        </div>
      </div>
    </header>
  );
}
