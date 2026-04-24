<script lang="ts">
  /*
   * Agent Graveyard — walled garden of crystal monuments, one per retired
   * agent. Authorized by: Cinematic UI spec Part III.3.
   *
   * M0 has no retired agents (supervisor keeps them alive or restarts).
   * Retirement and the Immortality Vault arrive in M6 (Layer 35).
   */
</script>

<section class="graveyard">
  <header>
    <h2 class="ceremonial title">Agent Graveyard</h2>
    <p class="muted sub">A walled garden for retired agents. Crystals preserve their final ledger.</p>
  </header>

  <div class="garden">
    <div class="empty-state">
      <div class="firefly"></div>
      <div class="firefly" style="left: 65%; top: 40%; animation-delay: 1.2s"></div>
      <div class="firefly" style="left: 35%; top: 70%; animation-delay: 2.4s"></div>
      <p class="muted">No retired agents yet. The first crystal will be placed when M6 ships the Immortality Vault and an agent graduates.</p>
    </div>
  </div>
</section>

<style>
  .graveyard {
    position: absolute;
    inset: 56px var(--s8) var(--s8);
    display: flex;
    flex-direction: column;
    gap: var(--s6);
  }
  .title {
    color: var(--c-ghost-white);
    font-size: 26px;
    letter-spacing: 0.25em;
    margin-bottom: var(--s1);
  }
  .sub { font-size: 12px; letter-spacing: 0.05em; }

  .garden {
    flex: 1;
    background: linear-gradient(to bottom, #0a1a14, #0a0a0f);
    border: 1px solid var(--c-panel-border);
    border-radius: 6px;
    position: relative;
    overflow: hidden;
  }
  .empty-state {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    text-align: center;
    padding: var(--s8);
  }
  .empty-state p { max-width: 420px; font-size: 13px; line-height: 1.6; }

  .firefly {
    position: absolute;
    width: 3px;
    height: 3px;
    background: var(--c-solar-gold);
    border-radius: 50%;
    box-shadow: 0 0 6px var(--c-solar-gold);
    animation: firefly 4s infinite;
    top: 50%;
    left: 50%;
  }
  @keyframes firefly {
    0%, 100% { opacity: 0.3; transform: translate(0, 0); }
    50% { opacity: 0.9; transform: translate(20px, -15px); }
  }
</style>
