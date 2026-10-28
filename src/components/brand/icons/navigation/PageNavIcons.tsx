import React from 'react';

interface IconProps {
  className?: string;
  size?: number | string;
}

/**
 * 1. Home Feed Navigation Icon
 * Modern campus hub / social feed roof & glowing heart-window in royal violet and gold
 */
export const HomeFeedNavIcon: React.FC<IconProps> = ({ className = '', size = 22 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 select-none ${className}`}
  >
    <defs>
      <linearGradient id="nav-home-body" x1="8" y1="10" x2="40" y2="42" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#7C3AED" />
        <stop offset="55%" stopColor="#5420F5" />
        <stop offset="100%" stopColor="#3B0CA3" />
      </linearGradient>
      <linearGradient id="nav-home-roof" x1="6" y1="6" x2="42" y2="24" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FDE047" />
        <stop offset="100%" stopColor="#F59E0B" />
      </linearGradient>
    </defs>

    {/* House Base */}
    <path
      d="M10 22L24 11L38 22V38C38 40.2091 36.2091 42 34 42H14C11.7909 42 10 40.2091 10 38V22Z"
      fill="url(#nav-home-body)"
    />

    {/* Golden Roof Overhang */}
    <path
      d="M6 23.5L24 9L42 23.5"
      stroke="url(#nav-home-roof)"
      strokeWidth="4.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />

    {/* Crisp White Feed Lines / Door Inside */}
    <rect x="17" y="25" width="14" height="3.2" rx="1.6" fill="#FFFFFF" />
    <rect x="19" y="31" width="10" height="7" rx="3" fill="#FDE047" />
  </svg>
);

/**
 * 2. Discover Compass Navigation Icon
 * Vibrant layered exploration compass with golden-coral needle
 */
export const DiscoverCompassNavIcon: React.FC<IconProps> = ({ className = '', size = 22 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 select-none ${className}`}
  >
    <defs>
      <linearGradient id="nav-disc-ring" x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#6366F1" />
        <stop offset="50%" stopColor="#5420F5" />
        <stop offset="100%" stopColor="#31108F" />
      </linearGradient>
      <linearGradient id="nav-disc-needle" x1="16" y1="16" x2="34" y2="34" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FF922E" />
        <stop offset="100%" stopColor="#F52D85" />
      </linearGradient>
    </defs>

    <circle cx="24" cy="24" r="19" fill="url(#nav-disc-ring)" />
    <circle cx="24" cy="24" r="14.5" stroke="#DDD6FE" strokeWidth="1.5" strokeDasharray="3 3" />

    {/* Compass Diamond Needle */}
    <path d="M32.5 15.5L27 27L15.5 32.5L21 21L32.5 15.5Z" fill="#FFFFFF" />
    <path d="M32.5 15.5L27 27L21 21L32.5 15.5Z" fill="url(#nav-disc-needle)" />
    <circle cx="24" cy="24" r="2.6" fill="#191525" stroke="#FFFFFF" strokeWidth="1.5" />
  </svg>
);

/**
 * 3. Profile & Safety Shield Navigation Icon
 * Stylized student portrait bust inside a royal purple & gold crest
 */
