import { motion } from 'framer-motion';
import BigButton from '../components/BigButton';
import { useSessionStore } from '../store/useSessionStore';

export default function ErrorScreen() {
  const { errorMessage, reset } = useSessionStore();

  const handleStartOver = async () => {
    try {
      await window.baysideAPI.resetSession();
    } catch (err) {
      console.warn('[Error] resetSession failed:', err);
    }
    reset();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="screen-base gap-7"
    >
      <div className="w-16 h-16 rounded-full bg-danger-muted flex items-center justify-center relative z-10">
        <svg className="w-8 h-8 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>

      <div className="text-center relative z-10">
        <h2 className="text-2xl font-bold text-text-primary tracking-[-0.02em] mb-2">
          Something went wrong
        </h2>
        <p className="text-sm text-text-secondary max-w-sm leading-relaxed">
          {errorMessage ?? 'An unexpected error occurred.'}
        </p>
      </div>

      <div className="relative z-10">
        <BigButton onClick={handleStartOver}>Start Over</BigButton>
      </div>
    </motion.div>
  );
}
