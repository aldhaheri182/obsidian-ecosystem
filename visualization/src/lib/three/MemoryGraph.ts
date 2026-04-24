/**
 * MemoryGraph — Three.js force-directed 3D graph with postprocessing.
 *
 * Uses:
 *   - three + postprocessing (UnrealBloomEffect, VignetteEffect, SMAAEffect)
 *   - d3-force-3d for physics (running on the main thread; moving to a
 *     worker is an M3+ optimization)
 *
 * M0 data contract: feed it a list of { id, type, importance } + edges.
 * The Knowledge Graph (M1) will populate this with real data; today we
 * render a synthetic genesis seed so the view is visually alive.
 */

import * as THREE from 'three';
import {
  EffectComposer,
  RenderPass,
  EffectPass,
  BloomEffect,
  VignetteEffect,
  SMAAEffect,
} from 'postprocessing';
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  SimulationNodeDatum,
} from 'd3-force-3d';
import { MEMORY_NODE_COLOR, PALETTE } from '../tokens/palette';

export type MemoryNodeData = {
  id: string;
  type: keyof typeof MEMORY_NODE_COLOR;
  importance?: number;
};

export type MemoryEdgeData = {
  source: string;
  target: string;
  relation: 'CAUSES' | 'CORRELATES' | 'PRECEDES' | 'CONTRADICTS' | 'CITES';
  recent?: boolean;
};

type GraphNode = SimulationNodeDatum & {
  id: string;
  data: MemoryNodeData;
  mesh: THREE.Mesh;
  glow: THREE.Mesh;
};

type GraphEdge = {
  source: string;
  target: string;
  data: MemoryEdgeData;
  line: THREE.Line;
};

export class MemoryGraph {
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private composer!: EffectComposer;
  private bloom!: BloomEffect;
  private host!: HTMLElement;

  private nodes: GraphNode[] = [];
  private edges: GraphEdge[] = [];
  private simulation: any = null;
  private destroyed = false;

  private rotating = true;
  private autoRotateSpeed = 0.04;

  async mount(host: HTMLElement): Promise<void> {
    this.host = host;

    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(host.clientWidth, host.clientHeight);
    this.renderer.setClearColor(0x0a0a0f);
    host.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x0a0a0f, 18, 45);

    this.camera = new THREE.PerspectiveCamera(
      60,
      host.clientWidth / host.clientHeight,
      0.1,
      200,
    );
    this.camera.position.set(0, 0, 20);
    this.camera.lookAt(0, 0, 0);

    // Lighting — matches spec (#4ECDC4 and #FFD166 accent lights).
    const ambient = new THREE.AmbientLight(0x404060, 0.4);
    this.scene.add(ambient);
    const p1 = new THREE.PointLight(0x4ecdc4, 4, 100, 1.4);
    p1.position.set(10, 10, 10);
    this.scene.add(p1);
    const p2 = new THREE.PointLight(0xffd166, 3, 100, 1.4);
    p2.position.set(-10, -5, 5);
    this.scene.add(p2);
    const p3 = new THREE.PointLight(0x7209b7, 2, 100, 1.4);
    p3.position.set(0, -12, -5);
    this.scene.add(p3);

    // Postprocessing stack.
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new BloomEffect({
      intensity: 1.6,
      luminanceThreshold: 0.15,
      luminanceSmoothing: 0.8,
      mipmapBlur: true,
      radius: 0.75,
    });
    const vignette = new VignetteEffect({
      offset: 0.35,
      darkness: 0.75,
    });
    const smaa = new SMAAEffect();
    this.composer.addPass(new EffectPass(this.camera, this.bloom, vignette, smaa));

    // Starfield background points — 1500 dim specks.
    const bgPositions = new Float32Array(1500 * 3);
    for (let i = 0; i < 1500; i++) {
      const r = 40 + Math.random() * 30;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      bgPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      bgPositions[i * 3 + 1] = r * Math.cos(phi);
      bgPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const bgGeom = new THREE.BufferGeometry();
    bgGeom.setAttribute('position', new THREE.BufferAttribute(bgPositions, 3));
    const bgMat = new THREE.PointsMaterial({
      color: 0xe0e0e0,
      size: 0.12,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.55,
    });
    this.scene.add(new THREE.Points(bgGeom, bgMat));

    window.addEventListener('resize', () => this.onResize());

    // Seed with the genesis cluster so the view isn't empty in M0.
    this.seedGenesis();

    this.runLoop();
  }

  setData(nodes: MemoryNodeData[], edges: MemoryEdgeData[]): void {
    // Rebuild scene state.
    for (const n of this.nodes) {
      this.scene.remove(n.mesh);
      this.scene.remove(n.glow);
      n.mesh.geometry.dispose();
      (n.mesh.material as THREE.Material).dispose();
    }
    for (const e of this.edges) {
      this.scene.remove(e.line);
      e.line.geometry.dispose();
      (e.line.material as THREE.Material).dispose();
    }
    this.nodes = [];
    this.edges = [];

    for (const n of nodes) this.addNode(n);
    for (const e of edges) this.addEdge(e);
    this.restartSimulation();
  }

