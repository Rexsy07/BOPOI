import React, { useId } from 'react';

interface IconProps {
  className?: string;
  size?: number | string;
}

/**
 * Custom Bopoi Verification Badge Icon
 * 10-point scalloped royal-violet rosette seal with warm gold crest highlight
 * and crisp architectural checkmark. Crafted specifically for Bopoi Verified Creators.
 */
export const VerifiedCreatorBadgeIcon: React.FC<IconProps> = ({
  className = '',
  size = 16,
}) => {
  const uid = useId().replace(/:/g, '');
  const fillGradId = `bopoi-verified-fill-${uid}`;
  const goldGradId = `bopoi-verified-gold-${uid}`;
  const innerRimId = `bopoi-verified-rim-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 select-none inline-block align-middle ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={fillGradId} x1="18" y1="14" x2="84" y2="88" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7C4DFF" />
          <stop offset="45%" stopColor="#5420F5" />
          <stop offset="100%" stopColor="#3510B9" />
        </linearGradient>

        <linearGradient id={goldGradId} x1="16" y1="12" x2="80" y2="76" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFE17D" />
          <stop offset="55%" stopColor="#FFC928" />
          <stop offset="100%" stopColor="#FF922E" />
        </linearGradient>

        <linearGradient id={innerRimId} x1="25" y1="22" x2="75" y2="78" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="white" stopOpacity="0.48" />
          <stop offset="100%" stopColor="white" stopOpacity="0.06" />
        </linearGradient>
      </defs>

      {/* Subtle warm gold aura scallop behind top-right / outer crest */}
      <path
        d="M50 7.5
           L59.4 13.8 L70.7 13.2 L76.6 22.8 L86.8 27.6 L87.2 38.9
           L93.5 48.5 L88.2 58.6 L89.2 69.9 L80.1 76.5 L75.9 87
           L64.6 87.9 L55.4 94.5 L45.1 89.6 L33.9 91.1 L26.9 82.2
           L16.3 78.5 L15 67.2 L8.1 58.3 L12.6 47.8 L10.7 36.6
           L19.2 29.3 L22.5 18.5 L33.8 16.9 L42.4 9.6 Z"
        fill={`url(#${goldGradId})`}
        opacity="0.92"
      />

      {/* Primary 10-point scalloped Bopoi seal */}
      <path
        d="M50 11
           C54.6 11 57.5 15.6 62 16.8
           C66.5 18 71.3 15.3 74.9 18.6
           C78.5 21.9 77 27.2 79.8 31
           C82.6 34.8 88 35.9 89.4 40.4
           C90.8 44.9 86.7 48.7 86.7 53.3
           C86.7 57.9 90.4 62 88.8 66.4
           C87.2 70.8 81.8 71.6 78.8 75.2
           C75.8 78.8 77.1 84.2 73.3 87.3
           C69.5 90.4 64.9 87.4 60.3 88.5
           C55.7 89.6 52.6 94 48 93.7
           C43.4 93.4 40.6 88.7 36.1 87.3
           C31.6 85.9 26.8 88.5 23.3 85
           C19.8 81.5 21.4 76.3 18.7 72.4
           C16 68.5 10.6 67.3 9.4 62.7
           C8.2 58.1 12.4 54.4 12.6 49.8
           C12.8 45.2 9.1 41 10.9 36.7
           C12.7 32.4 18.1 31.8 21.2 28.3
           C24.3 24.8 23.2 19.3 27.1 16.3
           C31 13.3 35.5 16.5 40.1 15.5
           C44.7 14.5 45.4 11 50 11 Z"
        fill={`url(#${fillGradId})`}
        stroke="#270987"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />

      {/* Crisp inner jewel ring */}
      <circle
        cx="50"
        cy="52"
        r="27"
        stroke={`url(#${innerRimId})`}
        strokeWidth="2.4"
      />

      {/* Subtle gold star-glint dot at top right inside rim */}
      <circle cx="67.5" cy="34.5" r="3" fill="#FFC928" />

      {/* Precision rounded checkmark */}
      <path
        d="M35.5 53 L45.5 63.2 L65.5 41.8"
        stroke="white"
        strokeWidth="8.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
