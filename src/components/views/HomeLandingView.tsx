import React, { useState } from 'react';
import { BopoiAppIcon } from '../brand/BopoiLogo.tsx';
import { useBopoi } from '../../context/BopoiContext.tsx';
import { BopoiAnonymousAvatar } from '../brand/BopoiAnonymousAvatar.tsx';
import { ArrowRight, CheckCircle2, Dices } from 'lucide-react';
import {
  ReceiveMessagesIcon,
  YourCampusIcon,
  RealPeopleIcon,
  LaunchTrendingIcon,
  SafetyShieldBadgeIcon,
  CreateConfessionIcon,
} from '../brand/icons/index.ts';
import { CampusCharacterAvatar } from '../brand/character/index.ts';
import { VerifiedCreatorBadge } from '../ui/VerifiedCreatorBadge.tsx';

const HERO_DEMOS = [
  {
    id: 'ask',
    label: 'Ask Link',
    question: "What's your honest first impression of me?",
    reply: 'Always calm before 8am lectures and carries everyone through group projects.',
  },
  {
    id: 'confess',
    label: 'Hot Take',
    question: 'Unpopular opinion about hostel life right now?',
    reply: 'Mid-semester suya runs at 11pm solve more stress than reading the same slide 4 times.',
  },
  {
    id: 'secret',
    label: 'Secret DM',
    question: 'Drop a clue about who your campus crush is…',
    reply: 'Front row in Software Engineering, always wearing oversized hoodies.',
  },
];

