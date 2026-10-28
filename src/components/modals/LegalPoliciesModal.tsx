import React from 'react';
import { X, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useBopoi, LegalDocumentType } from '../../context/BopoiContext.tsx';
import { BopoiLogo } from '../brand/BopoiLogo.tsx';
import {
  StudentPostsIcon,
  SafetyShieldBadgeIcon,
  RealPeopleIcon,
  AdminConsoleNavIcon,
} from '../brand/icons/index.ts';

export const LegalPoliciesModal: React.FC = () => {
  const { activeLegalDoc, openLegalDoc } = useBopoi();

  if (!activeLegalDoc) return null;

  const tabs: { id: Exclude<LegalDocumentType, null>; label: string; icon: React.ReactNode }[] = [
    { id: 'terms', label: 'Terms of Service', icon: <StudentPostsIcon size={16} /> },
    { id: 'privacy', label: 'Privacy Policy', icon: <SafetyShieldBadgeIcon size={16} /> },
    { id: 'guidelines', label: 'Community Guidelines', icon: <RealPeopleIcon size={16} /> },
  ];

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-md animate-fade-in"
      onClick={() => openLegalDoc(null)}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 sm:px-7 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <BopoiLogo variant="icon" size="sm" />
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black tracking-tight truncate">
                Bopoi Trust, Legal & Safety Center
              </h2>
              <p className="text-[11px] text-slate-400 font-medium truncate">
                Protecting anonymous expression & student safety across Nigerian campuses
              </p>
            </div>
          </div>
          <button
            onClick={() => openLegalDoc(null)}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-colors shrink-0"
            aria-label="Close legal modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-4 sm:px-7 pt-3 bg-slate-50 border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          {tabs.map((tab) => {
            const isActive = activeLegalDoc === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => openLegalDoc(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2.5 text-xs sm:text-sm font-extrabold border-b-2 transition-all whitespace-nowrap ${
                  isActive
                    ? 'border-violet-600 text-violet-700 bg-white rounded-t-xl shadow-xs'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-7 overflow-y-auto space-y-6 text-slate-700 text-xs sm:text-sm leading-relaxed flex-1">
          {activeLegalDoc === 'terms' && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-violet-50 border border-violet-100 flex items-start gap-3">
                <AdminConsoleNavIcon size={22} className="shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-black text-slate-900 text-sm">
                    Effective Date: October 2026 • Bopoi Campus Network
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    By creating a Bopoi account, sharing your anonymous link, or participating in campus rooms, you agree to these Terms of Service.
                  </p>
                </div>
              </div>

              <section className="space-y-2">
                <h4 className="text-sm font-black text-slate-900">1. Eligibility & Campus Community</h4>
                <p>
                  Bopoi is designed for university and college students aged 16 and older. You are responsible for maintaining the security of your account credentials and for all activities that occur under your handle.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="text-sm font-black text-slate-900">2. Anonymous Q&A & Room Participation</h4>
                <p>
                  While Bopoi enables masked confessions, anonymous questions, and pseudonymous room personas, anonymity is a shield for honest expression—not a license for abuse. Users must not post unlawful threats, doxxing material (such as private phone numbers, hostel room numbers, or matriculation numbers), or non-consensual intimate content.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="text-sm font-black text-slate-900">3. Content Ownership & Story Cards</h4>
                <p>
                  You retain ownership of the posts, replies, and custom 3D campus characters you create on Bopoi. By publishing public posts or story cards, you grant Bopoi a non-exclusive license to display, format, and distribute your content across the platform feed and shareable links.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="text-sm font-black text-slate-900">4. Moderation, Suspension & Termination</h4>
                <p>
                  Bopoi reserves the right to remove content, mute anonymous senders, or suspend accounts that violate our Community Guidelines or compromise campus safety. Users can pause their anonymous link or block abusive senders at any time from the Safety Center.
                </p>
              </section>
            </div>
          )}

          {activeLegalDoc === 'privacy' && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-start gap-3">
                <SafetyShieldBadgeIcon size={22} className="shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-black text-slate-900 text-sm">
                    Zero-Exposure Anonymity Architecture
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Your identity on anonymous confessions, Q&A messages, and masked room chats is never exposed to other users or recipients.
                  </p>
                </div>
              </div>

              <section className="space-y-2">
                <h4 className="text-sm font-black text-slate-900">1. Information We Collect</h4>
                <p>
                  When you register, we store your chosen display name, username, campus affiliation, email address, and custom 3D character configuration (`bopoi-char://`). For anonymous messages, we use cryptographic session tokens solely to enable sender blocklists and two-way anonymous replies without revealing your identity.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="text-sm font-black text-slate-900">2. How Anonymous Personas Work</h4>
                <p>
                  Each community room assigns you an isolated room persona (e.g., <em>Velvet Owl</em> or <em>Shadow Fox</em>) stored securely. Other students in the room cannot link your room persona back to your public profile unless you explicitly toggle to Public Mode before sending a message.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="text-sm font-black text-slate-900">3. Data Sharing & Third Parties</h4>
                <p>
                  Bopoi does not sell student personal data to advertisers or third parties. Content you choose to download as a Story Card or share via deep links is controlled entirely by you.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="text-sm font-black text-slate-900">4. Your Controls & Right to Delete</h4>
                <p>
                  You can delete individual posts, clear room personas, filter hidden keywords, pause your inbox link, or reset your account data at any time through your Profile & Safety settings.
                </p>
              </section>
            </div>
          )}

          {activeLegalDoc === 'guidelines' && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3">
                <RealPeopleIcon size={22} className="shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-black text-slate-900 text-sm">
                    Keep Campus Gist Fun, Real & Safe
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Bopoi thrives on unfiltered student confessions, crushes, and debates—here are the golden rules every student must follow.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                  <div className="flex items-center gap-2 text-emerald-700 font-black text-xs">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>DO: Share Real Campus Stories</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Confess secret crushes, debate lecturer grading, share hostel survival tips, and hype up fellow students.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                  <div className="flex items-center gap-2 text-emerald-700 font-black text-xs">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>DO: Respect Room Boundaries</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Keep topic rooms relevant and use trigger warnings or constructive language on sensitive student topics.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-rose-50/60 border border-rose-200/80 space-y-1.5">
                  <div className="flex items-center gap-2 text-rose-700 font-black text-xs">
                    <AlertTriangle className="w-4 h-4" />
                    <span>DON'T: Doxx or Expose Private Info</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Never post full names of non-public individuals alongside private phone numbers, bank details, or exact room addresses.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-rose-50/60 border border-rose-200/80 space-y-1.5">
                  <div className="flex items-center gap-2 text-rose-700 font-black text-xs">
                    <AlertTriangle className="w-4 h-4" />
                    <span>DON'T: Bully, Threaten or Blackmail</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Harassment, hate speech, extortion, or encouraging self-harm results in an immediate permanent ban.
                  </p>
                </div>
              </div>

              <section className="space-y-2 pt-1">
                <h4 className="text-sm font-black text-slate-900">Automated Safety & Keyword Shield</h4>
                <p>
                  Every Bopoi inbox is protected by our Smart Safety Shield, which automatically filters abusive slurs and lets you add custom muted words in your Safety Center.
                </p>
              </section>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-7 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <span className="text-[11px] font-bold text-slate-500">
            Questions? Reach Campus Trust & Safety anytime via your Profile settings.
          </span>
          <button
            onClick={() => openLegalDoc(null)}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black transition-colors shrink-0"
          >
            Got it, Close
          </button>
        </div>
      </div>
    </div>
  );
};
