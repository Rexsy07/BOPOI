import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useBopoi, useCharacterMood } from '../../context/BopoiContext.tsx';
import { SocialPost } from '../../types/index.ts';
import {
  supabase,
  fetchTwoTowerVectorSignals,
  TwoTowerPostSignal,
  rankSocialPostsWithBandit,
  recordPostBanditInteraction,
  computePostTrendingVelocityScore,
} from '../../lib/supabase.ts';
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  CheckCircle2,
  Plus,
  Pin,
  Megaphone,
  Lock,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { BopoiAnonymousAvatar } from '../brand/BopoiAnonymousAvatar.tsx';
import {
  BopoiIcon,
  BookmarkedIcon,
  MoneyFinancesIcon,
  FashionStyleIcon,
  StudentPostsIcon,
  CreateConfessionIcon,
  CreatePollIcon,
  CreateDiscussionIcon,
  CreatePostIcon,
  CreateRoomIcon,
  RoomBadgeIcon,
} from '../brand/icons/index.ts';
import { CampusCharacterAvatar } from '../brand/character/index.ts';

/**
 * Tracks real viewport impressions and reading dwell time using IntersectionObserver.
 * A post only records a real impression if >= 55% of the card stays in the viewport
 * continuously for >= 1500ms (1.5s), and records exact dwell duration when leaving view.
 */
const FeedPostImpressionObserver: React.FC<{
  postId: string;
  onCardClick: () => void;
  className?: string;
  children: React.ReactNode;
}> = ({ postId, onCardClick, className, children }) => {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const enteredAtRef = useRef<number | null>(null);
  const qualifiedImpressionRef = useRef<boolean>(false);
  const qualificationTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const node = cardRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;

    const flushDwellIfQualified = () => {
      if (qualificationTimerRef.current !== null) {
        window.clearTimeout(qualificationTimerRef.current);
        qualificationTimerRef.current = null;
      }
      if (enteredAtRef.current !== null && qualifiedImpressionRef.current) {
        const dwellMs = Date.now() - enteredAtRef.current;
        if (dwellMs >= 1500) {
          recordPostBanditInteraction(supabase, postId, false, dwellMs);
        }
      }
      enteredAtRef.current = null;
      qualifiedImpressionRef.current = false;
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;

        if (entry.isIntersecting && entry.intersectionRatio >= 0.55) {
          if (enteredAtRef.current === null) {
            enteredAtRef.current = Date.now();
            qualifiedImpressionRef.current = false;
            qualificationTimerRef.current = window.setTimeout(() => {
              qualifiedImpressionRef.current = true;
            }, 1500);
          }
        } else {
          flushDwellIfQualified();
        }
      },
      { threshold: [0, 0.55] }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
      flushDwellIfQualified();
    };
  }, [postId]);

  return (
    <div ref={cardRef} onClick={onCardClick} className={className}>
      {children}
    </div>
  );
};

