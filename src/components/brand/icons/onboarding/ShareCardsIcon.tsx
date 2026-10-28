import React from 'react';

interface IconProps {
  className?: string;
  size?: number | string;
}

/**
 * Share Cards Icon
 * Rounded squircle profile card badge in royal purple with a clean student avatar silhouette
 */
export const ShareCardsIcon: React.FC<IconProps> = ({ className = '', size = 32 }) => {
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
        {/* Card Squircle Gradient */}
        <linearGradient id="card-squircle-grad" x1="15" y1="15" x2="85" y2="85" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#818CF8" />
          <stop offset="30%" stopColor="#6C35FF" />
          <stop offset="70%" stopColor="#4F1BDD" />
          <stop offset="100%" stopColor="#250578" />
        </linearGradient>
      </defs>

      {/* Main Squircle Card */}
      <rect
        x="16"
        y="16"
        width="68"
        height="68"
        rx="24"
        fill="url(#card-squircle-grad)"
        stroke="#2E0884"
        strokeWidth="1.5"
      />

      {/* Card Top Specular Edge */}
      <path
        d="M 26 22 L 74 22"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.5"
      />

      {/* White Student Silhouette */}
      {/* Head */}
      <circle cx="50" cy="40" r="11" fill="white" />
      {/* Shoulder Arch */}
      <path
        d="M 28 69
           C 28 58 37 54 44 54
           L 56 54
           C 63 54 72 58 72 69
           C 72 71 70 73 68 73
           L 32 73
           C 30 73 28 71 28 69 Z"
        fill="white"
      />

      {/* Subtle Corner Sparkle */}
      <circle cx="28" cy="28" r="2" fill="white" opacity="0.6" />
    </svg>
  );
};
