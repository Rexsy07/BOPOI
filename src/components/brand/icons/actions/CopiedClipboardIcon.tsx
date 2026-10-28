import React from 'react';

interface IconProps {
  className?: string;
  size?: number | string;
}

/**
 * Copied to Clipboard Action Badge / Toast Icon
 * Seafoam / mint green clipboard with top clip and bold clean white checkmark
 */
export const CopiedClipboardIcon: React.FC<IconProps> = ({ className = '', size = 32 }) => {
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
        {/* Mint Board Gradient */}
        <linearGradient id="mint-board-grad" x1="20" y1="20" x2="80" y2="85" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6EE7B7" />
          <stop offset="35%" stopColor="#34D399" />
          <stop offset="75%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>

        {/* Clip Gradient */}
        <linearGradient id="mint-clip-grad" x1="35" y1="12" x2="65" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#67E8F9" />
          <stop offset="50%" stopColor="#06B6D4" />
          <stop offset="100%" stopColor="#0E7490" />
        </linearGradient>
      </defs>

      {/* 1. Main Mint Clipboard Board */}
      <rect
        x="20"
        y="18"
        width="60"
        height="70"
        rx="18"
        fill="url(#mint-board-grad)"
        stroke="#065F46"
        strokeWidth="1.5"
      />

      {/* Board Top Edge Specular Shine */}
      <path
        d="M 30 22 L 70 22"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.45"
      />

      {/* 2. Top Metal Binder Clip */}
      <path
        d="M 36 18
           C 36 14 42 12 50 12
           C 58 12 64 14 64 18
           C 66 18 68 20 68 24
           L 32 24
           C 32 20 34 18 36 18 Z"
        fill="url(#mint-clip-grad)"
        stroke="#155E75"
        strokeWidth="1.2"
      />
      <circle cx="50" cy="18" r="2.5" fill="white" opacity="0.6" />

      {/* 3. Bold Crisp White Checkmark (Center) */}
      <path
        d="M 36 54
           L 46 65
           L 66 42"
        stroke="white"
        strokeWidth="7.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
