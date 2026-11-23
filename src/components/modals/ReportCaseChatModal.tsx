import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Send,
  CheckCircle2,
  XCircle,
  Trash2,
  Plus,
} from 'lucide-react';
import { useBopoi } from '../../context/BopoiContext.tsx';
import { ModerationReport } from '../../types/index.ts';
import {
  getReportThreadMessages,
  getReportTypeLabel,
} from '../../lib/reportChat.ts';
import { SafetyShieldBadgeIcon } from '../brand/icons/index.ts';
import { MentionText } from '../ui/MentionText.tsx';

interface ReportCaseChatModalProps {
  report: ModerationReport;
  viewerRole: 'reporter' | 'moderator';
  onClose: () => void;
  targetContentPreview?: string;
}

const MOD_QUICK_REPLIES = [
  "Thanks — we're reviewing this now.",
  'Could you share any extra details?',
  "We've taken action on this report.",
];

export const ReportCaseChatModal: React.FC<ReportCaseChatModalProps> = ({
  report,
  viewerRole,
  onClose,
  targetContentPreview,
}) => {
  const {
    moderationReports,
    sendReportChatMessage,
    markReportChatRead,
    adminResolveReport,
    openReportModal,
  } = useBopoi();

  const [replyText, setReplyText] = useState('');
  const [resolutionNote, setResolutionNote] = useState('');
  const scrollEndRef = useRef<HTMLDivElement | null>(null);

  const liveReport =
    moderationReports.find((r) => r.id === report.id) || report;
  const threadMessages = getReportThreadMessages(liveReport);
  const isClosed = liveReport.status !== 'pending';
  const resolvedPreview = liveReport.targetPreview || targetContentPreview;

  useEffect(() => {
    markReportChatRead(liveReport.id, viewerRole);
  }, [liveReport.id, threadMessages.length, viewerRole]);

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [threadMessages.length]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    const ok = sendReportChatMessage(liveReport.id, replyText, viewerRole);
    if (ok) {
      setReplyText('');
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-[#0E0C14] text-[#191525] dark:text-[#F4F2FA] rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[88dvh] flex flex-col shadow-2xl border border-[#EAE6F0] dark:border-[#262036] overflow-hidden"
      >
        <div className="w-10 h-1 bg-[#EAE6F0] dark:bg-[#262036] rounded-full mx-auto mt-2.5 sm:hidden shrink-0" />

        {/* Clean Header matching Bopoi Settings & Convo Modals */}
        <div className="px-5 py-4 border-b border-[#EAE6F0] dark:border-[#262036] flex items-center justify-between gap-3 bg-white dark:bg-[#0E0C14] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#FAF9FC] dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] flex items-center justify-center shrink-0">
              <SafetyShieldBadgeIcon size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-[#191525] dark:text-[#F4F2FA] truncate">
                  {getReportTypeLabel(liveReport.targetType)}
                </h3>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize shrink-0 ${
                    liveReport.status === 'pending'
                      ? 'bg-[#F0EBFF] dark:bg-[#231A45] text-[#5420F5] dark:text-[#A78BFA]'
                      : liveReport.status === 'resolved'
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                      : 'bg-slate-100 dark:bg-[#171322] text-slate-600 dark:text-[#9E97B3]'
                  }`}
                >
                  {liveReport.status === 'pending' ? 'Open' : liveReport.status}
                </span>
              </div>
              <p className="text-xs text-[#706B7D] dark:text-[#9E97B3] truncate">
                {viewerRole === 'moderator'
                  ? `With @${liveReport.reporterUsername || 'student'} · ${liveReport.createdAt}`
                  : `Campus Moderation · ${liveReport.createdAt}`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] -mr-2 rounded-full flex items-center justify-center text-slate-400 dark:text-[#9E97B3] hover:text-black dark:hover:text-white hover:bg-[#FAF9FC] dark:hover:bg-[#171322] cursor-pointer shrink-0 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Reported Item Snippet (only if present and non-support-ticket) */}
        {resolvedPreview && liveReport.targetType !== 'support_ticket' && (
          <div className="px-5 py-2.5 bg-[#FAF9FC] dark:bg-[#171322] border-b border-[#EAE6F0] dark:border-[#262036] shrink-0">
            <p className="text-xs text-[#706B7D] dark:text-[#9E97B3] line-clamp-2 break-words">
              <span className="font-bold text-[#191525] dark:text-[#F4F2FA]">Reported:</span> &ldquo;{resolvedPreview}&rdquo;
            </p>
          </div>
        )}

        {/* Chat Thread */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 bg-[#FAF9FC]/60 dark:bg-[#09070D]/60">
          {threadMessages.map((msg) => {
            if (msg.senderRole === 'system') {
              return (
                <div key={msg.id} className="flex justify-center py-1">
                  <span className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] text-[11px] font-semibold text-[#706B7D] dark:text-[#9E97B3] text-center">
                    {msg.text}
                  </span>
                </div>
              );
            }

            const isOwnBubble =
              (viewerRole === 'reporter' && msg.senderRole === 'reporter') ||
              (viewerRole === 'moderator' && msg.senderRole === 'moderator');
            const isModMessage = msg.senderRole === 'moderator';

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isOwnBubble ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[84%] rounded-2xl px-3.5 py-2.5 space-y-1 border ${
                    isOwnBubble
                      ? 'bg-[#5420F5] text-white border-[#5420F5]'
                      : 'bg-white dark:bg-[#171322] text-[#191525] dark:text-[#F4F2FA] border-[#EAE6F0] dark:border-[#262036]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 text-[10px]">
                    <span
                      className={`font-bold ${
                        isOwnBubble
                          ? 'text-white/90'
                          : isModMessage
                          ? 'text-[#5420F5] dark:text-[#A78BFA]'
                          : 'text-[#706B7D] dark:text-[#9E97B3]'
                      }`}
                    >
                      {isOwnBubble
                        ? 'You'
                        : isModMessage
                        ? 'Campus Moderator'
                        : `@${msg.senderUsername || 'student'}`}
                    </span>
                    <span className={isOwnBubble ? 'text-white/75' : 'text-slate-400 dark:text-[#7D7594]'}>
                      {msg.createdAt}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed break-words select-text">
                    <MentionText text={msg.text} tone={isOwnBubble ? 'inverted' : 'default'} />
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={scrollEndRef} />
        </div>

        {/* Moderator Actions Bar (only visible to Moderators on open tickets) */}
        {viewerRole === 'moderator' && !isClosed && (
          <div className="px-4 py-2.5 bg-[#FAF9FC] dark:bg-[#171322] border-t border-[#EAE6F0] dark:border-[#262036] space-y-2 shrink-0">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {MOD_QUICK_REPLIES.map((qr) => (
                <button
                  key={qr}
                  type="button"
                  onClick={() => setReplyText(qr)}
                  className="min-h-[34px] px-2.5 py-1 rounded-xl bg-white dark:bg-[#0E0C14] border border-[#EAE6F0] dark:border-[#262036] hover:border-[#5420F5]/40 text-[11px] font-semibold text-[#191525] dark:text-[#F4F2FA] whitespace-nowrap cursor-pointer shrink-0"
                >
                  {qr}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <input
                type="text"
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                placeholder="Resolution note (optional)..."
                className="flex-1 min-w-[140px] min-h-[36px] px-3 py-1.5 rounded-xl bg-white dark:bg-[#0E0C14] border border-[#EAE6F0] dark:border-[#262036] text-xs text-[#191525] dark:text-[#F4F2FA] placeholder:text-slate-400 dark:placeholder:text-[#7D7594] focus:outline-none focus:border-[#5420F5]"
              />
              <button
                type="button"
                onClick={() =>
                  adminResolveReport(liveReport.id, 'resolved', {
                    deleteTarget: false,
                    adminNotes: resolutionNote.trim() || undefined,
                  })
                }
                className="min-h-[36px] px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Resolve</span>
              </button>
              {liveReport.targetType !== 'support_ticket' && (
                <button
                  type="button"
                  onClick={() =>
                    adminResolveReport(liveReport.id, 'resolved', {
                      deleteTarget: true,
                      banTargetUser: true,
                      adminNotes: resolutionNote.trim() || undefined,
                    })
                  }
                  className="min-h-[36px] px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete &amp; Ban</span>
                </button>
              )}
              <button
                type="button"
                onClick={() =>
                  adminResolveReport(liveReport.id, 'dismissed', {
                    adminNotes: resolutionNote.trim() || undefined,
                  })
                }
                className="min-h-[36px] px-3 py-1.5 rounded-xl bg-white dark:bg-[#0E0C14] border border-[#EAE6F0] dark:border-[#262036] hover:bg-slate-50 dark:hover:bg-[#201A32] text-xs font-bold text-[#706B7D] dark:text-[#9E97B3] hover:text-[#191525] dark:hover:text-[#F4F2FA] inline-flex items-center gap-1 cursor-pointer"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Dismiss</span>
              </button>
            </div>
          </div>
        )}

        {/* Composer / Closed Notice */}
        {isClosed && viewerRole === 'reporter' ? (
          <div className="p-4 border-t border-[#EAE6F0] dark:border-[#262036] bg-white dark:bg-[#0E0C14] flex items-center justify-between gap-3 shrink-0">
            <span className="text-xs text-[#706B7D] dark:text-[#9E97B3]">
              Ticket {liveReport.status}. Need more help?
            </span>
            <button
              type="button"
              onClick={() => {
                onClose();
                openReportModal({
                  targetType: 'support_ticket',
                  targetId: `support_${Date.now()}`,
                  targetLabel: 'Support Ticket',
                  defaultSubject: 'General Question',
                });
              }}
              className="min-h-[40px] px-3.5 py-2 bg-[#F0EBFF] dark:bg-[#231942] hover:bg-[#5420F5] text-[#5420F5] dark:text-[#B9A4FF] hover:text-white text-xs font-bold rounded-xl inline-flex items-center gap-1 cursor-pointer transition-colors shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Ticket</span>
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleSend}
            className="p-3.5 sm:p-4 border-t border-[#EAE6F0] dark:border-[#262036] bg-white dark:bg-[#0E0C14] flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder={
                viewerRole === 'moderator'
                  ? `Reply to @${liveReport.reporterUsername || 'student'}...`
                  : 'Write a message to moderators...'
              }
              className="flex-1 min-w-0 min-h-[44px] px-4 py-2.5 bg-[#FAF9FC] dark:bg-[#171322] border border-[#EAE6F0] dark:border-[#262036] rounded-xl text-base sm:text-xs text-[#191525] dark:text-[#F4F2FA] placeholder:text-slate-400 dark:placeholder:text-[#7D7594] focus:outline-none focus:border-[#5420F5]"
            />
            <button
              type="submit"
              disabled={!replyText.trim()}
              className={`min-w-[44px] min-h-[44px] p-2.5 rounded-xl font-bold transition-all flex items-center justify-center shrink-0 cursor-pointer ${
                replyText.trim()
                  ? 'bg-[#5420F5] text-white hover:bg-[#4314E2]'
                  : 'bg-slate-100 dark:bg-[#171322] text-slate-400 dark:text-[#7D7594] cursor-not-allowed'
              }`}
              aria-label="Send"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
