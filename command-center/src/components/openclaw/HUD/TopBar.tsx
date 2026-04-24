'use client';

import { Crown, Radio } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useOpenClawStore } from '@/store/openclawStore';
import { ROOMS } from '@/data/openclawRooms';

export function TopBar() {
  const [utc, setUtc] = useState('');
  const openPanelRoomId = useOpenClawStore((s) => s.openPanelRoomId);
  const nearestRoomId = useOpenClawStore((s) => s.nearestRoomId);

  useEffect(() => {
    setUtc(new Date().toISOString().slice(11, 19));
    const id = setInterval(() => setUtc(new Date().toISOString().slice(11, 19)), 1000);
    return () => clearInterval(id);
  }, []);

  const nearestRoom = ROOMS.find((r) => r.id === nearestRoomId);

  return (
    <header
      className="fixed top-0 left-0 right-0 h-14 z-20 px-5
        bg-[rgba(6,8,14,0.75)] backdrop-blur-xl border-b border-[rgba(78,205,196,0.18)]
        flex items-center justify-between text-lunar-silver"
      style={{ pointerEvents: 'auto' }}
    >
      <div className="flex items-center gap-6">
        <div className="font-ceremonial text-solar-gold text-[17px] tracking-[0.3em] drop-shadow-[0_0_12px_rgba(255,209,102,0.5)]">
          ORUX AGENT COMMAND
        </div>
        <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-full border border-verdigris/40 bg-[rgba(78,205,196,0.08)]">
          <span className="pulse-dot w-1.5 h-1.5 rounded-full bg-verdigris" />
          <span className="font-mono text-[10px] tracking-[0.28em] text-verdigris">LIVE</span>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <Stat label="AGENTS" value="12" color="#4ECDC4" />
        <Stat label="MODE" value="REAL-TIME" color="#FFD166" />
        <Stat label="ROOM" value={nearestRoom ? nearestRoom.name.toUpperCase() : '—'} color={nearestRoom?.accent ?? '#6C757D'} />
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <Radio className="w-3.5 h-3.5 text-cyan-aurora" />
          <span className="font-mono text-[10px] text-cyan-aurora tracking-wider">NET OK</span>
        </div>
        <div className="font-mono text-[12px] text-lunar-silver tracking-widest">{utc} UTC</div>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-solar-gold/50 bg-solar-gold/10">
          <Crown className="w-3.5 h-3.5 text-solar-gold" />
          <span className="text-[10px] font-mono text-solar-gold tracking-wider">OWNER</span>
        </div>
      </div>
    </header>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[9px] tracking-[0.3em] text-ash-grey">{label}</span>
      <span
        className="font-mono text-[11px] tracking-[0.18em]"
        style={{ color, textShadow: `0 0 6px ${color}55` }}
      >
        {value}
      </span>
    </div>
  );
}
