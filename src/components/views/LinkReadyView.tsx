import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { BopoiLogo } from '../brand/BopoiLogo.tsx';
import { useBopoi } from '../../context/BopoiContext.tsx';
import { Copy, ChevronRight } from 'lucide-react';
import {
  ShareCardsIcon,
  CopiedClipboardIcon,
  ShareOnCampusIcon,
  PublicAskNavIcon,
  InboxShortcutIcon,
} from '../brand/icons/index.ts';
import { CampusCharacterAvatar } from '../brand/character/index.ts';

export const LinkReadyView: React.FC = () => {
  const { user, setActiveView, copyUserLink, showToast } = useBopoi();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    confetti({
      particleCount: 55,
      spread: 70,
      origin: { y: 0.5 },
      colors: ['#5420F5', '#FFC928', '#F52D85', '#3510B9'],
    });
  }, []);

  const handleCopy = async () => {
    await copyUserLink();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeShare = async () => {
    const linkUrl = `https://bopoi.com/@${user.username}/ask`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Ask ${user.displayName} anything anonymously on Bopoi!`,
          text: `Send me an anonymous message on Bopoi! 💜`,
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

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] bg-[#FAF9FC] py-12 px-4 sm:px-6 flex items-center justify-center">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 border border-[#EAE6F0] shadow-xl space-y-6 text-center">
        {/* Top Logo */}
        <div className="flex justify-center">
          <BopoiLogo variant="icon" size="lg" />
        </div>

        <div>
          <h1 className="text-2xl font-black text-[#191525] tracking-tight">
            Your Bopoi link is ready!
          </h1>
          <p className="text-xs sm:text-sm text-[#706B7D] mt-1">
            Share this link anywhere to begin receiving anonymous questions.
          </p>
        </div>

        {/* User Avatar with glowing halo */}
        <div className="flex flex-col items-center">
          <div className="relative p-1 rounded-full bg-gradient-to-tr from-[#FFC928] via-[#F52D85] to-[#5420F5] shadow-lg">
            <CampusCharacterAvatar
              value={user.avatarUrl}
              seed={user.username}
              size={80}
              rounded="full"
              className="border-2 border-white"
            />
          </div>
          <span className="text-base font-bold text-[#191525] mt-2">
            @{user.username}
          </span>
        </div>

        {/* Copyable Link Pill Box */}
        <div className="w-full bg-[#FAF9FC] border border-[#EAE6F0] rounded-2xl p-3 flex items-center justify-between gap-2 shadow-2xs">
          <span className="text-xs font-mono font-bold text-slate-700 truncate pl-2">
            bopoi.com/@{user.username}/ask
          </span>
          <button
            onClick={handleCopy}
            className="px-3.5 py-1.5 bg-white text-[#5420F5] rounded-xl hover:bg-[#F0EBFF] border border-[#EAE6F0] transition-colors shrink-0 cursor-pointer font-bold text-xs flex items-center gap-1.5 shadow-2xs"
            aria-label="Copy link"
          >
            {copied ? <CopiedClipboardIcon size={15} /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        {/* Dual Actions: Share Link & Preview Page */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleNativeShare}
            className="flex-1 py-3.5 px-4 bg-[#5420F5] hover:bg-[#4314E2] text-white font-extrabold text-xs rounded-xl shadow-md shadow-[#5420F5]/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span className="w-5 h-5 rounded-full bg-white flex items-center justify-center shrink-0">
              <ShareOnCampusIcon size={14} />
            </span>
            <span>Share to Socials</span>
          </button>

          <button
            onClick={() => setActiveView('public-ask')}
            className="flex-1 py-3 px-4 bg-white border border-[#EAE6F0] text-[#191525] font-bold text-xs rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
          >
            <PublicAskNavIcon size={18} />
            <span>Preview Page</span>
          </button>
        </div>

        {/* Customize Card */}
        <div
          onClick={() => setActiveView('profile')}
          className="w-full bg-gradient-to-r from-[#FAF9FC] to-[#F7F4FF] border border-[#EAE6F0] rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:border-[#5420F5]/30 transition-all text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white border border-[#EAE6F0] shadow-2xs flex items-center justify-center p-1.5 shrink-0">
              <ShareCardsIcon size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-[#191525]">Customize your link</p>
              <p className="text-[11px] text-[#706B7D]">Add a bio, change avatar, set hidden-word filters.</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
        </div>

        {/* Bottom Continue Button */}
        <div className="pt-2">
          <button
            onClick={() => setActiveView('inbox')}
            className="w-full py-4 px-4 bg-[#5420F5] hover:bg-[#4314E2] text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-[#5420F5]/20 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <span className="w-6 h-6 rounded-full bg-white flex items-center justify-center shrink-0">
              <InboxShortcutIcon size={16} />
            </span>
            <span>Enter My Inbox</span>
          </button>
        </div>
      </div>
    </div>
  );
};
