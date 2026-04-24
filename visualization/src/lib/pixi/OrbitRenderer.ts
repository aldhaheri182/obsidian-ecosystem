/**
 * OrbitRenderer — PixiJS renderer for the Orbit View.
 *
 * Authorized by: Cinematic UI spec Part 1.
 *
 * Draws: starfield (2000 particles), planet sphere with lat/lon grid,
 * terminator shading, 11 city light points with unique glyphs, P&L
 * aurora arc, civilization timeline orbit ring, advancement orb pool.
 */

import {
  Application,
  Container,
  Graphics,
  ParticleContainer,
  Particle,
  Text,
  Texture,
  RenderTexture,
  Sprite,
  FillGradient,
} from 'pixi.js';
import { PALETTE } from '../tokens/palette';

export type CitySpec = {
  id: string;
  name: string;
  color: number;
  /** latitude in degrees (−90..90). */
  lat: number;
  /** longitude in degrees (−180..180). */
  lon: number;
  /** glyph: 'spire' | 'dome' | 'star' | 'forge' | 'columns' | 'port' | 'telescope' | 'clock' | 'mirror' | 'inverse' | 'janus' */
  glyph: string;
  /** flicker / pulse rate in Hz. 0 = steady. */
  pulse: number;
};

export const CITIES: CitySpec[] = [
  { id: 'aletheia',   name: 'Aletheia',   color: PALETTE.verdigris,    lat:  15, lon: -20, glyph: 'spire',   pulse: 6 },
  { id: 'mnemosyne',  name: 'Mnemosyne',  color: PALETTE.solarGold,    lat:  25, lon:  30, glyph: 'dome',    pulse: 0 },
  { id: 'prometheus', name: 'Prometheus', color: PALETTE.cyanAurora,   lat: -10, lon:  15, glyph: 'star',    pulse: 2 },
  { id: 'hephaestus', name: 'Hephaestus', color: PALETTE.ember,        lat:  40, lon: -50, glyph: 'forge',   pulse: 1 },
  { id: 'themis',     name: 'Themis',     color: PALETTE.lunarSilver,  lat:  -5, lon:  70, glyph: 'columns', pulse: 0 },
  { id: 'agora',      name: 'Agora',      color: PALETTE.verdigris,    lat:  -30, lon: -30, glyph: 'port',    pulse: 3 },
  { id: 'iris',       name: 'Iris',       color: PALETTE.deepAmethyst, lat:  55, lon:   5, glyph: 'telescope', pulse: 0.5 },
  { id: 'chronos',    name: 'Chronos',    color: 0xFFFFFF,             lat:   0, lon:   0, glyph: 'clock',   pulse: 1 },
  { id: 'narcissus',  name: 'Narcissus',  color: PALETTE.lunarSilver,  lat:  30, lon:  60, glyph: 'mirror',  pulse: 0 },
  { id: 'eris',       name: 'Eris',       color: PALETTE.crimsonForge, lat: -55, lon:  40, glyph: 'inverse', pulse: 0 },
  { id: 'janus',      name: 'Janus',      color: PALETTE.lunarSilver,  lat:  -40, lon: -70, glyph: 'janus',   pulse: 0 },
];

type Env = {
  app: Application;
  container: HTMLElement;
  planetRadius: number;
  cx: number;
  cy: number;
  cityLayer: Container;
  orbLayer: Container;
  pnlAurora: Graphics;
  onCityClick?: (city: CitySpec) => void;
};

export class OrbitRenderer {
  private env!: Env;
  private destroyed = false;
  private tickers: (() => void)[] = [];

  async mount(container: HTMLElement, onCityClick?: (c: CitySpec) => void): Promise<void> {
    const app = new Application();
    await app.init({
      resizeTo: container,
      antialias: true,
      background: PALETTE.voidBlack,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
      powerPreference: 'high-performance',
    });
    container.appendChild(app.canvas);

    const cx = app.renderer.width / 2;
    const cy = app.renderer.height * 0.55;
    const planetRadius = Math.min(app.renderer.width, app.renderer.height) * 0.28;

    const starfield = this.makeStarfield(app.renderer.width, app.renderer.height);
    app.stage.addChild(starfield);

    const planet = this.makePlanet(cx, cy, planetRadius);
    app.stage.addChild(planet);

    const pnlAurora = new Graphics();
    app.stage.addChild(pnlAurora);

    const timelineRing = this.makeTimelineRing(cx, cy, planetRadius);
    app.stage.addChild(timelineRing);

    const cityLayer = new Container();
    cityLayer.x = cx;
    cityLayer.y = cy;
    app.stage.addChild(cityLayer);

    const orbLayer = new Container();
    app.stage.addChild(orbLayer);

    this.env = { app, container, planetRadius, cx, cy, cityLayer, orbLayer, pnlAurora, onCityClick };

    this.drawPnlAurora(0);
    for (const city of CITIES) this.addCity(city);
    this.startTimelineRotation(timelineRing);
  }

  setPnl(normalized: number): void {
    if (!this.env) return;
    this.drawPnlAurora(Math.max(-1, Math.min(1, normalized)));
  }

