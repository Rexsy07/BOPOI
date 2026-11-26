import React, { useMemo, useState } from 'react';
import { Copy, Check, ArrowRight, UserPlus, Lock, X } from 'lucide-react';
import { useBopoi } from '../../context/BopoiContext.tsx';
import { computeTrendingHashtags } from '../../utils/hashtags.ts';
import { computeLocalAdamicAdarRecommendations } from '../../lib/supabase.ts';
import { BopoiSearchIcon, RoomBadgeIcon } from '../brand/icons/index.ts';
import { CampusCharacterAvatar } from '../brand/character/index.ts';
import { VerifiedCreatorBadge } from '../ui/VerifiedCreatorBadge.tsx';

export const DesktopDiscoveryRail: React.FC = () => {
  const {
    user,
    isAuthenticated,
    socialPosts,
    answers,
    rooms,
    creators,
    followEdges,
    isFollowingUser,
    toggleFollowCreator,
    viewUserProfile,
    enterRoom,
    setActiveView,
    openHashtag,
    setGlobalSearchQuery,
    setIsSearchModalOpen,
    copyUserLink,
  } = useBopoi();

  const myImpact = useMemo(() => {
    const myLower = (user.username || '').toLowerCase();
    const myPosts = socialPosts.filter(
      (p) =>
        (user.id && p.authorUserId === user.id) ||
        (!p.isAnonymous && myLower && (p.authorUsername || '').toLowerCase() === myLower)
    );
    const likesReceived = myPosts.reduce((sum, p) => sum + (p.likes || 0), 0);
    const answersCount = Object.values(answers || {}).filter(
      (a) => !a.isDraft && (!a.authorUsername || a.authorUsername.toLowerCase() === myLower)
    ).length;
    return {
      postsCount: myPosts.length,
      likesReceived,
      answersCount,
    };
  }, [socialPosts, answers, user.id, user.username]);

  const isLoggedIn = Boolean(isAuthenticated && user.username && user.username !== 'student');
  const [quickQuery, setQuickQuery] = useState('');
  const [copied, setCopied] = useState(false);

  const trendingHashtags = useMemo(
    () => computeTrendingHashtags(socialPosts, rooms, 6),
    [socialPosts, rooms]
  );

  const topLiveRooms = useMemo(() => {
    const now = Date.now();
    return [...rooms]
      .sort((a, b) => {
        const aRecent = (a.messages || []).filter(
          (m) => now - (m.createdTimestamp || 0) < 6 * 60 * 60 * 1000
        ).length;
        const bRecent = (b.messages || []).filter(
          (m) => now - (m.createdTimestamp || 0) < 6 * 60 * 60 * 1000
        ).length;
        return (
          (b.onlineCount || 1) * 2 +
          bRecent * 4 -
          ((a.onlineCount || 1) * 2 + aRecent * 4)
        );
      })
      .slice(0, 3);
  }, [rooms]);

  const suggestedStudents = useMemo(() => {
    const rec = computeLocalAdamicAdarRecommendations(
      user.id || '',
      user.username || '',
      user.campus || 'Chrisland University',
      followEdges,
      creators,
      socialPosts
    );
    const list = rec.length > 0 ? rec : creators;
    return list
      .filter((c) => c.username.toLowerCase() !== (user.username || '').toLowerCase())
      .slice(0, 3);
  }, [user.id, user.username, user.campus, followEdges, creators, socialPosts]);

  const handleQuickSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalSearchQuery(quickQuery.trim());
    setActiveView('discover');
  };

  const handleCopyAsk = async () => {
    await copyUserLink();
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <aside className="hidden xl:flex flex-col w-80 shrink-0 sticky top-0 h-dvh overflow-y-auto no-scrollbar py-5 pl-4 space-y-4 select-none">
      {/* 1. Quick Campus Search */}
      <form onSubmit={handleQuickSearchSubmit} className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center">
          <BopoiSearchIcon size={16} />
        </span>
        <input
          type="text"
          value={quickQuery}
          onChange={(e) => {
            setQuickQuery(e.target.value);
            setGlobalSearchQuery(e.target.value);
          }}
          placeholder="Search #tags, posts, @students..."
          className="w-full pl-10 pr-16 py-2.5 bg-white dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] rounded-2xl text-xs font-semibold text-[#191525] dark:text-[#F4F2FA] placeholder:text-[#706B7D] dark:placeholder:text-[#9E97B3] focus:outline-none focus:border-[#5420F5] transition-colors"
        />
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {quickQuery && (
            <button
              type="button"
              onClick={() => {
                setQuickQuery('');
                setGlobalSearchQuery('');
              }}
              aria-label="Clear search"
              className="p-1 rounded-md text-[#706B7D] dark:text-[#9E97B3] hover:text-[#191525] dark:hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsSearchModalOpen(true)}
            title="Open quick search spotlight (⌘K or /)"
            className="px-1.5 py-0.5 rounded-md bg-[#FAF9FC] dark:bg-[#0E0C14] hover:bg-[#F0EBFF] dark:hover:bg-[#231A45] border border-[#EAE6F0] dark:border-[#262036] text-[10px] font-extrabold text-[#706B7D] dark:text-[#9E97B3] hover:text-[#5420F5] transition-colors cursor-pointer"
          >
            ⌘K
          </button>
        </div>
      </form>

      {/* 2. Personal Anonymous Ask Link Utility Card */}
      <div className="bg-white dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] rounded-2xl p-4 space-y-2.5">
        {isLoggedIn ? (
          <>
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-black text-[#191525] dark:text-[#F4F2FA]">
                Your Anonymous Link
              </h3>
              <span className="text-[11px] font-bold text-[#5420F5] dark:text-[#9B82FF]">
                {user.linkActive ? 'Active' : 'Paused'}
              </span>
            </div>
            <p className="text-xs font-mono text-[#706B7D] dark:text-[#9E97B3] truncate">
              bopoi.com/@{user.username}/ask
            </p>
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#EAE6F0] dark:border-[#262036] text-center tabular-nums">
              <button
                type="button"
                onClick={() => setActiveView('profile')}
                className="hover:bg-[#FAF9FC] dark:hover:bg-[#1E192D] rounded-xl py-1 transition-colors cursor-pointer"
              >
                <span className="text-xs font-black text-[#191525] dark:text-[#F4F2FA] block">
                  {myImpact.postsCount}
                </span>
                <span className="text-[10px] font-semibold text-[#706B7D] dark:text-[#9E97B3]">
                  Posts
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveView('profile')}
                className="hover:bg-[#FAF9FC] dark:hover:bg-[#1E192D] rounded-xl py-1 transition-colors cursor-pointer"
              >
                <span className="text-xs font-black text-[#F52D85] block">
                  {myImpact.likesReceived}
                </span>
                <span className="text-[10px] font-semibold text-[#706B7D] dark:text-[#9E97B3]">
                  Likes
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveView('answer-studio')}
                className="hover:bg-[#FAF9FC] dark:hover:bg-[#1E192D] rounded-xl py-1 transition-colors cursor-pointer"
              >
                <span className="text-xs font-black text-[#5420F5] dark:text-[#9B82FF] block">
                  {myImpact.answersCount}
                </span>
                <span className="text-[10px] font-semibold text-[#706B7D] dark:text-[#9E97B3]">
                  Answers
                </span>
              </button>
            </div>

            <div className="flex items-center gap-2 pt-0.5">
              <button
                type="button"
                onClick={handleCopyAsk}
                className="flex-1 py-2 px-3 rounded-xl bg-[#5420F5] hover:bg-[#4314E2] text-white text-xs font-extrabold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy Link'}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveView('public-ask')}
                className="py-2 px-3 rounded-xl bg-[#FAF9FC] dark:bg-[#0E0C14] hover:bg-[#F0EBFF] dark:hover:bg-[#231A45] border border-[#EAE6F0] dark:border-[#262036] text-[#191525] dark:text-[#F4F2FA] text-xs font-bold transition-colors cursor-pointer"
              >
                Preview
              </button>
            </div>
          </>
        ) : (
          <>
            <h3 className="text-xs font-black text-[#191525] dark:text-[#F4F2FA]">
              Get your Bopoi Ask link
            </h3>
            <p className="text-[11px] text-[#706B7D] dark:text-[#9E97B3] leading-relaxed">
              Receive anonymous questions from classmates and share custom answer cards.
            </p>
            <button
              type="button"
              onClick={() => setActiveView('register')}
              className="w-full py-2 px-3 rounded-xl bg-[#5420F5] hover:bg-[#4314E2] text-white text-xs font-extrabold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>Create my link</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>

      {/* 3. Trending Hashtags */}
      {trendingHashtags.length > 0 && (
        <div className="bg-white dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[#EAE6F0] dark:border-[#262036] flex items-center justify-between">
            <h3 className="text-xs font-black text-[#191525] dark:text-[#F4F2FA]">
              Trending Hashtags
            </h3>
            <button
              type="button"
              onClick={() => setActiveView('discover')}
              className="text-[11px] font-bold text-[#5420F5] dark:text-[#9B82FF] hover:underline cursor-pointer"
            >
              Explore
            </button>
          </div>
          <div className="divide-y divide-[#EAE6F0] dark:divide-[#262036]">
            {trendingHashtags.map((item) => (
              <button
                key={item.tag}
                type="button"
                onClick={() => openHashtag(item.tag)}
                className="w-full px-4 py-2.5 text-left hover:bg-[#FAF9FC] dark:hover:bg-[#1E192D] transition-colors flex items-center justify-between gap-2 cursor-pointer"
              >
                <span className="text-xs font-extrabold text-[#191525] dark:text-[#F4F2FA] truncate">
                  {item.tag}
                </span>
                <span className="text-[11px] font-semibold text-[#706B7D] dark:text-[#9E97B3] tabular-nums shrink-0">
                  {item.count} {item.count === 1 ? 'post' : 'posts'}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 4. Live Campus Rooms */}
      {topLiveRooms.length > 0 && (
        <div className="bg-white dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[#EAE6F0] dark:border-[#262036] flex items-center justify-between">
            <h3 className="text-xs font-black text-[#191525] dark:text-[#F4F2FA]">Live Rooms</h3>
            <button
              type="button"
              onClick={() => setActiveView('rooms')}
              className="text-[11px] font-bold text-[#5420F5] dark:text-[#9B82FF] hover:underline cursor-pointer"
            >
              See all ({rooms.length})
            </button>
          </div>
          <div className="divide-y divide-[#EAE6F0] dark:divide-[#262036]">
            {topLiveRooms.map((room) => (
              <button
                key={room.id}
                type="button"
                onClick={() => enterRoom(room.id)}
                className="w-full px-4 py-2.5 text-left hover:bg-[#FAF9FC] dark:hover:bg-[#1E192D] transition-colors flex items-center justify-between gap-2.5 cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <RoomBadgeIcon
                    iconEmoji={room.iconEmoji}
                    iconBg={room.iconBg}
                    category={room.category}
                    roomName={room.name}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-black text-[#191525] dark:text-[#F4F2FA] truncate">
                        #{room.name}
                      </span>
                      {room.isLocked && <Lock className="w-3 h-3 text-rose-500 shrink-0" />}
                    </div>
                    <span className="text-[11px] text-[#706B7D] dark:text-[#9E97B3] tabular-nums block">
                      {(room.onlineCount ?? 0) > 0
                        ? `${room.onlineCount} active · ${room.membersCount} members`
                        : `${room.membersCount} members`}
                    </span>
                  </div>
                </div>
                <span
                  className={`text-[11px] font-extrabold shrink-0 ${
                    room.isJoined
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-[#5420F5] dark:text-[#9B82FF]'
                  }`}
                >
                  {room.isJoined ? 'Open' : 'Join'}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 5. Who to Follow */}
      {suggestedStudents.length > 0 && (
        <div className="bg-white dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[#EAE6F0] dark:border-[#262036] flex items-center justify-between">
            <h3 className="text-xs font-black text-[#191525] dark:text-[#F4F2FA]">
              Students to Follow
            </h3>
            <button
              type="button"
              onClick={() => setActiveView('discover')}
              className="text-[11px] font-bold text-[#5420F5] dark:text-[#9B82FF] hover:underline cursor-pointer"
            >
              More
            </button>
          </div>
          <div className="divide-y divide-[#EAE6F0] dark:divide-[#262036]">
            {suggestedStudents.map((person) => {
              const following = isFollowingUser(person.username);
              return (
                <div
                  key={person.id}
                  onClick={() => viewUserProfile(person)}
                  className="px-4 py-2.5 hover:bg-[#FAF9FC] dark:hover:bg-[#1E192D] transition-colors flex items-center justify-between gap-2.5 cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <CampusCharacterAvatar
                      value={person.avatarUrl}
                      seed={person.username}
                      size={34}
                      rounded="full"
                      className="ring-1 ring-[#EAE6F0] dark:ring-[#262036] shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="text-xs font-black text-[#191525] dark:text-[#F4F2FA] truncate">
                          {person.name}
                        </span>
                        <VerifiedCreatorBadge
                          isVerified={person.isVerified}
                          username={person.username}
                          size={13}
                        />
                      </div>
                      <span className="text-[11px] text-[#706B7D] dark:text-[#9E97B3] block truncate">
                        @{person.username}
                        {(person as any).isFollowingYou
                          ? ' · Follows you'
                          : (person as any).mutualCount > 0
                          ? ` · ${(person as any).mutualCount} mutual${(person as any).mutualCount > 1 ? 's' : ''}`
                          : ''}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFollowCreator(person.id);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-colors cursor-pointer shrink-0 ${
                      following
                        ? 'bg-[#FAF9FC] dark:bg-[#0E0C14] border border-[#EAE6F0] dark:border-[#262036] text-[#706B7D] dark:text-[#9E97B3] hover:text-[#191525] dark:hover:text-white'
                        : 'bg-[#191525] dark:bg-[#F4F2FA] hover:bg-[#5420F5] dark:hover:bg-[#7C5CFF] text-white dark:text-[#191525] dark:hover:text-white'
                    }`}
                  >
                    {following ? 'Following' : (
                      <span className="inline-flex items-center gap-1">
                        <UserPlus className="w-3 h-3" />
                        <span>Follow</span>
                      </span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </aside>
  );
};
