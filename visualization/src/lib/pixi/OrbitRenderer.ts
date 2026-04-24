/**
 * OrbitRenderer v2 — cinematic. Authorized by: Cinematic UI spec Part II.1.
 *
 * Stack:
 *   - PixiJS 8 as the 2D engine.
 *   - pixi-filters (Bloom, GlowFilter) for per-layer bloom.
 *   - Custom GLSL shader for the P&L aurora (shimmer + color lerp).
 *   - d3-geo great-circle paths for advancement orb arcs.
 *   - 3-layer parallax starfield with twinkle.
 *   - Lens-flare-textured city lights with per-city glyphs, pulses and colors.
 *   - Timeline orbit ring with tick marks + era labels + rotating diamond.
 *   - Vignette gradient on the edges.
 */

import {
  Application,
  Container,
  Graphics,
  Sprite,
  Text,
  ParticleContainer,
  Particle,
  Texture,
  Filter,
  GlProgram,
  Rectangle,
} from 'pixi.js';
import { BloomFilter, GlowFilter } from 'pixi-filters';
import { geoInterpolate } from 'd3-geo';
import { gsap } from 'gsap';
import { PALETTE } from '../tokens/palette';
import {
  softGlowTexture,
  lensFlareTexture,
  dotTexture,
  plusStarTexture,
} from './textures';
import { AURORA_VERT, AURORA_FRAG } from './shaders/aurora';

export type CitySpec = {
  id: string;
  name: string;
  color: number;
  lat: number;
  lon: number;
  glyph: string;
  pulse: number; // Hz, 0 = steady
};

export const CITIES: CitySpec[] = [
  { id: 'aletheia',   name: 'Aletheia',   color: PALETTE.verdigris,    lat:  15, lon: -20, glyph: 'spire',   pulse: 6 },
  { id: 'mnemosyne',  name: 'Mnemosyne',  color: PALETTE.solarGold,    lat:  25, lon:  30, glyph: 'dome',    pulse: 0 },
  { id: 'prometheus', name: 'Prometheus', color: PALETTE.cyanAurora,   lat: -10, lon:  15, glyph: 'star',    pulse: 2 },
  { id: 'hephaestus', name: 'Hephaestus', color: PALETTE.ember,        lat:  40, lon: -50, glyph: 'forge',   pulse: 1 },
  { id: 'themis',     name: 'Themis',     color: PALETTE.lunarSilver,  lat:  -5, lon:  70, glyph: 'columns', pulse: 0 },
  { id: 'agora',      name: 'Agora',      color: PALETTE.verdigris,    lat: -30, lon: -30, glyph: 'port',    pulse: 3 },
  { id: 'iris',       name: 'Iris',       color: PALETTE.deepAmethyst, lat:  55, lon:   5, glyph: 'telescope', pulse: 0.5 },
  { id: 'chronos',    name: 'Chronos',    color: 0xFFFFFF,             lat:   0, lon:   0, glyph: 'clock',   pulse: 1 },
  { id: 'narcissus',  name: 'Narcissus',  color: PALETTE.lunarSilver,  lat:  30, lon:  60, glyph: 'mirror',  pulse: 0 },
  { id: 'eris',       name: 'Eris',       color: PALETTE.crimsonForge, lat: -55, lon:  40, glyph: 'inverse', pulse: 0 },
  { id: 'janus',      name: 'Janus',      color: PALETTE.lunarSilver,  lat: -40, lon: -70, glyph: 'janus',   pulse: 0 },
];

export class OrbitRenderer {
  private app!: Application;
  private host!: HTMLElement;
  private planetRadius = 200;
  private cx = 0;
  private cy = 0;

  private starFarLayer!: ParticleContainer;
  private starMidLayer!: ParticleContainer;
  private starNearLayer!: Container;
  private planetLayer!: Container;
  private auroraFilter!: Filter;
  private auroraSprite!: Sprite;
  private timelineLayer!: Container;
  private cityLayer!: Container;
  private orbLayer!: Container;
  private vignetteLayer!: Graphics;

