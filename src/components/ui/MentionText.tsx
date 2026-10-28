import React from 'react';
import { useBopoi } from '../../context/BopoiContext.tsx';

interface MentionTextProps {
  text: string;
  className?: string;
  onMentionClick?: (username: string) => void;
}

export const MentionText: React.FC<MentionTextProps> = ({
  text,
  className = '',
  onMentionClick,
}) => {
  const { viewUserProfile } = useBopoi();
  const handleClick = onMentionClick || viewUserProfile;

  if (!text || typeof text !== 'string') return null;

  // Split text by @username tokens (letters, numbers, underscore, dot, hyphen)
  // Keep the delimiter so parts alternate between normal text and @mentions
  const mentionRegex = /(@[a-zA-Z0-9_.-]+)/g;
  const parts = text.split(mentionRegex);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.startsWith('@') && part.length > 1) {
          const username = part.slice(1);
          return (
            <button
              type="button"
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                handleClick(username);
              }}
              className="inline-flex items-center text-[#5420F5] hover:text-[#3810BC] bg-[#F0EBFF] hover:bg-[#E4D9FF] font-black px-1.5 py-0.5 rounded-md transition-all cursor-pointer align-baseline mx-0.5 ring-1 ring-[#5420F5]/25 hover:ring-[#5420F5]/50 shadow-2xs group text-[11px] sm:text-xs"
              title={`View @${username}'s student profile`}
            >
              <span className="text-[#5420F5] group-hover:scale-110 transition-transform mr-0.5">@</span>
              <span className="underline-offset-2 hover:underline">{username}</span>
            </button>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </span>
  );
};
