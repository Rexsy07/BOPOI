import React from 'react';

interface MaskIconProps {
  className?: string;
  size?: number | string;
}

/**
 * Public Profile (Fallback) Persona Icon
 * Deep purple circular button with sleek minimalist student avatar silhouette
 */
export const PublicProfileIcon: React.FC<MaskIconProps> = ({ className = '', size = 32 }) => {
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
        {/* Disc Royal Purple Gradient */}
        <linearGradient id="user-disc" x1="20" y1="10" x2="80" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#5E27F8" />
          <stop offset="45%" stopColor="#4A18DB" />
          <stop offset="100%" stopColor="#2E0A9D" />
        </linearGradient>

        {/* Specular Glaze Light */}
        <linearGradient id="user-gloss" x1="20" y1="15" x2="60" y2="50" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#9C77FF" stopOpacity="0.75" />
          <stop offset="50%" stopColor="#6C38FF" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#5420F5" stopOpacity="0" />
        </linearGradient>

        {/* Silhouette Light Lavender Gradient */}
        <linearGradient id="user-silhouette" x1="50" y1="28" x2="50" y2="80" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#E2D8FF" />
        </linearGradient>
      </defs>

      {/* Main Purple Badge Disc */}
      <circle cx="50" cy="50" r="40" fill="url(#user-disc)" />

      {/* Top-Left Specular Sheen Crescent */}
      <path
        d="M 22 36
           C 25 24 37 16 50 16
           C 40 18 28 26 25 38
           C 23 46 25 58 30 66
           C 24 57 20 46 22 36 Z"
        fill="url(#user-gloss)"
      />

      {/* Outer Rim Ring */}
      <circle cx="50" cy="50" r="39" stroke="#7A4DF8" strokeWidth="1.5" opacity="0.6" />

      {/* User Head Disc */}
      <circle cx="50" cy="38" r="11" fill="url(#user-silhouette)" />

      {/* User Torso & Shoulder Arch */}
      <path
        d="M 28 72
           C 28 58 38 52 50 52
           C 62 52 72 58 72 72
           C 65 77 58 79 50 79
           C 42 79 35 77 28 72 Z"
        fill="url(#user-silhouette)"
      />
    </svg>
  );
};
