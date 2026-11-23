import React from 'react';
import { BopoiLogo } from '../brand/BopoiLogo.tsx';
import { BopoiAnonymousAvatar } from '../brand/BopoiAnonymousAvatar.tsx';
import { useBopoi } from '../../context/BopoiContext.tsx';
import { ArrowRight, LogIn, MessagesSquare, Sparkles } from 'lucide-react';

export const SplashView: React.FC = () => {
  const { setActiveView } = useBopoi();

  return (
    <div className="min-h-dvh flex flex-col justify-between bg-gradient-to-b from-[#2E0BA8] via-[#4314E2] to-[#5420F5] dark:from-[#0E0A1C] dark:via-[#1E1148] dark:to-[#3510B9] text-white px-5 py-8 sm:p-8 relative overflow-hidden select-none">
      {/* Ambient lighting */}
      <div className="absolute -top-12 right-0 w-72 h-72 bg-[#F52D85]/25 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-12 -left-10 w-72 h-72 bg-[#FFC928]/20 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Logo & Branding */}
      <div className="flex flex-col items-center pt-4 sm:pt-8 text-center z-10 max-w-md mx-auto w-full">
        <div className="animate-in zoom-in-90 fade-in duration-300">
          <BopoiLogo variant="icon" size="xl" className="mb-4 drop-shadow-2xl" />
        </div>
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white flex items-center justify-center">
          Bopo
          <span className="relative inline-block">
            ı
            <span className="absolute -top-1 right-0 w-2.5 h-2.5 bg-[#FFC928] rounded-full shadow-sm" />
          </span>
        </h1>
        <p className="text-sm sm:text-base font-semibold text-white/85 mt-2 tracking-wide [text-wrap:balance]">
          Threads for campus gist · Rooms for live chat · Anonymous Q&amp;A links
        </p>
      </div>

      {/* Interactive NGL / Campus Preview Stack */}
      <div className="my-auto py-6 flex flex-col items-center justify-center z-10 max-w-sm mx-auto w-full space-y-3">
        {/* Live Story Question Card Preview */}
        <div className="w-full rounded-3xl bg-white/12 backdrop-blur-md border border-white/20 p-4 shadow-2xl space-y-3">
          <div className="flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2.5">
              <BopoiAnonymousAvatar size="sm" idPrefix="splash-anon" showSparkleBadge />
              <div>
                <p className="font-black text-white leading-none">Anonymous Student</p>
                <p className="text-[11px] text-white/70 mt-1">Just dropped via Ask Link</p>
              </div>
            </div>
            <Sparkles className="w-4 h-4 text-[#FFC928] shrink-0" />
          </div>

          <div className="rounded-2xl bg-white text-[#191525] p-4 shadow-lg">
            <p className="font-handwriting text-2xl font-bold leading-snug text-[#191525]">
              “Drop your honest thoughts before finals week starts…”
            </p>
            <div className="mt-2.5 pt-2.5 border-t border-[#EAE6F0] flex items-center justify-between text-[11px] font-bold text-[#706B7D]">
              <span>@campus_star · Verified Circle</span>
              <span className="text-[#5420F5]">Reply or Story Card →</span>
            </div>
          </div>
        </div>

        {/* Unboxed subtle capabilities row */}
        <div className="flex items-center justify-center gap-3 text-[11px] font-bold text-white/80">
          <span className="flex items-center gap-1">
            <MessagesSquare className="w-3.5 h-3.5 text-[#FFC928]" />
            Live Rooms
          </span>
          <span>·</span>
          <span>Secret 1-on-1 DMs</span>
          <span>·</span>
          <span>Safe Shield</span>
        </div>
      </div>

      {/* Bottom CTA actions */}
      <div className="flex flex-col gap-2.5 pb-2 z-10 max-w-sm mx-auto w-full">
        <button
          type="button"
          onClick={() => setActiveView('onboarding')}
          className="w-full min-h-[52px] py-3.5 px-6 bg-white text-[#5420F5] font-black text-base rounded-2xl shadow-xl shadow-black/25 hover:bg-[#F7F4FF] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>Get Started</span>
          <ArrowRight className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveView('profile')}
            className="min-h-[44px] py-2.5 px-3 rounded-xl bg-white/12 hover:bg-white/20 border border-white/15 text-xs font-extrabold text-white transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Log In</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveView('home')}
            className="min-h-[44px] py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white/90 hover:text-white transition-colors cursor-pointer"
          >
            Browse Feed
          </button>
        </div>
      </div>
    </div>
  );
};
