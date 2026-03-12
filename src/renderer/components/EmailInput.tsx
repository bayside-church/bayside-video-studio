import { useState } from 'react';

interface EmailInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

export default function EmailInput({ value, onChange, onSubmit }: EmailInputProps) {
  const [touched, setTouched] = useState(false);
  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  const showError = touched && value.length > 0 && !isValid;

  return (
    <div className="w-full max-w-md">
      <input
        type="email"
        value={value}
        onChange={(e) => {
          setTouched(false);
          onChange(e.target.value);
        }}
        onBlur={() => setTouched(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && isValid) onSubmit();
        }}
        placeholder="you@email.com"
        autoFocus
        className={`
          w-full text-center text-2xl py-4 px-6 rounded-2xl
          bg-surface-overlay text-text-primary placeholder-text-tertiary
          outline-none transition-all duration-200
          shadow-[0_1px_2px_rgba(0,0,0,0.2),0_0_0_1px_rgba(255,255,255,0.08)]
          focus:shadow-[0_1px_2px_rgba(0,0,0,0.2),0_0_0_1px_rgba(129,140,248,0.5),0_0_16px_-2px_rgba(129,140,248,0.15)]
          ${showError ? 'shadow-[0_1px_2px_rgba(0,0,0,0.2),0_0_0_1px_rgba(248,113,113,0.5)]' : ''}
        `}
      />
      {showError && (
        <p className="text-danger text-sm mt-2.5 text-center font-medium">
          Please enter a valid email address
        </p>
      )}
    </div>
  );
}
