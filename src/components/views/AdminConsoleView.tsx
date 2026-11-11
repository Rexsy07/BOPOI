import React, { useState, useMemo } from 'react';
import { useBopoi } from '../../context/BopoiContext.tsx';
import {
  UserProfile,
  SocialPost,
  CommunityRoom,
  ActiveAppView,
} from '../../types/index.ts';
import { CampusCharacterAvatar } from '../brand/character/index.ts';
import { ADMIN_SQL_MIGRATION_SCRIPT } from '../../data/adminSqlScript.ts';
import {
  BopoiIcon,
  BopoiSearchIcon,
  AdminConsoleNavIcon,
  CampusMegaphoneIcon,
  RealPeopleIcon,
  StudentPostsIcon,
  CreateRoomIcon,
  InboxShortcutIcon,
  SafetyShieldBadgeIcon,
  DatabaseSqlIcon,
  SparklePolishIcon,
  RoomBadgeIcon,
} from '../brand/icons/index.ts';
import { RoomIconStudioPicker } from '../modals/RoomIconStudioPicker.tsx';
import {
  CheckCircle2,
  XCircle,
  Trash2,
  Edit3,
  Pin,
  Lock,
  Unlock,
  Plus,
  Copy,
  Check,
  ArrowLeft,
  RefreshCw,
  Eye,
  Ban,
  UserCheck,
  Send,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

type AdminModuleId =
  | 'overview'
  | 'users'
  | 'posts'
  | 'rooms-inbox'
  | 'moderation'
  | 'sql';

const ALL_27_TABLES = [
  'profiles',
  'user_safety_settings',
  'user_follows',
  'social_posts',
  'poll_options',
  'poll_votes',
  'post_likes',
  'post_bookmarks',
  'post_comments',
  'post_comment_likes',
  'anonymous_messages',
  'message_comments',
  'message_answers',
  'message_answer_likes',
  'community_rooms',
  'room_memberships',
  'room_assigned_personas',
  'room_messages',
  'room_message_likes',
  'room_message_reactions',
  'notifications',
  'push_subscriptions',
  'moderation_reports',
  'room_presence',
  'platform_settings',
  'campus_announcements',
  'admin_audit_logs',
];

export const AdminConsoleView: React.FC = () => {
  const {
    user,
    accounts,
    socialPosts,
    rooms,
    answers,
    allPlatformMessages,
    moderationReports,
    campusAnnouncements,
    adminAuditLogs,
    platformSettings,
    isAuthenticated,
    isAdminUnlocked,
    adminUpdateUser,
    adminDeleteUser,
    adminCreateUser,
    adminUpdatePost,
    deleteSocialPost,
    adminDeleteComment,
    adminUpdateRoom,
    deleteRoom,
    adminDeleteRoomMessage,
    adminDeleteAnonymousMessage,
    adminDeleteMessageComment,
    adminDeleteAnswer,
    adminResolveReport,
    adminBroadcastAnnouncement,
    adminToggleAnnouncementActive,
    adminDeleteAnnouncement,
    adminUpdatePlatformSettings,
    setActiveView,
    setSelectedPost,
    enterRoom,
    viewUserProfile,
    setIsCreateModalOpen,
    setIsCreateRoomModalOpen,
    resetToDemo,
    connectionStatus,
    showToast,
  } = useBopoi();

  const [activeModule, setActiveModule] = useState<AdminModuleId>('overview');

  // Module 1: Broadcast state
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastBody, setBroadcastBody] = useState('');
  const [broadcastCampus, setBroadcastCampus] = useState('All Campuses');
  const [broadcastSeverity, setBroadcastSeverity] = useState<'info' | 'celebration' | 'urgent'>('info');
  const [broadcastTargetView, setBroadcastTargetView] = useState<ActiveAppView>('home');

  // Module 2: Users state
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'admin' | 'verified' | 'suspended'>('all');
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [showCreateUserForm, setShowCreateUserForm] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserCampus, setNewUserCampus] = useState('University of Lagos');
  const [newUserRole, setNewUserRole] = useState<'student' | 'creator' | 'moderator' | 'admin'>('student');

  // Module 3: Posts, Polls, Confessions & Comments state
  const [postSearch, setPostSearch] = useState('');
  const [postTypeFilter, setPostTypeFilter] = useState<'all' | 'post' | 'confession' | 'poll' | 'discussion' | 'pinned'>('all');
  const [expandedPostCommentsId, setExpandedPostCommentsId] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<SocialPost | null>(null);

  // Module 4: Rooms, Chat & Anonymous Inbox state
  const [roomsInboxSubTab, setRoomsInboxSubTab] = useState<'rooms' | 'inbox' | 'answers'>('rooms');
  const [roomSearch, setRoomSearch] = useState('');
  const [expandedRoomId, setExpandedRoomId] = useState<string | null>(null);
  const [editingRoom, setEditingRoom] = useState<CommunityRoom | null>(null);
  const [inboxSearch, setInboxSearch] = useState('');
  const [expandedAnonMsgId, setExpandedAnonMsgId] = useState<string | null>(null);

  // Module 5: Reports, Support Tickets & Word Filters state
  const [reportFilter, setReportFilter] = useState<'all' | 'pending' | 'support_ticket' | 'resolved' | 'dismissed'>('all');
  const [newBlockedWord, setNewBlockedWord] = useState('');

  // Module 6: SQL Copy state
  const [copiedSql, setCopiedSql] = useState(false);

  // Windowed pagination states for high-concurrency scalability
  const [visibleUsersLimit, setVisibleUsersLimit] = useState(25);
  const [visiblePostsLimit, setVisiblePostsLimit] = useState(20);
  const [visibleInboxLimit, setVisibleInboxLimit] = useState(25);

  // Deduplicated directory of all users (including active user + accounts + post authors)
  const allUsersDirectory = useMemo(() => {
    const map = new Map<string, UserProfile>();
    accounts.forEach((acc) => {
      if (acc.username) {
        map.set(acc.username.toLowerCase(), acc);
      }
    });
    if (user && user.username && user.username !== 'student') {
      const existing = map.get(user.username.toLowerCase());
      map.set(user.username.toLowerCase(), existing ? { ...existing, ...user } : user);
    }
    socialPosts.forEach((p) => {
      if (!p.isAnonymous && p.authorUsername && p.authorUsername !== 'anon_student') {
        const key = p.authorUsername.toLowerCase();
        if (!map.has(key)) {
          map.set(key, {
            id: p.authorUserId || `usr_${key}`,
            username: p.authorUsername,
            displayName: p.authorName,
            email: `${key}@bopoi.edu.ng`,
            avatarUrl: p.authorAvatar || user.avatarUrl,
            bio: `Student at ${p.authorCampus || 'Chrisland University'}`,
            linkActive: true,
            followersCount: 0,
            followingCount: 0,
            campus: p.authorCampus || 'Chrisland University',
            role: p.authorIsVerified ? 'creator' : 'student',
            isVerified: Boolean(p.authorIsVerified),
            isCreator: Boolean(p.authorIsVerified),
          });
        }
      }
    });
    return Array.from(map.values());
  }, [user, accounts, socialPosts]);

  const pendingReportsCount = useMemo(
    () => moderationReports.filter((r) => r.status === 'pending').length,
    [moderationReports]
  );

  const totalCommentsCount = useMemo(
    () => socialPosts.reduce((acc, p) => acc + (p.comments?.length || p.commentsCount || 0), 0),
    [socialPosts]
  );

  const totalRoomMessagesCount = useMemo(
    () => rooms.reduce((acc, r) => acc + (r.messages?.length || 0), 0),
    [rooms]
  );

  const filteredUsers = useMemo(() => {
    return allUsersDirectory.filter((u) => {
      if (userRoleFilter === 'admin' && !u.isAdmin && u.role !== 'admin') return false;
      if (userRoleFilter === 'verified' && !u.isVerified && !u.isCreator) return false;
      if (userRoleFilter === 'suspended' && !u.isSuspended) return false;
      if (!userSearch.trim()) return true;
      const q = userSearch.toLowerCase();
      return (
        u.username.toLowerCase().includes(q) ||
        u.displayName.toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.campus || '').toLowerCase().includes(q)
      );
    });
  }, [allUsersDirectory, userRoleFilter, userSearch]);

  const filteredPosts = useMemo(() => {
    return socialPosts.filter((p) => {
      if (postTypeFilter === 'pinned' && !p.isPinned) return false;
      if (postTypeFilter !== 'all' && postTypeFilter !== 'pinned' && p.type !== postTypeFilter) {
        return false;
      }
      if (!postSearch.trim()) return true;
      const q = postSearch.toLowerCase();
      return (
        p.content.toLowerCase().includes(q) ||
        (p.title || '').toLowerCase().includes(q) ||
        p.authorName.toLowerCase().includes(q) ||
        p.authorUsername.toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q)
      );
    });
  }, [socialPosts, postTypeFilter, postSearch]);

  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      if (!roomSearch.trim()) return true;
      const q = roomSearch.toLowerCase();
      return (
        r.name.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q)
      );
    });
  }, [rooms, roomSearch]);

  const filteredInboxMessages = useMemo(() => {
    return allPlatformMessages.filter((m) => {
      if (!inboxSearch.trim()) return true;
      const q = inboxSearch.toLowerCase();
      return (
        m.text.toLowerCase().includes(q) ||
        m.recipientUsername.toLowerCase().includes(q) ||
        Boolean(m.comments?.some((c) => c.text.toLowerCase().includes(q)))
      );
    });
  }, [allPlatformMessages, inboxSearch]);

  const filteredReports = useMemo(() => {
    return moderationReports.filter((r) => {
      if (reportFilter === 'all') return true;
      if (reportFilter === 'support_ticket') return r.targetType === 'support_ticket';
      return r.status === reportFilter;
    });
  }, [moderationReports, reportFilter]);

  const handleCopySql = async () => {
    try {
      await navigator.clipboard.writeText(ADMIN_SQL_MIGRATION_SCRIPT);
      setCopiedSql(true);
      showToast('Complete 27-Table Admin SQL + RLS script copied!', 'success');
      setTimeout(() => setCopiedSql(false), 2500);
    } catch {
      showToast('Failed to copy SQL script', 'error');
    }
  };

  // ============================================================================
  // STRICT DATABASE ADMIN GUARD (PATH CLOSED FOR NON-ADMINS)
  // ============================================================================
  const isAuthorizedAdmin = Boolean(
    isAuthenticated &&
      isAdminUnlocked &&
      user.username &&
      user.username !== 'student' &&
      (user.isAdmin === true || user.role === 'admin')
  );

  React.useEffect(() => {
    if (!isAuthorizedAdmin) {
      setActiveView('home');
    }
  }, [isAuthorizedAdmin, setActiveView]);

  if (!isAuthorizedAdmin) {
    return null;
  }

  const navItems: {
    id: AdminModuleId;
    label: string;
    shortLabel: string;
    icon: React.ReactNode;
    badge?: number;
  }[] = [
    {
      id: 'overview',
      label: 'Overview & Broadcasts',
      shortLabel: 'Overview',
      icon: <CampusMegaphoneIcon size={18} />,
    },
    {
      id: 'users',
      label: 'Users, Roles & Bans',
      shortLabel: 'Users',
      icon: <RealPeopleIcon size={18} />,
      badge: allUsersDirectory.length,
    },
    {
      id: 'posts',
      label: 'Posts, Polls & Comments',
      shortLabel: 'Posts & Polls',
      icon: <StudentPostsIcon size={18} />,
      badge: socialPosts.length,
    },
    {
      id: 'rooms-inbox',
      label: 'Rooms & Anon Convos',
      shortLabel: 'Rooms & Inbox',
      icon: <CreateRoomIcon size={18} />,
      badge: rooms.length + allPlatformMessages.length,
    },
    {
      id: 'moderation',
      label: 'Reports, Tickets & Filters',
      shortLabel: 'Moderation',
      icon: <SafetyShieldBadgeIcon size={18} />,
      badge: pendingReportsCount,
    },
    {
      id: 'sql',
      label: 'SQL, RLS & Realtime',
      shortLabel: 'SQL & RLS',
      icon: <DatabaseSqlIcon size={18} />,
      badge: 27,
    },
  ];

  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* ============================================================================ */}
      {/* TOP ADMIN COMMAND BAR (MOBILE-FIRST & DESKTOP) */}
      {/* ============================================================================ */}
      <div className="bg-white rounded-3xl border border-[#EAE6F0] p-3.5 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-2xs">
        <div className="flex items-center justify-between sm:justify-start gap-3">
          <button
            type="button"
            onClick={() => setActiveView('home')}
            className="min-h-[44px] min-w-[44px] px-3 rounded-2xl bg-[#FAF9FC] hover:bg-[#F0EBFF] border border-[#EAE6F0] text-[#191525] text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            title="Return to Bopoi Feed"
          >
            <ArrowLeft className="w-4 h-4 text-[#5420F5]" />
            <span className="hidden xs:inline">App</span>
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#5420F5]">
                <AdminConsoleNavIcon size={18} />
                Admin Console
              </span>
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md ${
                  connectionStatus === 'connected'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-amber-50 text-amber-700'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    connectionStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                  }`}
                />
                Realtime {connectionStatus === 'connected' ? 'Live' : 'Syncing'}
              </span>
            </div>
            <p className="text-xs text-[#706B7D] truncate mt-0.5">
              Signed in as <span className="font-bold text-[#191525]">@{user.username || 'admin'}</span> • Full 27-Table RLS Override Active
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={resetToDemo}
            className="min-h-[44px] px-3.5 rounded-2xl bg-[#FAF9FC] hover:bg-slate-100 border border-[#EAE6F0] text-xs font-bold text-[#191525] flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#5420F5]" />
            <span>Sync DB</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveModule('sql')}
            className="min-h-[44px] px-3.5 rounded-2xl bg-[#F0EBFF] hover:bg-[#E4DCFF] text-xs font-black text-[#5420F5] flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <DatabaseSqlIcon size={16} />
            <span>SQL &amp; RLS</span>
          </button>
        </div>
      </div>

      {/* ============================================================================ */}
      {/* MOBILE HORIZONTAL TOUCH SWITCHER + DESKTOP SIDEBAR WORKSPACE */}
      {/* ============================================================================ */}
      <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 items-start">
        {/* Mobile Horizontal Module Switcher (44px+ touch hitboxes) */}
        <div className="w-full lg:w-64 shrink-0 bg-white rounded-3xl border border-[#EAE6F0] p-2 sm:p-3 sticky top-16 z-20 lg:static">
          <div className="flex lg:flex-col gap-1.5 overflow-x-auto no-scrollbar">
            {navItems.map((item) => {
              const isActive = activeModule === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveModule(item.id)}
                  className={`min-h-[44px] px-3.5 py-2.5 rounded-2xl text-xs font-extrabold transition-all flex items-center justify-between gap-2.5 cursor-pointer shrink-0 lg:w-full ${
                    isActive
                      ? 'bg-[#5420F5] text-white shadow-sm shadow-[#5420F5]/20'
                      : 'text-[#706B7D] hover:text-[#191525] hover:bg-[#FAF9FC]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {item.icon}
                    <span className="lg:hidden whitespace-nowrap">{item.shortLabel}</span>
                    <span className="hidden lg:inline whitespace-nowrap">{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span
                      className={`text-[10px] font-mono font-black px-1.5 py-0.5 rounded-md tabular-nums ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : item.id === 'moderation' && item.badge > 0
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-slate-100 text-[#191525]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Active Module Viewport */}
        <div className="flex-1 w-full min-w-0 space-y-5">
          {/* ======================================================================== */}
          {/* MODULE 1: OVERVIEW, KPI TELEMETRY & LIVE CAMPUS BROADCASTS */}
          {/* ======================================================================== */}
          {activeModule === 'overview' && (
            <div className="space-y-5">
              {/* High-Density KPI Grid (tabular-nums) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setActiveModule('users')}
                  className="bg-white rounded-3xl border border-[#EAE6F0] hover:border-[#5420F5]/40 p-4 text-left transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between text-[#706B7D] text-xs font-bold">
                    <span>Students &amp; Creators</span>
                    <RealPeopleIcon size={20} />
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-[#191525] font-mono tabular-nums mt-1.5">
                    {allUsersDirectory.length}
                  </div>
                  <div className="text-[11px] text-emerald-600 font-bold mt-1">
                    {allUsersDirectory.filter((u) => u.isVerified || u.isCreator).length} verified •{' '}
                    {allUsersDirectory.filter((u) => u.isSuspended).length} banned
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveModule('posts')}
                  className="bg-white rounded-3xl border border-[#EAE6F0] hover:border-[#5420F5]/40 p-4 text-left transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between text-[#706B7D] text-xs font-bold">
                    <span>Posts, Polls &amp; Replies</span>
                    <StudentPostsIcon size={20} />
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-[#191525] font-mono tabular-nums mt-1.5">
                    {socialPosts.length}
                  </div>
                  <div className="text-[11px] text-[#706B7D] font-bold mt-1 tabular-nums">
                    {totalCommentsCount} comments • {socialPosts.filter((p) => p.type === 'poll').length} polls
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRoomsInboxSubTab('rooms');
                    setActiveModule('rooms-inbox');
                  }}
                  className="bg-white rounded-3xl border border-[#EAE6F0] hover:border-[#5420F5]/40 p-4 text-left transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between text-[#706B7D] text-xs font-bold">
                    <span>Live Rooms &amp; Chat</span>
                    <CreateRoomIcon size={20} />
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-[#191525] font-mono tabular-nums mt-1.5">
                    {rooms.length}
                  </div>
                  <div className="text-[11px] text-[#706B7D] font-bold mt-1 tabular-nums">
                    {totalRoomMessagesCount} room messages
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRoomsInboxSubTab('inbox');
                    setActiveModule('rooms-inbox');
                  }}
                  className="bg-white rounded-3xl border border-[#EAE6F0] hover:border-[#5420F5]/40 p-4 text-left transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between text-[#706B7D] text-xs font-bold">
                    <span>Anon Q&amp;A &amp; Convos</span>
                    <InboxShortcutIcon size={20} />
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-[#191525] font-mono tabular-nums mt-1.5">
                    {allPlatformMessages.length}
                  </div>
                  <div className="text-[11px] text-[#706B7D] font-bold mt-1 tabular-nums">
                    {Object.keys(answers).length} story answers published
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveModule('moderation')}
                  className="bg-white rounded-3xl border border-[#EAE6F0] hover:border-rose-400/50 p-4 text-left transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between text-[#706B7D] text-xs font-bold">
                    <span>Reports &amp; Tickets</span>
                    <SafetyShieldBadgeIcon size={20} />
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-[#191525] font-mono tabular-nums mt-1.5">
                    {pendingReportsCount}
                  </div>
                  <div className="text-[11px] text-rose-600 font-bold mt-1 tabular-nums">
                    {moderationReports.length} total logged reports
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveModule('sql')}
                  className="bg-white rounded-3xl border border-[#EAE6F0] hover:border-emerald-400/50 p-4 text-left transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between text-[#706B7D] text-xs font-bold">
                    <span>Realtime RLS Tables</span>
                    <DatabaseSqlIcon size={20} />
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-[#191525] font-mono tabular-nums mt-1.5">
                    27 / 27
                  </div>
                  <div className="text-[11px] text-emerald-600 font-bold mt-1">
                    REPLICA IDENTITY FULL
                  </div>
                </button>
              </div>

              {/* Live Campus Announcement Broadcaster */}
              <div className="bg-white rounded-3xl border border-[#EAE6F0] p-4 sm:p-6 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h2 className="text-base font-black text-[#191525] flex items-center gap-2">
                      <CampusMegaphoneIcon size={20} />
                      <span>Broadcast Live Campus Announcement</span>
                    </h2>
                    <p className="text-xs text-[#706B7D] mt-0.5">
                      Pushes an instant real-time notification and pins a campus banner across student feeds.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    value={broadcastTitle}
                    onChange={(e) => setBroadcastTitle(e.target.value)}
                    placeholder="Headline (e.g., UNILAG Cultural Week Live Room Open!)"
                    className="sm:col-span-2 min-h-[44px] px-3.5 rounded-2xl bg-[#FAF9FC] border border-[#EAE6F0] text-xs font-bold text-[#191525] outline-none focus:border-[#5420F5]"
                  />
                  <select
                    value={broadcastCampus}
                    onChange={(e) => setBroadcastCampus(e.target.value)}
                    className="min-h-[44px] px-3.5 rounded-2xl bg-[#FAF9FC] border border-[#EAE6F0] text-xs font-bold text-[#191525] outline-none focus:border-[#5420F5]"
                  >
                    <option value="All Campuses">All Campuses</option>
                    <option value="University of Lagos">University of Lagos</option>
                    <option value="Chrisland University">Chrisland University</option>
                    <option value="Covenant University">Covenant University</option>
                    <option value="Babcock University">Babcock University</option>
                    <option value="Obafemi Awolowo University">Obafemi Awolowo University</option>
                    <option value="University of Ibadan">University of Ibadan</option>
                  </select>
                </div>

                <textarea
                  value={broadcastBody}
                  onChange={(e) => setBroadcastBody(e.target.value)}
                  rows={2}
                  placeholder="Write the announcement message that all students will receive in real time..."
                  className="w-full p-3.5 rounded-2xl bg-[#FAF9FC] border border-[#EAE6F0] text-xs font-medium text-[#191525] outline-none focus:border-[#5420F5] resize-none"
                />

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {(['info', 'celebration', 'urgent'] as const).map((sev) => (
                      <button
                        key={sev}
                        type="button"
                        onClick={() => setBroadcastSeverity(sev)}
                        className={`min-h-[40px] px-3 rounded-xl text-xs font-extrabold capitalize cursor-pointer transition-all ${
                          broadcastSeverity === sev
                            ? sev === 'urgent'
                              ? 'bg-rose-600 text-white'
                              : sev === 'celebration'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-[#5420F5] text-white'
                            : 'bg-[#FAF9FC] text-[#706B7D] border border-[#EAE6F0]'
                        }`}
                      >
                        {sev}
                      </button>
                    ))}

                    <select
                      value={broadcastTargetView}
                      onChange={(e) => setBroadcastTargetView(e.target.value as ActiveAppView)}
                      className="min-h-[40px] px-3 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] text-xs font-bold text-[#191525]"
                    >
                      <option value="home">Link to: Home Feed</option>
                      <option value="rooms">Link to: Anonymous Rooms</option>
                      <option value="confessions">Link to: Confessions</option>
                      <option value="polls">Link to: Campus Polls</option>
                      <option value="discover">Link to: Discover</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (!broadcastTitle.trim() || !broadcastBody.trim()) {
                        showToast('Please enter a title and message to broadcast.', 'error');
                        return;
                      }
                      adminBroadcastAnnouncement({
                        title: broadcastTitle,
                        body: broadcastBody,
                        campus: broadcastCampus,
                        severity: broadcastSeverity,
                        actionView: broadcastTargetView,
                      });
                      setBroadcastTitle('');
                      setBroadcastBody('');
                    }}
                    className="min-h-[44px] px-5 rounded-2xl bg-[#5420F5] hover:bg-[#4314E2] text-white text-xs font-black flex items-center gap-2 cursor-pointer shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Broadcast Now</span>
                  </button>
                </div>

                {/* Active Broadcasts List */}
                {campusAnnouncements.length > 0 && (
                  <div className="pt-3 border-t border-[#EAE6F0] space-y-2">
                    <span className="text-[11px] font-black uppercase tracking-wider text-[#706B7D]">
                      Recent Campus Broadcasts ({campusAnnouncements.length})
                    </span>
                    <div className="space-y-2">
                      {campusAnnouncements.map((ann) => (
                        <div
                          key={ann.id}
                          className="p-3 rounded-2xl bg-[#FAF9FC] border border-[#EAE6F0] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                                  ann.severity === 'urgent'
                                    ? 'bg-rose-100 text-rose-700'
                                    : ann.severity === 'celebration'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-purple-100 text-[#5420F5]'
                                }`}
                              >
                                {ann.campus}
                              </span>
                              <span className="text-xs font-black text-[#191525]">{ann.title}</span>
                              <span className="text-[11px] text-[#706B7D] font-mono">{ann.createdAt}</span>
                            </div>
                            <p className="text-xs text-[#706B7D] mt-1">{ann.body}</p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => adminToggleAnnouncementActive(ann.id)}
                              className={`min-h-[38px] px-3 rounded-xl text-xs font-bold cursor-pointer ${
                                ann.isActive
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-slate-200 text-slate-600'
                              }`}
                            >
                              {ann.isActive ? 'Active' : 'Paused'}
                            </button>
                            <button
                              type="button"
                              onClick={() => adminDeleteAnnouncement(ann.id)}
                              className="min-h-[38px] min-w-[38px] rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center cursor-pointer"
                              title="Delete Broadcast"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Live Admin Audit Stream */}
              <div className="bg-white rounded-3xl border border-[#EAE6F0] p-4 sm:p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-[#191525]">
                    Real-Time Admin Audit Log ({adminAuditLogs.length})
                  </h3>
                  <span className="text-[11px] font-mono text-[#706B7D]">public.admin_audit_logs</span>
                </div>
                {adminAuditLogs.length === 0 ? (
                  <p className="text-xs text-[#706B7D] py-4 text-center">
                    Every moderation action, role change, and broadcast will stream here in real time.
                  </p>
                ) : (
                  <div className="divide-y divide-[#EAE6F0] max-h-72 overflow-y-auto">
                    {adminAuditLogs.slice(0, 25).map((log) => (
                      <div key={log.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                        <div className="min-w-0">
                          <span className="font-mono font-bold text-[#5420F5] mr-2">
                            [{log.actionType}]
                          </span>
                          <span className="font-semibold text-[#191525]">{log.summary}</span>
                        </div>
                        <span className="text-[11px] font-mono text-[#706B7D] shrink-0 tabular-nums">
                          {log.createdAt}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================================== */}
          {/* MODULE 2: USERS, VERIFICATION, BANS & ROLE MANAGEMENT */}
          {/* ======================================================================== */}
          {activeModule === 'users' && (
            <div className="space-y-4">
              <div className="bg-white rounded-3xl border border-[#EAE6F0] p-4 sm:p-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-black text-[#191525]">
                      Users, Roles, Verification &amp; Bans ({filteredUsers.length})
                    </h2>
                    <p className="text-xs text-[#706B7D]">
                      Verify creators, grant admin roles, edit student profiles, pause anonymous links, or suspend accounts.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCreateUserForm(!showCreateUserForm)}
                    className="min-h-[44px] px-4 rounded-2xl bg-[#5420F5] hover:bg-[#4314E2] text-white text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add User / Admin</span>
                  </button>
                </div>

                {/* Provision New User Drawer */}
                {showCreateUserForm && (
                  <div className="p-4 rounded-2xl bg-[#FAF9FC] border border-[#EAE6F0] space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <input
                        type="text"
                        value={newUserName}
                        onChange={(e) => setNewUserName(e.target.value)}
                        placeholder="Display Name (e.g. Teni Campus)"
                        className="min-h-[44px] px-3.5 rounded-xl bg-white border border-[#EAE6F0] text-xs font-bold"
                      />
                      <input
                        type="text"
                        value={newUserUsername}
                        onChange={(e) => setNewUserUsername(e.target.value)}
                        placeholder="Username (e.g. teni_unilag)"
                        className="min-h-[44px] px-3.5 rounded-xl bg-white border border-[#EAE6F0] text-xs font-mono font-bold"
                      />
                      <input
                        type="email"
                        value={newUserEmail}
                        onChange={(e) => setNewUserEmail(e.target.value)}
                        placeholder="Email (optional)"
                        className="min-h-[44px] px-3.5 rounded-xl bg-white border border-[#EAE6F0] text-xs font-medium"
                      />
                      <select
                        value={newUserRole}
                        onChange={(e) => setNewUserRole(e.target.value as any)}
                        className="min-h-[44px] px-3.5 rounded-xl bg-white border border-[#EAE6F0] text-xs font-bold"
                      >
                        <option value="student">Role: Student</option>
                        <option value="creator">Role: Verified Creator</option>
                        <option value="moderator">Role: Campus Moderator</option>
                        <option value="admin">Role: Full Admin</option>
                      </select>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowCreateUserForm(false)}
                        className="min-h-[40px] px-3.5 rounded-xl text-xs font-bold text-[#706B7D]"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!newUserName.trim() || !newUserUsername.trim()) {
                            showToast('Display name and username are required', 'error');
                            return;
                          }
                          adminCreateUser({
                            displayName: newUserName,
                            username: newUserUsername,
                            email: newUserEmail,
                            campus: newUserCampus,
                            role: newUserRole,
                            isVerified: newUserRole !== 'student',
                          });
                          setNewUserName('');
                          setNewUserUsername('');
                          setNewUserEmail('');
                          setShowCreateUserForm(false);
                        }}
                        className="min-h-[40px] px-4 rounded-xl bg-[#5420F5] text-white text-xs font-black cursor-pointer"
                      >
                        Create Account
                      </button>
                    </div>
                  </div>
                )}

                {/* Search & Filter Controls */}
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <div className="relative flex-1">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center">
                      <BopoiSearchIcon size={16} />
                    </div>
                    <input
                      type="text"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="Search by @username, name, campus, or email..."
                      className="w-full min-h-[44px] pl-10 pr-4 rounded-2xl bg-[#FAF9FC] border border-[#EAE6F0] text-xs font-bold text-[#191525] outline-none focus:border-[#5420F5]"
                    />
                  </div>
                  <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                    {(['all', 'admin', 'verified', 'suspended'] as const).map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setUserRoleFilter(f)}
                        className={`min-h-[44px] px-3.5 rounded-2xl text-xs font-extrabold capitalize cursor-pointer shrink-0 ${
                          userRoleFilter === f
                            ? 'bg-[#191525] text-white'
                            : 'bg-[#FAF9FC] text-[#706B7D] border border-[#EAE6F0]'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Edit User Modal Drawer */}
              {editingUser && (
                <div className="bg-white rounded-3xl border-2 border-[#5420F5] p-4 sm:p-5 space-y-3 shadow-lg">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-[#191525]">
                      Editing Profile: @{editingUser.username}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setEditingUser(null)}
                      className="text-xs font-bold text-[#706B7D] hover:text-[#191525]"
                    >
                      Close
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-[#706B7D]">Display Name</label>
                      <input
                        type="text"
                        value={editingUser.displayName}
                        onChange={(e) =>
                          setEditingUser({ ...editingUser, displayName: e.target.value })
                        }
                        className="w-full min-h-[42px] px-3 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] text-xs font-bold mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-[#706B7D]">Campus</label>
                      <input
                        type="text"
                        value={editingUser.campus || ''}
                        onChange={(e) =>
                          setEditingUser({ ...editingUser, campus: e.target.value })
                        }
                        className="w-full min-h-[42px] px-3 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] text-xs font-bold mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-[#706B7D]">Account Role</label>
                      <select
                        value={editingUser.role || (editingUser.isAdmin ? 'admin' : editingUser.isCreator ? 'creator' : 'student')}
                        onChange={(e) => {
                          const nextRole = e.target.value as 'student' | 'creator' | 'moderator' | 'admin';
                          setEditingUser({
                            ...editingUser,
                            role: nextRole,
                            isAdmin: nextRole === 'admin',
                            isCreator: nextRole === 'creator' || Boolean(editingUser.isVerified),
                          });
                        }}
                        className="w-full min-h-[42px] px-3 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] text-xs font-bold mt-1"
                      >
                        <option value="student">Student</option>
                        <option value="creator">Verified Creator</option>
                        <option value="moderator">Campus Moderator</option>
                        <option value="admin">Full Admin</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-[#706B7D]">Anonymous Q&amp;A Link Status</label>
                      <button
                        type="button"
                        onClick={() =>
                          setEditingUser({ ...editingUser, linkActive: !editingUser.linkActive })
                        }
                        className={`w-full min-h-[42px] px-3 rounded-xl border text-xs font-bold mt-1 flex items-center justify-between cursor-pointer ${
                          editingUser.linkActive
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : 'bg-amber-50 border-amber-200 text-amber-700'
                        }`}
                      >
                        <span>{editingUser.linkActive ? 'Link Active (Receiving Q&A)' : 'Link Paused'}</span>
                        <span className="text-[10px] uppercase font-black">Toggle</span>
                      </button>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-[11px] font-bold text-[#706B7D]">Bio</label>
                      <input
                        type="text"
                        value={editingUser.bio}
                        onChange={(e) => setEditingUser({ ...editingUser, bio: e.target.value })}
                        className="w-full min-h-[42px] px-3 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] text-xs font-medium mt-1"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-[11px] font-bold text-[#706B7D]">Custom Anonymous Ask Prompt</label>
                      <input
                        type="text"
                        value={editingUser.customPrompt || ''}
                        onChange={(e) =>
                          setEditingUser({ ...editingUser, customPrompt: e.target.value })
                        }
                        className="w-full min-h-[42px] px-3 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] text-xs font-medium mt-1"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingUser(null)}
                      className="min-h-[42px] px-4 rounded-xl bg-slate-100 text-xs font-bold text-[#191525]"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        adminUpdateUser(editingUser.id || editingUser.username, {
                          displayName: editingUser.displayName,
                          campus: editingUser.campus,
                          bio: editingUser.bio,
                          customPrompt: editingUser.customPrompt,
                          role: editingUser.role,
                          isAdmin: editingUser.isAdmin,
                          isCreator: editingUser.isCreator,
                          linkActive: editingUser.linkActive,
                        });
                        setEditingUser(null);
                      }}
                      className="min-h-[42px] px-5 rounded-xl bg-[#5420F5] text-white text-xs font-black cursor-pointer"
                    >
                      Save User Changes
                    </button>
                  </div>
                </div>
              )}

              {/* Users List (Windowed for Maximum Users Performance) */}
              <div className="space-y-2.5">
                {filteredUsers.slice(0, visibleUsersLimit).map((u) => {
                  const isUserAdmin = Boolean(u.isAdmin || u.role === 'admin');
                  const isUserVerified = Boolean(u.isVerified || u.isCreator);
                  return (
                    <div
                      key={u.id || u.username}
                      className={`bg-white rounded-3xl border p-4 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        u.isSuspended
                          ? 'border-rose-300 bg-rose-50/30'
                          : 'border-[#EAE6F0]'
                      }`}
                    >
                      <div className="flex items-start sm:items-center gap-3 min-w-0">
                        <CampusCharacterAvatar
                          value={u.avatarUrl}
                          seed={u.username}
                          size={44}
                          rounded="full"
                          className="shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-black text-sm text-[#191525] truncate">
                              {u.displayName}
                            </span>
                            <span className="text-xs font-mono text-[#706B7D]">@{u.username}</span>
                            {isUserAdmin && (
                              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-[#F0EBFF] text-[#5420F5]">
                                Admin
                              </span>
                            )}
                            {u.role === 'moderator' && !isUserAdmin && (
                              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700">
                                Moderator
                              </span>
                            )}
                            {isUserVerified && (
                              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700">
                                Verified
                              </span>
                            )}
                            {u.isSuspended && (
                              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-rose-100 text-rose-700">
                                Suspended
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-[#706B7D] mt-0.5 flex items-center gap-2 flex-wrap">
                            <span>{u.campus || 'University of Lagos'}</span>
                            <span>•</span>
                            <span className="font-mono tabular-nums">{u.followersCount || 0} followers</span>
                            <span>•</span>
                            <button
                              type="button"
                              onClick={() =>
                                adminUpdateUser(u.id || u.username, {
                                  linkActive: !u.linkActive,
                                })
                              }
                              className={`font-bold underline decoration-dotted cursor-pointer ${
                                u.linkActive ? 'text-emerald-700' : 'text-amber-700'
                              }`}
                              title="Click to toggle user's anonymous link status"
                            >
                              Link: {u.linkActive ? 'Active' : 'Paused'}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Touch-Friendly Action Buttons */}
                      <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            adminUpdateUser(u.id || u.username, {
                              isVerified: !isUserVerified,
                              isCreator: !isUserVerified,
                            })
                          }
                          className={`min-h-[40px] px-3 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer ${
                            isUserVerified
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-[#FAF9FC] text-[#706B7D] border border-[#EAE6F0] hover:border-emerald-300 hover:text-emerald-700'
                          }`}
                          title={isUserVerified ? 'Click to Unverify User' : 'Click to Verify User'}
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>{isUserVerified ? 'Verified ✓' : 'Verify'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            adminUpdateUser(u.id || u.username, {
                              isAdmin: !isUserAdmin,
                              role: !isUserAdmin ? 'admin' : 'student',
                            })
                          }
                          className={`min-h-[40px] px-3 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer ${
                            isUserAdmin
                              ? 'bg-[#F0EBFF] text-[#5420F5] hover:bg-[#E4DBFF]'
                              : 'bg-[#FAF9FC] text-[#706B7D] border border-[#EAE6F0] hover:border-[#5420F5]/40 hover:text-[#5420F5]'
                          }`}
                          title={isUserAdmin ? 'Click to Revoke Admin Role' : 'Click to Grant Admin Role'}
                        >
                          <AdminConsoleNavIcon size={14} />
                          <span>{isUserAdmin ? 'Admin ✓' : 'Make Admin'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            adminUpdateUser(u.id || u.username, {
                              isSuspended: !u.isSuspended,
                              suspensionReason: !u.isSuspended ? 'Suspended by Campus Admin' : undefined,
                            })
                          }
                          className={`min-h-[40px] px-3 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer ${
                            u.isSuspended
                              ? 'bg-rose-600 text-white'
                              : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                          }`}
                        >
                          <Ban className="w-3.5 h-3.5" />
                          <span>{u.isSuspended ? 'Unban' : 'Ban'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setEditingUser(u)}
                          className="min-h-[40px] min-w-[40px] rounded-xl bg-[#FAF9FC] hover:bg-slate-100 border border-[#EAE6F0] text-[#191525] flex items-center justify-center cursor-pointer"
                          title="Edit User Profile"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => viewUserProfile(u)}
                          className="min-h-[40px] min-w-[40px] rounded-xl bg-[#FAF9FC] hover:bg-slate-100 border border-[#EAE6F0] text-[#5420F5] flex items-center justify-center cursor-pointer"
                          title="View Public Profile"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => adminDeleteUser(u.id || u.username)}
                          className="min-h-[40px] min-w-[40px] rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center cursor-pointer"
                          title="Delete User Account"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
                {filteredUsers.length > visibleUsersLimit && (
                  <button
                    type="button"
                    onClick={() => setVisibleUsersLimit((prev) => prev + 25)}
                    className="w-full min-h-[44px] rounded-2xl bg-white border border-[#EAE6F0] hover:border-[#5420F5]/40 text-xs font-black text-[#5420F5] cursor-pointer transition-all"
                  >
                    Show More Users ({filteredUsers.length - visibleUsersLimit} remaining)
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ======================================================================== */}
          {/* MODULE 3: ALL POSTS, POLLS, CONFESSIONS & NESTED COMMENTS */}
          {/* ======================================================================== */}
          {activeModule === 'posts' && (
            <div className="space-y-4">
              <div className="bg-white rounded-3xl border border-[#EAE6F0] p-4 sm:p-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-black text-[#191525]">
                      Posts, Polls, Confessions &amp; Comments ({filteredPosts.length})
                    </h2>
                    <p className="text-xs text-[#706B7D]">
                      Pin, feature, edit, or delete any social post, poll, confession, or nested comment in real time.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(true)}
                    className="min-h-[44px] px-4 rounded-2xl bg-[#5420F5] hover:bg-[#4314E2] text-white text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>New Post / Poll</span>
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5">
                  <div className="relative flex-1">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center">
                      <BopoiSearchIcon size={16} />
                    </div>
                    <input
                      type="text"
                      value={postSearch}
                      onChange={(e) => setPostSearch(e.target.value)}
                      placeholder="Search posts, confessions, polls, @authors, or categories..."
                      className="w-full min-h-[44px] pl-10 pr-4 rounded-2xl bg-[#FAF9FC] border border-[#EAE6F0] text-xs font-bold text-[#191525] outline-none focus:border-[#5420F5]"
                    />
                  </div>
                  <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                    {(['all', 'post', 'confession', 'poll', 'discussion', 'pinned'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setPostTypeFilter(t)}
                        className={`min-h-[44px] px-3.5 rounded-2xl text-xs font-extrabold capitalize cursor-pointer shrink-0 ${
                          postTypeFilter === t
                            ? 'bg-[#191525] text-white'
                            : 'bg-[#FAF9FC] text-[#706B7D] border border-[#EAE6F0]'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Edit Post Modal Drawer */}
              {editingPost && (
                <div className="bg-white rounded-3xl border-2 border-[#5420F5] p-4 sm:p-5 space-y-3 shadow-lg">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-[#191525]">
                      Editing {editingPost.type.toUpperCase()} by @{editingPost.authorUsername}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setEditingPost(null)}
                      className="text-xs font-bold text-[#706B7D]"
                    >
                      Close
                    </button>
                  </div>
                  {editingPost.title !== undefined && (
                    <input
                      type="text"
                      value={editingPost.title || ''}
                      onChange={(e) => setEditingPost({ ...editingPost, title: e.target.value })}
                      placeholder="Post Title"
                      className="w-full min-h-[42px] px-3.5 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] text-xs font-bold"
                    />
                  )}
                  <textarea
                    rows={3}
                    value={editingPost.content}
                    onChange={(e) => setEditingPost({ ...editingPost, content: e.target.value })}
                    className="w-full p-3.5 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] text-xs font-medium"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingPost(null)}
                      className="min-h-[40px] px-4 rounded-xl bg-slate-100 text-xs font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        adminUpdatePost(editingPost.id, {
                          title: editingPost.title,
                          content: editingPost.content,
                          category: editingPost.category,
                        });
                        setEditingPost(null);
                      }}
                      className="min-h-[40px] px-5 rounded-xl bg-[#5420F5] text-white text-xs font-black cursor-pointer"
                    >
                      Save Post Changes
                    </button>
                  </div>
                </div>
              )}

              {/* Posts List (Windowed for Maximum Users Performance) */}
              <div className="space-y-3">
                {filteredPosts.slice(0, visiblePostsLimit).map((post) => {
                  const commentsList = post.comments || [];
                  const isExpanded = expandedPostCommentsId === post.id;
                  return (
                    <div
                      key={post.id}
                      className="bg-white rounded-3xl border border-[#EAE6F0] p-4 sm:p-5 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-[#F0EBFF] text-[#5420F5]">
                              {post.type}
                            </span>
                            {post.isPinned && (
                              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                                Pinned
                              </span>
                            )}
                            {post.isFeatured && (
                              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                                Featured
                              </span>
                            )}
                            <span className="text-xs font-black text-[#191525]">
                              {post.authorName} (@{post.authorUsername})
                            </span>
                            <span className="text-[11px] font-mono text-[#706B7D]">{post.createdAt}</span>
                          </div>
                          {post.title && (
                            <h4 className="text-sm font-black text-[#191525] mt-1.5">{post.title}</h4>
                          )}
                          <p className="text-xs text-[#191525] leading-relaxed mt-1 break-words">
                            {post.content}
                          </p>
                        </div>
                      </div>

                      {/* Poll Options Preview if Poll */}
                      {post.pollOptions && post.pollOptions.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {post.pollOptions.map((opt) => (
                            <div
                              key={opt.id}
                              className="px-3 py-2 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] flex items-center justify-between text-xs"
                            >
                              <span className="font-bold text-[#191525] truncate">{opt.text}</span>
                              <span className="font-mono font-black text-[#5420F5] tabular-nums">
                                {opt.votes} votes
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Post Metrics & Admin Actions */}
                      <div className="pt-2 border-t border-[#EAE6F0] flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-3 text-[11px] font-mono font-bold text-[#706B7D] tabular-nums">
                          <span>{post.likes} likes</span>
                          <span>•</span>
                          <span>{commentsList.length || post.commentsCount} comments</span>
                          <span>•</span>
                          <span>{post.sharesCount} shares</span>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => adminUpdatePost(post.id, { isPinned: !post.isPinned })}
                            className={`min-h-[38px] px-3 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer ${
                              post.isPinned
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-[#FAF9FC] text-[#706B7D] border border-[#EAE6F0]'
                            }`}
                          >
                            <Pin className="w-3.5 h-3.5" />
                            <span>{post.isPinned ? 'Pinned' : 'Pin'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => adminUpdatePost(post.id, { isFeatured: !post.isFeatured })}
                            className={`min-h-[38px] px-3 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer ${
                              post.isFeatured
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-[#FAF9FC] text-[#706B7D] border border-[#EAE6F0]'
                            }`}
                          >
                            <SparklePolishIcon size={14} />
                            <span>{post.isFeatured ? 'Featured' : 'Feature'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setExpandedPostCommentsId(isExpanded ? null : post.id)
                            }
                            className="min-h-[38px] px-3 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] text-xs font-bold text-[#191525] flex items-center gap-1 cursor-pointer"
                          >
                            <span>Comments ({commentsList.length})</span>
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => setEditingPost(post)}
                            className="min-h-[38px] min-w-[38px] rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] text-[#191525] flex items-center justify-center cursor-pointer"
                            title="Edit Post"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPost(post);
                              setActiveView(post.type === 'poll' ? 'poll-detail' : 'post-detail');
                            }}
                            className="min-h-[38px] min-w-[38px] rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] text-[#5420F5] flex items-center justify-center cursor-pointer"
                            title="Open Post Detail"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => deleteSocialPost(post.id)}
                            className="min-h-[38px] min-w-[38px] rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center cursor-pointer"
                            title="Delete Post"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Expanded Comments Moderation List */}
                      {isExpanded && (
                        <div className="pt-3 border-t border-[#EAE6F0] space-y-2">
                          {commentsList.length === 0 ? (
                            <p className="text-xs text-[#706B7D]">No comments on this post yet.</p>
                          ) : (
                            commentsList.map((c) => (
                              <div
                                key={c.id}
                                className="p-2.5 rounded-2xl bg-[#FAF9FC] border border-[#EAE6F0] flex items-center justify-between gap-2 text-xs"
                              >
                                <div className="min-w-0">
                                  <span className="font-black text-[#191525]">
                                    {c.authorName} (@{c.authorUsername})
                                  </span>
                                  <span className="text-[10px] font-mono text-[#706B7D] ml-2">
                                    {c.createdAt}
                                  </span>
                                  <p className="text-xs text-[#191525] mt-0.5 break-words">{c.text}</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => adminDeleteComment(post.id, c.id)}
                                  className="min-h-[36px] px-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-[11px] font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Delete</span>
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                {filteredPosts.length > visiblePostsLimit && (
                  <button
                    type="button"
                    onClick={() => setVisiblePostsLimit((prev) => prev + 20)}
                    className="w-full min-h-[44px] rounded-2xl bg-white border border-[#EAE6F0] hover:border-[#5420F5]/40 text-xs font-black text-[#5420F5] cursor-pointer transition-all"
                  >
                    Show More Posts ({filteredPosts.length - visiblePostsLimit} remaining)
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ======================================================================== */}
          {/* MODULE 4: ANONYMOUS ROOMS, CHAT MESSAGES, INBOX Q&A & STORY ANSWERS */}
          {/* ======================================================================== */}
          {activeModule === 'rooms-inbox' && (
            <div className="space-y-4">
              {/* Sub-navigation bar */}
              <div className="bg-white rounded-3xl border border-[#EAE6F0] p-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  <button
                    type="button"
                    onClick={() => setRoomsInboxSubTab('rooms')}
                    className={`min-h-[42px] px-4 rounded-2xl text-xs font-black cursor-pointer ${
                      roomsInboxSubTab === 'rooms'
                        ? 'bg-[#5420F5] text-white'
                        : 'bg-[#FAF9FC] text-[#706B7D]'
                    }`}
                  >
                    Community Rooms ({rooms.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoomsInboxSubTab('inbox')}
                    className={`min-h-[42px] px-4 rounded-2xl text-xs font-black cursor-pointer ${
                      roomsInboxSubTab === 'inbox'
                        ? 'bg-[#5420F5] text-white'
                        : 'bg-[#FAF9FC] text-[#706B7D]'
                    }`}
                  >
                    Anon Inbox &amp; Convos ({allPlatformMessages.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoomsInboxSubTab('answers')}
                    className={`min-h-[42px] px-4 rounded-2xl text-xs font-black cursor-pointer ${
                      roomsInboxSubTab === 'answers'
                        ? 'bg-[#5420F5] text-white'
                        : 'bg-[#FAF9FC] text-[#706B7D]'
                    }`}
                  >
                    Story Studio Answers ({Object.keys(answers).length})
                  </button>
                </div>

                {roomsInboxSubTab === 'rooms' && (
                  <button
                    type="button"
                    onClick={() => setIsCreateRoomModalOpen(true)}
                    className="min-h-[42px] px-4 rounded-2xl bg-[#191525] text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Room</span>
                  </button>
                )}
              </div>

              {/* Sub-tab 1: Community Rooms & Live Chat Messages */}
              {roomsInboxSubTab === 'rooms' && (
                <div className="space-y-3">
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center">
                      <BopoiSearchIcon size={16} />
                    </div>
                    <input
                      type="text"
                      value={roomSearch}
                      onChange={(e) => setRoomSearch(e.target.value)}
                      placeholder="Search community rooms by name, description, or category..."
                      className="w-full min-h-[44px] pl-10 pr-4 rounded-2xl bg-white border border-[#EAE6F0] text-xs font-bold text-[#191525]"
                    />
                  </div>

                  {editingRoom && (
                    <div className="bg-white rounded-3xl border-2 border-[#5420F5] p-4 sm:p-5 space-y-4 shadow-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <RoomBadgeIcon
                            iconEmoji={editingRoom.iconEmoji}
                            iconBg={editingRoom.iconBg}
                            category={editingRoom.category}
                            roomName={editingRoom.name}
                            size="sm"
                          />
                          <h3 className="text-sm font-black text-[#191525]">
                            Edit Room &amp; Icon Studio: {editingRoom.name}
                          </h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditingRoom(null)}
                          className="text-xs font-bold text-[#706B7D] hover:text-[#191525]"
                        >
                          Close
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-bold text-[#706B7D]">Room Name</label>
                          <input
                            type="text"
                            value={editingRoom.name}
                            onChange={(e) => setEditingRoom({ ...editingRoom, name: e.target.value })}
                            className="w-full min-h-[42px] px-3.5 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] text-xs font-bold mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-[#706B7D]">Category</label>
                          <input
                            type="text"
                            value={editingRoom.category}
                            onChange={(e) => setEditingRoom({ ...editingRoom, category: e.target.value })}
                            className="w-full min-h-[42px] px-3.5 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] text-xs font-bold mt-1"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="text-[11px] font-bold text-[#706B7D]">Description</label>
                          <input
                            type="text"
                            value={editingRoom.description}
                            onChange={(e) =>
                              setEditingRoom({ ...editingRoom, description: e.target.value })
                            }
                            className="w-full min-h-[42px] px-3.5 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] text-xs font-medium mt-1"
                          />
                        </div>
                      </div>

                      <div className="pt-2 border-t border-[#EAE6F0]">
                        <RoomIconStudioPicker
                          iconEmoji={editingRoom.iconEmoji}
                          iconBg={editingRoom.iconBg}
                          roomName={editingRoom.name}
                          category={editingRoom.category}
                          onChange={(nextEmoji, nextBg) =>
                            setEditingRoom({
                              ...editingRoom,
                              iconEmoji: nextEmoji,
                              iconBg: nextBg,
                            })
                          }
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setEditingRoom(null)}
                          className="min-h-[40px] px-4 rounded-xl bg-slate-100 text-xs font-bold"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            adminUpdateRoom(editingRoom.id, {
                              name: editingRoom.name,
                              category: editingRoom.category,
                              description: editingRoom.description,
                              iconEmoji: editingRoom.iconEmoji,
                              iconBg: editingRoom.iconBg,
                            });
                            setEditingRoom(null);
                          }}
                          className="min-h-[40px] px-5 rounded-xl bg-[#5420F5] text-white text-xs font-black cursor-pointer"
                        >
                          Save Room &amp; Icon
                        </button>
                      </div>
                    </div>
                  )}

                  {filteredRooms.map((room) => {
                    const roomMsgs = room.messages || [];
                    const isExpanded = expandedRoomId === room.id;
                    return (
                      <div
                        key={room.id}
                        className="bg-white rounded-3xl border border-[#EAE6F0] p-4 sm:p-5 space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0">
                            <RoomBadgeIcon
                              iconEmoji={room.iconEmoji}
                              iconBg={room.iconBg}
                              category={room.category}
                              roomName={room.name}
                              size="md"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-black text-[#191525]">{room.name}</span>
                                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-[#F0EBFF] text-[#5420F5]">
                                  {room.category}
                                </span>
                                {room.isFeatured && (
                                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                                    Featured
                                  </span>
                                )}
                                {room.isAnonymousOnly && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                                    Masks Only
                                  </span>
                                )}
                                {room.isLocked && (
                                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-rose-100 text-rose-700">
                                    Locked
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-[#706B7D] mt-0.5">{room.description}</p>
                              <div className="text-[11px] font-mono text-[#706B7D] mt-1 tabular-nums">
                                {room.membersCount} members • {room.onlineCount || 1} online • {roomMsgs.length} messages
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() =>
                                adminUpdateRoom(room.id, { isFeatured: !room.isFeatured })
                              }
                              className={`min-h-[38px] px-3 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer ${
                                room.isFeatured
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-[#FAF9FC] text-[#706B7D] border border-[#EAE6F0]'
                              }`}
                              title="Toggle Featured Room"
                            >
                              <SparklePolishIcon size={13} />
                              <span>{room.isFeatured ? 'Featured' : 'Feature'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                adminUpdateRoom(room.id, { isAnonymousOnly: !room.isAnonymousOnly })
                              }
                              className={`min-h-[38px] px-3 rounded-xl text-xs font-bold cursor-pointer ${
                                room.isAnonymousOnly
                                  ? 'bg-[#F0EBFF] text-[#5420F5]'
                                  : 'bg-[#FAF9FC] text-[#706B7D] border border-[#EAE6F0]'
                              }`}
                            >
                              {room.isAnonymousOnly ? 'Anon Only' : 'Public/Anon'}
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                adminUpdateRoom(room.id, { isLocked: !room.isLocked })
                              }
                              className={`min-h-[38px] px-3 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer ${
                                room.isLocked
                                  ? 'bg-rose-600 text-white'
                                  : 'bg-[#FAF9FC] text-[#706B7D] border border-[#EAE6F0] hover:border-rose-300 hover:text-rose-700'
                              }`}
                            >
                              {room.isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                              <span>{room.isLocked ? 'Unlock' : 'Lock'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setExpandedRoomId(isExpanded ? null : room.id)}
                              className="min-h-[38px] px-3 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] text-xs font-bold text-[#191525] cursor-pointer"
                            >
                              Chat ({roomMsgs.length})
                            </button>

                            <button
                              type="button"
                              onClick={() => setEditingRoom(room)}
                              className="min-h-[38px] min-w-[38px] rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] flex items-center justify-center cursor-pointer"
                              title="Edit Room & Icon"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => enterRoom(room.id)}
                              className="min-h-[38px] min-w-[38px] rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] text-[#5420F5] flex items-center justify-center cursor-pointer"
                              title="Enter Room"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => deleteRoom(room.id)}
                              className="min-h-[38px] min-w-[38px] rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center cursor-pointer"
                              title="Delete Room"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="pt-3 border-t border-[#EAE6F0] space-y-2 max-h-72 overflow-y-auto">
                            {roomMsgs.length === 0 ? (
                              <p className="text-xs text-[#706B7D]">No messages in this room.</p>
                            ) : (
                              roomMsgs.map((m) => (
                                <div
                                  key={m.id}
                                  className="p-2.5 rounded-2xl bg-[#FAF9FC] border border-[#EAE6F0] flex items-center justify-between gap-2 text-xs"
                                >
                                  <div className="min-w-0">
                                    <span className="font-black text-[#191525]">
                                      {m.authorMaskEmoji || '🎭'} {m.authorAlias || m.authorName}
                                    </span>
                                    <span className="text-[10px] font-mono text-[#706B7D] ml-2">
                                      {m.createdAt}
                                    </span>
                                    {m.mediaUrl && (
                                      <div className="mt-1">
                                        {m.mediaType === 'video' ? (
                                          <video
                                            src={m.mediaUrl}
                                            controls
                                            playsInline
                                            preload="metadata"
                                            className="max-h-28 rounded-xl border border-[#EAE6F0]"
                                          />
                                        ) : (
                                          <img
                                            src={m.mediaUrl}
                                            alt={m.text || 'Room media'}
                                            className="max-h-28 rounded-xl border border-[#EAE6F0] object-cover"
                                          />
                                        )}
                                      </div>
                                    )}
                                    {m.text && (
                                      <p className="text-xs text-[#191525] mt-0.5 break-words">
                                        {m.text}
                                      </p>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => adminDeleteRoomMessage(room.id, m.id)}
                                    className="min-h-[36px] px-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-[11px] font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Delete</span>
                                  </button>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Sub-tab 2: Anonymous Inbox Messages & 1-on-1 Private Convos */}
              {roomsInboxSubTab === 'inbox' && (
                <div className="space-y-3">
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center">
                      <BopoiSearchIcon size={16} />
                    </div>
                    <input
                      type="text"
                      value={inboxSearch}
                      onChange={(e) => setInboxSearch(e.target.value)}
                      placeholder="Search anonymous messages, @recipient, or convo replies..."
                      className="w-full min-h-[44px] pl-10 pr-4 rounded-2xl bg-white border border-[#EAE6F0] text-xs font-bold text-[#191525]"
                    />
                  </div>

                  {filteredInboxMessages.length === 0 ? (
                    <div className="bg-white rounded-3xl border border-[#EAE6F0] p-8 text-center text-xs text-[#706B7D]">
                      No anonymous messages matching your filter.
                    </div>
                  ) : (
                    <>
                      {filteredInboxMessages.slice(0, visibleInboxLimit).map((msg) => {
                        const convoReplies = msg.comments || [];
                        const isExpanded = expandedAnonMsgId === msg.id;
                        return (
                          <div
                            key={msg.id}
                            className="bg-white rounded-3xl border border-[#EAE6F0] p-4 space-y-2.5"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-purple-100 text-[#5420F5]">
                                    To @{msg.recipientUsername}
                                  </span>
                                  {msg.isReported && (
                                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-rose-100 text-rose-700">
                                      Flagged
                                    </span>
                                  )}
                                  <span className="text-[11px] font-mono text-[#706B7D]">{msg.createdAt}</span>
                                </div>
                                <p className="text-xs font-semibold text-[#191525] mt-1.5 break-words">
                                  “{msg.text}”
                                </p>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedAnonMsgId(isExpanded ? null : msg.id)
                                  }
                                  className="min-h-[38px] px-3 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] text-xs font-bold text-[#191525] cursor-pointer"
                                >
                                  Convo ({convoReplies.length})
                                </button>
                                <button
                                  type="button"
                                  onClick={() => adminDeleteAnonymousMessage(msg.id)}
                                  className="min-h-[38px] min-w-[38px] rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center cursor-pointer"
                                  title="Delete Anonymous Message"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {isExpanded && (
                              <div className="pt-2.5 border-t border-[#EAE6F0] space-y-1.5">
                                {convoReplies.length === 0 ? (
                                  <p className="text-xs text-[#706B7D]">No 1-on-1 convo replies yet.</p>
                                ) : (
                                  convoReplies.map((reply) => (
                                    <div
                                      key={reply.id}
                                      className="p-2.5 rounded-2xl bg-[#FAF9FC] border border-[#EAE6F0] flex items-center justify-between gap-2 text-xs"
                                    >
                                      <div className="min-w-0">
                                        <span className="font-black text-[#191525]">
                                          {reply.authorName} ({reply.authorRole || 'sender'})
                                        </span>
                                        <p className="text-xs text-[#706B7D] mt-0.5 break-words">{reply.text}</p>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => adminDeleteMessageComment(msg.id, reply.id)}
                                        className="min-h-[34px] px-2.5 rounded-xl bg-rose-50 text-rose-600 text-[11px] font-bold cursor-pointer shrink-0"
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {filteredInboxMessages.length > visibleInboxLimit && (
                        <button
                          type="button"
                          onClick={() => setVisibleInboxLimit((prev) => prev + 25)}
                          className="w-full min-h-[44px] rounded-2xl bg-white border border-[#EAE6F0] hover:border-[#5420F5]/40 text-xs font-black text-[#5420F5] cursor-pointer transition-all"
                        >
                          Show More Messages ({filteredInboxMessages.length - visibleInboxLimit} remaining)
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Sub-tab 3: Public Story Studio Answers */}
              {roomsInboxSubTab === 'answers' && (
                <div className="space-y-3">
                  {Object.values(answers).length === 0 ? (
                    <div className="bg-white rounded-3xl border border-[#EAE6F0] p-8 text-center text-xs text-[#706B7D]">
                      No Story Studio answers published yet.
                    </div>
                  ) : (
                    Object.values(answers).map((ans) => (
                      <div
                        key={ans.id}
                        className="bg-white rounded-3xl border border-[#EAE6F0] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-[#5420F5]">
                              @{ans.authorUsername}
                            </span>
                            <span className="text-[11px] font-mono text-[#706B7D]">{ans.createdAt}</span>
                          </div>
                          <p className="text-xs text-[#706B7D] italic">Q: “{ans.questionText}”</p>
                          <p className="text-xs font-bold text-[#191525]">A: {ans.answerText}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => adminDeleteAnswer(ans.messageId)}
                          className="min-h-[40px] px-3.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete Answer</span>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* ======================================================================== */}
          {/* MODULE 5: REPORTS QUEUE, SUPPORT TICKETS & GLOBAL WORD FILTERS */}
          {/* ======================================================================== */}
          {activeModule === 'moderation' && (
            <div className="space-y-5">
              {/* Global Safety & Auto-Blocked Word Filters */}
              <div className="bg-white rounded-3xl border border-[#EAE6F0] p-4 sm:p-6 space-y-4">
                <div>
                  <h2 className="text-base font-black text-[#191525]">
                    Global Platform Switches &amp; Auto-Blocked Word Filters
                  </h2>
                  <p className="text-xs text-[#706B7D]">
                    Synced in real time via <code className="font-mono">public.platform_settings</code> across all campuses.
                  </p>
                </div>

                {/* Feature Switches */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      adminUpdatePlatformSettings({
                        allowAnonymousConfessions: !platformSettings.allowAnonymousConfessions,
                      })
                    }
                    className={`min-h-[52px] p-3.5 rounded-2xl border text-left flex items-center justify-between cursor-pointer ${
                      platformSettings.allowAnonymousConfessions
                        ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                        : 'bg-slate-100 border-slate-200 text-slate-600'
                    }`}
                  >
                    <span className="text-xs font-black">Anon Confessions</span>
                    <span className="text-[11px] font-mono font-bold">
                      {platformSettings.allowAnonymousConfessions ? 'ENABLED' : 'PAUSED'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      adminUpdatePlatformSettings({
                        allowNewRooms: !platformSettings.allowNewRooms,
                      })
                    }
                    className={`min-h-[52px] p-3.5 rounded-2xl border text-left flex items-center justify-between cursor-pointer ${
                      platformSettings.allowNewRooms
                        ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                        : 'bg-slate-100 border-slate-200 text-slate-600'
                    }`}
                  >
                    <span className="text-xs font-black">Student Room Creation</span>
                    <span className="text-[11px] font-mono font-bold">
                      {platformSettings.allowNewRooms ? 'ENABLED' : 'LOCKED'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      adminUpdatePlatformSettings({
                        maintenanceMode: !platformSettings.maintenanceMode,
                      })
                    }
                    className={`min-h-[52px] p-3.5 rounded-2xl border text-left flex items-center justify-between cursor-pointer ${
                      platformSettings.maintenanceMode
                        ? 'bg-rose-100 border-rose-300 text-rose-900'
                        : 'bg-[#FAF9FC] border-[#EAE6F0] text-[#191525]'
                    }`}
                  >
                    <span className="text-xs font-black">Read-Only Maintenance</span>
                    <span className="text-[11px] font-mono font-bold">
                      {platformSettings.maintenanceMode ? 'ACTIVE' : 'OFF'}
                    </span>
                  </button>
                </div>

                {/* Global Blocked Words Manager */}
                <div className="space-y-2.5 pt-2 border-t border-[#EAE6F0]">
                  <label className="block text-xs font-black text-[#191525]">
                    Global Auto-Blocked Keywords ({platformSettings.globalBlockedWords.length})
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newBlockedWord}
                      onChange={(e) => setNewBlockedWord(e.target.value)}
                      placeholder="Add word or phrase to block globally..."
                      className="flex-1 min-h-[44px] px-3.5 rounded-2xl bg-[#FAF9FC] border border-[#EAE6F0] text-xs font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const clean = newBlockedWord.trim().toLowerCase();
                        if (!clean) return;
                        if (!platformSettings.globalBlockedWords.includes(clean)) {
                          adminUpdatePlatformSettings({
                            globalBlockedWords: [...platformSettings.globalBlockedWords, clean],
                          });
                        }
                        setNewBlockedWord('');
                      }}
                      className="min-h-[44px] px-4 rounded-2xl bg-[#5420F5] text-white text-xs font-black cursor-pointer"
                    >
                      Add Word
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {platformSettings.globalBlockedWords.map((word) => (
                      <span
                        key={word}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] text-xs font-mono font-bold text-[#191525]"
                      >
                        <span>{word}</span>
                        <button
                          type="button"
                          onClick={() =>
                            adminUpdatePlatformSettings({
                              globalBlockedWords: platformSettings.globalBlockedWords.filter(
                                (w) => w !== word
                              ),
                            })
                          }
                          className="text-rose-500 hover:text-rose-700 cursor-pointer"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Reports & Support Tickets Triage Queue */}
              <div className="bg-white rounded-3xl border border-[#EAE6F0] p-4 sm:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-black text-[#191525]">
                      Moderation Reports &amp; Support Tickets ({filteredReports.length})
                    </h3>
                    <p className="text-xs text-[#706B7D]">
                      Triage flagged posts, anonymous messages, and student support requests in real time.
                    </p>
                  </div>
                  <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                    {(['all', 'pending', 'support_ticket', 'resolved', 'dismissed'] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setReportFilter(st)}
                        className={`min-h-[40px] px-3 rounded-xl text-xs font-extrabold capitalize cursor-pointer shrink-0 ${
                          reportFilter === st
                            ? 'bg-[#191525] text-white'
                            : 'bg-[#FAF9FC] text-[#706B7D] border border-[#EAE6F0]'
                        }`}
                      >
                        {st.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                {filteredReports.length === 0 ? (
                  <div className="py-10 text-center space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                    <p className="text-sm font-black text-[#191525]">Queue is all clear!</p>
                    <p className="text-xs text-[#706B7D]">
                      Any new user report or support ticket will appear here in real time.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {filteredReports.map((rep) => (
                      <div
                        key={rep.id}
                        className="p-4 rounded-2xl bg-[#FAF9FC] border border-[#EAE6F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                                rep.status === 'pending'
                                  ? 'bg-amber-100 text-amber-800'
                                  : rep.status === 'resolved'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {rep.status}
                            </span>
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-purple-100 text-[#5420F5]">
                              {rep.targetType}
                            </span>
                            {rep.reporterUsername && (
                              <span className="text-xs font-bold text-[#191525]">
                                Reported by @{rep.reporterUsername}
                              </span>
                            )}
                            <span className="text-[11px] font-mono text-[#706B7D]">{rep.createdAt}</span>
                          </div>
                          <p className="text-xs font-semibold text-[#191525] break-words">
                            {rep.reason}
                          </p>
                          <p className="text-[11px] font-mono text-[#706B7D]">
                            Target ID: {rep.targetId}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              adminResolveReport(rep.id, 'resolved', { deleteTarget: false })
                            }
                            className="min-h-[40px] px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Resolve</span>
                          </button>

                          {rep.targetType !== 'support_ticket' && (
                            <button
                              type="button"
                              onClick={() =>
                                adminResolveReport(rep.id, 'resolved', {
                                  deleteTarget: true,
                                  banTargetUser: true,
                                })
                              }
                              className="min-h-[40px] px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete Target &amp; Ban</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => adminResolveReport(rep.id, 'dismissed')}
                            className="min-h-[40px] px-3 rounded-xl bg-white border border-[#EAE6F0] text-xs font-bold text-[#706B7D] hover:text-[#191525] flex items-center gap-1 cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Dismiss</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================================== */}
          {/* MODULE 6: COMPLETE 27-TABLE SQL, UNIVERSAL RLS & REALTIME INSPECTOR */}
          {/* ======================================================================== */}
          {activeModule === 'sql' && (
            <div className="space-y-4">
              <div className="bg-white rounded-3xl border border-[#EAE6F0] p-4 sm:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-black text-[#191525]">
                      Complete 27-Table Admin SQL, Universal RLS &amp; Realtime Script
                    </h2>
                    <p className="text-xs text-[#706B7D]">
                      100% idempotent PostgreSQL migration with <code className="font-mono">public.is_admin()</code> RLS policies across all 27 tables, <code className="font-mono">REPLICA IDENTITY FULL</code>, and atomic moderation RPCs.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopySql}
                    className="min-h-[44px] px-5 rounded-2xl bg-[#5420F5] hover:bg-[#4314E2] text-white text-xs font-black flex items-center justify-center gap-2 cursor-pointer shrink-0 shadow-sm"
                  >
                    {copiedSql ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedSql ? 'Copied SQL Script!' : 'Copy Full SQL Script'}</span>
                  </button>
                </div>

                {/* 27-Table RLS & Realtime Verification Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {ALL_27_TABLES.map((tbl) => (
                    <div
                      key={tbl}
                      className="px-3 py-2 rounded-xl bg-[#FAF9FC] border border-[#EAE6F0] flex items-center justify-between gap-1.5"
                    >
                      <span className="text-[11px] font-mono font-bold text-[#191525] truncate">
                        {tbl}
                      </span>
                      <span className="text-[10px] font-black text-emerald-600 shrink-0">
                        RLS+RT
                      </span>
                    </div>
                  ))}
                </div>

                {/* SQL Code Viewer */}
                <div className="rounded-2xl bg-[#0F172A] text-slate-100 p-4 overflow-x-auto max-h-[520px] overflow-y-auto border border-slate-800">
                  <pre className="text-[11px] font-mono leading-relaxed">
                    <code>{ADMIN_SQL_MIGRATION_SCRIPT}</code>
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
