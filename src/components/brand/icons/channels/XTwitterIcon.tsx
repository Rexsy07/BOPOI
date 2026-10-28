import React from 'react';

interface IconProps {
  className?: string;
  size?: number | string;
}

/**
 * X / Twitter Share Channel Icon
 * Crisp, sharp modern X brand icon in deep navy/purple
 */
export const XTwitterIcon: React.FC<IconProps> = ({ className = '', size = 32 }) => {
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
        <linearGradient id="x-logo-grad" x1="20" y1="20" x2="80" y2="80" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#250578" />
          <stop offset="60%" stopColor="#1E124A" />
          <stop offset="100%" stopColor="#0F0826" />
        </linearGradient>
      </defs>

      {/* Main Stylized X Shape */}
      <path
        d="M 28 22
           L 44 46
           L 26 78
           L 36 78
           L 49 54
           L 64 78
           L 78 78
           L 58 48
           L 74 22
           L 64 22
           L 53 41
           L 40 22
           Z"
        fill="url(#x-logo-grad)"
      />

      {/* Left Diagonal Stroke Thick Blade Accent */}
      <polygon
        points="31,23 38,23 72,77 65,77"
        fill="white"
        opacity="0.25"
      />
    </svg>
  );
};
