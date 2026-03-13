import { useEffect, useRef, useCallback, useState } from 'react';
import { useSessionStore } from '../store/useSessionStore';

export function useIdleTimeout() {
  const screen = useSessionStore((s) => s.screen);
  const reset = useSessionStore((s) => s.reset);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [timeoutMs, setTimeoutMs] = useState(120_000);

  useEffect(() => {
    window.baysideAPI.getIdleTimeoutSeconds().then((s) => setTimeoutMs(s * 1000));
  }, []);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    // Don't run idle timeout on non-interactive screens
    if (
      screen === 'home' ||
      screen === 'complete' ||
      screen === 'recording' ||
      screen === 'countdown' ||
      screen === 'unavailable'
    ) return;

    timerRef.current = setTimeout(async () => {
      console.log('[Idle] Session timed out, resetting');
      try {
        await window.baysideAPI.resetSession();
      } catch (err) {
        console.warn('[Idle] resetSession failed:', err);
      }
      reset();
    }, timeoutMs);
  }, [screen, reset, timeoutMs]);

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
