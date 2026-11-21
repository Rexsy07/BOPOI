import React from 'react';

interface CharProgressRingProps {
  length: number;
  max?: number;
  size?: number;
  warnThreshold?: number;
  showCountWhenLow?: boolean;
}

/**
 * X / Bluesky-style circular character progress indicator.
 * Shows subtle circular fill and transitions to amber/rose when approaching limit.
 */
export const CharProgressRing: React.FC<CharProgressRingProps> = ({
  length,
  max = 480,
  size = 20,
  warnThreshold = 40,
  showCountWhenLow = true,
}) => {
  const remaining = max - length;
  const progress = Math.min(1, Math.max(0, length / max));
  const strokeWidth = 2.4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  const isOver = remaining <= 0;
  const isWarning = !isOver && remaining <= warnThreshold;

  const strokeColor = isOver
    ? '#E11D48'
    : isWarning
    ? '#D97706'
    : '#5420F5';

  return (
    <div
      className="inline-flex items-center gap-1.5 shrink-0 tabular-nums"
      title={`${Math.max(0, remaining)} of ${max} characters remaining`}
      aria-label={`${Math.max(0, remaining)} characters remaining`}
    >
      {showCountWhenLow && remaining <= warnThreshold && (
        <span
          className={`text-[11px] font-extrabold ${
            isOver ? 'text-rose-600' : 'text-amber-600'
          }`}
        >
          {remaining}
        </span>
      )}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90 shrink-0"
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#EAE6F0"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 120ms ease, stroke 150ms ease' }}
        />
      </svg>
    </div>
  );
};
