import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { BopoiLogo } from '../brand/BopoiLogo.tsx';
import { useBopoi } from '../../context/BopoiContext.tsx';
import { Copy, ChevronRight, Share2, Eye, Inbox } from 'lucide-react';
import {
  ShareCardsIcon,
  CopiedClipboardIcon,
} from '../brand/icons/index.ts';
import { CampusCharacterAvatar } from '../brand/character/index.ts';
import { VerifiedCreatorBadge } from '../ui/VerifiedCreatorBadge.tsx';

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
          text: 'Send me an anonymous message on Bopoi!',
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
      <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 border border-[#EAE6F0] shadow-xs space-y-6 text-center">
        {/* Top Logo */}
        <div className="flex justify-center">
          <BopoiLogo variant="icon" size="lg" />
        </div>

        <div>
          <h1 className="text-2xl font-black text-[#191525] tracking-tight">
            Your Bopoi link is ready
          </h1>
          <p className="text-xs sm:text-sm text-[#706B7D] mt-1">
            Share this link anywhere to begin receiving anonymous questions.
          </p>
        </div>

        {/* User Avatar */}
        <div className="flex flex-col items-center">
          <CampusCharacterAvatar
            value={user.avatarUrl}
            seed={user.username}
            size={80}
            rounded="full"
            className="ring-2 ring-[#EAE6F0]"
          />
          <span className="text-base font-bold text-[#191525] mt-2 inline-flex items-center gap-1">
            <span>@{user.username}</span>
            <VerifiedCreatorBadge
              isVerified={user.isVerified}
              username={user.username}
              size={16}
            />
          </span>
        </div>

        {/* Copyable Link Box */}
        <div className="w-full bg-[#FAF9FC] border border-[#EAE6F0] rounded-2xl p-3 flex items-center justify-between gap-2">
          <span className="text-xs font-mono font-bold text-[#191525] truncate pl-2">
            bopoi.com/@{user.username}/ask
          </span>
          <button
            type="button"
            onClick={handleCopy}
            className="px-3.5 py-1.5 bg-white text-[#5420F5] rounded-xl hover:bg-[#F0EBFF] border border-[#EAE6F0] transition-colors shrink-0 cursor-pointer font-bold text-xs flex items-center gap-1.5"
            aria-label="Copy link"
          >
            {copied ? <CopiedClipboardIcon size={15} /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        {/* Dual Actions: Share Link & Preview Page */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={handleNativeShare}
            className="flex-1 py-3 px-4 bg-[#5420F5] hover:bg-[#4314E2] text-white font-extrabold text-xs rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
          >
            <Share2 className="w-4 h-4 shrink-0" />
            <span>Share to Socials</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView('public-ask')}
            className="flex-1 py-3 px-4 bg-white border border-[#EAE6F0] text-[#191525] font-bold text-xs rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
          >
            <Eye className="w-4 h-4 text-[#5420F5] shrink-0" />
            <span>Preview Page</span>
          </button>
        </div>

        {/* Customize Card */}
        <button
          type="button"
          onClick={() => setActiveView('profile')}
          className="w-full bg-[#FAF9FC] border border-[#EAE6F0] rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:border-[#D4CEE0] transition-colors text-left"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-white border border-[#EAE6F0] flex items-center justify-center p-1.5 shrink-0">
              <ShareCardsIcon size={22} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#191525]">Customize your link</p>
              <p className="text-[11px] text-[#706B7D]">
                Add a bio, change avatar, set hidden-word filters.
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#706B7D] shrink-0" />
        </button>

        {/* Bottom Continue Button */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setActiveView('inbox')}
            className="w-full py-3.5 px-4 bg-[#191525] hover:bg-[#2A253B] text-white font-extrabold text-sm rounded-2xl active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Inbox className="w-4 h-4 shrink-0" />
            <span>Enter My Inbox</span>
          </button>
        </div>
      </div>
    </div>
  );
};
