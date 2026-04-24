'use client';

// Transient top-right toast feed. Each toast fades in, holds for ~3 s,
// then fades out (removed from store).

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';
import { useOpenClawStore } from '@/store/openclawStore';

const TOAST_TTL_MS = 3200;

export function ToastStack() {
  const toasts = useOpenClawStore((s) => s.toasts);
  const dismissToast = useOpenClawStore((s) => s.dismissToast);

  useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts.map((t) => {
      const remaining = Math.max(0, TOAST_TTL_MS - (Date.now() - t.startedAt));
      return setTimeout(() => dismissToast(t.id), remaining);
    });
    return () => timers.forEach(clearTimeout);
  }, [toasts, dismissToast]);

  return (
    <div
      className="fixed top-20 left-1/2 -translate-x-1/2 z-20 flex flex-col gap-2 items-center"
      style={{ pointerEvents: 'none' }}
    >
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 280, damping: 24 }}
            className="px-4 py-2 rounded font-mono backdrop-blur-sm"
            style={{
              background: 'rgba(6,8,14,0.82)',
              border: `1px solid ${t.accent}55`,
              boxShadow: `0 0 14px ${t.accent}33`,
              minWidth: 260,
              textAlign: 'center',
            }}
          >
            <div
              className="text-[10px] tracking-[0.35em]"
              style={{ color: t.accent, textShadow: `0 0 8px ${t.accent}88` }}
            >
              {t.title}
            </div>
            {t.subtitle && (
              <div className="text-[9px] text-ash-grey mt-0.5 tracking-[0.18em]">
                {t.subtitle}
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
