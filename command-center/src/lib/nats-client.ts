/**
 * Thin wrapper over `nats.ws` for the browser. Wire-parsing is intentionally
 * minimal: we classify envelopes by NATS subject (same approach as the v1
 * `visualization/src/lib/nats-client.ts`) and surface a stable
 * `DisplayEvent` shape to the rest of the app.
 *
 * The browser doesn't import the protobuf schemas; the tape-recorder and
 * obsidian-graph do the heavy decoding server-side. If we ever need to
 * expose individual fields in the UI (signal confidence etc.) we can add
 * an envelope header parser — for M0 wiring the subject + length is enough
 * to animate the scene.
 */

import { connect, type NatsConnection, type Subscription } from 'nats.ws';

export type MessageKind =
  | 'MARKET_DATA'
  | 'SIGNAL'
  | 'BLENDED'
  | 'ORDER'
  | 'FILL'
  | 'RISK_OVERRIDE'
  | 'TIME_TICK'
  | 'HEARTBEAT'
  | 'EXECUTIVE_DIRECTIVE'
  | 'KNOWLEDGE_PUBLICATION'
  | 'OTHER';

export interface DisplayEvent {
  topic: string;
  kind: MessageKind;
  cityId: string;
  agentId?: string;
  symbol?: string;
  payloadBytes: number;
  tsMs: number;
}

export type ConnState = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface NatsBridgeHandlers {
  onState(s: ConnState): void;
  onEvent(e: DisplayEvent): void;
}

export class NatsBridge {
  private nc: NatsConnection | null = null;
  private sub: Subscription | null = null;
  private closed = false;

  constructor(
    private readonly url: string,
    private readonly handlers: NatsBridgeHandlers,
  ) {}

  async connect(): Promise<void> {
    if (this.closed) return;
    this.handlers.onState('connecting');
    try {
      this.nc = await connect({ servers: this.url, reconnect: true, maxReconnectAttempts: -1 });
      this.handlers.onState('connected');

      // Subscribe to everything; the Tape gets all traffic by design and
      // the server is already sized for it.
      this.sub = this.nc.subscribe('>');
      (async () => {
        for await (const m of this.sub!) {
          if (this.closed) break;
          const ev = classify(m.subject, m.data.length);
          this.handlers.onEvent(ev);
        }
      })().catch(() => this.handlers.onState('error'));
    } catch (err) {
      console.error('NATS connect failed', err);
      this.handlers.onState('error');
      // nats.ws handles reconnection, but if the initial connect rejects
      // (server not up yet), retry once after 2 s.
      setTimeout(() => {
        if (!this.closed) this.connect();
      }, 2000);
    }
  }

  async close(): Promise<void> {
    this.closed = true;
    try {
      await this.sub?.unsubscribe();
    } catch { /* noop */ }
    try {
      await this.nc?.drain();
    } catch { /* noop */ }
    this.handlers.onState('disconnected');
  }
}

/**
 * Topic → (kind, cityId, agentId?, symbol?)
 *
 * Topic convention from whitepaper §6.4:
 *   {city}.{district}.{building}.{agent_role}.{action}
 *
 * Plus special prefixes for heartbeats and global chronos/risk.
 */
