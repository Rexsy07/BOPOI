import React from 'react';

interface IconProps {
  className?: string;
  size?: number | string;
}

/**
 * Facebook Share Channel Icon
 * Glossy 3D royal blue/indigo badge with sculpted white monogram
 */
export const FacebookChannelIcon: React.FC<IconProps> = ({ className = '', size = 32 }) => {
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
        <linearGradient id="fb-badge-grad" x1="18" y1="16" x2="84" y2="86" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="45%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </linearGradient>
      </defs>

      {/* Rounded 3D Badge */}
      <rect
        x="14"
        y="14"
        width="72"
        height="72"
        rx="22"
        fill="url(#fb-badge-grad)"
        stroke="#1E40AF"
        strokeWidth="1.5"
      />

      {/* Top Gloss Highlight */}
      <path
        d="M 28 21 L 72 21"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.4"
      />

      {/* Sculpted 'f' Monogram */}
      <path
        d="M 57 86
           V 56
           H 66.5
           L 68 44.5
           H 57
           V 37.5
           C 57 34.2 58.2 31.8 62.8 31.8
           H 68.5
           V 21.5
           C 65.8 21.1 62.2 20.8 58.5 20.8
           C 48.8 20.8 43 26.5 43 36.8
           V 44.5
           H 34
           V 56
           H 43
           V 86
           H 57 Z"
        fill="white"
      />
    </svg>
  );
};
