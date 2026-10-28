import React from 'react';

interface MaskIconProps {
  className?: string;
  size?: number | string;
}

/**
 * Phantom Chatter (Incognito) Persona Icon
 * Sleek purple-indigo wayfarer sunglasses with tinted reflective lenses
 */
export const PhantomChatterIcon: React.FC<MaskIconProps> = ({ className = '', size = 32 }) => {
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
        {/* Frame Purple Gradient */}
        <linearGradient id="glasses-frame" x1="10" y1="35" x2="95" y2="65" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4A1CE0" />
          <stop offset="50%" stopColor="#3C14BA" />
          <stop offset="100%" stopColor="#2A0B91" />
        </linearGradient>

        {/* Lens Dark Purple Gradient */}
        <linearGradient id="glasses-lens-l" x1="25" y1="42" x2="52" y2="72" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2A1463" />
          <stop offset="60%" stopColor="#1B0A44" />
          <stop offset="100%" stopColor="#10052B" />
        </linearGradient>
        <linearGradient id="glasses-lens-r" x1="65" y1="36" x2="90" y2="65" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2A1463" />
          <stop offset="60%" stopColor="#1B0A44" />
          <stop offset="100%" stopColor="#10052B" />
        </linearGradient>

        {/* Specular Glare Gradient */}
        <linearGradient id="lens-glare" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.45" />
          <stop offset="50%" stopColor="#9E7BFF" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#5420F5" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Main Sunglasses Frame with bridge and temple pieces */}
      <path
        d="M 12 49
           L 10 63
           C 10 66 14 67 17 65
           L 20 54
           C 20 68 25 74 38 74
           C 51 74 55 64 57 55
           C 59 47 62 47 64 53
           C 66 63 71 67 84 66
           C 94 65 97 55 96 41
           C 95 35 91 33 87 34
           L 20 44
           C 14 45 12 46 12 49 Z"
        fill="url(#glasses-frame)"
      />

      {/* Frame Top Rim Highlight Line */}
      <path
        d="M 21 44.5 L 86 35 C 90 34 94 36 94 40"
        stroke="#7A52F8"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* Left Lens Bezel Cutout */}
      <path
        d="M 24 49
           C 24 47 26 46 30 45.5
           L 50 42.5
           C 53 42 54 44 54 48
           C 53 61 50 70 38 70
           C 27 70 24 62 24 49 Z"
        fill="url(#glasses-lens-l)"
        stroke="#E9E0FF"
        strokeWidth="1.2"
        strokeOpacity="0.85"
      />

      {/* Left Lens Glare Reflection */}
      <path
        d="M 26 48
           L 44 45
           C 36 52 30 60 27 67
           C 25 61 25 54 26 48 Z"
        fill="url(#lens-glare)"
      />

      {/* Right Lens Bezel Cutout */}
      <path
        d="M 64 42.5
           L 87 38.5
           C 90 38 92 40 91 44
           C 90 56 87 63 77 63
           C 68 63 64 55 64 46
           C 64 44 64 43 64 42.5 Z"
        fill="url(#glasses-lens-r)"
        stroke="#E9E0FF"
        strokeWidth="1.2"
        strokeOpacity="0.85"
      />

      {/* Right Lens Glare Reflection */}
      <path
        d="M 66 43
           L 84 40
           C 78 48 72 55 69 61
           C 66 55 65 48 66 43 Z"
        fill="url(#lens-glare)"
      />

      {/* Left Temple Silver Pin */}
      <rect x="13.5" y="50" width="3.5" height="2" rx="1" fill="#FFFFFF" opacity="0.9" />
      {/* Right Temple Silver Pin */}
      <rect x="91.5" y="36" width="3.5" height="2" rx="1" fill="#FFFFFF" opacity="0.9" />
    </svg>
  );
};
