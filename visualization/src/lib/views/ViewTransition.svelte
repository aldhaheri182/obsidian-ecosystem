<script lang="ts">
  /*
   * View transition overlay. Applies a brief Gaussian blur + fade when
   * the viewCtx changes, producing the "descent" feeling from the spec.
   */
  import { viewCtx } from '../stores/view';

  let active = $state(false);
  let prev = '';

  $effect(() => {
    const v = $viewCtx.view;
    if (prev && prev !== v) {
      active = true;
      setTimeout(() => (active = false), 500);
    }
    prev = v;
  });
</script>

<div class="transition-overlay" class:active></div>

<style>
  .transition-overlay {
    position: fixed;
    inset: 0;
    z-index: calc(var(--z-hud) - 1);
    pointer-events: none;
    backdrop-filter: blur(0);
    background: rgba(10, 10, 15, 0);
    transition:
      backdrop-filter 0.3s ease-out,
      background 0.3s ease-out;
  }
  .transition-overlay.active {
    backdrop-filter: blur(8px);
    background: rgba(10, 10, 15, 0.35);
    transition:
      backdrop-filter 0.2s ease-in,
      background 0.2s ease-in;
  }
</style>
