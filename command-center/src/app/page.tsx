'use client';

import dynamic from 'next/dynamic';
import { TopBar } from '@/components/HUD/TopBar';
import { RightSidebar } from '@/components/HUD/RightSidebar';
import { BottomTimeline } from '@/components/HUD/BottomTimeline';
import { CityDetailPanel } from '@/components/HUD/CityDetailPanel';
import { LiveSimulation } from '@/components/LiveSimulation';
import { HudLegend } from '@/components/HUD/HudLegend';
import { LoadingVeil } from '@/components/LoadingVeil';

// Scene runs WebGL; must be client-only / no SSR. Show a cinematic
// loading veil while the chunks stream.
const Scene = dynamic(() => import('@/components/Scene').then((m) => m.Scene), {
  ssr: false,
  loading: () => <LoadingVeil />,
});

export default function Page() {
  return (
    <main className="fixed inset-0">
      <Scene />
      <TopBar />
      <RightSidebar />
      <BottomTimeline />
      <CityDetailPanel />
      <HudLegend />
      <LiveSimulation />
    </main>
  );
}
