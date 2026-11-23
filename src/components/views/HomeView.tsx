import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useBopoi, useCharacterMood } from '../../context/BopoiContext.tsx';
import {
  supabase,
  fetchTwoTowerVectorSignals,
  TwoTowerPostSignal,
  rankSocialPostsWithBandit,
  computePostTrendingVelocityScore,
  scorePostTopicRelevance,
  computeLocalAdamicAdarRecommendations,
} from '../../lib/supabase.ts';
import {
  Plus,
  Megaphone,
  Lock,
  AlertTriangle,
  EyeOff,
  BarChart2,
  MessageSquarePlus,
  Send,
  AtSign,
  ArrowUp,
  Users,
  School,
  X,
  Copy,
  Check,
  Sparkles,
  RefreshCw,
  UserPlus,
  Inbox,
} from 'lucide-react';
import { BopoiAnonymousAvatar } from '../brand/BopoiAnonymousAvatar.tsx';
import {
  MoneyFinancesIcon,
  FashionStyleIcon,
  StudentPostsIcon,
  CreatePostIcon,
  CreateRoomIcon,
  RoomBadgeIcon,
} from '../brand/icons/index.ts';
import { CampusCharacterAvatar } from '../brand/character/index.ts';
import { VerifiedCreatorBadge } from '../ui/VerifiedCreatorBadge.tsx';
import { FeedPostRow } from '../feed/FeedPostRow.tsx';
import {
  MentionAutocompleteDropdown,
} from '../comments/MentionAutocompleteDropdown.tsx';
import {
  buildMentionCandidates,
  useMentionAutocomplete,
} from '../../hooks/useMentionAutocomplete.ts';
import { KlipyGifPicker } from '../modals/KlipyGifPicker.tsx';
import { GifPreviewMedia } from '../ui/GifPreviewMedia.tsx';
import { CharProgressRing } from '../ui/CharProgressRing.tsx';
import { computeTrendingHashtags, extractHashtagsFromText } from '../../utils/hashtags.ts';

const CAMPUS_DAILY_PROMPTS = [
  {
    prompt: "What's an unpopular opinion you have about your faculty?",
    tag: '#CampusHotTake',
  },
  {
    prompt: 'Best affordable food spot on or around campus right now?',
    tag: '#CampusFood',
  },
  {
    prompt: 'One thing you wish fresher-you knew before matriculation?',
    tag: '#FreshersAdvice',
  },
  {
    prompt: 'Most unforgettable lecture hall moment this semester?',
    tag: '#CampusLife',
  },
  {
    prompt: 'Drop your honest 1-line survival tip for exam week.',
    tag: '#ExamSzn',
  },
];

