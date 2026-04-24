/**
 * CityRenderer — isometric Aletheia. Buildings, agents, packets,
 * day/night, weather. Replaces the original CityView.ts.
 *
 * Authorized by: Cinematic UI spec Part III.
 */

import {
  Application,
  Container,
  Graphics,
  Text,
  FillGradient,
} from 'pixi.js';
import { PALETTE, LIFECYCLE_COLOR, MESSAGE_COLOR } from '../tokens/palette';
import type { DisplayMessage } from '../nats-client';

type BuildingSpec = {
  id: string;
  label: string;
  district: string;
  gx: number;  // isometric grid x
  gy: number;  // isometric grid y
  w: number;
  h: number;
  agents: string[];  // agent_ids
  accent: number;
};

const ALETHEIA_BUILDINGS: BuildingSpec[] = [
  { id: 'trading-floor',    label: 'Trading Floor',    district: 'trading',   gx: 0,   gy: 0,  w: 160, h: 120, agents: ['collector-equities-csv-01', 'momentum-signal-01'], accent: PALETTE.verdigris },
  { id: 'momentum-lab',     label: 'Momentum Lab',     district: 'trading',   gx: 180, gy: -20, w: 120, h: 90,  agents: ['momentum-signal-01'], accent: PALETTE.verdigris },
  { id: 'portfolio-control', label: 'Portfolio Control', district: 'portfolio', gx: 0,  gy: 160, w: 140, h: 100, agents: ['signal-blender-01'], accent: PALETTE.cyanAurora },
  { id: 'execution-desk',   label: 'Execution Desk',   district: 'execution', gx: 180, gy: 160, w: 140, h: 90,  agents: ['paper-executor-01'], accent: PALETTE.solarGold },
  { id: 'risk-bunker',      label: 'Risk Bunker',      district: 'risk',      gx: -200, gy: 80, w: 120, h: 110, agents: ['risk-overlord-01'], accent: PALETTE.crimsonForge },
  { id: 'corporate-tower',  label: 'Corporate Tower',  district: 'exec',      gx: 380, gy:  60, w: 120, h: 180, agents: [], accent: PALETTE.solarGold },
];

export class CityRenderer {
  private app!: Application;
  private world!: Container;
  private ground!: Graphics;
  private buildingLayer!: Container;
  private packetLayer!: Container;
  private nightFilter!: Graphics;
  private onBuildingClick?: (id: string) => void;
  private onAgentClick?: (id: string) => void;
  private agentSprites: Map<string, Container> = new Map();
  private agentStatus: Map<string, string> = new Map();

  async mount(
    host: HTMLElement,
    onBuildingClick?: (id: string) => void,
    onAgentClick?: (id: string) => void,
  ): Promise<void> {
    this.onBuildingClick = onBuildingClick;
    this.onAgentClick = onAgentClick;
    this.app = new Application();
    await this.app.init({
      resizeTo: host,
      antialias: true,
      background: 0x0c0e1a,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
    });
    host.appendChild(this.app.canvas);

    this.world = new Container();
    this.world.x = this.app.renderer.width / 2;
    this.world.y = this.app.renderer.height / 2 - 60;
    this.app.stage.addChild(this.world);

    this.drawGround();
    this.drawStreetNames();

    this.buildingLayer = new Container();
    this.world.addChild(this.buildingLayer);
    for (const b of ALETHEIA_BUILDINGS) this.addBuilding(b);

    this.packetLayer = new Container();
    this.world.addChild(this.packetLayer);

    // Night overlay (full-screen darkening rect with tint).
    this.nightFilter = new Graphics();
    this.app.stage.addChild(this.nightFilter);
    this.applyDayNight();
    this.app.ticker.add(() => this.applyDayNight());

    // Pan
    let dragging = false;
    let lastX = 0, lastY = 0;
    this.app.canvas.addEventListener('contextmenu', e => e.preventDefault());
    this.app.canvas.addEventListener('pointerdown', (e: PointerEvent) => {
      if (e.button === 1 || e.button === 2) {
        dragging = true;
        lastX = e.clientX;
        lastY = e.clientY;
      }
    });
    this.app.canvas.addEventListener('pointermove', (e: PointerEvent) => {
      if (!dragging) return;
      this.world.x += e.clientX - lastX;
      this.world.y += e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
    });
    this.app.canvas.addEventListener('pointerup', () => (dragging = false));
    this.app.canvas.addEventListener('pointerleave', () => (dragging = false));
  }

  setAgentStatus(agentId: string, status: string): void {
    this.agentStatus.set(agentId, status);
    const sprite = this.agentSprites.get(agentId);
    if (sprite) this.tintAgent(sprite, status);
  }

