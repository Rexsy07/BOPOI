/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy } from 'react';
import { BopoiProvider, useBopoi } from './context/BopoiContext.tsx';
import { SiteHeader } from './components/layout/SiteHeader.tsx';
import { SiteFooter } from './components/layout/SiteFooter.tsx';
import { DesktopNavRail } from './components/layout/DesktopNavRail.tsx';
import { DesktopDiscoveryRail } from './components/layout/DesktopDiscoveryRail.tsx';
import { HomeView } from './components/views/HomeView.tsx';
import { DiscoverView } from './components/views/DiscoverView.tsx';
import { CreateContentModal } from './components/modals/CreateContentModal.tsx';
import { CreateRoomModal } from './components/modals/CreateRoomModal.tsx';
import { SharePostModal } from './components/modals/SharePostModal.tsx';
import { LegalPoliciesModal } from './components/modals/LegalPoliciesModal.tsx';
import { ConfirmActionModal } from './components/modals/ConfirmActionModal.tsx';
import { ReportTicketModal } from './components/modals/ReportTicketModal.tsx';
import { GlobalSearchModal } from './components/modals/GlobalSearchModal.tsx';
import { StartPagePickerModal } from './components/modals/StartPagePickerModal.tsx';
import { BottomNavBar } from './components/navigation/BottomNavBar.tsx';
import { ErrorBoundary } from './components/layout/ErrorBoundary.tsx';
import { useMobileKeyboard } from './hooks/useMobileKeyboard.ts';

import { OnboardingView } from './components/views/OnboardingView.tsx';

// Fast Lazy-Loaded Secondary Views for instant initial load and zero-jank navigation
const HomeLandingView = lazy(() =>
  import('./components/views/HomeLandingView.tsx').then((m) => ({ default: m.HomeLandingView }))
);
const SplashView = lazy(() =>
  import('./components/views/SplashView.tsx').then((m) => ({ default: m.SplashView }))
);
const ConfessionsView = lazy(() =>
  import('./components/views/ConfessionsView.tsx').then((m) => ({ default: m.ConfessionsView }))
);
const PollsView = lazy(() =>
  import('./components/views/PollsView.tsx').then((m) => ({ default: m.PollsView }))
);
const PollDetailView = lazy(() =>
  import('./components/views/PollDetailView.tsx').then((m) => ({ default: m.PollDetailView }))
);
const DiscussionsView = lazy(() =>
  import('./components/views/DiscussionsView.tsx').then((m) => ({ default: m.DiscussionsView }))
);
const RoomsView = lazy(() =>
  import('./components/views/RoomsView.tsx').then((m) => ({ default: m.RoomsView }))
);
const RoomDetailView = lazy(() =>
  import('./components/views/RoomDetailView.tsx').then((m) => ({ default: m.RoomDetailView }))
);
const PostDetailView = lazy(() =>
  import('./components/views/PostDetailView.tsx').then((m) => ({ default: m.PostDetailView }))
);
const RegisterView = lazy(() =>
  import('./components/views/RegisterView.tsx').then((m) => ({ default: m.RegisterView }))
);
const LinkReadyView = lazy(() =>
  import('./components/views/LinkReadyView.tsx').then((m) => ({ default: m.LinkReadyView }))
);
const InboxView = lazy(() =>
  import('./components/views/InboxView.tsx').then((m) => ({ default: m.InboxView }))
);
const MessageDetailModal = lazy(() =>
  import('./components/views/MessageDetailModal.tsx').then((m) => ({ default: m.MessageDetailModal }))
);
const AnswerStudioView = lazy(() =>
  import('./components/views/AnswerStudioView.tsx').then((m) => ({ default: m.AnswerStudioView }))
);
const ProfileView = lazy(() =>
  import('./components/views/ProfileView.tsx').then((m) => ({ default: m.ProfileView }))
);
const PublicProfileView = lazy(() =>
  import('./components/views/PublicProfileView.tsx').then((m) => ({ default: m.PublicProfileView }))
);
const PublicAskView = lazy(() =>
  import('./components/views/PublicAskView.tsx').then((m) => ({ default: m.PublicAskView }))
);
const MessageSentView = lazy(() =>
  import('./components/views/MessageSentView.tsx').then((m) => ({ default: m.MessageSentView }))
);
const AdminConsoleView = lazy(() =>
  import('./components/views/AdminConsoleView.tsx').then((m) => ({ default: m.AdminConsoleView }))
);

