import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useBopoi } from '../../context/BopoiContext.tsx';
import { SocialPost, ActiveAppView, RoomMessage } from '../../types/index.ts';
import {
  supabase,
  fetchPeopleYouMayKnow,
  computeLocalAdamicAdarRecommendations,
  recordPostBanditInteraction,
  searchAndRankPosts,
  searchAndRankPeople,
  searchAndRankRooms,
  computeDynamicTrendingTopics,
  computePostTrendingVelocityScore,
  resolveDiscoverTopicDefinition,
  inferCanonicalPostCategory,
} from '../../lib/supabase.ts';
import { PYMKRecommendation } from '../../lib/retentionEngine.ts';
import {
  Search,
  SlidersHorizontal,
  Heart,
  MessageCircle,
  Share2,
  Check,
  UserPlus,
  Hash,
  X,
} from 'lucide-react';
import { BopoiAnonymousAvatar } from '../brand/BopoiAnonymousAvatar.tsx';
import {
  BopoiIcon,
  BopoiSearchIcon,
  RealPeopleIcon,
  SearchEmptyIcon,
  DiscoverCompassNavIcon,
  CreateConfessionIcon,
  CreatePollIcon,
  CreateDiscussionIcon,
  CreatePostIcon,
  CreateRoomIcon,
  RoomBadgeIcon,
} from '../brand/icons/index.ts';
import { CampusCharacterAvatar } from '../brand/character/index.ts';

type SearchResultTab =
  | 'all'
  | 'people'
  | 'posts'
  | 'polls'
  | 'rooms';