  private texGlow!: Texture;
  private texFlare!: Texture;
  private texDot!: Texture;
  private texPlus!: Texture;

  private pnl = 0;
  private pnlTarget = 0;
  private destroyed = false;
  private tickers: (() => void)[] = [];
  private onCityClick?: (city: CitySpec) => void;

  async mount(host: HTMLElement, onCityClick?: (c: CitySpec) => void): Promise<void> {
    this.host = host;
    this.onCityClick = onCityClick;
    this.app = new Application();
    await this.app.init({
      resizeTo: host,
      antialias: true,
      background: PALETTE.voidBlack,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
      powerPreference: 'high-performance',
    });
    host.appendChild(this.app.canvas);

    this.cx = this.app.renderer.width / 2;
    this.cy = this.app.renderer.height * 0.55;
    this.planetRadius = Math.min(this.app.renderer.width, this.app.renderer.height) * 0.26;

    this.texGlow = softGlowTexture(this.app, 64);
    this.texFlare = lensFlareTexture(this.app, 96);
    this.texDot = dotTexture(this.app, 8);
    this.texPlus = plusStarTexture(this.app, 24);

    this.buildStarfield();
    this.buildPlanet();
    this.buildAurora();
    this.buildTimelineRing();
    this.buildCities();
    this.buildOrbsLayer();
    this.buildVignette();

    const ro = new ResizeObserver(() => this.handleResize());
    ro.observe(host);

    this.app.ticker.add((t) => this.onTick(t.deltaMS));
  }

  setPnl(normalized: number): void {
    this.pnlTarget = Math.max(-1, Math.min(1, normalized));
  }

  spawnOrb(fromId: string, toId: string, durationSec = 5): void {
    if (this.destroyed) return;
    const from = CITIES.find(c => c.id === fromId);
    const to = CITIES.find(c => c.id === toId);
    if (!from || !to) return;

    const interp = geoInterpolate([from.lon, from.lat], [to.lon, to.lat]);
    const elevation = 40;

    const head = new Sprite(this.texFlare);
    head.anchor.set(0.5);
    head.tint = PALETTE.solarGold;
    head.alpha = 0.95;
    head.scale.set(0.5);
    head.blendMode = 'add';
    this.orbLayer.addChild(head);

    const trailBuf: Sprite[] = [];
    for (let i = 0; i < 16; i++) {
      const s = new Sprite(this.texDot);
      s.anchor.set(0.5);
      s.tint = PALETTE.solarGold;
      s.alpha = 0;
      s.scale.set(0.6);
      s.blendMode = 'add';
      this.orbLayer.addChild(s);
      trailBuf.push(s);
    }

    const obj = { t: 0 };
    gsap.to(obj, {
      t: 1,
      duration: durationSec,
      ease: 'power1.inOut',
      onUpdate: () => {
        const [lon, lat] = interp(obj.t);
        const arcBoost = Math.sin(obj.t * Math.PI) * elevation;
        const p = this.project(lat, lon, this.planetRadius + arcBoost);
        head.x = this.cx + p.x;
        head.y = this.cy + p.y;
        for (let i = 0; i < trailBuf.length; i++) {
          const lag = Math.max(0, obj.t - (i + 1) * 0.012);
          if (lag <= 0) continue;
          const [tlon, tlat] = interp(lag);
          const tboost = Math.sin(lag * Math.PI) * elevation;
          const pt = this.project(tlat, tlon, this.planetRadius + tboost);
          trailBuf[i].x = this.cx + pt.x;
          trailBuf[i].y = this.cy + pt.y;
          trailBuf[i].alpha = (1 - i / trailBuf.length) * 0.6;
          trailBuf[i].scale.set(0.6 - (i / trailBuf.length) * 0.3);
        }
      },
      onComplete: () => {
        this.arrivalFlash(to);
        head.destroy();
        for (const s of trailBuf) s.destroy();
      },
    });
  }

  destroy(): void {
    this.destroyed = true;
    this.app?.destroy(true, { children: true });
  }

  // =========================================================================

