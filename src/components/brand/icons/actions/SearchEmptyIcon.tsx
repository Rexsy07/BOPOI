import React from 'react';

interface IconProps {
  className?: string;
  size?: number | string;
}

/**
 * Clean Empty State / Search Empty Badge Icon
 * Crisp layered card with subtle radar/compass lines and a clean status badge
 */
export const SearchEmptyIcon: React.FC<IconProps> = ({ className = '', size = 32 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 select-none ${className}`}
    >
      <defs>
        <linearGradient id="empty-card-grad" x1="10" y1="10" x2="54" y2="54" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7C3AED" />
          <stop offset="55%" stopColor="#5420F5" />
          <stop offset="100%" stopColor="#3B0CA3" />
        </linearGradient>
        <linearGradient id="empty-badge-grad" x1="36" y1="36" x2="54" y2="54" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
      </defs>

      {/* Soft tilted background card */}
      <rect
        x="14"
        y="10"
        width="36"
        height="40"
        rx="11"
        transform="rotate(-6 14 10)"
        fill="#C4B5FD"
        opacity="0.45"
      />

      {/* Main purple card */}
      <rect
        x="11"
        y="12"
        width="38"
        height="40"
        rx="12"
        fill="url(#empty-card-grad)"
      />

      {/* Clean content placeholder lines */}
      <rect x="19" y="22" width="14" height="3.5" rx="1.75" fill="#FFFFFF" />
      <rect x="19" y="29.5" width="22" height="3.5" rx="1.75" fill="#DDD6FE" opacity="0.85" />
      <rect x="19" y="37" width="16" height="3.5" rx="1.75" fill="#DDD6FE" opacity="0.6" />

      {/* Crisp Golden Sparkle / Empty Indicator Badge */}
      <circle
        cx="46"
        cy="45"
        r="9.5"
        fill="url(#empty-badge-grad)"
        stroke="#FFFFFF"
        strokeWidth="2"
      />
      <path
        d="M46 40.5V45.5"
        stroke="#78350F"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="46" cy="48.8" r="1.3" fill="#78350F" />
    </svg>
  );
};
