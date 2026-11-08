import React from 'react';
import { Image as ImageIcon } from 'lucide-react';
import {
  RoomIconConfig,
  parseRoomIcon,
  deriveMonogramFromName,
} from '../../../utils/roomIconConfig.ts';

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
  xs: { box: 28, inner: 14, font: 'text-[10px]' },
  sm: { box: 38, inner: 18, font: 'text-xs' },
  md: { box: 48, inner: 22, font: 'text-sm' },
  lg: { box: 56, inner: 26, font: 'text-base' },
  xl: { box: 68, inner: 32, font: 'text-lg' },
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

  const isImageMode = config.mode === 'image' && Boolean(config.value);

  return (
    <div
      style={{
        width: dims.box,
        height: dims.box,
      }}
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${className}`}
    >
      <div
        style={{
          width: dims.box,
          height: dims.box,
        }}
        className={`w-full h-full rounded-2xl flex items-center justify-center overflow-hidden transition-transform duration-200 ${
          isImageMode
            ? 'bg-[#191525] border-2 border-white/30 shadow-xs'
            : 'bg-[#F0EBFF] border-2 border-dashed border-[#5420F5]/35 text-[#5420F5]'
        }`}
      >
        {isImageMode ? (
          <img
            src={config.value}
            alt={roomName ? `#${roomName} icon` : 'Room icon'}
            className="w-full h-full object-cover select-none pointer-events-none"
            draggable={false}
          />
        ) : roomName?.trim() ? (
          <span className={`font-black tracking-tight select-none leading-none ${dims.font}`}>
            {deriveMonogramFromName(roomName)}
          </span>
        ) : (
          <ImageIcon style={{ width: dims.inner, height: dims.inner }} className="opacity-70" />
        )}
      </div>
    </div>
  );
};


