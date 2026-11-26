import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useBopoi } from '../../context/BopoiContext.tsx';
import { CommunityRoom, RoomActiveMember } from '../../types/index.ts';
import { searchAndRankRooms } from '../../lib/supabase.ts';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Plus,
  X,
  Lock,
  Search,
  MessagesSquare,
  TrendingUp,
  Flame,
} from 'lucide-react';
import { BopoiIcon, RoomBadgeIcon } from '../brand/icons/index.ts';
import { PersonaMaskIcon } from '../brand/masks/index.ts';

type RoomsPrimaryTab = 'all' | 'live' | 'joined';

interface TopicOption {
  id: string;
  label: string;
  matchKey: string;
}

const TOPIC_OPTIONS: TopicOption[] = [
  { id: 'campus', label: 'Campus Life', matchKey: 'Campus Life & Academics' },
  { id: 'study', label: 'Study', matchKey: 'Study & Exam Survival' },
  { id: 'hostel', label: 'Hostel & Food', matchKey: 'Hostel & Dorm (Food)' },
  { id: 'coffee', label: 'Coffee & Chill', matchKey: 'Coffee & Chill' },
  { id: 'midnight', label: 'Midnight Chat', matchKey: 'Midnight Chat / Late Night' },
  { id: 'dating', label: 'Dating', matchKey: 'Dating & Romance' },
  { id: 'tech', label: 'Tech', matchKey: 'Tech & Coding' },
  { id: 'gaming', label: 'Gaming', matchKey: 'Gaming & Entertainment' },
  { id: 'music', label: 'Music', matchKey: 'Music & Podcasts' },
  { id: 'sports', label: 'Sports', matchKey: 'Campus Sports' },
  { id: 'ideas', label: 'Ideas', matchKey: 'Ideas & Life Hacks' },
  { id: 'trending', label: 'Trending', matchKey: 'Launch & Trending' },
];

const LAST_SEEN_STORAGE_KEY = 'bopoi_rooms_last_seen_v1';
const LIVE_PRESENCE_WINDOW_MS = 2.5 * 60 * 1000;
const LIVE_CHAT_WINDOW_MS = 15 * 60 * 1000;
const TRENDING_MEMBER_THRESHOLD = 25;
const HIGH_ACTIVITY_MEMBER_THRESHOLD = 8;

type RoomActivityTier = 'trending' | 'high-activity' | null;

function getRoomActivityTier(room: CommunityRoom): RoomActivityTier {
  const count = room.membersCount ?? 0;
  if (count >= TRENDING_MEMBER_THRESHOLD) return 'trending';
  if (count >= HIGH_ACTIVITY_MEMBER_THRESHOLD) return 'high-activity';
  return null;
}

