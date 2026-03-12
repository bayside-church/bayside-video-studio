import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import VideoPreview from '../components/VideoPreview';
import CountdownOverlay from '../components/CountdownOverlay';
import RecordingGuides from '../components/RecordingGuides';
import { useSessionStore } from '../store/useSessionStore';
import { COUNTDOWN_SECONDS } from '../../shared/constants';
import { getStream, startRecording as startBrowserRecording, startAudioOnlyRecording } from '../utils/browserCapture';

export default function CountdownScreen() {
  const { email, setScreen, setError, isBrowserCapture } = useSessionStore();
  const [count, setCount] = useState(COUNTDOWN_SECONDS);

  useEffect(() => {
    if (count <= 0) {
      let cancelled = false;
      (async () => {
        try {
          if (isBrowserCapture) {
            startBrowserRecording();
          } else {
            // Check if FFmpeg will capture audio directly (DeckLink + external mic).
            // In that case, skip renderer audio — FFmpeg handles sync internally.
            const ffmpegHandlesAudio = await window.baysideAPI.usesFFmpegAudio();

            if (!ffmpegHandlesAudio) {
              // Start audio-only recording FIRST (fast ~200ms) so it captures
              // from before video starts. The lead time is measured and compensated
              // during post-recording merge.
              const audioDevice = await window.baysideAPI.getSelectedAudioDevice();
              if (audioDevice) {
                try {
                  await startAudioOnlyRecording(audioDevice.name);
                } catch (err) {
                  console.warn('[Countdown] Failed to start renderer audio:', err);
                }
              }
            } else {
              console.log('[Countdown] FFmpeg handles audio (DeckLink + external mic), skipping renderer audio capture');
            }

            // Start video recording (slow ~1s — stops preview, spawns FFmpeg)
            await window.baysideAPI.startRecording(email);
          }
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

  const browserStream = isBrowserCapture ? getStream() : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="h-full relative"
    >
      <VideoPreview mirror className="absolute inset-0 w-full h-full" mediaStream={browserStream}>
        <RecordingGuides />
      </VideoPreview>
      {count > 0 && <CountdownOverlay count={count} />}
    </motion.div>
  );
}
