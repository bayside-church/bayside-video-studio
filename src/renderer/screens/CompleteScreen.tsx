import { motion } from 'framer-motion';
import { useSessionStore } from '../store/useSessionStore';

export default function CompleteScreen() {
  const { email, playbackUrl } = useSessionStore();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full flex flex-col items-center justify-center gap-8 bg-gradient-to-b from-bayside-navy to-bayside-dark"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
        className="w-28 h-28 rounded-full bg-green-500/20 flex items-center justify-center"
      >
        <svg className="w-14 h-14 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </motion.div>

      <div className="text-center">
        <h2 className="text-5xl font-bold text-white mb-4">Check Your Email!</h2>
        <p className="text-2xl text-white/50 mb-2">
          We sent a link to
        </p>
        <p className="text-2xl text-blue-400 font-medium">{email}</p>
      </div>

      {playbackUrl && (
        <p className="text-sm text-white/30 mt-4">
          Or visit: {playbackUrl}
        </p>
      )}

      <motion.p
        className="text-white/30 text-lg mt-8"
        animate={{ opacity: [0.3, 0.6, 0.3] }}
        transition={{ repeat: Infinity, duration: 2 }}
      >
        Returning to start...
      </motion.p>
    </motion.div>
  );
}
