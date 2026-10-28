import React, { useState } from 'react';
import { Send, Shield, Sparkles, Lock, AlertCircle, ArrowLeft, Users } from 'lucide-react';
import { useBopoi } from '../../context/BopoiContext.tsx';
import { BopoiLogo } from '../brand/BopoiLogo.tsx';
import { BopoiInteractiveMascot } from '../brand/BopoiInteractiveMascot.tsx';
import { CampusCharacterAvatar } from '../brand/character/index.ts';
import {
  CreateConfessionIcon,
  SparklePolishIcon,
  SafetyShieldBadgeIcon,
} from '../brand/icons/index.ts';

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
  } = useBopoi();

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

  const handleIcebreaker = (prompt: string) => {
    setMessageText(prompt);
    setErrorMsg(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!recipientLinkActive) {
      setErrorMsg('This link is currently paused by the owner.');
      return;
    }

    const res = sendAnonymousMessage(recipientUsername, messageText);
    if (!res.success) {
      setErrorMsg(res.error || 'Unable to send message.');
      return;
    }

    setSending(true);
    setTimeout(() => {
      setSending(false);
      setMessageText('');
      setActiveView('message-sent');
    }, 350);
  };

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] bg-gradient-to-b from-[#FAF9FC] to-[#F0EBFF]/50 py-5 sm:py-10 px-3 sm:px-6 flex flex-col items-center justify-center overflow-x-hidden">
      {/* Top Navigation Bar */}
      <div className="w-full max-w-md mb-4 flex items-center justify-between gap-2 bg-white/95 backdrop-blur-xs border border-[#EAE6F0] rounded-2xl px-3.5 py-2.5 shadow-2xs min-w-0 overflow-hidden">
        <button
          type="button"
          onClick={() => viewUserProfile(recipient)}
          className="flex items-center gap-1.5 text-xs font-bold text-[#706B7D] hover:text-[#191525] cursor-pointer min-w-0 truncate"
        >
          <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">View @{recipientUsername}&apos;s Profile</span>
        </button>
        <span className="text-[11px] font-bold text-[#5420F5] shrink-0">
          Anonymous Q&amp;A
        </span>
      </div>

      {/* Main Public Submission Card */}
      <div className="w-full max-w-md bg-white rounded-3xl border border-[#EAE6F0] shadow-2xl shadow-[#5420F5]/10 overflow-hidden min-w-0">
        {/* Top Purple Header Strip */}
        <div className="bg-gradient-to-r from-[#5420F5] to-[#3A10B5] p-4 sm:p-6 text-white relative overflow-hidden">
          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-[#FFC928]/20 rounded-full blur-xl pointer-events-none" />

          <div className="flex items-center justify-between gap-3 relative z-10 min-w-0">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="relative shrink-0">
                <CampusCharacterAvatar
                  value={recipientAvatar}
                  seed={recipientUsername}
                  size={58}
                  rounded="full"
                  className="border-3 border-white shadow-md"
                />
                <span
                  className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white ${
                    recipientLinkActive ? 'bg-emerald-400' : 'bg-amber-400'
                  }`}
                />
              </div>

              <div className="min-w-0 flex-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#FFC928] block truncate">
                  @{recipientUsername} • {recipientCampus}
                </span>
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

          <div className="mt-3.5 bg-white/10 backdrop-blur-xs border border-white/15 rounded-2xl p-3 text-xs sm:text-sm font-medium text-white/95 break-words">
            "{recipientPrompt}"
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-5">
          {!recipientLinkActive ? (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center space-y-2">
              <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
              <h3 className="text-base font-extrabold text-amber-950">
                {recipientDisplayName}'s link is taking a break
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
                    className={`text-[11px] font-bold ${
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
                  className="w-full p-4 rounded-2xl bg-[#FAF9FC] border-2 border-[#EAE6F0] focus:border-[#5420F5] focus:bg-white text-base sm:text-sm text-[#191525] placeholder:text-slate-400 focus:outline-none transition-all resize-none font-medium"
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
                      className="text-left text-[11px] font-semibold bg-[#FAF9FC] hover:bg-[#F0EBFF] text-slate-700 hover:text-[#5420F5] border border-[#EAE6F0] hover:border-[#5420F5]/30 px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={sending || !messageText.trim()}
                className="w-full py-4 px-6 bg-[#5420F5] hover:bg-[#4314E2] disabled:opacity-50 text-white font-black text-sm rounded-2xl shadow-lg shadow-[#5420F5]/25 flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>{sending ? 'Sending...' : `Send Anonymously to ${recipientDisplayName}`}</span>
              </button>
            </form>
          )}

          {/* Safety Reassurance Footer */}
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#706B7D]">
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
              <span>•</span>
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

      {/* Viral CTA Below Card */}
      <div className="mt-6 text-center space-y-2.5">
        <p className="text-xs font-bold text-[#706B7D]">
          👇 Want classmates to send you anonymous messages too?
        </p>
        <button
          onClick={() => setActiveView('register')}
          className="px-6 py-3 bg-[#191525] hover:bg-slate-800 text-white font-extrabold text-xs rounded-2xl shadow-md transition-all cursor-pointer inline-flex items-center gap-2"
        >
          <BopoiLogo variant="icon" size="sm" />
          <span>Get your own Bopoi link!</span>
        </button>
      </div>
    </div>
  );
};
