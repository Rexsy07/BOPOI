import React, { useState } from 'react';
import {
  Copy,
  Check,
  Trash2,
  MessageCircle,
} from 'lucide-react';
import { useBopoi } from '../../context/BopoiContext.tsx';
import { InboxFilter, AnonymousMessage } from '../../types/index.ts';
import { CommentsThreadModal } from '../comments/CommentsThreadModal.tsx';
import { BopoiAnonymousAvatar } from '../brand/BopoiAnonymousAvatar.tsx';
import {
  InboxCaughtUpIcon,
  InboxShortcutIcon,
  CopiedClipboardIcon,
} from '../brand/icons/index.ts';

export const InboxView: React.FC = () => {
  const {
    user,
    messages,
    answers,
    inboxFilter,
    setInboxFilter,
    unreadCount,
    setSelectedMessage,
    setActiveView,
    copyUserLink,
    markAsRead,
    getUnreadConvoCount,
    markConvoAsRead,
    deleteMessage,
    sentMessages,
    isAuthenticated,
  } = useBopoi();

  const isLoggedIn = Boolean(isAuthenticated && user.username && user.username !== 'student');

  const [copied, setCopied] = useState(false);
  const [activeCommentMessage, setActiveCommentMessage] = useState<AnonymousMessage | null>(null);

  const handleCopy = async () => {
    await copyUserLink();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const activeFilter: InboxFilter = inboxFilter === 'unread' ? 'unread' : 'all';

  // Filter messages
  const filteredMessages = messages.filter((msg) => {
    if (msg.isReported) return false;
    if (activeFilter === 'unread') return !msg.isRead;
    return true;
  });

  const handleMessageClick = (msg: AnonymousMessage) => {
    markAsRead(msg.id);
    markConvoAsRead(msg.id, 'recipient');
    setSelectedMessage(msg);
    setActiveView('message-detail');
  };

  const handleOpenComments = (e: React.MouseEvent, msg: AnonymousMessage) => {
    e.stopPropagation();
    markAsRead(msg.id);
    markConvoAsRead(msg.id, 'recipient');
    setActiveCommentMessage(msg);
  };

  const totalCount = messages.filter((m) => !m.isReported).length;

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] bg-[#FAF9FC] py-6 sm:py-8 px-3.5 sm:px-6 select-none overflow-x-hidden">
      <div className="max-w-2xl mx-auto space-y-5 w-full">
        {/* Page Header */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-white border border-[#EAE6F0] shadow-2xs flex items-center justify-center shrink-0">
            <InboxShortcutIcon size={28} />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-black text-[#191525] tracking-tight truncate">
              Anonymous Inbox
            </h1>
            <p className="text-xs text-[#706B7D] mt-0.5">
              Tap any message to open a private 1-on-1 convo or share an answer card.
            </p>
          </div>
        </div>

        {/* Shareable Link Banner */}
        <div className="w-full bg-gradient-to-r from-[#5420F5] to-[#3510B9] text-white rounded-3xl p-5 shadow-lg shadow-[#5420F5]/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative overflow-hidden">
          {isLoggedIn ? (
            <>
              <div className="flex flex-col min-w-0 z-10">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      user.linkActive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                    }`}
                  />
                  <h3 className="text-sm sm:text-base font-extrabold tracking-tight">
                    {user.linkActive ? 'Your anonymous link' : 'Your link is paused'}
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-white/85 font-mono mt-1 break-all">
                  bopoi.com/@{user.username}/ask
                </p>
              </div>

              <button
                onClick={handleCopy}
                className="w-full sm:w-auto px-4 py-2.5 bg-white text-[#5420F5] text-xs font-extrabold rounded-xl hover:bg-[#F0EBFF] transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2 shrink-0 z-10"
              >
                {copied ? <Check className="w-4 h-4 shrink-0" /> : <Copy className="w-4 h-4 shrink-0" />}
                <span>{copied ? 'Copied Link!' : 'Copy Link'}</span>
              </button>
            </>
          ) : (
            <>
              <div className="flex flex-col min-w-0 z-10">
                <h3 className="text-sm sm:text-base font-extrabold tracking-tight">
                  Get your personal anonymous link
                </h3>
                <p className="text-xs sm:text-sm text-white/85 mt-1">
                  Log in or create your student account to receive anonymous messages in your inbox.
                </p>
              </div>
              <button
                onClick={() => setActiveView('profile')}
                className="w-full sm:w-auto px-4 py-2.5 bg-white text-[#5420F5] text-xs font-extrabold rounded-xl hover:bg-[#F0EBFF] transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2 shrink-0 z-10"
              >
                <span>Log In / Sign Up</span>
              </button>
            </>
          )}
        </div>

        {/* Filter Tabs (All & Unread only) */}
        <div className="flex items-center gap-1.5 p-1 bg-white rounded-2xl border border-[#EAE6F0] shadow-2xs overflow-x-auto no-scrollbar">
          {[
            { id: 'all', label: 'All', count: totalCount },
            { id: 'unread', label: 'Unread', count: unreadCount },
          ].map((tab) => {
            const isActive = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setInboxFilter(tab.id as InboxFilter)}
                className={`flex-1 min-w-[75px] py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-[#5420F5] text-white shadow-xs'
                    : 'text-[#706B7D] hover:text-[#191525] hover:bg-slate-50'
                }`}
              >
                <span className="truncate">{tab.label}</span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full tabular-nums shrink-0 ${
                    isActive ? 'bg-white text-[#5420F5]' : 'bg-[#F0EBFF] text-[#5420F5]'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Messages List */}
        {filteredMessages.length === 0 ? (
          <div className="py-12 px-4 text-center flex flex-col items-center justify-center bg-white rounded-3xl border border-[#EAE6F0] shadow-2xs">
            <div className="w-14 h-14 rounded-2xl bg-purple-50 flex items-center justify-center mx-auto mb-3 p-2">
              <InboxCaughtUpIcon size={48} />
            </div>
            <h4 className="text-sm sm:text-base font-bold text-[#191525]">
              {activeFilter === 'unread' ? 'All caught up!' : 'No messages here'}
            </h4>
            <p className="text-xs text-[#706B7D] max-w-xs mt-1 leading-relaxed">
              {activeFilter === 'unread'
                ? 'You have no unread anonymous messages.'
                : 'Share your Bopoi link with friends to start receiving anonymous messages.'}
            </p>
            <button
              onClick={handleCopy}
              className="mt-5 px-5 py-2.5 bg-[#5420F5] text-white text-xs font-extrabold rounded-xl hover:bg-[#4314E2] transition-colors cursor-pointer flex items-center gap-2"
            >
              {copied ? <CopiedClipboardIcon size={16} /> : <Copy className="w-3.5 h-3.5 shrink-0" />}
              <span>{copied ? 'Copied Link!' : 'Copy My Link'}</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3 w-full">
            {filteredMessages.map((msg) => {
              const ans = answers[msg.id];
              const unreadConvoCount = getUnreadConvoCount(msg, 'recipient');
              return (
                <div
                  key={msg.id}
                  onClick={() => handleMessageClick(msg)}
                  className={`bg-white rounded-2xl p-4 sm:p-5 border transition-all cursor-pointer relative hover:shadow-md group overflow-hidden w-full space-y-3 ${
                    !msg.isRead
                      ? 'border-[#5420F5]/40 shadow-xs bg-gradient-to-r from-white to-[#FAF8FF]'
                      : 'border-[#EAE6F0] hover:border-slate-300'
                  }`}
                >
                  {/* Top Row: Sender + Timestamp + Unread Badge + Delete */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <BopoiAnonymousAvatar
                        size="sm"
                        idPrefix={`inbox-msg-${msg.id}`}
                      />
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <span className="text-xs font-black text-[#191525]">Anonymous</span>
                        <span className="text-[11px] text-[#706B7D]">· {msg.createdAt}</span>
                        {!msg.isRead && (
                          <span className="px-2 py-0.5 rounded-full bg-[#F52D85] text-white text-[10px] font-black">
                            New
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteMessage(msg.id);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer shrink-0"
                      title="Delete message"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Message Body */}
                  <p className="text-sm sm:text-base text-[#191525] font-bold leading-relaxed break-words">
                    {msg.text}
                  </p>

                  {/* Answered Preview (if answered) */}
                  {ans && (
                    <div className="p-3 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] text-xs space-y-0.5">
                      <span className="text-[10px] font-bold text-[#5420F5] uppercase tracking-wider">
                        Your Reply
                      </span>
                      <p className="text-[#191525] font-medium leading-relaxed break-words">
                        {ans.answerText}
                      </p>
                    </div>
                  )}

                  {/* Action Footer with 1-on-1 Convo Button & Reply/Share */}
                  <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => handleOpenComments(e, msg)}
                        className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-[#F0EBFF] hover:bg-[#5420F5] text-[#5420F5] hover:text-white transition-colors cursor-pointer font-bold text-xs"
                        title="Open private 1-on-1 convo"
                      >
                        <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>Convo{unreadConvoCount > 0 ? ` (${unreadConvoCount})` : ''}</span>
                      </button>

                      {msg.isAnswered && (
                        <span className="text-emerald-700 font-bold text-[11px] bg-emerald-50 px-2.5 py-1 rounded-lg inline-flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          <span>Answered</span>
                        </span>
                      )}
                    </div>

                    <span className="text-[#5420F5] font-bold text-xs group-hover:underline">
                      {msg.isAnswered ? 'Share Card →' : 'Reply & Share →'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Private 1-on-1 Convo Modal */}
      {activeCommentMessage && (
        <CommentsThreadModal
          message={activeCommentMessage}
          onClose={() => setActiveCommentMessage(null)}
          initialRole={inboxFilter === 'sent' ? 'sender' : 'recipient'}
        />
      )}
    </div>
  );
};
