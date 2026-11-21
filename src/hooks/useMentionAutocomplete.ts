import React, { useState, useCallback, useEffect } from 'react';
import { CreatorProfile, UserProfile } from '../types/index.ts';
import type { MentionStudentCandidate } from '../components/comments/MentionAutocompleteDropdown.tsx';

export interface ActiveMentionMatch {
  query: string;
  atIndex: number;
  endIndex: number;
}

const RECENT_MENTIONS_KEY = 'bopoi_recent_mentions';

export function extractMentionAtCursor(
  text: string,
  cursorPos?: number | null
): ActiveMentionMatch | null {
  if (!text || typeof text !== 'string') return null;
  const caret =
    typeof cursorPos === 'number' && cursorPos >= 0 && cursorPos <= text.length
      ? cursorPos
      : text.length;
  const beforeCursor = text.slice(0, caret);
  const match = beforeCursor.match(/(?:^|[\s([{"'])@([a-zA-Z0-9_.-]*)$/);
  if (!match) return null;
  const query = match[1] ?? '';
  const atIndex = caret - query.length - 1;
  if (atIndex < 0 || text[atIndex] !== '@') return null;
  return {
    query,
    atIndex,
    endIndex: caret,
  };
}

export function getRecentMentionUsernames(): string[] {
  try {
    const saved = localStorage.getItem(RECENT_MENTIONS_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed)
      ? parsed.map((u) => String(u).replace(/^@/, '').toLowerCase().trim()).filter(Boolean)
      : [];
  } catch {
    return [];
  }
}

export function recordRecentMention(username: string): void {
  try {
    const clean = username.replace(/^@/, '').toLowerCase().trim();
    if (!clean) return;
    const list = getRecentMentionUsernames();
    const updated = [clean, ...list.filter((u) => u !== clean)].slice(0, 12);
    localStorage.setItem(RECENT_MENTIONS_KEY, JSON.stringify(updated));
  } catch {
    // ignore storage quota errors
  }
}

export interface MentionParticipantInput {
  id?: string;
  name?: string;
  username?: string;
  avatarUrl?: string;
  campus?: string;
  isAnon?: boolean;
  badge?: string;
  detail?: string;
}

export function buildMentionCandidates(options: {
  creators?: CreatorProfile[];
  accounts?: UserProfile[];
  participants?: MentionParticipantInput[];
  excludeUsername?: string;
}): MentionStudentCandidate[] {
  const { creators = [], accounts = [], participants = [], excludeUsername } = options;
  const list: MentionStudentCandidate[] = [];
  const seen = new Set<string>();
  const skipLower = (excludeUsername || '').replace(/^@/, '').toLowerCase().trim();

  const isValidHandle = (u: string) =>
    Boolean(u && u !== 'anonymous' && u !== 'anon' && u !== 'anon_student' && u !== 'student' && u !== skipLower);

  // 1. Thread / room active participants first
  participants.forEach((p, idx) => {
    if (!p || p.isAnon) return;
    const u = (p.username || '').replace(/^@/, '').toLowerCase().trim();
    if (isValidHandle(u) && !seen.has(u)) {
      seen.add(u);
      list.push({
        id: p.id || `participant-${u}-${idx}`,
        name: p.name || u,
        username: u,
        avatarUrl: p.avatarUrl,
        campus: p.campus || 'Campus',
        isAnon: false,
        category: 'recent',
        badge: p.badge || 'In Thread',
        detail: p.detail || p.campus || 'Active here',
      });
    }
  });

  // 2. Recently mentioned students from localStorage
  const recentHandles = getRecentMentionUsernames();
  recentHandles.forEach((clean) => {
    if (!isValidHandle(clean) || seen.has(clean)) return;
    const matchedCreator = creators.find((c) => c?.username?.toLowerCase() === clean);
    const matchedAccount = !matchedCreator
      ? accounts.find((a) => a?.username?.toLowerCase() === clean)
      : undefined;

    if (matchedCreator) {
      seen.add(clean);
      list.push({
        id: `recent-${clean}`,
        name: matchedCreator.name || clean,
        username: clean,
        avatarUrl: matchedCreator.avatarUrl,
        campus: matchedCreator.campus || 'Campus',
        category: 'recent',
        badge: 'Recently Mentioned',
        detail: matchedCreator.campus || 'Campus Student',
        followersCount: matchedCreator.followersCount || 0,
      });
    } else if (matchedAccount) {
      seen.add(clean);
      list.push({
        id: `recent-${clean}`,
        name: matchedAccount.displayName || clean,
        username: clean,
        avatarUrl: matchedAccount.avatarUrl,
        campus: matchedAccount.campus || 'Campus',
        category: 'recent',
        badge: 'Recently Mentioned',
        detail: matchedAccount.campus || 'Campus Student',
        followersCount: matchedAccount.followersCount || 0,
      });
    }
  });

  // 3. Creators ranked by followers
  const sortedCreators = [...creators]
    .filter((c) => Boolean(c && c.username))
    .sort((a, b) => (b.followersCount || 0) - (a.followersCount || 0));

  sortedCreators.forEach((cr, idx) => {
    const u = (cr.username || '').replace(/^@/, '').toLowerCase().trim();
    if (isValidHandle(u) && !seen.has(u)) {
      seen.add(u);
      list.push({
        id: cr.id || `creator-${idx}`,
        name: cr.name || u,
        username: u,
        avatarUrl: cr.avatarUrl,
        campus: cr.campus || 'Campus',
        category: 'trending',
        badge: idx < 3 ? `#${idx + 1} Trending` : 'Campus Student',
        detail: `${(cr.followersCount || 0).toLocaleString()} followers`,
        followersCount: cr.followersCount || 0,
      });
    }
  });

  // 4. Registered accounts not already listed
  accounts.forEach((acc, idx) => {
    if (!acc || !acc.username) return;
    const u = acc.username.replace(/^@/, '').toLowerCase().trim();
    if (isValidHandle(u) && !seen.has(u)) {
      seen.add(u);
      list.push({
        id: acc.id || `acc-${idx}`,
        name: acc.displayName || u,
        username: u,
        avatarUrl: acc.avatarUrl,
        campus: acc.campus || 'Campus',
        category: 'trending',
        badge: 'Campus Student',
        detail: acc.campus || 'Campus Student',
        followersCount: acc.followersCount || 0,
      });
    }
  });

  return list;
}

interface UseMentionAutocompleteOptions {
  text: string;
  setText: (next: string) => void;
  inputRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
}

export function useMentionAutocomplete({
  text,
  setText,
  inputRef,
}: UseMentionAutocompleteOptions) {
  const [cursorPos, setCursorPos] = useState<number | null>(null);
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [dismissedAtIndex, setDismissedAtIndex] = useState<number | null>(null);

  const activeMatch = extractMentionAtCursor(text, cursorPos);

  useEffect(() => {
    if (dismissedAtIndex !== null && (!text || text[dismissedAtIndex] !== '@')) {
      setDismissedAtIndex(null);
    }
  }, [text, dismissedAtIndex]);

  const isQueryActive = Boolean(activeMatch && activeMatch.atIndex !== dismissedAtIndex);
  const isOpen = isQueryActive || isManualOpen;
  const query = activeMatch ? activeMatch.query : isManualOpen ? '' : null;

  const syncCursorFromEvent = useCallback(
    (el: HTMLInputElement | HTMLTextAreaElement | null) => {
      if (!el) return;
      if (typeof el.selectionStart === 'number') {
        setCursorPos(el.selectionStart);
      }
    },
    []
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const nextVal = e.target.value;
      const nextCaret =
        typeof e.target.selectionStart === 'number' ? e.target.selectionStart : nextVal.length;

      if (dismissedAtIndex !== null && (!nextVal || nextVal[dismissedAtIndex] !== '@')) {
        setDismissedAtIndex(null);
      }

      setText(nextVal);
      setCursorPos(nextCaret);
    },
    [setText, dismissedAtIndex]
  );

  const dismiss = useCallback(() => {
    setIsManualOpen(false);
    if (activeMatch) {
      setDismissedAtIndex(activeMatch.atIndex);
    }
  }, [activeMatch]);

  const reset = useCallback(() => {
    setIsManualOpen(false);
    setDismissedAtIndex(null);
    setCursorPos(null);
  }, []);

  const openPicker = useCallback(() => {
    setDismissedAtIndex(null);
    setIsManualOpen(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [inputRef]);

  const togglePicker = useCallback(() => {
    if (isOpen) {
      dismiss();
    } else {
      openPicker();
    }
  }, [isOpen, dismiss, openPicker]);

  const insertMention = useCallback(
    (rawUsername: string) => {
      const clean = (rawUsername || '').replace(/^@/, '').trim();
      if (!clean) return;
      recordRecentMention(clean);

      const el = inputRef.current;
      const currentText = text || '';
      const caret =
        cursorPos !== null && cursorPos <= currentText.length
          ? cursorPos
          : el && typeof el.selectionStart === 'number'
          ? el.selectionStart
          : currentText.length;

      const match = extractMentionAtCursor(currentText, caret);
      let nextText = '';
      let nextCaret = 0;

      if (match) {
        const before = currentText.slice(0, match.atIndex);
        const after = currentText.slice(match.endIndex).replace(/^\s+/, '');
        const inserted = `@${clean} `;
        nextText = `${before}${inserted}${after}`;
        nextCaret = before.length + inserted.length;
      } else {
        const before = currentText.slice(0, caret);
        const after = currentText.slice(caret);
        const needsLeadingSpace = before.length > 0 && !/[\s([{"']$/.test(before);
        const spacer = needsLeadingSpace ? ' ' : '';
        const needsTrailingSpace = !after.startsWith(' ');
        const inserted = `${spacer}@${clean}${needsTrailingSpace ? ' ' : ''}`;
        nextText = `${before}${inserted}${after}`;
        nextCaret = before.length + inserted.length;
      }

      setText(nextText);
      setIsManualOpen(false);
      setDismissedAtIndex(null);
      setCursorPos(nextCaret);

      requestAnimationFrame(() => {
        const node = inputRef.current;
        if (node) {
          node.focus();
          try {
            node.setSelectionRange(nextCaret, nextCaret);
          } catch {
            // ignore inputs without selectionRange support
          }
        }
      });
    },
    [text, cursorPos, setText, inputRef]
  );

  return {
    isOpen,
    query,
    activeMatch,
    dismiss,
    reset,
    openPicker,
    togglePicker,
    insertMention,
    handleChange,
    syncCursorFromEvent,
  };
}
