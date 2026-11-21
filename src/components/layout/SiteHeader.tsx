import React, { useState } from 'react';
import { BopoiLogo } from '../brand/BopoiLogo.tsx';
import { useBopoi } from '../../context/BopoiContext.tsx';
import {
  ChevronDown,
  LogOut,
  UserPlus,
  Home,
  MessagesSquare,
  Compass,
  Inbox,
  AtSign,
  User,
  Search,
  Bell,
  ShieldCheck,
  Bookmark,
  Sun,
  Moon,
} from 'lucide-react';
import { ActiveAppView } from '../../types/index.ts';
import { CampusMegaphoneIcon } from '../brand/icons/index.ts';
import { CampusCharacterAvatar } from '../brand/character/index.ts';
import { VerifiedCreatorBadge } from '../ui/VerifiedCreatorBadge.tsx';
import { NotificationsPortalModal } from './NotificationsPortalModal.tsx';

export const SiteHeader: React.FC = () => {
  const {
    user,
    unreadCount,
    unreadReportsCount,
    activeView,
    setActiveView,
    toggleLinkActive,
    showToast,
    logoutAccount,
    openPublicAskFor,
    setIsSearchModalOpen,
    openLegalDoc,
    unreadNotificationsCount,
    isAuthenticated,
    moderationReports,
    campusAnnouncements,
    theme,
    toggleTheme,
  } = useBopoi();

  const isLoggedIn = Boolean(isAuthenticated && user.username && user.username !== 'student');
  const pendingAdminReports = moderationReports.filter((r) => r.status === 'pending').length;
  const activeAnnouncement = campusAnnouncements.find((a) => a.isActive);

  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);

  // Full-viewport splash and live chat room manage their own headers
  if (activeView === 'splash' || activeView === 'room-detail') {
    return null;
  }

  const isLanding = activeView === 'landing';
  const isStandalone =
    isLanding ||
    activeView === 'onboarding' ||
    activeView === 'register' ||
    activeView === 'link-ready' ||
    activeView === 'message-sent' ||
    (!isLoggedIn && activeView === 'public-ask');

  const landingNavLinks: { view: ActiveAppView; label: string; icon: React.ReactNode; badge?: number }[] = [
    { view: 'home', label: 'Feed', icon: <Home className="w-4 h-4 shrink-0" strokeWidth={2} /> },
    { view: 'rooms', label: 'Rooms', icon: <MessagesSquare className="w-4 h-4 shrink-0 text-[#5420F5]" strokeWidth={2} /> },
    { view: 'discover', label: 'Discover', icon: <Compass className="w-4 h-4 shrink-0" strokeWidth={2} /> },
    { view: 'inbox', label: 'Inbox', icon: <Inbox className="w-4 h-4 shrink-0" strokeWidth={2} />, badge: unreadCount },
    { view: 'public-ask', label: 'Ask Link', icon: <AtSign className="w-4 h-4 shrink-0" strokeWidth={2} /> },
    { view: 'profile', label: 'Profile', icon: <User className="w-4 h-4 shrink-0" strokeWidth={2} />, badge: unreadReportsCount },
  ];

  const handleOpenSearch = () => {
    setUserDropdownOpen(false);
    setNotificationOpen(false);
    setIsSearchModalOpen(true);
  };

  return (
    <header
      className={`sticky top-0 z-40 w-full bg-white/95 dark:bg-[#0E0C14]/95 backdrop-blur-md border-b border-[#EAE6F0] dark:border-[#262036] select-none ${
        isStandalone ? '' : 'lg:hidden'
      }`}
    >
      <div
        className={`mx-auto px-4 sm:px-6 flex items-center justify-between gap-2 sm:gap-3 ${
          isLanding ? 'max-w-6xl h-16' : 'max-w-[640px] h-[52px]'
        }`}
      >
        {/* Zone 1: Brand Wordmark */}
        <button
          type="button"
          onClick={() => {
            const target = isLanding ? 'landing' : 'home';
            if (activeView === target) {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
              setActiveView(target);
            }
          }}
          className="flex items-center gap-2.5 cursor-pointer shrink-0 text-left"
          title="Go to Bopoi Home"
        >
          <BopoiLogo variant="icon" size="sm" />
          <span className="text-xl sm:text-2xl font-black tracking-tight text-[#191525] dark:text-[#F4F2FA]">
            Bopo
            <span className="relative inline-block">
              ı
              <span className="absolute -top-0.5 right-0 w-1.5 h-1.5 bg-[#FFC928] rounded-full" />
            </span>
          </span>
        </button>

        {/* Zone 2: Landing-only desktop navigation */}
        {isLanding && (
          <nav aria-label="Landing navigation" className="hidden md:flex items-center gap-1">
            {landingNavLinks.map((item) => (
              <button
                key={item.view}
                type="button"
                onClick={() => setActiveView(item.view)}
                className="px-3 py-2 rounded-xl text-xs font-bold text-[#706B7D] dark:text-[#9E97B3] hover:text-[#191525] dark:hover:text-white hover:bg-[#FAF9FC] dark:hover:bg-[#171322] transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                {item.icon}
                <span>{item.label}</span>
                {Boolean(item.badge && item.badge > 0) && (
                  <span className="text-[10px] font-black text-[#F52D85] tabular-nums">
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        )}

        {/* Zone 3: Right Actions */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Night Campus 1-Tap Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="w-9 h-9 rounded-full hover:bg-[#FAF9FC] dark:hover:bg-[#171322] text-[#191525] dark:text-[#F4F2FA] transition-colors cursor-pointer flex items-center justify-center shrink-0"
            title={theme === 'dark' ? 'Switch to Crisp White mode' : 'Switch to Night Campus dark mode'}
            aria-label={theme === 'dark' ? 'Switch to Crisp White mode' : 'Switch to Night Campus dark mode'}
          >
            {theme === 'dark' ? (
              <Sun className="w-[18px] h-[18px] text-[#FFD24A] shrink-0" strokeWidth={2.1} />
            ) : (
              <Moon className="w-[18px] h-[18px] text-[#5420F5] shrink-0" strokeWidth={2.1} />
            )}
          </button>

          {!isStandalone && (
            <button
              type="button"
              onClick={handleOpenSearch}
              className="w-9 h-9 rounded-full hover:bg-[#FAF9FC] dark:hover:bg-[#171322] text-[#191525] dark:text-[#F4F2FA] transition-colors cursor-pointer flex items-center justify-center shrink-0"
              title="Search Bopoi"
              aria-label="Search Bopoi"
            >
              <Search className="w-[19px] h-[19px] shrink-0" strokeWidth={2.1} />
            </button>
          )}

          {isLoggedIn && (user.isAdmin || user.role === 'admin') && !isStandalone && (
            <button
              type="button"
              onClick={() => {
                setUserDropdownOpen(false);
                setNotificationOpen(false);
                setActiveView('admin');
              }}
              className={`relative min-h-[34px] px-2.5 rounded-xl border text-xs font-extrabold transition-colors cursor-pointer flex items-center gap-1 shrink-0 ${
                activeView === 'admin'
                  ? 'bg-[#5420F5] text-white border-[#5420F5]'
                  : 'bg-[#FAF9FC] dark:bg-[#171322] text-[#5420F5] dark:text-[#9B82FF] border-[#EAE6F0] dark:border-[#262036] hover:bg-[#F0EBFF] dark:hover:bg-[#231A45]'
              }`}
              title="Open Bopoi Admin Console"
              aria-label="Open Bopoi Admin Console"
            >
              <ShieldCheck className="w-4 h-4 shrink-0" strokeWidth={2.2} />
              {pendingAdminReports > 0 && (
                <span className="text-[10px] font-black text-[#F52D85] tabular-nums">
                  {pendingAdminReports}
                </span>
              )}
            </button>
          )}

          {!isStandalone && (
            <button
              type="button"
              onClick={() => {
                if (!isLoggedIn) {
                  setNotificationOpen(false);
                  setUserDropdownOpen(false);
                  showToast('Please sign in to view your notifications.', 'info');
                  setActiveView('profile');
                  return;
                }
                setNotificationOpen(!notificationOpen);
                setUserDropdownOpen(false);
              }}
              className="relative w-9 h-9 rounded-full hover:bg-[#FAF9FC] dark:hover:bg-[#171322] text-[#191525] dark:text-[#F4F2FA] transition-colors cursor-pointer flex items-center justify-center shrink-0"
              title="Campus Notifications"
              aria-label="Campus Notifications"
            >
              <Bell className="w-[19px] h-[19px] shrink-0" strokeWidth={2.1} />
              {isLoggedIn && unreadNotificationsCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-[#F52D85] text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white dark:border-[#0E0C14] tabular-nums">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>
          )}

          {isLoggedIn ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-1.5 p-1 pr-2 rounded-full hover:bg-[#FAF9FC] dark:hover:bg-[#171322] transition-colors cursor-pointer border border-[#EAE6F0] dark:border-[#262036]"
                aria-label="Account menu"
              >
                <CampusCharacterAvatar
                  value={user.avatarUrl}
                  seed={user.username}
                  size={28}
                  rounded="full"
                />
                <ChevronDown className="w-3.5 h-3.5 text-[#706B7D] dark:text-[#9E97B3]" />
              </button>

              {userDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setUserDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-[#171322] rounded-2xl shadow-xl border border-[#EAE6F0] dark:border-[#262036] p-3 text-xs select-none z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-2.5 pb-3 border-b border-[#EAE6F0] dark:border-[#262036]">
                      <CampusCharacterAvatar
                        value={user.avatarUrl}
                        seed={user.username}
                        size={40}
                        rounded="full"
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-[#191525] dark:text-[#F4F2FA] truncate inline-flex items-center gap-1">
                          <span className="truncate">{user.displayName}</span>
                          <VerifiedCreatorBadge
                            isVerified={Boolean(user.isVerified || user.isCreator)}
                            username={user.username}
                            size={14}
                          />
                        </span>
                        <span className="text-[11px] text-[#706B7D] dark:text-[#9E97B3] truncate">
                          @{user.username}
                        </span>
                      </div>
                    </div>

                    <div className="py-2.5 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="font-semibold text-[#191525] dark:text-[#F4F2FA]">
                          Receive Messages
                        </span>
                        <span className="text-[10px] text-[#706B7D] dark:text-[#9E97B3]">
                          {user.linkActive ? 'Active and open' : 'Temporarily paused'}
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={user.linkActive}
                        onChange={toggleLinkActive}
                        className="w-4 h-4 accent-[#5420F5] cursor-pointer"
                      />
                    </div>

                    <div className="pb-2.5 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="font-semibold text-[#191525] dark:text-[#F4F2FA]">
                          Night Campus Theme
                        </span>
                        <span className="text-[10px] text-[#706B7D] dark:text-[#9E97B3]">
                          {theme === 'dark' ? 'Dark obsidian mode active' : 'Crisp white mode active'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={toggleTheme}
                        className={`w-10 h-5 rounded-full p-0.5 transition-colors flex items-center cursor-pointer ${
                          theme === 'dark'
                            ? 'bg-[#5420F5] justify-end'
                            : 'bg-[#EAE6F0] justify-start'
                        }`}
                        aria-label="Toggle Night Campus Theme"
                      >
                        <span className="w-4 h-4 rounded-full bg-white shadow-xs" />
                      </button>
                    </div>

                    <div className="pt-2 border-t border-[#EAE6F0] dark:border-[#262036] space-y-1">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveView('profile');
                          setUserDropdownOpen(false);
                        }}
                        className="w-full text-left py-2 px-2.5 rounded-xl hover:bg-[#F0EBFF] dark:hover:bg-[#231A45] text-[#5420F5] dark:text-[#9B82FF] font-bold transition-colors cursor-pointer flex items-center justify-between"
                      >
                        <span>Profile &amp; Settings</span>
                        {unreadReportsCount > 0 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#F52D85] text-white tabular-nums">
                            {unreadReportsCount}
                          </span>
                        )}
                      </button>

                      {(user.isAdmin || user.role === 'admin') && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveView('admin');
                            setUserDropdownOpen(false);
                          }}
                          className="w-full text-left py-2 px-2.5 rounded-xl hover:bg-[#F0EBFF] dark:hover:bg-[#231A45] text-[#191525] dark:text-[#F4F2FA] hover:text-[#5420F5] font-bold transition-colors cursor-pointer flex items-center justify-between"
                        >
                          <span className="flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-[#5420F5] dark:text-[#9B82FF] shrink-0" />
                            <span>Admin Console</span>
                          </span>
                          <span className="text-[10px] font-black text-[#5420F5] dark:text-[#9B82FF]">
                            Admin
                          </span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setActiveView('saved');
                          setUserDropdownOpen(false);
                        }}
                        className="w-full text-left py-2 px-2.5 rounded-xl hover:bg-[#F0EBFF] dark:hover:bg-[#231A45] text-[#191525] dark:text-[#F4F2FA] hover:text-[#5420F5] font-bold transition-colors cursor-pointer flex items-center gap-2"
                      >
                        <Bookmark className="w-4 h-4 text-[#5420F5] dark:text-[#9B82FF] shrink-0" />
                        <span>Saved &amp; Bookmarks</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          openPublicAskFor(user);
                          setUserDropdownOpen(false);
                        }}
                        className="w-full text-left py-2 px-2.5 rounded-xl hover:bg-[#FAF9FC] dark:hover:bg-[#1E192D] text-[#191525] dark:text-[#F4F2FA] font-semibold transition-colors cursor-pointer"
                      >
                        View My Public Page
                      </button>
                    </div>

                    <div className="pt-2.5 mt-2 border-t border-[#EAE6F0] dark:border-[#262036] space-y-1.5">
                      <div className="flex items-center justify-between px-1 text-[10px] font-bold text-[#706B7D] dark:text-[#9E97B3]">
                        <button
                          type="button"
                          onClick={() => {
                            setUserDropdownOpen(false);
                            openLegalDoc('terms');
                          }}
                          className="hover:text-[#5420F5] cursor-pointer"
                        >
                          Terms
                        </button>
                        <span>·</span>
                        <button
                          type="button"
                          onClick={() => {
                            setUserDropdownOpen(false);
                            openLegalDoc('privacy');
                          }}
                          className="hover:text-[#5420F5] cursor-pointer"
                        >
                          Privacy
                        </button>
                        <span>·</span>
                        <button
                          type="button"
                          onClick={() => {
                            setUserDropdownOpen(false);
                            openLegalDoc('guidelines');
                          }}
                          className="hover:text-[#5420F5] cursor-pointer"
                        >
                          Guidelines
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setUserDropdownOpen(false);
                          logoutAccount();
                        }}
                        className="w-full mt-1 py-2 px-2.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold transition-colors cursor-pointer flex items-center gap-2"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setActiveView('profile')}
              className="px-3.5 py-2 bg-[#5420F5] hover:bg-[#4314E2] text-white text-xs font-extrabold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Log In</span>
            </button>
          )}
        </div>
      </div>

      {/* Campus Broadcast Banner on mobile/standalone */}
      {activeAnnouncement && activeView !== 'admin' && (
        <div
          onClick={() => setActiveView(activeAnnouncement.actionView || 'home')}
          className={`w-full px-4 py-1.5 text-xs border-t cursor-pointer transition-colors ${
            activeAnnouncement.severity === 'urgent'
              ? 'bg-rose-600 text-white border-rose-700'
              : activeAnnouncement.severity === 'celebration'
              ? 'bg-emerald-600 text-white border-emerald-700'
              : 'bg-[#191525] dark:bg-[#1B1628] text-white border-[#EAE6F0]/10 dark:border-[#262036]'
          }`}
        >
          <div className="max-w-[640px] mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <CampusMegaphoneIcon size={15} />
              <span className="font-black text-[11px] text-[#FFC928] shrink-0">
                {activeAnnouncement.campus}:
              </span>
              <span className="font-bold truncate">{activeAnnouncement.title}</span>
            </div>
            <span className="text-[11px] font-black underline shrink-0">View</span>
          </div>
        </div>
      )}

      <NotificationsPortalModal
        isOpen={notificationOpen}
        onClose={() => setNotificationOpen(false)}
      />
    </header>
  );
};
