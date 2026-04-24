/**
 * NATS bus + derived state stores.
 * Wraps the existing NatsBridge to feed cinematic UI consumers.
 */

import { writable, derived } from 'svelte/store';
import type { DisplayMessage } from '../nats-client';

/** Rolling set of heartbeat timestamps per agent_id. */
export const heartbeats = writable<Map<string, number>>(new Map());

/** All agents ever seen on the bus (by agent_id). */
export const agents = writable<
  Map<string, { agentId: string; city: string; role: string; lastSeen: number }>
>(new Map());

/** Recent messages (capped). */
export const recentMessages = writable<DisplayMessage[]>([]);

/** Current rolling P&L (-1..1 range for aurora). Placeholder: computed from
 * FILL_REPORT messages weighted by sign. Real feed lives in Aletheia M2. */
export const pnlIndicator = writable<number>(0);

/** Connection state. */
export type ConnState = 'connecting' | 'connected' | 'disconnected' | 'error';
export const natsState = writable<ConnState>('connecting');

/** Derived: count of agents seen heartbeating in last 5s. */
export const liveAgentCount = derived(heartbeats, ($hb, set) => {
  const now = Date.now();
  let n = 0;
  for (const [, t] of $hb) if (now - t < 5000) n++;
  set(n);
  const interval = setInterval(() => {
    const now = Date.now();
    let n = 0;
    for (const [, t] of $hb) if (now - t < 5000) n++;
    set(n);
  }, 1000);
  return () => clearInterval(interval);
});

/** Log a display message. */
export function logMessage(m: DisplayMessage): void {
  recentMessages.update(list => {
    const next = [...list, m];
    if (next.length > 100) next.splice(0, next.length - 100);
    return next;
  });
  // Update heartbeat map.
  if (m.type === 'HEARTBEAT') {
    const parts = m.topic.split('.');
    const agentId = parts.slice(2).join('.');
    heartbeats.update(map => {
      const next = new Map(map);
      next.set(agentId, Date.now());
      return next;
    });
  }
}
