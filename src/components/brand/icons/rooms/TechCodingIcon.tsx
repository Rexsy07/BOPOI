import React from 'react';

interface IconProps {
  className?: string;
  size?: number | string;
}

/**
 * Tech & Coding Icon
 * Open modern laptop in purple/indigo displaying terminal screen with crisp white code brackets </>
 */
export const TechCodingIcon: React.FC<IconProps> = ({ className = '', size = 32 }) => {
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
        {/* Laptop Screen Frame Gradient */}
        <linearGradient id="laptop-frame-grad" x1="20" y1="20" x2="80" y2="70" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6C35FF" />
          <stop offset="100%" stopColor="#3F14B8" />
        </linearGradient>

        {/* Laptop Screen Display Gradient (Deep IDE navy) */}
        <linearGradient id="laptop-screen-grad" x1="25" y1="28" x2="75" y2="65" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1E124A" />
          <stop offset="100%" stopColor="#120A30" />
        </linearGradient>

        {/* Laptop Base Gradient */}
        <linearGradient id="laptop-base-grad" x1="10" y1="72" x2="90" y2="85" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#541FE2" />
          <stop offset="50%" stopColor="#3B10A8" />
          <stop offset="100%" stopColor="#250578" />
        </linearGradient>
      </defs>

      {/* 1. Laptop Screen Lid Back & Frame */}
      <rect x="20" y="24" width="60" height="46" rx="6" fill="url(#laptop-frame-grad)" />

      {/* Lid Top Specular Reflection */}
      <path
        d="M 23 27 L 77 27"
        stroke="white"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.4"
      />

      {/* Web Camera Dot */}
      <circle cx="50" cy="27" r="1.2" fill="#8B5CF6" />

      {/* 2. Screen Display (Inner Bezel) */}
      <rect x="24" y="30" width="52" height="36" rx="3" fill="url(#laptop-screen-grad)" />

      {/* Screen Gloss Glaze Diagonal */}
      <path
        d="M 24 30 L 52 30 L 32 66 L 24 66 Z"
        fill="white"
        opacity="0.05"
      />

      {/* 3. Code Symbol </> in Screen Center */}
      {/* Left angle bracket < */}
      <path
        d="M 44 43 L 37 48 L 44 53"
        stroke="white"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Forward slash / */}
      <path
        d="M 53 42 L 47 54"
        stroke="#A78BFA"
        strokeWidth="3.2"
        strokeLinecap="round"
      />

      {/* Right angle bracket > */}
      <path
        d="M 56 43 L 63 48 L 56 53"
        stroke="white"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 4. Laptop Keyboard Base (Perspective Tapered) */}
      <path
        d="M 14 74
           C 14 72 16 71 19 71
           L 81 71
           C 84 71 86 72 86 74
           L 90 82
           C 90 85 88 86 85 86
           L 15 86
           C 12 86 10 85 10 82
           Z"
        fill="url(#laptop-base-grad)"
      />

      {/* Base Front Notch / Trackpad Indent */}
      <rect x="42" y="75" width="16" height="3.5" rx="1.5" fill="#1E124A" />
      <path
        d="M 12 82 L 88 82"
        stroke="#6C35FF"
        strokeWidth="0.8"
        opacity="0.4"
      />
    </svg>
  );
};
