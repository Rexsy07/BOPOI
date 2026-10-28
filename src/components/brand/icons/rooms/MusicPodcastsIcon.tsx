import React from 'react';

interface IconProps {
  className?: string;
  size?: number | string;
}

/**
 * Music & Podcasts Icon
 * Sleek over-ear DJ/studio headphones in royal purple with plush cushioned earcups
 */
export const MusicPodcastsIcon: React.FC<IconProps> = ({ className = '', size = 32 }) => {
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
        {/* Headband Gradient */}
        <linearGradient id="headband-grad" x1="15" y1="20" x2="85" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4314E2" />
          <stop offset="50%" stopColor="#6C35FF" />
          <stop offset="100%" stopColor="#4314E2" />
        </linearGradient>

        {/* Earcup Gradient */}
        <linearGradient id="earcup-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6C35FF" />
          <stop offset="50%" stopColor="#4F1BDD" />
          <stop offset="100%" stopColor="#250578" />
        </linearGradient>
      </defs>

      {/* 1. Main Headband Arch */}
      <path
        d="M 23 58
           C 21 34 32 18 50 18
           C 68 18 79 34 77 58"
        stroke="url(#headband-grad)"
        strokeWidth="9"
        strokeLinecap="round"
      />

      {/* Headband Top Highlight Sheen */}
      <path
        d="M 33 26
           C 39 21 44 20 50 20
           C 56 20 61 21 67 26"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.5"
      />

      {/* Headband Inner Soft Cushion Pad */}
      <path
        d="M 32 32
           C 38 27 44 25 50 25
           C 56 25 62 27 68 32"
        stroke="#8B5CF6"
        strokeWidth="3.5"
        strokeLinecap="round"
      />

      {/* 2. Left Swivel Arm & Bracket */}
      <rect x="18" y="52" width="7" height="9" rx="2" fill="#310FB8" />
      {/* 3. Right Swivel Arm & Bracket */}
      <rect x="75" y="52" width="7" height="9" rx="2" fill="#310FB8" />

      {/* 4. Left Earcup */}
      {/* Back cushion */}
      <ellipse cx="22" cy="70" rx="9" ry="14" fill="#1E124A" />
      {/* Front cup shell */}
      <ellipse cx="23.5" cy="70" rx="7.5" ry="12.5" fill="url(#earcup-grad)" />
      {/* Metallic trim ring */}
      <ellipse cx="23.5" cy="70" rx="5" ry="9" stroke="#8B5CF6" strokeWidth="1.2" fill="#310FB8" />
      {/* Specular highlight */}
      <path
        d="M 21 62 C 20 65 20 74 21 78"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.5"
      />

      {/* 5. Right Earcup */}
      {/* Back cushion */}
      <ellipse cx="78" cy="70" rx="9" ry="14" fill="#1E124A" />
      {/* Front cup shell */}
      <ellipse cx="76.5" cy="70" rx="7.5" ry="12.5" fill="url(#earcup-grad)" />
      {/* Metallic trim ring */}
      <ellipse cx="76.5" cy="70" rx="5" ry="9" stroke="#8B5CF6" strokeWidth="1.2" fill="#310FB8" />
      {/* Specular highlight */}
      <path
        d="M 78 62 C 79 65 79 74 78 78"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.5"
      />
    </svg>
  );
};
