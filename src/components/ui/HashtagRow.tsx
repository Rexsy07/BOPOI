import React from 'react';
import { useBopoi } from '../../context/BopoiContext.tsx';
import { normalizeHashtag } from '../../utils/hashtags.ts';

interface HashtagRowProps {
  hashtags?: string[];
  maxVisible?: number;
  activeTag?: string | null;
  onTagClick?: (tag: string) => void;
  size?: 'sm' | 'md';
  className?: string;
}

export const HashtagRow: React.FC<HashtagRowProps> = ({
  hashtags,
  maxVisible = 6,
  activeTag,
  onTagClick,
  size = 'sm',
  className = '',
}) => {
  const { openHashtag } = useBopoi();
  const handleClick = onTagClick || openHashtag;

  if (!hashtags || hashtags.length === 0) return null;

  const seen = new Set<string>();
  const normalizedTags: string[] = [];
  for (const raw of hashtags) {
    const norm = normalizeHashtag(raw);
    if (!norm) continue;
    const lower = norm.toLowerCase();
    if (seen.has(lower)) continue;
    seen.add(lower);
    normalizedTags.push(norm);
    if (normalizedTags.length >= maxVisible) break;
  }

  if (normalizedTags.length === 0) return null;

  const activeLower = activeTag ? normalizeHashtag(activeTag).toLowerCase() : '';

  return (
    <div className={`flex flex-wrap items-center gap-x-2.5 gap-y-1 ${className}`}>
      {normalizedTags.map((tag) => {
        const isCurrent = Boolean(activeLower && tag.toLowerCase() === activeLower);
        return (
          <button
            key={tag}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleClick(tag);
            }}
            className={`transition-colors cursor-pointer font-bold hover:underline underline-offset-2 text-left ${
              size === 'md' ? 'text-xs' : 'text-[11px]'
            } ${
              isCurrent
                ? 'text-[#191525] underline'
                : 'text-[#5420F5] hover:text-[#3810BC]'
            }`}
            title={`Explore posts & rooms tagged ${tag}`}
          >
            {tag}
          </button>
        );
      })}
    </div>
  );
};
