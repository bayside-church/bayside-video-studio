import { useAudioLevel } from '../hooks/useAudioLevel';

interface AudioMeterProps {
  /** The avfoundation device id (e.g. "avfoundation:0"), or null for no audio. */
  deviceId: string | null;
  className?: string;
}

export default function AudioMeter({ deviceId, className = '' }: AudioMeterProps) {
  const level = useAudioLevel(deviceId);

  if (!deviceId) return null;

  const BAR_COUNT = 12;
  const activeBars = Math.round(level * BAR_COUNT);

  return (
    <div className={`flex items-end gap-[2px] ${className}`} title="Audio level">
      {Array.from({ length: BAR_COUNT }, (_, i) => {
        const isActive = i < activeBars;
        let color: string;
        if (i < BAR_COUNT * 0.6) {
          color = isActive ? 'bg-green-400' : 'bg-white/10';
        } else if (i < BAR_COUNT * 0.85) {
          color = isActive ? 'bg-yellow-400' : 'bg-white/10';
        } else {
          color = isActive ? 'bg-red-400' : 'bg-white/10';
        }

        return (
          <div
            key={i}
            className={`w-1 rounded-full transition-colors duration-75 ${color}`}
            style={{ height: `${6 + i * 2}px` }}
          />
        );
      })}
    </div>
  );
}
