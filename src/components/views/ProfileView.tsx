import React, { useState, useEffect, useMemo } from 'react';
import {
  Settings,
  Copy,
  ChevronRight,
  ChevronLeft,
  School,
  X,
  Plus,
  Trash2,
  Check,
  Heart,
  Share2,
  ExternalLink,
  Sparkles,
  Send,
  Dices,
  LogOut,
  MessageCircle,
  Loader2,
  Sun,
  Moon,
  Bookmark,
} from 'lucide-react';
import { useBopoi } from '../../context/BopoiContext.tsx';
import { MessageAnswer, ModerationReport } from '../../types/index.ts';
import { RegisterView, CAMPUS_OPTIONS } from './RegisterView.tsx';
import { VerifiedCreatorBadge } from '../ui/VerifiedCreatorBadge.tsx';
import { MentionText } from '../ui/MentionText.tsx';
import { FeedPostRow } from '../feed/FeedPostRow.tsx';
import {
  BopoiSearchIcon,
  BookmarkedIcon,
  SearchEmptyIcon,
  EditAliasIcon,
  SparklePolishIcon,
  CreateConfessionIcon,
  CreatePollIcon,
  CreateDiscussionIcon,
  CreatePostIcon,
  LaunchTrendingIcon,
  InboxShortcutIcon,
  ProfileShieldNavIcon,
  StoryStudioNavIcon,
  PublicAskNavIcon,
  GetYourLinkIcon,
  ReceiveMessagesIcon,
  AdminConsoleNavIcon,
  SafetyShieldBadgeIcon,
} from '../brand/icons/index.ts';
import { PersonaMaskIcon } from '../brand/masks/PersonaMaskIcon.tsx';
import {
  CampusCharacterAvatar,
  CharacterStudioModal,
  randomizeCharacterConfig,
  serializeCharacterConfig,
} from '../brand/character/index.ts';
import { FollowListModal } from '../modals/FollowListModal.tsx';
import { ReportCaseChatModal } from '../modals/ReportCaseChatModal.tsx';
import {
  getReportThreadMessages,
  getUnreadReportCountForReporter,
  getReportTypeLabel,
} from '../../lib/reportChat.ts';

interface ProfileViewProps {
  initialTab?: 'posts' | 'answers' | 'saved' | 'settings';
}

