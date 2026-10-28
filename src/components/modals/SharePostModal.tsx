import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Share2,
  ExternalLink,
  MessageCircle,
  Sparkles,
  Link2,
} from 'lucide-react';
import { useBopoi } from '../../context/BopoiContext.tsx';
import { BopoiAnonymousAvatar } from '../brand/BopoiAnonymousAvatar.tsx';
import { CampusCharacterAvatar } from '../brand/character/index.ts';
import {
  WhatsAppChannelIcon,
  XTwitterIcon,
  TelegramChannelIcon,
  ShareOnCampusIcon,
  CopiedClipboardIcon,
} from '../brand/icons/index.ts';

export const SharePostModal: React.FC = () => {
  const {
    sharingPost,
    setSharingPost,
    incrementPostShare,
    showToast,
    setSelectedPost,
    setActiveView,
  } = useBopoi();

  const [copied, setCopied] = useState(false);

  if (!sharingPost) return null;

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://bopoi.com';
  const shareUrl = `${baseUrl}/?post=${sharingPost.id}#post-${sharingPost.id}`;

  const postTypeLabel =
    sharingPost.type === 'confession'
      ? 'Campus Confession'
      : sharingPost.type === 'poll'
      ? 'Live Campus Poll'
      : sharingPost.type === 'discussion'
      ? 'Student Discussion'
      : 'Campus Post';

  const shareHeadline = sharingPost.title
    ? `${sharingPost.title} — ${sharingPost.content.slice(0, 90)}${sharingPost.content.length > 90 ? '...' : ''}`
    : `${sharingPost.content.slice(0, 110)}${sharingPost.content.length > 110 ? '...' : ''}`;

  const shareText = `🔥 Check out this ${postTypeLabel} on Bopoi:\n"${shareHeadline}"\n\nRead & reply here:`;

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
      }
      setCopied(true);
      incrementPostShare(sharingPost.id);
      showToast('Direct post link copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      showToast(`Link: ${shareUrl}`, 'info');
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Bopoi • ${postTypeLabel}`,
          text: shareHeadline,
          url: shareUrl,
        });
        incrementPostShare(sharingPost.id);
        showToast('Shared successfully!', 'success');
      } catch {
        // User cancelled native share sheet
      }
    } else {
      handleCopyLink();
    }
  };

  const handleOpenPostDirectly = () => {
    const target = sharingPost;
    setSharingPost(null);
    setSelectedPost(target);
    if (target.type === 'poll') {
      setActiveView('poll-detail');
    } else {
      setActiveView('post-detail');
    }
  };

  const encodedTextAndUrl = encodeURIComponent(`${shareText} ${shareUrl}`);
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(shareText);

  const socialPlatforms = [
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      bg: 'bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#128C7E] border-[#25D366]/30',
      icon: <WhatsAppChannelIcon size={28} />,
      href: `https://wa.me/?text=${encodedTextAndUrl}`,
    },
    {
      id: 'x',
      name: 'X (Twitter)',
      bg: 'bg-slate-900/5 hover:bg-slate-900/15 text-slate-900 border-slate-300',
      icon: <XTwitterIcon size={28} />,
      href: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
    },
    {
      id: 'telegram',
      name: 'Telegram',
      bg: 'bg-[#0088cc]/10 hover:bg-[#0088cc]/20 text-[#0088cc] border-[#0088cc]/30',
      icon: <TelegramChannelIcon size={28} />,
      href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
      onClick={() => setSharingPost(null)}
    >
      <div
        className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl border border-[#EAE6F0] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Modal Header */}
        <div className="px-5 py-4 border-b border-[#EAE6F0] flex items-center justify-between bg-[#FAF9FC]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white border border-[#EAE6F0] shadow-2xs flex items-center justify-center p-1">
              <ShareOnCampusIcon size={24} />
            </div>
            <div>
              <h3 className="text-sm font-black text-[#191525]">Share {postTypeLabel}</h3>
              <p className="text-[11px] text-[#706B7D]">
                Anyone with this link opens this exact post
              </p>
            </div>
          </div>

          <button
            onClick={() => setSharingPost(null)}
            className="p-1.5 rounded-full hover:bg-slate-200/70 text-slate-500 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Post Preview Card with 3D Campus Character or Anonymous Avatar */}
          <div className="bg-gradient-to-br from-[#FAF9FC] to-[#F0EBFF]/40 rounded-2xl p-4 border border-[#EAE6F0] space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                {sharingPost.isAnonymous ? (
                  <BopoiAnonymousAvatar size="sm" idPrefix={sharingPost.id} />
                ) : (
                  <CampusCharacterAvatar
                    value={sharingPost.authorAvatar}
                    seed={sharingPost.authorUsername}
                    size={32}
                    rounded="full"
                  />
                )}
                <div className="min-w-0">
                  <span className="text-xs font-extrabold text-[#191525] block truncate">
                    {sharingPost.isAnonymous ? 'Anonymous Student' : sharingPost.authorName}
                  </span>
                  <span className="text-[10px] text-[#706B7D] block truncate">
                    {sharingPost.authorCampus || 'Campus Feed'} • {sharingPost.createdAt}
                  </span>
                </div>
              </div>

              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#F0EBFF] text-[#5420F5] shrink-0">
                {sharingPost.category || sharingPost.type}
              </span>
            </div>

            {sharingPost.title && (
              <h4 className="text-xs sm:text-sm font-black text-[#191525] line-clamp-1">
                {sharingPost.title}
              </h4>
            )}

            <p className="text-xs text-slate-700 line-clamp-2 leading-relaxed">
              {sharingPost.content}
            </p>

            <div className="pt-1 flex items-center justify-between text-[11px] text-[#706B7D]">
              <span className="flex items-center gap-1 font-semibold">
                <MessageCircle className="w-3 h-3 text-[#5420F5]" />
                {sharingPost.commentsCount} comments • {sharingPost.likes} likes
              </span>
              <button
                onClick={handleOpenPostDirectly}
                className="text-[#5420F5] font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Open thread</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Direct Shareable Link Box */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-extrabold uppercase tracking-wider text-[#706B7D] flex items-center gap-1">
              <Link2 className="w-3.5 h-3.5 text-[#5420F5]" />
              <span>Direct Post Link</span>
            </label>
            <div className="flex items-center gap-2 bg-[#FAF9FC] border border-[#EAE6F0] rounded-2xl p-1.5 pl-3.5">
              <input
                type="text"
                readOnly
                value={shareUrl}
                onClick={(e) => (e.target as HTMLInputElement).select()}
                className="w-full bg-transparent text-xs font-mono text-slate-700 focus:outline-none truncate"
              />
              <button
                onClick={handleCopyLink}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-2xs ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-[#5420F5] hover:bg-[#4314E2] text-white'
                }`}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Link'}</span>
              </button>
            </div>
          </div>

          {/* Quick Share Platforms (iframe-safe anchor links) */}
          <div className="space-y-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#706B7D] block">
              Share directly to
            </span>
            <div className="grid grid-cols-3 gap-2.5">
              {socialPlatforms.map((plat) => (
                <a
                  key={plat.id}
                  href={plat.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    incrementPostShare(sharingPost.id);
                    showToast(`Sharing to ${plat.name}...`, 'success');
                  }}
                  className={`py-2.5 px-3 rounded-2xl border text-xs font-extrabold flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${plat.bg}`}
                >
                  <span className="w-8 h-8 rounded-xl bg-white shadow-2xs flex items-center justify-center p-1">
                    {plat.icon}
                  </span>
                  <span>{plat.name}</span>
                </a>
              ))}
            </div>
          </div>

          {/* Native Share Sheet / Copy Caption Button */}
          <button
            onClick={handleNativeShare}
            className="w-full py-3 rounded-2xl bg-[#191525] hover:bg-slate-800 text-white text-xs font-black flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md"
          >
            <Sparkles className="w-4 h-4 text-[#FFC928]" />
            <span>More Share Options / Copy Caption</span>
          </button>
        </div>
      </div>
    </div>
  );
};