  onMessage(m: DisplayMessage): void {
    // Map incoming messages to sprite motion/packets.
    if (m.type === 'HEARTBEAT') {
      const agentId = m.topic.split('.').slice(2).join('.');
      this.setAgentStatus(agentId, 'active');
      return;
    }

    // Spawn a packet between known buildings.
    const edge = this.edgeForMessage(m);
    if (!edge) return;
    this.spawnPacket(edge[0], edge[1], MESSAGE_COLOR[m.type] ?? PALETTE.lunarSilver);
  }

  destroy(): void {
    this.app?.destroy(true, { children: true });
  }

  // -----------------------------------------------------------------

  private drawGround(): void {
    this.ground = new Graphics();
    const grad = new FillGradient(-600, -400, 600, 400);
    grad.addColorStop(0, '#141829');
    grad.addColorStop(1, '#0A0C14');
    this.ground.rect(-800, -500, 1600, 1000).fill(grad);
    // Diamond street grid (isometric cobblestone lines)
    this.ground.setStrokeStyle({ width: 0.5, color: 0x1a1d2e, alpha: 0.5 });
    const step = 64;
    for (let x = -600; x <= 600; x += step) {
      this.ground.moveTo(x, -400);
      this.ground.lineTo(x + 400, 400);
      this.ground.moveTo(x, 400);
      this.ground.lineTo(x + 400, -400);
    }
    this.ground.stroke();
    this.world.addChild(this.ground);
  }

  private drawStreetNames(): void {
    const names = ['SIMONS AVE', 'MERCER LN', 'SHANNON CIR'];
    const positions = [
      { x: -100, y: 100 },
      { x: 200, y: 40 },
      { x: 100, y: 230 },
    ];
    for (let i = 0; i < names.length; i++) {
      const t = new Text({
        text: names[i],
        style: {
          fontFamily: 'Cinzel, serif',
          fontSize: 10,
          fill: 0x2a2a3e,
          letterSpacing: 3,
        },
      });
      t.anchor.set(0.5);
      t.x = positions[i].x;
      t.y = positions[i].y;
      this.world.addChild(t);
    }
  }

  private addBuilding(spec: BuildingSpec): void {
    const c = new Container();
    c.x = spec.gx;
    c.y = spec.gy;
    c.eventMode = 'static';
    c.cursor = 'pointer';

    // Isometric-ish block with top face and front face.
    const depth = spec.h * 0.4;
    const g = new Graphics();
    // Shadow
    g.ellipse(spec.w / 2, spec.h + 6, spec.w * 0.5, 8)
      .fill({ color: 0x000000, alpha: 0.5 });

    // Body
    g.rect(0, 0, spec.w, spec.h).fill({ color: 0x16213e });
    // Accent stripe at top
    g.rect(0, 0, spec.w, 6).fill({ color: spec.accent, alpha: 0.8 });
    // Left edge highlight
    g.rect(0, 0, 2, spec.h).fill({ color: spec.accent, alpha: 0.4 });
    // Windows: grid of small rectangles.
    for (let wy = 16; wy < spec.h - 8; wy += 14) {
      for (let wx = 10; wx < spec.w - 10; wx += 12) {
        const on = Math.random() > 0.3;
        g.rect(wx, wy, 6, 8).fill({
          color: on ? spec.accent : 0x0a0a0f,
          alpha: on ? 0.4 + Math.random() * 0.3 : 1,
        });
      }
    }
    c.addChild(g);

    // Label
    const label = new Text({
      text: spec.label.toUpperCase(),
      style: {
        fontFamily: 'Cinzel, serif',
        fontSize: 10,
        fill: 0xe0e0e0,
        letterSpacing: 2,
      },
    });
    label.anchor.set(0.5, 1);
    label.x = spec.w / 2;
    label.y = -4;
    c.addChild(label);

    // Agents on the ground in front of the building.
    spec.agents.forEach((agentId, i) => {
      const sprite = this.makeAgentSprite(agentId);
      sprite.x = spec.w / 2 + (i - (spec.agents.length - 1) / 2) * 20;
      sprite.y = spec.h + 16;
      c.addChild(sprite);
      this.agentSprites.set(agentId, sprite);
    });

    // Breath animation
    c.pivot.set(spec.w / 2, spec.h);
    c.x += spec.w / 2;
    c.y += spec.h;
    const start = performance.now();
    this.app.ticker.add(() => {
      const t = ((performance.now() - start) % 4000) / 4000;
      const s = 1 + Math.sin(t * Math.PI * 2) * 0.005;
      c.scale.set(s);
    });

    c.on('pointertap', (e) => {
      e.stopPropagation();
      this.onBuildingClick?.(spec.id);
    });

    this.buildingLayer.addChild(c);
    (c as any)._spec = spec;
  }

