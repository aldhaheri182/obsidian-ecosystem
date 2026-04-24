<script lang="ts">
  /*
   * HUD overlay — always visible on every view.
   * Provides breadcrumb, owner presence, emergency stop, NATS state,
   * heartbeat ring counter, and the owner command sidebar trigger.
   */
  import { breadcrumb, ascend, viewCtx } from '../stores/view';
  import { natsState, liveAgentCount } from '../stores/bus';
  import CommandSidebar from './CommandSidebar.svelte';
  import EmergencyStop from './EmergencyStop.svelte';

  let commandOpen = $state(false);
</script>

<!-- Top bar — breadcrumb + live indicators -->
<header class="topbar">
  <div class="breadcrumb">
    {#each $breadcrumb as crumb, i}
      {#if i > 0}<span class="sep">›</span>{/if}
      <span class="crumb" class:last={i === $breadcrumb.length - 1}>{crumb}</span>
    {/each}
  </div>

  <div class="indicators">
    <div class="indicator">
      <span class="label">NATS</span>
      <span class="dot" class:connected={$natsState === 'connected'}
             class:error={$natsState === 'error' || $natsState === 'disconnected'}></span>
      <span class="value">{$natsState}</span>
    </div>
    <div class="indicator">
      <span class="label">Agents</span>
      <span class="value">{$liveAgentCount} / 6</span>
    </div>
    <button class="ascend-btn" data-cursor="clickable"
            disabled={$viewCtx.view === 'orbit'}
            on:click={ascend}
            title="Ascend (Esc)">
      ↑ Ascend
    </button>
    <button class="command-btn" data-cursor="clickable" on:click={() => (commandOpen = !commandOpen)}>
      Command
    </button>
  </div>
</header>

<!-- Always-visible Emergency Stop -->
<EmergencyStop />

<!-- Slide-in command sidebar -->
{#if commandOpen}
  <CommandSidebar on:close={() => (commandOpen = false)} />
{/if}

<style>
  .topbar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 var(--s6);
    z-index: var(--z-hud);
    background: linear-gradient(to bottom, rgba(10, 10, 15, 0.9), rgba(10, 10, 15, 0));
    pointer-events: none;
  }
  .topbar > * { pointer-events: auto; }

  .breadcrumb {
    display: flex;
    align-items: center;
    gap: var(--s2);
    font-family: var(--font-ui);
    font-size: 12px;
    letter-spacing: 0.03em;
    color: var(--c-ash-grey);
  }
  .crumb.last { color: var(--c-ghost-white); font-weight: 500; }
  .sep { opacity: 0.4; }

  .indicators {
    display: flex;
    align-items: center;
    gap: var(--s5);
  }
  .indicator {
    display: flex;
    align-items: center;
    gap: var(--s2);
    font-size: 11px;
    color: var(--c-ash-grey);
  }
  .indicator .label { text-transform: uppercase; letter-spacing: 0.08em; }
  .indicator .value { color: var(--c-lunar-silver); }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--c-ash-grey);
  }
  .dot.connected {
    background: var(--c-verdigris);
    box-shadow: 0 0 6px var(--c-verdigris);
  }
  .dot.error { background: var(--c-crimson-forge); }

  .ascend-btn, .command-btn {
    font-family: var(--font-ui);
    font-size: 11px;
    padding: 6px 12px;
    border-radius: 4px;
    border: 1px solid var(--c-panel-border);
    background: rgba(18, 22, 36, 0.7);
    color: var(--c-lunar-silver);
    letter-spacing: 0.03em;
    transition: border-color 0.15s, color 0.15s;
  }
  .ascend-btn:hover:not(:disabled), .command-btn:hover {
    border-color: var(--c-solar-gold);
    color: var(--c-solar-gold);
  }
  .ascend-btn:disabled { opacity: 0.35; }
</style>
