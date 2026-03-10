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
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setTouched(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && isValid) onSubmit();
        }}
        placeholder="your@email.com"
        autoFocus
        className={`
          w-full text-center text-3xl py-5 px-6 rounded-2xl
          bg-white/10 text-white placeholder-white/30
          border-2 outline-none transition-colors duration-200
          ${showError ? 'border-red-400' : 'border-white/20 focus:border-blue-400'}
        `}
      />
      {showError && (
        <p className="text-red-400 text-sm mt-2 text-center">
          Please enter a valid email address
        </p>
      )}
    </div>
  );
}
