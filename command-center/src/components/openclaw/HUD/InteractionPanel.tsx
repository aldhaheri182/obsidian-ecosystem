'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useOpenClawStore } from '@/store/openclawStore';
import { ROOMS } from '@/data/openclawRooms';

export function InteractionPanel() {
  const openPanelRoomId = useOpenClawStore((s) => s.openPanelRoomId);
  const openPanel = useOpenClawStore((s) => s.openPanel);
  const pushLog = useOpenClawStore((s) => s.pushLog);

  const room = ROOMS.find((r) => r.id === openPanelRoomId) ?? null;

  return (
    <AnimatePresence>
      {room && (
        <motion.div
          key={room.id}
          className="fixed inset-0 z-30 flex items-center justify-center"
          style={{ pointerEvents: 'auto' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Back-scrim */}
          <div
            className="absolute inset-0 bg-[rgba(6,8,14,0.65)] backdrop-blur-sm"
            onClick={() => openPanel(null)}
          />

          {/* Hologram panel */}
          <motion.div
            initial={{ scale: 0.92, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.92, y: 20 }}
            transition={{ type: 'spring', stiffness: 180, damping: 22 }}
            className="relative w-[560px] max-w-[92vw] rounded-lg overflow-hidden"
            style={{
              background:
                'linear-gradient(145deg, rgba(10,14,26,0.94), rgba(4,6,12,0.96))',
              border: `1px solid ${room.accent}`,
              boxShadow: `0 0 48px ${room.accent}55, inset 0 0 40px ${room.accent}15`,
            }}
          >
            {/* Holo scanline */}
            <div
              className="absolute inset-0 pointer-events-none opacity-25"
              style={{
                background: `repeating-linear-gradient(0deg, ${room.accent}10 0px, ${room.accent}10 1px, transparent 2px, transparent 4px)`,
              }}
            />

            <header
              className="px-5 py-4 flex items-start justify-between border-b"
              style={{ borderColor: `${room.accent}33` }}
            >
              <div>
                <div
                  className="font-mono text-[9px] tracking-[0.35em]"
                  style={{ color: room.accent, opacity: 0.7 }}
                >
                  ROOM TERMINAL
                </div>
                <h2
                  className="font-ceremonial text-[22px] tracking-[0.25em] mt-1"
                  style={{ color: room.accent, textShadow: `0 0 14px ${room.accent}88` }}
                >
                  {room.name.toUpperCase()}
                </h2>
                <div className="text-[11px] text-lunar-silver/70 font-mono mt-1">
                  {room.subtitle}
                </div>
              </div>
              <button
                onClick={() => openPanel(null)}
                className="w-8 h-8 rounded-md border flex items-center justify-center hover:bg-white/5 transition"
                style={{ borderColor: `${room.accent}55`, color: room.accent }}
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            <div className="grid grid-cols-2 gap-3 p-5">
              {room.stats.map((s) => (
                <div
                  key={s.label}
                  className="p-3 rounded border"
                  style={{
                    borderColor: `${room.accent}22`,
                    background: `${room.accent}08`,
                  }}
                >
                  <div className="text-[9px] font-mono tracking-[0.25em] text-ash-grey">
                    {s.label.toUpperCase()}
                  </div>
                  <div
                    className="text-[15px] font-mono mt-1"
                    style={{ color: room.accent, textShadow: `0 0 6px ${room.accent}55` }}
                  >
                    {s.value}
                  </div>
                </div>
              ))}
            </div>

            <footer
              className="px-5 pb-5 pt-2 flex flex-wrap gap-2 border-t"
              style={{ borderColor: `${room.accent}22` }}
            >
              {room.actions.map((a) => (
                <button
                  key={a.label}
                  onClick={() => {
                    pushLog({
                      time: new Date().toISOString().slice(11, 19),
                      room: room.id,
                      message: `${a.label} — ack`,
                    });
                    if (a.variant === 'danger') {
                      openPanel(null);
                    }
                  }}
                  className={actionBtnClass(a.variant)}
                  style={
                    a.variant === 'primary'
                      ? {
                          background: `${room.accent}15`,
                          borderColor: room.accent,
                          color: room.accent,
                          boxShadow: `0 0 10px ${room.accent}33 inset`,
                        }
                      : undefined
                  }
                >
                  {a.label.toUpperCase()}
                </button>
              ))}
            </footer>

            {/* Keyboard hint */}
            <div
              className="absolute bottom-2 right-4 font-mono text-[9px] tracking-[0.22em]"
              style={{ color: `${room.accent}aa` }}
            >
              ESC / CLICK OUTSIDE TO CLOSE
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function actionBtnClass(variant: 'primary' | 'warn' | 'danger' | 'ghost') {
  const base =
    'px-3 py-1.5 rounded text-[10px] font-mono tracking-[0.22em] border transition-colors';
  switch (variant) {
    case 'primary':
      return base;
    case 'warn':
      return (
        base +
        ' bg-[rgba(255,107,53,0.12)] border-[rgba(255,107,53,0.5)] text-ember hover:bg-[rgba(255,107,53,0.2)]'
      );
    case 'danger':
      return (
        base +
        ' bg-[rgba(230,57,70,0.14)] border-[rgba(230,57,70,0.7)] text-crimson-forge hover:bg-[rgba(230,57,70,0.24)]'
      );
    case 'ghost':
      return (
        base +
        ' border-[rgba(255,255,255,0.12)] text-ash-grey hover:text-lunar-silver hover:bg-white/5'
      );
  }
}
