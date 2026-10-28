import React from 'react';

interface IconProps {
  className?: string;
  size?: number | string;
}

/**
 * Gaming & Entertainment Icon
 * Ergonomic console gamepad in royal purple with D-pad, analog thumbsticks, and colored buttons
 */
export const GamingIcon: React.FC<IconProps> = ({ className = '', size = 32 }) => {
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
        {/* Gamepad Body Gradient */}
        <linearGradient id="gamepad-grad" x1="20" y1="20" x2="80" y2="85" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6C35FF" />
          <stop offset="40%" stopColor="#4F1BDD" />
          <stop offset="100%" stopColor="#250578" />
        </linearGradient>

        {/* Thumbstick Gradient */}
        <linearGradient id="stick-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="50%" stopColor="#DDD6FE" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>

      {/* Main Ergonomic Controller Body */}
      <path
        d="M 32 28
           C 40 28 44 34 50 34
           C 56 34 60 28 68 28
           C 82 28 88 40 88 56
           C 88 72 82 84 74 84
           C 66 84 62 70 58 64
           C 54 58 46 58 42 64
           C 38 70 34 84 26 84
           C 18 84 12 72 12 56
           C 12 40 18 28 32 28
           Z"
        fill="url(#gamepad-grad)"
      />

      {/* Controller Top Glossy Sheen */}
      <path
        d="M 34 31
           C 42 31 46 36 50 36
           C 54 36 58 31 66 31
           C 78 31 82 39 84 48
           C 76 38 64 36 50 38
           C 36 36 24 38 16 48
           C 18 39 22 31 34 31 Z"
        fill="white"
        opacity="0.25"
      />

      {/* D-Pad (Left side) */}
      <path
        d="M 28 42 L 34 42 L 34 47 L 39 47 L 39 53 L 34 53 L 34 58 L 28 58 L 28 53 L 23 53 L 23 47 L 28 47 Z"
        fill="#1E124A"
      />
      <circle cx="31" cy="50" r="1.5" fill="#382180" />

      {/* Dual Thumbsticks (Bottom Center) */}
      {/* Left Stick */}
      <circle cx="41" cy="62" r="6" fill="#1E124A" />
      <circle cx="41" cy="61.5" r="5" fill="url(#stick-grad)" />

      {/* Right Stick */}
      <circle cx="59" cy="62" r="6" fill="#1E124A" />
      <circle cx="59" cy="61.5" r="5" fill="url(#stick-grad)" />

      {/* Connecting Bridge Line */}
      <path d="M 46 62 L 54 62" stroke="#1E124A" strokeWidth="2.5" strokeLinecap="round" />

      {/* 4 Action Buttons (Right side - Diamond layout) */}
      {/* Top button (Yellow) */}
      <circle cx="67" cy="38" r="3.5" fill="#FBBF24" />
      {/* Left button (Mint Green) */}
      <circle cx="62" cy="45" r="3.5" fill="#34D399" />
      {/* Right button (Red/Pink) */}
      <circle cx="74" cy="44" r="3.5" fill="#F87171" />
      {/* Bottom button (Soft Cream/Blue) */}
      <circle cx="68" cy="51" r="3.5" fill="#60A5FA" />

      {/* Center Select / Menu dashes */}
      <line x1="43" y1="46" x2="47" y2="45" stroke="#7C3AED" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="53" y1="45" x2="57" y2="46" stroke="#7C3AED" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
};