  destroy(): void {
    this.destroyed = true;
    this.simulation?.stop();
    this.composer?.dispose();
    this.renderer?.dispose();
  }

  // -----------------------------------------------------------------

  private seedGenesis(): void {
    const nodes: MemoryNodeData[] = [
      { id: 'genesis', type: 'PRINCIPLE', importance: 1.8 },
      { id: 'observation-seed-1', type: 'OBSERVATION', importance: 0.9 },
      { id: 'observation-seed-2', type: 'OBSERVATION', importance: 0.9 },
      { id: 'inference-seed-1',   type: 'INFERENCE',   importance: 0.7 },
      { id: 'outcome-seed-1',     type: 'OUTCOME',     importance: 0.6 },
      { id: 'counterfactual-seed-1', type: 'COUNTERFACTUAL', importance: 0.5 },
    ];
    const edges: MemoryEdgeData[] = [
      { source: 'observation-seed-1', target: 'inference-seed-1', relation: 'CAUSES', recent: true },
      { source: 'observation-seed-2', target: 'inference-seed-1', relation: 'CAUSES' },
      { source: 'inference-seed-1', target: 'outcome-seed-1', relation: 'CAUSES', recent: true },
      { source: 'inference-seed-1', target: 'counterfactual-seed-1', relation: 'CONTRADICTS' },
      { source: 'outcome-seed-1', target: 'genesis', relation: 'CITES' },
    ];
    this.setData(nodes, edges);
  }

  private addNode(data: MemoryNodeData): void {
    const importance = data.importance ?? 1.0;
    const color = MEMORY_NODE_COLOR[data.type] ?? PALETTE.lunarSilver;
    const radius = 0.25 + importance * 0.4;

    const geom = new THREE.SphereGeometry(radius, 24, 24);
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.2,
      metalness: 0.0,
      emissive: color,
      emissiveIntensity: 0.4,
    });
    const mesh = new THREE.Mesh(geom, mat);
    this.scene.add(mesh);

    // Outer glow sphere
    const glowGeom = new THREE.SphereGeometry(radius * 2.4, 16, 16);
    const glowMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.09,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const glow = new THREE.Mesh(glowGeom, glowMat);
    this.scene.add(glow);

    const node: GraphNode = {
      id: data.id,
      data,
      x: (Math.random() - 0.5) * 10,
      y: (Math.random() - 0.5) * 10,
      z: (Math.random() - 0.5) * 5,
      mesh,
      glow,
    };
    this.nodes.push(node);
  }

  private addEdge(data: MemoryEdgeData): void {
    const color = data.recent ? PALETTE.solarGold
      : data.relation === 'CAUSES' ? PALETTE.verdigris
      : data.relation === 'CORRELATES' ? PALETTE.lunarSilver
      : data.relation === 'CONTRADICTS' ? PALETTE.crimsonForge
      : PALETTE.ghostWhite;

    const geom = new THREE.BufferGeometry();
    const pos = new Float32Array(6);
    geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: data.recent ? 0.95 : 0.45,
    });
    const line = new THREE.Line(geom, mat);
    this.scene.add(line);

    this.edges.push({ source: data.source, target: data.target, data, line });
  }

  private restartSimulation(): void {
    this.simulation?.stop();
    this.simulation = forceSimulation(this.nodes as any, 3)
      .force('link', forceLink(this.edges).id((d: any) => d.id).distance(4).strength(0.6))
      .force('charge', forceManyBody().strength(-12))
      .force('center', forceCenter(0, 0, 0))
      .alphaDecay(0.02)
      .velocityDecay(0.4);
  }

  private onResize(): void {
    if (!this.host) return;
    const w = this.host.clientWidth;
    const h = this.host.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
  }

  private runLoop(): void {
    const clock = new THREE.Clock();
    const step = () => {
      if (this.destroyed) return;
      const dt = clock.getDelta();

      // Update node mesh positions from simulation.
      for (const n of this.nodes) {
        n.mesh.position.set(n.x ?? 0, n.y ?? 0, n.z ?? 0);
        n.glow.position.copy(n.mesh.position);
      }

      // Update edge line endpoints.
      for (const e of this.edges) {
        const s = this.nodes.find(n => n.id === e.source);
        const t = this.nodes.find(n => n.id === e.target);
        if (!s || !t) continue;
        const pos = (e.line.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
        pos[0] = s.x ?? 0; pos[1] = s.y ?? 0; pos[2] = s.z ?? 0;
        pos[3] = t.x ?? 0; pos[4] = t.y ?? 0; pos[5] = t.z ?? 0;
        e.line.geometry.attributes.position.needsUpdate = true;
      }

      // Auto-rotate scene.
      if (this.rotating) {
        this.scene.rotation.y += dt * this.autoRotateSpeed;
      }

      this.composer.render(dt);
      requestAnimationFrame(step);
    };
    step();
  }
}
