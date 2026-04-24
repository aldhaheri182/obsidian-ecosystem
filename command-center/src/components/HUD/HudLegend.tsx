'use client';

// Bottom-left legend — controls + current selection state.

import { Mouse, Keyboard, Eye } from 'lucide-react';
import { useEcosystemStore } from '@/store/ecosystemStore';

export function HudLegend() {
  const selectedId = useEcosystemStore((s) => s.selectedCityId);
  const cities = useEcosystemStore((s) => s.cities);
  const selected = cities.find((c) => c.id === selectedId) ?? null;

  return (
    <div
      className="fixed bottom-12 left-4 z-10 flex flex-col gap-1 text-[9px] font-mono text-ash-grey tracking-wider select-none"
      style={{ pointerEvents: 'none' }}
    >
      <div className="flex items-center gap-1.5">
        <Mouse className="w-3 h-3 opacity-70" />
        <span>DRAG · ORBIT · WHEEL ZOOM</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Eye className="w-3 h-3 opacity-70" />
        <span>CLICK A CHAMBER TO DESCEND</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Keyboard className="w-3 h-3 opacity-70" />
        <span>
          {selected ? (
            <>
              ESC · DBL-CLICK SKY TO ASCEND ·{' '}
              <span style={{ color: selected.accentColor }}>{selected.name.toUpperCase()}</span>
            </>
          ) : (
            <>AUTO-ROTATE AFTER 5 S IDLE</>
          )}
        </span>
      </div>
    </div>
  );
}
