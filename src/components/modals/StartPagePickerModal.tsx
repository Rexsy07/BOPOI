import React, { useState, useEffect, useRef } from 'react';
import { Home, Compass, Inbox, User, Check, X } from 'lucide-react';
import { useBopoi } from '../../context/BopoiContext.tsx';
import { StartupNavView } from '../../types/index.ts';
import { CampusCharacterAvatar } from '../brand/character/index.ts';

interface LaunchOption {
  id: StartupNavView;
  label: string;
  description: string;
}

const LAUNCH_OPTIONS: LaunchOption[] = [
  {
    id: 'home',
    label: 'Home',
    description: 'Campus feed, confessions & live rooms',
  },
  {
    id: 'discover',
    label: 'Discover',
    description: 'Trending topics, polls & students',
  },
  {
    id: 'inbox',
    label: 'Inbox',
    description: 'Anonymous questions & 1-on-1 DMs',
  },
  {
    id: 'profile',
    label: 'Profile',
    description: 'Your posts, saved items & ask link',
  },
];

export const StartPagePickerModal: React.FC = () => {
  const {
    user,
    isAuthenticated,
    defaultLoginView,
    setDefaultLoginView,
    isStartPagePickerOpen,
    setIsStartPagePickerOpen,
  } = useBopoi();

  const [justPicked, setJustPicked] = useState<StartupNavView | null>(null);
  const openedAtRef = useRef(0);

  const isLoggedIn = Boolean(
    isAuthenticated && user.username && user.username !== 'student'
  );

  useEffect(() => {
    if (!isStartPagePickerOpen) {
      setJustPicked(null);
      return;
    }
    openedAtRef.current = Date.now();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsStartPagePickerOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isStartPagePickerOpen, setIsStartPagePickerOpen]);

  if (!isStartPagePickerOpen) return null;

  const activeSelection = justPicked || defaultLoginView;

  const handleChoose = (view: StartupNavView) => {
    setJustPicked(view);
    setDefaultLoginView(view);
    setTimeout(() => {
      setIsStartPagePickerOpen(false);
    }, 220);
  };

  const renderOptionIcon = (id: StartupNavView, isSelected: boolean) => {
    if (id === 'home') {
      return (
        <Home
          className="w-5 h-5"
          strokeWidth={isSelected ? 2.4 : 1.9}
          fill={isSelected ? 'currentColor' : 'none'}
          fillOpacity={isSelected ? 0.16 : 0}
        />
      );
    }
    if (id === 'discover') {
      return (
        <Compass
          className="w-5 h-5"
          strokeWidth={isSelected ? 2.4 : 1.9}
          fill={isSelected ? 'currentColor' : 'none'}
          fillOpacity={isSelected ? 0.16 : 0}
        />
      );
    }
    if (id === 'inbox') {
      return (
        <Inbox
          className="w-5 h-5"
          strokeWidth={isSelected ? 2.4 : 1.9}
          fill={isSelected ? 'currentColor' : 'none'}
          fillOpacity={isSelected ? 0.16 : 0}
        />
      );
    }
    if (isLoggedIn) {
      return (
        <CampusCharacterAvatar
          value={user.avatarUrl}
          seed={user.username}
          size={24}
          rounded="full"
        />
      );
    }
    return (
      <User
        className="w-5 h-5"
        strokeWidth={isSelected ? 2.4 : 1.9}
        fill={isSelected ? 'currentColor' : 'none'}
        fillOpacity={isSelected ? 0.16 : 0}
      />
    );
  };

  return (
    <div
      onClick={() => {
        if (Date.now() - openedAtRef.current < 350) return;
        setIsStartPagePickerOpen(false);
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="start-page-picker-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150 select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white dark:bg-[#0E0C14] text-[#191525] dark:text-[#F4F2FA] rounded-t-3xl sm:rounded-3xl border border-[#EAE6F0] dark:border-[#262036] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-5"
      >
        {/* Mobile Drag Handle */}
        <div className="w-10 h-1 bg-[#EAE6F0] dark:bg-[#262036] rounded-full mx-auto mt-2.5 sm:hidden" />

        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3 border-b border-[#EAE6F0] dark:border-[#262036]">
          <div className="min-w-0">
            <h2
              id="start-page-picker-title"
              className="text-base font-black text-[#191525] dark:text-[#F4F2FA] tracking-tight"
            >
              Open first on login
            </h2>
            <p className="text-xs text-[#706B7D] dark:text-[#9E97B3] mt-0.5">
              Pick which of the 4 pages loads right after you sign in.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsStartPagePickerOpen(false)}
            className="min-w-[40px] min-h-[40px] -mr-2 -mt-1 rounded-full hover:bg-[#FAF9FC] dark:hover:bg-[#171322] text-[#706B7D] dark:text-[#9E97B3] hover:text-[#191525] dark:hover:text-[#F4F2FA] flex items-center justify-center transition-colors cursor-pointer shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2x2 Grid of the 4 Nav Pages */}
        <div className="grid grid-cols-2 gap-2.5 px-5 pt-4">
          {LAUNCH_OPTIONS.map((opt) => {
            const isSelected = activeSelection === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleChoose(opt.id)}
                className={`relative p-3.5 rounded-2xl border text-left transition-all cursor-pointer active:scale-[0.97] min-h-[104px] flex flex-col justify-between ${
                  isSelected
                    ? 'bg-[#F5F2FF] dark:bg-[#1E163B] border-[#5420F5] dark:border-[#8E72FF] shadow-xs'
                    : 'bg-[#FAF9FC] dark:bg-[#171322] border-[#EAE6F0] dark:border-[#262036] hover:border-[#5420F5]/40 dark:hover:border-[#8E72FF]/50'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-[#5420F5] text-white'
                        : 'bg-white dark:bg-[#0E0C14] border border-[#EAE6F0] dark:border-[#262036] text-[#191525] dark:text-[#F4F2FA]'
                    }`}
                  >
                    {renderOptionIcon(opt.id, isSelected)}
                  </span>

                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-[#5420F5] dark:bg-[#8E72FF] text-white scale-100'
                        : 'border border-[#DCD6E6] dark:border-[#342C4A] scale-90 opacity-60'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </span>
                </div>

                <div className="mt-3">
                  <div className="text-sm font-black text-[#191525] dark:text-[#F4F2FA] leading-tight">
                    {opt.label}
                  </div>
                  <div className="text-[11px] text-[#706B7D] dark:text-[#9E97B3] leading-snug mt-0.5 line-clamp-2">
                    {opt.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Quiet Footer Hint */}
        <p className="px-5 pt-3.5 text-center text-[11px] font-medium text-[#706B7D] dark:text-[#9E97B3]">
          Hold Home, Discover, Inbox, or Profile anytime to switch.
        </p>
      </div>
    </div>
  );
};
