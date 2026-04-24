'use client';

// Spec §10.4 + §11 — City detail slide-in panel on click.
// Framer Motion spring from right, width 420px, on top of right sidebar.

import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { useEcosystemStore } from '@/store/ecosystemStore';

export function CityDetailPanel() {
  const selectedCityId = useEcosystemStore((s) => s.selectedCityId);
  const cities = useEcosystemStore((s) => s.cities);
  const selectCity = useEcosystemStore((s) => s.selectCity);
  const mode = useEcosystemStore((s) => s.mode);
  const liveAgents = useEcosystemStore((s) => s.liveAgents);

  const city = cities.find((c) => c.id === selectedCityId) ?? null;

  function liveInCity(cityId: string): number {
    if (!city) return 0;
    const now = Date.now();
    return city.agents.filter(
      (a) => liveAgents[a.id] !== undefined && now - liveAgents[a.id] < 5000,
    ).length;
  }

  return (
    <AnimatePresence>
      {city && (
        <motion.aside
          key={city.id}
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', stiffness: 100, damping: 20 }}
          className="fixed top-14 right-0 bottom-10 w-[420px] z-20 overflow-y-auto
            bg-[rgba(12,14,26,0.94)] backdrop-blur-2xl border-l border-[rgba(42,42,62,0.6)]"
          style={{
            pointerEvents: 'auto',
            boxShadow: `inset 0 0 60px ${city.accentColor}22, 0 0 32px rgba(0,0,0,0.5)`,
          }}
        >
          <header className="sticky top-0 bg-[rgba(12,14,26,0.95)] border-b border-[rgba(42,42,62,0.5)] p-4 flex items-center justify-between z-10">
            <div>
              <div className="text-[10px] font-mono tracking-[0.3em] text-ash-grey">CITY</div>
              <h2 className="font-ceremonial text-2xl" style={{ color: city.accentColor, textShadow: `0 0 12px ${city.accentColor}88` }}>
                {city.name}
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={city.status} accent={city.accentColor} />
              <button
                onClick={() => selectCity(null)}
                className="w-8 h-8 rounded-md border border-[rgba(42,42,62,0.6)] bg-[rgba(18,22,36,0.5)] flex items-center justify-center hover:border-solar-gold transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* Risk gauge */}
          <section className="p-4 border-b border-[rgba(42,42,62,0.3)]">
            <div className="text-[10px] font-mono tracking-[0.25em] text-ash-grey mb-2">RISK LEVEL</div>
            <div className="h-2 bg-[rgba(255,255,255,0.06)] rounded overflow-hidden">
              <div
                className="h-full transition-all"
                style={{
                  width: `${city.metrics.risk}%`,
                  background:
                    city.metrics.risk > 70
                      ? '#E63946'
                      : city.metrics.risk > 40
                      ? '#FF6B35'
                      : '#4ECDC4',
                  boxShadow: `0 0 8px ${
                    city.metrics.risk > 70 ? '#E63946' : city.metrics.risk > 40 ? '#FF6B35' : '#4ECDC4'
                  }`,
                }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-mono text-ash-grey mt-1">
              <span>CPU {city.metrics.cpu.toFixed(0)}%</span>
              <span>MEM {city.metrics.memory.toFixed(0)}%</span>
              {city.metrics.sharpe !== undefined && (
                <span>SHARPE {city.metrics.sharpe.toFixed(2)}</span>
              )}
            </div>
          </section>

          {/* Agent roster */}
          <section className="p-4 border-b border-[rgba(42,42,62,0.3)]">
            <div className="text-[10px] font-mono tracking-[0.25em] text-ash-grey mb-3 flex items-center justify-between">
              <span>AGENT ROSTER</span>
              {mode === 'real-time' && (
                <span className="text-[9px] text-cyan-aurora">
                  ● LIVE ({liveInCity(city.id)}/{city.agents.length} seen &lt; 5 s)
                </span>
              )}
            </div>
            {city.agents.map((a) => {
              const liveTs = liveAgents[a.id];
              const isLive = mode === 'real-time' && liveTs && Date.now() - liveTs < 5000;
              return (
              <div key={a.id} className="flex items-center gap-3 py-2 border-b border-[rgba(42,42,62,0.2)] last:border-0">
                <StatusDot status={isLive ? 'active' : a.status} />
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-mono truncate flex items-center gap-2">
                    <span>{a.name}</span>
                    {isLive && (
                      <span className="text-[8px] tracking-widest text-cyan-aurora">HEARTBEAT</span>
                    )}
                  </div>
                  <div className="text-[9px] text-ash-grey tracking-wider truncate">{a.role} • {a.task}</div>
                </div>
                <div className="w-[70px] h-[24px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={a.performance.map((v, i) => ({ i, v }))}>
                      <Line
                        type="monotone"
                        dataKey="v"
                        stroke={city.accentColor}
                        strokeWidth={1.2}
                        dot={false}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              );
            })}
          </section>

          {/* Signals (only if present) */}
          {city.signals && city.signals.length > 0 && (
            <section className="p-4 border-b border-[rgba(42,42,62,0.3)]">
              <div className="text-[10px] font-mono tracking-[0.25em] text-ash-grey mb-3">LIVE SIGNALS</div>
              {city.signals.map((s) => (
                <div key={s.symbol} className="flex items-center gap-3 py-1.5">
                  <span className="font-mono text-[12px] w-14">{s.symbol}</span>
                  <span
                    className={`font-mono text-[10px] w-10 ${
                      s.direction === 'BUY' ? 'text-verdigris' : s.direction === 'SELL' ? 'text-ember' : 'text-ash-grey'
                    }`}
                  >
                    {s.direction}
                  </span>
                  <div className="flex-1 h-1 bg-[rgba(255,255,255,0.06)] rounded overflow-hidden">
                    <div
                      className="h-full"
                      style={{
                        width: `${s.confidence * 100}%`,
                        background: city.accentColor,
                        boxShadow: `0 0 4px ${city.accentColor}`,
                      }}
                    />
                  </div>
                  <span className="font-mono text-[10px] text-ash-grey w-8 text-right">
                    {(s.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </section>
          )}

          {/* Logs terminal */}
          <section className="p-4">
            <div className="text-[10px] font-mono tracking-[0.25em] text-ash-grey mb-2">RECENT LOGS</div>
            <div className="font-mono text-[10px] bg-[rgba(0,0,0,0.5)] border border-[rgba(42,42,62,0.4)] rounded p-2 space-y-0.5">
              {city.logs.map((l, i) => (
                <div
                  key={i}
                  className={
                    l.level === 'error'
                      ? 'text-crimson-forge'
                      : l.level === 'warning'
                      ? 'text-ember'
                      : 'text-cyan-aurora/80'
                  }
                >
                  <span className="text-ash-grey">[{l.time}]</span> {l.message}
                </div>
              ))}
            </div>
          </section>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

function StatusBadge({ status, accent }: { status: string; accent: string }) {
  const colorMap: Record<string, string> = {
    healthy: '#4ECDC4',
    degraded: '#FF6B35',
    critical: '#E63946',
    dreaming: '#7209B7',
  };
  const c = colorMap[status] ?? accent;
  return (
    <span
      className="text-[9px] font-mono px-2 py-1 rounded-full tracking-widest"
      style={{ background: `${c}22`, color: c, border: `1px solid ${c}55` }}
    >
      {status.toUpperCase()}
    </span>
  );
}

function StatusDot({ status }: { status: string }) {
  const m: Record<string, string> = {
    active: '#4ECDC4',
    sleeping: '#7209B7',
    error: '#E63946',
    retired: '#6C757D',
  };
  const c = m[status] ?? '#6C757D';
  return <span className="w-2 h-2 rounded-full pulse-dot shrink-0" style={{ background: c, boxShadow: `0 0 4px ${c}` }} />;
}
