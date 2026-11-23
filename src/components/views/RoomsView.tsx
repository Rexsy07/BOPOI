import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useBopoi } from '../../context/BopoiContext.tsx';
import { CommunityRoom } from '../../types/index.ts';
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
} from 'lucide-react';
import { BopoiIcon, RoomBadgeIcon } from '../brand/icons/index.ts';
import { PersonaMaskIcon } from '../brand/masks/index.ts';

type RoomsPrimaryTab = 'all' | 'live' | 'joined';

interface TopicOption {
  id: string;
  label: string;
  matchKey: string;
  hasIcon?: boolean;
}

const TOPIC_OPTIONS: TopicOption[] = [
  { id: 'all', label: 'All', matchKey: 'All', hasIcon: false },
  { id: 'campus', label: 'Campus Life', matchKey: 'Campus Life & Academics', hasIcon: true },
  { id: 'study', label: 'Study', matchKey: 'Study & Exam Survival', hasIcon: true },
  { id: 'hostel', label: 'Hostel & Food', matchKey: 'Hostel & Dorm (Food)', hasIcon: true },
  { id: 'coffee', label: 'Coffee & Chill', matchKey: 'Coffee & Chill', hasIcon: true },
  { id: 'midnight', label: 'Midnight Chat', matchKey: 'Midnight Chat / Late Night', hasIcon: true },
  { id: 'dating', label: 'Dating', matchKey: 'Dating & Romance', hasIcon: true },
  { id: 'tech', label: 'Tech', matchKey: 'Tech & Coding', hasIcon: true },
  { id: 'gaming', label: 'Gaming', matchKey: 'Gaming & Entertainment', hasIcon: true },
  { id: 'music', label: 'Music', matchKey: 'Music & Podcasts', hasIcon: true },
  { id: 'sports', label: 'Sports', matchKey: 'Campus Sports', hasIcon: true },
  { id: 'ideas', label: 'Ideas', matchKey: 'Ideas & Life Hacks', hasIcon: true },
  { id: 'trending', label: 'Trending', matchKey: 'Launch & Trending', hasIcon: true },
];

const LAST_SEEN_STORAGE_KEY = 'bopoi_rooms_last_seen_v1';

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

function isRoomActiveNow(room: CommunityRoom): boolean {
  const hasRecentMessages = (room.messages || []).some(
    (m) => Date.now() - (m.createdTimestamp || 0) < 24 * 60 * 60 * 1000
  );
  return (room.onlineCount || 0) >= 2 || hasRecentMessages;
}

