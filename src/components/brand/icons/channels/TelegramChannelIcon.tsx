import React from 'react';

interface IconProps {
  className?: string;
  size?: number | string;
}

/**
 * Telegram Share Channel Icon
 * Iconic paper airplane folded aircraft in royal purple with soft depth
 */
export const TelegramChannelIcon: React.FC<IconProps> = ({ className = '', size = 32 }) => {
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
        {/* Main Wing Gradient */}
        <linearGradient id="telegram-wing-grad" x1="20" y1="20" x2="85" y2="70" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#818CF8" />
          <stop offset="30%" stopColor="#6C35FF" />
          <stop offset="70%" stopColor="#4F1BDD" />
          <stop offset="100%" stopColor="#310FB8" />
        </linearGradient>

        {/* Underside Fold Shading */}
        <linearGradient id="telegram-under-grad" x1="30" y1="50" x2="70" y2="70" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#310FB8" />
          <stop offset="100%" stopColor="#1B0452" />
        </linearGradient>
      </defs>

      {/* 1. Main Wing Body */}
      <polygon
        points="82,24 24,50 48,60 72,36 42,64 52,78 82,24"
        fill="url(#telegram-wing-grad)"
      />

      {/* 2. Underside Crease Fold (Rudder flap) */}
      <polygon
        points="48,60 42,76 52,78 48,60"
        fill="url(#telegram-under-grad)"
      />

      {/* 3. Wing Top Fold White Highlights */}
      <path
        d="M 28 50 L 80 25 L 50 60"
        stroke="white"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.45"
      />
    </svg>
  );
};
