import { ModerationReport, ReportChatMessage } from '../types/index.ts';

export const REPORT_CASE_ENVELOPE_PREFIX = '__BOPOI_CASE_V1__:';

export interface ReportCaseEnvelope {
  __v: 1;
  notes?: string;
  targetPreview?: string;
  reporterLastReadAt?: number;
  moderatorLastReadAt?: number;
  messages: ReportChatMessage[];
}

export function formatReportRelativeTime(timestamp: number): string {
  const diffMs = Math.max(0, Date.now() - timestamp);
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

export function serializeReportCaseEnvelope(report: {
  adminNotes?: string;
  targetPreview?: string;
  reporterLastReadAt?: number;
  moderatorLastReadAt?: number;
  ticketMessages?: ReportChatMessage[];
}): string {
  const payload: ReportCaseEnvelope = {
    __v: 1,
    notes: report.adminNotes || undefined,
    targetPreview: report.targetPreview || undefined,
    reporterLastReadAt: report.reporterLastReadAt || undefined,
    moderatorLastReadAt: report.moderatorLastReadAt || undefined,
    messages: Array.isArray(report.ticketMessages) ? report.ticketMessages : [],
  };
  return `${REPORT_CASE_ENVELOPE_PREFIX}${JSON.stringify(payload)}`;
}

export function parseReportCaseEnvelope(rawAdminNotes?: string | null): {
  adminNotes?: string;
  targetPreview?: string;
  reporterLastReadAt?: number;
  moderatorLastReadAt?: number;
  ticketMessages: ReportChatMessage[];
} {
  if (!rawAdminNotes || typeof rawAdminNotes !== 'string') {
    return { ticketMessages: [] };
  }

  if (rawAdminNotes.startsWith(REPORT_CASE_ENVELOPE_PREFIX)) {
    try {
      const jsonStr = rawAdminNotes.slice(REPORT_CASE_ENVELOPE_PREFIX.length);
      const parsed = JSON.parse(jsonStr) as Partial<ReportCaseEnvelope>;
      return {
        adminNotes: typeof parsed.notes === 'string' && parsed.notes.trim() ? parsed.notes : undefined,
        targetPreview:
          typeof parsed.targetPreview === 'string' && parsed.targetPreview.trim()
            ? parsed.targetPreview
            : undefined,
        reporterLastReadAt:
          typeof parsed.reporterLastReadAt === 'number' ? parsed.reporterLastReadAt : undefined,
        moderatorLastReadAt:
          typeof parsed.moderatorLastReadAt === 'number' ? parsed.moderatorLastReadAt : undefined,
        ticketMessages: Array.isArray(parsed.messages)
          ? parsed.messages.filter((m) => m && typeof m.text === 'string')
          : [],
      };
    } catch {
      return { adminNotes: rawAdminNotes, ticketMessages: [] };
    }
  }

  return {
    adminNotes: rawAdminNotes,
    ticketMessages: [],
  };
}

export function getReportThreadMessages(report: ModerationReport): ReportChatMessage[] {
  const msgs = Array.isArray(report.ticketMessages) ? [...report.ticketMessages] : [];
  if (msgs.length === 0 && report.reason) {
    msgs.push({
      id: `init_${report.id}`,
      reportId: report.id,
      senderRole: 'reporter',
      senderName: report.reporterUsername ? `@${report.reporterUsername}` : 'Student',
      senderUsername: report.reporterUsername,
      text: report.reason,
      createdAt: report.createdAt || 'Just now',
      createdTimestamp: report.createdTimestamp || Date.now(),
    });
  }
  return msgs.sort((a, b) => (a.createdTimestamp || 0) - (b.createdTimestamp || 0));
}

export function getUnreadReportCountForReporter(report: ModerationReport): number {
  const msgs = getReportThreadMessages(report);
  const lastRead = report.reporterLastReadAt || 0;
  return msgs.filter(
    (m) => m.senderRole !== 'reporter' && (m.createdTimestamp || 0) > lastRead
  ).length;
}

export function getUnreadReportCountForModerator(report: ModerationReport): number {
  if (report.status !== 'pending') return 0;
  const msgs = getReportThreadMessages(report);
  const lastRead = report.moderatorLastReadAt || 0;
  return msgs.filter(
    (m) => m.senderRole === 'reporter' && (m.createdTimestamp || 0) > lastRead
  ).length;
}

export function getReportTypeLabel(targetType: string): string {
  switch (targetType) {
    case 'support_ticket':
      return 'Support Ticket';
    case 'social_post':
      return 'Post Report';
    case 'anonymous_message':
      return 'Inbox Message Report';
    case 'post_comment':
      return 'Comment Report';
    case 'room_message':
      return 'Room Message Report';
    case 'user_profile':
    case 'user':
      return 'User Safety Report';
    default:
      return 'Safety Report';
  }
}

export function mergeModerationReports(
  incoming: ModerationReport[],
  existing: ModerationReport[]
): ModerationReport[] {
  const map = new Map<string, ModerationReport>();

  const upsert = (rep: ModerationReport) => {
    const prev = map.get(rep.id);
    if (!prev) {
      map.set(rep.id, rep);
      return;
    }

    // Merge ticket messages by ID without losing either side's messages
    const msgMap = new Map<string, ReportChatMessage>();
    for (const m of prev.ticketMessages || []) {
      msgMap.set(m.id, m);
    }
    for (const m of rep.ticketMessages || []) {
      msgMap.set(m.id, m);
    }
    const mergedMessages = Array.from(msgMap.values()).sort(
      (a, b) => (a.createdTimestamp || 0) - (b.createdTimestamp || 0)
    );

    // Prefer non-pending resolution status if either is resolved/dismissed
    const mergedStatus =
      rep.status !== 'pending'
        ? rep.status
        : prev.status !== 'pending'
        ? prev.status
        : 'pending';

    map.set(rep.id, {
      ...prev,
      ...rep,
      status: mergedStatus,
      targetPreview: rep.targetPreview || prev.targetPreview,
      adminNotes: rep.adminNotes || prev.adminNotes,
      reporterLastReadAt: Math.max(prev.reporterLastReadAt || 0, rep.reporterLastReadAt || 0) || undefined,
      moderatorLastReadAt: Math.max(prev.moderatorLastReadAt || 0, rep.moderatorLastReadAt || 0) || undefined,
      ticketMessages: mergedMessages,
    });
  };

  existing.forEach(upsert);
  incoming.forEach(upsert);

  return Array.from(map.values()).sort((a, b) => {
    const aLatest = Math.max(
      a.createdTimestamp || 0,
      ...(a.ticketMessages || []).map((m) => m.createdTimestamp || 0)
    );
    const bLatest = Math.max(
      b.createdTimestamp || 0,
      ...(b.ticketMessages || []).map((m) => m.createdTimestamp || 0)
    );
    return bLatest - aLatest;
  });
}
