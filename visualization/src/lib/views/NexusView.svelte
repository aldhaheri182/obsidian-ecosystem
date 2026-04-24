<script lang="ts">
  /*
   * Nexus Overworld — 2D map with all 11 cities. Aletheia and Chronos are
   * real; the rest are stubs (M1+). Message packets animate along roads
   * in real time from the live tape feed.
   *
   * Authorized by: Cinematic UI spec Part II.2.
   */
  import { onMount, onDestroy } from 'svelte';
  import { NexusRenderer } from '../pixi/NexusRenderer';
  import { descend } from '../stores/view';
  import { recentMessages } from '../stores/bus';
  import type { DisplayMessage } from '../nats-client';

  let mount = $state<HTMLDivElement | null>(null);
  let renderer: NexusRenderer | null = null;
  let seen = new Set<number>();

  onMount(async () => {
    if (!mount) return;
    renderer = new NexusRenderer();
    await renderer.mount(mount, (id) => descend({ view: 'city', cityId: id }));
  });

  onDestroy(() => {
    renderer?.destroy();
    renderer = null;
    seen.clear();
  });

  // React to new messages: spawn a packet on any relevant topic.
  $effect(() => {
    if (!renderer) return;
    for (const m of $recentMessages) {
      if (seen.has(m.ts)) continue;
      seen.add(m.ts);
      // Only spawn packets on inter-city lines. M0 has Aletheia+Chronos,
      // so only heartbeats on time-oracle and anything from Aletheia map to
      // an existing edge.
      if (m.topic === 'chronos.time.oracle') {
        renderer.spawnPacket('chronos', 'aletheia', 'TIME_TICK');
      } else if (m.topic.startsWith('aletheia.')) {
        // Pretend signal/order flows go to Mnemosyne for visual effect.
        renderer.spawnPacket('aletheia', 'mnemosyne', m.type);
      }
    }
  });
</script>

<section class="nexus">
  <div class="canvas-mount" bind:this={mount}></div>
  <aside class="legend panel">
    <h3 class="ceremonial">Nexus</h3>
    <p class="muted">Right-click drag to pan. Click a real city to enter.</p>
    <p class="stub-note">
      <span class="stub-marker">—</span> Stub cities appear only in M1+ once
      their agent packages are written. Only Aletheia and Chronos are live
      in M0.
    </p>
  </aside>
</section>

<style>
  .nexus {
    position: absolute;
    inset: 0;
  }
  .canvas-mount { position: absolute; inset: 0; }
  :global(.nexus canvas) { display: block; }

  .legend {
    position: absolute;
    bottom: var(--s6);
    right: var(--s6);
    max-width: 260px;
    padding: var(--s4);
  }
  .legend h3 { color: var(--c-solar-gold); font-size: 13px; margin-bottom: var(--s3); }
  .legend p { font-size: 11px; line-height: 1.5; margin-top: var(--s2); }
  .stub-note { color: var(--c-ash-grey); }
  .stub-marker {
    color: var(--c-solar-gold);
    font-family: var(--font-ceremonial);
    margin-right: var(--s1);
  }
</style>
