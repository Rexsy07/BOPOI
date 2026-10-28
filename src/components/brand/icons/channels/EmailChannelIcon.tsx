import React from 'react';

interface IconProps {
  className?: string;
  size?: number | string;
}

/**
 * Email Share Channel Icon
 * Rounded royal purple mail envelope with lighter lavender flap and folded letter crease lines
 */
export const EmailChannelIcon: React.FC<IconProps> = ({ className = '', size = 32 }) => {
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
        {/* Envelope Base Gradient */}
        <linearGradient id="email-base-grad" x1="20" y1="25" x2="80" y2="75" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#818CF8" />
          <stop offset="35%" stopColor="#6C35FF" />
          <stop offset="75%" stopColor="#4F1BDD" />
          <stop offset="100%" stopColor="#250578" />
        </linearGradient>

        {/* Flap Gradient */}
        <linearGradient id="email-flap-grad" x1="30" y1="30" x2="70" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#A78BFA" />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>
      </defs>

      {/* 1. Envelope Rectangular Body */}
      <rect
        x="16"
        y="26"
        width="68"
        height="50"
        rx="14"
        fill="url(#email-base-grad)"
        stroke="#2E0884"
        strokeWidth="1.5"
      />

      {/* Top Edge Specular Shine */}
      <path
        d="M 26 29 L 74 29"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.45"
      />

      {/* 2. Fold Lines / Triangular Flap */}
      <path
        d="M 18 32
           L 46 54
           C 48 56 52 56 54 54
           L 82 32"
        stroke="white"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Lower Corner Fold Lines */}
      <path
        d="M 18 72 L 38 52"
        stroke="#A78BFA"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.5"
      />
      <path
        d="M 82 72 L 62 52"
        stroke="#A78BFA"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.5"
      />
    </svg>
  );
};
