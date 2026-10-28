import React from 'react';

interface IconProps {
  className?: string;
  size?: number | string;
}

/**
 * WhatsApp Share Channel Icon
 * Glossy 3D emerald-and-royal-purple speech bubble with crisp phone handset
 */
export const WhatsAppChannelIcon: React.FC<IconProps> = ({ className = '', size = 32 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 select-none ${className}`}
    >
      <defs>
        <linearGradient id="wa-bubble-grad" x1="18" y1="16" x2="84" y2="86" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#34D399" />
          <stop offset="45%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
      </defs>

      {/* Circular Chat Bubble with Bottom-Left Tail */}
      <path
        d="M 50 14
           C 70 14 86 29.5 86 49
           C 86 68.5 70 84 50 84
           C 43.5 84 37.4 82.3 32.1 79.3
           L 16 85
           L 21.2 70.2
           C 16.7 64.3 14 57 14 49
           C 14 29.5 30 14 50 14 Z"
        fill="url(#wa-bubble-grad)"
        stroke="#065F46"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      {/* Top Gloss Highlight */}
      <path
        d="M 32 24 C 42 19 58 19 68 24"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.45"
      />

      {/* Crisp Phone Receiver Inside */}
      <path
        d="M 38.5 34
           C 36.8 34 35 35.5 34.2 37.5
           C 33.2 40 33.8 44.5 36.8 49.5
           C 39.8 54.5 45.2 59.8 51.5 62.8
           C 56.5 65.2 60.8 65.5 63.5 64.2
           C 65.5 63.2 67 61.2 67 59.2
           L 66.2 55.8
           C 65.8 54.5 64.5 53.8 63.2 53.4
           L 57.5 51.8
           C 56.2 51.4 54.8 52 54 53
           L 52.2 55.2
           C 48.5 53.4 45.2 50.2 43.2 46.5
           L 45.2 44.5
           C 46.2 43.5 46.6 42.2 46.2 40.8
           L 44.4 35.5
           C 43.8 34.4 42.6 34 41.2 34
           L 38.5 34 Z"
        fill="white"
      />
    </svg>
  );
};
