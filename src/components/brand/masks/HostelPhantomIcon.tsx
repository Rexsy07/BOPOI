import React from 'react';

interface MaskIconProps {
  className?: string;
  size?: number | string;
}

/**
 * Hostel Phantom (Ghost Student) Persona Icon
 * Cute floating lilac-white sheet ghost with expressive dark oval eyes
 */
export const HostelPhantomIcon: React.FC<MaskIconProps> = ({ className = '', size = 32 }) => {
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
        {/* Soft Ambient Ethereal Glow */}
        <radialGradient id="ghost-ambient" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#8A5BFF" stopOpacity="0.22" />
          <stop offset="60%" stopColor="#6732FF" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#5420F5" stopOpacity="0" />
        </radialGradient>

        {/* Ghost Body White-to-Lilac Gradient */}
        <linearGradient id="ghost-body" x1="45" y1="20" x2="55" y2="85" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="35%" stopColor="#F9F6FF" />
          <stop offset="70%" stopColor="#EDE6FF" />
          <stop offset="100%" stopColor="#D5C5FF" />
        </linearGradient>

        {/* Ghost Bottom Tentacle Shade */}
        <linearGradient id="ghost-tail-shade" x1="50" y1="65" x2="50" y2="85" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#D5C5FF" stopOpacity="0" />
          <stop offset="100%" stopColor="#AC91FC" stopOpacity="0.75" />
        </linearGradient>
      </defs>

      {/* Ambient Radial Backlight Glow */}
      <circle cx="50" cy="50" r="42" fill="url(#ghost-ambient)" />

      {/* Main Ghost Body Silhouette */}
      <path
        d="M 50 20
           C 65 20 74 30 75 45
           C 76 53 79 58 84 65
           C 87 69 84 73 78 72
           C 75 70 70 65 67 68
           C 66 74 70 82 66 84
           C 63 86 60 80 57 74
           C 54 68 50 72 48 76
           C 46 81 44 85 40 85
           C 36 85 36 78 35 73
           C 34 68 29 70 27 75
           C 25 79 23 83 18 80
           C 14 77 18 69 22 66
           C 25 63 26 55 26 45
           C 26 30 35 20 50 20 Z"
        fill="url(#ghost-body)"
        stroke="#E2D6FF"
        strokeWidth="1.2"
      />

      {/* Left Extended Little Arm */}
      <path
        d="M 26 53
           C 22 56 16 61 17 66
           C 18 70 23 69 25 64"
        fill="#EDE5FF"
        stroke="#D5C5FF"
        strokeWidth="1"
      />

      {/* Right Extended Little Arm */}
      <path
        d="M 74 53
           C 78 56 84 61 83 66
           C 82 70 77 69 75 64"
        fill="#EDE5FF"
        stroke="#D5C5FF"
        strokeWidth="1"
      />

      {/* Ghost Wavy Skirt Bottom Tentacle Shading */}
      <path
        d="M 23 67
           C 30 72 38 71 45 74
           C 52 70 62 70 68 67
           C 67 76 65 83 62 84
           C 56 75 49 75 44 84
           C 37 76 30 75 25 80 Z"
        fill="url(#ghost-tail-shade)"
      />

      {/* Left Deep Indigo Oval Eye */}
      <ellipse cx="38" cy="45" rx="5" ry="9" fill="#180A45" />
      {/* Left Eye Sparkle Catchlight */}
      <ellipse cx="36.5" cy="41" rx="2" ry="3.5" fill="#FFFFFF" />
      <circle cx="39" cy="48" r="1" fill="#FFFFFF" opacity="0.8" />

      {/* Right Deep Indigo Oval Eye */}
      <ellipse cx="58" cy="45" rx="5" ry="9" fill="#180A45" />
      {/* Right Eye Sparkle Catchlight */}
      <ellipse cx="56.5" cy="41" rx="2" ry="3.5" fill="#FFFFFF" />
      <circle cx="59" cy="48" r="1" fill="#FFFFFF" opacity="0.8" />

      {/* Head Specular Soft Highlight */}
      <path
        d="M 36 24 C 42 22 56 22 62 25"
        stroke="#FFFFFF"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.9"
      />
    </svg>
  );
};
