import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useBopoi } from '../../context/BopoiContext.tsx';
import { SocialPost, SocialPostType, QuotedPostPreview } from '../../types/index.ts';
import {
  X,
  Plus,
  Trash2,
  Send,
  ChevronRight,
  ArrowLeft,
  Loader2,
  Check,
  AtSign,
  Repeat2,
} from 'lucide-react';
import { BopoiAnonymousAvatar } from '../brand/BopoiAnonymousAvatar.tsx';
import { PersonaMaskIcon } from '../brand/masks/PersonaMaskIcon.tsx';
import { CampusCharacterAvatar } from '../brand/character/index.ts';
import { HashtagPicker } from '../ui/HashtagPicker.tsx';
import { KlipyGifPicker } from './KlipyGifPicker.tsx';
import { GifPreviewMedia } from '../ui/GifPreviewMedia.tsx';
import { CharProgressRing } from '../ui/CharProgressRing.tsx';
import { QuotedPostCard } from '../feed/QuotedPostCard.tsx';
import { MentionAutocompleteDropdown } from '../comments/MentionAutocompleteDropdown.tsx';
import {
  buildMentionCandidates,
  useMentionAutocomplete,
} from '../../hooks/useMentionAutocomplete.ts';
import {
  computeTrendingHashtags,
  extractHashtagsFromText,
  normalizeHashtag,
} from '../../utils/hashtags.ts';
import {
  CreatePostIcon,
  CreateConfessionIcon,
  CreatePollIcon,
  CreateDiscussionIcon,
  CreateRoomIcon,
} from '../brand/icons/index.ts';

