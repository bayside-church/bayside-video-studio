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
    <div className="flex items-center gap-3 text-white text-2xl font-mono">
      <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse" />
      <span>REC</span>
      <span className="tabular-nums">{display}</span>
    </div>
  );
}
