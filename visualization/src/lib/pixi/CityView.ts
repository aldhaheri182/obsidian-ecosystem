// ============================================================================
// visualization/src/lib/pixi/CityView.ts
// Single-city (Aletheia) PixiJS renderer for M0.
// - Draws the 6 M0 agents as labeled nodes in their districts.
// - Animates message packets traveling along the pipeline edges.
// - Colors agent status based on heartbeat freshness.
// ============================================================================

import { Application, Container, Graphics, Text, TextStyle } from "pixi.js";
import type { DisplayMessage } from "../nats-client";

const NODES = [
  { id: "time-oracle-01",            x: 120, y:  80, label: "Chronos\ntime-oracle" },
  { id: "collector-equities-csv-01", x: 120, y: 220, label: "Collector\n(CSV)" },
  { id: "momentum-signal-01",        x: 340, y: 220, label: "Momentum\nsignal" },
  { id: "signal-blender-01",         x: 560, y: 220, label: "Blender" },
  { id: "paper-executor-01",         x: 780, y: 220, label: "Paper\nexecutor" },
  { id: "risk-overlord-01",          x: 560, y: 420, label: "Risk\nOverlord" },
];

const EDGES: [string, string][] = [
  ["collector-equities-csv-01", "momentum-signal-01"],
  ["momentum-signal-01",        "signal-blender-01"],
  ["signal-blender-01",         "paper-executor-01"],
  ["paper-executor-01",         "risk-overlord-01"],
  ["risk-overlord-01",          "paper-executor-01"],  // feedback
];

type NodeSprite = {
  id: string;
  container: Container;
  ring: Graphics;
  lastHeartbeat: number;
  x: number;
  y: number;
};

type Packet = {
  g: Graphics;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  t: number;
  ttl: number;
  color: number;
};

export class CityView {
  private app: Application;
  private nodes = new Map<string, NodeSprite>();
  private edgeLayer: Graphics;
  private packetLayer: Container;
  private packets: Packet[] = [];

  constructor(parent: HTMLElement) {
    this.app = new Application();
    this.edgeLayer = new Graphics();
    this.packetLayer = new Container();
    this.bootstrap(parent).catch(console.error);
  }

  private async bootstrap(parent: HTMLElement) {
    await this.app.init({
      background: "#0a0a12",
      resizeTo: parent,
      antialias: true,
    });
    parent.appendChild(this.app.canvas);

    this.app.stage.addChild(this.edgeLayer);
    this.drawEdges();

    for (const n of NODES) {
      const sprite = this.buildNode(n);
      this.nodes.set(n.id, sprite);
      this.app.stage.addChild(sprite.container);
    }

    this.app.stage.addChild(this.packetLayer);
    this.app.ticker.add(() => this.tick());
  }

  private drawEdges() {
    this.edgeLayer.clear();
    this.edgeLayer.setStrokeStyle({ width: 1, color: 0x2a2a3a, alpha: 1 });
    for (const [a, b] of EDGES) {
      const na = NODES.find((n) => n.id === a)!;
      const nb = NODES.find((n) => n.id === b)!;
      this.edgeLayer.moveTo(na.x, na.y);
      this.edgeLayer.lineTo(nb.x, nb.y);
    }
    this.edgeLayer.stroke();
  }

  private buildNode(n: (typeof NODES)[number]): NodeSprite {
    const container = new Container();
    container.x = n.x;
    container.y = n.y;

    const ring = new Graphics();
    ring.circle(0, 0, 22).fill({ color: 0x15151f }).stroke({ width: 2, color: 0x888899 });
    container.addChild(ring);

    const style = new TextStyle({
      fill: 0xe0e0e8,
      fontSize: 11,
      fontFamily: "-apple-system, Segoe UI, sans-serif",
      align: "center",
    });
    const label = new Text({ text: n.label, style });
    label.anchor.set(0.5, 0);
    label.y = 26;
    container.addChild(label);

    return { id: n.id, container, ring, lastHeartbeat: 0, x: n.x, y: n.y };
  }

  onMessage(msg: DisplayMessage): void {
    if (msg.type === "HEARTBEAT") {
      const id = msg.topic.split(".").slice(2).join(".");
      const node = this.nodes.get(id);
      if (node) {
        node.lastHeartbeat = Date.now();
      }
      return;
    }
    // Spawn a packet along the appropriate edge.
    const edge = this.edgeForMessage(msg);
    if (edge) this.spawnPacket(edge[0], edge[1], packetColor(msg.type));
  }

  private edgeForMessage(msg: DisplayMessage): [string, string] | null {
    if (msg.topic.startsWith("aletheia.data.")) {
      return ["collector-equities-csv-01", "momentum-signal-01"];
    }
    if (msg.topic.startsWith("aletheia.trading_floor.")) {
      return ["momentum-signal-01", "signal-blender-01"];
    }
    if (msg.topic === "aletheia.portfolio.blended_alpha") {
      return ["signal-blender-01", "paper-executor-01"];
    }
    if (msg.topic === "aletheia.execution.order_request") {
      return ["paper-executor-01", "risk-overlord-01"];
    }
    if (msg.topic === "aletheia.execution.fill_report") {
      return ["paper-executor-01", "risk-overlord-01"];
    }
    if (msg.topic === "risk.override.all") {
      return ["risk-overlord-01", "paper-executor-01"];
    }
    return null;
  }

  private spawnPacket(fromId: string, toId: string, color: number): void {
    const a = this.nodes.get(fromId);
    const b = this.nodes.get(toId);
    if (!a || !b) return;
    const g = new Graphics();
    g.circle(0, 0, 4).fill({ color });
    this.packetLayer.addChild(g);
    this.packets.push({
      g,
      fromX: a.x,
      fromY: a.y,
      toX: b.x,
      toY: b.y,
      t: 0,
      ttl: 60, // ~1s at 60fps
      color,
    });
  }

  private tick(): void {
    // Animate packets.
    this.packets = this.packets.filter((p) => {
      p.t += 1;
      const f = Math.min(1, p.t / p.ttl);
      p.g.x = p.fromX + (p.toX - p.fromX) * f;
      p.g.y = p.fromY + (p.toY - p.fromY) * f;
      if (f >= 1) {
        this.packetLayer.removeChild(p.g);
        return false;
      }
      return true;
    });

    // Recolor rings based on heartbeat freshness.
    const now = Date.now();
    for (const node of this.nodes.values()) {
      const age = now - node.lastHeartbeat;
      let color = 0x888899;
      if (node.lastHeartbeat === 0) color = 0x666677;
      else if (age < 3000) color = 0x4caf50;
      else if (age < 10000) color = 0xcf8a00;
      else color = 0xe53935;

      node.ring.clear();
      node.ring.circle(0, 0, 22).fill({ color: 0x15151f }).stroke({ width: 2, color });
    }
  }
}

function packetColor(type: string): number {
  switch (type) {
    case "MARKET_DATA":   return 0xffffff;
    case "SIGNAL":        return 0x4a9eff;
    case "BLENDED":       return 0x7a5cff;
    case "ORDER":         return 0xffcc33;
    case "FILL":          return 0x4caf50;
    case "RISK_OVERRIDE": return 0xe53935;
    case "TIME_TICK":     return 0x888888;
    default:              return 0xaaaaaa;
  }
}