export const ProfileShieldNavIcon: React.FC<IconProps> = ({ className = '', size = 22 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 select-none ${className}`}
  >
    <defs>
      <linearGradient id="nav-prof-bg" x1="8" y1="6" x2="40" y2="42" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#7C3AED" />
        <stop offset="100%" stopColor="#4314E2" />
      </linearGradient>
    </defs>

    <rect x="6" y="6" width="36" height="36" rx="13" fill="url(#nav-prof-bg)" />
    <circle cx="24" cy="19" r="6.5" fill="#FDE047" />
    <path
      d="M13.5 36.5C13.5 31.2 18.2 28 24 28C29.8 28 34.5 31.2 34.5 36.5"
      stroke="#FFFFFF"
      strokeWidth="4"
      strokeLinecap="round"
    />
  </svg>
);

/**
 * 4. Public Ask Envelope / Paper Plane Icon
 */
export const PublicAskNavIcon: React.FC<IconProps> = ({ className = '', size = 22 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 select-none ${className}`}
  >
    <defs>
      <linearGradient id="nav-ask-bg" x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#3B82F6" />
        <stop offset="100%" stopColor="#5420F5" />
      </linearGradient>
    </defs>
    <rect x="6" y="6" width="36" height="36" rx="12" fill="url(#nav-ask-bg)" />
    <path
      d="M14 23.5L34 14L27.5 34L22.5 26.5L14 23.5Z"
      fill="#FFFFFF"
      stroke="#FFFFFF"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <path d="M34 14L22.5 26.5" stroke="#93C5FD" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

/**
 * 5. Story Studio / Camera Sparkle Icon
 */
export const StoryStudioNavIcon: React.FC<IconProps> = ({ className = '', size = 22 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 select-none ${className}`}
  >
    <defs>
      <linearGradient id="nav-studio-bg" x1="6" y1="8" x2="42" y2="40" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#F52D85" />
        <stop offset="50%" stopColor="#7C3AED" />
        <stop offset="100%" stopColor="#5420F5" />
      </linearGradient>
    </defs>
    <rect x="6" y="9" width="36" height="31" rx="10" fill="url(#nav-studio-bg)" />
    <circle cx="24" cy="24.5" r="7.5" stroke="#FFFFFF" strokeWidth="3" />
    <circle cx="24" cy="24.5" r="3" fill="#FDE047" />
    <circle cx="34.5" cy="15.5" r="2" fill="#FDE047" />
  </svg>
);

/**
 * 6. Notifications Bell Custom Icon
 */
export const NotificationsBellIcon: React.FC<IconProps> = ({ className = '', size = 22 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 select-none ${className}`}
  >
    <defs>
      <linearGradient id="nav-bell-grad" x1="12" y1="8" x2="36" y2="38" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#8B5CF6" />
        <stop offset="55%" stopColor="#5420F5" />
        <stop offset="100%" stopColor="#3B0CA3" />
      </linearGradient>
    </defs>
    <path
      d="M24 7C25.6569 7 27 8.34315 27 10V11.2C32.7 12.5 36.5 17.6 36.5 23.8V31L40 34.5V36.5H8V34.5L11.5 31V23.8C11.5 17.6 15.3 12.5 21 11.2V10C21 8.34315 22.3431 7 24 7Z"
      fill="url(#nav-bell-grad)"
    />
    <path
      d="M19.5 37.5C20.2 39.8 21.9 41.5 24 41.5C26.1 41.5 27.8 39.8 28.5 37.5H19.5Z"
      fill="#F59E0B"
    />
    <path
      d="M18 17C19.5 15 21.6 14 24 14"
      stroke="#DDD6FE"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
  </svg>
);

/**
 * 7. Safety Shield Badge Icon
 */
export const SafetyShieldBadgeIcon: React.FC<IconProps> = ({ className = '', size = 22 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 select-none ${className}`}
  >
    <defs>
      <linearGradient id="nav-shield-grad" x1="10" y1="6" x2="38" y2="42" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#10B981" />
        <stop offset="100%" stopColor="#047857" />
      </linearGradient>
    </defs>
    <path
      d="M24 6L39 12V23.5C39 33.8 32.5 40.9 24 43.5C15.5 40.9 9 33.8 9 23.5V12L24 6Z"
      fill="url(#nav-shield-grad)"
    />
    <path
      d="M18.5 24.5L22.2 28.2L30 20"
      stroke="#FFFFFF"
      strokeWidth="3.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * 8. Admin Console Crown-Shield Custom Icon
 * Royal indigo-violet security crest with a golden crown & command star
 */
export const AdminConsoleNavIcon: React.FC<IconProps> = ({ className = '', size = 22 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 select-none ${className}`}
  >
    <defs>
      <linearGradient id="nav-admin-shield" x1="8" y1="6" x2="40" y2="42" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#6D28D9" />
        <stop offset="55%" stopColor="#5420F5" />
        <stop offset="100%" stopColor="#1E1B4B" />
      </linearGradient>
      <linearGradient id="nav-admin-crown" x1="14" y1="15" x2="34" y2="30" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FDE047" />
        <stop offset="100%" stopColor="#F59E0B" />
      </linearGradient>
    </defs>
    <path
      d="M24 5L40 11.5V23.5C40 34.4 33.1 41.6 24 44.5C14.9 41.6 8 34.4 8 23.5V11.5L24 5Z"
      fill="url(#nav-admin-shield)"
    />
    <path
      d="M15 29L17.2 19.5L21.8 23.5L24 17.5L26.2 23.5L30.8 19.5L33 29H15Z"
      fill="url(#nav-admin-crown)"
      stroke="#FFFFFF"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
    <rect x="15.5" y="31.5" width="17" height="2.8" rx="1.4" fill="#FFFFFF" />
  </svg>
);

/**
 * 9. Bopoi Search Lens Custom Icon
 * Layered royal violet & golden discovery lens with a crisp reflection arc
 */
export const BopoiSearchIcon: React.FC<IconProps> = ({ className = '', size = 22 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 select-none ${className}`}
  >
    <defs>
      <linearGradient id="nav-search-ring" x1="6" y1="6" x2="36" y2="36" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#7C3AED" />
        <stop offset="100%" stopColor="#5420F5" />
      </linearGradient>
      <linearGradient id="nav-search-handle" x1="28" y1="28" x2="42" y2="42" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FDE047" />
        <stop offset="100%" stopColor="#F59E0B" />
      </linearGradient>
    </defs>
    <path
      d="M30.5 30.5L40.5 40.5"
      stroke="url(#nav-search-handle)"
      strokeWidth="6"
      strokeLinecap="round"
    />
    <circle cx="21.5" cy="21.5" r="13.5" fill="url(#nav-search-ring)" />
    <circle cx="21.5" cy="21.5" r="8.5" fill="#FFFFFF" />
    <path
      d="M17.5 18.5C18.5 17 20.2 16.2 22 16.2"
      stroke="#5420F5"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
  </svg>
);

/**
 * 10. Campus Broadcast Megaphone Custom Icon
 * Expressive purple & golden-coral megaphone for campus-wide announcements
 */
export const CampusMegaphoneIcon: React.FC<IconProps> = ({ className = '', size = 22 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 select-none ${className}`}
  >
    <defs>
      <linearGradient id="nav-mega-cone" x1="8" y1="10" x2="36" y2="36" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FF922E" />
        <stop offset="50%" stopColor="#F52D85" />
        <stop offset="100%" stopColor="#5420F5" />
      </linearGradient>
    </defs>
    <path
      d="M10 20.5L32 11V35L10 25.5V20.5Z"
      fill="url(#nav-mega-cone)"
    />
    <rect x="6" y="19" width="6" height="8" rx="3" fill="#191525" />
    <path d="M13 26.5L15.5 36.5C15.9 38 14.8 39.5 13.2 39.5H11.5C10.2 39.5 9.2 38.4 9.5 37.1L11 26.5H13Z" fill="#F59E0B" />
    <path d="M36.5 16.5C38.8 18.5 38.8 27.5 36.5 29.5" stroke="#FDE047" strokeWidth="3" strokeLinecap="round" />
    <path d="M40.5 13C44 16.5 44 29.5 40.5 33" stroke="#5420F5" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

/**
 * 11. Database & RLS Shield Custom Icon
 * Layered indigo data cylinders with an emerald real-time RLS badge
 */
export const DatabaseSqlIcon: React.FC<IconProps> = ({ className = '', size = 22 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 select-none ${className}`}
  >
    <defs>
      <linearGradient id="nav-db-cyl" x1="8" y1="8" x2="38" y2="40" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#6366F1" />
        <stop offset="55%" stopColor="#5420F5" />
        <stop offset="100%" stopColor="#31108F" />
      </linearGradient>
    </defs>
    <rect x="9" y="10" width="28" height="28" rx="7" fill="url(#nav-db-cyl)" />
    <ellipse cx="23" cy="14" rx="14" ry="5" fill="#A5B4FC" />
    <path d="M9 22C9 24.8 15.3 27 23 27C30.7 27 37 24.8 37 22" stroke="#FFFFFF" strokeWidth="2.2" />
    <path d="M9 30C9 32.8 15.3 35 23 35C30.7 35 37 32.8 37 30" stroke="#DDD6FE" strokeWidth="2.2" />
    <circle cx="36" cy="35" r="8" fill="#10B981" stroke="#FFFFFF" strokeWidth="2" />
    <path d="M33 35L35.2 37.2L39.5 32.8" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

