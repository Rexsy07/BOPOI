import React from 'react';

interface MaskIconProps {
  className?: string;
  size?: number | string;
}

/**
 * Secret Admirer (Love & Match) Persona Icon
 * Glossy pink-purple 3D heart pierced diagonally by a golden cupid arrow
 */
export const SecretAdmirerIcon: React.FC<MaskIconProps> = ({ className = '', size = 32 }) => {
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
        {/* Heart Magenta-to-Purple Gradient */}
        <linearGradient id="heart-gradient" x1="28" y1="35" x2="75" y2="82" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FF3399" />
          <stop offset="45%" stopColor="#DF1D98" />
          <stop offset="75%" stopColor="#9C17C2" />
          <stop offset="100%" stopColor="#670BB8" />
        </linearGradient>

        {/* Gold Arrow Gradient */}
        <linearGradient id="arrow-gold" x1="15" y1="85" x2="85" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFD54F" />
          <stop offset="50%" stopColor="#FFCA28" />
          <stop offset="100%" stopColor="#FFA000" />
        </linearGradient>

        {/* Specular Glaze Reflection */}
        <radialGradient id="heart-specular" cx="37%" cy="45%" r="35%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.75" />
          <stop offset="50%" stopColor="#FF80BF" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#FF3399" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Golden Arrow Tail / Fletchings (Entering Top-Right) */}
      <path
        d="M 67 44 L 75 36"
        stroke="#451878"
        strokeWidth="4"
        strokeLinecap="round"
      />
      {/* Top golden feather */}
      <path
        d="M 72 38
           C 74 34 78 28 85 28
           C 87 32 84 37 77 40 Z"
        fill="url(#arrow-gold)"
        stroke="#D98A00"
        strokeWidth="0.8"
      />
      {/* Bottom golden feather */}
      <path
        d="M 76 43
           C 80 44 87 43 89 36
           C 83 33 78 35 76 43 Z"
        fill="url(#arrow-gold)"
        stroke="#D98A00"
        strokeWidth="0.8"
      />

      {/* Main 3D Glossy Heart Body */}
      <path
        d="M 52 84
           C 30 70 24 55 27 43
           C 29 34 38 33 46 38
           C 49 40 51 43 52 44
           C 53 43 55 40 58 38
           C 66 33 75 34 77 43
           C 80 55 74 70 52 84 Z"
        fill="url(#heart-gradient)"
      />

      {/* Heart Upper Left Specular Lobe Highlight */}
      <ellipse
        cx="38"
        cy="44"
        rx="9"
        ry="7"
        transform="rotate(-20 38 44)"
        fill="url(#heart-specular)"
      />
      <ellipse
        cx="62"
        cy="45"
        rx="8"
        ry="6"
        transform="rotate(20 62 45)"
        fill="url(#heart-specular)"
        opacity="0.6"
      />

      {/* Arrow Shaft (Exiting Bottom-Left) */}
      <path
        d="M 37 63 L 28 73"
        stroke="#3B126D"
        strokeWidth="4.5"
        strokeLinecap="round"
      />

      {/* Golden Arrowhead (Exiting Point) */}
      <path
        d="M 28 73
           L 18 73
           C 17 76 20 81 23 83
           L 32 79
           C 30 76 29 74 28 73 Z"
        fill="url(#arrow-gold)"
        stroke="#D98A00"
        strokeWidth="0.8"
      />

      {/* Arrow Shaft Entry Point Shadow */}
      <ellipse cx="66" cy="45" rx="2.5" ry="4" transform="rotate(-40 66 45)" fill="#350652" opacity="0.6" />
      {/* Arrow Shaft Exit Point Shadow */}
      <ellipse cx="38" cy="64" rx="2.5" ry="4" transform="rotate(-40 38 64)" fill="#350652" opacity="0.6" />
    </svg>
  );
};
