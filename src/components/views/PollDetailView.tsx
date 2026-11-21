import React, { useEffect, useMemo } from 'react';
import {
  ChevronLeft,
  Clock,
  Share2,
  Bookmark,
  Heart,
  MessageCircle,
  Check,
  Flag,
  UserPlus,
} from 'lucide-react';
import { useBopoi } from '../../context/BopoiContext.tsx';
import {
  supabase,
  computeRelatedSocialPosts,
  recordPostBanditInteraction,
} from '../../lib/supabase.ts';
import { SocialCommentsThread } from '../comments/SocialCommentsThread.tsx';
import { CampusCharacterAvatar } from '../brand/character/index.ts';
import { PersonaMaskIcon } from '../brand/masks/PersonaMaskIcon.tsx';
import { VerifiedCreatorBadge } from '../ui/VerifiedCreatorBadge.tsx';
import { HashtagRow } from '../ui/HashtagRow.tsx';
import { MentionText } from '../ui/MentionText.tsx';
import { CreatePollIcon, BookmarkedIcon } from '../brand/icons/index.ts';
import { FeedPostRow } from '../feed/FeedPostRow.tsx';
import { GifPreviewMedia } from '../ui/GifPreviewMedia.tsx';

export const PollDetailView: React.FC = () => {
  const {
    selectedPost,
    setSelectedPost,
    socialPosts,
    accounts,
    user,
    setActiveView,
    goBack,
    votePoll,
    togglePostLike,
    togglePostBookmark,
    openPostShare,
    viewUserProfile,
    openCreateWithHashtag,
    openReportModal,
    isFollowingUser,
    toggleFollowCreator,
  } = useBopoi();

  const verifiedUsernameSet = useMemo(() => {
    const set = new Set<string>();
    for (const u of accounts || []) {
      if (u.isVerified || u.isCreator) set.add(u.username.toLowerCase());
    }
    return set;
  }, [accounts]);

  const post =
    socialPosts.find((p) => p.id === selectedPost?.id) ||
    socialPosts.find((p) => p.type === 'poll') ||
    socialPosts[0];

  useEffect(() => {
    if (!post?.id) return;
    const enteredAt = Date.now();
    return () => {
      const dwellMs = Date.now() - enteredAt;
      if (dwellMs >= 1500) {
        recordPostBanditInteraction(supabase, post.id, false, dwellMs);
      }
    };
  }, [post?.id]);

  const relatedPosts = useMemo(() => {
    if (!post) return [];
    return computeRelatedSocialPosts(post, socialPosts, {
      userCampus: user?.campus || post.authorCampus,
      limit: 3,
    });
  }, [post, socialPosts, user?.campus]);

  if (!post) {
    return (
      <div className="w-full px-6 py-16 text-center space-y-3 bg-white">
        <p className="text-sm font-black text-[#191525]">No active poll selected</p>
        <p className="text-xs text-[#706B7D]">
          Launch a campus poll to let students vote and discuss.
        </p>
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            type="button"
            onClick={() => goBack('polls')}
            className="px-4 py-2.5 bg-[#FAF9FC] border border-[#EAE6F0] text-[#191525] text-xs font-bold rounded-xl cursor-pointer"
          >
            Back
          </button>
          <button
            type="button"
            onClick={() => openCreateWithHashtag(undefined, 'poll')}
            className="px-5 py-2.5 bg-[#5420F5] hover:bg-[#4314E2] text-white text-xs font-extrabold rounded-xl cursor-pointer"
          >
            New Poll
          </button>
        </div>
      </div>
    );
  }

  const optionsSum = (post.pollOptions || []).reduce(
    (sum, o) => sum + Math.max(0, o.votes || 0),
    0
  );
  const totalVotes =
    post.pollOptions && post.pollOptions.length > 0
      ? optionsSum
      : Math.max(0, post.pollTotalVotes || 0);
  const hasVoted = Boolean(post.userVotedOptionId);
  const showPercentages = hasVoted || totalVotes > 0;
  const highestVotes = Math.max(
    0,
    ...(post.pollOptions || []).map((o) => o.votes || 0)
  );
  const isVerified = Boolean(
    post.authorIsVerified ||
      verifiedUsernameSet.has((post.authorUsername || '').toLowerCase())
  );

  const isOwnPost =
    Boolean(user.id && post.authorUserId === user.id) ||
    (!post.isAnonymous &&
      (post.authorUsername || '').toLowerCase() === (user.username || '').toLowerCase());
  const canFollowAuthor = Boolean(
    !post.isAnonymous && post.authorUsername && !isOwnPost
  );
  const followingAuthor = canFollowAuthor ? isFollowingUser(post.authorUsername) : false;

  return (
    <div className="w-full flex flex-col bg-white text-[#191525]">
      {/* 1. Sticky Top Header */}
      <div className="sticky top-[52px] lg:top-0 z-20 bg-white/95 dark:bg-[#0E0C14]/95 backdrop-blur-md border-b border-[#EAE6F0] dark:border-[#262036] px-4 sm:px-5 h-[52px] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => goBack('polls')}
            className="min-w-[44px] min-h-[44px] sm:min-w-[40px] sm:min-h-[40px] -ml-2 rounded-full hover:bg-[#FAF9FC] dark:hover:bg-[#171322] text-[#191525] dark:text-[#F4F2FA] transition-colors cursor-pointer flex items-center justify-center shrink-0"
            title="Go back"
            aria-label="Go back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <CreatePollIcon size={20} />
          <h1 className="text-base font-black text-[#191525] dark:text-[#F4F2FA] tracking-tight truncate">
            Poll
          </h1>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() =>
              openReportModal({
                targetType: 'social_post',
                targetId: post.id,
                targetLabel: 'poll',
                targetPreview: (post.title || post.content).slice(0, 140),
              })
            }
            className="min-w-[38px] min-h-[38px] rounded-full hover:bg-amber-50 dark:hover:bg-amber-950/30 text-[#706B7D] dark:text-[#9E97B3] hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer flex items-center justify-center"
            aria-label="Report poll"
            title="Report poll to moderators"
          >
            <Flag className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => togglePostBookmark(post.id)}
            className={`min-w-[38px] min-h-[38px] rounded-full hover:bg-[#F0EBFF] dark:hover:bg-[#231A45] transition-colors cursor-pointer flex items-center justify-center ${
              post.isBookmarked ? 'text-[#5420F5] dark:text-[#B9A7FF]' : 'text-[#706B7D] dark:text-[#9E97B3] hover:text-[#5420F5] dark:hover:text-[#B9A7FF]'
            }`}
            aria-label="Bookmark poll"
          >
            {post.isBookmarked ? (
              <BookmarkedIcon size={17} />
            ) : (
              <Bookmark className="w-[17px] h-[17px]" />
            )}
          </button>

          <button
            type="button"
            onClick={() => openPostShare(post)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#5420F5] hover:bg-[#4314E2] text-white font-bold text-xs transition-colors cursor-pointer whitespace-nowrap"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share</span>
          </button>
        </div>
      </div>

      {/* 2. Focal Poll Content */}
      <article className="px-4 sm:px-5 py-4 border-b border-[#EAE6F0] space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div
            onClick={() =>
              viewUserProfile(
                post.authorUsername || post.authorName,
                post.isAnonymous,
                post.authorCampus
              )
            }
            className="flex items-center gap-3 cursor-pointer group min-w-0"
          >
            {post.isAnonymous ? (
              <div className="w-10 h-10 rounded-full bg-[#191525] flex items-center justify-center text-white shrink-0">
                <PersonaMaskIcon mask="campus-pollster" size={22} />
              </div>
            ) : (
              <CampusCharacterAvatar
                value={post.authorAvatar}
                seed={post.authorUsername || post.authorName}
                size={42}
                rounded="full"
                className="ring-1 ring-[#EAE6F0] shrink-0"
              />
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-black text-[#191525] text-sm group-hover:underline truncate">
                  {post.isAnonymous ? 'Anonymous Pollster' : post.authorName}
                </span>
                <VerifiedCreatorBadge
                  isVerified={isVerified}
                  username={post.authorUsername}
                  isAnonymous={post.isAnonymous}
                  size={15}
                />
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[#706B7D] mt-0.5 truncate">
                <span className="truncate">{post.authorCampus || 'Campus Wide'}</span>
                <span>·</span>
                <span>{post.createdAt}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {post.pollExpiresIn && (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-[#706B7D] shrink-0 tabular-nums">
                <Clock className="w-3.5 h-3.5" />
                <span>{post.pollExpiresIn}</span>
              </span>
            )}
            {canFollowAuthor && (
              <button
                type="button"
                onClick={() => toggleFollowCreator(post.authorUsername)}
                className={`min-h-[34px] px-3 py-1 rounded-xl text-xs font-extrabold transition-all active:scale-95 cursor-pointer inline-flex items-center gap-1 ${
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
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          {post.title && (
            <span className="text-xs font-extrabold text-[#5420F5] block">
              <MentionText text={post.title} />
            </span>
          )}
          {post.content && (
            <h2 className="text-base sm:text-lg font-black text-[#191525] leading-snug break-words">
              <MentionText text={post.content} />
            </h2>
          )}
          {post.mediaUrl && (
            <div className="pt-1">
              <GifPreviewMedia url={post.mediaUrl} alt={post.title || 'Poll GIF'} />
            </div>
          )}
          <HashtagRow hashtags={post.hashtags} size="md" className="pt-0.5" />
        </div>

        {/* Interactive Voting Options */}
        {post.pollOptions && (
          <div className="space-y-2">
            {post.pollOptions.map((opt) => {
              const isSelected = post.userVotedOptionId === opt.id;
              const pct =
                totalVotes > 0
                  ? Math.min(100, Math.round(((opt.votes || 0) / totalVotes) * 100))
                  : 0;
              const isLeader =
                hasVoted && totalVotes > 0 && (opt.votes || 0) === highestVotes;

              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => votePoll(post.id, opt.id)}
                  className={`relative w-full text-left p-3.5 rounded-2xl border transition-colors cursor-pointer overflow-hidden ${
                    isSelected
                      ? 'border-[#5420F5] dark:border-[#7C5CFF] bg-[#FAF8FF] dark:bg-[#18132B]'
                      : 'border-[#EAE6F0] dark:border-[#262036] hover:border-[#C7B8FA] dark:hover:border-[#5420F5] bg-[#FAF9FC] dark:bg-[#171322]'
                  }`}
                >
                  {showPercentages && (
                    <div
                      className={`absolute inset-y-0 left-0 transition-all duration-300 ${
                        isSelected
                          ? 'bg-[#5420F5]/14 dark:bg-[#7C5CFF]/25'
                          : isLeader
                          ? 'bg-[#E9E4F5] dark:bg-[#2A2240]'
                          : 'bg-[#F0EEF5] dark:bg-[#201A32]'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  )}

                  <div className="relative z-10 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 border transition-colors ${
                          isSelected
                            ? 'bg-[#5420F5] border-[#5420F5] text-white'
                            : 'bg-white dark:bg-[#0E0C14] border-[#C8C2D6] dark:border-[#3D3554]'
                        }`}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </span>
                      <span
                        className={`text-xs sm:text-sm ${
                          isSelected || isLeader
                            ? 'font-extrabold text-[#191525] dark:text-[#F4F2FA]'
                            : 'font-semibold text-[#191525] dark:text-[#F4F2FA]'
                        }`}
                      >
                        {opt.text}
                      </span>
                    </div>

                    {showPercentages && (
                      <div className="flex items-center gap-2 shrink-0 tabular-nums">
                        {hasVoted && (
                          <span className="text-[11px] font-semibold text-[#706B7D] dark:text-[#9E97B3]">
                            {(opt.votes || 0).toLocaleString()}
                          </span>
                        )}
                        <span
                          className={`text-xs ${
                            isSelected
                              ? 'font-black text-[#5420F5] dark:text-[#B9A7FF]'
                              : isLeader
                              ? 'font-extrabold text-[#191525] dark:text-[#F4F2FA]'
                              : 'font-bold text-[#706B7D] dark:text-[#9E97B3]'
                          }`}
                        >
                          {pct}%
                        </span>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}

            <div className="flex items-center justify-between text-xs text-[#706B7D] dark:text-[#9E97B3] font-semibold pt-0.5 tabular-nums">
              <span>
                {totalVotes.toLocaleString()} {totalVotes === 1 ? 'vote' : 'votes'}
              </span>
              <span>{hasVoted ? 'Tap any option to switch vote' : 'Tap an option to vote'}</span>
            </div>
          </div>
        )}

        {/* Engagement Strip */}
        <div className="flex items-center justify-between pt-2.5 border-t border-[#EAE6F0]/70 dark:border-[#262036] text-xs text-[#706B7D] dark:text-[#9E97B3] tabular-nums">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => togglePostLike(post.id)}
              className={`min-h-[44px] sm:min-h-[38px] px-2.5 -ml-2 rounded-full flex items-center gap-1.5 transition-all active:scale-90 cursor-pointer hover:bg-pink-50 dark:hover:bg-pink-950/30 ${
                post.hasLiked ? 'text-[#F52D85] font-bold' : 'hover:text-[#F52D85]'
              }`}
            >
              <Heart className={`w-[18px] h-[18px] ${post.hasLiked ? 'fill-[#F52D85]' : ''}`} />
              <span>{post.likes}</span>
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
              aria-label="Reply to poll"
            >
              <MessageCircle className="w-[18px] h-[18px]" />
              <span>{post.commentsCount}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => openPostShare(post)}
            className="text-xs font-bold text-[#5420F5] dark:text-[#B9A7FF] hover:underline inline-flex items-center gap-1 cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share</span>
          </button>
        </div>
      </article>

      {/* 3. Comments Thread */}
      <SocialCommentsThread post={post} />

      {/* 4. More Campus Polls & Discussions */}
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
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  } else {
                    setActiveView('post-detail');
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
