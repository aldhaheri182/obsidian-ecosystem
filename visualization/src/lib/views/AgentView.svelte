<script lang="ts">
  /*
   * Agent View — split pane. 3D memory graph + cinematic agent dashboard.
   * Authorized by: Cinematic UI spec Part II.5, Part V.
   */
  import { viewCtx } from '../stores/view';
  import { heartbeats } from '../stores/bus';
  import { onMount, onDestroy } from 'svelte';
  import { MemoryGraph } from '../three/MemoryGraph';

  const agentId = $derived($viewCtx.agentId ?? 'unknown');
  const lastHb = $derived($heartbeats.get(agentId));
  const ageSec = $derived(lastHb ? Math.floor((Date.now() - lastHb) / 1000) : null);

  let mount = $state<HTMLDivElement | null>(null);
  let graph: MemoryGraph | null = null;
  let ecg = $state<HTMLCanvasElement | null>(null);
  let ecgRaf = 0;

  onMount(async () => {
    if (mount) {
      graph = new MemoryGraph();
      await graph.mount(mount);
    }
    if (ecg) startEcg();
  });

  onDestroy(() => {
    graph?.destroy();
    if (ecgRaf) cancelAnimationFrame(ecgRaf);
  });

  function startEcg() {
    if (!ecg) return;
    const ctx = ecg.getContext('2d')!;
    const w = ecg.width;
    const h = ecg.height;
    const pts: number[] = new Array(w).fill(0);
    let lastBeat = 0;
    const draw = (t: number) => {
      // decay
      for (let i = 0; i < pts.length - 1; i++) pts[i] = pts[i + 1];
      pts[pts.length - 1] = pts[pts.length - 1] * 0.75;
      // beat spike ~1Hz (matches heartbeat cadence)
      if (t - lastBeat > 1000) {
        pts[pts.length - 1] = 1;
        lastBeat = t;
        // P wave tail
        setTimeout(() => { pts[pts.length - 1] = -0.3; }, 40);
      }
      ctx.clearRect(0, 0, w, h);
      const g = ctx.createLinearGradient(0, 0, w, 0);
      g.addColorStop(0, 'rgba(78, 205, 196, 0)');
      g.addColorStop(0.85, 'rgba(78, 205, 196, 0.7)');
      g.addColorStop(1, 'rgba(78, 205, 196, 1)');
      ctx.strokeStyle = g;
      ctx.lineWidth = 1.8;
      ctx.shadowColor = '#4ECDC4';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      for (let i = 0; i < pts.length; i++) {
        const x = i;
        const y = h / 2 - pts[i] * (h / 2 - 4);
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
  <div class="graph-pane" bind:this={mount}></div>

  <div class="graph-overlay panel">
    <div class="ceremonial small">Memory Graph</div>
    <p class="muted small">M0 shows genesis seed topology. Real lineage populates in M1 (Mnemosyne).</p>
  </div>

  <aside class="dashboard panel">
    <header class="dash-header">
      <h2 class="ceremonial">{agentId}</h2>
      <span class="muted role">agent · aletheia</span>
    </header>

    <section class="card vitals">
      <div class="card-label">Vital Signs</div>
      <canvas bind:this={ecg} class="ecg" width="200" height="46"></canvas>
      <div class="vital-row">
        <span class="muted">Last heartbeat</span>
        <span class="mono" class:live={ageSec !== null && ageSec < 5}>
          {ageSec !== null ? `${ageSec}s ago` : '—'}
        </span>
      </div>
      <div class="vital-row">
        <span class="muted">Status</span>
        <span class="status-pill active">ACTIVE</span>
      </div>
    </section>

    <section class="card">
      <div class="card-label">Performance</div>
      <div class="perf-grid">
        <div><div class="plabel">Sharpe</div><div class="pvalue muted">—</div></div>
        <div><div class="plabel">Total P&amp;L</div><div class="pvalue muted">—</div></div>
        <div><div class="plabel">Win Rate</div><div class="pvalue muted">—</div></div>
        <div><div class="plabel">Trades</div><div class="pvalue muted">—</div></div>
      </div>
      <p class="note muted">Real metrics land in M2 once the OOS trading loop runs.</p>
    </section>

    <section class="card">
      <div class="card-label">Last Reflection</div>
      <p class="reflection muted">
        No reflection emitted yet. Agents write reflections during Sleep Mode
        (M1+). Until then, only heartbeats and structural metadata are
        exposed.
      </p>
    </section>

    <section class="card chat">
      <div class="card-label">Walkabout Chat</div>
      <div class="chat-body">
        <div class="chat-bubble agent">
          Acknowledged. I can describe my reasoning but formal directives
          must flow through the executive chain.
        </div>
      </div>
      <form class="chat-input" on:submit|preventDefault>
        <input type="text" placeholder="Ask this agent about its reasoning..." disabled />
        <span class="chat-tag">UNOFFICIAL · M3+</span>
      </form>
    </section>
  </aside>
</section>

<style>
  .agent {
    position: absolute;
    inset: 56px 0 0 0;
    display: grid;
    grid-template-columns: 1fr 400px;
  }
  .graph-pane {
    position: relative;
    overflow: hidden;
  }
  :global(.graph-pane canvas) {
    display: block;
    width: 100% !important;
    height: 100% !important;
  }

  .graph-overlay {
    position: absolute;
    bottom: var(--s6);
    left: var(--s6);
    padding: var(--s4);
    max-width: 280px;
  }
  .graph-overlay .ceremonial {
    color: var(--c-solar-gold);
    font-size: 11px;
    letter-spacing: 0.2em;
    margin-bottom: var(--s1);
  }
  .small { font-size: 11px; line-height: 1.5; }

  .dashboard {
    border-left: 1px solid var(--c-panel-border);
    border-radius: 0;
    padding: var(--s6);
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: var(--s5);
  }
  .dash-header { border-bottom: 1px solid var(--c-panel-border); padding-bottom: var(--s4); }
  .dash-header h2 { color: var(--c-ghost-white); font-size: 16px; letter-spacing: 0.2em; margin-bottom: var(--s1); }
  .role { font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase; }

  .card {
    background: rgba(10, 10, 15, 0.4);
    border: 1px solid var(--c-panel-border);
    border-radius: 6px;
    padding: var(--s4);
  }
  .card-label {
    font-size: 10px;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--c-ash-grey);
    margin-bottom: var(--s3);
  }

  .ecg {
    display: block;
    width: 100%;
    height: 46px;
    margin-bottom: var(--s3);
  }
  .vital-row {
    display: flex;
    justify-content: space-between;
    padding: var(--s1) 0;
    font-size: 11px;
  }
  .mono { font-family: var(--font-mono); color: var(--c-lunar-silver); }
  .mono.live { color: var(--c-verdigris); }
  .status-pill {
    padding: 2px 8px;
    border-radius: 99px;
    font-size: 9px;
    letter-spacing: 0.12em;
  }
  .status-pill.active {
    background: rgba(78, 205, 196, 0.12);
    color: var(--c-verdigris);
  }

  .perf-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--s3);
    margin-bottom: var(--s3);
  }
  .plabel { font-size: 10px; color: var(--c-ash-grey); letter-spacing: 0.08em; }
  .pvalue { font-size: 18px; font-weight: 600; color: var(--c-ghost-white); }
  .note { font-size: 10px; }

  .reflection { font-size: 12px; line-height: 1.55; font-style: italic; }

  .chat-body { margin-bottom: var(--s3); max-height: 200px; overflow-y: auto; }
  .chat-bubble {
    padding: var(--s3);
    border-radius: 6px;
    background: rgba(42, 42, 62, 0.4);
    font-size: 12px;
    line-height: 1.5;
    color: var(--c-lunar-silver);
  }
  .chat-input {
    display: flex;
    align-items: center;
    gap: var(--s2);
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
  .chat-input input:disabled { opacity: 0.45; }
  .chat-tag {
    font-size: 9px;
    letter-spacing: 0.12em;
    color: var(--c-solar-gold);
  }
</style>
