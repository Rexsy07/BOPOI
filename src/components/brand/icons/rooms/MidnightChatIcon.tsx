import React from 'react';

interface IconProps {
  className?: string;
  size?: number | string;
}

/**
 * Midnight Chat / Late Night Icon
 * Vibrant purple crescent moon with gentle craters and three warm golden twinkling stars
 */
export const MidnightChatIcon: React.FC<IconProps> = ({ className = '', size = 32 }) => {
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
        {/* Moon Gradient */}
        <linearGradient id="moon-crescent-grad" x1="20" y1="20" x2="80" y2="85" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#818CF8" />
          <stop offset="35%" stopColor="#6366F1" />
          <stop offset="80%" stopColor="#4338CA" />
          <stop offset="100%" stopColor="#312E81" />
        </linearGradient>

        {/* Golden Star Gradient */}
        <linearGradient id="star-gold-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="50%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
      </defs>

      {/* 1. Main Crescent Moon Body */}
      <path
        d="M 50 18
           C 28 18 16 35 18 56
           C 20 74 36 86 54 86
           C 66 86 76 80 82 72
           C 54 75 36 60 38 42
           C 40 28 50 20 60 18
           C 56 18 53 18 50 18 Z"
        fill="url(#moon-crescent-grad)"
      />

      {/* Moon Outer Rim Specular Highlight */}
      <path
        d="M 50 20
           C 30 20 18 36 20 56
           C 22 72 36 84 52 84"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.45"
      />

      {/* Subtle Moon Crater Accents */}
      <ellipse cx="28" cy="50" rx="3.5" ry="5" fill="#3730A3" opacity="0.4" />
      <ellipse cx="36" cy="68" rx="2.8" ry="4" fill="#3730A3" opacity="0.35" />
      <ellipse cx="33" cy="38" rx="2" ry="3" fill="#3730A3" opacity="0.3" />

      {/* 2. Top-Right Twinkle Star (Large) */}
      <path
        d="M 76 28
           C 76 34 82 34 82 34
           C 82 34 76 34 76 40
           C 76 34 70 34 70 34
           C 70 34 76 34 76 28 Z"
        fill="url(#star-gold-grad)"
      />
      <circle cx="76" cy="34" r="1.5" fill="#FEF08A" />

      {/* 3. Middle-Right Twinkle Star (Small) */}
      <path
        d="M 64 45
           C 64 48 68 48 68 48
           C 68 48 64 48 64 51
           C 64 48 60 48 60 48
           C 60 48 64 48 64 45 Z"
        fill="url(#star-gold-grad)"
      />

      {/* 4. Bottom-Right Twinkle Star (Medium 5-point star) */}
      <polygon
        points="78,56 80,62 86,63 81,67 83,73 78,69 73,73 75,67 70,63 76,62"
        fill="url(#star-gold-grad)"
      />
      <circle cx="78" cy="65" r="1.2" fill="#FEF08A" />
    </svg>
  );
};
