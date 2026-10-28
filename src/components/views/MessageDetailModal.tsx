import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  MessageCircle,
  Flag,
  Ban,
  Trash2,
  Send,
  Lock,
} from 'lucide-react';
import { useBopoi } from '../../context/BopoiContext.tsx';
import { BopoiAnonymousAvatar } from '../brand/BopoiAnonymousAvatar.tsx';
import { CampusCharacterAvatar } from '../brand/character/index.ts';

export const MessageDetailModal: React.FC = () => {
  const {
    selectedMessage,
    answers,
    setActiveView,
    goBack,
    deleteMessage,
    reportMessage,
    blockSender,
    addComment,
    markConvoAsRead,
    user,
    messages,
    sentMessages,
  } = useBopoi();

  const [showReportSheet, setShowReportSheet] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');

  const liveMessage = selectedMessage
    ? messages.find((m) => m.id === selectedMessage.id) ||
      sentMessages.find((m) => m.id === selectedMessage.id) ||
      selectedMessage
    : null;

  const isSentByMe = Boolean(
    liveMessage && sentMessages.some((m) => m.id === liveMessage.id)
  );
  const replyRole: 'recipient' | 'sender' = isSentByMe ? 'sender' : 'recipient';

  useEffect(() => {
    if (liveMessage?.id) {
      markConvoAsRead(liveMessage.id, replyRole);
    }
  }, [liveMessage?.id, liveMessage?.comments?.length, replyRole]);

  if (!liveMessage) {
    return (
      <div className="w-full min-h-[calc(100vh-4rem)] bg-[#FAF9FC] py-16 px-4 flex flex-col items-center justify-center text-center">
        <p className="text-sm text-slate-500 mb-4">No message selected.</p>
        <button
          onClick={() => setActiveView('inbox')}
          className="px-5 py-2.5 bg-[#5420F5] text-white font-bold text-xs rounded-xl shadow-sm cursor-pointer"
        >
          Return to Inbox
        </button>
      </div>
    );
  }

  const currentAnswer = answers[liveMessage.id];
  const comments = liveMessage.comments || [];

  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    addComment(liveMessage.id, newCommentText, replyRole);
    markConvoAsRead(liveMessage.id, replyRole);
    setNewCommentText('');
  };

  const handleReport = (reason: string) => {
    setShowReportSheet(false);
    reportMessage(liveMessage.id, reason);
  };

  const handleDelete = () => {
    deleteMessage(liveMessage.id);
  };

  const handleBlock = () => {
    blockSender(liveMessage.id);
  };

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] bg-[#FAF9FC] py-6 sm:py-8 px-3.5 sm:px-6 select-none overflow-x-hidden">
      <div className="max-w-xl mx-auto space-y-5 w-full">
        {/* Top Header */}
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => goBack('inbox')}
            className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-700 hover:text-black cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" />
            <span>Back to Inbox</span>
          </button>
          <span className="text-xs font-bold text-[#706B7D]">
            {liveMessage.createdAt}
          </span>
        </div>

        {/* Message Card Container */}
        <div className="bg-white rounded-3xl p-5 sm:p-7 border border-[#EAE6F0] shadow-xs space-y-5 overflow-hidden w-full">
          {/* Sender Header */}
          <div className="flex items-center gap-3">
            <BopoiAnonymousAvatar
              size="md"
              idPrefix={`detail-msg-${liveMessage.id}`}
            />
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-black text-[#191525] truncate">
                {isSentByMe
                  ? `Sent to @${liveMessage.recipientUsername}`
                  : 'Anonymous Student'}
              </h2>
              <span className="text-xs text-[#706B7D]">
                {isSentByMe ? 'Anonymous message you sent' : 'Received via your Bopoi link'}
              </span>
            </div>
          </div>

          {/* Main Question Text */}
          <div className="bg-[#FAF9FC] border border-[#EAE6F0] rounded-2xl p-5 overflow-hidden">
            <p className="text-base sm:text-lg font-bold text-[#191525] leading-relaxed break-words">
              {liveMessage.text}
            </p>
          </div>

          {/* Saved Answer Preview if answered */}
          {currentAnswer && (
            <div className="p-4 rounded-2xl bg-[#F0EBFF]/60 border border-[#5420F5]/20 space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#5420F5]">
                Your Public Card Reply
              </span>
              <p className="text-sm font-semibold text-[#191525] leading-relaxed break-words">
                {currentAnswer.answerText}
              </p>
            </div>
          )}

          {/* Primary Action Button */}
          <button
            onClick={() => setActiveView('answer-studio')}
            className="w-full py-3.5 px-6 bg-[#5420F5] hover:bg-[#4314E2] text-white font-extrabold text-sm rounded-xl transition-all cursor-pointer shadow-md shadow-[#5420F5]/20 flex items-center justify-center gap-2"
          >
            <span>{currentAnswer ? 'Edit Reply & Share Card' : 'Reply & Share Card'}</span>
          </button>

          {/* Private 1-on-1 Convo Section */}
          <div className="pt-4 border-t border-[#EAE6F0] space-y-3.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-[#5420F5] shrink-0" />
                <h3 className="text-sm font-black text-[#191525]">
                  Private 1-on-1 Convo
                </h3>
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full shrink-0">
                <Lock className="w-3 h-3" />
                <span>2-Party Private Chat</span>
              </span>
            </div>

            {/* Convo Messages List */}
            <div className="space-y-2.5 max-h-64 overflow-y-auto no-scrollbar">
              {comments.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center bg-[#FAF9FC] rounded-2xl border border-dashed border-[#EAE6F0]">
                  No messages in this convo yet. Send a message below to start chatting!
                </p>
              ) : (
                comments.map((comm) => {
                  const isOwner =
                    comm.authorRole === 'recipient' ||
                    comm.authorName === user.displayName;

                  return (
                    <div
                      key={comm.id}
                      className={`p-3 rounded-2xl border space-y-1 overflow-hidden transition-all ${
                        isOwner
                          ? 'bg-gradient-to-r from-white via-white to-[#F7F4FF] border-[#5420F5]/25 shadow-2xs'
                          : 'bg-[#FAF9FC] border-[#EAE6F0]'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {isOwner ? (
                            <CampusCharacterAvatar
                              value={comm.authorAvatar || user.avatarUrl}
                              seed={user.username}
                              size={22}
                              rounded="full"
                            />
                          ) : (
                            <BopoiAnonymousAvatar
                              size="xs"
                              idPrefix={`detail-comment-${comm.id}`}
                            />
                          )}
                          <span className="font-bold text-[#191525] text-xs truncate">
                            {isOwner ? user.displayName : 'Original Sender'}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md shrink-0 ${
                              isOwner
                                ? 'bg-[#F0EBFF] text-[#5420F5]'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {isOwner ? 'Link Owner' : 'Anonymous Sender'}
                          </span>
                        </div>
                        <span className="text-[10px] text-[#706B7D] shrink-0">
                          {comm.createdAt}
                        </span>
                      </div>
                      <p className="text-xs text-slate-800 sm:pl-7 leading-relaxed font-medium break-words">
                        {comm.text}
                      </p>
                    </div>
                  );
                })
              )}
            </div>

            {/* Convo Input Form */}
            <form onSubmit={handlePostComment} className="pt-1 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  placeholder="Write a message in this private convo..."
                  className="flex-1 min-w-0 px-4 py-2.5 bg-[#FAF9FC] border border-[#EAE6F0] rounded-xl text-base sm:text-sm text-[#191525] focus:outline-none focus:border-[#5420F5]"
                />
                <button
                  type="submit"
                  disabled={!newCommentText.trim()}
                  className={`p-2.5 rounded-xl font-bold transition-all flex items-center justify-center shrink-0 cursor-pointer ${
                    newCommentText.trim()
                      ? 'bg-[#5420F5] text-white hover:bg-[#4314E2] shadow-sm'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  }`}
                  aria-label="Send"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>

          {/* Safety & Moderation Controls */}
          <div className="pt-4 border-t border-[#EAE6F0] flex flex-wrap items-center justify-between gap-2.5 text-xs">
            <div className="flex flex-wrap items-center gap-4">
              <button
                onClick={() => setShowReportSheet(true)}
                className="text-amber-600 hover:text-amber-800 font-semibold flex items-center gap-1.5 cursor-pointer py-1 shrink-0"
              >
                <Flag className="w-3.5 h-3.5 shrink-0" />
                <span>Report</span>
              </button>

              <button
                onClick={handleBlock}
                className="text-slate-600 hover:text-black font-semibold flex items-center gap-1.5 cursor-pointer py-1 shrink-0"
              >
                <Ban className="w-3.5 h-3.5 text-red-500 shrink-0" />
                <span>Block Sender</span>
              </button>
            </div>

            <button
              onClick={handleDelete}
              className="text-red-600 hover:text-red-800 font-semibold flex items-center gap-1.5 cursor-pointer py-1 shrink-0 ml-auto"
            >
              <Trash2 className="w-3.5 h-3.5 shrink-0" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      </div>

      {/* Report Modal */}
      {showReportSheet && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm space-y-4 shadow-2xl">
            <h4 className="text-base font-bold text-[#191525]">Report Message</h4>
            <p className="text-xs text-[#706B7D]">
              Select a reason to report and remove this message from your inbox.
            </p>
            <div className="space-y-2 pt-1">
              {[
                'Harassment or targeted bullying',
                'Hate speech or discrimination',
                'Threats or physical harm',
                'Spam or scam',
                'Private personal contact info',
              ].map((reason) => (
                <button
                  key={reason}
                  onClick={() => handleReport(reason)}
                  className="w-full text-left py-2.5 px-3.5 text-xs font-semibold text-slate-800 hover:bg-[#F0EBFF] hover:text-[#5420F5] rounded-xl transition-colors cursor-pointer"
                >
                  {reason}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowReportSheet(false)}
              className="w-full py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 pt-2 border-t border-slate-100 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
