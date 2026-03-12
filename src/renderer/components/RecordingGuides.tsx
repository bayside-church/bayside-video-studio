import { useSessionStore } from '../store/useSessionStore';

const LINE_COLOR = 'rgba(255, 255, 255, 0.25)';
const CROSSHAIR_COLOR = 'rgba(255, 255, 255, 0.4)';
const SAFE_COLOR_TITLE = 'rgba(255, 255, 255, 0.3)';
const SAFE_COLOR_ACTION = 'rgba(255, 255, 255, 0.2)';

export default function RecordingGuides() {
  const { ruleOfThirds, centerCrosshair, safeZones } = useSessionStore((s) => s.guides);

  if (!ruleOfThirds && !centerCrosshair && !safeZones) return null;

  return (
    <svg
      className="absolute inset-0 w-full h-full z-10 pointer-events-none"
      viewBox="0 0 1200 675"
      preserveAspectRatio="none"
    >
      {/* Safe zones — action safe (3.5%) and title safe (10%) */}
      {safeZones && (
        <>
          <rect
            x={42} y={23.625}
            width={1116} height={627.75}
            fill="none"
            stroke={SAFE_COLOR_ACTION}
            strokeWidth={1}
            strokeDasharray="8 4"
          />
          <rect
            x={120} y={67.5}
            width={960} height={540}
            fill="none"
            stroke={SAFE_COLOR_TITLE}
            strokeWidth={1}
            strokeDasharray="4 4"
          />
        </>
      )}

      {/* Rule of thirds */}
      {ruleOfThirds && (
        <>
          <line x1={400} y1={0} x2={400} y2={675} stroke={LINE_COLOR} strokeWidth={1} />
          <line x1={800} y1={0} x2={800} y2={675} stroke={LINE_COLOR} strokeWidth={1} />
          <line x1={0} y1={225} x2={1200} y2={225} stroke={LINE_COLOR} strokeWidth={1} />
          <line x1={0} y1={450} x2={1200} y2={450} stroke={LINE_COLOR} strokeWidth={1} />
        </>
      )}

      {/* Center crosshair */}
      {centerCrosshair && (
        <>
          <line x1={580} y1={337.5} x2={620} y2={337.5} stroke={CROSSHAIR_COLOR} strokeWidth={1.5} />
          <line x1={600} y1={317.5} x2={600} y2={357.5} stroke={CROSSHAIR_COLOR} strokeWidth={1.5} />
        </>
      )}
    </svg>
  );
}
