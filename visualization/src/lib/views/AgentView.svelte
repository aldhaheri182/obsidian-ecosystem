<script lang="ts">
  /*
   * Agent View — split panel. Left: 3D memory graph (M1+ dependency;
   * empty placeholder today). Right: agent dashboard with vitals,
   * perf, reflection, chat.
   * Authorized by: Cinematic UI spec Part II.5, Part V.
   */
  import { viewCtx, descend } from '../stores/view';
  import { heartbeats } from '../stores/bus';
  import { onMount, onDestroy } from 'svelte';
  import * as THREE from 'three';

  const agentId = $derived($viewCtx.agentId ?? 'unknown');
  const lastHb = $derived($heartbeats.get(agentId));
  const ageSec = $derived(lastHb ? Math.floor((Date.now() - lastHb) / 1000) : null);

  let mount = $state<HTMLDivElement | null>(null);
  let renderer: THREE.WebGLRenderer | null = null;
  let scene: THREE.Scene | null = null;
  let camera: THREE.PerspectiveCamera | null = null;
  let rafId = 0;

  // ECG canvas
  let ecgCanvas = $state<HTMLCanvasElement | null>(null);
  let ecgPoints: number[] = [];
  let ecgRaf = 0;

  onMount(() => {
    if (mount) initGraph();
    if (ecgCanvas) startEcg();
  });

  onDestroy(() => {
    if (rafId) cancelAnimationFrame(rafId);
    if (ecgRaf) cancelAnimationFrame(ecgRaf);
    renderer?.dispose();
    renderer = null;
  });

  function initGraph() {
    if (!mount) return;
    const { clientWidth: w, clientHeight: h } = mount;
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0f);
    camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 100);
    camera.position.set(0, 0, 15);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(w, h);
    mount.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0x404060, 0.4);
    scene.add(ambient);
    const p1 = new THREE.PointLight(0x4ecdc4, 1.2);
    p1.position.set(10, 10, 10);
    scene.add(p1);
    const p2 = new THREE.PointLight(0xffd166, 0.8);
    p2.position.set(-10, -5, 5);
    scene.add(p2);

    // M0 has no memory graph data. Place a single "genesis" node.
    const geom = new THREE.SphereGeometry(0.4, 16, 16);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffd166,
      emissive: 0xffd166,
      emissiveIntensity: 0.3,
      roughness: 0.3,
      metalness: 0.1,
    });
    const genesis = new THREE.Mesh(geom, mat);
    scene.add(genesis);

    // Placeholder particles around it — "seeds of future knowledge".
    const particles = new THREE.BufferGeometry();
    const positions = new Float32Array(200 * 3);
    for (let i = 0; i < 200; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0x4ecdc4,
      size: 0.05,
      transparent: true,
      opacity: 0.3,
    });
    scene.add(new THREE.Points(particles, pMat));

    const render = () => {
      genesis.rotation.y += 0.003;
      renderer!.render(scene!, camera!);
      rafId = requestAnimationFrame(render);
    };
    render();
  }

  function startEcg() {
    if (!ecgCanvas) return;
    const ctx = ecgCanvas.getContext('2d');
    if (!ctx) return;
    let lastBeat = 0;
    const draw = (t: number) => {
      ecgPoints.push(ecgPoints.length > 0 ? ecgPoints[ecgPoints.length - 1] * 0.85 : 0);
      if (t - lastBeat > 1000) {
        ecgPoints[ecgPoints.length - 1] = 1;
        lastBeat = t;
      }
      if (ecgPoints.length > 120) ecgPoints.shift();
      ctx.clearRect(0, 0, ecgCanvas!.width, ecgCanvas!.height);
      ctx.strokeStyle = '#4ECDC4';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < ecgPoints.length; i++) {
        const x = i;
        const y = 20 - ecgPoints[i] * 15;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ecgRaf = requestAnimationFrame(draw);
    };
    ecgRaf = requestAnimationFrame(draw);
  }
</script>

