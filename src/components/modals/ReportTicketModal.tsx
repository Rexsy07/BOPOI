import React, { useState, useEffect } from 'react';
import { X, Flag, Loader2, Check, MessageCircle } from 'lucide-react';
import { useBopoi } from '../../context/BopoiContext.tsx';
import { ModerationReport } from '../../types/index.ts';
import { SafetyShieldBadgeIcon } from '../brand/icons/index.ts';

const CONTENT_REPORT_REASONS = [
  'Harassment or targeted bullying',
  'Hate speech or discrimination',
  'Threats or physical harm',
  'Doxxing / private personal contact info',
  'Spam, scam, or impersonation',
  'Other safety concern',
];

const SUPPORT_SUBJECTS = [
  'General Question',
  'Safety & Harassment Report',
  'Account & Username Help',
  'Feature Request / Bug',
];

export const ReportTicketModal: React.FC = () => {
  const {
    reportModalTarget,
    closeReportModal,
    reportPost,
    reportMessage,
    submitSupportTicket,
    openTicketInSettings,
    showToast,
  } = useBopoi();

  const isSupportTicket = reportModalTarget?.targetType === 'support_ticket';

  const [selectedReason, setSelectedReason] = useState<string>(CONTENT_REPORT_REASONS[0]);
  const [details, setDetails] = useState('');
  const [submitStage, setSubmitStage] = useState<'idle' | 'submitting' | 'done'>('idle');
  const [createdReport, setCreatedReport] = useState<ModerationReport | null>(null);

  useEffect(() => {
    if (reportModalTarget) {
      setSelectedReason(
        reportModalTarget.targetType === 'support_ticket'
          ? reportModalTarget.defaultSubject || SUPPORT_SUBJECTS[0]
          : CONTENT_REPORT_REASONS[0]
      );
      setDetails('');
      setSubmitStage('idle');
      setCreatedReport(null);
    }
  }, [reportModalTarget]);

  useEffect(() => {
    if (!reportModalTarget) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && submitStage === 'idle') {
        e.preventDefault();
        closeReportModal();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [reportModalTarget, submitStage, closeReportModal]);

  if (!reportModalTarget) return null;

  const reasonOptions = isSupportTicket ? SUPPORT_SUBJECTS : CONTENT_REPORT_REASONS;
  const requiresDetails = isSupportTicket || selectedReason === 'Other safety concern';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (submitStage !== 'idle') return;

    if (requiresDetails && !details.trim()) {
      showToast(
        isSupportTicket
          ? 'Please describe your issue so moderators can help.'
          : 'Please add brief details about what happened.',
        'error'
      );
      return;
    }

    setSubmitStage('submitting');

    setTimeout(() => {
      let result: ModerationReport | null = null;
      if (isSupportTicket) {
        result = submitSupportTicket(selectedReason, details.trim());
      } else if (reportModalTarget.targetType === 'anonymous_message') {
        result = reportMessage(reportModalTarget.targetId, selectedReason, details.trim());
      } else {
        result = reportPost(reportModalTarget.targetId, selectedReason, details.trim());
      }

      setCreatedReport(result);
      setSubmitStage('done');
    }, 300);
  };

  return (
    <div
      onClick={() => {
        if (submitStage !== 'submitting') closeReportModal();
      }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-[#0E0C14] text-[#191525] dark:text-[#F4F2FA] rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 w-full max-w-md space-y-4 shadow-2xl border border-[#EAE6F0] dark:border-[#262036] max-h-[90dvh] overflow-y-auto"
      >
        <div className="w-10 h-1 bg-[#EAE6F0] dark:bg-[#262036] rounded-full mx-auto -mt-1.5 sm:hidden" />

        {/* Simple Header matching ProfileView Settings Modals */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#FAF9FC] dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] flex items-center justify-center shrink-0">
              <SafetyShieldBadgeIcon size={20} />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-[#191525] dark:text-[#F4F2FA] truncate">
                {createdReport
                  ? 'Ticket Opened'
                  : isSupportTicket
                  ? 'Contact Moderation'
                  : `Report ${reportModalTarget.targetLabel || 'Content'}`}
              </h3>
              <p className="text-xs text-[#706B7D] dark:text-[#9E97B3] truncate">
                {createdReport
                  ? 'Chat with moderators in Settings → Reports & Support'
                  : 'You can chat with moderators while this is reviewed'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (submitStage !== 'submitting') closeReportModal();
            }}
            className="min-w-[44px] min-h-[44px] -mr-2 rounded-full flex items-center justify-center text-slate-400 dark:text-[#9E97B3] hover:text-black dark:hover:text-white hover:bg-[#FAF9FC] dark:hover:bg-[#171322] cursor-pointer shrink-0 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {createdReport ? (
          <div className="space-y-4 pt-1">
            <div className="p-4 rounded-2xl bg-[#FAF9FC] dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] space-y-1.5">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Sent to Campus Moderation</span>
              </div>
              <p className="text-xs text-[#706B7D] dark:text-[#9E97B3] leading-relaxed">
                Your ticket is open. You can reply or ask follow-up questions in{' '}
                <strong className="text-[#191525] dark:text-[#F4F2FA]">Settings → Reports &amp; Support</strong> before moderators close it.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => openTicketInSettings(createdReport.id)}
                className="flex-1 min-h-[44px] py-3 px-4 bg-[#5420F5] hover:bg-[#4314E2] text-white text-xs font-extrabold rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <MessageCircle className="w-4 h-4 shrink-0" />
                <span>Chat with Moderators</span>
              </button>
              <button
                type="button"
                onClick={closeReportModal}
                className="min-h-[44px] py-3 px-4 bg-slate-100 dark:bg-[#171322] hover:bg-slate-200 dark:hover:bg-[#201A32] text-slate-700 dark:text-[#D5D0E6] text-xs font-bold rounded-xl cursor-pointer transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {reportModalTarget.targetPreview && (
              <div className="p-3 bg-[#FAF9FC] dark:bg-[#171322] rounded-2xl border border-[#EAE6F0] dark:border-[#262036]">
                <p className="text-xs text-[#706B7D] dark:text-[#9E97B3] line-clamp-2 break-words">
                  &ldquo;{reportModalTarget.targetPreview}&rdquo;
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#191525] dark:text-[#F4F2FA]">
                {isSupportTicket ? 'Topic' : 'Reason'}
              </label>
              <div className="space-y-1.5">
                {reasonOptions.map((option) => {
                  const isSelected = selectedReason === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setSelectedReason(option)}
                      className={`w-full min-h-[44px] text-left py-2.5 px-3.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                        isSelected
                          ? 'bg-[#F0EBFF] dark:bg-[#231A45] border-[#5420F5]/40 text-[#5420F5] dark:text-[#A78BFA] font-bold'
                          : 'bg-[#FAF9FC] dark:bg-[#171322] border-[#EAE6F0] dark:border-[#262036] text-[#191525] dark:text-[#F4F2FA] hover:bg-slate-50 dark:hover:bg-[#201A32]'
                      }`}
                    >
                      <span>{option}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#191525] dark:text-[#F4F2FA] mb-1">
                Details{' '}
                <span className="font-normal text-[#706B7D] dark:text-[#9E97B3]">
                  {requiresDetails ? '(required)' : '(optional)'}
                </span>
              </label>
              <textarea
                rows={3}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Add any extra context for moderators..."
                className="w-full p-3 rounded-xl border border-[#EAE6F0] dark:border-[#262036] text-base sm:text-xs text-[#191525] dark:text-[#F4F2FA] bg-[#FAF9FC] dark:bg-[#171322] placeholder:text-slate-400 dark:placeholder:text-[#7D7594] focus:outline-none focus:border-[#5420F5] resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitStage !== 'idle'}
              className="w-full min-h-[44px] py-3 bg-[#5420F5] hover:bg-[#4314E2] text-white text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-75 disabled:cursor-not-allowed"
            >
              {submitStage === 'submitting' ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                  <span>Opening ticket...</span>
                </>
              ) : (
                <>
                  <Flag className="w-3.5 h-3.5 shrink-0" />
                  <span>Submit &amp; Start Chat</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
