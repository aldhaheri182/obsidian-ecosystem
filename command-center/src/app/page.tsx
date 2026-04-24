'use client';

import dynamic from 'next/dynamic';
import { TopBar } from '@/components/HUD/TopBar';
import { RightSidebar } from '@/components/HUD/RightSidebar';
import { BottomTimeline } from '@/components/HUD/BottomTimeline';
import { CityDetailPanel } from '@/components/HUD/CityDetailPanel';
import { LiveSimulation } from '@/components/LiveSimulation';

// Scene runs WebGL; must be client-only / no SSR.
const Scene = dynamic(() => import('@/components/Scene').then((m) => m.Scene), { ssr: false });

export default function Page() {
  return (
    <main className="fixed inset-0">
      <Scene />
      <TopBar />
      <RightSidebar />
      <BottomTimeline />
      <CityDetailPanel />
      <LiveSimulation />
    </main>
  );
}
