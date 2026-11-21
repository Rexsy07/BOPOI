import React, { useState, useRef, useMemo } from 'react';
import {
  Heart,
  MessageSquare,
  CornerDownRight,
  Send,
  X,
  ChevronDown,
  ChevronUp,
  AtSign,
  Share2,
} from 'lucide-react';
import { SocialComment, SocialPost } from '../../types/index.ts';
import { useBopoi } from '../../context/BopoiContext.tsx';
import { rankCommentsByWilsonScore } from '../../lib/supabase.ts';
import { BopoiAnonymousAvatar } from '../brand/BopoiAnonymousAvatar.tsx';
import { MentionText } from '../ui/MentionText.tsx';
import { MentionAutocompleteDropdown } from './MentionAutocompleteDropdown.tsx';
import {
  buildMentionCandidates,
  useMentionAutocomplete,
} from '../../hooks/useMentionAutocomplete.ts';
import { PersonaMaskIcon } from '../brand/masks/PersonaMaskIcon.tsx';
import { CampusCharacterAvatar } from '../brand/character/index.ts';
import { KlipyGifPicker } from '../modals/KlipyGifPicker.tsx';
import { GifPreviewMedia } from '../ui/GifPreviewMedia.tsx';
import { useMobileKeyboard } from '../../hooks/useMobileKeyboard.ts';
import { VerifiedCreatorBadge } from '../ui/VerifiedCreatorBadge.tsx';

interface SocialCommentsThreadProps {
  postId?: string;
  comments?: SocialComment[];
  post?: SocialPost;
}

