import React from 'react';
import {
  RoomIconConfig,
  parseRoomIcon,
  ROOM_GRADIENT_PRESETS,
  getRoomAccentHex,
} from '../../../utils/roomIconConfig.ts';
import { BopoiIcon } from './BopoiIcon.tsx';
import { PersonaMaskIcon } from '../masks/PersonaMaskIcon.tsx';

interface RoomBadgeIconProps {
  iconEmoji?: string;
  iconBg?: string;
  category?: string;
  roomName?: string;
  configOverride?: RoomIconConfig;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZE_MAP: Record<
  NonNullable<RoomBadgeIconProps['size']>,
  { box: number; inner: number; font: string }
> = {
  xs: { box: 28, inner: 16, font: 'text-[10px]' },
  sm: { box: 38, inner: 22, font: 'text-xs' },
  md: { box: 48, inner: 28, font: 'text-sm' },
  lg: { box: 56, inner: 34, font: 'text-base' },
  xl: { box: 68, inner: 42, font: 'text-lg' },
};

/**
 * Bespoke multi-layered vector emblems specifically crafted for the Room Icon Studio
 */
const CustomStudioEmblem: React.FC<{ id: string; size: number }> = ({ id, size }) => {
  switch (id) {
    case 'crown-royale':
      return (
        <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
          <path
            d="M5 26L7.5 11L13.5 17L18 8L22.5 17L28.5 11L31 26H5Z"
            fill="url(#crownGrad)"
            stroke="#FFFBEB"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <rect x="6" y="27.5" width="24" height="3" rx="1.5" fill="#FDE68A" />
          <circle cx="18" cy="6.5" r="2" fill="#FEF08A" />
          <circle cx="7" cy="9.5" r="1.6" fill="#FDE047" />
          <circle cx="29" cy="9.5" r="1.6" fill="#FDE047" />
          <circle cx="18" cy="20" r="2" fill="#EF4444" />
          <circle cx="12" cy="21" r="1.4" fill="#38BDF8" />
          <circle cx="24" cy="21" r="1.4" fill="#38BDF8" />
          <defs>
            <linearGradient id="crownGrad" x1="5" y1="8" x2="31" y2="28" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FDE047" />
              <stop offset="0.5" stopColor="#F59E0B" />
              <stop offset="1" stopColor="#D97706" />
            </linearGradient>
          </defs>
        </svg>
      );

    case 'flame-blaze':
      return (
        <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
          <path
            d="M19.5 4C19.5 4 27 10.5 27 19C27 25.5 22.5 31 17.5 31C11.5 31 8 25.5 8 19.5C8 15 11 11 12.5 9.5C12.5 9.5 12 13.5 14.5 14.5C13.5 10 16.5 6 19.5 4Z"
            fill="url(#flameOuter)"
            stroke="#FFF7ED"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d="M18 15C18 15 22.5 18.5 22.5 23C22.5 26.5 20 29.5 17.5 29.5C14.5 29.5 12.5 26.5 12.5 23.5C12.5 20.5 15 17.5 18 15Z"
            fill="url(#flameInner)"
          />
          <defs>
            <linearGradient id="flameOuter" x1="17.5" y1="4" x2="17.5" y2="31" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FB923C" />
              <stop offset="0.55" stopColor="#F97316" />
              <stop offset="1" stopColor="#E11D48" />
            </linearGradient>
            <linearGradient id="flameInner" x1="17.5" y1="15" x2="17.5" y2="29.5" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FEF08A" />
              <stop offset="1" stopColor="#FDE047" />
            </linearGradient>
          </defs>
        </svg>
      );

    case 'megaphone-voice':
      return (
        <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
          <path
            d="M7 15.5L25 8.5V26.5L7 19.5V15.5Z"
            fill="url(#megaGrad)"
            stroke="#FFFFFF"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <rect x="4.5" y="14" width="4" height="7" rx="2" fill="#F43F5E" stroke="#FFFFFF" strokeWidth="1.2" />
          <path
            d="M10 20.5L12 28.5C12.3 29.5 11.5 30.5 10.5 30.5H8.5C7.6 30.5 7 29.8 7 29L8 20"
            fill="#FDE047"
            stroke="#FFFFFF"
            strokeWidth="1.3"
          />
          <path d="M28.5 13C30.2 14.8 30.2 20.2 28.5 22" stroke="#FEF08A" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M31.5 10.5C34 13.8 34 21.2 31.5 24.5" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" />
          <defs>
            <linearGradient id="megaGrad" x1="7" y1="8.5" x2="25" y2="26.5" gradientUnits="userSpaceOnUse">
              <stop stopColor="#EC4899" />
              <stop offset="1" stopColor="#8B5CF6" />
            </linearGradient>
          </defs>
        </svg>
      );

    case 'trophy-cup':
      return (
        <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
          <path
            d="M10 10H6.5C5.7 10 5 10.7 5 11.5V13.5C5 16.5 7.2 19 10.2 19.4M26 10H29.5C30.3 10 31 10.7 31 11.5V13.5C31 16.5 28.8 19 25.8 19.4"
            stroke="#FDE047"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M10 7.5H26V15.5C26 20 22.4 23.5 18 23.5C13.6 23.5 10 20 10 15.5V7.5Z"
            fill="url(#trophyGrad)"
            stroke="#FFFBEB"
            strokeWidth="1.6"
          />
          <path d="M18 23.5V28" stroke="#FDE047" strokeWidth="3" strokeLinecap="round" />
          <rect x="11.5" y="28" width="13" height="3.5" rx="1.75" fill="#F59E0B" stroke="#FFFBEB" strokeWidth="1.2" />
          <path
            d="M18 11L19.3 13.6L22.2 14L20.1 16L20.6 18.8L18 17.5L15.4 18.8L15.9 16L13.8 14L16.7 13.6L18 11Z"
            fill="#FFFBEB"
          />
          <defs>
            <linearGradient id="trophyGrad" x1="10" y1="7.5" x2="26" y2="23.5" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FDE047" />
              <stop offset="1" stopColor="#D97706" />
            </linearGradient>
          </defs>
        </svg>
      );

    case 'vinyl-wave':
      return (
        <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
          <circle cx="18" cy="18" r="13" fill="#1E1B4B" stroke="#A78BFA" strokeWidth="1.8" />
          <circle cx="18" cy="18" r="9.5" stroke="#4C1D95" strokeWidth="1" strokeDasharray="3 3" />
          <circle cx="18" cy="18" r="5" fill="url(#vinylCore)" stroke="#FFFFFF" strokeWidth="1.4" />
          <circle cx="18" cy="18" r="1.8" fill="#1E1B4B" />
          <path d="M26 7L29 14L23 16" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <defs>
            <linearGradient id="vinylCore" x1="13" y1="13" x2="23" y2="23" gradientUnits="userSpaceOnUse">
              <stop stopColor="#F43F5E" />
              <stop offset="1" stopColor="#F59E0B" />
            </linearGradient>
          </defs>
        </svg>
      );

    case 'vault-lock':
      return (
        <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
          <path
            d="M12.5 15V11.5C12.5 8.5 15 6 18 6C21 6 23.5 8.5 23.5 11.5V15"
            stroke="#E2E8F0"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
          <rect
            x="8"
            y="15"
            width="20"
            height="15"
            rx="4"
            fill="url(#lockBody)"
            stroke="#FFFFFF"
            strokeWidth="1.6"
          />
          <circle cx="18" cy="21.5" r="2.2" fill="#FFFBEB" />
          <path d="M18 23.5V26.5" stroke="#FFFBEB" strokeWidth="2.2" strokeLinecap="round" />
          <defs>
            <linearGradient id="lockBody" x1="8" y1="15" x2="28" y2="30" gradientUnits="userSpaceOnUse">
              <stop stopColor="#8B5CF6" />
              <stop offset="1" stopColor="#EC4899" />
            </linearGradient>
          </defs>
        </svg>
      );

    case 'diamond-gem':
      return (
        <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
          <path
            d="M11 7H25L31 14.5L18 30L5 14.5L11 7Z"
            fill="url(#gemGrad)"
            stroke="#E0F2FE"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path d="M5 14.5H31" stroke="#E0F2FE" strokeWidth="1.3" />
          <path d="M11 7L14.5 14.5L18 30L21.5 14.5L25 7" stroke="#E0F2FE" strokeWidth="1.3" strokeLinejoin="round" />
          <defs>
            <linearGradient id="gemGrad" x1="5" y1="7" x2="31" y2="30" gradientUnits="userSpaceOnUse">
              <stop stopColor="#38BDF8" />
              <stop offset="0.5" stopColor="#2DD4BF" />
              <stop offset="1" stopColor="#6366F1" />
            </linearGradient>
          </defs>
        </svg>
      );

    case 'shield-guardian':
      return (
        <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
          <path
            d="M18 5L29 9.5V17.5C29 24.2 24.2 29.4 18 31.5C11.8 29.4 7 24.2 7 17.5V9.5L18 5Z"
            fill="url(#shieldGrad)"
            stroke="#FFFFFF"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M14 18L17 21L23 14.5"
            stroke="#FEF08A"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <defs>
            <linearGradient id="shieldGrad" x1="7" y1="5" x2="29" y2="31.5" gradientUnits="userSpaceOnUse">
              <stop stopColor="#6366F1" />
              <stop offset="1" stopColor="#10B981" />
            </linearGradient>
          </defs>
        </svg>
      );

    case 'compass-quest':
      return (
        <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
          <circle cx="18" cy="18" r="12.5" fill="url(#compGrad)" stroke="#FFFFFF" strokeWidth="1.8" />
          <polygon points="22.5,13.5 19.5,19.5 13.5,22.5 16.5,16.5" fill="#FEF08A" stroke="#FFFFFF" strokeWidth="1" />
          <circle cx="18" cy="18" r="2" fill="#F43F5E" />
          <defs>
            <linearGradient id="compGrad" x1="6" y1="6" x2="30" y2="30" gradientUnits="userSpaceOnUse">
              <stop stopColor="#0284C7" />
              <stop offset="1" stopColor="#4F46E5" />
            </linearGradient>
          </defs>
        </svg>
      );

    case 'cyber-bolt':
      return (
        <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
          <path
            d="M20.5 4.5L9 19.5H17.5L15.5 31.5L27 16.5H18.5L20.5 4.5Z"
            fill="url(#boltGrad)"
            stroke="#FFFFFF"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <defs>
            <linearGradient id="boltGrad" x1="9" y1="4.5" x2="27" y2="31.5" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FDE047" />
              <stop offset="0.5" stopColor="#F97316" />
              <stop offset="1" stopColor="#EC4899" />
            </linearGradient>
          </defs>
        </svg>
      );

    case 'eye-radar':
      return (
        <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
          <path
            d="M4.5 18C4.5 18 9.5 9.5 18 9.5C26.5 9.5 31.5 18 31.5 18C31.5 18 26.5 26.5 18 26.5C9.5 26.5 4.5 18 4.5 18Z"
            fill="url(#eyeOuter)"
            stroke="#FFFFFF"
            strokeWidth="1.7"
          />
          <circle cx="18" cy="18" r="5" fill="#1E1B4B" stroke="#FEF08A" strokeWidth="1.6" />
          <circle cx="19.5" cy="16.5" r="1.6" fill="#FFFFFF" />
          <defs>
            <linearGradient id="eyeOuter" x1="4.5" y1="9.5" x2="31.5" y2="26.5" gradientUnits="userSpaceOnUse">
              <stop stopColor="#A855F7" />
              <stop offset="1" stopColor="#EC4899" />
            </linearGradient>
          </defs>
        </svg>
      );

    case 'mic-stage':
      return (
        <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
          <rect
            x="13.5"
            y="5.5"
            width="9"
            height="15"
            rx="4.5"
            fill="url(#micGrad)"
            stroke="#FFFFFF"
            strokeWidth="1.6"
          />
          <path d="M13.5 12H22.5" stroke="#FFFFFF" strokeWidth="1.2" strokeOpacity="0.6" />
          <path
            d="M9.5 16C9.5 20.7 13.3 24.5 18 24.5C22.7 24.5 26.5 20.7 26.5 16"
            stroke="#FDE047"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path d="M18 24.5V30M13.5 30H22.5" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" />
          <defs>
            <linearGradient id="micGrad" x1="13.5" y1="5.5" x2="22.5" y2="20.5" gradientUnits="userSpaceOnUse">
              <stop stopColor="#F43F5E" />
              <stop offset="1" stopColor="#8B5CF6" />
            </linearGradient>
          </defs>
        </svg>
      );

    case 'mask-secret':
      return <PersonaMaskIcon mask="secret-confession" size={size} />;
    case 'mask-owl':
      return <PersonaMaskIcon mask="night-owl" size={size} />;
    case 'mask-phantom':
      return <PersonaMaskIcon mask="hostel-phantom" size={size} />;

    default:
      return <BopoiIcon name={id} size={size} />;
  }
};

export const RoomBadgeIcon: React.FC<RoomBadgeIconProps> = ({
  iconEmoji,
  iconBg,
  category,
  roomName,
  configOverride,
  size = 'md',
  className = '',
}) => {
  const config =
    configOverride || parseRoomIcon(iconEmoji, iconBg, category, roomName);
  const dims = SIZE_MAP[size] || SIZE_MAP.md;

  // Resolve background CSS and primary accent hex
  let backgroundStyle = '#FFFFFF';
  let isLightBackground = false;
  let primaryHex = getRoomAccentHex(iconBg);

  if (config.fillType === 'gradient') {
    const preset =
      ROOM_GRADIENT_PRESETS.find((g) => g.id === config.fillValue) ||
      ROOM_GRADIENT_PRESETS[0];
    backgroundStyle = preset.css;
    primaryHex = preset.primaryHex;
    isLightBackground = preset.id === 'frost-crystal';
  } else {
    const hex = /^#[0-9a-fA-F]{6}$/.test(config.fillValue)
      ? config.fillValue
      : '#5420F5';
    backgroundStyle = hex;
    primaryHex = hex === '#FFFFFF' ? '#5420F5' : hex;
    isLightBackground = hex.toUpperCase() === '#FFFFFF' || hex.toUpperCase() === '#FAF9FC';
  }

  // Shape CSS / clipPath
  let shapeClass = 'rounded-2xl';
  let clipPathStyle: string | undefined;

  if (config.shape === 'circle') {
    shapeClass = 'rounded-full';
  } else if (config.shape === 'hexagon') {
    shapeClass = 'rounded-none';
    clipPathStyle = 'polygon(25% 5%, 75% 5%, 98% 50%, 75% 95%, 25% 95%, 2% 50%)';
  } else if (config.shape === 'shield') {
    shapeClass = 'rounded-none';
    clipPathStyle = 'polygon(50% 3%, 93% 18%, 93% 56%, 50% 97%, 7% 56%, 7% 18%)';
  } else if (config.shape === 'diamond') {
    shapeClass = 'rounded-none';
    clipPathStyle = 'polygon(50% 3%, 97% 50%, 50% 97%, 3% 50%)';
  }

  // Glow & Ring calculation
  let boxShadowStyle = '0 2px 6px rgba(25, 21, 37, 0.08)';
  if (config.glow === 'soft') {
    boxShadowStyle = `0 4px 14px ${primaryHex}38`;
  } else if (config.glow === 'neon') {
    boxShadowStyle = `0 0 0 2px ${primaryHex}55, 0 0 18px ${primaryHex}75`;
  } else if (config.glow === 'crest') {
    boxShadowStyle = `0 0 0 2px #FFFFFF, 0 0 0 4px ${primaryHex}85, 0 6px 14px ${primaryHex}35`;
  }

  const isImageMode = config.mode === 'image' && Boolean(config.value);

  // Render Foreground Content
  const renderForeground = () => {
    if (isImageMode) {
      return (
        <img
          src={config.value}
          alt={roomName ? `#${roomName} icon` : 'Room icon'}
          className="w-full h-full object-cover select-none pointer-events-none"
          draggable={false}
        />
      );
    }

    if (config.mode === 'monogram') {
      const chars = (config.value || 'RM').slice(0, 3).toUpperCase();
      return (
        <span
          className={`font-black tracking-tight select-none leading-none ${dims.font} ${
            isLightBackground ? 'text-[#191525]' : 'text-white drop-shadow-xs'
          }`}
        >
          {chars}
        </span>
      );
    }

    if (config.mode === 'emoji') {
      return (
        <span
          style={{ fontSize: Math.round(dims.inner * 0.78) }}
          className="leading-none select-none drop-shadow-xs"
        >
          {config.value || '🎭'}
        </span>
      );
    }

    return <CustomStudioEmblem id={config.value} size={dims.inner} />;
  };

  return (
    <div
      style={{
        width: dims.box,
        height: dims.box,
        filter:
          clipPathStyle && config.glow !== 'none'
            ? `drop-shadow(0 3px 8px ${primaryHex}65)`
            : undefined,
      }}
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${className}`}
    >
      <div
        style={{
          width: dims.box,
          height: dims.box,
          background: isImageMode ? '#191525' : backgroundStyle,
          clipPath: clipPathStyle,
          boxShadow: clipPathStyle ? undefined : boxShadowStyle,
          borderColor: isLightBackground ? `${primaryHex}45` : 'rgba(255,255,255,0.28)',
        }}
        className={`w-full h-full flex items-center justify-center overflow-hidden transition-transform duration-200 ${shapeClass} ${
          clipPathStyle ? '' : 'border-2'
        }`}
      >
        {/* Subtle inner specular highlight when using dark/vibrant fills or uploaded photo */}
        {(!isLightBackground || isImageMode) && !clipPathStyle && (
          <div
            className={`absolute inset-0 z-20 pointer-events-none ${shapeClass} ring-1 ring-inset ring-white/25`}
          />
        )}
        <div
          className={`relative z-10 flex items-center justify-center ${
            isImageMode ? 'w-full h-full' : ''
          }`}
        >
          {renderForeground()}
        </div>
      </div>
    </div>
  );
};

