import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  X,
  Hash,
  ArrowUpRight,
  Heart,
  MessageCircle,
} from 'lucide-react';
import { useBopoi } from '../../context/BopoiContext.tsx';
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
} from '../brand/icons/index.ts';
import { PersonaMaskIcon } from '../brand/masks/PersonaMaskIcon.tsx';

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
    setSelectedPost,
    setActiveView,
    enterRoom,
    viewUserProfile,
    openPublicAskFor,
  } = useBopoi();

  const [activeFilter, setActiveFilter] = useState<'all' | 'posts' | 'rooms' | 'people' | 'polls'>('all');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSearchModalOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 60);
    }
  }, [isSearchModalOpen]);

  // Global keyboard shortcut (Cmd/Ctrl + K or Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchModalOpen(!isSearchModalOpen);
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
        });
      }
    });
    return Array.from(map.values());
  }, [creators, accounts]);

  const matchedPosts = useMemo(() => {
    const list = socialPosts.filter((p) => {
      if (activeFilter === 'polls' && p.type !== 'poll') return false;
      if (!query) return true;
      const inContent = p.content.toLowerCase().includes(query);
      const inTitle = p.title?.toLowerCase().includes(query);
      const inAuthor = p.authorName.toLowerCase().includes(query) || p.authorUsername?.toLowerCase().includes(query);
      const inCampus = p.authorCampus?.toLowerCase().includes(query);
      const inCategory = p.category?.toLowerCase().includes(query);
      const inTags = p.hashtags?.some((t) => t.toLowerCase().includes(query.replace(/^#/, '')));
      return inContent || inTitle || inAuthor || inCampus || inCategory || inTags;
    });
    return list.slice(0, query ? 12 : 4);
  }, [socialPosts, query, activeFilter]);

  const matchedRooms = useMemo(() => {
    const list = rooms.filter((r) => {
      if (!query) return true;
      return (
        r.name.toLowerCase().includes(query) ||
        r.description.toLowerCase().includes(query) ||
        r.category.toLowerCase().includes(query) ||
        r.tags?.some((t) => t.toLowerCase().includes(query.replace(/^#/, '')))
      );
    });
    return list.slice(0, query ? 8 : 4);
  }, [rooms, query]);

  const matchedPeople = useMemo(() => {
    const list = allPeople.filter((p) => {
      if (!query) return true;
      return (
        p.name.toLowerCase().includes(query) ||
        p.username.toLowerCase().includes(query) ||
        p.campus.toLowerCase().includes(query) ||
        p.bio.toLowerCase().includes(query)
      );
    });
    return list.slice(0, query ? 8 : 4);
  }, [allPeople, query]);

  const trendingTags = ['UNILAG', 'Confessions', 'Carryover', 'HostelLife', 'CampusCrush', 'UI', 'OAU', 'Covenant'];

  if (!isSearchModalOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[115] flex items-start justify-center pt-3 sm:pt-14 px-3 sm:px-6 bg-slate-950/70 backdrop-blur-md animate-fade-in"
      onClick={() => setIsSearchModalOpen(false)}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[86vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Search Input Bar */}
        <div className="p-3.5 sm:p-4 bg-slate-900 text-white flex items-center gap-3 border-b border-slate-800">
          <div className="w-9 h-9 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center shrink-0">
            <BopoiSearchIcon size={20} />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={globalSearchQuery}
            onChange={(e) => setGlobalSearchQuery(e.target.value)}
            placeholder="Search confessions, polls, rooms (#gist), campuses, or @students..."
            className="flex-1 bg-transparent text-white placeholder:text-slate-400 text-sm sm:text-base font-semibold focus:outline-none min-w-0"
          />
          {globalSearchQuery && (
            <button
              onClick={() => setGlobalSearchQuery('')}
              className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-bold text-slate-300 transition-colors shrink-0"
            >
              Clear
            </button>
          )}
          <button
            onClick={() => setIsSearchModalOpen(false)}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-colors shrink-0"
            aria-label="Close search"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Category Filter Bar */}
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar shrink-0">
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
                onClick={() => setActiveFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap ${
                  activeFilter === tab.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200/80'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Trending Hashtags */}
        <div className="px-4 py-2.5 bg-white border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1 mr-1 shrink-0">
            <LaunchTrendingIcon size={14} /> Trending:
          </span>
          {trendingTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setGlobalSearchQuery(tag)}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-violet-50 hover:text-violet-700 text-slate-600 text-[11px] font-bold transition-colors flex items-center gap-0.5 shrink-0"
            >
              <Hash className="w-2.5 h-2.5 opacity-60" />
              {tag}
            </button>
          ))}
        </div>

        {/* Results Container */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-6 flex-1">
          {/* Rooms Section */}
          {(activeFilter === 'all' || activeFilter === 'rooms') && matchedRooms.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <CreateRoomIcon size={16} />
                  Anonymous Campus Rooms ({matchedRooms.length})
                </h3>
                <button
                  onClick={() => {
                    setIsSearchModalOpen(false);
                    setActiveView('rooms');
                  }}
                  className="text-[11px] font-extrabold text-violet-600 hover:text-violet-700"
                >
                  View all rooms →
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {matchedRooms.map((room) => (
                  <button
                    key={room.id}
                    onClick={() => {
                      setIsSearchModalOpen(false);
                      enterRoom(room.id);
                    }}
                    className="p-3 rounded-2xl border border-slate-200/80 hover:border-violet-300 bg-slate-50/60 hover:bg-violet-50/40 text-left transition-all flex items-center gap-3 group"
                  >
                    <div
                      className={`w-10 h-10 rounded-xl bg-gradient-to-br ${room.iconBg} flex items-center justify-center text-white shadow-xs shrink-0`}
                    >
                      <BopoiIcon
                        name={room.category || room.name}
                        size={20}
                        fallbackEmoji={room.iconEmoji}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-black text-slate-900 truncate group-hover:text-violet-700">
                          #{room.name}
                        </p>
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          {room.onlineCount}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">{room.description}</p>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-violet-600 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Students / Creators Section */}
          {(activeFilter === 'all' || activeFilter === 'people') && matchedPeople.length > 0 && (
            <div className="space-y-2.5">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <RealPeopleIcon size={16} />
                Campus Students & Profiles ({matchedPeople.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {matchedPeople.map((person) => (
                  <div
                    key={person.username}
                    className="p-3 rounded-2xl border border-slate-200/80 bg-white hover:border-violet-300 transition-all flex items-center justify-between gap-2.5"
                  >
                    <button
                      onClick={() => {
                        setIsSearchModalOpen(false);
                        viewUserProfile(person.username, false, person.campus);
                      }}
                      className="flex items-center gap-2.5 min-w-0 flex-1 text-left"
                    >
                      <CampusCharacterAvatar
                        value={person.avatarUrl}
                        seed={person.username}
                        size={38}
                        rounded="xl"
                        className="shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-black text-slate-900 truncate">{person.name}</p>
                        <p className="text-[11px] text-slate-500 font-semibold truncate">
                          @{person.username} • {person.campus}
                        </p>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        setIsSearchModalOpen(false);
                        openPublicAskFor(person.username);
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-violet-50 hover:bg-violet-600 text-violet-700 hover:text-white text-[11px] font-black transition-colors shrink-0"
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
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  {activeFilter === 'polls' ? (
                    <CreatePollIcon size={16} />
                  ) : (
                    <StudentPostsIcon size={16} />
                  )}
                  {activeFilter === 'polls' ? 'Campus Polls' : 'Confessions, Discussions & Polls'} (
                  {matchedPosts.length})
                </h3>
                <div className="space-y-2">
                  {matchedPosts.map((post) => (
                    <button
                      key={post.id}
                      onClick={() => {
                        setIsSearchModalOpen(false);
                        setSelectedPost(post);
                        setActiveView(post.type === 'poll' ? 'poll-detail' : 'post-detail');
                      }}
                      className="w-full p-3.5 rounded-2xl border border-slate-200/80 hover:border-violet-300 bg-white hover:bg-violet-50/30 text-left transition-all flex items-start justify-between gap-3 group"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-black uppercase">
                            {post.type}
                          </span>
                          <span className="text-xs font-bold text-slate-700 truncate inline-flex items-center gap-1">
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
                            <span className="text-[11px] text-slate-400 font-medium truncate">
                              • {post.authorCampus}
                            </span>
                          )}
                        </div>
                        {post.title && (
                          <p className="text-xs font-black text-slate-900 line-clamp-1">{post.title}</p>
                        )}
                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{post.content}</p>
                        <div className="flex items-center gap-3 pt-1 text-[11px] font-bold text-slate-400">
                          <span className="inline-flex items-center gap-1">
                            <Heart className="w-3 h-3 text-rose-500" /> {post.likes}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <MessageCircle className="w-3 h-3 text-violet-500" /> {post.commentsCount}
                          </span>
                          {post.type === 'poll' && (
                            <span className="inline-flex items-center gap-1">
                              <CreatePollIcon size={12} /> {post.pollTotalVotes || 0} votes
                            </span>
                          )}
                        </div>
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-violet-600 shrink-0 mt-1" />
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
              <p className="text-sm font-black text-slate-800">
                No campus matches for "{globalSearchQuery}"
              </p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Try searching for a university name (like UNILAG, UI, OAU), a room topic (#gist, #confessions), or a student handle.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
