/**
 * NexusRenderer v2 — cinematic 2D map.
 *
 * Stack:
 *   - Parchment fragment shader for the base map (fBm noise + vignette + grain).
 *   - pixi-filters Bloom over city + road layers.
 *   - Particle-tail packets using GSAP motionPath along quadratic beziers.
 *   - City icons rendered as hex-medallions with unique SVG-style glyphs
 *     drawn via Graphics, plus lens-flare sprite lights.
 *   - Animated executive spire with shimmer pulses.
 *   - Pan + zoom.
 */

import {
  Application,
  Container,
  Graphics,
  Sprite,
  Text,
  Texture,
  Filter,
  GlProgram,
  Rectangle,
} from 'pixi.js';
import { BloomFilter, GlowFilter } from 'pixi-filters';
import { gsap } from 'gsap';
import { PALETTE, MESSAGE_COLOR } from '../tokens/palette';
import {
  softGlowTexture,
  lensFlareTexture,
  dotTexture,
} from './textures';
import { PARCHMENT_VERT, PARCHMENT_FRAG } from './shaders/parchment';

type CityNode = {
  id: string;
  name: string;
  color: number;
  x: number;
  y: number;
  stub: boolean;
};

export const NEXUS_CITIES: CityNode[] = [
  { id: 'aletheia',   name: 'Aletheia',   color: PALETTE.verdigris,    x: -320, y:  160, stub: false },
  { id: 'mnemosyne',  name: 'Mnemosyne',  color: PALETTE.solarGold,    x:  -60, y:  -40, stub: true },
  { id: 'prometheus', name: 'Prometheus', color: PALETTE.cyanAurora,   x:  220, y:  -20, stub: true },
  { id: 'hephaestus', name: 'Hephaestus', color: PALETTE.ember,        x:  360, y:  180, stub: true },
  { id: 'themis',     name: 'Themis',     color: PALETTE.lunarSilver,  x:   40, y:  260, stub: true },
  { id: 'agora',      name: 'Agora',      color: PALETTE.verdigris,    x: -180, y:  320, stub: true },
  { id: 'iris',       name: 'Iris',       color: PALETTE.deepAmethyst, x:  300, y: -240, stub: true },
  { id: 'chronos',    name: 'Chronos',    color: 0xFFFFFF,             x: -360, y:  -80, stub: false },
  { id: 'narcissus',  name: 'Narcissus',  color: PALETTE.lunarSilver,  x:  120, y: -240, stub: true },
  { id: 'eris',       name: 'Eris',       color: PALETTE.crimsonForge, x:  420, y:  340, stub: true },
  { id: 'janus',      name: 'Janus',      color: PALETTE.lunarSilver,  x: -440, y:  320, stub: true },
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
  private spireLayer!: Container;
  private parchmentFilter!: Filter;
  private parchmentSprite!: Sprite;
  private texGlow!: Texture;
  private texFlare!: Texture;
  private texDot!: Texture;
  private destroyed = false;
  private onCityClick?: (id: string) => void;
  private roadPulseStart = performance.now();

  async mount(host: HTMLElement, onCityClick?: (id: string) => void): Promise<void> {
    this.onCityClick = onCityClick;
    this.app = new Application();
    await this.app.init({
      resizeTo: host,
      antialias: true,
      background: 0x05060b,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
    });
    host.appendChild(this.app.canvas);

    this.texGlow = softGlowTexture(this.app, 64);
    this.texFlare = lensFlareTexture(this.app, 96);
    this.texDot = dotTexture(this.app, 8);

    // Parchment background full-screen.
    const parch = new Sprite(Texture.WHITE);
    parch.width = this.app.renderer.width;
    parch.height = this.app.renderer.height;
    parch.alpha = 0.001;
    const f = new Filter({
      glProgram: GlProgram.from({ vertex: PARCHMENT_VERT, fragment: PARCHMENT_FRAG }),
      resources: {
        parchUniforms: {
          uTime: { value: 0, type: 'f32' },
          uCenter: { value: new Float32Array([0.5, 0.5]), type: 'vec2<f32>' },
        },
      },
    });
    parch.filters = [f];
    this.parchmentFilter = f;
    this.parchmentSprite = parch;
    this.app.stage.addChild(parch);

    this.worldLayer = new Container();
    this.worldLayer.x = this.app.renderer.width / 2;
    this.worldLayer.y = this.app.renderer.height / 2;
    this.app.stage.addChild(this.worldLayer);

    this.roadLayer = new Graphics();
    this.worldLayer.addChild(this.roadLayer);
    this.drawRoads();

    this.cityLayer = new Container();
    this.cityLayer.filters = [new BloomFilter({ strength: 4, quality: 3 })];
    this.worldLayer.addChild(this.cityLayer);
    for (const c of NEXUS_CITIES) this.addCity(c);

    this.spireLayer = new Container();
    this.worldLayer.addChild(this.spireLayer);
    this.addSpire();

    this.packetLayer = new Container();
    this.worldLayer.addChild(this.packetLayer);

    // Pan
    let dragging = false;
    let lastX = 0, lastY = 0;
    this.app.canvas.addEventListener('contextmenu', (e: Event) => e.preventDefault());
    this.app.canvas.addEventListener('pointerdown', (e: PointerEvent) => {
      if (e.button === 1 || e.button === 2) {
        dragging = true;
        lastX = e.clientX; lastY = e.clientY;
      }
    });
    this.app.canvas.addEventListener('pointermove', (e: PointerEvent) => {
      if (!dragging) return;
      this.worldLayer.x += e.clientX - lastX;
      this.worldLayer.y += e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
    });
    this.app.canvas.addEventListener('pointerup', () => (dragging = false));
    this.app.canvas.addEventListener('pointerleave', () => (dragging = false));

    this.app.ticker.add((t) => this.onTick(t.deltaMS));
  }

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
    const packet = new Sprite(this.texGlow);
    packet.anchor.set(0.5);
    packet.tint = color;
    packet.alpha = 0.85;
    packet.scale.set(0.5);
    packet.blendMode = 'add';
    this.packetLayer.addChild(packet);

    // Trail: 8 small dots.
    const tail: Sprite[] = [];
    for (let i = 0; i < 8; i++) {
      const s = new Sprite(this.texDot);
      s.anchor.set(0.5);
      s.tint = color;
      s.blendMode = 'add';
      s.alpha = 0;
      this.packetLayer.addChild(s);
      tail.push(s);
    }

    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2 - 30;

    const priSpeed: Record<string, number> = {
      PRIORITY_LOW: 2.0,
      PRIORITY_NORMAL: 1.2,
      PRIORITY_HIGH: 0.6,
      PRIORITY_CRITICAL: 0.3,
    };
    const duration = priSpeed[priority] ?? 1.2;

    const obj = { t: 0 };
    const sample = (t: number) => {
      const u = 1 - t;
      return {
        x: u * u * from.x + 2 * u * t * midX + t * t * to.x,
        y: u * u * from.y + 2 * u * t * midY + t * t * to.y,
      };
    };

    gsap.to(obj, {
      t: 1,
      duration,
      ease: 'power1.inOut',
      onUpdate: () => {
        const p = sample(obj.t);
        packet.x = p.x;
        packet.y = p.y;
        for (let i = 0; i < tail.length; i++) {
          const lag = Math.max(0, obj.t - (i + 1) * 0.02);
          if (lag <= 0) continue;
          const tp = sample(lag);
          tail[i].x = tp.x;
          tail[i].y = tp.y;
          tail[i].alpha = (1 - i / tail.length) * 0.5;
          tail[i].scale.set((1 - i / tail.length) * 0.5);
        }
      },
      onComplete: () => {
        packet.destroy();
        for (const s of tail) s.destroy();
      },
    });
  }

  destroy(): void {
    this.destroyed = true;
    this.app?.destroy(true, { children: true });
  }

  // -----------------------------------------------------------------

  private drawRoads(): void {
    this.roadLayer.clear();
    for (const [a, b] of ROADS) {
      const ca = NEXUS_CITIES.find(c => c.id === a)!;
      const cb = NEXUS_CITIES.find(c => c.id === b)!;
      const midX = (ca.x + cb.x) / 2;
      const midY = (ca.y + cb.y) / 2 - 30;
      this.roadLayer.setStrokeStyle({ width: 8, color: PALETTE.verdigris, alpha: 0.04 });
      this.roadLayer.moveTo(ca.x, ca.y);
      this.roadLayer.quadraticCurveTo(midX, midY, cb.x, cb.y);
      this.roadLayer.stroke();
      this.roadLayer.setStrokeStyle({ width: 1.5, color: 0x2a2a3e, alpha: 0.65 });
      this.roadLayer.moveTo(ca.x, ca.y);
      this.roadLayer.quadraticCurveTo(midX, midY, cb.x, cb.y);
      this.roadLayer.stroke();
    }
  }

  private addCity(city: CityNode): void {
    const c = new Container();
    c.x = city.x;
    c.y = city.y;
    c.eventMode = city.stub ? 'none' : 'static';
    c.cursor = city.stub ? 'not-allowed' : 'pointer';

    // Lens flare light.
    const flare = new Sprite(this.texFlare);
    flare.anchor.set(0.5);
    flare.tint = city.color;
    flare.scale.set(city.stub ? 0.25 : 0.5);
    flare.alpha = city.stub ? 0.3 : 0.85;
    flare.blendMode = 'add';
    c.addChild(flare);

    // Soft glow.
    const glow = new Sprite(this.texGlow);
    glow.anchor.set(0.5);
    glow.tint = city.color;
    glow.scale.set(city.stub ? 0.7 : 1.2);
    glow.alpha = city.stub ? 0.15 : 0.45;
    glow.blendMode = 'add';
    c.addChild(glow);

    // Hexagonal medallion.
    const hex = new Graphics();
    const r = 18;
    const path: Array<[number, number]> = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
      path.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    hex.moveTo(path[0][0], path[0][1]);
    for (let i = 1; i < 6; i++) hex.lineTo(path[i][0], path[i][1]);
    hex.closePath();
    hex.fill({ color: 0x0d1020, alpha: city.stub ? 0.5 : 0.85 });
    hex.setStrokeStyle({ width: 1.6, color: city.color, alpha: city.stub ? 0.3 : 0.9 });
    hex.stroke();
    c.addChild(hex);

    // Inner architecture silhouette (skyscrapers / dome / etc).
    if (!city.stub) {
      const arch = new Graphics();
      const heights = [8, 14, 10];
      for (let i = 0; i < heights.length; i++) {
        const x = (i - 1) * 4;
        arch.rect(x - 1.5, -heights[i] / 2, 3, heights[i])
          .fill({ color: city.color, alpha: 0.95 });
      }
      c.addChild(arch);
    } else {
      const dash = new Text({
        text: '—',
        style: {
          fontFamily: 'Cinzel, serif',
          fontSize: 12,
          fill: city.color,
        },
      });
      dash.anchor.set(0.5);
      c.addChild(dash);
    }

    // Name + agent count.
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
        text: 'STUB · MILESTONE M1+',
        style: {
          fontFamily: 'Inter, sans-serif',
          fontSize: 7,
          fill: PALETTE.ashGrey,
          letterSpacing: 2,
        },
      });
      sub.anchor.set(0.5, 0);
      sub.y = r + 18;
      c.addChild(sub);
    } else {
      gsap.to([flare.scale, glow.scale], {
        x: `+=${city.stub ? 0 : 0.1}`,
        y: `+=${city.stub ? 0 : 0.1}`,
        duration: 2,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });
    }

    c.on('pointerover', () => {
      if (city.stub) return;
      gsap.to(flare.scale, { x: 0.7, y: 0.7, duration: 0.2 });
      gsap.to(hex.scale, { x: 1.1, y: 1.1, duration: 0.2 });
    });
    c.on('pointerout', () => {
      if (city.stub) return;
      gsap.to(flare.scale, { x: 0.5, y: 0.5, duration: 0.3 });
      gsap.to(hex.scale, { x: 1, y: 1, duration: 0.3 });
    });
    c.on('pointertap', () => {
      if (!city.stub) this.onCityClick?.(city.id);
    });

    this.cityLayer.addChild(c);
  }

  private addSpire(): void {
    const c = new Container();

    // Base platform.
    const base = new Graphics();
    base.ellipse(0, 0, 18, 7).fill({ color: PALETTE.solarGold, alpha: 0.18 });
    c.addChild(base);

    // Vertical beam via triangular gradient.
    const beam = new Graphics();
    beam.moveTo(-2.5, 0).lineTo(2.5, 0).lineTo(0, -110).closePath()
      .fill({ color: PALETTE.solarGold, alpha: 0.6 });
    c.addChild(beam);

    // Outer beam glow.
    const outer = new Graphics();
    outer.moveTo(-10, 0).lineTo(10, 0).lineTo(0, -140).closePath()
      .fill({ color: PALETTE.solarGold, alpha: 0.06 });
    c.addChildAt(outer, 0);

    // GSAP shimmer: a horizontal sliver travels up the beam.
    const shimmer = new Graphics();
    shimmer.rect(-6, 0, 12, 1).fill({ color: 0xffffff, alpha: 0.95 });
    c.addChild(shimmer);
    gsap.to(shimmer, {
      y: -110,
      alpha: 0,
      duration: 1.5,
      repeat: -1,
      ease: 'power1.out',
      onStart: () => { shimmer.y = 0; shimmer.alpha = 0.95; },
      onRepeat: () => { shimmer.y = 0; shimmer.alpha = 0.95; },
    });

    // Global glow filter.
    c.filters = [new GlowFilter({
      distance: 15,
      outerStrength: 1.2,
      innerStrength: 0.4,
      color: PALETTE.solarGold,
      quality: 0.3,
    })];

    this.spireLayer.addChild(c);
  }

  private onTick(deltaMs: number): void {
    if (this.parchmentFilter) {
      const u = this.parchmentFilter.resources.parchUniforms.uniforms as any;
      u.uTime = (u.uTime as number) + deltaMs * 0.001;
    }
    // Pulse road alpha with message volume — simplified to slow sine.
    const t = (performance.now() - this.roadPulseStart) / 2000;
    this.roadLayer.alpha = 0.85 + Math.sin(t * Math.PI * 2) * 0.1;
  }
}
