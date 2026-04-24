<script lang="ts">
  /*
   * City View — isometric Aletheia. Buildings, agents, packets, day/night.
   * Authorized by: Cinematic UI spec Part II.3, Part III.
   */
  import { onMount, onDestroy } from 'svelte';
  import { CityRenderer } from '../pixi/CityRenderer';
  import { descend, viewCtx } from '../stores/view';
  import { recentMessages } from '../stores/bus';

  let mount = $state<HTMLDivElement | null>(null);
  let renderer: CityRenderer | null = null;
  let seen = new Set<number>();

  onMount(async () => {
    if (!mount) return;
    renderer = new CityRenderer();
    await renderer.mount(
      mount,
      (buildingId) => descend({ view: 'building', buildingId }),
      (agentId) => descend({ view: 'agent', agentId }),
    );
  });

  onDestroy(() => {
    renderer?.destroy();
    renderer = null;
    seen.clear();
  });

  $effect(() => {
    if (!renderer) return;
    for (const m of $recentMessages) {
      if (seen.has(m.ts)) continue;
      seen.add(m.ts);
      renderer.onMessage(m);
    }
  });
</script>

<section class="city">
  <div class="canvas-mount" bind:this={mount}></div>

  <div class="city-title">
    <div class="ceremonial">{$viewCtx.cityId ?? 'Aletheia'}</div>
    <div class="sub muted">Financial Trading District</div>
  </div>

  <div class="footer panel">
    <span class="hint">Click a building to enter. Click an agent for its memory.</span>
  </div>
</section>

<style>
  .city { position: absolute; inset: 0; }
  .canvas-mount { position: absolute; inset: 0; }
  :global(.city canvas) { display: block; }

  .city-title {
    position: absolute;
    top: 80px;
    left: 32px;
    pointer-events: none;
  }
  .city-title .ceremonial {
    color: var(--c-ghost-white);
    font-size: 24px;
    letter-spacing: 0.2em;
    margin-bottom: var(--s1);
    text-transform: capitalize;
  }
  .city-title .sub {
    font-size: 11px;
    letter-spacing: 0.15em;
    text-transform: uppercase;
  }

  .footer {
    position: absolute;
    bottom: var(--s6);
    left: 50%;
    transform: translateX(-50%);
    padding: var(--s2) var(--s4);
    font-size: 11px;
  }
  .hint { color: var(--c-ash-grey); letter-spacing: 0.05em; }
</style>
