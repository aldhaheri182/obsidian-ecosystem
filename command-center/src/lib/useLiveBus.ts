'use client';

/**
 * useLiveBus — owns the NatsBridge lifecycle and wires every incoming
 * envelope into the Zustand store. This is the replacement for
 * LiveSimulation.tsx when ``mode === 'real-time'``.
 *
 * Wiring:
 *   HEARTBEAT       → noteHeartbeat(agent_id, now) + pulseCity(city)
 *   MARKET_DATA     → bumpCounter + pulse Aletheia (chamber glow)
 *   SIGNAL          → bumpCounter + pulse Aletheia + timeline entry
 *   BLENDED         → bumpCounter + pulse Aletheia
 *   ORDER           → bumpCounter + pulse Aletheia + timeline entry
 *   FILL            → bumpCounter + pulse Aletheia + timeline entry
 *   RISK_OVERRIDE   → bumpCounter + pulse Aletheia + ALERT timeline
 *   TIME_TICK       → bumpCounter + small pulse on Chronos every 5th tick
 *   other kinds     → bumpCounter, no visual
 */

import { useEffect, useRef } from 'react';
import { NatsBridge, type DisplayEvent } from '@/lib/nats-client';
import { useEcosystemStore } from '@/store/ecosystemStore';

const NATS_URL =
  (process.env.NEXT_PUBLIC_NATS_WS_URL as string | undefined) ?? 'ws://localhost:18080';

const PULSE_MS = 900;
const TIME_TICK_PULSE_EVERY_N = 5;

function fmtTime(ms: number): string {
  return new Date(ms).toISOString().slice(11, 19);
}

export function useLiveBus(enabled: boolean) {
  const bridgeRef = useRef<NatsBridge | null>(null);
  const timeTickCount = useRef(0);

  useEffect(() => {
    if (!enabled) {
      if (bridgeRef.current) {
        bridgeRef.current.close();
        bridgeRef.current = null;
      }
      return;
    }

    const store = useEcosystemStore.getState();
    store.setNatsState('connecting');

    const onEvent = (ev: DisplayEvent) => {
      const s = useEcosystemStore.getState();
      s.bumpCounter(ev.kind);

      // Everything non-heartbeat + non-timetick drives a chamber pulse.
      const visual =
        ev.kind !== 'HEARTBEAT' && ev.kind !== 'TIME_TICK'
          ? true
          : ev.kind === 'TIME_TICK'
          ? (timeTickCount.current = (timeTickCount.current + 1) % TIME_TICK_PULSE_EVERY_N) === 0
          : false;
      if (visual) {
        s.pulseCity(ev.cityId, ev.tsMs + PULSE_MS);
      }

      switch (ev.kind) {
        case 'HEARTBEAT':
          if (ev.agentId) s.noteHeartbeat(ev.agentId, ev.tsMs);
          break;
        case 'MARKET_DATA':
          // Too chatty for the timeline; pulse only.
          break;
        case 'SIGNAL':
        case 'BLENDED':
        case 'ORDER':
        case 'FILL':
        case 'RISK_OVERRIDE':
        case 'EXECUTIVE_DIRECTIVE':
        case 'KNOWLEDGE_PUBLICATION': {
          const city = s.cities.find((c) => c.id === ev.cityId);
          const accent = city?.accentColor ?? '#ffffff';
          const label = labelForKind(ev);
          s.appendTimeline({
            time: fmtTime(ev.tsMs),
            cityId: ev.cityId,
            cityColor: accent,
            text: label,
          });
          break;
        }
        default:
          break;
      }
    };

    const bridge = new NatsBridge(NATS_URL, {
      onState: (state) => useEcosystemStore.getState().setNatsState(state),
      onEvent,
    });
    bridgeRef.current = bridge;
    bridge.connect();

    return () => {
      bridgeRef.current?.close();
      bridgeRef.current = null;
    };
  }, [enabled]);
}

function labelForKind(ev: DisplayEvent): string {
  switch (ev.kind) {
    case 'SIGNAL':
      return `signal emitted${ev.symbol ? ' · ' + ev.symbol : ''}`;
    case 'BLENDED':
      return 'blended alpha';
    case 'ORDER':
      return 'order request';
    case 'FILL':
      return 'fill report';
    case 'RISK_OVERRIDE':
      return '⚠ risk override';
    case 'EXECUTIVE_DIRECTIVE':
      return '◆ directive';
    case 'KNOWLEDGE_PUBLICATION':
      return '✦ principle published';
    default:
      return ev.topic;
  }
}
