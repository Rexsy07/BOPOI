import React from 'react';

interface IconProps {
  className?: string;
  size?: number | string;
}

/**
 * Sparkle / Polish Action Badge Icon
 * Radiant 4-pointed golden sparkle star with micro glints for polish and highlight effects
 */
export const SparklePolishIcon: React.FC<IconProps> = ({ className = '', size = 32 }) => {
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
        {/* Star Sparkle Gold Gradient */}
        <radialGradient id="sparkle-gold-grad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FEF9C3" />
          <stop offset="25%" stopColor="#FEF08A" />
          <stop offset="60%" stopColor="#FBBF24" />
          <stop offset="90%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#D97706" />
        </radialGradient>
      </defs>

      {/* 1. Main 4-Point Radiant Center Star */}
      <path
        d="M 50 16
           C 50 36 54 44 76 50
           C 54 56 50 64 50 84
           C 50 64 46 56 24 50
           C 46 44 50 36 50 16 Z"
        fill="url(#sparkle-gold-grad)"
      />

      {/* Center White Hot Core */}
      <circle cx="50" cy="50" r="4.5" fill="white" />

      {/* 2. Micro Sparkle Star (Top-Left) */}
      <path
        d="M 28 28
           C 28 32 29 33 33 34
           C 29 35 28 36 28 40
           C 28 36 27 35 23 34
           C 27 33 28 32 28 28 Z"
        fill="#FBBF24"
      />

      {/* 3. Micro Sparkle Star (Top-Right) */}
      <path
        d="M 72 26
           C 72 29 73 30 76 31
           C 73 32 72 33 72 36
           C 72 33 71 32 68 31
           C 71 30 72 29 72 26 Z"
        fill="#FDE047"
      />

      {/* 4. Micro Sparkle Star (Bottom-Left) */}
      <path
        d="M 27 68
           C 27 71 28 72 31 73
           C 28 74 27 75 27 78
           C 27 75 26 74 23 73
           C 26 72 27 71 27 68 Z"
        fill="#FBBF24"
      />

      {/* 5. Micro Sparkle Star (Bottom-Right) */}
      <path
        d="M 71 70
           C 71 73 72 74 75 75
           C 72 76 71 77 71 80
           C 71 77 70 76 67 75
           C 70 74 71 73 71 70 Z"
        fill="#F59E0B"
      />
    </svg>
  );
};
