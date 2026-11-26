import React, { useState } from 'react';
import {
  Copy,
  Check,
  Trash2,
  MessageCircle,
  Lock,
  Send,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { useBopoi } from '../../context/BopoiContext.tsx';
import { InboxFilter, AnonymousMessage } from '../../types/index.ts';
import { CommentsThreadModal } from '../comments/CommentsThreadModal.tsx';
import { BopoiAnonymousAvatar } from '../brand/BopoiAnonymousAvatar.tsx';
import { CampusCharacterAvatar } from '../brand/character/index.ts';
import { MentionText } from '../ui/MentionText.tsx';
import {
  InboxCaughtUpIcon,
  InboxShortcutIcon,
  CopiedClipboardIcon,
} from '../brand/icons/index.ts';

export const InboxView: React.FC = () => {
  const {
    user,
    messages,
    sentMessages,
    answers,
    inboxFilter,
    setInboxFilter,
    unreadCount,
    setSelectedMessage,
    setSelectedAnswer,
    setActiveView,
    copyUserLink,
    markAsRead,
    getUnreadConvoCount,
    markConvoAsRead,
    deleteMessage,
    viewUserProfile,
    isAuthenticated,
    accounts,
  } = useBopoi();

  const isLoggedIn = Boolean(isAuthenticated && user.username && user.username !== 'student');

  const [copied, setCopied] = useState(false);
  const [activeCommentMessage, setActiveCommentMessage] = useState<AnonymousMessage | null>(null);

  const handleCopy = async () => {
    await copyUserLink();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const activeFilter: InboxFilter =
    inboxFilter === 'unread' || inboxFilter === 'answered' || inboxFilter === 'sent'
      ? inboxFilter
      : 'all';

  const isSentMode = activeFilter === 'sent';
  const viewerRole: 'recipient' | 'sender' = isSentMode ? 'sender' : 'recipient';

  const nonReportedReceived = messages.filter((m) => !m.isReported);
  const totalCount = nonReportedReceived.length;
  const answeredCount = nonReportedReceived.filter(
    (m) => m.isAnswered || Boolean(answers[m.id])
  ).length;
  const sentCount = sentMessages.length;

  const sourceList = isSentMode ? sentMessages : nonReportedReceived;

  const filteredMessages = [...sourceList]
    .filter((msg) => {
      if (activeFilter === 'unread') {
        const unreadConvo = getUnreadConvoCount(msg, 'recipient');
        return !msg.isRead || unreadConvo > 0;
      }
      if (activeFilter === 'answered') {
        return msg.isAnswered || Boolean(answers[msg.id]);
      }
      return true;
    })
    .sort((a, b) => {
      const aUnreadConvo = getUnreadConvoCount(a, viewerRole);
      const bUnreadConvo = getUnreadConvoCount(b, viewerRole);
      if ((bUnreadConvo > 0 ? 1 : 0) !== (aUnreadConvo > 0 ? 1 : 0)) {
        return (bUnreadConvo > 0 ? 1 : 0) - (aUnreadConvo > 0 ? 1 : 0);
      }

      if (!isSentMode && (a.isRead ? 0 : 1) !== (b.isRead ? 0 : 1)) {
        return (b.isRead ? 0 : 1) - (a.isRead ? 0 : 1);
      }

      const aLatestReplyTs = Math.max(
        a.createdTimestamp || 0,
        ...(a.comments || []).map((c) => c.createdTimestamp || 0)
      );
      const bLatestReplyTs = Math.max(
        b.createdTimestamp || 0,
        ...(b.comments || []).map((c) => c.createdTimestamp || 0)
      );
      return bLatestReplyTs - aLatestReplyTs;
    });

  const handleMessageClick = (msg: AnonymousMessage) => {
    if (!isSentMode) {
      markAsRead(msg.id);
    }
    markConvoAsRead(msg.id, viewerRole);
    setSelectedMessage(msg);
    setActiveView('message-detail');
  };

  const handleOpenComments = (e: React.MouseEvent, msg: AnonymousMessage) => {
    e.stopPropagation();
    if (!isSentMode) {
      markAsRead(msg.id);
    }
    markConvoAsRead(msg.id, viewerRole);
    setActiveCommentMessage(msg);
  };

  const handleLaunchStoryCard = (e: React.MouseEvent, msg: AnonymousMessage) => {
    e.stopPropagation();
    if (!isSentMode) {
      markAsRead(msg.id);
    }
    markConvoAsRead(msg.id, viewerRole);
    setSelectedMessage(msg);
    setSelectedAnswer(answers[msg.id] || null);
    setActiveView('answer-studio');
  };

  return (
    <div className="w-full flex flex-col bg-white dark:bg-[#0E0C14] text-[#191525] dark:text-[#F4F2FA] select-none pb-12">
      {/* 1. Sticky Instagram DM Header + Underline Filter Tabs */}
      <div className="sticky top-[52px] lg:top-0 z-20 bg-white/95 dark:bg-[#0E0C14]/95 backdrop-blur-md border-b border-[#EAE6F0] dark:border-[#262036]">
        <div className="px-4 sm:px-5 pt-3.5 pb-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <InboxShortcutIcon size={22} />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-[#191525] dark:text-[#F4F2FA] tracking-tight truncate">
                  {isLoggedIn ? `@${user.username}` : 'Anonymous Inbox'}
                </h1>
                {unreadCount > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-[#F52D85] text-white text-[11px] font-black tabular-nums">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#706B7D] dark:text-[#9E97B3] truncate">
                Private 1-on-1 DM convos &amp; Story Studio cards
              </p>
            </div>
          </div>

          <span className="text-xs font-bold text-[#706B7D] dark:text-[#9E97B3] tabular-nums shrink-0">
            {totalCount} {totalCount === 1 ? 'thread' : 'threads'}
          </span>
        </div>

        {/* Underline All / Unread / Answered / Sent Tabs */}
        <div className="grid grid-cols-4 border-t border-[#EAE6F0] dark:border-[#262036]">
          {[
            { id: 'all' as const, label: 'All', count: totalCount },
            { id: 'unread' as const, label: 'Unread', count: unreadCount },
            { id: 'answered' as const, label: 'Answered', count: answeredCount },
            { id: 'sent' as const, label: 'Sent', count: sentCount },
          ].map((tab) => {
            const isActive = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setInboxFilter(tab.id)}
                className={`min-h-[44px] py-2.5 px-2 text-xs sm:text-sm font-black transition-colors relative cursor-pointer hover:bg-[#FAF9FC] dark:hover:bg-[#171322] flex items-center justify-center gap-1.5 ${
                  isActive
                    ? 'text-[#191525] dark:text-[#F4F2FA]'
                    : 'text-[#706B7D] dark:text-[#9E97B3]'
                }`}
              >
                <span className="truncate">{tab.label}</span>
                <span
                  className={`text-[11px] sm:text-xs font-bold tabular-nums ${
                    isActive
                      ? 'text-[#5420F5] dark:text-[#8E6BFF]'
                      : 'text-[#706B7D] dark:text-[#9E97B3]'
                  }`}
                >
                  {tab.count}
                </span>
                {isActive && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 sm:w-14 h-[3px] bg-[#5420F5] rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Compact Single-Row Ask-Link Utility Strip */}
      <div className="px-4 sm:px-5 py-3 border-b border-[#EAE6F0] dark:border-[#262036] bg-[#FAF9FC]/70 dark:bg-[#171322]/60">
        {isLoggedIn ? (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#191525] dark:text-[#F4F2FA]">
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    user.linkActive ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
                <span className="truncate font-mono text-[12px]">
                  bopoi.com/@{user.username}/ask
                </span>
              </div>
              <p className="text-[11px] text-[#706B7D] dark:text-[#9E97B3] mt-0.5 truncate">
                {user.linkActive
                  ? 'Link active · Share on Instagram Stories for anonymous DMs'
                  : 'Link paused · Enable in Profile Settings'}
              </p>
            </div>

            <button
              type="button"
              onClick={handleCopy}
              className="min-h-[40px] px-3.5 py-2 bg-[#5420F5] hover:bg-[#4314E2] text-white text-xs font-extrabold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap"
            >
              {copied ? <Check className="w-3.5 h-3.5 shrink-0" /> : <Copy className="w-3.5 h-3.5 shrink-0" />}
              <span>{copied ? 'Copied!' : 'Copy Link'}</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black text-[#191525] dark:text-[#F4F2FA]">
                Get your personal Ask Link
              </p>
              <p className="text-[11px] text-[#706B7D] dark:text-[#9E97B3] truncate">
                Log in or sign up to receive anonymous campus DMs.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveView('profile')}
              className="min-h-[40px] px-3.5 py-2 bg-[#5420F5] hover:bg-[#4314E2] text-white text-xs font-extrabold rounded-xl transition-colors cursor-pointer shrink-0 whitespace-nowrap"
            >
              Log In / Sign Up
            </button>
          </div>
        )}
      </div>

      {/* 3. Instagram DM-Style Conversation List */}
      {filteredMessages.length === 0 ? (
        <div className="px-6 py-16 text-center flex flex-col items-center justify-center border-b border-[#EAE6F0] dark:border-[#262036]">
          <div className="w-12 h-12 rounded-2xl bg-[#FAF9FC] dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] flex items-center justify-center mb-3 p-2">
            <InboxCaughtUpIcon size={36} />
          </div>
          <h4 className="text-sm sm:text-base font-black text-[#191525] dark:text-[#F4F2FA]">
            {activeFilter === 'unread'
              ? 'All caught up!'
              : activeFilter === 'answered'
              ? 'No answered questions yet'
              : activeFilter === 'sent'
              ? 'No anonymous questions sent yet'
              : 'Your DM inbox is quiet'}
          </h4>
          <p className="text-xs text-[#706B7D] dark:text-[#9E97B3] max-w-xs mt-1 leading-relaxed">
            {activeFilter === 'unread'
              ? 'You have no unread anonymous messages.'
              : activeFilter === 'answered'
              ? 'Tap any question in All or Unread to publish a Story Studio reply card.'
              : activeFilter === 'sent'
              ? 'Send an anonymous question to a classmate from Discover or their profile to track your private 1-on-1 convo here.'
              : 'Share your Bopoi link with friends to start receiving anonymous questions.'}
          </p>
          {activeFilter === 'sent' ? (
            <button
              type="button"
              onClick={() => setActiveView('discover')}
              className="mt-5 min-h-[44px] px-5 py-2.5 bg-[#5420F5] text-white text-xs font-extrabold rounded-xl hover:bg-[#4314E2] transition-colors cursor-pointer flex items-center gap-2"
            >
              <Send className="w-3.5 h-3.5 shrink-0" />
              <span>Find Classmates to Ask</span>
            </button>
          ) : isLoggedIn ? (
            <button
              type="button"
              onClick={handleCopy}
              className="mt-5 min-h-[44px] px-5 py-2.5 bg-[#5420F5] text-white text-xs font-extrabold rounded-xl hover:bg-[#4314E2] transition-colors cursor-pointer flex items-center gap-2"
            >
              {copied ? <CopiedClipboardIcon size={16} /> : <Copy className="w-3.5 h-3.5 shrink-0" />}
              <span>{copied ? 'Copied Link!' : 'Copy My Link'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setActiveView('profile')}
              className="mt-5 min-h-[44px] px-5 py-2.5 bg-[#5420F5] text-white text-xs font-extrabold rounded-xl hover:bg-[#4314E2] transition-colors cursor-pointer flex items-center gap-2"
            >
              <span>Log In / Sign Up</span>
            </button>
          )}
        </div>
      ) : (
        <div className="divide-y divide-[#EAE6F0] dark:divide-[#262036] border-b border-[#EAE6F0] dark:border-[#262036]">
          {filteredMessages.map((msg) => {
            const ans = answers[msg.id];
            const unreadConvoCount = getUnreadConvoCount(msg, viewerRole);
            const isUnreadRow = (!isSentMode && !msg.isRead) || unreadConvoCount > 0;
            const convoList = msg.comments || [];
            const lastConvo = convoList.length > 0 ? convoList[convoList.length - 1] : null;
            const recipientAccount = isSentMode
              ? accounts.find(
                  (acc) => acc.username.toLowerCase() === msg.recipientUsername.toLowerCase()
                )
              : undefined;

            return (
              <article
                key={msg.id}
                onClick={() => handleMessageClick(msg)}
                className={`px-4 sm:px-5 py-3.5 transition-colors cursor-pointer group ${
                  isUnreadRow
                    ? 'bg-[#FAF8FF] dark:bg-[#19132B] hover:bg-[#F3EEFF] dark:hover:bg-[#221A3A]'
                    : 'bg-white dark:bg-[#0E0C14] hover:bg-[#FAF9FC] dark:hover:bg-[#171322]'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Left DM Avatar + Unread Dot Indicator */}
                  <div className="relative pt-0.5 shrink-0">
                    {isSentMode ? (
                      <CampusCharacterAvatar
                        value={recipientAccount?.avatarUrl}
                        seed={msg.recipientUsername}
                        size={44}
                        rounded="full"
                        className="ring-1 ring-[#EAE6F0] dark:ring-[#262036]"
                      />
                    ) : (
                      <BopoiAnonymousAvatar
                        size="sm"
                        idPrefix={`inbox-msg-${msg.id}`}
                      />
                    )}
                    {isUnreadRow && (
                      <span
                        className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#F52D85] ring-2 ring-white dark:ring-[#0E0C14]"
                        aria-label="Unread message"
                      />
                    )}
                  </div>

                  {/* Center DM Thread Content */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0 text-xs">
                        <span
                          className={`truncate ${
                            isUnreadRow
                              ? 'font-black text-[#191525] dark:text-[#F4F2FA]'
                              : 'font-bold text-[#191525] dark:text-[#F4F2FA]'
                          }`}
                        >
                          {isSentMode ? (
                            <>
                              To{' '}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  viewUserProfile(msg.recipientUsername);
                                }}
                                className="text-[#5420F5] dark:text-[#8E6BFF] hover:underline underline-offset-2 cursor-pointer"
                              >
                                @{msg.recipientUsername}
                              </button>
                            </>
                          ) : (
                            'Anonymous Student'
                          )}
                        </span>
                        <span className="text-[#706B7D] dark:text-[#9E97B3] shrink-0">
                          · {msg.createdAt}
                        </span>
                        {!isSentMode && !msg.isRead && (
                          <span className="text-[11px] font-black text-[#F52D85] shrink-0">
                            · New
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {!isSentMode && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteMessage(msg.id);
                            }}
                            className="min-h-[36px] min-w-[36px] rounded-full flex items-center justify-center text-[#706B7D] dark:text-[#9E97B3] hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/35 transition-colors cursor-pointer"
                            title="Delete message"
                            aria-label="Delete message"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <ChevronRight className="w-4 h-4 text-[#706B7D] dark:text-[#9E97B3] group-hover:text-[#5420F5] dark:group-hover:text-[#8E6BFF] transition-colors" />
                      </div>
                    </div>

                    {/* Message Body / Preview */}
                    <p
                      className={`text-[14px] leading-[1.45] line-clamp-2 break-words ${
                        isUnreadRow
                          ? 'font-bold text-[#191525] dark:text-[#F4F2FA]'
                          : 'font-medium text-[#3B354D] dark:text-[#D5CEE8]'
                      }`}
                    >
                      <MentionText text={msg.text} />
                    </p>

                    {/* Latest DM Convo Snippet or Public Reply Preview */}
                    {lastConvo ? (
                      <div className="flex items-center gap-1.5 text-xs text-[#706B7D] dark:text-[#9E97B3] truncate">
                        <Lock className="w-3 h-3 text-[#5420F5] dark:text-[#8E6BFF] shrink-0" />
                        <span className="font-bold shrink-0">
                          {lastConvo.authorRole === 'recipient'
                            ? isSentMode
                              ? `@${msg.recipientUsername}:`
                              : 'You:'
                            : 'Sender:'}
                        </span>
                        <span className="truncate">
                          {lastConvo.mediaType === 'gif' && !lastConvo.text
                            ? 'Sent a GIF'
                            : lastConvo.mediaType === 'gif'
                            ? `[GIF] ${lastConvo.text}`
                            : lastConvo.text}
                        </span>
                      </div>
                    ) : ans ? (
                      <div className="px-3 py-2 rounded-xl bg-[#FAF9FC] dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] text-xs space-y-0.5">
                        <span className="text-[11px] font-bold text-[#5420F5] dark:text-[#8E6BFF] block">
                          {isSentMode ? `@${msg.recipientUsername}'s Public Reply` : 'Your Story Reply'}
                        </span>
                        <p className="text-[#191525] dark:text-[#F4F2FA] font-medium line-clamp-2 break-words">
                          <MentionText text={ans.answerText} />
                        </p>
                      </div>
                    ) : null}

                    {/* Compact DM Action Row */}
                    <div className="pt-1 flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => handleOpenComments(e, msg)}
                          className={`min-h-[38px] px-3 rounded-xl transition-colors cursor-pointer font-bold text-xs tabular-nums inline-flex items-center gap-1.5 whitespace-nowrap ${
                            unreadConvoCount > 0
                              ? 'bg-[#5420F5] text-white hover:bg-[#4314E2]'
                              : 'bg-[#F0EBFF] dark:bg-[#231942] hover:bg-[#5420F5] text-[#5420F5] dark:text-[#B9A4FF] hover:text-white'
                          }`}
                          title="Open private 1-on-1 DM convo"
                        >
                          <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            {unreadConvoCount > 0
                              ? `${unreadConvoCount} new in DM`
                              : convoList.length > 0
                              ? `DM (${convoList.length})`
                              : 'Open DM'}
                          </span>
                        </button>

                        {!isSentMode && (
                          <button
                            type="button"
                            onClick={(e) => handleLaunchStoryCard(e, msg)}
                            className="min-h-[38px] px-2.5 rounded-xl bg-[#FAF9FC] dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] hover:border-[#5420F5] text-[#191525] dark:text-[#F4F2FA] font-bold text-xs inline-flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Layers className="w-3.5 h-3.5 text-[#5420F5] dark:text-[#8E6BFF]" />
                            <span>{msg.isAnswered ? 'Story Card' : 'Reply Card'}</span>
                          </button>
                        )}
                      </div>

                      {msg.isAnswered && (
                        <span className="text-emerald-700 dark:text-emerald-400 font-bold text-[11px] inline-flex items-center gap-1 whitespace-nowrap">
                          <Check className="w-3.5 h-3.5" />
                          <span>Answered</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Private 1-on-1 DM Convo Modal */}
      {activeCommentMessage && (
        <CommentsThreadModal
          message={activeCommentMessage}
          onClose={() => setActiveCommentMessage(null)}
          initialRole={isSentMode ? 'sender' : 'recipient'}
        />
      )}
    </div>
  );
};
