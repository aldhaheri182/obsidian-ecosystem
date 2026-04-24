/**
 * Chamber — a single isometric room diorama.
 *
 * A 2×2×2-unit open-top box: back wall, two side walls, floor. Accent color
 * drives point light inside, wall stripe, floor glow. Interior can be
 * decorated by passing a `decorate` callback at construction.
 *
 * Each chamber is added to a parent Object3D at its own grid position.
 */

import * as THREE from 'three';

export type ChamberSpec = {
  id: string;
  name: string;
  accent: number;      // 0xRRGGBB
  archetype: ChamberArchetype;
};

export type ChamberArchetype =
  | 'trading_floor'   // Aletheia — banks of monitors
  | 'library'         // Mnemosyne — shelves + dome
  | 'lab'             // Prometheus — lightning cage
  | 'forge'           // Hephaestus — furnace + anvil
  | 'court'           // Themis — columns + tribunal
  | 'port'            // Agora — crates + gate
  | 'observatory'     // Iris — telescope
  | 'clocktower'      // Chronos — gears + pendulum
  | 'mirror'          // Narcissus — reflective pool
  | 'inverse'         // Eris — inverted pillar
  | 'bridge';         // Janus — split half-and-half

const CHAMBER_SIZE = 2.0;
const WALL_HEIGHT = 1.3;
const WALL_THICKNESS = 0.08;

export class Chamber {
  private group = new THREE.Group();
  private floor!: THREE.Mesh;
  private pointLight!: THREE.PointLight;
  private _activityPulse = 0;
  private accent: number;

  constructor(public spec: ChamberSpec) {
    this.accent = spec.accent;
    this.buildShell();
    this.buildInterior();
  }

  get object3D(): THREE.Object3D {
    return this.group;
  }

  setPosition(x: number, y: number, z: number): void {
    this.group.position.set(x, y, z);
  }

  tick(dt: number, timeMs: number): void {
    // Subtle interior light pulse when active.
    const t = timeMs * 0.001;
    const base = 0.9;
    const pulse = this.active ? 0.3 : 0.05;
    this.pointLight.intensity = base + Math.sin(t * 2 + this.spec.id.length) * pulse;

    // Activity burst: briefly boost light when `pulseActivity` was called.
    if (this._activityPulse > 0) {
      this.pointLight.intensity += this._activityPulse;
      this._activityPulse = Math.max(0, this._activityPulse - dt * 2);
    }

    this.tickInterior(dt, timeMs);
  }

  /** Called when an agent in this chamber publishes activity. */
  pulseActivity(): void {
    this._activityPulse = Math.min(2.5, this._activityPulse + 1.2);
  }

  /** Is this city real (has agents) or stubbed for M1+? */
  active = true;

  // ------------------------------------------------------------