export const DiscoverView: React.FC = () => {
  const {
    socialPosts,
    creators,
    accounts,
    rooms,
    enterRoom,
    toggleFollowCreator,
    isFollowingUser,
    followEdges,
    setSelectedPost,
    setActiveView,
    showToast,
    viewUserProfile,
    openPostShare,
    openPublicAskFor,
    setIsCreateModalOpen,
    setIsCreateRoomModalOpen,
    isSearchModalOpen,
    setIsSearchModalOpen,
    globalSearchQuery,
    setGlobalSearchQuery,
    user,
  } = useBopoi();

  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [activeResultTab, setActiveResultTab] = useState<SearchResultTab>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'trending' | 'latest'>('trending');
  const [campusFilter, setCampusFilter] = useState<'all' | 'my-campus'>('all');
  const searchSectionRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const searchQuery = globalSearchQuery;
  const setSearchQuery = setGlobalSearchQuery;

  // Auto-scroll and focus search input when navigated from the Header Search button
  useEffect(() => {
    if (isSearchModalOpen) {
      setTimeout(() => {
        searchSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        searchInputRef.current?.focus();
      }, 40);
      setIsSearchModalOpen(false);
    }
  }, [isSearchModalOpen, setIsSearchModalOpen]);

  const trendingTopics = useMemo(
    () => computeDynamicTrendingTopics(socialPosts, rooms),
    [socialPosts, rooms]
  );

  const q = searchQuery.trim().toLowerCase();
  const isSearching = q.length > 0 || Boolean(selectedTopic);

  // 1. Unified People Directory (Creators + Registered Student Accounts + Post Authors)
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
        creatorId?: string;
        isFollowing?: boolean;
      }
    >();

    creators.forEach((c) => {
      const key = c.username.toLowerCase();
      map.set(key, {
        id: c.id,
        name: c.name,
        username: c.username,
        avatarUrl: c.avatarUrl || '',
        campus: c.campus || 'Nigerian Campus',
        bio: c.bio || '',
        isCreator: true,
        creatorId: c.id,
        isFollowing: isFollowingUser(key),
      });
    });

    accounts.forEach((a) => {
      const key = a.username.toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          id: a.id,
          name: a.displayName,
          username: a.username,
          avatarUrl: a.avatarUrl,
          campus: a.campus || 'Nigerian Campus',
          bio: a.bio || '',
          isCreator: Boolean(a.isVerified || a.isCreator),
          creatorId: a.id,
          isFollowing: isFollowingUser(key),
        });
      }
    });

    socialPosts.forEach((p) => {
      if (!p.isAnonymous && p.authorUsername) {
        const key = p.authorUsername.toLowerCase();
        if (!map.has(key)) {
          map.set(key, {
            id: `usr_${key}`,
            name: p.authorName,
            username: p.authorUsername,
            avatarUrl: p.authorAvatar || '',
            campus: p.authorCampus || 'Nigerian Campus',
            bio: 'Active campus student on Bopoi',
            creatorId: p.authorUsername,
            isFollowing: isFollowingUser(key),
          });
        }
      }
    });

    return Array.from(map.values());
  }, [creators, accounts, socialPosts, followEdges, isFollowingUser]);

  // Only match people when the user explicitly types a search query `q` in the search input;
  // tapping a Trending Topic chip ('Campus Life', 'Relationships', etc.) should only show Posts, Polls & Rooms.
  const matchedPeople = useMemo(() => {
    if (!q) return [];
    return searchAndRankPeople(allPeople, q, {
      topic: selectedTopic,
      campusFilter,
      userCampus: user.campus || 'Chrisland University',
      posts: socialPosts,
    });
  }, [allPeople, q, selectedTopic, campusFilter, user.campus, socialPosts]);

  // 3. Filter & Rank Posts, Confessions, Polls & Discussions via Topic Taxonomy + BM25 + Time-Decayed Trending Velocity
  const filteredPosts = useMemo(() => {
    return searchAndRankPosts(socialPosts, q, {
      topic: selectedTopic,
      campusFilter,
      userCampus: user.campus || 'Chrisland University',
      sortBy,
    });
  }, [socialPosts, q, selectedTopic, campusFilter, sortBy, user.campus]);

  const filteredPolls = useMemo(
    () => filteredPosts.filter((p) => p.type === 'poll'),
    [filteredPosts]
  );

  // 4. Filter & Rank Rooms AND Room Messages via Topic Taxonomy + BM25 + Activity Velocity
  const filteredRooms = useMemo(() => {
    return searchAndRankRooms(rooms, q, { topic: selectedTopic });
  }, [rooms, q, selectedTopic]);

  const activeTopicDef = useMemo(
    () => resolveDiscoverTopicDefinition(selectedTopic),
    [selectedTopic]
  );

  const totalResultsCount =
    matchedPeople.length +
    filteredPosts.length +
    filteredRooms.length;

  // Redis-Cached Adamic-Adar 2-Hop Triadic Closure + Cold-Start Co-Engagement Recommendations ("People You May Know")
  const [redisPymkList, setRedisPymkList] = useState<PYMKRecommendation[] | null>(null);

  useEffect(() => {
    let active = true;
    fetchPeopleYouMayKnow(
      supabase,
      user.id || 'guest',
      user.campus || 'Chrisland University',
      {
        username: user.username,
        edges: followEdges,
        profiles: creators,
        posts: socialPosts,
      }
    ).then((res) => {
      if (active && Array.isArray(res) && res.length > 0) {
        setRedisPymkList(res);
      }
    });
    return () => {
      active = false;
    };
  }, [user.id, user.username, user.campus, followEdges, creators, socialPosts.length]);

  const pymkCreators = useMemo<PYMKRecommendation[]>(() => {
    const localComputed = computeLocalAdamicAdarRecommendations(
      user.id || '',
      user.username || '',
      user.campus || 'Chrisland University',
      followEdges,
      creators,
      socialPosts
    );
    const baseList = redisPymkList && redisPymkList.length > 0 ? redisPymkList : localComputed;
    const byUsername = new Map<string, PYMKRecommendation>();
    baseList.forEach((item) => {
      byUsername.set(item.username.toLowerCase(), {
        ...item,
        isFollowing: isFollowingUser(item.username),
      });
    });
    creators.forEach((c) => {
      const uLower = c.username.toLowerCase();
      if (!byUsername.has(uLower)) {
        byUsername.set(uLower, {
          ...c,
          isFollowing: isFollowingUser(c.username),
          adamicAdarScore: 0.15,
          mutualCount: 0,
          mutualUsernames: [],
          isFollowingYou: false,
          finalScore: 0.15,
        });
      }
    });
    return Array.from(byUsername.values());
  }, [redisPymkList, creators, followEdges, user.id, user.username, user.campus, isFollowingUser]);

  const handleCardClick = (post: SocialPost) => {
    recordPostBanditInteraction(supabase, post.id, true, 2500);
    setSelectedPost(post);
    if (post.type === 'poll') {
      setActiveView('poll-detail');
    } else {
      setActiveView('post-detail');
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 py-4 pb-24 space-y-6 text-[#191525]">
      {/* 1. Header */}
      <div className="flex items-center justify-between py-1">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-white border border-[#EAE6F0] shadow-2xs flex items-center justify-center shrink-0">
            <DiscoverCompassNavIcon size={28} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-[#191525] tracking-tight">
              Discover &amp; Search
            </h1>
            <p className="text-xs text-[#706B7D]">
              Search posts, confessions, polls, rooms &amp; students
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowFilters((prev) => !prev)}
          className={`p-2 rounded-2xl border transition-colors cursor-pointer shadow-xs ${
            showFilters || campusFilter !== 'all' || sortBy !== 'trending'
              ? 'border-[#5420F5] bg-[#F0EBFF] text-[#5420F5]'
              : 'border-[#EAE6F0] bg-white text-slate-700 hover:bg-slate-50'
          }`}
          title="Filter & sort preferences"
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>
      </div>

      {showFilters && (
        <div className="bg-white rounded-2xl border border-[#EAE6F0] p-4 shadow-xs space-y-3 animate-in fade-in duration-150">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-black text-[#191525] uppercase tracking-wider">
              Discover Filters &amp; Sort
            </span>
            {(campusFilter !== 'all' || sortBy !== 'trending' || selectedTopic) && (
              <button
                onClick={() => {
                  setCampusFilter('all');
                  setSortBy('trending');
                  setSelectedTopic(null);
                  showToast('Discover filters reset', 'info');
                }}
                className="text-[11px] font-bold text-[#5420F5] hover:underline cursor-pointer"
              >
                Reset all
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-[#706B7D] block">Sort Feed By</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setSortBy('trending')}
                  className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    sortBy === 'trending'
                      ? 'bg-[#5420F5] text-white border-[#5420F5]'
                      : 'bg-[#FAF9FC] text-slate-600 border-[#EAE6F0] hover:bg-slate-100'
                  }`}
                >
                  🔥 Trending
                </button>
                <button
                  onClick={() => setSortBy('latest')}
                  className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    sortBy === 'latest'
                      ? 'bg-[#5420F5] text-white border-[#5420F5]'
                      : 'bg-[#FAF9FC] text-slate-600 border-[#EAE6F0] hover:bg-slate-100'
                  }`}
                >
                  ⚡ Newest First
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-[#706B7D] block">Campus Scope</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCampusFilter('all')}
                  className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    campusFilter === 'all'
                      ? 'bg-[#5420F5] text-white border-[#5420F5]'
                      : 'bg-[#FAF9FC] text-slate-600 border-[#EAE6F0] hover:bg-slate-100'
                  }`}
                >
                  🌍 All Campuses
                </button>
                <button
                  onClick={() => setCampusFilter('my-campus')}
                  className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer truncate ${
                    campusFilter === 'my-campus'
                      ? 'bg-[#5420F5] text-white border-[#5420F5]'
                      : 'bg-[#FAF9FC] text-slate-600 border-[#EAE6F0] hover:bg-slate-100'
                  }`}
                >
                  🎓 {user.campus || 'My Campus'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Search Input Section */}
      <div
        id="discover-search-section"
        ref={searchSectionRef}
        className="space-y-3 scroll-mt-20"
      >
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center">
            <BopoiSearchIcon size={18} />
          </span>
          <input
            id="discover-search-input"
            ref={searchInputRef}
            type="search"
            inputMode="search"
            enterKeyHint="search"
            autoFocus={isSearchModalOpen}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search posts, confessions, polls, rooms, @students..."
            className="w-full pl-10 pr-16 py-3.5 bg-white border-2 border-[#EAE6F0] rounded-2xl text-base sm:text-sm font-semibold text-[#191525] placeholder:text-slate-400 focus:outline-none focus:border-[#5420F5] focus:ring-4 focus:ring-[#5420F5]/10 transition-all shadow-xs"
          />
          {(searchQuery || selectedTopic) && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedTopic(null);
                setActiveResultTab('all');
                searchInputRef.current?.focus();
              }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-extrabold text-[#5420F5] hover:text-black cursor-pointer bg-[#F0EBFF] px-2.5 py-1 rounded-lg"
            >
              Clear
            </button>
          )}
        </div>

        {/* ================================================================= */}
        {/* DIRECTLY UNDER SEARCH BAR: SIMPLE & READABLE FULL-INFO RESULTS    */}
        {/* ================================================================= */}
        {isSearching && (
          <div className="bg-white rounded-2xl border border-[#EAE6F0] shadow-xs overflow-hidden animate-in fade-in duration-150">
            {/* Active Topic Header Banner when a Trending Topic chip is selected */}
            {activeTopicDef && (
              <div className="px-4 py-3 bg-gradient-to-r from-[#F0EBFF] via-purple-50/60 to-white border-b border-[#EAE6F0] flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-white border border-[#5420F5]/20 shadow-2xs flex items-center justify-center shrink-0">
                    <BopoiIcon name={activeTopicDef.iconName} size={20} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs sm:text-sm font-black text-[#191525] truncate">
                        {activeTopicDef.label}
                      </h4>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#5420F5] text-white shrink-0">
                        Topic Feed
                      </span>
                    </div>
                    <p className="text-[11px] text-[#706B7D] truncate">
                      {activeTopicDef.description}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTopic(null);
                    setActiveResultTab('all');
                  }}
                  className="p-1.5 rounded-lg bg-white/80 hover:bg-white text-slate-500 hover:text-[#191525] border border-[#EAE6F0] transition-colors cursor-pointer shrink-0"
                  title="Clear topic filter"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Simple Filter Bar */}
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-100 bg-[#FAF9FC]">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {(
                  [
                    { id: 'all', label: 'All', count: totalResultsCount, show: true },
                    { id: 'posts', label: 'Posts', count: filteredPosts.length, show: true },
                    { id: 'polls', label: 'Polls', count: filteredPolls.length, show: true },
                    { id: 'rooms', label: 'Rooms', count: filteredRooms.length, show: true },
                    { id: 'people', label: 'People', count: matchedPeople.length, show: q.length > 0 },
                  ] as const
                )
                  .filter((tab) => tab.show)
                  .map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveResultTab(tab.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer shrink-0 inline-flex items-center gap-1.5 ${
                      activeResultTab === tab.id
                        ? 'bg-[#5420F5] text-white'
                        : 'text-[#706B7D] hover:text-[#191525] hover:bg-slate-200/60'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                        activeResultTab === tab.id
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-200/80 text-slate-600'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              <span className="text-xs font-bold text-slate-500 shrink-0 pl-2">
                {totalResultsCount} {totalResultsCount === 1 ? 'match' : 'matches'}
              </span>
            </div>

            {totalResultsCount === 0 ? (
              <div className="py-10 px-4 text-center flex flex-col items-center justify-center space-y-3.5">
                <div className="w-16 h-16 rounded-2xl bg-[#F0EBFF] border border-[#5420F5]/15 flex items-center justify-center mx-auto shadow-2xs p-2">
                  <SearchEmptyIcon size={42} />
                </div>
                <div className="max-w-sm mx-auto space-y-1">
                  <p className="text-sm font-black text-[#191525]">
                    No direct matches for "{searchQuery || selectedTopic}"
                  </p>
                  <p className="text-xs text-[#706B7D] leading-relaxed">
                    Be the first on your campus to spark a conversation or anonymous room on this topic:
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-[#5420F5] hover:bg-[#4314E2] text-white text-xs font-extrabold transition-all cursor-pointer shadow-xs"
                  >
                    + Ask / Poll Campus about "{(searchQuery || selectedTopic || '').slice(0, 22)}"
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCreateRoomModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-[#F0EBFF] hover:bg-[#5420F5] text-[#5420F5] hover:text-white text-xs font-extrabold transition-all cursor-pointer"
                  >
                    + Create #{(searchQuery || selectedTopic || 'Topic').replace(/\s+/g, '')} Room
                  </button>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {/* 1. Posts, Confessions, Polls & Discussions (Full readable content) */}
                {(activeResultTab === 'all' ||
                  activeResultTab === 'posts' ||
                  activeResultTab === 'polls') &&
                  (activeResultTab === 'polls' ? filteredPolls : filteredPosts)
                    .slice(0, activeResultTab === 'all' ? 10 : 30)
                    .map((post) => (
                      <div
                        key={post.id}
                        onClick={() => handleCardClick(post)}
                        className="w-full p-4 hover:bg-slate-50/80 transition-colors cursor-pointer space-y-2.5 text-left"
                      >
                        {/* Author & Meta */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {post.isAnonymous ? (
                              <BopoiAnonymousAvatar
                                size="sm"
                                idPrefix={`search-post-${post.id}`}
                              />
                            ) : (
                              <CampusCharacterAvatar
                                value={post.authorAvatar}
                                seed={post.authorUsername}
                                size={36}
                                rounded="full"
                                className="shrink-0"
                              />
                            )}
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs sm:text-sm font-black text-[#191525]">
                                  {post.authorName}
                                </span>
                                {!post.isAnonymous && post.authorUsername && (
                                  <span className="text-xs text-[#706B7D]">
                                    @{post.authorUsername}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-[#706B7D]">
                                {post.createdAt}
                                {post.authorCampus ? ` • ${post.authorCampus}` : ''}
                                {` • ${inferCanonicalPostCategory(post)}`}
                              </p>
                            </div>
                          </div>

                          <span className="text-[11px] font-bold text-[#5420F5] bg-[#F0EBFF] px-2.5 py-1 rounded-lg capitalize shrink-0">
                            {inferCanonicalPostCategory(post)}
                          </span>
                        </div>

                        {/* Full Title & Full Post Content */}
                        {post.title && (
                          <h4 className="text-sm font-black text-[#191525] leading-snug">
                            {post.title}
                          </h4>
                        )}
                        <p className="text-xs sm:text-sm text-[#191525] font-medium leading-relaxed whitespace-pre-wrap break-words">
                          {post.content}
                        </p>

                        {/* Poll Options Preview (if Poll) */}
                        {post.type === 'poll' && post.pollOptions && post.pollOptions.length > 0 && (
                          <div className="space-y-1.5 pt-1">
                            {(() => {
                              const total =
                                post.pollTotalVotes ||
                                post.pollOptions.reduce((sum, o) => sum + o.votes, 0) ||
                                1;
                              return post.pollOptions.map((opt) => {
                                const pct = Math.min(100, Math.round((opt.votes / total) * 100));
                                const isVoted = post.userVotedOptionId === opt.id;
                                return (
                                  <div
                                    key={opt.id}
                                    className={`relative overflow-hidden rounded-xl border px-3 py-2 text-xs ${
                                      isVoted
                                        ? 'border-[#5420F5]/40 bg-[#F0EBFF]/30'
                                        : 'border-slate-200/80 bg-[#FAF9FC]'
                                    }`}
                                  >
                                    <div
                                      className="absolute inset-y-0 left-0 bg-[#5420F5]/10 transition-all"
                                      style={{ width: `${pct}%` }}
                                    />
                                    <div className="relative z-10 flex items-center justify-between gap-2">
                                      <span className="font-semibold text-[#191525] truncate">
                                        {opt.text}
                                      </span>
                                      <span className="font-bold text-[#5420F5] shrink-0">
                                        {pct}%
                                      </span>
                                    </div>
                                  </div>
                                );
                              });
                            })()}
                            <p className="text-[11px] text-[#706B7D] font-medium">
                              {(
                                post.pollTotalVotes ||
                                post.pollOptions.reduce((sum, o) => sum + o.votes, 0)
                              ).toLocaleString()}{' '}
                              total votes
                            </p>
                          </div>
                        )}

                        {/* Footer Stats */}
                        <div className="flex items-center gap-4 pt-1 text-xs text-[#706B7D]">
                          <span className="flex items-center gap-1 font-semibold text-[#F52D85]">
                            <Heart className="w-3.5 h-3.5 fill-[#F52D85]" /> {post.likes} likes
                          </span>
                          <span className="flex items-center gap-1 font-semibold">
                            <MessageCircle className="w-3.5 h-3.5" /> {post.commentsCount} comments
                          </span>
                          {post.hashtags && post.hashtags.length > 0 && (
                            <span className="text-[#5420F5] font-semibold">
                              #{post.hashtags.slice(0, 3).join(' #')}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}

                {/* 2. People & Students (Only shown when searching by text query `q`, never on Topic chips) */}
                {q.length > 0 &&
                  (activeResultTab === 'all' || activeResultTab === 'people') &&
                  matchedPeople.slice(0, activeResultTab === 'people' ? 20 : 6).map((person) => (
                    <div
                      key={person.username}
                      onClick={() => viewUserProfile(person.username, false, person.campus)}
                      className="w-full p-4 hover:bg-slate-50/80 transition-colors flex items-center justify-between gap-3 cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <CampusCharacterAvatar
                          value={person.avatarUrl}
                          seed={person.username}
                          size={40}
                          rounded="full"
                          className="shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-black text-[#191525] truncate">{person.name}</p>
                          <p className="text-xs text-[#706B7D] truncate">
                            <span className="font-semibold text-[#5420F5]">@{person.username}</span> • {person.campus}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openPublicAskFor(person.username);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-[#F0EBFF] hover:bg-[#5420F5] text-[#5420F5] hover:text-white text-xs font-bold transition-colors cursor-pointer"
                        >
                          Ask Anon
                        </button>
                      </div>
                    </div>
                  ))}

                {/* 3. Campus Rooms (Full Description & Member Info) */}
                {(activeResultTab === 'all' || activeResultTab === 'rooms') &&
                  filteredRooms.slice(0, activeResultTab === 'rooms' ? 15 : 5).map((room) => (
                    <div
                      key={room.id}
                      onClick={() => enterRoom(room.id)}
                      className="w-full p-4 hover:bg-slate-50/80 transition-colors flex items-start justify-between gap-3 text-left cursor-pointer"
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <RoomBadgeIcon
                          iconEmoji={room.iconEmoji}
                          iconBg={room.iconBg}
                          category={room.category}
                          roomName={room.name}
                          size="sm"
                          className="mt-0.5"
                        />
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-black text-[#191525]">#{room.name}</p>
                            <span className="text-[11px] font-semibold text-emerald-600">
                              {room.membersCount} members • {room.onlineCount || 1} online
                            </span>
                          </div>
                          <p className="text-xs text-[#706B7D] leading-relaxed break-words">
                            {room.description}
                          </p>
                        </div>
                      </div>
                      <span className="px-3 py-1.5 rounded-xl bg-[#5420F5] text-white text-xs font-bold shrink-0">
                        Enter Room
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Campus Channels Section */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-[#191525]">Campus channels</h3>
          <span className="text-[11px] font-semibold text-[#706B7D]">Jump into a feed</span>
        </div>
        <div className="grid grid-cols-4 gap-2 sm:gap-2.5">
          {[
            {
              label: 'Confessions',
              view: 'confessions' as ActiveAppView,
              icon: <CreateConfessionIcon size={24} />,
            },
            {
              label: 'Live Polls',
              view: 'polls' as ActiveAppView,
              icon: <CreatePollIcon size={24} />,
            },
            {
              label: 'Discussions',
              view: 'discussions' as ActiveAppView,
              icon: <CreateDiscussionIcon size={24} />,
            },
            {
              label: 'Chat Rooms',
              view: 'rooms' as ActiveAppView,
              icon: <CreateRoomIcon size={24} />,
            },
          ].map((ch) => (
            <button
              key={ch.label}
              type="button"
              onClick={() => setActiveView(ch.view)}
              className="p-2.5 sm:p-3 rounded-2xl bg-white border border-[#EAE6F0] hover:border-[#5420F5]/40 hover:shadow-xs transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 text-center group active:scale-95 shadow-2xs"
            >
              <div className="w-10 h-10 rounded-xl bg-[#FAF9FC] border border-slate-100 flex items-center justify-center group-hover:scale-105 transition-transform">
                {ch.icon}
              </div>
              <span className="text-[11px] font-black text-[#191525] group-hover:text-[#5420F5] truncate w-full">
                {ch.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 4. Trending Topics Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-[#191525]">Trending topics</h3>
          <span
            onClick={() => setSelectedTopic(null)}
            className="text-xs font-bold text-[#5420F5] hover:underline cursor-pointer"
          >
            {selectedTopic ? 'Clear filter' : 'See all'}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {trendingTopics.map((item) => {
            const isSelected = selectedTopic === item.tag;
            return (
              <button
                key={item.tag}
                onClick={() => {
                  const nextTopic = isSelected ? null : item.tag;
                  setSelectedTopic(nextTopic);
                  setActiveResultTab('all');
                  if (nextTopic) {
                    setTimeout(() => {
                      searchSectionRef.current?.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start',
                      });
                    }, 40);
                  }
                }}
                className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-[#5420F5] text-white shadow-md shadow-[#5420F5]/25'
                    : 'bg-white border border-[#EAE6F0] text-slate-700 hover:border-[#5420F5]/40 hover:bg-slate-50 shadow-2xs'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                    isSelected ? 'bg-white shadow-2xs' : 'bg-purple-50'
                  }`}
                >
                  <BopoiIcon name={item.iconName} size={14} />
                </span>
                <span>{item.label}</span>
                {item.activeCount > 0 && (
                  <span
                    className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-[#F0EBFF] text-[#5420F5]'
                    }`}
                  >
                    {item.activeCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Dynamic Velocity-Ranked Hashtag Chips from Real Posts & Rooms */}
        {(() => {
          const tagVelocityMap = new Map<string, number>();
          const now = Date.now();
          for (const p of socialPosts) {
            const v = computePostTrendingVelocityScore(p, now);
            for (const rawTag of p.hashtags || []) {
              const clean = rawTag.replace(/^#/, '').trim();
              if (!clean) continue;
              tagVelocityMap.set(clean, (tagVelocityMap.get(clean) || 0) + v + 1);
            }
          }
          for (const r of rooms) {
            for (const rawTag of r.tags || []) {
              const clean = rawTag.replace(/^#/, '').trim();
              if (!clean) continue;
              tagVelocityMap.set(
                clean,
                (tagVelocityMap.get(clean) || 0) + (r.onlineCount || 1) * 0.5 + 0.5
              );
            }
          }

          const dynamicTags = Array.from(tagVelocityMap.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([tag]) => tag)
            .slice(0, 10);

          if (dynamicTags.length === 0) return null;

          return (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
              {dynamicTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSearchQuery(tag)}
                  className="px-2.5 py-1 rounded-xl bg-white border border-[#EAE6F0] hover:border-[#5420F5]/40 text-[11px] font-bold text-[#706B7D] hover:text-[#5420F5] flex items-center gap-0.5 shrink-0 cursor-pointer transition-colors"
                >
                  <Hash className="w-3 h-3 text-[#5420F5]" />
                  <span>{tag}</span>
                </button>
              ))}
            </div>
          );
        })()}
      </div>

      {/* 5. Popular Posts Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-[#191525]">Popular posts</h3>
          <span
            onClick={() => setActiveView('home')}
            className="text-xs font-bold text-[#5420F5] hover:underline cursor-pointer"
          >
            See all
          </span>
        </div>

        {socialPosts.length === 0 ? (
          <div className="bg-white rounded-3xl p-6 border border-[#EAE6F0] text-center space-y-2 shadow-xs">
            <p className="text-xs font-bold text-[#191525]">No posts published yet</p>
            <p className="text-[11px] text-[#706B7D]">
              When students share confessions, polls, and discussions, the most popular ones will appear here.
            </p>
          </div>
        ) : (
        <div className="space-y-3">
          {socialPosts.slice(0, 4).map((post) => (
            <div
              key={post.id}
              onClick={() => handleCardClick(post)}
              className="bg-white rounded-3xl p-4 border border-[#EAE6F0] shadow-xs hover:border-[#5420F5]/30 hover:shadow-md transition-all cursor-pointer space-y-2.5"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div
                  className="flex items-center gap-2.5 cursor-pointer hover:opacity-85 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    viewUserProfile(post.authorUsername, post.isAnonymous, post.authorCampus);
                  }}
                  title={`View ${post.authorName}'s public profile`}
                >
                  {post.isAnonymous ? (
                    <BopoiAnonymousAvatar size="sm" idPrefix={`disc-post-${post.id}`} />
                  ) : (
                    <CampusCharacterAvatar
                      value={post.authorAvatar}
                      seed={post.authorUsername}
                      size={28}
                      rounded="full"
                      className="ring-1 ring-[#5420F5]/20"
                    />
                  )}
                  <div>
                    <span className="text-xs font-black text-[#191525] block hover:underline">
                      {post.authorName}
                    </span>
                    <span className="text-[10px] text-[#706B7D] block">
                      {post.createdAt} {post.authorCampus && `• ${post.authorCampus}`}
                    </span>
                  </div>
                </div>

                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 capitalize inline-flex items-center gap-1">
                  {post.type === 'confession' ? (
                    <CreateConfessionIcon size={13} />
                  ) : post.type === 'poll' ? (
                    <CreatePollIcon size={13} />
                  ) : post.type === 'discussion' ? (
                    <CreateDiscussionIcon size={13} />
                  ) : (
                    <CreatePostIcon size={13} />
                  )}
                  <span>{post.category || post.type}</span>
                </span>
              </div>

              {/* Content */}
              <p className="text-xs sm:text-sm font-semibold text-[#191525] leading-relaxed">
                {post.content}
              </p>

              {/* Stats */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1 font-semibold text-[#F52D85]">
                    <Heart className="w-3.5 h-3.5 fill-[#F52D85]" />
                    <span>{post.likes}</span>
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-slate-600">
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>{post.commentsCount}</span>
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openPostShare(post);
                  }}
                  className="flex items-center gap-1 text-slate-400 hover:text-[#5420F5] transition-colors cursor-pointer py-1 px-1.5 rounded-lg hover:bg-[#F0EBFF]"
                  title="Share post off-campus"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span className="text-xs font-semibold">{post.sharesCount || 0}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
        )}
      </div>

      {/* 6. Explore Community Rooms Section */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <CreateRoomIcon size={18} />
            <h3 className="text-sm font-black text-[#191525]">Campus Community Rooms</h3>
          </div>
          <button
            onClick={() => setActiveView('rooms')}
            className="text-xs font-bold text-[#5420F5] hover:underline cursor-pointer"
          >
            See all rooms ({rooms.length}) →
          </button>
        </div>

        {rooms.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 border border-[#EAE6F0] text-center flex flex-col items-center justify-center space-y-3 shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-[#F0EBFF] border border-[#5420F5]/15 flex items-center justify-center mx-auto shadow-2xs p-2">
              <CreateRoomIcon size={36} />
            </div>
            <div className="space-y-1 max-w-xs mx-auto">
              <p className="text-sm font-black text-[#191525]">No community rooms yet</p>
              <p className="text-xs text-[#706B7D]">
                Create the first anonymous room for your campus or faculty!
              </p>
            </div>
          </div>
        ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {rooms.slice(0, 4).map((room) => (
            <div
              key={room.id}
              onClick={() => enterRoom(room.id)}
              className="bg-white rounded-3xl p-3.5 border border-[#EAE6F0] shadow-xs hover:border-[#5420F5]/40 hover:shadow-md transition-all cursor-pointer flex items-center justify-between gap-3 group active:scale-[0.99]"
              title={`Enter #${room.name}`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <RoomBadgeIcon
                  iconEmoji={room.iconEmoji}
                  iconBg={room.iconBg}
                  category={room.category}
                  roomName={room.name}
                  size="sm"
                  className="group-hover:scale-105 transition-transform"
                />
                <div className="min-w-0">
                  <h4 className="text-xs font-black text-[#191525] truncate group-hover:text-[#5420F5] transition-colors">
                    {room.name}
                  </h4>
                  <p className="text-[10px] text-slate-500 truncate mt-0.5">{room.description}</p>
                  <span className="text-[9px] text-emerald-600 font-bold block mt-0.5">
                    {room.membersCount >= 1000
                      ? `${(room.membersCount / 1000).toFixed(1)}k`
                      : room.membersCount}{' '}
                    members • {room.onlineCount || 1} online
                  </span>
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  enterRoom(room.id);
                }}
                className="px-3 py-1.5 bg-[#5420F5] hover:bg-[#4314E2] text-white text-xs font-black rounded-xl transition-all cursor-pointer shrink-0 shadow-xs flex items-center gap-1"
              >
                <span>Enter</span>
                <span>→</span>
              </button>
            </div>
          ))}
        </div>
        )}
      </div>

      {/* 7. People to Follow Section */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-[#191525]">People to follow</h3>
        </div>

        {pymkCreators.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 border border-[#EAE6F0] text-center flex flex-col items-center justify-center space-y-3 shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-[#F0EBFF] border border-[#5420F5]/15 flex items-center justify-center mx-auto shadow-2xs p-2">
              <RealPeopleIcon size={36} />
            </div>
            <div className="space-y-1 max-w-xs mx-auto">
              <p className="text-sm font-black text-[#191525]">No student profiles yet</p>
              <p className="text-xs text-[#706B7D]">
                Registered campus students will appear here as they join Bopoi.
              </p>
            </div>
          </div>
        ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {pymkCreators.map((c) => (
            <div
              key={c.id}
              className="bg-white rounded-3xl p-3.5 border border-[#EAE6F0] shadow-xs flex flex-col items-center text-center space-y-2 hover:border-[#5420F5]/40 transition-colors relative"
            >
              {c.isFollowingYou ? (
                <span className="px-2 py-0.5 rounded-full bg-[#F0EBFF] text-[#5420F5] text-[9px] font-black uppercase tracking-wider">
                  Follows you
                </span>
              ) : c.mutualCount > 0 ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[9px] font-black">
                  {c.mutualCount} mutual{c.mutualCount > 1 ? 's' : ''}
                </span>
              ) : null}

              <div
                onClick={() => viewUserProfile(c)}
                className="rounded-full ring-2 ring-[#FFC928] shadow-xs cursor-pointer hover:scale-105 transition-transform"
                title={`View ${c.name}'s profile`}
              >
                <CampusCharacterAvatar
                  value={c.avatarUrl}
                  seed={c.username}
                  size={56}
                  rounded="full"
                />
              </div>

              <div
                onClick={() => viewUserProfile(c)}
                className="w-full cursor-pointer hover:opacity-80"
                title={`View ${c.name}'s profile`}
              >
                <h4 className="text-xs font-black text-[#191525] truncate hover:underline">
                  {c.name}
                </h4>
                <p className="text-[10px] text-[#706B7D] truncate">@{c.username}</p>
                <span className="text-[9px] font-bold text-[#5420F5] block truncate mt-0.5">
                  {c.campus}
                </span>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFollowCreator(c.id);
                }}
                className={`w-full py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  c.isFollowing
                    ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    : 'bg-[#5420F5] hover:bg-[#4314E2] text-white shadow-xs'
                }`}
              >
                {c.isFollowing ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                    <span>Following</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3 h-3" />
                    <span>{c.isFollowingYou ? 'Follow Back' : 'Follow'}</span>
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
        )}
      </div>
    </div>
  );
};
