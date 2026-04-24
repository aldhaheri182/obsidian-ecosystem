'use client';

// Spec §13.2 — Every 2 s: mutate random agent status/task, append logs
// (cap 50), fluctuate metrics within realistic ranges, emit a timeline
// entry. Data-flow orb events are handled by ConnectionLines itself.
//
// Phase C gates this behind `mode === 'simulation'`; when the Owner flips
// the SIMULATION/REAL-TIME pill in the top bar, this hook goes silent and
// useLiveBus takes over.

import { useEffect } from 'react';
import { useEcosystemStore } from '@/store/ecosystemStore';

const SYMBOLS = ['AAPL', 'MSFT', 'NVDA', 'GOOG', 'TSLA', 'AMZN', 'META'];
const VERBS = [
  'BUY signal',
  'SELL signal',
  'blended alpha',
  'PRINCIPLE published',
  'paper fill',
  'risk clear',
  'regime check',
  'dream replay',
  'heartbeat',
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function fmtTime(t: number): string {
  const d = new Date(t);
  return d.toISOString().slice(11, 19);
}

export function LiveSimulation() {
  const mode = useEcosystemStore((x) => x.mode);
  const store = useEcosystemStore;

  useEffect(() => {
    if (mode !== 'simulation') return;
    const iv = setInterval(() => {
      const s = store.getState();
      // Pick a random city + agent + emit an activity record.
      const city = pick(s.cities);
      const agent = pick(city.agents);
      const verb = pick(VERBS);
      const sym = pick(SYMBOLS);
      const conf = (0.5 + Math.random() * 0.5).toFixed(2);
      const text = `${agent.name}: ${verb} ${sym} ${conf}`;
      s.appendTimeline({
        time: fmtTime(Date.now()),
        cityId: city.id,
        cityColor: city.accentColor,
        text,
      });

      // Fluctuate one city's metrics in bounded random walk.
      const targetMetrics = {
        cpu: clamp(city.metrics.cpu + (Math.random() - 0.5) * 8, 5, 98),
        memory: clamp(city.metrics.memory + (Math.random() - 0.5) * 5, 10, 97),
        risk: clamp(city.metrics.risk + (Math.random() - 0.5) * 6, 0, 100),
        sharpe: city.metrics.sharpe,
      };
      // Append log
      const nextLogs = [
        { time: fmtTime(Date.now()), message: text, level: 'info' as const },
        ...city.logs,
      ].slice(0, 12);
      s.updateCity(city.id, { metrics: targetMetrics, logs: nextLogs });

      // Fluctuate global system health
      const h = s.health;
      s.setHealth({
        cpu: clamp(h.cpu + (Math.random() - 0.5) * 3, 20, 92),
        memory: clamp(h.memory + (Math.random() - 0.5) * 2, 30, 92),
        disk: clamp(h.disk + (Math.random() - 0.5) * 0.3, 10, 90),
        network: clamp(h.network + (Math.random() - 0.5) * 5, 20, 98),
      });

      s.tick(Date.now());
    }, 2000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  return null;
}
