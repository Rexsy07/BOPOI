import React from 'react';
import { useBopoi } from '../../context/BopoiContext.tsx';
import { normalizeHashtag } from '../../utils/hashtags.ts';

interface MentionTextProps {
  text: string;
  className?: string;
  onMentionClick?: (username: string) => void;
  onHashtagClick?: (hashtag: string) => void;
  tone?: 'default' | 'inverted';
}

export const MentionText: React.FC<MentionTextProps> = ({
  text,
  className = '',
  onMentionClick,
  onHashtagClick,
  tone = 'default',
}) => {
  const { viewUserProfile, openHashtag } = useBopoi();
  const handleMentionClick = onMentionClick || viewUserProfile;
  const handleHashtagClick = onHashtagClick || openHashtag;

  if (!text || typeof text !== 'string') return null;

  // Match @mentions (without capturing trailing punctuation) and #hashtags at word/punctuation boundaries
  const tokenRegex = /(@[a-zA-Z0-9_](?:[a-zA-Z0-9_.-]*[a-zA-Z0-9_])?|#[a-zA-Z][a-zA-Z0-9_]{1,27}\b)/g;
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let keyIdx = 0;

  while ((match = tokenRegex.exec(text)) !== null) {
    const token = match[0];
    const start = match.index;
    const prevChar = start > 0 ? text[start - 1] : '';
    const isBoundary = start === 0 || /[\s([{"']/.test(prevChar);

    if (!isBoundary) {
      continue;
    }

    if (start > lastIndex) {
      nodes.push(<span key={`txt-${keyIdx++}`}>{text.slice(lastIndex, start)}</span>);
    }

    if (token.startsWith('@') && token.length > 1) {
      const username = token.slice(1);
      nodes.push(
        <button
          type="button"
          key={`m-${keyIdx++}`}
          onClick={(e) => {
            e.stopPropagation();
            handleMentionClick(username);
          }}
          className={
            tone === 'inverted'
              ? 'inline font-bold text-white bg-white/18 hover:bg-white/28 px-1 rounded-[5px] transition-colors cursor-pointer align-baseline underline decoration-white/40 hover:decoration-white underline-offset-2'
              : 'inline font-bold text-[#5420F5] hover:text-[#3A10B5] bg-[#5420F5]/[0.07] hover:bg-[#5420F5]/[0.14] px-1 rounded-[5px] transition-colors cursor-pointer align-baseline hover:underline underline-offset-2 decoration-[#5420F5]/45'
          }
          title={`View @${username}'s profile`}
        >
          @{username}
        </button>
      );
    } else if (token.startsWith('#')) {
      const normalized = normalizeHashtag(token);
      if (normalized) {
        nodes.push(
          <button
            type="button"
            key={`h-${keyIdx++}`}
            onClick={(e) => {
              e.stopPropagation();
              handleHashtagClick(normalized);
            }}
            className={
              tone === 'inverted'
                ? 'inline font-bold text-white underline decoration-white/60 hover:decoration-white cursor-pointer transition-colors align-baseline'
                : 'inline font-bold text-[#5420F5] hover:text-[#3A10B5] hover:underline underline-offset-2 cursor-pointer transition-colors align-baseline'
            }
            title={`Explore posts & rooms tagged ${normalized}`}
          >
            {token}
          </button>
        );
      } else {
        nodes.push(<span key={`raw-${keyIdx++}`}>{token}</span>);
      }
    }

    lastIndex = start + token.length;
  }

  if (lastIndex < text.length) {
    nodes.push(<span key={`txt-${keyIdx++}`}>{text.slice(lastIndex)}</span>);
  }

  return <span className={className}>{nodes}</span>;
};
