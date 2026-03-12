import { useEffect, useRef } from 'react';
import { usePreview } from '../hooks/usePreview';

interface VideoPreviewProps {
  mirror?: boolean;
  className?: string;
  children?: React.ReactNode;
  mediaStream?: MediaStream | null;
}

export default function VideoPreview({ mirror = true, className = '', children, mediaStream }: VideoPreviewProps) {
  const frameSrc = usePreview();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && mediaStream) {
      videoRef.current.srcObject = mediaStream;
    }
  }, [mediaStream]);

  const hasContent = mediaStream || frameSrc;

  return (
    <div className={`relative bg-surface-base overflow-hidden ${className}`}>
      {hasContent ? (
        <>
          {mediaStream ? (
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className={`w-full h-full object-contain ${mirror ? 'scale-x-[-1]' : ''}`}
            />
          ) : (
            <img
              src={frameSrc!}
              alt=""
              className={`w-full h-full object-contain ${mirror ? 'scale-x-[-1]' : ''}`}
              draggable={false}
            />
          )}
          {/* Overlay container matching the 16:9 video area */}
          {children && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-full h-full max-w-[calc(100vh*16/9)] max-h-[calc(100vw*9/16)] relative">
                {children}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-surface-border border-t-accent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
