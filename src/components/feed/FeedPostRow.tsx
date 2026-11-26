import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  Pin,
  Check,
  Flag,
  Trash2,
  MoreHorizontal,
  Copy,
  Send,
  UserPlus,
  UserCheck,
  Repeat2,
  Quote,
  AtSign,
  EyeOff,
} from 'lucide-react';
import { SocialPost } from '../../types/index.ts';
import { useBopoi } from '../../context/BopoiContext.tsx';
import { supabase, recordPostBanditInteraction } from '../../lib/supabase.ts';
import { BopoiAnonymousAvatar } from '../brand/BopoiAnonymousAvatar.tsx';
import { PersonaMaskIcon } from '../brand/masks/PersonaMaskIcon.tsx';
import { BookmarkedIcon } from '../brand/icons/index.ts';
import { CampusCharacterAvatar } from '../brand/character/index.ts';
import { VerifiedCreatorBadge } from '../ui/VerifiedCreatorBadge.tsx';
import { HashtagRow } from '../ui/HashtagRow.tsx';
import { MentionText } from '../ui/MentionText.tsx';
import { GifPreviewMedia } from '../ui/GifPreviewMedia.tsx';
import { QuotedPostCard } from './QuotedPostCard.tsx';
import { MentionAutocompleteDropdown } from '../comments/MentionAutocompleteDropdown.tsx';
import {
  buildMentionCandidates,
  useMentionAutocomplete,
} from '../../hooks/useMentionAutocomplete.ts';

interface FeedPostRowProps {
  post: SocialPost;
  verifiedUsernameSet?: Set<string>;
  trackImpression?: boolean;
  showThreadLine?: boolean;
  showCategoryInMeta?: boolean;
  showReportButton?: boolean;
  showDeleteButton?: boolean;
  activeHashtag?: string | null;
  onDelete?: (postId: string) => void;
  onReport?: (post: SocialPost) => void;
  onClick?: (post: SocialPost) => void;
}

/**
 * Unified Threads + X hairline-divided feed item.
 * Renders Posts, Confessions, Polls, and Discussions cleanly without outer card chrome.
 */
