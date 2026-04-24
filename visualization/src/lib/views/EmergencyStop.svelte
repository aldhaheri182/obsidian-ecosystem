<script lang="ts">
  /*
   * Emergency Stop — Crimson Forge ring, always visible top-right.
   * First click expands to center with "CONFIRM FLATTEN ALL" + 3s hold or
   * second click to publish. Escape or outside-click cancels.
   * Authorized by: Cinematic UI spec Part 1.7.
   */
  import { onDestroy } from 'svelte';

  let confirming = $state(false);
  let holdProgress = $state(0);
  let holdTimer: number | null = null;

  function startConfirm() {
    confirming = true;
  }
  function cancel() {
    confirming = false;
    if (holdTimer !== null) {
      cancelAnimationFrame(holdTimer);
      holdTimer = null;
    }
    holdProgress = 0;
  }
  function doFlatten() {
    // TODO: wire to NATS publish on risk.override.all with signed override.
    // For now we just log; the actual signed publish requires owner key (M3).
    console.warn('FLATTEN_ALL issued by owner');
    confirming = false;
    holdProgress = 0;
  }
  function startHold() {
    const start = performance.now();
    const step = (t: number) => {
      const elapsed = t - start;
      holdProgress = Math.min(1, elapsed / 3000);
      if (holdProgress >= 1) {
        doFlatten();
        return;
      }
      holdTimer = requestAnimationFrame(step);
    };
    holdTimer = requestAnimationFrame(step);
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape' && confirming) cancel();
  }

  $effect(() => {
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  onDestroy(() => {
    if (holdTimer !== null) cancelAnimationFrame(holdTimer);
  });
</script>

{#if !confirming}
  <button class="estop-ring" data-cursor="destructive"
          aria-label="Emergency stop"
          on:click={startConfirm}>
    <svg width="32" height="32" viewBox="0 0 32 32">
      <polygon points="10,4 22,4 28,10 28,22 22,28 10,28 4,22 4,10"
               fill="none" stroke="#E63946" stroke-width="2" />
    </svg>
  </button>
{:else}
  <div class="confirm-backdrop" on:click={cancel}>
    <div class="confirm-ring" on:click|stopPropagation
         on:pointerdown={startHold}
         on:pointerup={cancel}
         on:pointerleave={cancel}>
      <svg viewBox="0 0 120 120" class="ring-svg">
        <circle cx="60" cy="60" r="54" fill="none"
                stroke="#E63946" stroke-width="3" opacity="0.4" />
        <circle cx="60" cy="60" r="54" fill="none"
                stroke="#E63946" stroke-width="3"
                stroke-dasharray={`${holdProgress * 339} 339`}
                transform="rotate(-90 60 60)"/>
        <polygon points="40,16 80,16 100,40 100,80 80,104 40,104 20,80 20,40"
                 fill="#E63946" opacity="0.18"/>
      </svg>
      <div class="confirm-label">
        <div class="ceremonial">CONFIRM FLATTEN ALL</div>
        <div class="hint">press &amp; hold 3s or click to confirm</div>
      </div>
    </div>
  </div>
{/if}

<style>
  .estop-ring {
    position: fixed;
    top: 64px;
    right: 32px;
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: rgba(230, 57, 70, 0.08);
    border: 3px solid rgba(230, 57, 70, 0.7);
    display: grid;
    place-items: center;
    z-index: var(--z-hud);
    transition: transform 0.2s, background 0.2s;
    animation: estop-pulse 2s infinite;
  }
  .estop-ring:hover {
    background: rgba(230, 57, 70, 0.25);
    transform: scale(1.06);
  }
  @keyframes estop-pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(230, 57, 70, 0.4); }
    50% { box-shadow: 0 0 0 14px rgba(230, 57, 70, 0); }
  }

  .confirm-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(10, 10, 15, 0.6);
    display: grid;
    place-items: center;
    z-index: var(--z-emergency);
    backdrop-filter: blur(4px);
  }
  .confirm-ring {
    width: 240px;
    height: 240px;
    display: grid;
    place-items: center;
    cursor: none;
  }
  .ring-svg {
    position: absolute;
    width: 240px;
    height: 240px;
  }
  .confirm-label {
    text-align: center;
    z-index: 1;
  }
  .confirm-label .ceremonial {
    color: var(--c-crimson-forge);
    font-size: 16px;
    letter-spacing: 0.2em;
    margin-bottom: var(--s2);
  }
  .confirm-label .hint {
    color: var(--c-ash-grey);
    font-size: 11px;
  }
</style>
