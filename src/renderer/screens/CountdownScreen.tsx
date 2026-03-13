import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import VideoPreview from '../components/VideoPreview';
import CountdownOverlay from '../components/CountdownOverlay';
import RecordingGuides from '../components/RecordingGuides';
import { useSessionStore } from '../store/useSessionStore';
import { COUNTDOWN_SECONDS } from '../../shared/constants';
import { getStream, startRecording as startBrowserRecording, startAudioOnlyRecording } from '../utils/browserCapture';

export default function CountdownScreen() {
  const { email, setScreen, setError, setFilePath, isBrowserCapture } = useSessionStore();
  const [count, setCount] = useState(COUNTDOWN_SECONDS);
  const recordingStartedRef = useRef(false);
  const recordingReadyRef = useRef(false);

  // Start recording immediately on mount so the FFmpeg process spins up
  // while the countdown is displayed. Preview frames will appear behind the
  // overlay as soon as FFmpeg begins outputting them.
  useEffect(() => {
    if (recordingStartedRef.current) return;
    recordingStartedRef.current = true;

    (async () => {
      try {
        if (isBrowserCapture) {
          startBrowserRecording();
        } else {
          const ffmpegHandlesAudio = await window.baysideAPI.usesFFmpegAudio();

          if (!ffmpegHandlesAudio) {
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

          const result = await window.baysideAPI.startRecording(email);
          setFilePath(result.filePath);
        }
        recordingReadyRef.current = true;
      } catch (err) {
        setError(`Failed to start recording: ${err}`);
      }
    })();
  }, []);

  // Visual countdown — purely cosmetic. When it finishes, transition to
  // recording screen (recording is already running by then).
  useEffect(() => {
    if (count > 0) {
      const timer = setTimeout(() => setCount(count - 1), 1000);
      return () => clearTimeout(timer);
    }

    // count === 0 — wait for recording to be ready if it isn't already
    const check = setInterval(() => {
      if (recordingReadyRef.current) {
        clearInterval(check);
        setScreen('recording');
      }
    }, 50);
    return () => clearInterval(check);
  }, [count, setScreen]);

  const browserStream = isBrowserCapture ? getStream() : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 1 }}
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
