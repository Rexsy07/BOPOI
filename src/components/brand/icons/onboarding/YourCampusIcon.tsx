import React from 'react';

interface IconProps {
  className?: string;
  size?: number | string;
}

/**
 * Your Campus Icon
 * Classical university library/hall in royal purple with pediment, four columns, and arched doorway
 */
export const YourCampusIcon: React.FC<IconProps> = ({ className = '', size = 32 }) => {
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
        {/* Hall Purple Gradient */}
        <linearGradient id="hall-purple-grad" x1="15" y1="15" x2="85" y2="85" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#818CF8" />
          <stop offset="35%" stopColor="#6C35FF" />
          <stop offset="75%" stopColor="#4F1BDD" />
          <stop offset="100%" stopColor="#250578" />
        </linearGradient>

        {/* Shadow Entablature Gradient */}
        <linearGradient id="hall-dark-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2E0884" />
          <stop offset="100%" stopColor="#1B0452" />
        </linearGradient>
      </defs>

      {/* 1. Triangular Roof Pediment */}
      <polygon
        points="50,15 88,34 12,34"
        fill="url(#hall-purple-grad)"
      />
      {/* Roof Edge Trim */}
      <path
        d="M 12 34 L 50 15 L 88 34"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.45"
      />

      {/* Pediment Architrave / Entablature Frieze */}
      <rect x="14" y="34" width="72" height="7" rx="2" fill="url(#hall-dark-grad)" />

      {/* 2. Four Classical Columns */}
      {/* Column 1 (Far Left) */}
      <rect x="18" y="41" width="9" height="34" rx="2" fill="url(#hall-purple-grad)" />
      {/* Column 2 (Left Center) */}
      <rect x="34" y="41" width="9" height="34" rx="2" fill="url(#hall-purple-grad)" />
      {/* Column 3 (Right Center) */}
      <rect x="57" y="41" width="9" height="34" rx="2" fill="url(#hall-purple-grad)" />
      {/* Column 4 (Far Right) */}
      <rect x="73" y="41" width="9" height="34" rx="2" fill="url(#hall-purple-grad)" />

      {/* Column Vertical Highlights */}
      <line x1="21" y1="43" x2="21" y2="73" stroke="white" strokeWidth="1.2" opacity="0.4" />
      <line x1="37" y1="43" x2="37" y2="73" stroke="white" strokeWidth="1.2" opacity="0.4" />
      <line x1="60" y1="43" x2="60" y2="73" stroke="white" strokeWidth="1.2" opacity="0.4" />
      <line x1="76" y1="43" x2="76" y2="73" stroke="white" strokeWidth="1.2" opacity="0.4" />

      {/* 3. Central Grand Arched Gateway Doorway */}
      <path
        d="M 44 75
           L 44 54
           C 44 48 46 44 50 44
           C 54 44 56 48 56 54
           L 56 75
           Z"
        fill="white"
        opacity="0.9"
      />

      {/* 4. Tiered Foundation Base */}
      {/* Upper Step */}
      <rect x="12" y="75" width="76" height="5" rx="1.5" fill="url(#hall-dark-grad)" />
      {/* Bottom Step */}
      <rect x="8" y="80" width="84" height="6" rx="2.5" fill="url(#hall-purple-grad)" />
      <path
        d="M 9 81 L 91 81"
        stroke="white"
        strokeWidth="1.2"
        opacity="0.3"
      />
    </svg>
  );
};
