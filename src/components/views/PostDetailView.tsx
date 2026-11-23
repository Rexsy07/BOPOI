import React, { useState, useEffect, useMemo } from 'react';
import { useBopoi } from '../../context/BopoiContext.tsx';
import { SocialPost } from '../../types/index.ts';
import {
  supabase,
  computeRelatedSocialPosts,
  recordPostBanditInteraction,
} from '../../lib/supabase.ts';
import {
  ChevronLeft,
  MoreVertical,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  Flag,
  Trash2,
  Copy,
  UserPlus,
  Check,
  Send,
  Repeat2,
  Quote,
} from 'lucide-react';
import { BopoiAnonymousAvatar } from '../brand/BopoiAnonymousAvatar.tsx';
import { SocialCommentsThread } from '../comments/SocialCommentsThread.tsx';
import { MentionText } from '../ui/MentionText.tsx';
import { CampusCharacterAvatar } from '../brand/character/index.ts';
import {
  CreatePostIcon,
  CreateConfessionIcon,
  CreateDiscussionIcon,
  BookmarkedIcon,
} from '../brand/icons/index.ts';
import { VerifiedCreatorBadge } from '../ui/VerifiedCreatorBadge.tsx';
import { HashtagRow } from '../ui/HashtagRow.tsx';
import { FeedPostRow } from '../feed/FeedPostRow.tsx';
import { GifPreviewMedia } from '../ui/GifPreviewMedia.tsx';
import { QuotedPostCard } from '../feed/QuotedPostCard.tsx';

