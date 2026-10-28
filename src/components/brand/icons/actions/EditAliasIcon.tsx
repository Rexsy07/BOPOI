import React from 'react';

interface IconProps {
  className?: string;
  size?: number | string;
}

/**
 * Edit Alias Action Badge / Editor Icon
 * Chunky angled marker / crayon in royal purple and blue with sharp orange cone tip and white highlights
 */
export const EditAliasIcon: React.FC<IconProps> = ({ className = '', size = 32 }) => {
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
        {/* Barrel Purple-Blue Gradient */}
        <linearGradient id="crayon-barrel-grad" x1="20" y1="20" x2="80" y2="80" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#818CF8" />
          <stop offset="35%" stopColor="#6C35FF" />
          <stop offset="70%" stopColor="#4F1BDD" />
          <stop offset="100%" stopColor="#250578" />
        </linearGradient>

        {/* Crayon Tip Orange Gradient */}
        <linearGradient id="crayon-tip-grad" x1="15" y1="75" x2="35" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FB923C" />
          <stop offset="60%" stopColor="#F97316" />
          <stop offset="100%" stopColor="#EA580C" />
        </linearGradient>

        {/* Back Cap Lavender Gradient */}
        <linearGradient id="crayon-cap-grad" x1="55" y1="10" x2="85" y2="35" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#C4B5FD" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>

      {/* 1. Back End Rounded Cap (Top-Right) */}
      <path
        d="M 64 16
           L 78 30
           L 72 36
           L 58 22
           Z"
        fill="url(#crayon-cap-grad)"
        stroke="#4C1D95"
        strokeWidth="1.2"
      />

      {/* 2. Main Crayon Barrel Shaft */}
      <path
        d="M 58 22
           L 72 36
           L 38 70
           L 24 56
           Z"
        fill="url(#crayon-barrel-grad)"
        stroke="#2E0884"
        strokeWidth="1.5"
      />

      {/* Barrel Highlight Strip (Top facet sheen) */}
      <path
        d="M 54 23 L 68 37 L 34 71 L 28 65"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.5"
      />

      {/* Collar Band Ring */}
      <path
        d="M 23 57
           L 37 71
           L 34 74
           L 20 60
           Z"
        fill="#310FB8"
      />

      {/* 3. Orange Cone Drawing Point / Tip */}
      <polygon
        points="20,60 34,74 15,84"
        fill="url(#crayon-tip-grad)"
        stroke="#C2410C"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />

      {/* Tip Dark Pencil Core Mark */}
      <polygon
        points="17,80 20,83 15,84"
        fill="#9A3412"
      />
    </svg>
  );
};
