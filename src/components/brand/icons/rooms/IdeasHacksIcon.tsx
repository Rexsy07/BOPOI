import React from 'react';

interface IconProps {
  className?: string;
  size?: number | string;
}

/**
 * Ideas & Life Hacks Icon
 * Glowing warm incandescent light bulb with purple base and radiating golden sparks
 */
export const IdeasHacksIcon: React.FC<IconProps> = ({ className = '', size = 32 }) => {
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
        {/* Bulb Glow Gradient */}
        <radialGradient id="bulb-glow" cx="42%" cy="40%" r="55%">
          <stop offset="0%" stopColor="#FEF9C3" />
          <stop offset="45%" stopColor="#FDE047" />
          <stop offset="80%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#D97706" />
        </radialGradient>

        {/* Base Screw Gradient (Royal Purple) */}
        <linearGradient id="bulb-base-grad" x1="40" y1="72" x2="60" y2="88" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6C35FF" />
          <stop offset="50%" stopColor="#541FE2" />
          <stop offset="100%" stopColor="#250578" />
        </linearGradient>
      </defs>

      {/* 1. Radiating Sparks / Light Rays */}
      {/* Top Ray */}
      <line x1="50" y1="12" x2="50" y2="19" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />
      {/* Top-Right Ray */}
      <line x1="74" y1="22" x2="69" y2="27" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />
      {/* Right Ray */}
      <line x1="84" y1="46" x2="77" y2="46" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />
      {/* Top-Left Ray */}
      <line x1="26" y1="22" x2="31" y2="27" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />
      {/* Left Ray */}
      <line x1="16" y1="46" x2="23" y2="46" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />

      {/* 2. Main Glass Bulb Body */}
      <path
        d="M 50 24
           C 36 24 26 34 26 48
           C 26 58 32 64 38 72
           L 62 72
           C 68 64 74 58 74 48
           C 74 34 64 24 50 24 Z"
        fill="url(#bulb-glow)"
      />

      {/* Glass Top-Left Specular Sheen */}
      <path
        d="M 33 34
           C 30 40 30 48 33 54"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.6"
      />
      <circle cx="40" cy="30" r="2.5" fill="white" opacity="0.5" />

      {/* Filament Core Glow inside */}
      <path
        d="M 44 64 L 44 54 C 44 48 47 46 50 46 C 53 46 56 48 56 54 L 56 64"
        stroke="#B45309"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="50" cy="46" r="3" fill="#FEF08A" />

      {/* 3. Screw Threaded Base Collar (Purple) */}
      <rect x="40" y="72" width="20" height="5" rx="2" fill="url(#bulb-base-grad)" />
      <rect x="41" y="78" width="18" height="5" rx="2" fill="url(#bulb-base-grad)" />
      <rect x="43" y="84" width="14" height="4" rx="2" fill="url(#bulb-base-grad)" />

      {/* Bottom Contact Tip */}
      <ellipse cx="50" cy="89" rx="4" ry="2" fill="#1E124A" />
    </svg>
  );
};
