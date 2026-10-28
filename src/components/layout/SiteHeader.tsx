import React, { useState } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { BopoiLogo } from '../brand/BopoiLogo.tsx';
import { useBopoi } from '../../context/BopoiContext.tsx';
import {
  Copy,
  X,
  ChevronDown,
  Bell,
  CheckCheck,
  LogOut,
  Users,
  UserPlus,
  Search,
  Shield,
  Megaphone,
} from 'lucide-react';
import { ActiveAppView } from '../../types/index.ts';
import {
  InboxShortcutIcon,
  CopiedClipboardIcon,
  DatingRomanceIcon,
  ReceiveMessagesIcon,
  LaunchTrendingIcon,
  RealPeopleIcon,
  HomeFeedNavIcon,
  DiscoverCompassNavIcon,
  ProfileShieldNavIcon,
  PublicAskNavIcon,
  StoryStudioNavIcon,
  NotificationsBellIcon,
  CreateRoomIcon,
  BookmarkedIcon,
  AdminConsoleNavIcon,
  BopoiSearchIcon,
  CampusMegaphoneIcon,
} from '../brand/icons/index.ts';
import { CampusCharacterAvatar } from '../brand/character/index.ts';

export const SiteHeader: React.FC = () => {
  const {
    user,
    unreadCount,
    activeView,
    setActiveView,
    copyUserLink,
    toggleLinkActive,
    showToast,
    accounts,
    switchAccount,
    logoutAccount,
    openPublicAskFor,
    setIsSearchModalOpen,
    openLegalDoc,
    notifications,
    unreadNotificationsCount,
    markNotificationsRead,
    isAuthenticated,
    socialPosts,
    setSelectedPost,
    enterRoom,
    viewUserProfile,
    isAdminUnlocked,
    moderationReports,
    campusAnnouncements,
  } = useBopoi();

  const isLoggedIn = Boolean(isAuthenticated && user.username && user.username !== 'student');
  const pendingAdminReports = moderationReports.filter((r) => r.status === 'pending').length;
  const activeAnnouncement = campusAnnouncements.find((a) => a.isActive);

  const [copied, setCopied] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'anon_message_received':
      case 'anon_convo_reply':
      case 'anon_message_reaction':
        return <InboxShortcutIcon size={22} />;
      case 'post_liked':
      case 'answer_liked':
      case 'comment_liked':
      case 'room_message_liked':
      case 'room_message_reaction':
        return <DatingRomanceIcon size={22} />;
      case 'post_bookmarked':
        return <BookmarkedIcon size={22} />;
      case 'post_commented':
      case 'comment_replied':
      case 'user_mentioned':
      case 'room_message_reply':
      case 'room_mention':
      case 'room_activity':
      case 'answer_published':
      case 'new_post_from_following':
        return <ReceiveMessagesIcon size={22} />;
      case 'room_joined':
        return <CreateRoomIcon size={22} />;
      case 'poll_voted':
      case 'poll_milestone':
      case 'post_milestone':
        return <LaunchTrendingIcon size={22} />;
      case 'new_follower':
      case 'user_followed':
        return <RealPeopleIcon size={22} />;
      default:
        return <NotificationsBellIcon size={22} />;
    }
  };

  const getNotificationView = (type: string, targetView?: ActiveAppView): ActiveAppView => {
    if (targetView) return targetView;
    switch (type) {
      case 'anon_message_received':
      case 'anon_convo_reply':
      case 'anon_message_reaction':
      case 'welcome_notification':
        return 'inbox';
      case 'room_message_reply':
      case 'room_message_liked':
      case 'room_message_reaction':
      case 'room_joined':
      case 'room_activity':
      case 'room_mention':
        return 'room-detail';
      case 'poll_voted':
      case 'poll_milestone':
        return 'poll-detail';
      case 'new_follower':
      case 'user_followed':
        return 'profile';
      default:
        return 'home';
    }
  };

  const handleCopy = async () => {
    await copyUserLink();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const navLinks: { view: ActiveAppView; label: string; icon: React.ReactNode; badge?: number }[] = [
    { view: 'home', label: 'Home', icon: <HomeFeedNavIcon size={18} /> },
    { view: 'rooms', label: 'Rooms', icon: <CreateRoomIcon size={18} /> },
    { view: 'discover', label: 'Discover', icon: <DiscoverCompassNavIcon size={18} /> },
    { view: 'inbox', label: 'Inbox', icon: <InboxShortcutIcon size={18} />, badge: unreadCount },
    { view: 'public-ask', label: 'Public Ask', icon: <PublicAskNavIcon size={18} /> },
    { view: 'answer-studio', label: 'Story Studio', icon: <StoryStudioNavIcon size={18} /> },
    { view: 'profile', label: 'Profile', icon: <ProfileShieldNavIcon size={18} /> },
  ];

  const handleNavClick = (view: ActiveAppView) => {
    setActiveView(view);
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-[#EAE6F0] shadow-xs select-none">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Brand Wordmark */}
        <div
          onClick={() => setActiveView('home')}
          className="flex items-center gap-3 cursor-pointer shrink-0"
          title="Go to Bopoi Home"
        >
          <BopoiLogo variant="icon" size="sm" />
          <div className="flex flex-col">
            <span className="text-2xl font-black tracking-tight text-[#191525]">
              Bopo<span className="relative inline-block">ı<span className="absolute -top-0.5 right-0 w-2 h-2 bg-[#FFC928] rounded-full shadow-2xs" /></span>
            </span>
          </div>
        </div>

        {/* Zone 2: Navigation Links (Desktop) */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-2">
          {navLinks.map((item) => {
            const isActive =
              activeView === item.view ||
              (item.view === 'home' && (activeView === 'landing' || activeView === 'onboarding' || activeView === 'splash'));
            return (
              <button
                key={item.view}
                onClick={() => handleNavClick(item.view)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  isActive
                    ? 'bg-[#F0EBFF] text-[#5420F5]'
                    : 'text-[#706B7D] hover:text-[#191525] hover:bg-slate-50'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
                {Boolean(item.badge && item.badge > 0) && (
                  <span className="bg-[#F52D85] text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Search Button (Navigates to Discover Search Section & Opens Mobile Keyboard), User Link Pill & Account Dropdown */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Header Search Button -> Navigates to Discover Search Section and synchronously opens mobile keyboard */}
          <button
            type="button"
            onClick={() => {
              flushSync(() => {
                setIsSearchModalOpen(true);
                setActiveView('discover');
              });
              const input = document.getElementById('discover-search-input') as HTMLInputElement | null;
              const section = document.getElementById('discover-search-section');
              if (input) {
                input.focus({ preventScroll: true });
                input.click();
              }
              if (section) {
                section.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FAF9FC] hover:bg-[#F0EBFF]/70 border border-[#EAE6F0] hover:border-[#5420F5]/40 text-[#706B7D] hover:text-[#191525] transition-all cursor-pointer"
            title="Go to Search on Discover page"
          >
            <BopoiSearchIcon size={18} />
            <span className="text-xs font-bold hidden sm:inline">Search</span>
          </button>

          {/* Quick Copy Link Pill (Only when logged in) */}
          {isLoggedIn && (
            <div className="hidden lg:flex items-center bg-[#FAF9FC] border border-[#EAE6F0] hover:border-[#5420F5]/40 rounded-xl p-1 pl-3 transition-colors">
              <span className="text-xs font-mono font-medium text-slate-600 truncate max-w-[130px]">
                @{user.username}/ask
              </span>
              <button
                onClick={handleCopy}
                className="ml-2 px-2.5 py-1 bg-[#5420F5] hover:bg-[#4314E2] text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer shadow-xs"
                title="Copy your anonymous link"
              >
                {copied ? <CopiedClipboardIcon size={14} /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          )}

          {/* Admin Console Quick-Access Shortcut (Strictly visible only to logged-in database admins) */}
          {isLoggedIn && (user.isAdmin || user.role === 'admin') && (
            <button
              type="button"
              onClick={() => {
                setUserDropdownOpen(false);
                setNotificationOpen(false);
                setActiveView('admin');
              }}
              className={`relative flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-extrabold transition-all cursor-pointer ${
                activeView === 'admin'
                  ? 'bg-[#5420F5] text-white border-[#5420F5] shadow-xs'
                  : 'bg-[#F0EBFF] text-[#5420F5] border-[#5420F5]/30 hover:bg-[#E4DCFF]'
              }`}
              title="Open Bopoi Admin Console"
            >
              <AdminConsoleNavIcon size={18} />
              <span className="hidden xl:inline">Admin</span>
              {pendingAdminReports > 0 && (
                <span className="w-4 h-4 rounded-full bg-[#F52D85] text-white text-[10px] font-mono font-black flex items-center justify-center">
                  {pendingAdminReports}
                </span>
              )}
            </button>
          )}

          {/* Notification Button Icon with Badge */}
          <div className="relative">
            <button
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
              className="relative p-2 rounded-full hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer flex items-center justify-center"
              title="Campus Notifications"
              aria-label="Campus Notifications"
            >
              <NotificationsBellIcon size={22} />
              {isLoggedIn && unreadNotificationsCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-[#F52D85] text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-xs">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>

            {/* Centered Notifications Modal Panel teleported to document.body */}
            {isLoggedIn &&
              notificationOpen &&
              typeof document !== 'undefined' &&
              createPortal(
                <div
                  className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
                  style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
                >
                  {/* Backdrop Click-to-Close */}
                  <div
                    className="absolute inset-0"
                    onClick={() => setNotificationOpen(false)}
                  />

                  {/* Perfectly Centered Card */}
                  <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-[#EAE6F0] p-4 sm:p-6 text-xs select-none z-10 animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[85vh]">
                    {/* Header */}
                    <div className="flex items-center justify-between pb-3.5 border-b border-[#EAE6F0] shrink-0">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-2xl bg-purple-50 border border-[#5420F5]/15 flex items-center justify-center shadow-2xs shrink-0">
                          <NotificationsBellIcon size={24} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-black text-[#191525] text-base leading-none">Notifications</h3>
                            {unreadNotificationsCount > 0 && (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#F52D85] text-white">
                                {unreadNotificationsCount} new
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#706B7D] mt-1">Stay updated with your campus circle</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {unreadNotificationsCount > 0 && (
                          <button
                            onClick={() => {
                              markNotificationsRead();
                              showToast('Notifications marked as read!', 'success');
                            }}
                            className="text-[11px] font-bold text-[#5420F5] hover:bg-purple-50 px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <CheckCheck className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Mark read</span>
                          </button>
                        )}
                        <button
                          onClick={() => setNotificationOpen(false)}
                          className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-black transition-colors cursor-pointer"
                          title="Close notifications"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    {/* Scrollable Notification List */}
                    <div className="py-2.5 space-y-1.5 overflow-y-auto flex-1 divide-y divide-slate-100 pr-0.5">
                      {notifications.length === 0 ? (
                        <div className="py-10 text-center space-y-2">
                          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto">
                            <NotificationsBellIcon size={24} />
                          </div>
                          <p className="text-sm font-black text-[#191525]">No notifications yet</p>
                          <p className="text-xs text-[#706B7D] max-w-xs mx-auto">
                            When students send you anonymous messages, react to your posts, or follow you, they will appear here in real time.
                          </p>
                        </div>
                      ) : (
                        notifications.map((notif) => (
                          <div
                            key={notif.id}
                            onClick={() => {
                              markNotificationsRead(notif.id);
                              setNotificationOpen(false);
                              const resolvedView = getNotificationView(notif.type, notif.targetView);
                              if (
                                (resolvedView === 'room-detail' || resolvedView === 'rooms') &&
                                notif.targetId
                              ) {
                                enterRoom(notif.targetId);
                                return;
                              }
                              if (
                                (resolvedView === 'post-detail' ||
                                  resolvedView === 'poll-detail' ||
                                  notif.type.startsWith('post_') ||
                                  notif.type.startsWith('comment_') ||
                                  notif.type.startsWith('poll_') ||
                                  notif.type === 'user_mentioned' ||
                                  notif.type === 'new_post_from_following') &&
                                notif.targetId
                              ) {
                                const targetPost = socialPosts.find((p) => p.id === notif.targetId);
                                if (targetPost) {
                                  setSelectedPost(targetPost);
                                  setActiveView(
                                    targetPost.type === 'poll' ? 'poll-detail' : 'post-detail'
                                  );
                                  return;
                                }
                              }
                              if (
                                (notif.type === 'user_followed' || notif.type === 'new_follower') &&
                                notif.actorUsername
                              ) {
                                viewUserProfile(notif.actorUsername);
                                return;
                              }
                              setActiveView(resolvedView);
                            }}
                            className={`p-3 rounded-2xl hover:bg-purple-50/60 transition-colors cursor-pointer flex items-start gap-3 border group ${
                              notif.isRead
                                ? 'border-transparent opacity-80'
                                : 'bg-[#FAF9FC] border-[#5420F5]/15'
                            }`}
                          >
                            <div className="w-9 h-9 rounded-2xl bg-purple-50 flex items-center justify-center p-1 shrink-0 mt-0.5 shadow-2xs group-hover:scale-105 transition-transform">
                              {getNotificationIcon(notif.type)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-bold text-[#191525] group-hover:text-[#5420F5] transition-colors">
                                  {notif.title}
                                </span>
                                <span className="text-[10px] text-slate-400 shrink-0">
                                  {notif.createdAt}
                                </span>
                              </div>
                              <p className="text-xs text-[#706B7D] leading-snug mt-1">
                                {notif.body}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Footer */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs shrink-0 bg-white">
                      <span className="text-[11px] text-slate-400 font-medium">Campus updates &amp; alerts</span>
                      <button
                        onClick={() => setNotificationOpen(false)}
                        className="px-4 py-2 bg-[#5420F5] hover:bg-[#4314E2] text-white font-black rounded-xl text-xs transition-colors cursor-pointer shadow-xs active:scale-95"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>,
                document.body
              )}
          </div>

          {/* User Menu Trigger or Log In Button */}
          {isLoggedIn ? (
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 p-1.5 pr-2.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer border border-[#EAE6F0]"
              >
                <CampusCharacterAvatar
                  value={user.avatarUrl}
                  seed={user.username}
                  size={32}
                  rounded="full"
                  className="ring-2 ring-[#5420F5]/20"
                />
                <span className="hidden lg:inline text-xs font-bold text-[#191525]">
                  {user.displayName}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

            {/* Dropdown Menu */}
            {userDropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-[#EAE6F0] p-3 text-xs select-none z-50 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-2.5 pb-3 border-b border-[#EAE6F0]">
                  <CampusCharacterAvatar
                    value={user.avatarUrl}
                    seed={user.username}
                    size={42}
                    rounded="full"
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold text-[#191525] truncate">{user.displayName}</span>
                    <span className="text-[11px] text-[#706B7D] truncate">
                      @{user.username}
                    </span>
                  </div>
                </div>

                {/* Link status toggle */}
                <div className="py-2.5 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="font-semibold text-slate-800">Receive Messages</span>
                    <span className="text-[10px] text-slate-400">
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

                <div className="pt-2 border-t border-[#EAE6F0] space-y-1">
                  <button
                    onClick={() => {
                      setActiveView('profile');
                      setUserDropdownOpen(false);
                    }}
                    className="w-full text-left py-2 px-2.5 rounded-xl hover:bg-[#F0EBFF] text-[#5420F5] font-bold transition-colors cursor-pointer"
                  >
                    Profile &amp; Settings
                  </button>
                  {isLoggedIn && (user.isAdmin || user.role === 'admin') && (
                    <button
                      onClick={() => {
                        setActiveView('admin');
                        setUserDropdownOpen(false);
                      }}
                      className="w-full text-left py-2 px-2.5 rounded-xl hover:bg-[#F0EBFF] text-[#191525] hover:text-[#5420F5] font-bold transition-colors cursor-pointer flex items-center justify-between"
                    >
                      <span className="flex items-center gap-2">
                        <AdminConsoleNavIcon size={17} />
                        <span>Admin Console</span>
                      </span>
                      <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded-md bg-[#F0EBFF] text-[#5420F5]">
                        Live
                      </span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setActiveView('saved');
                      setUserDropdownOpen(false);
                    }}
                    className="w-full text-left py-2 px-2.5 rounded-xl hover:bg-[#F0EBFF] text-slate-700 hover:text-[#5420F5] font-bold transition-colors cursor-pointer flex items-center gap-2"
                  >
                    <BookmarkedIcon size={16} />
                    <span>Saved &amp; Bookmarks</span>
                  </button>
                  <button
                    onClick={() => {
                      openPublicAskFor(user);
                      setUserDropdownOpen(false);
                    }}
                    className="w-full text-left py-2 px-2.5 rounded-xl hover:bg-slate-50 text-slate-700 font-semibold transition-colors cursor-pointer"
                  >
                    View My Public Page
                  </button>
                </div>

                {/* Legal & Sign Out */}
                <div className="pt-2.5 mt-2 border-t border-[#EAE6F0] space-y-1.5">
                  {/* Legal & Safety Quick Links */}
                  <div className="flex items-center justify-between px-1 text-[10px] font-bold text-slate-400">
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        openLegalDoc('terms');
                      }}
                      className="hover:text-[#5420F5] cursor-pointer"
                    >
                      Terms
                    </button>
                    <span>•</span>
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        openLegalDoc('privacy');
                      }}
                      className="hover:text-[#5420F5] cursor-pointer"
                    >
                      Privacy
                    </button>
                    <span>•</span>
                    <button
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
                      onClick={() => {
                        setUserDropdownOpen(false);
                        logoutAccount();
                      }}
                      className="w-full mt-1 py-2 px-2.5 rounded-xl hover:bg-rose-50 text-rose-600 font-bold transition-colors cursor-pointer flex items-center gap-2"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setActiveView('profile')}
              className="px-3.5 py-2 bg-[#5420F5] hover:bg-[#4314E2] text-white text-xs font-extrabold rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Log In</span>
            </button>
          )}
        </div>
      </div>

      {/* Real-Time Campus Broadcast Banner (when active and not in full-viewport room chat) */}
      {activeAnnouncement && activeView !== 'room-detail' && activeView !== 'admin' && (
        <div
          onClick={() => setActiveView(activeAnnouncement.actionView || 'home')}
          className={`w-full px-4 py-2 text-xs border-t cursor-pointer transition-colors ${
            activeAnnouncement.severity === 'urgent'
              ? 'bg-rose-600 text-white border-rose-700'
              : activeAnnouncement.severity === 'celebration'
              ? 'bg-emerald-600 text-white border-emerald-700'
              : 'bg-[#191525] text-white border-[#EAE6F0]/10'
          }`}
        >
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <CampusMegaphoneIcon size={16} />
              <span className="font-black uppercase tracking-wider text-[10px] text-[#FFC928] shrink-0">
                {activeAnnouncement.campus}:
              </span>
              <span className="font-bold truncate">{activeAnnouncement.title}</span>
              <span className="hidden sm:inline text-white/80 truncate">
                — {activeAnnouncement.body}
              </span>
            </div>
            <span className="text-[11px] font-black underline shrink-0">View</span>
          </div>
        </div>
      )}
    </header>
  );
};
