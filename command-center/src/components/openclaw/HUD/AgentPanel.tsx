'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useOpenClawStore } from '@/store/openclawStore';

// Agent panel — appears when the player clicks an NPC in the world.
// Shows callsign, room, role and the most recent activity lines.
export function AgentPanel() {
  const selected = useOpenClawStore((s) => s.selectedAgent);
  const close = useOpenClawStore((s) => s.selectAgent);
  const log = useOpenClawStore((s) => s.log);

  const relevant = selected
    ? log.filter((l) => l.room === selected.roomId || l.room === 'system').slice(0, 6)
    : [];

  return (
    <AnimatePresence>
      {selected && (
        <motion.div
          key={`${selected.roomId}-${selected.index}`}
          initial={{ opacity: 0, y: 18, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 220, damping: 22 }}
          style={{
            position: 'fixed',
            bottom: 120,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 40,
            pointerEvents: 'auto',
            width: 420,
            background: 'linear-gradient(140deg, rgba(14,20,36,0.98), rgba(6,10,20,0.98))',
            border: `2px solid ${selected.accent}`,
            borderRadius: 12,
            boxShadow: `0 0 32px ${selected.accent}66, inset 0 0 24px ${selected.accent}22`,
            fontFamily: 'JetBrains Mono, monospace',
            color: '#d9e1f2',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '14px 18px',
              borderBottom: `1px solid ${selected.accent}55`,
            }}
          >
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 8,
                background: selected.accent,
                color: '#0a0a0f',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                fontWeight: 900,
                boxShadow: `0 0 18px ${selected.accent}`,
                flexShrink: 0,
              }}
            >
              {selected.roomName[0]}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  color: selected.accent,
                  fontSize: 12,
                  letterSpacing: '0.28em',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                }}
              >
                {selected.callsign}
              </div>
              <div
                style={{
                  color: '#aab2c7',
                  fontSize: 10,
                  letterSpacing: '0.3em',
                  marginTop: 3,
                  textTransform: 'uppercase',
                }}
              >
                {selected.roomName} · {selected.role}
              </div>
            </div>
            <button
              type="button"
              onClick={() => close(null)}
              aria-label="Close agent panel"
              style={{
                background: 'transparent',
                border: `1px solid ${selected.accent}77`,
                color: selected.accent,
                width: 28,
                height: 28,
                borderRadius: 6,
                fontSize: 14,
                cursor: 'pointer',
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>

          {/* Body */}
          <div style={{ padding: '14px 18px 16px' }}>
            <div
              style={{
                fontSize: 9,
                letterSpacing: '0.36em',
                color: '#6b7490',
                marginBottom: 10,
                textTransform: 'uppercase',
              }}
            >
              Recent Activity
            </div>
            {relevant.length === 0 ? (
              <div style={{ opacity: 0.55, fontSize: 11 }}>No activity in window.</div>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {relevant.map((l, i) => (
                  <li
                    key={i}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '66px 1fr',
                      gap: 10,
                      alignItems: 'baseline',
                      fontSize: 11,
                      padding: '4px 0',
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                    }}
                  >
                    <span style={{ color: selected.accent, letterSpacing: '0.14em', fontSize: 10 }}>{l.time}</span>
                    <span style={{ color: '#d9e1f2' }}>{l.message}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer — hint */}
          <div
            style={{
              padding: '10px 18px',
              borderTop: `1px solid ${selected.accent}33`,
              fontSize: 9,
              letterSpacing: '0.28em',
              color: '#7c8399',
              textAlign: 'center',
              textTransform: 'uppercase',
            }}
          >
            ESC · click anywhere to close
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
