import React from 'react';

interface MaskIconProps {
  className?: string;
  size?: number | string;
}

/**
 * Campus Rebel (Hot Takes) Persona Icon
 * Dynamic 3D lightning bolt with golden yellow face and extruded purple bevels
 */
export const CampusRebelIcon: React.FC<MaskIconProps> = ({ className = '', size = 32 }) => {
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
        {/* Golden Front Lightning Face */}
        <linearGradient id="bolt-gold-face" x1="45" y1="18" x2="55" y2="80" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFF176" />
          <stop offset="40%" stopColor="#FFD54F" />
          <stop offset="100%" stopColor="#FFB300" />
        </linearGradient>

        {/* 3D Purple Extruded Side Bevel */}
        <linearGradient id="bolt-purple-depth" x1="40" y1="35" x2="70" y2="85" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6C2EF8" />
          <stop offset="50%" stopColor="#4A11DE" />
          <stop offset="100%" stopColor="#2D069B" />
        </linearGradient>

        {/* Bottom Red-Magenta Edge Rim */}
        <linearGradient id="bolt-magenta-rim" x1="28" y1="60" x2="45" y2="85" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#E91E63" />
          <stop offset="100%" stopColor="#9C27B0" />
        </linearGradient>
      </defs>

      {/* 3D Extruded Depth Underlay (Purple & Magenta Bevel) */}
      <path
        d="M 64 16
           L 38 48
           L 44 48
           L 44 58
           L 39 86
           L 45 84
           L 70 38
           L 50 48
           L 64 16 Z"
        fill="url(#bolt-purple-depth)"
      />

      {/* Bottom Corner Magenta Accent Bevel */}
      <path
        d="M 28 62
           L 42 57
           L 39 86
           L 28 62 Z"
        fill="url(#bolt-magenta-rim)"
      />

      {/* Main Golden Front Lightning Bolt */}
      <path
        d="M 62 16
           C 62 16 42 27 36 48
           L 48 48
           L 28 62
           L 40 85
           L 60 48
           L 50 48
           L 62 16 Z"
        fill="url(#bolt-gold-face)"
        stroke="#FFE082"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />

      {/* Upper Bevel Facet Highlight */}
      <path
        d="M 62 16 L 36 48 L 44 48"
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.8"
      />

      {/* Lower Bevel Corner Catchlight */}
      <path
        d="M 28 62 L 40 85"
        stroke="#FFF9C4"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
};
