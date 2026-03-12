import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TimeWarningProps {
  maxSeconds: number;
}

export default function TimeWarning({ maxSeconds }: TimeWarningProps) {
  const startRef = useRef(Date.now());
  const [remaining, setRemaining] = useState(maxSeconds);
  const [toast, setToast] = useState<string | null>(null);
  const shownRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = (Date.now() - startRef.current) / 1000;
      setRemaining(Math.max(0, Math.ceil(maxSeconds - elapsed)));
    }, 250);
    return () => clearInterval(interval);
  }, [maxSeconds]);

  // Show toasts at 10min, 5min, 1min marks
  useEffect(() => {
    const thresholds = [
      { seconds: 600, label: '10 minutes remaining' },
      { seconds: 300, label: '5 minutes remaining' },
      { seconds: 60, label: '1 minute remaining' },
    ];

    for (const t of thresholds) {
      if (t.seconds >= maxSeconds) continue; // skip if max is shorter than threshold
      if (remaining <= t.seconds && !shownRef.current.has(t.seconds)) {
        shownRef.current.add(t.seconds);
        setToast(t.label);
        // Auto-dismiss after 4s (unless we're in countdown mode)
        if (t.seconds > 60) {
          setTimeout(() => setToast((cur) => (cur === t.label ? null : cur)), 10000);
        }
      }
    }
  }, [remaining, maxSeconds]);

  const inCountdown = remaining <= 60 && remaining > 0;

  const formatCountdown = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    if (m > 0) return `${m}:${String(sec).padStart(2, '0')}`;
    return `${sec}s`;
  };

  return (
    <AnimatePresence>
      {/* Toast notification for 10min / 5min marks */}
      {toast && !inCountdown && (
        <motion.div
          key="toast"
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 40 }}
          transition={{ duration: 0.3 }}
          className="absolute top-6 right-6 z-20"
        >
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-black/70 backdrop-blur-md shadow-lg border border-white/10">
            <svg className="w-5 h-5 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            <span className="text-white text-sm font-medium">{toast}</span>
          </div>
        </motion.div>
      )}

      {/* Live countdown in the last minute */}
      {inCountdown && (
        <motion.div
          key="countdown"
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 40 }}
          transition={{ duration: 0.3 }}
          className="absolute top-6 right-6 z-20"
        >
          <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl backdrop-blur-md shadow-lg border ${
            remaining <= 10
              ? 'bg-red-900/70 border-red-500/40'
              : 'bg-black/70 border-white/10'
          }`}>
            <svg className={`w-5 h-5 shrink-0 ${remaining <= 10 ? 'text-red-400' : 'text-amber-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            <span className={`text-sm font-semibold tabular-nums ${remaining <= 10 ? 'text-red-300' : 'text-white'}`}>
              {formatCountdown(remaining)} remaining
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