function loadLastSeenMap(): Record<string, number> {
  try {
    if (typeof window === 'undefined') return {};
    const raw = localStorage.getItem(LAST_SEEN_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveLastSeenRoom(roomId: string, ts: number) {
  try {
    if (typeof window === 'undefined') return;
    const map = loadLastSeenMap();
    map[roomId] = ts;
    localStorage.setItem(LAST_SEEN_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

function getFreshActiveMembers(room: CommunityRoom, nowMs: number): RoomActiveMember[] {
  const members = room.activeMembers || [];
  return members.filter((m) => nowMs - (m.lastSeenAt || 0) < LIVE_PRESENCE_WINDOW_MS);
}

function getLiveOnlineCount(room: CommunityRoom, nowMs: number): number {
  const fresh = getFreshActiveMembers(room, nowMs);
  if (fresh.length > 0) return fresh.length;
  return Math.max(0, room.onlineCount ?? 0);
}

function isRoomActiveNow(room: CommunityRoom, nowMs: number): boolean {
  if (getLiveOnlineCount(room, nowMs) > 0) return true;
  const msgs = room.messages || [];
  if (msgs.length === 0) return false;
  const latestTs = msgs[msgs.length - 1]?.createdTimestamp || 0;
  return latestTs > 0 && nowMs - latestTs < LIVE_CHAT_WINDOW_MS;
}

function getRoomMomentumScore(room: CommunityRoom, nowMs: number): number {
  const liveCount = getLiveOnlineCount(room, nowMs);
  const recentMsgBonus = (room.messages || []).some(
    (m) => nowMs - (m.createdTimestamp || 0) < LIVE_CHAT_WINDOW_MS
  )
    ? 6
    : 0;
  return liveCount * 10 + recentMsgBonus + (room.messages?.length || 0);
}

function roomMatchesTopic(room: CommunityRoom, matchKey: string): boolean {
  if (matchKey === 'All') return true;
  const rc = (room.category || '').toLowerCase().trim();
  const ac = matchKey.toLowerCase().trim();
  if (rc === ac) return true;

  return (
    (ac.includes('campus life') && (rc.includes('campus') || rc.includes('academic'))) ||
    (ac.includes('study') && rc.includes('study')) ||
    (ac.includes('hostel') && (rc.includes('hostel') || rc.includes('food') || rc.includes('lifestyle'))) ||
    (ac.includes('coffee') && (rc.includes('coffee') || rc.includes('chill'))) ||
    (ac.includes('gaming') && (rc.includes('gaming') || rc.includes('entertainment'))) ||
    (ac.includes('music') && (rc.includes('music') || rc.includes('podcast'))) ||
    (ac.includes('tech') && (rc.includes('tech') || rc.includes('coding'))) ||
    (ac.includes('sports') && (rc.includes('sports') || rc.includes('football'))) ||
    (ac.includes('midnight') && (rc.includes('midnight') || rc.includes('confession'))) ||
    (ac.includes('ideas') && (rc.includes('ideas') || rc.includes('hacks'))) ||
    (ac.includes('dating') && (rc.includes('dating') || rc.includes('romance') || rc.includes('lifestyle'))) ||
    (ac.includes('launch') && (rc.includes('launch') || rc.includes('trending')))
  );
}

function filterRoomsByNameOrTopic(
  list: CommunityRoom[],
  query: string,
  preferredCategories: Set<string>
): CommunityRoom[] {
  const q = query.trim();
  if (!q) return list;

  const ranked = searchAndRankRooms(list, q, { preferredCategories });
  const rankedIds = new Set(ranked.map((r) => r.id));
  const qLower = q.toLowerCase();

  // Also include rooms whose mapped topic label matches the typed query directly
  const extraTopicMatches = list.filter((room) => {
    if (rankedIds.has(room.id)) return false;
    return TOPIC_OPTIONS.some(
      (topic) =>
        roomMatchesTopic(room, topic.matchKey) &&
        (topic.label.toLowerCase().includes(qLower) ||
          topic.matchKey.toLowerCase().includes(qLower))
    );
  });

  return [...ranked, ...extraTopicMatches];
}

function getRoomPreview(room: CommunityRoom): string {
  const msgs = room.messages || [];
  const latestMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;
  if (latestMsg) {
    const text =
      latestMsg.text?.trim() ||
      (latestMsg.mediaType === 'gif'
        ? 'Sent a GIF'
        : latestMsg.mediaType === 'video'
        ? 'Shared a video'
        : 'Shared a photo');
    const author = latestMsg.authorAlias || latestMsg.authorName;
    return `${author}: ${text}`;
  }
  return room.description || 'Open room — jump in behind a mask';
}

function getPreviewAvatars(
  room: CommunityRoom,
  nowMs: number
): Array<{ key: string; alias: string; mask: string; isOnline: boolean }> {
  const freshMembers = getFreshActiveMembers(room, nowMs);
  if (freshMembers.length > 0) {
    return freshMembers.slice(0, 3).map((m) => ({
      key: m.userId,
      alias: m.alias,
      mask: m.maskId || m.maskEmoji || 'masked-student',
      isOnline: true,
    }));
  }

  // Fallback only if someone literally chatted within the 15-min live window,
  // shown WITHOUT an active glowing dot since presence isn't confirmed live.
  const msgs = room.messages || [];
  const seen = new Set<string>();
  const speakers: Array<{ key: string; alias: string; mask: string; isOnline: boolean }> = [];
  for (let i = msgs.length - 1; i >= 0; i--) {
    const m = msgs[i];
    if (nowMs - (m.createdTimestamp || 0) >= LIVE_CHAT_WINDOW_MS) continue;
    const alias = (m.authorAlias || m.authorName || 'Masked Student').trim();
    if (!seen.has(alias)) {
      seen.add(alias);
      speakers.push({
        key: `${room.id}-sp-${i}`,
        alias,
        mask: m.authorMaskEmoji || alias || 'masked-student',
        isOnline: false,
      });
    }
    if (speakers.length >= 3) break;
  }
  return speakers;
}

export const RoomsView: React.FC = () => {
  const {
    rooms,
    socialPosts,
    toggleJoinRoom,
    enterRoom,
    goBack,
    setIsCreateRoomModalOpen,
  } = useBopoi();

  const [primaryTab, setPrimaryTab] = useState<RoomsPrimaryTab>('all');
  const [activeTopicKey, setActiveTopicKey] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAllCategories, setShowAllCategories] = useState<boolean>(false);
  const [lastSeenMap, setLastSeenMap] = useState<Record<string, number>>(() =>
    loadLastSeenMap()
  );
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keep relative live windows re-evaluating cleanly every 30s
  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const joinedCount = useMemo(
    () => rooms.filter((r) => Boolean(r.isJoined)).length,
    [rooms]
  );

  const liveCount = useMemo(
    () => rooms.filter((r) => isRoomActiveNow(r, nowMs)).length,
    [rooms, nowMs]
  );

  const preferredCategories = useMemo(() => {
    const set = new Set<string>();
    for (const p of socialPosts || []) {
      if ((p.hasLiked || p.isBookmarked) && p.category) {
        set.add(p.category.toLowerCase());
      }
    }
    return set;
  }, [socialPosts]);

  const activeNowRooms = useMemo(() => {
    const liveRooms = rooms.filter(
      (r) => isRoomActiveNow(r, nowMs) && roomMatchesTopic(r, activeTopicKey)
    );
    const filtered = searchQuery.trim()
      ? filterRoomsByNameOrTopic(liveRooms, searchQuery, preferredCategories)
      : [...liveRooms].sort((a, b) => {
          const bOnline = getLiveOnlineCount(b, nowMs);
          const aOnline = getLiveOnlineCount(a, nowMs);
          if (bOnline !== aOnline) return bOnline - aOnline;
          return getRoomMomentumScore(b, nowMs) - getRoomMomentumScore(a, nowMs);
        });
    return filtered.slice(0, searchQuery.trim() ? 6 : 4);
  }, [rooms, nowMs, activeTopicKey, searchQuery, preferredCategories]);

  const categoryCards = useMemo(() => {
    const list: TopicOption[] = [...TOPIC_OPTIONS];
    for (const r of rooms) {
      const cat = (r.category || '').trim();
      if (!cat) continue;
      const covered = list.some((t) => roomMatchesTopic(r, t.matchKey));
      if (!covered && !list.some((t) => t.matchKey.toLowerCase() === cat.toLowerCase())) {
        list.push({
          id: `custom-${cat.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
          label: cat,
          matchKey: cat,
        });
      }
    }

    const withCounts = list
      .map((topic) => ({
        ...topic,
        count: rooms.filter((r) => roomMatchesTopic(r, topic.matchKey)).length,
      }))
      .sort((a, b) => b.count - a.count);

    const populated = withCounts.filter((t) => t.count > 0);
    return populated.length >= 3 ? populated : withCounts;
  }, [rooms]);

  const visibleCategories = useMemo(() => {
    if (showAllCategories || categoryCards.length <= 6) return categoryCards;
    const base = categoryCards.slice(0, 6);
    if (
      activeTopicKey !== 'All' &&
      !base.some((t) => t.matchKey === activeTopicKey)
    ) {
      const selected = categoryCards.find((t) => t.matchKey === activeTopicKey);
      if (selected) return [...base.slice(0, 5), selected];
    }
    return base;
  }, [categoryCards, showAllCategories, activeTopicKey]);

  const activeTopicLabel = useMemo(() => {
    return (
      categoryCards.find((t) => t.matchKey === activeTopicKey)?.label ||
      activeTopicKey
    );
  }, [categoryCards, activeTopicKey]);

  const showActiveNow = primaryTab === 'all' && activeNowRooms.length > 0;

  const activeNowIds = useMemo(
    () => new Set(showActiveNow ? activeNowRooms.map((r) => r.id) : []),
    [showActiveNow, activeNowRooms]
  );

  const directoryRooms = useMemo(() => {
    const scoped = rooms.filter((room) => {
      if (showActiveNow && activeNowIds.has(room.id)) return false;
      if (primaryTab === 'live' && !isRoomActiveNow(room, nowMs)) return false;
      if (primaryTab === 'joined' && !room.isJoined) return false;
      return roomMatchesTopic(room, activeTopicKey);
    });

    const searched = filterRoomsByNameOrTopic(scoped, searchQuery, preferredCategories);

    if (searchQuery.trim().length > 0) return searched;

    return [...searched].sort((a, b) => {
      const aScore = getRoomMomentumScore(a, nowMs) + (a.isJoined ? 3 : 0);
      const bScore = getRoomMomentumScore(b, nowMs) + (b.isJoined ? 3 : 0);
      return bScore - aScore;
    });
  }, [
    rooms,
    showActiveNow,
    activeNowIds,
    primaryTab,
    activeTopicKey,
    searchQuery,
    preferredCategories,
    nowMs,
  ]);

  const getUnreadCount = (room: CommunityRoom) => {
    const msgs = room.messages || [];
    const lastSeenTs = lastSeenMap[room.id] || 0;
    if (!room.isJoined || lastSeenTs <= 0) return 0;
    return msgs.filter((m) => (m.createdTimestamp || 0) > lastSeenTs).length;
  };

  const handleOpenRoom = (room: CommunityRoom) => {
    const msgs = room.messages || [];
    const latestTs =
      msgs.length > 0
        ? msgs[msgs.length - 1].createdTimestamp || Date.now()
        : Date.now();
    saveLastSeenRoom(room.id, Math.max(Date.now(), latestTs));
    setLastSeenMap((prev) => ({
      ...prev,
      [room.id]: Math.max(Date.now(), latestTs),
    }));
    enterRoom(room.id);
  };

  const handleQuickCreateFromSearch = () => {
    const cleanTopic = searchQuery.trim().replace(/^#+/, '').slice(0, 45);
    try {
      if (cleanTopic) {
        sessionStorage.setItem('bopoi_prefill_room_name', cleanTopic);
      }
    } catch {
      // ignore
    }
    setIsCreateRoomModalOpen(true);
  };

  const resetFilters = () => {
    setPrimaryTab('all');
    setActiveTopicKey('All');
    setSearchQuery('');
  };

  const hasActiveFilter =
    primaryTab !== 'all' ||
    activeTopicKey !== 'All' ||
    searchQuery.trim().length > 0;

  const trimmedSearch = searchQuery.trim().replace(/^#+/, '');
  const exactSearchMatch = useMemo(() => {
    if (!trimmedSearch) return true;
    const lower = trimmedSearch.toLowerCase();
    return rooms.some((r) => r.name.toLowerCase() === lower);
  }, [rooms, trimmedSearch]);

  const directoryHeading = useMemo(() => {
    if (trimmedSearch) return `Results for "${trimmedSearch}"`;
    if (activeTopicKey !== 'All') return activeTopicLabel;
    if (primaryTab === 'live') return 'Active Now';
    if (primaryTab === 'joined') return 'Joined';
    return showActiveNow ? 'All Channels' : 'Channels';
  }, [trimmedSearch, activeTopicKey, activeTopicLabel, primaryTab, showActiveNow]);

  return (
    <div className="w-full flex flex-col bg-white dark:bg-[#0E0C14] text-[#191525] dark:text-[#F4F2FA] pb-14 overflow-x-clip">
      {/* Persistent Sticky Top Bar & Search */}
      <header className="sticky top-[52px] lg:top-0 z-20 bg-white/95 dark:bg-[#0E0C14]/95 backdrop-blur-md">
        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 h-[52px]">
          <div className="flex items-center gap-1 min-w-0">
            <button
              type="button"
              onClick={() => goBack('home')}
              className="min-w-[44px] min-h-[44px] -ml-2.5 rounded-full hover:bg-[#F4F3F7] dark:hover:bg-[#191625] text-[#191525] dark:text-[#F4F2FA] transition-colors cursor-pointer flex items-center justify-center shrink-0"
              aria-label="Go back"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <h1 className="text-[17px] font-extrabold text-[#191525] dark:text-[#F4F2FA] tracking-tight truncate">
              Rooms
            </h1>
          </div>

          <button
            type="button"
            onClick={() => setIsCreateRoomModalOpen(true)}
            className="min-h-[44px] sm:min-h-[34px] px-3.5 py-1.5 rounded-full bg-[#191525] dark:bg-[#F4F2FA] hover:opacity-90 text-white dark:text-[#191525] text-xs font-bold transition-opacity cursor-pointer inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>New Room</span>
          </button>
        </div>

        <div className="px-4 sm:px-5 pb-3">
          <div className="relative">
            <Search className="w-4 h-4 text-[#706B7D] dark:text-[#9E97B3] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="search"
              inputMode="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search rooms by name or topic..."
              aria-label="Search rooms by name or topic"
              className="w-full min-h-[44px] sm:min-h-[40px] pl-10 pr-9 py-2 bg-[#F4F3F7] dark:bg-[#171422] rounded-xl text-base sm:text-sm font-medium text-[#191525] dark:text-[#F4F2FA] placeholder:text-[#7E788E] dark:placeholder:text-[#8E87A3] focus:outline-none focus:ring-2 focus:ring-[#5420F5]/25 dark:focus:ring-[#8E6BFF]/30 transition-shadow"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 min-w-[36px] min-h-[36px] text-[#706B7D] dark:text-[#9E97B3] hover:text-[#191525] dark:hover:text-[#F4F2FA] flex items-center justify-center cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="px-4 sm:px-5 pt-1 space-y-6">
        {/* Simple Underline Tabs */}
        <div>
          <div
            role="tablist"
            aria-label="Filter rooms"
            className="flex items-center gap-6 border-b border-[#EFEFF4] dark:border-[#211C2E]"
          >
            {(
              [
                { id: 'all', label: 'All', count: rooms.length },
                { id: 'live', label: 'Active', count: liveCount },
                { id: 'joined', label: 'Joined', count: joinedCount },
              ] as const
            ).map((tab) => {
              const isActive = primaryTab === tab.id;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={isActive}
                  type="button"
                  onClick={() => setPrimaryTab(tab.id)}
                  className={`relative pb-2.5 pt-0.5 text-[13px] font-bold transition-colors cursor-pointer whitespace-nowrap inline-flex items-center gap-1.5 tabular-nums ${
                    isActive
                      ? 'text-[#191525] dark:text-[#F4F2FA]'
                      : 'text-[#7A748A] dark:text-[#8E87A3] hover:text-[#191525] dark:hover:text-[#F4F2FA]'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className="text-[12px] font-semibold opacity-65">
                    {tab.count}
                  </span>
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#191525] dark:bg-[#F4F2FA] rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Now Section */}
        {showActiveNow && (
          <section aria-labelledby="rooms-active-now-heading" className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-baseline gap-2 min-w-0">
                <h2
                  id="rooms-active-now-heading"
                  className="text-[13px] font-extrabold text-[#191525] dark:text-[#F4F2FA]"
                >
                  Active Now
                </h2>
                {trimmedSearch && (
                  <span className="text-xs font-semibold text-[#7A748A] dark:text-[#8E87A3] tabular-nums">
                    {activeNowRooms.length}
                  </span>
                )}
              </div>

              {liveCount > activeNowRooms.length && !trimmedSearch && (
                <button
                  type="button"
                  onClick={() => setPrimaryTab('live')}
                  className="text-xs font-semibold text-[#706B7D] dark:text-[#9E97B3] hover:text-[#191525] dark:hover:text-[#F4F2FA] cursor-pointer inline-flex items-center gap-0.5 whitespace-nowrap"
                >
                  <span>See all {liveCount}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {activeNowRooms.map((room) => {
                const unreadCount = getUnreadCount(room);
                const liveOnline = getLiveOnlineCount(room, nowMs);
                const previewAvatars = getPreviewAvatars(room, nowMs);
                const extraOnlineCount = Math.max(0, liveOnline - previewAvatars.length);
                const activityTier = getRoomActivityTier(room);

                return (
                  <div
                    key={`active-${room.id}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleOpenRoom(room)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleOpenRoom(room);
                      }
                    }}
                    className="group rounded-2xl bg-[#F5F4F8] dark:bg-[#161320] hover:bg-[#ECEAEF] dark:hover:bg-[#1D192B] p-3.5 transition-colors cursor-pointer flex flex-col justify-between gap-3 text-left"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <RoomBadgeIcon
                        iconEmoji={room.iconEmoji}
                        iconBg={room.iconBg}
                        category={room.category}
                        roomName={room.name}
                        size="md"
                        className="shrink-0"
                      />
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <h3 className="text-[14px] font-bold text-[#191525] dark:text-[#F4F2FA] truncate">
                              #{room.name}
                            </h3>
                            {room.isLocked && (
                              <Lock className="w-3 h-3 text-rose-500 shrink-0" />
                            )}
                            {activityTier === 'trending' && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-gradient-to-r from-[#5420F5]/12 via-[#9D50FF]/12 to-[#F52D85]/12 dark:from-[#5420F5]/28 dark:via-[#9D50FF]/24 dark:to-[#F52D85]/22 text-[10px] font-bold text-[#5420F5] dark:text-[#D1C4FF] whitespace-nowrap shrink-0">
                                <Flame className="w-2.5 h-2.5 text-[#F52D85] dark:text-[#FB7185] shrink-0" />
                                <span>Trending</span>
                              </span>
                            )}
                            {activityTier === 'high-activity' && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-gradient-to-r from-[#5420F5]/10 to-[#9D50FF]/10 dark:from-[#5420F5]/22 dark:to-[#9D50FF]/20 text-[10px] font-bold text-[#5420F5] dark:text-[#C4B5FD] whitespace-nowrap shrink-0">
                                <TrendingUp className="w-2.5 h-2.5 shrink-0" />
                                <span>High Activity</span>
                              </span>
                            )}
                          </div>
                          {unreadCount > 0 && (
                            <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-[#5420F5] text-white text-[10px] font-bold flex items-center justify-center tabular-nums shrink-0">
                              {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                          )}
                        </div>

                        <p className="text-[12.5px] text-[#5F5970] dark:text-[#A9A2BD] line-clamp-2 leading-snug">
                          {getRoomPreview(room)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-0.5">
                      <div className="flex items-center gap-2 min-w-0">
                        {previewAvatars.length > 0 && (
                          <div className="flex items-center -space-x-1.5 shrink-0">
                            {previewAvatars.map((member) => (
                              <div
                                key={member.key}
                                title={
                                  member.isOnline
                                    ? `${member.alias} · Active now`
                                    : `${member.alias} · Chatting recently`
                                }
                                className="relative w-7 h-7 rounded-full bg-white dark:bg-[#0E0C14] ring-2 ring-[#F5F4F8] dark:ring-[#161320] flex items-center justify-center"
                              >
                                <PersonaMaskIcon mask={member.mask} size={18} />
                                {member.isOnline && (
                                  <span
                                    aria-label="Active now"
                                    className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5"
                                  >
                                    <span className="bopoi-active-halo absolute inline-flex h-full w-full rounded-full bg-emerald-400" />
                                    <span className="bopoi-active-core relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 ring-2 ring-[#F5F4F8] dark:ring-[#161320]" />
                                  </span>
                                )}
                              </div>
                            ))}
                            {extraOnlineCount > 0 && (
                              <span className="w-6 h-6 rounded-full bg-[#EAE7F2] dark:bg-[#231F33] ring-2 ring-[#F5F4F8] dark:ring-[#161320] text-[10px] font-bold text-[#191525] dark:text-[#F4F2FA] flex items-center justify-center tabular-nums">
                                +{extraOnlineCount}
                              </span>
                            )}
                          </div>
                        )}

                        <span className="text-[11.5px] font-medium text-[#706B7D] dark:text-[#9E97B3] tabular-nums truncate">
                          {liveOnline > 0 ? (
                            <>
                              <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                                {liveOnline} online
                              </span>
                              <span> · {room.membersCount} members</span>
                            </>
                          ) : (
                            <span>Recent chat · {room.membersCount} members</span>
                          )}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleJoinRoom(room.id);
                        }}
                        className={`min-h-[44px] sm:min-h-[30px] px-3 py-1 rounded-full text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1 shrink-0 whitespace-nowrap ${
                          room.isJoined
                            ? 'bg-white/80 dark:bg-[#0E0C14]/80 text-[#706B7D] dark:text-[#9E97B3] hover:text-[#191525] dark:hover:text-[#F4F2FA]'
                            : 'bg-[#191525] dark:bg-[#F4F2FA] text-white dark:text-[#191525] hover:opacity-90'
                        }`}
                      >
                        {room.isJoined && <Check className="w-3 h-3 stroke-[2.5]" />}
                        <span>{room.isJoined ? 'Joined' : 'Join'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Categories Grid */}
        {searchQuery.trim().length === 0 && (
          <section aria-labelledby="rooms-categories-heading" className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2
                id="rooms-categories-heading"
                className="text-[13px] font-extrabold text-[#191525] dark:text-[#F4F2FA]"
              >
                Categories
              </h2>

              <div className="flex items-center gap-3">
                {activeTopicKey !== 'All' && (
                  <button
                    type="button"
                    onClick={() => setActiveTopicKey('All')}
                    className="text-xs font-semibold text-[#706B7D] dark:text-[#9E97B3] hover:text-[#191525] dark:hover:text-[#F4F2FA] cursor-pointer whitespace-nowrap"
                  >
                    Clear
                  </button>
                )}
                {categoryCards.length > 6 && (
                  <button
                    type="button"
                    onClick={() => setShowAllCategories((prev) => !prev)}
                    className="text-xs font-semibold text-[#706B7D] dark:text-[#9E97B3] hover:text-[#191525] dark:hover:text-[#F4F2FA] cursor-pointer whitespace-nowrap"
                  >
                    {showAllCategories ? 'Less' : 'More'}
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {visibleCategories.map((topic) => {
                const isSelected = activeTopicKey === topic.matchKey;
                return (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() =>
                      setActiveTopicKey((prev) =>
                        prev === topic.matchKey ? 'All' : topic.matchKey
                      )
                    }
                    aria-pressed={isSelected}
                    className={`min-h-[44px] px-3 py-2.5 rounded-xl text-left transition-colors cursor-pointer flex items-center justify-between gap-2 min-w-0 ${
                      isSelected
                        ? 'bg-[#191525] dark:bg-[#F4F2FA] text-white dark:text-[#191525]'
                        : 'bg-[#F5F4F8] dark:bg-[#161320] hover:bg-[#ECEAEF] dark:hover:bg-[#1D192B] text-[#191525] dark:text-[#F4F2FA]'
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <BopoiIcon name={topic.matchKey} size={15} className="shrink-0" />
                      <span className="text-[13px] font-semibold truncate">
                        {topic.label}
                      </span>
                    </span>

                    <span
                      className={`text-[11px] font-semibold tabular-nums shrink-0 ${
                        isSelected
                          ? 'text-white/75 dark:text-[#191525]/70'
                          : 'text-[#7A748A] dark:text-[#8E87A3]'
                      }`}
                    >
                      {topic.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Room List Directory */}
        {(directoryRooms.length > 0 || !showActiveNow) && (
          <section aria-labelledby="rooms-directory-heading" className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-baseline gap-2 min-w-0">
                <h2
                  id="rooms-directory-heading"
                  className="text-[13px] font-extrabold text-[#191525] dark:text-[#F4F2FA] truncate"
                >
                  {directoryHeading}
                </h2>
                <span className="text-xs font-semibold text-[#7A748A] dark:text-[#8E87A3] tabular-nums shrink-0">
                  {directoryRooms.length}
                </span>
              </div>

              {hasActiveFilter && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-xs font-semibold text-[#706B7D] dark:text-[#9E97B3] hover:text-[#191525] dark:hover:text-[#F4F2FA] cursor-pointer shrink-0 whitespace-nowrap"
                >
                  Reset
                </button>
              )}
            </div>

            {directoryRooms.length === 0 ? (
              <div className="px-6 py-12 rounded-2xl bg-[#F5F4F8] dark:bg-[#161320] text-center flex flex-col items-center justify-center space-y-3">
                <MessagesSquare className="w-5 h-5 text-[#706B7D] dark:text-[#9E97B3]" />
                <div className="space-y-1 max-w-xs mx-auto">
                  <h3 className="text-sm font-bold text-[#191525] dark:text-[#F4F2FA]">
                    {primaryTab === 'joined' && !searchQuery
                      ? 'No joined rooms yet'
                      : primaryTab === 'live' && !searchQuery
                      ? 'No rooms active right now'
                      : 'No matching rooms'}
                  </h3>
                  <p className="text-xs text-[#706B7D] dark:text-[#9E97B3] leading-relaxed">
                    {searchQuery
                      ? `Nothing matched "${searchQuery}".`
                      : primaryTab === 'joined'
                      ? 'Join a room to pin it here.'
                      : primaryTab === 'live'
                      ? 'Rooms appear here when someone is inside or chatting now.'
                      : 'Try another category or start a new room.'}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  {hasActiveFilter && (
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="min-h-[44px] sm:min-h-[34px] px-4 py-1.5 bg-white dark:bg-[#0E0C14] text-[#191525] dark:text-[#F4F2FA] text-xs font-bold rounded-full cursor-pointer"
                    >
                      Show all
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={
                      trimmedSearch
                        ? handleQuickCreateFromSearch
                        : () => setIsCreateRoomModalOpen(true)
                    }
                    className="min-h-[44px] sm:min-h-[34px] px-4 py-1.5 bg-[#191525] dark:bg-[#F4F2FA] text-white dark:text-[#191525] text-xs font-bold rounded-full cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>
                      {trimmedSearch ? `Create #${trimmedSearch.slice(0, 18)}` : 'New Room'}
                    </span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-[#EFEFF4] dark:divide-[#211C2E]">
                {directoryRooms.map((room) => {
                  const unreadCount = getUnreadCount(room);
                  const liveOnline = getLiveOnlineCount(room, nowMs);
                  const previewAvatars = getPreviewAvatars(room, nowMs);
                  const activityTier = getRoomActivityTier(room);

                  return (
                    <div
                      key={room.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleOpenRoom(room)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleOpenRoom(room);
                        }
                      }}
                      className="group -mx-2 px-2 py-3.5 rounded-xl hover:bg-[#FAF9FC] dark:hover:bg-[#15121E] transition-colors cursor-pointer flex items-center gap-3.5 text-left"
                    >
                      <RoomBadgeIcon
                        iconEmoji={room.iconEmoji}
                        iconBg={room.iconBg}
                        category={room.category}
                        roomName={room.name}
                        size="md"
                        className="shrink-0"
                      />

                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <h3 className="text-[14.5px] font-bold text-[#191525] dark:text-[#F4F2FA] truncate">
                            #{room.name}
                          </h3>
                          {room.isLocked && (
                            <Lock className="w-3 h-3 text-rose-500 shrink-0" />
                          )}
                          {activityTier === 'trending' && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-gradient-to-r from-[#5420F5]/12 via-[#9D50FF]/12 to-[#F52D85]/12 dark:from-[#5420F5]/28 dark:via-[#9D50FF]/24 dark:to-[#F52D85]/22 text-[10px] font-bold text-[#5420F5] dark:text-[#D1C4FF] whitespace-nowrap shrink-0">
                              <Flame className="w-2.5 h-2.5 text-[#F52D85] dark:text-[#FB7185] shrink-0" />
                              <span>Trending</span>
                            </span>
                          )}
                          {activityTier === 'high-activity' && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-gradient-to-r from-[#5420F5]/10 to-[#9D50FF]/10 dark:from-[#5420F5]/22 dark:to-[#9D50FF]/20 text-[10px] font-bold text-[#5420F5] dark:text-[#C4B5FD] whitespace-nowrap shrink-0">
                              <TrendingUp className="w-2.5 h-2.5 shrink-0" />
                              <span>High Activity</span>
                            </span>
                          )}
                          {unreadCount > 0 && (
                            <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-[#5420F5] text-white text-[10px] font-bold flex items-center justify-center tabular-nums shrink-0">
                              {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                          )}
                        </div>

                        <p className="text-[13px] text-[#5F5970] dark:text-[#A9A2BD] truncate">
                          {getRoomPreview(room)}
                        </p>

                        <div className="flex items-center gap-1.5 min-w-0">
                          {previewAvatars.some((m) => m.isOnline) && (
                            <div className="flex items-center -space-x-1 shrink-0">
                              {previewAvatars
                                .filter((m) => m.isOnline)
                                .slice(0, 2)
                                .map((m) => (
                                  <span
                                    key={m.key}
                                    className="relative w-4 h-4 rounded-full bg-[#F4F3F7] dark:bg-[#191625] flex items-center justify-center"
                                  >
                                    <PersonaMaskIcon mask={m.mask} size={11} />
                                    <span className="bopoi-active-core absolute -bottom-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-emerald-500 ring-1 ring-white dark:ring-[#0E0C14]" />
                                  </span>
                                ))}
                            </div>
                          )}

                          <p className="text-[11.5px] text-[#7A748A] dark:text-[#8E87A3] tabular-nums truncate">
                            {liveOnline > 0 ? (
                              <>
                                <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                                  {liveOnline} online
                                </span>
                                <span>
                                  {' '}
                                  · {room.membersCount} members · {room.category}
                                </span>
                              </>
                            ) : (
                              <span>
                                {room.membersCount} {room.membersCount === 1 ? 'member' : 'members'} · {room.category}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleJoinRoom(room.id);
                        }}
                        className={`min-h-[44px] sm:min-h-[32px] px-3.5 py-1 rounded-full text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1 shrink-0 whitespace-nowrap ${
                          room.isJoined
                            ? 'bg-[#F4F3F7] dark:bg-[#1A1726] text-[#706B7D] dark:text-[#9E97B3] hover:text-[#191525] dark:hover:text-[#F4F2FA]'
                            : 'bg-[#191525] dark:bg-[#F4F2FA] text-white dark:text-[#191525] hover:opacity-90'
                        }`}
                      >
                        {room.isJoined && <Check className="w-3 h-3 stroke-[2.5]" />}
                        <span>{room.isJoined ? 'Joined' : 'Join'}</span>
                      </button>
                    </div>
                  );
                })}

                {trimmedSearch.length >= 2 && !exactSearchMatch && (
                  <button
                    type="button"
                    onClick={handleQuickCreateFromSearch}
                    className="w-full -mx-2 px-2 py-3.5 rounded-xl hover:bg-[#FAF9FC] dark:hover:bg-[#15121E] transition-colors cursor-pointer flex items-center justify-between gap-3 text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-12 h-12 rounded-2xl bg-[#F4F3F7] dark:bg-[#171422] text-[#191525] dark:text-[#F4F2FA] flex items-center justify-center shrink-0">
                        <Plus className="w-5 h-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[#191525] dark:text-[#F4F2FA] truncate">
                          Start #{trimmedSearch}
                        </p>
                        <p className="text-xs text-[#706B7D] dark:text-[#9E97B3] truncate">
                          Create a room for this topic
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#706B7D] dark:text-[#9E97B3] shrink-0" />
                  </button>
                )}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
};
