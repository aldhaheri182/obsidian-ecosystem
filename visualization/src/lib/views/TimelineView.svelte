<script lang="ts">
  /*
   * Civilization Timeline — horizontal scrolling ceremonial ledger.
   * Authorized by: Cinematic UI spec Part III.2.
   * M6+ populates with Advancements. M0 shows the THE SKELETON era
   * with a single marker: M0 code-freeze.
   */

  type Marker = { day: number; label: string; kind: 'tick' | 'event' | 'era'; };

  const MARKERS: Marker[] = [
    { day: 0,   label: 'Genesis Commit (fb9ce06)', kind: 'event' },
    { day: 0.1, label: 'M0 Walking Skeleton — Code Freeze (2a1eaa9)', kind: 'event' },
    { day: 0,   label: 'THE SKELETON',            kind: 'era' },
  ];
</script>

<section class="timeline">
  <h2 class="ceremonial title">Civilization Timeline</h2>
  <p class="muted subtitle">
    The ecosystem's life, one event at a time. Milestones plot themselves
    as they ship; advancements land in M6+.
  </p>

  <div class="rail">
    <div class="thread"></div>
    {#each MARKERS as m}
      <div class="marker {m.kind}" style="left: {50 + m.day * 4}%">
        <div class="marker-dot"></div>
        <div class="marker-label {m.kind}">{m.label}</div>
      </div>
    {/each}
  </div>

  <div class="note panel">
    <p class="muted">
      Markers scroll with the timeline. Era boundaries (ceremonial font)
      become visible when enough history accumulates. The first era —
      THE SKELETON — closes when M1 ships.
    </p>
  </div>
</section>

<style>
  .timeline {
    position: absolute;
    inset: 56px var(--s8) var(--s8);
    display: flex;
    flex-direction: column;
    gap: var(--s5);
  }
  .title {
    color: var(--c-ghost-white);
    font-size: 26px;
    letter-spacing: 0.25em;
    margin-bottom: var(--s1);
  }
  .subtitle { font-size: 12px; letter-spacing: 0.05em; }

  .rail {
    position: relative;
    height: 160px;
    margin-top: var(--s6);
    overflow: hidden;
  }
  .thread {
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(to right,
      transparent, var(--c-solar-gold) 20%, var(--c-solar-gold) 80%, transparent);
  }
  .marker {
    position: absolute;
    top: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--s2);
  }
  .marker-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--c-lunar-silver); }
  .marker.event .marker-dot { background: var(--c-solar-gold); box-shadow: 0 0 8px var(--c-solar-gold); }
  .marker.era .marker-dot { width: 14px; height: 14px; background: var(--c-solar-gold); box-shadow: 0 0 20px var(--c-solar-gold); }
  .marker-label {
    font-family: var(--font-ui);
    font-size: 10px;
    color: var(--c-lunar-silver);
    white-space: nowrap;
    transform: translateY(8px);
  }
  .marker-label.era {
    font-family: var(--font-ceremonial);
    font-size: 16px;
    letter-spacing: 0.2em;
    color: var(--c-solar-gold);
    transform: translateY(-36px);
  }

  .note { padding: var(--s4); font-size: 12px; }
</style>
