import React from 'react';

interface IconProps {
  className?: string;
  size?: number | string;
}

/**
 * Search Empty Action Badge / Empty State Icon
 * Chunky royal purple magnifying glass tilted at 45 degrees with glass reflection
 */
export const SearchEmptyIcon: React.FC<IconProps> = ({ className = '', size = 32 }) => {
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
        {/* Glass Rim Gradient */}
        <linearGradient id="glass-rim-grad" x1="20" y1="20" x2="70" y2="70" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#818CF8" />
          <stop offset="30%" stopColor="#6C35FF" />
          <stop offset="70%" stopColor="#4F1BDD" />
          <stop offset="100%" stopColor="#250578" />
        </linearGradient>

        {/* Lens Inner Glass Gradient */}
        <radialGradient id="glass-lens-grad" cx="42%" cy="40%" r="50%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.4" />
          <stop offset="60%" stopColor="#DDD6FE" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#A78BFA" stopOpacity="0.05" />
        </radialGradient>
      </defs>

      {/* 1. Chunky Diagonal Handle (Bottom-Right) */}
      <path
        d="M 58 58
           L 78 78
           C 82 82 82 88 78 92
           C 74 96 68 96 64 92
           L 44 72"
        stroke="url(#glass-rim-grad)"
        strokeWidth="15"
        strokeLinecap="round"
      />

      {/* 2. Lens Center Basin */}
      <circle cx="44" cy="44" r="24" fill="url(#glass-lens-grad)" />

      {/* 3. Chunky Circular Glass Rim */}
      <circle
        cx="44"
        cy="44"
        r="24"
        stroke="url(#glass-rim-grad)"
        strokeWidth="11"
      />

      {/* 4. Lens Glass Specular Crescent Reflection */}
      <path
        d="M 32 30
           C 38 24 48 24 54 28"
        stroke="white"
        strokeWidth="4"
        strokeLinecap="round"
        opacity="0.75"
      />
      <circle cx="34" cy="36" r="2.5" fill="white" opacity="0.6" />
    </svg>
  );
};
