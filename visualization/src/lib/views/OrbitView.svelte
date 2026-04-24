<script lang="ts">
  /*
   * Orbit View — Command Center.
   *
   * 3x3 grid of isometric chamber dioramas (one per city) sitting on a
   * purple/violet nebula + lightning backdrop, framed by game-HUD chrome
   * (top stats, right sidebar, owner avatar).
   *
   * Clicking a chamber descends the user into that city (existing view
   * router). Bus messages are mapped to packet arcs between chambers.
   */
  import { onMount, onDestroy } from 'svelte';
  import * as THREE from 'three';
  import { CityGrid, CITY_SPECS } from '../three/CityGrid';
  import { descend } from '../stores/view';
  import { recentMessages } from '../stores/bus';
  import { MESSAGE_COLOR, PALETTE } from '../tokens/palette';
  import HudTopBar from './HudTopBar.svelte';
  import HudSidebar from './HudSidebar.svelte';
  import HudAvatar from './HudAvatar.svelte';

  let mount = $state<HTMLDivElement | null>(null);
  let hoverCity = $state<typeof CITY_SPECS[number] | null>(null);

  let renderer: THREE.WebGLRenderer | null = null;
  let grid: CityGrid | null = null;
  let rafId = 0;
  let lastTs = 0;
  let raycaster = new THREE.Raycaster();
  let mouseNdc = new THREE.Vector2();

  // HUD props (derived from bus over time)
  let balanceCents = $state(10_000_00_00);  // $10,000 paper start
  let orders = $state(0);
  let tapeRows = $state(0);
  let day = $state(1);
  let xp = $state(0);
  const xpMax = 1000;
  let level = $state(1);

  // Subscribe to bus for packet spawn + HUD updates.
  let lastMsgCount = 0;
  $effect(() => {
    const msgs = $recentMessages;
    if (msgs.length <= lastMsgCount) { lastMsgCount = msgs.length; return; }
    const newOnes = msgs.slice(lastMsgCount);
    lastMsgCount = msgs.length;
    for (const m of newOnes) {
      routePacket(m);
      if (m.type === 'MARKET_DATA') tapeRows++;
      if (m.type === 'ORDER') orders++;
      if (m.type === 'FILL') {
        // Toy P&L wobble: +/- $50
        balanceCents += Math.floor((Math.random() - 0.45) * 5000);
      }
      xp = Math.min(xpMax, xp + 1);
    }
  });

  function routePacket(m: { topic: string; type: string }): void {
    if (!grid) return;
    const color = MESSAGE_COLOR[m.type] ?? PALETTE.ashGrey;
    // Infer from/to from topic conventions:
    const to = inferCity(m.topic, m.type);
    const from = inferOrigin(m.topic, m.type);
    if (from && to && from !== to) {
      grid.spawnPacket(from, to, color);
    } else if (from) {
      // Self-loop: pulse only.
      grid.chambers.get(from)?.pulseActivity();
    }
  }

  function inferCity(topic: string, type: string): string | null {
    if (topic.startsWith('aletheia.')) return 'aletheia';
    if (topic.startsWith('chronos.')) return 'chronos';
    if (type === 'RISK_OVERRIDE') return 'aletheia';
    if (topic.startsWith('system.heartbeat.')) {
      // system.heartbeat.aletheia.<agent> or chronos etc.
      const parts = topic.split('.');
      if (parts.length >= 3) return parts[2];
    }
    return null;
  }

  function inferOrigin(topic: string, type: string): string | null {
    if (type === 'MARKET_DATA') return 'iris';       // Data source
    if (type === 'SIGNAL') return 'aletheia';
    if (type === 'ORDER') return 'aletheia';
    if (type === 'FILL') return 'agora';             // "Port" = venue
    if (type === 'TIME_TICK') return 'chronos';
    if (type === 'RISK_OVERRIDE') return 'themis';   // Court
    if (type === 'HEARTBEAT') return inferCity(topic, type);
    return null;
  }

  onMount(() => {
    if (!mount) return;

    const w = mount.clientWidth;
    const h = mount.clientHeight;

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    renderer.setClearColor(0x05020f, 1);
    mount.appendChild(renderer.domElement);

    grid = new CityGrid();
    grid.resize(w, h);

    const onResize = () => {
      if (!mount || !renderer || !grid) return;
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      renderer.setSize(w, h);
      grid.resize(w, h);
    };
    window.addEventListener('resize', onResize);

    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('click', onPointerClick);

    lastTs = performance.now();
    const loop = (ts: number) => {
      rafId = requestAnimationFrame(loop);
      const dt = ts - lastTs;
      lastTs = ts;
      grid!.tick(dt);
      grid!.render(renderer!);
    };
    rafId = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('resize', onResize);
      renderer?.domElement.removeEventListener('pointermove', onPointerMove);
      renderer?.domElement.removeEventListener('click', onPointerClick);
    };
  });

  onDestroy(() => {
    cancelAnimationFrame(rafId);
    grid?.dispose();
    renderer?.dispose();
    if (renderer?.domElement.parentNode) {
      renderer.domElement.parentNode.removeChild(renderer.domElement);
    }
    renderer = null;
    grid = null;
  });

  function updateNdc(ev: PointerEvent | MouseEvent): void {
    if (!renderer) return;
    const rect = renderer.domElement.getBoundingClientRect();
    mouseNdc.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    mouseNdc.y = -(((ev.clientY - rect.top) / rect.height) * 2 - 1);
  }

  function pick(): string | null {
    if (!grid) return null;
    raycaster.setFromCamera(mouseNdc, grid.camera);
    const objs = [...grid.chambers.values()].map(c => c.object3D);
    const hits = raycaster.intersectObjects(objs, true);
    if (hits.length === 0) return null;
    // Walk up parents to find which chamber group we hit.
    let o: THREE.Object3D | null = hits[0].object;
    while (o) {
      for (const [id, ch] of grid.chambers) {
        if (ch.object3D === o) return id;
      }
      o = o.parent;
    }
    return null;
  }

  function onPointerMove(ev: PointerEvent): void {
    updateNdc(ev);
    const id = pick();
    if (id) {
      hoverCity = CITY_SPECS.find(c => c.id === id) ?? null;
      if (renderer) renderer.domElement.style.cursor = 'pointer';
    } else {
      hoverCity = null;
      if (renderer) renderer.domElement.style.cursor = 'default';
    }
  }

  function onPointerClick(ev: MouseEvent): void {
    updateNdc(ev);
    const id = pick();
    if (!id) return;
    descend({ view: 'city', cityId: id });
  }
