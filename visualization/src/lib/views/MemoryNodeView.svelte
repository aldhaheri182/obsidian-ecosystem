<script lang="ts">
  /*
   * Memory Node View — single card showing node payload + causal links.
   * Authorized by: Cinematic UI spec Part II.6, Part VI.
   * M1+ (Mnemosyne) populates this with real data; M0 shows a reference
   * card for the genesis block.
   */
  import { viewCtx, ascend } from '../stores/view';

  const nodeId = $derived($viewCtx.memoryNodeId ?? 'genesis-00');
</script>

<section class="memory-node">
  <article class="card">
    <header>
      <div class="header-row">
        <div class="type-badge genesis">GENESIS</div>
        <h2 class="title">{nodeId}</h2>
      </div>
      <time class="mono muted">2026-04-24T00:00:00.000000000Z [HLC: (0, 0)]</time>
    </header>

    <div class="confidence">
      <div class="c-label muted">Confidence</div>
      <div class="c-track">
        <div class="c-fill" style="width: 100%"></div>
      </div>
      <div class="c-value">1.00</div>
    </div>

    <div class="links">
      <div class="link-side">
        <div class="muted small">parents</div>
        <div class="link-empty">—</div>
      </div>
      <div class="this-node">
        <div class="dot genesis"></div>
      </div>
      <div class="link-side">
        <div class="muted small">children</div>
        <div class="link-empty">—</div>
      </div>
    </div>

    <div class="payload">
      <div class="mono">
        entry_type: GENESIS
        agent_id: {nodeId}
        previous_hash: [0; 32]
        causal_links: []
        confidence: 1.0
      </div>
    </div>

    <footer class="actions">
      <button data-cursor="clickable" class="btn provenance" disabled>Trace Provenance</button>
      <button data-cursor="clickable" class="btn bookmark" disabled>Bookmark</button>
      <button data-cursor="destructive" class="btn challenge" disabled>Challenge</button>
    </footer>
    <p class="disabled-note muted">Actions require Mnemosyne (M1).</p>
  </article>
</section>

<style>
  .memory-node {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
  }
  .card {
    width: 600px;
    max-width: 90vw;
    background: rgba(18, 22, 36, 0.95);
    border: 1px solid var(--c-panel-border);
    border-radius: 8px;
    padding: var(--s6);
    box-shadow: 0 8px 48px rgba(0, 0, 0, 0.6);
    display: flex;
    flex-direction: column;
    gap: var(--s5);
  }
  .header-row {
    display: flex;
    align-items: center;
    gap: var(--s3);
    margin-bottom: var(--s2);
  }
  .title { font-family: var(--font-mono); font-size: 14px; color: var(--c-lunar-silver); }
  .type-badge {
    padding: 2px 8px;
    border-radius: 99px;
    font-size: 10px;
    letter-spacing: 0.15em;
    text-transform: uppercase;
  }
  .type-badge.genesis {
    background: rgba(255, 209, 102, 0.1);
    color: var(--c-solar-gold);
  }

  .confidence { display: grid; grid-template-columns: 80px 1fr 40px; align-items: center; gap: var(--s3); }
  .c-label { font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; }
  .c-track { height: 4px; background: var(--c-panel-border); border-radius: 2px; overflow: hidden; }
  .c-fill { height: 100%; background: linear-gradient(to right, var(--c-crimson-forge), var(--c-solar-gold), var(--c-verdigris)); }
  .c-value { font-size: 14px; font-weight: 600; text-align: right; }

  .links {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    gap: var(--s4);
    align-items: center;
    padding: var(--s4);
    background: rgba(10, 10, 15, 0.6);
    border-radius: 4px;
  }
  .link-side .small { font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: var(--s1); }
  .link-empty { font-size: 16px; color: var(--c-ash-grey); }
  .this-node .dot { width: 14px; height: 14px; border-radius: 50%; background: var(--c-solar-gold); box-shadow: 0 0 12px var(--c-solar-gold); }

  .payload {
    background: rgba(10, 10, 15, 0.9);
    border: 1px solid var(--c-panel-border);
    border-radius: 4px;
    padding: var(--s4);
    font-family: var(--font-mono);
    font-size: 12px;
    line-height: 1.6;
    color: var(--c-lunar-silver);
    white-space: pre-wrap;
  }

  .actions { display: flex; gap: var(--s2); }
  .btn {
    padding: var(--s2) var(--s4);
    border-radius: 4px;
    border: 1px solid;
    background: transparent;
    font-family: var(--font-ui);
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.05em;
  }
  .btn.provenance { color: var(--c-solar-gold); border-color: var(--c-solar-gold); }
  .btn.bookmark { color: var(--c-verdigris); border-color: var(--c-verdigris); }
  .btn.challenge { color: var(--c-crimson-forge); border-color: var(--c-crimson-forge); }
  .btn:disabled { opacity: 0.3; cursor: not-allowed; }
  .disabled-note { font-size: 10px; text-align: center; }
</style>
