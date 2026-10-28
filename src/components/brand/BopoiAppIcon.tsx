import React from 'react';
import logoPhoto from '../../assets/images/7B5FF243-F4C9-4FF2-8465-1925644E0468.jpeg';

export interface BopoiAppIconProps {
  size?: number | string;
  className?: string;
  showBackground?: boolean;
  shadow?: boolean;
  idPrefix?: string;
}

/**
 * Official Bopoi Brand App Icon
 * Directly renders the user's exact photo logo asset (7B5FF243-F4C9-4FF2-8465-1925644E0468.jpeg)
 */
export const BopoiAppIcon: React.FC<BopoiAppIconProps> = ({
  size = 48,
  className = '',
  shadow = true,
}) => {
  const dim = typeof size === 'number' ? `${size}px` : size;

  return (
    <img
      src={logoPhoto}
      alt="Bopoi Logo"
      className={`rounded-2xl shrink-0 select-none object-cover ${
        shadow ? 'shadow-md shadow-[#5420F5]/20' : ''
      } ${className}`}
      style={{
        width: dim,
        height: dim,
        minWidth: dim,
        minHeight: dim,
        display: 'inline-block',
        verticalAlign: 'middle',
      }}
      loading="eager"
      decoding="sync"
    />
  );
};