export const PostDetailView: React.FC = () => {
  const {
    socialPosts,
    accounts,
    selectedPost,
    setSelectedPost,
    togglePostLike,
    togglePostBookmark,
    setActiveView,
    goBack,
    user,
    showToast,
    viewUserProfile,
    openPostShare,
    repostSocialPost,
    openQuoteComposer,
    deleteSocialPost,
    openReportModal,
    isFollowingUser,
    toggleFollowCreator,
    openPublicAskFor,
  } = useBopoi();

  const [menuOpen, setMenuOpen] = useState(false);
  const [repostMenuOpen, setRepostMenuOpen] = useState(false);
  const [heartPopKey, setHeartPopKey] = useState(0);

  useEffect(() => {
    if (!menuOpen && !repostMenuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setMenuOpen(false);
        setRepostMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [menuOpen, repostMenuOpen]);

  const verifiedUsernameSet = useMemo(() => {
    const set = new Set<string>();
    for (const u of accounts || []) {
      if (u.isVerified || u.isCreator) set.add(u.username.toLowerCase());
    }
    return set;
  }, [accounts]);

  const activePost: SocialPost | undefined =
    selectedPost
      ? socialPosts.find((p) => p.id === selectedPost.id) || selectedPost
      : socialPosts[0];

  useEffect(() => {
    if (!activePost?.id) return;
    const enteredAt = Date.now();
    return () => {
      const dwellMs = Date.now() - enteredAt;
      if (dwellMs >= 1500) {
        recordPostBanditInteraction(supabase, activePost.id, false, dwellMs);
      }
    };
  }, [activePost?.id]);

  const relatedPosts = useMemo(() => {
    if (!activePost) return [];
    return computeRelatedSocialPosts(activePost, socialPosts, {
      userCampus: user?.campus || activePost.authorCampus,
      limit: 3,
    });
  }, [activePost, socialPosts, user?.campus]);

  const liveRepostsCount = useMemo(() => {
    if (!activePost) return 0;
    const derived = socialPosts.filter((p) => p.quotedPostId === activePost.id).length;
    return Math.max(activePost.repostsCount || 0, derived);
  }, [socialPosts, activePost]);

  const hasRepostedByMe = useMemo(() => {
    if (!activePost) return false;
    const myLower = (user.username || '').toLowerCase();
    return socialPosts.some(
      (p) =>
        p.quotedPostId === activePost.id &&
        ((user.id && p.authorUserId === user.id) ||
          (!p.isAnonymous && myLower && (p.authorUsername || '').toLowerCase() === myLower))
    );
  }, [socialPosts, activePost, user.id, user.username]);

  if (!activePost) {
    return (
      <div className="w-full px-6 py-16 text-center space-y-3 bg-white dark:bg-[#0E0C14] text-[#191525] dark:text-[#F4F2FA]">
        <p className="text-sm font-black text-[#191525] dark:text-[#F4F2FA]">No active post selected.</p>
        <button
          type="button"
          onClick={() => setActiveView('home')}
          className="min-h-[44px] px-5 py-2.5 bg-[#5420F5] hover:bg-[#4314E2] text-white text-xs font-extrabold rounded-xl cursor-pointer transition-colors"
        >
          Return to Home
        </button>
      </div>
    );
  }

  const isOwnPost =
    Boolean(user.id && activePost.authorUserId === user.id) ||
    (!activePost.isAnonymous &&
      activePost.authorUsername.toLowerCase() === (user.username || '').toLowerCase());

  const isVerified = Boolean(
    activePost.authorIsVerified ||
      verifiedUsernameSet.has((activePost.authorUsername || '').toLowerCase())
  );

  const canFollowAuthor = Boolean(
    !activePost.isAnonymous && activePost.authorUsername && !isOwnPost
  );
  const followingAuthor = canFollowAuthor
    ? isFollowingUser(activePost.authorUsername)
    : false;

  const handleShare = () => {
    openPostShare(activePost);
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/?post=${activePost.id}#post-${activePost.id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).catch(() => {});
    }
    showToast('Post link copied to clipboard!', 'success');
    setMenuOpen(false);
  };

  return (
    <div className="w-full flex flex-col bg-white dark:bg-[#0E0C14] text-[#191525] dark:text-[#F4F2FA]">
      {/* 1. Sticky Top Bar */}
      <div className="sticky top-[52px] lg:top-0 z-20 bg-white/95 dark:bg-[#0E0C14]/95 backdrop-blur-md border-b border-[#EAE6F0] dark:border-[#262036] px-4 sm:px-5 h-[52px] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => goBack('home')}
            className="min-w-[44px] min-h-[44px] sm:min-w-[40px] sm:min-h-[40px] -ml-2 rounded-full hover:bg-[#FAF9FC] dark:hover:bg-[#171322] text-[#191525] dark:text-[#F4F2FA] transition-colors cursor-pointer flex items-center justify-center shrink-0"
            title="Go back"
            aria-label="Go back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 min-w-0">
            {activePost.type === 'confession' ? (
              <CreateConfessionIcon size={20} />
            ) : activePost.type === 'discussion' ? (
              <CreateDiscussionIcon size={20} />
            ) : (
              <CreatePostIcon size={20} />
            )}
            <h1 className="text-base font-black text-[#191525] dark:text-[#F4F2FA] tracking-tight capitalize truncate">
              {activePost.type || 'Thread'}
            </h1>
          </div>
        </div>

        <div className="relative flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="min-w-[44px] min-h-[44px] sm:min-w-[40px] sm:min-h-[40px] -mr-2 rounded-full hover:bg-[#FAF9FC] dark:hover:bg-[#171322] text-[#706B7D] dark:text-[#9E97B3] hover:text-[#191525] dark:hover:text-[#F4F2FA] transition-colors cursor-pointer flex items-center justify-center"
            title="Post options"
            aria-label="Post options"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-11 w-52 bg-white dark:bg-[#171322] rounded-2xl border border-[#EAE6F0] dark:border-[#262036] shadow-xl py-1.5 z-40">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="w-full min-h-[40px] px-3.5 py-2 text-left text-xs font-bold text-[#191525] dark:text-[#F4F2FA] hover:bg-[#FAF9FC] dark:hover:bg-[#231A45] flex items-center gap-2.5 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 text-[#5420F5] dark:text-[#B9A7FF]" />
                  <span>Copy Post Link</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    handleShare();
                  }}
                  className="w-full min-h-[40px] px-3.5 py-2 text-left text-xs font-bold text-[#191525] dark:text-[#F4F2FA] hover:bg-[#FAF9FC] dark:hover:bg-[#231A45] flex items-center gap-2.5 cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5 text-[#5420F5] dark:text-[#B9A7FF]" />
                  <span>Share Post Card</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    togglePostBookmark(activePost.id);
                    setMenuOpen(false);
                  }}
                  className="w-full min-h-[40px] px-3.5 py-2 text-left text-xs font-bold text-[#191525] dark:text-[#F4F2FA] hover:bg-[#FAF9FC] dark:hover:bg-[#231A45] flex items-center gap-2.5 cursor-pointer"
                >
                  <Bookmark className="w-3.5 h-3.5 text-[#5420F5] dark:text-[#B9A7FF]" />
                  <span>{activePost.isBookmarked ? 'Remove Bookmark' : 'Bookmark Post'}</span>
                </button>
                {canFollowAuthor && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        toggleFollowCreator(activePost.authorUsername);
                        setMenuOpen(false);
                      }}
                      className="w-full min-h-[40px] px-3.5 py-2 text-left text-xs font-bold text-[#191525] dark:text-[#F4F2FA] hover:bg-[#FAF9FC] dark:hover:bg-[#231A45] flex items-center gap-2.5 cursor-pointer"
                    >
                      {followingAuthor ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <UserPlus className="w-3.5 h-3.5 text-[#5420F5] dark:text-[#B9A7FF]" />
                      )}
                      <span className="truncate">
                        {followingAuthor
                          ? `Unfollow @${activePost.authorUsername}`
                          : `Follow @${activePost.authorUsername}`}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        openPublicAskFor(activePost.authorUsername);
                      }}
                      className="w-full min-h-[40px] px-3.5 py-2 text-left text-xs font-bold text-[#191525] dark:text-[#F4F2FA] hover:bg-[#FAF9FC] dark:hover:bg-[#231A45] flex items-center gap-2.5 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5 text-[#5420F5] dark:text-[#B9A7FF]" />
                      <span className="truncate">Ask @{activePost.authorUsername}</span>
                    </button>
                  </>
                )}
                <div className="my-1 border-t border-[#EAE6F0] dark:border-[#262036]" />
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    openReportModal({
                      targetType: 'social_post',
                      targetId: activePost.id,
                      targetLabel: activePost.type || 'post',
                      targetPreview: [activePost.title, activePost.content]
                        .filter(Boolean)
                        .join(': ')
                        .slice(0, 140),
                    });
                  }}
                  className="w-full min-h-[40px] px-3.5 py-2 text-left text-xs font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 flex items-center gap-2.5 cursor-pointer"
                >
                  <Flag className="w-3.5 h-3.5" />
                  <span>Report Post</span>
                </button>
                {isOwnPost && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      deleteSocialPost(activePost.id);
                    }}
                    className="w-full min-h-[40px] px-3.5 py-2 text-left text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Post</span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* 2. Focal Post (Flush Hairline Surface) */}
      <article className="px-4 sm:px-5 py-4 border-b border-[#EAE6F0] dark:border-[#262036] space-y-3.5">
        <div className="flex items-start justify-between gap-2">
          <div
            onClick={() =>
              viewUserProfile(activePost.authorUsername, activePost.isAnonymous, activePost.authorCampus)
            }
            className="flex items-center gap-3 cursor-pointer group min-w-0"
            title={`View ${activePost.authorName}'s profile`}
          >
            {activePost.isAnonymous ? (
              <BopoiAnonymousAvatar size="sm" idPrefix={`detail-${activePost.id}`} />
            ) : (
              <CampusCharacterAvatar
                value={activePost.authorAvatar}
                seed={activePost.authorUsername}
                size={42}
                rounded="full"
                className="ring-1 ring-[#EAE6F0] dark:ring-[#262036] shrink-0"
              />
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-sm font-black text-[#191525] dark:text-[#F4F2FA] group-hover:underline truncate">
                  {activePost.authorName}
                </span>
                <VerifiedCreatorBadge
                  isVerified={isVerified}
                  username={activePost.authorUsername}
                  isAnonymous={activePost.isAnonymous}
                  size={15}
                />
              </div>
              <p className="text-xs text-[#706B7D] dark:text-[#9E97B3] truncate">
                {!activePost.isAnonymous && activePost.authorUsername
                  ? `@${activePost.authorUsername} · `
                  : ''}
                {activePost.createdAt}
                {activePost.authorCampus ? ` · ${activePost.authorCampus}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {canFollowAuthor ? (
              <button
                type="button"
                onClick={() => toggleFollowCreator(activePost.authorUsername)}
                className={`min-h-[36px] px-3 py-1 rounded-xl text-xs font-extrabold transition-all active:scale-95 cursor-pointer inline-flex items-center gap-1 ${
                  followingAuthor
                    ? 'bg-[#FAF9FC] dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] text-[#191525] dark:text-[#F4F2FA] hover:bg-slate-100 dark:hover:bg-[#231A45]'
                    : 'bg-[#191525] dark:bg-[#F4F2FA] hover:bg-[#5420F5] dark:hover:bg-[#7C5CFF] text-white dark:text-[#191525] dark:hover:text-white'
                }`}
              >
                {followingAuthor ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 stroke-[2.75]" />
                    <span>Following</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Follow</span>
                  </>
                )}
              </button>
            ) : (
              <span className="text-[11px] font-bold text-[#5420F5] dark:text-[#B9A7FF] capitalize shrink-0">
                {activePost.type === 'confession' ? 'Confession' : activePost.type || 'Post'}
              </span>
            )}
          </div>
        </div>

        {activePost.title && (
          <h2 className="text-base sm:text-lg font-black text-[#191525] dark:text-[#F4F2FA] leading-snug">
            <MentionText text={activePost.title} />
          </h2>
        )}

        {activePost.content && (
          <p className="text-[15px] sm:text-base text-[#191525] dark:text-[#F4F2FA] font-normal leading-[1.58] whitespace-pre-wrap break-words">
            <MentionText text={activePost.content} />
          </p>
        )}

        {activePost.mediaUrl && (
          <div>
            <GifPreviewMedia
              url={activePost.mediaUrl}
              alt={activePost.content || 'Campus post GIF'}
            />
          </div>
        )}

        {activePost.quotedPostSnapshot && (
          <div>
            <QuotedPostCard
              quote={activePost.quotedPostSnapshot}
              onOpen={() => {
                const liveQuoted = socialPosts.find(
                  (p) => p.id === activePost.quotedPostSnapshot?.id
                );
                const fallbackPost: SocialPost = liveQuoted || {
                  id: activePost.quotedPostSnapshot!.id,
                  type: activePost.quotedPostSnapshot!.type,
                  authorName: activePost.quotedPostSnapshot!.authorName,
                  authorUsername: activePost.quotedPostSnapshot!.authorUsername,
                  authorAvatar: activePost.quotedPostSnapshot!.authorAvatar,
                  authorCampus: activePost.quotedPostSnapshot!.authorCampus,
                  isAnonymous: activePost.quotedPostSnapshot!.isAnonymous,
                  title: activePost.quotedPostSnapshot!.title,
                  content: activePost.quotedPostSnapshot!.content,
                  mediaUrl: activePost.quotedPostSnapshot!.mediaUrl,
                  mediaType: activePost.quotedPostSnapshot!.mediaType,
                  createdAt: activePost.quotedPostSnapshot!.createdAt,
                  createdTimestamp: activePost.createdTimestamp,
                  likes: 0,
                  commentsCount: 0,
                  sharesCount: 0,
                };
                setSelectedPost(fallbackPost);
                if (fallbackPost.type === 'poll') {
                  setActiveView('poll-detail');
                } else {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
            />
          </div>
        )}

        <HashtagRow hashtags={activePost.hashtags} size="md" />

        {/* Clean Hairline Action Bar */}
        <div className="flex items-center justify-between pt-2.5 border-t border-[#EAE6F0]/70 dark:border-[#262036] text-[#706B7D] dark:text-[#9E97B3] text-xs tabular-nums">
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              type="button"
              onClick={() => {
                if (!activePost.hasLiked) setHeartPopKey((k) => k + 1);
                togglePostLike(activePost.id);
              }}
              className={`min-h-[44px] sm:min-h-[38px] px-2.5 -ml-2 rounded-full flex items-center gap-1.5 transition-all active:scale-90 cursor-pointer hover:bg-pink-50 dark:hover:bg-pink-950/30 ${
                activePost.hasLiked ? 'text-[#F52D85] font-bold' : 'hover:text-[#F52D85]'
              }`}
            >
              <Heart
                key={heartPopKey}
                className={`w-[18px] h-[18px] ${activePost.hasLiked ? 'fill-[#F52D85]' : ''} ${
                  heartPopKey > 0 ? 'animate-heart-pop' : ''
                }`}
              />
              <span>{activePost.likes}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const input = document.getElementById('social-comment-reply-input') as HTMLInputElement | null;
                if (input) {
                  input.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  setTimeout(() => input.focus(), 180);
                }
              }}
              className="min-h-[44px] sm:min-h-[38px] px-2.5 rounded-full flex items-center gap-1.5 hover:text-[#5420F5] dark:hover:text-[#B9A7FF] hover:bg-[#F0EBFF] dark:hover:bg-[#231A45] transition-all active:scale-90 cursor-pointer"
              aria-label="Reply to post"
            >
              <MessageCircle className="w-[18px] h-[18px]" />
              <span>{activePost.commentsCount}</span>
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setRepostMenuOpen((prev) => !prev)}
                className={`min-h-[44px] sm:min-h-[38px] px-2.5 rounded-full flex items-center gap-1.5 transition-all active:scale-90 cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-950/30 ${
                  repostMenuOpen || hasRepostedByMe
                    ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50/70 dark:bg-emerald-950/40 font-bold'
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
                        repostSocialPost(activePost);
                      }}
                      className="w-full px-3.5 py-2 text-left font-bold hover:bg-[#FAF9FC] dark:hover:bg-[#231A45] flex items-center gap-2.5 cursor-pointer"
                    >
                      <Repeat2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>{hasRepostedByMe ? 'Repost again' : 'Repost'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRepostMenuOpen(false);
                        openQuoteComposer(activePost);
                      }}
                      className="w-full px-3.5 py-2 text-left font-bold hover:bg-[#FAF9FC] dark:hover:bg-[#231A45] flex items-center gap-2.5 cursor-pointer"
                    >
                      <Quote className="w-3.5 h-3.5 text-[#5420F5] dark:text-[#B9A7FF]" />
                      <span>Quote Post</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={handleShare}
              className="min-h-[44px] sm:min-h-[38px] px-2.5 rounded-full flex items-center gap-1.5 hover:text-[#5420F5] dark:hover:text-[#B9A7FF] hover:bg-[#F0EBFF] dark:hover:bg-[#231A45] transition-all active:scale-90 cursor-pointer"
              title="Share post off-campus"
            >
              <Share2 className="w-[18px] h-[18px]" />
              <span>{activePost.sharesCount || 0}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => togglePostBookmark(activePost.id)}
            className={`min-h-[44px] min-w-[44px] sm:min-h-[38px] sm:min-w-[38px] -mr-1.5 rounded-full flex items-center justify-center transition-all active:scale-90 cursor-pointer hover:bg-[#F0EBFF] dark:hover:bg-[#231A45] ${
              activePost.isBookmarked ? 'text-[#5420F5] dark:text-[#B9A7FF]' : 'hover:text-[#5420F5] dark:hover:text-[#B9A7FF]'
            }`}
            aria-label={activePost.isBookmarked ? 'Remove bookmark' : 'Bookmark post'}
          >
            {activePost.isBookmarked ? (
              <BookmarkedIcon size={17} />
            ) : (
              <Bookmark className="w-[17px] h-[17px]" />
            )}
          </button>
        </div>
      </article>

      {/* 3. Threaded Replies Stream + Docked Composer */}
      <SocialCommentsThread
        postId={activePost.id}
        comments={activePost.comments || []}
        post={activePost}
      />

      {/* 4. Related Campus Posts */}
      {relatedPosts.length > 0 && (
        <section className="border-t border-[#EAE6F0] dark:border-[#262036]">
          <div className="px-4 sm:px-5 py-3 border-b border-[#EAE6F0] dark:border-[#262036] bg-[#FAF9FC]/70 dark:bg-[#141020]">
            <h3 className="text-xs font-black text-[#191525] dark:text-[#F4F2FA]">
              More from campus
            </h3>
          </div>
          <div className="flex flex-col">
            {relatedPosts.map((rel) => (
              <FeedPostRow
                key={rel.id}
                post={rel}
                verifiedUsernameSet={verifiedUsernameSet}
                onClick={() => {
                  recordPostBanditInteraction(supabase, rel.id, true, 2000);
                  setSelectedPost(rel);
                  if (rel.type === 'poll') {
                    setActiveView('poll-detail');
                  } else {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
