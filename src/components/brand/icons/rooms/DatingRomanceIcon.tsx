import React from 'react';

interface IconProps {
  className?: string;
  size?: number | string;
}

/**
 * Dating & Romance Icon
 * Two loving intertwined hearts: foreground lavender-purple heart alongside a vibrant hot pink/magenta heart
 */
export const DatingRomanceIcon: React.FC<IconProps> = ({ className = '', size = 32 }) => {
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
        {/* Pink/Magenta Back Heart Gradient */}
        <linearGradient id="heart-pink-grad" x1="45" y1="20" x2="85" y2="75" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F472B6" />
          <stop offset="35%" stopColor="#EC4899" />
          <stop offset="85%" stopColor="#BE185D" />
          <stop offset="100%" stopColor="#831843" />
        </linearGradient>

        {/* Purple/Indigo Front Heart Gradient */}
        <linearGradient id="heart-purple-grad" x1="15" y1="35" x2="65" y2="85" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#818CF8" />
          <stop offset="30%" stopColor="#6366F1" />
          <stop offset="80%" stopColor="#4F46E5" />
          <stop offset="100%" stopColor="#312E81" />
        </linearGradient>
      </defs>

      {/* 1. Background Pink Heart (Top-Right) */}
      <path
        d="M 64 24
           C 56 24 50 30 47 37
           C 44 30 38 24 30 24
           C 18 24 16 38 22 50
           C 28 62 47 78 47 78
           C 47 78 66 62 72 50
           C 78 38 76 24 64 24 Z"
        fill="url(#heart-pink-grad)"
        transform="translate(14, -4) scale(0.9)"
      />

      {/* Pink Heart Highlight Arc */}
      <path
        d="M 66 22
           C 71 22 75 27 75 34"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.5"
      />

      {/* 2. Foreground Purple Heart (Bottom-Left) */}
      <path
        d="M 40 34
           C 32 34 26 40 23 47
           C 20 40 14 34 6 34
           C -6 34 -8 48 -2 60
           C 4 72 23 88 23 88
           C 23 88 42 72 48 60
           C 54 48 52 34 40 34 Z"
        fill="url(#heart-purple-grad)"
        transform="translate(18, 0) scale(0.95)"
      />

      {/* Purple Heart White Highlight Sheen */}
      <path
        d="M 28 40
           C 33 40 38 44 38 52
           C 36 46 32 43 28 43"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.6"
      />
      <circle cx="30" cy="42" r="1.8" fill="white" opacity="0.6" />
    </svg>
  );
};
