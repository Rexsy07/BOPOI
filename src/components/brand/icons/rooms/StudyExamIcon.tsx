import React from 'react';

interface IconProps {
  className?: string;
  size?: number | string;
}

/**
 * Study & Exam Survival Icon
 * Stack of three colorful hardcover books (golden amber bottom, vibrant pink middle, deep navy top)
 */
export const StudyExamIcon: React.FC<IconProps> = ({ className = '', size = 32 }) => {
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
        {/* Top Book - Indigo/Navy */}
        <linearGradient id="book-top-spine" x1="15" y1="20" x2="35" y2="45" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4338CA" />
          <stop offset="100%" stopColor="#221B66" />
        </linearGradient>
        <linearGradient id="book-top-cover" x1="25" y1="20" x2="85" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4F46E5" />
          <stop offset="100%" stopColor="#312E81" />
        </linearGradient>

        {/* Middle Book - Pink/Magenta */}
        <linearGradient id="book-mid-spine" x1="12" y1="45" x2="32" y2="68" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F472B6" />
          <stop offset="100%" stopColor="#BE185D" />
        </linearGradient>
        <linearGradient id="book-mid-cover" x1="20" y1="45" x2="88" y2="65" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#EC4899" />
          <stop offset="100%" stopColor="#9D174D" />
        </linearGradient>

        {/* Bottom Book - Gold/Orange */}
        <linearGradient id="book-bot-spine" x1="10" y1="65" x2="30" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#B45309" />
        </linearGradient>
        <linearGradient id="book-bot-cover" x1="18" y1="65" x2="90" y2="88" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#92400E" />
        </linearGradient>
      </defs>

      {/* 1. BOTTOM BOOK (Yellow/Orange) */}
      {/* Pages block */}
      <path
        d="M 22 71 L 88 66 L 85 80 L 22 84 Z"
        fill="#FEF3C7"
      />
      <path
        d="M 26 73 L 86 68 M 26 76 L 85 71 M 26 79 L 85 74"
        stroke="#E2E8F0"
        strokeWidth="0.8"
      />
      {/* Cover Bottom Rim */}
      <path
        d="M 12 79 C 12 76 16 75 22 75 L 88 71 C 91 71 92 73 92 75 L 90 85 C 90 87 88 88 85 88 L 18 89 C 14 89 12 87 12 84 Z"
        fill="url(#book-bot-cover)"
      />
      {/* Spine Left */}
      <path
        d="M 12 72 C 12 69 16 68 20 68 L 22 86 C 18 86 12 85 12 80 Z"
        fill="url(#book-bot-spine)"
      />
      {/* Spine Rib Lines */}
      <line x1="13" y1="74" x2="21" y2="74" stroke="#FDE68A" strokeWidth="1" strokeLinecap="round" />
      <line x1="13" y1="80" x2="21" y2="80" stroke="#FDE68A" strokeWidth="1" strokeLinecap="round" />

      {/* 2. MIDDLE BOOK (Pink/Magenta) */}
      {/* Pages block */}
      <path
        d="M 20 48 L 86 43 L 83 58 L 20 62 Z"
        fill="#FDF2F8"
      />
      <path
        d="M 24 50 L 84 45 M 24 53 L 83 48 M 24 56 L 83 51"
        stroke="#FBCFE8"
        strokeWidth="0.8"
      />
      {/* Middle Cover */}
      <path
        d="M 10 57 C 10 54 14 53 20 53 L 86 48 C 89 48 90 50 90 52 L 88 62 C 88 64 86 65 83 65 L 16 66 C 12 66 10 64 10 61 Z"
        fill="url(#book-mid-cover)"
      />
      {/* Middle Spine Left */}
      <path
        d="M 10 50 C 10 47 14 46 18 46 L 20 64 C 16 64 10 63 10 58 Z"
        fill="url(#book-mid-spine)"
      />
      <line x1="11" y1="52" x2="19" y2="52" stroke="#FCE7F3" strokeWidth="1" strokeLinecap="round" />
      <line x1="11" y1="58" x2="19" y2="58" stroke="#FCE7F3" strokeWidth="1" strokeLinecap="round" />

      {/* 3. TOP BOOK (Royal Indigo) */}
      {/* Pages block */}
      <path
        d="M 24 26 L 85 21 L 82 36 L 24 40 Z"
        fill="#F1F5F9"
      />
      <path
        d="M 27 28 L 83 23 M 27 31 L 82 26 M 27 34 L 82 29"
        stroke="#CBD5E1"
        strokeWidth="0.8"
      />
      {/* Top Book Cover Top Lid */}
      <path
        d="M 15 22 C 15 19 19 18 25 18 L 87 14 C 90 14 92 16 91 18 L 86 28 C 85 30 83 31 80 31 L 22 34 C 18 34 15 32 15 29 Z"
        fill="url(#book-top-cover)"
      />
      {/* Top Cover Specular Glaze */}
      <path
        d="M 17 21 C 18 19 22 18 28 18 L 85 15 L 81 22 L 24 25 Z"
        fill="white"
        opacity="0.18"
      />
      {/* Top Book Spine Left */}
      <path
        d="M 15 26 C 15 22 19 21 24 21 L 26 39 C 20 39 15 38 15 33 Z"
        fill="url(#book-top-spine)"
      />
      <line x1="16" y1="28" x2="24" y2="28" stroke="#A5B4FC" strokeWidth="1" strokeLinecap="round" />
      <line x1="16" y1="34" x2="24" y2="34" stroke="#A5B4FC" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
};
