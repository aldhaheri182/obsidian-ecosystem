<script lang="ts">
  /*
   * Command Sidebar — slides in from right edge.
   * Authorized by: Cinematic UI spec Part IV.2.
   * Owner types a directive addressed to Global CEO. M0 has no CEO so
   * directives are logged locally and marked PENDING.
   */
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();

  type Directive = {
    ts: number;
    text: string;
    status: 'PENDING' | 'ACKNOWLEDGED' | 'COMPLETED';
    response?: string;
  };

  let history = $state<Directive[]>([]);
  let input = $state('');

  function submit() {
    if (!input.trim()) return;
    const d: Directive = {
      ts: Date.now(),
      text: input.trim(),
      status: 'PENDING',
    };
    history = [d, ...history];
    input = '';
    // TODO: publish on executive.global.ceo.directive. Needs owner key (M3).
  }
</script>

<aside class="sidebar">
  <header>
    <h2 class="ceremonial">Command</h2>
    <button class="close" data-cursor="clickable" on:click={() => dispatch('close')}>×</button>
  </header>

  <form class="input-area" on:submit|preventDefault={submit}>
    <input type="text" bind:value={input}
           placeholder="Command the Global CEO..." />
    <button type="submit" data-cursor="clickable">Dispatch</button>
  </form>

  <div class="history">
    {#each history as d (d.ts)}
      <article class="directive">
        <header class="meta">
          <span class="status status-{d.status.toLowerCase()}">{d.status}</span>
          <time>{new Date(d.ts).toLocaleTimeString()}</time>
        </header>
        <p class="text">{d.text}</p>
        {#if d.response}
          <p class="response">{d.response}</p>
        {:else}
          <p class="no-ceo muted">
            ⓘ No Global CEO agent yet. Directive logged locally. Executive
            agents arrive in M2.
          </p>
        {/if}
      </article>
    {/each}
    {#if history.length === 0}
      <p class="empty muted">No directives issued this session.</p>
    {/if}
  </div>
</aside>

<style>
  .sidebar {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    width: 300px;
    padding: var(--s5);
    z-index: var(--z-hud);
    background: rgba(18, 22, 36, 0.98);
    border-left: 1px solid var(--c-panel-border);
    backdrop-filter: blur(12px);
    display: flex;
    flex-direction: column;
    gap: var(--s4);
    animation: slide-in 0.33s cubic-bezier(0.33, 0, 0.67, 1);
  }
  @keyframes slide-in {
    from { transform: translateX(100%); }
    to { transform: translateX(0); }
  }

  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  header h2 { color: var(--c-solar-gold); font-size: 14px; letter-spacing: 0.15em; }
  .close {
    background: none; border: none; color: var(--c-lunar-silver);
    font-size: 20px; cursor: none;
  }
  .close:hover { color: var(--c-crimson-forge); }

  .input-area {
    display: flex;
    gap: var(--s2);
  }
  .input-area input {
    flex: 1;
    background: rgba(10, 10, 15, 0.8);
    border: 1px solid var(--c-panel-border);
    color: var(--c-lunar-silver);
    padding: var(--s2) var(--s3);
    border-radius: 4px;
    font-family: var(--font-ui);
    font-size: 12px;
  }
  .input-area input:focus {
    outline: none;
    border-color: var(--c-solar-gold);
  }
  .input-area button {
    padding: var(--s2) var(--s3);
    background: transparent;
    color: var(--c-solar-gold);
    border: 1px solid var(--c-solar-gold);
    border-radius: 4px;
    font-size: 11px;
    letter-spacing: 0.05em;
  }
  .input-area button:hover { background: rgba(255, 209, 102, 0.12); }

  .history {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: var(--s3);
  }

  .directive {
    background: rgba(10, 10, 15, 0.6);
    border: 1px solid var(--c-panel-border);
    border-radius: 4px;
    padding: var(--s3);
  }
  .directive .meta {
    display: flex;
    justify-content: space-between;
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--c-ash-grey);
    margin-bottom: var(--s2);
  }
  .status { text-transform: uppercase; letter-spacing: 0.1em; }
  .status-pending { color: var(--c-solar-gold); }
  .status-acknowledged { color: var(--c-verdigris); }
  .status-completed { color: var(--c-ghost-white); }
  .text { font-size: 13px; line-height: 1.5; }
  .no-ceo { font-size: 11px; margin-top: var(--s2); font-style: italic; }
  .empty { text-align: center; padding: var(--s8) 0; font-size: 12px; }
</style>