import {
  CopiedClipboardIcon,
  BookmarkedIcon,
  DeleteRemoveIcon,
  SparklePolishIcon,
  InboxCaughtUpIcon,
  EditAliasIcon,
  SearchEmptyIcon,
  InboxShortcutIcon,
  LaunchTrendingIcon,
  ReceiveMessagesIcon,
  CampusMegaphoneIcon,
} from './components/brand/icons/index.ts';

const getToastBadge = (message: string) => {
  const m = message.toLowerCase();
  if (m.includes('copied') || m.includes('clipboard')) {
    return <CopiedClipboardIcon size={20} className="shrink-0" />;
  }
  if (m.includes('bookmark') || m.includes('saved')) {
    return <BookmarkedIcon size={20} className="shrink-0" />;
  }
  if (m.includes('delete') || m.includes('remove') || m.includes('flagged') || m.includes('block')) {
    return <DeleteRemoveIcon size={20} className="shrink-0" />;
  }
  if (m.includes('caught up')) {
    return <InboxCaughtUpIcon size={20} className="shrink-0" />;
  }
  if (m.includes('alias') || m.includes('persona') || m.includes('joined #')) {
    return <EditAliasIcon size={20} className="shrink-0" />;
  }
  if (m.includes('search') || m.includes('empty')) {
    return <SearchEmptyIcon size={20} className="shrink-0" />;
  }
  if (m.includes('inbox') || m.includes('shortcut')) {
    return <InboxShortcutIcon size={20} className="shrink-0" />;
  }
  if (m.includes('reply') || m.includes('comment') || m.includes('message')) {
    return <ReceiveMessagesIcon size={20} className="shrink-0" />;
  }
  if (m.includes('published') || m.includes('created') || m.includes('shared') || m.includes('opening')) {
    return <LaunchTrendingIcon size={20} className="shrink-0" />;
  }
  return <SparklePolishIcon size={20} className="shrink-0" />;
};

const FastViewSkeleton: React.FC = () => (
  <div className="w-full divide-y divide-[#EAE6F0] dark:divide-[#262036] animate-pulse">
    <div className="p-5 space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-[#EAE6F0] dark:bg-[#262036]" />
        <div className="space-y-1.5 flex-1">
          <div className="h-3 w-32 rounded bg-[#EAE6F0] dark:bg-[#262036]" />
          <div className="h-2.5 w-24 rounded bg-[#F0EEF5] dark:bg-[#1C1729]" />
        </div>
      </div>
      <div className="h-4 w-4/5 rounded bg-[#F0EEF5] dark:bg-[#1C1729]" />
      <div className="h-4 w-3/5 rounded bg-[#F0EEF5] dark:bg-[#1C1729]" />
    </div>
    <div className="p-5 space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-[#EAE6F0] dark:bg-[#262036]" />
        <div className="space-y-1.5 flex-1">
          <div className="h-3 w-28 rounded bg-[#EAE6F0] dark:bg-[#262036]" />
          <div className="h-2.5 w-20 rounded bg-[#F0EEF5] dark:bg-[#1C1729]" />
        </div>
      </div>
      <div className="h-20 w-full rounded-2xl bg-[#F0EEF5] dark:bg-[#1C1729]" />
    </div>
  </div>
);

