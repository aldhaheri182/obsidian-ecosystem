'use client';

import dynamic from 'next/dynamic';
import { TopBar } from '@/components/openclaw/HUD/TopBar';
import { MissionPanel } from '@/components/openclaw/HUD/MissionPanel';
import { BottomLog } from '@/components/openclaw/HUD/BottomLog';
import { Minimap } from '@/components/openclaw/HUD/Minimap';
import { InteractionPanel } from '@/components/openclaw/HUD/InteractionPanel';
import { ToastStack } from '@/components/openclaw/HUD/ToastStack';
import { KeyboardHelper } from '@/components/openclaw/HUD/KeyboardHelper';
import { AgentPanel } from '@/components/openclaw/HUD/AgentPanel';
import { LoadingVeil } from '@/components/LoadingVeil';

const OpenClawScene = dynamic(
  () => import('@/components/openclaw/OpenClawScene').then((m) => m.OpenClawScene),
  { ssr: false, loading: () => <LoadingVeil /> },
);

export default function OpenClawPage() {
  return (
    <main className="fixed inset-0 select-none">
      <OpenClawScene />
      <TopBar />
      <MissionPanel />
      <Minimap />
      <BottomLog />
      <InteractionPanel />
      <AgentPanel />
      <ToastStack />
      <KeyboardHelper />
    </main>
  );
}
