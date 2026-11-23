import React, { useState } from 'react';
import { Send, AlertCircle, ArrowLeft, Loader2, Check, Dices } from 'lucide-react';
import { useBopoi } from '../../context/BopoiContext.tsx';
import { BopoiLogo } from '../brand/BopoiLogo.tsx';
import { BopoiInteractiveMascot } from '../brand/BopoiInteractiveMascot.tsx';
import { CampusCharacterAvatar } from '../brand/character/index.ts';
import {
  CreateConfessionIcon,
  SparklePolishIcon,
  SafetyShieldBadgeIcon,
} from '../brand/icons/index.ts';
import { VerifiedCreatorBadge } from '../ui/VerifiedCreatorBadge.tsx';

const ICEBREAKER_PROMPTS = [
  "What's your honest first impression of me?",
  'Tell me a secret you have never told anyone 👀',
  'Rate my vibe from 1 to 10!',
  'What is one thing you admire about me?',
  'Drop an anonymous confession or question 🔥',
  'Where did we first cross paths on campus?',
  'Do you think we would survive a group project together?',
];

export const PublicAskView: React.FC = () => {
  const {
    user,
    askingRecipient,
    setAskingRecipient,
    accounts,
    sendAnonymousMessage,
    setActiveView,
    viewUserProfile,
    openLegalDoc,
    isAuthenticated,
  } = useBopoi();
  const isLoggedIn = Boolean(isAuthenticated && user.username && user.username !== 'student');

  const recipient = askingRecipient || user;
  const recipientDisplayName =
    'displayName' in recipient ? recipient.displayName : recipient.name;
  const recipientUsername = recipient.username;
  const recipientAvatar = recipient.avatarUrl;
  const recipientCampus = recipient.campus || 'University of Lagos';
  const recipientLinkActive =
    'linkActive' in recipient ? recipient.linkActive : true;
  const recipientPrompt =
    ('customPrompt' in recipient && recipient.customPrompt) ||
    "There's something you've been wanting to ask...";

  const [messageText, setMessageText] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendStage, setSendStage] = useState<'idle' | 'sending' | 'confirmed'>('idle');

  const handleIcebreaker = (prompt: string) => {
    setMessageText(prompt);
    setErrorMsg(null);
  };

  const handleRollDice = () => {
    const candidates = ICEBREAKER_PROMPTS.filter((p) => p !== messageText);
    const next =
      candidates[Math.floor(Math.random() * candidates.length)] || ICEBREAKER_PROMPTS[0];
    setMessageText(next);
    setErrorMsg(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (sending || sendStage !== 'idle') return;
    setErrorMsg(null);

    if (!recipientLinkActive) {
      setErrorMsg('This link is currently paused by the owner.');
      return;
    }

    setSending(true);
    setSendStage('sending');

    setTimeout(() => {
      const res = sendAnonymousMessage(recipientUsername, messageText);
      if (!res.success) {
        setSending(false);
        setSendStage('idle');
        setErrorMsg(res.error || 'Unable to send message.');
        return;
      }

      setSendStage('confirmed');
      setTimeout(() => {
        setSending(false);
        setSendStage('idle');
        setMessageText('');
        setActiveView('message-sent');
      }, 480);
    }, 380);
  };

  return (
    <div
      className={`w-full overflow-x-hidden text-[#191525] dark:text-[#F4F2FA] ${
        isLoggedIn
          ? 'bg-white dark:bg-[#0E0C14] min-h-[calc(100dvh-112px)] lg:min-h-dvh flex flex-col'
          : 'min-h-[calc(100dvh-4rem)] bg-[#FAF9FC] dark:bg-[#0E0C14] py-6 sm:py-10 px-3 sm:px-6 flex flex-col items-center justify-start sm:justify-center'
      }`}
    >
      {/* Top Navigation Bar */}
      <div
        className={
          isLoggedIn
            ? 'sticky top-[52px] lg:top-0 z-20 bg-white/95 dark:bg-[#0E0C14]/95 backdrop-blur-md border-b border-[#EAE6F0] dark:border-[#262036] px-4 py-3 flex items-center justify-between gap-2'
            : 'w-full max-w-md mb-4 flex items-center justify-between gap-2 bg-white dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] rounded-2xl px-4 py-2.5 min-w-0'
        }
      >
        <button
          type="button"
          onClick={() => viewUserProfile(recipient)}
          className="flex items-center gap-1.5 text-xs font-bold text-[#706B7D] dark:text-[#9E97B3] hover:text-[#191525] dark:hover:text-[#F4F2FA] cursor-pointer min-w-0 truncate min-h-[40px]"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" />
          <span className="truncate">View @{recipientUsername}&apos;s profile</span>
        </button>
        <span className="text-[11px] font-bold text-[#5420F5] dark:text-[#B9A7FF] shrink-0">
          Anonymous Q&amp;A
        </span>
      </div>

      <div
        className={
          isLoggedIn
            ? 'p-4 sm:p-6 space-y-5 max-w-lg w-full mx-auto flex-1'
            : 'w-full max-w-md space-y-5'
        }
      >
        {/* Main Public Submission Card */}
        <div className="w-full bg-white dark:bg-[#171322] rounded-3xl border border-[#EAE6F0] dark:border-[#262036] shadow-xs overflow-hidden min-w-0">
          {/* Top Purple Header Strip */}
          <div className="bg-gradient-to-r from-[#5420F5] to-[#3A10B5] p-4 sm:p-6 text-white relative overflow-hidden">
            <div className="flex items-center justify-between gap-3 relative z-10 min-w-0">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <CampusCharacterAvatar
                  value={recipientAvatar}
                  seed={recipientUsername}
                  size={56}
                  rounded="full"
                  className="border-2 border-white/80 shrink-0"
                />

                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-[#FFC928] inline-flex items-center gap-1.5 truncate max-w-full">
                    <span className="truncate">
                      @{recipientUsername} · {recipientCampus}
                    </span>
                    <VerifiedCreatorBadge
                      isVerified={Boolean((recipient as any).isVerified || (recipient as any).isCreator)}
                      username={recipientUsername}
                      size={14}
                    />
                  </div>
                  <h1 className="text-base sm:text-xl font-black leading-snug mt-0.5 break-words">
                    Send {recipientDisplayName} an anonymous message
                  </h1>
                </div>
              </div>

              <div className="hidden sm:block shrink-0">
                <BopoiInteractiveMascot
                  size="sm"
                  mood={messageText.length > 0 ? 'excited' : 'curious'}
                />
              </div>
            </div>

            <div className="mt-3.5 bg-white/10 border border-white/15 rounded-2xl p-3 text-xs sm:text-sm font-medium text-white/95 break-words">
              &ldquo;{recipientPrompt}&rdquo;
            </div>
          </div>

          {/* Form Body */}
          <div className="p-5 sm:p-6 space-y-5">
            {!recipientLinkActive ? (
              <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-5 text-center space-y-2">
                <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
                <h3 className="text-base font-extrabold text-amber-950 dark:text-amber-200">
                  {recipientDisplayName}&apos;s link is taking a break
                </h3>
                <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                  This student has temporarily paused incoming anonymous messages. Check back later!
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-extrabold text-[#191525] dark:text-[#F4F2FA] flex items-center gap-1.5">
                      <CreateConfessionIcon size={16} />
                      <span>100% Anonymous</span>
                    </label>
                    <span
                      className={`text-[11px] font-bold tabular-nums ${
                        messageText.length > 450 ? 'text-rose-500' : 'text-[#706B7D] dark:text-[#9E97B3]'
                      }`}
                    >
                      {messageText.length}/500
                    </span>
                  </div>

                  <textarea
                    rows={4}
                    maxLength={500}
                    value={messageText}
                    onChange={(e) => {
                      setMessageText(e.target.value);
                      if (errorMsg) setErrorMsg(null);
                    }}
                    placeholder={`Write something secret to ${recipientDisplayName}...`}
                    className="w-full p-4 rounded-2xl bg-[#FAF9FC] dark:bg-[#0E0C14] border border-[#EAE6F0] dark:border-[#262036] focus:border-[#5420F5] focus:bg-white dark:focus:bg-[#0E0C14] text-base sm:text-sm text-[#191525] dark:text-[#F4F2FA] placeholder:text-[#706B7D] dark:placeholder:text-[#7D7594] focus:outline-none transition-all resize-none font-medium"
                  />
                </div>

                {errorMsg && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Icebreaker Chips + NGL Shuffle Dice */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[11px] font-bold text-[#706B7D] dark:text-[#9E97B3] flex items-center gap-1">
                      <SparklePolishIcon size={14} />
                      <span>Need inspiration? Tap a prompt:</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleRollDice}
                      className="min-h-[32px] px-2.5 py-1 rounded-xl bg-[#F0EBFF] dark:bg-[#231A45] text-[#5420F5] dark:text-[#B9A7FF] text-[11px] font-extrabold inline-flex items-center gap-1 hover:bg-[#5420F5] hover:text-white transition-colors cursor-pointer shrink-0"
                      title="Roll random question"
                    >
                      <Dices className="w-3.5 h-3.5" />
                      <span>Dice</span>
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {ICEBREAKER_PROMPTS.slice(0, 5).map((prompt, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleIcebreaker(prompt)}
                        className="min-h-[36px] text-left text-[11px] font-semibold bg-[#FAF9FC] dark:bg-[#0E0C14] hover:bg-[#F0EBFF] dark:hover:bg-[#231A45] text-[#191525] dark:text-[#F4F2FA] hover:text-[#5420F5] dark:hover:text-[#B9A7FF] border border-[#EAE6F0] dark:border-[#262036] hover:border-[#5420F5]/30 px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={sending || sendStage !== 'idle' || !messageText.trim()}
                  className={`w-full min-h-[46px] px-6 disabled:opacity-60 text-white font-black text-sm rounded-2xl flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer disabled:cursor-not-allowed ${
                    sendStage === 'confirmed'
                      ? 'bg-emerald-600 scale-[0.99]'
                      : sendStage === 'sending'
                      ? 'bg-[#4314E2] scale-[0.99]'
                      : 'bg-[#5420F5] hover:bg-[#4314E2] active:scale-[0.98]'
                  }`}
                >
                  {sendStage === 'sending' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                      <span>Encrypting &amp; delivering anonymously…</span>
                    </>
                  ) : sendStage === 'confirmed' ? (
                    <>
                      <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center animate-in zoom-in-75 duration-200 shrink-0">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </span>
                      <span>Delivered anonymously to @{recipientUsername}!</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 shrink-0" />
                      <span>Send Anonymously to {recipientDisplayName}</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Safety Reassurance Footer */}
            <div className="pt-3 border-t border-[#EAE6F0] dark:border-[#262036] flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#706B7D] dark:text-[#9E97B3]">
              <span className="flex items-center gap-1 font-semibold">
                <SafetyShieldBadgeIcon size={15} />
                <span>Protected by Safety Shield</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openLegalDoc('guidelines')}
                  className="font-bold text-[#5420F5] dark:text-[#B9A7FF] hover:underline cursor-pointer"
                >
                  Guidelines
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => openLegalDoc('privacy')}
                  className="font-bold text-[#5420F5] dark:text-[#B9A7FF] hover:underline cursor-pointer"
                >
                  Privacy
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Context-Aware Bottom CTA */}
        <div className="text-center space-y-2.5 pb-4">
          {isLoggedIn ? (
            <button
              type="button"
              onClick={() => setActiveView('inbox')}
              className="min-h-[44px] px-6 bg-[#191525] dark:bg-[#F4F2FA] hover:bg-[#5420F5] dark:hover:bg-[#7C5CFF] text-white dark:text-[#191525] dark:hover:text-white font-extrabold text-xs rounded-2xl transition-colors cursor-pointer inline-flex items-center gap-2"
            >
              <BopoiLogo variant="icon" size="sm" />
              <span>Check My Anonymous Inbox (@{user.username})</span>
            </button>
          ) : (
            <>
              <p className="text-xs font-bold text-[#706B7D] dark:text-[#9E97B3]">
                Want classmates to send you anonymous messages too?
              </p>
              <button
                type="button"
                onClick={() => setActiveView('register')}
                className="min-h-[44px] px-6 bg-[#191525] dark:bg-[#F4F2FA] hover:bg-[#5420F5] dark:hover:bg-[#7C5CFF] text-white dark:text-[#191525] dark:hover:text-white font-extrabold text-xs rounded-2xl transition-colors cursor-pointer inline-flex items-center gap-2"
              >
                <BopoiLogo variant="icon" size="sm" />
                <span>Get your own Bopoi link!</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