export const CreateContentModal: React.FC = () => {
  const {
    isCreateModalOpen,
    setIsCreateModalOpen,
    isCreateRoomModalOpen,
    setIsCreateRoomModalOpen,
    isSearchModalOpen,
    createSocialPost,
    socialPosts,
    rooms,
    creators,
    accounts,
    draftHashtag,
    setDraftHashtag,
    draftPostType,
    setDraftPostType,
    draftQuotedPost,
    setDraftQuotedPost,
    user,
    activeView,
    setActiveView,
    isAuthenticated,
    showToast,
  } = useBopoi();

  const isLoggedIn = Boolean(isAuthenticated && user.username && user.username !== 'student');

  const [selectedType, setSelectedType] = useState<SocialPostType | null>(null);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Campus Life');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [selectedHashtags, setSelectedHashtags] = useState<string[]>([]);
  const [pendingGif, setPendingGif] = useState<{ mediaUrl: string; title: string } | null>(null);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [quotedPost, setQuotedPost] = useState<SocialPost | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);

  const [publishStage, setPublishStage] = useState<'idle' | 'publishing' | 'confirmed'>('idle');

  const mention = useMentionAutocomplete({
    text: content,
    setText: setContent,
    inputRef: contentTextareaRef,
  });

  const liveTrendingTags = useMemo(
    () => computeTrendingHashtags(socialPosts, rooms, 10).map((t) => t.tag),
    [socialPosts, rooms]
  );

  const detectedInlineTags = useMemo(
    () => extractHashtagsFromText(`${title} ${content}`, 6),
    [title, content]
  );

  const mentionCandidates = useMemo(
    () =>
      buildMentionCandidates({
        creators,
        accounts,
        excludeUsername: user.username,
      }),
    [creators, accounts, user.username]
  );

  const handleClose = () => {
    if (publishStage === 'publishing') return;
    setIsCreateModalOpen(false);
    setSelectedType(null);
    setContent('');
    setTitle('');
    setPollOptions(['', '']);
    setSelectedHashtags([]);
    setPendingGif(null);
    setShowGifPicker(false);
    setQuotedPost(null);
    mention.reset();
    setDraftHashtag(null);
    setDraftPostType(null);
    setDraftQuotedPost(null);
    setPublishStage('idle');
    setIsSubmitting(false);
  };

  // Pre-fill hashtag, post type, or quoted post when opened
  useEffect(() => {
    if (!isCreateModalOpen) return;
    if (draftHashtag) {
      const norm = normalizeHashtag(draftHashtag);
      if (norm) {
        setSelectedHashtags([norm]);
      }
      setDraftHashtag(null);
    }
    if (draftPostType) {
      setSelectedType(draftPostType);
      setIsAnonymous(draftPostType === 'confession' || !isLoggedIn);
      setCategory(draftPostType === 'confession' ? 'Love' : 'Campus Life');
      setDraftPostType(null);
    }
    if (draftQuotedPost) {
      setQuotedPost(draftQuotedPost);
      setSelectedType('post');
      setIsAnonymous(!isLoggedIn);
      setCategory(draftQuotedPost.category || 'Campus Life');
      setDraftQuotedPost(null);
    }
  }, [
    isCreateModalOpen,
    draftHashtag,
    draftPostType,
    draftQuotedPost,
    isLoggedIn,
    setDraftHashtag,
    setDraftPostType,
    setDraftQuotedPost,
  ]);

  // Esc to close modal + 'c' shortcut on main app views when not typing
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isCreateModalOpen) {
        if (e.key === 'Escape' && !showGifPicker && !mention.isOpen) {
          e.preventDefault();
          handleClose();
        }
        return;
      }

      if (e.metaKey || e.ctrlKey || e.altKey || e.key.toLowerCase() !== 'c') return;
      if (isSearchModalOpen || isCreateRoomModalOpen) return;
      const blockedViews = new Set([
        'splash',
        'onboarding',
        'register',
        'landing',
        'room-detail',
        'message-detail',
        'public-ask',
        'answer-studio',
      ]);
      if (blockedViews.has(activeView)) return;

      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (
        tag === 'input' ||
        tag === 'textarea' ||
        tag === 'select' ||
        target?.isContentEditable
      ) {
        return;
      }
      e.preventDefault();
      setIsCreateModalOpen(true);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    isCreateModalOpen,
    isSearchModalOpen,
    isCreateRoomModalOpen,
    activeView,
    mention.isOpen,
    showGifPicker,
    publishStage,
  ]);

  if (!isCreateModalOpen) return null;

  const handleSelectType = (type: SocialPostType) => {
    setSelectedType(type);
    if (type === 'confession') {
      setIsAnonymous(true);
      setCategory('Love');
    } else if (type === 'poll') {
      setIsAnonymous(!isLoggedIn);
      setCategory('Campus Life');
    } else if (type === 'discussion') {
      setIsAnonymous(!isLoggedIn);
      setCategory('Campus Life');
    } else {
      setIsAnonymous(!isLoggedIn);
      setCategory('Campus Life');
    }
  };

  const handleAddPollOption = () => {
    if (pollOptions.length < 5) {
      setPollOptions([...pollOptions, '']);
    }
  };

  const handleRemovePollOption = (idx: number) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== idx));
    }
  };

  const handlePollOptionChange = (idx: number, val: string) => {
    const updated = [...pollOptions];
    updated[idx] = val;
    setPollOptions(updated);
  };

  const submitPost = () => {
    if (isSubmitting || publishStage !== 'idle') return;
    if (selectedType === 'poll') {
      if (!title.trim()) {
        showToast('Please enter your poll question.', 'error');
        return;
      }
      const nonEmptyOptions = pollOptions.filter((o) => o.trim().length > 0);
      if (nonEmptyOptions.length < 2) {
        showToast('Please enter at least 2 poll options.', 'error');
        return;
      }
    } else if (!content.trim() && !title.trim() && !pendingGif && !quotedPost) {
      showToast('Please write something or attach a GIF before publishing.', 'error');
      return;
    }

    setIsSubmitting(true);
    setPublishStage('publishing');

    const validPollOptions =
      selectedType === 'poll'
        ? pollOptions.filter((o) => o.trim().length > 0).map((o) => ({ text: o.trim() }))
        : undefined;

    const targetType = selectedType || 'post';
    const quotedSnapshot: QuotedPostPreview | undefined = quotedPost
      ? {
          id: quotedPost.id,
          type: quotedPost.type,
          authorName: quotedPost.isAnonymous ? 'Anonymous Student' : quotedPost.authorName,
          authorUsername: quotedPost.isAnonymous ? 'anon_student' : quotedPost.authorUsername,
          authorAvatar: quotedPost.isAnonymous ? undefined : quotedPost.authorAvatar,
          authorCampus: quotedPost.authorCampus,
          isAnonymous: Boolean(quotedPost.isAnonymous),
          title: quotedPost.title,
          content: quotedPost.content,
          mediaUrl: quotedPost.mediaUrl,
          mediaType: quotedPost.mediaType,
          createdAt: quotedPost.createdAt,
        }
      : undefined;

    setTimeout(() => {
      createSocialPost({
        type: targetType,
        content: content.trim(),
        title: title.trim() || undefined,
        category,
        hashtags: selectedHashtags.length > 0 ? selectedHashtags : undefined,
        isAnonymous: targetType === 'confession' ? true : isAnonymous,
        pollOptions: validPollOptions,
        media: pendingGif
          ? { mediaUrl: pendingGif.mediaUrl, mediaType: 'gif' }
          : undefined,
        quotedPost: quotedSnapshot,
      });

      setPublishStage('confirmed');

      setTimeout(() => {
        setIsSubmitting(false);
        setPublishStage('idle');
        setIsCreateModalOpen(false);
        setSelectedType(null);
        setContent('');
        setTitle('');
        setPollOptions(['', '']);
        setSelectedHashtags([]);
        setPendingGif(null);
        setQuotedPost(null);
        mention.reset();

        // Navigate to appropriate feed
        if (targetType === 'confession') {
          setActiveView('confessions');
        } else if (targetType === 'poll') {
          setActiveView('home');
        } else if (targetType === 'discussion') {
          setActiveView('discussions');
        } else {
          setActiveView('home');
        }
      }, 500);
    }, 420);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitPost();
  };

  const getHeaderIcon = (type: SocialPostType | null) => {
    switch (type) {
      case 'post':
        return <CreatePostIcon size={28} />;
      case 'confession':
        return <CreateConfessionIcon size={28} />;
      case 'poll':
        return <CreatePollIcon size={28} />;
      case 'discussion':
        return <CreateDiscussionIcon size={28} />;
      default:
        return null;
    }
  };

  const CONTENT_OPTIONS: Array<{
    type: SocialPostType;
    title: string;
    note?: string;
    desc: string;
    icon: React.ReactNode;
    cardStyle: string;
    accentColor: string;
  }> = [
    {
      type: 'post',
      title: 'Post',
      desc: 'Share your thoughts, campus moments, or updates with everyone.',
      icon: <CreatePostIcon size={32} />,
      cardStyle: 'bg-[#FAF9FC] dark:bg-[#171322] hover:bg-white dark:hover:bg-[#1C172B] hover:border-[#5420F5]/40',
      accentColor: 'group-hover:text-[#5420F5] dark:group-hover:text-[#B9A7FF]',
    },
    {
      type: 'confession',
      title: 'Confession',
      note: 'Anonymous',
      desc: 'Drop a secret, crush, or unfiltered opinion with your identity hidden.',
      icon: <CreateConfessionIcon size={32} />,
      cardStyle: 'bg-[#FAF9FC] dark:bg-[#171322] hover:bg-white dark:hover:bg-[#1C172B] hover:border-[#5420F5]/40',
      accentColor: 'group-hover:text-[#5420F5] dark:group-hover:text-[#B9A7FF]',
    },
    {
      type: 'poll',
      title: 'Poll',
      desc: 'Ask a multiple-choice question and see how students vote live.',
      icon: <CreatePollIcon size={32} />,
      cardStyle: 'bg-[#FAF9FC] dark:bg-[#171322] hover:bg-white dark:hover:bg-[#1C172B] hover:border-[#5420F5]/40',
      accentColor: 'group-hover:text-[#5420F5] dark:group-hover:text-[#B9A7FF]',
    },
    {
      type: 'discussion',
      title: 'Discussion',
      desc: 'Kick off a campus debate or ask for advice from fellow students.',
      icon: <CreateDiscussionIcon size={32} />,
      cardStyle: 'bg-[#FAF9FC] dark:bg-[#171322] hover:bg-white dark:hover:bg-[#1C172B] hover:border-[#5420F5]/40',
      accentColor: 'group-hover:text-[#5420F5] dark:group-hover:text-[#B9A7FF]',
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-[#0E0C14] rounded-t-3xl sm:rounded-3xl shadow-2xl border border-[#EAE6F0] dark:border-[#262036] overflow-hidden flex flex-col max-h-[92dvh] animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#EAE6F0] dark:border-[#262036] flex items-center justify-between bg-white dark:bg-[#0E0C14] sticky top-0 z-10">
          <div className="flex items-center gap-3">
            {selectedType && (
              <div className="w-10 h-10 rounded-2xl bg-[#FAF9FC] dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] flex items-center justify-center shrink-0">
                {getHeaderIcon(selectedType)}
              </div>
            )}
            <div>
              <h3 className="text-base sm:text-lg font-black text-[#191525] dark:text-[#F4F2FA]">
                {selectedType
                  ? `Create ${selectedType.charAt(0).toUpperCase() + selectedType.slice(1)}`
                  : 'Create Content'}
              </h3>
              <p className="text-xs text-[#706B7D] dark:text-[#9E97B3]">
                {selectedType
                  ? 'Share with Nigerian campus students'
                  : 'Choose what you want to share'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="min-w-[40px] min-h-[40px] p-2 rounded-full hover:bg-slate-100 dark:hover:bg-[#171322] text-slate-500 dark:text-[#9E97B3] hover:text-black dark:hover:text-white transition-colors cursor-pointer flex items-center justify-center"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Section */}
        <div className="p-5 overflow-y-auto space-y-4">
          {!selectedType ? (
            /* Option Selector */
            <div className="space-y-2.5">
              {CONTENT_OPTIONS.map((item) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => handleSelectType(item.type)}
                  className={`w-full p-3.5 sm:p-4 rounded-2xl border border-[#EAE6F0] flex items-center justify-between text-left transition-colors cursor-pointer group active:scale-[0.99] ${item.cardStyle}`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-white border border-[#EAE6F0] flex items-center justify-center shrink-0">
                      {item.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4
                          className={`text-sm font-black text-[#191525] transition-colors ${item.accentColor}`}
                        >
                          {item.title}
                        </h4>
                        {item.note && (
                          <span className="text-[11px] font-semibold text-[#5420F5]">
                            · {item.note}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#706B7D] mt-0.5 leading-snug">{item.desc}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#706B7D] group-hover:text-[#191525] group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                </button>
              ))}

              {/* 5. Anonymous Chat Room Option */}
              <button
                type="button"
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setIsCreateRoomModalOpen(true);
                }}
                className="w-full p-3.5 sm:p-4 rounded-2xl border border-[#5420F5]/25 bg-[#F0EBFF]/45 dark:bg-[#231A45]/70 hover:bg-[#F0EBFF]/75 dark:hover:bg-[#231A45] flex items-center justify-between text-left transition-colors cursor-pointer hover:border-[#5420F5] active:scale-[0.99] group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-white dark:bg-[#0E0C14] border border-[#5420F5]/20 flex items-center justify-center shrink-0">
                    <CreateRoomIcon size={32} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-sm font-black text-[#191525] dark:text-[#F4F2FA] group-hover:text-[#5420F5] dark:group-hover:text-[#B9A7FF] transition-colors">
                        Anonymous Chat Room
                      </h4>
                      <span className="text-[11px] font-bold text-[#5420F5] dark:text-[#B9A7FF]">
                        · Live chat
                      </span>
                    </div>
                    <p className="text-xs text-[#706B7D] dark:text-[#9E97B3] mt-0.5 leading-snug">
                      Start a live chat room that anyone can join for anonymous conversations.
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#5420F5] dark:text-[#B9A7FF] group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
              </button>
            </div>
          ) : (
            /* Creation Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Back to selection */}
              <button
                type="button"
                onClick={() => setSelectedType(null)}
                className="text-xs font-bold text-[#5420F5] dark:text-[#B9A7FF] hover:underline inline-flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Choose a different format</span>
              </button>

              {/* Identity Pill */}
              <div className="bg-slate-50 dark:bg-[#171322] p-2.5 rounded-2xl border border-[#EAE6F0] dark:border-[#262036]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {selectedType === 'confession' || isAnonymous ? (
                      <BopoiAnonymousAvatar size="sm" idPrefix="composer-anon" />
                    ) : (
                      <CampusCharacterAvatar
                        value={user.avatarUrl}
                        seed={user.username}
                        size={34}
                        rounded="full"
                        className="ring-2 ring-[#5420F5]/30"
                      />
                    )}
                    <div>
                      <span className="text-xs font-bold text-[#191525] dark:text-[#F4F2FA] block">
                        {selectedType === 'confession' || isAnonymous
                          ? 'Posting Anonymously'
                          : user.displayName}
                      </span>
                      <span className="text-[10px] text-[#706B7D] dark:text-[#9E97B3] block">
                        {user.campus || 'Nigerian Campus Community'}
                      </span>
                    </div>
                  </div>

                  {selectedType !== 'confession' && (
                    <button
                      type="button"
                      onClick={() => {
                        if (!isLoggedIn && isAnonymous) {
                          showToast('Please log in to post with your public student profile.', 'info');
                          handleClose();
                          setActiveView('profile');
                          return;
                        }
                        setIsAnonymous(!isAnonymous);
                      }}
                      className={`text-xs px-2.5 py-1 rounded-xl font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                        isAnonymous
                          ? 'bg-[#5420F5] text-white shadow-xs'
                          : 'bg-white dark:bg-[#0E0C14] border border-[#EAE6F0] dark:border-[#262036] text-slate-600 dark:text-[#9E97B3] hover:text-black dark:hover:text-white'
                      }`}
                    >
                      {isAnonymous && <PersonaMaskIcon mask="masked-student" size={14} />}
                      <span>{isAnonymous ? 'Mask On' : 'Make Anonymous'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Category selector */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-[#D5D0E6] block mb-1.5">Category</label>
                <div className="flex flex-wrap gap-1.5">
                  {(selectedType === 'confession'
                    ? ['Love', 'School', 'Relationships', 'Campus Life', 'Money', 'Fashion']
                    : [
                        'Campus Life',
                        'Relationships',
                        'Tech & Gadgets',
                        'Music',
                        'Money',
                        'Fashion',
                      ]
                  ).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                        category === cat
                          ? 'bg-[#5420F5] text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-[#171322] text-slate-600 dark:text-[#9E97B3] hover:bg-slate-200 dark:hover:bg-[#231A45]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Question / Title for Poll or Discussion */}
              {(selectedType === 'poll' || selectedType === 'discussion') && (
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-[#D5D0E6] block mb-1">
                    {selectedType === 'poll' ? 'Poll Question' : 'Discussion Topic'}
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={
                      selectedType === 'poll'
                        ? 'e.g. Which do you prefer on campus?'
                        : "e.g. What's the best part about your campus life?"
                    }
                    className="w-full px-3.5 py-2.5 bg-[#FAF9FC] dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] rounded-xl text-base sm:text-sm font-bold text-[#191525] dark:text-[#F4F2FA] focus:outline-none focus:border-[#5420F5]"
                    required
                  />
                </div>
              )}

              {/* Main Content Area */}
              <div className="relative space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-[#D5D0E6]">
                    {selectedType === 'poll'
                      ? 'Additional Context (Optional)'
                      : quotedPost
                      ? 'Add your commentary (Optional)'
                      : 'What would you like to share?'}
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        contentTextareaRef.current?.blur();
                        if (document.activeElement instanceof HTMLElement) {
                          document.activeElement.blur();
                        }
                        mention.dismiss();
                        setShowGifPicker(true);
                      }}
                      className={`min-h-[28px] px-2 py-0.5 rounded-lg text-[11px] font-black transition-colors cursor-pointer inline-flex items-center gap-1 ${
                        pendingGif
                          ? 'bg-[#5420F5] text-white'
                          : 'bg-[#FAF9FC] border border-[#EAE6F0] text-[#5420F5] hover:bg-[#F0EBFF]'
                      }`}
                      title="Attach a GIF"
                    >
                      <span>GIF</span>
                    </button>

                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={mention.togglePicker}
                      className={`min-h-[28px] px-2 py-0.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer inline-flex items-center gap-1 ${
                        mention.isOpen
                          ? 'bg-[#5420F5] text-white'
                          : 'bg-[#FAF9FC] border border-[#EAE6F0] text-[#706B7D] hover:text-[#5420F5]'
                      }`}
                      title="Mention a student (@)"
                    >
                      <AtSign className="w-3 h-3" />
                      <span>Mention</span>
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <textarea
                    ref={contentTextareaRef}
                    value={content}
                    onChange={mention.handleChange}
                    onClick={(e) => mention.syncCursorFromEvent(e.currentTarget)}
                    onKeyUp={(e) => mention.syncCursorFromEvent(e.currentTarget)}
                    onSelect={(e) => mention.syncCursorFromEvent(e.currentTarget)}
                    onKeyDown={(e) => {
                      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                        e.preventDefault();
                        submitPost();
                      }
                    }}
                    maxLength={480}
                    rows={selectedType === 'poll' ? 2 : quotedPost ? 3 : 4}
                    placeholder={
                      quotedPost
                        ? 'Add your thoughts on this post...'
                        : selectedType === 'confession'
                        ? "Share your secret, story or crush... It's 100% anonymous"
                        : selectedType === 'discussion'
                        ? 'Add some thoughts to kick off the conversation... Use @ to tag students'
                        : 'Tell the campus what is on your mind today... Use @ to mention or # for tags'
                    }
                    className="w-full px-3.5 py-2.5 bg-[#FAF9FC] border border-[#EAE6F0] rounded-xl text-base sm:text-sm text-[#191525] focus:outline-none focus:border-[#5420F5] resize-none"
                    required={selectedType !== 'poll' && !pendingGif && !quotedPost}
                  />

                  <MentionAutocompleteDropdown
                    isOpen={mention.isOpen}
                    query={mention.query}
                    candidates={mentionCandidates}
                    onSelect={mention.insertMention}
                    onClose={mention.dismiss}
                    placement="bottom"
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#706B7D] tabular-nums">
                  <span>Tip: Ctrl/⌘ + Enter to publish</span>
                  <div className="flex items-center gap-2">
                    <span>{480 - content.length} left</span>
                    <CharProgressRing
                      length={content.length}
                      max={480}
                      showCountWhenLow={false}
                    />
                  </div>
                </div>

                {/* Selected GIF Preview */}
                {pendingGif && (
                  <div className="pt-1 flex items-start gap-2.5">
                    <GifPreviewMedia
                      url={pendingGif.mediaUrl}
                      alt={pendingGif.title}
                      compact={true}
                    />
                    <button
                      type="button"
                      onClick={() => setPendingGif(null)}
                      className="p-1.5 rounded-full bg-[#FAF9FC] border border-[#EAE6F0] text-[#706B7D] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                      title="Remove GIF"
                      aria-label="Remove GIF"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Embedded Quote Post Preview */}
                {quotedPost && (
                  <div className="pt-1 space-y-1">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#5420F5]">
                      <Repeat2 className="w-3.5 h-3.5" />
                      <span>Quoting post</span>
                    </div>
                    <QuotedPostCard
                      quote={{
                        id: quotedPost.id,
                        type: quotedPost.type,
                        authorName: quotedPost.isAnonymous
                          ? 'Anonymous Student'
                          : quotedPost.authorName,
                        authorUsername: quotedPost.isAnonymous
                          ? 'anon_student'
                          : quotedPost.authorUsername,
                        authorAvatar: quotedPost.isAnonymous
                          ? undefined
                          : quotedPost.authorAvatar,
                        authorCampus: quotedPost.authorCampus,
                        isAnonymous: Boolean(quotedPost.isAnonymous),
                        title: quotedPost.title,
                        content: quotedPost.content,
                        mediaUrl: quotedPost.mediaUrl,
                        mediaType: quotedPost.mediaType,
                        createdAt: quotedPost.createdAt,
                      }}
                      compact={true}
                      onRemove={() => setQuotedPost(null)}
                    />
                  </div>
                )}

              </div>

              {/* Poll Options Builder */}
              {selectedType === 'poll' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-[#D5D0E6]">Poll Options (2 to 5)</label>
                    {pollOptions.length < 5 && (
                      <button
                        type="button"
                        onClick={handleAddPollOption}
                        className="text-xs font-bold text-[#5420F5] flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Option</span>
                      </button>
                    )}
                  </div>

                  {pollOptions.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => handlePollOptionChange(idx, e.target.value)}
                        placeholder={`Option ${idx + 1} (e.g. ${
                          idx === 0 ? 'Indomie' : idx === 1 ? 'Jollof Rice' : 'Spaghetti'
                        })`}
                        className="flex-1 px-3 py-2 bg-[#FAF9FC] border border-[#EAE6F0] rounded-xl text-base sm:text-sm font-semibold text-[#191525] focus:outline-none focus:border-[#5420F5]"
                        required
                      />
                      {pollOptions.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemovePollOption(idx)}
                          className="p-2 text-slate-400 hover:text-red-500 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Interactive Hashtag Picker */}
              <HashtagPicker
                selectedTags={selectedHashtags}
                onChange={setSelectedHashtags}
                category={category}
                postType={selectedType || 'post'}
                detectedInlineTags={detectedInlineTags}
                trendingTags={liveTrendingTags}
                maxTags={6}
                label="Hashtags (Optional)"
                placeholder="Type a tag (e.g. ExamWeek) and press Space or Add"
              />

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  disabled={publishStage !== 'idle'}
                  onClick={handleClose}
                  className="w-1/3 min-h-[44px] border border-[#EAE6F0] rounded-xl text-xs font-bold text-[#191525] hover:bg-[#FAF9FC] transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || publishStage !== 'idle'}
                  className={`flex-1 min-h-[44px] font-extrabold text-sm rounded-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed ${
                    publishStage === 'confirmed'
                      ? 'bg-emerald-600 text-white scale-[0.99]'
                      : publishStage === 'publishing'
                      ? 'bg-[#4314E2] text-white scale-[0.99]'
                      : 'bg-[#5420F5] hover:bg-[#4314E2] text-white active:scale-[0.98]'
                  }`}
                >
                  {publishStage === 'publishing' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                      <span>Publishing to campus feed...</span>
                    </>
                  ) : publishStage === 'confirmed' ? (
                    <>
                      <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center animate-in zoom-in-75 duration-200 shrink-0">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </span>
                      <span>Published! Opening feed...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 shrink-0" />
                      <span>Publish to Campus Feed</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
      <KlipyGifPicker
        isOpen={showGifPicker}
        customerId={user.id || user.username || 'bopoi_student'}
        onSelect={(gif) => {
          setPendingGif({
            mediaUrl: gif.url,
            title: gif.title || 'GIF',
          });
          setShowGifPicker(false);
        }}
        onClose={() => setShowGifPicker(false)}
      />
    </div>
  );
};
