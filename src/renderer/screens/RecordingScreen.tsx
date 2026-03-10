import { useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import BigButton from '../components/BigButton';
import VideoPreview from '../components/VideoPreview';
import Timer from '../components/Timer';
import { useSessionStore } from '../store/useSessionStore';
import { MAX_RECORDING_SECONDS } from '../../shared/constants';

export default function RecordingScreen() {
  const { setScreen, setFilePath, setError } = useSessionStore();
  const stoppingRef = useRef(false);

  const handleStop = useCallback(async () => {
    if (stoppingRef.current) return;
    stoppingRef.current = true;
    try {
      const result = await window.baysideAPI.stopRecording();
      setFilePath(result.filePath);
      setScreen('processing');
    } catch (err) {
      stoppingRef.current = false;
      setError(`Failed to stop recording: ${err}`);
    }
  }, [setScreen, setFilePath, setError]);

  // Auto-stop at max recording duration
  useEffect(() => {
    const timer = setTimeout(handleStop, MAX_RECORDING_SECONDS * 1000);
    return () => clearTimeout(timer);
  }, [handleStop]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full relative"
    >
      <VideoPreview mirror className="absolute inset-0 w-full h-full" />

      {/* Recording indicator */}
      <div className="absolute top-8 left-8 z-10">
        <Timer />
      </div>

      {/* Stop button */}
      <div className="absolute inset-x-0 bottom-0 flex justify-center pb-20 bg-gradient-to-t from-black/60 via-transparent to-transparent pt-40">
        <BigButton onClick={handleStop} variant="danger">
          Stop Recording
        </BigButton>
      </div>
    </motion.div>
  );
}