  private handleResize() {
    if (!this.app) return;
    this.cx = this.app.renderer.width / 2;
    this.cy = this.app.renderer.height * 0.55;
    this.planetRadius = Math.min(this.app.renderer.width, this.app.renderer.height) * 0.26;
  }

  private project(lat: number, lon: number, radius = this.planetRadius): { x: number; y: number } {
    const rad = Math.PI / 180;
    const x = Math.cos(lat * rad) * Math.sin(lon * rad) * radius;
    const y = -Math.sin(lat * rad) * radius;
    return { x, y };
  }

  private buildStarfield(): void {
    const w = this.app.renderer.width;
    const h = this.app.renderer.height;

    const far = new ParticleContainer({
      dynamicProperties: { position: true, alpha: true, scale: false, rotation: false, color: false },
    });
    for (let i = 0; i < 3000; i++) {
      const p = new Particle({
        texture: this.texDot,
        x: Math.random() * w,
        y: Math.random() * h,
        scaleX: 0.12 + Math.random() * 0.18,
        scaleY: 0.12 + Math.random() * 0.18,
        alpha: 0.15 + Math.random() * 0.35,
        tint: Math.random() > 0.98 ? PALETTE.cyanAurora : 0xffffff,
      });
      far.addParticle(p);
    }
    this.starFarLayer = far;
    this.app.stage.addChild(far);

    const mid = new ParticleContainer({
      dynamicProperties: { position: true, alpha: true, scale: false, rotation: false, color: false },
    });
    for (let i = 0; i < 1200; i++) {
      const p = new Particle({
        texture: this.texDot,
        x: Math.random() * w,
        y: Math.random() * h,
        scaleX: 0.3 + Math.random() * 0.4,
        scaleY: 0.3 + Math.random() * 0.4,
        alpha: 0.3 + Math.random() * 0.5,
        tint: Math.random() > 0.95 ? PALETTE.solarGold : 0xffffff,
      });
      mid.addParticle(p);
    }
    this.starMidLayer = mid;
    this.app.stage.addChild(mid);

    const near = new Container();
    for (let i = 0; i < 200; i++) {
      const s = new Sprite(this.texPlus);
      s.anchor.set(0.5);
      s.x = Math.random() * w;
      s.y = Math.random() * h;
      const size = 0.3 + Math.random() * 0.5;
      s.scale.set(size);
      s.alpha = 0.5 + Math.random() * 0.5;
      s.tint = Math.random() > 0.96 ? PALETTE.cyanAurora
            : Math.random() > 0.93 ? PALETTE.solarGold
            : 0xffffff;
      s.blendMode = 'add';
      gsap.to(s, {
        alpha: 0.2 + Math.random() * 0.3,
        duration: 1 + Math.random() * 3,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: Math.random() * 3,
      });
      near.addChild(s);
    }
    this.starNearLayer = near;
    this.app.stage.addChild(near);
  }

