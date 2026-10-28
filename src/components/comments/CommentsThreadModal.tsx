import React, { useState, useEffect } from 'react';
import { X, Send, UserCircle2, MessageCircle, Lock, ShieldCheck } from 'lucide-react';
import { useBopoi } from '../../context/BopoiContext.tsx';
import { AnonymousMessage } from '../../types/index.ts';
import { BopoiAnonymousAvatar } from '../brand/BopoiAnonymousAvatar.tsx';
import { ReadStatusBadge } from '../ui/ReadStatusBadge.tsx';
import { CampusCharacterAvatar } from '../brand/character/index.ts';
import { ReceiveMessagesIcon, SafetyShieldBadgeIcon } from '../brand/icons/index.ts';

interface CommentsThreadModalProps {
  message: AnonymousMessage;
  onClose: () => void;
  initialRole?: 'recipient' | 'sender';
}

export const CommentsThreadModal: React.FC<CommentsThreadModalProps> = ({
  message,
  onClose,
  initialRole = 'recipient',
}) => {
  const { user, addComment, messages, sentMessages, markConvoAsRead } = useBopoi();
  const [commentText, setCommentText] = useState('');
  const replyRole: 'recipient' | 'sender' = initialRole;

  // Get freshest message state
  const liveMessage =
    messages.find((m) => m.id === message.id) ||
    sentMessages.find((m) => m.id === message.id) ||
    message;
  const comments = liveMessage.comments || [];

  useEffect(() => {
    markConvoAsRead(liveMessage.id, replyRole);
  }, [liveMessage.id, comments.length, replyRole]);

  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    addComment(liveMessage.id, commentText, replyRole);
    markConvoAsRead(liveMessage.id, replyRole);
    setCommentText('');
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl border border-[#EAE6F0] overflow-hidden"
      >
        {/* Modal Header */}
        <div className="px-4 sm:px-5 py-3.5 border-b border-[#EAE6F0] flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#F0EBFF] text-[#5420F5] flex items-center justify-center shrink-0">
              <ReceiveMessagesIcon size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-[#191525] truncate">
                  Private 1-on-1 Convo
                </h3>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.2 rounded-full shrink-0">
                  <Lock className="w-2.5 h-2.5" />
                  <span>2-Party Only</span>
                </span>
              </div>
              <span className="text-[11px] text-[#706B7D] block truncate">
                Between {user.displayName} (Link Owner) &amp; Original Sender
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-black rounded-xl hover:bg-slate-100 transition-colors cursor-pointer shrink-0 ml-2"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Exclusive 2-Party Security Notice */}
        <div className="px-4 py-2 bg-gradient-to-r from-[#F0EBFF] to-[#FAF9FC] border-b border-[#5420F5]/15 flex items-start sm:items-center gap-2 text-[11px] text-[#5420F5] shrink-0">
          <SafetyShieldBadgeIcon size={18} className="shrink-0 mt-0.5 sm:mt-0" />
          <p className="leading-snug">
            <strong>Direct Follow-up:</strong> This convo is strictly restricted to the link owner (<strong>{user.displayName}</strong>) and the user who sent the original anonymous message. Third parties cannot view or post here.
          </p>
        </div>

        {/* Original Message Summary Box */}
        <div className="p-4 bg-[#FAF9FC] border-b border-[#EAE6F0] shrink-0 overflow-hidden">
          <div className="flex items-center justify-between mb-1.5 text-[10px] gap-2 flex-wrap">
            <span className="font-bold text-[#5420F5] uppercase tracking-wider">
              Original Anonymous Submission
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-slate-400 font-medium">
                {liveMessage.createdAt}
              </span>
              <ReadStatusBadge
                isRead={liveMessage.isRead}
                readAt={liveMessage.readAt}
                recipientName={user.displayName}
                size="sm"
                variant="minimal"
              />
            </div>
          </div>
          <p className="text-sm font-bold text-[#191525] leading-snug break-words">
            "{liveMessage.text}"
          </p>
        </div>

        {/* Scrollable Comments List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
          {comments.length === 0 ? (
            <div className="py-10 text-center flex flex-col items-center justify-center text-slate-500">
              <div className="w-12 h-12 rounded-full bg-[#F0EBFF] text-[#5420F5] flex items-center justify-center mb-2">
                <Lock className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-slate-800">No messages in this convo yet</p>
              <p className="text-[11px] text-slate-500 mt-0.5 max-w-xs">
                Start a private 1-on-1 convo. Only you and the original sender will see it!
              </p>
            </div>
          ) : (
            comments.map((comm) => {
              const isOwner = comm.authorRole === 'recipient' || comm.authorName === user.displayName;

              return (
                <div
                  key={comm.id}
                  className={`p-3.5 rounded-2xl border space-y-1.5 overflow-hidden transition-all ${
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
                          size={24}
                          rounded="full"
                        />
                      ) : (
                        <BopoiAnonymousAvatar
                          size="xs"
                          idPrefix={`thread-comm-${comm.id}`}
                        />
                      )}

                      <span className="text-xs font-bold text-[#191525] truncate">
                        {isOwner ? user.displayName : 'Original Sender'}
                      </span>

                      {isOwner ? (
                        <span className="text-[9px] font-bold bg-[#F0EBFF] text-[#5420F5] px-2 py-0.5 rounded-full shrink-0">
                          Link Owner
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full shrink-0">
                          Original Sender
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-[#706B7D] shrink-0">{comm.createdAt}</span>
                  </div>

                  <p className="text-xs text-slate-800 font-medium sm:pl-8 leading-relaxed break-words">
                    {comm.text}
                  </p>
                </div>
              );
            })
          )}
        </div>

        {/* Comment Composer Input Footer */}
        <form
          onSubmit={handlePostComment}
          className="p-3.5 sm:p-4 border-t border-[#EAE6F0] bg-white space-y-2.5 shrink-0"
        >
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={
                replyRole === 'recipient'
                  ? `Reply directly to the original anonymous sender as ${user.displayName}...`
                  : `Send a private anonymous follow-up to ${user.displayName}...`
              }
              className="flex-1 min-w-0 px-4 py-2.5 bg-[#FAF9FC] border border-[#EAE6F0] rounded-xl text-base sm:text-sm text-[#191525] focus:outline-none focus:border-[#5420F5]"
            />
            <button
              type="submit"
              disabled={!commentText.trim()}
              className={`p-2.5 rounded-xl font-bold transition-all flex items-center justify-center shrink-0 cursor-pointer ${
                commentText.trim()
                  ? 'bg-[#5420F5] text-white hover:bg-[#4314E2] shadow-sm'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
              aria-label="Send reply"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 pt-0.5">
            <Lock className="w-3 h-3 text-[#5420F5]" />
            <span>Private 1-on-1 convo between link owner &amp; anonymous sender</span>
          </div>
        </form>
      </div>
    </div>
  );
};
