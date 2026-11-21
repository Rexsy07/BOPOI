import React from 'react';

interface GifPreviewMediaProps {
  url: string;
  alt?: string;
  onClick?: () => void;
  compact?: boolean;
}

export const GifPreviewMedia: React.FC<GifPreviewMediaProps> = ({
  url,
  alt = 'GIF',
  onClick,
  compact = false,
}) => {
  const isMp4 = /\.(mp4|webm)(\?|$)/i.test(url);

  const mediaNode = isMp4 ? (
    <video
      src={url}
      autoPlay
      loop
      muted
      playsInline
      className={`w-full ${compact ? 'max-h-44' : 'max-h-64'} object-cover rounded-xl`}
    />
  ) : (
    <img
      src={url}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      className={`w-full ${compact ? 'max-h-44' : 'max-h-64'} object-cover rounded-xl`}
    />
  );

  return (
    <div
      onClick={onClick}
      className={`relative inline-block max-w-full sm:max-w-xs rounded-xl overflow-hidden border border-black/10 dark:border-[#262036] bg-[#FAF9FC] dark:bg-[#171322] ${
        onClick ? 'cursor-pointer hover:opacity-95 transition-opacity' : ''
      }`}
    >
      {mediaNode}
      <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/65 text-white text-[9px] font-black tracking-wider uppercase pointer-events-none">
        GIF
      </span>
    </div>
  );
};
