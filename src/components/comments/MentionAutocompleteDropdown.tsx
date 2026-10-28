import React, { useState, useEffect, useRef } from 'react';
import {
  AtSign,
  X,
  Flame,
  Clock,
  Sparkles,
  TrendingUp,
  UserCheck,
  Check,
} from 'lucide-react';
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
  className?: string;
}

export const MentionAutocompleteDropdown: React.FC<MentionAutocompleteDropdownProps> = ({
  isOpen,
  query,
  candidates = [],
  onSelect,
  onClose,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'recent' | 'trending'>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const safeCandidates = Array.isArray(candidates) ? candidates : [];
  const cleanQuery = typeof query === 'string' ? query.toLowerCase().trim() : '';

  // Filter candidates based on activeTab and query
  const filteredCandidates = safeCandidates.filter((c) => {
    if (!c) return false;
    // Tab filter
    if (activeTab === 'recent' && c.category !== 'recent') return false;
    if (activeTab === 'trending' && c.category !== 'trending') return false;

    // Search query filter
    if (!cleanQuery) return true;
    const u = String(c.username || '').toLowerCase();
    const n = String(c.name || '').toLowerCase();
    const camp = String(c.campus || '').toLowerCase();
    return u.includes(cleanQuery) || n.includes(cleanQuery) || camp.includes(cleanQuery);
  });

  // Separate recent and trending for structured grouped view in 'all' tab
  const recentItems = filteredCandidates.filter((c) => c && c.category === 'recent');
  const trendingItems = filteredCandidates.filter((c) => c && c.category === 'trending');

  // Reset selected index when filtered list changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [cleanQuery, activeTab]);

  // Handle keyboard navigation: ArrowUp, ArrowDown, Enter, Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          filteredCandidates.length === 0 ? 0 : (prev + 1) % filteredCandidates.length
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          filteredCandidates.length === 0
            ? 0
            : (prev - 1 + filteredCandidates.length) % filteredCandidates.length
        );
      } else if (e.key === 'Enter') {
        if (filteredCandidates.length > 0 && selectedIndex >= 0 && selectedIndex < filteredCandidates.length) {
          const picked = filteredCandidates[selectedIndex];
          if (picked && picked.username) {
            e.preventDefault();
            onSelect(picked.username);
          }
        } else if (cleanQuery) {
          e.preventDefault();
          onSelect(cleanQuery);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCandidates, selectedIndex, onSelect, onClose, cleanQuery]);

  // Helper to highlight matching text in search results
  const renderHighlighted = (text?: string | null, q?: string | null) => {
    const safeText = String(text ?? '');
    const safeQ = typeof q === 'string' ? q.toLowerCase().trim() : '';
    if (!safeQ || !safeText) return <span>{safeText}</span>;
    const lower = safeText.toLowerCase();
    const idx = lower.indexOf(safeQ);
    if (idx === -1) return <span>{safeText}</span>;

    const before = safeText.slice(0, idx);
    const match = safeText.slice(idx, idx + safeQ.length);
    const after = safeText.slice(idx + safeQ.length);

    return (
      <span>
        {before}
        <strong className="text-[#5420F5] bg-[#F0EBFF] px-0.5 rounded underline decoration-[#5420F5]/50 font-bold">
          {match}
        </strong>
        {after}
      </span>
    );
  };

  const renderCandidateRow = (c: MentionStudentCandidate, index: number) => {
    if (!c) return null;
    const isSelected = selectedIndex === index;
    const safeName = c.name || c.username || 'Student';
    const safeUsername = (c.username || 'student').replace(/^@/, '');
    const initial = (safeName || safeUsername).charAt(0).toUpperCase() || 'S';

    return (
      <button
        key={c.id || `candidate-${index}`}
        type="button"
        onClick={() => onSelect(safeUsername)}
        onMouseEnter={() => setSelectedIndex(index)}
        className={`w-full flex items-center justify-between gap-2.5 p-2.5 rounded-xl text-left transition-all cursor-pointer group ${
          isSelected
            ? 'bg-[#F0EBFF] ring-1 ring-[#5420F5]/30 shadow-2xs'
            : 'hover:bg-slate-50'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Avatar */}
          {c.isAnon ? (
            <BopoiAnonymousAvatar size="xs" idPrefix={`mention-${c.id || index}`} />
          ) : (
            <CampusCharacterAvatar
              value={c.avatarUrl}
              seed={safeUsername}
              size={32}
              rounded="full"
              showRing
            />
          )}

          {/* Name & Handle */}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-black text-[#191525] group-hover:text-[#5420F5] truncate">
                {renderHighlighted(safeName, cleanQuery)}
              </span>
              {c.campus && (
                <span className="text-[9px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded shrink-0">
                  {c.campus}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xs font-bold text-[#5420F5]">
                @{renderHighlighted(safeUsername, cleanQuery)}
              </span>
              {c.detail && (
                <span className="text-[10px] text-slate-400 truncate">
                  • {c.detail}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Category Pill / Badge */}
        <div className="shrink-0 flex items-center gap-1">
          {c.category === 'trending' ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-full shadow-2xs">
              <Flame className="w-3 h-3 text-amber-600 fill-amber-500" />
              <span>{c.badge || 'Trending'}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full shadow-2xs">
              <Clock className="w-3 h-3 text-emerald-600" />
              <span>{c.badge || 'Recent'}</span>
            </span>
          )}
        </div>
      </button>
    );
  };

  if (!isOpen) return null;

  return (
    <div
      className={`bg-white/98 backdrop-blur-md border border-[#EAE6F0] rounded-2xl shadow-2xl p-2.5 space-y-2 z-40 max-w-full overflow-hidden transition-all ${className}`}
    >
      {/* 1. Header with Title & Quick Close */}
      <div className="flex items-center justify-between px-1 pb-1 border-b border-slate-100">
        <div className="flex items-center gap-1.5 text-xs font-black text-[#191525]">
          <div className="w-5 h-5 rounded-md bg-[#5420F5] text-white flex items-center justify-center">
            <AtSign className="w-3.5 h-3.5" />
          </div>
          <span>Mention a Student</span>
          {cleanQuery && (
            <span className="text-[11px] font-normal text-slate-400">
              searching "@{cleanQuery}"
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          title="Close mention dropdown (Esc)"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 2. Filter Category Pills (All, Recently Interacted, Trending) */}
      <div className="flex items-center gap-1.5 px-0.5 pt-0.5">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
            activeTab === 'all'
              ? 'bg-[#5420F5] text-white shadow-2xs'
              : 'bg-[#FAF9FC] text-slate-600 hover:bg-slate-100 border border-[#EAE6F0]'
          }`}
        >
          All ({candidates.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('recent')}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
            activeTab === 'recent'
              ? 'bg-emerald-600 text-white shadow-2xs'
              : 'bg-[#FAF9FC] text-slate-600 hover:bg-slate-100 border border-[#EAE6F0]'
          }`}
        >
          <Clock className="w-3 h-3" />
          <span>Recently Interacted</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('trending')}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
            activeTab === 'trending'
              ? 'bg-amber-500 text-white shadow-2xs'
              : 'bg-[#FAF9FC] text-slate-600 hover:bg-slate-100 border border-[#EAE6F0]'
          }`}
        >
          <Flame className="w-3 h-3" />
          <span>Trending on Campus</span>
        </button>
      </div>

      {/* 3. Candidates List (Scrollable) */}
      <div
        ref={listRef}
        className="max-h-60 overflow-y-auto space-y-2 pr-0.5 no-scrollbar"
      >
        {filteredCandidates.length === 0 ? (
          <div className="py-6 px-4 text-center space-y-2">
            <p className="text-xs text-slate-500 font-medium">
              No students found matching "<strong>@{cleanQuery}</strong>"
            </p>
            {cleanQuery && (
              <button
                type="button"
                onClick={() => onSelect(cleanQuery)}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#5420F5] text-white rounded-xl text-xs font-bold hover:bg-[#4314E2] transition-colors cursor-pointer shadow-2xs"
              >
                <span>Mention @{cleanQuery} anyway</span>
              </button>
            )}
          </div>
        ) : activeTab === 'all' && !cleanQuery ? (
          // Grouped Display: Recent first, then Trending
          <div className="space-y-3">
            {recentItems.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-black tracking-wider text-emerald-800 uppercase">
                  <Clock className="w-3 h-3 text-emerald-600" />
                  <span>Recently Interacted Students</span>
                </div>
                <div className="space-y-1">
                  {recentItems.map((c) =>
                    renderCandidateRow(
                      c,
                      filteredCandidates.findIndex((fc) => fc.id === c.id)
                    )
                  )}
                </div>
              </div>
            )}

            {trendingItems.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-black tracking-wider text-amber-800 uppercase">
                  <Flame className="w-3 h-3 text-amber-600" />
                  <span>Trending on Campus</span>
                </div>
                <div className="space-y-1">
                  {trendingItems.map((c) =>
                    renderCandidateRow(
                      c,
                      filteredCandidates.findIndex((fc) => fc.id === c.id)
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          // Flat list when filtering by query or tab
          <div className="space-y-1">
            {filteredCandidates.map((c, index) => renderCandidateRow(c, index))}
          </div>
        )}
      </div>

      {/* 4. Footer keyboard hint */}
      <div className="px-1.5 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
        <span>Use <strong>↑</strong> <strong>↓</strong> to navigate, <strong>Enter</strong> to select</span>
        <span>Esc to close</span>
      </div>
    </div>
  );
};
