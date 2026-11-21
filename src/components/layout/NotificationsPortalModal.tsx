import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCheck } from 'lucide-react';
import { useBopoi } from '../../context/BopoiContext.tsx';
import { ActiveAppView } from '../../types/index.ts';
import {
  InboxShortcutIcon,
  DatingRomanceIcon,
  ReceiveMessagesIcon,
  LaunchTrendingIcon,
  RealPeopleIcon,
  NotificationsBellIcon,
  CreateRoomIcon,
  BookmarkedIcon,
  SafetyShieldBadgeIcon,
} from '../brand/icons/index.ts';

interface NotificationsPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationsPortalModal: React.FC<NotificationsPortalModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    notifications,
    unreadNotificationsCount,
    markNotificationsRead,
    openTicketInSettings,
    enterRoom,
    socialPosts,
    setSelectedPost,
    setActiveView,
    viewUserProfile,
    showToast,
  } = useBopoi();

  const [filterTab, setFilterTab] = useState<'all' | 'unread'>('all');

  const visibleNotifications = useMemo(
    () => (filterTab === 'unread' ? notifications.filter((n) => !n.isRead) : notifications),
    [notifications, filterTab]
  );

  useEffect(() => {
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

  if (!isOpen || typeof document === 'undefined') return null;

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
      case 'report_reply':
      case 'report_status_updated':
      case 'new_report_opened':
        return <SafetyShieldBadgeIcon size={22} />;
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

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center sm:p-4 bg-black/55 backdrop-blur-xs animate-in fade-in duration-150"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
    >
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl border border-[#EAE6F0] shadow-2xl p-4 sm:p-6 text-xs select-none z-10 overflow-hidden flex flex-col max-h-[85dvh]">
        <div className="w-10 h-1 bg-[#EAE6F0] rounded-full mx-auto mb-3 sm:hidden" />

        <div className="flex items-center justify-between pb-3.5 border-b border-[#EAE6F0] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#FAF9FC] border border-[#EAE6F0] flex items-center justify-center shrink-0">
              <NotificationsBellIcon size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-[#191525] text-base leading-none">
                  Notifications
                </h3>
                {unreadNotificationsCount > 0 && (
                  <span className="text-[11px] font-black text-[#F52D85] tabular-nums">
                    · {unreadNotificationsCount} new
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#706B7D] mt-1">
                Activity across your posts, rooms, and anonymous link
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {unreadNotificationsCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  markNotificationsRead();
                  showToast('Notifications marked as read!', 'success');
                }}
                className="text-[11px] font-bold text-[#5420F5] hover:bg-[#F0EBFF] px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer flex items-center gap-1"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Mark read</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full hover:bg-slate-100 text-[#706B7D] hover:text-[#191525] transition-colors cursor-pointer"
              title="Close notifications"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* All / Unread Quick Filter */}
        {notifications.length > 0 && (
          <div className="flex items-center gap-1.5 py-2 border-b border-[#EAE6F0] shrink-0">
            <button
              type="button"
              onClick={() => setFilterTab('all')}
              className={`px-3 py-1 rounded-xl text-[11px] font-bold transition-colors cursor-pointer tabular-nums ${
                filterTab === 'all'
                  ? 'bg-[#191525] text-white'
                  : 'bg-[#FAF9FC] text-[#706B7D] hover:text-[#191525] border border-[#EAE6F0]'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('unread')}
              className={`px-3 py-1 rounded-xl text-[11px] font-bold transition-colors cursor-pointer tabular-nums ${
                filterTab === 'unread'
                  ? 'bg-[#191525] text-white'
                  : 'bg-[#FAF9FC] text-[#706B7D] hover:text-[#191525] border border-[#EAE6F0]'
              }`}
            >
              Unread ({unreadNotificationsCount})
            </button>
          </div>
        )}

        <div className="py-1 overflow-y-auto flex-1 divide-y divide-[#EAE6F0] pr-0.5">
          {visibleNotifications.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-[#FAF9FC] border border-[#EAE6F0] flex items-center justify-center mx-auto">
                <NotificationsBellIcon size={24} />
              </div>
              <p className="text-sm font-black text-[#191525]">
                {filterTab === 'unread' ? 'All caught up!' : 'No notifications yet'}
              </p>
              <p className="text-xs text-[#706B7D] max-w-xs mx-auto">
                {filterTab === 'unread'
                  ? 'You have read all your campus notifications.'
                  : 'When students send you anonymous messages, react to your posts, or follow you, updates appear here.'}
              </p>
              {filterTab === 'unread' && (
                <button
                  type="button"
                  onClick={() => setFilterTab('all')}
                  className="mt-1 px-3.5 py-1.5 rounded-xl bg-[#FAF9FC] hover:bg-[#F0EBFF] border border-[#EAE6F0] text-xs font-bold text-[#5420F5] cursor-pointer"
                >
                  Show all notifications
                </button>
              )}
            </div>
          ) : (
            visibleNotifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => {
                  markNotificationsRead(notif.id);
                  onClose();
                  if (
                    notif.type === 'report_reply' ||
                    notif.type === 'report_status_updated'
                  ) {
                    openTicketInSettings(notif.targetId);
                    return;
                  }
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
                className={`py-3 px-2.5 hover:bg-[#FAF9FC] transition-colors cursor-pointer flex items-start gap-3 group ${
                  notif.isRead ? 'opacity-75' : 'bg-[#F7F4FF]/70'
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-white border border-[#EAE6F0] flex items-center justify-center p-1 shrink-0 mt-0.5">
                  {getNotificationIcon(notif.type)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-[#191525] group-hover:text-[#5420F5] transition-colors truncate flex items-center gap-1.5">
                      {!notif.isRead && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#F52D85] shrink-0" />
                      )}
                      <span className="truncate">{notif.title}</span>
                    </span>
                    <span className="text-[10px] text-[#706B7D] shrink-0">
                      {notif.createdAt}
                    </span>
                  </div>
                  <p className="text-xs text-[#706B7D] leading-snug mt-0.5">
                    {notif.body}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="pt-3 border-t border-[#EAE6F0] flex items-center justify-between text-xs shrink-0 bg-white">
          <span className="text-[11px] text-[#706B7D] font-medium">
            Campus updates &amp; alerts
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[#5420F5] hover:bg-[#4314E2] text-white font-black rounded-xl text-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
