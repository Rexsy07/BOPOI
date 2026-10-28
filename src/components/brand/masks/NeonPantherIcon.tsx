import React from 'react';

interface MaskIconProps {
  className?: string;
  size?: number | string;
}

/**
 * Neon Panther (Campus Insider) Persona Icon
 * Deep royal purple paw print with 4 toe pads and soft glowing circular backdrop
 */
export const NeonPantherIcon: React.FC<MaskIconProps> = ({ className = '', size = 32 }) => {
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
        {/* Soft Lavender Halo Disc */}
        <radialGradient id="paw-disc" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ECE5FF" stopOpacity="0.9" />
          <stop offset="75%" stopColor="#DFD2FE" stopOpacity="0.65" />
          <stop offset="100%" stopColor="#C4B5FD" stopOpacity="0.2" />
        </radialGradient>

        {/* Paw Pad Deep Royal Purple Gradient */}
        <linearGradient id="paw-purple" x1="30" y1="28" x2="70" y2="80" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#5E26F8" />
          <stop offset="50%" stopColor="#4514DB" />
          <stop offset="100%" stopColor="#2A0A9D" />
        </linearGradient>

        {/* Specular White Highlight */}
        <radialGradient id="paw-glaze" cx="35%" cy="30%" r="35%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
          <stop offset="50%" stopColor="#9C77FF" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#5420F5" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Frosted Circular Disc Backdrop */}
      <circle cx="50" cy="53" r="36" fill="url(#paw-disc)" />

      {/* Main Central Palm Pad */}
      <path
        d="M 50 51
           C 58 51 68 59 66 70
           C 65 77 58 81 50 79
           C 42 81 35 77 34 70
           C 32 59 42 51 50 51 Z"
        fill="url(#paw-purple)"
      />
      {/* Palm Pad Specular Glaze */}
      <ellipse
        cx="46"
        cy="58"
        rx="8"
        ry="5"
        transform="rotate(-25 46 58)"
        fill="url(#paw-glaze)"
      />

      {/* Toe 1 (Far Left) */}
      <ellipse
        cx="29"
        cy="52"
        rx="6.5"
        ry="9.5"
        transform="rotate(-25 29 52)"
        fill="url(#paw-purple)"
      />
      <ellipse
        cx="27.5"
        cy="48"
        rx="2"
        ry="4"
        transform="rotate(-25 27.5 48)"
        fill="#FFFFFF"
        opacity="0.65"
      />

      {/* Toe 2 (Center Left) */}
      <ellipse
        cx="41"
        cy="39"
        rx="7"
        ry="10.5"
        transform="rotate(-10 41 39)"
        fill="url(#paw-purple)"
      />
      <ellipse
        cx="39.5"
        cy="35"
        rx="2.2"
        ry="4.5"
        transform="rotate(-10 39.5 35)"
        fill="#FFFFFF"
        opacity="0.65"
      />

      {/* Toe 3 (Center Right) */}
      <ellipse
        cx="58"
        cy="38"
        rx="7"
        ry="10.5"
        transform="rotate(10 58 38)"
        fill="url(#paw-purple)"
      />
      <ellipse
        cx="56.5"
        cy="34"
        rx="2.2"
        ry="4.5"
        transform="rotate(10 56.5 34)"
        fill="#FFFFFF"
        opacity="0.65"
      />

      {/* Toe 4 (Far Right) */}
      <ellipse
        cx="70"
        cy="51"
        rx="6.5"
        ry="9.5"
        transform="rotate(25 70 51)"
        fill="url(#paw-purple)"
      />
      <ellipse
        cx="68.5"
        cy="47"
        rx="2"
        ry="4"
        transform="rotate(25 68.5 47)"
        fill="#FFFFFF"
        opacity="0.65"
      />
    </svg>
  );
};
