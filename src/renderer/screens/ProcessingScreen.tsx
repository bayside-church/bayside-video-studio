import { useEffect } from 'react';
import { motion } from 'framer-motion';
import ProgressBar from '../components/ProgressBar';
import { useSessionStore } from '../store/useSessionStore';

export default function ProcessingScreen() {
  const {
    filePath,
    email,
    uploadProgress,
    setUploadProgress,
    setPlaybackUrl,
    setScreen,
    setError,
  } = useSessionStore();

  useEffect(() => {
    if (!filePath) return;

    let cancelled = false;

    const cleanupProgress = window.baysideAPI.onUploadProgress((progress) => {
      if (!cancelled) {
        setUploadProgress(progress.percent);
      }
    });

    (async () => {
      try {
        const playbackUrl = await window.baysideAPI.uploadVideo(filePath);
        if (cancelled) return;
        setPlaybackUrl(playbackUrl);

        // Try to send email, but don't block on failure
        try {
          await window.baysideAPI.sendEmail(email, playbackUrl);
        } catch (emailErr) {
          console.error('Email send failed:', emailErr);
        }

        if (!cancelled) {
          setScreen('complete');
        }
      } catch (err) {
        if (!cancelled) {
          setError(`Upload failed: ${err}`);
        }
      }
    })();

    return () => {
      cancelled = true;
      cleanupProgress();
    };
  }, [filePath, email, setUploadProgress, setPlaybackUrl, setScreen, setError]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full flex flex-col items-center justify-center gap-10 bg-gradient-to-b from-bayside-navy to-bayside-dark"
    >
      <div className="w-12 h-12 border-3 border-white/20 border-t-blue-400 rounded-full animate-spin" />

      <div className="text-center">
        <h2 className="text-4xl font-bold text-white mb-3">Processing Your Video</h2>
        <p className="text-xl text-white/50">This will just take a moment...</p>
      </div>

      <ProgressBar percent={uploadProgress} />
    </motion.div>
  );
}
