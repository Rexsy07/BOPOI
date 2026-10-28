import React from 'react';

interface IconProps {
  className?: string;
  size?: number | string;
}

/**
 * 1. Create Post Icon
 * Crisp layered composition card with a fountain/stylus pen and glowing post badge
 */
export const CreatePostIcon: React.FC<IconProps> = ({ className = '', size = 34 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 select-none ${className}`}
  >
    <defs>
      <linearGradient id="create-post-bg" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#3B82F6" />
        <stop offset="100%" stopColor="#1D4ED8" />
      </linearGradient>
      <linearGradient id="create-post-pen" x1="34" y1="14" x2="54" y2="34" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FBBF24" />
        <stop offset="100%" stopColor="#F59E0B" />
      </linearGradient>
    </defs>

    {/* Soft tilted back card */}
    <rect
      x="12"
      y="12"
      width="36"
      height="40"
      rx="10"
      transform="rotate(-6 12 12)"
      fill="#93C5FD"
      opacity="0.45"
    />

    {/* Main royal-blue note card */}
    <rect
      x="10"
      y="12"
      width="38"
      height="40"
      rx="11"
      fill="url(#create-post-bg)"
    />

    {/* Crisp white inner paper lines */}
    <rect x="17" y="21" width="16" height="3.5" rx="1.75" fill="#FFFFFF" />
    <rect x="17" y="28.5" width="24" height="3.5" rx="1.75" fill="#DBEAFE" />
    <rect x="17" y="36" width="19" height="3.5" rx="1.75" fill="#DBEAFE" />

    {/* Floating Golden Stylus / Pen */}
    <g transform="translate(31, 27) rotate(38)">
      <rect x="6" y="0" width="8" height="22" rx="3" fill="url(#create-post-pen)" stroke="#FFFFFF" strokeWidth="1.5" />
      <path d="M6 19L10 26L14 19H6Z" fill="#FEF3C7" />
      <circle cx="10" cy="24.5" r="1.3" fill="#1E3A8A" />
    </g>
  </svg>
);

/**
 * 2. Create Confession Icon
 * Mysterious incognito domino mask + golden lock shield in signature Bopoi purple
 */
export const CreateConfessionIcon: React.FC<IconProps> = ({ className = '', size = 34 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 select-none ${className}`}
  >
    <defs>
      <linearGradient id="create-confess-shield" x1="10" y1="8" x2="54" y2="56" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#7C3AED" />
        <stop offset="55%" stopColor="#5420F5" />
        <stop offset="100%" stopColor="#3B0CA3" />
      </linearGradient>
      <linearGradient id="create-confess-lock" x1="36" y1="34" x2="54" y2="54" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FDE047" />
        <stop offset="100%" stopColor="#F59E0B" />
      </linearGradient>
    </defs>

    {/* Rounded Shield Base */}
    <path
      d="M32 8L50 15V30C50 43.5 41.8 52.4 32 56C22.2 52.4 14 43.5 14 30V15L32 8Z"
      fill="url(#create-confess-shield)"
    />

    {/* Crisp White Domino Mask across Shield */}
    <path
      d="M18 26C18 22.5 22 20 26.5 21.5C29 22.3 30.5 23.5 32 23.5C33.5 23.5 35 22.3 37.5 21.5C42 20 46 22.5 46 26C46 30.5 42.5 33.5 37.5 33.5C34.5 33.5 33 31.2 32 31.2C31 31.2 29.5 33.5 26.5 33.5C21.5 33.5 18 30.5 18 26Z"
      fill="#FFFFFF"
    />
    {/* Mask Eye Slits */}
    <ellipse cx="25.5" cy="27" rx="3.4" ry="2.2" fill="#3B0CA3" />
    <ellipse cx="38.5" cy="27" rx="3.4" ry="2.2" fill="#3B0CA3" />

    {/* Golden Secret Padlock Badge at Bottom Right */}
    <path
      d="M41 38V35.5C41 33.3 42.8 31.5 45 31.5C47.2 31.5 49 33.3 49 35.5V38"
      stroke="#F59E0B"
      strokeWidth="2.8"
      strokeLinecap="round"
    />
    <rect
      x="37.5"
      y="37.5"
      width="15"
      height="13"
      rx="4"
      fill="url(#create-confess-lock)"
      stroke="#FFFFFF"
      strokeWidth="1.5"
    />
    <circle cx="45" cy="43.5" r="1.6" fill="#78350F" />
    <path d="M45 44.5V47" stroke="#78350F" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

/**
 * 3. Create Poll Icon
 * Interactive horizontal & vertical voting bars with a live checkmark badge
 */
export const CreatePollIcon: React.FC<IconProps> = ({ className = '', size = 34 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 select-none ${className}`}
  >
    <defs>
      <linearGradient id="create-poll-card" x1="8" y1="8" x2="54" y2="56" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#4F46E5" />
        <stop offset="100%" stopColor="#312E81" />
      </linearGradient>
      <linearGradient id="create-poll-winner" x1="16" y1="26" x2="48" y2="34" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#34D399" />
        <stop offset="100%" stopColor="#10B981" />
      </linearGradient>
    </defs>

    {/* Poll Board Base */}
    <rect x="10" y="10" width="44" height="44" rx="12" fill="url(#create-poll-card)" />

    {/* Bar 1 */}
    <rect x="16" y="17" width="22" height="7" rx="3.5" fill="#A5B4FC" />

    {/* Bar 2 (Winning choice highlighted in emerald) */}
    <rect x="16" y="28.5" width="31" height="7.5" rx="3.75" fill="url(#create-poll-winner)" />

    {/* Bar 3 */}
    <rect x="16" y="40.5" width="15" height="7" rx="3.5" fill="#C7D2FE" />

    {/* Floating Vote Check Badge */}
    <circle cx="47" cy="45" r="9" fill="#10B981" stroke="#FFFFFF" strokeWidth="2" />
    <path
      d="M43.5 45L46 47.5L51 42.5"
      stroke="#FFFFFF"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * 4. Create Discussion Icon
 * Dual overlapping speech bubbles in warm coral-orange & vibrant violet for campus debates
 */
export const CreateDiscussionIcon: React.FC<IconProps> = ({ className = '', size = 34 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 select-none ${className}`}
  >
    <defs>
      <linearGradient id="create-disc-back" x1="8" y1="10" x2="42" y2="40" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#8B5CF6" />
        <stop offset="100%" stopColor="#5B21B6" />
      </linearGradient>
      <linearGradient id="create-disc-front" x1="22" y1="22" x2="56" y2="54" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FF922E" />
        <stop offset="100%" stopColor="#EA580C" />
      </linearGradient>
    </defs>

    {/* Left / Back Violet Speech Bubble */}
    <path
      d="M10 22C10 15.3726 15.3726 10 22 10H34C40.6274 10 46 15.3726 46 22V27C46 33.6274 40.6274 39 34 39H21L13 45V37.5C11.1 35.4 10 32.6 10 29.5V22Z"
      fill="url(#create-disc-back)"
    />
    {/* Crisp white lines on back bubble */}
    <rect x="17" y="19" width="18" height="3" rx="1.5" fill="#EDE9FE" />
    <rect x="17" y="25" width="12" height="3" rx="1.5" fill="#DDD6FE" />

    {/* Right / Front Warm Orange Speech Bubble */}
    <path
      d="M24 31C24 25.4772 28.4772 21 34 21H45C50.5228 21 55 25.4772 55 31V36C55 41.5228 50.5228 46 45 46H43L50 53V45.8C52.9 44.3 55 41.2 55 37.5V31Z"
      fill="url(#create-disc-front)"
      stroke="#FFFFFF"
      strokeWidth="2"
    />
    <rect x="23" y="22" width="32" height="25" rx="11" fill="url(#create-disc-front)" stroke="#FFFFFF" strokeWidth="2" />
    <path d="M44 46L50 53L48 45" fill="url(#create-disc-front)" />

    {/* Typing / Conversation Dots inside front bubble */}
    <circle cx="32.5" cy="34.5" r="2.4" fill="#FFFFFF" />
    <circle cx="39" cy="34.5" r="2.4" fill="#FFFFFF" />
    <circle cx="45.5" cy="34.5" r="2.4" fill="#FFFFFF" />
  </svg>
);

/**
 * 5. Create Anonymous Chat Room Icon
 * Live broadcast radar hub with crisp white anonymous mask and emerald live indicator
 */
export const CreateRoomIcon: React.FC<IconProps> = ({ className = '', size = 34 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 select-none ${className}`}
  >
    <defs>
      <linearGradient id="create-room-hub" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#6D28D9" />
        <stop offset="50%" stopColor="#5420F5" />
        <stop offset="100%" stopColor="#1E1B4B" />
      </linearGradient>
    </defs>

    {/* Outer Hub Circle */}
    <circle cx="32" cy="32" r="23" fill="url(#create-room-hub)" />

    {/* Subtle Broadcast Signal Rings */}
    <path
      d="M17 22C14.5 25 13 28.4 13 32C13 35.6 14.5 39 17 42"
      stroke="#C4B5FD"
      strokeWidth="2.2"
      strokeLinecap="round"
      opacity="0.7"
    />
    <path
      d="M47 22C49.5 25 51 28.4 51 32C51 35.6 49.5 39 47 42"
      stroke="#C4B5FD"
      strokeWidth="2.2"
      strokeLinecap="round"
      opacity="0.7"
    />

    {/* Crisp White Anonymous Mask in Center */}
    <path
      d="M19 29.5C19 26 22.8 23.8 27 25.2C29.2 25.9 30.6 27 32 27C33.4 27 34.8 25.9 37 25.2C41.2 23.8 45 26 45 29.5C45 33.8 41.6 36.8 36.8 36.8C34.2 36.8 32.9 34.6 32 34.6C31.1 34.6 29.8 36.8 27.2 36.8C22.4 36.8 19 33.8 19 29.5Z"
      fill="#FFFFFF"
    />
    <ellipse cx="26.2" cy="30.5" rx="3.1" ry="2" fill="#31108F" />
    <ellipse cx="37.8" cy="30.5" rx="3.1" ry="2" fill="#31108F" />

    {/* Live Green Status Beacon */}
    <circle cx="48" cy="16" r="6" fill="#10B981" stroke="#FFFFFF" strokeWidth="2.2" />
  </svg>
);
