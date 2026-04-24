<script lang="ts">
  /*
   * Obsidian Ecosystem — Cinematic Observatory
   * Root Svelte component. Mounts the current view + global HUD overlays.
   */
  import { onMount } from 'svelte';
  import { viewCtx, ascend, breadcrumb } from './lib/stores/view';
  import { natsState, liveAgentCount, logMessage } from './lib/stores/bus';
  import { NatsBridge } from './lib/nats-client';
  import { installCursor } from './lib/cursor/cursor';
  import { primeAudio, setDrone } from './lib/audio/engine';
  import OrbitView from './lib/views/OrbitView.svelte';
  import NexusView from './lib/views/NexusView.svelte';
  import CityView from './lib/views/CityView.svelte';
  import BuildingView from './lib/views/BuildingView.svelte';
  import AgentView from './lib/views/AgentView.svelte';
  import MemoryNodeView from './lib/views/MemoryNodeView.svelte';
  import BoardMeetingView from './lib/views/BoardMeetingView.svelte';
  import TimelineView from './lib/views/TimelineView.svelte';
  import GraveyardView from './lib/views/GraveyardView.svelte';
  import Hud from './lib/views/Hud.svelte';

  const NATS_URL =
    (import.meta as any).env?.VITE_NATS_WS_URL ?? 'ws://localhost:18080';

  let bridge: NatsBridge | null = null;

  onMount(() => {
    installCursor();
    bridge = new NatsBridge(NATS_URL, {
      onState: (s) => natsState.set(s),
      onMessage: (m) => logMessage(m),
    });
    bridge.connect();

    // Audio primer — browsers need a user gesture.
    const prime = () => {
      primeAudio();
      setDrone('orbit');
      window.removeEventListener('pointerdown', prime);
      window.removeEventListener('keydown', prime);
    };
    window.addEventListener('pointerdown', prime, { once: true });
    window.addEventListener('keydown', prime, { once: true });

    // Keyboard shortcut: Escape ascends.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') ascend();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Switch drone on view change.
  $effect(() => {
    const v = $viewCtx.view;
    if (v === 'orbit') setDrone('orbit');
    else if (v === 'nexus') setDrone('nexus');
    else if (v === 'city') setDrone('city');
    else if (v === 'building') setDrone('building');
    else if (v === 'agent' || v === 'memoryNode') setDrone('agent');
    else setDrone('city');
  });
</script>

<div id="app">
  <div class="void-background"></div>

  {#if $viewCtx.view === 'orbit'}
    <OrbitView />
  {:else if $viewCtx.view === 'nexus'}
    <NexusView />
  {:else if $viewCtx.view === 'city'}
    <CityView />
  {:else if $viewCtx.view === 'building'}
    <BuildingView />
  {:else if $viewCtx.view === 'agent'}
    <AgentView />
  {:else if $viewCtx.view === 'memoryNode'}
    <MemoryNodeView />
  {:else if $viewCtx.view === 'boardMeeting'}
    <BoardMeetingView />
  {:else if $viewCtx.view === 'timeline'}
    <TimelineView />
  {:else if $viewCtx.view === 'graveyard'}
    <GraveyardView />
  {/if}

  <Hud />
</div>
