import React, { useState } from 'react';
import {
  Plus,
  Bell,
  LogOut,
  UserPlus,
  Copy,
  Check,
  Home,
  Compass,
  MessagesSquare,
  Inbox,
  Layers,
  User,
  ShieldCheck,
  Sun,
  Moon,
} from 'lucide-react';
import { useBopoi } from '../../context/BopoiContext.tsx';
import { ActiveAppView, StartupNavView } from '../../types/index.ts';
import { BopoiLogo } from '../brand/BopoiLogo.tsx';
import { CampusCharacterAvatar } from '../brand/character/index.ts';
import { VerifiedCreatorBadge } from '../ui/VerifiedCreatorBadge.tsx';
import { NotificationsPortalModal } from './NotificationsPortalModal.tsx';
import { useNavLongPress } from '../../hooks/useNavLongPress.ts';

export const DesktopNavRail: React.FC = () => {
  const {
    user,
    activeView,
    setActiveView,
    unreadCount,
    unreadReportsCount,
    unreadNotificationsCount,
    setIsCreateModalOpen,
    setIsStartPagePickerOpen,
    isAuthenticated,
    logoutAccount,
    moderationReports,
    showToast,
    copyUserLink,
    theme,
    toggleTheme,
  } = useBopoi();

  const isLoggedIn = Boolean(isAuthenticated && user.username && user.username !== 'student');
  const isAdmin = Boolean(isLoggedIn && (user.isAdmin || user.role === 'admin'));
  const pendingAdminReports = moderationReports.filter((r) => r.status === 'pending').length;

  const [notificationOpen, setNotificationOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const { holdingTarget, getHandlers } = useNavLongPress({
    onTrigger: () => setIsStartPagePickerOpen(true),
  });

  const STARTUP_VIEWS: StartupNavView[] = ['home', 'discover', 'inbox', 'profile'];

  const navItems: Array<{
    view: ActiveAppView;
    label: string;
    renderIcon: (isActive: boolean) => React.ReactNode;
    activeMatch?: ActiveAppView[];
    badge?: number;
  }> = [
    {
      view: 'home',
      label: 'Home',
      renderIcon: (isActive) => (
        <Home
          className="w-[20px] h-[20px] shrink-0"
          strokeWidth={isActive ? 2.4 : 1.85}
          fill={isActive ? 'currentColor' : 'none'}
          fillOpacity={isActive ? 0.14 : 0}
        />
      ),
      activeMatch: ['home', 'confessions', 'polls', 'discussions', 'post-detail', 'poll-detail'],
    },
    {
      view: 'discover',
      label: 'Discover',
      renderIcon: (isActive) => (
        <Compass
          className="w-[20px] h-[20px] shrink-0"
          strokeWidth={isActive ? 2.4 : 1.85}
          fill={isActive ? 'currentColor' : 'none'}
          fillOpacity={isActive ? 0.14 : 0}
        />
      ),
    },
    {
      view: 'rooms',
      label: 'Rooms',
      renderIcon: (isActive) => (
        <MessagesSquare
          className="w-[20px] h-[20px] shrink-0"
          strokeWidth={isActive ? 2.4 : 1.85}
          fill={isActive ? 'currentColor' : 'none'}
          fillOpacity={isActive ? 0.14 : 0}
        />
      ),
      activeMatch: ['rooms', 'room-detail'],
    },
    {
      view: 'inbox',
      label: 'Inbox',
      renderIcon: (isActive) => (
        <Inbox
          className="w-[20px] h-[20px] shrink-0"
          strokeWidth={isActive ? 2.4 : 1.85}
          fill={isActive ? 'currentColor' : 'none'}
          fillOpacity={isActive ? 0.14 : 0}
        />
      ),
      activeMatch: ['inbox', 'message-detail'],
      badge: unreadCount,
    },
    {
      view: 'answer-studio',
      label: 'Story Studio',
      renderIcon: (isActive) => (
        <Layers
          className="w-[20px] h-[20px] shrink-0"
          strokeWidth={isActive ? 2.4 : 1.85}
          fill={isActive ? 'currentColor' : 'none'}
          fillOpacity={isActive ? 0.14 : 0}
        />
      ),
    },
    {
      view: 'profile',
      label: 'Profile',
      renderIcon: (isActive) =>
        isLoggedIn ? (
          <span
            className={`rounded-full p-[1px] ${
              isActive
                ? 'ring-2 ring-[#5420F5] dark:ring-[#8E72FF]'
                : 'ring-1 ring-[#EAE6F0] dark:ring-[#262036]'
            }`}
          >
            <CampusCharacterAvatar
              value={user.avatarUrl}
              seed={user.username}
              size={19}
              rounded="full"
            />
          </span>
        ) : (
          <User
            className="w-[20px] h-[20px] shrink-0"
            strokeWidth={isActive ? 2.4 : 1.85}
            fill={isActive ? 'currentColor' : 'none'}
            fillOpacity={isActive ? 0.14 : 0}
          />
        ),
      activeMatch: ['profile', 'saved', 'public-profile'],
      badge: unreadReportsCount,
    },
  ];

  const handleCopy = async () => {
    await copyUserLink();
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <aside className="hidden lg:flex flex-col justify-between w-60 xl:w-64 shrink-0 sticky top-0 h-dvh py-5 pr-4 select-none">
      {/* Top Brand + Streamlined Threads/IG Navigation */}
      <div className="space-y-5 overflow-y-auto no-scrollbar pb-4">
        <button
          type="button"
          onClick={() => setActiveView('home')}
          className="flex items-center gap-3 px-3 py-1.5 cursor-pointer group text-left"
          title="Bopoi Home"
        >
          <BopoiLogo variant="icon" size="sm" />
          <span className="text-2xl font-black tracking-tight text-[#191525] dark:text-[#F4F2FA]">
            Bopo
            <span className="relative inline-block">
              ı
              <span className="absolute -top-0.5 right-0 w-2 h-2 bg-[#FFC928] rounded-full" />
            </span>
          </span>
        </button>

        <nav aria-label="Primary desktop navigation" className="space-y-1">
          {navItems.map((item) => {
            const isActive = item.activeMatch
              ? item.activeMatch.includes(activeView)
              : activeView === item.view;
            const isStartupEligible = STARTUP_VIEWS.includes(item.view as StartupNavView);
            const handleTap = () => {
              if (activeView === item.view) {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              } else {
                setActiveView(item.view);
              }
            };
            const holdProps = isStartupEligible
              ? getHandlers(item.view as StartupNavView, handleTap)
              : { onClick: handleTap };

            return (
              <button
                key={item.view}
                type="button"
                aria-current={isActive ? 'page' : undefined}
                title={
                  isStartupEligible
                    ? `${item.label} (Hold to choose start page on login)`
                    : item.label
                }
                {...holdProps}
                className={`w-full min-h-[44px] flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-sm transition-colors duration-150 cursor-pointer whitespace-nowrap select-none [-webkit-touch-callout:none] [-webkit-user-select:none] ${
                  isStartupEligible ? 'touch-none' : ''
                } ${
                  isStartupEligible && holdingTarget === item.view
                    ? 'bg-[#F0EBFF]/80 dark:bg-[#231A45]/80 ring-2 ring-[#5420F5]/35 dark:ring-[#8E72FF]/45'
                    : ''
                } ${
                  isActive
                    ? 'bg-white dark:bg-[#171322] text-[#5420F5] dark:text-[#9B82FF] font-black border border-[#EAE6F0] dark:border-[#262036] shadow-2xs'
                    : 'text-[#191525]/85 dark:text-[#D9D3EB] hover:bg-white/80 dark:hover:bg-[#171322]/70 hover:text-[#191525] dark:hover:text-white font-semibold border border-transparent'
                }`}
              >
                <span
                  className={`pointer-events-none flex items-center gap-3 min-w-0 transition-transform duration-150 ${
                    isStartupEligible && holdingTarget === item.view ? 'scale-[0.95]' : ''
                  }`}
                >
                  <span className="shrink-0 flex items-center justify-center w-5 h-5">
                    {item.renderIcon(isActive)}
                  </span>
                  <span className="truncate">{item.label}</span>
                </span>
                {Boolean(item.badge && item.badge > 0) && (
                  <span className="pointer-events-none text-[11px] font-black text-[#F52D85] tabular-nums shrink-0">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* Notifications Trigger */}
          <button
            type="button"
            onClick={() => {
              if (!isLoggedIn) {
                showToast('Please sign in to view your notifications.', 'info');
                setActiveView('profile');
                return;
              }
              setNotificationOpen(true);
            }}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-sm text-[#191525]/85 dark:text-[#D9D3EB] hover:bg-white/80 dark:hover:bg-[#171322]/70 hover:text-[#191525] dark:hover:text-white font-semibold border border-transparent transition-colors cursor-pointer whitespace-nowrap"
          >
            <span className="flex items-center gap-3 min-w-0">
              <span className="shrink-0 flex items-center justify-center w-5 h-5">
                <Bell className="w-[20px] h-[20px] shrink-0" strokeWidth={1.85} />
              </span>
              <span className="truncate">Notifications</span>
            </span>
            {isLoggedIn && unreadNotificationsCount > 0 && (
              <span className="text-[11px] font-black text-[#F52D85] tabular-nums shrink-0">
                {unreadNotificationsCount}
              </span>
            )}
          </button>

          {/* Admin Console (Strictly admin only) */}
          {isAdmin && (
            <button
              type="button"
              aria-current={activeView === 'admin' ? 'page' : undefined}
              onClick={() => setActiveView('admin')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-sm transition-colors cursor-pointer whitespace-nowrap ${
                activeView === 'admin'
                  ? 'bg-white dark:bg-[#171322] text-[#5420F5] dark:text-[#9B82FF] font-black border border-[#EAE6F0] dark:border-[#262036] shadow-2xs'
                  : 'text-[#191525]/85 dark:text-[#D9D3EB] hover:bg-white/80 dark:hover:bg-[#171322]/70 hover:text-[#5420F5] font-semibold border border-transparent'
              }`}
            >
              <span className="flex items-center gap-3 min-w-0">
                <span className="shrink-0 flex items-center justify-center w-5 h-5">
                  <ShieldCheck
                    className="w-[20px] h-[20px] shrink-0"
                    strokeWidth={activeView === 'admin' ? 2.4 : 1.85}
                    fill={activeView === 'admin' ? 'currentColor' : 'none'}
                    fillOpacity={activeView === 'admin' ? 0.14 : 0}
                  />
                </span>
                <span className="truncate">Admin</span>
              </span>
              {pendingAdminReports > 0 && (
                <span className="text-[11px] font-black text-[#F52D85] tabular-nums shrink-0">
                  {pendingAdminReports}
                </span>
              )}
            </button>
          )}
        </nav>

        {/* Primary Create Post CTA */}
        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="w-full py-3 px-4 rounded-2xl bg-[#5420F5] hover:bg-[#4314E2] dark:bg-[#6A3DF7] dark:hover:bg-[#5420F5] text-white text-sm font-black transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm active:scale-[0.98]"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>New Post</span>
        </button>
      </div>

      {/* Bottom Theme Toggle + User Card / Auth CTA */}
      <div className="pt-3 border-t border-[#EAE6F0] dark:border-[#262036] space-y-2.5">
        <button
          type="button"
          onClick={toggleTheme}
          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] hover:border-[#5420F5]/40 text-xs font-bold text-[#191525] dark:text-[#F4F2FA] flex items-center justify-between transition-colors cursor-pointer"
          aria-label="Toggle Night Campus dark mode"
        >
          <span className="flex items-center gap-2">
            {theme === 'dark' ? (
              <Moon className="w-3.5 h-3.5 text-[#9B82FF]" />
            ) : (
              <Sun className="w-3.5 h-3.5 text-[#FF922E]" />
            )}
            <span>{theme === 'dark' ? 'Night Campus' : 'Crisp White'}</span>
          </span>
          <span
            className={`w-8 h-4 rounded-full p-0.5 transition-colors flex items-center ${
              theme === 'dark' ? 'bg-[#5420F5] justify-end' : 'bg-[#EAE6F0] justify-start'
            }`}
          >
            <span className="w-3 h-3 rounded-full bg-white shadow-2xs" />
          </span>
        </button>

        {isLoggedIn ? (
          <div className="bg-white dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] rounded-2xl p-2.5 space-y-2">
            <div
              onClick={() => setActiveView('profile')}
              className="flex items-center gap-2.5 cursor-pointer group min-w-0"
            >
              <CampusCharacterAvatar
                value={user.avatarUrl}
                seed={user.username}
                size={36}
                rounded="full"
                className="ring-1 ring-[#EAE6F0] dark:ring-[#262036] shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 min-w-0">
                  <span className="text-xs font-black text-[#191525] dark:text-[#F4F2FA] group-hover:text-[#5420F5] dark:group-hover:text-[#9B82FF] truncate">
                    {user.displayName}
                  </span>
                  <VerifiedCreatorBadge
                    isVerified={Boolean(user.isVerified || user.isCreator)}
                    username={user.username}
                    size={13}
                  />
                </div>
                <span className="text-[11px] text-[#706B7D] dark:text-[#9E97B3] block truncate">
                  @{user.username}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 pt-1 border-t border-[#EAE6F0]/70 dark:border-[#262036]">
              <button
                type="button"
                onClick={handleCopy}
                className="flex-1 py-1.5 px-2 rounded-xl bg-[#FAF9FC] dark:bg-[#231A45] hover:bg-[#F0EBFF] dark:hover:bg-[#2E2359] text-[#5420F5] dark:text-[#B49EFF] text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                title="Copy your anonymous ask link"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Ask Link'}</span>
              </button>
              <button
                type="button"
                onClick={logoutAccount}
                className="p-1.5 rounded-xl text-[#706B7D] dark:text-[#9E97B3] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                title="Sign Out"
                aria-label="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setActiveView('profile')}
            className="w-full py-2.5 px-4 rounded-2xl bg-[#191525] dark:bg-[#F4F2FA] hover:bg-[#2A253B] dark:hover:bg-white text-white dark:text-[#191525] text-xs font-extrabold transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>Sign In / Get Link</span>
          </button>
        )}
      </div>

      <NotificationsPortalModal
        isOpen={notificationOpen}
        onClose={() => setNotificationOpen(false)}
      />
    </aside>
  );
};