  private makeAgentSprite(agentId: string): Container {
    const c = new Container();
    c.eventMode = 'static';
    c.cursor = 'pointer';

    // Aura
    const aura = new Graphics();
    aura.circle(0, 0, 14).fill({ color: PALETTE.ashGrey, alpha: 0.15 });
    aura.circle(0, 0, 7).fill({ color: PALETTE.ashGrey, alpha: 0.3 });
    c.addChild(aura);

    // Body (procedural small humanoid)
    const body = new Graphics();
    const seed = agentId.charCodeAt(0) + agentId.length;
    const bodyColor = [0x3a4a6a, 0x4a3a6a, 0x6a4a3a, 0x3a6a4a][seed % 4];
    body.rect(-3, -4, 6, 10).fill({ color: bodyColor });
    body.circle(0, -8, 4).fill({ color: 0xd4a17a }); // head
    c.addChild(body);

    // Label on hover
    const label = new Text({
      text: agentId,
      style: { fontFamily: 'JetBrains Mono, monospace', fontSize: 8, fill: 0xe0e0e0 },
    });
    label.anchor.set(0.5, 0);
    label.y = 10;
    label.alpha = 0;
    c.addChild(label);
    c.on('pointerover', () => (label.alpha = 1));
    c.on('pointerout', () => (label.alpha = 0));
    c.on('pointertap', (e) => {
      e.stopPropagation();
      this.onAgentClick?.(agentId);
    });

    return c;
  }

  private tintAgent(sprite: Container, status: string): void {
    const aura = sprite.children[0] as Graphics;
    const color = LIFECYCLE_COLOR[status] ?? PALETTE.ashGrey;
    aura.clear();
    aura.circle(0, 0, 14).fill({ color, alpha: 0.2 });
    aura.circle(0, 0, 7).fill({ color, alpha: 0.5 });
  }

  private edgeForMessage(m: DisplayMessage): [string, string] | null {
    if (m.topic.startsWith('aletheia.data.')) return ['trading-floor', 'momentum-lab'];
    if (m.topic.startsWith('aletheia.trading_floor.')) return ['momentum-lab', 'portfolio-control'];
    if (m.topic === 'aletheia.portfolio.blended_alpha') return ['portfolio-control', 'execution-desk'];
    if (m.topic === 'aletheia.execution.order_request') return ['execution-desk', 'risk-bunker'];
    if (m.topic === 'aletheia.execution.fill_report') return ['execution-desk', 'risk-bunker'];
    if (m.topic === 'risk.override.all') return ['risk-bunker', 'execution-desk'];
    return null;
  }

  private spawnPacket(fromId: string, toId: string, color: number): void {
    const from = this.findBuildingContainer(fromId);
    const to = this.findBuildingContainer(toId);
    if (!from || !to) return;
    const packet = new Graphics();
    packet.circle(0, 0, 3).fill({ color });
    packet.circle(0, 0, 7).fill({ color, alpha: 0.2 });
    packet.x = from.x;
    packet.y = from.y;
    this.packetLayer.addChild(packet);

    const start = performance.now();
    const duration = 800;
    const tick = () => {
      const t = Math.min(1, (performance.now() - start) / duration);
      packet.x = from.x + (to.x - from.x) * t;
      packet.y = from.y + (to.y - from.y) * t;
      if (t < 1) requestAnimationFrame(tick);
      else packet.destroy();
    };
    requestAnimationFrame(tick);
  }

  private findBuildingContainer(id: string): Container | null {
    for (const child of this.buildingLayer.children) {
      if ((child as any)._spec?.id === id) return child as Container;
    }
    return null;
  }

  private applyDayNight(): void {
    const now = new Date();
    const hour = now.getHours() + now.getMinutes() / 60;
    let ambient = 1.0;
    let blueShift = 0;
    if (hour >= 9.5 && hour <= 16) ambient = 1.0;
    else if (hour > 16 && hour <= 17.5) {
      const t = (hour - 16) / 1.5;
      ambient = 1.0 - t * 0.7;
      blueShift = t * 0.4;
    } else if (hour > 5 && hour < 9.5) {
      const t = (hour - 5) / 4.5;
      ambient = 0.3 + t * 0.7;
      blueShift = 0.4 - t * 0.4;
    } else {
      ambient = 0.3;
      blueShift = 0.5;
    }

    this.nightFilter.clear();
    if (ambient < 1.0) {
      const darkness = 1.0 - ambient;
      this.nightFilter.rect(0, 0, this.app.renderer.width, this.app.renderer.height)
        .fill({ color: 0x00112a, alpha: darkness * 0.55 });
    }
    this.nightFilter.eventMode = 'none';
  }
}