export const HomeView: React.FC = () => {
  const {
    user,
    accounts,
    socialPosts,
    rooms,
    enterRoom,
    feedTab,
    setFeedTab,
    togglePostLike,
    togglePostBookmark,
    votePoll,
    setIsCreateModalOpen,
    setSelectedPost,
    setActiveView,
    unreadCount,
    viewUserProfile,
    openPostShare,
    setIsCreateRoomModalOpen,
    setIsSearchModalOpen,
    campusAnnouncements,
    platformSettings,
    followEdges,
    creators,
  } = useBopoi();

  const { characterMood } = useCharacterMood();

  const [feedCategory, setFeedCategory] = useState<string>('All');
  const [visiblePostsLimit, setVisiblePostsLimit] = useState<number>(20);
  const [twoTowerSignals, setTwoTowerSignals] = useState<Record<string, TwoTowerPostSignal>>({});

  // Fetch 768-dim Two-Tower pgvector / neural cosine similarity signals from server
  useEffect(() => {
    if (socialPosts.length === 0) return;
    let cancelled = false;

    const engagedTexts = socialPosts
      .filter((p) => p.hasLiked || p.isBookmarked)
      .slice(0, 8)
      .map((p) => `${p.title || ''} ${p.content}`.trim());

    const snapshot = socialPosts.slice(0, 250).map((p) => ({
      id: p.id,
      type: p.type,
      category: p.category,
      title: p.title,
      content: p.content,
      hashtags: p.hashtags,
      authorCampus: p.authorCampus,
    }));

    fetchTwoTowerVectorSignals({
      userId: user.id || user.username || 'guest',
      campus: user.campus || 'Chrisland University',
      bio: user.bio || '',
      recentEngagedSignals: engagedTexts,
      postsSnapshot: snapshot,
    }).then((signals) => {
      if (!cancelled && signals && Object.keys(signals).length > 0) {
        setTwoTowerSignals(signals);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [user.id, user.username, user.campus, user.bio, socialPosts.length]);

  // Active campus broadcasts targeting all campuses or the current student's campus
  const activeAnnouncements = useMemo(() => {
    return (campusAnnouncements || []).filter((a) => {
      if (!a.isActive) return false;
      if (!a.campus || a.campus === 'All Campuses') return true;
      return user?.campus && a.campus.toLowerCase() === user.campus.toLowerCase();
    });
  }, [campusAnnouncements, user?.campus]);

  // Rank rooms by EWMA conversational velocity + active online participants + featured boost
  const sortedRooms = useMemo(() => {
    const now = Date.now();
    return [...rooms].sort((a, b) => {
      const aRecentMsgs = (a.messages || []).filter(
        (m) => now - (m.createdTimestamp || 0) < 6 * 60 * 60 * 1000
      ).length;
      const bRecentMsgs = (b.messages || []).filter(
        (m) => now - (m.createdTimestamp || 0) < 6 * 60 * 60 * 1000
      ).length;
      const aVelocity =
        (a.isFeatured ? 15 : 0) +
        (a.isJoined ? 8 : 0) +
        aRecentMsgs * 4 +
        (a.onlineCount || 1) * 2 +
        Math.log1p(a.membersCount || 1);
      const bVelocity =
        (b.isFeatured ? 15 : 0) +
        (b.isJoined ? 8 : 0) +
        bRecentMsgs * 4 +
        (b.onlineCount || 1) * 2 +
        Math.log1p(b.membersCount || 1);
      return bVelocity - aVelocity;
    });
  }, [rooms]);

  // Fast lookup map for live user verification status
  const verifiedUsernameSet = useMemo(() => {
    const set = new Set<string>();
    for (const u of accounts || []) {
      if (u.isVerified || u.isCreator) {
        set.add(u.username.toLowerCase());
      }
    }
    return set;
  }, [accounts]);

  // Two-Tower User Context for Thompson Sampling Multi-Armed Bandit
  const userBanditContext = useMemo(() => {
    const followedUsernames = new Set<string>();
    const myLower = (user.username || '').toLowerCase();
    followEdges.forEach((e) => {
      if (
        (user.id && e.followerId === user.id) ||
        (myLower && e.followerUsername.toLowerCase() === myLower)
      ) {
        followedUsernames.add(e.followingUsername.toLowerCase());
      }
    });
    creators.forEach((c) => {
      if (c.isFollowing) followedUsernames.add(c.username.toLowerCase());
    });

    const preferredCategories = new Set<string>();
    socialPosts.forEach((p) => {
      if ((p.hasLiked || p.isBookmarked) && p.category) {
        preferredCategories.add(p.category.toLowerCase());
      }
    });

    return {
      campus: user.campus || 'Chrisland University',
      followedUsernames,
      preferredCategories,
      twoTowerSignals,
    };
  }, [user.id, user.username, user.campus, followEdges, creators, socialPosts, twoTowerSignals]);

  // Memoized filter & Multi-Armed Bandit re-ranking with pinned post priority
  const filteredPosts = useMemo(() => {
    let list = [...socialPosts];

    if (feedCategory !== 'All') {
      const fc = feedCategory.toLowerCase();
      list = list.filter((p) => {
        const cat = (p.category || '').toLowerCase();
        const text = (p.content + ' ' + (p.title || '')).toLowerCase();
        if (fc.includes('student posts')) return true;
        if (fc.includes('money') || fc.includes('finance')) {
          return (
            cat.includes('money') ||
            cat.includes('finance') ||
            text.includes('money') ||
            text.includes('k') ||
            text.includes('salary') ||
            text.includes('naira')
          );
        }
        if (fc.includes('fashion') || fc.includes('style')) {
          return (
            cat.includes('fashion') ||
            cat.includes('style') ||
            text.includes('outfit') ||
            text.includes('wear') ||
            text.includes('drip') ||
            text.includes('fit')
          );
        }
        return cat.includes(fc) || text.includes(fc);
      });
    }

    switch (feedTab) {
      case 'latest':
        list.sort((a, b) => b.createdTimestamp - a.createdTimestamp);
        return list.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
      case 'trending': {
        const now = Date.now();
        list.sort(
          (a, b) =>
            computePostTrendingVelocityScore(b, now) - computePostTrendingVelocityScore(a, now)
        );
        return list.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
      }
      case 'for-you':
      default:
        return rankSocialPostsWithBandit(list, userBanditContext);
    }
  }, [socialPosts, feedCategory, feedTab, userBanditContext]);

  const handleCardClick = (post: SocialPost) => {
    recordPostBanditInteraction(supabase, post.id, true, 2500);
    setSelectedPost(post);
    if (post.type === 'poll') {
      setActiveView('poll-detail');
    } else {
      setActiveView('post-detail');
    }
  };

  const handleShare = (e: React.MouseEvent, post: SocialPost) => {
    e.stopPropagation();
    openPostShare(post);
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 py-4 pb-24 space-y-4 text-[#191525]">
      {/* Platform Maintenance Banner */}
      {platformSettings?.maintenanceMode && (
        <div className="rounded-2xl bg-amber-50 border border-amber-300 p-3.5 flex items-start gap-3 shadow-2xs">
          <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black text-amber-900">
              Campus Read-Only Maintenance Mode Active
            </p>
            <p className="text-[11px] text-amber-800 mt-0.5 leading-snug">
              New posts, comments, and room messages are temporarily paused for non-admin accounts while maintenance is in progress.
            </p>
          </div>
        </div>
      )}

      {/* Active Campus Broadcast Announcements */}
      {activeAnnouncements.length > 0 && (
        <div className="space-y-2">
          {activeAnnouncements.map((ann) => (
            <div
              key={ann.id}
              className={`rounded-2xl p-3.5 border flex items-start gap-3 shadow-2xs ${
                ann.severity === 'urgent'
                  ? 'bg-rose-50 border-rose-200 text-rose-950'
                  : ann.severity === 'celebration'
                  ? 'bg-purple-50 border-purple-200 text-purple-950'
                  : 'bg-[#F0EBFF]/70 border-[#5420F5]/25 text-[#191525]'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-white ${
                  ann.severity === 'urgent'
                    ? 'bg-rose-600'
                    : 'bg-[#5420F5]'
                }`}
              >
                <Megaphone className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black">{ann.title}</span>
                  <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-white/80 text-[#5420F5] border border-black/5">
                    {ann.campus}
                  </span>
                </div>
                <p className="text-[11px] opacity-90 mt-0.5 leading-relaxed">
                  {ann.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Active Campus Rooms Carousel - Direct Entry */}
      <div className="space-y-2.5 pt-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <CreateRoomIcon size={18} />
            <h3 className="text-xs sm:text-sm font-black text-[#191525]">
              Campus Chat Rooms
            </h3>
          </div>
          <button
            onClick={() => setActiveView('rooms')}
            className="text-xs font-bold text-[#5420F5] hover:underline cursor-pointer"
          >
            See all ({rooms.length}) →
          </button>
        </div>

        <div className="flex gap-2.5 overflow-x-auto scrollbar-none pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
          {/* Create Anonymous Room Quick Card */}
          <button
            type="button"
            onClick={() => setIsCreateRoomModalOpen(true)}
            className="bg-gradient-to-br from-[#F0EBFF] to-purple-50 rounded-2xl p-3 border-2 border-dashed border-[#5420F5]/40 hover:border-[#5420F5] transition-all cursor-pointer flex flex-col items-center justify-center shrink-0 w-36 sm:w-40 space-y-1.5 text-center group active:scale-95 shadow-2xs"
          >
            <div className="w-8 h-8 rounded-xl bg-[#5420F5] text-white flex items-center justify-center text-sm shadow-sm group-hover:scale-110 transition-transform">
              <Plus className="w-4 h-4 stroke-[3]" />
            </div>
            <span className="text-xs font-black text-[#5420F5]">
              + New Room
            </span>
            <span className="text-[10px] text-slate-500 font-medium">
              Create anonymous room
            </span>
          </button>
          {sortedRooms.map((room) => (
            <div
              key={room.id}
              onClick={() => enterRoom(room.id)}
              className="bg-white rounded-2xl p-3 border border-[#EAE6F0] shadow-xs hover:border-[#5420F5]/40 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between shrink-0 w-44 sm:w-48 space-y-2 group active:scale-[0.98]"
              title={`Enter #${room.name}`}
            >
              <div className="flex items-center gap-2">
                <RoomBadgeIcon
                  iconEmoji={room.iconEmoji}
                  iconBg={room.iconBg}
                  category={room.category}
                  roomName={room.name}
                  size="sm"
                  className="group-hover:scale-105 transition-transform"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <h4 className="text-xs font-black text-[#191525] truncate group-hover:text-[#5420F5] transition-colors">
                      {room.name}
                    </h4>
                    {room.isLocked && (
                      <Lock className="w-3 h-3 text-rose-500 shrink-0" />
                    )}
                  </div>
                  <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {room.onlineCount || 1} online
                  </span>
                </div>
              </div>

              <p className="text-[10px] text-[#706B7D] line-clamp-1 leading-snug">
                {room.description}
              </p>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  enterRoom(room.id);
                }}
                className="w-full py-1.5 px-2 bg-[#5420F5] hover:bg-[#4314E2] text-white rounded-xl text-[11px] font-black transition-all cursor-pointer flex items-center justify-center gap-1 shadow-xs"
              >
                <span>Enter Room</span>
                <span className="text-xs">→</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Feed Filter Tabs */}
      <div className="flex items-center gap-6 border-b border-[#EAE6F0] pt-1">
        {(['for-you', 'latest', 'trending'] as const).map((tab) => {
          const isActive = feedTab === tab;
          const label = tab === 'for-you' ? 'For You' : tab === 'latest' ? 'Latest' : 'Trending';
          return (
            <button
              key={tab}
              onClick={() => setFeedTab(tab)}
              className={`pb-2.5 text-xs sm:text-sm font-black transition-all relative cursor-pointer ${
                isActive ? 'text-[#5420F5]' : 'text-[#706B7D] hover:text-[#191525]'
              }`}
            >
              <span>{label}</span>
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#5420F5] rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Feed Category Filters (Student Posts, Money & Finances, Fashion & Style) */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
        {[
          { label: 'All Feeds', value: 'All', icon: null },
          { label: 'Student Posts', value: 'Student Posts', icon: <StudentPostsIcon size={14} /> },
          { label: 'Money & Finances', value: 'Money & Finances', icon: <MoneyFinancesIcon size={14} /> },
          { label: 'Fashion & Style', value: 'Fashion & Style', icon: <FashionStyleIcon size={14} /> },
        ].map((c) => {
          const isActive = feedCategory === c.value;
          return (
            <button
              key={c.value}
              onClick={() => setFeedCategory(c.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                isActive
                  ? 'bg-[#5420F5] text-white shadow-xs'
                  : 'bg-white border border-[#EAE6F0] text-slate-600 hover:text-black hover:bg-slate-50'
              }`}
            >
              {c.icon && (
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                    isActive ? 'bg-white shadow-2xs' : 'bg-purple-50'
                  }`}
                >
                  {c.icon}
                </span>
              )}
              <span>{c.label}</span>
            </button>
          );
        })}
      </div>

      {/* 7. Feed Stream */}
      <div className="space-y-3.5 pt-1">
        {filteredPosts.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 border border-[#EAE6F0] text-center space-y-3 shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-[#F0EBFF] text-[#5420F5] flex items-center justify-center mx-auto p-2 shadow-2xs">
              <CreatePostIcon size={36} />
            </div>
            <h3 className="text-sm sm:text-base font-black text-[#191525]">
              No campus posts yet
            </h3>
            <p className="text-xs text-[#706B7D] max-w-sm mx-auto leading-relaxed">
              Be the first student to share an anonymous confession, start a campus discussion, or launch a live poll!
            </p>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="px-5 py-2.5 bg-[#5420F5] hover:bg-[#4314E2] text-white text-xs font-black rounded-xl shadow-md shadow-[#5420F5]/20 transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Create First Post</span>
            </button>
          </div>
        ) : (
          <>
          {filteredPosts.slice(0, visiblePostsLimit).map((post) => {
          const isPoll = post.type === 'poll';
          const isConfession = post.type === 'confession';
          const isDiscussion = post.type === 'discussion';

          return (
            <FeedPostImpressionObserver
              key={post.id}
              postId={post.id}
              onCardClick={() => handleCardClick(post)}
              className="bg-white rounded-3xl p-4 sm:p-5 border border-[#EAE6F0] shadow-xs hover:border-[#5420F5]/30 hover:shadow-md transition-all cursor-pointer space-y-3"
            >
              {/* Card Author Header - Clickable to open public profile */}
              <div className="flex items-center justify-between">
                <div
                  className="flex items-center gap-2.5 hover:opacity-85 cursor-pointer transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    viewUserProfile(post.authorUsername, post.isAnonymous, post.authorCampus);
                  }}
                  title={`View ${post.authorName}'s public profile`}
                >
                  {post.isAnonymous ? (
                    <BopoiAnonymousAvatar size="sm" idPrefix={`feed-${post.id}`} />
                  ) : (
                    <CampusCharacterAvatar
                      value={post.authorAvatar}
                      seed={post.authorUsername}
                      size={32}
                      rounded="full"
                      className="ring-2 ring-[#5420F5]/20"
                    />
                  )}
                  <div>
                    <span className="text-xs font-black text-[#191525] inline-flex items-center gap-1 hover:underline">
                      <span>{post.authorName}</span>
                      {!post.isAnonymous &&
                        (post.authorIsVerified ||
                          verifiedUsernameSet.has((post.authorUsername || '').toLowerCase())) && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#5420F5] fill-[#F0EBFF] shrink-0" />
                        )}
                    </span>
                    <span className="text-[10px] text-[#706B7D] block">
                      {post.createdAt} {post.authorCampus && `• ${post.authorCampus}`}
                    </span>
                  </div>
                </div>

                {/* Badge Tag */}
                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                  {post.isPinned && (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 inline-flex items-center gap-1">
                      <Pin className="w-2.5 h-2.5" />
                      <span>Pinned</span>
                    </span>
                  )}
                  {post.isFeatured && (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-100 text-[#5420F5] inline-flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5" />
                      <span>Featured</span>
                    </span>
                  )}
                  <span
                    className={`text-[10px] font-black px-2.5 py-0.5 rounded-full capitalize inline-flex items-center gap-1 ${
                      isConfession
                        ? 'bg-[#F0EBFF] text-[#5420F5]'
                        : isPoll
                        ? 'bg-orange-100 text-orange-700'
                        : isDiscussion
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {isConfession ? (
                      <CreateConfessionIcon size={13} />
                    ) : isPoll ? (
                      <CreatePollIcon size={13} />
                    ) : isDiscussion ? (
                      <CreateDiscussionIcon size={13} />
                    ) : (
                      <CreatePostIcon size={13} />
                    )}
                    <span>{post.type}</span>
                  </span>
                </div>
              </div>

              {/* Title if discussion */}
              {post.title && (
                <h3 className="text-sm sm:text-base font-black text-[#191525] leading-snug">
                  {post.title}
                </h3>
              )}

              {/* Main Content */}
              <p className="text-xs sm:text-sm text-[#191525] font-medium leading-relaxed">
                {post.content}
              </p>

              {/* Poll Voting Interface inside Card */}
              {isPoll && post.pollOptions && (
                <div className="space-y-2 pt-1" onClick={(e) => e.stopPropagation()}>
                  {post.pollOptions.map((opt) => {
                    const total = post.pollTotalVotes || 1;
                    const pct = Math.round((opt.votes / total) * 100);
                    const isVoted = post.userVotedOptionId === opt.id;

                    return (
                      <button
                        key={opt.id}
                        onClick={() => votePoll(post.id, opt.id)}
                        className={`w-full text-left rounded-xl p-2.5 relative overflow-hidden border transition-all cursor-pointer ${
                          isVoted
                            ? 'border-[#5420F5] bg-[#F0EBFF]/30 font-bold'
                            : 'border-[#EAE6F0] bg-slate-50/70 hover:bg-slate-100/80 font-medium'
                        }`}
                      >
                        {/* Fill Progress Bar */}
                        <div
                          className={`absolute top-0 bottom-0 left-0 transition-all duration-500 ${
                            isVoted ? 'bg-[#5420F5]/20' : 'bg-slate-200/60'
                          }`}
                          style={{ width: `${pct}%` }}
                        />

                        <div className="relative z-10 flex items-center justify-between text-xs text-[#191525]">
                          <span className="flex items-center gap-1.5">
                            {isVoted && <CheckCircle2 className="w-3.5 h-3.5 text-[#5420F5]" />}
                            <span>{opt.text}</span>
                          </span>
                          <span className="font-bold text-slate-700">{pct}%</span>
                        </div>
                      </button>
                    );
                  })}
                  <div className="text-[10px] text-slate-400 text-right pt-0.5">
                    {post.pollTotalVotes || 0} total votes
                  </div>
                </div>
              )}

              {/* Hashtags */}
              {post.hashtags && post.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {post.hashtags.map((tag) => (
                    <span key={tag} className="text-[11px] font-bold text-[#5420F5]">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Action Toolbar */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-slate-500 text-xs">
                {/* Heart / Like */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePostLike(post.id);
                  }}
                  className={`flex items-center gap-1.5 transition-colors cursor-pointer py-1 px-2 rounded-lg hover:bg-pink-50 ${
                    post.hasLiked ? 'text-[#F52D85] font-bold' : 'hover:text-[#F52D85]'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${post.hasLiked ? 'fill-[#F52D85]' : ''}`} />
                  <span>{post.likes}</span>
                </button>

                {/* Comment / Convo */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCardClick(post);
                  }}
                  className="flex items-center gap-1.5 hover:text-[#5420F5] transition-colors cursor-pointer py-1 px-2 rounded-lg hover:bg-[#F0EBFF]"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>{post.commentsCount}</span>
                </button>

                {/* Share */}
                <button
                  onClick={(e) => handleShare(e, post)}
                  className="flex items-center gap-1.5 hover:text-[#5420F5] transition-colors cursor-pointer py-1 px-2 rounded-lg hover:bg-[#F0EBFF]"
                  title="Share post off-campus"
                >
                  <Share2 className="w-4 h-4" />
                  <span>{post.sharesCount || 0}</span>
                </button>

                {/* Bookmark */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePostBookmark(post.id);
                  }}
                  className={`flex items-center gap-1.5 transition-colors cursor-pointer py-1 px-2 rounded-lg hover:bg-purple-50 ${
                    post.isBookmarked ? 'text-[#5420F5]' : 'hover:text-[#5420F5]'
                  }`}
                  title={post.isBookmarked ? 'Remove bookmark' : 'Bookmark post'}
                >
                  {post.isBookmarked ? (
                    <BookmarkedIcon size={16} />
                  ) : (
                    <Bookmark className="w-4 h-4" />
                  )}
                </button>
              </div>
            </FeedPostImpressionObserver>
          );
        })}
          {filteredPosts.length > visiblePostsLimit && (
            <button
              type="button"
              onClick={() => setVisiblePostsLimit((prev) => prev + 20)}
              className="w-full py-3.5 rounded-2xl bg-white border border-[#EAE6F0] hover:border-[#5420F5]/40 text-xs font-black text-[#5420F5] shadow-2xs cursor-pointer transition-all"
            >
              Load More Campus Posts ({filteredPosts.length - visiblePostsLimit} more)
            </button>
          )}
          </>
        )}
      </div>
    </div>
  );
};
