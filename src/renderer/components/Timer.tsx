import { useState, useEffect, useRef } from 'react';

export default function Timer() {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 200);

    return () => clearInterval(interval);
  }, []);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-black/60 backdrop-blur-sm shadow-[0_0_0_1px_rgba(255,255,255,0.06)]">
      <div className="w-2.5 h-2.5 bg-danger rounded-full animate-pulse" />
      <span className="text-danger text-sm font-semibold tracking-wide uppercase">Rec</span>
      <span className="text-text-primary text-sm font-mono font-medium tabular-nums tracking-wider">{display}</span>
    </div>
  );
}