export const FeedPostRow: React.FC<FeedPostRowProps> = ({
  post,
  verifiedUsernameSet,
  trackImpression = false,
  showThreadLine = true,
  showCategoryInMeta = true,
  showReportButton = false,
  showDeleteButton = false,
  activeHashtag,
  onDelete,
  onReport,
  onClick,
}) => {
  const {
    socialPosts,
    creators,
    accounts,
    togglePostLike,
    togglePostBookmark,
    addPostComment,
    votePoll,
    setSelectedPost,
    setActiveView,
    viewUserProfile,
    openPostShare,
    repostSocialPost,
    openQuoteComposer,
    openReportModal,
    deleteSocialPost,
    isFollowingUser,
    toggleFollowCreator,
    openPublicAskFor,
    showToast,
    isAuthenticated,
    user,
  } = useBopoi();

  const isLoggedIn = Boolean(isAuthenticated && user.username && user.username !== 'student');
  const [menuOpen, setMenuOpen] = useState(false);
  const [repostMenuOpen, setRepostMenuOpen] = useState(false);
  const [heartPopKey, setHeartPopKey] = useState(0);
  const [doubleTapHeartKey, setDoubleTapHeartKey] = useState(0);
  const [inlineReplyOpen, setInlineReplyOpen] = useState(false);
  const [inlineReplyText, setInlineReplyText] = useState('');
  const [inlineReplyAnon, setInlineReplyAnon] = useState(false);
  const [isContentExpanded, setIsContentExpanded] = useState(false);
  const inlineReplyInputRef = useRef<HTMLInputElement>(null);
  const lastTouchTapRef = useRef<number>(0);

  const inlineMention = useMentionAutocomplete({
    text: inlineReplyText,
    setText: setInlineReplyText,
    inputRef: inlineReplyInputRef,
  });

  const mentionCandidates = useMemo(() => {
    if (!inlineReplyOpen) return [];
    return buildMentionCandidates({
      creators,
      accounts,
      excludeUsername: user.username,
    });
  }, [inlineReplyOpen, creators, accounts, user.username]);

  useEffect(() => {
    if (!menuOpen && !repostMenuOpen && !inlineReplyOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (inlineMention.isOpen) return;
        e.preventDefault();
        setMenuOpen(false);
        setRepostMenuOpen(false);
        setInlineReplyOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [menuOpen, repostMenuOpen, inlineReplyOpen, inlineMention.isOpen]);

  const rowRef = useRef<HTMLElement | null>(null);
  const enteredAtRef = useRef<number | null>(null);
  const qualifiedImpressionRef = useRef<boolean>(false);
  const qualificationTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!trackImpression) return;
    const node = rowRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;

    const flushDwellIfQualified = () => {
      if (qualificationTimerRef.current !== null) {
        window.clearTimeout(qualificationTimerRef.current);
        qualificationTimerRef.current = null;
      }
      if (enteredAtRef.current !== null && qualifiedImpressionRef.current) {
        const dwellMs = Date.now() - enteredAtRef.current;
        if (dwellMs >= 1500) {
          recordPostBanditInteraction(supabase, post.id, false, dwellMs);
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
  }, [post.id, trackImpression]);

  const isPoll = post.type === 'poll';
  const isConfession = post.type === 'confession';
  const isVerified = Boolean(
    post.authorIsVerified ||
      verifiedUsernameSet?.has((post.authorUsername || '').toLowerCase())
  );

  const isOwnPost = Boolean(
    (user.id && post.authorUserId === user.id) ||
      (!post.isAnonymous &&
        post.authorUsername.toLowerCase() === (user.username || '').toLowerCase())
  );

  const canFollowAuthor = Boolean(
    !post.isAnonymous && post.authorUsername && !isOwnPost
  );
  const followingAuthor = canFollowAuthor
    ? isFollowingUser(post.authorUsername)
    : false;

  const handleCopyPostLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/?post=${post.id}#post-${post.id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).catch(() => {});
    }
    showToast('Post link copied to clipboard!', 'success');
    setMenuOpen(false);
  };

  const handleOpen = () => {
    if (onClick) {
      onClick(post);
      return;
    }
    recordPostBanditInteraction(supabase, post.id, true, 2500);
    setSelectedPost(post);
    setActiveView(isPoll ? 'poll-detail' : 'post-detail');
  };

  const optionsSum = (post.pollOptions || []).reduce(
    (sum, o) => sum + Math.max(0, o.votes || 0),
    0
  );
  const pollTotal =
    post.pollOptions && post.pollOptions.length > 0
      ? optionsSum
      : Math.max(0, post.pollTotalVotes || 0);
  const hasVoted = Boolean(post.userVotedOptionId);
  const showPercentages = hasVoted || pollTotal > 0;
  const highestVotes = Math.max(
    0,
    ...(post.pollOptions || []).map((o) => o.votes || 0)
  );

  const hasConnectorThread = Boolean(showThreadLine && (post.commentsCount || 0) > 0);
  const previewComment = useMemo(() => {
    if (!hasConnectorThread || !post.comments || post.comments.length === 0) return null;
    const roots = post.comments.filter((c) => !c.parentId);
    const pool = roots.length > 0 ? roots : post.comments;
    return pool[pool.length - 1];
  }, [hasConnectorThread, post.comments]);

  const liveRepostsCount = useMemo(() => {
    const derived = socialPosts.filter((p) => p.quotedPostId === post.id).length;
    return Math.max(post.repostsCount || 0, derived);
  }, [socialPosts, post.id, post.repostsCount]);

  const hasRepostedByMe = useMemo(() => {
    const myLower = (user.username || '').toLowerCase();
    return socialPosts.some(
      (p) =>
        p.quotedPostId === post.id &&
        ((user.id && p.authorUserId === user.id) ||
          (!p.isAnonymous && myLower && (p.authorUsername || '').toLowerCase() === myLower))
    );
  }, [socialPosts, post.id, user.id, user.username]);

  const triggerLikeWithPop = () => {
    if (!post.hasLiked) {
      setHeartPopKey((k) => k + 1);
    }
    togglePostLike(post.id);
  };

  const triggerDoubleTapLike = (e: React.SyntheticEvent) => {
    const target = e.target as HTMLElement | null;
    if (target?.closest('button, a, input, textarea, [role="button"]')) return;
    e.stopPropagation();
    setDoubleTapHeartKey((k) => k + 1);
    if (!post.hasLiked) {
      setHeartPopKey((k) => k + 1);
      togglePostLike(post.id);
    }
  };

  const handleTouchDoubleTap = (e: React.PointerEvent) => {
    if (e.pointerType !== 'touch') return;
    const target = e.target as HTMLElement | null;
    if (target?.closest('button, a, input, textarea, [role="button"]')) return;
    const now = Date.now();
    if (now - lastTouchTapRef.current < 280) {
      lastTouchTapRef.current = 0;
      triggerDoubleTapLike(e);
    } else {
      lastTouchTapRef.current = now;
    }
  };

  const handleInlineReplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn) {
      showToast('Sign in to reply to campus posts.', 'info');
      setActiveView('profile');
      return;
    }
    const clean = inlineReplyText.trim();
    if (!clean) return;
    addPostComment(post.id, clean, undefined, undefined, inlineReplyAnon);
    setInlineReplyText('');
    setInlineReplyAnon(false);
    setInlineReplyOpen(false);
    inlineMention.reset();
  };

  return (
    <article
      ref={rowRef}
      onClick={handleOpen}
      onDoubleClick={triggerDoubleTapLike}
      onPointerUp={handleTouchDoubleTap}
      className="relative px-4 sm:px-5 py-4 border-b border-[#EAE6F0] dark:border-[#262036] bg-white dark:bg-[#0E0C14] hover:bg-[#FAF9FC]/70 dark:hover:bg-[#171322]/55 transition-colors cursor-pointer"
    >
      {doubleTapHeartKey > 0 && (
        <div
          key={doubleTapHeartKey}
          className="pointer-events-none absolute left-1/2 top-1/2 z-20 animate-double-tap-heart"
          aria-hidden="true"
        >
          <Heart className="w-16 h-16 text-[#F52D85] fill-[#F52D85] drop-shadow-lg" />
        </div>
      )}
      <div className="flex items-stretch gap-3">
        {/* Left Avatar Gutter + Threads-style vertical thread line when replies exist */}
        <div className="w-10 shrink-0 flex flex-col items-center pt-0.5">
          <div
            onClick={(e) => {
              e.stopPropagation();
              viewUserProfile(post.authorUsername, post.isAnonymous, post.authorCampus);
            }}
            className="cursor-pointer hover:opacity-85 transition-opacity shrink-0"
            title={
              post.isAnonymous
                ? 'View Anonymous Student Profile'
                : `View ${post.authorName}'s profile`
            }
          >
            {post.isAnonymous ? (
              <BopoiAnonymousAvatar size="sm" idPrefix={`row-${post.id}`} />
            ) : (
              <CampusCharacterAvatar
                value={post.authorAvatar}
                seed={post.authorUsername}
                size={38}
                rounded="full"
                className="ring-1 ring-[#EAE6F0] dark:ring-[#262036]"
              />
            )}
          </div>

          {hasConnectorThread && (
            <div
              className="w-[1.5px] flex-1 bg-[#EAE6F0] dark:bg-[#262036] mt-2 rounded-full min-h-[14px]"
              aria-hidden="true"
            />
          )}
        </div>

        {/* Right Content Column */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Header Meta Line (Zero-pill unboxed typography) */}
          <div className="flex items-start justify-between gap-2">
            <div
              onClick={(e) => {
                e.stopPropagation();
                viewUserProfile(post.authorUsername, post.isAnonymous, post.authorCampus);
              }}
              className="min-w-0 flex-1 cursor-pointer group"
            >
              <div className="flex items-center gap-1.5 flex-wrap leading-tight">
                <span className="text-[13px] sm:text-sm font-black text-[#191525] dark:text-[#F4F2FA] group-hover:underline truncate max-w-[180px] sm:max-w-none">
                  {post.isAnonymous
                    ? isConfession
                      ? 'Anonymous Student'
                      : isPoll
                      ? 'Anonymous Pollster'
                      : post.authorName || 'Anonymous'
                    : post.authorName}
                </span>

                {post.isAnonymous ? (
                  <PersonaMaskIcon mask="masked-student" size={13} />
                ) : (
                  <VerifiedCreatorBadge
                    isVerified={isVerified}
                    username={post.authorUsername}
                    isAnonymous={post.isAnonymous}
                    size={15}
                  />
                )}

                {!post.isAnonymous && post.authorUsername && (
                  <span className="text-xs text-[#706B7D] dark:text-[#9E97B3] truncate">
                    @{post.authorUsername}
                  </span>
                )}

                <span className="text-xs text-[#706B7D] dark:text-[#9E97B3] shrink-0">· {post.createdAt}</span>

                {canFollowAuthor && !followingAuthor && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFollowCreator(post.authorUsername);
                    }}
                    className="text-xs font-extrabold text-[#5420F5] dark:text-[#8E6BFF] hover:underline shrink-0 cursor-pointer ml-0.5"
                  >
                    · Follow
                  </button>
                )}
              </div>

              {(post.authorCampus || (showCategoryInMeta && post.category)) && (
                <p className="text-[11px] text-[#706B7D] dark:text-[#9E97B3] mt-0.5 truncate">
                  {post.authorCampus}
                  {post.authorCampus && showCategoryInMeta && post.category ? ' · ' : ''}
                  {showCategoryInMeta && post.category ? post.category : ''}
                </p>
              )}
            </div>

            {/* Right Quiet Kicker + Quick More Menu */}
            <div className="relative flex items-center gap-1.5 shrink-0 text-[11px] font-bold text-[#706B7D] dark:text-[#9E97B3]">
              {post.isPinned && (
                <span className="inline-flex items-center gap-0.5 text-amber-700 dark:text-amber-400">
                  <Pin className="w-3 h-3" />
                  <span className="hidden xs:inline">Pinned</span>
                </span>
              )}
              {post.isFeatured && (
                <span className="text-[#5420F5] dark:text-[#8E6BFF] hidden xs:inline">
                  Featured
                </span>
              )}
              <span
                className={`capitalize ${
                  isConfession
                    ? 'text-[#5420F5] dark:text-[#8E6BFF]'
                    : isPoll
                    ? 'text-orange-700 dark:text-orange-400'
                    : 'text-[#706B7D] dark:text-[#9E97B3]'
                }`}
              >
                {post.type}
              </span>

              {showDeleteButton && isOwnPost && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onDelete) {
                      onDelete(post.id);
                    } else {
                      deleteSocialPost(post.id);
                    }
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                  title="Delete post"
                  aria-label="Delete post"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen((prev) => !prev);
                }}
                className="w-9 h-9 sm:w-7 sm:h-7 -mr-1.5 rounded-full flex items-center justify-center text-[#706B7D] dark:text-[#9E97B3] hover:text-[#191525] dark:hover:text-[#F4F2FA] hover:bg-[#FAF9FC] dark:hover:bg-[#171322] transition-colors cursor-pointer"
                title="More post actions"
                aria-label="More post actions"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>

              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(false);
                    }}
                  />
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-0 top-9 sm:top-8 w-48 bg-white dark:bg-[#171322] rounded-2xl border border-[#EAE6F0] dark:border-[#262036] shadow-xl py-1.5 z-40 text-xs text-[#191525] dark:text-[#F4F2FA]"
                  >
                    <button
                      type="button"
                      onClick={handleCopyPostLink}
                      className="w-full px-3.5 py-2 text-left font-bold hover:bg-[#FAF9FC] dark:hover:bg-[#231942]/60 flex items-center gap-2.5 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5 text-[#5420F5] dark:text-[#8E6BFF]" />
                      <span>Copy link</span>
                    </button>

                    {canFollowAuthor && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            toggleFollowCreator(post.authorUsername);
                            setMenuOpen(false);
                          }}
                          className="w-full px-3.5 py-2 text-left font-bold hover:bg-[#FAF9FC] dark:hover:bg-[#231942]/60 flex items-center gap-2.5 cursor-pointer"
                        >
                          {followingAuthor ? (
                            <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <UserPlus className="w-3.5 h-3.5 text-[#5420F5] dark:text-[#8E6BFF]" />
                          )}
                          <span className="truncate">
                            {followingAuthor
                              ? `Unfollow @${post.authorUsername}`
                              : `Follow @${post.authorUsername}`}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setMenuOpen(false);
                            openPublicAskFor(post.authorUsername);
                          }}
                          className="w-full px-3.5 py-2 text-left font-bold hover:bg-[#FAF9FC] dark:hover:bg-[#231942]/60 flex items-center gap-2.5 cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5 text-[#5420F5] dark:text-[#8E6BFF]" />
                          <span className="truncate">Ask @{post.authorUsername}</span>
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        togglePostBookmark(post.id);
                        setMenuOpen(false);
                      }}
                      className="w-full px-3.5 py-2 text-left font-bold hover:bg-[#FAF9FC] dark:hover:bg-[#231942]/60 flex items-center gap-2.5 cursor-pointer"
                    >
                      <Bookmark className="w-3.5 h-3.5 text-[#5420F5] dark:text-[#8E6BFF]" />
                      <span>{post.isBookmarked ? 'Remove bookmark' : 'Bookmark'}</span>
                    </button>

                    <div className="my-1 border-t border-[#EAE6F0] dark:border-[#262036]" />

                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        if (onReport) {
                          onReport(post);
                        } else {
                          openReportModal({
                            targetType: 'social_post',
                            targetId: post.id,
                            targetLabel: post.type || 'post',
                            targetPreview: post.content.slice(0, 140),
                          });
                        }
                      }}
                      className="w-full px-3.5 py-2 text-left font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 flex items-center gap-2.5 cursor-pointer"
                    >
                      <Flag className="w-3.5 h-3.5" />
                      <span>Report post</span>
                    </button>

                    {isOwnPost && (
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          if (onDelete) {
                            onDelete(post.id);
                          } else {
                            deleteSocialPost(post.id);
                          }
                        }}
                        className="w-full px-3.5 py-2 text-left font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2.5 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete post</span>
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Optional Title */}
          {post.title && (
            <h3 className="text-[15px] font-black text-[#191525] dark:text-[#F4F2FA] leading-snug">
              <MentionText text={post.title} />
            </h3>
          )}

          {/* Post Body Text with clickable @mentions and #hashtags + X/Threads-style Show more truncation */}
          {post.content && (() => {
            const newlineCount = (post.content.match(/\n/g) || []).length;
            const isLongContent = post.content.length > 260 || newlineCount >= 5;
            return (
              <div className="space-y-1">
                <p
                  className={`text-[14px] sm:text-[15px] text-[#191525] dark:text-[#F4F2FA] font-normal leading-[1.52] whitespace-pre-wrap break-words ${
                    isLongContent && !isContentExpanded ? 'line-clamp-5' : ''
                  }`}
                >
                  <MentionText text={post.content} />
                </p>
                {isLongContent && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsContentExpanded((prev) => !prev);
                    }}
                    className="text-xs font-extrabold text-[#5420F5] dark:text-[#8E6BFF] hover:underline cursor-pointer"
                  >
                    {isContentExpanded ? 'Show less' : 'Show more'}
                  </button>
                )}
              </div>
            );
          })()}

          {/* Attached GIF / Media */}
          {post.mediaUrl && (
            <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
              <GifPreviewMedia
                url={post.mediaUrl}
                alt={post.content || 'Campus post GIF'}
              />
            </div>
          )}

          {/* Embedded Quoted Post */}
          {post.quotedPostSnapshot && (
            <div className="pt-0.5">
              <QuotedPostCard
                quote={post.quotedPostSnapshot}
                onOpen={(e) => {
                  e.stopPropagation();
                  const liveQuoted = socialPosts.find(
                    (p) => p.id === post.quotedPostSnapshot?.id
                  );
                  const fallbackPost: SocialPost = liveQuoted || {
                    id: post.quotedPostSnapshot!.id,
                    type: post.quotedPostSnapshot!.type,
                    authorName: post.quotedPostSnapshot!.authorName,
                    authorUsername: post.quotedPostSnapshot!.authorUsername,
                    authorAvatar: post.quotedPostSnapshot!.authorAvatar,
                    authorCampus: post.quotedPostSnapshot!.authorCampus,
                    isAnonymous: post.quotedPostSnapshot!.isAnonymous,
                    title: post.quotedPostSnapshot!.title,
                    content: post.quotedPostSnapshot!.content,
                    mediaUrl: post.quotedPostSnapshot!.mediaUrl,
                    mediaType: post.quotedPostSnapshot!.mediaType,
                    createdAt: post.quotedPostSnapshot!.createdAt,
                    createdTimestamp: post.createdTimestamp,
                    likes: 0,
                    commentsCount: 0,
                    sharesCount: 0,
                  };
                  setSelectedPost(fallbackPost);
                  setActiveView(fallbackPost.type === 'poll' ? 'poll-detail' : 'post-detail');
                }}
              />
            </div>
          )}

          {/* Interactive Poll Options */}
          {isPoll && post.pollOptions && post.pollOptions.length > 0 && (
            <div className="space-y-2 pt-1" onClick={(e) => e.stopPropagation()}>
              {post.pollOptions.map((opt) => {
                const isSelected = post.userVotedOptionId === opt.id;
                const pct =
                  pollTotal > 0
                    ? Math.min(100, Math.round(((opt.votes || 0) / pollTotal) * 100))
                    : 0;
                const isLeader =
                  hasVoted && pollTotal > 0 && (opt.votes || 0) === highestVotes;

                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => votePoll(post.id, opt.id)}
                    className={`relative w-full text-left rounded-xl px-3.5 py-2.5 border transition-colors cursor-pointer overflow-hidden ${
                      isSelected
                        ? 'border-[#5420F5] bg-[#FAF8FF] dark:bg-[#231942]/45'
                        : 'border-[#EAE6F0] dark:border-[#262036] bg-[#FAF9FC] dark:bg-[#171322] hover:border-[#C7B8FA] dark:hover:border-[#5420F5]/60'
                    }`}
                  >
                    {showPercentages && (
                      <div
                        className={`absolute inset-y-0 left-0 transition-all duration-300 ${
                          isSelected
                            ? 'bg-[#5420F5]/14 dark:bg-[#5420F5]/25'
                            : isLeader
                            ? 'bg-[#E9E4F5] dark:bg-[#262036]'
                            : 'bg-[#F0EEF5] dark:bg-[#1E192D]'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    )}
                    <div className="relative z-10 flex items-center justify-between gap-2.5 text-xs text-[#191525] dark:text-[#F4F2FA]">
                      <span className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 border transition-colors ${
                            isSelected
                              ? 'bg-[#5420F5] border-[#5420F5] text-white'
                              : 'bg-white dark:bg-[#0E0C14] border-[#C8C2D6] dark:border-[#393052]'
                          }`}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </span>
                        <span
                          className={`truncate ${
                            isSelected || isLeader ? 'font-extrabold' : 'font-semibold'
                          }`}
                        >
                          {opt.text}
                        </span>
                        {hasVoted && isLeader && (
                          <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 shrink-0">
                            · Leading
                          </span>
                        )}
                      </span>

                      {showPercentages && (
                        <span
                          className={`tabular-nums shrink-0 ${
                            isSelected
                              ? 'font-black text-[#5420F5] dark:text-[#8E6BFF]'
                              : isLeader
                              ? 'font-extrabold text-[#191525] dark:text-[#F4F2FA]'
                              : 'font-bold text-[#706B7D] dark:text-[#9E97B3]'
                          }`}
                        >
                          {pct}%
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}

              <div className="flex items-center justify-between text-[11px] font-semibold text-[#706B7D] dark:text-[#9E97B3] tabular-nums pt-0.5">
                <span>
                  {pollTotal.toLocaleString()} {pollTotal === 1 ? 'vote' : 'votes'}
                  {post.pollExpiresIn ? ` · ${post.pollExpiresIn}` : ''}
                </span>
                <span>{hasVoted ? 'Tap to switch vote' : 'Tap to vote'}</span>
              </div>
            </div>
          )}

          {/* Clickable Hashtags */}
          <HashtagRow hashtags={post.hashtags} activeTag={activeHashtag} className="pt-0.5" />

          {/* Action Toolbar (>=44px mobile hit targets, tabular numbers) */}
          <div className="flex items-center justify-between pt-1 -ml-2 text-[#706B7D] dark:text-[#9E97B3] text-xs tabular-nums">
            <div className="flex items-center gap-0.5 sm:gap-2.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerLikeWithPop();
                }}
                className={`min-h-[44px] sm:min-h-[38px] px-2.5 rounded-full flex items-center gap-1.5 transition-all active:scale-90 cursor-pointer hover:bg-pink-50 dark:hover:bg-pink-950/35 ${
                  post.hasLiked ? 'text-[#F52D85] font-bold' : 'hover:text-[#F52D85]'
                }`}
                aria-label="Like post"
              >
                <Heart
                  key={heartPopKey}
                  className={`w-[18px] h-[18px] ${post.hasLiked ? 'fill-[#F52D85]' : ''} ${
                    heartPopKey > 0 ? 'animate-heart-pop' : ''
                  }`}
                />
                <span>{post.likes}</span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setInlineReplyOpen((prev) => {
                    const next = !prev;
                    if (next) {
                      setTimeout(() => inlineReplyInputRef.current?.focus(), 40);
                    } else {
                      inlineMention.reset();
                    }
                    return next;
                  });
                }}
                className={`min-h-[44px] sm:min-h-[38px] px-2.5 rounded-full flex items-center gap-1.5 transition-all active:scale-90 cursor-pointer hover:bg-[#F0EBFF] dark:hover:bg-[#231942]/70 ${
                  inlineReplyOpen
                    ? 'text-[#5420F5] dark:text-[#8E6BFF] bg-[#F0EBFF] dark:bg-[#231942] font-bold'
                    : 'hover:text-[#5420F5] dark:hover:text-[#8E6BFF]'
                }`}
                aria-label="Quick reply to post"
                title="Reply inline"
              >
                <MessageCircle className="w-[18px] h-[18px]" />
                <span>{post.commentsCount}</span>
              </button>

              {/* In-App Repost / Quote Popover */}
              <div className="relative" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => setRepostMenuOpen((prev) => !prev)}
                  className={`min-h-[44px] sm:min-h-[38px] px-2.5 rounded-full flex items-center gap-1.5 transition-all active:scale-90 cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-950/35 ${
                    repostMenuOpen || hasRepostedByMe
                      ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50/70 dark:bg-emerald-950/35 font-bold'
                      : 'hover:text-emerald-600 dark:hover:text-emerald-400'
                  }`}
                  title="Repost or Quote onto feed"
                  aria-label="Repost or Quote post"
                >
                  <Repeat2 className="w-[18px] h-[18px]" />
                  <span>{liveRepostsCount}</span>
                </button>

                {repostMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      onClick={() => setRepostMenuOpen(false)}
                    />
                    <div className="absolute left-0 bottom-11 w-44 bg-white dark:bg-[#171322] rounded-2xl border border-[#EAE6F0] dark:border-[#262036] shadow-xl py-1.5 z-40 text-xs text-[#191525] dark:text-[#F4F2FA]">
                      <button
                        type="button"
                        onClick={() => {
                          setRepostMenuOpen(false);
                          repostSocialPost(post);
                        }}
                        className="w-full px-3.5 py-2 text-left font-bold hover:bg-[#FAF9FC] dark:hover:bg-[#231942]/60 flex items-center gap-2.5 cursor-pointer"
                      >
                        <Repeat2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>{hasRepostedByMe ? 'Repost again' : 'Repost'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRepostMenuOpen(false);
                          openQuoteComposer(post);
                        }}
                        className="w-full px-3.5 py-2 text-left font-bold hover:bg-[#FAF9FC] dark:hover:bg-[#231942]/60 flex items-center gap-2.5 cursor-pointer"
                      >
                        <Quote className="w-3.5 h-3.5 text-[#5420F5] dark:text-[#8E6BFF]" />
                        <span>Quote Post</span>
                      </button>
                    </div>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openPostShare(post);
                }}
                className="min-h-[44px] sm:min-h-[38px] px-2.5 rounded-full flex items-center gap-1.5 hover:text-[#5420F5] dark:hover:text-[#8E6BFF] hover:bg-[#F0EBFF] dark:hover:bg-[#231942]/70 transition-all active:scale-90 cursor-pointer"
                title="Share post off-campus"
                aria-label="Share post"
              >
                <Share2 className="w-[18px] h-[18px]" />
                <span>{post.sharesCount || 0}</span>
              </button>
            </div>

            <div className="flex items-center gap-1 -mr-1.5">
              {showReportButton && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onReport) {
                      onReport(post);
                    } else {
                      openReportModal({
                        targetType: 'social_post',
                        targetId: post.id,
                        targetLabel: post.type || 'post',
                        targetPreview: post.content.slice(0, 140),
                      });
                    }
                  }}
                  className="min-h-[44px] min-w-[44px] sm:min-h-[38px] sm:min-w-[38px] rounded-full flex items-center justify-center hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/35 transition-all active:scale-90 cursor-pointer"
                  title="Report post"
                  aria-label="Report post"
                >
                  <Flag className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  togglePostBookmark(post.id);
                }}
                className={`min-h-[44px] min-w-[44px] sm:min-h-[38px] sm:min-w-[38px] rounded-full flex items-center justify-center transition-all active:scale-90 cursor-pointer hover:bg-[#F0EBFF] dark:hover:bg-[#231942]/70 ${
                  post.isBookmarked
                    ? 'text-[#5420F5] dark:text-[#8E6BFF]'
                    : 'hover:text-[#5420F5] dark:hover:text-[#8E6BFF]'
                }`}
                title={post.isBookmarked ? 'Remove bookmark' : 'Bookmark post'}
                aria-label={post.isBookmarked ? 'Remove bookmark' : 'Bookmark post'}
              >
                {post.isBookmarked ? (
                  <BookmarkedIcon size={17} />
                ) : (
                  <Bookmark className="w-[17px] h-[17px]" />
                )}
              </button>
            </div>
          </div>

          {/* Threads-Style Inline Quick Reply Drawer */}
          {inlineReplyOpen && (
            <form
              onSubmit={handleInlineReplySubmit}
              onClick={(e) => e.stopPropagation()}
              className="mt-1.5 pt-2.5 border-t border-[#EAE6F0]/80 dark:border-[#262036] space-y-2 animate-in fade-in duration-150"
            >
              <div className="relative flex items-center gap-2">
                {inlineReplyAnon ? (
                  <BopoiAnonymousAvatar size="xs" idPrefix={`inline-reply-${post.id}`} />
                ) : (
                  <CampusCharacterAvatar
                    value={user.avatarUrl}
                    seed={user.username || 'student'}
                    size={26}
                    rounded="full"
                    className="ring-1 ring-[#EAE6F0] dark:ring-[#262036] shrink-0"
                  />
                )}
                <input
                  ref={inlineReplyInputRef}
                  type="text"
                  value={inlineReplyText}
                  onChange={inlineMention.handleChange}
                  onClick={(e) => inlineMention.syncCursorFromEvent(e.currentTarget)}
                  onKeyUp={(e) => inlineMention.syncCursorFromEvent(e.currentTarget)}
                  onSelect={(e) => inlineMention.syncCursorFromEvent(e.currentTarget)}
                  placeholder={
                    inlineReplyAnon
                      ? 'Reply anonymously... (@mention)'
                      : `Reply to ${post.isAnonymous ? 'Anonymous' : `@${post.authorUsername}`}... (@mention)`
                  }
                  className="flex-1 min-w-0 bg-[#FAF9FC] dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] focus:border-[#5420F5] focus:bg-white dark:focus:bg-[#1E192D] rounded-xl px-3 py-2 text-base sm:text-xs font-medium text-[#191525] dark:text-[#F4F2FA] placeholder:text-[#706B7D] dark:placeholder:text-[#9E97B3] focus:outline-none transition-colors"
                />
                <button
                  type="submit"
                  disabled={!inlineReplyText.trim()}
                  className="min-h-[36px] px-3 rounded-xl bg-[#5420F5] hover:bg-[#4314E2] disabled:opacity-40 text-white text-xs font-extrabold transition-colors cursor-pointer shrink-0 flex items-center gap-1"
                >
                  <Send className="w-3 h-3" />
                  <span>Reply</span>
                </button>

                <MentionAutocompleteDropdown
                  isOpen={inlineMention.isOpen}
                  query={inlineMention.query}
                  candidates={mentionCandidates}
                  onSelect={(username) => inlineMention.insertMention(username)}
                  onClose={inlineMention.dismiss}
                  placement="top"
                />
              </div>

              <div className="flex items-center justify-between gap-2 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setInlineReplyAnon((prev) => !prev)}
                    className={`px-2 py-1 rounded-lg font-bold inline-flex items-center gap-1 transition-colors cursor-pointer ${
                      inlineReplyAnon
                        ? 'bg-[#F0EBFF] dark:bg-[#231942] text-[#5420F5] dark:text-[#8E6BFF]'
                        : 'bg-[#FAF9FC] dark:bg-[#171322] text-[#706B7D] dark:text-[#9E97B3] hover:text-[#191525] dark:hover:text-[#F4F2FA] border border-[#EAE6F0] dark:border-[#262036]'
                    }`}
                  >
                    <EyeOff className="w-3 h-3" />
                    <span>{inlineReplyAnon ? 'Anonymous' : 'Public'}</span>
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={inlineMention.togglePicker}
                    className={`p-1 rounded-lg border transition-colors cursor-pointer ${
                      inlineMention.isOpen
                        ? 'bg-[#5420F5] border-[#5420F5] text-white'
                        : 'bg-[#FAF9FC] dark:bg-[#171322] hover:bg-[#F0EBFF] dark:hover:bg-[#231942] border-[#EAE6F0] dark:border-[#262036] text-[#5420F5] dark:text-[#8E6BFF]'
                    }`}
                    title="Mention a student (@)"
                    aria-label="Mention a student"
                  >
                    <AtSign className="w-3 h-3" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleOpen}
                  className="font-bold text-[#5420F5] dark:text-[#8E6BFF] hover:underline cursor-pointer"
                >
                  Open full thread →
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Threads-style inline top-reply anchor connected cleanly below the thread line */}
      {hasConnectorThread && (
        <div className="flex items-center gap-3 pt-1.5">
          <div className="w-10 shrink-0 flex justify-center">
            {previewComment ? (
              previewComment.isAnonymous ? (
                <BopoiAnonymousAvatar size="xs" idPrefix={`row-preview-${post.id}`} />
              ) : (
                <CampusCharacterAvatar
                  value={previewComment.authorAvatar}
                  seed={previewComment.authorUsername}
                  size={22}
                  rounded="full"
                  className="ring-1 ring-[#EAE6F0] dark:ring-[#262036]"
                />
              )
            ) : (
              <div className="w-5 h-5 rounded-full bg-[#F0EBFF] dark:bg-[#231942] text-[#5420F5] dark:text-[#8E6BFF] flex items-center justify-center">
                <MessageCircle className="w-3 h-3" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 flex items-center justify-between gap-2 text-xs">
            {previewComment ? (
              <p className="min-w-0 flex-1 truncate text-[#706B7D] dark:text-[#9E97B3]">
                <span className="font-bold text-[#191525] dark:text-[#F4F2FA]">{previewComment.authorName}</span>
                {!previewComment.isAnonymous &&
                  verifiedUsernameSet?.has((previewComment.authorUsername || '').toLowerCase()) && (
                    <span className="inline-flex items-center align-middle ml-1">
                      <VerifiedCreatorBadge
                        isVerified={true}
                        username={previewComment.authorUsername}
                        size={11}
                      />
                    </span>
                  )}
                <span className="ml-1.5">
                  {previewComment.text || (previewComment.mediaUrl ? 'Sent a GIF' : 'Replied')}
                </span>
              </p>
            ) : (
              <span className="text-xs font-semibold text-[#706B7D] dark:text-[#9E97B3] truncate">
                Join the conversation
              </span>
            )}
            <span className="text-[11px] font-bold text-[#5420F5] dark:text-[#8E6BFF] hover:underline shrink-0 tabular-nums">
              {post.commentsCount === 1 ? '1 reply' : `View all ${post.commentsCount} replies`}
            </span>
          </div>
        </div>
      )}
    </article>
  );
};
