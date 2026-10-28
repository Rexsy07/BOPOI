import React from 'react';

interface IconProps {
  className?: string;
  size?: number | string;
}

/**
 * Real People Icon
 * Trio of student silhouettes in royal purple: primary student in center foreground flanked by two student companions
 */
export const RealPeopleIcon: React.FC<IconProps> = ({ className = '', size = 32 }) => {
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
        {/* Center Primary Person Gradient */}
        <linearGradient id="center-person-grad" x1="25" y1="20" x2="75" y2="85" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#818CF8" />
          <stop offset="35%" stopColor="#6C35FF" />
          <stop offset="75%" stopColor="#4F1BDD" />
          <stop offset="100%" stopColor="#250578" />
        </linearGradient>

        {/* Flanking Companions Gradient */}
        <linearGradient id="side-person-grad" x1="10" y1="30" x2="90" y2="80" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6C35FF" />
          <stop offset="50%" stopColor="#4F1BDD" />
          <stop offset="100%" stopColor="#310FB8" />
        </linearGradient>
      </defs>

      {/* 1. Left Companion */}
      {/* Head */}
      <circle cx="28" cy="40" r="9" fill="url(#side-person-grad)" />
      {/* Head Highlight */}
      <circle cx="26" cy="37" r="3" fill="white" opacity="0.3" />
      {/* Shoulders */}
      <path
        d="M 12 72
           C 12 58 20 54 28 54
           C 36 54 44 58 44 72
           Z"
        fill="url(#side-person-grad)"
      />

      {/* 2. Right Companion */}
      {/* Head */}
      <circle cx="72" cy="40" r="9" fill="url(#side-person-grad)" />
      {/* Head Highlight */}
      <circle cx="70" cy="37" r="3" fill="white" opacity="0.3" />
      {/* Shoulders */}
      <path
        d="M 56 72
           C 56 58 64 54 72 54
           C 80 54 88 58 88 72
           Z"
        fill="url(#side-person-grad)"
      />

      {/* 3. Center Primary Student (Foreground & Larger) */}
      {/* Center Shoulders */}
      <path
        d="M 28 82
           C 28 66 38 60 50 60
           C 62 60 72 66 72 82
           C 72 84 70 85 68 85
           L 32 85
           C 30 85 28 84 28 82 Z"
        fill="url(#center-person-grad)"
        stroke="#1E0B64"
        strokeWidth="1.5"
      />
      {/* Center Head */}
      <circle
        cx="50"
        cy="36"
        r="14"
        fill="url(#center-person-grad)"
        stroke="#1E0B64"
        strokeWidth="1.5"
      />

      {/* Specular Glaze on Head */}
      <path
        d="M 44 26
           C 52 24 58 28 59 34"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.45"
      />
      {/* Shoulder Highlight */}
      <path
        d="M 36 66 C 44 63 56 63 64 66"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.3"
      />
    </svg>
  );
};