  private buildPlanet(): void {
    const { cx, cy } = this;
    const r = this.planetRadius;

    const layer = new Container();
    this.app.stage.addChild(layer);
    this.planetLayer = layer;

    // Outer atmospheric halo.
    const halo = new Graphics();
    for (let i = 10; i >= 0; i--) {
      const t = i / 10;
      halo.circle(cx, cy, r + 30 - t * 20)
        .fill({ color: 0x4a6aff, alpha: (1 - t) * 0.06 });
    }
    layer.addChild(halo);

    // Body with concentric darker rings to fake a shaded sphere.
    const body = new Graphics();
    for (let i = 0; i < 32; i++) {
      const t = i / 32;
      const color = this.lerpColor(0x14182c, 0x07080e, t);
      body.circle(cx - t * 8, cy - t * 8, r - i * (r / 48))
        .fill({ color, alpha: 1 });
    }
    body.circle(cx, cy, r).stroke({ width: 1, color: 0x0a0a0f, alpha: 0.8 });
    layer.addChild(body);

    // Great-circle lat/lon grid with mask clipping.
    const grid = new Graphics();
    grid.setStrokeStyle({ width: 0.5, color: 0x1a2040, alpha: 0.45 });
    for (let lat = -70; lat <= 70; lat += 10) {
      const steps = 64;
      for (let i = 0; i <= steps; i++) {
        const lon = -180 + (i * 360) / steps;
        const p = this.project(lat, lon);
        if (i === 0) grid.moveTo(cx + p.x, cy + p.y);
        else grid.lineTo(cx + p.x, cy + p.y);
      }
    }
    for (let lon = -180; lon <= 180; lon += 15) {
      const steps = 48;
      for (let i = 0; i <= steps; i++) {
        const lat = -90 + (i * 180) / steps;
        const p = this.project(lat, lon);
        if (i === 0) grid.moveTo(cx + p.x, cy + p.y);
        else grid.lineTo(cx + p.x, cy + p.y);
      }
    }
    grid.stroke();
    const gridMask = new Graphics().circle(cx, cy, r - 1).fill({ color: 0xffffff });
    layer.addChild(gridMask);
    grid.mask = gridMask;
    layer.addChild(grid);

    // Terminator.
    const term = new Graphics();
    for (let i = 0; i < 20; i++) {
      const t = i / 20;
      term.circle(cx + r * 0.25, cy, r - i * 3)
        .fill({ color: 0x000000, alpha: (1 - t) * 0.05 });
    }
    term.mask = gridMask;
    layer.addChild(term);
  }

  private buildAurora(): void {
    const auroraSprite = new Sprite(Texture.WHITE);
    auroraSprite.alpha = 0.001;
    auroraSprite.width = this.planetRadius * 2.4;
    auroraSprite.height = this.planetRadius * 0.9;
    auroraSprite.x = this.cx - this.planetRadius * 1.2;
    auroraSprite.y = this.cy - this.planetRadius * 1.1;

    const filter = new Filter({
      glProgram: GlProgram.from({ vertex: AURORA_VERT, fragment: AURORA_FRAG }),
      resources: {
        auroraUniforms: {
          uTime: { value: 0, type: 'f32' },
          uPnl: { value: 0, type: 'f32' },
          uIntensity: { value: 1, type: 'f32' },
          uResolution: {
            value: new Float32Array([auroraSprite.width, auroraSprite.height]),
            type: 'vec2<f32>',
          },
        },
      },
    });
    const glow = new GlowFilter({
      distance: 24,
      outerStrength: 1.4,
      innerStrength: 0.4,
      color: 0x4ecdc4,
      quality: 0.3,
    });
    auroraSprite.filters = [filter, glow];
    this.auroraFilter = filter;
    this.auroraSprite = auroraSprite;
    this.app.stage.addChild(auroraSprite);
  }

  private buildTimelineRing(): void {
    const { cx, cy } = this;
    const r = this.planetRadius * 1.22;

    const layer = new Container();
    layer.x = cx;
    layer.y = cy;
    this.app.stage.addChild(layer);
    this.timelineLayer = layer;

    const ring = new Graphics();
    ring.setStrokeStyle({ width: 1, color: 0x2a3360, alpha: 0.6 });
    ring.circle(0, 0, r);
    ring.stroke();
    layer.addChild(ring);

    const ticks = new Graphics();
    ticks.setStrokeStyle({ width: 1.5, color: 0xffd166, alpha: 0.35 });
    for (let i = 0; i < 18; i++) {
      const ang = (i / 18) * Math.PI * 2;
      const inner = r - 4;
      const outer = r + 6;
      ticks.moveTo(Math.cos(ang) * inner, Math.sin(ang) * inner);
      ticks.lineTo(Math.cos(ang) * outer, Math.sin(ang) * outer);
    }
    ticks.stroke();
    layer.addChild(ticks);

    const diamondWrap = new Container();
    const diaGlow = new Sprite(this.texGlow);
    diaGlow.anchor.set(0.5);
    diaGlow.tint = 0xffd166;
    diaGlow.scale.set(0.5);
    diaGlow.blendMode = 'add';
    diamondWrap.addChild(diaGlow);

    const diamond = new Graphics();
    diamond.moveTo(0, -8).lineTo(6, 0).lineTo(0, 8).lineTo(-6, 0).closePath()
      .fill({ color: 0xffd166, alpha: 1 });
    diamondWrap.addChild(diamond);
    layer.addChild(diamondWrap);

    const start = performance.now();
    const rotateFn = () => {
      const t = ((performance.now() - start) / 600000) % 1;
      const ang = t * Math.PI * 2;
      diamondWrap.x = Math.cos(ang) * r;
      diamondWrap.y = Math.sin(ang) * r;
      diamondWrap.rotation = ang + Math.PI / 2;
    };
    this.tickers.push(rotateFn);

    const eras = [
      { ang: -Math.PI / 2, label: 'THE SKELETON' },
      { ang: 0, label: 'THE AWAKENING' },
      { ang: Math.PI / 2, label: '—' },
      { ang: Math.PI, label: '—' },
    ];
    for (const e of eras) {
      const t = new Text({
        text: e.label,
        style: {
          fontFamily: 'Cinzel, serif',
          fontSize: 9,
          fill: 0xffd166,
          letterSpacing: 3,
        },
      });
      t.anchor.set(0.5);
      t.x = Math.cos(e.ang) * (r + 18);
      t.y = Math.sin(e.ang) * (r + 18);
      t.alpha = 0.6;
      layer.addChild(t);
    }
  }

