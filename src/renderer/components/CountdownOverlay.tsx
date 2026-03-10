import { motion, AnimatePresence } from 'framer-motion';

interface CountdownOverlayProps {
  count: number;
}

export default function CountdownOverlay({ count }: CountdownOverlayProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/40">
      <AnimatePresence mode="wait">
        <motion.div
          key={count}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 2, opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="text-white text-[200px] font-bold leading-none"
        >
          {count}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