  /** Spawn an advancement orb that arcs from one city to another. */
  spawnOrb(fromId: string, toId: string, durationMs: number): void {
    if (!this.env) return;
    const from = CITIES.find(c => c.id === fromId);
    const to = CITIES.find(c => c.id === toId);
    if (!from || !to) return;
    const a = this.project(from.lat, from.lon);
    const b = this.project(to.lat, to.lon);
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 - 60 };

    const orb = new Graphics();
    orb.circle(0, 0, 5).fill({ color: PALETTE.solarGold })
       .circle(0, 0, 10).fill({ color: PALETTE.solarGold, alpha: 0.2 });
    orb.x = this.env.cx + a.x;
    orb.y = this.env.cy + a.y;
    this.env.orbLayer.addChild(orb);

    const start = performance.now();
    const tick = () => {
      if (this.destroyed) return;
      const t = Math.min(1, (performance.now() - start) / durationMs);
      // Quadratic bezier.
      const u = 1 - t;
      const x = u * u * a.x + 2 * u * t * mid.x + t * t * b.x;
      const y = u * u * a.y + 2 * u * t * mid.y + t * t * b.y;
      orb.x = this.env.cx + x;
      orb.y = this.env.cy + y;
      if (t < 1) requestAnimationFrame(tick);
      else orb.destroy();
    };
    requestAnimationFrame(tick);
  }

  destroy(): void {
    this.destroyed = true;
    for (const t of this.tickers) this.env.app.ticker.remove(t);
    this.env?.app.destroy(true, { children: true });
  }

  // -------------------------------------------------------------------------

  private makeStarfield(w: number, h: number): ParticleContainer {
    const pc = new ParticleContainer({
      dynamicProperties: { position: false, alpha: true, scale: false, rotation: false },
    });
    // Tiny white dot texture for particle reuse.
    const g = new Graphics();
    g.circle(0, 0, 1).fill({ color: 0xffffff });
    const tex = this.env?.app.renderer.generateTexture(g) ??
      (() => {
        const dummy = new Application();
        return Texture.WHITE;
      })();

    for (let i = 0; i < 2000; i++) {
      const p = new Particle({
        texture: tex,
        x: Math.random() * w,
        y: Math.random() * h,
        scaleX: 0.5 + Math.random() * 2,
        scaleY: 0.5 + Math.random() * 2,
        alpha: 0.2 + Math.random() * 0.8,
        tint: Math.random() > 0.97 ? PALETTE.cyanAurora :
              Math.random() > 0.95 ? PALETTE.solarGold : PALETTE.lunarSilver,
      });
      pc.addParticle(p);
    }
    return pc;
  }

  private makePlanet(cx: number, cy: number, r: number): Container {
    const c = new Container();

    // Outer halo
    const halo = new Graphics();
    halo.circle(cx, cy, r + 10).fill({ color: 0x0a0a0f, alpha: 1.0 });
    c.addChild(halo);

    // Planet body (slight inward gradient using FillGradient).
    const grad = new FillGradient(cx - r, cy - r, cx + r, cy + r);
    grad.addColorStop(0, '#0e1120');
    grad.addColorStop(1, '#07080e');
    const body = new Graphics();
    body.circle(cx, cy, r).fill(grad);
    c.addChild(body);

    // Lat/lon grid (36 lat + 72 lon as faint strokes)
    const grid = new Graphics();
    grid.setStrokeStyle({ width: 0.5, color: 0x1a1a2e, alpha: 0.3 });
    for (let lat = -80; lat <= 80; lat += 10) {
      const y = cy + (lat / 90) * r;
      const hw = Math.sqrt(1 - (lat / 90) ** 2) * r;
      grid.moveTo(cx - hw, y);
      grid.lineTo(cx + hw, y);
    }
    for (let lon = -180; lon <= 180; lon += 15) {
      const x = cx + (lon / 180) * r;
      const hh = Math.sqrt(Math.max(0, 1 - ((lon - 0) / 180) ** 2)) * r;
      grid.moveTo(x, cy - hh);
      grid.lineTo(x, cy + hh);
    }
    grid.stroke();
    c.addChild(grid);

    // Terminator shadow on right side
    const shadow = new Graphics();
    shadow.circle(cx + r * 0.2, cy, r).fill({ color: 0x0a0a0f, alpha: 0.4 });
    shadow.alpha = 0.55;
    c.addChild(shadow);

    return c;
  }

  private project(lat: number, lon: number): { x: number; y: number } {
    // Simple 2D ortho-like projection ignoring z (far side still visible).
    const r = this.env?.planetRadius ?? 200;
    const rad = Math.PI / 180;
    const x = Math.cos(lat * rad) * Math.sin(lon * rad) * r;
    const y = -Math.sin(lat * rad) * r;
    return { x, y };
  }

  private drawPnlAurora(norm: number): void {
    const { pnlAurora, cx, cy, planetRadius } = this.env;
    pnlAurora.clear();
    // Arc near the pole showing profit/loss state.
    const r = planetRadius + 14;
    const mix = (norm + 1) / 2; // 0..1
    const c = this.lerpColor(PALETTE.crimsonForge, PALETTE.verdigris, mix);
    pnlAurora.setStrokeStyle({ width: 6, color: c, alpha: 0.25 });
    pnlAurora.arc(cx, cy, r, Math.PI * 1.1, Math.PI * 1.9);
    pnlAurora.stroke();
    pnlAurora.setStrokeStyle({ width: 2, color: c, alpha: 0.55 });
    pnlAurora.arc(cx, cy, r, Math.PI * 1.1, Math.PI * 1.9);
    pnlAurora.stroke();
  }

  private makeTimelineRing(cx: number, cy: number, r: number): Graphics {
    const ring = new Graphics();
    ring.setStrokeStyle({ width: 1, color: 0x2a2a3e, alpha: 0.5 });
    ring.circle(cx, cy, r * 1.22);
    ring.stroke();
    return ring;
  }

  private startTimelineRotation(ring: Graphics): void {
    const { app, cx, cy } = this.env;
    const fn = () => {
      ring.rotation = (performance.now() / 60000) * Math.PI * 2; // 1 minute / rev
      ring.pivot.set(cx, cy);
      ring.position.set(cx, cy);
    };
    this.tickers.push(fn);
    app.ticker.add(fn);
  }

  private addCity(city: CitySpec): void {
    const { x, y } = this.project(city.lat, city.lon);
    const c = new Container();
    c.x = x;
    c.y = y;
    c.eventMode = 'static';
    c.cursor = 'pointer';

    // Glow
    const glow = new Graphics();
    glow.circle(0, 0, 18).fill({ color: city.color, alpha: 0.08 });
    glow.circle(0, 0, 10).fill({ color: city.color, alpha: 0.15 });
    c.addChild(glow);

    // Core
    const core = new Graphics();
    core.circle(0, 0, 2.5).fill({ color: 0xffffff });
    c.addChild(core);

    // Glyph overlay per city type.
    const glyph = this.makeGlyph(city);
    c.addChild(glyph);

    // Label
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
    name.y = 14;
    name.alpha = 0.85;
    c.addChild(name);

    // Pulse
    if (city.pulse > 0) {
      const period = 1000 / city.pulse;
      const start = performance.now() - Math.random() * period;
      const fn = () => {
        const t = ((performance.now() - start) / period) % 1;
        glyph.alpha = 0.6 + Math.sin(t * Math.PI * 2) * 0.4;
      };
      this.tickers.push(fn);
      this.env.app.ticker.add(fn);
    }

    c.on('pointertap', () => this.env.onCityClick?.(city));
    this.env.cityLayer.addChild(c);
  }

  private makeGlyph(city: CitySpec): Graphics {
    const g = new Graphics();
    g.setStrokeStyle({ width: 1.2, color: city.color, alpha: 0.9 });
    switch (city.glyph) {
      case 'spire':
        g.moveTo(0, -7).lineTo(0, 7);
        break;
      case 'dome':
        g.arc(0, 2, 6, Math.PI, 0);
        break;
      case 'star':
        for (let i = 0; i < 4; i++) {
          const a = (i * Math.PI) / 2;
          g.moveTo(Math.cos(a) * 6, Math.sin(a) * 6);
          g.lineTo(Math.cos(a) * 2, Math.sin(a) * 2);
        }
        break;
      case 'forge':
        g.moveTo(-5, 4).lineTo(0, -5).lineTo(5, 4).closePath();
        break;
      case 'columns':
        g.moveTo(-5, -6).lineTo(-5, 5);
        g.moveTo(0, -6).lineTo(0, 5);
        g.moveTo(5, -6).lineTo(5, 5);
        break;
      case 'port':
        g.circle(-3, 0, 1.5).circle(3, 0, 1.5).circle(0, 3, 1.5);
        break;
      case 'telescope':
        g.moveTo(-4, 4).lineTo(4, -4);
        g.circle(5, -5, 1.5);
        break;
      case 'clock':
        g.circle(0, 0, 5);
        g.moveTo(0, 0).lineTo(0, -4);
        g.moveTo(0, 0).lineTo(3, 1);
        break;
      case 'mirror':
        g.rect(-4, -5, 8, 10);
        break;
      case 'inverse':
        g.moveTo(0, -4).lineTo(4, 4).lineTo(-4, 4).closePath();
        break;
      case 'janus': {
        // Half silver / half dark.
        g.setFillStyle({ color: PALETTE.lunarSilver, alpha: 0.8 });
        g.arc(0, 0, 5, Math.PI / 2, -Math.PI / 2, true).fill();
        g.setFillStyle({ color: 0x121624, alpha: 0.9 });
        g.arc(0, 0, 5, -Math.PI / 2, Math.PI / 2, true).fill();
        break;
      }
    }
    g.stroke();
    return g;
  }

  private lerpColor(a: number, b: number, t: number): number {
    const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
    const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
    const r = Math.round(ar + (br - ar) * t);
    const g = Math.round(ag + (bg - ag) * t);
    const bl = Math.round(ab + (bb - ab) * t);
    return (r << 16) | (g << 8) | bl;
  }
}
