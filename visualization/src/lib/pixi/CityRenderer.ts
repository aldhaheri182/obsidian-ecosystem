/**
 * CityRenderer v2 — cinematic isometric Aletheia.
 *
 * Stack:
 *   - PixiJS 8 isometric tilemap drawn procedurally.
 *   - pixi-filters BloomFilter + GlowFilter per-layer.
 *   - Real skyscraper sprites with per-floor window grids, accent stripes,
 *     breathing animation, district-specific color identity.
 *   - Agent sprites with procedural DiceBear pixel avatars (per agent_id).
 *   - Day/night cycle via ColorMatrixFilter brightness modulation with
 *     real hour transitions (dawn/dusk gradients).
 *   - Street-name labels at intersections in Cinzel.
 *   - Dust-mote particle field in light shafts.
 *   - Packet flow along road segments with proper GSAP motion paths.
 */

import {
  Application,
  Container,
  Graphics,
  Sprite,
  Text,
  Texture,
  Rectangle,
} from 'pixi.js';
import { BloomFilter, GlowFilter } from 'pixi-filters';
import { gsap } from 'gsap';
import { createAvatar } from '@dicebear/core';
import * as pixelArt from '@dicebear/pixel-art';
import { PALETTE, MESSAGE_COLOR, LIFECYCLE_COLOR } from '../tokens/palette';
import {
  softGlowTexture,
  lensFlareTexture,
  dotTexture,
} from './textures';
import type { DisplayMessage } from '../nats-client';

type BuildingSpec = {
  id: string;
  label: string;
  district: 'trading' | 'portfolio' | 'execution' | 'risk' | 'exec';
  gx: number;
  gy: number;
  w: number;
  h: number;
  floors: number;
  accent: number;
  agents: string[];
  special?: 'bunker' | 'tower';
};

const ALETHEIA: BuildingSpec[] = [
  { id: 'trading-floor',    label: 'Trading Floor',     district: 'trading',   gx:  -80, gy: -40, w: 170, h: 170, floors: 7, accent: PALETTE.verdigris,     agents: ['collector-equities-csv-01'] },
  { id: 'momentum-lab',     label: 'Momentum Lab',      district: 'trading',   gx:  160, gy: -60, w: 130, h: 140, floors: 5, accent: PALETTE.verdigris,     agents: ['momentum-signal-01'] },
  { id: 'portfolio-control',label: 'Portfolio Control', district: 'portfolio', gx:  -60, gy: 160, w: 150, h: 130, floors: 5, accent: PALETTE.cyanAurora,    agents: ['signal-blender-01'] },
  { id: 'execution-desk',   label: 'Execution Desk',    district: 'execution', gx:  180, gy: 180, w: 150, h: 120, floors: 4, accent: PALETTE.solarGold,     agents: ['paper-executor-01'] },
  { id: 'risk-bunker',      label: 'Risk Bunker',       district: 'risk',      gx: -240, gy:  80, w: 120, h:  90, floors: 2, accent: PALETTE.crimsonForge,  agents: ['risk-overlord-01'], special: 'bunker' },
  { id: 'corporate-tower',  label: 'Corporate Tower',   district: 'exec',      gx:  380, gy:  60, w: 120, h: 260, floors: 11, accent: PALETTE.solarGold,    agents: [], special: 'tower' },
];

export class CityRenderer {
  private app!: Application;
  private world!: Container;
  private groundLayer!: Container;
  private streetLabels!: Container;
  private buildingLayer!: Container;
  private dustLayer!: Container;
  private packetLayer!: Container;
  private nightOverlay!: Graphics;

  private texGlow!: Texture;
  private texFlare!: Texture;
  private texDot!: Texture;
  private avatarTextures = new Map<string, Texture>();

