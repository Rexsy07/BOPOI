import React, { useState } from 'react';
import { Send, Shield, Sparkles, Lock, AlertCircle, ArrowLeft, Users, Loader2, Check } from 'lucide-react';
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
      className={`w-full overflow-x-hidden ${
        isLoggedIn
          ? 'bg-white min-h-[calc(100dvh-112px)] lg:min-h-dvh flex flex-col'
          : 'min-h-[calc(100dvh-4rem)] bg-[#FAF9FC] py-6 sm:py-10 px-3 sm:px-6 flex flex-col items-center justify-start sm:justify-center'
      }`}
    >
      {/* Top Navigation Bar */}
      <div
        className={
          isLoggedIn
            ? 'sticky top-[52px] lg:top-0 z-20 bg-white/95 backdrop-blur-md border-b border-[#EAE6F0] px-4 py-3 flex items-center justify-between gap-2'
            : 'w-full max-w-md mb-4 flex items-center justify-between gap-2 bg-white border border-[#EAE6F0] rounded-2xl px-4 py-2.5 min-w-0'
        }
      >
        <button
          type="button"
          onClick={() => viewUserProfile(recipient)}
          className="flex items-center gap-1.5 text-xs font-bold text-[#706B7D] hover:text-[#191525] cursor-pointer min-w-0 truncate min-h-[32px]"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" />
          <span className="truncate">View @{recipientUsername}&apos;s profile</span>
        </button>
        <span className="text-[11px] font-bold text-[#5420F5] shrink-0">
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
        <div className="w-full bg-white rounded-3xl border border-[#EAE6F0] shadow-xs overflow-hidden min-w-0">
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
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center space-y-2">
                <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
                <h3 className="text-base font-extrabold text-amber-950">
                  {recipientDisplayName}&apos;s link is taking a break
                </h3>
                <p className="text-xs text-amber-800 leading-relaxed">
                  This student has temporarily paused incoming anonymous messages. Check back later!
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-extrabold text-[#191525] flex items-center gap-1.5">
                      <CreateConfessionIcon size={16} />
                      <span>100% Anonymous</span>
                    </label>
                    <span
                      className={`text-[11px] font-bold tabular-nums ${
                        messageText.length > 450 ? 'text-rose-500' : 'text-[#706B7D]'
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
                    className="w-full p-4 rounded-2xl bg-[#FAF9FC] border border-[#EAE6F0] focus:border-[#5420F5] focus:bg-white text-base sm:text-sm text-[#191525] placeholder:text-slate-400 focus:outline-none transition-all resize-none font-medium"
                  />
                </div>

                {errorMsg && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Icebreaker Chips */}
                <div>
                  <span className="text-[11px] font-bold text-[#706B7D] flex items-center gap-1 mb-2">
                    <SparklePolishIcon size={14} />
                    <span>Need inspiration? Tap a prompt:</span>
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {ICEBREAKER_PROMPTS.map((prompt, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleIcebreaker(prompt)}
                        className="text-left text-[11px] font-semibold bg-[#FAF9FC] hover:bg-[#F0EBFF] text-[#191525] hover:text-[#5420F5] border border-[#EAE6F0] hover:border-[#5420F5]/30 px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer"
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
            <div className="pt-3 border-t border-[#EAE6F0] flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#706B7D]">
              <span className="flex items-center gap-1 font-semibold">
                <SafetyShieldBadgeIcon size={15} />
                <span>Protected by Safety Shield</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openLegalDoc('guidelines')}
                  className="font-bold text-[#5420F5] hover:underline cursor-pointer"
                >
                  Guidelines
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => openLegalDoc('privacy')}
                  className="font-bold text-[#5420F5] hover:underline cursor-pointer"
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
              className="min-h-[42px] px-6 bg-[#191525] hover:bg-[#2A253B] text-white font-extrabold text-xs rounded-2xl transition-colors cursor-pointer inline-flex items-center gap-2"
            >
              <BopoiLogo variant="icon" size="sm" />
              <span>Check My Anonymous Inbox (@{user.username})</span>
            </button>
          ) : (
            <>
              <p className="text-xs font-bold text-[#706B7D]">
                Want classmates to send you anonymous messages too?
              </p>
              <button
                type="button"
                onClick={() => setActiveView('register')}
                className="min-h-[42px] px-6 bg-[#191525] hover:bg-[#2A253B] text-white font-extrabold text-xs rounded-2xl transition-colors cursor-pointer inline-flex items-center gap-2"
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
