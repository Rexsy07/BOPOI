import React, { useMemo, useState } from 'react';
import { Hash, Plus, X, Check } from 'lucide-react';
import { SocialPostType } from '../../types/index.ts';
import {
  getCategorySuggestedHashtags,
  normalizeHashtag,
  stripHashtagPrefix,
} from '../../utils/hashtags.ts';

interface HashtagPickerProps {
  selectedTags: string[];
  onChange: (nextTags: string[]) => void;
  category: string;
  postType?: SocialPostType;
  detectedInlineTags?: string[];
  trendingTags?: string[];
  maxTags?: number;
  label?: string;
  placeholder?: string;
}

export const HashtagPicker: React.FC<HashtagPickerProps> = ({
  selectedTags,
  onChange,
  category,
  postType,
  detectedInlineTags = [],
  trendingTags = [],
  maxTags = 6,
  label = 'Hashtags',
  placeholder = 'Type a tag (e.g. ExamWeek) and tap Add',
}) => {
  const [draftInput, setDraftInput] = useState('');

  const selectedLowerSet = useMemo(
    () => new Set(selectedTags.map((t) => normalizeHashtag(t).toLowerCase())),
    [selectedTags]
  );

  const inlineOnlyTags = useMemo(() => {
    const out: string[] = [];
    for (const raw of detectedInlineTags) {
      const norm = normalizeHashtag(raw);
      if (norm && !selectedLowerSet.has(norm.toLowerCase())) {
        out.push(norm);
      }
    }
    return out;
  }, [detectedInlineTags, selectedLowerSet]);

  const addTag = (raw: string): boolean => {
    const norm = normalizeHashtag(raw);
    if (!norm) return false;
    if (selectedLowerSet.has(norm.toLowerCase())) {
      setDraftInput('');
      return true;
    }
    if (selectedTags.length >= maxTags) return false;
    onChange([...selectedTags, norm]);
    setDraftInput('');
    return true;
  };

  const removeTag = (tagToRemove: string) => {
    const targetLower = normalizeHashtag(tagToRemove).toLowerCase();
    onChange(
      selectedTags.filter((t) => normalizeHashtag(t).toLowerCase() !== targetLower)
    );
  };

  const toggleSuggestion = (tag: string) => {
    const norm = normalizeHashtag(tag);
    if (!norm) return;
    if (selectedLowerSet.has(norm.toLowerCase())) {
      removeTag(norm);
    } else if (selectedTags.length < maxTags) {
      onChange([...selectedTags, norm]);
    }
  };

  // Build ordered suggestions: category presets + live campus trending tags
  const allSuggestions = useMemo(() => {
    const seen = new Set<string>();
    const combined: string[] = [];
    const pushUnique = (raw: string) => {
      const norm = normalizeHashtag(raw);
      if (!norm) return;
      const lower = norm.toLowerCase();
      if (seen.has(lower)) return;
      seen.add(lower);
      combined.push(norm);
    };

    getCategorySuggestedHashtags(category, postType).forEach(pushUnique);
    trendingTags.forEach(pushUnique);
    return combined;
  }, [category, postType, trendingTags]);

  // Live autocomplete matches when typing
  const cleanDraft = stripHashtagPrefix(draftInput);
  const matchingSuggestions = useMemo(() => {
    if (!cleanDraft) return allSuggestions.slice(0, 8);
    const q = cleanDraft.toLowerCase();
    return allSuggestions
      .filter((t) => t.toLowerCase().includes(q))
      .slice(0, 6);
  }, [allSuggestions, cleanDraft]);

  const canAddCustom =
    Boolean(normalizeHashtag(draftInput)) &&
    !selectedLowerSet.has(normalizeHashtag(draftInput).toLowerCase()) &&
    selectedTags.length < maxTags;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      if (draftInput.trim()) {
        e.preventDefault();
        addTag(draftInput);
      }
    } else if (e.key === 'Backspace' && !draftInput && selectedTags.length > 0) {
      e.preventDefault();
      onChange(selectedTags.slice(0, -1));
    }
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-700">{label}</label>
        <span className="text-[11px] font-semibold text-[#706B7D] tabular-nums">
          {selectedTags.length}/{maxTags} chosen
        </span>
      </div>

      {/* Selected tags + inline auto-detected tags */}
      {(selectedTags.length > 0 || inlineOnlyTags.length > 0) && (
        <div className="flex flex-wrap items-center gap-1.5">
          {selectedTags.map((raw) => {
            const tag = normalizeHashtag(raw) || raw;
            return (
              <button
                key={tag}
                type="button"
                onClick={() => removeTag(tag)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#5420F5] text-white text-xs font-bold cursor-pointer hover:bg-[#4314E2] transition-colors"
                title={`Remove ${tag}`}
              >
                <span>{tag}</span>
                <X className="w-3 h-3 opacity-85" />
              </button>
            );
          })}

          {inlineOnlyTags.map((tag) => (
            <span
              key={`inline-${tag}`}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#F0EBFF] text-[#5420F5] text-xs font-bold"
              title="Automatically detected from your post text"
            >
              <span>{tag}</span>
              <span className="text-[10px] font-semibold opacity-75">· in text</span>
            </span>
          ))}
        </div>
      )}

      {/* Tag input box (no need to manually type #) */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 min-w-0">
          <Hash className="w-3.5 h-3.5 text-[#5420F5] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={draftInput}
            onChange={(e) => {
              const val = e.target.value;
              // If user pastes or types a trailing space/comma, commit immediately
              if (val.endsWith(',') || (val.endsWith(' ') && val.trim().length >= 2)) {
                addTag(val.slice(0, -1));
              } else {
                setDraftInput(val);
              }
            }}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              if (draftInput.trim()) {
                addTag(draftInput);
              }
            }}
            disabled={selectedTags.length >= maxTags}
            placeholder={
              selectedTags.length >= maxTags
                ? `Max ${maxTags} hashtags reached`
                : placeholder
            }
            className="w-full pl-8 pr-3 py-2 bg-[#FAF9FC] border border-[#EAE6F0] rounded-xl text-base sm:text-xs font-semibold text-[#191525] placeholder:text-slate-400 focus:outline-none focus:border-[#5420F5] focus:bg-white transition-colors disabled:opacity-60"
          />
        </div>

        <button
          type="button"
          disabled={!canAddCustom}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => addTag(draftInput)}
          className="px-3 py-2 rounded-xl bg-[#F0EBFF] hover:bg-[#5420F5] text-[#5420F5] hover:text-white text-xs font-extrabold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1 shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add</span>
        </button>
      </div>

      {/* 1-tap suggested & matching hashtags */}
      {matchingSuggestions.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold text-[#706B7D] block">
            {cleanDraft ? 'Matching hashtags (tap to add):' : `Suggested for ${category} (tap to pick):`}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {matchingSuggestions.map((tag) => {
              const isActive = selectedLowerSet.has(tag.toLowerCase());
              const isDisabled = !isActive && selectedTags.length >= maxTags;
              return (
                <button
                  key={tag}
                  type="button"
                  disabled={isDisabled}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    if (!isDisabled) {
                      toggleSuggestion(tag);
                      if (cleanDraft) setDraftInput('');
                    }
                  }}
                  className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-colors cursor-pointer inline-flex items-center gap-1 border disabled:opacity-40 disabled:cursor-not-allowed ${
                    isActive
                      ? 'bg-[#191525] border-[#191525] text-white'
                      : 'bg-white border-[#EAE6F0] text-[#191525] hover:border-[#5420F5]/50 hover:text-[#5420F5]'
                  }`}
                >
                  {isActive && <Check className="w-3 h-3 stroke-[3]" />}
                  <span>{tag}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
