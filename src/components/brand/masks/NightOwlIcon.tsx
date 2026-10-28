import React from 'react';

interface MaskIconProps {
  className?: string;
  size?: number | string;
}

/**
 * Night Owl (Late Night) Persona Icon
 * Deep purple owl head with golden alert eyes and beak
 */
export const NightOwlIcon: React.FC<MaskIconProps> = ({ className = '', size = 32 }) => {
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
        {/* Main purple feather gradient */}
        <linearGradient id="owl-feathers" x1="20" y1="15" x2="80" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#5B25F8" />
          <stop offset="45%" stopColor="#4D1CDD" />
          <stop offset="100%" stopColor="#310D9E" />
        </linearGradient>
        {/* Eye gold gradient */}
        <radialGradient id="owl-eye-gold" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFF275" />
          <stop offset="65%" stopColor="#FFC83B" />
          <stop offset="100%" stopColor="#E59A18" />
        </radialGradient>
        {/* Shadow under brow */}
        <linearGradient id="owl-brow-shade" x1="50" y1="20" x2="50" y2="50" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6C35FF" />
          <stop offset="100%" stopColor="#3C14B0" />
        </linearGradient>
      </defs>

      {/* Outer Head Silhouette with tufted ears and cheek ruffs */}
      <path
        d="M 50 18
           C 60 18 68 12 84 15
           C 87 23 85 35 77 42
           C 84 50 86 62 82 72
           C 77 82 66 89 50 90
           C 34 89 23 82 18 72
           C 14 62 16 50 23 42
           C 15 35 13 23 16 15
           C 32 12 40 18 50 18 Z"
        fill="url(#owl-feathers)"
      />

      {/* Ear tufts accents */}
      <path
        d="M 16 15 C 25 18 30 25 32 32 C 22 28 17 22 16 15 Z"
        fill="#7440FF"
      />
      <path
        d="M 84 15 C 75 18 70 25 68 32 C 78 28 83 22 84 15 Z"
        fill="#7440FF"
      />

      {/* Forehead crest brow */}
      <path
        d="M 32 30 C 42 22 58 22 68 30 C 60 38 40 38 32 30 Z"
        fill="url(#owl-brow-shade)"
      />

      {/* Left Eye White Disc */}
      <circle cx="36" cy="48" r="17" fill="#FFFFFF" />
      {/* Left Eye Golden Iris */}
      <circle cx="36" cy="48" r="13" fill="url(#owl-eye-gold)" />
      {/* Left Eye Dark Pupil */}
      <circle cx="37" cy="48" r="7.5" fill="#191525" />
      {/* Left Eye Sparkle Reflection */}
      <circle cx="34.5" cy="45" r="2.5" fill="#FFFFFF" />
      <circle cx="39" cy="51" r="1.2" fill="#FFFFFF" opacity="0.8" />

      {/* Right Eye White Disc */}
      <circle cx="64" cy="48" r="17" fill="#FFFFFF" />
      {/* Right Eye Golden Iris */}
      <circle cx="64" cy="48" r="13" fill="url(#owl-eye-gold)" />
      {/* Right Eye Dark Pupil */}
      <circle cx="63" cy="48" r="7.5" fill="#191525" />
      {/* Right Eye Sparkle Reflection */}
      <circle cx="61.5" cy="45" r="2.5" fill="#FFFFFF" />
      <circle cx="66" cy="51" r="1.2" fill="#FFFFFF" opacity="0.8" />

      {/* Central Golden Beak */}
      <path
        d="M 45 52
           Q 50 51 55 52
           L 50 67 Z"
        fill="#FFA726"
      />
      <path
        d="M 50 52 L 50 67 L 55 52 Z"
        fill="#E68A00"
      />

      {/* Cheek and chin feather ruffs */}
      <path
        d="M 36 67 C 42 74 58 74 64 67 C 58 78 42 78 36 67 Z"
        fill="#3A10A3"
      />
      <path
        d="M 42 77 C 47 84 53 84 58 77 C 54 84 46 84 42 77 Z"
        fill="#290787"
      />
    </svg>
  );
};
