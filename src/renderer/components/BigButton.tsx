import { motion } from 'framer-motion';

interface BigButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'danger' | 'ghost';
  disabled?: boolean;
  pulse?: boolean;
}

const variants = {
  primary: 'bg-blue-500 hover:bg-blue-400 text-white shadow-lg shadow-blue-500/25',
  danger: 'bg-red-500 hover:bg-red-400 text-white shadow-lg shadow-red-500/25',
  ghost: 'bg-white/10 hover:bg-white/20 text-white border border-white/20',
};

export default function BigButton({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
  pulse = false,
}: BigButtonProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        px-12 py-5 rounded-2xl text-2xl font-semibold
        transition-colors duration-200
        disabled:opacity-40 disabled:cursor-not-allowed
        ${variants[variant]}
      `}
      whileTap={{ scale: 0.95 }}
      animate={pulse ? { scale: [1, 1.05, 1] } : undefined}
      transition={pulse ? { repeat: Infinity, duration: 2, ease: 'easeInOut' } : undefined}
    >
      {children}
    </motion.button>
  );
}
