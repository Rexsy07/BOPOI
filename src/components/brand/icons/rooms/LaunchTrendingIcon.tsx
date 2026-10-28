import React from 'react';

interface IconProps {
  className?: string;
  size?: number | string;
}

/**
 * Launch & Trending Icon
 * Retro-futuristic rocket ship blasting upward at 45 degrees with golden porthole and blazing exhaust flame
 */
export const LaunchTrendingIcon: React.FC<IconProps> = ({ className = '', size = 32 }) => {
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
        {/* Fuselage Purple Gradient */}
        <linearGradient id="rocket-fuselage" x1="20" y1="20" x2="80" y2="80" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#818CF8" />
          <stop offset="30%" stopColor="#6C35FF" />
          <stop offset="70%" stopColor="#4F1BDD" />
          <stop offset="100%" stopColor="#250578" />
        </linearGradient>

        {/* Fins Gradient */}
        <linearGradient id="rocket-fins" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4F1BDD" />
          <stop offset="100%" stopColor="#1E0B64" />
        </linearGradient>

        {/* Flame Exhaust Gradient */}
        <linearGradient id="rocket-flame" x1="25" y1="65" x2="15" y2="92" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="40%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#DC2626" />
        </linearGradient>

        {/* Porthole Golden Rim */}
        <linearGradient id="rocket-porthole" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="50%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#B45309" />
        </linearGradient>
      </defs>

      {/* 1. Blazing Exhaust Flame (Bottom-Left) */}
      <path
        d="M 33 67
           C 26 70 14 74 15 88
           C 16 93 22 93 25 87
           C 28 82 27 82 32 84
           C 36 86 38 82 37 77
           C 37 73 40 71 43 69
           Z"
        fill="url(#rocket-flame)"
      />
      {/* Inner Hot Core Flame */}
      <path
        d="M 33 67
           C 28 72 20 76 22 84
           C 25 83 26 80 29 80
           C 33 80 34 76 35 73
           C 35 70 38 69 40 68 Z"
        fill="#FEF9C3"
      />

      {/* 2. Left Fin */}
      <path
        d="M 33 54
           L 18 64
           C 17 71 22 75 30 72
           L 38 67
           Z"
        fill="url(#rocket-fins)"
      />

      {/* 3. Right Fin */}
      <path
        d="M 54 33
           L 64 18
           C 71 17 75 22 72 30
           L 67 38
           Z"
        fill="url(#rocket-fins)"
      />

      {/* 4. Main Fuselage Body */}
      <path
        d="M 85 15
           C 65 17 48 30 40 45
           C 36 53 34 62 36 66
           C 40 68 49 66 57 62
           C 72 54 85 37 87 17
           C 87 15 86 15 85 15 Z"
        fill="url(#rocket-fuselage)"
      />

      {/* Fuselage Specular Top Sheen */}
      <path
        d="M 83 18
           C 66 22 53 34 46 47
           C 43 53 41 60 41 63"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.45"
      />

      {/* Center Ridge Spine */}
      <path
        d="M 84 17
           L 54 62"
        stroke="#2E0884"
        strokeWidth="1.5"
        opacity="0.3"
      />

      {/* 5. Circular Golden Porthole Window */}
      <circle cx="60" cy="40" r="9" fill="url(#rocket-porthole)" />
      <circle cx="60" cy="40" r="6.5" fill="#1E124A" />
      <ellipse cx="58.5" cy="38.5" rx="3" ry="1.8" fill="white" opacity="0.6" transform="rotate(-35 58.5 38.5)" />

      {/* Tiny Stars Whizzing By */}
      <circle cx="16" cy="30" r="1.5" fill="#FBBF24" />
      <circle cx="78" cy="80" r="1.5" fill="#FBBF24" />
      <circle cx="86" cy="62" r="1.2" fill="#818CF8" />
    </svg>
  );
};
