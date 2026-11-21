import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ArrowLeft,
  MessageCircle,
  Flag,
  Ban,
  Trash2,
  Send,
  Lock,
  AtSign,
  Sparkles,
  X,
} from 'lucide-react';
import { useBopoi } from '../../context/BopoiContext.tsx';
import { BopoiAnonymousAvatar } from '../brand/BopoiAnonymousAvatar.tsx';
import { CampusCharacterAvatar } from '../brand/character/index.ts';
import { VerifiedCreatorBadge } from '../ui/VerifiedCreatorBadge.tsx';
import { MentionText } from '../ui/MentionText.tsx';
import { MentionAutocompleteDropdown } from '../comments/MentionAutocompleteDropdown.tsx';
import {
  buildMentionCandidates,
  useMentionAutocomplete,
} from '../../hooks/useMentionAutocomplete.ts';
import { KlipyGifPicker } from '../modals/KlipyGifPicker.tsx';
import { GifPreviewMedia } from '../ui/GifPreviewMedia.tsx';

export const MessageDetailModal: React.FC = () => {
  const {
    selectedMessage,
    answers,
    setActiveView,
    goBack,
    deleteMessage,
    openReportModal,
    blockSender,
    addComment,
    markConvoAsRead,
    user,
    creators,
    accounts,
    viewUserProfile,
    messages,
    sentMessages,
  } = useBopoi();

  const [newCommentText, setNewCommentText] = useState('');
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [pendingGif, setPendingGif] = useState<{ mediaUrl: string; title: string } | null>(null);
  const convoInputRef = useRef<HTMLInputElement>(null);
  const threadBottomRef = useRef<HTMLDivElement>(null);

  const convoMention = useMentionAutocomplete({
    text: newCommentText,
    setText: setNewCommentText,
    inputRef: convoInputRef,
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
      <div className="w-full min-h-[calc(100dvh-112px)] lg:min-h-dvh bg-white dark:bg-[#0E0C14] py-16 px-4 flex flex-col items-center justify-center text-center">
        <p className="text-sm font-semibold text-[#706B7D] dark:text-[#9E97B3] mb-4">
          No message selected.
        </p>
        <button
          type="button"
          onClick={() => setActiveView('inbox')}
          className="min-h-[44px] px-5 py-2.5 bg-[#5420F5] text-white font-bold text-xs rounded-xl cursor-pointer hover:bg-[#4314E2] transition-colors"
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
    if (!newCommentText.trim() && !pendingGif?.mediaUrl) return;
    const gifAttachment = pendingGif
      ? { mediaUrl: pendingGif.mediaUrl, mediaType: 'gif' as const }
      : undefined;
    addComment(liveMessage.id, newCommentText, replyRole, gifAttachment);
    markConvoAsRead(liveMessage.id, replyRole);
    setNewCommentText('');
    setPendingGif(null);
    convoMention.reset();
    setTimeout(() => {
      threadBottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 60);
  };

  const handleDelete = () => {
    deleteMessage(liveMessage.id);
  };

  const handleBlock = () => {
    blockSender(liveMessage.id);
  };

  return (
    <div className="w-full flex flex-col bg-white dark:bg-[#0E0C14] text-[#191525] dark:text-[#F4F2FA] select-none min-h-[calc(100dvh-110px)] lg:min-h-dvh">
      {/* 1. Sticky DM Thread Header */}
      <div className="sticky top-[52px] lg:top-0 z-20 bg-white/95 dark:bg-[#0E0C14]/95 backdrop-blur-md border-b border-[#EAE6F0] dark:border-[#262036] px-4 sm:px-5 h-[52px] flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => goBack('inbox')}
          className="min-h-[44px] -ml-2 px-2.5 rounded-xl flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#191525] dark:text-[#F4F2FA] hover:bg-[#FAF9FC] dark:hover:bg-[#171322] transition-colors cursor-pointer shrink-0"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" />
          <span>Inbox</span>
        </button>

        <div className="flex items-center gap-2 min-w-0">
          <Lock className="w-3.5 h-3.5 text-[#5420F5] dark:text-[#8E6BFF] shrink-0" />
          <span className="text-xs font-extrabold truncate">
            {isSentByMe ? `DM with @${liveMessage.recipientUsername}` : 'Anonymous DM'}
          </span>
        </div>

        <span className="text-xs font-semibold text-[#706B7D] dark:text-[#9E97B3] tabular-nums shrink-0">
          {liveMessage.createdAt}
        </span>
      </div>

      {/* 2. Focal Question Prompt Card + Story Studio CTA */}
      <section className="px-4 sm:px-5 py-4 border-b border-[#EAE6F0] dark:border-[#262036] space-y-3.5 bg-[#FAF9FC]/40 dark:bg-[#171322]/40">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <BopoiAnonymousAvatar
              size="sm"
              idPrefix={`detail-msg-${liveMessage.id}`}
            />
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-black text-[#191525] dark:text-[#F4F2FA] truncate">
                {isSentByMe ? (
                  <>
                    Sent to{' '}
                    <button
                      type="button"
                      onClick={() => viewUserProfile(liveMessage.recipientUsername)}
                      className="text-[#5420F5] dark:text-[#8E6BFF] hover:underline underline-offset-2 cursor-pointer"
                    >
                      @{liveMessage.recipientUsername}
                    </button>
                  </>
                ) : (
                  'Anonymous Student'
                )}
              </h2>
              <p className="text-[11px] text-[#706B7D] dark:text-[#9E97B3]">
                {isSentByMe ? 'Anonymous message you sent' : 'Received via your Ask Link'}
              </p>
            </div>
          </div>

          {!isSentByMe && (
            <button
              type="button"
              onClick={() => setActiveView('answer-studio')}
              className="min-h-[40px] px-3.5 py-2 bg-[#5420F5] hover:bg-[#4314E2] text-white font-extrabold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>{currentAnswer ? 'Edit Card' : 'Story Card'}</span>
            </button>
          )}
        </div>

        {/* Main Question Bubble */}
        <div className="bg-white dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] rounded-2xl p-4 shadow-xs">
          <p className="text-[15px] font-bold text-[#191525] dark:text-[#F4F2FA] leading-relaxed break-words">
            <MentionText text={liveMessage.text} />
          </p>
        </div>

        {/* Saved Answer Preview */}
        {currentAnswer && (
          <div className="p-3.5 rounded-2xl bg-[#FAF8FF] dark:bg-[#231942]/55 border border-[#5420F5]/20 dark:border-[#5420F5]/35 space-y-1">
            <span className="text-[11px] font-bold text-[#5420F5] dark:text-[#B9A4FF] block">
              {isSentByMe ? `@${liveMessage.recipientUsername}'s Public Card Reply` : 'Your Public Story Reply'}
            </span>
            <p className="text-sm font-semibold text-[#191525] dark:text-[#F4F2FA] leading-relaxed break-words">
              <MentionText text={currentAnswer.answerText} />
            </p>
          </div>
        )}
      </section>

      {/* 3. Private 1-on-1 DM Convo Banner */}
      <div className="px-4 sm:px-5 py-2.5 border-b border-[#EAE6F0] dark:border-[#262036] flex items-center justify-between gap-2 bg-white dark:bg-[#0E0C14]">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-[#5420F5] dark:text-[#8E6BFF] shrink-0" />
          <h3 className="text-xs font-black text-[#191525] dark:text-[#F4F2FA]">
            Private 1-on-1 DM Convo
          </h3>
        </div>
        <span className="text-[11px] font-semibold text-[#706B7D] dark:text-[#9E97B3] shrink-0">
          Only you two can read this
        </span>
      </div>

      {/* 4. Instagram DM Bubble Stream */}
      <div className="flex-1 px-4 sm:px-5 py-4 space-y-3 bg-white dark:bg-[#0E0C14]">
        {comments.length === 0 ? (
          <div className="py-10 text-center flex flex-col items-center justify-center">
            <div className="w-11 h-11 rounded-full bg-[#FAF9FC] dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] flex items-center justify-center mb-2 text-[#5420F5] dark:text-[#8E6BFF]">
              <Lock className="w-4 h-4" />
            </div>
            <p className="text-xs font-black text-[#191525] dark:text-[#F4F2FA]">
              No replies yet
            </p>
            <p className="text-[11px] text-[#706B7D] dark:text-[#9E97B3] mt-0.5 max-w-xs">
              Send a message below to start an anonymous 1-on-1 DM conversation.
            </p>
          </div>
        ) : (
          comments.map((comm) => {
            const isOwner =
              comm.authorRole === 'recipient' ||
              comm.authorName === user.displayName;
            const isFromViewer = isSentByMe ? !isOwner : isOwner;

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
                        size={26}
                        rounded="full"
                      />
                    ) : (
                      <BopoiAnonymousAvatar
                        size="xs"
                        idPrefix={`detail-comment-${comm.id}`}
                      />
                    )}
                  </div>
                )}

                <div
                  className={`max-w-[80%] sm:max-w-[74%] flex flex-col ${
                    isFromViewer ? 'items-end' : 'items-start'
                  }`}
                >
                  {!isFromViewer && (
                    <div className="flex items-center gap-1 px-1 mb-0.5 text-[11px] text-[#706B7D] dark:text-[#9E97B3] font-bold">
                      <span>{isOwner ? `@${liveMessage.recipientUsername}` : 'Anonymous Sender'}</span>
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
                    <div className={comm.text ? 'mb-1.5' : ''}>
                      <GifPreviewMedia
                        url={comm.mediaUrl}
                        alt={comm.text || 'DM GIF'}
                        compact
                      />
                    </div>
                  )}

                  {comm.text && (
                    <div
                      className={`px-3.5 py-2.5 text-[13px] sm:text-sm leading-relaxed font-medium break-words ${
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
        <div ref={threadBottomRef} />
      </div>

      {/* 5. Sticky Bottom DM Composer & Moderation Footer */}
      <div className="sticky bottom-[calc(58px+env(safe-area-inset-bottom))] lg:bottom-0 z-20 bg-white/95 dark:bg-[#0E0C14]/95 backdrop-blur-md border-t border-[#EAE6F0] dark:border-[#262036]">
        <div className="relative px-4 sm:px-5 py-2.5 space-y-2">
          <MentionAutocompleteDropdown
            isOpen={convoMention.isOpen}
            query={convoMention.query}
            candidates={mentionCandidates}
            onSelect={convoMention.insertMention}
            onClose={convoMention.dismiss}
            placement="top"
            className="mx-4 sm:mx-5"
          />

          {pendingGif && (
            <div className="bg-[#FAF9FC] dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] rounded-2xl p-2 px-3 flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src={pendingGif.mediaUrl}
                  alt={pendingGif.title}
                  className="w-11 h-11 rounded-xl object-cover border border-[#EAE6F0] dark:border-[#262036] shrink-0"
                />
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
                className="min-h-[36px] min-w-[36px] rounded-full flex items-center justify-center hover:bg-rose-50 dark:hover:bg-rose-950/40 text-[#706B7D] dark:text-[#9E97B3] hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer shrink-0 transition-colors"
                title="Remove GIF"
                aria-label="Remove attached GIF"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <form onSubmit={handlePostComment} className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={convoMention.togglePicker}
              className={`min-h-[44px] w-[44px] rounded-xl border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                convoMention.isOpen
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
                convoInputRef.current?.blur();
                if (document.activeElement instanceof HTMLElement) {
                  document.activeElement.blur();
                }
                convoMention.dismiss();
                setShowGifPicker(true);
              }}
              className={`min-h-[44px] px-2.5 rounded-xl border text-[11px] font-black tracking-wide flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                pendingGif
                  ? 'bg-[#5420F5] border-[#5420F5] text-white'
                  : 'bg-[#FAF9FC] dark:bg-[#171322] border-[#EAE6F0] dark:border-[#262036] text-[#5420F5] dark:text-[#8E6BFF] hover:bg-[#F0EBFF] dark:hover:bg-[#231942]'
              }`}
              title="Attach a GIF from Klipy"
              aria-label="Choose a GIF"
            >
              GIF
            </button>

            <input
              ref={convoInputRef}
              type="text"
              value={newCommentText}
              onChange={convoMention.handleChange}
              onClick={(e) => convoMention.syncCursorFromEvent(e.currentTarget)}
              onKeyUp={(e) => convoMention.syncCursorFromEvent(e.currentTarget)}
              onSelect={(e) => convoMention.syncCursorFromEvent(e.currentTarget)}
              placeholder={pendingGif ? 'Add a caption (optional)...' : 'Message or @mention...'}
              className="flex-1 min-w-0 min-h-[44px] px-4 py-2 bg-[#FAF9FC] dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] rounded-full text-base sm:text-sm text-[#191525] dark:text-[#F4F2FA] placeholder:text-[#706B7D] dark:placeholder:text-[#9E97B3] focus:outline-none focus:border-[#5420F5]"
            />
            <button
              type="submit"
              disabled={!newCommentText.trim() && !pendingGif?.mediaUrl}
              className={`min-h-[44px] min-w-[44px] rounded-full font-bold transition-colors flex items-center justify-center shrink-0 cursor-pointer ${
                newCommentText.trim() || pendingGif?.mediaUrl
                  ? 'bg-[#5420F5] text-white hover:bg-[#4314E2]'
                  : 'bg-[#FAF9FC] dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] text-slate-400 cursor-not-allowed'
              }`}
              aria-label="Send"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Flat Moderation & Safety Footer */}
        <div className="px-4 sm:px-5 py-2 border-t border-[#EAE6F0] dark:border-[#262036] bg-[#FAF9FC]/70 dark:bg-[#171322]/70 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() =>
                openReportModal({
                  targetType: 'anonymous_message',
                  targetId: liveMessage.id,
                  targetLabel: 'anonymous message',
                  targetPreview: liveMessage.text.slice(0, 140),
                })
              }
              className="min-h-[38px] text-amber-700 dark:text-amber-400 hover:underline font-semibold flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Flag className="w-3.5 h-3.5 shrink-0" />
              <span>Report</span>
            </button>

            <button
              type="button"
              onClick={handleBlock}
              className="min-h-[38px] text-[#706B7D] dark:text-[#9E97B3] hover:text-[#191525] dark:hover:text-[#F4F2FA] font-semibold flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Ban className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <span>Block Sender</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleDelete}
            className="min-h-[38px] text-rose-600 dark:text-rose-400 hover:underline font-semibold flex items-center gap-1.5 cursor-pointer shrink-0 ml-auto"
          >
            <Trash2 className="w-3.5 h-3.5 shrink-0" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Klipy GIF Picker Modal */}
      <KlipyGifPicker
        isOpen={showGifPicker}
        customerId={user.id || user.username || 'bopoi_student'}
        onSelect={(gif) => {
          setPendingGif({ mediaUrl: gif.url, title: gif.title });
          setTimeout(() => convoInputRef.current?.focus(), 40);
        }}
        onClose={() => setShowGifPicker(false)}
      />
    </div>
  );
};
