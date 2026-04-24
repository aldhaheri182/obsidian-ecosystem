/**
 * CityGrid — orchestrates 9 isometric Chamber dioramas in a 3×3 world grid.
 *
 * Scene composition:
 *   - OrthographicCamera angled at classic isometric (elev 35.264°, az 45°).
 *   - Ambient + directional "cosmic" fill so interior accent lights pop.
 *   - Background plane with a purple/violet nebula + periodic lightning
 *     (fragment shader, full-screen billboard behind all chambers).
 *   - Chambers positioned on X/Z plane, spaced so the ortho frustum
 *     shows all nine with breathing room.
 *
 * Packet animation:
 *   - spawnPacket(fromId, toId, color) launches a glowing sphere that
 *     arcs from one chamber to another, consumed on arrival.
 *
 * This is the "command center" view — user sits above the world and
 * watches all 11 cities (9 active + 2 stubs rotating into visible slots).
 */

import * as THREE from 'three';
import { Chamber, type ChamberSpec, type ChamberArchetype } from './Chamber';
import { PALETTE } from '../tokens/palette';

/** The 11 cities, mapped to archetype + accent. 9 shown in 3x3; 2 reserved. */
export const CITY_SPECS: ChamberSpec[] = [
  { id: 'aletheia',   name: 'ALETHEIA',   accent: PALETTE.verdigris,    archetype: 'trading_floor' },
  { id: 'mnemosyne',  name: 'MNEMOSYNE',  accent: PALETTE.cyanAurora,   archetype: 'library' },
  { id: 'prometheus', name: 'PROMETHEUS', accent: PALETTE.ember,        archetype: 'lab' },
  { id: 'hephaestus', name: 'HEPHAESTUS', accent: PALETTE.ember,        archetype: 'forge' },
  { id: 'themis',     name: 'THEMIS',     accent: PALETTE.solarGold,    archetype: 'court' },
  { id: 'agora',      name: 'AGORA',      accent: PALETTE.lunarSilver,  archetype: 'port' },
  { id: 'iris',       name: 'IRIS',       accent: PALETTE.cyanAurora,   archetype: 'observatory' },
  { id: 'chronos',    name: 'CHRONOS',    accent: PALETTE.solarGold,    archetype: 'clocktower' },
  { id: 'narcissus',  name: 'NARCISSUS',  accent: PALETTE.deepAmethyst, archetype: 'mirror' },
  // M1+ reserved slots:
  { id: 'eris',       name: 'ERIS',       accent: PALETTE.crimsonForge, archetype: 'inverse' },
  { id: 'janus',      name: 'JANUS',      accent: PALETTE.ghostWhite,   archetype: 'bridge' },
];

/** World spacing between chambers (centre-to-centre). */
const GRID_SPACING = 3.2;

/** Nebula + lightning fragment shader for the background plane. */
const BG_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

const BG_FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform vec2  uRes;

  // 2D hash + value-noise + fbm.
  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f*f*(3.0 - 2.0*f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }
  float fbm(vec2 p) {
    float s = 0.0; float a = 0.5;
    for (int i = 0; i < 5; i++) { s += a * vnoise(p); p *= 2.03; a *= 0.5; }
    return s;
  }

  // Quick lightning streak: SDF of a jagged line across the screen,
  // pulsed on/off by a slow clock.
  float lightning(vec2 uv, float t) {
    // Offset jagged path across x axis with fbm.
    float y = 0.5 + 0.3 * sin(t * 0.3 + uv.x * 2.0) + 0.25 * fbm(vec2(uv.x * 8.0, t * 0.7));
    float d = abs(uv.y - y);
    // Two branches
    float y2 = 0.35 + 0.2 * cos(t * 0.23 + uv.x * 3.3) + 0.3 * fbm(vec2(uv.x * 7.0 + 11.0, t * 0.5));
    float d2 = abs(uv.y - y2);
    float core = exp(-180.0 * min(d, d2));
    // Flicker: on during short window
    float phase = fract(t * 0.12);
    float flicker = smoothstep(0.0, 0.04, phase) * (1.0 - smoothstep(0.04, 0.14, phase));
    return core * flicker;
  }

  void main() {
    vec2 uv = vUv;
    // Base radial dark background
    vec2 c = uv - 0.5;
    float vign = 1.0 - dot(c, c) * 1.6;

    // Slow drift nebula (purples + violets)
    vec2 p = uv * 2.3;
    p += vec2(uTime * 0.02, uTime * 0.015);
    float n = fbm(p);
    float n2 = fbm(p * 2.0 + 3.3);
    vec3 purple = vec3(0.35, 0.08, 0.75);
    vec3 violet = vec3(0.55, 0.20, 0.90);
    vec3 deep   = vec3(0.05, 0.02, 0.12);
    vec3 col = mix(deep, purple, smoothstep(0.2, 0.8, n));
    col = mix(col, violet, smoothstep(0.5, 0.95, n2) * 0.6);

    // Stars
    float stars = step(0.995, hash(floor(uv * 500.0)));
    col += stars * vec3(0.9, 0.85, 1.0);

    // Lightning
    float bolt = lightning(uv, uTime);
    col += bolt * vec3(0.85, 0.65, 1.0) * 1.8;

    col *= max(vign, 0.3);
    gl_FragColor = vec4(col, 1.0);
  }