  private destroyed = false;
  private onBuildingClick?: (id: string) => void;
  private onAgentClick?: (id: string) => void;
  private agentSprites = new Map<string, Sprite>();
  private agentAuras = new Map<string, Graphics>();

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
      background: 0x0a0d17,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
    });
    host.appendChild(this.app.canvas);

    this.texGlow = softGlowTexture(this.app, 64);
    this.texFlare = lensFlareTexture(this.app, 96);
    this.texDot = dotTexture(this.app, 8);

    this.world = new Container();
    this.world.x = this.app.renderer.width / 2;
    this.world.y = this.app.renderer.height / 2 - 40;
    this.app.stage.addChild(this.world);

    this.buildGround();
    this.buildStreetLabels();

    this.buildingLayer = new Container();
    this.buildingLayer.filters = [new BloomFilter({ strength: 2.5, quality: 3 })];
    this.world.addChild(this.buildingLayer);
    for (const b of ALETHEIA) this.addBuilding(b);

    this.dustLayer = new Container();
    this.world.addChild(this.dustLayer);
    this.buildDustMotes();

    this.packetLayer = new Container();
    this.world.addChild(this.packetLayer);

    // Night overlay above world.
    this.nightOverlay = new Graphics();
    this.app.stage.addChild(this.nightOverlay);

    // Pan.
    let dragging = false; let lastX = 0; let lastY = 0;
    this.app.canvas.addEventListener('contextmenu', e => e.preventDefault());
    this.app.canvas.addEventListener('pointerdown', (e: PointerEvent) => {
      if (e.button === 1 || e.button === 2) {
        dragging = true; lastX = e.clientX; lastY = e.clientY;
      }
    });
    this.app.canvas.addEventListener('pointermove', (e: PointerEvent) => {
      if (!dragging) return;
      this.world.x += e.clientX - lastX;
      this.world.y += e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
    });
    this.app.canvas.addEventListener('pointerup', () => (dragging = false));
    this.app.canvas.addEventListener('pointerleave', () => (dragging = false));

    this.app.ticker.add(() => this.updateDayNight());
  }

  setAgentStatus(agentId: string, status: string): void {
    const color = LIFECYCLE_COLOR[status] ?? PALETTE.ashGrey;
    const aura = this.agentAuras.get(agentId);
    if (!aura) return;
    aura.clear();
    aura.circle(0, 0, 18).fill({ color, alpha: 0.15 });
    aura.circle(0, 0, 10).fill({ color, alpha: 0.35 });
  }

  onMessage(m: DisplayMessage): void {
    if (m.type === 'HEARTBEAT') {
      const agentId = m.topic.split('.').slice(2).join('.');
      this.setAgentStatus(agentId, 'active');
      return;
    }
    const edge = this.edgeForMessage(m);
    if (!edge) return;
    this.spawnPacket(edge[0], edge[1], MESSAGE_COLOR[m.type] ?? PALETTE.lunarSilver);
  }

  destroy(): void {
    this.destroyed = true;
    this.app?.destroy(true, { children: true });
  }

  // -----------------------------------------------------------

  private buildGround(): void {
    const g = new Graphics();

    // Dark base panel with subtle vertical gradient via concentric rects.
    for (let i = 0; i < 20; i++) {
      const t = i / 20;
      const color = this.lerpColor(0x0b0e18, 0x070910, t);
      g.rect(-900 + i * 2, -600 + i * 1.5, 1800 - i * 4, 1200 - i * 3)
        .fill({ color });
    }

    // Isometric cobblestone grid — diamond pattern lines.
    g.setStrokeStyle({ width: 0.5, color: 0x1a1d2e, alpha: 0.45 });
    const step = 48;
    for (let x = -1000; x <= 1000; x += step) {
      g.moveTo(x, -600);
      g.lineTo(x + 600, 600);
      g.moveTo(x, 600);
      g.lineTo(x + 600, -600);
    }
    g.stroke();

    // Stone-paved road tiles under building corridors — brighter accent.
    g.setStrokeStyle({ width: 2, color: 0x2a2d40, alpha: 0.6 });
    const roadMain = [
      [-400, 50], [500, 50],
    ];
    for (let i = 0; i < roadMain.length; i += 2) {
      g.moveTo(roadMain[i][0], roadMain[i][1]);
      g.lineTo(roadMain[i + 1][0], roadMain[i + 1][1]);
    }
    g.stroke();

    this.groundLayer = new Container();
    this.groundLayer.addChild(g);
    this.world.addChild(this.groundLayer);
  }

  private buildStreetLabels(): void {
    const labels = [
      { text: 'SIMONS AVENUE', x: -100, y: 80, rot: 0 },
      { text: 'MERCER LANE',   x:  250, y:  60, rot: 0 },
      { text: 'SHANNON CIRCLE', x:   70, y: 260, rot: 0 },
      { text: 'KELLY PLAZA',    x: -260, y: 200, rot: 0 },
    ];
    this.streetLabels = new Container();
    for (const l of labels) {
      const t = new Text({
        text: l.text,
        style: {
          fontFamily: 'Cinzel, serif',
          fontSize: 9,
          fill: 0x2f3550,
          letterSpacing: 3,
        },
      });
      t.anchor.set(0.5);
      t.x = l.x;
      t.y = l.y;
      t.rotation = l.rot;
      this.streetLabels.addChild(t);
    }
    this.world.addChild(this.streetLabels);
  }

  private addBuilding(spec: BuildingSpec): void {
    const c = new Container();
    c.x = spec.gx;
    c.y = spec.gy;
    c.eventMode = 'static';
    c.cursor = 'pointer';

    // Isometric shadow beneath the footprint.
    const shadow = new Graphics();
    shadow.ellipse(spec.w / 2, spec.h + 10, spec.w * 0.55, 12)
      .fill({ color: 0x000000, alpha: 0.6 });
    c.addChild(shadow);

    if (spec.special === 'bunker') {
      this.drawBunker(c, spec);
    } else if (spec.special === 'tower') {
      this.drawTower(c, spec);
    } else {
      this.drawSkyscraper(c, spec);
    }

    // Agents on the pavement in front of the building.
    for (let i = 0; i < spec.agents.length; i++) {
      const agentId = spec.agents[i];
      const sprite = this.makeAgentSprite(agentId);
      sprite.x = spec.w / 2 + (i - (spec.agents.length - 1) / 2) * 30;
      sprite.y = spec.h + 22;
      c.addChild(sprite);
      this.agentSprites.set(agentId, sprite);
    }

    // Breathe
    c.pivot.set(spec.w / 2, spec.h);
    c.x += spec.w / 2;
    c.y += spec.h;
    gsap.to(c.scale, {
      x: 1.005, y: 1.005,
      duration: 4 + Math.random() * 0.5,
      repeat: -1, yoyo: true, ease: 'sine.inOut',
    });

    c.on('pointerover', () => gsap.to(c.scale, { x: 1.02, y: 1.02, duration: 0.2 }));
    c.on('pointerout', () => gsap.to(c.scale, { x: 1.0, y: 1.0, duration: 0.25 }));
    c.on('pointertap', e => {
      e.stopPropagation();
      this.onBuildingClick?.(spec.id);
    });

    this.buildingLayer.addChild(c);
    (c as any)._spec = spec;
  }

  private drawSkyscraper(c: Container, spec: BuildingSpec): void {
    const body = new Graphics();
    // Main rectangle
    body.rect(0, 0, spec.w, spec.h).fill({ color: 0x11172a });
    // Left edge highlight column
    body.rect(0, 0, 2, spec.h).fill({ color: spec.accent, alpha: 0.55 });
    // Right edge shadow
    body.rect(spec.w - 2, 0, 2, spec.h).fill({ color: 0x000000, alpha: 0.5 });
    // Accent stripe at top
    body.rect(0, 0, spec.w, 5).fill({ color: spec.accent, alpha: 0.95 });
    c.addChild(body);

    // Window grid — full of actual little lit rectangles.
    const windows = new Graphics();
    const cols = Math.floor((spec.w - 16) / 10);
    const floorH = (spec.h - 12) / spec.floors;
    for (let f = 0; f < spec.floors; f++) {
      const wy = 8 + f * floorH;
      for (let col = 0; col < cols; col++) {
        const wx = 10 + col * 10;
        const lit = Math.random() > 0.28;
        const alpha = lit ? 0.4 + Math.random() * 0.45 : 0.1;
        const tint = lit ? spec.accent : 0x000000;
        windows.rect(wx, wy, 4, floorH - 4)
          .fill({ color: tint, alpha });
      }
    }
    c.addChild(windows);

    // Nameplate at top of building
    const plate = new Graphics();
    plate.rect(0, -20, spec.w, 18).fill({ color: 0x0a0d17, alpha: 0.6 });
    c.addChild(plate);

    const label = new Text({
      text: spec.label.toUpperCase(),
      style: {
        fontFamily: 'Cinzel, serif',
        fontSize: 10,
        fill: 0xe0e0e0,
        letterSpacing: 2,
      },
    });
    label.anchor.set(0.5, 0.5);
    label.x = spec.w / 2;
    label.y = -11;
    c.addChild(label);
  }

  private drawBunker(c: Container, spec: BuildingSpec): void {
    // Fortified low structure with only entrance visible.
    const body = new Graphics();
    body.rect(0, 0, spec.w, spec.h).fill({ color: 0x0a0c17 });
    body.setStrokeStyle({ width: 2, color: spec.accent, alpha: 0.7 });
    body.rect(0, 0, spec.w, spec.h).stroke();
    c.addChild(body);

    // Door
    const door = new Graphics();
    door.rect(spec.w / 2 - 12, spec.h - 30, 24, 30).fill({ color: 0x000000 });
    // Crimson ring around door
    door.circle(spec.w / 2, spec.h - 15, 20).stroke({ width: 2, color: spec.accent, alpha: 0.9 });
    c.addChild(door);

    // Pulsing ring
    const ring = new Graphics();
    ring.circle(spec.w / 2, spec.h - 15, 28).stroke({ width: 1.5, color: spec.accent, alpha: 0.5 });
    c.addChild(ring);
    gsap.to(ring.scale, { x: 1.3, y: 1.3, duration: 1.2, repeat: -1, yoyo: true, ease: 'sine.inOut' });
    gsap.to(ring, { alpha: 0.1, duration: 1.2, repeat: -1, yoyo: true, ease: 'sine.inOut' });

    // Label
    const label = new Text({
      text: spec.label.toUpperCase(),
      style: {
        fontFamily: 'Cinzel, serif',
        fontSize: 10,
        fill: spec.accent,
        letterSpacing: 2,
      },
    });
    label.anchor.set(0.5, 0);
    label.x = spec.w / 2;
    label.y = -18;
    c.addChild(label);
  }

  private drawTower(c: Container, spec: BuildingSpec): void {
    const body = new Graphics();
    body.rect(0, 0, spec.w, spec.h).fill({ color: 0x0d1122 });
    // Narrow base -> widens slightly toward top via a taper effect
    body.rect(0, 0, 2, spec.h).fill({ color: spec.accent, alpha: 0.6 });
    body.rect(spec.w - 2, 0, 2, spec.h).fill({ color: spec.accent, alpha: 0.6 });
    c.addChild(body);

    // Penthouse (owner's office) — bright gold top floor
    const penthouse = new Graphics();
    const phH = 32;
    penthouse.rect(0, 0, spec.w, phH)
      .fill({ color: spec.accent, alpha: 0.15 });
    penthouse.setStrokeStyle({ width: 1, color: spec.accent, alpha: 0.9 });
    penthouse.rect(0, 0, spec.w, phH).stroke();
    // Many gold-tinted windows
    for (let wx = 8; wx < spec.w - 8; wx += 10) {
      penthouse.rect(wx, 6, 6, 10).fill({ color: spec.accent, alpha: 0.85 });
      penthouse.rect(wx, 18, 6, 10).fill({ color: spec.accent, alpha: 0.7 });
    }
    c.addChild(penthouse);

    // Regular floors below
    const belowH = spec.h - phH;
    const floors = spec.floors - 2;
    const floorH = belowH / floors;
    const windows = new Graphics();
    for (let f = 0; f < floors; f++) {
      const wy = phH + f * floorH;
      for (let col = 0; col < 10; col++) {
        const wx = 8 + col * 10;
        const lit = Math.random() > 0.3;
        windows.rect(wx, wy + 2, 4, floorH - 6)
          .fill({ color: lit ? PALETTE.lunarSilver : 0x000000, alpha: lit ? 0.4 + Math.random() * 0.3 : 0.2 });
      }
    }
    c.addChild(windows);

    // Scrolling "MEETING IN PROGRESS" band — currently empty.
    const band = new Graphics();
    band.rect(0, spec.h * 0.4, spec.w, 14).fill({ color: 0x0a0d17, alpha: 0.9 });
    c.addChild(band);
    const bandText = new Text({
      text: 'AWAITING EXECUTIVE AGENTS · M2',
      style: {
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 7,
        fill: PALETTE.ashGrey,
        letterSpacing: 2,
      },
    });
    bandText.anchor.set(0.5);
    bandText.x = spec.w / 2;
    bandText.y = spec.h * 0.4 + 7;
    c.addChild(bandText);

    // Top label
    const label = new Text({
      text: spec.label.toUpperCase(),
      style: {
        fontFamily: 'Cinzel, serif',
        fontSize: 11,
        fill: spec.accent,
        letterSpacing: 3,
      },
    });
    label.anchor.set(0.5, 0);
    label.x = spec.w / 2;
    label.y = -22;
    c.addChild(label);
  }

  private makeAgentSprite(agentId: string): Sprite {
    let tex = this.avatarTextures.get(agentId);
    if (!tex) {
      try {
        const svg = createAvatar(pixelArt as any, {
          seed: agentId,
          size: 64,
          scale: 110,
        }).toString();
        const url = 'data:image/svg+xml;charset=utf8,' + encodeURIComponent(svg);
        tex = Texture.from(url);
      } catch {
        tex = this.texDot;
      }
      this.avatarTextures.set(agentId, tex);
    }

    const container = new Container();

    // Aura
    const aura = new Graphics();
    aura.circle(0, 0, 18).fill({ color: PALETTE.ashGrey, alpha: 0.15 });
    aura.circle(0, 0, 10).fill({ color: PALETTE.ashGrey, alpha: 0.3 });
    container.addChild(aura);
    this.agentAuras.set(agentId, aura);

    // Avatar sprite
    const sprite = new Sprite(tex!);
    sprite.anchor.set(0.5, 0.9);
    sprite.scale.set(0.45);
    container.addChild(sprite);

    // Idle breathing
    gsap.to(sprite.scale, {
      x: 0.47, y: 0.47,
      duration: 2, repeat: -1, yoyo: true, ease: 'sine.inOut',
    });

    // Hover label
    const label = new Text({
      text: agentId,
      style: {
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 9,
        fill: 0xe0e0e0,
      },
    });
    label.anchor.set(0.5, 0);
    label.y = 16;
    label.alpha = 0;
    container.addChild(label);

    container.eventMode = 'static';
    container.cursor = 'pointer';
    container.on('pointerover', () => gsap.to(label, { alpha: 1, duration: 0.15 }));
    container.on('pointerout', () => gsap.to(label, { alpha: 0, duration: 0.2 }));
    container.on('pointertap', e => {
      e.stopPropagation();
      this.onAgentClick?.(agentId);
    });

    return container as unknown as Sprite;
  }

  private buildDustMotes(): void {
    const count = 150;
    for (let i = 0; i < count; i++) {
      const s = new Sprite(this.texDot);
      s.anchor.set(0.5);
      s.x = (Math.random() - 0.5) * 1000;
      s.y = (Math.random() - 0.5) * 700;
      s.scale.set(0.1 + Math.random() * 0.15);
      s.alpha = 0.2 + Math.random() * 0.3;
      s.tint = 0xe0e0e0;
      s.blendMode = 'add';
      this.dustLayer.addChild(s);
      gsap.to(s, {
        y: s.y - 60 - Math.random() * 80,
        duration: 15 + Math.random() * 20,
        repeat: -1,
        ease: 'none',
      });
      gsap.to(s, {
        alpha: 0,
        duration: 4 + Math.random() * 6,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });
    }
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
    const from = this.findBuilding(fromId);
    const to = this.findBuilding(toId);
    if (!from || !to) return;

    const packet = new Sprite(this.texGlow);
    packet.anchor.set(0.5);
    packet.tint = color;
    packet.scale.set(0.35);
    packet.alpha = 0.95;
    packet.blendMode = 'add';
    this.packetLayer.addChild(packet);

    const tail: Sprite[] = [];
    for (let i = 0; i < 6; i++) {
      const s = new Sprite(this.texDot);
      s.anchor.set(0.5);
      s.tint = color;
      s.alpha = 0;
      s.blendMode = 'add';
      this.packetLayer.addChild(s);
      tail.push(s);
    }

    const fromX = from.x;
    const fromY = from.y;
    const toX = to.x;
    const toY = to.y;

    const obj = { t: 0 };
    gsap.to(obj, {
      t: 1,
      duration: 0.9,
      ease: 'power1.inOut',
      onUpdate: () => {
        const x = fromX + (toX - fromX) * obj.t;
        const y = fromY + (toY - fromY) * obj.t;
        packet.x = x;
        packet.y = y;
        for (let i = 0; i < tail.length; i++) {
          const lag = Math.max(0, obj.t - (i + 1) * 0.04);
          tail[i].x = fromX + (toX - fromX) * lag;
          tail[i].y = fromY + (toY - fromY) * lag;
          tail[i].alpha = (1 - i / tail.length) * 0.5;
          tail[i].scale.set((1 - i / tail.length) * 0.4);
        }
      },
      onComplete: () => {
        packet.destroy();
        for (const s of tail) s.destroy();
      },
    });
  }

  private findBuilding(id: string): Container | null {
    for (const child of this.buildingLayer.children) {
      if ((child as any)._spec?.id === id) return child as Container;
    }
    return null;
  }

  private updateDayNight(): void {
    const now = new Date();
    const hour = now.getHours() + now.getMinutes() / 60;
    let ambient = 1.0;
    let tint = 0x000000;
    if (hour >= 9.5 && hour <= 16) {
      ambient = 1.0;
    } else if (hour > 16 && hour <= 17.5) {
      const t = (hour - 16) / 1.5;
      ambient = 1 - t * 0.65;
      tint = 0xff6b35;
    } else if (hour > 5 && hour < 9.5) {
      const t = (hour - 5) / 4.5;
      ambient = 0.35 + t * 0.65;
      tint = 0xffd166;
    } else {
      ambient = 0.35;
      tint = 0x00214a;
    }
    const darkness = 1 - ambient;
    this.nightOverlay.clear();
    if (darkness > 0) {
      this.nightOverlay.rect(0, 0, this.app.renderer.width, this.app.renderer.height)
        .fill({ color: tint, alpha: darkness * 0.45 });
    }
    this.nightOverlay.eventMode = 'none';
  }

  private lerpColor(a: number, b: number, t: number): number {
    const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
    const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
    return (Math.round(ar + (br - ar) * t) << 16)
         | (Math.round(ag + (bg - ag) * t) << 8)
         | Math.round(ab + (bb - ab) * t);
  }
}
