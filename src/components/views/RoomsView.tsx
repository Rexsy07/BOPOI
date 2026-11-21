import React, { useState, useMemo } from 'react';
import { useBopoi } from '../../context/BopoiContext.tsx';
import { CommunityRoom } from '../../types/index.ts';
import { searchAndRankRooms } from '../../lib/supabase.ts';
import {
  ChevronLeft,
  Users2,
  Check,
  Plus,
  MessageCircle,
  Share2,
  X,
  Lock,
  Search,
  MessagesSquare,
} from 'lucide-react';
import { RoomBadgeIcon } from '../brand/icons/index.ts';
import { HashtagRow } from '../ui/HashtagRow.tsx';

const BASE_CATEGORIES = [
  'All',
  'Active Now',
  'Joined',
  'Campus Life & Academics',
  'Study & Exam Survival',
  'Hostel & Dorm (Food)',
  'Coffee & Chill',
  'Gaming & Entertainment',
  'Music & Podcasts',
  'Tech & Coding',
  'Campus Sports',
  'Midnight Chat / Late Night',
  'Ideas & Life Hacks',
  'Dating & Romance',
  'Launch & Trending',
];

function isRoomActiveNow(room: CommunityRoom): boolean {
  const hasRecentMessages = (room.messages || []).some(
    (m) => Date.now() - (m.createdTimestamp || 0) < 24 * 60 * 60 * 1000
  );
  return (room.onlineCount || 0) >= 2 || hasRecentMessages;
}