<section class="agent">
  <div class="graph-pane">
    <div bind:this={mount} class="three-mount"></div>
    <div class="graph-overlay panel">
      <span class="muted small">Memory graph requires Mnemosyne (M1). Showing genesis seed only.</span>
    </div>
  </div>

  <aside class="dashboard panel">
    <header class="dash-header">
      <h2 class="ceremonial">{agentId}</h2>
      <span class="role muted">aletheia</span>
    </header>

    <!-- Vital Signs -->
    <div class="vitals">
      <canvas bind:this={ecgCanvas} width="120" height="40" class="ecg"></canvas>
      <div class="vital-row">
        <span class="label">UPTIME</span>
        <span class="value">{ageSec !== null ? `${ageSec}s since last hb` : 'unknown'}</span>
      </div>
      <div class="vital-row">
        <span class="label">STATUS</span>
        <span class="value" style="color: var(--c-verdigris)">ACTIVE</span>
      </div>
    </div>

    <!-- Performance (stubbed) -->
    <div class="perf">
      <h3 class="section-head">Performance</h3>
      <div class="perf-grid">
        <div><div class="plabel">Sharpe</div><div class="pvalue muted">—</div></div>
        <div><div class="plabel">P&amp;L</div><div class="pvalue muted">—</div></div>
        <div><div class="plabel">Win Rate</div><div class="pvalue muted">—</div></div>
        <div><div class="plabel">Trades</div><div class="pvalue muted">—</div></div>
      </div>
      <p class="note">Real metrics land in M2 once the trading loop runs OOS.</p>
    </div>

    <!-- Chat -->
    <div class="chat">
      <h3 class="section-head">Walkabout Chat</h3>
      <div class="chat-body">
        <div class="chat-bubble agent">
          Acknowledged. I can answer questions about my reasoning, but formal
          directives must flow through the executive chain.
        </div>
      </div>
      <form class="chat-input" on:submit|preventDefault>
        <input type="text" placeholder="Ask this agent about its reasoning..." disabled />
        <span class="chat-tag">UNOFFICIAL · M3+</span>
      </form>
    </div>
  </aside>
</section>

<style>
  .agent {
    position: absolute;
    inset: 56px 0 0 0;
    display: grid;
    grid-template-columns: 1fr 380px;
    gap: 0;
  }

  .graph-pane { position: relative; }
  .three-mount {
    position: absolute;
    inset: 0;
  }
  :global(.three-mount canvas) {
    width: 100% !important;
    height: 100% !important;
  }
  .graph-overlay {
    position: absolute;
    bottom: var(--s5);
    left: var(--s5);
    padding: var(--s3);
    max-width: 320px;
  }
  .small { font-size: 10px; }

  .dashboard {
    height: 100%;
    overflow-y: auto;
    border-left: 1px solid var(--c-panel-border);
    border-radius: 0;
    padding: var(--s6);
    display: flex;
    flex-direction: column;
    gap: var(--s6);
  }
  .dash-header h2 {
    color: var(--c-ghost-white);
    font-size: 16px;
    letter-spacing: 0.15em;
  }
  .role { font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; }
  .section-head {
    font-size: 11px;
    color: var(--c-ash-grey);
    letter-spacing: 0.12em;
    text-transform: uppercase;
    margin-bottom: var(--s3);
  }

  .ecg {
    width: 120px;
    height: 40px;
    margin-bottom: var(--s3);
  }
  .vital-row {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    padding: var(--s1) 0;
  }
  .vital-row .label { color: var(--c-ash-grey); letter-spacing: 0.08em; }

  .perf-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--s4);
  }
  .plabel { font-size: 10px; color: var(--c-ash-grey); letter-spacing: 0.1em; }
  .pvalue { font-size: 18px; color: var(--c-ghost-white); font-weight: 600; }
  .note { font-size: 10px; color: var(--c-ash-grey); margin-top: var(--s3); }

  .chat-body {
    max-height: 200px;
    overflow-y: auto;
    padding: var(--s3) 0;
  }
  .chat-bubble {
    font-size: 12px;
    line-height: 1.5;
    padding: var(--s3);
    border-radius: 6px;
    margin-bottom: var(--s2);
  }
  .chat-bubble.agent {
    background: rgba(42, 42, 62, 0.4);
    color: var(--c-lunar-silver);
    border-bottom-left-radius: 2px;
  }
  .chat-input {
    display: flex;
    gap: var(--s2);
    align-items: center;
  }
  .chat-input input {
    flex: 1;
    background: rgba(10, 10, 15, 0.8);
    border: 1px solid var(--c-panel-border);
    color: var(--c-lunar-silver);
    padding: var(--s2);
    border-radius: 4px;
    font-size: 11px;
  }
  .chat-input input:disabled { opacity: 0.5; }
  .chat-tag {
    font-size: 9px;
    letter-spacing: 0.12em;
    color: var(--c-solar-gold);
  }
</style>
