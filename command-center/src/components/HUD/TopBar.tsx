'use client';

// Spec §10.1 — Top bar, 56px, full-width, z-10.
// Left: ORUX AGENT COMMAND logo (Cinzel gold). Center: connection-state
// indicator + SIMULATION/REAL-TIME pills (functional in Phase C) + search.
// Right: UTC time + Owner crown.

import { Crown, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useEcosystemStore } from '@/store/ecosystemStore';
import type { ConnState } from '@/lib/nats-client';

function fmtUtc(t: number): string {
  const d = new Date(t);
  return d.toISOString().slice(11, 19);
}

const STATE_STYLE: Record<ConnState, { color: string; label: string; pulse: boolean }> = {
  connecting: { color: '#FFD166', label: 'CONNECTING', pulse: true },
  connected: { color: '#4ECDC4', label: 'LIVE', pulse: true },
  disconnected: { color: '#6C757D', label: 'OFFLINE', pulse: false },
  error: { color: '#E63946', label: 'ERROR', pulse: true },
};

export function TopBar() {
  // Start empty to avoid server-rendered Date.now() mismatching the
  // client's mount time (hydration warning).
  const [utc, setUtc] = useState<string>('');
  const mode = useEcosystemStore((s) => s.mode);
  const setMode = useEcosystemStore((s) => s.setMode);
  const natsState = useEcosystemStore((s) => s.natsState);
  const counters = useEcosystemStore((s) => s.counters);
  const liveAgents = useEcosystemStore((s) => s.liveAgents);

  useEffect(() => {
    setUtc(fmtUtc(Date.now()));
    const id = setInterval(() => setUtc(fmtUtc(Date.now())), 1000);
    return () => clearInterval(id);
  }, []);

  // In simulation mode the banner shows SIMULATION instead of the real
  // NATS connection state.
  const effState: ConnState = mode === 'simulation' ? 'connected' : natsState;
  const statusMeta = STATE_STYLE[effState];
  const label = mode === 'simulation' ? 'SIM' : statusMeta.label;

  // Live-agent count (heartbeat seen in last 5 s)
  const now = Date.now();
  const liveCount = Object.values(liveAgents).filter((t) => now - t < 5000).length;

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
          <span
            className={`w-2 h-2 rounded-full ${statusMeta.pulse ? 'pulse-dot' : ''}`}
            style={{ background: statusMeta.color }}
          />
          <span
            className="font-mono text-[11px] tracking-[0.2em]"
            style={{ color: statusMeta.color }}
          >
            {label}
          </span>
        </div>

        {/* Live counters (real-time only) */}
        {mode === 'real-time' && (
          <div className="flex items-center gap-3 font-mono text-[10px] text-ash-grey tracking-wider">
            <Stat color="#00F5D4" label="DATA" value={counters.MARKET_DATA} />
            <Stat color="#4ECDC4" label="SIG" value={counters.SIGNAL + counters.BLENDED} />
            <Stat color="#FFD166" label="ORD" value={counters.ORDER} />
            <Stat color="#4ECDC4" label="FILL" value={counters.FILL} />
            <Stat color="#F8F9FA" label="HB" value={counters.HEARTBEAT} />
            <Stat color="#FFD166" label="AGENTS" value={liveCount} />
          </div>
        )}

        {/* Mode pills */}
        <div className="flex items-center rounded-full border border-[rgba(42,42,62,0.8)] bg-[rgba(10,10,15,0.6)] overflow-hidden">
          <button
            onClick={() => setMode('simulation')}
            className={`px-3 py-1 text-[10px] tracking-[0.18em] font-mono transition-colors ${
              mode === 'simulation'
                ? 'text-solar-gold bg-[rgba(255,209,102,0.1)]'
                : 'text-ash-grey hover:text-lunar-silver'
            }`}
          >
            SIMULATION
          </button>
          <button
            onClick={() => setMode('real-time')}
            className={`px-3 py-1 text-[10px] tracking-[0.18em] font-mono transition-colors ${
              mode === 'real-time'
                ? 'text-verdigris bg-[rgba(78,205,196,0.1)]'
                : 'text-ash-grey hover:text-lunar-silver'
            }`}
          >
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

function Stat({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className="flex items-center gap-1">
      <span style={{ color }}>{label}</span>
      <span className="text-lunar-silver">{fmtCount(value)}</span>
    </div>
  );
}

function fmtCount(n: number): string {
  if (n < 1000) return n.toString();
  if (n < 1_000_000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
}
