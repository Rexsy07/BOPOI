import React from 'react';
import { BopoiAppIcon } from './BopoiAppIcon.tsx';
import { BopoiInteractiveMascot } from './BopoiInteractiveMascot.tsx';

export { BopoiAppIcon };
export type LogoMascotMood = 'curious' | 'happy' | 'winking' | 'floating' | 'listening';

interface BopoiLogoProps {
  variant?: 'icon' | 'full' | 'wordmark' | 'banner' | 'mascot';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  className?: string;
  showTagline?: boolean;
  idPrefix?: string;
  mood?: LogoMascotMood;
}

export const BopoiLogo: React.FC<BopoiLogoProps> = ({
  variant = 'icon',
  size = 'md',
  className = '',
  showTagline = false,
  idPrefix = 'bopoi-logo',
  mood = 'floating',
}) => {
  const getIconDimension = () => {
    if (typeof size === 'number') return size;
    switch (size) {
      case 'xs': return 30;
      case 'sm': return 38;
      case 'md': return 46;
      case 'lg': return 60;
      case 'xl': return 84;
      default: return 46;
    }
  };

  const dim = getIconDimension();

  // Render standalone Wordmark "Bopoi"
  const renderWordmark = (textColor = '#191525', dotColor = '#FFC928', textSize = 'text-2xl') => (
    <div className="flex items-center tracking-tight font-extrabold select-none">
      <span style={{ color: textColor }} className={`${textSize} font-black tracking-[-0.03em] font-sans`}>
        Bopo
      </span>
      <div className="relative inline-flex items-center">
        <span style={{ color: textColor }} className={`${textSize} font-black tracking-[-0.03em] font-sans`}>
          ı
        </span>
        {/* Yellow playful dot on the i */}
        <span
          style={{ backgroundColor: dotColor }}
          className="absolute -top-1 right-0.5 w-2 h-2 rounded-full shadow-sm"
        />
      </div>
    </div>
  );

  // 1. Official App Icon Mark
  if (variant === 'icon') {
    return (
      <BopoiAppIcon
        size={dim}
        className={className}
        idPrefix={idPrefix}
      />
    );
  }

  // 2. Interactive Mascot
  if (variant === 'mascot') {
    return (
      <BopoiInteractiveMascot
        size={dim}
        mood={mood}
        className={className}
        interactive={false}
      />
    );
  }

  // 3. Wordmark Only
  if (variant === 'wordmark') {
    return (
      <div className={`inline-flex items-center ${className}`}>
        {renderWordmark('#191525', '#FFC928')}
      </div>
    );
  }

  // 4. Banner Variant
  if (variant === 'banner') {
    return (
      <div className={`flex flex-col items-center gap-2 ${className}`}>
        <div className="flex items-center gap-3">
          <BopoiAppIcon size={dim} idPrefix={`${idPrefix}-banner`} />
          <span className="text-3xl font-black text-white tracking-tight">
            Bopo<span className="relative inline-block">ı<span className="absolute -top-1 right-0 w-2.5 h-2.5 bg-[#FFC928] rounded-full" /></span>
          </span>
        </div>
        {showTagline && (
          <span className="text-xs font-semibold text-white/90 tracking-wide mt-0.5">
            Your Campus, All in One Place ✨
          </span>
        )}
      </div>
    );
  }

  // 5. Full default: Official App Icon + Wordmark
  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <BopoiAppIcon size={dim} idPrefix={`${idPrefix}-full`} />
      <div className="flex flex-col">
        <span className="text-xl font-black tracking-tight text-[#191525] leading-none">
          Bopo<span className="relative inline-block">ı<span className="absolute -top-0.5 right-0 w-1.5 h-1.5 bg-[#FFC928] rounded-full" /></span>
        </span>
        {showTagline && (
          <span className="text-[10px] text-[#706B7D] font-semibold leading-none mt-1">
            Your Campus
          </span>
        )}
      </div>
    </div>
  );
};