const AppContent: React.FC = () => {
  const {
    activeView,
    setActiveView,
    goBack,
    toasts,
    isAuthenticated,
    user,
    campusAnnouncements,
    isCreateModalOpen,
    isCreateRoomModalOpen,
    isSearchModalOpen,
    sharingPost,
    activeLegalDoc,
    confirmDialog,
    reportModalTarget,
  } = useBopoi();
  const isLoggedIn = Boolean(isAuthenticated && user.username && user.username !== 'student');
  const { isKeyboardOpen } = useMobileKeyboard();
  const activeAnnouncement = campusAnnouncements.find((a) => a.isActive);

  // Ensure all pages cleanly start from the top when navigated to
  React.useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    const mainEl = document.querySelector('main');
    if (mainEl) mainEl.scrollTop = 0;
  }, [activeView]);

  // Desktop Escape shortcut to step back from detail views when no modal or input is focused
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      if (
        isCreateModalOpen ||
        isCreateRoomModalOpen ||
        isSearchModalOpen ||
        sharingPost ||
        activeLegalDoc ||
        confirmDialog ||
        reportModalTarget
      ) {
        return;
      }
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (
        tag === 'input' ||
        tag === 'textarea' ||
        tag === 'select' ||
        target?.isContentEditable
      ) {
        return;
      }

      if (activeView === 'post-detail') {
        e.preventDefault();
        goBack('home');
      } else if (activeView === 'poll-detail') {
        e.preventDefault();
        goBack('polls');
      } else if (activeView === 'message-detail') {
        e.preventDefault();
        goBack('inbox');
      } else if (activeView === 'public-profile' || activeView === 'public-ask') {
        e.preventDefault();
        goBack('discover');
      } else if (activeView === 'answer-studio') {
        e.preventDefault();
        goBack('message-detail');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    activeView,
    goBack,
    isCreateModalOpen,
    isCreateRoomModalOpen,
    isSearchModalOpen,
    sharingPost,
    activeLegalDoc,
    confirmDialog,
    reportModalTarget,
  ]);

  const renderActiveView = () => {
    switch (activeView) {
      case 'home':
        return <HomeView />;
      case 'landing':
        return <HomeLandingView />;
      case 'splash':
        return <SplashView />;
      case 'onboarding':
        return user.onboardingCompleted ? <HomeView /> : <OnboardingView />;
      case 'confessions':
        return <ConfessionsView />;
      case 'polls':
        return <PollsView />;
      case 'poll-detail':
        return <PollDetailView />;
      case 'discussions':
        return <DiscussionsView />;
      case 'discover':
        return <DiscoverView />;
      case 'rooms':
        return <RoomsView />;
      case 'room-detail':
        return <RoomDetailView />;
      case 'post-detail':
        return <PostDetailView />;
      case 'register':
        return <RegisterView initialMode="signup" />;
      case 'link-ready':
        return <LinkReadyView />;
      case 'inbox':
        return <InboxView />;
      case 'message-detail':
        return <MessageDetailModal />;
      case 'answer-studio':
        return <AnswerStudioView />;
      case 'profile':
        return isLoggedIn ? <ProfileView initialTab="posts" /> : <RegisterView initialMode="login" />;
      case 'saved':
        return isLoggedIn ? <ProfileView initialTab="saved" /> : <RegisterView initialMode="login" />;
      case 'public-profile':
        return <PublicProfileView />;
      case 'public-ask':
        return <PublicAskView />;
      case 'message-sent':
        return <MessageSentView />;
      case 'admin':
        return isLoggedIn && (user.isAdmin || user.role === 'admin') ? (
          <AdminConsoleView />
        ) : (
          <HomeView />
        );
      default:
        return <HomeView />;
    }
  };

  const isStandaloneView =
    activeView === 'landing' ||
    activeView === 'splash' ||
    activeView === 'onboarding' ||
    activeView === 'register' ||
    activeView === 'link-ready' ||
    activeView === 'message-sent' ||
    (!isLoggedIn && activeView === 'public-ask');

  const isWideWorkspace = activeView === 'answer-studio' || activeView === 'admin';
  const isFullViewportChat = activeView === 'room-detail';

  return (
    <div
      className={`${
        isKeyboardOpen ? '' : 'min-h-dvh'
      } flex flex-col bg-[#FAF9FC] dark:bg-[#09070D] text-[#191525] dark:text-[#F4F2FA] antialiased selection:bg-[#5420F5] selection:text-white ${
        !isStandaloneView && !isFullViewportChat && !isKeyboardOpen
          ? 'pb-[calc(58px+env(safe-area-inset-bottom))] lg:pb-0'
          : 'pb-0'
      }`}
    >
      {/* Toast Notification Container with Action Badges */}
      <div className="fixed top-16 lg:top-4 right-4 z-50 flex flex-col items-end gap-2 pointer-events-none max-w-sm w-full px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-3.5 py-2.5 rounded-2xl text-xs font-bold shadow-xl border backdrop-blur-md pointer-events-auto transition-all animate-in slide-in-from-top-2 flex items-center gap-2.5 ${
              t.type === 'success'
                ? 'bg-[#191525] dark:bg-[#1D182B] text-white border-emerald-400/40 shadow-emerald-500/10'
                : t.type === 'error'
                ? 'bg-red-600 text-white border-red-400/40 shadow-red-500/20'
                : 'bg-[#191525] dark:bg-[#1D182B] text-white border-purple-400/40 shadow-purple-500/20'
            }`}
          >
            <div className="w-7 h-7 rounded-xl bg-white dark:bg-[#0E0C14] flex items-center justify-center p-0.5 shrink-0 shadow-2xs">
              {getToastBadge(t.message)}
            </div>
            <span className="leading-snug break-words">{t.message}</span>
          </div>
        ))}
      </div>

      {/* Mobile / Landing Top Bar */}
      <SiteHeader />

      {/* Main Layout Shell */}
      {isStandaloneView ? (
        <main className="flex-1 w-full min-w-0 flex flex-col overflow-x-clip">
          <Suspense fallback={<FastViewSkeleton />}>{renderActiveView()}</Suspense>
        </main>
      ) : isWideWorkspace ? (
        <div className="max-w-[1280px] mx-auto w-full flex justify-center lg:px-4 flex-1 min-w-0">
          <DesktopNavRail />
          <main className="flex-1 min-w-0 max-w-5xl lg:border-x border-[#EAE6F0] dark:border-[#262036] bg-white dark:bg-[#0E0C14] min-h-dvh flex flex-col overflow-x-clip">
            <Suspense fallback={<FastViewSkeleton />}>{renderActiveView()}</Suspense>
          </main>
        </div>
      ) : (
        <div className="max-w-[1280px] mx-auto w-full flex justify-center lg:px-4 flex-1 min-w-0">
          <DesktopNavRail />
          <main className="flex-1 min-w-0 max-w-[640px] lg:border-x border-[#EAE6F0] dark:border-[#262036] bg-white dark:bg-[#0E0C14] min-h-dvh flex flex-col overflow-x-clip">
            {activeAnnouncement && !isFullViewportChat && (
              <div
                onClick={() => setActiveView(activeAnnouncement.actionView || 'home')}
                className={`hidden lg:flex items-center justify-between gap-3 px-4 py-2 text-xs border-b cursor-pointer transition-colors ${
                  activeAnnouncement.severity === 'urgent'
                    ? 'bg-rose-600 text-white border-rose-700'
                    : activeAnnouncement.severity === 'celebration'
                    ? 'bg-emerald-600 text-white border-emerald-700'
                    : 'bg-[#191525] dark:bg-[#1B1628] text-white border-[#EAE6F0] dark:border-[#262036]'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <CampusMegaphoneIcon size={15} />
                  <span className="font-black text-[11px] text-[#FFC928] shrink-0">
                    {activeAnnouncement.campus}:
                  </span>
                  <span className="font-bold truncate">{activeAnnouncement.title}</span>
                </div>
                <span className="text-[11px] font-black underline shrink-0">View</span>
              </div>
            )}
            <Suspense fallback={<FastViewSkeleton />}>{renderActiveView()}</Suspense>
          </main>
          <DesktopDiscoveryRail />
        </div>
      )}

      {/* Modals */}
      <CreateContentModal />
      <CreateRoomModal />
      <SharePostModal />
      <LegalPoliciesModal />
      <ConfirmActionModal />
      <ReportTicketModal />
      <GlobalSearchModal />
      <StartPagePickerModal />

      {/* Mobile-First 5-Tab Navigation Bar for app views (hidden on lg+ and while typing on mobile keyboard) */}
      {!isStandaloneView && !isKeyboardOpen && <BottomNavBar />}

      {/* Website Footer ONLY on public pre-login landing page */}
      {activeView === 'landing' && <SiteFooter />}
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <BopoiProvider>
        <AppContent />
      </BopoiProvider>
    </ErrorBoundary>
  );
}
