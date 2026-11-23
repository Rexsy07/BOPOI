import React from 'react';
import { Home, Compass, Plus, Inbox, User } from 'lucide-react';
import { useBopoi } from '../../context/BopoiContext.tsx';
import { CampusCharacterAvatar } from '../brand/character/index.ts';
import { useNavLongPress } from '../../hooks/useNavLongPress.ts';

export const BottomNavBar: React.FC = () => {
  const {
    user,
    isAuthenticated,
    activeView,
    setActiveView,
    unreadCount,
    unreadReportsCount,
    setIsCreateModalOpen,
    setIsStartPagePickerOpen,
  } = useBopoi();

  const isLoggedIn = Boolean(isAuthenticated && user.username && user.username !== 'student');

  const { holdingTarget, getHandlers } = useNavLongPress({
    onTrigger: () => setIsStartPagePickerOpen(true),
  });

  const isHomeActive =
    activeView === 'home' ||
    activeView === 'confessions' ||
    activeView === 'polls' ||
    activeView === 'poll-detail' ||
    activeView === 'discussions' ||
    activeView === 'rooms' ||
    activeView === 'room-detail' ||
    activeView === 'post-detail';

  const isDiscoverActive = activeView === 'discover';
  const isInboxActive = activeView === 'inbox' || activeView === 'message-detail';
  const isProfileActive =
    activeView === 'profile' || activeView === 'saved' || activeView === 'public-profile';

  return (
    <nav
      aria-label="Primary mobile navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 pb-[env(safe-area-inset-bottom)] bg-white/95 dark:bg-[#0E0C14]/95 backdrop-blur-md border-t border-[#EAE6F0] dark:border-[#262036] select-none"
    >
      <div className="h-[58px] w-full max-w-[640px] mx-auto px-2 sm:px-6 flex items-center justify-around">
        {/* 1. Home */}
        <button
          type="button"
          aria-current={isHomeActive ? 'page' : undefined}
          title="Home (Hold to choose start page on login)"
          {...getHandlers('home', () => {
            if (activeView === 'home') {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
              setActiveView('home');
            }
          })}
          className={`relative flex-1 max-w-[76px] min-w-0 h-full flex flex-col items-center justify-center gap-0.5 transition-all duration-150 cursor-pointer [webkit-touch-callout:none] ${
            holdingTarget === 'home' ? 'scale-90 opacity-75' : ''
          } ${
            isHomeActive
              ? 'text-[#5420F5] dark:text-[#8E72FF]'
              : 'text-[#706B7D] dark:text-[#9E97B3] hover:text-[#191525] dark:hover:text-white'
          }`}
        >
          {isHomeActive && (
            <span className="absolute top-0 w-7 h-0.5 rounded-full bg-[#5420F5] dark:bg-[#8E72FF]" />
          )}
          <span className="w-8 h-6 flex items-center justify-center shrink-0">
            <Home
              className="w-[22px] h-[22px] shrink-0"
              strokeWidth={isHomeActive ? 2.5 : 1.85}
              fill={isHomeActive ? 'currentColor' : 'none'}
              fillOpacity={isHomeActive ? 0.14 : 0}
            />
          </span>
          <span className={`text-[10px] leading-none ${isHomeActive ? 'font-black' : 'font-semibold'}`}>
            Home
          </span>
        </button>

        {/* 2. Discover */}
        <button
          type="button"
          aria-current={isDiscoverActive ? 'page' : undefined}
          title="Discover (Hold to choose start page on login)"
          {...getHandlers('discover', () => {
            if (activeView === 'discover') {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
              setActiveView('discover');
            }
          })}
          className={`relative flex-1 max-w-[76px] min-w-0 h-full flex flex-col items-center justify-center gap-0.5 transition-all duration-150 cursor-pointer [webkit-touch-callout:none] ${
            holdingTarget === 'discover' ? 'scale-90 opacity-75' : ''
          } ${
            isDiscoverActive
              ? 'text-[#5420F5] dark:text-[#8E72FF]'
              : 'text-[#706B7D] dark:text-[#9E97B3] hover:text-[#191525] dark:hover:text-white'
          }`}
        >
          {isDiscoverActive && (
            <span className="absolute top-0 w-7 h-0.5 rounded-full bg-[#5420F5] dark:bg-[#8E72FF]" />
          )}
          <span className="w-8 h-6 flex items-center justify-center shrink-0">
            <Compass
              className="w-[22px] h-[22px] shrink-0"
              strokeWidth={isDiscoverActive ? 2.5 : 1.85}
              fill={isDiscoverActive ? 'currentColor' : 'none'}
              fillOpacity={isDiscoverActive ? 0.14 : 0}
            />
          </span>
          <span className={`text-[10px] leading-none ${isDiscoverActive ? 'font-black' : 'font-semibold'}`}>
            Discover
          </span>
        </button>

        {/* 3. Centered Threads-style Create Button */}
        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="w-12 h-9 mx-1 rounded-2xl bg-[#191525] dark:bg-[#5420F5] hover:bg-[#5420F5] dark:hover:bg-[#6A3DF7] text-white flex items-center justify-center active:scale-95 transition-all cursor-pointer shrink-0 shadow-xs"
          title="Create Content"
          aria-label="Create Content"
        >
          <Plus className="w-5 h-5 stroke-[2.75] shrink-0" />
        </button>

        {/* 4. Inbox */}
        <button
          type="button"
          aria-current={isInboxActive ? 'page' : undefined}
          title="Inbox (Hold to choose start page on login)"
          {...getHandlers('inbox', () => {
            if (activeView === 'inbox') {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
              setActiveView('inbox');
            }
          })}
          className={`relative flex-1 max-w-[76px] min-w-0 h-full flex flex-col items-center justify-center gap-0.5 transition-all duration-150 cursor-pointer [webkit-touch-callout:none] ${
            holdingTarget === 'inbox' ? 'scale-90 opacity-75' : ''
          } ${
            isInboxActive
              ? 'text-[#5420F5] dark:text-[#8E72FF]'
              : 'text-[#706B7D] dark:text-[#9E97B3] hover:text-[#191525] dark:hover:text-white'
          }`}
        >
          {isInboxActive && (
            <span className="absolute top-0 w-7 h-0.5 rounded-full bg-[#5420F5] dark:bg-[#8E72FF]" />
          )}
          <span className="relative w-8 h-6 flex items-center justify-center shrink-0">
            <Inbox
              className="w-[22px] h-[22px] shrink-0"
              strokeWidth={isInboxActive ? 2.5 : 1.85}
              fill={isInboxActive ? 'currentColor' : 'none'}
              fillOpacity={isInboxActive ? 0.14 : 0}
            />
            {Boolean(unreadCount && unreadCount > 0) && (
              <span className="absolute -top-1 -right-1.5 bg-[#F52D85] text-white text-[9px] font-black min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center border-2 border-white dark:border-[#0E0C14] tabular-nums">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </span>
          <span className={`text-[10px] leading-none ${isInboxActive ? 'font-black' : 'font-semibold'}`}>
            Inbox
          </span>
        </button>

        {/* 5. Profile (Instagram-style mini character avatar when logged in) */}
        <button
          type="button"
          aria-current={isProfileActive ? 'page' : undefined}
          title="Profile (Hold to choose start page on login)"
          {...getHandlers('profile', () => {
            if (activeView === 'profile') {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
              setActiveView('profile');
            }
          })}
          className={`relative flex-1 max-w-[76px] min-w-0 h-full flex flex-col items-center justify-center gap-0.5 transition-all duration-150 cursor-pointer [webkit-touch-callout:none] ${
            holdingTarget === 'profile' ? 'scale-90 opacity-75' : ''
          } ${
            isProfileActive
              ? 'text-[#5420F5] dark:text-[#8E72FF]'
              : 'text-[#706B7D] dark:text-[#9E97B3] hover:text-[#191525] dark:hover:text-white'
          }`}
        >
          {isProfileActive && (
            <span className="absolute top-0 w-7 h-0.5 rounded-full bg-[#5420F5] dark:bg-[#8E72FF]" />
          )}
          <span className="relative w-8 h-6 flex items-center justify-center shrink-0">
            {isLoggedIn ? (
              <span
                className={`rounded-full p-[1.5px] transition-all ${
                  isProfileActive
                    ? 'ring-2 ring-[#5420F5] dark:ring-[#8E72FF]'
                    : 'ring-1 ring-[#EAE6F0] dark:ring-[#262036]'
                }`}
              >
                <CampusCharacterAvatar
                  value={user.avatarUrl}
                  seed={user.username}
                  size={21}
                  rounded="full"
                />
              </span>
            ) : (
              <User
                className="w-[22px] h-[22px] shrink-0"
                strokeWidth={isProfileActive ? 2.5 : 1.85}
                fill={isProfileActive ? 'currentColor' : 'none'}
                fillOpacity={isProfileActive ? 0.14 : 0}
              />
            )}
            {Boolean(unreadReportsCount > 0) && (
              <span className="absolute -top-1 -right-1.5 bg-[#F52D85] text-white text-[9px] font-black min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center border-2 border-white dark:border-[#0E0C14] tabular-nums">
                {unreadReportsCount}
              </span>
            )}
          </span>
          <span className={`text-[10px] leading-none ${isProfileActive ? 'font-black' : 'font-semibold'}`}>
            Profile
          </span>
        </button>
      </div>
    </nav>
  );
};
