import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useBopoi } from '../../context/BopoiContext.tsx';
import { SocialPost, ActiveAppView } from '../../types/index.ts';
import {
  supabase,
  fetchPeopleYouMayKnow,
  computeLocalAdamicAdarRecommendations,
  recordPostBanditInteraction,
  searchAndRankPosts,
  searchAndRankPeople,
  searchAndRankRooms,
  computeDynamicTrendingTopics,
  resolveDiscoverTopicDefinition,
} from '../../lib/supabase.ts';
import { PYMKRecommendation } from '../../lib/retentionEngine.ts';
import {
  SlidersHorizontal,
  Check,
  UserPlus,
  Hash,
  X,
  Flame,
  Clock,
  Globe,
  School,
  Lock,
  Plus,
  ChevronRight,
  ChevronDown,
  BarChart3,
  TrendingUp,
} from 'lucide-react';
import {
  BopoiIcon,
  BopoiSearchIcon,
  RealPeopleIcon,
  SearchEmptyIcon,
  DiscoverCompassNavIcon,
  CreateConfessionIcon,
  CreatePollIcon,
  CreateDiscussionIcon,
  CreateRoomIcon,
  RoomBadgeIcon,
} from '../brand/icons/index.ts';
import { CampusCharacterAvatar } from '../brand/character/index.ts';
import { VerifiedCreatorBadge } from '../ui/VerifiedCreatorBadge.tsx';
import { FeedPostRow } from '../feed/FeedPostRow.tsx';
import {
  computeTrendingHashtags,
  normalizeHashtag,
  postMatchesHashtag,
  roomMatchesHashtag,
} from '../../utils/hashtags.ts';

