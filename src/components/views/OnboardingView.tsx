import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { BopoiLogo } from '../brand/BopoiLogo.tsx';
import { useBopoi } from '../../context/BopoiContext.tsx';
import { ActiveAppView } from '../../types/index.ts';
import { Copy, ArrowLeft, Check, Plus, ChevronRight } from 'lucide-react';
import {
  CopiedClipboardIcon,
  ShareOnCampusIcon,
  ReceiveMessagesIcon,
  ShareCardsIcon,
  CreateRoomIcon,
  InboxShortcutIcon,
  HomeFeedNavIcon,
  CreateConfessionIcon,
  CreatePollIcon,
  CreateDiscussionIcon,
  CreatePostIcon,
  RoomBadgeIcon,
} from '../brand/icons/index.ts';
import { CampusCharacterAvatar } from '../brand/character/index.ts';
import { BopoiAnonymousAvatar } from '../brand/BopoiAnonymousAvatar.tsx';

const PROMPT_SUGGESTIONS = [
  "There's something you've been wanting to ask...",
  'Send me an anonymous confession or honest opinion 👀',
  'Tell me something you would never say to my face 💬',
];

export const OnboardingView: React.FC = () => {
  const {
    user,
    updateProfile,
    copyUserLink,
    rooms,
    toggleJoinRoom,
    completeOnboarding,
    showToast,
  } = useBopoi();

  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [copied, setCopied] = useState(false);
  const [promptText, setPromptText] = useState(
    user.customPrompt || PROMPT_SUGGESTIONS[0]
  );
  const [demoPostAnon, setDemoPostAnon] = useState(true);

  useEffect(() => {
    confetti({
      particleCount: 50,
      spread: 65,
      origin: { y: 0.55 },
      colors: ['#5420F5', '#FFC928', '#F52D85', '#3510B9'],
    });
  }, []);

  const displayUsername =
    user.username && user.username !== 'student' ? user.username : 'student';

  const handleCopy = async () => {
    await copyUserLink();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeShare = async () => {
    const linkUrl = `https://bopoi.com/@${displayUsername}/ask`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Ask ${user.displayName} anything anonymously on Bopoi!`,
          text: promptText,
          url: linkUrl,
        });
        showToast('Shared successfully!', 'success');
      } catch {
        handleCopy();
      }
    } else {
      handleCopy();
    }
  };

  const savePromptIfChanged = () => {
    const trimmed = promptText.trim();
    if (trimmed && trimmed !== user.customPrompt) {
      updateProfile({ customPrompt: trimmed });
    }
  };

  const handleFinish = (destination: ActiveAppView = 'home') => {
    savePromptIfChanged();
    completeOnboarding(destination);
  };

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] bg-[#FAF9FC] py-8 px-4 sm:px-6 flex items-center justify-center">
      <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 border border-[#EAE6F0] shadow-xl space-y-6">
        {/* Top Bar: Back / Brand Logo / Skip */}
        <div className="flex items-center justify-between">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => setStep((prev) => (prev - 1) as 0 | 1 | 2)}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-[#191525] cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          ) : (
            <BopoiLogo variant="icon" size={32} />
          )}

          {/* Subtle 3-pill step indicator */}
          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map((idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  if (step === 0) savePromptIfChanged();
                  setStep(idx as 0 | 1 | 2);
                }}
                aria-label={`Step ${idx + 1}`}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  step === idx
                    ? 'w-7 bg-[#5420F5]'
                    : idx < step
                    ? 'w-3 bg-[#5420F5]/40'
                    : 'w-3 bg-[#EAE6F0]'
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => handleFinish('home')}
            className="text-xs font-bold text-[#706B7D] hover:text-[#191525] cursor-pointer"
          >
            Skip
          </button>
        </div>

        {/* =============================================================== */}
        {/* STEP 1: YOUR LINK & INBOX REPLIES                               */}
        {/* =============================================================== */}
        {step === 0 && (
          <div className="space-y-5">
            <div className="text-center space-y-3">
              <div className="flex flex-col items-center">
                <div className="relative p-1 rounded-full bg-gradient-to-tr from-[#FFC928] via-[#F52D85] to-[#5420F5] shadow-lg">
                  <CampusCharacterAvatar
                    value={user.avatarUrl}
                    seed={displayUsername}
                    size={76}
                    rounded="full"
                    className="border-2 border-white"
                  />
                </div>
                <span className="text-sm font-bold text-[#5420F5] mt-2">
                  @{displayUsername}
                </span>
              </div>

              <div>
                <h1 className="text-2xl font-black text-[#191525] tracking-tight">
                  Your Bopoi link is ready!
                </h1>
                <p className="text-xs sm:text-sm text-[#706B7D] mt-1">
                  Put your link on WhatsApp Status, Instagram, or Snapchat to get anonymous messages.
                </p>
              </div>
            </div>

            {/* Copyable Link Box */}
            <div className="w-full bg-[#FAF9FC] border border-[#EAE6F0] rounded-2xl p-3 flex items-center justify-between gap-2 shadow-2xs">
              <span className="text-xs font-mono font-bold text-slate-700 truncate pl-2">
                bopoi.com/@{displayUsername}/ask
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-3 py-1.5 bg-white text-[#5420F5] rounded-xl hover:bg-[#F0EBFF] border border-[#EAE6F0] transition-colors cursor-pointer font-bold text-xs flex items-center gap-1.5 shadow-2xs"
                >
                  {copied ? <CopiedClipboardIcon size={15} /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="p-1.5 bg-[#5420F5] hover:bg-[#4314E2] text-white rounded-xl transition-colors cursor-pointer"
                  title="Share link"
                >
                  <ShareOnCampusIcon size={18} />
                </button>
              </div>
            </div>

            {/* Editable Q&A Prompt */}
            <div className="space-y-2 text-left">
              <label className="block text-xs font-bold text-[#191525]">
                Your question prompt
              </label>
              <input
                type="text"
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                maxLength={120}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] focus:border-[#5420F5] focus:bg-white text-xs sm:text-sm font-semibold text-[#191525] outline-none transition-colors"
              />
              <div className="flex flex-wrap gap-1.5">
                {PROMPT_SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setPromptText(s)}
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                      promptText === s
                        ? 'bg-[#F0EBFF] text-[#5420F5] border-[#5420F5]/30'
                        : 'bg-white text-[#706B7D] border-[#EAE6F0] hover:text-[#191525]'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* How Inbox Replies Work (Using native Bopoi custom icons) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left">
              <div className="p-3.5 rounded-2xl bg-[#FAF9FC] border border-[#EAE6F0] flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white border border-[#EAE6F0] flex items-center justify-center shrink-0 shadow-2xs">
                  <ReceiveMessagesIcon size={24} />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#191525]">1-on-1 Secret Convos</p>
                  <p className="text-[11px] text-[#706B7D] mt-0.5 leading-snug">
                    Reply privately in your Inbox to chat back-and-forth with the anonymous sender.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#FAF9FC] border border-[#EAE6F0] flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white border border-[#EAE6F0] flex items-center justify-center shrink-0 shadow-2xs">
                  <ShareCardsIcon size={24} />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#191525]">Story Card Studio</p>
                  <p className="text-[11px] text-[#706B7D] mt-0.5 leading-snug">
                    Turn any anonymous question into a custom status card for WhatsApp or IG.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                savePromptIfChanged();
                setStep(1);
              }}
              className="w-full py-3.5 px-4 bg-[#5420F5] hover:bg-[#4314E2] text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-[#5420F5]/20 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Next: Campus Chat Rooms</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* =============================================================== */}
        {/* STEP 2: CAMPUS CHAT ROOMS & ANONYMOUS MASKS                     */}
        {/* =============================================================== */}
        {step === 1 && (
          <div className="space-y-5">
            <div className="text-center space-y-1.5">
              <div className="w-12 h-12 rounded-2xl bg-[#F0EBFF] text-[#5420F5] flex items-center justify-center mx-auto mb-2">
                <CreateRoomIcon size={26} />
              </div>
              <h1 className="text-2xl font-black text-[#191525] tracking-tight">
                Live Campus Chat Rooms
              </h1>
              <p className="text-xs sm:text-sm text-[#706B7D]">
                Join rooms for your hostel, faculty, or late-night gist. Toggle Anon ON inside any room to chat behind a locked room mask.
              </p>
            </div>

            {/* Locked Room Mask Preview */}
            <div className="p-3.5 rounded-2xl bg-[#191525] text-white flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <BopoiAnonymousAvatar mask="owl" size={40} interactive={false} />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-white">Midnight Owl</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-[#FFC928]">
                      Room Mask
                    </span>
                  </div>
                  <p className="text-[11px] text-white/75 mt-0.5 leading-snug">
                    Each room gives you a different mask so people can @reply you without knowing your @username.
                  </p>
                </div>
              </div>
            </div>

            {/* Live Rooms List */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-0.5">
              {rooms.slice(0, 4).map((room) => (
                <div
                  key={room.id}
                  className={`p-3 rounded-2xl border flex items-center justify-between gap-3 transition-colors ${
                    room.isJoined
                      ? 'bg-[#F0EBFF]/40 border-[#5420F5]'
                      : 'bg-[#FAF9FC] border-[#EAE6F0]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <RoomBadgeIcon
                      iconEmoji={room.iconEmoji}
                      iconBg={room.iconBg}
                      category={room.category}
                      roomName={room.name}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-black text-[#191525] truncate">
                        {room.name}
                      </p>
                      <p className="text-[11px] text-[#706B7D] truncate">
                        {room.membersCount} students · {room.category}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleJoinRoom(room.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold shrink-0 cursor-pointer transition-all flex items-center gap-1 ${
                      room.isJoined
                        ? 'bg-[#5420F5] text-white'
                        : 'bg-white border border-[#EAE6F0] text-[#191525] hover:border-[#5420F5]'
                    }`}
                  >
                    {room.isJoined ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Joined</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5 text-[#5420F5]" />
                        <span>Join</span>
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setStep(2)}
              className="w-full py-3.5 px-4 bg-[#5420F5] hover:bg-[#4314E2] text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-[#5420F5]/20 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Next: Campus Feed &amp; Posting</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* =============================================================== */}
        {/* STEP 3: CAMPUS FEED & LAUNCH                                    */}
        {/* =============================================================== */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="text-center space-y-1.5">
              <h1 className="text-2xl font-black text-[#191525] tracking-tight">
                Post Publicly or Anonymously
              </h1>
              <p className="text-xs sm:text-sm text-[#706B7D]">
                Tap the purple <strong>+</strong> button on the bottom bar anytime to share confessions, polls, discussions, or campus updates.
              </p>
            </div>

            {/* Interactive Identity Toggle Preview */}
            <div className="p-4 rounded-2xl bg-[#FAF9FC] border border-[#EAE6F0] space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  {demoPostAnon ? (
                    <div className="w-10 h-10 rounded-2xl bg-[#191525] flex items-center justify-center">
                      <BopoiAnonymousAvatar size={26} interactive={false} />
                    </div>
                  ) : (
                    <CampusCharacterAvatar
                      value={user.avatarUrl}
                      seed={displayUsername}
                      size={40}
                      rounded="2xl"
                    />
                  )}
                  <div className="text-left">
                    <p className="text-xs font-black text-[#191525]">
                      {demoPostAnon ? 'Anonymous Student' : user.displayName || `@${displayUsername}`}
                    </p>
                    <p className="text-[11px] text-[#706B7D]">
                      {demoPostAnon ? 'Your username is hidden' : `Posting as @${displayUsername}`}
                    </p>
                  </div>
                </div>

                <div className="inline-flex p-1 rounded-xl bg-white border border-[#EAE6F0]">
                  <button
                    type="button"
                    onClick={() => setDemoPostAnon(true)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                      demoPostAnon
                        ? 'bg-[#191525] text-[#FFC928]'
                        : 'text-[#706B7D]'
                    }`}
                  >
                    Anon
                  </button>
                  <button
                    type="button"
                    onClick={() => setDemoPostAnon(false)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                      !demoPostAnon
                        ? 'bg-[#5420F5] text-white'
                        : 'text-[#706B7D]'
                    }`}
                  >
                    Public
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="p-2.5 rounded-xl bg-white border border-[#EAE6F0] flex items-center gap-2">
                  <CreateConfessionIcon size={18} />
                  <span className="text-xs font-bold text-[#191525]">Confessions</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-[#EAE6F0] flex items-center gap-2">
                  <CreatePollIcon size={18} />
                  <span className="text-xs font-bold text-[#191525]">Live Polls</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-[#EAE6F0] flex items-center gap-2">
                  <CreateDiscussionIcon size={18} />
                  <span className="text-xs font-bold text-[#191525]">Discussions</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-[#EAE6F0] flex items-center gap-2">
                  <CreatePostIcon size={18} />
                  <span className="text-xs font-bold text-[#191525]">Student Posts</span>
                </div>
              </div>
            </div>

            {/* Direct Launch Buttons */}
            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                onClick={() => handleFinish('home')}
                className="w-full py-4 px-4 bg-[#5420F5] hover:bg-[#4314E2] text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-[#5420F5]/20 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span className="w-6 h-6 rounded-full bg-white flex items-center justify-center shrink-0">
                  <HomeFeedNavIcon size={16} />
                </span>
                <span>Enter Campus Feed</span>
              </button>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleFinish('inbox')}
                  className="py-3 px-3 bg-[#FAF9FC] hover:bg-[#F0EBFF]/60 border border-[#EAE6F0] rounded-xl text-xs font-bold text-[#191525] flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <InboxShortcutIcon size={16} />
                  <span>Open My Inbox</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleFinish('rooms')}
                  className="py-3 px-3 bg-[#FAF9FC] hover:bg-[#F0EBFF]/60 border border-[#EAE6F0] rounded-xl text-xs font-bold text-[#191525] flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <CreateRoomIcon size={16} />
                  <span>Explore Rooms</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
