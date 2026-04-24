<script lang="ts">
  /*
   * Orbit View — the God's Eye. Planet + 11 cities + P&L aurora.
   * Authorized by: Cinematic UI spec Part II.1, Part 1.
   */
  import { onMount, onDestroy } from 'svelte';
  import { OrbitRenderer, CITIES, type CitySpec } from '../pixi/OrbitRenderer';
  import { descend } from '../stores/view';
  import { pnlIndicator } from '../stores/bus';

  let mount = $state<HTMLDivElement | null>(null);
  let renderer: OrbitRenderer | null = null;
  let hoverCity = $state<CitySpec | null>(null);

  function onCityClick(city: CitySpec) {
    descend({ view: 'city', cityId: city.id });
  }

  onMount(async () => {
    if (!mount) return;
    renderer = new OrbitRenderer();
    await renderer.mount(mount, onCityClick);
    renderer.setPnl($pnlIndicator);
  });

  onDestroy(() => {
    renderer?.destroy();
    renderer = null;
  });

  $effect(() => {
    renderer?.setPnl($pnlIndicator);
  });
</script>

<section class="orbit">
  <div class="canvas-mount" bind:this={mount}></div>

  <!-- Title card -->
  <div class="title-card">
    <div class="ceremonial">THE OBSIDIAN ECOSYSTEM</div>
    <div class="sub">observer view — orbit</div>
  </div>

  <!-- City selector ring -->
  <div class="city-selector">
    {#each CITIES as city}
      <button class="city-chip" data-cursor="clickable"
              style="--c: #{city.color.toString(16).padStart(6, '0')}"
              on:pointerenter={() => (hoverCity = city)}
              on:pointerleave={() => (hoverCity = null)}
              on:click={() => onCityClick(city)}>
        <span class="dot"></span>
        <span>{city.name}</span>
      </button>
    {/each}
  </div>

  {#if hoverCity}
    <div class="city-tooltip">
      <h3 class="ceremonial">{hoverCity.name}</h3>
      <p class="muted">Click or select to descend.</p>
    </div>
  {/if}
</section>

<style>
  .orbit {
    position: absolute;
    inset: 0;
    overflow: hidden;
  }
  .canvas-mount {
    position: absolute;
    inset: 0;
  }
  :global(.canvas-mount canvas) {
    display: block;
  }

  .title-card {
    position: absolute;
    top: 80px;
    left: 50%;
    transform: translateX(-50%);
    text-align: center;
    pointer-events: none;
  }
  .title-card .ceremonial {
    color: var(--c-ghost-white);
    font-size: 20px;
    letter-spacing: 0.3em;
    margin-bottom: var(--s2);
  }
  .title-card .sub {
    font-size: 11px;
    color: var(--c-ash-grey);
    letter-spacing: 0.2em;
    text-transform: uppercase;
  }

  .city-selector {
    position: absolute;
    bottom: var(--s6);
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: var(--s2);
    flex-wrap: wrap;
    max-width: 80%;
    justify-content: center;
  }
  .city-chip {
    display: flex;
    align-items: center;
    gap: var(--s2);
    padding: var(--s2) var(--s3);
    background: rgba(18, 22, 36, 0.6);
    border: 1px solid var(--c-panel-border);
    border-radius: 99px;
    color: var(--c-lunar-silver);
    font-size: 11px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    transition: border-color 0.15s, background 0.15s, color 0.15s;
  }
  .city-chip:hover {
    border-color: var(--c);
    color: var(--c);
    background: rgba(255, 255, 255, 0.05);
  }
  .city-chip .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--c);
    box-shadow: 0 0 6px var(--c);
  }

  .city-tooltip {
    position: absolute;
    bottom: 90px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(18, 22, 36, 0.95);
    border: 1px solid var(--c-panel-border);
    border-radius: 6px;
    padding: var(--s4);
    min-width: 220px;
    backdrop-filter: blur(12px);
    text-align: center;
    pointer-events: none;
  }
  .city-tooltip h3 { color: var(--c-solar-gold); font-size: 14px; margin-bottom: var(--s1); }
</style>
