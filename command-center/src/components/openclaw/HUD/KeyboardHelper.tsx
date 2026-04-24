'use client';

// Small bottom-left keybind helper.

export function KeyboardHelper() {
  return (
    <div
      className="fixed bottom-[92px] left-4 z-20 flex flex-col gap-1 p-3 rounded
        bg-[rgba(10,14,26,0.72)] backdrop-blur-sm border border-[rgba(78,205,196,0.18)]"
      style={{ pointerEvents: 'none' }}
    >
      <div className="font-mono text-[9px] tracking-[0.32em] text-solar-gold mb-1">CONTROLS</div>
      <Row k="WASD" label="MOVE" />
      <Row k="SHIFT" label="RUN" />
      <Row k="E" label="INTERACT" />
      <Row k="CLICK" label="SELECT AGENT" />
      <Row k="ESC" label="BACK" />
    </div>
  );
}

function Row({ k, label }: { k: string; label: string }) {
  return (
    <div className="flex items-center gap-2 text-[10px] font-mono">
      <span
        className="px-1.5 py-0.5 rounded border border-[rgba(78,205,196,0.4)] text-verdigris"
        style={{ background: 'rgba(78,205,196,0.06)', minWidth: 28, textAlign: 'center' }}
      >
        {k}
      </span>
      <span className="text-ash-grey tracking-[0.15em]">{label}</span>
    </div>
  );
}
