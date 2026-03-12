import { useCallback } from 'react';
import { motion } from 'framer-motion';
import { useSessionStore } from '../store/useSessionStore';

export default function CompleteScreen() {
  const { email, reset } = useSessionStore();

  const handleGoAgain = useCallback(async () => {
    try {
      await window.baysideAPI.resetSession();
    } catch (err) {
      console.warn('[Complete] resetSession failed:', err);
    }
    reset();
  }, [reset]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="screen-base gap-7"
    >
      {/* Success icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.15 }}
        className="w-20 h-20 rounded-full bg-success-muted flex items-center justify-center relative z-10"
        style={{ boxShadow: '0 0 32px rgba(52, 211, 153, 0.15)' }}
      >
        <svg className="w-10 h-10 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </motion.div>

      <div className="text-center relative z-10">
        <motion.h2
          className="text-3xl font-bold text-text-primary tracking-[-0.02em] mb-2"
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25 }}
        >
          You're all set!
        </motion.h2>
        <motion.p
          className="text-base text-text-secondary mb-1"
          initial={{ y: 6, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.32 }}
        >
          We're preparing your full-quality download and will email it to
        </motion.p>
        <motion.p
          className="text-base text-accent font-semibold"
          initial={{ y: 6, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.38 }}
        >
          {email}
        </motion.p>
      </div>

      {/* 24-hour warning callout */}
      <motion.div
        className="relative z-10 flex items-center gap-3 px-5 py-3 rounded-2xl border border-accent-muted"
        style={{ background: 'rgba(129, 140, 248, 0.08)' }}
        initial={{ y: 8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.46 }}
      >
        <svg className="w-5 h-5 text-accent shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm text-text-primary font-medium">
          Please download your file within 24 hours — the link will expire.
        </p>
      </motion.div>

      {/* Go Again button */}
      <motion.button
        className="relative z-10 mt-4 px-8 py-3 rounded-2xl bg-surface-overlay text-text-secondary font-semibold text-base border border-surface-border hover:border-surface-border-hover hover:text-text-primary transition-colors cursor-pointer"
        initial={{ y: 8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.54 }}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={handleGoAgain}
      >
        Go Again
      </motion.button>
    </motion.div>
  );
}
