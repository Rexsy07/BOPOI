import React from 'react';

interface IconProps {
  className?: string;
  size?: number | string;
}

/**
 * Receive Messages Icon
 * Soft lavender/purple rounded speech bubble with a vibrant magenta heart cutout inside
 */
export const ReceiveMessagesIcon: React.FC<IconProps> = ({ className = '', size = 32 }) => {
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
        {/* Bubble Gradient */}
        <linearGradient id="msg-bubble-grad" x1="20" y1="20" x2="80" y2="80" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#DDD6FE" />
          <stop offset="40%" stopColor="#C4B5FD" />
          <stop offset="100%" stopColor="#A78BFA" />
        </linearGradient>

        {/* Heart Gradient */}
        <linearGradient id="msg-heart-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F472B6" />
          <stop offset="40%" stopColor="#EC4899" />
          <stop offset="100%" stopColor="#BE185D" />
        </linearGradient>
      </defs>

      {/* 1. Main Rounded Speech Bubble */}
      <rect
        x="18"
        y="18"
        width="64"
        height="64"
        rx="22"
        fill="url(#msg-bubble-grad)"
      />

      {/* Bubble Highlight Sheen */}
      <path
        d="M 28 24 L 72 24"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.6"
      />

      {/* 2. Vibrant Magenta Heart in Center */}
      <path
        d="M 50 42
           C 46 36 38 35 34 40
           C 28 46 30 56 36 63
           C 42 70 50 74 50 74
           C 50 74 58 70 64 63
           C 70 56 72 46 66 40
           C 62 35 54 36 50 42 Z"
        fill="url(#msg-heart-grad)"
        stroke="#831843"
        strokeWidth="1.5"
      />

      {/* Inner Heart Cutout / Core */}
      <path
        d="M 50 48
           C 48 44 43 43 41 46
           C 37 50 39 56 42 60
           C 46 64 50 67 50 67
           C 50 67 54 64 58 60
           C 61 56 63 50 59 46
           C 57 43 52 44 50 48 Z"
        fill="white"
      />
    </svg>
  );
};
