'use client';

// Owns the NATS WebSocket bridge lifecycle. Active only when the Owner is
// in real-time mode. Emits nothing; pure side-effect.

import { useLiveBus } from '@/lib/useLiveBus';
import { useEcosystemStore } from '@/store/ecosystemStore';

export function LiveBusController() {
  const mode = useEcosystemStore((x) => x.mode);
  useLiveBus(mode === 'real-time');
  return null;
}
