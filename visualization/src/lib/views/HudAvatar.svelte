<script lang="ts">
  /*
   * Bottom-right character avatar — the "owner" pixel-art portrait.
   * Uses DiceBear pixel-art like the agents, but with a deterministic seed
   * so the owner always looks the same across sessions.
   */
  import { createAvatar } from '@dicebear/core';
  import * as pixelArt from '@dicebear/pixel-art';

  let svg = $state<string>('');

  $effect(() => {
    const av = createAvatar(pixelArt as any, {
      seed: 'obsidian-owner',
      backgroundColor: ['1a0c30'],
      scale: 100,
    });
    svg = av.toString();
  });

  let { name = 'OPERATOR', tag = 'OVERSEER' } = $props<{
    name?: string;
    tag?: string;
  }>();
</script>

<div class="avatar-card">
  <div class="frame">
    <div class="portrait">{@html svg}</div>
    <div class="status-dot"></div>
  </div>
  <div class="meta">
    <div class="name">{name}</div>
    <div class="tag">{tag}</div>
    <div class="pill">◆ ONLINE</div>
  </div>
</div>

<style>
  .avatar-card {
    position: absolute;
    right: 300px;
    bottom: 24px;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 14px 10px 10px;
    background: linear-gradient(135deg, rgba(30, 14, 60, 0.88), rgba(12, 6, 30, 0.95));
    border: 1px solid rgba(255, 209, 102, 0.4);
    border-radius: 12px;
    box-shadow:
      0 0 24px rgba(154, 110, 255, 0.35),
      inset 0 0 20px rgba(255, 209, 102, 0.08);
    z-index: 21;
    pointer-events: auto;
    color: #e6e0ff;
    font-family: 'JetBrains Mono', ui-monospace, monospace;
  }

  .frame {
    position: relative;
    width: 64px;
    height: 64px;
    border-radius: 10px;
    background: #1a0c30;
    border: 1px solid rgba(255, 209, 102, 0.7);
    padding: 3px;
    box-shadow: inset 0 0 10px rgba(255, 209, 102, 0.3);
  }
  .portrait {
    width: 100%;
    height: 100%;
    overflow: hidden;
    border-radius: 6px;
  }
  .portrait :global(svg) {
    width: 100%;
    height: 100%;
    display: block;
    image-rendering: pixelated;
  }
  .status-dot {
    position: absolute;
    right: -3px;
    bottom: -3px;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #4ecdc4;
    box-shadow: 0 0 8px #4ecdc4;
    border: 2px solid #1a0c30;
    animation: pulse 2s infinite;
  }
  @keyframes pulse {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.15); opacity: 0.85; }
  }

  .meta { display: flex; flex-direction: column; gap: 2px; min-width: 110px; }
  .name {
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.15em;
    color: #ffd166;
    text-shadow: 0 0 8px rgba(255, 209, 102, 0.45);
  }
  .tag {
    font-size: 9px;
    letter-spacing: 0.28em;
    color: rgba(200, 180, 255, 0.75);
    text-transform: uppercase;
  }
  .pill {
    margin-top: 3px;
    font-size: 9px;
    padding: 2px 6px;
    align-self: flex-start;
    border-radius: 4px;
    background: rgba(78, 205, 196, 0.15);
    color: #4ecdc4;
    border: 1px solid rgba(78, 205, 196, 0.45);
    letter-spacing: 0.18em;
  }
</style>
