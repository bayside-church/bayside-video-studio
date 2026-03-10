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
      className="h-full flex flex-col items-center justify-center gap-8 bg-gradient-to-b from-bayside-navy to-bayside-dark"
    >
      <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center">
        <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>

      <div className="text-center">
        <h2 className="text-4xl font-bold text-white mb-3">Something Went Wrong</h2>
        <p className="text-xl text-white/40 max-w-md">
          {errorMessage ?? 'An unexpected error occurred.'}
        </p>
      </div>

      <BigButton onClick={handleStartOver}>Start Over</BigButton>
    </motion.div>
  );
}
