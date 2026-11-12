import React, { useState } from 'react';
import { useBopoi } from '../../context/BopoiContext.tsx';
import { SocialPostType } from '../../types/index.ts';
import {
  X,
  Plus,
  Trash2,
  Send,
  ChevronRight,
  ArrowLeft,
  Loader2,
  Check,
} from 'lucide-react';
import { BopoiAnonymousAvatar } from '../brand/BopoiAnonymousAvatar.tsx';
import { PersonaMaskIcon } from '../brand/masks/PersonaMaskIcon.tsx';
import { CampusCharacterAvatar } from '../brand/character/index.ts';
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
    setIsCreateRoomModalOpen,
    createSocialPost,
    user,
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
  const [hashtags, setHashtags] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [publishStage, setPublishStage] = useState<'idle' | 'publishing' | 'confirmed'>('idle');

  if (!isCreateModalOpen) return null;

  const handleClose = () => {
    if (publishStage === 'publishing') return;
    setIsCreateModalOpen(false);
    setSelectedType(null);
    setContent('');
    setTitle('');
    setPollOptions(['', '']);
    setPublishStage('idle');
    setIsSubmitting(false);
  };

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || publishStage !== 'idle') return;
    if (!content.trim() && !title.trim()) return;

    setIsSubmitting(true);
    setPublishStage('publishing');

    const parsedHashtags = hashtags
      .split(' ')
      .filter((t) => t.trim().length > 0)
      .map((t) => (t.startsWith('#') ? t : `#${t}`));

    const validPollOptions =
      selectedType === 'poll'
        ? pollOptions.filter((o) => o.trim().length > 0).map((o) => ({ text: o.trim() }))
        : undefined;

    const targetType = selectedType || 'post';

    setTimeout(() => {
      createSocialPost({
        type: targetType,
        content: content.trim(),
        title: title.trim() || undefined,
        category,
        hashtags: parsedHashtags.length > 0 ? parsedHashtags : undefined,
        isAnonymous: targetType === 'confession' ? true : isAnonymous,
        pollOptions: validPollOptions,
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
    badge?: string;
    desc: string;
    icon: React.ReactNode;
    cardStyle: string;
    accentColor: string;
  }> = [
    {
      type: 'post',
      title: 'Post',
      desc: 'Share your thoughts, campus moments, or updates with everyone.',
      icon: <CreatePostIcon size={36} />,
      cardStyle:
        'bg-gradient-to-r from-blue-50/90 via-sky-50/50 to-white hover:from-blue-100/80 hover:border-blue-300',
      accentColor: 'group-hover:text-blue-600',
    },
    {
      type: 'confession',
      title: 'Confession',
      badge: '100% ANON',
      desc: 'Drop a secret, crush, or unfiltered opinion with your identity hidden.',
      icon: <CreateConfessionIcon size={36} />,
      cardStyle:
        'bg-gradient-to-r from-[#F0EBFF] via-purple-50/60 to-white hover:from-[#E6DEFF] hover:border-[#5420F5]/40',
      accentColor: 'group-hover:text-[#5420F5]',
    },
    {
      type: 'poll',
      title: 'Poll',
      desc: 'Ask a multiple-choice question and see how students vote live.',
      icon: <CreatePollIcon size={36} />,
      cardStyle:
        'bg-gradient-to-r from-indigo-50/90 via-emerald-50/30 to-white hover:from-indigo-100/75 hover:border-indigo-300',
      accentColor: 'group-hover:text-indigo-600',
    },
    {
      type: 'discussion',
      title: 'Discussion',
      desc: 'Kick off a campus debate or ask for advice from fellow students.',
      icon: <CreateDiscussionIcon size={36} />,
      cardStyle:
        'bg-gradient-to-r from-orange-50/80 via-amber-50/40 to-white hover:from-orange-100/75 hover:border-orange-300',
      accentColor: 'group-hover:text-orange-600',
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-[#EAE6F0] overflow-hidden flex flex-col max-h-[92dvh] animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#EAE6F0] flex items-center justify-between bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            {selectedType && (
              <div className="w-10 h-10 rounded-2xl bg-[#FAF9FC] border border-[#EAE6F0] flex items-center justify-center shrink-0 shadow-2xs">
                {getHeaderIcon(selectedType)}
              </div>
            )}
            <div>
              <h3 className="text-base sm:text-lg font-black text-[#191525]">
                {selectedType
                  ? `Create ${selectedType.charAt(0).toUpperCase() + selectedType.slice(1)}`
                  : 'Create Content'}
              </h3>
              <p className="text-xs text-[#706B7D]">
                {selectedType
                  ? 'Share your vibe with Nigerian campus students'
                  : 'Choose what you want to share with the campus'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-500 hover:text-black transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Section */}
        <div className="p-5 overflow-y-auto space-y-4">
          {!selectedType ? (
            /* Option Selector */
            <div className="space-y-3">
              {CONTENT_OPTIONS.map((item) => (
                <button
                  key={item.type}
                  onClick={() => handleSelectType(item.type)}
                  className={`w-full p-3.5 sm:p-4 rounded-2xl border border-[#EAE6F0] flex items-center justify-between text-left transition-all cursor-pointer group hover:shadow-md active:scale-[0.99] ${item.cardStyle}`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      {item.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4
                          className={`text-sm font-black text-[#191525] transition-colors ${item.accentColor}`}
                        >
                          {item.title}
                        </h4>
                        {item.badge && (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-[#5420F5]/10 text-[#5420F5]">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#706B7D] mt-0.5 leading-snug">{item.desc}</p>
                    </div>
                  </div>
                  <div className="w-7 h-7 rounded-full bg-white/80 group-hover:bg-white flex items-center justify-center shrink-0 ml-2 text-slate-400 group-hover:text-[#191525] group-hover:translate-x-0.5 transition-all shadow-2xs">
                    <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                  </div>
                </button>
              ))}

              {/* 5. Anonymous Chat Room Option */}
              <button
                type="button"
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setIsCreateRoomModalOpen(true);
                }}
                className="w-full p-3.5 sm:p-4 rounded-2xl border-2 border-[#5420F5]/25 bg-gradient-to-r from-[#F0EBFF] via-purple-50/70 to-white flex items-center justify-between text-left transition-all cursor-pointer hover:border-[#5420F5] hover:shadow-md active:scale-[0.99] group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-white border border-[#5420F5]/20 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                    <CreateRoomIcon size={36} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-black text-[#191525] group-hover:text-[#5420F5] transition-colors">
                        Anonymous Chat Room
                      </h4>
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-emerald-500 text-white shadow-2xs">
                        LIVE
                      </span>
                    </div>
                    <p className="text-xs text-[#706B7D] mt-0.5 leading-snug">
                      Start a live chat room that anyone can join for anonymous conversations.
                    </p>
                  </div>
                </div>
                <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center shrink-0 ml-2 text-[#5420F5] group-hover:translate-x-0.5 transition-all shadow-2xs">
                  <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                </div>
              </button>

              {/* Got something to say banner */}
              <div className="mt-4 pt-3 border-t border-[#EAE6F0] flex items-center gap-3 bg-gradient-to-r from-[#F0EBFF] to-white p-3.5 rounded-2xl border border-[#5420F5]/20">
                <BopoiAnonymousAvatar size="sm" idPrefix="create-sheet-mascot" showSparkleBadge />
                <div>
                  <h5 className="text-xs font-black text-[#5420F5]">Got something to say?</h5>
                  <p className="text-[11px] text-[#706B7D]">
                    Speak freely or post as yourself — your campus is listening. 💜
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* Creation Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Back to selection */}
              <button
                type="button"
                onClick={() => setSelectedType(null)}
                className="text-xs font-bold text-[#5420F5] hover:underline inline-flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Choose a different format</span>
              </button>

              {/* Identity Pill */}
              <div className="bg-slate-50 p-2.5 rounded-2xl border border-[#EAE6F0]">
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
                      <span className="text-xs font-bold text-[#191525] block">
                        {selectedType === 'confession' || isAnonymous
                          ? 'Posting Anonymously'
                          : user.displayName}
                      </span>
                      <span className="text-[10px] text-[#706B7D] block">
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
                          : 'bg-white border border-[#EAE6F0] text-slate-600 hover:text-black'
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
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Category</label>
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
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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
                  <label className="text-xs font-bold text-slate-700 block mb-1">
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
                    className="w-full px-3.5 py-2.5 bg-[#FAF9FC] border border-[#EAE6F0] rounded-xl text-base sm:text-sm font-bold text-[#191525] focus:outline-none focus:border-[#5420F5]"
                    required
                  />
                </div>
              )}

              {/* Main Content Area */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  {selectedType === 'poll'
                    ? 'Additional Context (Optional)'
                    : 'What would you like to share?'}
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={selectedType === 'poll' ? 2 : 4}
                  placeholder={
                    selectedType === 'confession'
                      ? "Share your secret, story or crush... It's 100% anonymous 💜"
                      : selectedType === 'discussion'
                      ? 'Add some thoughts to kick off the conversation...'
                      : 'Tell the campus what is on your mind today...'
                  }
                  className="w-full px-3.5 py-2.5 bg-[#FAF9FC] border border-[#EAE6F0] rounded-xl text-base sm:text-sm text-[#191525] focus:outline-none focus:border-[#5420F5] resize-none"
                  required={selectedType !== 'poll'}
                />
              </div>

              {/* Poll Options Builder */}
              {selectedType === 'poll' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700">Poll Options (2 to 5)</label>
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

              {/* Optional Hashtags */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Hashtags</label>
                <input
                  type="text"
                  value={hashtags}
                  onChange={(e) => setHashtags(e.target.value)}
                  placeholder="e.g. #CampusLife #Exams #StudentVibes"
                  className="w-full px-3.5 py-2 bg-[#FAF9FC] border border-[#EAE6F0] rounded-xl text-base sm:text-sm text-[#191525] focus:outline-none focus:border-[#5420F5]"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  disabled={publishStage !== 'idle'}
                  onClick={handleClose}
                  className="w-1/3 py-3 border border-[#EAE6F0] rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || publishStage !== 'idle'}
                  className={`flex-1 py-3 font-extrabold text-sm rounded-xl shadow-lg transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed ${
                    publishStage === 'confirmed'
                      ? 'bg-emerald-600 text-white shadow-emerald-600/25 scale-[0.99]'
                      : publishStage === 'publishing'
                      ? 'bg-[#4314E2] text-white shadow-[#5420F5]/20 scale-[0.99]'
                      : 'bg-[#5420F5] hover:bg-[#4314E2] text-white shadow-[#5420F5]/25 active:scale-[0.98]'
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
    </div>
  );
};
