import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import BigButton from '../components/BigButton';
import VideoPreview from '../components/VideoPreview';
import Timer from '../components/Timer';
import AudioMeter from '../components/AudioMeter';
import RecordingGuides from '../components/RecordingGuides';
import TimeWarning from '../components/TimeWarning';
import { useSessionStore } from '../store/useSessionStore';
import { getStream, stopRecording as stopBrowserRecording, stopAudioOnlyRecording, isAudioOnlyRecording } from '../utils/browserCapture';

export default function RecordingScreen() {
  const { email, setScreen, setFilePath, setError, isBrowserCapture, addPendingVideo } = useSessionStore();
  const stoppingRef = useRef(false);
  const [audioDeviceId, setAudioDeviceId] = useState<string | null>(null);
  const [maxSeconds, setMaxSeconds] = useState<number | null>(null);

  useEffect(() => {
    window.baysideAPI.getSelectedAudioDevice().then((d) => setAudioDeviceId(d?.id ?? null));
    window.baysideAPI.getMaxRecordingSeconds().then(setMaxSeconds);
  }, []);

  const handleStop = useCallback(async () => {
    if (stoppingRef.current) return;
    stoppingRef.current = true;

    try {
      let filePath: string;

      if (isBrowserCapture) {
        const { blob } = await stopBrowserRecording();
        const buffer = await blob.arrayBuffer();
        filePath = await window.baysideAPI.saveBrowserRecording(buffer, email);
      } else {
        // Stop renderer audio-only recording if active, save to file for merge
        let rendererAudioPath: string | undefined;
        if (isAudioOnlyRecording()) {
          const audioBlob = await stopAudioOnlyRecording();
          if (audioBlob && audioBlob.size > 0) {
            const audioBuffer = await audioBlob.arrayBuffer();
            rendererAudioPath = await window.baysideAPI.saveAudioRecording(audioBuffer);
            console.log(`[Recording] Audio saved: ${rendererAudioPath} (${audioBlob.size}B)`);
          }
        }

        const result = await window.baysideAPI.stopRecording(rendererAudioPath);
        filePath = result.filePath;
      }

      setFilePath(filePath);

      // Track the upload in the pending list (global listeners in App handle progress/completion)
      addPendingVideo({
        id: filePath,
        email,
        startedAt: new Date().toISOString(),
        progress: 0,
        status: 'uploading',
      });

      // Fire-and-forget upload
      window.baysideAPI.uploadVideo(filePath, email).catch((err) => {
        console.error(`[Upload] Failed to start: ${err}`);
      });

      setScreen('complete');
    } catch (err) {
      stoppingRef.current = false;
      setError(`Failed to stop recording: ${err}`);
    }
  }, [setScreen, setFilePath, setError, isBrowserCapture, email]);

  useEffect(() => {
    if (maxSeconds == null) return;
    const timer = setTimeout(handleStop, maxSeconds * 1000);
    return () => clearTimeout(timer);
  }, [handleStop, maxSeconds]);

  const browserStream = isBrowserCapture ? getStream() : null;

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="h-full relative"
    >
      <VideoPreview mirror className="absolute inset-0 w-full h-full" mediaStream={browserStream}>
        <RecordingGuides />
      </VideoPreview>

      {/* Recording indicator + audio meter */}
      <div className="absolute top-6 left-6 z-10 flex items-center gap-3">
        <Timer />
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/30 backdrop-blur-sm">
          <svg className="w-4 h-4 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
          </svg>
          <AudioMeter deviceId={audioDeviceId} />
        </div>
      </div>

      {/* Time warning toasts + countdown */}
      {maxSeconds != null && maxSeconds > 0 && <TimeWarning maxSeconds={maxSeconds} />}

      {/* Stop button */}
      <div className="absolute inset-x-0 bottom-0 flex justify-center pb-16 pt-32 bg-gradient-to-t from-surface-base/90 via-surface-base/40 to-transparent">
        <BigButton onClick={handleStop} variant="danger">
          Stop Recording
        </BigButton>
      </div>
    </motion.div>
  );
}
