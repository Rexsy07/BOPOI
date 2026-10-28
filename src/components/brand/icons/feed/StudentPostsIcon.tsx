import React from 'react';

interface IconProps {
  className?: string;
  size?: number | string;
}

/**
 * Student Posts Feed Category Icon
 * Purple clipboard holding a clean white notepad sheet with written lines and a golden pencil
 */
export const StudentPostsIcon: React.FC<IconProps> = ({ className = '', size = 32 }) => {
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
        {/* Clipboard Purple Gradient */}
        <linearGradient id="clip-board-grad" x1="15" y1="15" x2="80" y2="85" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#818CF8" />
          <stop offset="35%" stopColor="#6C35FF" />
          <stop offset="75%" stopColor="#4F1BDD" />
          <stop offset="100%" stopColor="#250578" />
        </linearGradient>

        {/* Pencil Golden Gradient */}
        <linearGradient id="pencil-gold-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="50%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
      </defs>

      {/* 1. Clipboard Base Board */}
      <rect
        x="20"
        y="18"
        width="60"
        height="70"
        rx="16"
        fill="url(#clip-board-grad)"
        stroke="#2E0884"
        strokeWidth="1.5"
      />

      {/* Top Edge Highlight */}
      <path
        d="M 30 22 L 70 22"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.45"
      />

      {/* 2. Top Metal Clip Ring */}
      <rect x="36" y="14" width="28" height="10" rx="4" fill="#DDD6FE" stroke="#541FE2" strokeWidth="1.5" />
      <ellipse cx="50" cy="18" rx="4" ry="2" fill="#541FE2" />

      {/* 3. Paper Document Lines */}
      <rect x="28" y="28" width="44" height="52" rx="6" fill="#F8FAFC" />

      {/* Three Horizontal Written Text Lines */}
      <rect x="34" y="38" width="28" height="3" rx="1.5" fill="#818CF8" />
      <rect x="34" y="47" width="32" height="3" rx="1.5" fill="#818CF8" />
      <rect x="34" y="56" width="22" height="3" rx="1.5" fill="#818CF8" />

      {/* 4. Golden Writing Pencil (Angled at Bottom-Right) */}
      <g transform="translate(48, 42) rotate(35)">
        {/* Pencil Eraser */}
        <rect x="8" y="0" width="8" height="6" rx="2" fill="#F472B6" />
        {/* Metal Ferrule Band */}
        <rect x="8" y="6" width="8" height="3" fill="#E2E8F0" />
        {/* Pencil Shaft Body */}
        <rect x="8" y="9" width="8" height="26" fill="url(#pencil-gold-grad)" />
        {/* Sharpened Wood Cone Tip */}
        <polygon points="8,35 16,35 12,43" fill="#FEF3C7" />
        {/* Graphite Lead Point */}
        <polygon points="10.5,40 13.5,40 12,43" fill="#1E124A" />
      </g>
    </svg>
  );
};
