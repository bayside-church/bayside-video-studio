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
        await window.baysideAPI.uploadVideo(filePath, email);
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
  }, [filePath, email, setUploadProgress, setScreen, setError]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="screen-base gap-8"
    >
      {/* Spinner */}
      <motion.div
        className="w-10 h-10 border-2 border-surface-border border-t-accent rounded-full relative z-10"
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
      />

      <div className="text-center relative z-10">
        <h2 className="text-2xl font-bold text-text-primary tracking-[-0.02em] mb-2">
          Preparing your video
        </h2>
        <p className="text-base text-text-secondary">
          We'll email it to you shortly
        </p>
      </div>

      <div className="relative z-10 w-full flex justify-center px-8">
        <ProgressBar percent={uploadProgress} />
      </div>
    </motion.div>
  );
}