export const HomeView: React.FC = () => {
  const {
    user,
    accounts,
    socialPosts,
    rooms,
    enterRoom,
    feedTab,
    setFeedTab,
    createSocialPost,
    openCreateWithHashtag,
    setIsCreateModalOpen,
    setActiveView,
    setIsCreateRoomModalOpen,
    campusAnnouncements,
    platformSettings,
    followEdges,
    creators,
    openHashtag,
    isAuthenticated,
    showToast,
    unreadCount,
    copyUserLink,
    toggleFollowCreator,
    isFollowingUser,
    viewUserProfile,
  } = useBopoi();

  const { characterMood } = useCharacterMood();
  const isLoggedIn = Boolean(isAuthenticated && user.username && user.username !== 'student');

  const [feedCategory, setFeedCategory] = useState<string>('All');
  const [campusScope, setCampusScope] = useState<'all' | 'my-campus'>('all');
  const [visiblePostsLimit, setVisiblePostsLimit] = useState<number>(20);
  const [twoTowerSignals, setTwoTowerSignals] = useState<Record<string, TwoTowerPostSignal>>({});
  const [askLinkCopied, setAskLinkCopied] = useState(false);
  const [promptIndex, setPromptIndex] = useState<number>(() => {
    const dayOfYear = Math.floor(Date.now() / 86400000);
    return dayOfYear % CAMPUS_DAILY_PROMPTS.length;
  });

  // Threads-style inline quick composer state
  const [quickDraft, setQuickDraft] = useState('');
  const [quickAnonymous, setQuickAnonymous] = useState(false);
  const [quickGif, setQuickGif] = useState<{ mediaUrl: string; title: string } | null>(null);
  const [showQuickGifPicker, setShowQuickGifPicker] = useState(false);
  const [isComposerFocused, setIsComposerFocused] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [newIncomingCount, setNewIncomingCount] = useState(0);
  const quickTextareaRef = useRef<HTMLTextAreaElement>(null);
  const seenPostIdsRef = useRef<Set<string>>(new Set(socialPosts.map((p) => p.id)));

  const quickMention = useMentionAutocomplete({
    text: quickDraft,
    setText: setQuickDraft,
    inputRef: quickTextareaRef,
  });

  const isComposerExpanded =
    isComposerFocused || quickDraft.trim().length > 0 || Boolean(quickGif);
  const quickDetectedTags = useMemo(() => extractHashtagsFromText(quickDraft), [quickDraft]);
  const activePrompt = CAMPUS_DAILY_PROMPTS[promptIndex % CAMPUS_DAILY_PROMPTS.length];

  const handleCopyAskStrip = async () => {
    await copyUserLink();
    setAskLinkCopied(true);
    setTimeout(() => setAskLinkCopied(false), 1800);
  };

  const applyDailyPrompt = (anonymous: boolean) => {
    setQuickAnonymous(anonymous);
    setQuickDraft(`${activePrompt.prompt}\n\n${activePrompt.tag} `);
    setIsComposerFocused(true);
    setTimeout(() => {
      const el = quickTextareaRef.current;
      if (el) {
        el.focus();
        const len = el.value.length;
        el.setSelectionRange(len, len);
      }
    }, 40);
  };

  const quickMentionCandidates = useMemo(
    () =>
      buildMentionCandidates({
        creators,
        accounts,
        excludeUsername: user.username,
      }),
    [creators, accounts, user.username]
  );

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setShowScrollTop(y > 560);
      if (y < 180) {
        setNewIncomingCount(0);
        seenPostIdsRef.current = new Set(socialPosts.map((p) => p.id));
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [socialPosts]);

  // Surface a subtle floating "New campus posts" pill when real-time posts arrive while scrolled down
  useEffect(() => {
    const seen = seenPostIdsRef.current;
    if (typeof window === 'undefined' || window.scrollY <= 360) {
      socialPosts.forEach((p) => seen.add(p.id));
      return;
    }

    const myLower = (user.username || '').toLowerCase();
    let added = 0;
    for (const p of socialPosts) {
      if (!seen.has(p.id)) {
        seen.add(p.id);
        const isMine =
          (user.id && p.authorUserId === user.id) ||
          (!p.isAnonymous && p.authorUsername.toLowerCase() === myLower);
        if (!isMine && Date.now() - p.createdTimestamp < 120000) {
          added += 1;
        }
      }
    }
    if (added > 0) {
      setNewIncomingCount((prev) => prev + added);
    }
  }, [socialPosts, user.id, user.username]);

  const liveHashtags = useMemo(
    () => computeTrendingHashtags(socialPosts, rooms, 8),
    [socialPosts, rooms]
  );

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

  const activeAnnouncements = useMemo(() => {
    return (campusAnnouncements || []).filter((a) => {
      if (!a.isActive) return false;
      if (!a.campus || a.campus === 'All Campuses') return true;
      return user?.campus && a.campus.toLowerCase() === user.campus.toLowerCase();
    });
  }, [campusAnnouncements, user?.campus]);

  // Rank rooms by conversational velocity + active online participants
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

  const verifiedUsernameSet = useMemo(() => {
    const set = new Set<string>();
    for (const u of accounts || []) {
      if (u.isVerified || u.isCreator) {
        set.add(u.username.toLowerCase());
      }
    }
    return set;
  }, [accounts]);

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

  const inlineFollowSuggestions = useMemo(() => {
    const rec = computeLocalAdamicAdarRecommendations(
      user.id || '',
      user.username || '',
      user.campus || 'Chrisland University',
      followEdges,
      creators,
      socialPosts
    );
    const pool = rec.length > 0 ? rec : creators;
    const myLower = (user.username || '').toLowerCase();
    return pool
      .filter(
        (c) =>
          c.username.toLowerCase() !== myLower && !isFollowingUser(c.username)
      )
      .slice(0, 4);
  }, [user.id, user.username, user.campus, followEdges, creators, socialPosts, isFollowingUser]);

  const filteredPosts = useMemo(() => {
    let list = [...socialPosts];

    if (campusScope === 'my-campus' && user.campus) {
      const targetCampus = user.campus.trim().toLowerCase();
      list = list.filter(
        (p) => (p.authorCampus || '').trim().toLowerCase() === targetCampus
      );
    }

    if (feedCategory !== 'All') {
      const fc = feedCategory.toLowerCase();
      list = list.filter((p) => {
        if (fc.includes('student posts')) return true;
        if (fc.includes('money') || fc.includes('finance')) {
          return scorePostTopicRelevance(p, 'Money') > 0;
        }
        if (fc.includes('fashion') || fc.includes('style')) {
          return scorePostTopicRelevance(p, 'Fashion') > 0;
        }
        return scorePostTopicRelevance(p, feedCategory) > 0;
      });
    }

    switch (feedTab) {
      case 'following': {
        const myLower = (user.username || '').toLowerCase();
        const followingPosts = list.filter(
          (p) =>
            !p.isAnonymous &&
            (userBanditContext.followedUsernames.has((p.authorUsername || '').toLowerCase()) ||
              (myLower && (p.authorUsername || '').toLowerCase() === myLower) ||
              (user.id && p.authorUserId === user.id))
        );
        followingPosts.sort((a, b) => b.createdTimestamp - a.createdTimestamp);
        return followingPosts.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
      }
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
  }, [socialPosts, campusScope, feedCategory, feedTab, userBanditContext, user.id, user.username, user.campus]);

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn) {
      showToast('Sign in to publish posts on campus.', 'info');
      setActiveView('profile');
      return;
    }
    const trimmed = quickDraft.trim();
    if (!trimmed && !quickGif) return;

    const extractedTags = extractHashtagsFromText(trimmed);
    createSocialPost({
      type: quickAnonymous ? 'confession' : 'post',
      content: trimmed,
      category: 'Campus Life',
      hashtags: extractedTags,
      isAnonymous: quickAnonymous,
      characterMood,
      media: quickGif ? { mediaUrl: quickGif.mediaUrl, mediaType: 'gif' } : undefined,
    });
    setQuickDraft('');
    setQuickGif(null);
    setQuickAnonymous(false);
    setIsComposerFocused(false);
    quickMention.reset();
  };

  const handleQuickKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && (quickDraft.trim() || quickGif)) {
      e.preventDefault();
      handleQuickSubmit(e);
    }
  };

  const openQuickGif = () => {
    quickTextareaRef.current?.blur();
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    quickMention.dismiss();
    setIsComposerFocused(true);
    setShowQuickGifPicker(true);
  };

  return (
    <div className="w-full flex flex-col bg-white dark:bg-[#0E0C14] text-[#191525] dark:text-[#F4F2FA]">
      {/* 1. Compact Sticky Feed Switcher (stays <= 15% mobile sticky viewport cap) */}
      <div className="sticky top-[52px] lg:top-0 z-20 bg-white/95 dark:bg-[#0E0C14]/95 backdrop-blur-md border-b border-[#EAE6F0] dark:border-[#262036]">
        <div className="grid grid-cols-4">
          {(['for-you', 'following', 'latest', 'trending'] as const).map((tab) => {
            const isActive = feedTab === tab;
            const label =
              tab === 'for-you'
                ? 'For You'
                : tab === 'following'
                ? 'Following'
                : tab === 'latest'
                ? 'Latest'
                : 'Trending';
            return (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  if (feedTab === tab) {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  } else {
                    setFeedTab(tab);
                  }
                }}
                className={`min-h-[44px] py-2.5 text-xs sm:text-sm font-black transition-colors relative cursor-pointer hover:bg-[#FAF9FC] dark:hover:bg-[#171322] truncate px-1 ${
                  isActive
                    ? 'text-[#191525] dark:text-[#F4F2FA]'
                    : 'text-[#706B7D] dark:text-[#9E97B3]'
                }`}
              >
                <span>{label}</span>
                {isActive && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 sm:w-14 h-[3px] bg-[#5420F5] dark:bg-[#7C5CFF] rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Category Filter Strip + Campus Scope + Channel Shortcuts */}
      <div className="flex items-center justify-between gap-2 px-4 sm:px-5 py-2 border-b border-[#EAE6F0] dark:border-[#262036] bg-white dark:bg-[#0E0C14] overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1.5 shrink-0">
          {[
            { label: 'All', value: 'All', icon: null },
            { label: 'Student Posts', value: 'Student Posts', icon: <StudentPostsIcon size={13} /> },
            { label: 'Money', value: 'Money & Finances', icon: <MoneyFinancesIcon size={13} /> },
            { label: 'Fashion', value: 'Fashion & Style', icon: <FashionStyleIcon size={13} /> },
          ].map((c) => {
            const isActive = feedCategory === c.value;
            return (
              <button
                key={c.value}
                type="button"
                onClick={() => setFeedCategory(c.value)}
                className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-bold transition-colors shrink-0 cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-[#191525] dark:bg-[#F4F2FA] text-white dark:text-[#191525]'
                    : 'bg-[#FAF9FC] dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] text-[#706B7D] dark:text-[#9E97B3] hover:text-[#191525] dark:hover:text-white'
                }`}
              >
                {c.icon}
                <span>{c.label}</span>
              </button>
            );
          })}

          {user.campus && (
            <button
              type="button"
              onClick={() =>
                setCampusScope((prev) => (prev === 'all' ? 'my-campus' : 'all'))
              }
              className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-bold transition-colors shrink-0 cursor-pointer flex items-center gap-1.5 ${
                campusScope === 'my-campus'
                  ? 'bg-[#5420F5] text-white'
                  : 'bg-[#FAF9FC] dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] text-[#706B7D] dark:text-[#9E97B3] hover:text-[#5420F5] dark:hover:text-[#9B82FF]'
              }`}
              title={
                campusScope === 'my-campus'
                  ? `Showing ${user.campus} posts only (tap for all campuses)`
                  : `Filter strictly to ${user.campus}`
              }
            >
              <School className="w-3.5 h-3.5 shrink-0" />
              <span>My Campus</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 pl-2.5 border-l border-[#EAE6F0] dark:border-[#262036] shrink-0 text-xs font-bold text-[#706B7D] dark:text-[#9E97B3]">
          <button
            type="button"
            onClick={() => setActiveView('confessions')}
            className="min-h-[36px] px-1 hover:text-[#5420F5] dark:hover:text-[#9B82FF] transition-colors cursor-pointer whitespace-nowrap"
          >
            Confessions
          </button>
          <button
            type="button"
            onClick={() => setActiveView('polls')}
            className="min-h-[36px] px-1 hover:text-[#5420F5] dark:hover:text-[#9B82FF] transition-colors cursor-pointer whitespace-nowrap"
          >
            Polls
          </button>
          <button
            type="button"
            onClick={() => setActiveView('discussions')}
            className="min-h-[36px] px-1 hover:text-[#5420F5] dark:hover:text-[#9B82FF] transition-colors cursor-pointer whitespace-nowrap"
          >
            Topics
          </button>
        </div>
      </div>

      {/* 2. Platform Maintenance & Active Campus Broadcasts */}
      {platformSettings?.maintenanceMode && (
        <div className="px-4 sm:px-5 py-3 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/60 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black text-amber-950 dark:text-amber-200">
              Campus Read-Only Maintenance Mode Active
            </p>
            <p className="text-[11px] text-amber-800 dark:text-amber-300/90 mt-0.5 leading-snug">
              New posts, comments, and room messages are temporarily paused while maintenance completes.
            </p>
          </div>
        </div>
      )}

      {activeAnnouncements.length > 0 && (
        <div className="divide-y divide-[#EAE6F0] dark:divide-[#262036] border-b border-[#EAE6F0] dark:border-[#262036]">
          {activeAnnouncements.map((ann) => (
            <div
              key={ann.id}
              className={`px-4 sm:px-5 py-3 flex items-start gap-3 ${
                ann.severity === 'urgent'
                  ? 'bg-rose-50 dark:bg-rose-950/35 text-rose-950 dark:text-rose-100'
                  : 'bg-[#FAF8FF] dark:bg-[#18132B] text-[#191525] dark:text-[#F4F2FA]'
              }`}
            >
              <Megaphone
                className={`w-4 h-4 shrink-0 mt-0.5 ${
                  ann.severity === 'urgent'
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-[#5420F5] dark:text-[#9B82FF]'
                }`}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap text-xs">
                  <span className="font-black">{ann.title}</span>
                  <span className="text-[11px] font-bold text-[#706B7D] dark:text-[#9E97B3]">
                    · {ann.campus}
                  </span>
                </div>
                <p className="text-[11px] text-[#706B7D] dark:text-[#9E97B3] mt-0.5 leading-relaxed">
                  {ann.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3. Instagram-Style Stories Ring Tray (Your Ask Link + New Room + Live Campus Rooms) */}
      <section className="px-4 sm:px-5 py-3 border-b border-[#EAE6F0] dark:border-[#262036]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <CreateRoomIcon size={16} />
            <h2 className="text-xs font-black text-[#191525] dark:text-[#F4F2FA]">
              Live Campus Rooms
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setActiveView('rooms')}
            className="text-xs font-bold text-[#5420F5] dark:text-[#9B82FF] hover:underline cursor-pointer tabular-nums"
          >
            See all ({rooms.length})
          </button>
        </div>

        <div className="flex items-start gap-3 overflow-x-auto no-scrollbar pb-0.5">
          {/* Slot 1: Instagram "Your Story / Ask Link" Ring */}
          <button
            type="button"
            onClick={() => {
              if (!isLoggedIn) {
                setActiveView('register');
              } else if (unreadCount > 0) {
                setActiveView('inbox');
              } else {
                handleCopyAskStrip();
              }
            }}
            className="flex flex-col items-center gap-1 shrink-0 w-[60px] sm:w-[64px] group cursor-pointer"
            title={
              !isLoggedIn
                ? 'Create your anonymous ask link'
                : unreadCount > 0
                ? `${unreadCount} unread anonymous questions — tap to open Inbox`
                : 'Tap to copy your @ask link'
            }
          >
            <div className="relative">
              <div
                className={`p-[2.5px] rounded-full transition-transform group-hover:scale-105 ${
                  unreadCount > 0
                    ? 'bg-gradient-to-tr from-[#F52D85] via-[#FF922E] to-[#FFC928]'
                    : isLoggedIn
                    ? 'bg-gradient-to-tr from-[#5420F5] to-[#F52D85]'
                    : 'bg-[#EAE6F0] dark:bg-[#262036]'
                }`}
              >
                <div className="bg-white dark:bg-[#0E0C14] rounded-full p-[2px]">
                  <CampusCharacterAvatar
                    value={user.avatarUrl}
                    seed={user.username || 'guest'}
                    size={48}
                    rounded="full"
                  />
                </div>
              </div>

              <span
                className={`absolute -bottom-0.5 -right-0.5 min-w-[20px] h-[20px] px-1 rounded-full border-2 border-white dark:border-[#0E0C14] flex items-center justify-center text-[10px] font-black shadow-2xs ${
                  unreadCount > 0
                    ? 'bg-[#F52D85] text-white tabular-nums'
                    : askLinkCopied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-[#5420F5] text-white'
                }`}
              >
                {unreadCount > 0 ? (
                  unreadCount > 99 ? '99+' : unreadCount
                ) : askLinkCopied ? (
                  <Check className="w-3 h-3 stroke-[3]" />
                ) : isLoggedIn ? (
                  <Copy className="w-2.5 h-2.5 stroke-[2.5]" />
                ) : (
                  <Plus className="w-3 h-3 stroke-[3]" />
                )}
              </span>
            </div>

            <span className="text-[11px] font-bold text-[#191525] dark:text-[#F4F2FA] truncate w-full text-center">
              {unreadCount > 0
                ? 'Inbox'
                : askLinkCopied
                ? 'Copied!'
                : isLoggedIn
                ? 'Ask Link'
                : 'Get Link'}
            </span>
          </button>

          {/* Slot 2: + New Room Ring */}
          <button
            type="button"
            onClick={() => setIsCreateRoomModalOpen(true)}
            className="flex flex-col items-center gap-1 shrink-0 w-[60px] sm:w-[64px] group cursor-pointer"
          >
            <div className="w-[56px] h-[56px] rounded-full border-2 border-dashed border-[#5420F5]/50 dark:border-[#7C5CFF]/55 bg-[#F7F4FF] dark:bg-[#1A1430] group-hover:border-[#5420F5] group-hover:bg-[#F0EBFF] dark:group-hover:bg-[#231A45] flex items-center justify-center text-[#5420F5] dark:text-[#9B82FF] transition-colors">
              <Plus className="w-5 h-5 stroke-[2.5]" />
            </div>
            <span className="text-[11px] font-bold text-[#5420F5] dark:text-[#9B82FF] truncate w-full text-center">
              New Room
            </span>
          </button>

          {/* Empty state starter chip when no rooms exist yet */}
          {sortedRooms.length === 0 && (
            <button
              type="button"
              onClick={() => setIsCreateRoomModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl border border-[#EAE6F0] dark:border-[#262036] bg-[#FAF9FC] dark:bg-[#171322] hover:bg-[#F0EBFF]/60 dark:hover:bg-[#231A45] hover:border-[#5420F5]/30 text-left transition-colors cursor-pointer shrink-0 my-auto"
            >
              <div>
                <p className="text-xs font-black text-[#191525] dark:text-[#F4F2FA]">
                  No live rooms yet
                </p>
                <p className="text-[11px] text-[#706B7D] dark:text-[#9E97B3]">
                  Tap + New Room to start a masked campus chat
                </p>
              </div>
            </button>
          )}

          {/* Active Rooms Circular Story Rings */}
          {sortedRooms.map((room) => {
            const isHot = (room.onlineCount || 1) >= 2 || room.isFeatured;
            return (
              <button
                key={room.id}
                type="button"
                onClick={() => enterRoom(room.id)}
                className="flex flex-col items-center gap-1 shrink-0 w-[60px] sm:w-[64px] group cursor-pointer"
                title={`Enter #${room.name} (${room.onlineCount || 1} online)`}
              >
                <div className="relative">
                  <div
                    className={`p-[2.5px] rounded-full transition-transform group-hover:scale-105 ${
                      room.isJoined
                        ? 'bg-gradient-to-tr from-emerald-500 to-[#5420F5]'
                        : isHot
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

                  {/* Online Count or Lock Micro-Badge */}
                  <span className="absolute -bottom-0.5 -right-0.5 min-w-[20px] h-[18px] px-1 rounded-full bg-white dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] text-[10px] font-black text-emerald-700 dark:text-emerald-400 flex items-center justify-center tabular-nums shadow-2xs">
                    {room.isLocked ? (
                      <Lock className="w-2.5 h-2.5 text-rose-500" />
                    ) : (
                      room.onlineCount || 1
                    )}
                  </span>
                </div>

                <span className="text-[11px] font-bold text-[#191525] dark:text-[#F4F2FA] group-hover:text-[#5420F5] dark:group-hover:text-[#9B82FF] truncate w-full text-center transition-colors">
                  {room.name}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 4. Mobile / Tablet Trending Hashtags Strip (Desktop xl+ sees it in Right Sidebar) */}
      {liveHashtags.length > 0 && (
        <div className="xl:hidden flex items-center gap-2.5 px-4 sm:px-5 py-2 border-b border-[#EAE6F0] dark:border-[#262036] overflow-x-auto no-scrollbar bg-[#FAF9FC]/60 dark:bg-[#171322]/60">
          <span className="text-[11px] font-bold text-[#706B7D] dark:text-[#9E97B3] shrink-0">
            Trending:
          </span>
          {liveHashtags.map((item) => (
            <button
              key={item.tag}
              type="button"
              onClick={() => openHashtag(item.tag)}
              className="text-xs font-bold text-[#5420F5] dark:text-[#9B82FF] hover:underline underline-offset-2 shrink-0 cursor-pointer whitespace-nowrap"
              title={`Explore ${item.tag} (${item.count} tagged)`}
            >
              {item.tag}
            </button>
          ))}
        </div>
      )}

      {/* 4b. Unread Inbox Alert Strip (only surfaces on mobile/tablet when unread anonymous questions await) */}
      {isLoggedIn && unreadCount > 0 && (
        <div className="xl:hidden px-4 sm:px-5 py-2 border-b border-[#EAE6F0] dark:border-[#262036] bg-[#FAF8FF] dark:bg-[#18132B] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-[#F52D85]/15 text-[#F52D85] flex items-center justify-center shrink-0">
              <Inbox className="w-3.5 h-3.5" />
            </div>
            <p className="text-xs font-extrabold text-[#191525] dark:text-[#F4F2FA] truncate tabular-nums">
              {unreadCount} new anonymous {unreadCount === 1 ? 'question' : 'questions'} waiting
            </p>
          </div>
          <button
            type="button"
            onClick={() => setActiveView('inbox')}
            className="px-3 py-1 rounded-xl bg-[#5420F5] hover:bg-[#4314E2] text-white text-[11px] font-extrabold transition-colors cursor-pointer shrink-0 whitespace-nowrap"
          >
            Open Inbox →
          </button>
        </div>
      )}

      {/* 5. Progressive Threads-Style Inline Quick Composer + Daily Prompt Spark */}
      <form
        onSubmit={handleQuickSubmit}
        className={`px-4 sm:px-5 border-b border-[#EAE6F0] dark:border-[#262036] bg-white dark:bg-[#0E0C14] transition-all ${
          isComposerExpanded ? 'py-3.5' : 'py-2.5'
        }`}
      >
        <div className="flex items-start gap-3">
          <div className="pt-0.5 shrink-0">
            {quickAnonymous ? (
              <BopoiAnonymousAvatar size="sm" idPrefix="quick-composer" />
            ) : (
              <CampusCharacterAvatar
                value={user.avatarUrl}
                seed={user.username || 'guest'}
                size={36}
                rounded="full"
                className="ring-1 ring-[#EAE6F0] dark:ring-[#262036]"
              />
            )}
          </div>

          <div className="flex-1 min-w-0 space-y-2">
            <div className="relative">
              <div className="flex items-center gap-2">
                <textarea
                  ref={quickTextareaRef}
                  value={quickDraft}
                  onChange={quickMention.handleChange}
                  onClick={(e) => quickMention.syncCursorFromEvent(e.currentTarget)}
                  onKeyUp={(e) => quickMention.syncCursorFromEvent(e.currentTarget)}
                  onSelect={(e) => quickMention.syncCursorFromEvent(e.currentTarget)}
                  onFocus={() => setIsComposerFocused(true)}
                  onKeyDown={handleQuickKeyDown}
                  rows={isComposerExpanded ? 3 : 1}
                  maxLength={480}
                  placeholder={
                    quickAnonymous
                      ? 'Spill an anonymous confession... (#Confession)'
                      : "Start a thread on campus... (#tag or @mention)"
                  }
                  className="w-full bg-transparent text-base sm:text-[15px] text-[#191525] dark:text-[#F4F2FA] placeholder:text-[#706B7D] dark:placeholder:text-[#9E97B3] focus:outline-none resize-none leading-snug py-1"
                />

                {!isComposerExpanded && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={openQuickGif}
                      className="h-8 px-2 rounded-xl bg-[#FAF9FC] dark:bg-[#171322] hover:bg-[#F0EBFF] dark:hover:bg-[#231A45] border border-[#EAE6F0] dark:border-[#262036] text-[10px] font-black text-[#5420F5] dark:text-[#9B82FF] transition-colors cursor-pointer"
                      title="Attach a GIF"
                      aria-label="Attach a GIF"
                    >
                      GIF
                    </button>
                    <button
                      type="button"
                      onClick={() => openCreateWithHashtag(undefined, 'poll')}
                      className="p-2 rounded-xl bg-[#FAF9FC] dark:bg-[#171322] hover:bg-[#F0EBFF] dark:hover:bg-[#231A45] border border-[#EAE6F0] dark:border-[#262036] text-[#706B7D] dark:text-[#9E97B3] hover:text-[#5420F5] transition-colors cursor-pointer"
                      title="Create a live poll"
                      aria-label="Create a live poll"
                    >
                      <BarChart2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsComposerFocused(true);
                        setTimeout(() => quickTextareaRef.current?.focus(), 40);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-[#191525] dark:bg-[#F4F2FA] hover:bg-[#5420F5] dark:hover:bg-[#7C5CFF] text-white dark:text-[#191525] dark:hover:text-white text-xs font-extrabold transition-colors cursor-pointer"
                    >
                      Post
                    </button>
                  </div>
                )}
              </div>

              {isComposerExpanded && (
                <MentionAutocompleteDropdown
                  isOpen={quickMention.isOpen}
                  query={quickMention.query}
                  candidates={quickMentionCandidates}
                  onSelect={(username) => {
                    quickMention.insertMention(username);
                    setIsComposerFocused(true);
                  }}
                  onClose={quickMention.dismiss}
                  placement="bottom"
                />
              )}
            </div>

            {isComposerExpanded && (
              <div className="space-y-2 animate-in fade-in duration-150">
                {quickGif && (
                  <div className="flex items-start gap-2 pt-0.5">
                    <GifPreviewMedia
                      url={quickGif.mediaUrl}
                      alt={quickGif.title}
                      compact={true}
                    />
                    <button
                      type="button"
                      onClick={() => setQuickGif(null)}
                      className="p-1.5 rounded-full bg-[#FAF9FC] dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] text-[#706B7D] dark:text-[#9E97B3] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                      title="Remove GIF"
                      aria-label="Remove GIF"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {quickDetectedTags.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {quickDetectedTags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[11px] font-bold text-[#5420F5] dark:text-[#B49EFF] bg-[#F0EBFF] dark:bg-[#231A45] px-2 py-0.5 rounded-md"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between gap-2 pt-0.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setQuickAnonymous((prev) => !prev)}
                      className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                        quickAnonymous
                          ? 'bg-[#F0EBFF] dark:bg-[#231A45] text-[#5420F5] dark:text-[#B49EFF]'
                          : 'bg-[#FAF9FC] dark:bg-[#171322] text-[#706B7D] dark:text-[#9E97B3] hover:text-[#191525] dark:hover:text-white border border-[#EAE6F0] dark:border-[#262036]'
                      }`}
                      title="Toggle anonymous posting"
                    >
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>{quickAnonymous ? 'Anonymous' : 'Public'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={openQuickGif}
                      className={`h-[30px] px-2.5 rounded-xl border text-[11px] font-black transition-colors cursor-pointer ${
                        quickGif
                          ? 'bg-[#5420F5] border-[#5420F5] text-white'
                          : 'bg-[#FAF9FC] dark:bg-[#171322] hover:bg-[#F0EBFF] dark:hover:bg-[#231A45] border-[#EAE6F0] dark:border-[#262036] text-[#5420F5] dark:text-[#9B82FF]'
                      }`}
                      title="Attach a GIF"
                    >
                      GIF
                    </button>

                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={quickMention.togglePicker}
                      className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
                        quickMention.isOpen
                          ? 'bg-[#5420F5] border-[#5420F5] text-white'
                          : 'bg-[#FAF9FC] dark:bg-[#171322] hover:bg-[#F0EBFF] dark:hover:bg-[#231A45] border-[#EAE6F0] dark:border-[#262036] text-[#5420F5] dark:text-[#9B82FF]'
                      }`}
                      title="Mention a student (@)"
                      aria-label="Mention a student"
                    >
                      <AtSign className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => openCreateWithHashtag(undefined, 'poll')}
                      className="px-2.5 py-1.5 rounded-xl bg-[#FAF9FC] dark:bg-[#171322] hover:bg-[#F0EBFF] dark:hover:bg-[#231A45] border border-[#EAE6F0] dark:border-[#262036] text-[11px] font-bold text-[#706B7D] dark:text-[#9E97B3] hover:text-[#5420F5] transition-colors cursor-pointer flex items-center gap-1"
                      title="Create a live poll"
                    >
                      <BarChart2 className="w-3.5 h-3.5" />
                      <span>Poll</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => openCreateWithHashtag(undefined, 'discussion')}
                      className="px-2.5 py-1.5 rounded-xl bg-[#FAF9FC] dark:bg-[#171322] hover:bg-[#F0EBFF] dark:hover:bg-[#231A45] border border-[#EAE6F0] dark:border-[#262036] text-[11px] font-bold text-[#706B7D] dark:text-[#9E97B3] hover:text-[#5420F5] transition-colors cursor-pointer flex items-center gap-1"
                      title="Start a campus topic"
                    >
                      <MessageSquarePlus className="w-3.5 h-3.5" />
                      <span>Topic</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {quickDraft.length > 0 && (
                      <CharProgressRing length={quickDraft.length} max={480} />
                    )}
                    {!quickDraft.trim() && !quickGif && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsComposerFocused(false);
                          quickMention.reset();
                        }}
                        className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-[#706B7D] dark:text-[#9E97B3] hover:text-[#191525] dark:hover:text-white cursor-pointer"
                      >
                        Close
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={!quickDraft.trim() && !quickGif}
                      className="px-4 py-1.5 rounded-xl bg-[#191525] dark:bg-[#F4F2FA] hover:bg-[#5420F5] dark:hover:bg-[#7C5CFF] disabled:opacity-35 text-white dark:text-[#191525] dark:hover:text-white text-xs font-extrabold transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
                    >
                      <Send className="w-3 h-3" />
                      <span>Post</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Today's Campus Prompt Spark */}
            {!quickDraft.trim() && !quickGif && (
              <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-[#EAE6F0]/70 dark:border-[#262036] text-[11px]">
                <button
                  type="button"
                  onClick={() => applyDailyPrompt(false)}
                  className="flex items-center gap-1.5 min-w-0 text-left text-[#706B7D] dark:text-[#9E97B3] hover:text-[#5420F5] dark:hover:text-[#9B82FF] transition-colors cursor-pointer group"
                  title="Tap to answer today's campus prompt"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#5420F5] dark:text-[#9B82FF] shrink-0" />
                  <span className="truncate font-semibold group-hover:underline">
                    {activePrompt.prompt}
                  </span>
                </button>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => applyDailyPrompt(true)}
                    className="px-2 py-0.5 rounded-lg bg-[#FAF9FC] dark:bg-[#171322] hover:bg-[#F0EBFF] dark:hover:bg-[#231A45] border border-[#EAE6F0] dark:border-[#262036] text-[#5420F5] dark:text-[#9B82FF] font-bold cursor-pointer transition-colors whitespace-nowrap"
                    title="Answer anonymously"
                  >
                    Anon reply
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setPromptIndex((prev) => (prev + 1) % CAMPUS_DAILY_PROMPTS.length)
                    }
                    className="p-1 rounded-lg text-[#706B7D] dark:text-[#9E97B3] hover:text-[#191525] dark:hover:text-white hover:bg-[#FAF9FC] dark:hover:bg-[#171322] cursor-pointer transition-colors"
                    title="Shuffle prompt"
                    aria-label="Shuffle daily prompt"
                  >
                    <RefreshCw className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </form>

      {/* 6. Hairline-Divided Feed Stream */}
      <div className="flex flex-col pb-12">
        {filteredPosts.length === 0 ? (
          <div className="px-6 py-16 text-center space-y-3 border-b border-[#EAE6F0] dark:border-[#262036]">
            <div className="w-12 h-12 rounded-2xl bg-[#FAF9FC] dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] flex items-center justify-center mx-auto">
              {feedTab === 'following' ? (
                <Users className="w-6 h-6 text-[#5420F5] dark:text-[#9B82FF]" />
              ) : (
                <CreatePostIcon size={28} />
              )}
            </div>
            <h3 className="text-sm sm:text-base font-black text-[#191525] dark:text-[#F4F2FA]">
              {feedTab === 'following'
                ? 'Your Following feed is quiet'
                : campusScope === 'my-campus' && user.campus
                ? `No posts from ${user.campus} match yet`
                : feedCategory !== 'All'
                ? `No posts in ${feedCategory} yet`
                : 'No campus posts yet'}
            </h3>
            <p className="text-xs text-[#706B7D] dark:text-[#9E97B3] max-w-sm mx-auto leading-relaxed">
              {feedTab === 'following'
                ? 'Follow classmates from the feed or Discover tab to see all their campus posts here.'
                : 'Be the first student to share an anonymous confession, start a campus discussion, or launch a live poll.'}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {feedTab === 'following' ? (
                <>
                  <button
                    type="button"
                    onClick={() => setActiveView('discover')}
                    className="px-5 py-2.5 bg-[#5420F5] hover:bg-[#4314E2] text-white text-xs font-black rounded-xl transition-colors cursor-pointer"
                  >
                    Find Students to Follow
                  </button>
                  <button
                    type="button"
                    onClick={() => setFeedTab('for-you')}
                    className="px-4 py-2.5 bg-[#FAF9FC] dark:bg-[#171322] hover:bg-[#F0EBFF] dark:hover:bg-[#231A45] border border-[#EAE6F0] dark:border-[#262036] text-[#191525] dark:text-[#F4F2FA] text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    Back to For You
                  </button>
                </>
              ) : (
                <>
                  {campusScope === 'my-campus' && (
                    <button
                      type="button"
                      onClick={() => setCampusScope('all')}
                      className="px-4 py-2.5 bg-[#FAF9FC] dark:bg-[#171322] hover:bg-[#F0EBFF] dark:hover:bg-[#231A45] border border-[#EAE6F0] dark:border-[#262036] text-[#191525] dark:text-[#F4F2FA] text-xs font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      Show All Campuses
                    </button>
                  )}
                  {feedCategory !== 'All' && (
                    <button
                      type="button"
                      onClick={() => setFeedCategory('All')}
                      className="px-4 py-2.5 bg-[#FAF9FC] dark:bg-[#171322] hover:bg-[#F0EBFF] dark:hover:bg-[#231A45] border border-[#EAE6F0] dark:border-[#262036] text-[#191525] dark:text-[#F4F2FA] text-xs font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      Show All Posts
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(true)}
                    className="px-5 py-2.5 bg-[#5420F5] hover:bg-[#4314E2] text-white text-xs font-black rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4 stroke-[2.75]" />
                    <span>Create Post</span>
                  </button>
                </>
              )}
            </div>

            {/* Inline Follow Suggestions on quiet Following tab */}
            {feedTab === 'following' && inlineFollowSuggestions.length > 0 && (
              <div className="pt-4 max-w-md mx-auto text-left">
                <p className="text-[11px] font-black text-[#706B7D] dark:text-[#9E97B3] mb-2">
                  Suggested Campus Students
                </p>
                <div className="divide-y divide-[#EAE6F0] dark:divide-[#262036] border border-[#EAE6F0] dark:border-[#262036] rounded-2xl overflow-hidden bg-white dark:bg-[#171322]">
                  {inlineFollowSuggestions.map((person) => (
                    <div
                      key={person.id}
                      onClick={() => viewUserProfile(person)}
                      className="px-3.5 py-2.5 hover:bg-[#FAF9FC] dark:hover:bg-[#1E192D] transition-colors flex items-center justify-between gap-2.5 cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <CampusCharacterAvatar
                          value={person.avatarUrl}
                          seed={person.username}
                          size={34}
                          rounded="full"
                          className="ring-1 ring-[#EAE6F0] dark:ring-[#262036] shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1 min-w-0">
                            <span className="text-xs font-black text-[#191525] dark:text-[#F4F2FA] truncate">
                              {person.name}
                            </span>
                            <VerifiedCreatorBadge
                              isVerified={person.isVerified}
                              username={person.username}
                              size={13}
                            />
                          </div>
                          <span className="text-[11px] text-[#706B7D] dark:text-[#9E97B3] block truncate">
                            @{person.username} · {person.campus}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFollowCreator(person.id);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-[#191525] dark:bg-[#F4F2FA] hover:bg-[#5420F5] dark:hover:bg-[#7C5CFF] text-white dark:text-[#191525] dark:hover:text-white text-[11px] font-bold transition-colors cursor-pointer inline-flex items-center gap-1 shrink-0"
                      >
                        <UserPlus className="w-3 h-3" />
                        <span>
                          {'isFollowingYou' in person && person.isFollowingYou
                            ? 'Follow Back'
                            : 'Follow'}
                        </span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {filteredPosts.slice(0, visiblePostsLimit).map((post) => (
              <FeedPostRow
                key={post.id}
                post={post}
                verifiedUsernameSet={verifiedUsernameSet}
                trackImpression={true}
              />
            ))}

            {filteredPosts.length > visiblePostsLimit && (
              <button
                type="button"
                onClick={() => setVisiblePostsLimit((prev) => prev + 20)}
                className="w-full py-4 border-b border-[#EAE6F0] dark:border-[#262036] hover:bg-[#FAF9FC] dark:hover:bg-[#171322] text-xs font-black text-[#5420F5] dark:text-[#9B82FF] cursor-pointer transition-colors tabular-nums"
              >
                Show more posts ({filteredPosts.length - visiblePostsLimit} remaining)
              </button>
            )}
          </>
        )}
      </div>

      {/* Floating New Posts Pill */}
      {newIncomingCount > 0 && (
        <button
          type="button"
          onClick={() => {
            setNewIncomingCount(0);
            seenPostIdsRef.current = new Set(socialPosts.map((p) => p.id));
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="fixed top-[106px] lg:top-[56px] left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-full bg-[#5420F5] hover:bg-[#4314E2] text-white text-xs font-black shadow-xl transition-all cursor-pointer inline-flex items-center gap-1.5 animate-in fade-in slide-in-from-top-2"
        >
          <ArrowUp className="w-3.5 h-3.5 stroke-[2.75]" />
          <span>
            {newIncomingCount === 1
              ? '1 new campus post'
              : `${newIncomingCount} new campus posts`}
          </span>
        </button>
      )}

      {/* Floating Scroll-to-Top Pill */}
      {showScrollTop && (
        <button
          type="button"
          onClick={() => {
            setNewIncomingCount(0);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="fixed bottom-[72px] lg:bottom-6 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-full bg-[#191525]/92 dark:bg-[#231A45]/95 hover:bg-[#5420F5] text-white text-xs font-black shadow-lg backdrop-blur-md transition-all cursor-pointer inline-flex items-center gap-1.5 animate-in fade-in slide-in-from-bottom-2"
          aria-label="Back to top"
        >
          <ArrowUp className="w-3.5 h-3.5 stroke-[2.75]" />
          <span>Back to top</span>
        </button>
      )}

      <KlipyGifPicker
        isOpen={showQuickGifPicker}
        customerId={user.id || user.username || 'bopoi_student'}
        onSelect={(gif) => {
          setQuickGif({ mediaUrl: gif.url, title: gif.title || 'GIF' });
          setShowQuickGifPicker(false);
          setIsComposerFocused(true);
        }}
        onClose={() => setShowQuickGifPicker(false)}
      />
    </div>
  );
};
