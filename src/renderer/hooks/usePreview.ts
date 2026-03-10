import { useEffect, useRef, useState } from 'react';
import type { PreviewFrame } from '../../shared/types';

export function usePreview() {
  const [frameSrc, setFrameSrc] = useState<string | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    cleanupRef.current = window.baysideAPI.onPreviewFrame((frame: PreviewFrame) => {
      setFrameSrc(frame.data);
    });

    return () => {
      cleanupRef.current?.();
    };
  }, []);

  return frameSrc;
}