</script>

<section class="orbit">
  <div class="canvas-mount" bind:this={mount}></div>

  <HudTopBar {balanceCents} {orders} {tapeRows} {day} />
  <HudSidebar {level} {xp} {xpMax} />
  <HudAvatar name="OPERATOR" tag="OVERSEER" />

  {#if hoverCity}
    <div class="tooltip" style="--c: #{hoverCity.accent.toString(16).padStart(6, '0')}">
      <span class="dot"></span>
      <span class="name">{hoverCity.name}</span>
      <span class="type">{hoverCity.archetype.replace('_', ' ').toUpperCase()}</span>
      <span class="hint">click to descend ↓</span>
    </div>
  {/if}
</section>

<style>
  .orbit {
    position: absolute;
    inset: 0;
    overflow: hidden;
    background: #05020f;
  }
  .canvas-mount {
    position: absolute;
    inset: 0;
  }
  :global(.canvas-mount canvas) {
    display: block;
  }

  .tooltip {
    position: absolute;
    left: 50%;
    bottom: 120px;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 16px;
    background: rgba(20, 10, 48, 0.9);
    border: 1px solid var(--c);
    border-radius: 24px;
    box-shadow: 0 0 20px color-mix(in srgb, var(--c) 45%, transparent);
    color: #f8f9fa;
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 11px;
    letter-spacing: 0.18em;
    pointer-events: none;
    z-index: 15;
    backdrop-filter: blur(10px);
  }
  .dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    background: var(--c);
    box-shadow: 0 0 10px var(--c);
  }
  .name { font-weight: 700; color: var(--c); }
  .type { opacity: 0.65; font-size: 9px; }
  .hint {
    color: #ffd166;
    font-size: 9px;
    margin-left: 6px;
    padding-left: 10px;
    border-left: 1px solid rgba(255, 255, 255, 0.15);
  }
</style>