export const HomeLandingView: React.FC = () => {
  const { setActiveView, user, socialPosts, rooms, creators } = useBopoi();
  const [demoIdx, setDemoIdx] = useState(0);
  const activeDemo = HERO_DEMOS[demoIdx];

  return (
    <div className="w-full flex flex-col bg-[#FAF9FC] dark:bg-[#09070D] text-[#191525] dark:text-[#F4F2FA]">
      {/* Hero Section */}
      <section className="relative w-full bg-[#3A12C4] dark:bg-[#130C2B] text-white py-14 md:py-22 px-4 sm:px-6 overflow-hidden">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center relative z-10">
          {/* Left Column: Headline & Primary Conversion */}
          <div className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left">
            <span className="text-xs sm:text-sm font-extrabold text-[#FFC928] mb-3">
              Campus Feed · Live Rooms · Anonymous Q&amp;A
            </span>

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-[1.08] text-white [text-wrap:balance]">
              Ask anonymously. Talk openly on campus.
            </h1>

            <p className="mt-5 text-base sm:text-lg text-white/85 max-w-xl leading-relaxed">
              Claim your personal Bopoi link for anonymous Q&amp;As, join live masked campus rooms,
              and turn secret messages into custom Story cards for WhatsApp Status and Instagram.
            </p>

            {/* Primary & Secondary CTAs */}
            <div className="mt-8 flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setActiveView('register')}
                className="w-full sm:w-auto min-h-[50px] px-7 py-3.5 bg-white text-[#5420F5] font-black text-base rounded-2xl shadow-xl shadow-black/25 hover:bg-[#F7F4FF] active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 cursor-pointer"
              >
                <span>Create my link</span>
                <ArrowRight className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={() => setActiveView('home')}
                className="w-full sm:w-auto min-h-[50px] px-6 py-3.5 bg-white/15 hover:bg-white/25 text-white font-bold text-base rounded-2xl border border-white/20 transition-all cursor-pointer backdrop-blur-sm"
              >
                Explore Campus Feed
              </button>
            </div>

            {/* Unboxed Trust Markers */}
            <div className="mt-7 flex items-center gap-3.5 text-xs text-white/80 flex-wrap justify-center lg:justify-start">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Instant campus link</span>
              </span>
              <span>·</span>
              <span className="inline-flex items-center gap-1.5">
                <CreateConfessionIcon size={15} />
                <span>Protected anonymity</span>
              </span>
              <span>·</span>
              <span className="inline-flex items-center gap-1.5">
                <SafetyShieldBadgeIcon size={15} />
                <span>Keyword safety shield</span>
              </span>
            </div>
          </div>

          {/* Right Column: Live Interactive Card Showcase */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="w-full max-w-sm bg-white dark:bg-[#141021] rounded-3xl p-5 shadow-2xl border border-white/25 dark:border-[#2C2442] text-[#191525] dark:text-[#F4F2FA] relative">
              <div className="absolute -top-5 -right-3 drop-shadow-xl hover:scale-105 transition-transform">
                <BopoiAppIcon size={48} />
              </div>

              {/* Host preview header */}
              <div className="flex items-center gap-3 pb-3 border-b border-[#EAE6F0] dark:border-[#262036]">
                <CampusCharacterAvatar
                  value={user.avatarUrl}
                  seed={user.username}
                  size={46}
                  rounded="full"
                  className="ring-2 ring-[#5420F5]/30 shrink-0"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1 min-w-0">
                    <h4 className="text-sm font-extrabold text-[#191525] dark:text-[#F4F2FA] truncate">
                      {user.displayName}
                    </h4>
                    <VerifiedCreatorBadge
                      isVerified={Boolean(user.isVerified || user.isCreator)}
                      username={user.username}
                      size={15}
                    />
                  </div>
                  <span className="text-xs text-[#5420F5] dark:text-[#9B82FF] font-semibold">
                    @{user.username} · {user.campus || 'Campus'}
                  </span>
                </div>
              </div>

              {/* Interactive prompt mode switcher */}
              <div className="flex items-center justify-between gap-1.5 pt-3">
                <div className="flex items-center gap-1 bg-[#FAF9FC] dark:bg-[#0E0C14] p-1 rounded-xl border border-[#EAE6F0] dark:border-[#262036]">
                  {HERO_DEMOS.map((item, idx) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setDemoIdx(idx)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition-colors cursor-pointer ${
                        demoIdx === idx
                          ? 'bg-[#5420F5] text-white'
                          : 'text-[#706B7D] dark:text-[#9E97B3] hover:text-[#191525] dark:hover:text-white'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setDemoIdx((prev) => (prev + 1) % HERO_DEMOS.length)}
                  className="p-1.5 rounded-lg text-[#5420F5] dark:text-[#9B82FF] hover:bg-[#F0EBFF] dark:hover:bg-[#231A45] transition-colors cursor-pointer"
                  title="Cycle question example"
                  aria-label="Cycle question example"
                >
                  <Dices className="w-4 h-4" />
                </button>
              </div>

              {/* Question bubble */}
              <div className="my-3 bg-[#FAF9FC] dark:bg-[#1B1629] border border-[#EAE6F0] dark:border-[#262036] rounded-2xl p-3.5">
                <div className="flex items-center gap-2 mb-1.5">
                  <BopoiAnonymousAvatar size="sm" idPrefix="hero-anon" />
                  <div>
                    <span className="text-xs font-bold text-[#191525] dark:text-[#F4F2FA] block">
                      Anonymous Student
                    </span>
                    <span className="text-[10px] text-[#706B7D] dark:text-[#9E97B3] block leading-none">
                      Sent via bopoi.com/@{user.username}/ask
                    </span>
                  </div>
                </div>
                <p className="text-xl font-bold text-[#191525] dark:text-white font-['Caveat',cursive] leading-snug">
                  “{activeDemo.question}”
                </p>
              </div>

              {/* Story Answer Preview */}
              <div className="bg-[#F7F4FF] dark:bg-[#1E1635] rounded-2xl p-3.5 border border-[#5420F5]/20 dark:border-[#7C5CFF]/30">
                <p className="text-xs sm:text-sm text-[#191525] dark:text-[#F4F2FA] font-semibold leading-relaxed">
                  {activeDemo.reply}
                </p>
                <div className="mt-2 text-right">
                  <span className="text-[11px] font-bold text-[#5420F5] dark:text-[#9B82FF]">
                    — @{user.username}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveView('public-ask')}
                className="mt-4 w-full min-h-[44px] py-2.5 bg-[#5420F5] text-white font-bold text-xs rounded-xl hover:bg-[#4314E2] transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <ReceiveMessagesIcon size={18} />
                <span>Try Sending an Anonymous Message</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Live Campus Proof Metrics Strip */}
      <section className="w-full border-b border-[#EAE6F0] dark:border-[#262036] bg-white dark:bg-[#0E0C14]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-3 gap-4 text-center tabular-nums">
          <div>
            <p className="text-xl sm:text-2xl font-black text-[#191525] dark:text-[#F4F2FA]">
              {socialPosts.length}
            </p>
            <p className="text-[11px] sm:text-xs font-semibold text-[#706B7D] dark:text-[#9E97B3] mt-0.5">
              Campus threads &amp; polls
            </p>
          </div>
          <div className="border-x border-[#EAE6F0] dark:border-[#262036]">
            <p className="text-xl sm:text-2xl font-black text-[#5420F5] dark:text-[#9B82FF]">
              {rooms.length}
            </p>
            <p className="text-[11px] sm:text-xs font-semibold text-[#706B7D] dark:text-[#9E97B3] mt-0.5">
              Masked live rooms
            </p>
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-black text-[#F52D85]">
              {creators.length}
            </p>
            <p className="text-[11px] sm:text-xs font-semibold text-[#706B7D] dark:text-[#9E97B3] mt-0.5">
              Student profiles
            </p>
          </div>
        </div>
      </section>

      {/* Numbered 4-Step Editorial Loop */}
      <section className="py-16 md:py-20 px-4 sm:px-6 max-w-6xl mx-auto w-full">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10 pb-6 border-b border-[#EAE6F0] dark:border-[#262036]">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-[#191525] dark:text-[#F4F2FA] tracking-tight [text-wrap:balance]">
              How Bopoi works on campus
            </h2>
            <p className="text-sm text-[#706B7D] dark:text-[#9E97B3] mt-1.5">
              Claim your handle once and plug directly into Threads feeds, live rooms, and secret DMs.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-bold text-[#706B7D] dark:text-[#9E97B3] flex-wrap">
            <span className="inline-flex items-center gap-1.5">
              <YourCampusIcon size={18} /> Nigerian Campuses
            </span>
            <span>·</span>
            <span className="inline-flex items-center gap-1.5">
              <RealPeopleIcon size={18} /> Verified Student Circles
            </span>
            <span>·</span>
            <span className="inline-flex items-center gap-1.5">
              <LaunchTrendingIcon size={18} /> Real-Time Trends
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-[#EAE6F0] dark:divide-[#262036] bg-white dark:bg-[#0E0C14] border border-[#EAE6F0] dark:border-[#262036] rounded-3xl overflow-hidden">
          {[
            {
              num: '01.',
              title: 'Claim Your Handle',
              desc: 'Lock in your bopoi.com/@username/ask link and customize your 3D campus avatar.',
            },
            {
              num: '02.',
              title: 'Drop on IG & WhatsApp',
              desc: 'Post your link sticker to WhatsApp Status or Instagram Stories in one tap.',
            },
            {
              num: '03.',
              title: 'Reply in Private DMs',
              desc: 'Continue private 1-on-1 anonymous chats right inside your Inbox.',
            },
            {
              num: '04.',
              title: 'Publish Story Cards',
              desc: 'Turn favorite questions into crisp 9:16 PNG Story cards or share to the Campus Feed.',
            },
          ].map((step) => (
            <div key={step.num} className="p-6 flex flex-col justify-between gap-4">
              <div className="space-y-2.5">
                <span className="text-xs font-black text-[#5420F5] dark:text-[#9B82FF] tabular-nums tracking-wider block">
                  {step.num}
                </span>
                <h3 className="text-base font-black text-[#191525] dark:text-[#F4F2FA]">
                  {step.title}
                </h3>
                <p className="text-xs text-[#706B7D] dark:text-[#9E97B3] leading-relaxed">
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Safety & Moderation Section */}
      <section className="bg-white dark:bg-[#0E0C14] border-y border-[#EAE6F0] dark:border-[#262036] py-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 text-xs font-extrabold mb-2">
              <SafetyShieldBadgeIcon size={16} />
              <span>Campus Safety Shield</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-[#191525] dark:text-[#F4F2FA] tracking-tight [text-wrap:balance]">
              Built for laughs, not harassment
            </h2>
            <p className="text-sm text-[#706B7D] dark:text-[#9E97B3] mt-3 leading-relaxed">
              Anonymous messaging should bring laughter and real connection, not harassment.
              Every student controls their own shield:
            </p>

            <div className="mt-6 space-y-3.5">
              {[
                {
                  title: 'Custom Hidden Words',
                  desc: 'Add words or phrases you never want to see — incoming messages matching them are blocked before reaching your Inbox.',
                },
                {
                  title: 'One-Tap Sender Block & Reports',
                  desc: 'Silence repeat abusers or escalate a thread directly to campus moderators without exposing anyone.',
                },
                {
                  title: 'Pause Link Anytime',
                  desc: 'Entering exam week? Toggle your Ask link off in one tap and jump back in whenever you are ready.',
                },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mt-0.5 shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#191525] dark:text-[#F4F2FA]">
                      {item.title}
                    </h4>
                    <p className="text-xs text-[#706B7D] dark:text-[#9E97B3] mt-0.5">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Campus Illustration Showcase */}
          <div className="relative rounded-3xl overflow-hidden shadow-xl border border-[#EAE6F0] dark:border-[#262036] aspect-[4/3]">
            <img
              src="/src/assets/images/campus_students_group_1791990927948.jpg"
              alt="Nigerian students laughing together on campus"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent flex items-end p-6">
              <span className="text-white font-bold text-sm">
                Built for Nigerian universities &amp; authentic student culture
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom Conversion Banner */}
      <section className="py-16 px-4 sm:px-6 max-w-4xl mx-auto w-full text-center">
        <h2 className="text-2xl sm:text-3xl font-black text-[#191525] dark:text-[#F4F2FA] tracking-tight [text-wrap:balance]">
          Ready to see what your campus wants to ask you?
        </h2>
        <p className="text-sm text-[#706B7D] dark:text-[#9E97B3] mt-2 max-w-md mx-auto">
          Claim your anonymous handle and join your first live room in under a minute.
        </p>
        <button
          type="button"
          onClick={() => setActiveView('register')}
          className="mt-6 min-h-[50px] px-8 py-3.5 bg-[#5420F5] hover:bg-[#4314E2] text-white font-black text-base rounded-2xl shadow-lg shadow-[#5420F5]/25 active:scale-[0.98] transition-all cursor-pointer inline-flex items-center gap-2"
        >
          <span>Claim your Bopoi link</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </section>
    </div>
  );
};
