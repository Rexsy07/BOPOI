import React from 'react';

interface MaskIconProps {
  className?: string;
  size?: number | string;
}

/**
 * Masked Student (Anonymous Founder) Persona Icon
 * Glossy royal purple comedy theater mask with smiling expression
 */
export const MaskedStudentIcon: React.FC<MaskIconProps> = ({ className = '', size = 32 }) => {
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
        {/* Mask Purple Gradient */}
        <linearGradient id="drama-mask-grad" x1="20" y1="20" x2="85" y2="85" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6C35FF" />
          <stop offset="40%" stopColor="#541FE2" />
          <stop offset="100%" stopColor="#300B9D" />
        </linearGradient>

        {/* Inside Rim Wall Shade */}
        <linearGradient id="drama-mask-inner" x1="15" y1="22" x2="75" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3E11AC" />
          <stop offset="100%" stopColor="#250678" />
        </linearGradient>

        {/* Specular Glaze */}
        <linearGradient id="drama-mask-shine" x1="18" y1="25" x2="40" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#5420F5" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Mask Top Interior Rim (Perspective Depth) */}
      <path
        d="M 18 24
           C 28 26 48 27 68 18
           C 74 15 78 16 75 22
           C 65 30 35 32 18 24 Z"
        fill="url(#drama-mask-inner)"
      />

      {/* Main Mask Face Shell */}
      <path
        d="M 18 24
           C 14 36 17 56 25 72
           C 34 85 50 89 62 85
           C 72 78 78 64 77 46
           C 76 28 73 17 68 18
           C 48 27 28 26 18 24 Z"
        fill="url(#drama-mask-grad)"
      />

      {/* Left Cheek Specular Highlight */}
      <path
        d="M 20 28
           C 18 38 20 54 26 67
           C 22 55 21 40 23 30
           C 25 28 23 27 20 28 Z"
        fill="url(#drama-mask-shine)"
      />

      {/* Left Almond Eye Hole */}
      <path
        d="M 30 48
           C 33 44 42 43 47 48
           C 44 54 35 55 30 48 Z"
        fill="#FFFFFF"
      />
      {/* Eye depth rim */}
      <path
        d="M 30 48 C 33 44 42 43 47 48"
        stroke="#27097C"
        strokeWidth="1.2"
        fill="none"
      />

      {/* Right Almond Eye Hole */}
      <path
        d="M 57 44
           C 60 40 68 40 71 45
           C 68 51 60 51 57 44 Z"
        fill="#FFFFFF"
      />
      {/* Eye depth rim */}
      <path
        d="M 57 44 C 60 40 68 40 71 45"
        stroke="#27097C"
        strokeWidth="1.2"
        fill="none"
      />

      {/* Subtle Nose Bridge */}
      <path
        d="M 51 54 C 52 59 55 62 57 63"
        stroke="#4014B5"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
      />

      {/* Big Cheerful Smiling Mouth Opening */}
      <path
        d="M 39 66
           C 48 68 58 66 68 60
           C 62 76 47 78 39 66 Z"
        fill="#FFFFFF"
      />

      {/* Top Lip Shadow */}
      <path
        d="M 39 66 C 48 68 58 66 68 60"
        stroke="#28097F"
        strokeWidth="1.5"
        fill="none"
      />
    </svg>
  );
};