function getRoomMomentumScore(room: CommunityRoom): number {
  return (
    (room.onlineCount || 1) * 4 +
    (room.messages?.length || 0) * 2 +
    (room.isFeatured ? 6 : 0)
  );
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

function getDistinctRecentMasks(room: CommunityRoom, max = 3): string[] {
  const msgs = room.messages || [];
  const seen = new Set<string>();
  const masks: string[] = [];
  for (let i = msgs.length - 1; i >= 0; i--) {
    const m = msgs[i];
    const maskKey = (m.authorMaskEmoji || m.authorAlias || 'masked-student').trim();
    if (!seen.has(maskKey)) {
      seen.add(maskKey);
      masks.push(maskKey);
    }
    if (masks.length >= max) break;
  }
  return masks;
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
  const [lastSeenMap, setLastSeenMap] = useState<Record<string, number>>(() =>
    loadLastSeenMap()
  );
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Quick '/' shortcut to search rooms
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
    () => rooms.filter((r) => isRoomActiveNow(r)).length,
    [rooms]
  );

  const topLiveStripRooms = useMemo(() => {
    return [...rooms]
      .sort((a, b) => {
        if (Boolean(a.isJoined) !== Boolean(b.isJoined)) {
          return a.isJoined ? -1 : 1;
        }
        return getRoomMomentumScore(b) - getRoomMomentumScore(a);
      })
      .slice(0, 8);
  }, [rooms]);

  const topicOptions = useMemo(() => {
    const list: TopicOption[] = [...TOPIC_OPTIONS];
    for (const r of rooms) {
      const cat = (r.category || '').trim();
      if (!cat) continue;
      const covered = list.some(
        (t) => t.matchKey !== 'All' && roomMatchesTopic(r, t.matchKey)
      );
      if (!covered && !list.some((t) => t.matchKey.toLowerCase() === cat.toLowerCase())) {
        list.push({
          id: `custom-${cat.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
          label: cat,
          matchKey: cat,
          hasIcon: false,
        });
      }
    }
    return list;
  }, [rooms]);

  const preferredCategories = useMemo(() => {
    const set = new Set<string>();
    for (const p of socialPosts || []) {
      if ((p.hasLiked || p.isBookmarked) && p.category) {
        set.add(p.category.toLowerCase());
      }
    }
    return set;
  }, [socialPosts]);

  const filteredRooms = useMemo(() => {
    const scoped = rooms.filter((room) => {
      if (primaryTab === 'live' && !isRoomActiveNow(room)) return false;
      if (primaryTab === 'joined' && !room.isJoined) return false;
      return roomMatchesTopic(room, activeTopicKey);
    });

    const searched = searchAndRankRooms(scoped, searchQuery, {
      preferredCategories,
    });

    if (searchQuery.trim().length > 0) return searched;

    return [...searched].sort((a, b) => {
      const aScore = getRoomMomentumScore(a) + (a.isJoined ? 3 : 0);
      const bScore = getRoomMomentumScore(b) + (b.isJoined ? 3 : 0);
      return bScore - aScore;
    });
  }, [rooms, primaryTab, activeTopicKey, searchQuery, preferredCategories]);

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

  const hasActiveFilter =
    primaryTab !== 'all' ||
    activeTopicKey !== 'All' ||
    searchQuery.trim().length > 0;

  const showLiveStrip =
    primaryTab === 'all' &&
    activeTopicKey === 'All' &&
    searchQuery.trim().length === 0 &&
    topLiveStripRooms.length > 0;

  const trimmedSearch = searchQuery.trim().replace(/^#+/, '');
  const exactSearchMatch = useMemo(() => {
    if (!trimmedSearch) return true;
    const lower = trimmedSearch.toLowerCase();
    return rooms.some((r) => r.name.toLowerCase() === lower);
  }, [rooms, trimmedSearch]);

  return (
    <div className="w-full flex flex-col bg-white dark:bg-[#0E0C14] text-[#191525] dark:text-[#F4F2FA] pb-12 overflow-x-clip">
      {/* 1. Instagram DM-Style Sticky Header + Underline Mode Tabs */}
      <header className="sticky top-[52px] lg:top-0 z-20 bg-white/95 dark:bg-[#0E0C14]/95 backdrop-blur-md border-b border-[#EAE6F0] dark:border-[#262036]">
        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 h-[56px]">
          <div className="flex items-center gap-1.5 min-w-0">
            <button
              type="button"
              onClick={() => goBack('home')}
              className="min-w-[44px] min-h-[44px] -ml-2 rounded-full hover:bg-[#FAF9FC] dark:hover:bg-[#171322] text-[#191525] dark:text-[#F4F2FA] transition-colors cursor-pointer flex items-center justify-center shrink-0"
              aria-label="Go back"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <h1 className="text-base sm:text-lg font-black text-[#191525] dark:text-[#F4F2FA] tracking-tight truncate">
              Rooms
            </h1>
            <span className="text-xs font-bold text-[#706B7D] dark:text-[#9E97B3] tabular-nums shrink-0">
              · {rooms.length}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsCreateRoomModalOpen(true)}
            className="min-h-[44px] sm:min-h-[38px] px-3.5 py-2 rounded-xl bg-[#5420F5] hover:bg-[#4314E2] text-white text-xs font-extrabold transition-colors cursor-pointer inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.75]" />
            <span>New Room</span>
          </button>
        </div>

        <div className="flex items-center border-t border-[#EAE6F0] dark:border-[#262036] px-2">
          {(
            [
              { id: 'all', label: 'All', count: rooms.length },
              { id: 'live', label: 'Live', count: liveCount },
              { id: 'joined', label: 'Joined', count: joinedCount },
            ] as const
          ).map((tab) => {
            const isActive = primaryTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setPrimaryTab(tab.id)}
                className={`flex-1 min-h-[42px] px-3 text-xs font-black transition-colors relative cursor-pointer whitespace-nowrap flex items-center justify-center gap-1.5 tabular-nums ${
                  isActive
                    ? 'text-[#191525] dark:text-[#F4F2FA]'
                    : 'text-[#706B7D] dark:text-[#9E97B3] hover:text-[#191525] dark:hover:text-[#F4F2FA]'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[11px] font-bold ${
                    isActive
                      ? 'text-[#5420F5] dark:text-[#B9A7FF]'
                      : 'text-[#706B7D]/75 dark:text-[#9E97B3]/70'
                  }`}
                >
                  {tab.count}
                </span>
                {isActive && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-[3px] bg-[#5420F5] rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* 2. Search + Iconified Topic Filter Bar */}
      <div className="px-4 sm:px-5 pt-3 pb-3 border-b border-[#EAE6F0] dark:border-[#262036] space-y-2.5">
        <div className="relative">
          <Search className="w-4 h-4 text-[#706B7D] dark:text-[#9E97B3] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="search"
            inputMode="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search rooms, topics, or #tags..."
            className="w-full min-h-[42px] pl-9 pr-9 py-2 bg-[#FAF9FC] dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] rounded-xl text-base sm:text-sm font-medium text-[#191525] dark:text-[#F4F2FA] placeholder:text-[#706B7D] dark:placeholder:text-[#9E97B3] focus:outline-none focus:bg-white dark:focus:bg-[#0E0C14] focus:border-[#5420F5] transition-colors"
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

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {topicOptions.map((topic) => {
            const isActive = activeTopicKey === topic.matchKey;
            return (
              <button
                key={topic.id}
                type="button"
                onClick={() => setActiveTopicKey(topic.matchKey)}
                className={`min-h-[36px] px-3 py-1 rounded-xl text-xs font-bold transition-colors shrink-0 whitespace-nowrap cursor-pointer inline-flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-[#191525] dark:bg-[#F4F2FA] text-white dark:text-[#191525]'
                    : 'bg-[#FAF9FC] dark:bg-[#171322] text-[#706B7D] dark:text-[#9E97B3] hover:text-[#191525] dark:hover:text-[#F4F2FA]'
                }`}
              >
                {topic.hasIcon && (
                  <BopoiIcon name={topic.matchKey} size={13} className="shrink-0" />
                )}
                <span>{topic.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Instagram Stories / Notes-Inspired Quick Tray (+ New Room + Active Rooms) */}
      {showLiveStrip && (
        <div className="px-4 sm:px-5 py-3 border-b border-[#EAE6F0] dark:border-[#262036]">
          <div className="flex items-start gap-3.5 overflow-x-auto no-scrollbar pb-0.5">
            {/* Slot 1: + New Room Ring */}
            <button
              type="button"
              onClick={() => setIsCreateRoomModalOpen(true)}
              className="flex flex-col items-center gap-1.5 shrink-0 w-[62px] group cursor-pointer"
            >
              <div className="w-[56px] h-[56px] rounded-full border-2 border-dashed border-[#5420F5]/45 dark:border-[#7C5CFF]/55 bg-[#F7F4FF] dark:bg-[#1A1430] group-hover:border-[#5420F5] group-hover:bg-[#F0EBFF] dark:group-hover:bg-[#231A45] flex items-center justify-center text-[#5420F5] dark:text-[#B9A7FF] transition-colors">
                <Plus className="w-5 h-5 stroke-[2.5]" />
              </div>
              <span className="text-[11px] font-bold text-[#5420F5] dark:text-[#B9A7FF] truncate w-full text-center">
                New Room
              </span>
            </button>

            {topLiveStripRooms.map((room) => {
              const active = isRoomActiveNow(room);
              return (
                <button
                  key={room.id}
                  type="button"
                  onClick={() => handleOpenRoom(room)}
                  className="flex flex-col items-center gap-1.5 shrink-0 w-[62px] group cursor-pointer"
                  title={`Open #${room.name}`}
                >
                  <div className="relative">
                    <div
                      className={`p-[2.5px] rounded-full transition-transform group-hover:scale-105 ${
                        room.isJoined
                          ? 'bg-gradient-to-tr from-emerald-500 to-[#5420F5]'
                          : active
                          ? 'bg-gradient-to-tr from-[#5420F5] via-[#9E2AF5] to-[#F52D85]'
                          : 'bg-[#EAE6F0] dark:bg-[#262036]'
                      }`}
                    >
                      <div className="bg-white dark:bg-[#0E0C14] rounded-full p-[2px]">
                        <RoomBadgeIcon
                          iconEmoji={room.iconEmoji}
                          iconBg={room.iconBg}
                          category={room.category}
                          roomName={room.name}
                          size="md"
                          rounded="full"
                        />
                      </div>
                    </div>

                    <span className="absolute -bottom-0.5 -right-0.5 min-w-[20px] h-[18px] px-1 rounded-full bg-white dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] text-[10px] font-black text-emerald-700 dark:text-emerald-400 flex items-center justify-center tabular-nums shadow-2xs">
                      {room.isLocked ? (
                        <Lock className="w-2.5 h-2.5 text-rose-500" />
                      ) : (
                        room.onlineCount || 1
                      )}
                    </span>
                  </div>

                  <span className="text-[11px] font-bold text-[#191525] dark:text-[#F4F2FA] group-hover:text-[#5420F5] dark:group-hover:text-[#B9A7FF] truncate w-full text-center transition-colors">
                    {room.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Instagram Broadcast Channels / Telegram-Style Room List */}
      {filteredRooms.length === 0 ? (
        <div className="px-6 py-16 text-center flex flex-col items-center justify-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#FAF9FC] dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] flex items-center justify-center text-[#5420F5] dark:text-[#B9A7FF]">
            <MessagesSquare className="w-5 h-5" />
          </div>
          <div className="space-y-1 max-w-xs mx-auto">
            <h3 className="text-sm font-black text-[#191525] dark:text-[#F4F2FA]">
              {primaryTab === 'joined' && !searchQuery
                ? 'No joined rooms yet'
                : 'No matching rooms'}
            </h3>
            <p className="text-xs text-[#706B7D] dark:text-[#9E97B3] leading-relaxed">
              {searchQuery
                ? `Nothing matched "${searchQuery}". Start a room for it in one tap.`
                : primaryTab === 'joined'
                ? 'Tap Join on any room to pin it here.'
                : 'Try another filter or start a new campus room.'}
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-1">
            {hasActiveFilter && (
              <button
                type="button"
                onClick={() => {
                  setPrimaryTab('all');
                  setActiveTopicKey('All');
                  setSearchQuery('');
                }}
                className="min-h-[44px] px-4 py-2 bg-[#FAF9FC] dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] text-[#191525] dark:text-[#F4F2FA] text-xs font-bold rounded-xl cursor-pointer"
              >
                Show All
              </button>
            )}
            <button
              type="button"
              onClick={
                trimmedSearch
                  ? handleQuickCreateFromSearch
                  : () => setIsCreateRoomModalOpen(true)
              }
              className="min-h-[44px] px-4 py-2 bg-[#5420F5] hover:bg-[#4314E2] text-white text-xs font-extrabold rounded-xl cursor-pointer inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>
                {trimmedSearch ? `Create #${trimmedSearch.slice(0, 18)}` : 'New Room'}
              </span>
            </button>
          </div>
        </div>
      ) : (
        <div className="divide-y divide-[#EAE6F0] dark:divide-[#262036]">
          {filteredRooms.map((room) => {
            const active = isRoomActiveNow(room);
            const msgs = room.messages || [];
            const latestMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;
            const latestText = latestMsg
              ? latestMsg.text?.trim() ||
                (latestMsg.mediaType === 'gif'
                  ? 'Sent a GIF'
                  : latestMsg.mediaType === 'video'
                  ? 'Shared a video'
                  : 'Shared a photo')
              : null;

            const lastSeenTs = lastSeenMap[room.id] || 0;
            const unreadMsgsCount =
              room.isJoined && lastSeenTs > 0
                ? msgs.filter((m) => (m.createdTimestamp || 0) > lastSeenTs).length
                : 0;
            const hasFreshActivity =
              unreadMsgsCount > 0 ||
              (latestMsg &&
                lastSeenTs === 0 &&
                Date.now() - (latestMsg.createdTimestamp || 0) < 3 * 60 * 60 * 1000);

            const recentMasks = getDistinctRecentMasks(room, 3);

            return (
              <div
                key={room.id}
                onClick={() => handleOpenRoom(room)}
                className="group px-4 sm:px-5 py-3.5 hover:bg-[#FAF9FC] dark:hover:bg-[#171322] transition-colors cursor-pointer flex items-center gap-3.5"
              >
                {/* Avatar / Room Badge with Subtle Active Gradient Ring */}
                <div
                  className={`p-[2px] rounded-[18px] shrink-0 ${
                    active
                      ? 'bg-gradient-to-tr from-[#5420F5] to-[#F52D85]'
                      : 'bg-transparent'
                  }`}
                >
                  <div className="bg-white dark:bg-[#0E0C14] rounded-2xl">
                    <RoomBadgeIcon
                      iconEmoji={room.iconEmoji}
                      iconBg={room.iconBg}
                      category={room.category}
                      roomName={room.name}
                      size="md"
                      className="transition-transform group-hover:scale-105"
                    />
                  </div>
                </div>

                {/* Chat-Thread Style Content Stack */}
                <div className="min-w-0 flex-1">
                  {/* Top Line: Room Name + Timestamp + Unread Count */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <h3 className="text-[15px] font-black text-[#191525] dark:text-[#F4F2FA] group-hover:text-[#5420F5] dark:group-hover:text-[#B9A7FF] transition-colors truncate">
                        #{room.name}
                      </h3>
                      {room.isLocked && (
                        <Lock className="w-3 h-3 text-rose-500 shrink-0" />
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {latestMsg?.createdAt && (
                        <span
                          className={`text-[11px] tabular-nums ${
                            unreadMsgsCount > 0
                              ? 'font-black text-[#5420F5] dark:text-[#B9A7FF]'
                              : 'font-semibold text-[#706B7D] dark:text-[#9E97B3]'
                          }`}
                        >
                          {latestMsg.createdAt}
                        </span>
                      )}
                      {unreadMsgsCount > 0 && (
                        <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-[#5420F5] text-white text-[10px] font-black flex items-center justify-center tabular-nums">
                          {unreadMsgsCount > 99 ? '99+' : unreadMsgsCount}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Second Line: Live Masked Message Preview or Clean Starter Invitation */}
                  {latestMsg && latestText ? (
                    <div
                      className={`flex items-center gap-1.5 mt-0.5 min-w-0 text-[13px] ${
                        hasFreshActivity
                          ? 'text-[#191525] dark:text-[#F4F2FA] font-semibold'
                          : 'text-[#706B7D] dark:text-[#9E97B3]'
                      }`}
                    >
                      <PersonaMaskIcon
                        mask={
                          latestMsg.authorMaskEmoji ||
                          latestMsg.authorAlias ||
                          'masked-student'
                        }
                        size={14}
                        className="shrink-0"
                      />
                      <p className="truncate min-w-0">
                        <span className="font-bold text-[#191525] dark:text-[#F4F2FA]">
                          {latestMsg.authorAlias || latestMsg.authorName}:
                        </span>{' '}
                        <span>{latestText}</span>
                      </p>
                    </div>
                  ) : (
                    <p className="text-[13px] text-[#706B7D] dark:text-[#9E97B3] truncate mt-0.5">
                      {room.description || 'Say hi behind a mask — room is open'}
                    </p>
                  )}

                  {/* Third Line: Recent Active Masks + Quiet Typographic Telemetry */}
                  <div className="flex items-center gap-1.5 mt-1 min-w-0">
                    {recentMasks.length > 1 && (
                      <div className="flex items-center -space-x-1 shrink-0">
                        {recentMasks.map((mask, idx) => (
                          <span
                            key={`${room.id}-mask-${idx}`}
                            className="w-4 h-4 rounded-full bg-[#FAF9FC] dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] flex items-center justify-center"
                          >
                            <PersonaMaskIcon mask={mask} size={11} />
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="text-[11px] font-semibold text-[#706B7D] dark:text-[#9E97B3] tabular-nums truncate">
                      <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                        {room.onlineCount || 1} online
                      </span>
                      <span>
                        {' '}
                        · {room.membersCount}{' '}
                        {room.membersCount === 1 ? 'member' : 'members'} ·{' '}
                        {room.category}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Single Clean Right Action */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleJoinRoom(room.id);
                  }}
                  className={`min-h-[44px] sm:min-h-[36px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1 shrink-0 ${
                    room.isJoined
                      ? 'bg-[#FAF9FC] dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] text-[#706B7D] dark:text-[#9E97B3] hover:text-[#191525] dark:hover:text-[#F4F2FA]'
                      : 'bg-[#F0EBFF] dark:bg-[#231A45] text-[#5420F5] dark:text-[#B9A7FF] hover:bg-[#5420F5] hover:text-white'
                  }`}
                >
                  {room.isJoined && <Check className="w-3 h-3 stroke-[3]" />}
                  <span>{room.isJoined ? 'Joined' : 'Join'}</span>
                </button>
              </div>
            );
          })}

          {/* 1-Tap Search-to-Create Row when searching for a topic not yet created */}
          {trimmedSearch.length >= 2 && !exactSearchMatch && (
            <button
              type="button"
              onClick={handleQuickCreateFromSearch}
              className="w-full px-4 sm:px-5 py-3.5 hover:bg-[#FAF9FC] dark:hover:bg-[#171322] transition-colors cursor-pointer flex items-center justify-between gap-3 text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-11 h-11 rounded-2xl border-2 border-dashed border-[#5420F5]/45 dark:border-[#7C5CFF]/55 bg-[#F7F4FF] dark:bg-[#1A1430] text-[#5420F5] dark:text-[#B9A7FF] flex items-center justify-center shrink-0">
                  <Plus className="w-5 h-5 stroke-[2.5]" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-black text-[#5420F5] dark:text-[#B9A7FF] truncate">
                    Start #{trimmedSearch}
                  </p>
                  <p className="text-xs text-[#706B7D] dark:text-[#9E97B3] truncate">
                    Create a masked room for this topic
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#5420F5] dark:text-[#B9A7FF] shrink-0" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
