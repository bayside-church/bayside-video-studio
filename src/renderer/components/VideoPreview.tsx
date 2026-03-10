import { usePreview } from '../hooks/usePreview';

interface VideoPreviewProps {
  mirror?: boolean;
  className?: string;
}

export default function VideoPreview({ mirror = true, className = '' }: VideoPreviewProps) {
  const frameSrc = usePreview();

  return (
    <div className={`relative bg-black overflow-hidden ${className}`}>
      {frameSrc ? (
        <img
          src={frameSrc}
          alt=""
          className={`w-full h-full object-cover ${mirror ? 'scale-x-[-1]' : ''}`}
          draggable={false}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
