import { motion, AnimatePresence } from 'framer-motion';

interface CountdownOverlayProps {
  count: number;
}

export default function CountdownOverlay({ count }: CountdownOverlayProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/50 backdrop-blur-sm">
      <AnimatePresence mode="wait">
        <motion.div
          key={count}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 1.8, opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
          className="text-text-primary text-[160px] font-bold leading-none"
          style={{ textShadow: '0 0 60px rgba(129, 140, 248, 0.3)' }}
        >
          {count}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
