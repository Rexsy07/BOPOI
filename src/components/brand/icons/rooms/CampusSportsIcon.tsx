import React from 'react';

interface IconProps {
  className?: string;
  size?: number | string;
}

/**
 * Campus Sports Icon
 * Spherical 3D shaded soccer ball with royal navy/purple pentagonal patches and lavender-white hexagonal panels
 */
export const CampusSportsIcon: React.FC<IconProps> = ({ className = '', size = 32 }) => {
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
        {/* Ball Sphere 3D Gradient */}
        <radialGradient id="soccer-ball-sphere" cx="38%" cy="32%" r="65%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="50%" stopColor="#EDE9FE" />
          <stop offset="85%" stopColor="#C4B5FD" />
          <stop offset="100%" stopColor="#7C3AED" />
        </radialGradient>

        {/* Dark Patch Gradient (Deep Purple/Navy) */}
        <linearGradient id="patch-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2E1065" />
          <stop offset="50%" stopColor="#1E124A" />
          <stop offset="100%" stopColor="#0F0826" />
        </linearGradient>

        <clipPath id="soccer-clip">
          <circle cx="50" cy="50" r="38" />
        </clipPath>
      </defs>

      {/* Sphere Base & Shadow */}
      <circle cx="50" cy="50" r="38" fill="url(#soccer-ball-sphere)" />

      {/* Pentagons & Seams Clipped to Sphere */}
      <g clipPath="url(#soccer-clip)">
        {/* Center Pentagon */}
        <polygon
          points="50,34 65,45 59,62 41,62 35,45"
          fill="url(#patch-grad)"
          stroke="#4C1D95"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />

        {/* Top Patch */}
        <polygon
          points="50,12 40,20 60,20"
          fill="url(#patch-grad)"
          stroke="#4C1D95"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        {/* Seam line to center */}
        <line x1="50" y1="20" x2="50" y2="34" stroke="#7C3AED" strokeWidth="1.8" />

        {/* Top-Right Patch */}
        <polygon
          points="78,30 88,40 76,46 72,36"
          fill="url(#patch-grad)"
          stroke="#4C1D95"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        {/* Seam line to center */}
        <line x1="72" y1="36" x2="65" y2="45" stroke="#7C3AED" strokeWidth="1.8" />

        {/* Bottom-Right Patch */}
        <polygon
          points="78,72 68,76 72,86 84,78"
          fill="url(#patch-grad)"
          stroke="#4C1D95"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        {/* Seam line to center */}
        <line x1="68" y1="76" x2="59" y2="62" stroke="#7C3AED" strokeWidth="1.8" />

        {/* Bottom-Left Patch */}
        <polygon
          points="32,76 22,72 16,78 28,86"
          fill="url(#patch-grad)"
          stroke="#4C1D95"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        {/* Seam line to center */}
        <line x1="32" y1="76" x2="41" y2="62" stroke="#7C3AED" strokeWidth="1.8" />

        {/* Top-Left Patch */}
        <polygon
          points="22,30 28,36 24,46 12,40"
          fill="url(#patch-grad)"
          stroke="#4C1D95"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        {/* Seam line to center */}
        <line x1="28" y1="36" x2="35" y2="45" stroke="#7C3AED" strokeWidth="1.8" />

        {/* Bottom Seam Connecting line */}
        <line x1="41" y1="62" x2="50" y2="76" stroke="#7C3AED" strokeWidth="1.8" />
        <line x1="59" y1="62" x2="50" y2="76" stroke="#7C3AED" strokeWidth="1.8" />
        <line x1="50" y1="76" x2="50" y2="88" stroke="#7C3AED" strokeWidth="1.8" />

        {/* Sphere Top Specular Glaze */}
        <ellipse cx="38" cy="30" rx="14" ry="8" fill="white" opacity="0.35" transform="rotate(-25 38 30)" />
      </g>

      {/* Sphere Outer Rim Glow */}
      <circle cx="50" cy="50" r="38" stroke="#7C3AED" strokeWidth="1.5" opacity="0.6" />
    </svg>
  );
};
