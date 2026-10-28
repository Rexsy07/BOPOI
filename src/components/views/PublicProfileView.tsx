import React, { useState } from 'react';
import { useBopoi } from '../../context/BopoiContext.tsx';
import { SocialPost } from '../../types/index.ts';
import {
  ChevronLeft,
  Share2,
  UserPlus,
  Check,
  Send,
  MessageCircle,
  Heart,
  BarChart3,
  Lock,
  Sparkles,
  School,
  ExternalLink,
} from 'lucide-react';
import { BopoiAnonymousAvatar } from '../brand/BopoiAnonymousAvatar.tsx';
import {
  BopoiIcon,
  SparklePolishIcon,
  StudentPostsIcon,
  ShareCardsIcon,
  CreateConfessionIcon,
  CreatePollIcon,
  CreateDiscussionIcon,
  CreatePostIcon,
  CreateRoomIcon,
  StoryStudioNavIcon,
  PublicAskNavIcon,
} from '../brand/icons/index.ts';
import { CampusCharacterAvatar } from '../brand/character/index.ts';
import { FollowListModal } from '../modals/FollowListModal.tsx';

export const PublicProfileView: React.FC = () => {
  const {
    selectedPublicUser,
    socialPosts,
    answers,
    rooms,
    enterRoom,
    creators,
    toggleFollowCreator,
    getFollowersForUser,
    getFollowingForUser,
    isFollowingUser,
    setSelectedPost,
    setSelectedAnswer,
    setActiveView,
    goBack,
    user,
    showToast,
    openPostShare,
    openPublicAskFor,
    toggleAnswerLike,
    copyUserLink,
    switchAccount,
    accounts,
  } = useBopoi();

  const [activeTab, setActiveTab] = useState<'posts' | 'answers' | 'rooms'>('posts');
  const [followModalTab, setFollowModalTab] = useState<'followers' | 'following' | null>(null);

  // Active profile data
  const profile = selectedPublicUser || creators[0] || user;
  const profileName = ('name' in profile ? profile.name : (profile as any).displayName) || profile.username;
  const isMe = profile.username.toLowerCase() === user.username.toLowerCase();
  const isAnonymous =
    profile.username.toLowerCase().startsWith('anon') ||
    profileName.toLowerCase().includes('anon');

  // Find if current user is following this creator
  const creatorRecord = creators.find(
    (c) => c.username.toLowerCase() === profile.username.toLowerCase()
  );
  const isFollowing = isFollowingUser(profile.username);
  const liveFollowersCount = isAnonymous ? 0 : getFollowersForUser(profile.username).length;
  const liveFollowingCount = isAnonymous ? 0 : getFollowingForUser(profile.username).length;

  // Find posts by this student
  const studentPosts = socialPosts.filter(
    (p) =>
      p.authorUsername.toLowerCase() === profile.username.toLowerCase() ||
      p.authorName.toLowerCase() === profileName.toLowerCase()
  );

  // Dynamic public Q&A answers for this student
  const studentAnswers = Object.values(answers).filter(
    (a) =>
      a.isPublic &&
      !a.isDraft &&
      a.authorUsername?.toLowerCase() === profile.username.toLowerCase()
  );

  // Dynamic rooms this student participates in or created
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

  const handleOpenPost = (post: SocialPost) => {
    setSelectedPost(post);
    if (post.type === 'poll') {
      setActiveView('poll-detail');
    } else {
      setActiveView('post-detail');
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 py-3 pb-24 space-y-4 text-[#191525]">
      {/* 1. Header Bar */}
      <div className="flex items-center justify-between py-2 border-b border-[#EAE6F0]">
        <button
          onClick={() => goBack('home')}
          className="p-1.5 -ml-1.5 rounded-full hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer flex items-center"
          title="Go back"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <h1 className="text-sm sm:text-base font-black text-[#191525] truncate">
          @{profile.username}
        </h1>

        <button
          onClick={handleShare}
          className="p-1.5 -mr-1.5 rounded-full hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
          title="Share profile"
        >
          <Share2 className="w-5 h-5" />
        </button>
      </div>

      {/* 2. Hero Profile Card - Clean, no thumbnail banner, just pristine profile picture */}
      <div className="bg-white rounded-3xl border border-[#EAE6F0] shadow-xs p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            {/* Profile Picture */}
            {isAnonymous ? (
              <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-[#5420F5] flex items-center justify-center ring-2 ring-[#5420F5]/20 shadow-sm shrink-0">
                <BopoiAnonymousAvatar size="lg" idPrefix="pub-prof-anon" showSparkleBadge />
              </div>
            ) : (
              <CampusCharacterAvatar
                value={isMe ? user.avatarUrl : profile.avatarUrl}
                seed={profile.username}
                size={68}
                rounded="full"
                showRing
                className="ring-2 ring-[#5420F5]/15"
              />
            )}

            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-lg sm:text-xl font-black text-[#191525]">{profileName}</h2>
                <span title="Verified Campus Student" className="inline-flex items-center">
                  <SparklePolishIcon size={16} />
                </span>
              </div>
              <p className="text-xs text-[#706B7D] font-semibold">@{profile.username}</p>

              {/* Campus Tag */}
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-[#F0EBFF] text-[#5420F5] text-[11px] font-bold rounded-full mt-1.5">
                <School className="w-3 h-3" />
                <span>{profile.campus || 'Nigerian University Student'}</span>
              </div>
            </div>
          </div>

          {/* Follow / Edit Button */}
          {!isMe ? (
            <button
              onClick={handleToggleFollow}
              className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0 ${
                isFollowing
                  ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  : 'bg-[#5420F5] hover:bg-[#4314E2] text-white shadow-md shadow-[#5420F5]/25 active:scale-95'
              }`}
            >
              {isFollowing ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
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
            <button
              onClick={() => setActiveView('profile')}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer shrink-0"
            >
              Edit My Profile
            </button>
          )}
        </div>

        {/* Bio */}
        {profile.bio && (
          <p className="text-xs sm:text-sm text-slate-800 font-medium leading-relaxed">
            {profile.bio}
          </p>
        )}

          {/* Interactive Stats Bar */}
          <div className="flex items-center gap-4 sm:gap-6 pt-2 border-t border-slate-100 text-xs flex-wrap">
            <button
              type="button"
              disabled={isAnonymous}
              onClick={() => !isAnonymous && setFollowModalTab('followers')}
              className={`px-2.5 py-1.5 -ml-2.5 rounded-xl transition-colors text-left ${
                isAnonymous
                  ? 'cursor-default'
                  : 'hover:bg-[#F0EBFF] cursor-pointer group'
              }`}
              title={isAnonymous ? undefined : `See who follows @${profile.username}`}
            >
              <span className="font-black text-[#191525] group-hover:text-[#5420F5] tabular-nums">
                {liveFollowersCount.toLocaleString()}
              </span>{' '}
              <span className="text-[#706B7D] group-hover:text-[#5420F5] font-semibold">
                Followers
              </span>
            </button>

            <button
              type="button"
              disabled={isAnonymous}
              onClick={() => !isAnonymous && setFollowModalTab('following')}
              className={`px-2.5 py-1.5 rounded-xl transition-colors text-left ${
                isAnonymous
                  ? 'cursor-default'
                  : 'hover:bg-[#F0EBFF] cursor-pointer group'
              }`}
              title={isAnonymous ? undefined : `See who @${profile.username} follows`}
            >
              <span className="font-black text-[#191525] group-hover:text-[#5420F5] tabular-nums">
                {liveFollowingCount.toLocaleString()}
              </span>{' '}
              <span className="text-[#706B7D] group-hover:text-[#5420F5] font-semibold">
                Following
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('posts')}
              className="px-2.5 py-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer text-left"
            >
              <span className="font-black text-[#191525] tabular-nums">{studentPosts.length}</span>{' '}
              <span className="text-[#706B7D] font-semibold">Posts</span>
            </button>
          </div>
        </div>

      {/* 3. Send Anonymous Message Callout */}
      {!isMe && (
        <div className="bg-gradient-to-r from-[#F0EBFF] via-white to-[#F0EBFF] border border-[#5420F5]/25 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3.5 text-center sm:text-left">
            <BopoiAnonymousAvatar size="md" idPrefix="profile-anon-cta" showSparkleBadge />
            <div>
              <h4 className="text-sm font-black text-[#191525]">
                Send an anonymous message to {profileName}
              </h4>
              <p className="text-xs text-[#706B7D] mt-0.5">
                They will receive your question secretly in @{profile.username}'s inbox.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <button
              onClick={() => openPublicAskFor(profile)}
              className="flex-1 sm:flex-none px-5 py-2.5 bg-[#5420F5] hover:bg-[#4314E2] text-white text-xs font-extrabold rounded-xl shadow-md shadow-[#5420F5]/25 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Ask Anonymously</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. Profile Content Tabs */}
      <div className="flex items-center border-b border-[#EAE6F0] pt-1 overflow-x-auto no-scrollbar">
        {[
          {
            id: 'posts',
            label: `Posts (${studentPosts.length})`,
            icon: <StudentPostsIcon size={15} />,
          },
          {
            id: 'answers',
            label: `Answered Q&A (${studentAnswers.length})`,
            icon: <StoryStudioNavIcon size={15} />,
          },
          {
            id: 'rooms',
            label: `Rooms (${studentRooms.length})`,
            icon: <CreateRoomIcon size={15} />,
          },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-2.5 px-4 text-xs font-black transition-all relative cursor-pointer inline-flex items-center gap-1.5 shrink-0 ${
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

      {/* 5. Tab Content */}
      <div className="space-y-3 pt-1">
        {activeTab === 'posts' && (
          studentPosts.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-3xl border border-[#EAE6F0] p-6 space-y-2.5">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center mx-auto p-1.5 shadow-2xs">
                <StudentPostsIcon size={36} />
              </div>
              <p className="text-xs font-bold text-slate-700">No public posts yet from {profileName}</p>
              <p className="text-[11px] text-slate-500">Check back later or ask them a question!</p>
            </div>
          ) : (
            studentPosts.map((post) => (
              <div
                key={post.id}
                onClick={() => handleOpenPost(post)}
                className="bg-white rounded-3xl p-4 sm:p-5 border border-[#EAE6F0] shadow-xs hover:border-[#5420F5]/30 hover:shadow-md transition-all cursor-pointer space-y-2.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[10px] text-slate-400">{post.createdAt}</span>
                  <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 capitalize inline-flex items-center gap-1">
                    {post.type === 'confession' ? (
                      <CreateConfessionIcon size={13} />
                    ) : post.type === 'poll' ? (
                      <CreatePollIcon size={13} />
                    ) : post.type === 'discussion' ? (
                      <CreateDiscussionIcon size={13} />
                    ) : (
                      <CreatePostIcon size={13} />
                    )}
                    <span>{post.type}</span>
                  </span>
                </div>

                {post.title && (
                  <h4 className="text-sm font-black text-[#191525]">{post.title}</h4>
                )}

                <p className="text-xs sm:text-sm text-slate-800 font-medium leading-relaxed">
                  {post.content}
                </p>

                <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1 font-semibold text-[#F52D85]">
                      <Heart className="w-3.5 h-3.5 fill-[#F52D85]" />
                      <span>{post.likes}</span>
                    </span>
                    <span className="flex items-center gap-1 font-semibold">
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>{post.commentsCount}</span>
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openPostShare(post);
                    }}
                    className="flex items-center gap-1 font-semibold hover:text-[#5420F5] transition-colors cursor-pointer py-1 px-2 rounded-lg hover:bg-[#F0EBFF]"
                    title="Share post off-campus"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>{post.sharesCount || 0}</span>
                  </button>
                </div>
              </div>
            ))
          )
        )}

        {activeTab === 'answers' && (
          <div className="space-y-3">
            {studentAnswers.length > 0 ? (
              studentAnswers.map((ans) => (
                <div
                  key={ans.id}
                  className="bg-white rounded-3xl p-5 border border-[#EAE6F0] shadow-xs space-y-3"
                >
                  <div className="bg-[#FAF9FC] border border-[#EAE6F0] rounded-2xl p-3.5">
                    <span className="text-[10px] font-bold text-[#706B7D] block mb-1">
                      Anonymous Question
                    </span>
                    <p className="text-xs font-bold text-[#191525]">"{ans.questionText}"</p>
                  </div>

                  <div className="bg-[#F0EBFF]/50 rounded-2xl p-3.5 border border-[#5420F5]/20">
                    <span className="text-[10px] font-black text-[#5420F5] block mb-1">
                      {profileName}'s Answer
                    </span>
                    <p className="text-xs text-slate-800 font-semibold leading-relaxed">
                      "{ans.answerText}"
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                    <div className="flex items-center gap-3">
                      <span>Answered {ans.createdAt}</span>
                      <button
                        onClick={() => toggleAnswerLike(ans.messageId)}
                        className="flex items-center gap-1 font-bold text-[#F52D85] hover:opacity-80 cursor-pointer"
                      >
                        <Heart className="w-3.5 h-3.5 fill-[#F52D85]" />
                        <span>{ans.likes}</span>
                      </button>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedAnswer(ans);
                        setActiveView('answer-studio');
                      }}
                      className="text-xs font-bold text-[#5420F5] hover:underline cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <ShareCardsIcon size={15} />
                      <span>View Story Card</span>
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white rounded-3xl p-8 border border-[#EAE6F0] text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center mx-auto p-1.5 shadow-2xs">
                  <StoryStudioNavIcon size={36} />
                </div>
                <p className="text-xs font-bold text-slate-700">
                  No public Q&amp;A answers from {profileName} yet
                </p>
                <p className="text-[11px] text-slate-500">
                  Send {profileName} an anonymous question and they can share their answer here!
                </p>
                <button
                  onClick={() => openPublicAskFor(profile)}
                  className="px-4 py-2 bg-[#5420F5] text-white text-xs font-bold rounded-xl hover:bg-[#4314E2] cursor-pointer inline-flex items-center gap-1.5"
                >
                  <PublicAskNavIcon size={15} />
                  <span>Ask {profileName} a Question</span>
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'rooms' && (
          <div className="space-y-2.5">
            {studentRooms.map((r) => {
              const accentHex = r.iconBg || '#5420F5';
              return (
                <div
                  key={r.id}
                  onClick={() => {
                    enterRoom(r.id);
                  }}
                  className="bg-white rounded-2xl p-3.5 border border-[#EAE6F0] flex items-center justify-between gap-3 hover:border-[#5420F5]/40 hover:shadow-sm transition-all cursor-pointer group active:scale-[0.99]"
                  title={`Enter #${r.name}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      style={{
                        borderColor: `${accentHex}45`,
                        backgroundColor: `${accentHex}10`,
                      }}
                      className="w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 p-1.5 shadow-2xs group-hover:scale-105 transition-transform"
                    >
                      <BopoiIcon
                        name={r.category || r.name}
                        size={26}
                        fallbackEmoji={r.iconEmoji || '💬'}
                      />
                    </div>
                    <div className="min-w-0">
                      <h5 className="text-xs font-black text-[#191525] group-hover:text-[#5420F5] transition-colors truncate">
                        {r.name}
                      </h5>
                      <p className="text-[10px] text-slate-500 truncate">{r.description}</p>
                      <span className="text-[9px] text-emerald-600 font-bold flex items-center gap-1 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>{r.onlineCount || 24} online</span>
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      enterRoom(r.id);
                    }}
                    className="px-3.5 py-1.5 bg-[#5420F5] hover:bg-[#4314E2] text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-2xs shrink-0"
                  >
                    Enter ›
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

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
