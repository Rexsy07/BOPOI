import React from 'react';

interface IconProps {
  className?: string;
  size?: number | string;
}

/**
 * Inbox All Caught Up Action Badge / Empty State Icon
 * Clean 3D perspective empty purple desk inbox tray with white inner lip
 */
export const InboxCaughtUpIcon: React.FC<IconProps> = ({ className = '', size = 32 }) => {
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
        {/* Tray Outer Purple Gradient */}
        <linearGradient id="tray-outer-grad" x1="20" y1="35" x2="80" y2="85" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#818CF8" />
          <stop offset="35%" stopColor="#6C35FF" />
          <stop offset="75%" stopColor="#4F1BDD" />
          <stop offset="100%" stopColor="#250578" />
        </linearGradient>

        {/* Tray Interior Basin Gradient */}
        <linearGradient id="tray-basin-grad" x1="30" y1="35" x2="70" y2="70" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#C4B5FD" />
          <stop offset="60%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#541FE2" />
        </linearGradient>
      </defs>

      {/* 1. Perspective Tray Outer Shell */}
      <path
        d="M 36 28
           L 64 28
           C 68 28 72 32 74 38
           L 84 66
           C 86 72 82 78 76 78
           L 24 78
           C 18 78 14 72 16 66
           L 26 38
           C 28 32 32 28 36 28 Z"
        fill="url(#tray-outer-grad)"
        stroke="#2E0884"
        strokeWidth="1.5"
      />

      {/* 2. Tray Interior Empty Basin (Deep) */}
      <path
        d="M 37 32
           L 63 32
           L 72 58
           L 28 58
           Z"
        fill="url(#tray-basin-grad)"
      />

      {/* 3. Front Scoop Cutout Notch (for pulling papers out) */}
      <path
        d="M 18 64
           L 38 64
           C 40 64 42 67 44 70
           L 56 70
           C 58 67 60 64 62 64
           L 82 64
           L 78 76
           L 22 76
           Z"
        fill="#310FB8"
      />

      {/* Front Notch Clean White Lip Rim */}
      <path
        d="M 38 64
           C 40 64 42 67 44 70
           L 56 70
           C 58 67 60 64 62 64"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Top Edge Specular Shine */}
      <path
        d="M 38 30 L 62 30"
        stroke="white"
        strokeWidth="1.8"
        strokeLinecap="round"
        opacity="0.5"
      />
    </svg>
  );
};