type SearchResultTab = 'all' | 'people' | 'posts' | 'polls' | 'rooms';
type ExploreSectionTab = 'explore' | 'trending' | 'polls' | 'rooms' | 'people';

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
    openPublicAskFor,
    setIsCreateModalOpen,
    setIsCreateRoomModalOpen,
    setIsSearchModalOpen,
    globalSearchQuery,
    setGlobalSearchQuery,
    activeHashtag,
    setActiveHashtag,
    openCreateWithHashtag,
    goBack,
    user,
  } = useBopoi();

  const [exploreTab, setExploreTab] = useState<ExploreSectionTab>('explore');
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [activeResultTab, setActiveResultTab] = useState<SearchResultTab>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'trending' | 'latest'>('trending');
  const [campusFilter, setCampusFilter] = useState<'all' | 'my-campus'>('all');
  const [popularExpanded, setPopularExpanded] = useState(false);
  const [peopleExpanded, setPeopleExpanded] = useState(false);
  const searchSectionRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const searchQuery = globalSearchQuery;
  const setSearchQuery = setGlobalSearchQuery;

  const verifiedUsernameSet = useMemo(() => {
    const set = new Set<string>();
    for (const u of accounts || []) {
      if (u.isVerified || u.isCreator) set.add(u.username.toLowerCase());
    }
    return set;
  }, [accounts]);

  const trendingTopics = useMemo(
    () => computeDynamicTrendingTopics(socialPosts, rooms),
    [socialPosts, rooms]
  );

  const liveTrendingHashtags = useMemo(
    () => computeTrendingHashtags(socialPosts, rooms, 12),
    [socialPosts, rooms]
  );

  const q = searchQuery.trim().toLowerCase();
  const isSearching = q.length > 0 || Boolean(selectedTopic) || Boolean(activeHashtag);

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
        isCreator: Boolean(c.isVerified),
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

  const matchedPeople = useMemo(() => {
    if (!q) return [];
    return searchAndRankPeople(allPeople, q, {
      topic: selectedTopic,
      campusFilter,
      userCampus: user.campus || 'Chrisland University',
      posts: socialPosts,
    });
  }, [allPeople, q, selectedTopic, campusFilter, user.campus, socialPosts]);

  const filteredPosts = useMemo(() => {
    let base = socialPosts;
    if (activeHashtag) {
      base = base.filter((p) => postMatchesHashtag(p, activeHashtag));
    }
    return searchAndRankPosts(base, q, {
      topic: selectedTopic,
      campusFilter,
      userCampus: user.campus || 'Chrisland University',
      sortBy,
    });
  }, [socialPosts, activeHashtag, q, selectedTopic, campusFilter, sortBy, user.campus]);

  const filteredPolls = useMemo(
    () => filteredPosts.filter((p) => p.type === 'poll'),
    [filteredPosts]
  );

  const filteredRooms = useMemo(() => {
    let baseRooms = rooms;
    if (activeHashtag) {
      baseRooms = baseRooms.filter((r) => roomMatchesHashtag(r, activeHashtag));
    }
    return searchAndRankRooms(baseRooms, q, { topic: selectedTopic });
  }, [rooms, activeHashtag, q, selectedTopic]);

  const exploreRankedPosts = useMemo(() => {
    const userCampusLower = (user.campus || '').trim().toLowerCase();
    const base =
      campusFilter === 'my-campus' && userCampusLower
        ? socialPosts.filter(
            (p) => (p.authorCampus || '').trim().toLowerCase() === userCampusLower
          )
        : socialPosts;

    if (sortBy === 'latest') {
      return [...base].sort((a, b) => (b.createdTimestamp || 0) - (a.createdTimestamp || 0));
    }

    return [...base].sort((a, b) => {
      const scoreA =
        (a.likes || 0) * 2 +
        (a.commentsCount || 0) * 3 +
        (a.sharesCount || 0) * 2 +
        (a.pollTotalVotes || 0);
      const scoreB =
        (b.likes || 0) * 2 +
        (b.commentsCount || 0) * 3 +
        (b.sharesCount || 0) * 2 +
        (b.pollTotalVotes || 0);
      if (scoreB !== scoreA) return scoreB - scoreA;
      return (b.createdTimestamp || 0) - (a.createdTimestamp || 0);
    });
  }, [socialPosts, campusFilter, user.campus, sortBy]);

  const explorePolls = useMemo(
    () => exploreRankedPosts.filter((p) => p.type === 'poll'),
    [exploreRankedPosts]
  );

  const channelCounts = useMemo(
    () => ({
      confessions: socialPosts.filter((p) => p.type === 'confession').length,
      polls: socialPosts.filter((p) => p.type === 'poll').length,
      discussions: socialPosts.filter((p) => p.type === 'discussion' || p.type === 'post').length,
      rooms: rooms.length,
    }),
    [socialPosts, rooms]
  );

  const topDiscoverRooms = useMemo(
    () => searchAndRankRooms(rooms, '').slice(0, exploreTab === 'rooms' ? 24 : 5),
    [rooms, exploreTab]
  );

  const activeTopicDef = useMemo(
    () => resolveDiscoverTopicDefinition(selectedTopic),
    [selectedTopic]
  );

  const totalResultsCount =
    matchedPeople.length + filteredPosts.length + filteredRooms.length;

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
    const list = Array.from(byUsername.values());
    if (campusFilter === 'my-campus' && user.campus) {
      const target = user.campus.trim().toLowerCase();
      const sameCampus = list.filter(
        (c) => (c.campus || '').trim().toLowerCase() === target
      );
      if (sameCampus.length > 0) return sameCampus;
    }
    return list;
  }, [redisPymkList, creators, followEdges, user.id, user.username, user.campus, isFollowingUser, campusFilter]);

  const handleCardClick = (post: SocialPost) => {
    recordPostBanditInteraction(supabase, post.id, true, 2500);
    setSelectedPost(post);
    setActiveView(post.type === 'poll' ? 'poll-detail' : 'post-detail');
  };

  const visiblePopularPosts =
    exploreTab === 'trending'
      ? exploreRankedPosts.slice(0, 18)
      : exploreRankedPosts.slice(0, popularExpanded ? 10 : 4);

  const visiblePeople =
    exploreTab === 'people'
      ? pymkCreators.slice(0, 24)
      : pymkCreators.slice(0, peopleExpanded ? 14 : 6);

  return (
    <div className="w-full flex flex-col bg-white dark:bg-[#0E0C14] text-[#191525] dark:text-[#F4F2FA] pb-12">
      {/* 1. Sticky Discover Header + Search Input + Explore Navigation Tabs */}
      <div
        id="discover-search-section"
        ref={searchSectionRef}
        className="sticky top-[52px] lg:top-0 z-20 bg-white/95 dark:bg-[#0E0C14]/95 backdrop-blur-md border-b border-[#EAE6F0] dark:border-[#262036]"
      >
        <div className="px-4 sm:px-5 pt-3 pb-2.5 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <DiscoverCompassNavIcon size={20} />
              <h1 className="text-base sm:text-lg font-black text-[#191525] dark:text-[#F4F2FA] tracking-tight truncate">
                Discover
              </h1>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsSearchModalOpen(true)}
                className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-[#EAE6F0] dark:border-[#262036] bg-[#FAF9FC] dark:bg-[#171322] hover:bg-[#F0EBFF] dark:hover:bg-[#231A45] text-[11px] font-bold text-[#706B7D] dark:text-[#9E97B3] hover:text-[#5420F5] dark:hover:text-[#B9A7FF] transition-colors cursor-pointer"
                title="Open Quick Spotlight Search (⌘K or /)"
              >
                <span>Spotlight</span>
                <span className="font-mono text-[10px] opacity-80">⌘K</span>
              </button>

              <button
                type="button"
                onClick={() => setShowFilters((prev) => !prev)}
                className={`min-w-[40px] min-h-[40px] p-2 rounded-xl border transition-colors cursor-pointer flex items-center justify-center ${
                  showFilters || campusFilter !== 'all' || sortBy !== 'trending'
                    ? 'border-[#5420F5] bg-[#F0EBFF] dark:bg-[#231A45] text-[#5420F5] dark:text-[#B9A7FF]'
                    : 'border-[#EAE6F0] dark:border-[#262036] bg-[#FAF9FC] dark:bg-[#171322] text-[#706B7D] dark:text-[#9E97B3] hover:text-[#191525] dark:hover:text-[#F4F2FA]'
                }`}
                title="Filter & sort preferences"
                aria-label="Filter and sort"
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search Input */}
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center">
              <BopoiSearchIcon size={17} />
            </span>
            <input
              id="discover-search-input"
              ref={searchInputRef}
              type="search"
              inputMode="search"
              enterKeyHint="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search posts, #hashtags, rooms, @students..."
              className="w-full min-h-[44px] pl-10 pr-16 py-2 bg-[#FAF9FC] dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] rounded-xl text-base sm:text-sm font-medium text-[#191525] dark:text-[#F4F2FA] placeholder:text-[#706B7D] dark:placeholder:text-[#9E97B3] focus:outline-none focus:bg-white dark:focus:bg-[#0E0C14] focus:border-[#5420F5] transition-colors"
            />
            {(searchQuery || selectedTopic || activeHashtag) && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedTopic(null);
                  setActiveHashtag(null);
                  setActiveResultTab('all');
                  searchInputRef.current?.focus();
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-extrabold text-[#5420F5] dark:text-[#B9A7FF] hover:text-[#191525] dark:hover:text-white cursor-pointer bg-[#F0EBFF] dark:bg-[#231A45] px-2.5 py-1 rounded-lg"
              >
                Clear
              </button>
            )}
          </div>

          {/* Optional Filters Drawer */}
          {showFilters && (
            <div className="pt-2 border-t border-[#EAE6F0] dark:border-[#262036] space-y-2.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-[#706B7D] dark:text-[#9E97B3]">
                  Filters &amp; Sort
                </span>
                {(campusFilter !== 'all' || sortBy !== 'trending' || selectedTopic) && (
                  <button
                    type="button"
                    onClick={() => {
                      setCampusFilter('all');
                      setSortBy('trending');
                      setSelectedTopic(null);
                      showToast('Discover filters reset', 'info');
                    }}
                    className="text-[11px] font-bold text-[#5420F5] dark:text-[#B9A7FF] hover:underline cursor-pointer"
                  >
                    Reset all
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSortBy('trending')}
                    className={`flex-1 min-h-[38px] py-1.5 px-3 rounded-xl text-xs font-bold border transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5 whitespace-nowrap ${
                      sortBy === 'trending'
                        ? 'bg-[#191525] dark:bg-[#F4F2FA] text-white dark:text-[#191525] border-[#191525] dark:border-[#F4F2FA]'
                        : 'bg-[#FAF9FC] dark:bg-[#171322] text-[#706B7D] dark:text-[#9E97B3] border-[#EAE6F0] dark:border-[#262036]'
                    }`}
                  >
                    <Flame className="w-3.5 h-3.5" />
                    <span>Hot</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSortBy('latest')}
                    className={`flex-1 min-h-[38px] py-1.5 px-3 rounded-xl text-xs font-bold border transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5 whitespace-nowrap ${
                      sortBy === 'latest'
                        ? 'bg-[#191525] dark:bg-[#F4F2FA] text-white dark:text-[#191525] border-[#191525] dark:border-[#F4F2FA]'
                        : 'bg-[#FAF9FC] dark:bg-[#171322] text-[#706B7D] dark:text-[#9E97B3] border-[#EAE6F0] dark:border-[#262036]'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Newest</span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCampusFilter('all')}
                    className={`flex-1 min-h-[38px] py-1.5 px-3 rounded-xl text-xs font-bold border transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5 whitespace-nowrap ${
                      campusFilter === 'all'
                        ? 'bg-[#191525] dark:bg-[#F4F2FA] text-white dark:text-[#191525] border-[#191525] dark:border-[#F4F2FA]'
                        : 'bg-[#FAF9FC] dark:bg-[#171322] text-[#706B7D] dark:text-[#9E97B3] border-[#EAE6F0] dark:border-[#262036]'
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>All Campuses</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCampusFilter('my-campus')}
                    className={`flex-1 min-h-[38px] py-1.5 px-3 rounded-xl text-xs font-bold border transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5 truncate ${
                      campusFilter === 'my-campus'
                        ? 'bg-[#191525] dark:bg-[#F4F2FA] text-white dark:text-[#191525] border-[#191525] dark:border-[#F4F2FA]'
                        : 'bg-[#FAF9FC] dark:bg-[#171322] text-[#706B7D] dark:text-[#9E97B3] border-[#EAE6F0] dark:border-[#262036]'
                    }`}
                  >
                    <School className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{user.campus || 'My Campus'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Underline Explore Tabs (shown when browsing Discover cleanly) */}
        {!isSearching && (
          <div className="flex items-center overflow-x-auto no-scrollbar border-t border-[#EAE6F0] dark:border-[#262036] px-2">
            {(
              [
                { id: 'explore', label: 'For You' },
                { id: 'trending', label: 'Trending' },
                { id: 'polls', label: 'Polls' },
                { id: 'rooms', label: 'Rooms' },
                { id: 'people', label: 'Students' },
              ] as const
            ).map((tab) => {
              const isActive = exploreTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setExploreTab(tab.id)}
                  className={`flex-1 min-w-[74px] min-h-[42px] px-3 text-xs font-black transition-colors relative cursor-pointer whitespace-nowrap shrink-0 flex items-center justify-center ${
                    isActive
                      ? 'text-[#191525] dark:text-[#F4F2FA]'
                      : 'text-[#706B7D] dark:text-[#9E97B3] hover:text-[#191525] dark:hover:text-[#F4F2FA]'
                  }`}
                >
                  <span>{tab.label}</span>
                  {isActive && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-[3px] bg-[#5420F5] rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Active Search / Hashtag / Topic Results */}
      {isSearching ? (
        <section className="border-b border-[#EAE6F0] dark:border-[#262036] animate-in fade-in duration-150">
          {activeHashtag && (
            <div className="px-4 sm:px-5 py-3.5 bg-[#FAF9FC] dark:bg-[#171322] border-b border-[#EAE6F0] dark:border-[#262036] flex items-center justify-between gap-2.5 flex-wrap">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#5420F5] text-white flex items-center justify-center shrink-0">
                  <Hash className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-black text-[#191525] dark:text-[#F4F2FA] truncate">
                    {activeHashtag}
                  </h2>
                  <p className="text-[11px] text-[#706B7D] dark:text-[#9E97B3] truncate tabular-nums">
                    {filteredPosts.length} {filteredPosts.length === 1 ? 'post' : 'posts'} ·{' '}
                    {filteredRooms.length} {filteredRooms.length === 1 ? 'room' : 'rooms'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => openCreateWithHashtag(activeHashtag)}
                  className="min-h-[36px] px-3 py-1.5 rounded-xl bg-[#5420F5] hover:bg-[#4314E2] text-white text-xs font-extrabold transition-colors cursor-pointer"
                >
                  + Post {activeHashtag}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveHashtag(null);
                    setActiveResultTab('all');
                    goBack('home');
                  }}
                  className="min-h-[36px] px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#0E0C14] hover:bg-slate-100 dark:hover:bg-[#171322] text-[#191525] dark:text-[#F4F2FA] border border-[#EAE6F0] dark:border-[#262036] text-xs font-bold transition-colors cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveHashtag(null);
                    setActiveResultTab('all');
                  }}
                  className="min-h-[36px] min-w-[36px] p-1.5 rounded-xl bg-white dark:bg-[#0E0C14] text-[#706B7D] dark:text-[#9E97B3] hover:text-[#191525] dark:hover:text-[#F4F2FA] border border-[#EAE6F0] dark:border-[#262036] cursor-pointer flex items-center justify-center"
                  aria-label="Clear hashtag"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {!activeHashtag && q.startsWith('#') && normalizeHashtag(searchQuery) && (
            <div className="px-4 sm:px-5 py-2.5 bg-[#FAF9FC] dark:bg-[#171322] border-b border-[#EAE6F0] dark:border-[#262036] flex items-center justify-between gap-2">
              <span className="text-xs text-[#706B7D] dark:text-[#9E97B3] truncate">
                Filter specifically by tag{' '}
                <strong className="text-[#5420F5] dark:text-[#B9A7FF]">
                  {normalizeHashtag(searchQuery)}
                </strong>
              </span>
              <button
                type="button"
                onClick={() => {
                  const norm = normalizeHashtag(searchQuery);
                  if (norm) {
                    setSearchQuery('');
                    setActiveHashtag(norm);
                    setActiveResultTab('all');
                  }
                }}
                className="px-2.5 py-1 rounded-lg bg-[#F0EBFF] dark:bg-[#231A45] hover:bg-[#5420F5] text-[#5420F5] dark:text-[#B9A7FF] hover:text-white text-[11px] font-extrabold transition-colors cursor-pointer shrink-0"
              >
                Open {normalizeHashtag(searchQuery)}
              </button>
            </div>
          )}

          {activeTopicDef && (
            <div className="px-4 sm:px-5 py-3 bg-[#FAF9FC] dark:bg-[#171322] border-b border-[#EAE6F0] dark:border-[#262036] flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-white dark:bg-[#0E0C14] border border-[#EAE6F0] dark:border-[#262036] flex items-center justify-center shrink-0">
                  <BopoiIcon name={activeTopicDef.iconName} size={18} />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs sm:text-sm font-black text-[#191525] dark:text-[#F4F2FA] truncate">
                    {activeTopicDef.label}
                  </h4>
                  <p className="text-[11px] text-[#706B7D] dark:text-[#9E97B3] truncate">
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
                className="p-1.5 rounded-lg bg-white dark:bg-[#0E0C14] text-[#706B7D] dark:text-[#9E97B3] hover:text-[#191525] dark:hover:text-[#F4F2FA] border border-[#EAE6F0] dark:border-[#262036] cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Result Filter Tabs */}
          <div className="flex items-center justify-between gap-2 px-4 sm:px-5 py-2.5 border-b border-[#EAE6F0] dark:border-[#262036] bg-[#FAF9FC]/70 dark:bg-[#141020]">
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
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer shrink-0 inline-flex items-center gap-1.5 tabular-nums ${
                      activeResultTab === tab.id
                        ? 'bg-[#191525] dark:bg-[#F4F2FA] text-white dark:text-[#191525]'
                        : 'text-[#706B7D] dark:text-[#9E97B3] hover:text-[#191525] dark:hover:text-[#F4F2FA]'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className="text-[10px] opacity-75">{tab.count}</span>
                  </button>
                ))}
            </div>

            <span className="text-[11px] font-bold text-[#706B7D] dark:text-[#9E97B3] shrink-0 tabular-nums">
              {totalResultsCount} {totalResultsCount === 1 ? 'match' : 'matches'}
            </span>
          </div>

          {totalResultsCount === 0 ? (
            <div className="py-12 px-4 text-center flex flex-col items-center justify-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-[#FAF9FC] dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] flex items-center justify-center mx-auto">
                <SearchEmptyIcon size={34} />
              </div>
              <div className="max-w-sm mx-auto space-y-1">
                <p className="text-sm font-black text-[#191525] dark:text-[#F4F2FA]">
                  No matches for &ldquo;{activeHashtag || searchQuery || selectedTopic}&rdquo;
                </p>
                <p className="text-xs text-[#706B7D] dark:text-[#9E97B3]">
                  Start a conversation or anonymous room on this topic.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() =>
                    activeHashtag
                      ? openCreateWithHashtag(activeHashtag)
                      : setIsCreateModalOpen(true)
                  }
                  className="px-4 py-2 rounded-xl bg-[#5420F5] hover:bg-[#4314E2] text-white text-xs font-extrabold cursor-pointer"
                >
                  + Post about &ldquo;{(activeHashtag || searchQuery || selectedTopic || '').slice(0, 22)}&rdquo;
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreateRoomModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-[#F0EBFF] dark:bg-[#231A45] text-[#5420F5] dark:text-[#B9A7FF] hover:bg-[#5420F5] hover:text-white text-xs font-extrabold cursor-pointer transition-colors"
                >
                  + Create Room
                </button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-[#EAE6F0] dark:divide-[#262036]">
              {(activeResultTab === 'all' ||
                activeResultTab === 'posts' ||
                activeResultTab === 'polls') &&
                (activeResultTab === 'polls' ? filteredPolls : filteredPosts)
                  .slice(0, activeResultTab === 'all' ? 12 : 30)
                  .map((post) => (
                    <FeedPostRow
                      key={post.id}
                      post={post}
                      verifiedUsernameSet={verifiedUsernameSet}
                      activeHashtag={activeHashtag}
                      onClick={() => handleCardClick(post)}
                    />
                  ))}

              {q.length > 0 &&
                (activeResultTab === 'all' || activeResultTab === 'people') &&
                matchedPeople
                  .slice(0, activeResultTab === 'people' ? 20 : 6)
                  .map((person) => (
                    <div
                      key={person.username}
                      onClick={() => viewUserProfile(person.username, false, person.campus)}
                      className="px-4 sm:px-5 py-3.5 hover:bg-[#FAF9FC] dark:hover:bg-[#171322] transition-colors flex items-center justify-between gap-3 cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <CampusCharacterAvatar
                          value={person.avatarUrl}
                          seed={person.username}
                          size={40}
                          rounded="full"
                          className="shrink-0 ring-1 ring-[#EAE6F0] dark:ring-[#262036]"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1 min-w-0">
                            <p className="text-sm font-black text-[#191525] dark:text-[#F4F2FA] truncate">
                              {person.name}
                            </p>
                            <VerifiedCreatorBadge
                              isVerified={Boolean(person.isCreator)}
                              username={person.username}
                              size={14}
                            />
                          </div>
                          <p className="text-xs text-[#706B7D] dark:text-[#9E97B3] truncate">
                            <span className="font-semibold text-[#5420F5] dark:text-[#B9A7FF]">
                              @{person.username}
                            </span>{' '}
                            · {person.campus}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openPublicAskFor(person.username);
                        }}
                        className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[#F0EBFF] dark:bg-[#231A45] hover:bg-[#5420F5] text-[#5420F5] dark:text-[#B9A7FF] hover:text-white text-xs font-bold transition-colors cursor-pointer shrink-0"
                      >
                        Ask Anon
                      </button>
                    </div>
                  ))}

              {(activeResultTab === 'all' || activeResultTab === 'rooms') &&
                filteredRooms
                  .slice(0, activeResultTab === 'rooms' ? 15 : 5)
                  .map((room) => (
                    <div
                      key={room.id}
                      onClick={() => enterRoom(room.id)}
                      className="px-4 sm:px-5 py-3.5 hover:bg-[#FAF9FC] dark:hover:bg-[#171322] transition-colors flex items-start justify-between gap-3 text-left cursor-pointer"
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <RoomBadgeIcon
                          iconEmoji={room.iconEmoji}
                          iconBg={room.iconBg}
                          category={room.category}
                          roomName={room.name}
                          size="sm"
                          className="mt-0.5 shrink-0"
                        />
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-black text-[#191525] dark:text-[#F4F2FA]">
                              #{room.name}
                            </p>
                            {room.isLocked && <Lock className="w-3 h-3 text-rose-500 shrink-0" />}
                            {room.isJoined && (
                              <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 shrink-0">
                                <Check className="w-3 h-3 stroke-[3]" />
                                <span>Joined</span>
                              </span>
                            )}
                            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">
                              {room.membersCount} members
                              {(room.onlineCount ?? 0) > 0
                                ? ` · ${room.onlineCount} online`
                                : ''}
                            </span>
                          </div>
                          <p className="text-xs text-[#706B7D] dark:text-[#9E97B3] leading-snug break-words">
                            {room.description}
                          </p>
                        </div>
                      </div>
                      <span className="px-3 py-1.5 rounded-xl bg-[#191525] dark:bg-[#F4F2FA] hover:bg-[#5420F5] dark:hover:bg-[#7C5CFF] text-white dark:text-[#191525] dark:hover:text-white text-xs font-bold shrink-0 transition-colors">
                        Enter →
                      </span>
                    </div>
                  ))}
            </div>
          )}
        </section>
      ) : (
        <>
          {/* 3. Campus Channels Section (shown in For You) */}
          {exploreTab === 'explore' && (
            <section className="px-4 sm:px-5 py-4 border-b border-[#EAE6F0] dark:border-[#262036] space-y-2.5">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-black text-[#191525] dark:text-[#F4F2FA]">
                  Campus Channels
                </h2>
                <span className="text-[11px] font-semibold text-[#706B7D] dark:text-[#9E97B3]">
                  Jump into a feed
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[
                  {
                    label: 'Confessions',
                    count: `${channelCounts.confessions} posts`,
                    view: 'confessions' as ActiveAppView,
                    icon: <CreateConfessionIcon size={22} />,
                  },
                  {
                    label: 'Polls',
                    count: `${channelCounts.polls} live`,
                    view: 'polls' as ActiveAppView,
                    icon: <CreatePollIcon size={22} />,
                  },
                  {
                    label: 'Topics',
                    count: `${channelCounts.discussions} threads`,
                    view: 'discussions' as ActiveAppView,
                    icon: <CreateDiscussionIcon size={22} />,
                  },
                  {
                    label: 'Rooms',
                    count: `${channelCounts.rooms} open`,
                    view: 'rooms' as ActiveAppView,
                    icon: <CreateRoomIcon size={22} />,
                  },
                ].map((ch) => (
                  <button
                    key={ch.label}
                    type="button"
                    onClick={() => setActiveView(ch.view)}
                    className="p-2.5 rounded-2xl bg-[#FAF9FC] dark:bg-[#171322] hover:bg-[#F0EBFF]/70 dark:hover:bg-[#231A45] border border-[#EAE6F0] dark:border-[#262036] hover:border-[#5420F5]/40 transition-colors cursor-pointer flex flex-col items-center justify-center gap-1 text-center group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-white dark:bg-[#0E0C14] border border-[#EAE6F0] dark:border-[#262036] flex items-center justify-center group-hover:scale-105 transition-transform mb-0.5">
                      {ch.icon}
                    </div>
                    <span className="text-[11px] font-black text-[#191525] dark:text-[#F4F2FA] group-hover:text-[#5420F5] dark:group-hover:text-[#B9A7FF] truncate w-full">
                      {ch.label}
                    </span>
                    <span className="text-[10px] font-medium text-[#706B7D] dark:text-[#9E97B3] tabular-nums truncate w-full">
                      {ch.count}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* 4. Ranked Campus Trends & Topics (shown in For You & Trending) */}
          {(exploreTab === 'explore' || exploreTab === 'trending') && (
            <section className="border-b border-[#EAE6F0] dark:border-[#262036]">
              <div className="px-4 sm:px-5 pt-4 pb-3 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-[#5420F5] dark:text-[#8E6BFF]" />
                    <h2 className="text-xs font-black text-[#191525] dark:text-[#F4F2FA]">
                      Trending Topics &amp; Tags
                    </h2>
                  </div>
                  {exploreTab === 'explore' && (
                    <button
                      type="button"
                      onClick={() => setExploreTab('trending')}
                      className="text-xs font-bold text-[#5420F5] dark:text-[#B9A7FF] hover:underline cursor-pointer"
                    >
                      View trends
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {trendingTopics.map((item) => {
                    const isSelected = selectedTopic === item.tag;
                    return (
                      <button
                        key={item.tag}
                        type="button"
                        onClick={() => {
                          const nextTopic = isSelected ? null : item.tag;
                          setSelectedTopic(nextTopic);
                          setActiveResultTab('all');
                        }}
                        className={`min-h-[34px] px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap ${
                          isSelected
                            ? 'bg-[#191525] dark:bg-[#F4F2FA] text-white dark:text-[#191525]'
                            : 'bg-[#FAF9FC] dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] text-[#191525] dark:text-[#F4F2FA] hover:border-[#C7B8FA]'
                        }`}
                      >
                        <BopoiIcon name={item.iconName} size={13} />
                        <span>{item.label}</span>
                        {item.activeCount > 0 && (
                          <span
                            className={`text-[10px] font-bold tabular-nums ${
                              isSelected
                                ? 'text-white/75 dark:text-[#191525]/70'
                                : 'text-[#706B7D] dark:text-[#9E97B3]'
                            }`}
                          >
                            {item.activeCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Editorial Ranked Hashtag List */}
              {liveTrendingHashtags.length > 0 && (
                <div className="divide-y divide-[#EAE6F0] dark:divide-[#262036] border-t border-[#EAE6F0] dark:border-[#262036]">
                  {liveTrendingHashtags
                    .slice(0, exploreTab === 'trending' ? 10 : 4)
                    .map((item, idx) => (
                      <button
                        key={item.tag}
                        type="button"
                        onClick={() => {
                          setActiveHashtag(item.tag);
                          setActiveResultTab('all');
                        }}
                        className="w-full px-4 sm:px-5 py-3 hover:bg-[#FAF9FC] dark:hover:bg-[#171322] transition-colors flex items-center justify-between gap-3 text-left cursor-pointer group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-xs font-mono font-bold text-[#706B7D] dark:text-[#9E97B3] w-5 shrink-0 tabular-nums">
                            {String(idx + 1).padStart(2, '0')}.
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-black text-[#191525] dark:text-[#F4F2FA] group-hover:text-[#5420F5] dark:group-hover:text-[#B9A7FF] truncate">
                              {item.tag}
                            </p>
                            <p className="text-[11px] text-[#706B7D] dark:text-[#9E97B3] tabular-nums">
                              Trending on Campus · {item.count}{' '}
                              {item.count === 1 ? 'mention' : 'mentions'}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[#706B7D] dark:text-[#9E97B3] group-hover:text-[#5420F5] dark:group-hover:text-[#B9A7FF] shrink-0" />
                      </button>
                    ))}
                </div>
              )}
            </section>
          )}

          {/* 5. Polls Dedicated Tab */}
          {exploreTab === 'polls' && (
            <section className="border-b border-[#EAE6F0] dark:border-[#262036]">
              <div className="px-4 sm:px-5 py-3 border-b border-[#EAE6F0] dark:border-[#262036] flex items-center justify-between bg-[#FAF9FC]/60 dark:bg-[#141020]">
                <div className="flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5 text-[#5420F5] dark:text-[#8E6BFF]" />
                  <h2 className="text-xs font-black text-[#191525] dark:text-[#F4F2FA]">
                    Live Campus Polls
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveView('polls')}
                  className="text-xs font-bold text-[#5420F5] dark:text-[#B9A7FF] hover:underline cursor-pointer"
                >
                  All Polls
                </button>
              </div>
              {explorePolls.length === 0 ? (
                <div className="px-6 py-12 text-center space-y-2">
                  <p className="text-xs font-black text-[#191525] dark:text-[#F4F2FA]">
                    No live polls yet
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-[#5420F5] hover:bg-[#4314E2] text-white text-xs font-extrabold cursor-pointer"
                  >
                    + Create a Poll
                  </button>
                </div>
              ) : (
                <div className="flex flex-col">
                  {explorePolls.map((post) => (
                    <FeedPostRow
                      key={post.id}
                      post={post}
                      verifiedUsernameSet={verifiedUsernameSet}
                      activeHashtag={activeHashtag}
                      onClick={() => handleCardClick(post)}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* 6. Popular / Hot Posts Stream (shown in For You & Trending) */}
          {(exploreTab === 'explore' || exploreTab === 'trending') && (
            <section className="border-b border-[#EAE6F0] dark:border-[#262036]">
              <div className="px-4 sm:px-5 py-3 border-b border-[#EAE6F0] dark:border-[#262036] flex items-center justify-between gap-2 bg-[#FAF9FC]/60 dark:bg-[#141020]">
                <div className="flex items-center gap-2 min-w-0">
                  <h2 className="text-xs font-black text-[#191525] dark:text-[#F4F2FA]">
                    {sortBy === 'latest' ? 'Fresh Campus Posts' : 'Hot on Campus'}
                  </h2>
                  <div className="inline-flex items-center rounded-lg bg-[#FAF9FC] dark:bg-[#171322] p-0.5 border border-[#EAE6F0] dark:border-[#262036]">
                    <button
                      type="button"
                      onClick={() => setSortBy('trending')}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-colors cursor-pointer ${
                        sortBy === 'trending'
                          ? 'bg-white dark:bg-[#231A45] text-[#5420F5] dark:text-[#B9A7FF] shadow-2xs'
                          : 'text-[#706B7D] dark:text-[#9E97B3]'
                      }`}
                    >
                      Hot
                    </button>
                    <button
                      type="button"
                      onClick={() => setSortBy('latest')}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-colors cursor-pointer ${
                        sortBy === 'latest'
                          ? 'bg-white dark:bg-[#231A45] text-[#5420F5] dark:text-[#B9A7FF] shadow-2xs'
                          : 'text-[#706B7D] dark:text-[#9E97B3]'
                      }`}
                    >
                      New
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveView('home')}
                  className="text-xs font-bold text-[#5420F5] dark:text-[#B9A7FF] hover:underline cursor-pointer shrink-0"
                >
                  Open Feed
                </button>
              </div>

              {visiblePopularPosts.length === 0 ? (
                <div className="px-6 py-10 text-center space-y-1.5">
                  <p className="text-xs font-bold text-[#191525] dark:text-[#F4F2FA]">
                    No posts published yet
                  </p>
                  <p className="text-[11px] text-[#706B7D] dark:text-[#9E97B3]">
                    Popular confessions, polls, and discussions will appear here.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex flex-col">
                    {visiblePopularPosts.map((post) => (
                      <FeedPostRow
                        key={post.id}
                        post={post}
                        verifiedUsernameSet={verifiedUsernameSet}
                        activeHashtag={activeHashtag}
                        onClick={() => handleCardClick(post)}
                      />
                    ))}
                  </div>
                  {exploreTab === 'explore' && exploreRankedPosts.length > 4 && (
                    <button
                      type="button"
                      onClick={() => setPopularExpanded((prev) => !prev)}
                      className="w-full py-3 border-t border-[#EAE6F0] dark:border-[#262036] text-xs font-bold text-[#5420F5] dark:text-[#B9A7FF] hover:bg-[#FAF9FC] dark:hover:bg-[#171322] transition-colors cursor-pointer flex items-center justify-center gap-1"
                    >
                      <span>
                        {popularExpanded ? 'Show fewer posts' : 'Show more hot posts'}
                      </span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform ${
                          popularExpanded ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                  )}
                </>
              )}
            </section>
          )}

          {/* 7. Community Rooms Section (shown in For You & Rooms) */}
          {(exploreTab === 'explore' || exploreTab === 'rooms') && (
            <section className="border-b border-[#EAE6F0] dark:border-[#262036]">
              <div className="px-4 sm:px-5 py-3 border-b border-[#EAE6F0] dark:border-[#262036] flex items-center justify-between bg-[#FAF9FC]/60 dark:bg-[#141020]">
                <div className="flex items-center gap-1.5">
                  <CreateRoomIcon size={16} />
                  <h2 className="text-xs font-black text-[#191525] dark:text-[#F4F2FA]">
                    Campus Rooms
                  </h2>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsCreateRoomModalOpen(true)}
                    className="text-xs font-bold text-[#706B7D] dark:text-[#9E97B3] hover:text-[#5420F5] dark:hover:text-[#B9A7FF] cursor-pointer inline-flex items-center gap-0.5"
                  >
                    <Plus className="w-3 h-3 stroke-[2.5]" />
                    <span>New</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveView('rooms')}
                    className="text-xs font-bold text-[#5420F5] dark:text-[#B9A7FF] hover:underline cursor-pointer tabular-nums"
                  >
                    See all ({rooms.length})
                  </button>
                </div>
              </div>

              {topDiscoverRooms.length === 0 ? (
                <div className="px-6 py-10 text-center space-y-2.5">
                  <p className="text-xs font-bold text-[#191525] dark:text-[#F4F2FA]">
                    No community rooms yet
                  </p>
                  <p className="text-[11px] text-[#706B7D] dark:text-[#9E97B3]">
                    Create the first anonymous room for your campus!
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsCreateRoomModalOpen(true)}
                    className="px-3.5 py-1.5 rounded-xl bg-[#5420F5] hover:bg-[#4314E2] text-white text-xs font-extrabold cursor-pointer inline-flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Room</span>
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-[#EAE6F0] dark:divide-[#262036]">
                  {topDiscoverRooms.map((room) => (
                    <div
                      key={room.id}
                      onClick={() => enterRoom(room.id)}
                      className="px-4 sm:px-5 py-3.5 hover:bg-[#FAF9FC] dark:hover:bg-[#171322] transition-colors cursor-pointer flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <RoomBadgeIcon
                          iconEmoji={room.iconEmoji}
                          iconBg={room.iconBg}
                          category={room.category}
                          roomName={room.name}
                          size="sm"
                          className="shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-xs sm:text-sm font-black text-[#191525] dark:text-[#F4F2FA] truncate group-hover:text-[#5420F5] dark:group-hover:text-[#B9A7FF]">
                              #{room.name}
                            </h4>
                            {room.isLocked && <Lock className="w-3 h-3 text-rose-500 shrink-0" />}
                            {room.isJoined && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 shrink-0">
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                                <span>Joined</span>
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#706B7D] dark:text-[#9E97B3] truncate">
                            {room.description}
                          </p>
                          <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold block tabular-nums">
                            {room.membersCount} members
                            {(room.onlineCount ?? 0) > 0
                              ? ` · ${room.onlineCount} online`
                              : ''}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          enterRoom(room.id);
                        }}
                        className="min-h-[38px] px-3 py-1.5 bg-[#191525] dark:bg-[#F4F2FA] hover:bg-[#5420F5] dark:hover:bg-[#7C5CFF] text-white dark:text-[#191525] dark:hover:text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shrink-0"
                      >
                        Enter →
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* 8. People to Follow & Ask (shown in For You & Students) */}
          {(exploreTab === 'explore' || exploreTab === 'people') && (
            <section className="px-4 sm:px-5 py-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-black text-[#191525] dark:text-[#F4F2FA]">
                  Students to Follow &amp; Ask
                </h2>
                {exploreTab === 'explore' && pymkCreators.length > 6 && (
                  <button
                    type="button"
                    onClick={() => setPeopleExpanded((prev) => !prev)}
                    className="text-xs font-bold text-[#5420F5] dark:text-[#B9A7FF] hover:underline cursor-pointer"
                  >
                    {peopleExpanded ? 'Show less' : `See more (${pymkCreators.length})`}
                  </button>
                )}
              </div>

              {visiblePeople.length === 0 ? (
                <div className="py-8 text-center flex flex-col items-center justify-center space-y-2 border border-[#EAE6F0] dark:border-[#262036] rounded-2xl">
                  <RealPeopleIcon size={30} />
                  <p className="text-xs font-black text-[#191525] dark:text-[#F4F2FA]">
                    No student profiles yet
                  </p>
                  <p className="text-[11px] text-[#706B7D] dark:text-[#9E97B3]">
                    Registered campus students will appear here as they join Bopoi.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[#EAE6F0] dark:divide-[#262036] border border-[#EAE6F0] dark:border-[#262036] rounded-2xl overflow-hidden">
                  {visiblePeople.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => viewUserProfile(c)}
                      className="px-3.5 sm:px-4 py-3 hover:bg-[#FAF9FC] dark:hover:bg-[#171322] transition-colors flex items-center justify-between gap-2.5 cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <CampusCharacterAvatar
                          value={c.avatarUrl}
                          seed={c.username}
                          size={42}
                          rounded="full"
                          className="ring-1 ring-[#EAE6F0] dark:ring-[#262036] shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1 min-w-0">
                            <h4 className="text-xs sm:text-sm font-black text-[#191525] dark:text-[#F4F2FA] truncate hover:underline">
                              {c.name}
                            </h4>
                            <VerifiedCreatorBadge
                              isVerified={c.isVerified}
                              username={c.username}
                              size={14}
                            />
                          </div>
                          <p className="text-xs text-[#706B7D] dark:text-[#9E97B3] truncate">
                            @{c.username} · {c.campus}
                            {c.isFollowingYou
                              ? ' · Follows you'
                              : c.mutualCount > 0
                              ? ` · ${c.mutualCount} mutual${c.mutualCount > 1 ? 's' : ''}`
                              : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openPublicAskFor(c.username);
                          }}
                          className="hidden sm:inline-flex min-h-[38px] px-2.5 py-1.5 rounded-xl bg-[#F0EBFF] dark:bg-[#231A45] hover:bg-[#5420F5] text-[#5420F5] dark:text-[#B9A7FF] hover:text-white text-xs font-bold transition-colors cursor-pointer"
                          title={`Send anonymous message to @${c.username}`}
                        >
                          Ask
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFollowCreator(c.id);
                          }}
                          className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shrink-0 ${
                            c.isFollowing
                              ? 'bg-[#FAF9FC] dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] text-[#706B7D] dark:text-[#9E97B3] hover:text-[#191525] dark:hover:text-[#F4F2FA]'
                              : 'bg-[#191525] dark:bg-[#F4F2FA] hover:bg-[#5420F5] dark:hover:bg-[#7C5CFF] text-white dark:text-[#191525] dark:hover:text-white'
                          }`}
                        >
                          {c.isFollowing ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400 stroke-[3]" />
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
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
};
