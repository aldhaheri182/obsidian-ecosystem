/**
 * NexusRenderer — 2D map of all 11 cities with roads and animated packets.
 * Authorized by: Cinematic UI spec Part II.2.
 */

import {
  Application,
  Container,
  Graphics,
  Text,
  FillGradient,
} from 'pixi.js';
import { PALETTE, MESSAGE_COLOR } from '../tokens/palette';

type CityNode = {
  id: string;
  name: string;
  color: number;
  x: number;  // relative to center, map-space
  y: number;
  stub: boolean; // true = does not exist yet
};

// Cities laid out on a 2D map; Aletheia prominent at bottom-left per
// our only-real-city status.
export const NEXUS_CITIES: CityNode[] = [
  { id: 'aletheia',   name: 'Aletheia',   color: PALETTE.verdigris,    x: -280, y:  120, stub: false },
  { id: 'mnemosyne',  name: 'Mnemosyne',  color: PALETTE.solarGold,    x:  -60, y:  -40, stub: true },
  { id: 'prometheus', name: 'Prometheus', color: PALETTE.cyanAurora,   x:  180, y:  -20, stub: true },
  { id: 'hephaestus', name: 'Hephaestus', color: PALETTE.ember,        x:  320, y:  140, stub: true },
  { id: 'themis',     name: 'Themis',     color: PALETTE.lunarSilver,  x:   40, y:  220, stub: true },
  { id: 'agora',      name: 'Agora',      color: PALETTE.verdigris,    x: -160, y:  280, stub: true },
  { id: 'iris',       name: 'Iris',       color: PALETTE.deepAmethyst, x:  260, y: -220, stub: true },
  { id: 'chronos',    name: 'Chronos',    color: 0xFFFFFF,             x: -320, y:  -60, stub: false },
  { id: 'narcissus',  name: 'Narcissus',  color: PALETTE.lunarSilver,  x:  100, y: -220, stub: true },
  { id: 'eris',       name: 'Eris',       color: PALETTE.crimsonForge, x:  380, y:  300, stub: true },
  { id: 'janus',      name: 'Janus',      color: PALETTE.lunarSilver,  x: -400, y:  280, stub: true },
];

const ROADS: [string, string][] = [
  ['aletheia', 'mnemosyne'],
  ['aletheia', 'agora'],
  ['aletheia', 'chronos'],
  ['mnemosyne', 'prometheus'],
  ['mnemosyne', 'themis'],
  ['prometheus', 'hephaestus'],
  ['prometheus', 'iris'],
  ['hephaestus', 'eris'],
  ['themis', 'agora'],
  ['agora', 'janus'],
  ['iris', 'narcissus'],
  ['chronos', 'janus'],
];

export class NexusRenderer {
  private app!: Application;
  private worldLayer!: Container;
  private roadLayer!: Graphics;
  private cityLayer!: Container;
  private packetLayer!: Container;
  private destroyed = false;
  private onCityClick?: (id: string) => void;

