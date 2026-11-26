import React from 'react';
import { X } from 'lucide-react';
import { QuotedPostPreview } from '../../types/index.ts';
import { BopoiAnonymousAvatar } from '../brand/BopoiAnonymousAvatar.tsx';
import { CampusCharacterAvatar } from '../brand/character/index.ts';
import { MentionText } from '../ui/MentionText.tsx';
import { GifPreviewMedia } from '../ui/GifPreviewMedia.tsx';

interface QuotedPostCardProps {
  quote: QuotedPostPreview;
  onOpen?: (e: React.MouseEvent) => void;
  onRemove?: () => void;
  compact?: boolean;
}

export const QuotedPostCard: React.FC<QuotedPostCardProps> = ({
  quote,
  onOpen,
  onRemove,
  compact = false,
}) => {
  return (
    <div
      onClick={onOpen}
      className={`rounded-2xl border border-[#EAE6F0] dark:border-[#262036] bg-[#FAF9FC]/80 dark:bg-[#171322] p-3 space-y-1.5 transition-colors ${
        onOpen
          ? 'hover:border-[#5420F5]/40 dark:hover:border-[#7C5CFF]/50 hover:bg-[#FAF8FF] dark:hover:bg-[#1E192D] cursor-pointer'
          : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          {quote.isAnonymous ? (
            <BopoiAnonymousAvatar size="xs" idPrefix={`quote-${quote.id}`} />
          ) : (
            <CampusCharacterAvatar
              value={quote.authorAvatar}
              seed={quote.authorUsername}
              size={20}
              rounded="full"
              className="ring-1 ring-[#EAE6F0] dark:ring-[#262036] shrink-0"
            />
          )}
          <span className="text-xs font-black text-[#191525] dark:text-[#F4F2FA] truncate">
            {quote.isAnonymous ? 'Anonymous Student' : quote.authorName}
          </span>
          {!quote.isAnonymous && quote.authorUsername && (
            <span className="text-[11px] text-[#706B7D] dark:text-[#9E97B3] truncate">
              @{quote.authorUsername}
            </span>
          )}
          <span className="text-[11px] text-[#706B7D] dark:text-[#9E97B3] shrink-0">
            · {quote.createdAt}
          </span>
        </div>

        {onRemove && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="p-1 rounded-full text-[#706B7D] dark:text-[#9E97B3] hover:text-[#191525] dark:hover:text-white hover:bg-white dark:hover:bg-[#0E0C14] transition-colors cursor-pointer shrink-0"
            title="Remove quoted post"
            aria-label="Remove quoted post"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {quote.title && (
        <p className="text-xs font-black text-[#191525] dark:text-[#F4F2FA] leading-snug line-clamp-1">
          <MentionText text={quote.title} />
        </p>
      )}

      {quote.content && (
        <p
          className={`text-xs text-[#191525]/90 dark:text-[#E2DCF2] leading-relaxed whitespace-pre-wrap break-words ${
            compact ? 'line-clamp-2' : 'line-clamp-4'
          }`}
        >
          <MentionText text={quote.content} />
        </p>
      )}

      {quote.mediaUrl && (
        <div className="pt-1">
          {quote.mediaType === 'video' ? (
            <video
              src={quote.mediaUrl}
              controls
              playsInline
              onClick={(e) => e.stopPropagation()}
              className={`block w-full max-w-[260px] ${compact ? 'max-h-44' : 'max-h-56'} rounded-xl object-cover border border-black/10 dark:border-[#262036]`}
            />
          ) : quote.mediaType === 'image' ? (
            <img
              src={quote.mediaUrl}
              alt={quote.content || quote.title || 'Attached media'}
              loading="lazy"
              className={`block w-full max-w-[260px] ${compact ? 'max-h-44' : 'max-h-56'} rounded-xl object-cover border border-black/10 dark:border-[#262036]`}
            />
          ) : (
            <GifPreviewMedia
              url={quote.mediaUrl}
              alt={quote.content || quote.title || 'Reposted GIF'}
              compact
            />
          )}
        </div>
      )}
    </div>
  );
};
