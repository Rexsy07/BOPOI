import React from 'react';

interface IconProps {
  className?: string;
  size?: number | string;
}

/**
 * Get Your Link Icon
 * Two interconnected heavy chain links in vivid purple with specular highlights and depth
 */
export const GetYourLinkIcon: React.FC<IconProps> = ({ className = '', size = 32 }) => {
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
        {/* Link Gradient */}
        <linearGradient id="chain-link-grad" x1="15" y1="20" x2="85" y2="85" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#818CF8" />
          <stop offset="30%" stopColor="#6C35FF" />
          <stop offset="70%" stopColor="#4F1BDD" />
          <stop offset="100%" stopColor="#250578" />
        </linearGradient>
      </defs>

      {/* 1. Bottom-Left Link */}
      <path
        d="M 45 45
           L 30 60
           C 22 68 22 80 30 88
           C 38 96 50 96 58 88
           L 73 73
           C 81 65 81 53 73 45
           C 65 37 53 37 45 45 Z"
        stroke="url(#chain-link-grad)"
        strokeWidth="11"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 2. Top-Right Interlocking Link */}
      <path
        d="M 55 55
           L 70 40
           C 78 32 78 20 70 12
           C 62 4 50 4 42 12
           L 27 27
           C 19 35 19 47 27 55
           C 35 63 47 63 55 55 Z"
        stroke="url(#chain-link-grad)"
        strokeWidth="11"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Top Specular Shine Accents */}
      <path
        d="M 46 15 C 50 11 58 11 64 16 C 68 20 68 26 65 31"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.55"
      />
      <path
        d="M 34 85 C 30 81 30 73 35 68"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.5"
      />
    </svg>
  );
};
