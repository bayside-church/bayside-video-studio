import { motion } from 'framer-motion';

interface ProgressBarProps {
  percent: number;
}

export default function ProgressBar({ percent }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, percent));
  return (
    <div className="w-full max-w-sm" role="progressbar" aria-valuenow={clamped} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-2 bg-surface-overlay rounded-full overflow-hidden shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)]">
        <motion.div
          className="h-full bg-accent rounded-full"
          style={{ boxShadow: '0 0 12px rgba(129, 140, 248, 0.4)' }}
          initial={{ width: 0 }}
          animate={{ width: `${clamped}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </div>
      <p className="text-text-tertiary text-xs mt-2.5 text-center tabular-nums font-medium">{clamped}%</p>
    </div>
  );
}
