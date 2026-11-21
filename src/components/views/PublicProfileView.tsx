import React, { useState, useMemo } from 'react';
import { useBopoi } from '../../context/BopoiContext.tsx';
import {
  ChevronLeft,
  Share2,
  UserPlus,
  Check,
  Send,
  Heart,
  School,
  Sparkles,
} from 'lucide-react';
import { BopoiAnonymousAvatar } from '../brand/BopoiAnonymousAvatar.tsx';
import {
  StudentPostsIcon,
  ShareCardsIcon,
  CreateRoomIcon,
  RoomBadgeIcon,
  StoryStudioNavIcon,
  PublicAskNavIcon,
} from '../brand/icons/index.ts';
import { CampusCharacterAvatar } from '../brand/character/index.ts';
import { FollowListModal } from '../modals/FollowListModal.tsx';
import { VerifiedCreatorBadge } from '../ui/VerifiedCreatorBadge.tsx';
import { MentionText } from '../ui/MentionText.tsx';
import { FeedPostRow } from '../feed/FeedPostRow.tsx';

export const PublicProfileView: React.FC = () => {
  const {
    selectedPublicUser,
    socialPosts,
    answers,
    rooms,
    enterRoom,
    creators,
    accounts,
    toggleFollowCreator,
    getFollowersForUser,
    getFollowingForUser,
    isFollowingUser,
    setSelectedAnswer,
    setActiveView,
    goBack,
    user,
    isAuthenticated,
    openPublicAskFor,
    toggleAnswerLike,
    copyUserLink,
  } = useBopoi();

  const [activeTab, setActiveTab] = useState<'posts' | 'answers' | 'rooms'>('posts');
  const [followModalTab, setFollowModalTab] = useState<'followers' | 'following' | null>(null);

  // Active profile data
  const profile = selectedPublicUser || creators[0] || user;
  const profileName =
    ('name' in profile ? profile.name : (profile as any).displayName) || profile.username;
  const isMe = profile.username.toLowerCase() === user.username.toLowerCase();
  const isAnonymous =
    profile.username.toLowerCase().startsWith('anon') ||
    profileName.toLowerCase().includes('anon');

  const creatorRecord = creators.find(
    (c) => c.username.toLowerCase() === profile.username.toLowerCase()
  );
  const isFollowing = isFollowingUser(profile.username);
  const isLoggedIn = Boolean(isAuthenticated && user.username && user.username !== 'student');
  const followsYou =
    !isMe &&
    !isAnonymous &&
    isLoggedIn &&
    getFollowingForUser(profile.username).some(
      (c) => c.username.toLowerCase() === user.username.toLowerCase()
    );
  const liveFollowers = useMemo(
    () => (isAnonymous ? [] : getFollowersForUser(profile.username)),
    [isAnonymous, getFollowersForUser, profile.username]
  );
  const liveFollowersCount = liveFollowers.length;
  const liveFollowingCount = isAnonymous ? 0 : getFollowingForUser(profile.username).length;

  const mutualFollowers = useMemo(() => {
    if (!isLoggedIn || isMe || isAnonymous) return [];
    const myFollowingSet = new Set(
      getFollowingForUser(user.username).map((c) => c.username.toLowerCase())
    );
    return liveFollowers.filter((f) => {
      const uname = f.username.toLowerCase();
      return (
        myFollowingSet.has(uname) &&
        uname !== user.username.toLowerCase() &&
        uname !== profile.username.toLowerCase()
      );
    });
  }, [isLoggedIn, isMe, isAnonymous, getFollowingForUser, user.username, liveFollowers, profile.username]);

  const verifiedUsernameSet = useMemo(() => {
    const set = new Set<string>();
    for (const u of accounts || []) {
      if (u.isVerified || u.isCreator) {
        set.add(u.username.toLowerCase());
      }
    }
    return set;
  }, [accounts]);

  const studentPosts = socialPosts.filter(
    (p) =>
      p.authorUsername.toLowerCase() === profile.username.toLowerCase() ||
      p.authorName.toLowerCase() === profileName.toLowerCase()
  );

  const studentAnswers = Object.values(answers).filter(
    (a) =>
      a.isPublic &&
      !a.isDraft &&
      a.authorUsername?.toLowerCase() === profile.username.toLowerCase()
  );

  const studentRooms = rooms.filter(
    (r) =>
      r.creatorName?.toLowerCase() === profileName.toLowerCase() ||
      r.messages?.some(
        (m) =>
          !m.isAnonymous &&
          (m.authorUsername.toLowerCase() === profile.username.toLowerCase() ||
            m.authorName.toLowerCase() === profileName.toLowerCase())
      )
  );

  const handleToggleFollow = () => {
    toggleFollowCreator(creatorRecord?.id || profile.id || profile.username);
  };

  const handleShare = () => {
    const url = `${window.location.origin}/?ask=${profile.username}#public-ask`;
    if (navigator.share) {
      navigator.share({
        title: `${profileName} on Bopoi`,
        text: `Check out ${profileName}'s profile on Bopoi!`,
        url,
      }).catch(() => {});
    } else {
      copyUserLink(profile.username);
    }
  };

  return (
    <div className="w-full flex flex-col bg-white dark:bg-[#0E0C14] text-[#191525] dark:text-[#F4F2FA] pb-12">
      {/* 1. Sticky Top Header */}
      <div className="sticky top-[52px] lg:top-0 z-20 bg-white/95 dark:bg-[#0E0C14]/95 backdrop-blur-md border-b border-[#EAE6F0] dark:border-[#262036] px-4 sm:px-5 h-[52px] flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => goBack('home')}
          className="min-h-[44px] min-w-[44px] -ml-2 rounded-full hover:bg-[#FAF9FC] dark:hover:bg-[#171322] text-[#191525] dark:text-[#F4F2FA] transition-colors cursor-pointer flex items-center justify-center"
          title="Go back"
          aria-label="Go back"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <h1 className="text-sm sm:text-base font-black text-[#191525] dark:text-[#F4F2FA] truncate">
          @{profile.username}
        </h1>

        <button
          type="button"
          onClick={handleShare}
          className="min-h-[44px] min-w-[44px] -mr-2 rounded-full hover:bg-[#FAF9FC] dark:hover:bg-[#171322] text-[#191525] dark:text-[#F4F2FA] transition-colors cursor-pointer flex items-center justify-center"
          title="Share profile"
          aria-label="Share profile"
        >
          <Share2 className="w-[18px] h-[18px]" />
        </button>
      </div>

      {/* 2. Threads-Style Asymmetric Profile Header */}
      <section className="px-4 sm:px-5 pt-5 pb-4 space-y-3.5 border-b border-[#EAE6F0] dark:border-[#262036]">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-black text-[#191525] dark:text-[#F4F2FA] tracking-tight">
                {profileName}
              </h2>
              <VerifiedCreatorBadge
                isVerified={Boolean(
                  (profile as any).isVerified ||
                    (profile as any).isCreator ||
                    creatorRecord?.isVerified
                )}
                username={profile.username}
                isAnonymous={isAnonymous}
                size={18}
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs sm:text-sm text-[#706B7D] dark:text-[#9E97B3] font-semibold">
                @{profile.username}
              </p>
              {followsYou && (
                <span className="text-[10px] font-bold text-[#706B7D] dark:text-[#9E97B3] bg-[#FAF9FC] dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] px-2 py-0.5 rounded-md">
                  Follows you
                </span>
              )}
            </div>

            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5420F5] dark:text-[#8E6BFF] pt-0.5">
              <School className="w-3.5 h-3.5 shrink-0" />
              <span>{profile.campus || 'Nigerian University Student'}</span>
            </div>
          </div>

          <div className="shrink-0">
            {isAnonymous ? (
              <div className="w-[72px] h-[72px] rounded-full bg-[#5420F5] flex items-center justify-center ring-1 ring-[#EAE6F0] dark:ring-[#262036]">
                <BopoiAnonymousAvatar size="lg" idPrefix="pub-prof-anon" showSparkleBadge />
              </div>
            ) : (
              <CampusCharacterAvatar
                value={isMe ? user.avatarUrl : profile.avatarUrl}
                seed={profile.username}
                size={72}
                rounded="full"
                showRing
                className="ring-1 ring-[#EAE6F0] dark:ring-[#262036]"
              />
            )}
          </div>
        </div>

        {/* Bio */}
        {profile.bio && (
          <p className="text-sm text-[#191525] dark:text-[#F4F2FA] font-medium leading-relaxed">
            <MentionText text={profile.bio} />
          </p>
        )}

        {/* Interactive Stats Row */}
        <div className="flex items-center gap-5 pt-1 text-xs sm:text-sm tabular-nums">
          <button
            type="button"
            disabled={isAnonymous}
            onClick={() => !isAnonymous && setFollowModalTab('followers')}
            className={`min-h-[40px] flex items-center gap-1.5 transition-colors ${
              isAnonymous ? 'cursor-default' : 'cursor-pointer hover:text-[#5420F5] dark:hover:text-[#8E6BFF]'
            }`}
          >
            <span className="font-black text-[#191525] dark:text-[#F4F2FA]">
              {liveFollowersCount.toLocaleString()}
            </span>
            <span className="text-[#706B7D] dark:text-[#9E97B3] font-semibold">followers</span>
          </button>

          <button
            type="button"
            disabled={isAnonymous}
            onClick={() => !isAnonymous && setFollowModalTab('following')}
            className={`min-h-[40px] flex items-center gap-1.5 transition-colors ${
              isAnonymous ? 'cursor-default' : 'cursor-pointer hover:text-[#5420F5] dark:hover:text-[#8E6BFF]'
            }`}
          >
            <span className="font-black text-[#191525] dark:text-[#F4F2FA]">
              {liveFollowingCount.toLocaleString()}
            </span>
            <span className="text-[#706B7D] dark:text-[#9E97B3] font-semibold">following</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('posts')}
            className="min-h-[40px] flex items-center gap-1.5 cursor-pointer hover:text-[#5420F5] dark:hover:text-[#8E6BFF] transition-colors"
          >
            <span className="font-black text-[#191525] dark:text-[#F4F2FA]">{studentPosts.length}</span>
            <span className="text-[#706B7D] dark:text-[#9E97B3] font-semibold">posts</span>
          </button>
        </div>

        {/* Instagram/X-Style Mutual Connections Social Proof */}
        {mutualFollowers.length > 0 && (
          <button
            type="button"
            onClick={() => setFollowModalTab('followers')}
            className="flex items-center gap-2 text-left text-xs text-[#706B7D] dark:text-[#9E97B3] hover:text-[#191525] dark:hover:text-[#F4F2FA] transition-colors cursor-pointer group"
          >
            <div className="flex items-center -space-x-1.5 shrink-0">
              {mutualFollowers.slice(0, 3).map((mf) => (
                <CampusCharacterAvatar
                  key={mf.username}
                  value={mf.avatarUrl}
                  seed={mf.username}
                  size={20}
                  rounded="full"
                  className="ring-2 ring-white dark:ring-[#0E0C14]"
                />
              ))}
            </div>
            <span className="truncate group-hover:underline">
              Followed by{' '}
              <span className="font-bold text-[#191525] dark:text-[#F4F2FA]">
                @{mutualFollowers[0].username}
              </span>
              {mutualFollowers.length === 2 && (
                <>
                  {' '}
                  and{' '}
                  <span className="font-bold text-[#191525] dark:text-[#F4F2FA]">
                    @{mutualFollowers[1].username}
                  </span>
                </>
              )}
              {mutualFollowers.length > 2 && (
                <>
                  ,{' '}
                  <span className="font-bold text-[#191525] dark:text-[#F4F2FA]">
                    @{mutualFollowers[1].username}
                  </span>
                  , and {mutualFollowers.length - 2}{' '}
                  {mutualFollowers.length - 2 === 1 ? 'other' : 'others'} you follow
                </>
              )}
            </span>
          </button>
        )}

        {/* Full-Width Primary Actions */}
        {!isMe ? (
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleToggleFollow}
              className={`min-h-[44px] px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 ${
                isFollowing
                  ? 'bg-[#FAF9FC] dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] text-[#191525] dark:text-[#F4F2FA] hover:bg-slate-100 dark:hover:bg-[#231942]'
                  : 'bg-[#191525] dark:bg-[#F4F2FA] hover:bg-[#5420F5] dark:hover:bg-[#5420F5] text-white dark:text-[#191525] dark:hover:text-white'
              }`}
            >
              {isFollowing ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 stroke-[2.75]" />
                  <span>Following</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Follow</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => openPublicAskFor(profile)}
              className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#5420F5] hover:bg-[#4314E2] text-white text-xs sm:text-sm font-black transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <Send className="w-3.5 h-3.5 shrink-0" />
              <span>Ask Anonymously</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setActiveView('profile')}
            className="w-full min-h-[44px] px-4 py-2.5 bg-[#FAF9FC] dark:bg-[#171322] hover:bg-[#F0EBFF] dark:hover:bg-[#231942] border border-[#EAE6F0] dark:border-[#262036] text-[#191525] dark:text-[#F4F2FA] text-xs sm:text-sm font-black rounded-xl transition-colors cursor-pointer"
          >
            Edit My Profile
          </button>
        )}

        {/* Instagram-style Story Highlights Strip (when public Q&As or rooms exist) */}
        {(studentAnswers.length > 0 || studentRooms.length > 0) && (
          <div className="pt-2 -mx-4 sm:-mx-5 px-4 sm:px-5 flex items-start gap-4 overflow-x-auto no-scrollbar">
            {!isMe && (
              <button
                type="button"
                onClick={() => openPublicAskFor(profile)}
                className="flex flex-col items-center gap-1.5 w-[64px] shrink-0 cursor-pointer group"
              >
                <div className="p-[2.5px] rounded-full bg-gradient-to-tr from-[#5420F5] to-[#F52D85] group-hover:scale-105 transition-transform">
                  <div className="w-[52px] h-[52px] rounded-full bg-white dark:bg-[#0E0C14] border-2 border-white dark:border-[#0E0C14] flex items-center justify-center text-[#5420F5] dark:text-[#8E6BFF]">
                    <Send className="w-4 h-4" />
                  </div>
                </div>
                <span className="text-[11px] font-bold text-[#191525] dark:text-[#F4F2FA] truncate w-full text-center">
                  Ask DM
                </span>
              </button>
            )}

            {studentAnswers.slice(0, 4).map((ans, idx) => (
              <button
                key={ans.id}
                type="button"
                onClick={() => {
                  setSelectedAnswer(ans);
                  setActiveView('answer-studio');
                }}
                className="flex flex-col items-center gap-1.5 w-[64px] shrink-0 cursor-pointer group"
                title={ans.questionText}
              >
                <div className="p-[2px] rounded-full bg-gradient-to-tr from-[#F52D85] to-[#FF9F43] group-hover:scale-105 transition-transform">
                  <div className="w-[52px] h-[52px] rounded-full bg-[#FAF9FC] dark:bg-[#171322] border-2 border-white dark:border-[#0E0C14] flex items-center justify-center text-[#F52D85]">
                    <Sparkles className="w-4 h-4" />
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-[#706B7D] dark:text-[#9E97B3] truncate w-full text-center">
                  Q&amp;A #{idx + 1}
                </span>
              </button>
            ))}

            {studentRooms.slice(0, 2).map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => enterRoom(r.id)}
                className="flex flex-col items-center gap-1.5 w-[64px] shrink-0 cursor-pointer group"
                title={r.name}
              >
                <div className="p-[2px] rounded-full bg-[#5420F5] group-hover:scale-105 transition-transform">
                  <div className="w-[52px] h-[52px] rounded-full bg-white dark:bg-[#0E0C14] border-2 border-white dark:border-[#0E0C14] flex items-center justify-center">
                    <RoomBadgeIcon
                      iconEmoji={r.iconEmoji}
                      iconBg={r.iconBg}
                      category={r.category}
                      roomName={r.name}
                      size="sm"
                    />
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-[#706B7D] dark:text-[#9E97B3] truncate w-full text-center">
                  {r.name}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* 3. Underline Profile Content Tabs */}
      <div className="sticky top-[104px] lg:top-[52px] z-10 bg-white/95 dark:bg-[#0E0C14]/95 backdrop-blur-md grid grid-cols-3 border-b border-[#EAE6F0] dark:border-[#262036]">
        {[
          {
            id: 'posts' as const,
            label: `Posts (${studentPosts.length})`,
          },
          {
            id: 'answers' as const,
            label: `Q&A (${studentAnswers.length})`,
          },
          {
            id: 'rooms' as const,
            label: `Rooms (${studentRooms.length})`,
          },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`min-h-[44px] py-2.5 px-2 text-xs sm:text-sm font-black transition-colors relative cursor-pointer hover:bg-[#FAF9FC] dark:hover:bg-[#171322] tabular-nums truncate ${
                isActive
                  ? 'text-[#191525] dark:text-[#F4F2FA]'
                  : 'text-[#706B7D] dark:text-[#9E97B3]'
              }`}
            >
              <span>{tab.label}</span>
              {isActive && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-[3px] bg-[#5420F5] rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* 4. Hairline-Divided Tab Stream */}
      {activeTab === 'posts' && (
        studentPosts.length === 0 ? (
          <div className="px-6 py-14 text-center space-y-2.5 border-b border-[#EAE6F0] dark:border-[#262036]">
            <div className="w-12 h-12 rounded-2xl bg-[#FAF9FC] dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] flex items-center justify-center mx-auto p-1.5">
              <StudentPostsIcon size={32} />
            </div>
            <p className="text-sm font-black text-[#191525] dark:text-[#F4F2FA]">
              No public posts yet from {profileName}
            </p>
            <p className="text-xs text-[#706B7D] dark:text-[#9E97B3]">
              Check back later or send them an anonymous question!
            </p>
          </div>
        ) : (
          <div className="flex flex-col">
            {studentPosts.map((post) => (
              <FeedPostRow
                key={post.id}
                post={post}
                verifiedUsernameSet={verifiedUsernameSet}
              />
            ))}
          </div>
        )
      )}

      {activeTab === 'answers' && (
        studentAnswers.length === 0 ? (
          <div className="px-6 py-14 text-center space-y-3 border-b border-[#EAE6F0] dark:border-[#262036]">
            <div className="w-12 h-12 rounded-2xl bg-[#FAF9FC] dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] flex items-center justify-center mx-auto p-1.5">
              <StoryStudioNavIcon size={32} />
            </div>
            <p className="text-sm font-black text-[#191525] dark:text-[#F4F2FA]">
              No public Q&amp;A answers from {profileName} yet
            </p>
            <p className="text-xs text-[#706B7D] dark:text-[#9E97B3] max-w-xs mx-auto">
              Send {profileName} an anonymous question and their shared answers will appear here.
            </p>
            {!isMe && (
              <button
                type="button"
                onClick={() => openPublicAskFor(profile)}
                className="min-h-[44px] px-4 py-2 bg-[#5420F5] text-white text-xs font-bold rounded-xl hover:bg-[#4314E2] cursor-pointer inline-flex items-center gap-1.5"
              >
                <PublicAskNavIcon size={15} />
                <span>Ask {profileName} a Question</span>
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-[#EAE6F0] dark:divide-[#262036] border-b border-[#EAE6F0] dark:border-[#262036]">
            {studentAnswers.map((ans) => (
              <div key={ans.id} className="px-4 sm:px-5 py-4 space-y-3">
                <div className="bg-[#FAF9FC] dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] rounded-2xl p-3.5">
                  <span className="text-[11px] font-bold text-[#706B7D] dark:text-[#9E97B3] block mb-1">
                    Anonymous Question
                  </span>
                  <p className="text-xs sm:text-sm font-bold text-[#191525] dark:text-[#F4F2FA]">
                    &ldquo;<MentionText text={ans.questionText} />&rdquo;
                  </p>
                </div>

                <div className="bg-[#FAF8FF] dark:bg-[#231942]/50 rounded-2xl p-3.5 border border-[#5420F5]/20 dark:border-[#5420F5]/35">
                  <span className="text-[11px] font-black text-[#5420F5] dark:text-[#B9A4FF] block mb-1">
                    {profileName}'s Answer
                  </span>
                  <p className="text-xs sm:text-sm text-[#191525] dark:text-[#F4F2FA] font-semibold leading-relaxed">
                    &ldquo;<MentionText text={ans.answerText} />&rdquo;
                  </p>
                </div>

                <div className="flex items-center justify-between text-xs text-[#706B7D] dark:text-[#9E97B3] pt-1 tabular-nums">
                  <div className="flex items-center gap-4">
                    <span>Answered {ans.createdAt}</span>
                    <button
                      type="button"
                      onClick={() => toggleAnswerLike(ans.messageId)}
                      className="min-h-[38px] flex items-center gap-1 font-bold text-[#F52D85] hover:opacity-80 cursor-pointer"
                    >
                      <Heart className="w-3.5 h-3.5 fill-[#F52D85]" />
                      <span>{ans.likes}</span>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAnswer(ans);
                      setActiveView('answer-studio');
                    }}
                    className="min-h-[38px] text-xs font-bold text-[#5420F5] dark:text-[#8E6BFF] hover:underline cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <ShareCardsIcon size={15} />
                    <span>View Story Card</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {activeTab === 'rooms' && (
        studentRooms.length === 0 ? (
          <div className="px-6 py-14 text-center space-y-2.5 border-b border-[#EAE6F0] dark:border-[#262036]">
            <div className="w-12 h-12 rounded-2xl bg-[#FAF9FC] dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] flex items-center justify-center mx-auto p-1.5">
              <CreateRoomIcon size={32} />
            </div>
            <p className="text-sm font-black text-[#191525] dark:text-[#F4F2FA]">
              No public rooms joined by {profileName} yet
            </p>
            <p className="text-xs text-[#706B7D] dark:text-[#9E97B3] max-w-xs mx-auto">
              Explore live campus rooms to join ongoing student conversations.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#EAE6F0] dark:divide-[#262036] border-b border-[#EAE6F0] dark:border-[#262036]">
            {studentRooms.map((r) => (
              <div
                key={r.id}
                onClick={() => enterRoom(r.id)}
                className="px-4 sm:px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-[#FAF9FC] dark:hover:bg-[#171322] transition-colors cursor-pointer group"
                title={`Enter #${r.name}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <RoomBadgeIcon
                    iconEmoji={r.iconEmoji}
                    iconBg={r.iconBg}
                    category={r.category}
                    roomName={r.name}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <h5 className="text-sm font-black text-[#191525] dark:text-[#F4F2FA] group-hover:text-[#5420F5] dark:group-hover:text-[#8E6BFF] transition-colors truncate">
                      {r.name}
                    </h5>
                    <p className="text-xs text-[#706B7D] dark:text-[#9E97B3] truncate">{r.description}</p>
                    <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold block mt-0.5 tabular-nums">
                      {(r.onlineCount || 24).toLocaleString()} online
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    enterRoom(r.id);
                  }}
                  className="min-h-[40px] px-4 py-1.5 bg-[#191525] dark:bg-[#F4F2FA] group-hover:bg-[#5420F5] dark:group-hover:bg-[#5420F5] text-white dark:text-[#191525] group-hover:text-white rounded-xl text-xs font-black transition-colors cursor-pointer shrink-0"
                >
                  Enter ›
                </button>
              </div>
            ))}
          </div>
        )
      )}

      {/* Interactive Followers & Following List Modal */}
      {!isAnonymous && (
        <FollowListModal
          isOpen={followModalTab !== null}
          initialTab={followModalTab || 'followers'}
          targetUsername={profile.username}
          targetDisplayName={profileName}
          onClose={() => setFollowModalTab(null)}
        />
      )}
    </div>
  );
};
