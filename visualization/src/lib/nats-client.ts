// ============================================================================
// visualization/src/lib/nats-client.ts
// Thin wrapper over `nats.ws` for the browser. Decodes envelopes to a
// lightweight display record — we do NOT try to import the full protobuf
// stack in the browser for M0; we look at the target topic and the raw
// payload length to produce a UI-friendly summary.
// ============================================================================

import { connect, type NatsConnection } from "nats.ws";

export type DisplayMessage = {
  topic: string;
  type: string;
  summary: string;
  ts: number;
};

type Handlers = {
  onState: (state: "connecting" | "connected" | "disconnected" | "error") => void;
  onMessage: (msg: DisplayMessage) => void;
};

export class NatsBridge {
  private nc: NatsConnection | null = null;
  constructor(private url: string, private handlers: Handlers) {}

  async connect(): Promise<void> {
    this.handlers.onState("connecting");
    try {
      this.nc = await connect({ servers: this.url, reconnect: true });
      this.handlers.onState("connected");
      const sub = this.nc.subscribe(">");
      (async () => {
        for await (const m of sub) {
          const t = m.subject;
          const len = m.data.length;
          this.handlers.onMessage({
            topic: t,
            type: classify(t),
            summary: `(${len} B)`,
            ts: Date.now(),
          });
        }
      })().catch(() => this.handlers.onState("error"));
    } catch (e) {
      console.error("NATS connect failed", e);
      this.handlers.onState("error");
      setTimeout(() => this.connect(), 2000);
    }
  }

  async publishRaw(subject: string, data: Uint8Array): Promise<void> {
    if (!this.nc) return;
    this.nc.publish(subject, data);
  }
}

function classify(topic: string): string {
  if (topic.startsWith("system.heartbeat.")) return "HEARTBEAT";
  if (topic.startsWith("aletheia.data.")) return "MARKET_DATA";
  if (topic.startsWith("aletheia.trading_floor.")) return "SIGNAL";
  if (topic === "aletheia.portfolio.blended_alpha") return "BLENDED";
  if (topic === "aletheia.execution.order_request") return "ORDER";
  if (topic === "aletheia.execution.fill_report") return "FILL";
  if (topic === "risk.override.all") return "RISK_OVERRIDE";
  if (topic === "chronos.time.oracle") return "TIME_TICK";
  return "OTHER";
}
