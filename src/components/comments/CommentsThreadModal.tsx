import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Send, Lock, AtSign, Sparkles } from 'lucide-react';
import { useBopoi } from '../../context/BopoiContext.tsx';
import { AnonymousMessage } from '../../types/index.ts';
import { BopoiAnonymousAvatar } from '../brand/BopoiAnonymousAvatar.tsx';
import { ReadStatusBadge } from '../ui/ReadStatusBadge.tsx';
import { CampusCharacterAvatar } from '../brand/character/index.ts';
import { ReceiveMessagesIcon, SafetyShieldBadgeIcon } from '../brand/icons/index.ts';
import { VerifiedCreatorBadge } from '../ui/VerifiedCreatorBadge.tsx';
import { MentionText } from '../ui/MentionText.tsx';
import { MentionAutocompleteDropdown } from './MentionAutocompleteDropdown.tsx';
import {
  buildMentionCandidates,
  useMentionAutocomplete,
} from '../../hooks/useMentionAutocomplete.ts';
import { KlipyGifPicker } from '../modals/KlipyGifPicker.tsx';
import { GifPreviewMedia } from '../ui/GifPreviewMedia.tsx';

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
  const {
    user,
    creators,
    accounts,
    addComment,
    messages,
    sentMessages,
    markConvoAsRead,
    setSelectedMessage,
    setActiveView,
  } = useBopoi();
  const [commentText, setCommentText] = useState('');
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [pendingGif, setPendingGif] = useState<{ mediaUrl: string; title: string } | null>(null);
  const replyRole: 'recipient' | 'sender' = initialRole;
  const inputRef = useRef<HTMLInputElement>(null);

  const mention = useMentionAutocomplete({
    text: commentText,
    setText: setCommentText,
    inputRef,
  });

  const mentionCandidates = useMemo(
    () =>
      buildMentionCandidates({
        creators,
        accounts,
        excludeUsername: user.username,
      }),
    [creators, accounts, user.username]
  );

  const liveMessage =
    messages.find((m) => m.id === message.id) ||
    sentMessages.find((m) => m.id === message.id) ||
    message;
  const comments = liveMessage.comments || [];

  useEffect(() => {
    markConvoAsRead(liveMessage.id, replyRole);
  }, [liveMessage.id, comments.length, replyRole]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !showGifPicker && !mention.isOpen) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, showGifPicker, mention.isOpen]);

  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() && !pendingGif?.mediaUrl) return;

    const gifAttachment = pendingGif
      ? { mediaUrl: pendingGif.mediaUrl, mediaType: 'gif' as const }
      : undefined;

    addComment(liveMessage.id, commentText, replyRole, gifAttachment);
    markConvoAsRead(liveMessage.id, replyRole);
    setCommentText('');
    setPendingGif(null);
    mention.reset();
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-[#0E0C14] text-[#191525] dark:text-[#F4F2FA] rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg max-h-[88dvh] flex flex-col shadow-2xl border border-[#EAE6F0] dark:border-[#262036] overflow-hidden"
      >
        <div className="w-10 h-1 bg-[#EAE6F0] dark:bg-[#262036] rounded-full mx-auto mt-2.5 sm:hidden shrink-0" />

        {/* Modal Header */}
        <div className="px-4 sm:px-5 py-3.5 border-b border-[#EAE6F0] dark:border-[#262036] flex items-center justify-between shrink-0 bg-white dark:bg-[#0E0C14]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#FAF9FC] dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] text-[#5420F5] dark:text-[#8E6BFF] flex items-center justify-center shrink-0">
              <ReceiveMessagesIcon size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-[#191525] dark:text-[#F4F2FA] truncate">
                  Private 1-on-1 DM
                </h3>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#706B7D] dark:text-[#9E97B3] shrink-0">
                  <Lock className="w-3 h-3 text-[#5420F5] dark:text-[#8E6BFF]" />
                  <span>Private</span>
                </span>
              </div>
              <span className="text-[11px] text-[#706B7D] dark:text-[#9E97B3] block truncate">
                {replyRole === 'sender'
                  ? `Between you & @${liveMessage.recipientUsername}`
                  : `Between ${user.displayName} & Original Sender`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            {replyRole === 'recipient' && (
              <button
                type="button"
                onClick={() => {
                  setSelectedMessage(liveMessage);
                  onClose();
                  setActiveView('answer-studio');
                }}
                className="min-h-[40px] px-3 rounded-xl bg-[#F0EBFF] dark:bg-[#231942] text-[#5420F5] dark:text-[#B9A4FF] text-[11px] font-extrabold inline-flex items-center gap-1 hover:bg-[#5420F5] hover:text-white transition-colors cursor-pointer"
                title="Turn into Story Card"
              >
                <Sparkles className="w-3 h-3" />
                <span>Story Card</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center text-[#706B7D] dark:text-[#9E97B3] hover:text-[#191525] dark:hover:text-[#F4F2FA] rounded-full hover:bg-[#FAF9FC] dark:hover:bg-[#171322] transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Exclusive 2-Party Security Notice */}
        <div className="px-4 py-2 bg-[#FAF9FC] dark:bg-[#171322] border-b border-[#EAE6F0] dark:border-[#262036] flex items-start sm:items-center gap-2 text-[11px] text-[#706B7D] dark:text-[#9E97B3] shrink-0">
          <SafetyShieldBadgeIcon size={15} className="shrink-0 mt-0.5 sm:mt-0" />
          <p className="leading-snug">
            Strictly private between <strong className="text-[#191525] dark:text-[#F4F2FA]">{user.displayName}</strong> and the other party.
          </p>
        </div>

        {/* Original Message Summary */}
        <div className="px-4 py-3 bg-white dark:bg-[#0E0C14] border-b border-[#EAE6F0] dark:border-[#262036] shrink-0 overflow-hidden">
          <div className="flex items-center justify-between mb-1 text-[11px] gap-2 flex-wrap">
            <span className="font-extrabold text-[#5420F5] dark:text-[#8E6BFF]">
              Anonymous Question
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[#706B7D] dark:text-[#9E97B3] font-medium">
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
          <p className="text-sm font-bold text-[#191525] dark:text-[#F4F2FA] leading-snug break-words">
            &ldquo;<MentionText text={liveMessage.text} />&rdquo;
          </p>
        </div>

        {/* Scrollable Instagram DM Bubble Stream */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 no-scrollbar">
          {comments.length === 0 ? (
            <div className="py-10 px-4 text-center flex flex-col items-center justify-center text-[#706B7D] dark:text-[#9E97B3]">
              <div className="w-11 h-11 rounded-full bg-[#FAF9FC] dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] text-[#5420F5] dark:text-[#8E6BFF] flex items-center justify-center mb-2">
                <Lock className="w-4 h-4" />
              </div>
              <p className="text-xs font-black text-[#191525] dark:text-[#F4F2FA]">
                No messages in this DM yet
              </p>
              <p className="text-[11px] mt-0.5 max-w-xs">
                Start a private 1-on-1 DM convo. Only you and the original sender can see it.
              </p>
            </div>
          ) : (
            comments.map((comm) => {
              const isOwner =
                comm.authorRole === 'recipient' || comm.authorName === user.displayName;
              const isFromViewer = replyRole === 'sender' ? !isOwner : isOwner;

              return (
                <div
                  key={comm.id}
                  className={`flex items-end gap-2 ${
                    isFromViewer ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {!isFromViewer && (
                    <div className="shrink-0 mb-4">
                      {isOwner ? (
                        <CampusCharacterAvatar
                          value={comm.authorAvatar || user.avatarUrl}
                          seed={liveMessage.recipientUsername || user.username}
                          size={24}
                          rounded="full"
                        />
                      ) : (
                        <BopoiAnonymousAvatar
                          size="xs"
                          idPrefix={`thread-comm-${comm.id}`}
                        />
                      )}
                    </div>
                  )}

                  <div
                    className={`max-w-[82%] flex flex-col ${
                      isFromViewer ? 'items-end' : 'items-start'
                    }`}
                  >
                    {!isFromViewer && (
                      <div className="flex items-center gap-1 px-1 mb-0.5 text-[11px] font-bold text-[#706B7D] dark:text-[#9E97B3]">
                        <span>
                          {isOwner ? `@${liveMessage.recipientUsername}` : 'Original Sender'}
                        </span>
                        {isOwner && (
                          <VerifiedCreatorBadge
                            isVerified={user.isVerified}
                            username={liveMessage.recipientUsername || user.username}
                            size={12}
                          />
                        )}
                      </div>
                    )}

                    {comm.mediaUrl && (
                      <div
                        className={`w-full flex ${
                          isFromViewer ? 'justify-end' : 'justify-start'
                        } ${comm.text ? 'mb-1.5' : ''}`}
                      >
                        <GifPreviewMedia
                          url={comm.mediaUrl}
                          alt={comm.text || 'DM GIF'}
                          compact
                        />
                      </div>
                    )}

                    {comm.text && (
                      <div
                        className={`px-3.5 py-2.5 text-xs sm:text-[13px] leading-relaxed font-medium break-words ${
                          isFromViewer
                            ? 'bg-[#5420F5] text-white rounded-2xl rounded-br-sm'
                            : 'bg-[#FAF9FC] dark:bg-[#171322] text-[#191525] dark:text-[#F4F2FA] border border-[#EAE6F0] dark:border-[#262036] rounded-2xl rounded-bl-sm'
                        }`}
                      >
                        <MentionText
                          text={comm.text}
                          tone={isFromViewer ? 'inverted' : 'default'}
                        />
                      </div>
                    )}

                    <span className="text-[10px] text-[#706B7D] dark:text-[#9E97B3] tabular-nums mt-1 px-1">
                      {comm.createdAt}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Composer Input Footer */}
        <div className="relative shrink-0 border-t border-[#EAE6F0] dark:border-[#262036] bg-white dark:bg-[#0E0C14]">
          <MentionAutocompleteDropdown
            isOpen={mention.isOpen}
            query={mention.query}
            candidates={mentionCandidates}
            onSelect={mention.insertMention}
            onClose={mention.dismiss}
            placement="top"
            className="mx-3.5 sm:mx-4"
          />

          <form
            onSubmit={handlePostComment}
            className="p-3.5 sm:p-4 space-y-2"
          >
            {pendingGif && (
              <div className="bg-[#FAF9FC] dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] rounded-2xl p-2 px-3 flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  {/\.(mp4|webm)(\?|$)/i.test(pendingGif.mediaUrl) ? (
                    <video
                      src={pendingGif.mediaUrl}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-10 h-10 rounded-xl object-cover border border-[#EAE6F0] dark:border-[#262036] shrink-0"
                    />
                  ) : (
                    <img
                      src={pendingGif.mediaUrl}
                      alt={pendingGif.title}
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-xl object-cover border border-[#EAE6F0] dark:border-[#262036] shrink-0"
                    />
                  )}
                  <div className="min-w-0">
                    <span className="text-[11px] font-black text-[#5420F5] dark:text-[#B9A4FF] block">
                      GIF Attached
                    </span>
                    <p className="text-[11px] text-[#706B7D] dark:text-[#9E97B3] truncate">
                      {pendingGif.title || 'Add a caption or tap send'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPendingGif(null)}
                  className="p-1.5 rounded-full hover:bg-rose-50 dark:hover:bg-rose-950/40 text-[#706B7D] dark:text-[#9E97B3] hover:text-rose-600 cursor-pointer shrink-0"
                  title="Remove GIF"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={mention.togglePicker}
                className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                  mention.isOpen
                    ? 'bg-[#5420F5] border-[#5420F5] text-white'
                    : 'bg-[#FAF9FC] dark:bg-[#171322] border-[#EAE6F0] dark:border-[#262036] text-[#5420F5] dark:text-[#8E6BFF] hover:bg-[#F0EBFF] dark:hover:bg-[#231942]'
                }`}
                title="Mention a student (@)"
                aria-label="Mention a student"
              >
                <AtSign className="w-4 h-4" />
              </button>

              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  inputRef.current?.blur();
                  mention.dismiss();
                  setShowGifPicker(true);
                }}
                className={`h-10 px-2.5 rounded-xl border text-[11px] font-black tracking-wide flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                  pendingGif
                    ? 'bg-[#5420F5] border-[#5420F5] text-white'
                    : 'bg-[#FAF9FC] dark:bg-[#171322] border-[#EAE6F0] dark:border-[#262036] text-[#5420F5] dark:text-[#8E6BFF] hover:bg-[#F0EBFF] dark:hover:bg-[#231942]'
                }`}
                title="Attach a GIF from Klipy"
              >
                GIF
              </button>

              <input
                ref={inputRef}
                type="text"
                value={commentText}
                onChange={mention.handleChange}
                onClick={(e) => mention.syncCursorFromEvent(e.currentTarget)}
                onKeyUp={(e) => mention.syncCursorFromEvent(e.currentTarget)}
                onSelect={(e) => mention.syncCursorFromEvent(e.currentTarget)}
                placeholder={
                  pendingGif
                    ? 'Add a caption (optional)...'
                    : replyRole === 'recipient'
                    ? `Reply or @mention as ${user.displayName}...`
                    : `Follow up or @mention to @${liveMessage.recipientUsername}...`
                }
                className="flex-1 min-w-0 px-4 py-2.5 bg-[#FAF9FC] dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] rounded-full text-base sm:text-sm text-[#191525] dark:text-[#F4F2FA] placeholder:text-[#706B7D] dark:placeholder:text-[#9E97B3] focus:outline-none focus:border-[#5420F5]"
              />
              <button
                type="submit"
                disabled={!commentText.trim() && !pendingGif?.mediaUrl}
                className={`w-10 h-10 rounded-full font-bold transition-colors flex items-center justify-center shrink-0 cursor-pointer ${
                  commentText.trim() || pendingGif?.mediaUrl
                    ? 'bg-[#5420F5] text-white hover:bg-[#4314E2]'
                    : 'bg-[#FAF9FC] dark:bg-[#171322] text-slate-400 border border-[#EAE6F0] dark:border-[#262036] cursor-not-allowed'
                }`}
                aria-label="Send reply"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      </div>

      <KlipyGifPicker
        isOpen={showGifPicker}
        customerId={user.id || user.username || 'bopoi_student'}
        onSelect={(gif) => {
          setPendingGif({ mediaUrl: gif.url, title: gif.title });
          setTimeout(() => inputRef.current?.focus(), 40);
        }}
        onClose={() => setShowGifPicker(false)}
      />
    </div>
  );
};