export const SocialCommentsThread: React.FC<SocialCommentsThreadProps> = ({
  postId: propPostId,
  comments: propComments,
  post,
}) => {
  const postId = post?.id || propPostId || '';
  const comments = post?.comments || propComments || [];

  const {
    user,
    accounts,
    creators,
    addPostComment,
    toggleCommentLike,
    viewUserProfile,
    shareCommentLink,
    highlightedCommentId,
    isAuthenticated,
    setActiveView,
    showToast,
  } = useBopoi();

  const isLoggedIn = Boolean(isAuthenticated && user.username && user.username !== 'student');
  const { isKeyboardOpen, keyboardOffsetBottom } = useMobileKeyboard();

  const verifiedUsernameSet = useMemo(() => {
    const set = new Set<string>();
    for (const u of accounts || []) {
      if (u.isVerified || u.isCreator) set.add(u.username.toLowerCase());
    }
    return set;
  }, [accounts]);

  const [replyingTo, setReplyingTo] = useState<{
    commentId: string;
    authorName: string;
    authorUsername: string;
  } | null>(null);

  const [bottomCommentText, setBottomCommentText] = useState('');
  const [isBottomAnonymous, setIsBottomAnonymous] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [pendingGif, setPendingGif] = useState<{ mediaUrl: string; title: string } | null>(null);

  const [collapsedThreads, setCollapsedThreads] = useState<Record<string, boolean>>({});
  const [commentSort, setCommentSort] = useState<'top' | 'newest'>('top');

  const bottomInputRef = useRef<HTMLInputElement>(null);

  const bottomMention = useMentionAutocomplete({
    text: bottomCommentText,
    setText: setBottomCommentText,
    inputRef: bottomInputRef,
  });

  const mentionCandidates = useMemo(
    () =>
      buildMentionCandidates({
        creators,
        accounts,
        participants: (comments || []).map((c) => ({
          id: c.id ? `comm-author-${c.id}` : undefined,
          name: c.authorName,
          username: c.authorUsername,
          avatarUrl: c.authorAvatar,
          campus: c.authorCampus,
          isAnon: c.isAnonymous,
          badge: 'In Thread',
          detail: 'Active in this thread',
        })),
        excludeUsername: user.username,
      }),
    [comments, creators, accounts, user.username]
  );

  const { sortedRootComments, repliesByParent } = useMemo(() => {
    const roots: SocialComment[] = [];
    const byParent: Record<string, SocialComment[]> = {};

    comments.forEach((c) => {
      if (c.parentId) {
        if (!byParent[c.parentId]) {
          byParent[c.parentId] = [];
        }
        byParent[c.parentId].push(c);
      } else {
        roots.push(c);
      }
    });

    const followedSet = new Set<string>();
    creators.forEach((cr) => {
      if (cr.isFollowing && cr.username) {
        followedSet.add(cr.username.toLowerCase());
      }
    });

    const ranked =
      commentSort === 'newest'
        ? [...roots].sort((a, b) => (b.createdTimestamp || 0) - (a.createdTimestamp || 0))
        : rankCommentsByWilsonScore(roots, byParent, {
            postAuthorUsername: post?.authorUsername,
            followedUsernames: followedSet,
            userCampus: user?.campus,
          });

    return { sortedRootComments: ranked, repliesByParent: byParent };
  }, [comments, commentSort, creators, post?.authorUsername, user?.campus]);

  const toggleThreadCollapse = (commentId: string) => {
    setCollapsedThreads((prev) => ({
      ...prev,
      [commentId]: !prev[commentId],
    }));
  };

  const handleStartReply = (
    commentId: string,
    authorName: string,
    authorUsername: string
  ) => {
    if (!isLoggedIn) {
      showToast('Please sign in to reply to comments.', 'info');
      setActiveView('profile');
      return;
    }

    bottomInputRef.current?.focus();

    setReplyingTo({
      commentId,
      authorName,
      authorUsername,
    });
    bottomMention.dismiss();
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
    bottomMention.dismiss();
  };

  const handleBottomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bottomCommentText.trim() && !pendingGif?.mediaUrl) return;

    const gifAttachment = pendingGif
      ? { mediaUrl: pendingGif.mediaUrl, mediaType: 'gif' as const }
      : undefined;

    if (replyingTo) {
      addPostComment(
        postId,
        bottomCommentText,
        replyingTo.commentId,
        replyingTo.authorName,
        isBottomAnonymous,
        undefined,
        gifAttachment
      );
      setReplyingTo(null);
    } else {
      addPostComment(
        postId,
        bottomCommentText,
        undefined,
        undefined,
        isBottomAnonymous,
        undefined,
        gifAttachment
      );
    }
    setBottomCommentText('');
    setPendingGif(null);
    bottomMention.reset();
  };

  return (
    <div className="flex flex-col bg-white">
      {/* 1. Replies Header Strip */}
      <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-[#EAE6F0] gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <h3 className="text-xs sm:text-sm font-black text-[#191525] tracking-tight">
            Replies
          </h3>
          <span className="text-xs font-bold text-[#706B7D] tabular-nums">
            · {comments.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {comments.length > 1 && (
            <div className="inline-flex items-center rounded-xl bg-[#FAF9FC] dark:bg-[#171322] p-0.5 border border-[#EAE6F0] dark:border-[#262036]">
              <button
                type="button"
                onClick={() => setCommentSort('top')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                  commentSort === 'top'
                    ? 'bg-white dark:bg-[#231A45] text-[#5420F5] dark:text-[#B9A7FF] shadow-2xs'
                    : 'text-[#706B7D] dark:text-[#9E97B3] hover:text-[#191525] dark:hover:text-[#F4F2FA]'
                }`}
              >
                Top
              </button>
              <button
                type="button"
                onClick={() => setCommentSort('newest')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                  commentSort === 'newest'
                    ? 'bg-white dark:bg-[#231A45] text-[#5420F5] dark:text-[#B9A7FF] shadow-2xs'
                    : 'text-[#706B7D] dark:text-[#9E97B3] hover:text-[#191525] dark:hover:text-[#F4F2FA]'
                }`}
              >
                Newest
              </button>
            </div>
          )}

          {replyingTo && (
            <button
              type="button"
              onClick={handleCancelReply}
              className="text-xs text-rose-500 hover:text-rose-600 font-bold flex items-center gap-1 cursor-pointer"
            >
              <span>Cancel @{replyingTo.authorName}</span>
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Threads-Style Hairline Replies Stream with Vertical Connectors */}
      {comments.length === 0 ? (
        <div className="px-6 py-12 text-center space-y-2">
          <div className="w-10 h-10 mx-auto rounded-full bg-[#FAF9FC] border border-[#EAE6F0] text-[#5420F5] flex items-center justify-center">
            <MessageSquare className="w-4 h-4" />
          </div>
          <p className="text-xs font-black text-[#191525]">No replies yet</p>
          <p className="text-xs text-[#706B7D]">
            Be the first to share your thoughts or @mention classmates below.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[#EAE6F0]">
          {sortedRootComments.map((comment) => {
            const replies = repliesByParent[comment.id] || [];
            const isCollapsed = collapsedThreads[comment.id] || false;
            const showReplies = replies.length > 0 && !isCollapsed;

            return (
              <div
                key={comment.id}
                id={`comment-${comment.id}`}
                className={`px-4 sm:px-5 py-3.5 transition-colors ${
                  highlightedCommentId === comment.id
                    ? 'bg-[#F7F4FF] dark:bg-[#231A45]/60'
                    : 'bg-white dark:bg-[#0E0C14]'
                }`}
              >
                {/* Root Comment Row with Left Vertical Connector */}
                <div className="flex items-stretch gap-3">
                  <div className="w-8 shrink-0 flex flex-col items-center">
                    <div
                      onClick={() =>
                        viewUserProfile(
                          comment.authorUsername,
                          comment.isAnonymous,
                          comment.authorCampus
                        )
                      }
                      className="cursor-pointer hover:opacity-85 transition-opacity shrink-0"
                      title={`View ${comment.authorName}'s profile`}
                    >
                      {comment.isAnonymous ? (
                        <BopoiAnonymousAvatar size="xs" idPrefix={`comm-${comment.id}`} />
                      ) : (
                        <CampusCharacterAvatar
                          value={comment.authorAvatar}
                          seed={comment.authorUsername}
                          size={32}
                          rounded="full"
                          className="ring-1 ring-[#EAE6F0]"
                        />
                      )}
                    </div>

                    {showReplies && (
                      <div
                        className="w-[1.5px] flex-1 bg-[#EAE6F0] mt-2 rounded-full min-h-[16px]"
                        aria-hidden="true"
                      />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div
                        onClick={() =>
                          viewUserProfile(
                            comment.authorUsername,
                            comment.isAnonymous,
                            comment.authorCampus
                          )
                        }
                        className="flex items-center gap-1.5 flex-wrap min-w-0 cursor-pointer group"
                      >
                        <span className="text-xs font-black text-[#191525] group-hover:underline truncate">
                          {comment.authorName}
                        </span>
                        <VerifiedCreatorBadge
                          isVerified={verifiedUsernameSet.has(
                            (comment.authorUsername || '').toLowerCase()
                          )}
                          username={comment.authorUsername}
                          isAnonymous={comment.isAnonymous}
                          size={13}
                        />
                        {!comment.isAnonymous &&
                          !post?.isAnonymous &&
                          post?.authorUsername &&
                          comment.authorUsername?.toLowerCase() ===
                            post.authorUsername.toLowerCase() && (
                            <span className="text-[11px] font-black text-[#5420F5] shrink-0">
                              · Author
                            </span>
                          )}
                        {comment.authorCampus && (
                          <span className="text-[11px] text-[#706B7D] truncate">
                            · {comment.authorCampus}
                          </span>
                        )}
                        <span className="text-[11px] text-[#706B7D] shrink-0">
                          · {comment.createdAt}
                        </span>
                      </div>
                    </div>

                    {comment.mediaUrl && (
                      <div className="pt-0.5">
                        <GifPreviewMedia
                          url={comment.mediaUrl}
                          alt={comment.text || 'Comment GIF'}
                          compact
                        />
                      </div>
                    )}

                    {comment.text && (
                      <p className="text-[13px] sm:text-sm text-[#191525] font-normal leading-relaxed break-words">
                        <MentionText text={comment.text} />
                      </p>
                    )}

                    {/* Root Comment Actions */}
                    <div className="flex items-center justify-between text-xs text-[#706B7D] pt-0.5 -ml-2 tabular-nums">
                      <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => toggleCommentLike(postId, comment.id)}
                          className={`min-h-[34px] px-2 rounded-full flex items-center gap-1 transition-colors cursor-pointer hover:bg-pink-50 dark:hover:bg-pink-950/30 ${
                            comment.hasLiked ? 'text-[#F52D85] font-bold' : 'hover:text-[#F52D85]'
                          }`}
                        >
                          <Heart
                            className={`w-3.5 h-3.5 ${comment.hasLiked ? 'fill-[#F52D85]' : ''}`}
                          />
                          <span className="text-[11px]">{comment.likes}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleStartReply(
                              comment.id,
                              comment.authorName,
                              comment.authorUsername
                            )
                          }
                          className="min-h-[34px] px-2 rounded-full flex items-center gap-1 hover:text-[#5420F5] dark:hover:text-[#B9A7FF] hover:bg-[#F0EBFF] dark:hover:bg-[#231A45] transition-colors cursor-pointer font-bold text-[11px]"
                        >
                          <CornerDownRight className="w-3.5 h-3.5" />
                          <span>Reply</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => shareCommentLink(postId, comment.id, comment.authorName)}
                          className="min-h-[34px] px-2 rounded-full flex items-center gap-1 hover:text-[#5420F5] dark:hover:text-[#B9A7FF] hover:bg-[#F0EBFF] dark:hover:bg-[#231A45] transition-colors cursor-pointer font-bold text-[11px]"
                          title="Share direct link to this comment"
                        >
                          <Share2 className="w-3 h-3" />
                          <span>Share</span>
                        </button>

                        {!comment.isAnonymous && comment.authorUsername && (
                          <button
                            type="button"
                            onClick={() => {
                              handleStartReply(
                                comment.id,
                                comment.authorName,
                                comment.authorUsername
                              );
                              bottomMention.insertMention(comment.authorUsername);
                            }}
                            className="hidden sm:inline-flex min-h-[34px] px-2 rounded-full items-center gap-0.5 hover:text-[#5420F5] dark:hover:text-[#B9A7FF] hover:bg-[#F0EBFF] dark:hover:bg-[#231A45] transition-colors cursor-pointer text-[11px] font-semibold"
                            title={`Reply and mention @${comment.authorUsername}`}
                          >
                            <AtSign className="w-3 h-3 text-[#5420F5] dark:text-[#B9A7FF]" />
                            <span>@{comment.authorUsername}</span>
                          </button>
                        )}
                      </div>

                      {replies.length > 0 && (
                        <button
                          type="button"
                          onClick={() => toggleThreadCollapse(comment.id)}
                          className="flex items-center gap-1 text-[11px] font-bold text-[#5420F5] hover:underline cursor-pointer px-2 py-1"
                        >
                          <span>
                            {isCollapsed
                              ? `Show ${replies.length} ${replies.length === 1 ? 'reply' : 'replies'}`
                              : `Hide (${replies.length})`}
                          </span>
                          {isCollapsed ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronUp className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Nested Replies Branch Connected Continuously Under Left Avatar Column */}
                {showReplies && (
                  <div className="mt-2 space-y-3">
                    {replies.map((reply, rIdx) => {
                      const hasNextReply = rIdx < replies.length - 1;
                      return (
                        <div key={reply.id} className="flex items-stretch gap-3">
                          <div className="w-8 shrink-0 flex flex-col items-center">
                            <div
                              onClick={() =>
                                viewUserProfile(
                                  reply.authorUsername,
                                  reply.isAnonymous,
                                  reply.authorCampus
                                )
                              }
                              className="cursor-pointer hover:opacity-85 shrink-0"
                              title={`View ${reply.authorName}'s profile`}
                            >
                              {reply.isAnonymous ? (
                                <BopoiAnonymousAvatar size="xs" idPrefix={`reply-${reply.id}`} />
                              ) : (
                                <CampusCharacterAvatar
                                  value={reply.authorAvatar}
                                  seed={reply.authorUsername}
                                  size={26}
                                  rounded="full"
                                  className="ring-1 ring-[#EAE6F0]"
                                />
                              )}
                            </div>

                            {hasNextReply && (
                              <div
                                className="w-[1.5px] flex-1 bg-[#EAE6F0] mt-1.5 rounded-full min-h-[12px]"
                                aria-hidden="true"
                              />
                            )}
                          </div>

                          <div className="flex-1 min-w-0 space-y-1 pb-1">
                            <div className="flex items-center justify-between gap-2">
                              <div
                                onClick={() =>
                                  viewUserProfile(
                                    reply.authorUsername,
                                    reply.isAnonymous,
                                    reply.authorCampus
                                  )
                                }
                                className="flex items-center gap-1.5 flex-wrap cursor-pointer group min-w-0"
                              >
                                <span className="text-xs font-extrabold text-[#191525] group-hover:underline truncate">
                                  {reply.authorName}
                                </span>
                                <VerifiedCreatorBadge
                                  isVerified={verifiedUsernameSet.has(
                                    (reply.authorUsername || '').toLowerCase()
                                  )}
                                  username={reply.authorUsername}
                                  isAnonymous={reply.isAnonymous}
                                  size={12}
                                />
                                {!reply.isAnonymous &&
                                  !post?.isAnonymous &&
                                  post?.authorUsername &&
                                  reply.authorUsername?.toLowerCase() ===
                                    post.authorUsername.toLowerCase() && (
                                    <span className="text-[10px] font-black text-[#5420F5] shrink-0">
                                      · Author
                                    </span>
                                  )}
                                <span className="text-[11px] text-[#706B7D]">
                                  · {reply.createdAt}
                                </span>
                              </div>

                              {reply.replyToAuthor && (
                                <span className="text-[10px] font-bold text-[#5420F5] shrink-0">
                                  ↳ @{reply.replyToAuthor}
                                </span>
                              )}
                            </div>

                            {reply.mediaUrl && (
                              <div className="pt-0.5">
                                <GifPreviewMedia
                                  url={reply.mediaUrl}
                                  alt={reply.text || 'Reply GIF'}
                                  compact
                                />
                              </div>
                            )}

                            {reply.text && (
                              <p className="text-[13px] text-[#191525] font-normal leading-relaxed break-words">
                                <MentionText text={reply.text} />
                              </p>
                            )}

                            <div className="flex items-center gap-3 pt-0.5 -ml-2 text-[11px] text-[#706B7D] dark:text-[#9E97B3] font-semibold tabular-nums">
                              <button
                                type="button"
                                onClick={() => toggleCommentLike(postId, reply.id)}
                                className={`min-h-[32px] px-2 rounded-full flex items-center gap-1 hover:bg-pink-50 dark:hover:bg-pink-950/30 hover:text-[#F52D85] cursor-pointer ${
                                  reply.hasLiked ? 'text-[#F52D85] font-bold' : ''
                                }`}
                              >
                                <Heart
                                  className={`w-3 h-3 ${reply.hasLiked ? 'fill-[#F52D85]' : ''}`}
                                />
                                <span>{reply.likes}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  handleStartReply(
                                    comment.id,
                                    reply.authorName,
                                    reply.authorUsername
                                  )
                                }
                                className="min-h-[32px] px-2 rounded-full hover:text-[#5420F5] dark:hover:text-[#B9A7FF] hover:bg-[#F0EBFF] dark:hover:bg-[#231A45] cursor-pointer flex items-center gap-1 font-bold"
                              >
                                <CornerDownRight className="w-3 h-3" />
                                <span>Reply</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 3. Docked Reply Bar (Aligns inside 640px center column on desktop, flush above BottomNav or keyboard on mobile) */}
      <div
        style={
          isKeyboardOpen
            ? { bottom: keyboardOffsetBottom > 0 ? `${keyboardOffsetBottom}px` : '0px' }
            : undefined
        }
        className={`${
          isKeyboardOpen
            ? 'fixed inset-x-0 z-40 bg-white/95 dark:bg-[#0E0C14]/95 backdrop-blur-md border-t border-[#EAE6F0] dark:border-[#262036] px-3 py-2'
            : 'sticky bottom-[58px] lg:bottom-0 z-30 bg-white/95 dark:bg-[#0E0C14]/95 backdrop-blur-md border-t border-[#EAE6F0] dark:border-[#262036] px-3 sm:px-4 py-2.5'
        }`}
      >
        <div className="w-full max-w-[640px] mx-auto space-y-1.5 relative">
          <MentionAutocompleteDropdown
            isOpen={bottomMention.isOpen}
            query={bottomMention.query}
            candidates={mentionCandidates}
            onSelect={bottomMention.insertMention}
            onClose={bottomMention.dismiss}
            placement="top"
          />

          {replyingTo && (
            <div className="w-full bg-[#191525] text-white px-3 py-1.5 rounded-xl text-xs flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 font-bold truncate min-w-0 flex-1">
                <CornerDownRight className="w-3.5 h-3.5 text-[#FFC928] shrink-0" />
                <span className="truncate">
                  Replying to <strong>@{replyingTo.authorName}</strong>
                </span>
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => bottomMention.insertMention(replyingTo.authorUsername)}
                  className="text-[10px] font-bold bg-white/15 hover:bg-white/25 text-[#FFC928] px-2 py-0.5 rounded-md flex items-center gap-0.5 cursor-pointer"
                >
                  <AtSign className="w-2.5 h-2.5" />
                  <span>@{replyingTo.authorUsername}</span>
                </button>
                <button
                  type="button"
                  onClick={handleCancelReply}
                  className="text-slate-300 hover:text-white p-1 rounded-md cursor-pointer"
                  title="Cancel replying"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {pendingGif && (
            <div className="bg-[#FAF9FC] border border-[#EAE6F0] rounded-2xl p-2 px-3 flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src={pendingGif.mediaUrl}
                  alt={pendingGif.title}
                  className="w-10 h-10 rounded-xl object-cover border border-[#EAE6F0] shrink-0"
                />
                <div className="min-w-0">
                  <span className="text-[11px] font-black text-[#5420F5]">
                    GIF Attached
                  </span>
                  <p className="text-[11px] text-[#706B7D] truncate">
                    Add a comment or send GIF now
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPendingGif(null)}
                className="p-1.5 rounded-full hover:bg-rose-50 text-[#706B7D] hover:text-rose-600 cursor-pointer shrink-0"
                title="Remove GIF"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {isLoggedIn ? (
            <form
              onSubmit={handleBottomSubmit}
              className="w-full bg-[#FAF9FC] border border-[#EAE6F0] focus-within:border-[#5420F5] rounded-2xl p-1.5 pl-2 flex items-center gap-1.5 transition-colors"
            >
              <button
                type="button"
                onClick={() => setIsBottomAnonymous(!isBottomAnonymous)}
                className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-colors cursor-pointer shrink-0 border inline-flex items-center gap-1 ${
                  isBottomAnonymous
                    ? 'bg-[#191525] dark:bg-[#F4F2FA] text-white dark:text-[#191525] border-[#191525] dark:border-[#F4F2FA]'
                    : 'bg-white dark:bg-[#0E0C14] text-[#706B7D] dark:text-[#9E97B3] border-[#EAE6F0] dark:border-[#262036] hover:text-[#191525] dark:hover:text-[#F4F2FA]'
                }`}
                title={isBottomAnonymous ? 'Posting as Anonymous' : `Posting as ${user.displayName}`}
              >
                {isBottomAnonymous && <PersonaMaskIcon mask="secret-confession" size={13} />}
                <span>{isBottomAnonymous ? 'Anon' : 'Public'}</span>
              </button>

              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={bottomMention.togglePicker}
                className={`p-1.5 rounded-xl transition-colors cursor-pointer shrink-0 flex items-center gap-0.5 text-xs font-bold ${
                  bottomMention.isOpen
                    ? 'bg-[#5420F5] text-white'
                    : 'text-[#5420F5] dark:text-[#B9A7FF] hover:bg-[#F0EBFF] dark:hover:bg-[#231A45]'
                }`}
                title="Mention a student"
              >
                <AtSign className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  bottomInputRef.current?.blur();
                  if (document.activeElement instanceof HTMLElement) {
                    document.activeElement.blur();
                  }
                  bottomMention.dismiss();
                  setShowGifPicker(true);
                }}
                className={`px-2 py-1.5 rounded-xl text-[10px] font-black tracking-wide transition-colors cursor-pointer shrink-0 border ${
                  pendingGif
                    ? 'bg-[#5420F5] text-white border-[#5420F5]'
                    : 'bg-white dark:bg-[#0E0C14] text-[#5420F5] dark:text-[#B9A7FF] border-[#EAE6F0] dark:border-[#262036] hover:bg-[#F0EBFF] dark:hover:bg-[#231A45]'
                }`}
                title="Attach a GIF from Klipy"
              >
                GIF
              </button>

              <input
                id="social-comment-reply-input"
                ref={bottomInputRef}
                type="text"
                value={bottomCommentText}
                onChange={bottomMention.handleChange}
                onClick={(e) => bottomMention.syncCursorFromEvent(e.currentTarget)}
                onKeyUp={(e) => bottomMention.syncCursorFromEvent(e.currentTarget)}
                onSelect={(e) => bottomMention.syncCursorFromEvent(e.currentTarget)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape' && !bottomMention.isOpen && replyingTo) {
                    e.preventDefault();
                    handleCancelReply();
                  }
                }}
                placeholder={
                  pendingGif
                    ? 'Add a caption (optional)...'
                    : replyingTo
                    ? `Reply to @${replyingTo.authorName}...`
                    : 'Write a reply or @mention...'
                }
                className="w-0 min-w-0 flex-1 bg-transparent text-base sm:text-sm text-[#191525] placeholder:text-[#706B7D] focus:outline-none px-1"
              />

              <button
                type="submit"
                disabled={!bottomCommentText.trim() && !pendingGif}
                className="w-9 h-9 bg-[#5420F5] hover:bg-[#4314E2] text-white rounded-xl transition-colors cursor-pointer disabled:opacity-35 shrink-0 flex items-center justify-center"
                title={replyingTo ? 'Send reply' : 'Send reply'}
              >
                <Send className="w-4 h-4 shrink-0" />
              </button>
            </form>
          ) : (
            <div
              onClick={() => {
                showToast('Please sign in to comment or reply.', 'info');
                setActiveView('profile');
              }}
              className="w-full bg-[#FAF9FC] border border-[#EAE6F0] rounded-2xl p-2 pl-3.5 flex items-center justify-between gap-2 cursor-pointer hover:border-[#5420F5]/40 transition-colors"
            >
              <span className="text-xs font-bold text-[#706B7D] truncate min-w-0 flex-1">
                Sign in to reply, vote, or like
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveView('profile');
                }}
                className="px-3.5 py-2 bg-[#5420F5] hover:bg-[#4314E2] text-white text-xs font-black rounded-xl transition-colors cursor-pointer shrink-0"
              >
                Sign In
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Klipy GIF Picker Modal */}
      <KlipyGifPicker
        isOpen={showGifPicker}
        customerId={user.id || user.username || 'bopoi_student'}
        onSelect={(gif) => {
          setPendingGif({ mediaUrl: gif.url, title: gif.title });
          setTimeout(() => bottomInputRef.current?.focus(), 40);
        }}
        onClose={() => setShowGifPicker(false)}
      />
    </div>
  );
};
