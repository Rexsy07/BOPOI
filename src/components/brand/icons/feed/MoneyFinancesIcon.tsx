import React from 'react';

interface IconProps {
  className?: string;
  size?: number | string;
}

/**
 * Money & Finances Feed Category Icon
 * Plump golden-yellow money coin sack tied with purple ribbon and bold blue dollar sign ($)
 */
export const MoneyFinancesIcon: React.FC<IconProps> = ({ className = '', size = 32 }) => {
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
        {/* Money Bag Gold Gradient */}
        <radialGradient id="money-sack-grad" cx="42%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="40%" stopColor="#FBBF24" />
          <stop offset="80%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#B45309" />
        </radialGradient>

        {/* Top Ruffled Sack Rim */}
        <linearGradient id="sack-rim-grad" x1="30" y1="20" x2="70" y2="35" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>

        {/* Dollar Sign Gradient (Deep Blue/Purple) */}
        <linearGradient id="dollar-blue-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#312E81" />
          <stop offset="60%" stopColor="#1E1B4B" />
          <stop offset="100%" stopColor="#0F172A" />
        </linearGradient>
      </defs>

      {/* 1. Main Plump Money Sack Body */}
      <path
        d="M 44 32
           C 40 32 30 40 22 52
           C 14 64 16 80 26 86
           C 34 91 66 91 74 86
           C 84 80 86 64 78 52
           C 70 40 60 32 56 32
           Z"
        fill="url(#money-sack-grad)"
        stroke="#92400E"
        strokeWidth="1.5"
      />

      {/* Sack Specular Highlight Sheen */}
      <path
        d="M 32 46
           C 26 54 28 72 36 78
           C 30 72 30 56 36 48"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.45"
      />
      <circle cx="36" cy="42" r="2.5" fill="white" opacity="0.5" />

      {/* 2. Tied Ribbon Collar at Sack Neck (Purple) */}
      <rect x="38" y="28" width="24" height="6" rx="2.5" fill="#6C35FF" stroke="#310FB8" strokeWidth="1" />
      {/* Ribbon tails hanging down */}
      <path
        d="M 44 34 C 42 38 43 43 41 46 M 56 34 C 58 38 57 43 59 46"
        stroke="#541FE2"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* 3. Top Gathered Fabric Ruffle */}
      <path
        d="M 36 22
           C 38 29 44 30 50 28
           C 56 30 62 29 64 22
           C 58 20 54 23 50 21
           C 46 23 42 20 36 22 Z"
        fill="url(#sack-rim-grad)"
      />

      {/* 4. Bold Blue/Purple Dollar Sign ($) */}
      <path
        d="M 50 44 L 50 74"
        stroke="url(#dollar-blue-grad)"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      <path
        d="M 58 50
           C 56 46 44 45 44 52
           C 44 59 56 57 56 65
           C 56 71 44 71 42 66"
        stroke="url(#dollar-blue-grad)"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
