import React from 'react';
import { BopoiLogo } from '../brand/BopoiLogo.tsx';
import { useBopoi } from '../../context/BopoiContext.tsx';
import {
  StudentPostsIcon,
  ReceiveMessagesIcon,
  LaunchTrendingIcon,
  CreatePollIcon,
  CreateRoomIcon,
  SafetyShieldBadgeIcon,
} from '../brand/icons/index.ts';
import { PersonaMaskIcon } from '../brand/masks/PersonaMaskIcon.tsx';

export const SiteFooter: React.FC = () => {
  const { setActiveView, openLegalDoc } = useBopoi();

  return (
    <footer className="w-full bg-[#130E26] text-white border-t border-white/10 select-none pt-12 pb-8 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto space-y-10">
        {/* Brand Vibe Header */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-white/10 text-center md:text-left">
          <div className="flex items-center gap-3">
            <BopoiLogo variant="icon" size="md" />
            <div>
              <span className="text-2xl font-black tracking-tight text-white">
                Bopo<span className="relative inline-block">ı<span className="absolute -top-1 right-0 w-2 h-2 bg-[#FFC928] rounded-full" /></span>
              </span>
              <p className="text-xs text-white/70 font-medium">Your Campus, All in One Place</p>
            </div>
          </div>

          <div className="flex flex-col items-center md:items-end">
            <span className="text-xs text-white/60 font-medium">More than just a message...</span>
            <span className="text-xl font-handwriting text-[#FFC928] tracking-wide">
              It's a whole vibe.
            </span>
          </div>
        </div>

        {/* Social Discovery Strip matching screenshot bottom */}
        <div className="flex flex-wrap items-center justify-center gap-6 py-2 text-xs font-bold text-white/75">
          <button
            onClick={() => setActiveView('home')}
            className="hover:text-[#FFC928] transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <StudentPostsIcon size={16} />
            <span>Public Feed</span>
          </button>
          <button
            onClick={() => setActiveView('confessions')}
            className="hover:text-[#FFC928] transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <PersonaMaskIcon mask="secret-confession" size={16} />
            <span>Confessions</span>
          </button>
          <button
            onClick={() => setActiveView('polls')}
            className="hover:text-[#FFC928] transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <CreatePollIcon size={16} />
            <span>Polls</span>
          </button>
          <button
            onClick={() => setActiveView('discussions')}
            className="hover:text-[#FFC928] transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <ReceiveMessagesIcon size={16} />
            <span>Discussions</span>
          </button>
          <button
            onClick={() => setActiveView('rooms')}
            className="hover:text-[#FFC928] transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <CreateRoomIcon size={16} />
            <span>Rooms</span>
          </button>
          <button
            onClick={() => setActiveView('discover')}
            className="hover:text-[#FFC928] transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <LaunchTrendingIcon size={16} />
            <span>Discover</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-white/10 text-xs text-white/60">
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => openLegalDoc('terms')}
              className="hover:text-[#FFC928] transition-colors cursor-pointer font-semibold"
            >
              Terms of Service
            </button>
            <button
              onClick={() => openLegalDoc('privacy')}
              className="hover:text-[#FFC928] transition-colors cursor-pointer font-semibold"
            >
              Privacy Policy
            </button>
            <button
              onClick={() => openLegalDoc('guidelines')}
              className="hover:text-[#FFC928] transition-colors cursor-pointer font-semibold"
            >
              Community Guidelines
            </button>
            <span className="hidden sm:inline text-white/20">|</span>
            <button
              onClick={() => setActiveView('onboarding')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              How It Works
            </button>
            <span className="inline-flex items-center gap-1 text-[11px] text-white/50">
              <SafetyShieldBadgeIcon size={14} /> 100% Anonymous Delivery
            </span>
          </div>

          <p className="text-[11px] text-white/40">
            © {new Date().getFullYear()} Bopoi. Built for campus life.
          </p>
        </div>
      </div>
    </footer>
  );
};
