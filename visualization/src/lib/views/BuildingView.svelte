<script lang="ts">
  /*
   * Building View — side-scrolling cutaway. Renders workstations for each
   * agent in the building + a whiteboard of their latest reasoning.
   * Authorized by: Cinematic UI spec Part II.4, Part IV.
   */
  import { viewCtx, descend } from '../stores/view';
  import { recentMessages } from '../stores/bus';

  // Hard-coded building registry. In M3 this is pulled from the agent registry.
  const BUILDINGS: Record<string, { label: string; agents: Array<{id:string, role:string}>; }> = {
    'trading-floor': {
      label: 'Trading Floor',
      agents: [
        { id: 'collector-equities-csv-01', role: 'collector' },
      ],
    },
    'momentum-lab': {
      label: 'Momentum Lab',
      agents: [
        { id: 'momentum-signal-01', role: 'signal' },
      ],
    },
    'portfolio-control': {
      label: 'Portfolio Control',
      agents: [
        { id: 'signal-blender-01', role: 'blender' },
      ],
    },
    'execution-desk': {
      label: 'Execution Desk',
      agents: [
        { id: 'paper-executor-01', role: 'executor' },
      ],
    },
    'risk-bunker': {
      label: 'Risk Bunker',
      agents: [
        { id: 'risk-overlord-01', role: 'guardian' },
      ],
    },
    'corporate-tower': {
      label: 'Corporate Tower',
      agents: [],
    },
  };

  let b = $derived(BUILDINGS[$viewCtx.buildingId ?? ''] ?? BUILDINGS['trading-floor']);

  // Whiteboard text per agent — derived from last message seen.
  let whiteboards = $state<Record<string, string>>({});

  $effect(() => {
    for (const m of $recentMessages) {
      for (const a of b.agents) {
        const agentKey = m.topic.split('.').slice(2).join('.');
        if (agentKey === a.id || m.topic.includes(a.id)) {
          whiteboards[a.id] = `${m.type} @ ${new Date(m.ts).toLocaleTimeString()}`;
        }
      }
    }
  });
</script>

<section class="building">
  <div class="header">
    <div class="ceremonial title">{b.label}</div>
    <div class="meta muted">Cutaway view · {b.agents.length} workstation{b.agents.length === 1 ? '' : 's'}</div>
  </div>

  <div class="floor">
    {#if b.agents.length === 0}
      <div class="empty-floor">
        <p class="muted">No agents in this building yet.</p>
        <p class="muted small">Corporate Tower activates once executive agents (M2) are deployed.</p>
      </div>
    {/if}

    {#each b.agents as agent}
      <article class="workstation" on:click={() => descend({ view: 'agent', agentId: agent.id })}>
        <div class="desk">
          <div class="monitor">
            <div class="screen-block" style="background: var(--c-verdigris)"></div>
            <div class="screen-block" style="background: var(--c-cyan-aurora)"></div>
            <div class="screen-block" style="background: var(--c-solar-gold)"></div>
          </div>
          <div class="status-orb" title={agent.role}></div>
          <div class="coffee">☕</div>
        </div>
        <div class="whiteboard">
          <div class="mono small">AGENT {agent.id}</div>
          <div class="mono small">ROLE: {agent.role}</div>
          <div class="mono small">LAST: {whiteboards[agent.id] ?? '—'}</div>
        </div>
        <div class="agent-avatar">🧍</div>
        <div class="nameplate">{agent.id}</div>
      </article>
    {/each}
  </div>
</section>

<style>
  .building {
    position: absolute;
    inset: 64px var(--s8) var(--s8);
    display: flex;
    flex-direction: column;
    gap: var(--s6);
  }
  .header .title {
    font-size: 28px;
    color: var(--c-ghost-white);
    letter-spacing: 0.25em;
    margin-bottom: var(--s2);
  }
  .meta {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }
  .floor {
    flex: 1;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: var(--s6);
    padding: var(--s6);
    background: rgba(18, 22, 36, 0.4);
    border: 1px solid var(--c-panel-border);
    border-radius: 6px;
    overflow-y: auto;
  }
  .empty-floor {
    grid-column: 1 / -1;
    text-align: center;
    padding: var(--s16) 0;
  }
  .empty-floor p.small { font-size: 11px; margin-top: var(--s2); }

  .workstation {
    position: relative;
    background: rgba(10, 10, 15, 0.6);
    border: 1px solid var(--c-panel-border);
    border-radius: 6px;
    padding: var(--s5);
    display: flex;
    flex-direction: column;
    gap: var(--s4);
    transition: border-color 0.15s, transform 0.2s;
    cursor: none;
  }
  .workstation:hover {
    border-color: var(--c-solar-gold);
    transform: translateY(-2px);
  }
  .desk {
    display: flex;
    align-items: center;
    gap: var(--s3);
    padding: var(--s3);
    background: rgba(42, 42, 62, 0.3);
    border-radius: 4px;
  }
  .monitor {
    display: flex;
    gap: 2px;
    padding: 4px;
    background: #0a0a0f;
    border: 1px solid var(--c-verdigris);
    border-radius: 2px;
    width: 72px;
    height: 40px;
  }
  .screen-block {
    flex: 1;
    border-radius: 2px;
    opacity: 0.7;
    animation: screen-flicker 4s infinite;
  }
  @keyframes screen-flicker {
    0%, 100% { opacity: 0.7; }
    50% { opacity: 0.4; }
  }
  .status-orb {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--c-verdigris);
    box-shadow: 0 0 6px var(--c-verdigris);
  }
  .coffee { font-size: 14px; }
  .whiteboard {
    background: rgba(224, 224, 224, 0.04);
    border: 1px solid rgba(224, 224, 224, 0.1);
    border-radius: 4px;
    padding: var(--s3);
    display: flex;
    flex-direction: column;
    gap: var(--s1);
    color: var(--c-lunar-silver);
  }
  .small { font-size: 10px; }
  .agent-avatar { font-size: 32px; text-align: center; }
  .nameplate {
    font-family: var(--font-mono);
    font-size: 10px;
    text-align: center;
    color: var(--c-ash-grey);
    letter-spacing: 0.1em;
  }
</style>
