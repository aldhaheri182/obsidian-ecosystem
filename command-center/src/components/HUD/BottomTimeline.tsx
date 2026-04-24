'use client';

// Spec §10.3 — Bottom timeline 40px, horizontal scroll of activity capsules.
// Each: timestamp + agent action, left border colored by city accent.

import { useEcosystemStore } from '@/store/ecosystemStore';

export function BottomTimeline() {
  const timeline = useEcosystemStore((s) => s.timeline);
  return (
    <footer
      className="fixed bottom-0 left-0 right-0 h-10 z-10 px-4
        bg-[rgba(10,10,15,0.7)] backdrop-blur-xl
        border-t border-[rgba(42,42,62,0.5)]
        flex items-center gap-2 overflow-x-auto"
      style={{ pointerEvents: 'auto' }}
    >
      {timeline.length === 0 && (
        <div className="text-[10px] font-mono text-ash-grey">waiting for activity…</div>
      )}
      {timeline.map((e, i) => (
        <div
          key={i}
          className="shrink-0 flex items-center gap-2 px-3 py-1 rounded-full bg-[rgba(18,22,36,0.6)] border-l-2 text-[10px] font-mono"
          style={{ borderLeftColor: e.cityColor }}
        >
          <span className="text-ash-grey">{e.time}</span>
          <span className="text-lunar-silver">{e.text}</span>
        </div>
      ))}
    </footer>
  );
}
