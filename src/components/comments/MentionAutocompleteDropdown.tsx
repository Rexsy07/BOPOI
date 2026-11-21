import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { BopoiAnonymousAvatar } from '../brand/BopoiAnonymousAvatar.tsx';
import { CampusCharacterAvatar } from '../brand/character/index.ts';

export interface MentionStudentCandidate {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string;
  campus?: string;
  isAnon?: boolean;
  category: 'recent' | 'trending';
  badge: string;
  detail?: string;
  followersCount?: number;
}

interface MentionAutocompleteDropdownProps {
  isOpen: boolean;
  query: string | null;
  candidates: MentionStudentCandidate[];
  onSelect: (username: string) => void;
  onClose: () => void;
  placement?: 'top' | 'bottom' | 'inline';
  className?: string;
}

export const MentionAutocompleteDropdown: React.FC<MentionAutocompleteDropdownProps> = ({
  isOpen,
  query,
  candidates = [],
  onSelect,
  onClose,
  placement = 'top',
  className = '',
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const safeCandidates = Array.isArray(candidates) ? candidates : [];
  const cleanQuery = typeof query === 'string' ? query.toLowerCase().trim() : '';

  const filteredCandidates = safeCandidates
    .filter((c) => {
      if (!c) return false;
      if (!cleanQuery) return true;
      const u = String(c.username || '').toLowerCase();
      const n = String(c.name || '').toLowerCase();
      const camp = String(c.campus || '').toLowerCase();
      return u.includes(cleanQuery) || n.includes(cleanQuery) || camp.includes(cleanQuery);
    })
    .slice(0, 8);

  useEffect(() => {
    setSelectedIndex(0);
  }, [cleanQuery, isOpen]);

  useEffect(() => {
    const activeBtn = itemRefs.current[selectedIndex];
    if (activeBtn) {
      activeBtn.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex((prev) =>
          filteredCandidates.length === 0 ? 0 : (prev + 1) % filteredCandidates.length
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex((prev) =>
          filteredCandidates.length === 0
            ? 0
            : (prev - 1 + filteredCandidates.length) % filteredCandidates.length
        );
      } else if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
        if (
          filteredCandidates.length > 0 &&
          selectedIndex >= 0 &&
          selectedIndex < filteredCandidates.length
        ) {
          const picked = filteredCandidates[selectedIndex];
          if (picked?.username) {
            e.preventDefault();
            e.stopPropagation();
            onSelect(picked.username);
          }
        } else if (cleanQuery) {
          e.preventDefault();
          e.stopPropagation();
          onSelect(cleanQuery);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, filteredCandidates, selectedIndex, onSelect, onClose, cleanQuery]);

  const renderHighlighted = (text?: string | null, q?: string | null) => {
    const safeText = String(text ?? '');
    const safeQ = typeof q === 'string' ? q.toLowerCase().trim() : '';
    if (!safeQ || !safeText) return <span>{safeText}</span>;
    const lower = safeText.toLowerCase();
    const idx = lower.indexOf(safeQ);
    if (idx === -1) return <span>{safeText}</span>;

    return (
      <span>
        {safeText.slice(0, idx)}
        <span className="text-[#5420F5] font-black">
          {safeText.slice(idx, idx + safeQ.length)}
        </span>
        {safeText.slice(idx + safeQ.length)}
      </span>
    );
  };

  if (!isOpen) return null;

  const placementClasses =
    placement === 'top'
      ? 'absolute bottom-full left-0 right-0 mb-2 z-50 animate-in fade-in slide-in-from-bottom-1 duration-150'
      : placement === 'bottom'
      ? 'absolute top-full left-0 right-0 mt-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150'
      : 'relative z-40 animate-in fade-in duration-150';

  return (
    <div
      role="listbox"
      aria-label="Mention suggestions"
      className={`${placementClasses} bg-white border border-[#EAE6F0] rounded-2xl shadow-[0_12px_32px_-8px_rgba(25,21,37,0.16)] overflow-hidden max-w-full ${className}`}
    >
      {/* Minimal hairline header */}
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-[#EAE6F0] bg-[#FAF9FC]/85 gap-2">
        <span className="text-[11px] font-bold text-[#706B7D] truncate">
          {cleanQuery ? `People matching "@${cleanQuery}"` : 'Mention someone'}
        </span>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClose();
          }}
          className="w-7 h-7 -mr-1.5 rounded-full flex items-center justify-center text-[#706B7D] hover:text-[#191525] hover:bg-white active:scale-95 transition-all cursor-pointer shrink-0"
          title="Close suggestions"
          aria-label="Close mention suggestions"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Hairline-divided student rows */}
      <div className="max-h-[min(220px,36dvh)] overflow-y-auto overscroll-contain no-scrollbar divide-y divide-[#EAE6F0]/70">
        {filteredCandidates.length === 0 ? (
          <div className="px-3.5 py-3 flex items-center justify-between gap-2 text-xs">
            <span className="text-[#706B7D] truncate">
              No matches{cleanQuery ? ` for @${cleanQuery}` : ''}
            </span>
            {cleanQuery && (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onSelect(cleanQuery);
                }}
                className="px-2.5 py-1.5 rounded-xl bg-[#FAF9FC] hover:bg-[#F0EBFF] border border-[#EAE6F0] text-[#5420F5] font-bold transition-colors cursor-pointer shrink-0"
              >
                Use @{cleanQuery}
              </button>
            )}
          </div>
        ) : (
          filteredCandidates.map((c, index) => {
            const isSelected = selectedIndex === index;
            const safeName = c.name || c.username || 'Student';
            const safeUsername = (c.username || 'student').replace(/^@/, '');

            return (
              <button
                key={c.id || `mention-${safeUsername}-${index}`}
                ref={(el) => {
                  itemRefs.current[index] = el;
                }}
                type="button"
                role="option"
                aria-selected={isSelected}
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onSelect(safeUsername);
                }}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`w-full min-h-[48px] flex items-center gap-2.5 px-3.5 py-2 text-left transition-colors cursor-pointer ${
                  isSelected ? 'bg-[#FAF8FF]' : 'bg-white hover:bg-[#FAF9FC]'
                }`}
              >
                {c.isAnon ? (
                  <BopoiAnonymousAvatar size="xs" idPrefix={`mention-${c.id || index}`} />
                ) : (
                  <CampusCharacterAvatar
                    value={c.avatarUrl}
                    seed={safeUsername}
                    size={32}
                    rounded="full"
                    className="ring-1 ring-[#EAE6F0] shrink-0"
                  />
                )}

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black text-[#191525] truncate leading-tight">
                    {renderHighlighted(safeName, cleanQuery)}
                  </p>
                  <p className="text-[11px] text-[#706B7D] truncate mt-0.5 leading-tight">
                    <span className="font-semibold text-[#5420F5]">
                      @{renderHighlighted(safeUsername, cleanQuery)}
                    </span>
                    {c.campus && <span> · {c.campus}</span>}
                  </p>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
