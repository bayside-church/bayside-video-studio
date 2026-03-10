import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSessionStore } from '../store/useSessionStore';
import { DEVICE_RETRY_INTERVAL_MS } from '../../shared/constants';

export default function UnavailableScreen() {
  const { setScreen, setError } = useSessionStore();

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
            setScreen('preRecord');
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
      className="h-full flex flex-col items-center justify-center gap-8 bg-gradient-to-b from-bayside-navy to-bayside-dark"
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
        className="w-16 h-16 border-4 border-white/10 border-t-yellow-400 rounded-full"
      />

      <div className="text-center">
        <h2 className="text-4xl font-bold text-white mb-3">Studio Unavailable</h2>
        <p className="text-xl text-white/40">
          Waiting for recording equipment...
        </p>
        <p className="text-sm text-white/20 mt-4">
          Retrying automatically
        </p>
      </div>
    </motion.div>
  );
}