export const ProfileView: React.FC<ProfileViewProps> = ({ initialTab = 'posts' }) => {
  const {
    user,
    accounts,
    socialPosts,
    answers,
    setSelectedAnswer,
    deleteSocialPost,
    safetySettings,
    toggleLinkActive,
    copyUserLink,
    updateProfile,
    addHiddenWord,
    removeHiddenWord,
    unblockSender,
    clearBlockedSenders,
    submitSupportTicket,
    openTicketInSettings,
    userModerationReports,
    unreadReportsCount,
    activeReportTicketId,
    setActiveReportTicketId,
    openReportModal,
    setActiveView,
    goBack,
    setIsCreateModalOpen,
    showToast,
    logoutAccount,
    openLegalDoc,
    isAuthenticated,
    getFollowersForUser,
    getFollowingForUser,
    requestConfirm,
    theme,
    setTheme,
  } = useBopoi();

  const [profileTab, setProfileTab] = useState<'posts' | 'answers' | 'saved'>(
    initialTab === 'settings' ? 'posts' : initialTab
  );
  const [settingsDrawerOpen, setSettingsDrawerOpen] = useState<boolean>(
    initialTab === 'settings'
  );
  const [postFilter, setPostFilter] = useState<
    'all' | 'confessions' | 'polls' | 'discussions' | 'answers'
  >('all');
  const [savedFilter, setSavedFilter] = useState<'all' | 'bookmarks' | 'liked'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [activeModal, setActiveModal] = useState<
    'edit-profile' | 'character-studio' | 'safety' | 'help' | 'tickets' | null
  >(null);
  const [activeChatTicket, setActiveChatTicket] = useState<ModerationReport | null>(null);
  const [followModalTab, setFollowModalTab] = useState<'followers' | 'following' | null>(null);

  const [copied, setCopied] = useState(false);

  // Edit profile form state
  const [editName, setEditName] = useState(user.displayName);
  const [editBio, setEditBio] = useState(user.bio);
  const [editCampus, setEditCampus] = useState(user.campus || 'Chrisland University');
  const [editCustomPrompt, setEditCustomPrompt] = useState(
    user.customPrompt || "There's something you've been wanting to ask..."
  );

  // Hidden word & support ticket state
  const [newWord, setNewWord] = useState('');
  const [supportSubject, setSupportSubject] = useState('General Question');
  const [supportMessage, setSupportMessage] = useState('');
  const [saveProfileStage, setSaveProfileStage] = useState<'idle' | 'saving' | 'confirmed'>('idle');
  const [supportStage, setSupportStage] = useState<'idle' | 'sending' | 'confirmed'>('idle');

  const pendingTicketsCount = userModerationReports.filter((r) => r.status === 'pending').length;

  const verifiedUsernameSet = useMemo(() => {
    const set = new Set<string>();
    for (const u of accounts || []) {
      if (u.isVerified || u.isCreator) {
        set.add(u.username.toLowerCase());
      }
    }
    return set;
  }, [accounts]);

  useEffect(() => {
    if (initialTab === 'settings') {
      setSettingsDrawerOpen(true);
    } else if (initialTab === 'posts' || initialTab === 'answers' || initialTab === 'saved') {
      setProfileTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    if (!activeReportTicketId) return;
    setSettingsDrawerOpen(true);
    setActiveModal('tickets');
    if (activeReportTicketId !== '__LIST__') {
      const found = userModerationReports.find((r) => r.id === activeReportTicketId);
      if (found) {
        setActiveChatTicket(found);
      }
    }
    setActiveReportTicketId(null);
  }, [activeReportTicketId, userModerationReports, setActiveReportTicketId]);

  useEffect(() => {
    if (!settingsDrawerOpen && !activeModal) return;
    if (activeChatTicket || activeModal === 'character-studio' || followModalTab) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (activeModal) {
        if (activeModal === 'edit-profile' && saveProfileStage !== 'idle') return;
        if (activeModal === 'help' && supportStage !== 'idle') return;
        e.preventDefault();
        setActiveModal(null);
      } else if (settingsDrawerOpen) {
        e.preventDefault();
        setSettingsDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    settingsDrawerOpen,
    activeModal,
    activeChatTicket,
    followModalTab,
    saveProfileStage,
    supportStage,
  ]);

  if (!isAuthenticated || !user.username || user.username === 'student') {
    return <RegisterView initialMode="login" />;
  }

  // 1. User's Own Posts
  const myPosts = socialPosts.filter(
    (p) =>
      p.authorUserId === user.id ||
      p.authorUsername.toLowerCase() === user.username.toLowerCase() ||
      (p.authorName.toLowerCase() === user.displayName.toLowerCase() && !p.isAnonymous)
  );

  const myConfessions = myPosts.filter((p) => p.type === 'confession');
  const myPolls = myPosts.filter((p) => p.type === 'poll');
  const myDiscussions = myPosts.filter((p) => p.type === 'discussion' || p.type === 'post');

  const myAnswersList: MessageAnswer[] = Object.values(answers).filter(
    (a) => !a.isDraft && (a.authorUsername === user.username || !a.authorUsername)
  );

  const totalMyItems = myPosts.length + myAnswersList.length;

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

  // 2. Saved & Liked Items
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

  const handleShareProfile = () => {
    const url = `${window.location.origin}/?ask=${user.username}#public-ask`;
    if (navigator.share) {
      navigator
        .share({
          title: `${user.displayName} on Bopoi`,
          text: `Send me anonymous messages on Bopoi!`,
          url,
        })
        .catch(() => {});
    } else {
      handleCopy();
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (saveProfileStage !== 'idle') return;
    setSaveProfileStage('saving');
    setTimeout(() => {
      updateProfile({
        displayName: editName.trim(),
        bio: editBio.trim(),
        campus: editCampus.trim(),
        customPrompt:
          editCustomPrompt.trim() || "There's something you've been wanting to ask...",
      });
      setSaveProfileStage('confirmed');
      setTimeout(() => {
        setSaveProfileStage('idle');
        setActiveModal(null);
      }, 480);
    }, 360);
  };

  const handleAddWord = (e: React.FormEvent) => {
    e.preventDefault();
    if (newWord.trim()) {
      addHiddenWord(newWord.trim());
      setNewWord('');
    }
  };

  const handleOpenAnswerStudio = (ans: MessageAnswer) => {
    setSelectedAnswer(ans);
    setActiveView('answer-studio');
  };

  return (
    <div className="w-full flex flex-col bg-white dark:bg-[#0E0C14] text-[#191525] dark:text-[#F4F2FA] pb-12">
      {/* 1. Sticky Top Header */}
      <div className="sticky top-[52px] lg:top-0 z-20 bg-white/95 dark:bg-[#0E0C14]/95 backdrop-blur-md border-b border-[#EAE6F0] dark:border-[#262036] px-4 sm:px-5 h-[52px] flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => goBack('home')}
          className="min-h-[44px] -ml-2 px-2 rounded-full hover:bg-[#FAF9FC] dark:hover:bg-[#171322] text-[#191525] dark:text-[#F4F2FA] transition-colors cursor-pointer flex items-center gap-1"
          title="Go back"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-xs font-bold hidden sm:inline">Back</span>
        </button>

        <h1 className="text-sm sm:text-base font-black text-[#191525] dark:text-[#F4F2FA] truncate">
          @{user.username}
        </h1>

        <div className="flex items-center gap-0.5 -mr-2">
          <button
            type="button"
            onClick={handleShareProfile}
            className="min-h-[44px] min-w-[44px] rounded-full hover:bg-[#FAF9FC] dark:hover:bg-[#171322] text-[#191525] dark:text-[#F4F2FA] transition-colors cursor-pointer flex items-center justify-center"
            title="Share profile link"
            aria-label="Share profile link"
          >
            <Share2 className="w-[18px] h-[18px]" />
          </button>
          <button
            type="button"
            onClick={() => setSettingsDrawerOpen(true)}
            className="relative min-h-[44px] min-w-[44px] rounded-full hover:bg-[#FAF9FC] dark:hover:bg-[#171322] text-[#191525] dark:text-[#F4F2FA] transition-colors cursor-pointer flex items-center justify-center"
            title="Settings & Safety"
            aria-label="Settings & Safety"
          >
            <Settings className="w-[18px] h-[18px]" />
            {unreadReportsCount > 0 && (
              <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[#F52D85]" />
            )}
          </button>
        </div>
      </div>

      {/* 2. Threads-Style Asymmetric Profile Header */}
      <section className="px-4 sm:px-5 pt-5 pb-4 space-y-3.5 border-b border-[#EAE6F0] dark:border-[#262036]">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-black text-[#191525] dark:text-[#F4F2FA] tracking-tight">
                {user.displayName}
              </h2>
              <VerifiedCreatorBadge
                isVerified={Boolean(user.isVerified || user.isCreator)}
                username={user.username}
                size={18}
              />
            </div>

            <p className="text-xs sm:text-sm text-[#706B7D] dark:text-[#9E97B3] font-semibold">
              @{user.username}
            </p>

            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5420F5] dark:text-[#8E6BFF] pt-0.5">
              <School className="w-3.5 h-3.5 shrink-0" />
              <span>{user.campus || 'Nigerian University Student'}</span>
            </div>
          </div>

          {/* 3D Customizable Campus Character Avatar + Dice */}
          <div className="relative shrink-0">
            <CampusCharacterAvatar
              value={user.avatarUrl}
              seed={user.username}
              size={72}
              rounded="full"
              showRing
              onClick={() => setActiveModal('character-studio')}
              title="Click to customize your 3D character"
              className="ring-1 ring-[#EAE6F0] dark:ring-[#262036] hover:scale-105 transition-transform"
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
              aria-label="Randomize 3D Character"
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#5420F5] text-white border-2 border-white dark:border-[#0E0C14] shadow-sm flex items-center justify-center hover:bg-[#4314E2] cursor-pointer transition-transform active:scale-90"
            >
              <Dices className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Bio */}
        {user.bio ? (
          <p className="text-sm text-[#191525] dark:text-[#F4F2FA] font-medium leading-relaxed">
            <MentionText text={user.bio} />
          </p>
        ) : (
          <p className="text-xs text-[#706B7D] dark:text-[#9E97B3] italic">
            No bio added yet. Tap Edit Profile to introduce yourself.
          </p>
        )}

        {/* Interactive Stats Row */}
        <div className="grid grid-cols-4 gap-2 pt-1 text-center sm:text-left tabular-nums">
          <button
            type="button"
            onClick={() => setFollowModalTab('followers')}
            className="min-h-[40px] flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-1.5 cursor-pointer group"
          >
            <span className="font-black text-[#191525] dark:text-[#F4F2FA] group-hover:text-[#5420F5] dark:group-hover:text-[#8E6BFF] text-sm">
              {getFollowersForUser(user.username).length.toLocaleString()}
            </span>
            <span className="text-[11px] sm:text-xs text-[#706B7D] dark:text-[#9E97B3] font-semibold">
              Followers
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFollowModalTab('following')}
            className="min-h-[40px] flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-1.5 cursor-pointer group"
          >
            <span className="font-black text-[#191525] dark:text-[#F4F2FA] group-hover:text-[#5420F5] dark:group-hover:text-[#8E6BFF] text-sm">
              {getFollowingForUser(user.username).length.toLocaleString()}
            </span>
            <span className="text-[11px] sm:text-xs text-[#706B7D] dark:text-[#9E97B3] font-semibold">
              Following
            </span>
          </button>

          <button
            type="button"
            onClick={() => setProfileTab('posts')}
            className="min-h-[40px] flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-1.5 cursor-pointer group"
          >
            <span className="font-black text-[#191525] dark:text-[#F4F2FA] group-hover:text-[#5420F5] dark:group-hover:text-[#8E6BFF] text-sm">
              {myPosts.length}
            </span>
            <span className="text-[11px] sm:text-xs text-[#706B7D] dark:text-[#9E97B3] font-semibold">
              Posts
            </span>
          </button>

          <button
            type="button"
            onClick={() => setProfileTab('saved')}
            className="min-h-[40px] flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-1.5 cursor-pointer group"
          >
            <span className="font-black text-[#F52D85] text-sm">
              {allSavedPosts.length}
            </span>
            <span className="text-[11px] sm:text-xs text-[#706B7D] dark:text-[#9E97B3] font-semibold">
              Saved
            </span>
          </button>
        </div>

        {/* Dual Equal-Width Threads Buttons */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <button
            type="button"
            onClick={() => setActiveModal('edit-profile')}
            className="min-h-[44px] px-4 py-2.5 bg-[#FAF9FC] dark:bg-[#171322] hover:bg-slate-100 dark:hover:bg-[#231942] border border-[#EAE6F0] dark:border-[#262036] text-[#191525] dark:text-[#F4F2FA] text-xs sm:text-sm font-black rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <EditAliasIcon size={16} />
            <span>Edit Profile</span>
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="min-h-[44px] px-4 py-2.5 bg-[#5420F5] hover:bg-[#4314E2] text-white text-xs sm:text-sm font-black rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            {copied ? <Check className="w-4 h-4 shrink-0" /> : <Copy className="w-4 h-4 shrink-0" />}
            <span>{copied ? 'Link Copied!' : 'Share Ask Link'}</span>
          </button>
        </div>

        {/* Instagram-Style Profile Highlights Shelf */}
        <div className="pt-2 -mx-4 sm:-mx-5 px-4 sm:px-5 flex items-start gap-4 overflow-x-auto no-scrollbar">
          {/* Highlight 1: Ask Link Preview */}
          <button
            type="button"
            onClick={() => setActiveView('public-ask')}
            className="flex flex-col items-center gap-1.5 w-[64px] shrink-0 cursor-pointer group"
          >
            <div className="p-[2.5px] rounded-full bg-gradient-to-tr from-[#5420F5] via-[#9D50FF] to-[#F52D85] group-hover:scale-105 transition-transform">
              <div className="w-[54px] h-[54px] rounded-full bg-white dark:bg-[#0E0C14] border-2 border-white dark:border-[#0E0C14] flex items-center justify-center text-[#5420F5] dark:text-[#8E6BFF]">
                <Send className="w-5 h-5" />
              </div>
            </div>
            <span className="text-[11px] font-bold text-[#191525] dark:text-[#F4F2FA] truncate w-full text-center">
              Ask Link
            </span>
          </button>

          {/* Highlight 2: Story Studio / Q&A */}
          <button
            type="button"
            onClick={() => {
              if (myAnswersList.length > 0) {
                handleOpenAnswerStudio(myAnswersList[0]);
              } else {
                setActiveView('inbox');
              }
            }}
            className="flex flex-col items-center gap-1.5 w-[64px] shrink-0 cursor-pointer group"
          >
            <div className="p-[2.5px] rounded-full bg-gradient-to-tr from-[#F52D85] to-[#FF9F43] group-hover:scale-105 transition-transform">
              <div className="w-[54px] h-[54px] rounded-full bg-white dark:bg-[#0E0C14] border-2 border-white dark:border-[#0E0C14] flex items-center justify-center text-[#F52D85]">
                <Sparkles className="w-5 h-5" />
              </div>
            </div>
            <span className="text-[11px] font-bold text-[#191525] dark:text-[#F4F2FA] truncate w-full text-center">
              Story Cards
            </span>
          </button>

          {/* Highlight 3: 3D Avatar Studio */}
          <button
            type="button"
            onClick={() => setActiveModal('character-studio')}
            className="flex flex-col items-center gap-1.5 w-[64px] shrink-0 cursor-pointer group"
          >
            <div className="p-[2.5px] rounded-full bg-[#EAE6F0] dark:bg-[#262036] group-hover:bg-[#5420F5] transition-colors">
              <div className="w-[54px] h-[54px] rounded-full bg-white dark:bg-[#0E0C14] border-2 border-white dark:border-[#0E0C14] flex items-center justify-center text-[#5420F5] dark:text-[#8E6BFF]">
                <SparklePolishIcon size={20} />
              </div>
            </div>
            <span className="text-[11px] font-bold text-[#191525] dark:text-[#F4F2FA] truncate w-full text-center">
              3D Studio
            </span>
          </button>

          {/* Highlight 4: Saved Vault */}
          <button
            type="button"
            onClick={() => setProfileTab('saved')}
            className="flex flex-col items-center gap-1.5 w-[64px] shrink-0 cursor-pointer group"
          >
            <div className="p-[2.5px] rounded-full bg-[#EAE6F0] dark:bg-[#262036] group-hover:bg-[#5420F5] transition-colors">
              <div className="w-[54px] h-[54px] rounded-full bg-white dark:bg-[#0E0C14] border-2 border-white dark:border-[#0E0C14] flex items-center justify-center text-[#191525] dark:text-[#F4F2FA]">
                <Bookmark className="w-5 h-5" />
              </div>
            </div>
            <span className="text-[11px] font-bold text-[#191525] dark:text-[#F4F2FA] truncate w-full text-center">
              Saved ({allSavedPosts.length})
            </span>
          </button>

          {/* Highlight 5+: Recent Answered Q&A Story Cards */}
          {myAnswersList.slice(0, 3).map((ans, idx) => (
            <button
              key={ans.id}
              type="button"
              onClick={() => handleOpenAnswerStudio(ans)}
              className="flex flex-col items-center gap-1.5 w-[64px] shrink-0 cursor-pointer group"
              title={ans.questionText}
            >
              <div className="p-[2px] rounded-full bg-[#EAE6F0] dark:bg-[#262036] group-hover:bg-[#5420F5] transition-colors">
                <div className="w-[54px] h-[54px] rounded-full bg-[#FAF9FC] dark:bg-[#171322] border-2 border-white dark:border-[#0E0C14] flex items-center justify-center px-1.5 text-center">
                  <span className="text-[9px] font-black text-[#191525] dark:text-[#F4F2FA] line-clamp-2 leading-tight">
                    Q&amp;A #{idx + 1}
                  </span>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-[#706B7D] dark:text-[#9E97B3] truncate w-full text-center">
                {ans.createdAt}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* 3. Sticky 3-Column Underline Profile Tabs (Posts | Q&A | Saved) */}
      <div className="sticky top-[104px] lg:top-[52px] z-10 bg-white/95 dark:bg-[#0E0C14]/95 backdrop-blur-md grid grid-cols-3 border-b border-[#EAE6F0] dark:border-[#262036]">
        {[
          { id: 'posts' as const, label: `Posts (${myPosts.length})` },
          { id: 'answers' as const, label: `Q&A (${myAnswersList.length})` },
          { id: 'saved' as const, label: `Saved (${allSavedPosts.length})` },
        ].map((tab) => {
          const isActive = profileTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setProfileTab(tab.id);
                setSearchQuery('');
              }}
              className={`min-h-[44px] py-2.5 px-2 text-xs sm:text-sm font-black transition-colors relative cursor-pointer hover:bg-[#FAF9FC] dark:hover:bg-[#171322] inline-flex items-center justify-center gap-1 tabular-nums truncate ${
                isActive
                  ? 'text-[#191525] dark:text-[#F4F2FA]'
                  : 'text-[#706B7D] dark:text-[#9E97B3]'
              }`}
            >
              <span className="truncate">{tab.label}</span>
              {isActive && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-[3px] bg-[#5420F5] rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================= */}
      {/* TAB 1: MY POSTS                                           */}
      {/* ========================================================= */}
      {profileTab === 'posts' && (
        <div className="flex flex-col">
          {/* Sub-filter & Search Strip */}
          <div className="px-4 sm:px-5 py-3 border-b border-[#EAE6F0] dark:border-[#262036] space-y-2.5 bg-[#FAF9FC]/40 dark:bg-[#171322]/40">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                {[
                  { id: 'all' as const, label: `All (${totalMyItems})`, icon: null },
                  {
                    id: 'confessions' as const,
                    label: `Confessions (${myConfessions.length})`,
                    icon: <CreateConfessionIcon size={13} />,
                  },
                  {
                    id: 'polls' as const,
                    label: `Polls (${myPolls.length})`,
                    icon: <CreatePollIcon size={13} />,
                  },
                  {
                    id: 'discussions' as const,
                    label: `Discussions (${myDiscussions.length})`,
                    icon: <CreateDiscussionIcon size={13} />,
                  },
                  {
                    id: 'answers' as const,
                    label: `Q&A (${myAnswersList.length})`,
                    icon: <StoryStudioNavIcon size={13} />,
                  },
                ].map((f) => {
                  const isActive = postFilter === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setPostFilter(f.id)}
                      className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 tabular-nums whitespace-nowrap ${
                        isActive
                          ? 'bg-[#191525] dark:bg-[#F4F2FA] text-white dark:text-[#191525]'
                          : 'bg-white dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] text-[#706B7D] dark:text-[#9E97B3] hover:text-[#191525] dark:hover:text-[#F4F2FA]'
                      }`}
                    >
                      {f.icon}
                      <span>{f.label}</span>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="min-h-[38px] px-3 py-1.5 bg-[#5420F5] hover:bg-[#4314E2] text-white rounded-xl text-xs font-black transition-colors cursor-pointer flex items-center gap-1 shrink-0 whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.75]" />
                <span>New</span>
              </button>
            </div>

            {totalMyItems > 0 && (
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center">
                  <BopoiSearchIcon size={15} />
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search your posts, topics, or answers..."
                  className="w-full pl-9 pr-14 py-2 bg-white dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] rounded-xl text-base sm:text-xs text-[#191525] dark:text-[#F4F2FA] placeholder:text-slate-400 focus:outline-none focus:border-[#5420F5]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#706B7D] dark:text-[#9E97B3] hover:text-[#191525] dark:hover:text-[#F4F2FA] cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
            )}
          </div>

          {filteredMyPosts.length > 0 || filteredMyAnswers.length > 0 ? (
            <div className="flex flex-col">
              {filteredMyPosts.map((post) => (
                <FeedPostRow
                  key={post.id}
                  post={post}
                  verifiedUsernameSet={verifiedUsernameSet}
                  showDeleteButton={true}
                  onDelete={(id) => deleteSocialPost(id)}
                />
              ))}

              {filteredMyAnswers.length > 0 && (
                <div className="divide-y divide-[#EAE6F0] dark:divide-[#262036] border-b border-[#EAE6F0] dark:border-[#262036]">
                  {filteredMyAnswers.map((ans) => (
                    <div
                      key={ans.id}
                      onClick={() => handleOpenAnswerStudio(ans)}
                      className="px-4 sm:px-5 py-4 hover:bg-[#FAF9FC] dark:hover:bg-[#171322]/60 transition-colors cursor-pointer space-y-3"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-[#5420F5] dark:text-[#8E6BFF]" />
                          <span className="font-black text-[#191525] dark:text-[#F4F2FA]">
                            Story Answer Card
                          </span>
                          <span className="text-[#706B7D] dark:text-[#9E97B3]">
                            · {ans.createdAt}
                          </span>
                        </div>
                        <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                          Public Q&amp;A
                        </span>
                      </div>

                      <div className="p-3.5 bg-[#FAF9FC] dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] rounded-2xl">
                        <span className="text-[11px] font-bold text-[#706B7D] dark:text-[#9E97B3] block mb-0.5">
                          Anonymous Question
                        </span>
                        <p className="text-xs sm:text-sm font-bold text-[#191525] dark:text-[#F4F2FA]">
                          &ldquo;<MentionText text={ans.questionText} />&rdquo;
                        </p>
                      </div>

                      <p className="text-xs sm:text-sm text-[#191525] dark:text-[#F4F2FA] font-medium leading-relaxed">
                        <MentionText text={ans.answerText} />
                      </p>

                      <div className="flex items-center justify-between text-xs pt-1 tabular-nums">
                        <span className="text-[#F52D85] font-bold flex items-center gap-1">
                          <Heart className="w-3.5 h-3.5 fill-[#F52D85]" />
                          <span>{ans.likes} likes</span>
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenAnswerStudio(ans);
                          }}
                          className="min-h-[38px] px-3 py-1 bg-[#F0EBFF] dark:bg-[#231942] hover:bg-[#5420F5] text-[#5420F5] dark:text-[#B9A4FF] hover:text-white rounded-xl font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Open Story Studio</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="px-6 py-14 text-center space-y-3.5 border-b border-[#EAE6F0] dark:border-[#262036]">
              <div className="w-12 h-12 rounded-2xl bg-[#FAF9FC] dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] flex items-center justify-center mx-auto p-2">
                {searchQuery ? <SearchEmptyIcon size={32} /> : <CreatePostIcon size={32} />}
              </div>
              <div className="max-w-xs mx-auto space-y-1">
                <h3 className="text-sm sm:text-base font-black text-[#191525] dark:text-[#F4F2FA]">
                  {searchQuery ? 'No posts matching search' : 'You haven’t posted anything yet'}
                </h3>
                <p className="text-xs text-[#706B7D] dark:text-[#9E97B3] leading-relaxed">
                  {searchQuery
                    ? `We couldn't find any of your posts matching "${searchQuery}".`
                    : 'Share an anonymous secret, start a campus discussion, or launch an interactive poll!'}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(true)}
                  className="min-h-[44px] py-2 px-4 bg-[#5420F5] hover:bg-[#4314E2] text-white rounded-xl text-xs font-black transition-colors cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.75]" />
                  <span>Create Post</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveView('inbox')}
                  className="min-h-[44px] py-2 px-4 bg-[#FAF9FC] dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] hover:bg-slate-100 dark:hover:bg-[#231942] text-[#191525] dark:text-[#F4F2FA] rounded-xl text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5"
                >
                  <InboxShortcutIcon size={15} />
                  <span>Answer Inbox</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: ANSWERED Q&A                                       */}
      {/* ========================================================= */}
      {profileTab === 'answers' && (
        <div className="flex flex-col">
          <div className="px-4 sm:px-5 py-3.5 border-b border-[#EAE6F0] dark:border-[#262036] flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-black text-[#191525] dark:text-[#F4F2FA]">
                Answered Q&amp;A ({myAnswersList.length})
              </h2>
              <p className="text-xs text-[#706B7D] dark:text-[#9E97B3]">
                Anonymous questions you've replied to for your campus story
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveView('inbox')}
              className="min-h-[40px] px-3.5 py-2 bg-[#5420F5] hover:bg-[#4314E2] text-white rounded-xl text-xs font-extrabold transition-colors cursor-pointer shrink-0"
            >
              Open Inbox
            </button>
          </div>

          {myAnswersList.length === 0 ? (
            <div className="px-6 py-14 text-center space-y-3 border-b border-[#EAE6F0] dark:border-[#262036]">
              <div className="w-12 h-12 rounded-2xl bg-[#FAF9FC] dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] flex items-center justify-center mx-auto p-2">
                <StoryStudioNavIcon size={32} />
              </div>
              <h3 className="text-sm sm:text-base font-black text-[#191525] dark:text-[#F4F2FA]">
                No Answered Questions Yet
              </h3>
              <p className="text-xs text-[#706B7D] dark:text-[#9E97B3] max-w-xs mx-auto">
                Reply to anonymous questions in your inbox and generate 1080×1350 story cards.
              </p>
              <button
                type="button"
                onClick={() => setActiveView('inbox')}
                className="min-h-[44px] py-2 px-4 bg-[#5420F5] hover:bg-[#4314E2] text-white rounded-xl text-xs font-extrabold transition-colors cursor-pointer"
              >
                Check Inbox Messages
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[#EAE6F0] dark:divide-[#262036] border-b border-[#EAE6F0] dark:border-[#262036]">
              {myAnswersList.map((ans) => (
                <div key={ans.id} className="px-4 sm:px-5 py-4 space-y-3">
                  <div className="bg-[#FAF9FC] dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] rounded-2xl p-3.5">
                    <span className="text-[11px] font-bold text-[#706B7D] dark:text-[#9E97B3] inline-flex items-center gap-1 mb-1">
                      <PersonaMaskIcon mask="secret-confession" size={13} />
                      <span>Anonymous Question</span>
                    </span>
                    <p className="text-xs sm:text-sm font-bold text-[#191525] dark:text-[#F4F2FA]">
                      &ldquo;<MentionText text={ans.questionText} />&rdquo;
                    </p>
                  </div>

                  <div className="bg-[#FAF8FF] dark:bg-[#231942]/50 rounded-2xl p-3.5 border border-[#5420F5]/20 dark:border-[#5420F5]/35">
                    <span className="text-[11px] font-black text-[#5420F5] dark:text-[#B9A4FF] block mb-1">
                      Your Answer
                    </span>
                    <p className="text-xs sm:text-sm text-[#191525] dark:text-[#F4F2FA] font-semibold leading-relaxed">
                      &ldquo;<MentionText text={ans.answerText} />&rdquo;
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-xs text-[#706B7D] dark:text-[#9E97B3] pt-1">
                    <span>Shared to story</span>
                    <button
                      type="button"
                      onClick={() => handleOpenAnswerStudio(ans)}
                      className="min-h-[38px] px-3 py-1.5 bg-[#F0EBFF] dark:bg-[#231942] hover:bg-[#5420F5] text-[#5420F5] dark:text-[#B9A4FF] hover:text-white text-xs font-black rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>View Story Card</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: SAVED & BOOKMARKS                                  */}
      {/* ========================================================= */}
      {profileTab === 'saved' && (
        <div className="flex flex-col">
          <div className="px-4 sm:px-5 py-3 border-b border-[#EAE6F0] dark:border-[#262036] space-y-2.5 bg-[#FAF9FC]/40 dark:bg-[#171322]/40">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {[
                { id: 'all' as const, label: `All Saved (${allSavedPosts.length})` },
                { id: 'bookmarks' as const, label: `Bookmarks (${bookmarkedPosts.length})` },
                { id: 'liked' as const, label: `Liked (${likedPosts.length})` },
              ].map((f) => {
                const isActive = savedFilter === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setSavedFilter(f.id)}
                    className={`min-h-[36px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 tabular-nums whitespace-nowrap ${
                      isActive
                        ? 'bg-[#191525] dark:bg-[#F4F2FA] text-white dark:text-[#191525]'
                        : 'bg-white dark:bg-[#171322] text-[#706B7D] dark:text-[#9E97B3] hover:text-[#191525] dark:hover:text-[#F4F2FA] border border-[#EAE6F0] dark:border-[#262036]'
                    }`}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>

            {allSavedPosts.length > 0 && (
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center">
                  <BopoiSearchIcon size={15} />
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search in your saved posts..."
                  className="w-full pl-9 pr-14 py-2 bg-white dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] rounded-xl text-base sm:text-xs text-[#191525] dark:text-[#F4F2FA] placeholder:text-slate-400 focus:outline-none focus:border-[#5420F5]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#706B7D] dark:text-[#9E97B3] hover:text-[#191525] dark:hover:text-[#F4F2FA] cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
            )}
          </div>

          {filteredSavedPosts.length > 0 ? (
            <div className="flex flex-col">
              {filteredSavedPosts.map((post) => (
                <FeedPostRow
                  key={post.id}
                  post={post}
                  verifiedUsernameSet={verifiedUsernameSet}
                />
              ))}
            </div>
          ) : (
            <div className="px-6 py-14 text-center flex flex-col items-center justify-center space-y-3 border-b border-[#EAE6F0] dark:border-[#262036]">
              <div className="w-12 h-12 rounded-2xl bg-[#FAF9FC] dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] flex items-center justify-center p-2">
                {searchQuery ? <SearchEmptyIcon size={32} /> : <BookmarkedIcon size={32} />}
              </div>
              <div className="max-w-xs mx-auto space-y-1">
                <h3 className="text-sm sm:text-base font-black text-[#191525] dark:text-[#F4F2FA]">
                  {searchQuery
                    ? 'No matches found in saved items'
                    : savedFilter === 'bookmarks'
                    ? 'No bookmarked posts yet'
                    : savedFilter === 'liked'
                    ? 'No liked posts yet'
                    : 'Your saved collection is empty'}
                </h3>
                <p className="text-xs text-[#706B7D] dark:text-[#9E97B3] leading-relaxed">
                  Bookmark or like confessions, polls, and discussions from the feed to revisit them here.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveView('home')}
                className="min-h-[44px] py-2 px-4 bg-[#5420F5] hover:bg-[#4314E2] text-white rounded-xl text-xs font-black transition-colors cursor-pointer inline-flex items-center gap-1.5"
              >
                <LaunchTrendingIcon size={15} />
                <span>Explore Campus Feed</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* SETTINGS & SAFETY BOTTOM SHEET / MODAL                    */}
      {/* ========================================================= */}
      {settingsDrawerOpen && (
        <div
          onClick={() => setSettingsDrawerOpen(false)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#0E0C14] text-[#191525] dark:text-[#F4F2FA] rounded-t-3xl sm:rounded-3xl border border-[#EAE6F0] dark:border-[#262036] w-full max-w-md max-h-[88dvh] flex flex-col shadow-2xl overflow-hidden"
          >
            <div className="w-10 h-1 bg-[#EAE6F0] dark:bg-[#262036] rounded-full mx-auto mt-2.5 sm:hidden shrink-0" />

            <div className="px-5 py-4 border-b border-[#EAE6F0] dark:border-[#262036] flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-black text-[#191525] dark:text-[#F4F2FA]">
                  Settings &amp; Safety
                </h3>
                <p className="text-xs text-[#706B7D] dark:text-[#9E97B3]">
                  Appearance, anonymous link privacy &amp; support
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSettingsDrawerOpen(false)}
                className="min-h-[44px] min-w-[44px] -mr-1.5 rounded-full flex items-center justify-center text-[#706B7D] dark:text-[#9E97B3] hover:text-[#191525] dark:hover:text-[#F4F2FA] hover:bg-[#FAF9FC] dark:hover:bg-[#171322] cursor-pointer"
                aria-label="Close settings"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-[#EAE6F0] dark:divide-[#262036] no-scrollbar">
              {/* Appearance Mode Switcher: Crisp White / Night Campus */}
              <div className="px-5 py-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-sm font-black text-[#191525] dark:text-[#F4F2FA] block">
                    Appearance Theme
                  </span>
                  <span className="text-xs text-[#706B7D] dark:text-[#9E97B3] block truncate">
                    {theme === 'dark' ? 'Night Campus dark surface active' : 'Crisp White light surface active'}
                  </span>
                </div>
                <div className="inline-flex items-center p-1 rounded-xl bg-[#FAF9FC] dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] shrink-0">
                  <button
                    type="button"
                    onClick={() => setTheme('light')}
                    className={`min-h-[34px] px-2.5 rounded-lg text-xs font-extrabold inline-flex items-center gap-1 cursor-pointer transition-colors ${
                      theme === 'light'
                        ? 'bg-white text-[#191525] shadow-xs'
                        : 'text-[#706B7D] dark:text-[#9E97B3]'
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5" />
                    <span>Light</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme('dark')}
                    className={`min-h-[34px] px-2.5 rounded-lg text-xs font-extrabold inline-flex items-center gap-1 cursor-pointer transition-colors ${
                      theme === 'dark'
                        ? 'bg-[#5420F5] text-white shadow-xs'
                        : 'text-[#706B7D]'
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5" />
                    <span>Night</span>
                  </button>
                </div>
              </div>

              {/* Master Toggle: Link active */}
              <div className="px-5 py-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#FAF9FC] dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] flex items-center justify-center shrink-0">
                    <GetYourLinkIcon size={22} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-black text-[#191525] dark:text-[#F4F2FA]">
                      {user.linkActive ? 'Anonymous link is open' : 'Link is paused'}
                    </h4>
                    <p className="text-xs text-[#706B7D] dark:text-[#9E97B3] truncate">
                      {user.linkActive
                        ? 'Anyone with your link can send anonymous questions'
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
                  <div className="w-12 h-6 bg-slate-200 dark:bg-[#262036] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#18845B]" />
                </label>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSettingsDrawerOpen(false);
                  setActiveModal('character-studio');
                }}
                className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-[#FAF9FC] dark:hover:bg-[#171322] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <CampusCharacterAvatar
                    value={user.avatarUrl}
                    seed={user.username}
                    size={34}
                    rounded="xl"
                  />
                  <div className="min-w-0">
                    <span className="text-sm font-bold text-[#191525] dark:text-[#F4F2FA] block">
                      3D Campus Character Studio
                    </span>
                    <span className="text-xs text-[#706B7D] dark:text-[#9E97B3] block truncate">
                      Design skin tone, hair, headgear, shades &amp; aura
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#706B7D] dark:text-[#9E97B3] shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setSettingsDrawerOpen(false);
                  setActiveModal('edit-profile');
                }}
                className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-[#FAF9FC] dark:hover:bg-[#171322] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-[#FAF9FC] dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] flex items-center justify-center shrink-0">
                    <EditAliasIcon size={20} />
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm font-bold text-[#191525] dark:text-[#F4F2FA] block">
                      Edit Profile Details
                    </span>
                    <span className="text-xs text-[#706B7D] dark:text-[#9E97B3] block truncate">
                      Display name, bio, campus &amp; ask prompt
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#706B7D] dark:text-[#9E97B3] shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setSettingsDrawerOpen(false);
                  handleCopy();
                  setActiveView('public-ask');
                }}
                className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-[#FAF9FC] dark:hover:bg-[#171322] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-[#FAF9FC] dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] flex items-center justify-center shrink-0">
                    <PublicAskNavIcon size={20} />
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm font-bold text-[#191525] dark:text-[#F4F2FA] block">
                      Link Settings &amp; Preview
                    </span>
                    <span className="text-xs text-[#706B7D] dark:text-[#9E97B3] block truncate">
                      Preview how visitors see bopoi.com/@{user.username}/ask
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#706B7D] dark:text-[#9E97B3] shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setSettingsDrawerOpen(false);
                  setActiveModal('safety');
                }}
                className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-[#FAF9FC] dark:hover:bg-[#171322] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-[#FAF9FC] dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] flex items-center justify-center shrink-0">
                    <ProfileShieldNavIcon size={20} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-[#191525] dark:text-[#F4F2FA]">
                        Safety Shield &amp; Hidden Words
                      </span>
                      <span className="text-xs text-[#5420F5] dark:text-[#8E6BFF] font-bold tabular-nums">
                        · {safetySettings.hiddenWords.length} filtered
                      </span>
                    </div>
                    <span className="text-xs text-[#706B7D] dark:text-[#9E97B3] block truncate">
                      Block harassment words and repeat abusers
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#706B7D] dark:text-[#9E97B3] shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setSettingsDrawerOpen(false);
                  setActiveModal('tickets');
                }}
                className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-[#FAF9FC] dark:hover:bg-[#171322] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-[#FAF9FC] dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] flex items-center justify-center shrink-0">
                    <SafetyShieldBadgeIcon size={20} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-[#191525] dark:text-[#F4F2FA]">
                        Reports &amp; Support Chats
                      </span>
                      {unreadReportsCount > 0 ? (
                        <span className="text-xs text-[#F52D85] font-black tabular-nums">
                          · {unreadReportsCount} new reply
                        </span>
                      ) : pendingTicketsCount > 0 ? (
                        <span className="text-xs text-[#5420F5] dark:text-[#8E6BFF] font-bold tabular-nums">
                          · {pendingTicketsCount} open
                        </span>
                      ) : null}
                    </div>
                    <span className="text-xs text-[#706B7D] dark:text-[#9E97B3] block truncate">
                      Chat with moderators about reports or support tickets
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#706B7D] dark:text-[#9E97B3] shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setSettingsDrawerOpen(false);
                  setActiveModal('help');
                }}
                className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-[#FAF9FC] dark:hover:bg-[#171322] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-[#FAF9FC] dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] flex items-center justify-center shrink-0">
                    <ReceiveMessagesIcon size={20} />
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm font-bold text-[#191525] dark:text-[#F4F2FA] block">
                      Help, Privacy &amp; Support
                    </span>
                    <span className="text-xs text-[#706B7D] dark:text-[#9E97B3] block truncate">
                      Community rules, FAQs &amp; support ticket
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#706B7D] dark:text-[#9E97B3] shrink-0" />
              </button>

              {(user.isAdmin || user.role === 'admin') && (
                <button
                  type="button"
                  onClick={() => {
                    setSettingsDrawerOpen(false);
                    setActiveView('admin');
                  }}
                  className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-[#FAF9FC] dark:hover:bg-[#171322] transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-[#FAF9FC] dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] flex items-center justify-center shrink-0">
                      <AdminConsoleNavIcon size={20} />
                    </div>
                    <div className="min-w-0">
                      <span className="text-sm font-bold text-[#191525] dark:text-[#F4F2FA] block">
                        Bopoi Admin Console
                      </span>
                      <span className="text-xs text-[#706B7D] dark:text-[#9E97B3] block truncate">
                        Manage users, verification badges &amp; moderation
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#706B7D] dark:text-[#9E97B3] shrink-0" />
                </button>
              )}

              {/* Legal Policies Row */}
              <div className="px-5 py-3 bg-[#FAF9FC] dark:bg-[#171322] flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-black text-[#191525] dark:text-[#F4F2FA]">Legal</span>
                <div className="flex flex-wrap items-center gap-2 font-bold text-[#5420F5] dark:text-[#8E6BFF]">
                  <button
                    type="button"
                    onClick={() => {
                      setSettingsDrawerOpen(false);
                      openLegalDoc('terms');
                    }}
                    className="hover:underline cursor-pointer"
                  >
                    Terms
                  </button>
                  <span className="text-[#706B7D]" aria-hidden="true">
                    ·
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSettingsDrawerOpen(false);
                      openLegalDoc('privacy');
                    }}
                    className="hover:underline cursor-pointer"
                  >
                    Privacy
                  </button>
                  <span className="text-[#706B7D]" aria-hidden="true">
                    ·
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSettingsDrawerOpen(false);
                      openLegalDoc('guidelines');
                    }}
                    className="hover:underline cursor-pointer"
                  >
                    Guidelines
                  </button>
                </div>
              </div>

              {/* Account Session & Sign Out Row */}
              <div className="px-5 py-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <CampusCharacterAvatar
                    value={user.avatarUrl}
                    seed={user.username}
                    size={36}
                    rounded="full"
                  />
                  <div className="min-w-0">
                    <span className="text-xs font-black text-[#191525] dark:text-[#F4F2FA] block truncate">
                      {user.displayName}
                    </span>
                    <span className="text-xs text-[#706B7D] dark:text-[#9E97B3] block truncate">
                      Signed in as <strong className="text-[#191525] dark:text-[#F4F2FA]">@{user.username}</strong>
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSettingsDrawerOpen(false);
                    logoutAccount();
                  }}
                  className="min-h-[40px] px-4 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-950/70 text-rose-600 dark:text-rose-400 text-xs font-extrabold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 1. Edit Profile Modal */}
      {activeModal === 'edit-profile' && (
        <div
          onClick={() => {
            if (saveProfileStage === 'idle') setActiveModal(null);
          }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#0E0C14] text-[#191525] dark:text-[#F4F2FA] rounded-t-3xl sm:rounded-3xl border border-[#EAE6F0] dark:border-[#262036] p-6 w-full max-w-md space-y-4 shadow-2xl max-h-[90dvh] overflow-y-auto"
          >
            <div className="w-10 h-1 bg-[#EAE6F0] dark:bg-[#262036] rounded-full mx-auto -mt-2 mb-1 sm:hidden" />
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-[#191525] dark:text-[#F4F2FA]">Edit Profile</h3>
              <button
                type="button"
                onClick={() => {
                  if (saveProfileStage === 'idle') setActiveModal(null);
                }}
                className="min-h-[44px] min-w-[44px] -mr-2 flex items-center justify-center rounded-full text-[#706B7D] dark:text-[#9E97B3] hover:text-[#191525] dark:hover:text-[#F4F2FA] hover:bg-[#FAF9FC] dark:hover:bg-[#171322] cursor-pointer"
                aria-label="Close edit profile"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#191525] dark:text-[#F4F2FA] mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] rounded-xl text-base sm:text-sm text-[#191525] dark:text-[#F4F2FA] focus:outline-none focus:border-[#5420F5]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#191525] dark:text-[#F4F2FA] mb-1">
                  Bio
                </label>
                <textarea
                  rows={2}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] rounded-xl text-base sm:text-sm text-[#191525] dark:text-[#F4F2FA] resize-none focus:outline-none focus:border-[#5420F5]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#191525] dark:text-[#F4F2FA] mb-1">
                  Anonymous Ask Prompt
                </label>
                <input
                  type="text"
                  value={editCustomPrompt}
                  onChange={(e) => setEditCustomPrompt(e.target.value)}
                  placeholder="Ask me anything anonymously..."
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] rounded-xl text-base sm:text-sm text-[#191525] dark:text-[#F4F2FA] focus:outline-none focus:border-[#5420F5]"
                />
                <span className="text-[11px] text-[#706B7D] dark:text-[#9E97B3] mt-1 block">
                  Shown on your public anonymous ask link
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#191525] dark:text-[#F4F2FA] mb-1">
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
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-left flex items-center justify-between transition-colors cursor-pointer ${
                          isSelected
                            ? 'border-[#5420F5] bg-[#F0EBFF] dark:bg-[#231942] text-[#191525] dark:text-[#F4F2FA] font-bold'
                            : 'border-[#EAE6F0] dark:border-[#262036] bg-[#FAF9FC] dark:bg-[#171322] text-[#191525] dark:text-[#F4F2FA]'
                        }`}
                      >
                        <span className="text-xs sm:text-sm">{u.name}</span>
                        {isSelected && <Check className="w-4 h-4 text-[#5420F5] dark:text-[#8E6BFF]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  disabled={saveProfileStage !== 'idle'}
                  onClick={() => setActiveModal(null)}
                  className="flex-1 min-h-[42px] py-2.5 text-xs font-bold text-[#706B7D] dark:text-[#9E97B3] hover:text-[#191525] dark:hover:text-[#F4F2FA] cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveProfileStage !== 'idle'}
                  className={`flex-1 min-h-[42px] py-2.5 text-white font-extrabold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed ${
                    saveProfileStage === 'confirmed'
                      ? 'bg-emerald-600'
                      : saveProfileStage === 'saving'
                      ? 'bg-[#4314E2]'
                      : 'bg-[#5420F5] hover:bg-[#4314E2]'
                  }`}
                >
                  {saveProfileStage === 'saving' ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                      <span>Saving...</span>
                    </>
                  ) : saveProfileStage === 'confirmed' ? (
                    <>
                      <Check className="w-3.5 h-3.5 stroke-[3] shrink-0" />
                      <span>Saved!</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Safety & Privacy Modal */}
      {activeModal === 'safety' && (
        <div
          onClick={() => setActiveModal(null)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#0E0C14] text-[#191525] dark:text-[#F4F2FA] rounded-t-3xl sm:rounded-3xl border border-[#EAE6F0] dark:border-[#262036] p-6 w-full max-w-md space-y-4 shadow-2xl max-h-[85dvh] overflow-y-auto no-scrollbar"
          >
            <div className="w-10 h-1 bg-[#EAE6F0] dark:bg-[#262036] rounded-full mx-auto -mt-2 mb-1 sm:hidden" />
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-[#191525] dark:text-[#F4F2FA]">
                  Safety Shield &amp; Hidden Words
                </h3>
                <p className="text-xs text-[#706B7D] dark:text-[#9E97B3] mt-0.5">
                  Prohibit abusive words &amp; protect your inbox automatically
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="min-h-[44px] min-w-[44px] -mr-2 flex items-center justify-center rounded-full text-[#706B7D] dark:text-[#9E97B3] hover:text-[#191525] dark:hover:text-[#F4F2FA] hover:bg-[#FAF9FC] dark:hover:bg-[#171322] cursor-pointer"
                aria-label="Close safety modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddWord} className="flex gap-2">
              <input
                type="text"
                value={newWord}
                onChange={(e) => setNewWord(e.target.value)}
                placeholder="Add word to filter (e.g. cheat, idiot)..."
                className="flex-1 min-h-[40px] px-3.5 py-2 bg-white dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] rounded-xl text-base sm:text-xs text-[#191525] dark:text-[#F4F2FA] focus:outline-none focus:border-[#5420F5]"
              />
              <button
                type="submit"
                className="min-h-[40px] px-4 py-2 bg-[#5420F5] text-white text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer hover:bg-[#4314E2]"
              >
                <Plus className="w-4 h-4" />
                <span>Add</span>
              </button>
            </form>

            <div>
              <span className="text-xs font-bold text-[#191525] dark:text-[#F4F2FA]">
                Currently Filtered Words:
              </span>
              <div className="flex flex-wrap gap-2 mt-2">
                {safetySettings.hiddenWords.map((word) => (
                  <span
                    key={word}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-semibold rounded-lg border border-rose-200 dark:border-rose-900"
                  >
                    <span>{word}</span>
                    <button
                      type="button"
                      onClick={() => removeHiddenWord(word)}
                      className="hover:text-rose-900 dark:hover:text-rose-100 cursor-pointer"
                      aria-label={`Remove ${word}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-[#EAE6F0] dark:border-[#262036] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#191525] dark:text-[#F4F2FA]">
                  Blocked Senders:
                </span>
                {safetySettings.blockedSenders.length > 0 && (
                  <button
                    type="button"
                    onClick={clearBlockedSenders}
                    className="text-xs font-bold text-[#5420F5] dark:text-[#8E6BFF] hover:underline cursor-pointer"
                  >
                    Unblock All
                  </button>
                )}
              </div>
              <p className="text-xs text-[#706B7D] dark:text-[#9E97B3] leading-relaxed">
                {safetySettings.blockedSenders.length === 0
                  ? 'No senders currently blocked. You can block any sender directly from message details.'
                  : `${safetySettings.blockedSenders.length} sender(s) blocked from sending messages.`}
              </p>
              {safetySettings.blockedSenders.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {safetySettings.blockedSenders.map((senderId, idx) => (
                    <span
                      key={senderId}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#FAF9FC] dark:bg-[#171322] text-[#191525] dark:text-[#F4F2FA] text-xs font-semibold rounded-lg border border-[#EAE6F0] dark:border-[#262036]"
                    >
                      <span>Anonymous Sender #{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => unblockSender(senderId)}
                        className="text-[#706B7D] dark:text-[#9E97B3] hover:text-rose-600 cursor-pointer"
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
              type="button"
              onClick={() => setActiveModal(null)}
              className="w-full min-h-[44px] py-2.5 bg-[#FAF9FC] dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] text-[#191525] dark:text-[#F4F2FA] text-xs font-bold rounded-xl hover:bg-slate-100 dark:hover:bg-[#231942] cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* 3. Help & Support Modal */}
      {activeModal === 'help' && (
        <div
          onClick={() => {
            if (supportStage === 'idle') setActiveModal(null);
          }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#0E0C14] text-[#191525] dark:text-[#F4F2FA] rounded-t-3xl sm:rounded-3xl border border-[#EAE6F0] dark:border-[#262036] p-6 w-full max-w-md space-y-4 shadow-2xl max-h-[88dvh] overflow-y-auto"
          >
            <div className="w-10 h-1 bg-[#EAE6F0] dark:bg-[#262036] rounded-full mx-auto -mt-2 mb-1 sm:hidden" />
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-[#191525] dark:text-[#F4F2FA]">
                Help, Privacy &amp; Support
              </h3>
              <button
                type="button"
                onClick={() => {
                  if (supportStage === 'idle') setActiveModal(null);
                }}
                className="min-h-[44px] min-w-[44px] -mr-2 flex items-center justify-center rounded-full text-[#706B7D] dark:text-[#9E97B3] hover:text-[#191525] dark:hover:text-[#F4F2FA] hover:bg-[#FAF9FC] dark:hover:bg-[#171322] cursor-pointer"
                aria-label="Close help modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-[#706B7D] dark:text-[#9E97B3]">
              <div className="p-3.5 bg-[#FAF9FC] dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] rounded-2xl">
                <p className="font-bold text-[#191525] dark:text-[#F4F2FA] text-xs">
                  How does anonymity work?
                </p>
                <p className="mt-1 leading-relaxed">
                  When someone visits your link, they do not need an account. We protect the sender's identity while filtering blocked words and spam.
                </p>
              </div>

              <div className="p-3.5 bg-[#FAF9FC] dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] rounded-2xl">
                <p className="font-bold text-[#191525] dark:text-[#F4F2FA] text-xs">
                  How do I share answers to WhatsApp or Instagram?
                </p>
                <p className="mt-1 leading-relaxed">
                  Open any message, type your response, click "Story Card", and press "Save Image (PNG)". Your 3D character and answer save to your device.
                </p>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (supportStage !== 'idle') return;
                if (!supportMessage.trim()) {
                  showToast('Please enter a message for support.', 'error');
                  return;
                }
                setSupportStage('sending');
                setTimeout(() => {
                  const created = submitSupportTicket(supportSubject, supportMessage);
                  setSupportStage('confirmed');
                  setTimeout(() => {
                    setSupportStage('idle');
                    setSupportMessage('');
                    setActiveModal(null);
                    if (created) {
                      openTicketInSettings(created.id);
                    }
                  }, 520);
                }, 320);
              }}
              className="pt-3 border-t border-[#EAE6F0] dark:border-[#262036] space-y-3"
            >
              <div>
                <label className="block text-xs font-bold text-[#191525] dark:text-[#F4F2FA] mb-1">
                  Contact Campus Safety &amp; Support
                </label>
                <select
                  value={supportSubject}
                  onChange={(e) => setSupportSubject(e.target.value)}
                  className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-[#EAE6F0] dark:border-[#262036] text-xs font-semibold text-[#191525] dark:text-[#F4F2FA] bg-[#FAF9FC] dark:bg-[#171322] focus:outline-none focus:border-[#5420F5]"
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
                className="w-full p-3 rounded-xl border border-[#EAE6F0] dark:border-[#262036] text-base sm:text-xs text-[#191525] dark:text-[#F4F2FA] bg-[#FAF9FC] dark:bg-[#171322] focus:outline-none focus:border-[#5420F5] resize-none"
              />

              <button
                type="submit"
                disabled={supportStage !== 'idle'}
                className={`w-full min-h-[42px] py-2.5 text-white text-xs font-extrabold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed ${
                  supportStage === 'confirmed'
                    ? 'bg-emerald-600'
                    : supportStage === 'sending'
                    ? 'bg-[#4314E2]'
                    : 'bg-[#5420F5] hover:bg-[#4314E2]'
                }`}
              >
                {supportStage === 'sending' ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                    <span>Sending ticket...</span>
                  </>
                ) : supportStage === 'confirmed' ? (
                  <>
                    <Check className="w-3.5 h-3.5 stroke-[3] shrink-0" />
                    <span>Ticket Sent to Campus Safety!</span>
                  </>
                ) : (
                  <span>Send Support Ticket</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 3b. Reports & Support Chats Modal */}
      {activeModal === 'tickets' && (
        <div
          onClick={() => setActiveModal(null)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#0E0C14] text-[#191525] dark:text-[#F4F2FA] rounded-t-3xl sm:rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl border border-[#EAE6F0] dark:border-[#262036] max-h-[85dvh] flex flex-col"
          >
            <div className="w-10 h-1 bg-[#EAE6F0] dark:bg-[#262036] rounded-full mx-auto -mt-2 mb-1 sm:hidden shrink-0" />
            <div className="flex items-center justify-between gap-2 shrink-0">
              <div>
                <h3 className="text-base font-black text-[#191525] dark:text-[#F4F2FA]">
                  Reports &amp; Support Chats
                </h3>
                <p className="text-xs text-[#706B7D] dark:text-[#9E97B3] mt-0.5">
                  Reply directly to campus moderators on open tickets
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setActiveModal(null);
                    openReportModal({
                      targetType: 'support_ticket',
                      targetId: `support_${Date.now()}`,
                      targetLabel: 'Support Ticket',
                      defaultSubject: 'General Question',
                    });
                  }}
                  className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[#F0EBFF] dark:bg-[#231942] hover:bg-[#5420F5] text-[#5420F5] dark:text-[#B9A4FF] hover:text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="min-h-[44px] min-w-[44px] -mr-2 flex items-center justify-center rounded-full text-[#706B7D] dark:text-[#9E97B3] hover:text-[#191525] dark:hover:text-[#F4F2FA] hover:bg-[#FAF9FC] dark:hover:bg-[#171322] cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-[#EAE6F0] dark:divide-[#262036] border-y border-[#EAE6F0] dark:border-[#262036]">
              {userModerationReports.length === 0 ? (
                <div className="py-10 px-4 text-center space-y-2.5">
                  <div className="w-11 h-11 rounded-2xl bg-[#FAF9FC] dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] flex items-center justify-center mx-auto">
                    <SafetyShieldBadgeIcon size={22} />
                  </div>
                  <p className="text-sm font-bold text-[#191525] dark:text-[#F4F2FA]">
                    No reports or tickets yet
                  </p>
                  <p className="text-xs text-[#706B7D] dark:text-[#9E97B3] max-w-xs mx-auto leading-relaxed">
                    When you report content or open a support ticket, your conversation with moderators appears here.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveModal(null);
                      openReportModal({
                        targetType: 'support_ticket',
                        targetId: `support_${Date.now()}`,
                        targetLabel: 'Support Ticket',
                        defaultSubject: 'General Question',
                      });
                    }}
                    className="mt-1 min-h-[40px] px-4 py-2 rounded-xl bg-[#5420F5] hover:bg-[#4314E2] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Open Support Ticket</span>
                  </button>
                </div>
              ) : (
                [...userModerationReports]
                  .sort((a, b) => {
                    const unreadDiff =
                      getUnreadReportCountForReporter(b) - getUnreadReportCountForReporter(a);
                    if (unreadDiff !== 0) return unreadDiff;
                    if (a.status === 'pending' && b.status !== 'pending') return -1;
                    if (a.status !== 'pending' && b.status === 'pending') return 1;
                    return 0;
                  })
                  .map((ticket) => {
                    const thread = getReportThreadMessages(ticket);
                    const lastMsg = thread[thread.length - 1];
                    const unreadReplies = getUnreadReportCountForReporter(ticket);

                    return (
                      <button
                        key={ticket.id}
                        type="button"
                        onClick={() => setActiveChatTicket(ticket)}
                        className={`w-full text-left py-3.5 px-1 transition-colors cursor-pointer space-y-1 ${
                          unreadReplies > 0
                            ? 'bg-[#FAF8FF] dark:bg-[#19132B] hover:bg-[#F2EDFF] dark:hover:bg-[#221A3A]'
                            : 'bg-white dark:bg-[#0E0C14] hover:bg-[#FAF9FC] dark:hover:bg-[#171322]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-black text-[#191525] dark:text-[#F4F2FA] truncate">
                              {getReportTypeLabel(ticket.targetType)}
                            </span>
                            <span
                              className={`font-bold capitalize shrink-0 ${
                                ticket.status === 'pending'
                                  ? 'text-[#5420F5] dark:text-[#8E6BFF]'
                                  : ticket.status === 'resolved'
                                  ? 'text-emerald-700 dark:text-emerald-400'
                                  : 'text-[#706B7D] dark:text-[#9E97B3]'
                              }`}
                            >
                              · {ticket.status === 'pending' ? 'Open' : ticket.status}
                            </span>
                          </div>
                          {unreadReplies > 0 && (
                            <span className="text-xs font-black text-[#F52D85] shrink-0 tabular-nums">
                              {unreadReplies} new
                            </span>
                          )}
                        </div>

                        <p className="text-xs font-semibold text-[#191525] dark:text-[#F4F2FA] line-clamp-1">
                          {ticket.reason}
                        </p>

                        {lastMsg && (
                          <p className="text-xs text-[#706B7D] dark:text-[#9E97B3] line-clamp-1">
                            {lastMsg.senderRole === 'moderator'
                              ? `Moderator: ${lastMsg.text}`
                              : lastMsg.senderRole === 'reporter'
                              ? `You: ${lastMsg.text}`
                              : lastMsg.text}
                          </p>
                        )}

                        <div className="flex items-center justify-between pt-0.5 text-[11px] tabular-nums">
                          <span className="text-[#706B7D] dark:text-[#9E97B3]">{ticket.createdAt}</span>
                          <span className="font-bold text-[#5420F5] dark:text-[#8E6BFF] inline-flex items-center gap-1">
                            <MessageCircle className="w-3 h-3" />
                            <span>Chat ({thread.length})</span>
                          </span>
                        </div>
                      </button>
                    );
                  })
              )}
            </div>

            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="w-full min-h-[44px] py-2.5 bg-[#FAF9FC] dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] text-[#191525] dark:text-[#F4F2FA] text-xs font-bold rounded-xl hover:bg-slate-100 dark:hover:bg-[#231942] cursor-pointer shrink-0"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {activeChatTicket && (
        <ReportCaseChatModal
          report={activeChatTicket}
          viewerRole="reporter"
          onClose={() => setActiveChatTicket(null)}
        />
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
