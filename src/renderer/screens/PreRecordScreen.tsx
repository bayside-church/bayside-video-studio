import { motion } from 'framer-motion';
import BigButton from '../components/BigButton';
import VideoPreview from '../components/VideoPreview';
import { useSessionStore } from '../store/useSessionStore';

export default function PreRecordScreen() {
  const setScreen = useSessionStore((s) => s.setScreen);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full relative"
    >
      <VideoPreview mirror className="absolute inset-0 w-full h-full" />

      <div className="absolute inset-0 flex flex-col items-center justify-end pb-20 bg-gradient-to-t from-black/60 via-transparent to-transparent">
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <BigButton onClick={() => setScreen('countdown')}>
            Start Recording
          </BigButton>
        </motion.div>
      </div>
    </motion.div>
  );
}
