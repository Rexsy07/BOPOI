import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Send, ArrowRight, MessageCircle, Lock, Inbox } from 'lucide-react';
import { useBopoi } from '../../context/BopoiContext.tsx';
import { BopoiLogo } from '../brand/BopoiLogo.tsx';
import { CommentsThreadModal } from '../comments/CommentsThreadModal.tsx';
import { BopoiInteractiveMascot } from '../brand/BopoiInteractiveMascot.tsx';
import { ReadStatusBadge } from '../ui/ReadStatusBadge.tsx';
import { ReceiveMessagesIcon, SafetyShieldBadgeIcon } from '../brand/icons/index.ts';

export const MessageSentView: React.FC = () => {
  const {
    user,
    askingRecipient,
    setActiveView,
    lastSentMessageId,
    sentMessages,
    messages,
    getUnreadConvoCount,
    markConvoAsRead,
    switchAccount,
    accounts,
    isAuthenticated,
  } = useBopoi();
  const isLoggedIn = Boolean(isAuthenticated && user.username && user.username !== 'student');
  const [showThreadModal, setShowThreadModal] = useState(false);

  const recipient = askingRecipient || user;
  const recipientDisplayName =
    'displayName' in recipient ? recipient.displayName : recipient.name;
  const recipientUsername = recipient.username;

  useEffect(() => {
    confetti({
      particleCount: 45,
      spread: 75,
      origin: { y: 0.45 },
      colors: ['#5420F5', '#FFC928', '#F52D85'],
    });
  }, []);

  const lastMessage = lastSentMessageId
    ? sentMessages.find((m) => m.id === lastSentMessageId) ||
      messages.find((m) => m.id === lastSentMessageId)
    : null;

  const unreadConvoCount = lastMessage
    ? getUnreadConvoCount(lastMessage, 'sender')
    : 0;

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] bg-[#FAF9FC] py-10 px-4 sm:px-6 flex items-center justify-center">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 border border-[#EAE6F0] shadow-xl space-y-6 text-center">
        {/* Celebratory 3D Mascot */}
        <div className="flex justify-center mb-1">
          <BopoiInteractiveMascot
            size="lg"
            mood="happy"
            speechBubbleText="Delivered secretly! 💜"
          />
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#191525] flex items-center justify-center gap-2">
            <span>Message sent!</span>
            <ReceiveMessagesIcon size={28} />
          </h1>
          <p className="text-sm text-[#706B7D] mt-1.5 leading-relaxed">
            <span className="font-bold text-[#191525]">{recipientDisplayName}</span> (@{recipientUsername}) will see your anonymous message in their inbox.
          </p>
        </div>

        {/* 1-on-1 Private Follow-up Convo Option */}
        {lastMessage && (
          <div className="bg-[#FAF9FC] border border-[#5420F5]/20 rounded-2xl p-4 text-left space-y-3 shadow-2xs">
            <div className="flex items-center justify-between text-xs gap-2">
              <span className="font-extrabold text-[#5420F5] flex items-center gap-1.5 truncate">
                <SafetyShieldBadgeIcon size={16} />
                <span>Private 1-on-1 Convo</span>
              </span>
              <ReadStatusBadge
                isRead={lastMessage.isRead}
                readAt={lastMessage.readAt}
                recipientName={recipientDisplayName}
                size="sm"
              />
            </div>

            {/* Sent message quote */}
            <div className="bg-white border border-[#EAE6F0] rounded-xl p-3 shadow-2xs">
              <p className="text-xs font-semibold text-[#191525] line-clamp-2 italic">
                "{lastMessage.text}"
              </p>
            </div>

            <p className="text-xs text-slate-700 leading-snug font-medium">
              Want to add a follow-up or check if {recipientDisplayName} replied? Only you and {recipientDisplayName} can see this conversation.
            </p>

            <button
              onClick={() => {
                markConvoAsRead(lastMessage.id, 'sender');
                setShowThreadModal(true);
              }}
              className="w-full py-2.5 px-3 bg-[#5420F5] hover:bg-[#4314E2] text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
            >
              <ReceiveMessagesIcon size={16} />
              <span>
                Open Private Convo with {recipientDisplayName}
                {unreadConvoCount > 0 ? ` (${unreadConvoCount})` : ''}
              </span>
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2.5">
          <button
            onClick={() => setActiveView('public-ask')}
            className="w-full py-3 px-4 bg-white hover:bg-slate-50 border border-[#EAE6F0] text-[#191525] font-extrabold text-xs sm:text-sm rounded-xl transition-all cursor-pointer shadow-2xs flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4 text-[#5420F5]" />
            <span>Send another message to {recipientDisplayName}</span>
          </button>
        </div>

        {/* Context-Aware Bottom Card */}
        <div className="bg-[#FAF9FC] border border-[#EAE6F0] rounded-2xl p-4 sm:p-5 flex flex-col items-center text-center">
          {isLoggedIn ? (
            <>
              <h3 className="text-sm font-black text-[#191525]">
                Continue exploring campus
              </h3>
              <p className="text-xs text-[#706B7D] mt-1">
                Jump back to the live campus feed or check your own anonymous inbox.
              </p>
              <button
                onClick={() => setActiveView('home')}
                className="mt-3.5 px-6 py-2.5 bg-white border border-[#5420F5] text-[#5420F5] hover:bg-[#F0EBFF] font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
              >
                <span>Back to Campus Feed</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <>
              <h3 className="text-sm font-black text-[#191525]">
                Want your own anonymous link?
              </h3>
              <p className="text-xs text-[#706B7D] mt-1">
                Let your classmates and friends ask you anything. Free in 30 seconds.
              </p>
              <button
                onClick={() => setActiveView('register')}
                className="mt-3.5 px-6 py-2.5 bg-white border border-[#5420F5] text-[#5420F5] hover:bg-[#F0EBFF] font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
              >
                <span>Create my link</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>

        {/* Bottom Logo stamp */}
        <div className="pt-1 flex justify-center opacity-70">
          <BopoiLogo variant="icon" size="sm" />
        </div>
      </div>

      {/* 1-on-1 Private Comments Thread Modal */}
      {showThreadModal && lastMessage && (
        <CommentsThreadModal
          message={lastMessage}
          onClose={() => setShowThreadModal(false)}
          initialRole="sender"
        />
      )}
    </div>
  );
};
