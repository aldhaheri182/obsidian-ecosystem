<script lang="ts">
  /*
   * Board Meeting Viewer — round table, 7 seats, speaking glow.
   * Authorized by: Cinematic UI spec Part III.1, Part 7.
   * M2+ brings real executive agents; M0 shows the chamber + transcript
   * shell ready for data.
   */
  import { ascend } from '../stores/view';

  const SEATS = [
    { role: 'CEO', color: '#FFD166', seat: { x: 50, y: 18 } },
    { role: 'CRO', color: '#E63946', seat: { x: 74, y: 28 } },
    { role: 'CFO', color: '#4ECDC4', seat: { x: 26, y: 28 } },
    { role: 'CSO', color: '#00F5D4', seat: { x: 14, y: 52 } },
    { role: 'CTO', color: '#E0E0E0', seat: { x: 86, y: 52 } },
    { role: 'CCO', color: '#F8F9FA', seat: { x: 26, y: 76 } },
    { role: 'CDO', color: '#7209B7', seat: { x: 74, y: 76 } },
  ];
</script>

<section class="board">
  <div class="chamber">
    <svg viewBox="0 0 100 100" class="chamber-svg">
      <ellipse cx="50" cy="50" rx="42" ry="14" fill="none"
               stroke="#2A2A3E" stroke-width="0.5" />
      <ellipse cx="50" cy="50" rx="28" ry="9" fill="#121624"
               stroke="#2A2A3E" stroke-width="0.3"/>
      {#each SEATS as s}
        <circle cx={s.seat.x} cy={s.seat.y} r="3" fill={s.color} opacity="0.7">
          <animate attributeName="opacity" values="0.4;0.7;0.4" dur="3s" repeatCount="indefinite"/>
        </circle>
        <text x={s.seat.x} y={s.seat.y + 7}
              text-anchor="middle" font-size="2.2" fill="#E0E0E0"
              font-family="Cinzel" letter-spacing="0.3">
          {s.role}
        </text>
      {/each}
    </svg>

    <div class="empty-banner panel">
      <h2 class="ceremonial">Chamber Empty</h2>
      <p class="muted">No executive agents deployed. Board meetings begin in M2 when the C-Suite ships with LLM-backed narrative synthesis.</p>
    </div>
  </div>

  <aside class="transcript panel">
    <header class="trans-head">
      <div class="ceremonial">Board Meeting Transcript</div>
      <div class="muted small">aletheia · awaiting first convening</div>
    </header>
    <div class="trans-body">
      <p class="muted">The transcript will scroll here when board members begin to speak.</p>
    </div>
  </aside>
</section>

<style>
  .board {
    position: absolute;
    inset: 56px 0 0 0;
    display: grid;
    grid-template-columns: 1fr 340px;
  }
  .chamber {
    position: relative;
    display: grid;
    place-items: center;
  }
  .chamber-svg { width: 80%; height: 80%; }
  .empty-banner {
    position: absolute;
    bottom: var(--s8);
    left: 50%;
    transform: translateX(-50%);
    padding: var(--s5);
    max-width: 420px;
    text-align: center;
  }
  .empty-banner h2 { color: var(--c-solar-gold); font-size: 16px; margin-bottom: var(--s2); }

  .transcript {
    border-radius: 0;
    border-left: 1px solid var(--c-panel-border);
    padding: var(--s5);
  }
  .trans-head { padding-bottom: var(--s3); border-bottom: 1px solid var(--c-panel-border); margin-bottom: var(--s4); }
  .trans-head .ceremonial { color: var(--c-solar-gold); font-size: 12px; letter-spacing: 0.2em; margin-bottom: var(--s1); }
  .small { font-size: 10px; }
  .trans-body { font-size: 12px; line-height: 1.6; }
</style>