  private buildCities(): void {
    const layer = new Container();
    layer.x = this.cx;
    layer.y = this.cy;
    this.app.stage.addChild(layer);
    this.cityLayer = layer;

    for (const city of CITIES) this.addCity(city, layer);

    layer.filters = [
      new BloomFilter({ strength: 6, quality: 4 }),
    ];
  }

  private addCity(city: CitySpec, parent: Container): void {
    const { x, y } = this.project(city.lat, city.lon);
    const c = new Container();
    c.x = x;
    c.y = y;
    c.eventMode = 'static';
    c.cursor = 'pointer';

    const flare = new Sprite(this.texFlare);
    flare.anchor.set(0.5);
    flare.tint = city.color;
    flare.scale.set(0.3);
    flare.blendMode = 'add';
    flare.alpha = 0.75;
    c.addChild(flare);

    const glow = new Sprite(this.texGlow);
    glow.anchor.set(0.5);
    glow.tint = city.color;
    glow.scale.set(1.1);
    glow.alpha = 0.45;
    glow.blendMode = 'add';
    c.addChild(glow);

    const core = new Graphics();
    core.circle(0, 0, 1.8).fill({ color: 0xffffff });
    c.addChild(core);

    const glyph = this.makeGlyph(city);
    c.addChild(glyph);

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
    name.y = 16;
    name.alpha = 0.85;
    c.addChild(name);

    if (city.pulse > 0) {
      const period = 1 / city.pulse;
      gsap.to([flare.scale, glow.scale], {
        x: 0.42, y: 0.42,
        duration: period * 0.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: Math.random() * period,
      });
    }

    c.on('pointerover', () => {
      gsap.to(flare.scale, { x: 0.55, y: 0.55, duration: 0.25 });
      gsap.to(name, { alpha: 1, duration: 0.2 });
    });
    c.on('pointerout', () => {
      gsap.to(flare.scale, { x: 0.3, y: 0.3, duration: 0.3 });
      gsap.to(name, { alpha: 0.85, duration: 0.3 });
    });
    c.on('pointertap', () => this.onCityClick?.(city));

    parent.addChild(c);
  }

