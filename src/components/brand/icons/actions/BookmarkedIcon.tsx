import React from 'react';

interface IconProps {
  className?: string;
  size?: number | string;
}

/**
 * Bookmarked Action Badge Icon
 * Vibrant pink/magenta bookmark ribbon with notched bottom and specular shine
 */
export const BookmarkedIcon: React.FC<IconProps> = ({ className = '', size = 32 }) => {
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
        {/* Bookmark Pink Gradient */}
        <linearGradient id="bookmark-pink-grad" x1="25" y1="15" x2="75" y2="85" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FB7185" />
          <stop offset="35%" stopColor="#F43F5E" />
          <stop offset="75%" stopColor="#E11D48" />
          <stop offset="100%" stopColor="#9F1239" />
        </linearGradient>
      </defs>

      {/* Main Ribbon Body with Notched Bottom */}
      <path
        d="M 32 18
           L 68 18
           C 74 18 78 22 78 28
           L 78 82
           C 78 86 74 88 71 85
           L 50 67
           L 29 85
           C 26 88 22 86 22 82
           L 22 28
           C 22 22 26 18 32 18 Z"
        fill="url(#bookmark-pink-grad)"
        stroke="#881337"
        strokeWidth="1.5"
      />

      {/* Top Left Specular Highlight */}
      <path
        d="M 32 23
           C 28 23 26 26 26 30
           L 26 44
           C 30 36 34 30 42 26
           L 32 23 Z"
        fill="white"
        opacity="0.6"
      />

      {/* Right Edge Highlight Strip */}
      <line x1="72" y1="26" x2="72" y2="72" stroke="white" strokeWidth="1.8" strokeLinecap="round" opacity="0.3" />
    </svg>
  );
};
