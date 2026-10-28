import React from 'react';

interface IconProps {
  className?: string;
  size?: number | string;
}

/**
 * Coffee & Chill Icon
 * Charming lavender ceramic coffee mug on a saucer with rich espresso and rising steam wisps
 */
export const CoffeeChillIcon: React.FC<IconProps> = ({ className = '', size = 32 }) => {
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
        {/* Saucer Gradient */}
        <linearGradient id="saucer-grad" x1="20" y1="75" x2="80" y2="92" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7C3AED" />
          <stop offset="100%" stopColor="#4C1D95" />
        </linearGradient>

        {/* Mug Gradient */}
        <linearGradient id="mug-grad" x1="25" y1="45" x2="70" y2="80" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#EDE9FE" />
          <stop offset="35%" stopColor="#C4B5FD" />
          <stop offset="80%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#6D28D9" />
        </linearGradient>

        {/* Coffee Surface Gradient */}
        <linearGradient id="coffee-surf-grad" x1="30" y1="46" x2="70" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#78350F" />
          <stop offset="60%" stopColor="#451A03" />
          <stop offset="100%" stopColor="#290E02" />
        </linearGradient>
      </defs>

      {/* 1. Rising Steam Wisps */}
      <path
        d="M 54 32
           C 51 28 51 24 54 21
           C 56 18 56 15 54 12"
        stroke="#8B5CF6"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.75"
      />
      <path
        d="M 43 33
           C 40 30 40 27 42 24
           C 44 21 44 19 42 16"
        stroke="#A78BFA"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.6"
      />
      <circle cx="54" cy="36" r="1.5" fill="#8B5CF6" />

      {/* 2. Saucer Base */}
      <ellipse cx="48" cy="82" rx="32" ry="7" fill="url(#saucer-grad)" />
      <ellipse cx="48" cy="80.5" rx="30" ry="5.5" fill="#6D28D9" />
      <ellipse cx="48" cy="79.5" rx="26" ry="4" fill="#A78BFA" opacity="0.4" />

      {/* 3. Mug Handle (Right) */}
      <path
        d="M 64 53
           C 76 53 82 61 78 72
           C 75 79 67 79 60 76"
        stroke="#8B5CF6"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M 64 53
           C 74 53 80 61 76 72
           C 74 77 67 77 62 75"
        stroke="#C4B5FD"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* 4. Mug Body */}
      <path
        d="M 28 50
           C 28 50 26 73 34 78
           C 39 81 57 81 62 78
           C 70 73 68 50 68 50
           Z"
        fill="url(#mug-grad)"
      />

      {/* Mug Specular Highlight Sheen */}
      <path
        d="M 33 53
           C 31 62 33 72 37 75
           C 35 72 34 62 36 53
           Z"
        fill="white"
        opacity="0.45"
      />

      {/* 5. Coffee Surface Inside Rim */}
      <ellipse cx="48" cy="50" rx="20" ry="7" fill="#C4B5FD" />
      <ellipse cx="48" cy="51" rx="18.5" ry="5.8" fill="url(#coffee-surf-grad)" />

      {/* Coffee Crema Foam Crescent */}
      <path
        d="M 36 50
           C 42 47 54 47 60 50
           C 54 49 42 49 36 50 Z"
        fill="#92400E"
        opacity="0.8"
      />
      <ellipse cx="42" cy="51" rx="2" ry="1" fill="#FEF3C7" opacity="0.4" />
    </svg>
  );
};
