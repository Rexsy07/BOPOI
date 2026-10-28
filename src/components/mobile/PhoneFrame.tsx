import React from 'react';
import { Wifi, Battery, Smartphone, Maximize2, RotateCcw, Sparkles } from 'lucide-react';
import { useBopoi } from '../../context/BopoiContext.tsx';
import { ActiveAppView } from '../../types/index.ts';
import {
  ReceiveMessagesIcon,
  ShareCardsIcon,
  RealPeopleIcon,
  YourCampusIcon,
  SparklePolishIcon,
} from '../brand/icons/index.ts';

interface PhoneFrameProps {
  children: React.ReactNode;
}

export const PhoneFrame: React.FC<PhoneFrameProps> = ({ children }) => {
  const {
    activeView,
    setActiveView,
    deviceMode,
    setDeviceMode,
    resetToDemo,
    unreadCount,
    user,
  } = useBopoi();

  const isFullscreen = deviceMode === 'fullscreen';

  const viewQuickSwitches: { view: ActiveAppView; label: string; badge?: number }[] = [
    { view: 'inbox', label: 'My Inbox', badge: unreadCount },
    { view: 'public-ask', label: `Visitor: @${user.username}/ask` },
    { view: 'answer-studio', label: 'Answer & Share Card' },
    { view: 'profile', label: 'Profile & Link Settings' },
    { view: 'onboarding', label: 'Onboarding Flow' },
    { view: 'splash', label: 'Welcome Splash' },
  ];

  return (
    <div className="w-full flex flex-col items-center">
      {/* Top Experience Switcher Bar */}
      <header className="w-full max-w-5xl px-4 py-3 mb-4 flex flex-wrap items-center justify-between gap-3 bg-[#18132F]/80 backdrop-blur-md rounded-2xl border border-white/10 shadow-lg text-white select-none">
        {/* Left: Quick Role Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#FFC928] mr-1 hidden sm:inline">
            Role Switcher:
          </span>
          {viewQuickSwitches.map((item) => {
            const isActive = activeView === item.view;
            return (
              <button
                key={item.view}
                onClick={() => setActiveView(item.view)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                  isActive
                    ? 'bg-[#5420F5] text-white shadow-md shadow-[#5420F5]/30 ring-1 ring-white/20'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span>{item.label}</span>
                {Boolean(item.badge && item.badge > 0) && (
                  <span className="bg-[#F52D85] text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right: Frame vs Fullscreen Toggle & Reset Demo */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setDeviceMode(isFullscreen ? 'frame' : 'fullscreen')}
            className="px-2.5 py-1.5 bg-white/10 hover:bg-white/15 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Toggle device frame or full-screen view"
          >
            {isFullscreen ? (
              <>
                <Smartphone className="w-3.5 h-3.5 text-[#FFC928]" />
                <span className="hidden sm:inline">Phone Frame</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-[#FFC928]" />
                <span className="hidden sm:inline">Full Screen</span>
              </>
            )}
          </button>

          <button
            onClick={resetToDemo}
            className="p-1.5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
            title="Refresh live data"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main View Area */}
      {isFullscreen ? (
        <main className="w-full max-w-lg min-h-[750px] bg-white rounded-3xl shadow-2xl border border-slate-700/30 overflow-hidden flex flex-col relative">
          {children}
        </main>
      ) : (
        /* Realistic Smartphone Bezel & Shell */
        <main className="relative w-full max-w-[390px] h-[810px] bg-[#000000] p-3 rounded-[50px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] border-[5px] border-[#2E284A] ring-1 ring-white/20 select-none flex flex-col">
          {/* Inner Screen Area */}
          <div className="relative w-full h-full bg-white rounded-[40px] overflow-hidden flex flex-col shadow-inner">
            {/* iOS Status Bar */}
            <div className="h-10 px-6 pt-2 flex items-center justify-between text-xs font-semibold z-30 shrink-0 select-none pointer-events-none text-slate-800">
              <span className="text-[12px] font-bold tracking-tight">9:41</span>

              {/* Dynamic Island / Notch */}
              <div className="w-24 h-4 bg-black rounded-full mx-auto -mt-1 shadow-xs" />

              <div className="flex items-center gap-1.5 text-slate-800">
                {/* Signal bars */}
                <div className="flex items-end gap-0.5 h-2.5">
                  <span className="w-0.5 h-1 bg-current rounded-full" />
                  <span className="w-0.5 h-1.5 bg-current rounded-full" />
                  <span className="w-0.5 h-2 bg-current rounded-full" />
                  <span className="w-0.5 h-2.5 bg-current rounded-full" />
                </div>
                <Wifi className="w-3.5 h-3.5 stroke-[2.5]" />
                <Battery className="w-4 h-4 stroke-[2.5]" />
              </div>
            </div>

            {/* Screen View Body */}
            <div className="flex-1 overflow-hidden relative flex flex-col">
              {children}
            </div>

            {/* iOS Home Drag Indicator Bar */}
            <div className="h-4 w-full bg-white flex items-center justify-center shrink-0 pointer-events-none">
              <div className="w-32 h-1 bg-slate-300 rounded-full" />
            </div>
          </div>
        </main>
      )}

      {/* Bottom Platform Feature Banner matching the uploaded image */}
      <footer className="w-full max-w-4xl mt-8 px-4 py-5 bg-[#17112C] rounded-3xl border border-white/10 shadow-xl text-white select-none">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div className="flex flex-col items-center md:items-start">
            <span className="text-xs text-white/70 font-semibold tracking-wide">
              More than just a message...
            </span>
            <span className="text-xl font-handwriting text-[#FFC928] tracking-wider mt-0.5">
              It's a whole vibe.
            </span>
          </div>

          {/* Feature Badges from design board */}
          <div className="flex flex-wrap items-center justify-center gap-3 text-xs font-semibold text-white/90">
            {[
              { icon: <ReceiveMessagesIcon size={16} />, label: 'Anonymous Messages' },
              { icon: <ShareCardsIcon size={16} />, label: 'Share Cards' },
              { icon: <RealPeopleIcon size={16} />, label: 'Real People' },
              { icon: <YourCampusIcon size={16} />, label: 'Your Campus' },
              { icon: <SparklePolishIcon size={16} />, label: 'So Much More' },
            ].map((feat) => (
              <div
                key={feat.label}
                className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-xl border border-white/5 transition-colors"
              >
                {feat.icon}
                <span>{feat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
};
