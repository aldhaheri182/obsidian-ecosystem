'use client';

// Spec §10.2 — Right sidebar 320px, scrollable, 5 sections.

import { AlertTriangle, Activity, Inbox, CheckCheck, Cpu, HardDrive, MemoryStick, Network } from 'lucide-react';
import { useEcosystemStore } from '@/store/ecosystemStore';

export function RightSidebar() {
  const health = useEcosystemStore((s) => s.health);
  const missions = useEcosystemStore((s) => s.missions);
  const alerts = useEcosystemStore((s) => s.alerts);
  const approvals = useEcosystemStore((s) => s.approvals);
  const cities = useEcosystemStore((s) => s.cities);

  const atRisk = cities.filter((c) => c.metrics.risk > 60);

  return (
    <aside
      className="fixed top-14 right-0 bottom-10 w-[320px] z-10 overflow-y-auto
        bg-[rgba(18,22,36,0.7)] backdrop-blur-xl border-l border-[rgba(42,42,62,0.5)]
        text-lunar-silver"
      style={{ pointerEvents: 'auto' }}
    >
      <Section icon={<Activity className="w-3.5 h-3.5" />} title="ACTIVE MISSIONS">
        {missions.map((m) => (
          <div key={m.id} className="mb-3">
            <div className="flex justify-between text-[10px] font-mono mb-1">
              <span className="text-lunar-silver">{m.title}</span>
              <span className="text-cyan-aurora">{Math.round(m.progress * 100)}%</span>
            </div>
            <div className="h-1 bg-[rgba(255,255,255,0.06)] rounded overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-verdigris to-cyan-aurora"
                style={{ width: `${m.progress * 100}%`, boxShadow: '0 0 6px rgba(0,245,212,0.5)' }}
              />
            </div>
          </div>
        ))}
      </Section>

      <Section icon={<Inbox className="w-3.5 h-3.5" />} title="LATEST AGENT ALERTS">
        {alerts.map((a) => (
          <div key={a.id} className="mb-2 flex gap-2">
            <span
              className={`w-1 rounded shrink-0 ${
                a.level === 'error' ? 'bg-crimson-forge' : a.level === 'warning' ? 'bg-ember' : 'bg-cyan-aurora'
              }`}
            />
            <div className="flex-1">
              <div className="text-[10px] font-mono text-ash-grey">{a.time}</div>
              <div className="text-[11px] leading-tight">{a.message}</div>
            </div>
          </div>
        ))}
      </Section>

      <Section icon={<Cpu className="w-3.5 h-3.5" />} title="SYSTEM HEALTH">
        <HealthRow icon={<Cpu className="w-3 h-3" />} label="CPU" value={health.cpu} />
        <HealthRow icon={<MemoryStick className="w-3 h-3" />} label="MEM" value={health.memory} />
        <HealthRow icon={<HardDrive className="w-3 h-3" />} label="DISK" value={health.disk} />
        <HealthRow icon={<Network className="w-3 h-3" />} label="NET" value={health.network} />
      </Section>

      <Section icon={<AlertTriangle className="w-3.5 h-3.5" />} title="RISK WARNINGS">
        {atRisk.length === 0 ? (
          <div className="text-[10px] font-mono text-ash-grey">All systems nominal.</div>
        ) : (
          atRisk.map((c) => (
            <div key={c.id} className="mb-2 flex items-center gap-2">
              <span className="pulse-dot w-2 h-2 rounded-full bg-crimson-forge" />
              <span className="text-[11px]">{c.name}</span>
              <span className="ml-auto text-[10px] font-mono text-crimson-forge">
                {c.metrics.risk.toFixed(0)}
              </span>
            </div>
          ))
        )}
      </Section>

      <Section icon={<CheckCheck className="w-3.5 h-3.5" />} title="PENDING HUMAN APPROVALS">
        {approvals.map((p) => (
          <div
            key={p.id}
            className="mb-2 p-2 rounded border border-[rgba(255,209,102,0.3)] bg-[rgba(255,209,102,0.05)]"
          >
            <div className="text-[11px] text-solar-gold">{p.title}</div>
            <div className="text-[10px] text-ash-grey">{p.description}</div>
          </div>
        ))}
      </Section>
    </aside>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="p-3 border-b border-[rgba(42,42,62,0.3)]">
      <div className="flex items-center gap-2 text-solar-gold mb-2">
        {icon}
        <span className="text-[10px] tracking-[0.25em] font-mono">{title}</span>
      </div>
      {children}
    </section>
  );
}

function HealthRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  const color = value > 80 ? '#E63946' : value > 60 ? '#FF6B35' : '#4ECDC4';
  return (
    <div className="mb-1.5">
      <div className="flex items-center gap-2 text-[10px] font-mono mb-0.5">
        {icon}
        <span className="text-ash-grey">{label}</span>
        <span className="ml-auto" style={{ color }}>
          {Math.round(value)}%
        </span>
      </div>
      <div className="h-1 bg-[rgba(255,255,255,0.06)] rounded overflow-hidden">
        <div className="h-full" style={{ width: `${value}%`, background: color, boxShadow: `0 0 4px ${color}` }} />
      </div>
    </div>
  );
}
