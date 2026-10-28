import React from 'react';

interface IconProps {
  className?: string;
  size?: number | string;
}

/**
 * Inbox Shortcut Action Badge / Navigation Icon
 * 3D perspective royal purple inbox desk tray with a bold white arrow pointing downward into the tray
 */
export const InboxShortcutIcon: React.FC<IconProps> = ({ className = '', size = 32 }) => {
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
        <linearGradient id="shortcut-tray-grad" x1="20" y1="30" x2="80" y2="85" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#818CF8" />
          <stop offset="30%" stopColor="#6C35FF" />
          <stop offset="70%" stopColor="#4F1BDD" />
          <stop offset="100%" stopColor="#250578" />
        </linearGradient>

        {/* Tray Basin Deep Gradient */}
        <linearGradient id="shortcut-basin-grad" x1="30" y1="35" x2="70" y2="65" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#C4B5FD" />
          <stop offset="100%" stopColor="#541FE2" />
        </linearGradient>
      </defs>

      {/* 1. Tray Outer Perspective Body */}
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
        fill="url(#shortcut-tray-grad)"
        stroke="#2E0884"
        strokeWidth="1.5"
      />

      {/* 2. Tray Basin Interior */}
      <path
        d="M 37 32
           L 63 32
           L 72 56
           L 28 56
           Z"
        fill="url(#shortcut-basin-grad)"
      />

      {/* 3. Front Scoop Lip */}
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

      {/* White Front Rim Border */}
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

      {/* 4. Bold White Downward Incoming Arrow */}
      {/* Arrow Shaft */}
      <rect x="46" y="34" width="8" height="15" rx="1.5" fill="white" />
      {/* Arrow Head Triangle */}
      <polygon
        points="37,47 63,47 50,60"
        fill="white"
      />
    </svg>
  );
};