function roomMatchesCategory(room: CommunityRoom, activeCategory: string): boolean {
  if (activeCategory === 'All') return true;
  if (activeCategory === 'Active Now') return isRoomActiveNow(room);
  if (activeCategory === 'Joined') return Boolean(room.isJoined);

  const rc = (room.category || '').toLowerCase().trim();
  const ac = activeCategory.toLowerCase().trim();
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

export const RoomsView: React.FC = () => {
  const {
    rooms,
    socialPosts,
    toggleJoinRoom,
    enterRoom,
    goBack,
    showToast,
    setIsCreateRoomModalOpen,
  } = useBopoi();

  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const joinedCount = useMemo(
    () => rooms.filter((r) => Boolean(r.isJoined)).length,
    [rooms]
  );

  const activeNowCount = useMemo(
    () => rooms.filter((r) => isRoomActiveNow(r)).length,
    [rooms]
  );

  // Include any custom room categories present in live data if not covered by base tabs
  const categories = useMemo(() => {
    const list = [...BASE_CATEGORIES];
    for (const r of rooms) {
      const cat = (r.category || '').trim();
      if (!cat) continue;
      const alreadyCovered = list.some(
        (b) => b !== 'All' && b !== 'Active Now' && b !== 'Joined' && roomMatchesCategory(r, b)
      );
      if (!alreadyCovered && !list.some((b) => b.toLowerCase() === cat.toLowerCase())) {
        list.push(cat);
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
    const categoryFiltered = rooms.filter((room) =>
      roomMatchesCategory(room, activeCategory)
    );
    return searchAndRankRooms(categoryFiltered, searchQuery, {
      preferredCategories,
    });
  }, [rooms, activeCategory, searchQuery, preferredCategories]);

  const handleOpenRoom = (room: CommunityRoom) => {
    enterRoom(room.id);
  };

  const handleShareRoom = (e: React.MouseEvent, room: CommunityRoom) => {
    e.stopPropagation();
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://bopoi.app';
    const roomUrl = `${origin}/#room-${room.id}`;
    const shareText = `Join the anonymous #${room.name} chat room on Bopoi: ${room.description}\n${roomUrl}`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator
        .share({
          title: `#${room.name} Anonymous Room`,
          text: shareText,
          url: roomUrl,
        })
        .then(() => showToast('Room link shared!', 'success'))
        .catch(() => {
          navigator.clipboard?.writeText(roomUrl);
          showToast('Room link copied to clipboard!', 'success');
        });
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(roomUrl);
      showToast('Room link copied to clipboard!', 'success');
    } else {
      showToast('Share link: ' + roomUrl, 'info');
    }
  };

  const hasActiveFilter = activeCategory !== 'All' || searchQuery.trim().length > 0;

  return (
    <div className="w-full flex flex-col bg-white text-[#191525] pb-12 overflow-x-clip">
      {/* 1. Compact Sticky Title Bar */}
      <div className="sticky top-[52px] lg:top-0 z-20 bg-white/95 dark:bg-[#0E0C14]/95 backdrop-blur-md border-b border-[#EAE6F0] dark:border-[#262036]">
        <div className="flex items-center justify-between gap-2.5 px-4 sm:px-5 py-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <button
              type="button"
              onClick={() => goBack('home')}
              className="min-w-[44px] min-h-[44px] sm:min-w-[38px] sm:min-h-[38px] -ml-2 rounded-full hover:bg-[#FAF9FC] dark:hover:bg-[#171322] text-[#191525] dark:text-[#F4F2FA] transition-colors cursor-pointer flex items-center justify-center shrink-0"
              title="Go back"
              aria-label="Go back"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <span className="relative w-8 h-8 rounded-xl bg-[#F0EBFF] dark:bg-[#231A45] text-[#5420F5] dark:text-[#B9A7FF] flex items-center justify-center shrink-0">
              <MessagesSquare className="w-4 h-4" strokeWidth={2.2} />
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#0E0C14]" />
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h1 className="text-base sm:text-lg font-black text-[#191525] dark:text-[#F4F2FA] tracking-tight truncate">
                  Live Campus Rooms
                </h1>
                <span className="text-xs font-bold text-[#706B7D] dark:text-[#9E97B3] tabular-nums shrink-0">
                  · {rooms.length}
                </span>
              </div>
              <p className="text-[11px] text-[#706B7D] dark:text-[#9E97B3] truncate">
                Join masked student group chats in real time
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsCreateRoomModalOpen(true)}
            className="min-h-[38px] px-3.5 py-2 rounded-xl bg-[#5420F5] hover:bg-[#4314E2] text-white text-xs font-extrabold transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.75]" />
            <span>New Room</span>
          </button>
        </div>
      </div>

      {/* 2. Search Input + Category Filter Tabs (scrolls cleanly with content so mobile viewport isn't boxed in) */}
      <div className="border-b border-[#EAE6F0] dark:border-[#262036] bg-[#FAF9FC]/40 dark:bg-[#141020]">
        <div className="px-4 sm:px-5 pt-3 pb-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-[#706B7D] dark:text-[#9E97B3] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              inputMode="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search rooms by name, topic, or #tags..."
              className="w-full pl-9 pr-9 py-2 bg-white dark:bg-[#0E0C14] border border-[#EAE6F0] dark:border-[#262036] rounded-xl text-base sm:text-sm font-medium text-[#191525] dark:text-[#F4F2FA] placeholder:text-[#706B7D] dark:placeholder:text-[#9E97B3] focus:outline-none focus:border-[#5420F5] transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#706B7D] dark:text-[#9E97B3] hover:text-[#191525] dark:hover:text-[#F4F2FA] p-1 cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar px-4 sm:px-5 pb-3">
          {categories.map((cat) => {
            const isActive = activeCategory === cat;
            const countBadge =
              cat === 'All'
                ? rooms.length
                : cat === 'Active Now'
                ? activeNowCount
                : cat === 'Joined'
                ? joinedCount
                : null;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors shrink-0 whitespace-nowrap cursor-pointer inline-flex items-center gap-1.5 tabular-nums ${
                  isActive
                    ? 'bg-[#191525] dark:bg-[#F4F2FA] text-white dark:text-[#191525]'
                    : 'bg-white dark:bg-[#0E0C14] border border-[#EAE6F0] dark:border-[#262036] text-[#706B7D] dark:text-[#9E97B3] hover:text-[#191525] dark:hover:text-[#F4F2FA]'
                }`}
              >
                <span>{cat}</span>
                {countBadge !== null && (
                  <span
                    className={`text-[10px] font-black ${
                      isActive ? 'text-white/75 dark:text-[#191525]/70' : 'text-[#706B7D] dark:text-[#9E97B3]'
                    }`}
                  >
                    {countBadge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Hairline-Divided Community Rooms Directory */}
      {filteredRooms.length === 0 ? (
        <div className="px-6 py-16 text-center flex flex-col items-center justify-center space-y-3 border-b border-[#EAE6F0]">
          <div className="w-12 h-12 rounded-2xl bg-[#FAF9FC] border border-[#EAE6F0] flex items-center justify-center mx-auto text-[#5420F5]">
            {searchQuery ? <Search className="w-5 h-5" /> : <MessagesSquare className="w-5 h-5" />}
          </div>
          <div className="space-y-1 max-w-xs mx-auto">
            <h3 className="text-sm sm:text-base font-black text-[#191525]">
              {activeCategory === 'Joined' && !searchQuery
                ? 'No joined rooms yet'
                : 'No matching rooms'}
            </h3>
            <p className="text-xs text-[#706B7D] leading-relaxed">
              {searchQuery
                ? `No rooms matched "${searchQuery}". Try another keyword or start a new room.`
                : activeCategory === 'Joined'
                ? 'Tap "+ Join" or enter any campus room below to see it in your joined list.'
                : `No rooms found under "${activeCategory}" yet.`}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            {hasActiveFilter && (
              <button
                type="button"
                onClick={() => {
                  setActiveCategory('All');
                  setSearchQuery('');
                }}
                className="px-4 py-2 bg-[#FAF9FC] hover:bg-[#F0EBFF] border border-[#EAE6F0] text-[#191525] text-xs font-extrabold rounded-xl cursor-pointer transition-colors"
              >
                Show All Rooms ({rooms.length})
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsCreateRoomModalOpen(true)}
              className="px-4 py-2 bg-[#5420F5] hover:bg-[#4314E2] text-white text-xs font-black rounded-xl cursor-pointer inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Room</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="divide-y divide-[#EAE6F0]">
          {filteredRooms.map((room) => {
            const latestMsg =
              room.messages && room.messages.length > 0
                ? room.messages[room.messages.length - 1]
                : null;
            const latestPreview = latestMsg
              ? latestMsg.text?.trim() ||
                (latestMsg.mediaType === 'gif'
                  ? 'Sent a GIF'
                  : latestMsg.mediaType === 'video'
                  ? 'Shared a video'
                  : 'Shared a photo')
              : null;

            return (
              <div
                key={room.id}
                onClick={() => handleOpenRoom(room)}
                className="group px-4 sm:px-5 py-4 hover:bg-[#FAF9FC]/70 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                title={`Enter #${room.name} room`}
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <RoomBadgeIcon
                    iconEmoji={room.iconEmoji}
                    iconBg={room.iconBg}
                    category={room.category}
                    roomName={room.name}
                    size="md"
                    className="transition-transform group-hover:scale-105 shrink-0"
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-black text-[#191525] dark:text-[#F4F2FA] break-words group-hover:text-[#5420F5] dark:group-hover:text-[#B9A7FF] transition-colors">
                        #{room.name}
                      </h3>
                      {room.isLocked && <Lock className="w-3 h-3 text-rose-500 shrink-0" />}
                      {room.isJoined && (
                        <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 shrink-0">
                          <Check className="w-3 h-3 stroke-[3]" />
                          <span>Joined</span>
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-[#706B7D] dark:text-[#9E97B3] leading-snug line-clamp-2 mt-0.5 break-words">
                      {room.description}
                    </p>

                    {latestMsg && latestPreview && (
                      <div className="text-[11px] text-[#191525]/80 dark:text-[#F4F2FA]/85 mt-1.5 bg-[#FAF9FC] dark:bg-[#171322] border border-[#EAE6F0]/80 dark:border-[#262036] rounded-lg px-2 py-1 flex items-center justify-between gap-2">
                        <p className="truncate min-w-0">
                          <span className="font-bold text-[#5420F5] dark:text-[#B9A7FF]">
                            {latestMsg.authorAlias || latestMsg.authorName}:
                          </span>{' '}
                          <span>{latestPreview}</span>
                        </p>
                        <span className="text-[10px] text-[#706B7D] dark:text-[#9E97B3] shrink-0 tabular-nums">
                          {latestMsg.createdAt}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 mt-1.5 flex-wrap text-[11px] font-semibold text-[#706B7D] dark:text-[#9E97B3] tabular-nums">
                      <span className="text-[#5420F5] dark:text-[#B9A7FF] font-bold">{room.category}</span>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1">
                        <Users2 className="w-3 h-3 text-[#706B7D] dark:text-[#9E97B3]" />
                        <span>
                          {room.membersCount} {room.membersCount === 1 ? 'member' : 'members'}
                        </span>
                      </span>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                        <span>{room.onlineCount || 1} online</span>
                      </span>
                      {room.messages && room.messages.length > 0 && (
                        <>
                          <span>·</span>
                          <span className="inline-flex items-center gap-1">
                            <MessageCircle className="w-3 h-3" />
                            <span>{room.messages.length} msgs</span>
                          </span>
                        </>
                      )}
                    </div>

                    <HashtagRow
                      hashtags={(room.tags || []).filter(
                        (t) =>
                          t.toLowerCase() !== 'anonymousroom' &&
                          t.toLowerCase() !== (room.category || '').toLowerCase()
                      )}
                      maxVisible={4}
                      className="mt-1.5"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={(e) => handleShareRoom(e, room)}
                    className="min-w-[38px] min-h-[38px] p-2 rounded-xl border border-[#EAE6F0] dark:border-[#262036] bg-white dark:bg-[#171322] hover:bg-[#F0EBFF] dark:hover:bg-[#231A45] hover:text-[#5420F5] dark:hover:text-[#B9A7FF] text-[#706B7D] dark:text-[#9E97B3] transition-colors cursor-pointer flex items-center justify-center"
                    title="Share room link"
                    aria-label="Share room link"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleJoinRoom(room.id);
                    }}
                    className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer border ${
                      room.isJoined
                        ? 'border-[#EAE6F0] dark:border-[#262036] bg-[#FAF9FC] dark:bg-[#171322] text-[#706B7D] dark:text-[#9E97B3] hover:text-[#191525] dark:hover:text-[#F4F2FA]'
                        : 'border-[#5420F5]/30 bg-[#F0EBFF] dark:bg-[#231A45] text-[#5420F5] dark:text-[#B9A7FF] hover:bg-[#5420F5] hover:text-white'
                    }`}
                  >
                    {room.isJoined ? 'Joined' : '+ Join'}
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenRoom(room);
                    }}
                    className="min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-colors cursor-pointer bg-[#191525] dark:bg-[#F4F2FA] hover:bg-[#5420F5] dark:hover:bg-[#7C5CFF] text-white dark:text-[#191525] dark:hover:text-white shrink-0"
                  >
                    Enter →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
