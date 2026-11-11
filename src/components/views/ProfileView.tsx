import React, { useState, useRef } from 'react';
import {
  ArrowLeft,
  Settings,
  Copy,
  Inbox,
  ChevronRight,
  ChevronLeft,
  School,
  Shield,
  HelpCircle,
  Link as LinkIcon,
  Edit3,
  X,
  Plus,
  Trash2,
  Check,
  Bookmark,
  Heart,
  MessageCircle,
  Share2,
  Search,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  PenSquare,
  BarChart3,
  Lock,
  MessageSquare,
  Send,
  Dices,
  LogOut,
  Users,
  UserPlus,
} from 'lucide-react';
import { useBopoi, useCharacterMood } from '../../context/BopoiContext.tsx';
import { SocialPost, MessageAnswer } from '../../types/index.ts';
import { BopoiAnonymousAvatar } from '../brand/BopoiAnonymousAvatar.tsx';
import { RegisterView, CAMPUS_OPTIONS } from './RegisterView.tsx';
import {
  BopoiSearchIcon,
  BookmarkedIcon,
  DeleteRemoveIcon,
  SearchEmptyIcon,
  EditAliasIcon,
  CopiedClipboardIcon,
  SparklePolishIcon,
  ShareCardsIcon,
  StudentPostsIcon,
  LaunchTrendingIcon,
  InboxShortcutIcon,
  CreateConfessionIcon,
  CreatePollIcon,
  CreateDiscussionIcon,
  CreatePostIcon,
  ProfileShieldNavIcon,
  StoryStudioNavIcon,
  PublicAskNavIcon,
  GetYourLinkIcon,
  ReceiveMessagesIcon,
  RealPeopleIcon,
  AdminConsoleNavIcon,
} from '../brand/icons/index.ts';
import { PersonaMaskIcon } from '../brand/masks/PersonaMaskIcon.tsx';
import {
  CampusCharacterAvatar,
  CharacterStudioModal,
  randomizeCharacterConfig,
  serializeCharacterConfig,
} from '../brand/character/index.ts';
import { FollowListModal } from '../modals/FollowListModal.tsx';

interface ProfileViewProps {
  initialTab?: 'posts' | 'answers' | 'saved' | 'settings';
}

