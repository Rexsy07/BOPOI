import React from 'react';

interface IconProps {
  className?: string;
  size?: number | string;
}

/**
 * Fashion & Style Feed Category Icon
 * Sleek boutique clothes hanger in rich purple with swivel hook and specular highlights
 */
export const FashionStyleIcon: React.FC<IconProps> = ({ className = '', size = 32 }) => {
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
        {/* Hanger Purple Gradient */}
        <linearGradient id="hanger-purple-grad" x1="15" y1="20" x2="85" y2="80" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#A78BFA" />
          <stop offset="35%" stopColor="#8B5CF6" />
          <stop offset="75%" stopColor="#7C3AED" />
          <stop offset="100%" stopColor="#4C1D95" />
        </linearGradient>
      </defs>

      {/* 1. Top Swivel Hook */}
      <path
        d="M 50 42
           L 50 36
           C 50 28 54 22 60 25
           C 66 28 64 35 58 35"
        stroke="url(#hanger-purple-grad)"
        strokeWidth="6"
        strokeLinecap="round"
      />
      {/* Hook Tip Accent */}
      <circle cx="58" cy="35" r="3" fill="#A78BFA" />

      {/* 2. Main Triangular Hanger Body */}
      <path
        d="M 50 42
           L 84 68
           C 87 70 86 74 82 74
           L 18 74
           C 14 74 13 70 16 68
           Z"
        stroke="url(#hanger-purple-grad)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Left Shoulder Specular Highlight */}
      <path
        d="M 44 48 L 24 64"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.55"
      />

      {/* Center Hook Base Swivel Collar */}
      <circle cx="50" cy="42" r="4" fill="#6D28D9" />
      <circle cx="50" cy="42" r="2" fill="#DDD6FE" />
    </svg>
  );
};
