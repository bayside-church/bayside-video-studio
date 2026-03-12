import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSessionStore } from '../store/useSessionStore';
import { DEVICE_RETRY_INTERVAL_MS } from '../../shared/constants';

export default function UnavailableScreen() {
  const { setScreen } = useSessionStore();

  useEffect(() => {
    let checking = false;
    let cancelled = false;

    const interval = setInterval(async () => {
      if (checking || cancelled) return;
      checking = true;
      try {
        const device = await window.baysideAPI.detectDevice();
        if (cancelled) return;
        if (device) {
          await window.baysideAPI.startPreview();
          if (!cancelled) {
            setScreen('home');
          }
        }
      } catch {
        // Keep retrying
      } finally {
        checking = false;
      }
    }, DEVICE_RETRY_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [setScreen]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="screen-base gap-7"
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 2.5, ease: 'linear' }}
        className="w-10 h-10 border-2 border-surface-border border-t-amber-400 rounded-full relative z-10"
      />

      <div className="text-center relative z-10">
        <h2 className="text-2xl font-bold text-text-primary tracking-[-0.02em] mb-2">
          Studio unavailable
        </h2>
        <p className="text-base text-text-secondary">
          Waiting for recording equipment...
        </p>
        <p className="text-xs text-text-tertiary mt-3">
          Retrying automatically
        </p>
      </div>
    </motion.div>
  );
}
