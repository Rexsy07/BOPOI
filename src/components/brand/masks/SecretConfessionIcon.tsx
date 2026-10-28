import React from 'react';

interface MaskIconProps {
  className?: string;
  size?: number | string;
}

/**
 * Secret Confession (Silent Brain) Persona Icon
 * Deep purple hooded figure with finger over lips in a "shh" silence gesture
 */
export const SecretConfessionIcon: React.FC<MaskIconProps> = ({ className = '', size = 32 }) => {
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
        {/* Hood Purple Gradient */}
        <linearGradient id="hood-gradient" x1="20" y1="15" x2="80" y2="85" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6732FF" />
          <stop offset="40%" stopColor="#501CE2" />
          <stop offset="100%" stopColor="#2E0B99" />
        </linearGradient>

        {/* Inner Face Darkness */}
        <radialGradient id="face-shadow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#26105E" />
          <stop offset="70%" stopColor="#1B0948" />
          <stop offset="100%" stopColor="#100330" />
        </radialGradient>

        {/* Hand Flesh Tone */}
        <linearGradient id="finger-skin" x1="45" y1="60" x2="60" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFCEBA" />
          <stop offset="70%" stopColor="#F5B29B" />
          <stop offset="100%" stopColor="#D98B75" />
        </linearGradient>
      </defs>

      {/* Outer Pointed Hood Shape */}
      <path
        d="M 50 14
           C 65 18 80 34 85 55
           C 88 72 80 82 81 85
           C 74 89 65 85 50 87
           C 35 85 26 89 19 85
           C 20 82 12 72 15 55
           C 20 34 35 18 50 14 Z"
        fill="url(#hood-gradient)"
      />

      {/* Hood Outer Edge Highlight */}
      <path
        d="M 50 16
           C 63 20 78 35 82 54
           C 85 68 78 78 80 81"
        stroke="#8B62FF"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Inner Hood Dark Opening */}
      <path
        d="M 50 32
           C 66 32 72 45 70 65
           C 68 76 60 81 50 82
           C 40 81 32 76 30 65
           C 28 45 34 32 50 32 Z"
        fill="url(#face-shadow)"
      />

      {/* Glowing Left Eye */}
      <ellipse cx="41" cy="53" rx="6" ry="4.5" fill="#FFFFFF" />
      {/* Glowing Right Eye */}
      <ellipse cx="59" cy="53" rx="6" ry="4.5" fill="#FFFFFF" />

      {/* Shushing Hand: Raised Index Finger */}
      <path
        d="M 48 60
           C 48 57 51 57 52 60
           L 53 74
           C 53 76 52 77 50 77
           C 48 77 47 75 47 73
           L 47 62
           C 47 60 48 60 48 60 Z"
        fill="url(#finger-skin)"
      />

      {/* Shushing Hand: Curled Fingers Fist Base */}
      <path
        d="M 44 71
           C 44 68 56 68 58 72
           C 61 75 61 80 58 84
           C 54 88 45 88 42 84
           C 40 80 41 74 44 71 Z"
        fill="url(#finger-skin)"
      />

      {/* Finger Knuckle Creases */}
      <path d="M 48 65 L 52 65" stroke="#C4735E" strokeWidth="0.8" strokeLinecap="round" />
      <path d="M 48 70 L 52 70" stroke="#C4735E" strokeWidth="0.8" strokeLinecap="round" />

      {/* Hood Collar / Shoulder Wrap */}
      <path
        d="M 22 84
           C 32 80 44 83 50 83
           C 56 83 68 80 78 84
           C 80 87 72 90 50 90
           C 28 90 20 87 22 84 Z"
        fill="#320C9C"
      />
    </svg>
  );
};
