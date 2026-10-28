import React from 'react';

interface IconProps {
  className?: string;
  size?: number | string;
}

/**
 * Campus Life & Academics Icon
 * 3D Graduation mortarboard cap in royal purple with draped golden-yellow tassel
 */
export const CampusLifeIcon: React.FC<IconProps> = ({ className = '', size = 32 }) => {
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
        <linearGradient id="mortar-cap-grad" x1="15" y1="20" x2="85" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6C35FF" />
          <stop offset="50%" stopColor="#541FE2" />
          <stop offset="100%" stopColor="#300B9D" />
        </linearGradient>
        <linearGradient id="mortar-skull-grad" x1="25" y1="45" x2="75" y2="85" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#541FE2" />
          <stop offset="70%" stopColor="#380CA8" />
          <stop offset="100%" stopColor="#250578" />
        </linearGradient>
        <linearGradient id="tassel-gold-grad" x1="75" y1="30" x2="88" y2="85" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="40%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
      </defs>

      {/* Skull Cap Body Underneath Diamond */}
      <path
        d="M 28 45
           C 28 45 28 72 50 78
           C 72 72 72 45 72 45
           L 70 54
           C 70 68 50 73 50 73
           C 50 73 30 68 30 54
           Z"
        fill="url(#mortar-skull-grad)"
      />
      {/* Front Skull Rim Highlight */}
      <path
        d="M 30 52
           C 36 64 50 68 50 68
           C 50 68 64 64 70 52
           C 66 61 50 65 50 65
           C 50 65 34 61 30 52 Z"
        fill="#7C3AED"
        opacity="0.6"
      />

      {/* Main Diamond Mortarboard Plate */}
      <path
        d="M 50 16
           L 88 38
           L 50 56
           L 12 38
           Z"
        fill="url(#mortar-cap-grad)"
      />
      {/* 3D Thickness Edge of Diamond */}
      <path
        d="M 12 38
           L 50 56
           L 88 38
           L 88 41
           L 50 60
           L 12 41
           Z"
        fill="#260786"
      />

      {/* Diamond Specular Top Highlight */}
      <path
        d="M 50 19
           L 82 38
           L 50 53
           L 18 38
           Z"
        fill="white"
        opacity="0.12"
      />

      {/* Center Button */}
      <ellipse cx="50" cy="37" rx="3.5" ry="2.5" fill="#FDE047" />
      <ellipse cx="50" cy="36.5" rx="2" ry="1.2" fill="#FEF08A" />

      {/* Tassel Cord Swivel */}
      <path
        d="M 50 37
           C 60 38 72 35 78 44
           C 82 50 82 56 82 62"
        stroke="url(#tassel-gold-grad)"
        strokeWidth="3.5"
        strokeLinecap="round"
      />

      {/* Tassel Band / Ferrule */}
      <rect x="79" y="58" width="6" height="4" rx="1.5" fill="#B45309" />

      {/* Tassel Fringe Brush */}
      <path
        d="M 79 62
           C 78 70 78 80 80 84
           C 82 85 85 85 86 82
           C 88 77 87 69 85 62
           Z"
        fill="url(#tassel-gold-grad)"
      />
      {/* Tassel Texture Strands */}
      <path
        d="M 81 63 L 81 83 M 83 63 L 83.5 83 M 85 63 L 85 81"
        stroke="#FEF08A"
        strokeWidth="0.8"
        strokeLinecap="round"
        opacity="0.8"
      />
    </svg>
  );
};