  private buildShell(): void {
    const s = CHAMBER_SIZE;
    const h = WALL_HEIGHT;
    const t = WALL_THICKNESS;

    // Floor — dark base with accent emissive edging.
    const floorGeo = new THREE.BoxGeometry(s, 0.05, s);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0d1020,
      roughness: 0.6,
      metalness: 0.2,
      emissive: this.accent,
      emissiveIntensity: 0.06,
    });
    this.floor = new THREE.Mesh(floorGeo, floorMat);
    this.floor.position.y = -0.025;
    this.group.add(this.floor);

    // Floor accent inlay (glowing strip around perimeter).
    const inlay = this.makeFloorInlay(s);
    inlay.position.y = 0.005;
    this.group.add(inlay);

    // Three walls (back + left + right). Front open so camera sees in.
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x15182a,
      roughness: 0.8,
      metalness: 0.15,
      side: THREE.DoubleSide,
    });
    const accentStripeMat = new THREE.MeshStandardMaterial({
      color: this.accent,
      emissive: this.accent,
      emissiveIntensity: 1.6,
      roughness: 0.3,
      metalness: 0.1,
    });

    // Back wall
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(s, h, t), wallMat);
    backWall.position.set(0, h / 2, -s / 2);
    this.group.add(backWall);
    const backStripe = new THREE.Mesh(
      new THREE.BoxGeometry(s * 0.92, 0.04, t * 1.4),
      accentStripeMat,
    );
    backStripe.position.set(0, h - 0.1, -s / 2 + 0.001);
    this.group.add(backStripe);

    // Left wall
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(t, h, s), wallMat);
    leftWall.position.set(-s / 2, h / 2, 0);
    this.group.add(leftWall);
    const leftStripe = new THREE.Mesh(
      new THREE.BoxGeometry(t * 1.4, 0.04, s * 0.92),
      accentStripeMat,
    );
    leftStripe.position.set(-s / 2 + 0.001, h - 0.1, 0);
    this.group.add(leftStripe);

    // Right wall
    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(t, h, s), wallMat);
    rightWall.position.set(s / 2, h / 2, 0);
    this.group.add(rightWall);
    const rightStripe = new THREE.Mesh(
      new THREE.BoxGeometry(t * 1.4, 0.04, s * 0.92),
      accentStripeMat,
    );
    rightStripe.position.set(s / 2 - 0.001, h - 0.1, 0);
    this.group.add(rightStripe);

    // Floor emissive pad in chamber center — strongest accent glow.
    const padGeo = new THREE.PlaneGeometry(s * 0.4, s * 0.4);
    const padMat = new THREE.MeshBasicMaterial({
      color: this.accent,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
    });
    const pad = new THREE.Mesh(padGeo, padMat);
    pad.rotation.x = -Math.PI / 2;
    pad.position.y = 0.01;
    this.group.add(pad);

    // Interior point light.
    this.pointLight = new THREE.PointLight(this.accent, 1.2, 4, 1.6);
    this.pointLight.position.set(0, h * 0.7, 0);
    this.group.add(this.pointLight);
  }

  private makeFloorInlay(s: number): THREE.Group {
    const g = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({
      color: this.accent,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
    });
    const thickness = 0.02;
    const inset = 0.08;
    const len = s - 2 * inset;
    const edges = [
      { x: 0, z: -s / 2 + inset, w: len, d: thickness },
      { x: 0, z:  s / 2 - inset, w: len, d: thickness },
      { x: -s / 2 + inset, z: 0, w: thickness, d: len },
      { x:  s / 2 - inset, z: 0, w: thickness, d: len },
    ];
    for (const e of edges) {
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(e.w, e.d), mat);
      plane.rotation.x = -Math.PI / 2;
      plane.position.set(e.x, 0, e.z);
      g.add(plane);
    }
    return g;
  }

  private interiorDecor?: (dt: number, t: number) => void;

  private buildInterior(): void {
    // Dispatch per archetype. Each adds meshes to this.group and
    // may set this.interiorDecor for per-tick animation.
    switch (this.spec.archetype) {
      case 'trading_floor':  return this.buildTradingFloor();
      case 'library':        return this.buildLibrary();
      case 'lab':            return this.buildLab();
      case 'forge':          return this.buildForge();
      case 'court':          return this.buildCourt();
      case 'port':           return this.buildPort();
      case 'observatory':    return this.buildObservatory();
      case 'clocktower':     return this.buildClocktower();
      case 'mirror':         return this.buildMirror();
      case 'inverse':        return this.buildInverse();
      case 'bridge':         return this.buildBridge();
    }
  }

  private tickInterior(dt: number, timeMs: number): void {
    this.interiorDecor?.(dt, timeMs);
  }

  // ------------- Archetypes ----------------

  /** Bank of monitors + trading desks. */
  private buildTradingFloor(): void {
    // 3 monitor columns at the back wall.
    const monitorMat = new THREE.MeshStandardMaterial({
      color: 0x0a0f1e, emissive: this.accent, emissiveIntensity: 0.9,
      roughness: 0.2, metalness: 0.1,
    });
    for (let i = -1; i <= 1; i++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.28, 0.04), monitorMat);
      m.position.set(i * 0.55, 0.9, -0.85);
      this.group.add(m);
    }
    // Trading desk (bar running along mid-chamber)
    const deskMat = new THREE.MeshStandardMaterial({
      color: 0x1c2338, roughness: 0.5, metalness: 0.3,
    });
    const desk = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.12, 0.3), deskMat);
    desk.position.set(0, 0.3, -0.3);
    this.group.add(desk);
    // Desk stripe
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.015, 0.02),
      new THREE.MeshBasicMaterial({ color: this.accent, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending }),
    );
    stripe.position.set(0, 0.36, -0.15);
    this.group.add(stripe);

    // Scrolling ticker — emissive pulse across monitors.
    let tickerT = 0;
    this.interiorDecor = (dt) => {
      tickerT += dt * 2;
      monitorMat.emissiveIntensity = 0.6 + Math.abs(Math.sin(tickerT)) * 0.6;
    };
  }

  /** Shelves + central plinth. */
  private buildLibrary(): void {
    // Back wall of books — two tiers.
    for (let tier = 0; tier < 2; tier++) {
      for (let i = -2; i <= 2; i++) {
        const b = new THREE.Mesh(
          new THREE.BoxGeometry(0.18, 0.22, 0.08),
          new THREE.MeshStandardMaterial({
            color: 0x2a2040, roughness: 0.7,
            emissive: this.accent, emissiveIntensity: 0.15,
          }),
        );
        b.position.set(i * 0.22, 0.3 + tier * 0.4, -0.85);
        this.group.add(b);
      }
    }
    // Central plinth.
    const plinth = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.22, 0.5, 16),
      new THREE.MeshStandardMaterial({ color: 0x1f2238, roughness: 0.5 }),
    );
    plinth.position.set(0, 0.25, 0);
    this.group.add(plinth);
    // Floating book.
    const book = new THREE.Mesh(
      new THREE.BoxGeometry(0.26, 0.05, 0.18),
      new THREE.MeshStandardMaterial({
        color: this.accent, emissive: this.accent, emissiveIntensity: 1.3,
      }),
    );
    book.position.set(0, 0.8, 0);
    this.group.add(book);
    this.interiorDecor = (_dt, t) => {
      book.position.y = 0.8 + Math.sin(t * 0.002) * 0.04;
      book.rotation.y = t * 0.0008;
    };
  }

  /** Lightning cage. */
  private buildLab(): void {
    // Tesla-coil-like central column.
    const col = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.2, 0.9, 12),
      new THREE.MeshStandardMaterial({ color: 0x13203a, metalness: 0.6, roughness: 0.4 }),
    );
    col.position.set(0, 0.45, 0);
    this.group.add(col);
    // Crackling ball.
    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 16, 16),
      new THREE.MeshStandardMaterial({
        color: this.accent, emissive: this.accent, emissiveIntensity: 1.8,
        roughness: 0.2,
      }),
    );
    ball.position.set(0, 1.0, 0);
    this.group.add(ball);

    // 4 corner probes.
    for (const [x, z] of [[-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]]) {
      const probe = new THREE.Mesh(
        new THREE.ConeGeometry(0.06, 0.3, 6),
        new THREE.MeshStandardMaterial({ color: 0x15182a, metalness: 0.6 }),
      );
      probe.position.set(x, 0.15, z);
      probe.rotation.z = (x < 0 ? 1 : -1) * 0.25;
      this.group.add(probe);
    }
    // Arc lines (4 thin emissive lines from ball to probes, flicker).
    const arcMat = new THREE.LineBasicMaterial({
      color: this.accent, transparent: true, opacity: 0.8,
    });
    const arcs: THREE.Line[] = [];
    for (const [x, z] of [[-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]]) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
        0, 1.0, 0,
        x, 0.3, z,
      ]), 3));
      const line = new THREE.Line(g, arcMat);
      this.group.add(line);
      arcs.push(line);
    }
    this.interiorDecor = (_dt, t) => {
      for (let i = 0; i < arcs.length; i++) {
        arcs[i].visible = (Math.floor(t * 0.01 + i * 0.3) % 3 === 0);
      }
      ball.scale.setScalar(1 + Math.sin(t * 0.008) * 0.06);
    };
  }

  /** Forge — furnace + anvil + sparks. */
  private buildForge(): void {
    // Furnace (back center): tall block with fire hole.
    const furnace = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 1.0, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x15182a, roughness: 0.9 }),
    );
    furnace.position.set(0, 0.5, -0.75);
    this.group.add(furnace);
    const fireHole = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.3, 0.1),
      new THREE.MeshBasicMaterial({
        color: this.accent, transparent: true, opacity: 1,
        blending: THREE.AdditiveBlending,
      }),
    );
    fireHole.position.set(0, 0.35, -0.55);
    this.group.add(fireHole);
    // Anvil in center.
    const anvilTop = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.1, 0.18),
      new THREE.MeshStandardMaterial({ color: 0x2a2a3e, metalness: 0.8, roughness: 0.3 }),
    );
    anvilTop.position.set(0, 0.35, 0.2);
    this.group.add(anvilTop);
    const anvilBase = new THREE.Mesh(
      new THREE.BoxGeometry(0.25, 0.3, 0.14),
      new THREE.MeshStandardMaterial({ color: 0x14172a, roughness: 0.7 }),
    );
    anvilBase.position.set(0, 0.15, 0.2);
    this.group.add(anvilBase);

    // Flickering fire light.
    const fireLight = new THREE.PointLight(this.accent, 2, 3, 2);
    fireLight.position.set(0, 0.45, -0.4);
    this.group.add(fireLight);

    this.interiorDecor = (_dt, t) => {
      fireLight.intensity = 1.8 + Math.random() * 0.6;
      fireHole.scale.y = 0.9 + Math.random() * 0.2;
    };
  }

  /** Court — columns + raised tribunal. */
  private buildCourt(): void {
    const colMat = new THREE.MeshStandardMaterial({
      color: 0xc8c8d0, roughness: 0.4, metalness: 0.1,
    });
    // 4 columns.
    for (const [x, z] of [[-0.55, -0.55], [0.55, -0.55], [-0.55, 0.55], [0.55, 0.55]]) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.15, 16), colMat);
      col.position.set(x, 0.575, z);
      this.group.add(col);
    }
    // Tribunal platform.
    const plat = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.15, 0.7),
      new THREE.MeshStandardMaterial({ color: 0x1c2030, roughness: 0.6 }),
    );
    plat.position.set(0, 0.08, -0.25);
    this.group.add(plat);
    // Scales beam.
    const beam = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.03, 0.03),
      new THREE.MeshStandardMaterial({
        color: this.accent, emissive: this.accent, emissiveIntensity: 1.2,
      }),
    );
    beam.position.set(0, 0.65, 0.1);
    this.group.add(beam);
  }

  /** Port — crates + arch. */
  private buildPort(): void {
    const crateMat = new THREE.MeshStandardMaterial({
      color: 0x362a18, roughness: 0.9,
      emissive: this.accent, emissiveIntensity: 0.15,
    });
    // Stacks of crates.
    for (const [x, z, y] of [[-0.55, 0.5, 0], [-0.4, 0.5, 0.18], [0.55, 0.5, 0], [0.4, 0.5, 0.2]] as const) {
      const c = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.22, 0.25), crateMat);
      c.position.set(x, 0.11 + y, z);
      this.group.add(c);
    }
    // Gate arch at back.
    const archMat = new THREE.MeshStandardMaterial({
      color: 0x1c2030, emissive: this.accent, emissiveIntensity: 0.3, roughness: 0.5,
    });
    const archL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.9, 0.08), archMat);
    archL.position.set(-0.35, 0.45, -0.8);
    const archR = archL.clone();
    archR.position.x = 0.35;
    const archTop = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.08, 0.08), archMat);
    archTop.position.set(0, 0.92, -0.8);
    this.group.add(archL, archR, archTop);
  }

  /** Observatory — telescope under open sky. */
  private buildObservatory(): void {
    // Tripod
    const legMat = new THREE.MeshStandardMaterial({ color: 0x15182a, metalness: 0.6, roughness: 0.4 });
    for (let i = 0; i < 3; i++) {
      const ang = (i / 3) * Math.PI * 2;
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.7, 8), legMat);
      leg.position.set(Math.cos(ang) * 0.18, 0.35, Math.sin(ang) * 0.18);
      leg.rotation.z = Math.cos(ang) * 0.25;
      leg.rotation.x = Math.sin(ang) * -0.25;
      this.group.add(leg);
    }
    // Scope
    const scope = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.14, 0.55, 16),
      new THREE.MeshStandardMaterial({
        color: 0x1c2030, metalness: 0.6, roughness: 0.3,
        emissive: this.accent, emissiveIntensity: 0.3,
      }),
    );
    scope.position.set(0, 0.9, 0);
    scope.rotation.z = -0.5;
    this.group.add(scope);
    // Lens glow
    const lens = new THREE.Mesh(
      new THREE.CircleGeometry(0.1, 16),
      new THREE.MeshBasicMaterial({
        color: this.accent, transparent: true, opacity: 0.9,
        blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      }),
    );
    lens.position.set(-0.23, 1.02, 0);
    lens.rotation.y = Math.PI / 2;
    lens.rotation.x = -0.5;
    this.group.add(lens);
    this.interiorDecor = (_dt, t) => {
      scope.rotation.y = Math.sin(t * 0.0005) * 0.8;
    };
  }

  /** Clocktower — gears and a pendulum. */
  private buildClocktower(): void {
    // Big gear on back wall.
    const gearMat = new THREE.MeshStandardMaterial({
      color: 0x2a2a3e, metalness: 0.6, roughness: 0.35,
      emissive: this.accent, emissiveIntensity: 0.25,
    });
    const gear = new THREE.Group();
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.08, 24), gearMat);
    hub.rotation.x = Math.PI / 2;
    gear.add(hub);
    // Teeth
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const t = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, 0.1), gearMat);
      t.position.set(Math.cos(a) * 0.3, Math.sin(a) * 0.3, 0);
      t.rotation.z = a;
      gear.add(t);
    }
    gear.position.set(0, 0.75, -0.87);
    this.group.add(gear);
    // Pendulum.
    const penArm = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 0.8, 0.02),
      gearMat,
    );
    const penBob = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 16, 16),
      new THREE.MeshStandardMaterial({
        color: this.accent, emissive: this.accent, emissiveIntensity: 0.9, metalness: 0.5,
      }),
    );
    const penGroup = new THREE.Group();
    penArm.position.y = -0.4;
    penBob.position.y = -0.85;
    penGroup.add(penArm, penBob);
    penGroup.position.set(0, 1.05, 0.3);
    this.group.add(penGroup);
    this.interiorDecor = (_dt, t) => {
      gear.rotation.z = t * 0.0008;
      penGroup.rotation.z = Math.sin(t * 0.002) * 0.35;
    };
  }

  /** Mirror — reflective pool. */
  private buildMirror(): void {
    const poolMat = new THREE.MeshStandardMaterial({
      color: 0x0a0d20, metalness: 0.9, roughness: 0.1,
      emissive: this.accent, emissiveIntensity: 0.25,
    });
    const pool = new THREE.Mesh(
      new THREE.CylinderGeometry(0.8, 0.8, 0.06, 32),
      poolMat,
    );
    pool.position.set(0, 0.03, 0);
    this.group.add(pool);
    // Ripple rings.
    const rings: THREE.Mesh[] = [];
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.2 + i * 0.2, 0.22 + i * 0.2, 32),
        new THREE.MeshBasicMaterial({
          color: this.accent, transparent: true, opacity: 0.4 - i * 0.1,
          blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
        }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.065;
      this.group.add(ring);
      rings.push(ring);
    }
    this.interiorDecor = (_dt, t) => {
      for (let i = 0; i < rings.length; i++) {
        const phase = (t * 0.0006 + i * 0.4) % 1;
        rings[i].scale.setScalar(0.4 + phase * 1.2);
        (rings[i].material as THREE.MeshBasicMaterial).opacity = (1 - phase) * 0.4;
      }
    };
  }

  /** Inverse — pillar pointing downward, everything reversed. */
  private buildInverse(): void {
    // Upside-down pyramid.
    const mat = new THREE.MeshStandardMaterial({
      color: 0x2a1218, emissive: this.accent, emissiveIntensity: 0.9, metalness: 0.3,
    });
    const pyr = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.9, 4), mat);
    pyr.position.set(0, 0.8, 0);
    pyr.rotation.x = Math.PI;
    this.group.add(pyr);
    // Rotating accent ring at base.
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.35, 0.02, 8, 48),
      new THREE.MeshStandardMaterial({
        color: this.accent, emissive: this.accent, emissiveIntensity: 1.6,
      }),
    );
    ring.position.set(0, 0.38, 0);
    ring.rotation.x = Math.PI / 2;
    this.group.add(ring);
    this.interiorDecor = (_dt, t) => {
      ring.rotation.z = t * 0.001;
      pyr.position.y = 0.8 + Math.sin(t * 0.0015) * 0.04;
    };
  }

  /** Janus — two faces, two halves. */
  private buildBridge(): void {
    // Left half: silver/clean
    const leftMat = new THREE.MeshStandardMaterial({
      color: 0xd0d0d8, metalness: 0.4, roughness: 0.4,
    });
    const leftSlab = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.0, 0.1), leftMat);
    leftSlab.position.set(-0.4, 0.5, -0.3);
    this.group.add(leftSlab);
    // Right half: dark/deep
    const rightMat = new THREE.MeshStandardMaterial({
      color: 0x0a0a14, metalness: 0.3, roughness: 0.7,
      emissive: 0x1a2a40, emissiveIntensity: 0.6,
    });
    const rightSlab = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.0, 0.1), rightMat);
    rightSlab.position.set(0.4, 0.5, -0.3);
    this.group.add(rightSlab);
    // Bridge line at base connecting them (accent).
    const bridge = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.05, 0.14),
      new THREE.MeshStandardMaterial({
        color: this.accent, emissive: this.accent, emissiveIntensity: 1.0,
      }),
    );
    bridge.position.set(0, 0.05, 0.25);
    this.group.add(bridge);
  }
}
