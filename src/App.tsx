/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy } from 'react';
import { BopoiProvider, useBopoi } from './context/BopoiContext.tsx';
import { SiteHeader } from './components/layout/SiteHeader.tsx';
import { SiteFooter } from './components/layout/SiteFooter.tsx';
import { HomeView } from './components/views/HomeView.tsx';
import { DiscoverView } from './components/views/DiscoverView.tsx';
import { CreateContentModal } from './components/modals/CreateContentModal.tsx';
import { CreateRoomModal } from './components/modals/CreateRoomModal.tsx';
import { SharePostModal } from './components/modals/SharePostModal.tsx';
import { LegalPoliciesModal } from './components/modals/LegalPoliciesModal.tsx';
import { ConfirmActionModal } from './components/modals/ConfirmActionModal.tsx';
import { BottomNavBar } from './components/navigation/BottomNavBar.tsx';
import { ErrorBoundary } from './components/layout/ErrorBoundary.tsx';

// Fast Lazy-Loaded Secondary Views for instant initial load and zero-jank navigation
const HomeLandingView = lazy(() =>
  import('./components/views/HomeLandingView.tsx').then((m) => ({ default: m.HomeLandingView }))
);
const OnboardingView = lazy(() =>
  import('./components/views/OnboardingView.tsx').then((m) => ({ default: m.OnboardingView }))
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
  <div className="w-full max-w-3xl mx-auto px-4 py-6 space-y-4 animate-pulse">
    <div className="h-24 rounded-3xl bg-purple-100/60 border border-purple-200/40" />
    <div className="h-44 rounded-3xl bg-white border border-slate-200/70" />
    <div className="h-44 rounded-3xl bg-white border border-slate-200/70" />
  </div>
);

const AppContent: React.FC = () => {
  const { activeView, toasts, isAuthenticated, user } = useBopoi();
  const isLoggedIn = Boolean(isAuthenticated && user.username && user.username !== 'student');

  // Ensure all pages cleanly start from the top when navigated to
  React.useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    const mainEl = document.querySelector('main');
    if (mainEl) mainEl.scrollTop = 0;
  }, [activeView]);

  const renderActiveView = () => {
    switch (activeView) {
      case 'home':
        return <HomeView />;
      case 'landing':
        return <HomeLandingView />;
      case 'splash':
        return <SplashView />;
      case 'onboarding':
        return <OnboardingView />;
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

  const isPreAuthView =
    activeView === 'landing' ||
    activeView === 'splash' ||
    activeView === 'onboarding';

  const isFullViewportChat = activeView === 'room-detail';

  return (
    <div
      className={`min-h-screen flex flex-col bg-[#FAF9FC] text-[#191525] antialiased selection:bg-[#5420F5] selection:text-white ${
        !isPreAuthView && !isFullViewportChat ? 'pb-16' : ''
      }`}
    >
      {/* Toast Notification Container with Action Badges */}
      <div className="fixed top-20 right-4 z-50 flex flex-col items-end gap-2 pointer-events-none max-w-sm w-full px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-3.5 py-2.5 rounded-2xl text-xs font-bold shadow-xl border backdrop-blur-md pointer-events-auto transition-all animate-in slide-in-from-top-2 flex items-center gap-2.5 ${
              t.type === 'success'
                ? 'bg-[#191525] text-white border-emerald-400/40 shadow-emerald-500/10'
                : t.type === 'error'
                ? 'bg-red-600 text-white border-red-400/40 shadow-red-500/20'
                : 'bg-[#191525] text-white border-purple-400/40 shadow-purple-500/20'
            }`}
          >
            <div className="w-7 h-7 rounded-xl bg-white flex items-center justify-center p-0.5 shrink-0 shadow-2xs">
              {getToastBadge(t.message)}
            </div>
            <span className="leading-snug break-words">{t.message}</span>
          </div>
        ))}
      </div>

      {/* Global Standalone Website Navigation Header */}
      <SiteHeader />

      {/* Main Page View Area with Fast Lazy Loading Suspense */}
      <main className="flex-1 w-full min-w-0 flex flex-col overflow-x-clip">
        <Suspense fallback={<FastViewSkeleton />}>{renderActiveView()}</Suspense>
      </main>

      {/* Central Content Creation Bottom Sheet / Modal */}
      <CreateContentModal />

      {/* Dedicated Anonymous Chat Room Creation Modal */}
      <CreateRoomModal />

      {/* Share Post Off-Campus Modal */}
      <SharePostModal />

      {/* Legal & Safety Documents Modal (Terms of Service, Privacy Policy, Community Guidelines) */}
      <LegalPoliciesModal />

      {/* Global Custom Action Confirmation Modal */}
      <ConfirmActionModal />

      {/* Mobile-First 5-Tab Navigation Bar for authenticated app views */}
      {!isPreAuthView && <BottomNavBar />}

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