  async mount(host: HTMLElement, onCityClick?: (id: string) => void): Promise<void> {
    this.onCityClick = onCityClick;
    this.app = new Application();
    await this.app.init({
      resizeTo: host,
      antialias: true,
      background: 0x07080d,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
    });
    host.appendChild(this.app.canvas);

    this.worldLayer = new Container();
    this.worldLayer.x = this.app.renderer.width / 2;
    this.worldLayer.y = this.app.renderer.height / 2;
    this.app.stage.addChild(this.worldLayer);

    // Parchment background
    const bg = new Graphics();
    const grad = new FillGradient(-600, -400, 600, 400);
    grad.addColorStop(0, '#121622');
    grad.addColorStop(1, '#0A0C14');
    bg.rect(-800, -600, 1600, 1200).fill(grad);
    this.worldLayer.addChild(bg);

    // Contour lines
    const contours = new Graphics();
    contours.setStrokeStyle({ width: 0.5, color: 0x1a1a2e, alpha: 0.25 });
    for (let i = 0; i < 20; i++) {
      const cx = (Math.random() - 0.5) * 1000;
      const cy = (Math.random() - 0.5) * 800;
      const r = 40 + Math.random() * 160;
      contours.circle(cx, cy, r);
    }
    contours.stroke();
    this.worldLayer.addChild(contours);

    this.roadLayer = new Graphics();
    this.worldLayer.addChild(this.roadLayer);
    this.drawRoads();

    this.cityLayer = new Container();
    this.worldLayer.addChild(this.cityLayer);

    this.packetLayer = new Container();
    this.worldLayer.addChild(this.packetLayer);

    for (const city of NEXUS_CITIES) this.addCity(city);

    // Global Executive Spire at map center.
    this.addSpire();

    // Pan (middle / right click drag).
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
      this.worldLayer.x += e.clientX - lastX;
      this.worldLayer.y += e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
    });
    this.app.canvas.addEventListener('pointerup', () => (dragging = false));
    this.app.canvas.addEventListener('pointerleave', () => (dragging = false));
  }

  /** Spawn a packet traveling from source city to destination city. */
  spawnPacket(
    fromId: string, toId: string,
    type = 'SIGNAL',
    priority = 'PRIORITY_NORMAL',
  ): void {
    if (this.destroyed) return;
    const from = NEXUS_CITIES.find(c => c.id === fromId);
    const to = NEXUS_CITIES.find(c => c.id === toId);
    if (!from || !to) return;

    const color = MESSAGE_COLOR[type] ?? PALETTE.lunarSilver;
    const packet = new Graphics();
    packet.circle(0, 0, 3).fill({ color });
    packet.circle(0, 0, 8).fill({ color, alpha: 0.15 });
    packet.x = from.x;
    packet.y = from.y;
    this.packetLayer.addChild(packet);

    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2 - 20;

    const priSpeed: Record<string, number> = {
      PRIORITY_LOW: 2000,
      PRIORITY_NORMAL: 1200,
      PRIORITY_HIGH: 600,
      PRIORITY_CRITICAL: 300,
    };
    const duration = priSpeed[priority] ?? 1200;
    const start = performance.now();

    const tick = (t: number) => {
      if (this.destroyed) return;
      const p = Math.min(1, (t - start) / duration);
      const u = 1 - p;
      const x = u * u * from.x + 2 * u * p * midX + p * p * to.x;
      const y = u * u * from.y + 2 * u * p * midY + p * p * to.y;
      packet.x = x;
      packet.y = y;
      if (p < 1) requestAnimationFrame(tick);
      else packet.destroy();
    };
    requestAnimationFrame(tick);
  }

  destroy(): void {
    this.destroyed = true;
    this.app?.destroy(true, { children: true });
  }

  // -------------------------------------------------------------------

  private drawRoads(): void {
    this.roadLayer.clear();
    for (const [a, b] of ROADS) {
      const ca = NEXUS_CITIES.find(c => c.id === a)!;
      const cb = NEXUS_CITIES.find(c => c.id === b)!;
      const midX = (ca.x + cb.x) / 2;
      const midY = (ca.y + cb.y) / 2 - 20;
      this.roadLayer.setStrokeStyle({
        width: 2, color: 0x2a2a3e, alpha: 0.55,
      });
      this.roadLayer.moveTo(ca.x, ca.y);
      this.roadLayer.quadraticCurveTo(midX, midY, cb.x, cb.y);
      this.roadLayer.stroke();
      // Soft glow layer
      this.roadLayer.setStrokeStyle({
        width: 6, color: PALETTE.verdigris, alpha: 0.05,
      });
      this.roadLayer.moveTo(ca.x, ca.y);
      this.roadLayer.quadraticCurveTo(midX, midY, cb.x, cb.y);
      this.roadLayer.stroke();
    }
  }

  private addCity(city: CityNode): void {
    const c = new Container();
    c.x = city.x;
    c.y = city.y;
    c.eventMode = 'static';
    c.cursor = 'pointer';

    // Health aura
    const aura = new Graphics();
    aura.circle(0, 0, 40).fill({ color: city.color, alpha: city.stub ? 0.03 : 0.1 });
    aura.circle(0, 0, 20).fill({ color: city.color, alpha: city.stub ? 0.06 : 0.18 });
    c.addChild(aura);

    // Icon — a hexagonal base with mini-structures. For brevity, a
    // stylized silhouette per city.
    const base = new Graphics();
    const r = 14;
    const path: Array<[number, number]> = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
      path.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    base.moveTo(path[0][0], path[0][1]);
    for (let i = 1; i < 6; i++) base.lineTo(path[i][0], path[i][1]);
    base.closePath();
    base.fill({ color: 0x0e1120, alpha: city.stub ? 0.4 : 0.8 });
    base.setStrokeStyle({ width: 1.5, color: city.color, alpha: city.stub ? 0.3 : 0.85 });
    base.stroke();
    c.addChild(base);

    // Mini buildings inside (3 small rects)
    if (!city.stub) {
      const bldgs = new Graphics();
      for (let i = -1; i <= 1; i++) {
        const w = 3;
        const h = 6 + Math.abs(i) * 2;
        bldgs.rect(i * 4 - w / 2, -h / 2, w, h).fill({ color: city.color, alpha: 0.9 });
      }
      c.addChild(bldgs);
    } else {
      // Stub city: a dashed empty hex.
      const stub = new Text({
        text: '—',
        style: { fontFamily: 'Cinzel, serif', fontSize: 10, fill: city.color },
      });
      stub.anchor.set(0.5);
      c.addChild(stub);
    }

    // City name
    const name = new Text({
      text: city.name.toUpperCase(),
      style: {
        fontFamily: 'Cinzel, serif',
        fontSize: 9,
        fill: 0xe0e0e0,
        letterSpacing: 2,
      },
    });
    name.anchor.set(0.5, 0);
    name.y = r + 6;
    name.alpha = city.stub ? 0.45 : 0.9;
    c.addChild(name);

    if (city.stub) {
      const sub = new Text({
        text: 'STUB',
        style: { fontFamily: 'Inter, sans-serif', fontSize: 7, fill: PALETTE.ashGrey, letterSpacing: 2 },
      });
      sub.anchor.set(0.5, 0);
      sub.y = r + 18;
      c.addChild(sub);
    }

    c.on('pointertap', () => {
      if (!city.stub) this.onCityClick?.(city.id);
    });

    this.cityLayer.addChild(c);
  }

  private addSpire(): void {
    const c = new Container();
    c.x = 0;
    c.y = 0;

    const g = new Graphics();
    // Base platform
    g.ellipse(0, 0, 12, 5).fill({ color: PALETTE.solarGold, alpha: 0.2 });
    // Beam
    g.moveTo(-2, 0).lineTo(2, 0).lineTo(0, -80).closePath()
     .fill({ color: PALETTE.solarGold, alpha: 0.55 });
    // Outer glow
    g.moveTo(-8, 0).lineTo(8, 0).lineTo(0, -110).closePath()
     .fill({ color: PALETTE.solarGold, alpha: 0.08 });
    c.addChild(g);

    // Shimmer line that moves upward
    const shimmer = new Graphics();
    shimmer.rect(-6, 0, 12, 1).fill({ color: PALETTE.ghostWhite, alpha: 0.8 });
    c.addChild(shimmer);

    const start = performance.now();
    this.app.ticker.add(() => {
      const t = ((performance.now() - start) % 2000) / 2000;
      shimmer.y = -(t * 80);
      shimmer.alpha = 1 - t;
    });

    this.worldLayer.addChild(c);
  }
}
