import { motion } from 'framer-motion';

interface BigButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'danger' | 'ghost';
  disabled?: boolean;
  pulse?: boolean;
}

const variantStyles = {
  primary: `
    bg-accent text-white
    shadow-[0_1px_2px_rgba(0,0,0,0.3),0_0_0_1px_rgba(129,140,248,0.4),0_8px_24px_-4px_rgba(129,140,248,0.2)]
    hover:bg-accent-hover hover:shadow-[0_1px_2px_rgba(0,0,0,0.3),0_0_0_1px_rgba(165,180,252,0.5),0_12px_32px_-4px_rgba(129,140,248,0.3)]
  `,
  danger: `
    bg-danger text-white
    shadow-[0_1px_2px_rgba(0,0,0,0.3),0_0_0_1px_rgba(248,113,113,0.4),0_8px_24px_-4px_rgba(248,113,113,0.2)]
    hover:bg-danger-hover hover:shadow-[0_1px_2px_rgba(0,0,0,0.3),0_0_0_1px_rgba(252,165,165,0.5),0_12px_32px_-4px_rgba(248,113,113,0.3)]
  `,
  ghost: `
    bg-surface-overlay text-text-primary
    shadow-[0_1px_2px_rgba(0,0,0,0.2),0_0_0_1px_rgba(255,255,255,0.08)]
    hover:bg-surface-border-hover hover:shadow-[0_1px_2px_rgba(0,0,0,0.2),0_0_0_1px_rgba(255,255,255,0.14)]
  `,
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
        px-10 py-4 rounded-2xl text-lg font-semibold tracking-[-0.01em]
        transition-all duration-200 cursor-pointer
        disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none
        ${variantStyles[variant]}
      `}
      whileHover={disabled ? undefined : { y: -1 }}
      whileTap={disabled ? undefined : { scale: 0.97, y: 0 }}
      animate={pulse ? { scale: [1, 1.03, 1] } : undefined}
      transition={pulse ? { repeat: Infinity, duration: 2.5, ease: 'easeInOut' } : undefined}
    >
      {children}
    </motion.button>
  );
}
