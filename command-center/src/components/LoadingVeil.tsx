'use client';

// Cinematic loading veil shown while the Scene dynamic import resolves.

export function LoadingVeil() {
  return (
    <div className="fixed inset-0 z-0 flex flex-col items-center justify-center bg-void-black">
      <div className="font-ceremonial text-solar-gold text-[14px] tracking-[0.4em] mb-6 drop-shadow-[0_0_12px_rgba(255,209,102,0.5)]">
        ORUX AGENT COMMAND
      </div>
      <div className="flex items-center gap-2">
        <span className="pulse-dot w-2 h-2 rounded-full bg-verdigris" />
        <span className="font-mono text-[10px] tracking-[0.3em] text-verdigris">
          INITIALISING ECOSYSTEM
        </span>
      </div>
      <div className="mt-8 w-60 h-0.5 overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
        <div
          className="h-full bg-gradient-to-r from-verdigris via-cyan-aurora to-solar-gold"
          style={{ animation: 'scroll-tape 1.6s linear infinite', width: '50%' }}
        />
      </div>
    </div>
  );
}
