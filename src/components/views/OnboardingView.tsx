import React, { useState } from 'react';
import { BopoiLogo } from '../brand/BopoiLogo.tsx';
import { useBopoi } from '../../context/BopoiContext.tsx';
import { Dices } from 'lucide-react';
import {
  GetYourLinkIcon,
  ReceiveMessagesIcon,
  ShareOnCampusIcon,
  ShareCardsIcon,
} from '../brand/icons/index.ts';
import {
  CampusCharacterAvatar,
  parseCharacterConfig,
  randomizeCharacterConfig,
  serializeCharacterConfig,
} from '../brand/character/index.ts';

export const OnboardingView: React.FC = () => {
  const { user, updateProfile, setActiveView } = useBopoi();
  const [activeSlide, setActiveSlide] = useState(0);
  const [previewUri, setPreviewUri] = useState<string>(() =>
    serializeCharacterConfig(parseCharacterConfig(user.avatarUrl, user.username || 'campus_student'))
  );

  const handleRandomizeCharacter = () => {
    const next = serializeCharacterConfig(randomizeCharacterConfig());
    setPreviewUri(next);
    updateProfile({ avatarUrl: next });
  };

  const slides = [
    {
      title: "There's something you've been wanting to ask...",
      subtitle: 'Create your Bopoi link and let people send you anonymous messages.',
      illustration: (
        <div className="relative w-full max-w-[270px] aspect-[4/3] bg-gradient-to-tr from-[#F0EBFF] to-[#FAF9FC] rounded-2xl p-4 flex flex-col justify-center items-center border border-[#EAE6F0] shadow-sm">
          {/* Decorative icons */}
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-white border border-[#5420F5]/20 flex items-center justify-center p-1.5 shadow-xs">
              <GetYourLinkIcon size={32} />
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white border border-[#5420F5]/20 flex items-center justify-center p-1.5 shadow-xs">
              <ReceiveMessagesIcon size={32} />
            </div>
          </div>

          {/* Floating mock question box */}
          <div className="w-full bg-white rounded-xl p-3 shadow-md border border-[#5420F5]/20 flex flex-col gap-1.5 text-left">
            <span className="text-xs font-bold text-[#191525]">
              "What's your best campus memory?"
            </span>
            <div className="h-1.5 w-4/5 bg-slate-200 rounded-full" />
          </div>

          <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-[#5420F5]">
            <span>100% anonymous &amp; safe</span>
          </div>
        </div>
      ),
    },
    {
      title: 'Design your 3D Campus Character',
      subtitle:
        'No photo needed — customize your own 3D student character with shades, headgear, outfits, and auras.',
      illustration: (
        <div className="relative w-full max-w-[270px] aspect-[4/3] bg-gradient-to-tr from-[#191525] via-[#2A1B54] to-[#5420F5] text-white rounded-2xl p-4 flex flex-col justify-center items-center shadow-md">
          <CampusCharacterAvatar
            value={previewUri}
            seed={user.username || 'campus_student'}
            size={84}
            className="ring-3 ring-white/25 shadow-lg mb-2.5"
          />
          <button
            type="button"
            onClick={handleRandomizeCharacter}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-white text-xs font-extrabold transition-all cursor-pointer active:scale-95"
          >
            <Dices className="w-3.5 h-3.5 text-[#FDE047]" />
            <span>Randomize Look</span>
          </button>
        </div>
      ),
    },
    {
      title: 'Answer & share on your socials...',
      subtitle:
        'Craft expressive answers and export stunning Bopoi share cards to WhatsApp & Instagram.',
      illustration: (
        <div className="relative w-full max-w-[270px] aspect-[4/3] bg-gradient-to-tr from-[#5420F5] to-[#3510B9] text-white rounded-2xl p-4 flex flex-col justify-center items-center shadow-md">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center p-1.5">
              <ShareOnCampusIcon size={32} />
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center p-1.5">
              <ShareCardsIcon size={32} />
            </div>
          </div>

          <div className="w-full bg-white text-[#191525] rounded-xl p-3 shadow-lg flex flex-col gap-1 text-left">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#5420F5]">
              Share Card
            </span>
            <p className="text-xs font-semibold">"Honestly? The late night laughs! 🥺"</p>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-full flex flex-col justify-between bg-white text-[#191525] p-6 select-none">
      {/* Top Logo */}
      <div className="flex justify-center pt-4">
        <BopoiLogo variant="icon" size="lg" />
      </div>

      {/* Main Content Carousel */}
      <div className="flex flex-col items-center text-center my-auto py-2">
        <h2 className="text-2xl font-black tracking-tight text-[#191525] leading-snug px-2">
          {slides[activeSlide].title}
        </h2>
        <p className="text-sm text-[#706B7D] mt-2 px-4 leading-relaxed">
          {slides[activeSlide].subtitle}
        </p>

        {/* Visual Illustration */}
        <div className="my-6 w-full flex justify-center">{slides[activeSlide].illustration}</div>

        {/* Carousel Pagination Dots */}
        <div className="flex items-center justify-center gap-2 mt-1">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setActiveSlide(idx)}
              className={`h-2 rounded-full transition-all ${
                idx === activeSlide ? 'w-6 bg-[#5420F5]' : 'w-2 bg-[#EAE6F0]'
              }`}
              aria-label={`Slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Bottom Action Buttons */}
      <div className="flex flex-col gap-3 pb-2">
        <button
          onClick={() => setActiveView('register')}
          className="w-full py-3.5 px-6 bg-[#5420F5] text-white font-bold text-base rounded-2xl shadow-md shadow-[#5420F5]/25 hover:bg-[#4314E2] active:scale-[0.98] transition-all cursor-pointer"
        >
          Create my link &amp; character
        </button>

        <button
          onClick={() => setActiveView('inbox')}
          className="w-full py-3 text-sm font-semibold text-[#5420F5] hover:bg-[#F0EBFF] rounded-2xl transition-colors cursor-pointer"
        >
          I already have an account
        </button>
      </div>
    </div>
  );
};
