import { BopoiLogo, BopoiAppIcon } from '../brand/BopoiLogo.tsx';
import { useBopoi } from '../../context/BopoiContext.tsx';
import { BopoiInteractiveMascot } from '../brand/BopoiInteractiveMascot.tsx';
import { BopoiAnonymousAvatar } from '../brand/BopoiAnonymousAvatar.tsx';
import {
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import {
  GetYourLinkIcon,
  ShareOnCampusIcon,
  ReceiveMessagesIcon,
  ShareCardsIcon,
  YourCampusIcon,
  RealPeopleIcon,
  LaunchTrendingIcon,
  SafetyShieldBadgeIcon,
  SparklePolishIcon,
  CreateConfessionIcon,
} from '../brand/icons/index.ts';
import { CampusCharacterAvatar } from '../brand/character/index.ts';

export const HomeLandingView: React.FC = () => {
  const { setActiveView, user } = useBopoi();

  return (
    <div className="w-full flex flex-col bg-[#FAF9FC] text-[#191525]">
      {/* Hero Section */}
      <section className="relative w-full bg-gradient-to-b from-[#3510B9] via-[#4314E2] to-[#5420F5] text-white py-16 md:py-24 px-4 sm:px-6 overflow-hidden">
        {/* Subtle decorative atmosphere glows */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#F52D85]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-80 h-80 bg-[#FFC928]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center relative z-10">
          {/* Left Column: Headline & CTAs */}
          <div className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-semibold text-[#FFC928] mb-6">
              <SparklePolishIcon size={16} />
              <span>Campus Social &amp; Anonymous Q&amp;A</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] text-white">
              There's something you've been wanting to ask...
            </h1>

            <p className="mt-5 text-base sm:text-lg text-white/85 max-w-xl leading-relaxed">
              Create your personal Bopoi link and let people send you anonymous messages.
              Answer on your own terms, generate viral share cards, and post to WhatsApp Status or Instagram Stories.
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-col sm:flex-row items-center gap-3.5 w-full sm:w-auto">
              <button
                onClick={() => setActiveView('register')}
                className="w-full sm:w-auto px-7 py-4 bg-white text-[#5420F5] font-extrabold text-base rounded-2xl shadow-xl shadow-black/20 hover:bg-[#F7F4FF] active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 cursor-pointer"
              >
                <span>Create my link</span>
                <ArrowRight className="w-5 h-5" />
              </button>

              <button
                onClick={() => setActiveView('home')}
                className="w-full sm:w-auto px-6 py-4 bg-white/15 hover:bg-white/20 text-white font-bold text-base rounded-2xl border border-white/20 transition-all cursor-pointer backdrop-blur-sm"
              >
                Explore Campus Feed
              </button>
            </div>

            {/* Social Trust markers */}
            <div className="mt-8 flex items-center gap-4 text-xs text-white/75 flex-wrap justify-center lg:justify-start">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>100% Free to use</span>
              </div>
              <span>·</span>
              <div className="flex items-center gap-1.5">
                <CreateConfessionIcon size={16} />
                <span>Protected anonymity</span>
              </div>
              <span>·</span>
              <div className="flex items-center gap-1.5">
                <SafetyShieldBadgeIcon size={16} />
                <span>Harassment shield</span>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Card Showcase */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-white/20 text-[#191525] relative">
              {/* Campus sticker badge on top left */}
              <div className="absolute -top-2.5 left-6 bg-[#FFDE43] text-[#191525] text-[10px] font-black px-2.5 py-0.5 rounded-md shadow-xs rotate-[-3deg] border border-[#FFDE43]">
                #CAMPUSVIBES
              </div>

              {/* Bopoi Official App Icon on top right */}
              <div className="absolute -top-6 -right-4 drop-shadow-xl hover:scale-105 transition-transform">
                <BopoiAppIcon size={52} />
              </div>

              {/* Host preview header */}
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100 pt-1">
                <CampusCharacterAvatar
                  value={user.avatarUrl}
                  seed={user.username}
                  size={48}
                  rounded="full"
                  className="ring-2 ring-[#5420F5]/30"
                />
                <div>
                  <h4 className="text-sm font-extrabold text-[#191525]">{user.displayName}</h4>
                  <span className="text-xs text-[#5420F5] font-semibold">@{user.username}</span>
                </div>
              </div>

              {/* Question bubble with Bopoi Anonymous Avatar */}
              <div className="my-4 bg-[#FAF9FC] border border-[#EAE6F0] rounded-2xl p-3.5">
                <div className="flex items-center gap-2 mb-1">
                  <BopoiAnonymousAvatar size="sm" idPrefix="hero-anon" showSparkleBadge />
                  <div>
                    <span className="text-xs font-bold text-[#191525] block">
                      Anonymous Student
                    </span>
                    <span className="text-[10px] text-[#706B7D] block leading-none">
                      Campus Mystery
                    </span>
                  </div>
                </div>
                <p className="text-lg font-bold text-[#191525] mt-1 font-['Caveat',cursive] leading-snug">
                  "{user.customPrompt || "There's something you've been wanting to ask..."}"
                </p>
              </div>

              {/* Response Card */}
              <div className="bg-gradient-to-r from-[#F0EBFF] to-[#FAF9FC] rounded-2xl p-3.5 border border-[#5420F5]/20">
                <p className="text-xs sm:text-sm text-slate-800 font-semibold leading-relaxed">
                  Share your link, receive anonymous messages in real time, and publish custom story cards.
                </p>
                <div className="mt-2 text-right">
                  <span className="text-[11px] font-bold text-[#5420F5]">— @{user.username}</span>
                </div>
              </div>

              {/* Try it action button */}
              <button
                onClick={() => setActiveView('public-ask')}
                className="mt-4 w-full py-2.5 bg-[#5420F5] text-white font-bold text-xs rounded-xl hover:bg-[#4314E2] transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <ReceiveMessagesIcon size={18} />
                <span>Try Sending an Anonymous Message</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 4-Step Viral Growth Cycle */}
      <section className="py-16 md:py-20 px-4 sm:px-6 max-w-6xl mx-auto w-full">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-black text-[#191525] tracking-tight">
            How Bopoi works in four simple steps
          </h2>
          <p className="text-sm text-[#706B7D] mt-2">
            No long setups. Claim your link and connect with your campus circle instantly.
          </p>
        </div>

        {/* Onboarding Highlights Bar */}
        <div className="flex items-center justify-center gap-3 sm:gap-6 flex-wrap mb-10">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-white border border-[#EAE6F0] shadow-xs text-xs font-bold text-[#191525]">
            <YourCampusIcon size={24} />
            <span>Your Campus Verified</span>
          </div>
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-white border border-[#EAE6F0] shadow-xs text-xs font-bold text-[#191525]">
            <RealPeopleIcon size={24} />
            <span>Real Student Circles</span>
          </div>
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-white border border-[#EAE6F0] shadow-xs text-xs font-bold text-[#191525]">
            <LaunchTrendingIcon size={24} />
            <span>Launch &amp; Trending</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              num: '01',
              title: 'Get Your Link',
              desc: 'Choose your unique username. Get your personal bopoi.com/@username/ask link in seconds.',
              icon: <GetYourLinkIcon size={38} />,
            },
            {
              num: '02',
              title: 'Share On Campus',
              desc: 'Post your link to WhatsApp Status, Instagram Stories, Snapchat, or your class group chat.',
              icon: <ShareOnCampusIcon size={38} />,
            },
            {
              num: '03',
              title: 'Receive Messages',
              desc: 'Friends ask you anything anonymously. Zero names attached, zero awkwardness.',
              icon: <ReceiveMessagesIcon size={38} />,
            },
            {
              num: '04',
              title: 'Share Cards',
              desc: 'Draft answers, customize beautiful Bopoi Share Cards, and export high-res PNGs to your story.',
              icon: <ShareCardsIcon size={38} />,
            },
          ].map((step) => (
            <div
              key={step.num}
              className="bg-white rounded-3xl p-6 border border-[#EAE6F0] shadow-xs flex flex-col justify-between hover:border-[#5420F5]/40 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center p-1 shadow-2xs">
                    {step.icon}
                  </div>
                  <span className="text-xs font-black text-[#5420F5] font-mono bg-[#F0EBFF] px-2.5 py-1 rounded-full">
                    {step.num}
                  </span>
                </div>
                <h3 className="text-base font-bold text-[#191525]">{step.title}</h3>
                <p className="text-xs text-[#706B7D] mt-2 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Safety & Moderation Section */}
      <section className="bg-white border-y border-[#EAE6F0] py-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold mb-3">
              <SafetyShieldBadgeIcon size={16} />
              <span>Campus Safety Shield</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-[#191525] tracking-tight">
              Playful and expressive, without the toxicity
            </h2>
            <p className="text-sm text-[#706B7D] mt-3 leading-relaxed">
              Anonymous messaging should bring laughter and curiosity, not bullying.
              Bopoi is equipped with real recipient-controlled safeguards:
            </p>

            <div className="mt-6 space-y-3.5">
              {[
                { title: 'Custom Hidden Words', desc: 'Add words or phrases you never want to receive. Messages containing them are rejected immediately.' },
                { title: 'One-Tap Sender Block', desc: 'Silence repeat abusers without exposing their identity or yours.' },
                { title: 'Pause Link Anytime', desc: 'Need a study break or feeling overwhelmed? Flip your link switch to paused with one click.' },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-xs mt-0.5 shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#191525]">{item.title}</h4>
                    <p className="text-xs text-[#706B7D] mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Campus Illustration Showcase */}
          <div className="relative rounded-3xl overflow-hidden shadow-xl border border-[#EAE6F0] aspect-[4/3]">
            <img
              src="/src/assets/images/campus_students_group_1791990927948.jpg"
              alt="Nigerian students laughing together on campus"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-6">
              <span className="text-white font-bold text-sm">
                Built for Nigerian universities &amp; student culture
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom Conversion Banner */}
      <section className="py-16 px-4 sm:px-6 max-w-4xl mx-auto w-full text-center">
        <h2 className="text-2xl sm:text-3xl font-black text-[#191525] tracking-tight">
          Ready to find out what people want to ask you?
        </h2>
        <p className="text-sm text-[#706B7D] mt-2 max-w-md mx-auto">
          Get your anonymous link in less than a minute. No credit card, no complicated steps.
        </p>
        <button
          onClick={() => setActiveView('register')}
          className="mt-6 px-8 py-4 bg-[#5420F5] hover:bg-[#4314E2] text-white font-extrabold text-base rounded-2xl shadow-lg shadow-[#5420F5]/25 active:scale-[0.98] transition-all cursor-pointer inline-flex items-center gap-2"
        >
          <span>Claim your Bopoi link now</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </section>
    </div>
  );
};
