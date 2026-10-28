import React from 'react';

interface IconProps {
  className?: string;
  size?: number | string;
}

/**
 * SMS / Text Share Channel Icon
 * Plump rounded royal purple speech bubble with three crisp white message lines
 */
export const SmsChannelIcon: React.FC<IconProps> = ({ className = '', size = 32 }) => {
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
        {/* Bubble Purple Gradient */}
        <linearGradient id="sms-bubble-grad" x1="20" y1="20" x2="80" y2="85" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#818CF8" />
          <stop offset="30%" stopColor="#6C35FF" />
          <stop offset="70%" stopColor="#4F1BDD" />
          <stop offset="100%" stopColor="#250578" />
        </linearGradient>
      </defs>

      {/* Main Speech Bubble Body with Tail on Bottom-Left */}
      <path
        d="M 28 20
           L 72 20
           C 82 20 88 26 88 36
           L 88 62
           C 88 72 82 78 72 78
           L 44 78
           L 30 88
           C 27 90 24 88 24 84
           L 24 78
           L 28 78
           C 18 78 12 72 12 62
           L 12 36
           C 12 26 18 20 28 20 Z"
        fill="url(#sms-bubble-grad)"
        stroke="#2E0884"
        strokeWidth="1.5"
      />

      {/* Bubble Top Gloss Shine */}
      <path
        d="M 26 25 L 74 25"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.45"
      />
      <circle cx="24" cy="30" r="2" fill="white" opacity="0.6" />

      {/* Three Horizontal White Message Text Lines */}
      {/* Line 1 (Full width) */}
      <rect x="30" y="38" width="40" height="4" rx="2" fill="white" />
      {/* Line 2 (Full width) */}
      <rect x="30" y="48" width="40" height="4" rx="2" fill="white" />
      {/* Line 3 (Short width) */}
      <rect x="30" y="58" width="24" height="4" rx="2" fill="white" />
    </svg>
  );
};