`;

export type PacketEvent = {
  fromId: string;
  toId: string;
  color: number;
  lifetime: number;
  startMs: number;
};

export class CityGrid {
  scene = new THREE.Scene();
  camera!: THREE.OrthographicCamera;
  chambers = new Map<string, Chamber>();

  private bgScene = new THREE.Scene();
  private bgCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private bgMat!: THREE.ShaderMaterial;

  private packets: { mesh: THREE.Mesh; event: PacketEvent }[] = [];
  private packetGeo = new THREE.SphereGeometry(0.12, 12, 12);

  private startMs = performance.now();

  constructor() {
    this.buildCamera();
    this.buildLights();
    this.buildBackground();
    this.buildGrid();
  }

  /** Called every animation frame. */
  tick(dtMs: number): void {
    const now = performance.now();
    const dt = dtMs * 0.001;
    const elapsed = now - this.startMs;

    // Pulse camera orbit extremely subtly (alive feel without confusing user).
    this.camera.position.x = 10 + Math.sin(elapsed * 0.00008) * 0.25;
    this.camera.position.z = 10 + Math.cos(elapsed * 0.00008) * 0.25;
    this.camera.lookAt(0, 0, 0);

    for (const c of this.chambers.values()) c.tick(dt, elapsed);

    // Advance packets.
    const keep: typeof this.packets = [];
    for (const p of this.packets) {
      const t = (now - p.event.startMs) / p.event.lifetime;
      if (t >= 1.0) {
        // Arrived — pulse the destination chamber.
        const dest = this.chambers.get(p.event.toId);
        dest?.pulseActivity();
        (p.mesh.material as THREE.Material).dispose();
        this.scene.remove(p.mesh);
        continue;
      }
      const from = this.chamberWorldPos(p.event.fromId);
      const to = this.chamberWorldPos(p.event.toId);
      if (!from || !to) {
        this.scene.remove(p.mesh);
        continue;
      }
      // Arc (parabolic lift on Y).
      const x = from.x + (to.x - from.x) * t;
      const z = from.z + (to.z - from.z) * t;
      const y = 0.8 + Math.sin(t * Math.PI) * 1.5;
      p.mesh.position.set(x, y, z);
      keep.push(p);
    }
    this.packets = keep;

    if (this.bgMat) {
      this.bgMat.uniforms.uTime.value = elapsed * 0.001;
    }
  }

  /** Render to an existing renderer. Draws background first, then scene. */
  render(renderer: THREE.WebGLRenderer): void {
    renderer.autoClear = false;
    renderer.clear();
    renderer.render(this.bgScene, this.bgCamera);
    renderer.clearDepth();
    renderer.render(this.scene, this.camera);
  }

  resize(w: number, h: number): void {
    const aspect = w / h;
    const frustum = 11;
    this.camera.left = -frustum * aspect * 0.5;
    this.camera.right = frustum * aspect * 0.5;
    this.camera.top = frustum * 0.5;
    this.camera.bottom = -frustum * 0.5;
    this.camera.updateProjectionMatrix();
    if (this.bgMat) {
      this.bgMat.uniforms.uRes.value.set(w, h);
    }
  }

  /** Fire a packet from one chamber to another. */
  spawnPacket(fromId: string, toId: string, color: number): void {
    if (fromId === toId) return;
    if (!this.chambers.has(fromId) || !this.chambers.has(toId)) return;
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.9,
    });
    const mesh = new THREE.Mesh(this.packetGeo, mat);
    this.scene.add(mesh);
    this.packets.push({
      mesh,
      event: {
        fromId,
        toId,
        color,
        lifetime: 800,
        startMs: performance.now(),
      },
    });
    // Announce origin activity immediately.
    this.chambers.get(fromId)?.pulseActivity();
  }

  dispose(): void {
    for (const c of this.chambers.values()) c.object3D.traverse(o => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      const mat = m.material as THREE.Material | THREE.Material[];
      if (Array.isArray(mat)) mat.forEach(x => x.dispose());
      else if (mat) mat.dispose();
    });
    for (const p of this.packets) {
      (p.mesh.material as THREE.Material).dispose();
    }
    this.packetGeo.dispose();
    this.bgMat?.dispose();
  }

  // ------------------------------------------------------------

  private buildCamera(): void {
    this.camera = new THREE.OrthographicCamera(-10, 10, 5.5, -5.5, 0.1, 100);
    this.camera.position.set(10, 10, 10);
    this.camera.lookAt(0, 0, 0);
  }

  private buildLights(): void {
    // Cool ambient from the cosmic backdrop.
    const amb = new THREE.AmbientLight(0x7a6eb0, 0.35);
    this.scene.add(amb);

    // Key light (top) — cool violet.
    const key = new THREE.DirectionalLight(0xbcaaff, 0.7);
    key.position.set(6, 12, 4);
    this.scene.add(key);

    // Rim from lightning direction — soft cyan fill.
    const rim = new THREE.DirectionalLight(0x80f0ff, 0.25);
    rim.position.set(-8, 6, -6);
    this.scene.add(rim);
  }

  private buildBackground(): void {
    this.bgMat = new THREE.ShaderMaterial({
      vertexShader: BG_VERT,
      fragmentShader: BG_FRAG,
      uniforms: {
        uTime: { value: 0 },
        uRes: { value: new THREE.Vector2(1, 1) },
      },
      depthTest: false,
      depthWrite: false,
    });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.bgMat);
    this.bgScene.add(quad);
  }

  private buildGrid(): void {
    // 3x3 grid layout; remaining 2 (Eris, Janus) sit slightly raised behind.
    const layout: Array<{ id: string; col: number; row: number; elevate?: number }> = [
      { id: 'iris',       col: -1, row: -1 },
      { id: 'chronos',    col:  0, row: -1 },
      { id: 'prometheus', col:  1, row: -1 },
      { id: 'mnemosyne',  col: -1, row:  0 },
      { id: 'aletheia',   col:  0, row:  0 },
      { id: 'hephaestus', col:  1, row:  0 },
      { id: 'themis',     col: -1, row:  1 },
      { id: 'agora',      col:  0, row:  1 },
      { id: 'narcissus',  col:  1, row:  1 },
      { id: 'eris',       col: -0.8, row: -2.0, elevate: 0.5 },
      { id: 'janus',      col:  0.8, row: -2.0, elevate: 0.5 },
    ];

    const byId = new Map(CITY_SPECS.map(s => [s.id, s]));
    for (const slot of layout) {
      const spec = byId.get(slot.id);
      if (!spec) continue;
      const chamber = new Chamber(spec);
      chamber.setPosition(
        slot.col * GRID_SPACING,
        slot.elevate ?? 0,
        slot.row * GRID_SPACING,
      );
      // Stub cities dimmer.
      if (spec.id === 'eris' || spec.id === 'janus') {
        chamber.active = false;
      }
      this.scene.add(chamber.object3D);
      this.chambers.set(spec.id, chamber);
    }
  }

  private chamberWorldPos(id: string): THREE.Vector3 | null {
    const c = this.chambers.get(id);
    if (!c) return null;
    return c.object3D.position.clone().setY(0.6);
  }
}
