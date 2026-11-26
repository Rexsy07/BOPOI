import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { BopoiLogo } from '../brand/BopoiLogo.tsx';
import { useBopoi } from '../../context/BopoiContext.tsx';
import { Copy, ChevronRight, Share2, Eye, Inbox, MessageCircle } from 'lucide-react';
import { ShareCardsIcon, CopiedClipboardIcon } from '../brand/icons/index.ts';
import { CampusCharacterAvatar } from '../brand/character/index.ts';
import { VerifiedCreatorBadge } from '../ui/VerifiedCreatorBadge.tsx';

export const LinkReadyView: React.FC = () => {
  const { user, setActiveView, copyUserLink, showToast } = useBopoi();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    confetti({
      particleCount: 50,
      spread: 65,
      origin: { y: 0.5 },
      colors: ['#5420F5', '#FFC928', '#F52D85', '#3510B9'],
    });
  }, []);

  const linkUrl = `https://bopoi.com/@${user.username}/ask`;

  const handleCopy = async () => {
    await copyUserLink();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Ask ${user.displayName} anything anonymously on Bopoi!`,
          text: user.customPrompt || 'Send me an anonymous message on Bopoi!',
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

  const handleWhatsAppShare = () => {
    const msg = encodeURIComponent(
      `${user.customPrompt || 'Ask me anything anonymously on Bopoi!'}\n${linkUrl}`
    );
    window.open(`https://wa.me/?text=${msg}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] bg-[#FAF9FC] dark:bg-[#09070D] py-10 px-4 sm:px-6 flex items-center justify-center">
      <div className="w-full max-w-md bg-white dark:bg-[#0E0C14] rounded-3xl p-6 sm:p-8 border border-[#EAE6F0] dark:border-[#262036] shadow-xl space-y-6 text-center">
        {/* Top Logo */}
        <div className="flex justify-center">
          <BopoiLogo variant="icon" size="lg" />
        </div>

        <div>
          <h1 className="text-2xl font-black text-[#191525] dark:text-[#F4F2FA] tracking-tight">
            Your Ask Pass is ready
          </h1>
          <p className="text-xs sm:text-sm text-[#706B7D] dark:text-[#9E97B3] mt-1">
            Share your link on WhatsApp Status or Instagram Stories to start receiving anonymous messages.
          </p>
        </div>

        {/* Shareable NGL/IG-Style Ask Pass Preview */}
        <div className="rounded-3xl bg-gradient-to-br from-[#3510B9] via-[#5420F5] to-[#F52D85] p-5 text-white shadow-lg space-y-3">
          <div className="flex items-center justify-center flex-col">
            <CampusCharacterAvatar
              value={user.avatarUrl}
              seed={user.username}
              size={72}
              rounded="full"
              className="ring-3 ring-white/40 shadow-md"
            />
            <span className="text-sm font-black text-white mt-2 inline-flex items-center gap-1">
              <span>@{user.username}</span>
              <VerifiedCreatorBadge
                isVerified={user.isVerified}
                username={user.username}
                size={15}
              />
            </span>
          </div>
          <p className="font-handwriting text-xl font-bold text-white leading-snug">
            “{user.customPrompt || "There's something you've been wanting to ask..."}”
          </p>
        </div>

        {/* Copyable Link Box */}
        <div className="w-full bg-[#FAF9FC] dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] rounded-2xl p-2.5 pl-4 flex items-center justify-between gap-2">
          <span className="text-xs font-mono font-bold text-[#191525] dark:text-[#F4F2FA] truncate">
            bopoi.com/@{user.username}/ask
          </span>
          <button
            type="button"
            onClick={handleCopy}
            className="min-h-[38px] px-3.5 py-1.5 bg-white dark:bg-[#0E0C14] text-[#5420F5] dark:text-[#9B82FF] rounded-xl hover:bg-[#F0EBFF] dark:hover:bg-[#231A45] border border-[#EAE6F0] dark:border-[#262036] transition-colors shrink-0 cursor-pointer font-bold text-xs flex items-center gap-1.5"
            aria-label="Copy link"
          >
            {copied ? <CopiedClipboardIcon size={15} /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        {/* Social Share Actions */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={handleWhatsAppShare}
            className="min-h-[44px] py-3 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <MessageCircle className="w-4 h-4 shrink-0" />
            <span>WhatsApp Status</span>
          </button>

          <button
            type="button"
            onClick={handleNativeShare}
            className="min-h-[44px] py-3 px-3 bg-[#5420F5] hover:bg-[#4314E2] text-white font-extrabold text-xs rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Share2 className="w-4 h-4 shrink-0" />
            <span>Share / IG</span>
          </button>
        </div>

        {/* Preview & Customize Row */}
        <div className="grid grid-cols-1 gap-2">
          <button
            type="button"
            onClick={() => setActiveView('public-ask')}
            className="w-full min-h-[44px] py-3 px-4 bg-[#FAF9FC] dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] text-[#191525] dark:text-[#F4F2FA] font-bold text-xs rounded-2xl hover:border-[#5420F5]/40 transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Eye className="w-4 h-4 text-[#5420F5] dark:text-[#9B82FF] shrink-0" />
            <span>Preview Public Ask Page</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView('profile')}
            className="w-full bg-[#FAF9FC] dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] rounded-2xl p-3.5 flex items-center justify-between cursor-pointer hover:border-[#5420F5]/40 transition-colors text-left"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-white dark:bg-[#0E0C14] border border-[#EAE6F0] dark:border-[#262036] flex items-center justify-center p-1.5 shrink-0">
                <ShareCardsIcon size={22} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#191525] dark:text-[#F4F2FA]">
                  Customize your link &amp; shield
                </p>
                <p className="text-[11px] text-[#706B7D] dark:text-[#9E97B3] truncate">
                  Edit bio, 3D avatar, or add hidden-word filters.
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#706B7D] dark:text-[#9E97B3] shrink-0" />
          </button>
        </div>

        {/* Bottom Continue Button */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <button
            type="button"
            onClick={() => setActiveView('inbox')}
            className="min-h-[48px] py-3.5 px-3 bg-[#191525] dark:bg-[#F4F2FA] hover:bg-[#2A253B] dark:hover:bg-white text-white dark:text-[#191525] font-extrabold text-xs sm:text-sm rounded-2xl active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Inbox className="w-4 h-4 shrink-0" />
            <span>Enter Inbox</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveView('home')}
            className="min-h-[48px] py-3.5 px-3 bg-[#FAF9FC] dark:bg-[#171322] hover:bg-[#F0EBFF] dark:hover:bg-[#231A45] border border-[#EAE6F0] dark:border-[#262036] text-[#191525] dark:text-[#F4F2FA] font-extrabold text-xs sm:text-sm rounded-2xl active:scale-[0.98] transition-all cursor-pointer"
          >
            Campus Feed
          </button>
        </div>
      </div>
    </div>
  );
};