function classify(subject: string, bytes: number): DisplayEvent {
  const ts = Date.now();
  // Heartbeats
  if (subject.startsWith('system.heartbeat.')) {
    const agentId = subject.slice('system.heartbeat.'.length);
    return {
      topic: subject,
      kind: 'HEARTBEAT',
      cityId: cityOfAgent(agentId),
      agentId,
      payloadBytes: bytes,
      tsMs: ts,
    };
  }
  // Chronos time oracle
  if (subject === 'chronos.time.oracle') {
    return {
      topic: subject,
      kind: 'TIME_TICK',
      cityId: 'chronos',
      payloadBytes: bytes,
      tsMs: ts,
    };
  }
  // Aletheia data
  if (subject.startsWith('aletheia.data.us_equities.')) {
    return {
      topic: subject,
      kind: 'MARKET_DATA',
      cityId: 'aletheia',
      symbol: subject.slice('aletheia.data.us_equities.'.length),
      payloadBytes: bytes,
      tsMs: ts,
    };
  }
  // Aletheia signals — e.g. aletheia.trading_floor.momentum.alpha
  if (subject.startsWith('aletheia.trading_floor.')) {
    return {
      topic: subject,
      kind: 'SIGNAL',
      cityId: 'aletheia',
      payloadBytes: bytes,
      tsMs: ts,
    };
  }
  if (subject === 'aletheia.portfolio.blended_alpha') {
    return { topic: subject, kind: 'BLENDED', cityId: 'aletheia', payloadBytes: bytes, tsMs: ts };
  }
  if (subject === 'aletheia.execution.order_request') {
    return { topic: subject, kind: 'ORDER', cityId: 'aletheia', payloadBytes: bytes, tsMs: ts };
  }
  if (subject === 'aletheia.execution.fill_report') {
    return { topic: subject, kind: 'FILL', cityId: 'aletheia', payloadBytes: bytes, tsMs: ts };
  }
  if (subject === 'risk.override.all' || subject.startsWith('risk.override.')) {
    return { topic: subject, kind: 'RISK_OVERRIDE', cityId: 'aletheia', payloadBytes: bytes, tsMs: ts };
  }
  if (subject.startsWith('executive.')) {
    return {
      topic: subject,
      kind: 'EXECUTIVE_DIRECTIVE',
      cityId: subject.split('.')[1] ?? 'aletheia',
      payloadBytes: bytes,
      tsMs: ts,
    };
  }
  if (subject.startsWith('mnemosyne.')) {
    return {
      topic: subject,
      kind: 'KNOWLEDGE_PUBLICATION',
      cityId: 'mnemosyne',
      payloadBytes: bytes,
      tsMs: ts,
    };
  }
  // Generic {city}.* fallback: use the leading segment as the city id
  // if we know it.
  const city = subject.split('.')[0];
  return {
    topic: subject,
    kind: 'OTHER',
    cityId: KNOWN_CITIES.has(city) ? city : 'aletheia',
    payloadBytes: bytes,
    tsMs: ts,
  };
}

const KNOWN_CITIES = new Set([
  'aletheia',
  'mnemosyne',
  'prometheus',
  'hephaestus',
  'themis',
  'agora',
  'iris',
  'chronos',
  'narcissus',
  'eris',
  'janus',
]);

// Best-effort mapping from heartbeat agent_id → city. M0 heartbeats carry
// only the agent_id in the topic; the agent's city isn't encoded on the
// subject. We use a static table of the 6 M0 agents and default to aletheia
// for everything else; when M1 adds per-agent topics carrying the city
// this becomes exact.
function cityOfAgent(agentId: string): string {
  const id = agentId.toLowerCase();
  if (id.startsWith('time-oracle')) return 'chronos';
  if (id.startsWith('memory-keeper') || id.startsWith('archivist') || id.startsWith('semantic-search'))
    return 'mnemosyne';
  if (id.startsWith('hypothesis') || id.startsWith('backtest') || id.startsWith('dream-explorer'))
    return 'prometheus';
  if (id.startsWith('orchestrator') || id.startsWith('security-sentinel')) return 'hephaestus';
  if (id.startsWith('rule-enforcer') || id.startsWith('ethics-')) return 'themis';
  if (id.startsWith('api-gateway') || id.startsWith('broker-') || id.startsWith('news-feed'))
    return 'agora';
  if (id.startsWith('health-monitor') || id.startsWith('anomaly-') || id.startsWith('alert-'))
    return 'iris';
  if (id.startsWith('digital-twin') || id.startsWith('architecture-')) return 'narcissus';
  // M0 agents (collector, momentum, blender, paper-executor, risk-overlord) live in aletheia.
  return 'aletheia';
}
