import { useEffect, useRef, useCallback } from 'react';
import { useSessionStore } from '../store/useSessionStore';
import { IDLE_TIMEOUT_MS } from '../../shared/constants';

export function useIdleTimeout() {
  const screen = useSessionStore((s) => s.screen);
  const reset = useSessionStore((s) => s.reset);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    // Don't run idle timeout on non-interactive screens
    if (
      screen === 'welcome' ||
      screen === 'processing' ||
      screen === 'complete' ||
      screen === 'recording' ||
      screen === 'countdown'
    ) return;

    timerRef.current = setTimeout(async () => {
      console.log('[Idle] Session timed out, resetting');
      try {
        await window.baysideAPI.resetSession();
      } catch (err) {
        console.warn('[Idle] resetSession failed:', err);
      }
      reset();
    }, IDLE_TIMEOUT_MS);
  }, [screen, reset]);

  useEffect(() => {
    resetTimer();

    const events = ['mousedown', 'mousemove', 'touchstart', 'keydown'];
    const handler = () => resetTimer();

    for (const event of events) {
      window.addEventListener(event, handler, { passive: true });
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      for (const event of events) {
        window.removeEventListener(event, handler);
      }
    };
  }, [resetTimer]);
}
