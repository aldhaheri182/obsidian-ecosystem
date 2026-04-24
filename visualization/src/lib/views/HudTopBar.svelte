<script lang="ts">
  /*
   * HUD top stats bar — game-style command readout.
   * Day / Balance / Orders / Tape rows / Agents live%.
   * Values are read from bus stores + tape stats.
   */
  import { liveAgentCount, recentMessages } from '../stores/bus';

  let { balanceCents = 0, orders = 0, tapeRows = 0, day = 1 } = $props<{
    balanceCents?: number;
    orders?: number;
    tapeRows?: number;
    day?: number;
  }>();

  let live = $derived($liveAgentCount);
  let total = 6; // M0 agents
  let livePct = $derived(Math.round((live / total) * 100));
  let msgsPerSec = $state(0);

  let tick = 0;
  $effect(() => {
    const id = setInterval(() => {
      const n = $recentMessages.length;
      msgsPerSec = n - tick;
      tick = n;
    }, 1000);
    return () => clearInterval(id);
  });

  function fmtMoney(cents: number): string {
    const d = cents / 100;
    return '$' + d.toLocaleString(undefined, { maximumFractionDigits: 0 });
  }
</script>

<header class="top-bar">
  <div class="left">
    <span class="logo">◆ OBSIDIAN</span>
    <span class="sep">//</span>
    <span class="mode">COMMAND CENTER</span>
  </div>

  <div class="stats">
    <div class="stat">
      <span class="label">DAY</span>
      <span class="value">{day.toString().padStart(3, '0')}</span>
    </div>
    <div class="stat">
      <span class="label">BALANCE</span>
      <span class="value gold">{fmtMoney(balanceCents)}</span>
    </div>
    <div class="stat">
      <span class="label">ORDERS</span>
      <span class="value">{orders}</span>
    </div>
    <div class="stat">
      <span class="label">TAPE</span>
      <span class="value cyan">{tapeRows.toLocaleString()}</span>
    </div>
    <div class="stat">
      <span class="label">RATE</span>
      <span class="value">{msgsPerSec}/s</span>
    </div>
    <div class="stat">
      <span class="label">AGENTS</span>
      <span class="value verd">{live}/{total}</span>
      <div class="bar">
        <div class="fill" style="width: {livePct}%"></div>
      </div>
    </div>
  </div>

  <div class="right">
    <button class="icon-btn" title="Settings">⚙</button>
    <button class="icon-btn" title="Alerts">⚑</button>
  </div>
</header>

<style>
  .top-bar {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 64px;
    padding: 0 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    background: linear-gradient(180deg, rgba(10, 6, 28, 0.92), rgba(20, 10, 48, 0.5));
    border-bottom: 1px solid rgba(154, 110, 255, 0.28);
    backdrop-filter: blur(10px);
    z-index: 20;
    color: #e6e0ff;
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 12px;
    letter-spacing: 0.08em;
    pointer-events: auto;
  }
  .left {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .logo {
    color: #ffd166;
    font-size: 15px;
    letter-spacing: 0.3em;
    text-shadow: 0 0 12px rgba(255, 209, 102, 0.7);
  }
  .sep { color: rgba(255, 255, 255, 0.3); }
  .mode {
    color: #b890ff;
    letter-spacing: 0.25em;
    font-size: 11px;
  }

  .stats {
    display: flex;
    gap: 28px;
    align-items: center;
  }
  .stat {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    min-width: 72px;
  }
  .stat .label {
    color: rgba(200, 180, 255, 0.6);
    font-size: 9px;
    letter-spacing: 0.25em;
    margin-bottom: 2px;
  }
  .stat .value {
    color: #f8f9fa;
    font-size: 15px;
    font-weight: 600;
    letter-spacing: 0.05em;
  }
  .stat .value.gold { color: #ffd166; text-shadow: 0 0 8px rgba(255, 209, 102, 0.6); }
  .stat .value.cyan { color: #00f5d4; text-shadow: 0 0 8px rgba(0, 245, 212, 0.45); }
  .stat .value.verd { color: #4ecdc4; }
  .stat .bar {
    width: 72px;
    height: 3px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 2px;
    margin-top: 3px;
    overflow: hidden;
  }
  .stat .bar .fill {
    height: 100%;
    background: linear-gradient(90deg, #4ecdc4, #00f5d4);
    box-shadow: 0 0 6px #00f5d4;
    transition: width 0.5s ease;
  }

  .right { display: flex; gap: 8px; }
  .icon-btn {
    width: 32px; height: 32px;
    border-radius: 6px;
    border: 1px solid rgba(154, 110, 255, 0.3);
    background: rgba(30, 18, 60, 0.5);
    color: #b890ff;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.15s;
  }
  .icon-btn:hover {
    border-color: #ffd166;
    color: #ffd166;
    box-shadow: 0 0 10px rgba(255, 209, 102, 0.4);
  }
</style>
