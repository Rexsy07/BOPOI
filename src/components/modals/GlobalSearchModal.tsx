import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  X,
  Hash,
  ArrowUpRight,
  Heart,
  MessageCircle,
  Clock,
} from 'lucide-react';
import { useBopoi } from '../../context/BopoiContext.tsx';
import {
  searchAndRankPosts,
  searchAndRankRooms,
  searchAndRankPeople,
} from '../../lib/supabase.ts';
import { CampusCharacterAvatar } from '../brand/character/index.ts';
import {
  BopoiIcon,
  BopoiSearchIcon,
  LaunchTrendingIcon,
  CreateRoomIcon,
  RealPeopleIcon,
  CreatePollIcon,
  StudentPostsIcon,
  SparklePolishIcon,
  RoomBadgeIcon,
} from '../brand/icons/index.ts';
import { PersonaMaskIcon } from '../brand/masks/PersonaMaskIcon.tsx';
import { VerifiedCreatorBadge } from '../ui/VerifiedCreatorBadge.tsx';
import { computeTrendingHashtags } from '../../utils/hashtags.ts';

export const GlobalSearchModal: React.FC = () => {
  const {
    isSearchModalOpen,
    setIsSearchModalOpen,
    globalSearchQuery,
    setGlobalSearchQuery,
    socialPosts,
    rooms,
    creators,
    accounts,
    user,
    setSelectedPost,
    setActiveView,
    enterRoom,
    viewUserProfile,
    openPublicAskFor,
  } = useBopoi();

  const [activeFilter, setActiveFilter] = useState<'all' | 'posts' | 'rooms' | 'people' | 'polls'>('all');
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('bopoi_recent_searches');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed.slice(0, 5) : [];
    } catch {
      return [];
    }
  });
  const inputRef = useRef<HTMLInputElement>(null);

  const saveRecentSearch = (term: string) => {
    const clean = term.trim();
    if (clean.length < 2) return;
    setRecentSearches((prev) => {
      const next = [clean, ...prev.filter((s) => s.toLowerCase() !== clean.toLowerCase())].slice(0, 5);
      try {
        localStorage.setItem('bopoi_recent_searches', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    try {
      localStorage.removeItem('bopoi_recent_searches');
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (isSearchModalOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 60);
    }
  }, [isSearchModalOpen]);

  // Global keyboard shortcuts (Cmd/Ctrl + K, '/', or Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchModalOpen(!isSearchModalOpen);
      } else if (e.key === '/' && !isSearchModalOpen && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const target = e.target as HTMLElement | null;
        const isTyping =
          target &&
          (target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.tagName === 'SELECT' ||
            target.isContentEditable);
        if (!isTyping) {
          e.preventDefault();
          setIsSearchModalOpen(true);
        }
      } else if (e.key === 'Escape' && isSearchModalOpen) {
        setIsSearchModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchModalOpen, setIsSearchModalOpen]);

  const query = globalSearchQuery.trim().toLowerCase();

  const allPeople = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        name: string;
        username: string;
        avatarUrl: string;
        campus: string;
        bio: string;
        isCreator?: boolean;
      }
    >();
    creators.forEach((c) => {
      map.set(c.username.toLowerCase(), {
        id: c.id,
        name: c.name,
        username: c.username,
        avatarUrl: c.avatarUrl || '',
        campus: c.campus || 'Nigerian Campus',
        bio: c.bio || '',
        isCreator: Boolean(c.isVerified),
      });
    });
    accounts.forEach((a) => {
      if (!map.has(a.username.toLowerCase())) {
        map.set(a.username.toLowerCase(), {
          id: a.id,
          name: a.displayName,
          username: a.username,
          avatarUrl: a.avatarUrl,
          campus: a.campus || 'Nigerian Campus',
          bio: a.bio,
          isCreator: Boolean(a.isVerified || a.isCreator),
        });
      }
    });
    return Array.from(map.values());
  }, [creators, accounts]);

  const matchedPosts = useMemo(() => {
    const basePool =
      activeFilter === 'polls' ? socialPosts.filter((p) => p.type === 'poll') : socialPosts;
    const ranked = searchAndRankPosts(basePool, query, {
      userCampus: user?.campus || 'Chrisland University',
      sortBy: 'trending',
    });
    return ranked.slice(0, query ? 12 : 4);
  }, [socialPosts, query, activeFilter, user?.campus]);

  const matchedRooms = useMemo(() => {
    const ranked = searchAndRankRooms(rooms, query);
    return ranked.slice(0, query ? 8 : 4);
  }, [rooms, query]);

  const matchedPeople = useMemo(() => {
    const ranked = searchAndRankPeople(allPeople, query, {
      userCampus: user?.campus || 'Chrisland University',
    });
    return ranked.slice(0, query ? 8 : 4);
  }, [allPeople, query, user?.campus]);

  const dynamicTags = useMemo(
    () => computeTrendingHashtags(socialPosts, rooms, 8),
    [socialPosts, rooms]
  );

  if (!isSearchModalOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[115] flex items-end sm:items-start justify-center sm:pt-14 px-0 sm:px-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={() => setIsSearchModalOpen(false)}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl border border-[#EAE6F0] shadow-2xl overflow-hidden flex flex-col max-h-[88dvh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Search Input Bar */}
        <div className="p-3.5 sm:p-4 bg-white text-[#191525] flex items-center gap-3 border-b border-[#EAE6F0]">
          <div className="w-9 h-9 rounded-xl bg-[#F0EBFF] border border-[#5420F5]/20 flex items-center justify-center shrink-0">
            <BopoiSearchIcon size={18} />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={globalSearchQuery}
            onChange={(e) => setGlobalSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && globalSearchQuery.trim()) {
                e.preventDefault();
                saveRecentSearch(globalSearchQuery);
                setIsSearchModalOpen(false);
                setActiveView('discover');
              }
            }}
            placeholder="Search confessions, polls, rooms (#gist), or @students..."
            className="flex-1 bg-transparent text-[#191525] placeholder:text-[#706B7D] text-base sm:text-sm font-semibold focus:outline-none min-w-0"
          />
          {globalSearchQuery && (
            <button
              type="button"
              onClick={() => setGlobalSearchQuery('')}
              className="px-2.5 min-h-[34px] rounded-xl bg-[#FAF9FC] hover:bg-[#EAE6F0]/60 border border-[#EAE6F0] text-[11px] font-bold text-[#706B7D] hover:text-[#191525] transition-colors shrink-0 cursor-pointer"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsSearchModalOpen(false)}
            className="w-9 h-9 rounded-full bg-[#FAF9FC] hover:bg-[#EAE6F0]/70 flex items-center justify-center text-[#706B7D] hover:text-[#191525] transition-colors shrink-0 cursor-pointer"
            aria-label="Close search"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Category Filter Bar */}
        <div className="px-4 py-2.5 bg-[#FAF9FC] dark:bg-[#171322] border-b border-[#EAE6F0] dark:border-[#262036] flex items-center justify-between gap-2 overflow-x-auto no-scrollbar shrink-0">
          <div className="flex items-center gap-1.5">
            {(
              [
                { id: 'all', label: 'All Results' },
                { id: 'posts', label: 'Confessions & Posts' },
                { id: 'polls', label: 'Live Polls' },
                { id: 'rooms', label: 'Campus Rooms' },
                { id: 'people', label: 'Students' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilter(tab.id)}
                className={`px-3 min-h-[36px] rounded-xl text-xs font-extrabold transition-all whitespace-nowrap cursor-pointer ${
                  activeFilter === tab.id
                    ? 'bg-[#191525] dark:bg-[#F4F2FA] text-white dark:text-[#191525]'
                    : 'bg-white dark:bg-[#0E0C14] text-[#706B7D] dark:text-[#9E97B3] hover:text-[#191525] dark:hover:text-[#F4F2FA] border border-[#EAE6F0] dark:border-[#262036]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Recent Searches (when input empty) & Trending Hashtags */}
        {!query && recentSearches.length > 0 && (
          <div className="px-4 py-2 bg-[#FAF9FC]/70 border-b border-[#EAE6F0] flex items-center justify-between gap-2 overflow-x-auto no-scrollbar shrink-0">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <span className="text-[11px] font-extrabold text-[#706B7D] flex items-center gap-1 mr-1 shrink-0">
                <Clock className="w-3 h-3" /> Recent:
              </span>
              {recentSearches.map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => setGlobalSearchQuery(term)}
                  className="px-2.5 min-h-[28px] rounded-lg bg-white hover:bg-[#F0EBFF] hover:text-[#5420F5] border border-[#EAE6F0] text-[#191525] text-[11px] font-bold transition-colors shrink-0 cursor-pointer"
                >
                  {term}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={clearRecentSearches}
              className="text-[10px] font-bold text-[#706B7D] hover:text-rose-600 shrink-0 cursor-pointer"
            >
              Clear
            </button>
          </div>
        )}

        {dynamicTags.length > 0 && (
          <div className="px-4 py-2.5 bg-white border-b border-[#EAE6F0] flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
            <span className="text-[11px] font-extrabold text-[#706B7D] flex items-center gap-1 mr-1 shrink-0">
              <LaunchTrendingIcon size={14} /> Trending:
            </span>
            {dynamicTags.map((item) => (
              <button
                key={item.tag}
                type="button"
                onClick={() => {
                  const tagText = item.tag.replace(/^#/, '');
                  saveRecentSearch(item.tag);
                  setGlobalSearchQuery(tagText);
                }}
                className="px-2.5 min-h-[30px] rounded-lg bg-[#FAF9FC] hover:bg-[#F0EBFF] hover:text-[#5420F5] border border-[#EAE6F0] text-[#191525] text-[11px] font-bold transition-colors flex items-center gap-0.5 shrink-0 cursor-pointer"
              >
                <Hash className="w-2.5 h-2.5 opacity-60" />
                <span>{item.tag.replace(/^#/, '')}</span>
              </button>
            ))}
          </div>
        )}

        {/* Results Container */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-6 flex-1 bg-white">
          {/* Rooms Section */}
          {(activeFilter === 'all' || activeFilter === 'rooms') && matchedRooms.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold text-[#706B7D] flex items-center gap-1.5 tabular-nums">
                  <CreateRoomIcon size={16} />
                  Anonymous Campus Rooms ({matchedRooms.length})
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setIsSearchModalOpen(false);
                    setActiveView('rooms');
                  }}
                  className="text-[11px] font-extrabold text-[#5420F5] hover:underline cursor-pointer"
                >
                  View all rooms →
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {matchedRooms.map((room) => (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => {
                      if (globalSearchQuery.trim()) saveRecentSearch(globalSearchQuery);
                      setIsSearchModalOpen(false);
                      enterRoom(room.id);
                    }}
                      className="p-3 rounded-2xl border border-[#EAE6F0] dark:border-[#262036] hover:border-[#5420F5]/40 bg-[#FAF9FC] dark:bg-[#171322] hover:bg-[#F7F4FF] dark:hover:bg-[#231A45] text-left transition-all flex items-center gap-3 group cursor-pointer"
                  >
                    <RoomBadgeIcon
                      iconEmoji={room.iconEmoji}
                      iconBg={room.iconBg}
                      category={room.category}
                      roomName={room.name}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-black text-[#191525] dark:text-[#F4F2FA] truncate group-hover:text-[#5420F5] dark:group-hover:text-[#B9A7FF]">
                          #{room.name}
                        </p>
                        <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 shrink-0 tabular-nums">
                          {room.onlineCount} online
                        </span>
                      </div>
                      <p className="text-[11px] text-[#706B7D] dark:text-[#9E97B3] truncate mt-0.5">{room.description}</p>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-[#706B7D] group-hover:text-[#5420F5] shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Students / Creators Section */}
          {(activeFilter === 'all' || activeFilter === 'people') && matchedPeople.length > 0 && (
            <div className="space-y-2.5">
              <h3 className="text-xs font-extrabold text-[#706B7D] flex items-center gap-1.5 tabular-nums">
                <RealPeopleIcon size={16} />
                Campus Students &amp; Profiles ({matchedPeople.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {matchedPeople.map((person) => (
                  <div
                    key={person.username}
                    className="p-3 rounded-2xl border border-[#EAE6F0] bg-white hover:border-[#5420F5]/40 transition-all flex items-center justify-between gap-2.5"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (globalSearchQuery.trim()) saveRecentSearch(globalSearchQuery);
                        setIsSearchModalOpen(false);
                        viewUserProfile(person.username, false, person.campus);
                      }}
                      className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
                    >
                      <CampusCharacterAvatar
                        value={person.avatarUrl}
                        seed={person.username}
                        size={38}
                        rounded="full"
                        className="shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1 min-w-0">
                          <p className="text-xs font-black text-[#191525] truncate">{person.name}</p>
                          <VerifiedCreatorBadge isVerified={Boolean(person.isCreator)} username={person.username} size={14} />
                        </div>
                        <p className="text-[11px] text-[#706B7D] font-semibold truncate">
                          @{person.username} · {person.campus}
                        </p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsSearchModalOpen(false);
                        openPublicAskFor(person.username);
                      }}
                      className="px-3 min-h-[34px] rounded-xl bg-[#F0EBFF] hover:bg-[#5420F5] text-[#5420F5] hover:text-white text-[11px] font-black transition-colors shrink-0 cursor-pointer"
                    >
                      Ask Anon
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Posts & Polls Section */}
          {(activeFilter === 'all' || activeFilter === 'posts' || activeFilter === 'polls') &&
            matchedPosts.length > 0 && (
              <div className="space-y-2.5">
                <h3 className="text-xs font-extrabold text-[#706B7D] flex items-center gap-1.5 tabular-nums">
                  {activeFilter === 'polls' ? (
                    <CreatePollIcon size={16} />
                  ) : (
                    <StudentPostsIcon size={16} />
                  )}
                  {activeFilter === 'polls' ? 'Campus Polls' : 'Confessions, Discussions & Polls'} (
                  {matchedPosts.length})
                </h3>
                <div className="divide-y divide-[#EAE6F0] border border-[#EAE6F0] rounded-2xl overflow-hidden">
                  {matchedPosts.map((post) => (
                    <button
                      key={post.id}
                      type="button"
                      onClick={() => {
                        if (globalSearchQuery.trim()) saveRecentSearch(globalSearchQuery);
                        setIsSearchModalOpen(false);
                        setSelectedPost(post);
                        setActiveView(post.type === 'poll' ? 'poll-detail' : 'post-detail');
                      }}
                      className="w-full p-3.5 hover:bg-[#FAF9FC] bg-white text-left transition-colors flex items-start justify-between gap-3 group cursor-pointer"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap text-xs">
                          <span className="font-bold capitalize text-[#5420F5]">
                            {post.type}
                          </span>
                          <span className="text-[#706B7D]">·</span>
                          <span className="font-bold text-[#191525] truncate inline-flex items-center gap-1">
                            {post.isAnonymous ? (
                              <>
                                <PersonaMaskIcon mask="masked-student" size={14} />
                                <span>Anonymous</span>
                              </>
                            ) : (
                              post.authorName
                            )}
                          </span>
                          {post.authorCampus && (
                            <span className="text-[11px] text-[#706B7D] font-medium truncate">
                              · {post.authorCampus}
                            </span>
                          )}
                        </div>
                        {post.title && (
                          <p className="text-xs font-black text-[#191525] line-clamp-1">{post.title}</p>
                        )}
                        <p className="text-xs text-[#706B7D] line-clamp-2 leading-relaxed">{post.content}</p>
                        <div className="flex items-center gap-3 pt-1 text-[11px] font-bold text-[#706B7D] tabular-nums">
                          <span className="inline-flex items-center gap-1">
                            <Heart className="w-3 h-3 text-rose-500" /> {post.likes}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <MessageCircle className="w-3 h-3 text-[#5420F5]" /> {post.commentsCount}
                          </span>
                          {post.type === 'poll' && (
                            <span className="inline-flex items-center gap-1">
                              <CreatePollIcon size={12} /> {post.pollTotalVotes || 0} votes
                            </span>
                          )}
                        </div>
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-[#706B7D] group-hover:text-[#5420F5] shrink-0 mt-1" />
                    </button>
                  ))}
                </div>
              </div>
            )}

          {matchedPosts.length === 0 && matchedRooms.length === 0 && matchedPeople.length === 0 && (
            <div className="py-12 text-center space-y-2">
              <div className="flex justify-center">
                <SparklePolishIcon size={32} />
              </div>
              <p className="text-sm font-black text-[#191525]">
                No campus matches for &ldquo;{globalSearchQuery}&rdquo;
              </p>
              <p className="text-xs text-[#706B7D] max-w-sm mx-auto">
                Try searching for a university name (like UNILAG, UI, OAU), a room topic (#gist, #confessions), or a student handle.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
