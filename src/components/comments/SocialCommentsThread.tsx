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
  Sparkles,
  Share2,
} from 'lucide-react';
import { SocialComment, SocialPost } from '../../types/index.ts';
import { useBopoi } from '../../context/BopoiContext.tsx';
import { rankCommentsByWilsonScore } from '../../lib/supabase.ts';
import { BopoiAnonymousAvatar } from '../brand/BopoiAnonymousAvatar.tsx';
import { MentionText } from '../ui/MentionText.tsx';
import {
  MentionAutocompleteDropdown,
  MentionStudentCandidate,
} from './MentionAutocompleteDropdown.tsx';
import { PersonaMaskIcon } from '../brand/masks/PersonaMaskIcon.tsx';
import { CampusCharacterAvatar } from '../brand/character/index.ts';
import { useMobileKeyboard } from '../../hooks/useMobileKeyboard.ts';

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

  // Reply state: which comment is being replied to
  const [replyingTo, setReplyingTo] = useState<{
    commentId: string;
    authorName: string;
    authorUsername: string;
  } | null>(null);

  // Main input state (sticky bottom)
  const [bottomCommentText, setBottomCommentText] = useState('');
  const [isBottomAnonymous, setIsBottomAnonymous] = useState(false);
  const [showBottomMentionPicker, setShowBottomMentionPicker] = useState(false);

  // Inline input state (per thread)
  const [inlineReplyText, setInlineReplyText] = useState('');
  const [isInlineAnonymous, setIsInlineAnonymous] = useState(false);
  const [showInlineMentionPicker, setShowInlineMentionPicker] = useState(false);

  // Collapsed threads tracking (all expanded by default)
  const [collapsedThreads, setCollapsedThreads] = useState<Record<string, boolean>>({});
  const [commentSort, setCommentSort] = useState<'top' | 'newest'>('top');

  const bottomInputRef = useRef<HTMLInputElement>(null);
  const inlineInputRef = useRef<HTMLInputElement>(null);

  // Record recently interacted student in localStorage
  const recordRecentInteraction = (username: string) => {
    try {
      const clean = username.replace(/^@/, '').toLowerCase();
      const saved = localStorage.getItem('bopoi_recent_mentions');
      const list: string[] = saved ? JSON.parse(saved) : [];
      const updated = [clean, ...list.filter((u) => u !== clean)].slice(0, 10);
      localStorage.setItem('bopoi_recent_mentions', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  // Build candidate list of students to @mention with Trending and Recently Interacted classifications
  const mentionCandidates: MentionStudentCandidate[] = useMemo(() => {
    const list: MentionStudentCandidate[] = [];
    const seen = new Set<string>();

    let storedRecent: string[] = [];
    try {
      const saved = localStorage.getItem('bopoi_recent_mentions');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) storedRecent = parsed;
      }
    } catch {
      // ignore
    }

    // 1. Thread and comment participants (Recently Interacted)
    (comments || []).forEach((c) => {
      if (!c) return;
      const rawUser = c.authorUsername || '';
      const u = rawUser.replace(/^@/, '').toLowerCase().trim();
      if (u && !seen.has(u) && u !== 'anonymous' && u !== 'anon') {
        seen.add(u);
        list.push({
          id: `comm-author-${c.id || Math.random().toString(36).substring(2, 6)}`,
          name: c.authorName || c.authorUsername || 'Student',
          username: u,
          avatarUrl: c.authorAvatar,
          campus: c.authorCampus || 'Campus',
          isAnon: Boolean(c.isAnonymous),
          category: 'recent',
          badge: 'Recent in Thread',
          detail: 'Active in this thread',
        });
      }
    });

    // 2. Stored recently interacted students from real accounts
    storedRecent.forEach((u) => {
      const clean = (u || '').replace(/^@/, '').toLowerCase().trim();
      if (clean && !seen.has(clean)) {
        const matchedCreator = (creators || []).find(
          (c) => c.username?.toLowerCase() === clean
        );
        if (matchedCreator) {
          seen.add(clean);
          list.push({
            id: `recent-${clean}`,
            name: matchedCreator.name || clean,
            username: clean,
            avatarUrl: matchedCreator.avatarUrl,
            campus: matchedCreator.campus || 'Campus',
            category: 'recent',
            badge: 'Recently Mentioned',
            detail: matchedCreator.campus || 'Campus Student',
          });
        }
      }
    });

    // 3. Trending Students on Campus (from creators sorted by followersCount)
    const safeCreators = Array.isArray(creators) ? creators : [];
    const sortedCreators = [...safeCreators].sort(
      (a, b) => ((b && b.followersCount) || 0) - ((a && a.followersCount) || 0)
    );

    sortedCreators.forEach((cr, idx) => {
      if (!cr) return;
      const rawUser = cr.username || (cr as any).handle || '';
      const u = rawUser.replace(/^@/, '').toLowerCase().trim();
      if (u && !seen.has(u)) {
        seen.add(u);
        const rank = idx + 1;
        const displayName = cr.name || (cr as any).displayName || u || 'Student';
        list.push({
          id: cr.id || `creator-${idx}`,
          name: displayName,
          username: u,
          avatarUrl: cr.avatarUrl,
          campus: cr.campus || 'Campus',
          category: 'trending',
          badge: rank <= 3 ? `#${rank} Trending` : 'Trending',
          detail: `${((cr.followersCount || 0)).toLocaleString()} followers • ${cr.campus || 'Campus'}`,
          followersCount: cr.followersCount || 0,
        });
      }
    });

    return list;
  }, [comments, creators, user]);

  // Helper to extract active @mention query currently being typed
  const getMentionQuery = (text: string): string | null => {
    if (!text || typeof text !== 'string') return null;
    const match = text.match(/(?:^|\s)@([a-zA-Z0-9_.-]*)$/);
    return match ? match[1] : null;
  };

  const bottomMentionQuery = getMentionQuery(bottomCommentText);
  const inlineMentionQuery = getMentionQuery(inlineReplyText);

  // Organize comments into root comments and replies map
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

    // Focus synchronously inside the tap event handler so mobile keyboards open immediately
    bottomInputRef.current?.focus();

    setReplyingTo({
      commentId,
      authorName,
      authorUsername,
    });
    setShowBottomMentionPicker(false);
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
    setShowBottomMentionPicker(false);
  };

  // Insert a mention into bottom input
  const insertMentionIntoBottom = (username: string) => {
    const clean = (username || '').replace(/^@/, '').trim();
    if (!clean) return;
    recordRecentInteraction(clean);
    const text = bottomCommentText || '';
    const match = text.match(/(?:^|\s)@([a-zA-Z0-9_.-]*)$/);
    let newText = '';
    if (match) {
      const idx = text.lastIndexOf('@');
      newText = text.substring(0, idx) + `@${clean} `;
    } else {
      newText = text ? (text.endsWith(' ') ? `${text}@${clean} ` : `${text} @${clean} `) : `@${clean} `;
    }
    setBottomCommentText(newText);
    setShowBottomMentionPicker(false);
    bottomInputRef.current?.focus();
  };

  // Submit via bottom bar
  const handleBottomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bottomCommentText.trim()) return;

    if (replyingTo) {
      addPostComment(
        postId,
        bottomCommentText,
        replyingTo.commentId,
        replyingTo.authorName,
        isBottomAnonymous
      );
      setReplyingTo(null);
    } else {
      addPostComment(
        postId,
        bottomCommentText,
        undefined,
        undefined,
        isBottomAnonymous
      );
    }
    setBottomCommentText('');
    setShowBottomMentionPicker(false);
  };

  // Submit via inline reply input
  const handleInlineSubmit = (e: React.FormEvent, parentCommentId: string) => {
    e.preventDefault();
    if (!inlineReplyText.trim() || !replyingTo) return;

    addPostComment(
      postId,
      inlineReplyText,
      parentCommentId,
      replyingTo.authorName,
      isInlineAnonymous
    );
    setInlineReplyText('');
    setReplyingTo(null);
    setShowInlineMentionPicker(false);
  };

  return (
    <div className="space-y-4 pt-2 pb-4">
      {/* Header with counter & Wilson Score / Newest sort toggle */}
      <div className="flex items-center justify-between border-b border-[#EAE6F0] pb-2 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-black text-[#191525] tracking-tight">
            Comments &amp; Threads
          </h3>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#F0EBFF] text-[#5420F5]">
            {comments.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {comments.length > 1 && (
            <div className="inline-flex items-center rounded-xl bg-slate-100 p-0.5 border border-[#EAE6F0]">
              <button
                type="button"
                onClick={() => setCommentSort('top')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  commentSort === 'top'
                    ? 'bg-white text-[#5420F5] shadow-2xs'
                    : 'text-[#706B7D] hover:text-[#191525]'
                }`}
              >
                Top
              </button>
              <button
                type="button"
                onClick={() => setCommentSort('newest')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  commentSort === 'newest'
                    ? 'bg-white text-[#5420F5] shadow-2xs'
                    : 'text-[#706B7D] hover:text-[#191525]'
                }`}
              >
                Newest
              </button>
            </div>
          )}
          {replyingTo && (
            <button
              onClick={handleCancelReply}
              className="text-xs text-rose-500 hover:text-rose-600 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <span>Cancel replying to @{replyingTo.authorName}</span>
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Comments List */}
      {comments.length === 0 ? (
        <div className="bg-white rounded-2xl p-6 text-center border border-[#EAE6F0] shadow-2xs space-y-2">
          <div className="w-10 h-10 mx-auto rounded-full bg-[#F0EBFF] text-[#5420F5] flex items-center justify-center">
            <MessageSquare className="w-5 h-5" />
          </div>
          <p className="text-xs font-bold text-[#191525]">No comments yet</p>
          <p className="text-xs text-[#706B7D]">
            Be the first to share your thoughts, advice, or @mention classmates!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedRootComments.map((comment) => {
            const replies = repliesByParent[comment.id] || [];
            const isCollapsed = collapsedThreads[comment.id] || false;
            const isReplyingThisComment = replyingTo?.commentId === comment.id;

            return (
              <div
                key={comment.id}
                id={`comment-${comment.id}`}
                className={`bg-white rounded-2xl p-3.5 sm:p-4 border shadow-2xs transition-all space-y-2.5 ${
                  highlightedCommentId === comment.id
                    ? 'border-[#5420F5] ring-2 ring-[#5420F5]/25 bg-[#F0EBFF]/30'
                    : 'border-[#EAE6F0] hover:border-[#5420F5]/30'
                }`}
              >
                {/* 1. Root Comment Content */}
                <div className="flex items-start justify-between gap-2">
                  <div
                    onClick={() =>
                      viewUserProfile(
                        comment.authorUsername,
                        comment.isAnonymous,
                        comment.authorCampus
                      )
                    }
                    className="flex items-center gap-2.5 cursor-pointer group"
                    title={`View ${comment.authorName}'s profile`}
                  >
                    {comment.isAnonymous ? (
                      <BopoiAnonymousAvatar size="xs" idPrefix={`comm-${comment.id}`} />
                    ) : (
                      <CampusCharacterAvatar
                        value={comment.authorAvatar}
                        seed={comment.authorUsername}
                        size={28}
                        rounded="full"
                        className="ring-1 ring-[#5420F5]/20 group-hover:scale-105 transition-transform"
                      />
                    )}
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-black text-[#191525] group-hover:text-[#5420F5] transition-colors">
                          {comment.authorName}
                        </span>
                        {comment.authorCampus && (
                          <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded-md">
                            {comment.authorCampus}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-[#706B7D]">
                        {comment.createdAt}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Comment Body with highlighted @mentions */}
                <p className="text-xs sm:text-sm text-[#191525] font-medium leading-relaxed pl-1 sm:pl-2">
                  <MentionText text={comment.text} />
                </p>

                {/* Action Bar */}
                <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-50">
                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    {/* Like button */}
                    <button
                      type="button"
                      onClick={() => toggleCommentLike(postId, comment.id)}
                      className={`flex items-center gap-1.5 py-1 px-2 rounded-lg transition-colors cursor-pointer hover:bg-pink-50 ${
                        comment.hasLiked
                          ? 'text-[#F52D85] font-bold'
                          : 'hover:text-[#F52D85]'
                      }`}
                    >
                      <Heart
                        className={`w-3.5 h-3.5 ${
                          comment.hasLiked ? 'fill-[#F52D85]' : ''
                        }`}
                      />
                      <span className="text-[11px]">{comment.likes}</span>
                    </button>

                    {/* Reply button - opens thread reply & immediately focuses keyboard */}
                    <button
                      type="button"
                      onClick={() =>
                        handleStartReply(
                          comment.id,
                          comment.authorName,
                          comment.authorUsername
                        )
                      }
                      className="flex items-center gap-1.5 py-1 px-2 rounded-lg text-slate-600 hover:text-[#5420F5] hover:bg-[#F0EBFF] transition-colors cursor-pointer font-bold text-[11px]"
                    >
                      <CornerDownRight className="w-3.5 h-3.5" />
                      <span>Reply</span>
                    </button>

                    {/* Share Comment Deep Link */}
                    <button
                      type="button"
                      onClick={() => shareCommentLink(postId, comment.id, comment.authorName)}
                      className="flex items-center gap-1 py-1 px-2 rounded-lg text-slate-500 hover:text-[#5420F5] hover:bg-[#F0EBFF] transition-colors cursor-pointer font-bold text-[11px]"
                      title="Share direct link to this comment"
                    >
                      <Share2 className="w-3 h-3" />
                      <span>Share</span>
                    </button>

                    {/* Quick @mention author button */}
                    {!comment.isAnonymous && comment.authorUsername && (
                      <button
                        type="button"
                        onClick={() => {
                          handleStartReply(
                            comment.id,
                            comment.authorName,
                            comment.authorUsername
                          );
                          insertMentionIntoBottom(comment.authorUsername);
                        }}
                        className="hidden sm:inline-flex items-center gap-1 py-1 px-2 rounded-lg text-slate-500 hover:text-[#5420F5] hover:bg-[#F0EBFF] transition-colors cursor-pointer text-[11px] font-semibold"
                        title={`Reply and mention @${comment.authorUsername}`}
                      >
                        <AtSign className="w-3 h-3 text-[#5420F5]" />
                        <span>@{comment.authorUsername}</span>
                      </button>
                    )}
                  </div>

                  {/* Thread Toggle (if replies exist) */}
                  {replies.length > 0 && (
                    <button
                      type="button"
                      onClick={() => toggleThreadCollapse(comment.id)}
                      className="flex items-center gap-1 text-[11px] font-bold text-[#5420F5] hover:text-[#4314E2] transition-colors cursor-pointer px-2 py-0.5 rounded-lg hover:bg-[#F0EBFF]"
                    >
                      <span>
                        {isCollapsed
                          ? `Show ${replies.length} ${
                              replies.length === 1 ? 'reply' : 'replies'
                            }`
                          : `Hide thread (${replies.length})`}
                      </span>
                      {isCollapsed ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronUp className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </div>

                {/* 2. Thread Branch (Nested Replies) */}
                {replies.length > 0 && !isCollapsed && (
                  <div className="ml-3 sm:ml-5 pl-3 sm:pl-4 border-l-2 border-[#5420F5]/25 space-y-2.5 mt-3 pt-1">
                    {replies.map((reply) => (
                      <div
                        key={reply.id}
                        className="bg-[#FAF9FC] rounded-xl p-3 border border-[#EAE6F0] space-y-1.5 relative group hover:border-[#5420F5]/20 transition-all"
                      >
                        {/* Header */}
                        <div className="flex items-center justify-between gap-2">
                          <div
                            onClick={() =>
                              viewUserProfile(
                                reply.authorUsername,
                                reply.isAnonymous,
                                reply.authorCampus
                              )
                            }
                            className="flex items-center gap-2 cursor-pointer"
                            title={`View ${reply.authorName}'s profile`}
                          >
                            {reply.isAnonymous ? (
                              <BopoiAnonymousAvatar
                                size="xs"
                                idPrefix={`reply-${reply.id}`}
                              />
                            ) : (
                              <CampusCharacterAvatar
                                value={reply.authorAvatar}
                                seed={reply.authorUsername}
                                size={22}
                                rounded="full"
                              />
                            )}
                            <span className="text-xs font-bold text-[#191525] hover:underline">
                              {reply.authorName}
                            </span>
                            <span className="text-[10px] text-[#706B7D]">
                              {reply.createdAt}
                            </span>
                          </div>

                          {/* Replying To pill */}
                          {reply.replyToAuthor && (
                            <span className="text-[10px] font-bold text-[#5420F5] bg-[#F0EBFF] px-2 py-0.5 rounded-full shrink-0">
                              Replying to @{reply.replyToAuthor}
                            </span>
                          )}
                        </div>

                        {/* Reply Text with highlighted @mentions */}
                        <p className="text-xs text-[#191525] font-medium leading-relaxed pl-1">
                          <MentionText text={reply.text} />
                        </p>

                        {/* Reply Action Bar */}
                        <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-500 font-semibold pl-1">
                          <button
                            type="button"
                            onClick={() => toggleCommentLike(postId, reply.id)}
                            className={`flex items-center gap-1 hover:text-[#F52D85] cursor-pointer ${
                              reply.hasLiked ? 'text-[#F52D85] font-bold' : ''
                            }`}
                          >
                            <Heart
                              className={`w-3 h-3 ${
                                reply.hasLiked ? 'fill-[#F52D85]' : ''
                              }`}
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
                            className="hover:text-[#5420F5] cursor-pointer flex items-center gap-1 font-bold"
                          >
                            <CornerDownRight className="w-3 h-3" />
                            <span>Reply</span>
                          </button>
                          {!reply.isAnonymous && reply.authorUsername && (
                            <button
                              type="button"
                              onClick={() => {
                                handleStartReply(
                                  comment.id,
                                  reply.authorName,
                                  reply.authorUsername
                                );
                                insertMentionIntoBottom(reply.authorUsername);
                              }}
                              className="hover:text-[#5420F5] cursor-pointer flex items-center gap-0.5 text-slate-400 hover:text-slate-700"
                              title={`Mention @${reply.authorUsername}`}
                            >
                              <AtSign className="w-2.5 h-2.5 text-[#5420F5]" />
                              <span>@{reply.authorUsername}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Single Fixed Docked Comment Bar (Sits flush at bottom-0 above keyboard when typing, or above BottomNavBar when idle) */}
      <div
        style={
          isKeyboardOpen
            ? { bottom: keyboardOffsetBottom > 0 ? `${keyboardOffsetBottom}px` : '0px' }
            : undefined
        }
        className={`fixed ${
          isKeyboardOpen
            ? 'bottom-0 bg-[#FAF9FC]/95 backdrop-blur-md py-1.5 border-t border-[#EAE6F0]'
            : 'bottom-16 pb-1.5 pt-1'
        } inset-x-0 z-30 pointer-events-none px-3 sm:px-6 w-full max-w-full box-border`}
      >
        <div className="w-full max-w-2xl mx-auto pointer-events-auto space-y-1.5">
          {(bottomMentionQuery !== null || showBottomMentionPicker) && (
            <MentionAutocompleteDropdown
              isOpen={true}
              query={bottomMentionQuery}
              candidates={mentionCandidates}
              onSelect={insertMentionIntoBottom}
              onClose={() => setShowBottomMentionPicker(false)}
              className="mb-2"
            />
          )}

          {replyingTo && (
            <div className="w-full max-w-full overflow-hidden box-border bg-[#191525] text-white px-3 py-1.5 rounded-xl text-xs flex items-center justify-between shadow-md animate-in fade-in slide-in-from-bottom-1 gap-2">
              <span className="flex items-center gap-1.5 font-bold truncate min-w-0 flex-1">
                <CornerDownRight className="w-3.5 h-3.5 text-[#FFC928] shrink-0" />
                <span className="truncate">
                  Replying to <strong>@{replyingTo.authorName}</strong>
                </span>
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => insertMentionIntoBottom(replyingTo.authorUsername)}
                  className="text-[10px] font-bold bg-white/15 hover:bg-white/25 text-[#FFC928] px-2 py-0.5 rounded-md flex items-center gap-0.5 cursor-pointer transition-colors"
                  title={`Mention @${replyingTo.authorUsername}`}
                >
                  <AtSign className="w-2.5 h-2.5" />
                  <span>@{replyingTo.authorUsername}</span>
                </button>
                <button
                  type="button"
                  onClick={handleCancelReply}
                  className="text-slate-300 hover:text-white p-1 rounded-md cursor-pointer shrink-0"
                  title="Cancel replying"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {isLoggedIn ? (
            <form
              onSubmit={handleBottomSubmit}
              className="w-full max-w-full overflow-hidden box-border bg-white/95 backdrop-blur-md border border-[#5420F5]/25 rounded-2xl p-1.5 pl-2 sm:pl-3 flex items-center gap-1.5 sm:gap-2 shadow-xl"
            >
              {/* Anon switch */}
              <button
                type="button"
                onClick={() => setIsBottomAnonymous(!isBottomAnonymous)}
                className={`px-2 py-1.5 rounded-xl text-[10px] font-bold transition-all cursor-pointer shrink-0 border inline-flex items-center gap-1 ${
                  isBottomAnonymous
                    ? 'bg-[#191525] text-white border-[#191525]'
                    : 'bg-[#FAF9FC] text-slate-600 border-[#EAE6F0] hover:bg-slate-100'
                }`}
                title={
                  isBottomAnonymous ? 'Posting as Anonymous' : `Posting as ${user.displayName}`
                }
              >
                {isBottomAnonymous && <PersonaMaskIcon mask="secret-confession" size={13} />}
                <span>{isBottomAnonymous ? 'Anon' : 'Public'}</span>
              </button>

              {/* Quick @ Mention button */}
              <button
                type="button"
                onClick={() => {
                  if (!bottomCommentText.endsWith('@')) {
                    setBottomCommentText((prev) => (prev ? `${prev} @` : '@'));
                  }
                  setShowBottomMentionPicker(true);
                  bottomInputRef.current?.focus();
                }}
                className="p-1.5 rounded-lg text-slate-500 hover:text-[#5420F5] hover:bg-[#F0EBFF] transition-colors cursor-pointer shrink-0 flex items-center gap-0.5 text-xs font-bold"
                title="Mention a student"
              >
                <AtSign className="w-4 h-4 text-[#5420F5]" />
                <span className="hidden sm:inline">Mention</span>
              </button>

              <input
                ref={bottomInputRef}
                type="text"
                value={bottomCommentText}
                onChange={(e) => setBottomCommentText(e.target.value)}
                placeholder={
                  replyingTo
                    ? `Reply to @${replyingTo.authorName}...`
                    : 'Write a comment or @mention...'
                }
                className="w-0 min-w-0 flex-1 bg-transparent text-base sm:text-sm text-[#191525] placeholder:text-slate-400 focus:outline-none"
              />

              <button
                type="submit"
                disabled={!bottomCommentText.trim()}
                className="w-9 h-9 bg-[#5420F5] hover:bg-[#4314E2] text-white rounded-xl transition-all cursor-pointer disabled:opacity-40 shrink-0 shadow-xs flex items-center justify-center"
                title={replyingTo ? 'Send reply' : 'Send comment'}
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
              className="w-full max-w-full overflow-hidden box-border bg-white/95 backdrop-blur-md border border-[#5420F5]/25 rounded-2xl p-2 pl-3.5 flex items-center justify-between gap-2 shadow-xl cursor-pointer hover:border-[#5420F5]/50 transition-all"
            >
              <span className="text-xs font-bold text-[#706B7D] truncate min-w-0 flex-1">
                Sign in to comment, reply, or like
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveView('profile');
                }}
                className="px-3.5 py-2 bg-[#5420F5] hover:bg-[#4314E2] text-white text-xs font-black rounded-xl transition-all cursor-pointer shrink-0 shadow-xs"
              >
                Sign In
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