export const ProfileView: React.FC<ProfileViewProps> = ({ initialTab = 'posts' }) => {
  const {
    user,
    socialPosts,
    answers,
    togglePostLike,
    togglePostBookmark,
    votePoll,
    setSelectedPost,
    setSelectedAnswer,
    deleteSocialPost,
    viewUserProfile,
    safetySettings,
    toggleLinkActive,
    copyUserLink,
    updateProfile,
    addHiddenWord,
    removeHiddenWord,
    unblockSender,
    clearBlockedSenders,
    submitSupportTicket,
    setActiveView,
    goBack,
    setIsCreateModalOpen,
    showToast,
    openPostShare,
    accounts,
    switchAccount,
    logoutAccount,
    openPublicAskFor,
    openLegalDoc,
    isAuthenticated,
    getFollowersForUser,
    getFollowingForUser,
    requestConfirm,
  } = useBopoi();

  const { characterMood, setCharacterMood, availableMoods } = useCharacterMood();

  const [profileTab, setProfileTab] = useState<'posts' | 'answers' | 'saved' | 'settings'>(initialTab);
  const [postFilter, setPostFilter] = useState<'all' | 'confessions' | 'polls' | 'discussions' | 'answers'>('all');
  const [savedFilter, setSavedFilter] = useState<'all' | 'bookmarks' | 'liked'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [activeModal, setActiveModal] = useState<
    'edit-profile' | 'character-studio' | 'safety' | 'help' | null
  >(null);
  const [followModalTab, setFollowModalTab] = useState<'followers' | 'following' | null>(null);

  const [copied, setCopied] = useState(false);
  const settingsSectionRef = useRef<HTMLDivElement>(null);

  const openAndScrollToSettings = () => {
    setProfileTab('settings');
    setSearchQuery('');
    setTimeout(() => {
      settingsSectionRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 60);
  };

  // Edit profile form state
  const [editName, setEditName] = useState(user.displayName);
  const [editBio, setEditBio] = useState(user.bio);
  const [editCampus, setEditCampus] = useState(user.campus || 'Chrisland University');
  const [editCustomPrompt, setEditCustomPrompt] = useState(
    user.customPrompt || "There's something you've been wanting to ask..."
  );

  // Hidden word input
  const [newWord, setNewWord] = useState('');
  const [supportSubject, setSupportSubject] = useState('General Question');
  const [supportMessage, setSupportMessage] = useState('');

  if (!isAuthenticated || !user.username || user.username === 'student') {
    return <RegisterView initialMode="login" />;
  }

  // 1. User's Own Created Posts & Stuffs
  const myPosts = socialPosts.filter(
    (p) =>
      p.authorUserId === user.id ||
      p.authorUsername.toLowerCase() === user.username.toLowerCase() ||
      (p.authorName.toLowerCase() === user.displayName.toLowerCase() && !p.isAnonymous)
  );

  const myConfessions = myPosts.filter((p) => p.type === 'confession');
  const myPolls = myPosts.filter((p) => p.type === 'poll');
  const myDiscussions = myPosts.filter((p) => p.type === 'discussion' || p.type === 'post');

  // Public/Completed story answers
  const myAnswersList: MessageAnswer[] = Object.values(answers).filter(
    (a) => !a.isDraft && (a.authorUsername === user.username || !a.authorUsername)
  );

  const totalMyItems = myPosts.length + myAnswersList.length;

  // Filtered list of user's posts
  const filteredMyPosts = myPosts.filter((p) => {
    if (postFilter === 'confessions' && p.type !== 'confession') return false;
    if (postFilter === 'polls' && p.type !== 'poll') return false;
    if (postFilter === 'discussions' && p.type !== 'discussion' && p.type !== 'post') return false;
    if (postFilter === 'answers') return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.content.toLowerCase().includes(q) ||
      (p.title && p.title.toLowerCase().includes(q)) ||
      (p.category && p.category.toLowerCase().includes(q)) ||
      (p.hashtags && p.hashtags.some((t) => t.toLowerCase().includes(q)))
    );
  });

  const filteredMyAnswers = myAnswersList.filter((a) => {
    if (postFilter !== 'all' && postFilter !== 'answers') return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      a.questionText.toLowerCase().includes(q) ||
      a.answerText.toLowerCase().includes(q)
    );
  });

  // 2. Saved & Bookmarked Items
  const bookmarkedPosts = socialPosts.filter((p) => p.isBookmarked);
  const likedPosts = socialPosts.filter((p) => p.hasLiked);
  const allSavedPosts = socialPosts.filter((p) => p.isBookmarked || p.hasLiked);

  const currentSavedList =
    savedFilter === 'bookmarks'
      ? bookmarkedPosts
      : savedFilter === 'liked'
      ? likedPosts
      : allSavedPosts;

  const filteredSavedPosts = currentSavedList.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.content.toLowerCase().includes(q) ||
      (p.title && p.title.toLowerCase().includes(q)) ||
      p.authorName.toLowerCase().includes(q) ||
      p.authorUsername.toLowerCase().includes(q) ||
      (p.category && p.category.toLowerCase().includes(q)) ||
      (p.hashtags && p.hashtags.some((t) => t.toLowerCase().includes(q)))
    );
  });

  const handleCopy = async () => {
    await copyUserLink();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({
      displayName: editName.trim(),
      bio: editBio.trim(),
      campus: editCampus.trim(),
      customPrompt:
        editCustomPrompt.trim() || "There's something you've been wanting to ask...",
    });
    setActiveModal(null);
  };

  const handleAddWord = (e: React.FormEvent) => {
    e.preventDefault();
    if (newWord.trim()) {
      addHiddenWord(newWord.trim());
      setNewWord('');
    }
  };

  const handleCardClick = (post: SocialPost) => {
    setSelectedPost(post);
    if (post.type === 'poll') {
      setActiveView('poll-detail');
    } else {
      setActiveView('post-detail');
    }
  };

  const handleOpenAnswerStudio = (ans: MessageAnswer) => {
    setSelectedAnswer(ans);
    setActiveView('answer-studio');
  };

  const handleShare = (e: React.MouseEvent, post: SocialPost) => {
    e.stopPropagation();
    openPostShare(post);
  };

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] bg-[#FAF9FC] py-4 sm:py-6 px-4 sm:px-6 pb-24 text-[#191525] animate-in fade-in duration-300">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* 1. Header Bar */}
      <div className="flex items-center justify-between py-2 border-b border-[#EAE6F0]">
        <button
          onClick={() => goBack('home')}
          className="p-1.5 -ml-1.5 rounded-full hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer flex items-center gap-1"
          title="Go back"
        >
          <ChevronLeft className="w-6 h-6" />
          <span className="text-xs font-bold hidden sm:inline">Back</span>
        </button>

        <h1 className="text-sm sm:text-base font-black text-[#191525] truncate">
          @{user.username}
        </h1>

        <div className="flex items-center gap-1 -mr-1.5">
          <button
            onClick={() => setActiveModal('edit-profile')}
            className="p-2 rounded-full hover:bg-purple-50 text-[#5420F5] transition-colors cursor-pointer"
            title="Edit Profile"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              const url = `${window.location.origin}/#public-ask`;
              if (navigator.share) {
                navigator.share({
                  title: `${user.displayName} on Bopoi`,
                  text: `Send me anonymous messages on Bopoi!`,
                  url,
                }).catch(() => {});
              } else {
                handleCopy();
              }
            }}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
            title="Share profile link"
          >
            <Share2 className="w-4 h-4" />
          </button>
          <button
            onClick={openAndScrollToSettings}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
            title="Scroll to Settings & Safety"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Hero Profile Card - Clean, matching public profile layout without banner thumbnail */}
      <div className="bg-white rounded-3xl border border-[#EAE6F0] shadow-xs p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            {/* 3D Customizable Campus Student Character Portrait */}
            <div className="relative group shrink-0">
              <CampusCharacterAvatar
                value={user.avatarUrl}
                seed={user.username}
                size={68}
                rounded="full"
                showRing
                onClick={() => setActiveModal('character-studio')}
                title="Click to customize your 3D character"
                className="ring-2 ring-[#5420F5]/20 hover:scale-105 transition-transform"
              />
              <button
                type="button"
                onClick={() => {
                  requestConfirm({
                    badge: '3D Character Studio',
                    title: 'Randomize your 3D character?',
                    description:
                      'Are you sure you want to roll a new random 3D character look? Your current outfit, hair, and aura will be replaced.',
                    confirmLabel: 'Yes, Randomize Look',
                    variant: 'primary',
                    icon: 'sparkle',
                    onConfirm: () => {
                      const nextUri = serializeCharacterConfig(randomizeCharacterConfig());
                      updateProfile({ avatarUrl: nextUri });
                    },
                  });
                }}
                title="Randomize 3D Character"
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#5420F5] text-white border-2 border-white shadow-md flex items-center justify-center hover:bg-[#4314E2] cursor-pointer transition-transform active:scale-90"
              >
                <Dices className="w-3.5 h-3.5" />
              </button>
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-lg sm:text-xl font-black text-[#191525]">
                  {user.displayName}
                </h2>
                <span title="Verified Campus Student" className="inline-flex items-center">
                  <SparklePolishIcon size={16} />
                </span>
              </div>
              <p className="text-xs text-[#706B7D] font-semibold">@{user.username}</p>

              {/* Campus Tag */}
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-[#F0EBFF] text-[#5420F5] text-[11px] font-bold rounded-full mt-1.5">
                <School className="w-3.5 h-3.5" />
                <span>{user.campus || 'Nigerian University Student'}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-center shrink-0">
            <button
              onClick={() => setActiveModal('character-studio')}
              className="px-3.5 py-2 bg-[#F0EBFF] hover:bg-[#5420F5] text-[#5420F5] hover:text-white text-xs font-black rounded-xl transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 shrink-0"
            >
              <SparklePolishIcon size={15} />
              <span>Character Studio</span>
            </button>
            <button
              onClick={() => setActiveModal('edit-profile')}
              className="px-4 py-2 bg-[#5420F5] hover:bg-[#4314E2] text-white text-xs font-black rounded-xl transition-all cursor-pointer shadow-md shadow-[#5420F5]/25 flex items-center gap-1.5 active:scale-95 shrink-0"
            >
              <EditAliasIcon size={16} />
              <span>Edit Profile</span>
            </button>
            <button
              onClick={openAndScrollToSettings}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer shrink-0"
              title="Settings & Safety"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Bio */}
        {user.bio ? (
          <p className="text-xs sm:text-sm text-slate-800 font-medium leading-relaxed">
            {user.bio}
          </p>
        ) : (
          <p className="text-xs text-slate-400 italic">No bio added yet. Tap edit profile to introduce yourself!</p>
        )}

        {/* Interactive Stats Row - Symmetrical 4-Column Grid on Mobile & Desktop */}
        <div className="grid grid-cols-4 gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setFollowModalTab('followers')}
            className="flex flex-col sm:flex-row items-center justify-center sm:gap-1.5 py-1 transition-colors cursor-pointer group text-center"
            title="Tap to see who follows you"
          >
            <span className="font-black text-[#191525] group-hover:text-[#5420F5] tabular-nums text-sm leading-tight">
              {getFollowersForUser(user.username).length.toLocaleString()}
            </span>
            <span className="text-[11px] sm:text-xs text-[#706B7D] group-hover:text-[#5420F5] font-semibold">
              Followers
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFollowModalTab('following')}
            className="flex flex-col sm:flex-row items-center justify-center sm:gap-1.5 py-1 transition-colors cursor-pointer group text-center"
            title="Tap to see who you are following"
          >
            <span className="font-black text-[#191525] group-hover:text-[#5420F5] tabular-nums text-sm leading-tight">
              {getFollowingForUser(user.username).length.toLocaleString()}
            </span>
            <span className="text-[11px] sm:text-xs text-[#706B7D] group-hover:text-[#5420F5] font-semibold">
              Following
            </span>
          </button>

          <button
            type="button"
            onClick={() => setProfileTab('posts')}
            className="flex flex-col sm:flex-row items-center justify-center sm:gap-1.5 py-1 transition-colors cursor-pointer group text-center"
          >
            <span className="font-black text-[#191525] group-hover:text-[#5420F5] tabular-nums text-sm leading-tight">
              {myPosts.length}
            </span>
            <span className="text-[11px] sm:text-xs text-[#706B7D] group-hover:text-[#5420F5] font-semibold">
              Posts
            </span>
          </button>

          <button
            type="button"
            onClick={() => setProfileTab('saved')}
            className="flex flex-col sm:flex-row items-center justify-center sm:gap-1.5 py-1 transition-colors cursor-pointer group text-center"
          >
            <span className="font-black text-[#F52D85] tabular-nums text-sm leading-tight">
              {allSavedPosts.length}
            </span>
            <span className="text-[11px] sm:text-xs text-[#706B7D] group-hover:text-[#F52D85] font-semibold">
              Saved
            </span>
          </button>
        </div>
      </div>

      {/* 3. Student's Active Anonymous Link Callout */}
      <div className="bg-gradient-to-r from-[#F0EBFF] via-white to-[#F0EBFF] border border-[#5420F5]/25 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3.5 text-left w-full sm:w-auto min-w-0">
          <BopoiAnonymousAvatar size="md" idPrefix="profile-active-link-banner" showSparkleBadge />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full shrink-0 ${user.linkActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
              <h4 className="text-sm font-black text-[#191525] truncate">
                {user.linkActive ? 'Your anonymous link is active' : 'Your link is taking a break'}
              </h4>
            </div>
            <p className="text-xs text-[#706B7D] font-mono mt-0.5 truncate">
              bopoi.com/@{user.username}/ask
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
          <button
            onClick={handleCopy}
            className="flex-1 sm:flex-none px-3.5 py-2 bg-white text-[#5420F5] rounded-xl hover:bg-purple-50 border border-[#5420F5]/30 transition-colors cursor-pointer font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs"
          >
            {copied ? <CopiedClipboardIcon size={16} /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied Link!' : 'Copy Link'}</span>
          </button>
          <button
            onClick={() => setActiveView('public-ask')}
            className="flex-1 sm:flex-none px-4 py-2 bg-[#5420F5] hover:bg-[#4314E2] text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95"
            title="Preview how friends view your anonymous link"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Preview</span>
          </button>
        </div>
      </div>

      {/* 4. Profile Content Tabs */}
      <div
        ref={settingsSectionRef}
        className="flex items-center border-b border-[#EAE6F0] pt-1 overflow-x-auto no-scrollbar scroll-mt-20"
      >
        {[
          {
            id: 'posts',
            label: `Posts (${myPosts.length})`,
            icon: <StudentPostsIcon size={15} />,
          },
          {
            id: 'answers',
            label: `Answered Q&A (${myAnswersList.length})`,
            icon: <StoryStudioNavIcon size={15} />,
          },
          {
            id: 'saved',
            label: `Saved Library (${allSavedPosts.length})`,
            icon: <BookmarkedIcon size={15} />,
          },
          {
            id: 'settings',
            label: 'Settings & Safety',
            icon: <ProfileShieldNavIcon size={15} />,
          },
        ].map((tab) => {
          const isActive = profileTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setProfileTab(tab.id as any);
                setSearchQuery('');
              }}
              className={`pb-2.5 px-4 text-xs font-black transition-all relative cursor-pointer shrink-0 inline-flex items-center gap-1.5 ${
                isActive ? 'text-[#5420F5]' : 'text-[#706B7D] hover:text-[#191525]'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#5420F5] rounded-full" />
              )}
            </button>
          );
        })}
      </div>

        {/* ========================================================= */}
        {/* TAB 1: MY POSTS & STUFFS SECTION                          */}
        {/* ========================================================= */}
        {profileTab === 'posts' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
            {/* Header info & Filter Chips */}
            <div className="bg-white rounded-3xl p-5 border border-[#EAE6F0] shadow-xs space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                  <h2 className="text-base font-black text-[#191525] flex items-center gap-1.5">
                    <span>Posts</span>
                    <span className="text-xs text-slate-400 font-normal">
                      ({totalMyItems} published)
                    </span>
                  </h2>
                  <p className="text-xs text-[#706B7D] mt-0.5">
                    All confessions, polls, discussions, and story answers you've shared.
                  </p>
                </div>

                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-3.5 py-2 bg-[#5420F5] hover:bg-[#4314E2] text-white rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs shrink-0 self-start sm:self-center"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>+ Create Post</span>
                </button>
              </div>

              {/* Sub-Filter Pills */}
              <div className="flex items-center gap-2 pt-1 border-t border-slate-100 overflow-x-auto no-scrollbar py-0.5">
                <button
                  onClick={() => setPostFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                    postFilter === 'all'
                      ? 'bg-[#5420F5] text-white shadow-xs'
                      : 'bg-[#FAF9FC] text-slate-600 hover:bg-slate-100 border border-[#EAE6F0]'
                  }`}
                >
                  <span>All</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    postFilter === 'all' ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {totalMyItems}
                  </span>
                </button>

                <button
                  onClick={() => setPostFilter('confessions')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                    postFilter === 'confessions'
                      ? 'bg-[#5420F5] text-white shadow-xs'
                      : 'bg-[#FAF9FC] text-slate-600 hover:bg-slate-100 border border-[#EAE6F0]'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                      postFilter === 'confessions' ? 'bg-white shadow-2xs' : 'bg-purple-50'
                    }`}
                  >
                    <CreateConfessionIcon size={13} />
                  </span>
                  <span>Confessions</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    postFilter === 'confessions' ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {myConfessions.length}
                  </span>
                </button>

                <button
                  onClick={() => setPostFilter('polls')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                    postFilter === 'polls'
                      ? 'bg-[#5420F5] text-white shadow-xs'
                      : 'bg-[#FAF9FC] text-slate-600 hover:bg-slate-100 border border-[#EAE6F0]'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                      postFilter === 'polls' ? 'bg-white shadow-2xs' : 'bg-purple-50'
                    }`}
                  >
                    <CreatePollIcon size={13} />
                  </span>
                  <span>Polls</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    postFilter === 'polls' ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {myPolls.length}
                  </span>
                </button>

                <button
                  onClick={() => setPostFilter('discussions')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                    postFilter === 'discussions'
                      ? 'bg-[#5420F5] text-white shadow-xs'
                      : 'bg-[#FAF9FC] text-slate-600 hover:bg-slate-100 border border-[#EAE6F0]'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                      postFilter === 'discussions' ? 'bg-white shadow-2xs' : 'bg-purple-50'
                    }`}
                  >
                    <CreateDiscussionIcon size={13} />
                  </span>
                  <span>Discussions</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    postFilter === 'discussions' ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {myDiscussions.length}
                  </span>
                </button>

                <button
                  onClick={() => setPostFilter('answers')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                    postFilter === 'answers'
                      ? 'bg-[#5420F5] text-white shadow-xs'
                      : 'bg-[#FAF9FC] text-slate-600 hover:bg-slate-100 border border-[#EAE6F0]'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                      postFilter === 'answers' ? 'bg-white shadow-2xs' : 'bg-purple-50'
                    }`}
                  >
                    <StoryStudioNavIcon size={13} />
                  </span>
                  <span>Answered Q&amp;A</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    postFilter === 'answers' ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {myAnswersList.length}
                  </span>
                </button>
              </div>

              {/* Search bar inside user posts */}
              {totalMyItems > 0 && (
                <div className="relative pt-1">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center mt-0.5">
                    <BopoiSearchIcon size={16} />
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search your posts, topics, or answers..."
                    className="w-full pl-10 pr-4 py-2.5 bg-[#FAF9FC] border border-[#EAE6F0] rounded-xl text-base sm:text-xs text-[#191525] placeholder:text-slate-400 focus:outline-none focus:border-[#5420F5] transition-colors"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-black mt-0.5"
                    >
                      Clear
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Posts & Answers Stream */}
            {filteredMyPosts.length > 0 || filteredMyAnswers.length > 0 ? (
              <div className="space-y-3.5">
                {/* 1. Social Posts (Confessions, Polls, Discussions) */}
                {filteredMyPosts.map((post) => {
                  const isPoll = post.type === 'poll';
                  const isConfession = post.type === 'confession';
                  const isDiscussion = post.type === 'discussion';

                  return (
                    <div
                      key={post.id}
                      onClick={() => handleCardClick(post)}
                      className="bg-white rounded-3xl p-4 sm:p-5 border border-[#EAE6F0] shadow-xs hover:border-[#5420F5]/30 hover:shadow-md transition-all cursor-pointer space-y-3"
                    >
                      {/* Card Author Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          {post.isAnonymous ? (
                            <BopoiAnonymousAvatar size="sm" idPrefix={`mypost-${post.id}`} />
                          ) : (
                            <CampusCharacterAvatar
                              value={post.authorAvatar || user.avatarUrl}
                              seed={post.authorUsername || user.username}
                              size={32}
                              rounded="full"
                            />
                          )}
                          <div>
                            <span className="text-xs font-black text-[#191525] block">
                              {post.isAnonymous ? 'Anonymous' : user.displayName}
                            </span>
                            <span className="text-[10px] text-[#706B7D] block">
                              {post.createdAt} {post.authorCampus && `• ${post.authorCampus}`}
                            </span>
                          </div>
                        </div>

                        {/* Status Badges */}
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[10px] font-black px-2.5 py-0.5 rounded-full capitalize inline-flex items-center gap-1 ${
                              isConfession
                                ? 'bg-purple-100 text-purple-700'
                                : isPoll
                                ? 'bg-orange-100 text-orange-700'
                                : isDiscussion
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-slate-100 text-slate-700'
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

                          {/* Delete my post */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteSocialPost(post.id);
                            }}
                            className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Delete this post"
                          >
                            <DeleteRemoveIcon size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Title if discussion */}
                      {post.title && (
                        <h3 className="text-sm sm:text-base font-black text-[#191525] leading-snug">
                          {post.title}
                        </h3>
                      )}

                      {/* Content */}
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
                            {post.pollTotalVotes || 0} total student votes
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
                          title="Likes"
                        >
                          <Heart className={`w-4 h-4 ${post.hasLiked ? 'fill-[#F52D85]' : ''}`} />
                          <span>{post.likes}</span>
                        </button>

                        {/* Comment */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCardClick(post);
                          }}
                          className="flex items-center gap-1.5 hover:text-[#5420F5] transition-colors cursor-pointer py-1 px-2 rounded-lg hover:bg-[#F0EBFF]"
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span>{post.commentsCount} comments</span>
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

                        {/* Open Detail */}
                        <span className="text-[11px] font-bold text-[#5420F5] hover:underline flex items-center gap-0.5">
                          <span>View Discussion</span>
                          <span>→</span>
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* 2. Answered Story Q&A Cards */}
                {filteredMyAnswers.map((ans) => (
                  <div
                    key={ans.id}
                    onClick={() => handleOpenAnswerStudio(ans)}
                    className="bg-white rounded-3xl p-5 border border-[#EAE6F0] shadow-xs hover:border-[#5420F5]/30 hover:shadow-md transition-all cursor-pointer space-y-3.5 group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-purple-50 text-[#5420F5] flex items-center justify-center">
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-black text-[#191525] block">
                            Story Answer Card
                          </span>
                          <span className="text-[10px] text-[#706B7D] block">
                            {ans.createdAt} · 1080x1350 Canvas Ready
                          </span>
                        </div>
                      </div>

                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                        Public Q&amp;A
                      </span>
                    </div>

                    {/* Question Box */}
                    <div className="p-3 bg-[#FAF9FC] border border-[#EAE6F0] rounded-2xl">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">
                        Anonymous Question
                      </span>
                      <p className="text-xs sm:text-sm font-bold text-[#191525]">
                        "{ans.questionText}"
                      </p>
                    </div>

                    {/* Answer Text */}
                    <div className="pl-1">
                      <p className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed">
                        {ans.answerText}
                      </p>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                      <span className="text-[#F52D85] font-bold flex items-center gap-1">
                        <Heart className="w-3.5 h-3.5 fill-[#F52D85]" />
                        <span>{ans.likes} likes</span>
                      </span>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenAnswerStudio(ans);
                        }}
                        className="py-1 px-3 bg-[#F0EBFF] hover:bg-purple-100 text-[#5420F5] rounded-xl font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open Story Studio</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Empty state */
              <div className="bg-white rounded-3xl p-8 border border-[#EAE6F0] text-center space-y-4 shadow-xs">
                <div className="w-16 h-16 rounded-2xl bg-[#F0EBFF] text-[#5420F5] flex items-center justify-center mx-auto shadow-2xs p-2">
                  {searchQuery ? <SearchEmptyIcon size={44} /> : <CreatePostIcon size={44} />}
                </div>
                <div className="max-w-sm mx-auto space-y-1.5">
                  <h3 className="text-base font-black text-[#191525]">
                    {searchQuery
                      ? 'No posts matching search'
                      : postFilter === 'confessions'
                      ? 'No confessions posted yet'
                      : postFilter === 'polls'
                      ? 'No polls posted yet'
                      : postFilter === 'discussions'
                      ? 'No discussions started yet'
                      : postFilter === 'answers'
                      ? 'No story answers yet'
                      : 'You haven’t posted anything yet'}
                  </h3>
                  <p className="text-xs text-[#706B7D] leading-relaxed">
                    {searchQuery
                      ? `We couldn't find any of your posts matching "${searchQuery}".`
                      : 'Share an anonymous secret, ask the campus a spicy question, or publish an interactive poll!'}
                  </p>
                </div>

                <div className="pt-2 flex flex-wrap items-center justify-center gap-2.5">
                  <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="py-2.5 px-4 bg-[#5420F5] hover:bg-[#4314E2] text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Create Post Now</span>
                    <LaunchTrendingIcon size={15} />
                  </button>
                  <button
                    onClick={() => setActiveView('inbox')}
                    className="py-2.5 px-4 bg-[#FAF9FC] border border-[#EAE6F0] hover:bg-slate-100 text-[#191525] rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <InboxShortcutIcon size={15} />
                    <span>Answer Inbox Messages</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: ANSWERED Q&A SECTION                               */}
        {/* ========================================================= */}
        {profileTab === 'answers' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="bg-white rounded-3xl p-5 border border-[#EAE6F0] shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-black text-[#191525] flex items-center gap-1.5">
                    <span>Answered Q&A</span>
                    <span className="text-xs text-slate-400 font-normal">
                      ({myAnswersList.length} answered)
                    </span>
                  </h2>
                  <p className="text-xs text-[#706B7D] mt-0.5">
                    Anonymous questions you've replied to and shared to your campus story.
                  </p>
                </div>
                <button
                  onClick={() => setActiveView('inbox')}
                  className="px-3.5 py-2 bg-[#5420F5] hover:bg-[#4314E2] text-white rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-xs shrink-0"
                >
                  <span className="w-5 h-5 rounded-full bg-white flex items-center justify-center shrink-0">
                    <InboxShortcutIcon size={13} />
                  </span>
                  <span>Open Inbox</span>
                </button>
              </div>
            </div>

            {myAnswersList.length === 0 ? (
              <div className="text-center py-12 px-4 bg-white rounded-3xl border border-[#EAE6F0] shadow-2xs space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-purple-50 text-[#5420F5] flex items-center justify-center mx-auto shadow-2xs p-2">
                  <StoryStudioNavIcon size={44} />
                </div>
                <h3 className="text-base font-black text-[#191525]">No Answered Questions Yet</h3>
                <p className="text-xs text-[#706B7D] max-w-sm mx-auto">
                  When you receive anonymous messages in your inbox, reply and generate colorful story cards to showcase them here!
                </p>
                <button
                  onClick={() => setActiveView('inbox')}
                  className="py-2.5 px-4 bg-[#5420F5] hover:bg-[#4314E2] text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs inline-flex items-center gap-2"
                >
                  <span className="w-5 h-5 rounded-full bg-white flex items-center justify-center shrink-0">
                    <InboxShortcutIcon size={13} />
                  </span>
                  <span>Check Inbox Messages</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {myAnswersList.map((ans) => (
                  <div
                    key={ans.id}
                    className="bg-white rounded-3xl p-5 border border-[#EAE6F0] shadow-xs space-y-3 hover:border-[#5420F5]/30 hover:shadow-md transition-all"
                  >
                    <div className="bg-[#FAF9FC] border border-[#EAE6F0] rounded-2xl p-3.5">
                      <span className="text-[10px] font-bold text-[#706B7D] inline-flex items-center gap-1 mb-1">
                        <PersonaMaskIcon mask="secret-confession" size={13} />
                        <span>Anonymous Question</span>
                      </span>
                      <p className="text-xs font-bold text-[#191525]">
                        "{ans.questionText}"
                      </p>
                    </div>

                    <div className="bg-[#F0EBFF]/50 rounded-2xl p-3.5 border border-[#5420F5]/20">
                      <span className="text-[10px] font-black text-[#5420F5] inline-flex items-center gap-1 mb-1">
                        <SparklePolishIcon size={13} />
                        <span>Your Answer</span>
                      </span>
                      <p className="text-xs text-slate-800 font-semibold leading-relaxed">
                        "{ans.answerText}"
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-100">
                      <span>Shared to story</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedAnswer(ans);
                            setActiveView('answer-studio');
                          }}
                          className="px-3 py-1.5 bg-[#F0EBFF] hover:bg-purple-100 text-[#5420F5] text-xs font-black rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>View Story Card</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: SAVED & BOOKMARKS SECTION                           */}
        {/* ========================================================= */}
        {profileTab === 'saved' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
            {/* Header info & Filter Chips */}
            <div className="bg-white rounded-3xl p-5 border border-[#EAE6F0] shadow-xs space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-black text-[#191525] flex items-center gap-1.5">
                    <span>Saved Campus Content</span>
                    <span className="text-xs text-slate-400 font-normal">
                      ({currentSavedList.length} items)
                    </span>
                  </h2>
                  <p className="text-xs text-[#706B7D] mt-0.5">
                    Confessions, discussions, and polls you've flagged or liked for later reading.
                  </p>
                </div>
              </div>

              {/* Sub-Filter Pills */}
              <div className="flex items-center gap-2 pt-1 border-t border-slate-100 overflow-x-auto no-scrollbar py-0.5">
                <button
                  onClick={() => setSavedFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                    savedFilter === 'all'
                      ? 'bg-[#5420F5] text-white shadow-xs'
                      : 'bg-[#FAF9FC] text-slate-600 hover:bg-slate-100 border border-[#EAE6F0]'
                  }`}
                >
                  <span>All Saved</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    savedFilter === 'all' ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {allSavedPosts.length}
                  </span>
                </button>

                <button
                  onClick={() => setSavedFilter('bookmarks')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                    savedFilter === 'bookmarks'
                      ? 'bg-[#5420F5] text-white shadow-xs'
                      : 'bg-[#FAF9FC] text-slate-600 hover:bg-slate-100 border border-[#EAE6F0]'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                      savedFilter === 'bookmarks' ? 'bg-white shadow-2xs' : 'bg-purple-50'
                    }`}
                  >
                    <BookmarkedIcon size={13} />
                  </span>
                  <span>Bookmarks</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    savedFilter === 'bookmarks' ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {bookmarkedPosts.length}
                  </span>
                </button>

                <button
                  onClick={() => setSavedFilter('liked')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                    savedFilter === 'liked'
                      ? 'bg-[#5420F5] text-white shadow-xs'
                      : 'bg-[#FAF9FC] text-slate-600 hover:bg-slate-100 border border-[#EAE6F0]'
                  }`}
                >
                  <Heart className="w-3.5 h-3.5" />
                  <span>Liked Content</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    savedFilter === 'liked' ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {likedPosts.length}
                  </span>
                </button>
              </div>

              {/* Search bar inside saved collection */}
              {allSavedPosts.length > 0 && (
                <div className="relative pt-1">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center mt-0.5">
                    <BopoiSearchIcon size={16} />
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search in your saved posts..."
                    className="w-full pl-10 pr-4 py-2.5 bg-[#FAF9FC] border border-[#EAE6F0] rounded-xl text-base sm:text-xs text-[#191525] placeholder:text-slate-400 focus:outline-none focus:border-[#5420F5] transition-colors"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-black mt-0.5"
                    >
                      Clear
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Saved Posts Stream */}
            {filteredSavedPosts.length > 0 ? (
              <div className="space-y-3.5">
                {filteredSavedPosts.map((post) => {
                  const isPoll = post.type === 'poll';
                  const isConfession = post.type === 'confession';
                  const isDiscussion = post.type === 'discussion';

                  return (
                    <div
                      key={post.id}
                      onClick={() => handleCardClick(post)}
                      className="bg-white rounded-3xl p-4 sm:p-5 border border-[#EAE6F0] shadow-xs hover:border-[#5420F5]/30 hover:shadow-md transition-all cursor-pointer space-y-3"
                    >
                      {/* Card Author Header */}
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
                            <BopoiAnonymousAvatar size="sm" idPrefix={`saved-${post.id}`} />
                          ) : (
                            <CampusCharacterAvatar
                              value={post.authorAvatar}
                              seed={post.authorUsername}
                              size={32}
                              rounded="full"
                            />
                          )}
                          <div>
                            <span className="text-xs font-black text-[#191525] block hover:underline">
                              {post.authorName}
                            </span>
                            <span className="text-[10px] text-[#706B7D] block">
                              {post.createdAt} {post.authorCampus && `• ${post.authorCampus}`}
                            </span>
                          </div>
                        </div>

                        {/* Status Badges */}
                        <div className="flex items-center gap-1.5">
                          {post.isBookmarked && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#F0EBFF] text-[#5420F5] flex items-center gap-1">
                              <BookmarkedIcon size={14} />
                              <span>Bookmarked</span>
                            </span>
                          )}
                          <span
                            className={`text-[10px] font-black px-2.5 py-0.5 rounded-full capitalize inline-flex items-center gap-1 ${
                              isConfession
                                ? 'bg-purple-100 text-purple-700'
                                : isPoll
                                ? 'bg-orange-100 text-orange-700'
                                : isDiscussion
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-slate-100 text-slate-700'
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

                      {/* Content */}
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
                          title={post.hasLiked ? 'Unlike post' : 'Like post'}
                        >
                          <Heart className={`w-4 h-4 ${post.hasLiked ? 'fill-[#F52D85]' : ''}`} />
                          <span>{post.likes}</span>
                        </button>

                        {/* Comment */}
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

                        {/* Bookmark Toggle */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePostBookmark(post.id);
                          }}
                          className={`flex items-center gap-1.5 transition-colors cursor-pointer py-1 px-2.5 rounded-lg ${
                            post.isBookmarked
                              ? 'bg-[#F0EBFF] text-[#5420F5] font-bold hover:bg-purple-100'
                              : 'hover:text-[#5420F5] hover:bg-purple-50'
                          }`}
                          title={post.isBookmarked ? 'Remove from Bookmarks' : 'Save Bookmark'}
                        >
                          {post.isBookmarked ? (
                            <BookmarkedIcon size={16} />
                          ) : (
                            <Bookmark className="w-4 h-4" />
                          )}
                          <span className="text-[11px]">{post.isBookmarked ? 'Saved' : 'Save'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Empty state */
              <div className="bg-white rounded-3xl p-8 border border-[#EAE6F0] text-center flex flex-col items-center justify-center space-y-4 shadow-xs">
                <div className="w-16 h-16 rounded-2xl bg-[#F0EBFF] border border-[#5420F5]/15 text-[#5420F5] flex items-center justify-center mx-auto shadow-2xs p-2">
                  {searchQuery ? <SearchEmptyIcon size={44} /> : <BookmarkedIcon size={44} />}
                </div>
                <div className="max-w-sm mx-auto space-y-1.5">
                  <h3 className="text-base font-black text-[#191525]">
                    {searchQuery
                      ? 'No matches found in saved items'
                      : savedFilter === 'bookmarks'
                      ? 'No bookmarked posts yet'
                      : savedFilter === 'liked'
                      ? 'No liked posts yet'
                      : 'Your saved collection is empty'}
                  </h3>
                  <p className="text-xs text-[#706B7D] leading-relaxed">
                    {searchQuery
                      ? `We couldn't find anything matching "${searchQuery}". Try a different keyword.`
                      : 'Flag your favorite campus confessions, insightful discussions, and live polls by tapping the bookmark or heart icon to read them anytime!'}
                  </p>
                </div>

                <div className="pt-2 flex flex-wrap items-center justify-center gap-2.5">
                  <button
                    onClick={() => setActiveView('home')}
                    className="py-2.5 px-4 bg-[#5420F5] hover:bg-[#4314E2] text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs inline-flex items-center gap-1.5"
                  >
                    <LaunchTrendingIcon size={15} />
                    <span>Explore Campus Feed</span>
                  </button>
                  <button
                    onClick={() => setActiveView('confessions')}
                    className="py-2.5 px-4 bg-[#FAF9FC] border border-[#EAE6F0] hover:bg-slate-100 text-[#191525] rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <CreateConfessionIcon size={15} />
                    <span>Browse Confessions</span>
                  </button>
                  <button
                    onClick={() => setActiveView('polls')}
                    className="py-2.5 px-4 bg-[#FAF9FC] border border-[#EAE6F0] hover:bg-slate-100 text-[#191525] rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <CreatePollIcon size={15} />
                    <span>Check Polls</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: ACCOUNT & SAFETY SETTINGS                           */}
        {/* ========================================================= */}
        {profileTab === 'settings' && (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-200">
            {/* Master Toggle: "Link is active" */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#EAE6F0] flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-3.5">
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center p-1.5 shadow-2xs shrink-0 ${
                    user.linkActive
                      ? 'bg-emerald-50 border border-emerald-200'
                      : 'bg-slate-100 border border-slate-200'
                  }`}
                >
                  <GetYourLinkIcon size={26} />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-[#191525]">
                    {user.linkActive ? 'Anonymous link is open' : 'Link is temporarily paused'}
                  </h3>
                  <p className="text-xs text-[#706B7D] mt-0.5">
                    {user.linkActive
                      ? 'Anyone with your link can send you anonymous questions'
                      : 'Visitors are notified that your link is taking a break'}
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={user.linkActive}
                  onChange={toggleLinkActive}
                  className="sr-only peer"
                />
                <div className="w-12 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#18845B]"></div>
              </label>
            </div>

            {/* Settings Navigation Menu */}
            <div className="bg-white rounded-3xl border border-[#EAE6F0] divide-y divide-[#EAE6F0] shadow-xs overflow-hidden">
              <button
                onClick={() => setActiveModal('character-studio')}
                className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <CampusCharacterAvatar
                    value={user.avatarUrl}
                    seed={user.username}
                    size={36}
                    rounded="xl"
                  />
                  <div>
                    <span className="text-sm font-bold text-[#191525] block">
                      Customize 3D Campus Character
                    </span>
                    <span className="text-xs text-[#706B7D]">
                      Design skin tone, hair, headgear, shades &amp; aura backdrop
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => setActiveModal('edit-profile')}
                className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] flex items-center justify-center p-1 shadow-2xs">
                    <EditAliasIcon size={22} />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-[#191525] block">
                      Edit Profile Details
                    </span>
                    <span className="text-xs text-[#706B7D]">Change display name, bio, campus</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => {
                  handleCopy();
                  setActiveView('public-ask');
                }}
                className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] flex items-center justify-center p-1 shadow-2xs">
                    <PublicAskNavIcon size={22} />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-[#191525] block">
                      Link Settings &amp; Preview
                    </span>
                    <span className="text-xs text-[#706B7D]">Preview how visitors experience your link</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => setActiveModal('safety')}
                className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] flex items-center justify-center p-1 shadow-2xs">
                    <ProfileShieldNavIcon size={22} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#191525] block">
                        Safety Shield &amp; Hidden Words
                      </span>
                      <span className="text-[10px] bg-purple-100 text-[#5420F5] font-bold px-2 py-0.5 rounded-full">
                        {safetySettings.hiddenWords.length} words filtered
                      </span>
                    </div>
                    <span className="text-xs text-[#706B7D]">Block harassment words and repeat abusers</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => setActiveModal('help')}
                className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] flex items-center justify-center p-1 shadow-2xs">
                    <ReceiveMessagesIcon size={22} />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-[#191525] block">
                      Help, Privacy &amp; Support
                    </span>
                    <span className="text-xs text-[#706B7D]">Community rules, FAQs &amp; support ticket</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              {(user.isAdmin || user.role === 'admin') && (
                <button
                  onClick={() => setActiveView('admin')}
                  className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-9 h-9 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] flex items-center justify-center p-1 shadow-2xs">
                      <AdminConsoleNavIcon size={22} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#191525]">
                          Bopoi Admin Console
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-[#5420F5] text-[10px] font-bold">
                          Real-Time &amp; RLS
                        </span>
                      </div>
                      <span className="text-xs text-[#706B7D]">Manage users, posts, rooms, convos, reports &amp; 27-table SQL</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              )}

              {/* Legal Policies Strip in Settings */}
              <div className="p-4 sm:p-5 bg-[#FAF9FC] flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-extrabold text-[#191525]">Legal &amp; Campus Policies:</span>
                <div className="flex flex-wrap items-center gap-3 font-bold text-[#5420F5]">
                  <button
                    type="button"
                    onClick={() => openLegalDoc('terms')}
                    className="hover:underline cursor-pointer"
                  >
                    Terms of Service
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => openLegalDoc('privacy')}
                    className="hover:underline cursor-pointer"
                  >
                    Privacy Policy
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => openLegalDoc('guidelines')}
                    className="hover:underline cursor-pointer"
                  >
                    Community Guidelines
                  </button>
                </div>
              </div>
            </div>

            {/* Account Session & Sign Out Card */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#EAE6F0] shadow-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <CampusCharacterAvatar
                  value={user.avatarUrl}
                  seed={user.username}
                  size={38}
                  rounded="full"
                />
                <div className="min-w-0">
                  <span className="text-xs font-black text-[#191525] block truncate">
                    {user.displayName}
                  </span>
                  <span className="text-[11px] text-[#706B7D] block truncate">
                    Signed in as <strong className="text-[#191525]">@{user.username}</strong>
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={logoutAccount}
                className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-extrabold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 1. Edit Profile Modal */}
      {activeModal === 'edit-profile' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#191525]">Edit Profile</h3>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1 text-slate-400 hover:text-black cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-[#EAE6F0] rounded-xl text-base sm:text-sm text-[#191525] focus:outline-none focus:border-[#5420F5]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Bio
                </label>
                <textarea
                  rows={2}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-[#EAE6F0] rounded-xl text-base sm:text-sm text-[#191525] resize-none focus:outline-none focus:border-[#5420F5]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Anonymous Ask Prompt
                </label>
                <input
                  type="text"
                  value={editCustomPrompt}
                  onChange={(e) => setEditCustomPrompt(e.target.value)}
                  placeholder="Ask me anything anonymously..."
                  className="w-full px-3.5 py-2.5 border border-[#EAE6F0] rounded-xl text-base sm:text-sm text-[#191525] focus:outline-none focus:border-[#5420F5]"
                />
                <span className="text-[11px] text-[#706B7D] mt-1 block">
                  Shown on your public anonymous ask link
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  University
                </label>
                <div className="space-y-1.5">
                  {CAMPUS_OPTIONS.map((u) => {
                    const isSelected = editCampus === u.name;
                    return (
                      <button
                        key={u.name}
                        type="button"
                        onClick={() => setEditCampus(u.name)}
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'border-[#5420F5] bg-[#F0EBFF] text-[#191525] font-bold'
                            : 'border-[#EAE6F0] bg-[#FAF9FC] text-[#191525]'
                        }`}
                      >
                        <span className="text-xs sm:text-sm">{u.name}</span>
                        {isSelected && <Check className="w-4 h-4 text-[#5420F5]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="flex-1 py-3 text-xs font-bold text-slate-600 hover:text-black cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-[#5420F5] text-white font-extrabold text-xs rounded-xl shadow-md shadow-[#5420F5]/20 hover:bg-[#4314E2] cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Safety & Privacy Modal (Hidden words filter) */}
      {activeModal === 'safety' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto no-scrollbar">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#191525]">Safety Shield &amp; Hidden Words</h3>
                <p className="text-xs text-[#706B7D] mt-0.5">
                  Prohibit abusive words &amp; protect your inbox automatically
                </p>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1 text-slate-400 hover:text-black cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Add hidden word */}
            <form onSubmit={handleAddWord} className="flex gap-2">
              <input
                type="text"
                value={newWord}
                onChange={(e) => setNewWord(e.target.value)}
                placeholder="Add word to filter (e.g. cheat, idiot)..."
                className="flex-1 px-3.5 py-2 border border-[#EAE6F0] rounded-xl text-xs focus:outline-none focus:border-[#5420F5]"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-[#5420F5] text-white text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer hover:bg-[#4314E2]"
              >
                <Plus className="w-4 h-4" />
                <span>Add</span>
              </button>
            </form>

            <div>
              <span className="text-xs font-bold text-slate-700">Currently Filtered Words:</span>
              <div className="flex flex-wrap gap-2 mt-2">
                {safetySettings.hiddenWords.map((word) => (
                  <span
                    key={word}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-700 text-xs font-semibold rounded-lg border border-red-100"
                  >
                    <span>{word}</span>
                    <button
                      onClick={() => removeHiddenWord(word)}
                      className="hover:text-red-900 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Blocked Senders:</span>
                {safetySettings.blockedSenders.length > 0 && (
                  <button
                    type="button"
                    onClick={clearBlockedSenders}
                    className="text-[11px] font-bold text-[#5420F5] hover:underline cursor-pointer"
                  >
                    Unblock All
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                {safetySettings.blockedSenders.length === 0
                  ? 'No senders currently blocked. You can block any sender directly from message cards.'
                  : `${safetySettings.blockedSenders.length} sender(s) blocked from sending messages.`}
              </p>
              {safetySettings.blockedSenders.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {safetySettings.blockedSenders.map((senderId, idx) => (
                    <span
                      key={senderId}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-700 text-[11px] font-semibold rounded-lg border border-slate-200"
                    >
                      <span>Anonymous Sender #{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => unblockSender(senderId)}
                        className="text-slate-400 hover:text-rose-600 cursor-pointer"
                        title="Unblock sender"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => setActiveModal(null)}
              className="w-full py-2.5 bg-slate-100 text-slate-800 text-xs font-bold rounded-xl hover:bg-slate-200 cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* 3. Help & Support Modal */}
      {activeModal === 'help' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl max-h-[88vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#191525]">Help, Privacy &amp; Support</h3>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1 text-slate-400 hover:text-black cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-slate-600">
              <div className="p-3 bg-slate-50 rounded-2xl">
                <p className="font-bold text-slate-800 text-xs">How does anonymity work?</p>
                <p className="mt-1 leading-relaxed">
                  When someone visits your link, they do not need an account. We protect the sender's identity while rejecting blocked words and spam.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl">
                <p className="font-bold text-slate-800 text-xs">How do I share answers to WhatsApp or Instagram?</p>
                <p className="mt-1 leading-relaxed">
                  Go to any message, type your response, click "Share Studio", and press "Save Image (PNG)". Your 3D campus character and answer save directly to your device!
                </p>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!supportMessage.trim()) {
                  showToast('Please enter a message for support.', 'error');
                  return;
                }
                submitSupportTicket(supportSubject, supportMessage);
                setSupportMessage('');
                setActiveModal(null);
              }}
              className="pt-3 border-t border-[#EAE6F0] space-y-3"
            >
              <div>
                <label className="block text-xs font-bold text-[#191525] mb-1">
                  Contact Campus Safety &amp; Support
                </label>
                <select
                  value={supportSubject}
                  onChange={(e) => setSupportSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#EAE6F0] text-xs font-semibold text-[#191525] bg-[#FAF9FC] focus:outline-none focus:border-[#5420F5]"
                >
                  <option value="General Question">General Question</option>
                  <option value="Safety & Harassment Report">Safety &amp; Harassment Report</option>
                  <option value="Account & Username Help">Account &amp; Username Help</option>
                  <option value="Feature Request / Bug">Feature Request / Bug</option>
                </select>
              </div>

              <textarea
                rows={3}
                value={supportMessage}
                onChange={(e) => setSupportMessage(e.target.value)}
                placeholder="Describe how we can help you..."
                className="w-full p-3 rounded-xl border border-[#EAE6F0] text-xs text-[#191525] bg-[#FAF9FC] focus:outline-none focus:border-[#5420F5] resize-none"
              />

              <button
                type="submit"
                className="w-full py-3 bg-[#5420F5] text-white text-xs font-extrabold rounded-xl hover:bg-[#4314E2] cursor-pointer shadow-xs"
              >
                Send Support Ticket
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 4. Character Studio Modal */}
      <CharacterStudioModal
        isOpen={activeModal === 'character-studio'}
        onClose={() => setActiveModal(null)}
        currentValue={user.avatarUrl}
        fallbackSeed={user.username}
        onSave={(serializedUri) => {
          updateProfile({ avatarUrl: serializedUri });
        }}
      />

      {/* 5. Interactive Followers & Following List Modal */}
      <FollowListModal
        isOpen={followModalTab !== null}
        initialTab={followModalTab || 'followers'}
        targetUsername={user.username}
        targetDisplayName={user.displayName}
        onClose={() => setFollowModalTab(null)}
      />
    </div>
  );
};
