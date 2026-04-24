<script lang="ts">
  /*
   * HUD right sidebar — LV / XP / Missions / Achievements.
   *
   * "Level" = milestone (M0=1, M1=2, ...).
   * "XP" = agents×24h uptime heartbeats (soft progress).
   * Missions = open M0 smoke-test tasks.
   * Achievements = completed milestones/features.
   */

  let { level = 1, xp = 0, xpMax = 1000 } = $props<{
    level?: number;
    xp?: number;
    xpMax?: number;
  }>();

  type Mission = { id: string; title: string; progress: number; goal: number };
  const missions: Mission[] = [
    { id: 'm1', title: 'Observe 1K tape rows', progress: 0, goal: 1000 },
    { id: 'm2', title: 'Trigger 10 signals',   progress: 0, goal: 10 },
    { id: 'm3', title: 'Fill 5 paper orders',  progress: 0, goal: 5 },
    { id: 'm4', title: 'Survive 1h uptime',    progress: 0, goal: 3600 },
  ];

  type Achievement = { id: string; title: string; unlocked: boolean; icon: string };
  const achievements: Achievement[] = [
    { id: 'a1', title: 'First Contact',       unlocked: true,  icon: '⬟' },
    { id: 'a2', title: 'Genesis Boot',        unlocked: true,  icon: '◈' },
    { id: 'a3', title: 'Signal Crossing',     unlocked: true,  icon: '△' },
    { id: 'a4', title: 'Paper Executor',      unlocked: true,  icon: '◉' },
    { id: 'a5', title: 'Risk Gate Override',  unlocked: false, icon: '⌬' },
    { id: 'a6', title: 'Millennium Tape',     unlocked: false, icon: '⬢' },
    { id: 'a7', title: 'Ascent to M1',        unlocked: false, icon: '✦' },
  ];

  let xpPct = $derived(Math.min(100, Math.round((xp / xpMax) * 100)));
</script>

<aside class="sidebar">
  <!-- Level + XP -->
  <section class="block lv">
    <div class="row">
      <div class="lv-badge">LV<br /><span class="lv-num">{level.toString().padStart(2, '0')}</span></div>
      <div class="xp-col">
        <div class="xp-label">EXPERIENCE</div>
        <div class="xp-bar"><div class="xp-fill" style="width: {xpPct}%"></div></div>
        <div class="xp-nums">{xp.toLocaleString()} / {xpMax.toLocaleString()}</div>
      </div>
    </div>
  </section>

  <!-- Missions -->
  <section class="block">
    <div class="block-title">MISSIONS</div>
    {#each missions as m}
      {@const pct = Math.min(100, Math.round((m.progress / m.goal) * 100))}
      <div class="mission">
        <div class="m-row">
          <span class="m-title">{m.title}</span>
          <span class="m-pct">{pct}%</span>
        </div>
        <div class="m-bar"><div class="m-fill" style="width: {pct}%"></div></div>
      </div>
    {/each}
  </section>

  <!-- Achievements -->
  <section class="block">
    <div class="block-title">ACHIEVEMENTS</div>
    <div class="ach-grid">
      {#each achievements as a}
        <div class="ach" class:unlocked={a.unlocked} title={a.title}>
          <span class="ach-icon">{a.icon}</span>
          <span class="ach-name">{a.title}</span>
        </div>
      {/each}
    </div>
  </section>
</aside>

<style>
  .sidebar {
    position: absolute;
    top: 64px;
    right: 0;
    bottom: 0;
    width: 280px;
    padding: 16px 14px 180px 14px;
    overflow-y: auto;
    background: linear-gradient(180deg, rgba(22, 10, 50, 0.68), rgba(12, 6, 30, 0.85));
    border-left: 1px solid rgba(154, 110, 255, 0.3);
    backdrop-filter: blur(10px);
    color: #e6e0ff;
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 11px;
    z-index: 20;
    pointer-events: auto;
  }
  .sidebar::-webkit-scrollbar { width: 6px; }
  .sidebar::-webkit-scrollbar-thumb {
    background: rgba(154, 110, 255, 0.4);
    border-radius: 3px;
  }

  .block {
    padding: 12px 12px 14px;
    margin-bottom: 14px;
    border: 1px solid rgba(154, 110, 255, 0.2);
    border-radius: 8px;
    background: rgba(18, 10, 42, 0.55);
    box-shadow: inset 0 0 24px rgba(154, 110, 255, 0.08);
  }
  .block-title {
    color: #ffd166;
    font-size: 10px;
    letter-spacing: 0.3em;
    margin-bottom: 10px;
    border-bottom: 1px solid rgba(255, 209, 102, 0.25);
    padding-bottom: 6px;
  }

  /* Level / XP */
  .lv .row { display: flex; gap: 12px; align-items: center; }
  .lv-badge {
    width: 62px;
    padding: 8px 0;
    text-align: center;
    background: linear-gradient(135deg, #ffd166, #f8a400);
    color: #1a0c30;
    border-radius: 8px;
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 0.2em;
    box-shadow: 0 0 14px rgba(255, 209, 102, 0.55);
  }
  .lv-num {
    display: block;
    font-size: 22px;
    margin-top: 2px;
    letter-spacing: 0.04em;
  }
  .xp-col { flex: 1; }
  .xp-label { color: rgba(200, 180, 255, 0.65); font-size: 9px; letter-spacing: 0.25em; margin-bottom: 5px; }
  .xp-bar {
    height: 8px;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 4px;
    overflow: hidden;
    border: 1px solid rgba(154, 110, 255, 0.3);
  }
  .xp-fill {
    height: 100%;
    background: linear-gradient(90deg, #7209b7, #b890ff, #00f5d4);
    box-shadow: 0 0 10px rgba(184, 144, 255, 0.8);
    transition: width 0.5s ease;
  }
  .xp-nums { font-size: 9px; color: rgba(220, 200, 255, 0.6); margin-top: 4px; text-align: right; }

  /* Missions */
  .mission { margin-bottom: 10px; }
  .mission:last-child { margin-bottom: 0; }
  .m-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
  .m-title { color: #dcd0ff; font-size: 10px; }
  .m-pct   { color: #00f5d4; font-size: 10px; }
  .m-bar {
    height: 4px;
    background: rgba(255, 255, 255, 0.06);
    border-radius: 2px;
    overflow: hidden;
  }
  .m-fill {
    height: 100%;
    background: linear-gradient(90deg, #4ecdc4, #00f5d4);
    box-shadow: 0 0 6px rgba(0, 245, 212, 0.55);
  }

  /* Achievements */
  .ach-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }
  .ach {
    aspect-ratio: 1;
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 6px;
    background: rgba(10, 6, 24, 0.7);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4px;
    color: rgba(220, 200, 255, 0.28);
    text-align: center;
    font-size: 8px;
    line-height: 1.2;
    transition: all 0.2s;
  }
  .ach .ach-icon {
    font-size: 20px;
    margin-bottom: 4px;
  }
  .ach.unlocked {
    border-color: #ffd166;
    color: #ffd166;
    box-shadow: 0 0 10px rgba(255, 209, 102, 0.35);
    background: linear-gradient(135deg, rgba(255, 209, 102, 0.12), rgba(184, 144, 255, 0.1));
  }
  .ach.unlocked .ach-icon {
    text-shadow: 0 0 8px rgba(255, 209, 102, 0.8);
  }
</style>
