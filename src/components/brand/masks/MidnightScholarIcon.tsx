import React from 'react';

interface MaskIconProps {
  className?: string;
  size?: number | string;
}

/**
 * Midnight Scholar (Deep Thinker) Persona Icon
 * 3D purple anatomical brain with cerebral cortex folds and glossy specular highlights
 */
export const MidnightScholarIcon: React.FC<MaskIconProps> = ({ className = '', size = 32 }) => {
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
        {/* Brain Purple Gradient */}
        <linearGradient id="brain-base" x1="20" y1="20" x2="85" y2="85" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7B42FF" />
          <stop offset="45%" stopColor="#5B24E8" />
          <stop offset="100%" stopColor="#370D9F" />
        </linearGradient>

        {/* Lobe Highlight Glaze */}
        <linearGradient id="lobe-glaze" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#5420F5" stopOpacity="0" />
        </linearGradient>

        {/* Brain Crease Shadow */}
        <linearGradient id="brain-shadow" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2A087C" />
          <stop offset="100%" stopColor="#1B0452" />
        </linearGradient>
      </defs>

      {/* Brain Stem (Base) */}
      <path
        d="M 54 75
           C 54 80 57 84 60 86
           C 62 86 63 84 62 80
           C 62 76 60 72 58 70 Z"
        fill="#390FA3"
      />

      {/* Main Multi-Lobe Outer Contour */}
      <path
        d="M 54 22
           C 64 22 71 27 75 33
           C 82 34 86 42 86 49
           C 87 56 82 63 76 66
           C 76 72 70 76 62 77
           C 57 78 52 75 50 73
           C 47 75 42 77 36 76
           C 27 75 20 68 18 59
           C 16 51 20 42 27 38
           C 27 30 35 24 43 23
           C 46 22 50 22 54 22 Z"
        fill="url(#brain-base)"
      />

      {/* Top Frontal Lobe Crest */}
      <path
        d="M 52 23
           C 61 23 68 28 68 34
           C 64 36 58 35 52 35
           C 46 35 40 36 36 34
           C 36 28 43 23 52 23 Z"
        fill="#8A57FF"
      />
      {/* Frontal Lobe Specular Rim */}
      <path
        d="M 42 25 C 47 24 57 24 62 26"
        stroke="#FFFFFF"
        strokeWidth="1.8"
        strokeLinecap="round"
        opacity="0.8"
      />

      {/* Right Parietal & Occipital Folds */}
      <path
        d="M 68 35
           C 75 36 83 42 82 48
           C 78 51 72 49 67 48
           C 62 47 62 39 68 35 Z"
        fill="#6E35F4"
      />
      <path
        d="M 72 38 C 77 40 80 43 80 46"
        stroke="#FFFFFF"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.6"
      />

      <path
        d="M 68 49
           C 75 51 84 55 81 64
           C 74 67 69 64 64 61
           C 63 54 64 51 68 49 Z"
        fill="#551EE0"
      />

      {/* Left Frontal & Temporal Folds */}
      <path
        d="M 36 35
           C 28 37 20 43 21 51
           C 27 54 33 51 38 49
           C 42 47 41 38 36 35 Z"
        fill="#6A32F0"
      />
      <path
        d="M 32 38 C 26 41 23 45 23 49"
        stroke="#FFFFFF"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.6"
      />

      <path
        d="M 36 50
           C 28 53 20 58 22 66
           C 29 72 36 69 41 65
           C 43 57 41 53 36 50 Z"
        fill="#521CDD"
      />

      {/* Central Sulcus Internal Folds & Creases */}
      <path
        d="M 52 35
           C 51 43 56 47 52 54
           C 48 61 54 66 50 73"
        stroke="url(#brain-shadow)"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M 40 48
           C 46 51 49 56 46 62"
        stroke="url(#brain-shadow)"
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M 63 47
           C 58 52 57 58 61 63"
        stroke="url(#brain-shadow)"
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
      />

      {/* Specular White Highlights on Crease Ridges */}
      <path
        d="M 48 39 C 51 41 53 43 52 47"
        stroke="#FFFFFF"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.5"
      />
      <path
        d="M 46 66 C 48 68 50 70 48 72"
        stroke="#FFFFFF"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.4"
      />
    </svg>
  );
};
