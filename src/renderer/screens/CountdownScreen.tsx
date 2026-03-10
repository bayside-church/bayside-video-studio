import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import VideoPreview from '../components/VideoPreview';
import CountdownOverlay from '../components/CountdownOverlay';
import { useSessionStore } from '../store/useSessionStore';
import { COUNTDOWN_SECONDS } from '../../shared/constants';

export default function CountdownScreen() {
  const { setScreen, setError } = useSessionStore();
  const [count, setCount] = useState(COUNTDOWN_SECONDS);

  useEffect(() => {
    if (count <= 0) {
      let cancelled = false;
      (async () => {
        try {
          await window.baysideAPI.stopPreview();
          if (cancelled) return;
          await window.baysideAPI.startRecording();
          if (cancelled) return;
          setScreen('recording');
        } catch (err) {
          if (!cancelled) {
            setError(`Failed to start recording: ${err}`);
          }
        }
      })();
      return () => { cancelled = true; };
    }

    const timer = setTimeout(() => setCount(count - 1), 1000);
    return () => clearTimeout(timer);
  }, [count, setScreen, setError]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full relative"
    >
      <VideoPreview mirror className="absolute inset-0 w-full h-full" />
      {count > 0 && <CountdownOverlay count={count} />}
    </motion.div>
  );
}
