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
  'Send me an anonymous confession or honest opinion',
  'Tell me something you would never say to my face',
  'Drop a hot take about campus life right now',
];

export const OnboardingView: React.FC = () => {
  const {
    user,
    updateProfile,
    copyUserLink,
    rooms,
    toggleJoinRoom,
    completeOnboarding,
    defaultLoginView,
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
      particleCount: 45,
      spread: 60,
      origin: { y: 0.55 },
      colors: ['#5420F5', '#FFC928', '#F52D85', '#3510B9'],
    });
  }, []);

  const displayUsername =
    user.username && user.username !== 'student' ? user.username : 'student';

  const joinedCount = rooms.filter((r) => r.isJoined).length;

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
    <div className="w-full min-h-[calc(100vh-4rem)] bg-[#FAF9FC] dark:bg-[#09070D] py-8 px-4 sm:px-6 flex items-center justify-center">
      <div className="w-full max-w-lg bg-white dark:bg-[#0E0C14] rounded-3xl p-6 sm:p-8 border border-[#EAE6F0] dark:border-[#262036] shadow-xl space-y-6">
        {/* Top Bar: Back / Brand Logo / Step Progress / Skip */}
        <div className="flex items-center justify-between">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => setStep((prev) => (prev - 1) as 0 | 1 | 2)}
              className="min-h-[44px] flex items-center gap-1.5 text-xs font-bold text-[#706B7D] dark:text-[#9E97B3] hover:text-[#191525] dark:hover:text-white cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          ) : (
            <BopoiLogo variant="icon" size={32} />
          )}

          {/* Crisp 3-step bar */}
          <div className="flex items-center gap-1.5" role="tablist" aria-label="Onboarding steps">
            {[0, 1, 2].map((idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  if (step === 0) savePromptIfChanged();
                  setStep(idx as 0 | 1 | 2);
                }}
                aria-label={`Step ${idx + 1}`}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  step === idx
                    ? 'w-8 bg-[#5420F5] dark:bg-[#8E72FF]'
                    : idx < step
                    ? 'w-3.5 bg-[#5420F5]/45 dark:bg-[#8E72FF]/50'
                    : 'w-3.5 bg-[#EAE6F0] dark:bg-[#262036]'
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => handleFinish(defaultLoginView)}
            className="min-h-[44px] px-2 text-xs font-bold text-[#706B7D] dark:text-[#9E97B3] hover:text-[#191525] dark:hover:text-white cursor-pointer"
          >
            Skip
          </button>
        </div>

        {/* STEP 1: PERSONAL ASK LINK & PROMPT */}
        {step === 0 && (
          <div className="space-y-5 animate-in fade-in duration-150">
            <div className="text-center space-y-2.5">
              <div className="flex flex-col items-center">
                <CampusCharacterAvatar
                  value={user.avatarUrl}
                  seed={displayUsername}
                  size={76}
                  rounded="full"
                  className="ring-2 ring-[#5420F5]/30 dark:ring-[#8E72FF]/40"
                />
                <span className="text-sm font-black text-[#5420F5] dark:text-[#9B82FF] mt-2">
                  @{displayUsername}
                </span>
              </div>

              <div>
                <h1 className="text-2xl font-black text-[#191525] dark:text-[#F4F2FA] tracking-tight">
                  Your Bopoi link is ready
                </h1>
                <p className="text-xs sm:text-sm text-[#706B7D] dark:text-[#9E97B3] mt-1">
                  Drop your link on WhatsApp Status, Instagram Stories, or Snapchat to get anonymous questions.
                </p>
              </div>
            </div>

            {/* Copyable Link Box */}
            <div className="w-full bg-[#FAF9FC] dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] rounded-2xl p-2.5 pl-4 flex items-center justify-between gap-2">
              <span className="text-xs font-mono font-bold text-[#191525] dark:text-[#F4F2FA] truncate">
                bopoi.com/@{displayUsername}/ask
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="min-h-[38px] px-3 py-1.5 bg-white dark:bg-[#0E0C14] text-[#5420F5] dark:text-[#9B82FF] rounded-xl hover:bg-[#F0EBFF] dark:hover:bg-[#231A45] border border-[#EAE6F0] dark:border-[#262036] transition-colors cursor-pointer font-bold text-xs flex items-center gap-1.5"
                >
                  {copied ? <CopiedClipboardIcon size={15} /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="min-h-[38px] w-[38px] bg-[#5420F5] hover:bg-[#4314E2] text-white rounded-xl transition-colors cursor-pointer flex items-center justify-center"
                  title="Share link"
                  aria-label="Share link"
                >
                  <ShareOnCampusIcon size={18} />
                </button>
              </div>
            </div>

            {/* Editable Q&A Prompt */}
            <div className="space-y-2 text-left">
              <label className="block text-xs font-bold text-[#191525] dark:text-[#F4F2FA]">
                Customize your question prompt
              </label>
              <input
                type="text"
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                maxLength={120}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF9FC] dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] focus:border-[#5420F5] focus:bg-white dark:focus:bg-[#1C1729] text-xs sm:text-sm font-semibold text-[#191525] dark:text-[#F4F2FA] outline-none transition-colors"
              />
              <div className="flex flex-wrap gap-1.5">
                {PROMPT_SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setPromptText(s)}
                    className={`min-h-[34px] text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-colors cursor-pointer text-left ${
                      promptText === s
                        ? 'bg-[#F0EBFF] dark:bg-[#231A45] text-[#5420F5] dark:text-[#B49EFF] border-[#5420F5]/35'
                        : 'bg-white dark:bg-[#171322] text-[#706B7D] dark:text-[#9E97B3] border-[#EAE6F0] dark:border-[#262036] hover:text-[#191525] dark:hover:text-white'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Feature highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left">
              <div className="p-3.5 rounded-2xl bg-[#FAF9FC] dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white dark:bg-[#0E0C14] border border-[#EAE6F0] dark:border-[#262036] flex items-center justify-center shrink-0">
                  <ReceiveMessagesIcon size={24} />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#191525] dark:text-[#F4F2FA]">
                    1-on-1 Secret Convos
                  </p>
                  <p className="text-[11px] text-[#706B7D] dark:text-[#9E97B3] mt-0.5 leading-snug">
                    Reply privately inside your Inbox DM thread with GIFs and mentions.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#FAF9FC] dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white dark:bg-[#0E0C14] border border-[#EAE6F0] dark:border-[#262036] flex items-center justify-center shrink-0">
                  <ShareCardsIcon size={24} />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#191525] dark:text-[#F4F2FA]">
                    Story Card Studio
                  </p>
                  <p className="text-[11px] text-[#706B7D] dark:text-[#9E97B3] mt-0.5 leading-snug">
                    Export any question into a crisp Story card for WhatsApp or IG.
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
              className="w-full min-h-[48px] py-3.5 px-4 bg-[#5420F5] hover:bg-[#4314E2] text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-[#5420F5]/20 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Next: Join Live Campus Rooms</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* STEP 2: CAMPUS CHAT ROOMS */}
        {step === 1 && (
          <div className="space-y-5 animate-in fade-in duration-150">
            <div className="text-center space-y-1.5">
              <div className="w-12 h-12 rounded-2xl bg-[#F0EBFF] dark:bg-[#231A45] text-[#5420F5] dark:text-[#9B82FF] flex items-center justify-center mx-auto mb-2">
                <CreateRoomIcon size={26} />
              </div>
              <h1 className="text-2xl font-black text-[#191525] dark:text-[#F4F2FA] tracking-tight">
                Live Campus Chat Rooms
              </h1>
              <p className="text-xs sm:text-sm text-[#706B7D] dark:text-[#9E97B3]">
                Pick rooms for your hostel, faculty, or late-night gist. Joined rooms appear in your Home Stories strip.
              </p>
            </div>

            {/* Locked Room Mask Preview */}
            <div className="p-3.5 rounded-2xl bg-[#191525] dark:bg-[#171322] border border-[#262036] text-white flex items-center gap-3">
              <BopoiAnonymousAvatar mask="owl" size={40} interactive={false} />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-white">Midnight Owl</span>
                  <span className="text-[11px] font-semibold text-[#FFC928]">· Room Mask</span>
                </div>
                <p className="text-[11px] text-white/75 mt-0.5 leading-snug">
                  Each room assigns you a persistent mask so classmates can @reply without seeing your @username.
                </p>
              </div>
            </div>

            {/* Live Rooms List */}
            <div className="divide-y divide-[#EAE6F0] dark:divide-[#262036] border border-[#EAE6F0] dark:border-[#262036] rounded-2xl max-h-64 overflow-y-auto bg-[#FAF9FC] dark:bg-[#171322]">
              {rooms.slice(0, 5).map((room) => (
                <div
                  key={room.id}
                  className="p-3 flex items-center justify-between gap-3 transition-colors"
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
                      <p className="text-xs font-black text-[#191525] dark:text-[#F4F2FA] truncate">
                        #{room.name}
                      </p>
                      <p className="text-[11px] text-[#706B7D] dark:text-[#9E97B3] truncate tabular-nums">
                        {room.membersCount} students · {room.category}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleJoinRoom(room.id)}
                    className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-extrabold shrink-0 cursor-pointer transition-all flex items-center gap-1 ${
                      room.isJoined
                        ? 'bg-[#5420F5] text-white'
                        : 'bg-white dark:bg-[#0E0C14] border border-[#EAE6F0] dark:border-[#262036] text-[#191525] dark:text-[#F4F2FA] hover:border-[#5420F5]'
                    }`}
                  >
                    {room.isJoined ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Joined</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5 text-[#5420F5] dark:text-[#9B82FF]" />
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
              className="w-full min-h-[48px] py-3.5 px-4 bg-[#5420F5] hover:bg-[#4314E2] text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-[#5420F5]/20 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>
                {joinedCount > 0
                  ? `Next (${joinedCount} joined)`
                  : 'Next: Posting & Feed'}
              </span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* STEP 3: CAMPUS FEED & LAUNCH */}
        {step === 2 && (
          <div className="space-y-5 animate-in fade-in duration-150">
            <div className="text-center space-y-1.5">
              <h1 className="text-2xl font-black text-[#191525] dark:text-[#F4F2FA] tracking-tight">
                Post Publicly or Anonymously
              </h1>
              <p className="text-xs sm:text-sm text-[#706B7D] dark:text-[#9E97B3]">
                Switch between your campus profile and Anonymous Mode whenever you create a post, poll, confession, or discussion.
              </p>
            </div>

            {/* Interactive Identity Toggle Preview */}
            <div className="p-4 rounded-2xl bg-[#FAF9FC] dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  {demoPostAnon ? (
                    <div className="w-10 h-10 rounded-2xl bg-[#191525] flex items-center justify-center shrink-0">
                      <BopoiAnonymousAvatar size={26} interactive={false} />
                    </div>
                  ) : (
                    <CampusCharacterAvatar
                      value={user.avatarUrl}
                      seed={displayUsername}
                      size={40}
                      rounded="2xl"
                      className="shrink-0"
                    />
                  )}
                  <div className="text-left min-w-0">
                    <p className="text-xs font-black text-[#191525] dark:text-[#F4F2FA] truncate">
                      {demoPostAnon ? 'Anonymous Student' : user.displayName || `@${displayUsername}`}
                    </p>
                    <p className="text-[11px] text-[#706B7D] dark:text-[#9E97B3] truncate">
                      {demoPostAnon ? 'Your username is hidden' : `Posting as @${displayUsername}`}
                    </p>
                  </div>
                </div>

                <div className="inline-flex p-1 rounded-xl bg-white dark:bg-[#0E0C14] border border-[#EAE6F0] dark:border-[#262036] shrink-0">
                  <button
                    type="button"
                    onClick={() => setDemoPostAnon(true)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                      demoPostAnon
                        ? 'bg-[#191525] dark:bg-[#5420F5] text-[#FFC928] dark:text-white'
                        : 'text-[#706B7D] dark:text-[#9E97B3]'
                    }`}
                  >
                    Anon
                  </button>
                  <button
                    type="button"
                    onClick={() => setDemoPostAnon(false)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                      !demoPostAnon
                        ? 'bg-[#5420F5] text-white'
                        : 'text-[#706B7D] dark:text-[#9E97B3]'
                    }`}
                  >
                    Public
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="p-2.5 rounded-xl bg-white dark:bg-[#0E0C14] border border-[#EAE6F0] dark:border-[#262036] flex items-center gap-2">
                  <CreateConfessionIcon size={18} />
                  <span className="text-xs font-bold text-[#191525] dark:text-[#F4F2FA]">
                    Confessions
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-white dark:bg-[#0E0C14] border border-[#EAE6F0] dark:border-[#262036] flex items-center gap-2">
                  <CreatePollIcon size={18} />
                  <span className="text-xs font-bold text-[#191525] dark:text-[#F4F2FA]">
                    Live Polls
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-white dark:bg-[#0E0C14] border border-[#EAE6F0] dark:border-[#262036] flex items-center gap-2">
                  <CreateDiscussionIcon size={18} />
                  <span className="text-xs font-bold text-[#191525] dark:text-[#F4F2FA]">
                    Discussions
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-white dark:bg-[#0E0C14] border border-[#EAE6F0] dark:border-[#262036] flex items-center gap-2">
                  <CreatePostIcon size={18} />
                  <span className="text-xs font-bold text-[#191525] dark:text-[#F4F2FA]">
                    Student Posts
                  </span>
                </div>
              </div>
            </div>

            {/* Direct Launch Buttons */}
            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                onClick={() => handleFinish(defaultLoginView)}
                className="w-full min-h-[48px] py-3.5 px-4 bg-[#5420F5] hover:bg-[#4314E2] text-white font-extrabold text-sm rounded-2xl active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Enter Campus</span>
              </button>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleFinish('inbox')}
                  className="min-h-[44px] py-3 px-3 bg-[#FAF9FC] dark:bg-[#171322] hover:bg-[#F0EBFF] dark:hover:bg-[#231A45] border border-[#EAE6F0] dark:border-[#262036] rounded-xl text-xs font-bold text-[#191525] dark:text-[#F4F2FA] flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <InboxShortcutIcon size={16} />
                  <span>Open Inbox</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleFinish('rooms')}
                  className="min-h-[44px] py-3 px-3 bg-[#FAF9FC] dark:bg-[#171322] hover:bg-[#F0EBFF] dark:hover:bg-[#231A45] border border-[#EAE6F0] dark:border-[#262036] rounded-xl text-xs font-bold text-[#191525] dark:text-[#F4F2FA] flex items-center justify-center gap-2 cursor-pointer transition-colors"
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
