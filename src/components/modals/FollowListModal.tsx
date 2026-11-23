import React, { useState, useMemo } from 'react';
import { X, Search, UserPlus, Check, School } from 'lucide-react';
import { useBopoi } from '../../context/BopoiContext.tsx';
import { CampusCharacterAvatar } from '../brand/character/index.ts';
import {
  BopoiSearchIcon,
  RealPeopleIcon,
  SearchEmptyIcon,
  SparklePolishIcon,
  DiscoverCompassNavIcon,
} from '../brand/icons/index.ts';
import { VerifiedCreatorBadge } from '../ui/VerifiedCreatorBadge.tsx';

interface FollowListModalProps {
  isOpen: boolean;
  initialTab: 'followers' | 'following';
  targetUsername: string;
  targetDisplayName?: string;
  onClose: () => void;
}

export const FollowListModal: React.FC<FollowListModalProps> = ({
  isOpen,
  initialTab,
  targetUsername,
  targetDisplayName,
  onClose,
}) => {
  const {
    user,
    getFollowersForUser,
    getFollowingForUser,
    isFollowingUser,
    toggleFollowCreator,
    viewUserProfile,
    setActiveView,
  } = useBopoi();

  const [activeTab, setActiveTab] = useState<'followers' | 'following'>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');

  // Keep activeTab synced when initialTab prop changes on open
  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setSearchQuery('');
    }
  }, [isOpen, initialTab]);

  React.useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const followersList = useMemo(
    () => getFollowersForUser(targetUsername),
    [getFollowersForUser, targetUsername]
  );

  const followingList = useMemo(
    () => getFollowingForUser(targetUsername),
    [getFollowingForUser, targetUsername]
  );

  const myFollowersUsernameSet = useMemo(() => {
    const myFollowers = getFollowersForUser(user.username);
    return new Set(myFollowers.map((f) => f.username.toLowerCase()));
  }, [getFollowersForUser, user.username]);

  const currentList = activeTab === 'followers' ? followersList : followingList;

  const filteredList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return currentList;
    return currentList.filter(
      (person) =>
        person.name.toLowerCase().includes(q) ||
        person.username.toLowerCase().includes(q) ||
        (person.campus && person.campus.toLowerCase().includes(q)) ||
        (person.bio && person.bio.toLowerCase().includes(q))
    );
  }, [currentList, searchQuery]);

  if (!isOpen) return null;

  const isMe = targetUsername.toLowerCase() === (user.username || '').toLowerCase();

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#0E0C14] text-[#191525] dark:text-[#F4F2FA] w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl border border-[#EAE6F0] dark:border-[#262036] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-[#EAE6F0] dark:bg-[#262036] rounded-full mx-auto mt-2.5 sm:hidden shrink-0" />

        {/* Top Modal Header */}
        <div className="px-5 pt-4 pb-3 border-b border-[#EAE6F0] dark:border-[#262036] flex items-center justify-between bg-[#FAF9FC] dark:bg-[#171322]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#F0EBFF] dark:bg-[#231942] flex items-center justify-center shrink-0">
              <RealPeopleIcon size={22} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-black text-[#191525] dark:text-[#F4F2FA] truncate">
                {targetDisplayName || `@${targetUsername}`}
              </h3>
              <p className="text-[11px] font-semibold text-[#706B7D] dark:text-[#9E97B3] truncate">
                @{targetUsername} · Campus Connections
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] -mr-2 rounded-full bg-slate-100/70 dark:bg-[#0E0C14]/70 hover:bg-slate-200 dark:hover:bg-[#231942] text-slate-600 dark:text-[#9E97B3] hover:text-[#191525] dark:hover:text-[#F4F2FA] flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="Close"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Followers / Following Switcher Tabs */}
        <div className="grid grid-cols-2 border-b border-[#EAE6F0] dark:border-[#262036] bg-white dark:bg-[#0E0C14]">
          <button
            type="button"
            onClick={() => setActiveTab('followers')}
            className={`min-h-[44px] py-3 text-xs font-black transition-all relative cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'followers'
                ? 'text-[#5420F5] dark:text-[#8E6BFF]'
                : 'text-[#706B7D] dark:text-[#9E97B3] hover:text-[#191525] dark:hover:text-[#F4F2FA]'
            }`}
          >
            <span>Followers</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black tabular-nums ${
                activeTab === 'followers'
                  ? 'bg-[#F0EBFF] dark:bg-[#231A45] text-[#5420F5] dark:text-[#A78BFA]'
                  : 'bg-slate-100 dark:bg-[#171322] text-slate-600 dark:text-[#9E97B3]'
              }`}
            >
              {followersList.length.toLocaleString()}
            </span>
            {activeTab === 'followers' && (
              <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-[#5420F5] rounded-full" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('following')}
            className={`min-h-[44px] py-3 text-xs font-black transition-all relative cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'following'
                ? 'text-[#5420F5] dark:text-[#8E6BFF]'
                : 'text-[#706B7D] dark:text-[#9E97B3] hover:text-[#191525] dark:hover:text-[#F4F2FA]'
            }`}
          >
            <span>Following</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black tabular-nums ${
                activeTab === 'following'
                  ? 'bg-[#F0EBFF] dark:bg-[#231A45] text-[#5420F5] dark:text-[#A78BFA]'
                  : 'bg-slate-100 dark:bg-[#171322] text-slate-600 dark:text-[#9E97B3]'
              }`}
            >
              {followingList.length.toLocaleString()}
            </span>
            {activeTab === 'following' && (
              <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-[#5420F5] rounded-full" />
            )}
          </button>
        </div>

        {/* Search Input */}
        <div className="p-3.5 border-b border-[#EAE6F0] dark:border-[#262036] bg-[#FAF9FC] dark:bg-[#171322]">
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center">
              <BopoiSearchIcon size={16} />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${activeTab === 'followers' ? 'followers' : 'following'} by name, @handle or campus...`}
              className="w-full pl-9 pr-9 py-2 rounded-xl bg-white dark:bg-[#0E0C14] border border-[#EAE6F0] dark:border-[#262036] text-base sm:text-xs font-semibold text-[#191525] dark:text-[#F4F2FA] placeholder:text-slate-400 dark:placeholder:text-[#7D7594] focus:outline-none focus:border-[#5420F5]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="min-w-[32px] min-h-[32px] flex items-center justify-center absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#9E97B3] hover:text-slate-600 dark:hover:text-white cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable List of People */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 bg-white dark:bg-[#0E0C14]">
          {filteredList.length === 0 ? (
            <div className="py-10 px-4 text-center flex flex-col items-center justify-center space-y-3.5">
              <div className="w-16 h-16 rounded-2xl bg-[#F0EBFF] dark:bg-[#231942] border border-[#5420F5]/15 dark:border-[#7C5CFF]/25 flex items-center justify-center mx-auto shadow-2xs p-2">
                {searchQuery ? <SearchEmptyIcon size={42} /> : <RealPeopleIcon size={42} />}
              </div>
              <div className="space-y-1 max-w-xs mx-auto">
                <p className="text-sm font-black text-[#191525] dark:text-[#F4F2FA]">
                  {searchQuery
                    ? `No matches for "${searchQuery}"`
                    : activeTab === 'followers'
                    ? isMe
                      ? 'No followers yet'
                      : `@${targetUsername} has no followers yet`
                    : isMe
                    ? 'You are not following anyone yet'
                    : `@${targetUsername} isn't following anyone yet`}
                </p>
                <p className="text-xs text-[#706B7D] dark:text-[#9E97B3] leading-relaxed">
                  {activeTab === 'following' && isMe
                    ? 'Explore Discover to find and follow verified creators and students from your campus!'
                    : 'Share your profile link or join campus rooms to connect with more students.'}
                </p>
              </div>
              {!searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    setActiveView('discover');
                  }}
                  className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#5420F5] hover:bg-[#4314E2] text-white text-xs font-black transition-all cursor-pointer shadow-sm"
                >
                  <DiscoverCompassNavIcon size={16} />
                  <span>Discover Campus Students</span>
                </button>
              )}
            </div>
          ) : (
            filteredList.map((person) => {
              const isPersonMe =
                person.username.toLowerCase() === (user.username || '').toLowerCase();
              const amFollowingPerson = isFollowingUser(person.username);
              const followsMe = myFollowersUsernameSet.has(person.username.toLowerCase());

              return (
                <div
                  key={person.id || person.username}
                  className="flex items-center justify-between gap-3 p-2.5 rounded-2xl bg-white dark:bg-[#0E0C14] hover:bg-[#FAF9FC] dark:hover:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] transition-colors"
                >
                  <div
                    onClick={() => {
                      onClose();
                      viewUserProfile(person.username, false, person.campus);
                    }}
                    className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer group"
                  >
                    <CampusCharacterAvatar
                      value={person.avatarUrl}
                      seed={person.username}
                      size={44}
                      rounded="full"
                      showRing
                      className="shrink-0 group-hover:scale-105 transition-transform"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <span className="text-xs sm:text-sm font-black text-[#191525] dark:text-[#F4F2FA] truncate group-hover:text-[#5420F5] dark:group-hover:text-[#8E6BFF] transition-colors">
                          {person.name}
                        </span>
                        <VerifiedCreatorBadge
                          isVerified={person.isVerified}
                          username={person.username}
                          size={15}
                        />
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-semibold text-[#706B7D] dark:text-[#9E97B3] truncate">
                          @{person.username}
                        </span>
                        {followsMe && !isPersonMe && (
                          <span className="text-[10px] font-bold text-[#5420F5] dark:text-[#8E6BFF]">
                            · Follows you
                          </span>
                        )}
                      </div>
                      {person.campus && (
                        <div className="inline-flex items-center gap-1 text-[10px] font-bold text-[#706B7D] dark:text-[#9E97B3] mt-0.5 truncate max-w-full">
                          <School className="w-2.5 h-2.5 text-[#5420F5] dark:text-[#8E6BFF] shrink-0" />
                          <span className="truncate">{person.campus}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {!isPersonMe ? (
                    <button
                      type="button"
                      onClick={() => toggleFollowCreator(person.id || person.username)}
                      className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                        amFollowingPerson
                          ? 'bg-slate-100 dark:bg-[#171322] hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-700 dark:text-[#D5D0E6] hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200 dark:border-[#262036]'
                          : 'bg-[#5420F5] hover:bg-[#4314E2] text-white shadow-xs active:scale-95'
                      }`}
                    >
                      {amFollowingPerson ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 stroke-[3]" />
                          <span>Following</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>{followsMe ? 'Follow Back' : 'Follow'}</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <span className="px-2.5 py-1 rounded-lg bg-[#F0EBFF] dark:bg-[#231942] text-[#5420F5] dark:text-[#B9A4FF] text-[10px] font-black shrink-0">
                      You
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
