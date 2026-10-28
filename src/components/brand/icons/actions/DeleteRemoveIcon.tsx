import React from 'react';

interface IconProps {
  className?: string;
  size?: number | string;
}

/**
 * Delete / Remove Action Badge Icon
 * Cute pink recycling dustbin / trash can with domed lid, handle, and vertical ribs
 */
export const DeleteRemoveIcon: React.FC<IconProps> = ({ className = '', size = 32 }) => {
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
        {/* Pink Bin Body Gradient */}
        <linearGradient id="bin-pink-grad" x1="25" y1="25" x2="75" y2="85" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FB7185" />
          <stop offset="35%" stopColor="#F43F5E" />
          <stop offset="75%" stopColor="#E11D48" />
          <stop offset="100%" stopColor="#9F1239" />
        </linearGradient>

        {/* Lid Gradient */}
        <linearGradient id="bin-lid-grad" x1="20" y1="18" x2="80" y2="35" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FDA4AF" />
          <stop offset="50%" stopColor="#F43F5E" />
          <stop offset="100%" stopColor="#BE123C" />
        </linearGradient>
      </defs>

      {/* 1. Top Lid Handle Knob */}
      <rect x="42" y="14" width="16" height="8" rx="4" fill="url(#bin-lid-grad)" stroke="#881337" strokeWidth="1.2" />

      {/* 2. Domed Bin Lid */}
      <rect x="20" y="22" width="60" height="10" rx="5" fill="url(#bin-lid-grad)" stroke="#881337" strokeWidth="1.2" />
      {/* Lid Highlight */}
      <path
        d="M 26 25 L 74 25"
        stroke="white"
        strokeWidth="1.8"
        strokeLinecap="round"
        opacity="0.5"
      />

      {/* 3. Tapered Bin Body */}
      <path
        d="M 26 32
           L 74 32
           L 68 80
           C 68 84 64 87 60 87
           L 40 87
           C 36 87 32 84 32 80
           Z"
        fill="url(#bin-pink-grad)"
        stroke="#881337"
        strokeWidth="1.5"
      />

      {/* Bin Body Top Specular Sheen */}
      <path
        d="M 28 36 L 72 36"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.3"
      />

      {/* 4. Three Vertical Recessed Rib Slots */}
      {/* Left Rib */}
      <rect x="36" y="44" width="6" height="28" rx="3" fill="white" />
      {/* Center Rib */}
      <rect x="47" y="44" width="6" height="28" rx="3" fill="white" />
      {/* Right Rib */}
      <rect x="58" y="44" width="6" height="28" rx="3" fill="white" />
    </svg>
  );
};
