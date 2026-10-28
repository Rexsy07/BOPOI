import React from 'react';

interface IconProps {
  className?: string;
  size?: number | string;
}

/**
 * Share On Campus Icon
 * Modern purple smartphone with punch-hole camera and radiating concentric broadcast waves from a central plus sign
 */
export const ShareOnCampusIcon: React.FC<IconProps> = ({ className = '', size = 32 }) => {
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
        {/* Phone Case Gradient */}
        <linearGradient id="phone-case-grad" x1="20" y1="10" x2="80" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#818CF8" />
          <stop offset="30%" stopColor="#6C35FF" />
          <stop offset="70%" stopColor="#4F1BDD" />
          <stop offset="100%" stopColor="#310FB8" />
        </linearGradient>
      </defs>

      {/* Side Volume / Power Buttons */}
      <rect x="22" y="24" width="3" height="8" rx="1.5" fill="#310FB8" />
      <rect x="22" y="36" width="3" height="12" rx="1.5" fill="#310FB8" />
      <rect x="75" y="32" width="3" height="14" rx="1.5" fill="#310FB8" />

      {/* Main Phone Body */}
      <rect
        x="24"
        y="10"
        width="52"
        height="80"
        rx="14"
        fill="url(#phone-case-grad)"
        stroke="#2E0884"
        strokeWidth="1.5"
      />

      {/* Top Phone Gloss Edge */}
      <path
        d="M 36 12 L 64 12"
        stroke="white"
        strokeWidth="1.8"
        strokeLinecap="round"
        opacity="0.5"
      />

      {/* Punch Hole Selfie Camera */}
      <circle cx="50" cy="18" r="3" fill="#EDE9FE" />
      <circle cx="50" cy="18" r="1.5" fill="#310FB8" />

      {/* Concentric Broadcast Waves */}
      {/* Outer Wave Arc */}
      <path
        d="M 38 42 C 45 36 55 36 62 42"
        stroke="#DDD6FE"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <path
        d="M 38 64 C 45 70 55 70 62 64"
        stroke="#DDD6FE"
        strokeWidth="3.2"
        strokeLinecap="round"
      />

      {/* Inner Wave Arc */}
      <path
        d="M 43 47 C 47 43 53 43 57 47"
        stroke="#EDE9FE"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <path
        d="M 43 59 C 47 63 53 63 57 59"
        stroke="#EDE9FE"
        strokeWidth="3.2"
        strokeLinecap="round"
      />

      {/* Central Plus Symbol (+) */}
      <path
        d="M 50 49 L 50 57 M 46 53 L 54 53"
        stroke="white"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
};
