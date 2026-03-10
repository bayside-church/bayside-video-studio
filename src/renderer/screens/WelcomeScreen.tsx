import { motion } from 'framer-motion';
import BigButton from '../components/BigButton';
import { useSessionStore } from '../store/useSessionStore';

export default function WelcomeScreen() {
  const setScreen = useSessionStore((s) => s.setScreen);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full flex flex-col items-center justify-center gap-12 bg-gradient-to-b from-bayside-navy to-bayside-dark"
    >
      <div className="text-center">
        <motion.h1
          className="text-7xl font-bold text-white mb-4"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          Bayside Video Studio
        </motion.h1>
        <motion.p
          className="text-2xl text-white/50"
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          Record your video in seconds
        </motion.p>
      </div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <BigButton onClick={() => setScreen('email')} pulse>
          Tap to Begin
        </BigButton>
      </motion.div>
    </motion.div>
  );
}