  private makeGlyph(city: CitySpec): Graphics {
    const g = new Graphics();
    g.setStrokeStyle({ width: 1.2, color: city.color, alpha: 0.95 });
    switch (city.glyph) {
      case 'spire':
        g.moveTo(0, -8).lineTo(0, 8);
        g.moveTo(-2, -5).lineTo(2, -5);
        break;
      case 'dome':
        g.arc(0, 2, 7, Math.PI, 0);
        g.moveTo(-7, 2).lineTo(7, 2);
        break;
      case 'star':
        for (let i = 0; i < 6; i++) {
          const a = (i * Math.PI) / 3;
          g.moveTo(Math.cos(a) * 6, Math.sin(a) * 6);
          g.lineTo(Math.cos(a) * 2, Math.sin(a) * 2);
        }
        break;
      case 'forge':
        g.moveTo(-5, 4).lineTo(0, -5).lineTo(5, 4).closePath();
        g.rect(-3, 4, 6, 2);
        break;
      case 'columns':
        for (let x = -5; x <= 5; x += 5) {
          g.moveTo(x, -6).lineTo(x, 5);
        }
        g.moveTo(-7, -6).lineTo(7, -6);
        g.moveTo(-7, 5).lineTo(7, 5);
        break;
      case 'port':
        g.circle(-3, -1, 1.5);
        g.circle(3, -1, 1.5);
        g.circle(0, 3, 1.5);
        g.moveTo(-5, 5).lineTo(5, 5);
        break;
      case 'telescope':
        g.moveTo(-5, 5).lineTo(5, -5);
        g.circle(5, -5, 2);
        g.moveTo(-5, 5).lineTo(-7, 7);
        break;
      case 'clock':
        g.circle(0, 0, 6);
        g.moveTo(0, 0).lineTo(0, -5);
        g.moveTo(0, 0).lineTo(4, 1);
        break;
      case 'mirror':
        g.rect(-4, -6, 8, 12);
        g.moveTo(-4, 0).lineTo(4, 0);
        break;
      case 'inverse':
        g.moveTo(0, -5).lineTo(5, 5).lineTo(-5, 5).closePath();
        g.moveTo(-2, 8).lineTo(2, 8);
        break;
      case 'janus':
        g.arc(0, 0, 5, Math.PI / 2, -Math.PI / 2, true);
        break;
    }
    g.stroke();
    return g;
  }

  private buildOrbsLayer(): void {
    this.orbLayer = new Container();
    this.app.stage.addChild(this.orbLayer);
  }

  private arrivalFlash(city: CitySpec): void {
    const p = this.project(city.lat, city.lon);
    const flash = new Sprite(this.texGlow);
    flash.anchor.set(0.5);
    flash.tint = city.color;
    flash.x = this.cx + p.x;
    flash.y = this.cy + p.y;
    flash.blendMode = 'add';
    flash.alpha = 0.8;
    flash.scale.set(0.5);
    this.app.stage.addChild(flash);
    gsap.to(flash, {
      alpha: 0,
      duration: 0.6,
      ease: 'power2.out',
    });
    gsap.to(flash.scale, {
      x: 3, y: 3,
      duration: 0.6,
      ease: 'power2.out',
      onComplete: () => flash.destroy(),
    });
  }

  private buildVignette(): void {
    const w = this.app.renderer.width;
    const h = this.app.renderer.height;
    const g = new Graphics();
    const steps = 24;
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const inset = t * Math.max(w, h) * 0.4;
      g.rect(inset, inset, w - inset * 2, h - inset * 2)
        .stroke({ width: 4, color: 0x0a0a0f, alpha: (1 - t) * 0.08 });
    }
    g.alpha = 0.9;
    this.vignetteLayer = g;
    this.app.stage.addChild(g);
  }

  // -----------------------------------------------------------------

  private onTick(deltaMs: number): void {
    this.pnl += (this.pnlTarget - this.pnl) * 0.02;
    if (this.auroraFilter) {
      const u = this.auroraFilter.resources.auroraUniforms.uniforms as any;
      u.uTime = (u.uTime as number) + deltaMs * 0.001;
      u.uPnl = this.pnl;
      u.uIntensity = 1.0;
    }
    this.starFarLayer.x = (this.starFarLayer.x - 0.02) % this.app.renderer.width;
    this.starMidLayer.x = (this.starMidLayer.x - 0.06) % this.app.renderer.width;
    for (const fn of this.tickers) fn();
  }

  private lerpColor(a: number, b: number, t: number): number {
    const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
    const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
    return (Math.round(ar + (br - ar) * t) << 16)
         | (Math.round(ag + (bg - ag) * t) << 8)
         | Math.round(ab + (bb - ab) * t);
  }
}
