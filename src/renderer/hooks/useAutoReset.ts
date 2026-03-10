import { useEffect } from 'react';
import { useSessionStore } from '../store/useSessionStore';
import { AUTO_RESET_MS } from '../../shared/constants';

export function useAutoReset() {
  const screen = useSessionStore((s) => s.screen);
  const reset = useSessionStore((s) => s.reset);

  useEffect(() => {
    if (screen !== 'complete') return;

    const timer = setTimeout(async () => {
      try {
        await window.baysideAPI.resetSession();
      } catch (err) {
        console.warn('[AutoReset] resetSession failed:', err);
      }
      reset();
    }, AUTO_RESET_MS);

    return () => clearTimeout(timer);
  }, [screen, reset]);
}
