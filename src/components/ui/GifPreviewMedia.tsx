import React, { useState, useEffect } from 'react';

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
  const [loaded, setLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setHasError(false);
  }, [url]);

  const cleanUrl = (url || '').trim();
  const isMp4 = /\.(mp4|webm)(\?|$)/i.test(cleanUrl);

  if (!cleanUrl) return null;

  return (
    <div
      onClick={onClick}
      className={`relative block overflow-hidden rounded-2xl border border-black/10 dark:border-[#262036] bg-[#FAF9FC] dark:bg-[#171322] ${
        compact
          ? 'w-[200px] sm:w-[232px] max-w-full'
          : 'w-[240px] sm:w-[290px] max-w-full'
      } ${!loaded && !hasError ? 'min-h-[120px]' : ''} ${
        onClick ? 'cursor-pointer hover:opacity-95 transition-opacity' : ''
      }`}
    >
      {!loaded && !hasError && (
        <div className="absolute inset-0 animate-pulse bg-[#EAE6F0]/60 dark:bg-[#231C33]" />
      )}

      {hasError ? (
        <a
          href={cleanUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex flex-col items-center justify-center gap-1 px-4 py-6 text-center text-xs text-[#706B7D] dark:text-[#9E97B3] hover:text-[#5420F5] dark:hover:text-[#B9A4FF]"
        >
          <span className="px-2 py-0.5 rounded-md bg-[#F0EBFF] dark:bg-[#231A45] text-[#5420F5] dark:text-[#B9A4FF] text-[10px] font-black uppercase tracking-wider">
            GIF
          </span>
          <span className="font-semibold">Tap to view GIF</span>
        </a>
      ) : isMp4 ? (
        <video
          src={cleanUrl}
          autoPlay
          loop
          muted
          playsInline
          onLoadedData={() => setLoaded(true)}
          onError={() => setHasError(true)}
          className={`block w-full ${compact ? 'max-h-48' : 'max-h-64'} object-cover rounded-2xl transition-opacity duration-200 ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      ) : (
        <img
          src={cleanUrl}
          alt={alt}
          loading="eager"
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={() => setLoaded(true)}
          onError={() => setHasError(true)}
          className={`block w-full ${compact ? 'max-h-48' : 'max-h-64'} object-cover rounded-2xl transition-opacity duration-200 ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}

      {!hasError && (
        <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/65 text-white text-[9px] font-black tracking-wider uppercase pointer-events-none">
          GIF
        </span>
      )}
    </div>
  );
};
