import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  UserProfile,
  AnonymousMessage,
  MessageAnswer,
  SafetySettings,
  StudentAppTab,
  ActiveAppView,
  InboxFilter,
  SocialPost,
  SocialPostType,
  CommunityRoom,
  RoomMessage,
  CreatorProfile,
  SocialComment,
  RoomAssignedPersona,
  AppNotification,
  ModerationReport,
  CampusAnnouncement,
  AdminAuditLog,
  PlatformSettings,
} from '../types/index.ts';
import {
  persistRoomPersona,
  getSavedRoomPersona,
  removeRoomPersona,
} from '../utils/roomPersonas.ts';
import {
  generateDeterministicCharacter,
  serializeCharacterConfig,
  parseCharacterConfig,
  CHARACTER_MOODS,
  CharacterMoodOption,
  applyMoodToAvatarUrl,
} from '../components/brand/character/index.ts';
import {
  realtimeManager,
  ConnectionStatus,
  syncCharacterToBackendStore,
  getCharacterFromBackendStore,
  fetchSyncedSocialPosts,
  fetchSyncedRooms,
  fetchSyncedMessages,
  fetchSyncedAnswers,
} from '../utils/realtimeManager.ts';
import {
  supabase,
  isSupabaseConfigured,
  getOrCreateAnonymousSenderToken,
  fetchSupabaseProfiles,
  fetchSupabaseNotifications,
  fetchSupabaseAdminData,
  subscribeToSupabaseRealtime,
  getAdminUserOverrides,
  saveAdminUserOverride,
  getAdminCreatedUsers,
  saveAdminCreatedUser,
  markAdminDeletedUser,
  saveAdminRoomOverride,
  markAdminDeletedRoom,
  markAdminDeletedRoomMessage,
  saveAdminPostOverride,
  markAdminDeletedPost,
  markAdminDeletedComment,
  markAdminDeletedAnonMessage,
  markAdminDeletedAnswer,
  FollowEdge,
  getLocalFollowEdges,
  saveLocalFollowEdges,
  markLocalFollowEdge,
  getLocalUnfollowTombstones,
  executeActivationPipeline,
  triggerPostVectorGeneration,
  invalidateGraphCacheForUser,
  recordPostBanditInteraction,
} from '../lib/supabase.ts';
import { initRealtimeSubscriptions } from '../services/realtime.ts';

export type LegalDocumentType = 'terms' | 'privacy' | 'guidelines' | null;

const bopoiQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2000,
      refetchInterval: 4000,
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
});

// Fast O(N) structural equality helpers to avoid expensive JSON.stringify on large state trees
function arePostsEqualFast(a: SocialPost[], b: SocialPost[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const pa = a[i];
    const pb = b[i];
    if (
      pa.id !== pb.id ||
      pa.likes !== pb.likes ||
      pa.commentsCount !== pb.commentsCount ||
      pa.sharesCount !== pb.sharesCount ||
      pa.pollTotalVotes !== pb.pollTotalVotes ||
      pa.hasLiked !== pb.hasLiked ||
      pa.isBookmarked !== pb.isBookmarked ||
      pa.userVotedOptionId !== pb.userVotedOptionId ||
      pa.isPinned !== pb.isPinned ||
      pa.isFeatured !== pb.isFeatured ||
      pa.authorIsVerified !== pb.authorIsVerified ||
      pa.authorName !== pb.authorName ||
      pa.category !== pb.category ||
      pa.content !== pb.content ||
      pa.title !== pb.title ||
      (pa.comments?.length || 0) !== (pb.comments?.length || 0)
    ) {
      return false;
    }
  }
  return true;
}

function areRoomsEqualFast(a: CommunityRoom[], b: CommunityRoom[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const ra = a[i];
    const rb = b[i];
    const maLen = ra.messages?.length || 0;
    const mbLen = rb.messages?.length || 0;
    if (
      ra.id !== rb.id ||
      ra.name !== rb.name ||
      ra.description !== rb.description ||
      ra.category !== rb.category ||
      ra.iconEmoji !== rb.iconEmoji ||
      ra.iconBg !== rb.iconBg ||
      ra.membersCount !== rb.membersCount ||
      ra.onlineCount !== rb.onlineCount ||
      ra.isJoined !== rb.isJoined ||
      ra.isLocked !== rb.isLocked ||
      ra.isFeatured !== rb.isFeatured ||
      ra.isAnonymousOnly !== rb.isAnonymousOnly ||
      maLen !== mbLen ||
      (maLen > 0 && ra.messages![maLen - 1].id !== rb.messages![mbLen - 1].id)
    ) {
      return false;
    }
  }
  return true;
}

function areMessagesEqualFast(a: AnonymousMessage[], b: AnonymousMessage[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const ma = a[i];
    const mb = b[i];
    if (
      ma.id !== mb.id ||
      ma.isRead !== mb.isRead ||
      ma.isAnswered !== mb.isAnswered ||
      ma.isReported !== mb.isReported ||
      ma.likes !== mb.likes ||
      ma.repliesCount !== mb.repliesCount ||
      (ma.comments?.length || 0) !== (mb.comments?.length || 0)
    ) {
      return false;
    }
  }
  return true;
}

function getLocalRoomMemberships(userKey: string): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(`bopoi_room_memberships_${(userKey || 'guest').toLowerCase()}`);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocalRoomMembership(userKey: string, roomId: string, isJoined: boolean) {
  try {
    const key = `bopoi_room_memberships_${(userKey || 'guest').toLowerCase()}`;
    const current = getLocalRoomMemberships(userKey);
    current[roomId] = isJoined;
    localStorage.setItem(key, JSON.stringify(current));
  } catch {
    // ignore
  }
}

interface ToastInfo {
  id: string;
  message: string;
  type?: 'success' | 'info' | 'error';
}

export interface ConfirmDialogState {
  title: string;
  description: string;
  badge?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary' | 'warning';
  icon?:
    | 'delete'
    | 'join'
    | 'leave'
    | 'follow'
    | 'unfollow'
    | 'logout'
    | 'lock'
    | 'unlock'
    | 'shield'
    | 'sparkle'
    | 'verify'
    | 'default';
  roomPreview?: {
    name: string;
    category: string;
    description: string;
    iconEmoji: string;
    iconBg: string;
    membersCount: number;
    onlineCount: number;
    isAnonymousOnly?: boolean;
    isJoined?: boolean;
  };
  onConfirm: () => void;
}

interface BopoiContextType {
  user: UserProfile;
  messages: AnonymousMessage[];
  answers: Record<string, MessageAnswer>;
  safetySettings: SafetySettings;
  activeTab: StudentAppTab;
  activeView: ActiveAppView;
  selectedMessage: AnonymousMessage | null;
  selectedAnswer: MessageAnswer | null;
  inboxFilter: InboxFilter;
  deviceMode: 'frame' | 'fullscreen';
  toasts: ToastInfo[];
  unreadCount: number;

  // Real-time Notifications
  notifications: AppNotification[];
  unreadNotificationsCount: number;
  markNotificationsRead: (notificationId?: string) => void;

  // Navigation & View Actions
  setActiveTab: (tab: StudentAppTab) => void;
  setActiveView: (view: ActiveAppView) => void;
  goBack: (fallbackView?: ActiveAppView) => void;
  setSelectedMessage: (msg: AnonymousMessage | null) => void;
  setSelectedAnswer: (ans: MessageAnswer | null) => void;
  setInboxFilter: (filter: InboxFilter) => void;
  setDeviceMode: (mode: 'frame' | 'fullscreen') => void;
  showToast: (message: string, type?: 'success' | 'info' | 'error') => void;

  // Multi-Account & Auth Actions
  accounts: UserProfile[];
  isAuthenticated: boolean;
  loginAccount: (usernameOrEmail: string, password?: string) => { success: boolean; error?: string };
  registerAccount: (params: {
    displayName: string;
    username: string;
    email: string;
    password?: string;
    campus?: string;
    bio?: string;
    avatarUrl: string;
    selectedTags?: string[];
    facultyId?: string;
  }) => { success: boolean; error?: string };
  switchAccount: (username: string) => void;
  logoutAccount: () => void;

  // Public Ask Target Recipient
  askingRecipient: UserProfile | CreatorProfile | null;
  setAskingRecipient: (recipient: UserProfile | CreatorProfile | null) => void;
  openPublicAskFor: (recipient?: UserProfile | CreatorProfile | string | null) => void;
  toggleAnswerLike: (messageId: string) => void;

  // Domain Actions
  sendAnonymousMessage: (recipientUsername: string, text: string) => { success: boolean; error?: string };
  markAsRead: (messageId: string) => void;
  toggleLinkActive: () => void;
  saveAnswer: (messageId: string, answerText: string, isPublic: boolean, isDraft?: boolean) => void;
  deleteMessage: (messageId: string) => void;
  reportMessage: (messageId: string, reason: string) => void;
  blockSender: (messageId: string) => void;
  unblockSender: (senderId: string) => void;
  clearBlockedSenders: () => void;
  submitSupportTicket: (subject: string, message: string) => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  addHiddenWord: (word: string) => void;
  removeHiddenWord: (word: string) => void;
  copyUserLink: (usernameOverride?: string) => Promise<boolean>;
  resetToDemo: () => void;
  addReaction: (messageId: string, emoji: string) => void;
  toggleLike: (messageId: string) => void;
  addComment: (messageId: string, text: string, role?: 'recipient' | 'sender' | boolean) => void;
  getUnreadConvoCount: (msg: AnonymousMessage, viewerRole?: 'recipient' | 'sender') => number;
  markConvoAsRead: (messageId: string, viewerRole?: 'recipient' | 'sender') => void;
  lastSentMessageId: string | null;
  setLastSentMessageId: (id: string | null) => void;
  sentMessages: AnonymousMessage[];
  sentMessageIds: string[];

  // Social Platform Additions
  socialPosts: SocialPost[];
  rooms: CommunityRoom[];
  creators: CreatorProfile[];
  feedTab: 'for-you' | 'latest' | 'trending';
  setFeedTab: (tab: 'for-you' | 'latest' | 'trending') => void;
  selectedPost: SocialPost | null;
  setSelectedPost: (post: SocialPost | null) => void;
  sharingPost: SocialPost | null;
  setSharingPost: (post: SocialPost | null) => void;
  openPostShare: (post: SocialPost) => void;
  incrementPostShare: (postId: string) => void;
  isCreateModalOpen: boolean;
  setIsCreateModalOpen: (open: boolean) => void;
  togglePostLike: (postId: string) => void;
  togglePostBookmark: (postId: string) => void;
  votePoll: (postId: string, optionId: string) => void;
  addPostComment: (
    postId: string,
    text: string,
    parentId?: string,
    replyToAuthor?: string,
    isAnonymous?: boolean,
    characterMood?: string
  ) => void;
  toggleCommentLike: (postId: string, commentId: string) => void;
  toggleJoinRoom: (roomId: string) => void;
  toggleFollowCreator: (creatorId: string) => void;
  followEdges: FollowEdge[];
  getFollowersForUser: (usernameOrId?: string) => CreatorProfile[];
  getFollowingForUser: (usernameOrId?: string) => CreatorProfile[];
  isFollowingUser: (usernameOrId?: string) => boolean;
  selectedRoomId: string | null;
  setSelectedRoomId: (id: string | null) => void;
  enterRoom: (roomId: string) => void;
  isCreateRoomModalOpen: boolean;
  setIsCreateRoomModalOpen: (open: boolean) => void;
  createRoom: (params: {
    name: string;
    description: string;
    category: string;
    iconEmoji: string;
    iconBg: string;
    starterMessage?: string;
    isAnonymousOnly?: boolean;
    creatorAlias?: string;
    tags?: string[];
  }) => CommunityRoom;
  deleteRoom: (roomId: string) => void;
  updateRoomIcon: (roomId: string, iconEmoji: string, iconBg: string) => void;
  sendRoomMessage: (
    roomId: string,
    text: string,
    isAnonymous?: boolean,
    authorAlias?: string,
    replyTo?: RoomMessage['replyTo'],
    authorMaskEmoji?: string
  ) => void;
  toggleRoomMessageLike: (roomId: string, messageId: string) => void;
  addRoomMessageReaction: (roomId: string, messageId: string, emoji: string) => void;
  assignPersonaToRoom: (roomId: string, persona: RoomAssignedPersona) => void;
  getRoomPersona: (roomId: string) => RoomAssignedPersona | null;
  selectedPublicUser: CreatorProfile | UserProfile | null;
  setSelectedPublicUser: (u: CreatorProfile | UserProfile | null) => void;
  viewUserProfile: (
    userOrUsername: string | UserProfile | CreatorProfile,
    isAnonymousContext?: boolean,
    campusContext?: string
  ) => void;
  createSocialPost: (newPost: {
    type: SocialPostType;
    content: string;
    title?: string;
    category?: string;
    hashtags?: string[];
    isAnonymous?: boolean;
    pollOptions?: { text: string }[];
    characterMood?: string;
  }) => SocialPost;
  deleteSocialPost: (postId: string) => void;
  reportPost: (postId: string, reason?: string) => void;

  // Real-time Connection & Sync
  connectionStatus: ConnectionStatus;
  reconnectRealtime: () => void;

  // Character Moods / Emotes & Backend Sync
  characterMood: string;
  setCharacterMood: (moodId: string) => void;
  availableMoods: CharacterMoodOption[];
  syncCharacterConfig: (avatarUrl: string, moodId?: string) => void;

  // Global Search & Legal Docs & Comment Deep-Link Sharing
  isSearchModalOpen: boolean;
  setIsSearchModalOpen: (open: boolean) => void;
  globalSearchQuery: string;
  setGlobalSearchQuery: (q: string) => void;
  activeLegalDoc: LegalDocumentType;
  openLegalDoc: (doc: LegalDocumentType) => void;
  highlightedCommentId: string | null;
  setHighlightedCommentId: (id: string | null) => void;
  shareCommentLink: (postId: string, commentId: string, authorName?: string) => void;

  // Real-Time Admin Console State & Actions (Strictly Database Role-Based)
  isAdminUnlocked: boolean;
  moderationReports: ModerationReport[];
  campusAnnouncements: CampusAnnouncement[];
  adminAuditLogs: AdminAuditLog[];
  platformSettings: PlatformSettings;
  allPlatformMessages: AnonymousMessage[];
  adminUpdateUser: (targetUserId: string, updates: Partial<UserProfile>) => void;
  adminDeleteUser: (targetUserId: string) => void;
  adminCreateUser: (params: {
    displayName: string;
    username: string;
    email: string;
    campus: string;
    role: 'student' | 'creator' | 'moderator' | 'admin';
    isVerified?: boolean;
  }) => void;
  adminUpdatePost: (postId: string, updates: Partial<SocialPost>) => void;
  adminDeleteComment: (postId: string, commentId: string) => void;
  adminUpdateRoom: (roomId: string, updates: Partial<CommunityRoom>) => void;
  adminDeleteRoomMessage: (roomId: string, messageId: string) => void;
  adminDeleteAnonymousMessage: (messageId: string) => void;
  adminDeleteMessageComment: (messageId: string, commentId: string) => void;
  adminDeleteAnswer: (messageId: string) => void;
  adminResolveReport: (
    reportId: string,
    status: 'resolved' | 'dismissed',
    options?: { deleteTarget?: boolean; banTargetUser?: boolean; adminNotes?: string }
  ) => void;
  adminBroadcastAnnouncement: (params: {
    title: string;
    body: string;
    campus: string;
    severity: 'info' | 'celebration' | 'urgent';
    actionView?: ActiveAppView;
  }) => void;
  adminToggleAnnouncementActive: (announcementId: string) => void;
  adminDeleteAnnouncement: (announcementId: string) => void;
  adminUpdatePlatformSettings: (updates: Partial<PlatformSettings>) => void;

  // Global Custom Confirmation Modal
  confirmDialog: ConfirmDialogState | null;
  requestConfirm: (options: ConfirmDialogState) => void;
  closeConfirmDialog: () => void;
}

const DEFAULT_GUEST_USER: UserProfile = {
  id: '',
  username: '',
  displayName: '',
  email: '',
  avatarUrl:
    'bopoi-char://v1?aura=royal-violet&skin=amber&hair=afro-puffs&hc=jet-black&eyes=confident-smile&ew=scholar-frames&fit=purple-hoodie',
  bio: '',
  linkActive: true,
  followersCount: 0,
  followingCount: 0,
  campus: 'Chrisland University',
  customPrompt: "There's something you've been wanting to ask...",
};

const INITIAL_SAFETY: SafetySettings = {
  hiddenWords: [],
  blockedSenders: [],
  allowPublicSharing: true,
};

const BopoiContext = createContext<BopoiContextType | undefined>(undefined);

const BopoiInnerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const isInternalNavRef = useRef(false);

  // Real-time WebSocket Manager Connection Status
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(() =>
    realtimeManager.getStatus()
  );

  useEffect(() => {
    return realtimeManager.onStatusChange((nextStatus) => {
      setConnectionStatus(nextStatus);
    });
  }, []);

  const reconnectRealtime = () => {
    realtimeManager.reconnect();
  };

  // Global Search & Legal Docs & Highlighted Comment state
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [activeLegalDoc, setActiveLegalDoc] = useState<LegalDocumentType>(null);
  const [highlightedCommentId, setHighlightedCommentId] = useState<string | null>(() => {
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        return params.get('comment');
      }
    } catch {
      // ignore
    }
    return null;
  });

  const openLegalDoc = (doc: LegalDocumentType) => {
    setActiveLegalDoc(doc);
  };

  // Global Custom Confirmation Modal State
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const requestConfirm = (options: ConfirmDialogState) => {
    setConfirmDialog(options);
  };
  const closeConfirmDialog = () => {
    setConfirmDialog(null);
  };

  // Registered accounts directory (loaded from Supabase profiles or real local signups)
  const [accounts, setAccounts] = useState<UserProfile[]>(() => {
    try {
      const saved = localStorage.getItem('bopoi_accounts');
      if (saved) {
        const parsed: UserProfile[] = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  });

  const [user, setUser] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem('bopoi_user');
      if (saved) {
        const rawUser: UserProfile = JSON.parse(saved);
        if (rawUser && rawUser.username && rawUser.username !== 'student' && rawUser.id) {
          // Never trust client-side localStorage for admin elevation when Supabase is active;
          // admin status is strictly hydrated from the verified Supabase database session.
          const baseUser: UserProfile = isSupabaseConfigured
            ? {
                ...rawUser,
                isAdmin: false,
                role: rawUser.role === 'admin' ? 'student' : rawUser.role,
              }
            : rawUser;
          const syncedChar = getCharacterFromBackendStore(baseUser.username);
          if (syncedChar && syncedChar.avatarUrl) {
            return { ...baseUser, avatarUrl: syncedChar.avatarUrl };
          }
          return baseUser;
        }
      }
    } catch {
      // ignore
    }
    return DEFAULT_GUEST_USER;
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const savedAuth = localStorage.getItem('bopoi_authenticated');
      const savedUser = localStorage.getItem('bopoi_user');
      if (savedAuth && savedUser) {
        const parsedAuth = JSON.parse(savedAuth);
        const parsedUser: UserProfile = JSON.parse(savedUser);
        return Boolean(
          parsedAuth &&
            parsedUser &&
            parsedUser.username &&
            parsedUser.username !== 'student' &&
            parsedUser.id
        );
      }
    } catch {
      // ignore
    }
    return false;
  });

  // Character Mood / Emote state
  const [characterMood, setCharacterMoodState] = useState<string>(() => {
    try {
      const savedMood = localStorage.getItem('bopoi_character_mood');
      if (savedMood && CHARACTER_MOODS.some((m) => m.id === savedMood)) {
        return savedMood;
      }
      const cfg = parseCharacterConfig(user.avatarUrl, user.username);
      return cfg.moodId || cfg.eyesId || 'confident-smile';
    } catch {
      return 'confident-smile';
    }
  });

  const [allMessages, setMessages] = useState<AnonymousMessage[]>(() => {
    try {
      const saved = localStorage.getItem('bopoi_messages');
      if (saved) {
        const parsed: AnonymousMessage[] = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  });

  const [answers, setAnswers] = useState<Record<string, MessageAnswer>>(() => {
    try {
      const saved = localStorage.getItem('bopoi_answers');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch {
      // ignore
    }
    return {};
  });

  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const [safetySettings, setSafetySettings] = useState<SafetySettings>(() => {
    try {
      const saved = localStorage.getItem('bopoi_safety');
      return saved ? JSON.parse(saved) : INITIAL_SAFETY;
    } catch {
      return INITIAL_SAFETY;
    }
  });

  const [activeTab, setActiveTab] = useState<StudentAppTab>('home');

  const [askingRecipient, setAskingRecipient] = useState<UserProfile | CreatorProfile | null>(() => {
    try {
      if (typeof window !== 'undefined') {
        const hash = window.location.hash.replace(/^#\/?/, '').trim();
        const params = new URLSearchParams(window.location.search);
        let askUser = params.get('ask') || params.get('user');
        if (!askUser && hash.startsWith('ask-')) {
          askUser = hash.replace(/^ask-/, '');
        } else if (!askUser && hash.startsWith('@')) {
          askUser = hash.replace(/^@/, '').replace(/\/ask$/, '');
        }
        if (askUser) {
          const clean = askUser.replace(/^@/, '').trim().toLowerCase();
          return {
            id: `usr_${clean}`,
            username: clean,
            displayName: clean.split('_')[0].replace(/^\w/, (c) => c.toUpperCase()),
            email: '',
            avatarUrl: serializeCharacterConfig(generateDeterministicCharacter(clean)),
            bio: 'Send me an anonymous message on Bopoi!',
            linkActive: true,
            followersCount: 0,
            followingCount: 0,
            campus: 'University of Lagos',
          };
        }
        const savedAsk = localStorage.getItem('bopoi_asking_recipient');
        if (savedAsk) return JSON.parse(savedAsk);
      }
    } catch {
      // ignore
    }
    return null;
  });

  // Synchronize active view with URL hash, query parameters, or persisted localStorage state
  const [activeView, setActiveViewState] = useState<ActiveAppView>(() => {
    try {
      if (typeof window !== 'undefined') {
        const hash = window.location.hash.replace(/^#\/?/, '').trim();
        const params = new URLSearchParams(window.location.search);
        if (
          params.get('ask') ||
          hash.startsWith('ask-') ||
          (hash.startsWith('@') && hash.endsWith('/ask'))
        ) {
          return 'public-ask';
        }
        let targetId = params.get('post');
        if (
          !targetId &&
          hash &&
          hash !== 'post-detail' &&
          hash !== 'poll-detail' &&
          (hash.startsWith('post-') || hash.startsWith('post='))
        ) {
          targetId = hash.replace(/^post[-=]/, '');
        }
        if (targetId) {
          const savedPosts = localStorage.getItem('bopoi_social_posts');
          const pool: SocialPost[] = savedPosts ? JSON.parse(savedPosts) : [];
          const found = pool.find((p) => p.id === targetId);
          return found?.type === 'poll' ? 'poll-detail' : 'post-detail';
        }
        let targetRoomId = params.get('room');
        if (
          !targetRoomId &&
          hash &&
          hash !== 'room-detail' &&
          (hash.startsWith('room-') || hash.startsWith('room='))
        ) {
          targetRoomId = hash.replace(/^room[-=]/, '');
        }
        if (targetRoomId) {
          return 'room-detail';
        }
        if (hash) return hash as ActiveAppView;
        const viewParam = params.get('view') || params.get('page');
        if (viewParam) return viewParam as ActiveAppView;

        const savedView = localStorage.getItem('bopoi_active_view');
        if (savedView) {
          return savedView as ActiveAppView;
        }
      }
    } catch {
      // ignore
    }
    return 'home';
  });

  const [selectedMessage, setSelectedMessage] = useState<AnonymousMessage | null>(() => {
    try {
      const saved = localStorage.getItem('bopoi_selected_message');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [selectedAnswer, setSelectedAnswer] = useState<MessageAnswer | null>(() => {
    try {
      const saved = localStorage.getItem('bopoi_selected_answer');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [inboxFilter, setInboxFilter] = useState<InboxFilter>('all');
  const [deviceMode, setDeviceMode] = useState<'frame' | 'fullscreen'>('frame');
  const [toasts, setToasts] = useState<ToastInfo[]>([]);
  const [lastSentMessageId, setLastSentMessageId] = useState<string | null>(null);
  const [feedTab, setFeedTab] = useState<'for-you' | 'latest' | 'trending'>('for-you');

  const [socialPosts, setSocialPosts] = useState<SocialPost[]>(() => {
    try {
      const saved = localStorage.getItem('bopoi_social_posts');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const socialPostsRef = useRef<SocialPost[]>(socialPosts);
  useEffect(() => {
    socialPostsRef.current = socialPosts;
  }, [socialPosts]);

  const [selectedPost, setSelectedPost] = useState<SocialPost | null>(() => {
    try {
      if (typeof window !== 'undefined') {
        const hash = window.location.hash.replace(/^#\/?/, '').trim();
        const params = new URLSearchParams(window.location.search);
        let targetId = params.get('post');
        if (
          !targetId &&
          hash &&
          hash !== 'post-detail' &&
          hash !== 'poll-detail' &&
          (hash.startsWith('post-') || hash.startsWith('post='))
        ) {
          targetId = hash.replace(/^post[-=]/, '');
        }
        if (targetId) {
          const savedPosts = localStorage.getItem('bopoi_social_posts');
          const pool: SocialPost[] = savedPosts ? JSON.parse(savedPosts) : [];
          return pool.find((p) => p.id === targetId) || null;
        }
        const savedPost = localStorage.getItem('bopoi_selected_post');
        if (savedPost) return JSON.parse(savedPost);
      }
    } catch {
      // ignore
    }
    return null;
  });

  const [sharingPost, setSharingPost] = useState<SocialPost | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreateRoomModalOpen, setIsCreateRoomModalOpen] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(() => {
    try {
      if (typeof window !== 'undefined') {
        const hash = window.location.hash.replace(/^#\/?/, '').trim();
        const params = new URLSearchParams(window.location.search);
        let targetRoomId = params.get('room');
        if (
          !targetRoomId &&
          hash &&
          hash !== 'room-detail' &&
          (hash.startsWith('room-') || hash.startsWith('room='))
        ) {
          targetRoomId = hash.replace(/^room[-=]/, '');
        }
        if (targetRoomId) return targetRoomId;
        const saved = localStorage.getItem('bopoi_selected_room');
        if (saved && saved !== 'detail') return saved;
      }
    } catch {
      // ignore
    }
    return null;
  });

  const [selectedPublicUser, setSelectedPublicUser] = useState<CreatorProfile | UserProfile | null>(
    () => {
      try {
        const saved = localStorage.getItem('bopoi_selected_public_user');
        return saved ? JSON.parse(saved) : null;
      } catch {
        return null;
      }
    }
  );

  const [rooms, setRooms] = useState<CommunityRoom[]>(() => {
    try {
      const saved = localStorage.getItem('bopoi_rooms');
      if (saved) {
        const parsed: CommunityRoom[] = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  });

  const [creators, setCreators] = useState<CreatorProfile[]>(() => {
    try {
      const saved = localStorage.getItem('bopoi_creators');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [sentMessageIds, setSentMessageIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('bopoi_sent_message_ids');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [readConvoMap, setReadConvoMap] = useState<Record<string, number | boolean>>(() => {
    try {
      const saved = localStorage.getItem('bopoi_read_convo_comments');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('bopoi_read_convo_comments', JSON.stringify(readConvoMap));
    } catch {
      // ignore
    }
  }, [readConvoMap]);

  // ============================================================================
  // REAL-TIME ADMIN CONSOLE STATE & PERSISTENCE (DATABASE ADMIN ONLY)
  // ============================================================================
  const isAdminUnlocked = Boolean(
    isAuthenticated &&
      user.username &&
      user.username !== 'student' &&
      (user.isAdmin === true || user.role === 'admin')
  );

  const isAdminUnlockedRef = useRef<boolean>(isAdminUnlocked);
  useEffect(() => {
    isAdminUnlockedRef.current = isAdminUnlocked;
    try {
      localStorage.removeItem('bopoi_admin_unlocked');
    } catch {
      // ignore
    }
  }, [isAdminUnlocked]);

  // Keep 'admin' view/path strictly closed unless logged into an admin account
  useEffect(() => {
    if (activeView === 'admin' && !isAdminUnlocked) {
      setActiveViewState('home');
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('bopoi_active_view', 'home');
          if (window.location.hash.replace(/^#\/?/, '').trim() === 'admin') {
            window.history.replaceState({ view: 'home' }, '', `${window.location.pathname}#home`);
          }
        }
      } catch {
        // ignore
      }
    }
  }, [activeView, isAdminUnlocked]);

  const [moderationReports, setModerationReports] = useState<ModerationReport[]>(() => {
    try {
      const saved = localStorage.getItem('bopoi_moderation_reports');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [];
  });

  const [campusAnnouncements, setCampusAnnouncements] = useState<CampusAnnouncement[]>(() => {
    try {
      const saved = localStorage.getItem('bopoi_campus_announcements');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [];
  });

  const [adminAuditLogs, setAdminAuditLogs] = useState<AdminAuditLog[]>(() => {
    try {
      const saved = localStorage.getItem('bopoi_admin_audit_logs');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [];
  });

  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>(() => {
    try {
      const saved = localStorage.getItem('bopoi_platform_settings');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {
      globalBlockedWords: ['scam', 'phishing', 'doxx'],
      allowAnonymousConfessions: true,
      allowNewRooms: true,
      maintenanceMode: false,
      updatedAt: 'Just now',
    };
  });

  const [adminExtraMessages, setAdminExtraMessages] = useState<AnonymousMessage[]>([]);
  const [followEdges, setFollowEdges] = useState<FollowEdge[]>(() => getLocalFollowEdges());

  useEffect(() => {
    try {
      localStorage.setItem('bopoi_moderation_reports', JSON.stringify(moderationReports));
    } catch {
      // ignore
    }
  }, [moderationReports]);

  useEffect(() => {
    try {
      localStorage.setItem('bopoi_campus_announcements', JSON.stringify(campusAnnouncements));
    } catch {
      // ignore
    }
  }, [campusAnnouncements]);

  useEffect(() => {
    try {
      localStorage.setItem('bopoi_admin_audit_logs', JSON.stringify(adminAuditLogs));
    } catch {
      // ignore
    }
  }, [adminAuditLogs]);

  useEffect(() => {
    try {
      localStorage.setItem('bopoi_platform_settings', JSON.stringify(platformSettings));
    } catch {
      // ignore
    }
  }, [platformSettings]);

  const syncAdminTablesFromSupabase = async () => {
    if (!isSupabaseConfigured) return;
    const data = await fetchSupabaseAdminData(isAdminUnlockedRef.current);
    if (!data) return;
    if (isAdminUnlockedRef.current && data.reports.length > 0) setModerationReports(data.reports);
    if (data.announcements.length > 0) setCampusAnnouncements(data.announcements);
    if (isAdminUnlockedRef.current && data.auditLogs.length > 0) setAdminAuditLogs(data.auditLogs);
    if (data.platformSettings) setPlatformSettings(data.platformSettings);
    if (isAdminUnlockedRef.current && data.allAnonMessages.length > 0) setAdminExtraMessages(data.allAnonMessages);
  };

  useEffect(() => {
    syncAdminTablesFromSupabase();
  }, [user.id, isAdminUnlocked]);

  // ============================================================================
  // SUPABASE AUTH SESSION & REAL-TIME DATABASE SYNCHRONIZATION
  // ============================================================================
  useEffect(() => {
    const sb = supabase;
    if (!sb) return;

    const loadSessionAndProfile = async () => {
      const {
        data: { session },
      } = await sb.auth.getSession();

      if (session?.user) {
        const authUser = session.user;
        const { data: profileRow } = await sb
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .maybeSingle();

        if (profileRow) {
          const overrides = getAdminUserOverrides();
          const ov =
            overrides[profileRow.id] ||
            (profileRow.username ? overrides[String(profileRow.username).toLowerCase()] : undefined) ||
            {};
          const loadedUser: UserProfile = {
            id: profileRow.id,
            username: profileRow.username,
            displayName: profileRow.display_name,
            email: profileRow.email || authUser.email || '',
            avatarUrl: profileRow.avatar_url,
            bio: profileRow.bio || '',
            linkActive: profileRow.link_active ?? true,
            followersCount: profileRow.followers_count ?? 0,
            followingCount: profileRow.following_count ?? 0,
            campus: profileRow.campus || 'University of Lagos',
            customPrompt:
              profileRow.custom_prompt || "There's something you've been wanting to ask...",
            role: profileRow.role || (profileRow.is_admin ? 'admin' : profileRow.is_creator ? 'creator' : 'student'),
            isAdmin: Boolean(profileRow.is_admin || profileRow.role === 'admin'),
            isVerified: Boolean(
              profileRow.is_verified !== undefined && profileRow.is_verified !== null
                ? profileRow.is_verified
                : profileRow.is_creator
            ),
            isCreator: Boolean(profileRow.is_creator ?? profileRow.is_verified),
            isSuspended: Boolean(profileRow.is_suspended),
            suspensionReason: profileRow.suspension_reason || undefined,
            ...ov,
          };
          setUser(loadedUser);
          setIsAuthenticated(true);
        }

        const { data: safetyRow } = await sb
          .from('user_safety_settings')
          .select('*')
          .eq('user_id', authUser.id)
          .maybeSingle();

        if (safetyRow) {
          setSafetySettings({
            hiddenWords: Array.isArray(safetyRow.hidden_words) ? safetyRow.hidden_words : [],
            blockedSenders: Array.isArray(safetyRow.blocked_senders)
              ? safetyRow.blocked_senders
              : [],
            allowPublicSharing: safetyRow.allow_public_sharing ?? true,
          });
        }
      }
    };

    loadSessionAndProfile();

    const { data: authSub } = sb.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setIsAuthenticated(false);
      } else {
        loadSessionAndProfile();
      }
    });

    return () => {
      authSub.subscription.unsubscribe();
    };
  }, []);

  // Load real profiles, creators, and notifications from Supabase
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const isLoggedInUser = Boolean(
      isAuthenticated && user.id && user.username && user.username !== 'student'
    );

    if (!isLoggedInUser) {
      setNotifications([]);
    }

    const syncProfilesAndNotifications = async () => {
      const [profilesData, notifsData] = await Promise.all([
        fetchSupabaseProfiles(
          isLoggedInUser ? user.id : undefined,
          isLoggedInUser ? user.username : undefined
        ),
        isLoggedInUser ? fetchSupabaseNotifications(user.id) : Promise.resolve([]),
      ]);

      if (profilesData) {
        setAccounts(profilesData.profiles);
        setCreators(profilesData.creators);
        if (profilesData.followEdges) {
          setFollowEdges(profilesData.followEdges);
        }
        if (isLoggedInUser) {
          const myProfile = profilesData.profiles.find(
            (p) =>
              p.id === user.id || p.username.toLowerCase() === user.username.toLowerCase()
          );
          if (myProfile) {
            setUser((prev) => {
              if (
                prev.followersCount === myProfile.followersCount &&
                prev.followingCount === myProfile.followingCount
              ) {
                return prev;
              }
              return {
                ...prev,
                followersCount: myProfile.followersCount,
                followingCount: myProfile.followingCount,
              };
            });
          }
        }
        // If askingRecipient is set by username, hydrate with real profile data
        if (askingRecipient) {
          const realRec = profilesData.profiles.find(
            (p) => p.username.toLowerCase() === askingRecipient.username.toLowerCase()
          );
          if (realRec) setAskingRecipient(realRec);
        }
      }

      if (isLoggedInUser && notifsData) {
        setNotifications(notifsData);
      } else if (!isLoggedInUser) {
        setNotifications([]);
      }
    };

    syncProfilesAndNotifications();
  }, [user.id, user.username, isAuthenticated, askingRecipient?.username]);

  // Dedicated Instant Realtime Stream for `room_messages` and `post_comments`
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    return initRealtimeSubscriptions({
      onRoomMessageInsert: (roomId, incomingMsg) => {
        setRooms((prev) =>
          prev.map((room) => {
            if (room.id !== roomId) return room;
            const existing = room.messages || [];
            // Idempotent check: match by real UUID or reconcile optimistic temp message
            const alreadyById = existing.some((m) => m.id === incomingMsg.id);
            if (alreadyById) return room;

            const optimisticIdx = existing.findIndex(
              (m) =>
                m.id.startsWith('rm_') &&
                m.text === incomingMsg.text &&
                m.authorName === incomingMsg.authorName &&
                Math.abs(m.createdTimestamp - incomingMsg.createdTimestamp) < 15000
            );

            if (optimisticIdx !== -1) {
              const reconciled = [...existing];
              reconciled[optimisticIdx] = {
                ...reconciled[optimisticIdx],
                ...incomingMsg,
              };
              return { ...room, messages: reconciled };
            }

            return {
              ...room,
              messages: [...existing, incomingMsg],
            };
          })
        );
      },
      onRoomMessageUpdate: (roomId, updatedMsg) => {
        setRooms((prev) =>
          prev.map((room) => {
            if (room.id !== roomId || !room.messages) return room;
            return {
              ...room,
              messages: room.messages.map((m) =>
                m.id === updatedMsg.id
                  ? {
                      ...m,
                      ...updatedMsg,
                      hasLiked: m.hasLiked,
                      userReactions: m.userReactions,
                    }
                  : m
              ),
            };
          })
        );
      },
      onRoomMessageDelete: (roomId, deletedId) => {
        setRooms((prev) =>
          prev.map((room) => {
            if (roomId && room.id !== roomId) return room;
            if (!room.messages) return room;
            return {
              ...room,
              messages: room.messages.filter((m) => m.id !== deletedId),
            };
          })
        );
      },
      onPostCommentInsert: (postId, incomingComment) => {
        const applyCommentInsert = (post: SocialPost): SocialPost => {
          if (post.id !== postId) return post;
          const existing = post.comments || [];
          if (existing.some((c) => c.id === incomingComment.id)) return post;

          const optimisticIdx = existing.findIndex(
            (c) =>
              c.id.startsWith('comm_') &&
              c.text === incomingComment.text &&
              c.authorUsername === incomingComment.authorUsername &&
              Math.abs(c.createdTimestamp - incomingComment.createdTimestamp) < 15000
          );

          if (optimisticIdx !== -1) {
            const reconciled = [...existing];
            reconciled[optimisticIdx] = {
              ...reconciled[optimisticIdx],
              ...incomingComment,
            };
            return { ...post, comments: reconciled };
          }

          const nextComments = [...existing, incomingComment];
          return {
            ...post,
            comments: nextComments,
            commentsCount: Math.max(post.commentsCount + 1, nextComments.length),
          };
        };

        setSocialPosts((prev) => prev.map(applyCommentInsert));
        setSelectedPost((prev) => (prev && prev.id === postId ? applyCommentInsert(prev) : prev));
      },
      onPostCommentUpdate: (postId, updatedComment) => {
        const applyCommentUpdate = (post: SocialPost): SocialPost => {
          if (post.id !== postId || !post.comments) return post;
          return {
            ...post,
            comments: post.comments.map((c) =>
              c.id === updatedComment.id
                ? { ...c, ...updatedComment, hasLiked: c.hasLiked }
                : c
            ),
          };
        };

        setSocialPosts((prev) => prev.map(applyCommentUpdate));
        setSelectedPost((prev) => (prev && prev.id === postId ? applyCommentUpdate(prev) : prev));
      },
      onPostCommentDelete: (postId, deletedCommentId) => {
        const applyCommentDelete = (post: SocialPost): SocialPost => {
          if (postId && post.id !== postId) return post;
          if (!post.comments) return post;
          const filtered = post.comments.filter((c) => c.id !== deletedCommentId);
          if (filtered.length === post.comments.length) return post;
          return {
            ...post,
            comments: filtered,
            commentsCount: Math.max(0, post.commentsCount - 1),
          };
        };

        setSocialPosts((prev) => prev.map(applyCommentDelete));
        setSelectedPost((prev) => (prev ? applyCommentDelete(prev) : prev));
      },
    });
  }, []);

  // Subscribe to Supabase Postgres Realtime Changes across all 27 tables with 180ms burst coalescing
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const pendingGroups = new Set<string>();
    let coalesceTimer: ReturnType<typeof setTimeout> | null = null;

    const flushInvalidations = () => {
      coalesceTimer = null;
      const groups = Array.from(pendingGroups);
      pendingGroups.clear();

      if (groups.includes('socialPosts')) {
        queryClient.invalidateQueries({ queryKey: ['bopoi', 'socialPosts'] });
      }
      if (groups.includes('rooms')) {
        queryClient.invalidateQueries({ queryKey: ['bopoi', 'rooms'] });
      }
      if (groups.includes('messages')) {
        queryClient.invalidateQueries({ queryKey: ['bopoi', 'messages'] });
      }
      if (groups.includes('answers')) {
        queryClient.invalidateQueries({ queryKey: ['bopoi', 'answers'] });
      }
      if (groups.includes('notifications') && user.id) {
        fetchSupabaseNotifications(user.id).then((list) => {
          if (list) setNotifications(list);
        });
      }
      if (groups.includes('profiles')) {
        fetchSupabaseProfiles(user.id || undefined, user.username || undefined).then((res) => {
          if (res) {
            setAccounts(res.profiles);
            setCreators(res.creators);
            if (res.followEdges) {
              setFollowEdges(res.followEdges);
            }
            const myProfile = res.profiles.find(
              (p) =>
                p.id === user.id || p.username.toLowerCase() === user.username.toLowerCase()
            );
            if (myProfile) {
              setUser((prev) => ({
                ...prev,
                followersCount: myProfile.followersCount,
                followingCount: myProfile.followingCount,
              }));
            }
          }
        });
      }
      if (groups.includes('adminData')) {
        syncAdminTablesFromSupabase();
      }
      if (groups.includes('safety') && supabase && user.id) {
        supabase
          .from('user_safety_settings')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle()
          .then(({ data: safetyRow }) => {
            if (safetyRow) {
              setSafetySettings({
                hiddenWords: Array.isArray(safetyRow.hidden_words) ? safetyRow.hidden_words : [],
                blockedSenders: Array.isArray(safetyRow.blocked_senders)
                  ? safetyRow.blocked_senders
                  : [],
                allowPublicSharing: safetyRow.allow_public_sharing ?? true,
              });
            }
          });
      }
    };

    const scheduleGroupFlush = (group: string) => {
      pendingGroups.add(group);
      if (!coalesceTimer) {
        coalesceTimer = setTimeout(flushInvalidations, 180);
      }
    };

    const unsubscribe = subscribeToSupabaseRealtime(user.id || undefined, (table) => {
      if (
        table === 'social_posts' ||
        table === 'poll_options' ||
        table === 'poll_votes' ||
        table === 'post_likes' ||
        table === 'post_bookmarks' ||
        table === 'post_comments' ||
        table === 'post_comment_likes'
      ) {
        scheduleGroupFlush('socialPosts');
      } else if (
        table === 'community_rooms' ||
        table === 'room_memberships' ||
        table === 'room_assigned_personas' ||
        table === 'room_messages' ||
        table === 'room_message_likes' ||
        table === 'room_message_reactions' ||
        table === 'room_presence'
      ) {
        scheduleGroupFlush('rooms');
      } else if (
        table === 'anonymous_messages' ||
        table === 'message_comments' ||
        table === 'moderation_reports'
      ) {
        scheduleGroupFlush('messages');
        scheduleGroupFlush('adminData');
      } else if (table === 'message_answers' || table === 'message_answer_likes') {
        scheduleGroupFlush('answers');
      } else if (table === 'notifications' && user.id) {
        scheduleGroupFlush('notifications');
      } else if (table === 'profiles' || table === 'user_follows') {
        scheduleGroupFlush('profiles');
      } else if (
        table === 'campus_announcements' ||
        table === 'admin_audit_logs' ||
        table === 'platform_settings'
      ) {
        scheduleGroupFlush('adminData');
      } else if (table === 'user_safety_settings' && supabase && user.id) {
        scheduleGroupFlush('safety');
      }
    });

    return () => {
      if (coalesceTimer) clearTimeout(coalesceTimer);
      unsubscribe();
    };
  }, [user.id, queryClient]);

  // Persist activeView and selected items to localStorage so reloading any page preserves state
  useEffect(() => {
    try {
      localStorage.setItem('bopoi_active_view', activeView);
    } catch {
      // ignore
    }
  }, [activeView]);

  useEffect(() => {
    try {
      if (selectedPost) {
        localStorage.setItem('bopoi_selected_post', JSON.stringify(selectedPost));
      }
    } catch {
      // ignore
    }
  }, [selectedPost]);

  useEffect(() => {
    try {
      if (selectedPublicUser) {
        localStorage.setItem('bopoi_selected_public_user', JSON.stringify(selectedPublicUser));
      }
    } catch {
      // ignore
    }
  }, [selectedPublicUser]);

  useEffect(() => {
    try {
      if (selectedMessage) {
        localStorage.setItem('bopoi_selected_message', JSON.stringify(selectedMessage));
      }
    } catch {
      // ignore
    }
  }, [selectedMessage]);

  useEffect(() => {
    try {
      if (selectedAnswer) {
        localStorage.setItem('bopoi_selected_answer', JSON.stringify(selectedAnswer));
      }
    } catch {
      // ignore
    }
  }, [selectedAnswer]);

  useEffect(() => {
    try {
      if (askingRecipient) {
        localStorage.setItem('bopoi_asking_recipient', JSON.stringify(askingRecipient));
      }
    } catch {
      // ignore
    }
  }, [askingRecipient]);

  useEffect(() => {
    try {
      if (selectedRoomId && selectedRoomId !== 'detail') {
        localStorage.setItem('bopoi_selected_room', selectedRoomId);
      } else if (!selectedRoomId && rooms.length > 0) {
        setSelectedRoomId(rooms[0].id);
      }
    } catch {
      // ignore
    }
  }, [selectedRoomId, rooms]);

  // Navigation History Stack for reliable Back button navigation
  const navHistoryRef = useRef<
    {
      view: ActiveAppView;
      roomId?: string | null;
      post?: SocialPost | null;
      publicUser?: CreatorProfile | UserProfile | null;
    }[]
  >((() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = sessionStorage.getItem('bopoi_nav_history');
        return saved ? JSON.parse(saved) : [];
      }
    } catch {
      // ignore
    }
    return [];
  })());

  const pushNavHistory = (entry: {
    view: ActiveAppView;
    roomId?: string | null;
    post?: SocialPost | null;
    publicUser?: CreatorProfile | UserProfile | null;
  }) => {
    try {
      const stack = navHistoryRef.current;
      const top = stack[stack.length - 1];
      if (!top || top.view !== entry.view || top.roomId !== entry.roomId) {
        const nextStack = [...stack.slice(-24), entry];
        navHistoryRef.current = nextStack;
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('bopoi_nav_history', JSON.stringify(nextStack));
        }
      }
    } catch {
      // ignore
    }
  };

  const setActiveView = (view: ActiveAppView) => {
    const resolvedView: ActiveAppView =
      view === 'admin' && !isAdminUnlockedRef.current ? 'home' : view;

    if (resolvedView !== activeView) {
      pushNavHistory({
        view: activeView,
        roomId: selectedRoomId,
        post: selectedPost,
        publicUser: selectedPublicUser,
      });
    }
    setActiveViewState(resolvedView);
    if (resolvedView !== 'post-detail' && resolvedView !== 'poll-detail') {
      setHighlightedCommentId(null);
    }
    try {
      if (typeof window !== 'undefined') {
        isInternalNavRef.current = true;
        localStorage.setItem('bopoi_active_view', resolvedView);
        const cleanHash =
          resolvedView === 'room-detail' && selectedRoomId
            ? `#room-${selectedRoomId}`
            : (resolvedView === 'post-detail' || resolvedView === 'poll-detail') && selectedPost?.id
            ? `#post-${selectedPost.id}`
            : `#${resolvedView}`;
        window.history.pushState(
          { view: resolvedView, roomId: selectedRoomId, postId: selectedPost?.id },
          '',
          `${window.location.pathname}${cleanHash}`
        );
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        setTimeout(() => {
          isInternalNavRef.current = false;
        }, 60);
      }
    } catch {
      // ignore
    }
  };

  const goBack = (fallbackView: ActiveAppView = 'home') => {
    try {
      const stack = [...navHistoryRef.current];
      while (stack.length > 0) {
        const popped = stack.pop()!;
        if (
          popped.view !== activeView ||
          (activeView === 'room-detail' && popped.roomId !== selectedRoomId)
        ) {
          navHistoryRef.current = stack;
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('bopoi_nav_history', JSON.stringify(stack));
          }
          if (popped.roomId) setSelectedRoomId(popped.roomId);
          if (popped.post) setSelectedPost(popped.post);
          if (popped.publicUser) setSelectedPublicUser(popped.publicUser);
          setActiveViewState(popped.view);
          if (typeof window !== 'undefined') {
            isInternalNavRef.current = true;
            localStorage.setItem('bopoi_active_view', popped.view);
            const cleanHash =
              popped.view === 'room-detail' && popped.roomId
                ? `#room-${popped.roomId}`
                : `#${popped.view}`;
            window.history.replaceState(
              { view: popped.view, roomId: popped.roomId },
              '',
              `${window.location.pathname}${cleanHash}`
            );
            window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
            setTimeout(() => {
              isInternalNavRef.current = false;
            }, 60);
          }
          return;
        }
      }
    } catch {
      // ignore
    }
    setActiveView(fallbackView);
  };

  // Listen to browser hash/popstate changes
  useEffect(() => {
    let isFirstLoad = true;

    const handleUrlNavigation = (event?: PopStateEvent | HashChangeEvent) => {
      if (isInternalNavRef.current) return;
      try {
        if (event && event.type === 'popstate') {
          const popEvent = event as PopStateEvent;
          if (popEvent.state && popEvent.state.view) {
            if (popEvent.state.roomId) setSelectedRoomId(popEvent.state.roomId);
            if (popEvent.state.postId) {
              const target = socialPostsRef.current.find((p) => p.id === popEvent.state.postId);
              if (target) setSelectedPost(target);
            }
            setActiveViewState(popEvent.state.view as ActiveAppView);
            localStorage.setItem('bopoi_active_view', popEvent.state.view);
            return;
          }
        }

        const hash = window.location.hash.replace(/^#\/?/, '').trim();
        const params = new URLSearchParams(window.location.search);

        const askParam = isFirstLoad ? params.get('ask') || params.get('user') : null;
        if (
          askParam ||
          hash.startsWith('ask-') ||
          (hash.startsWith('@') && hash.endsWith('/ask'))
        ) {
          if (isFirstLoad && window.location.search) {
            window.history.replaceState(
              { view: 'public-ask' },
              '',
              `${window.location.pathname}#public-ask`
            );
          }
          setActiveViewState('public-ask');
          isFirstLoad = false;
          return;
        }

        let targetPostId = isFirstLoad ? params.get('post') : null;
        const commentParam = isFirstLoad ? params.get('comment') : null;
        if (commentParam) {
          setHighlightedCommentId(commentParam);
        }
        if (
          !targetPostId &&
          hash &&
          hash !== 'post-detail' &&
          hash !== 'poll-detail' &&
          (hash.startsWith('post-') || hash.startsWith('post='))
        ) {
          targetPostId = hash.replace(/^post[-=]/, '');
        }

        if (targetPostId) {
          const target = socialPostsRef.current.find((p) => p.id === targetPostId);
          if (target) {
            setSelectedPost(target);
            const targetView = target.type === 'poll' ? 'poll-detail' : 'post-detail';
            setActiveViewState(targetView);
            if (isFirstLoad && window.location.search) {
              window.history.replaceState(
                { view: targetView, postId: targetPostId },
                '',
                `${window.location.pathname}#post-${targetPostId}`
              );
            }
            isFirstLoad = false;
            return;
          }
        }

        let targetRoomId = isFirstLoad ? params.get('room') : null;
        if (
          !targetRoomId &&
          hash &&
          hash !== 'room-detail' &&
          (hash.startsWith('room-') || hash.startsWith('room='))
        ) {
          targetRoomId = hash.replace(/^room[-=]/, '');
        }

        if (targetRoomId && targetRoomId !== 'detail') {
          setSelectedRoomId(targetRoomId);
          setActiveViewState('room-detail');
          if (isFirstLoad && window.location.search) {
            window.history.replaceState(
              { view: 'room-detail', roomId: targetRoomId },
              '',
              `${window.location.pathname}#room-${targetRoomId}`
            );
          }
          isFirstLoad = false;
          return;
        }

        if (
          hash &&
          !hash.startsWith('post-') &&
          !hash.startsWith('post=') &&
          !hash.startsWith('room-') &&
          !hash.startsWith('room=')
        ) {
          const requestedView = hash as ActiveAppView;
          const safeView: ActiveAppView =
            requestedView === 'admin' && !isAdminUnlockedRef.current ? 'home' : requestedView;
          setActiveViewState(safeView);
          if (safeView !== requestedView) {
            window.history.replaceState({ view: 'home' }, '', `${window.location.pathname}#home`);
          }
        } else if (isFirstLoad) {
          const rawRestored = (localStorage.getItem('bopoi_active_view') as ActiveAppView) || 'home';
          const restored: ActiveAppView =
            rawRestored === 'admin' && !isAdminUnlockedRef.current ? 'home' : rawRestored;
          setActiveViewState(restored);
          window.history.replaceState(
            { view: restored },
            '',
            `${window.location.pathname}#${restored}`
          );
        }
        isFirstLoad = false;
      } catch {
        isFirstLoad = false;
      }
    };

    handleUrlNavigation();
    window.addEventListener('hashchange', handleUrlNavigation);
    window.addEventListener('popstate', handleUrlNavigation);
    return () => {
      window.removeEventListener('hashchange', handleUrlNavigation);
      window.removeEventListener('popstate', handleUrlNavigation);
    };
  }, []);

  // Debounced sync to localStorage & immediate React Query cache update
  useEffect(() => {
    queryClient.setQueryData(['bopoi', 'socialPosts'], socialPosts);
    const timer = setTimeout(() => {
      try {
        localStorage.setItem('bopoi_social_posts', JSON.stringify(socialPosts.slice(0, 120)));
      } catch {
        // ignore quota errors
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [socialPosts, queryClient]);

  useEffect(() => {
    queryClient.setQueryData(['bopoi', 'rooms'], rooms);
    const timer = setTimeout(() => {
      try {
        localStorage.setItem('bopoi_rooms', JSON.stringify(rooms.slice(0, 60)));
      } catch {
        // ignore quota errors
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [rooms, queryClient]);

  // TanStack Query real-time synchronization
  const { data: queriedPosts } = useQuery({
    queryKey: ['bopoi', 'socialPosts', user.id],
    queryFn: () => fetchSyncedSocialPosts(user.id || undefined),
    staleTime: 2000,
    refetchInterval: 4500,
    refetchIntervalInBackground: false,
  });

  const { data: queriedRooms } = useQuery({
    queryKey: ['bopoi', 'rooms', user.id],
    queryFn: () => fetchSyncedRooms(user.id || undefined),
    staleTime: 2000,
    refetchInterval: 4000,
    refetchIntervalInBackground: false,
  });

  const { data: queriedMessages } = useQuery({
    queryKey: ['bopoi', 'messages', user.id],
    queryFn: () => fetchSyncedMessages(user.id || undefined),
    staleTime: 2000,
    refetchInterval: 4000,
    refetchIntervalInBackground: false,
  });

  const { data: queriedAnswers } = useQuery({
    queryKey: ['bopoi', 'answers'],
    queryFn: () => fetchSyncedAnswers(),
    staleTime: 2500,
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
  });

  const { data: queriedProfiles } = useQuery({
    queryKey: ['bopoi', 'profiles', user.id, user.username],
    queryFn: () =>
      fetchSupabaseProfiles(
        user.id || undefined,
        user.username && user.username !== 'student' ? user.username : undefined
      ),
    staleTime: 2500,
    refetchInterval: 4500,
    refetchIntervalInBackground: false,
  });

  useEffect(() => {
    if (!queriedProfiles) return;
    setAccounts(queriedProfiles.profiles);
    setCreators(queriedProfiles.creators);
    if (queriedProfiles.followEdges) {
      setFollowEdges(queriedProfiles.followEdges);
    }
    if (isAuthenticated && user.username && user.username !== 'student') {
      const myProfile = queriedProfiles.profiles.find(
        (p) =>
          p.id === user.id || p.username.toLowerCase() === user.username.toLowerCase()
      );
      if (myProfile) {
        setUser((prev) => {
          if (
            prev.followersCount === myProfile.followersCount &&
            prev.followingCount === myProfile.followingCount
          ) {
            return prev;
          }
          return {
            ...prev,
            followersCount: myProfile.followersCount,
            followingCount: myProfile.followingCount,
          };
        });
      }
    }
    setSelectedPublicUser((prevPub) => {
      if (!prevPub) return null;
      const updatedCreator = queriedProfiles.creators.find(
        (c) =>
          c.id === prevPub.id ||
          c.username.toLowerCase() === prevPub.username.toLowerCase()
      );
      if (updatedCreator) {
        return {
          ...prevPub,
          followersCount: updatedCreator.followersCount ?? 0,
          followingCount: updatedCreator.followingCount ?? 0,
          ...('isFollowing' in prevPub ? { isFollowing: updatedCreator.isFollowing } : {}),
        };
      }
      const updatedProfile = queriedProfiles.profiles.find(
        (p) =>
          p.id === prevPub.id ||
          p.username.toLowerCase() === prevPub.username.toLowerCase()
      );
      if (updatedProfile) {
        return {
          ...prevPub,
          followersCount: updatedProfile.followersCount,
          followingCount: updatedProfile.followingCount,
        };
      }
      return prevPub;
    });
  }, [queriedProfiles, isAuthenticated, user.id, user.username]);

  useEffect(() => {
    if (!queriedPosts) return;
    setSocialPosts((prev) => {
      const now = Date.now();
      // Preserve any in-flight optimistic posts created in the last 12 seconds not yet in server response
      const inFlightPosts = prev.filter(
        (p) =>
          p.id.startsWith('post_') &&
          now - p.createdTimestamp < 12000 &&
          !queriedPosts.some(
            (qp) =>
              qp.id === p.id ||
              (qp.content === p.content &&
                qp.authorUsername === p.authorUsername &&
                Math.abs(qp.createdTimestamp - p.createdTimestamp) < 15000)
          )
      );

      // Preserve any in-flight optimistic comments on existing posts
      const mergedPosts = queriedPosts.map((qp) => {
        const localPost = prev.find((lp) => lp.id === qp.id);
        if (!localPost?.comments?.length) return qp;
        const serverComments = qp.comments || [];
        const inFlightComments = localPost.comments.filter(
          (c) =>
            c.id.startsWith('comm_') &&
            now - c.createdTimestamp < 12000 &&
            !serverComments.some(
              (sc) =>
                sc.id === c.id ||
                (sc.text === c.text &&
                  sc.authorUsername === c.authorUsername &&
                  Math.abs(sc.createdTimestamp - c.createdTimestamp) < 15000)
            )
        );
        if (inFlightComments.length === 0) return qp;
        const combined = [...serverComments, ...inFlightComments];
        return {
          ...qp,
          comments: combined,
          commentsCount: Math.max(qp.commentsCount, combined.length),
        };
      });

      const finalPosts = [...inFlightPosts, ...mergedPosts];
      if (arePostsEqualFast(prev, finalPosts)) return prev;
      return finalPosts;
    });
    // Also keep selectedPost updated if open
    setSelectedPost((prevSelected) => {
      if (!prevSelected) return null;
      const matched = queriedPosts.find((p) => p.id === prevSelected.id);
      if (!matched) return prevSelected;
      const now = Date.now();
      const localComments = prevSelected.comments || [];
      const serverComments = matched.comments || [];
      const inFlight = localComments.filter(
        (c) =>
          c.id.startsWith('comm_') &&
          now - c.createdTimestamp < 12000 &&
          !serverComments.some(
            (sc) =>
              sc.id === c.id ||
              (sc.text === c.text &&
                sc.authorUsername === c.authorUsername &&
                Math.abs(sc.createdTimestamp - c.createdTimestamp) < 15000)
          )
      );
      if (inFlight.length === 0) return matched;
      const combined = [...serverComments, ...inFlight];
      return {
        ...matched,
        comments: combined,
        commentsCount: Math.max(matched.commentsCount, combined.length),
      };
    });
  }, [queriedPosts]);

  useEffect(() => {
    if (!queriedRooms) return;
    setRooms((prev) => {
      const now = Date.now();
      const userKey = user.id || user.username || 'guest';
      const localMemberships = getLocalRoomMemberships(userKey);

      const inFlightRooms = prev.filter(
        (r) =>
          r.id.startsWith('room_') &&
          now - (r.createdTimestamp || 0) < 12000 &&
          !queriedRooms.some((qr) => qr.id === r.id || qr.name === r.name)
      );

      const mergedRooms = queriedRooms.map((qr) => {
        const localRoom = prev.find((lr) => lr.id === qr.id);
        const effectiveIsJoined =
          localMemberships[qr.id] !== undefined
            ? localMemberships[qr.id]
            : Boolean(qr.isJoined || localRoom?.isJoined);

        const baseRoom: CommunityRoom =
          effectiveIsJoined !== Boolean(qr.isJoined)
            ? { ...qr, isJoined: effectiveIsJoined }
            : qr;

        if (!localRoom?.messages?.length) return baseRoom;
        const serverMsgs = baseRoom.messages || [];
        const inFlightMsgs = localRoom.messages.filter(
          (m) =>
            m.id.startsWith('rm_') &&
            now - m.createdTimestamp < 12000 &&
            !serverMsgs.some(
              (sm) =>
                sm.id === m.id ||
                (sm.text === m.text &&
                  sm.authorName === m.authorName &&
                  Math.abs(sm.createdTimestamp - m.createdTimestamp) < 15000)
            )
        );
        if (inFlightMsgs.length === 0) return baseRoom;
        return {
          ...baseRoom,
          messages: [...serverMsgs, ...inFlightMsgs],
        };
      });

      const finalRooms = [...inFlightRooms, ...mergedRooms];
      if (areRoomsEqualFast(prev, finalRooms)) return prev;
      return finalRooms;
    });
  }, [queriedRooms, user.id, user.username]);

  useEffect(() => {
    try {
      localStorage.setItem('bopoi_rooms', JSON.stringify(rooms));
    } catch {
      // ignore
    }
  }, [rooms]);

  useEffect(() => {
    if (!queriedMessages) return;
    setMessages((prev) => {
      if (areMessagesEqualFast(prev, queriedMessages)) return prev;
      return queriedMessages;
    });
    setSelectedMessage((prevMsg) => {
      if (!prevMsg) return null;
      return queriedMessages.find((m) => m.id === prevMsg.id) || prevMsg;
    });
  }, [queriedMessages]);

  useEffect(() => {
    if (!queriedAnswers) return;
    setAnswers((prev) => {
      const prevKeys = Object.keys(prev);
      const nextKeys = Object.keys(queriedAnswers);
      if (
        prevKeys.length === nextKeys.length &&
        prevKeys.every((k) => prev[k]?.id === queriedAnswers[k]?.id && prev[k]?.likes === queriedAnswers[k]?.likes)
      ) {
        return prev;
      }
      return queriedAnswers;
    });
  }, [queriedAnswers]);

  // Centralized WebSocket Manager event listener for instant cross-tab / real-time updates
  useEffect(() => {
    return realtimeManager.onEvent((packet) => {
      const { type, payload } = packet;
      if (type === 'ROOM_MESSAGE_NEW' && payload) {
        const { roomId, message } = payload;
        if (roomId && message) {
          setRooms((prev) =>
            prev.map((r) => {
              if (r.id !== roomId) return r;
              if (r.messages?.some((m) => m.id === message.id)) return r;
              return {
                ...r,
                messages: [...(r.messages || []), message],
              };
            })
          );
        } else {
          queryClient.invalidateQueries({ queryKey: ['bopoi', 'rooms'] });
        }
      } else if (type === 'ROOM_CREATED' && payload?.room) {
        const { room } = payload;
        setRooms((prev) => {
          if (prev.some((r) => r.id === room.id)) return prev;
          return [room, ...prev];
        });
      } else if (type === 'ROOM_JOINED' && payload?.roomId) {
        const { roomId } = payload;
        setRooms((prev) =>
          prev.map((r) =>
            r.id === roomId ? { ...r, onlineCount: (r.onlineCount || 1) + 1 } : r
          )
        );
      } else if (type === 'ROOM_PERSONA_ASSIGNED' && payload?.roomId && payload?.persona) {
        const { roomId, persona } = payload;
        setRooms((prev) =>
          prev.map((r) => {
            if (r.id !== roomId) return r;
            return {
              ...r,
              assignedPersonas: {
                ...(r.assignedPersonas || {}),
                [persona.userId]: persona,
              },
            };
          })
        );
      } else if (type === 'POSTS_UPDATED') {
        queryClient.invalidateQueries({ queryKey: ['bopoi', 'socialPosts'] });
      } else if (type === 'ROOMS_UPDATED') {
        queryClient.invalidateQueries({ queryKey: ['bopoi', 'rooms'] });
      } else if (type === 'MESSAGES_UPDATED') {
        queryClient.invalidateQueries({ queryKey: ['bopoi', 'messages'] });
      } else if (type === 'ANSWERS_UPDATED') {
        queryClient.invalidateQueries({ queryKey: ['bopoi', 'answers'] });
      } else if (type === 'FOLLOWS_UPDATED') {
        setFollowEdges(getLocalFollowEdges());
        queryClient.invalidateQueries({ queryKey: ['bopoi', 'profiles'] });
      }
    });
  }, [queryClient]);

  useEffect(() => {
    try {
      localStorage.setItem('bopoi_creators', JSON.stringify(creators));
    } catch {
      // ignore
    }
  }, [creators]);

  useEffect(() => {
    try {
      const sanitizedAccounts = accounts.map((acc) => ({
        ...acc,
        email: acc.id === user.id ? acc.email : '',
      }));
      localStorage.setItem('bopoi_accounts', JSON.stringify(sanitizedAccounts));
    } catch {
      // ignore
    }
  }, [accounts, user.id]);

  useEffect(() => {
    try {
      localStorage.setItem('bopoi_authenticated', JSON.stringify(isAuthenticated));
    } catch {
      // ignore
    }
  }, [isAuthenticated]);

  useEffect(() => {
    try {
      localStorage.setItem('bopoi_sent_message_ids', JSON.stringify(sentMessageIds));
    } catch {
      // ignore
    }
  }, [sentMessageIds]);

  useEffect(() => {
    if (!isAuthenticated || !user.id || !user.username || user.username === 'student') return;
    localStorage.setItem('bopoi_user', JSON.stringify(user));
    syncCharacterToBackendStore({
      userId: user.id,
      username: user.username,
      avatarUrl: user.avatarUrl,
      moodId: characterMood,
    });
    setAccounts((prev) => {
      const exists = prev.some((a) => a.username.toLowerCase() === user.username.toLowerCase());
      if (exists) {
        return prev.map((a) =>
          a.username.toLowerCase() === user.username.toLowerCase() ? user : a
        );
      }
      return [user, ...prev];
    });
  }, [user, characterMood, isAuthenticated]);

  const syncCharacterConfig = (avatarUrl: string, moodId?: string) => {
    const nextMood = moodId || characterMood;
    const finalAvatar = applyMoodToAvatarUrl(avatarUrl, nextMood, user.username);
    syncCharacterToBackendStore({
      userId: user.id,
      username: user.username,
      avatarUrl: finalAvatar,
      moodId: nextMood,
    });
    updateProfile({ avatarUrl: finalAvatar });
  };

  const setCharacterMood = (moodId: string) => {
    const valid = CHARACTER_MOODS.find((m) => m.id === moodId || m.eyesId === moodId);
    if (!valid) return;
    setCharacterMoodState(valid.id);
    try {
      localStorage.setItem('bopoi_character_mood', valid.id);
    } catch {
      // ignore
    }
    const updatedAvatar = applyMoodToAvatarUrl(user.avatarUrl, valid.id, user.username);
    syncCharacterToBackendStore({
      userId: user.id,
      username: user.username,
      avatarUrl: updatedAvatar,
      moodId: valid.id,
    });
    setUser((prev) => ({ ...prev, avatarUrl: updatedAvatar }));
    if (supabase && user.id && /^[0-9a-f-]{36}$/i.test(user.id)) {
      supabase
        .from('profiles')
        .update({ avatar_url: updatedAvatar, character_mood: valid.id })
        .eq('id', user.id)
        .then(() => {});
    }
    realtimeManager.publish('CHARACTER_MOOD_UPDATED', {
      username: user.username,
      moodId: valid.id,
      avatarUrl: updatedAvatar,
    });
  };

  useEffect(() => {
    localStorage.setItem('bopoi_messages', JSON.stringify(allMessages));
    queryClient.setQueryData(['bopoi', 'messages'], allMessages);
  }, [allMessages, queryClient]);

  useEffect(() => {
    localStorage.setItem('bopoi_answers', JSON.stringify(answers));
    queryClient.setQueryData(['bopoi', 'answers'], answers);
  }, [answers, queryClient]);

  useEffect(() => {
    localStorage.setItem('bopoi_safety', JSON.stringify(safetySettings));
  }, [safetySettings]);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  };

  const isUserLoggedIn = Boolean(isAuthenticated && user.username && user.username !== 'student');

  // Active user's received messages
  const messages = isUserLoggedIn
    ? allMessages.filter((m) => m.recipientUsername?.toLowerCase() === user.username.toLowerCase())
    : [];

  const visibleNotifications = isUserLoggedIn ? notifications : [];
  const unreadCount = messages.filter((m) => !m.isRead && !m.isReported).length;
  const unreadNotificationsCount = visibleNotifications.filter((n) => !n.isRead).length;

  const markNotificationsRead = (notificationId?: string) => {
    setNotifications((prev) =>
      prev.map((n) =>
        !notificationId || n.id === notificationId ? { ...n, isRead: true } : n
      )
    );
    if (supabase && user.id && /^[0-9a-f-]{36}$/i.test(user.id)) {
      supabase
        .rpc('mark_notifications_read', {
          p_notification_id: notificationId || null,
        })
        .then(() => {});
    }
  };

  const findBlockedWord = (rawText: string): string | null => {
    const lower = rawText.toLowerCase();
    const allBlocked = [
      ...(platformSettings.globalBlockedWords || []),
      ...(safetySettings.hiddenWords || []),
    ];
    for (const word of allBlocked) {
      const clean = word?.trim().toLowerCase();
      if (clean && lower.includes(clean)) {
        return clean;
      }
    }
    return null;
  };

  const canUserWrite = (actionLabel: string = 'perform this action'): boolean => {
    if (user.isSuspended) {
      showToast(
        `Your account is currently suspended (${user.suspensionReason || 'Community policy violation'}).`,
        'error'
      );
      return false;
    }
    if (platformSettings.maintenanceMode && !isAdminUnlocked) {
      showToast(
        `Platform is currently in Maintenance Mode (read-only). Cannot ${actionLabel} right now.`,
        'error'
      );
      return false;
    }
    return true;
  };

  const sendAnonymousMessage = (recipientUsername: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) {
      return { success: false, error: 'Please enter a message before sending.' };
    }

    if (trimmed.length > 500) {
      return { success: false, error: 'Message cannot exceed 500 characters.' };
    }

    if (platformSettings.maintenanceMode && !isAdminUnlocked) {
      return {
        success: false,
        error: 'Platform is temporarily in Maintenance Mode (read-only). Please try again shortly.',
      };
    }

    if (user.isSuspended) {
      return {
        success: false,
        error: `Your account is suspended (${user.suspensionReason || 'Policy violation'}).`,
      };
    }

    const blockedWord = findBlockedWord(trimmed);
    if (blockedWord) {
      return {
        success: false,
        error: `This message contains a prohibited word ("${blockedWord}") and cannot be delivered.`,
      };
    }

    const cleanRecipient = recipientUsername.replace(/^@/, '').toLowerCase().trim();
    const recipientAcc = accounts.find((a) => a.username.toLowerCase() === cleanRecipient);

    if (recipientAcc?.isSuspended) {
      return {
        success: false,
        error: 'This recipient account is currently suspended and cannot receive messages.',
      };
    }

    if (
      (recipientAcc && recipientAcc.linkActive === false) ||
      (!user.linkActive && cleanRecipient === user.username.toLowerCase())
    ) {
      return {
        success: false,
        error: 'This link is temporarily paused by the recipient.',
      };
    }

    const tempId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newMessage: AnonymousMessage = {
      id: tempId,
      recipientUsername,
      text: trimmed,
      createdAt: 'Just now',
      createdTimestamp: Date.now(),
      isRead: false,
      isAnswered: false,
      likes: 0,
      repliesCount: 0,
      comments: [],
    };

    setMessages((prev) => [newMessage, ...prev]);
    setSentMessageIds((prev) => [tempId, ...prev]);
    setLastSentMessageId(tempId);

    if (supabase) {
      const senderToken = getOrCreateAnonymousSenderToken();
      supabase
        .rpc('send_anonymous_message', {
          p_recipient_username: recipientUsername,
          p_text: trimmed,
          p_sender_token: senderToken,
        })
        .then(({ data: realId, error }) => {
          if (!error && realId) {
            setMessages((prev) =>
              prev.map((m) => (m.id === tempId ? { ...m, id: String(realId) } : m))
            );
            setSentMessageIds((prev) =>
              prev.map((id) => (id === tempId ? String(realId) : id))
            );
            setLastSentMessageId(String(realId));
            queryClient.invalidateQueries({ queryKey: ['bopoi', 'messages'] });
          }
        });
    }

    showToast('Anonymous message delivered!', 'success');
    return { success: true, messageId: tempId };
  };

  const markAsRead = (messageId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, isRead: true, readAt: m.readAt || 'Just now' } : m
      )
    );
    if (supabase && /^[0-9a-f-]{36}$/i.test(messageId)) {
      supabase
        .from('anonymous_messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', messageId)
        .then(() => {});
    }
  };

  const resolveConvoViewerRole = (
    msg: AnonymousMessage,
    viewerRole?: 'recipient' | 'sender'
  ): 'recipient' | 'sender' => {
    if (viewerRole) return viewerRole;
    if (
      user.username &&
      msg.recipientUsername &&
      msg.recipientUsername.toLowerCase() === user.username.toLowerCase()
    ) {
      return 'recipient';
    }
    if (sentMessageIds.includes(msg.id)) {
      return 'sender';
    }
    return 'recipient';
  };

  const getUnreadConvoCount = (
    msg: AnonymousMessage,
    viewerRole?: 'recipient' | 'sender'
  ): number => {
    const comments = msg.comments || [];
    if (comments.length === 0) return 0;

    const role = resolveConvoViewerRole(msg, viewerRole);
    const viewerKey =
      role === 'recipient'
        ? `rec:${(user.username || msg.recipientUsername || 'owner').toLowerCase()}`
        : `snd:${msg.id}`;
    const lastReadTs =
      typeof readConvoMap[`${viewerKey}:ts:${msg.id}`] === 'number'
        ? (readConvoMap[`${viewerKey}:ts:${msg.id}`] as number)
        : 0;

    return comments.filter((comm) => {
      // Only count messages sent by the OTHER person in the 1-on-1 convo
      if (role === 'recipient') {
        const isSentByRecipient =
          comm.authorRole === 'recipient' ||
          (!comm.isAnonymous && comm.authorRole !== 'sender') ||
          Boolean(user.displayName && comm.authorName === user.displayName);
        if (isSentByRecipient) return false;
      } else {
        const isSentBySender =
          comm.authorRole === 'sender' ||
          (comm.isAnonymous && comm.authorRole !== 'recipient');
        if (isSentBySender) return false;
      }

      // Check if this incoming convo message has already been opened/read by the viewer
      if (comm.isRead) return false;
      if (readConvoMap[`${viewerKey}:c:${comm.id}`]) return false;
      if (lastReadTs > 0 && (comm.createdTimestamp || 0) <= lastReadTs) return false;

      return true;
    }).length;
  };

  const markConvoAsRead = (messageId: string, viewerRole?: 'recipient' | 'sender') => {
    const targetMsg =
      allMessages.find((m) => m.id === messageId) ||
      (selectedMessage?.id === messageId ? selectedMessage : undefined);
    const role = targetMsg
      ? resolveConvoViewerRole(targetMsg, viewerRole)
      : viewerRole || 'recipient';
    const viewerKey =
      role === 'recipient'
        ? `rec:${(user.username || targetMsg?.recipientUsername || 'owner').toLowerCase()}`
        : `snd:${messageId}`;

    setReadConvoMap((prev) => {
      const comments = targetMsg?.comments || [];
      const tsKey = `${viewerKey}:ts:${messageId}`;
      const prevTs = typeof prev[tsKey] === 'number' ? (prev[tsKey] as number) : 0;
      const maxCommentTs = comments.reduce(
        (acc, c) => Math.max(acc, c.createdTimestamp || 0),
        0
      );
      const allIdsMarked = comments.every((c) => Boolean(prev[`${viewerKey}:c:${c.id}`]));
      if (prevTs > 0 && prevTs >= maxCommentTs && allIdsMarked) {
        return prev;
      }
      const next: Record<string, number | boolean> = {
        ...prev,
        [tsKey]: Math.max(Date.now(), maxCommentTs),
      };
      comments.forEach((c) => {
        next[`${viewerKey}:c:${c.id}`] = true;
      });
      return next;
    });
  };

  const toggleLinkActive = () => {
    const willBeActive = !user.linkActive;
    requestConfirm({
      badge: 'Anonymous Link Status',
      title: willBeActive ? 'Reopen your anonymous link?' : 'Pause your anonymous link?',
      description: willBeActive
        ? `Reopening bopoi.com/@${user.username}/ask will allow anyone with your link to submit new anonymous questions again.`
        : `Pausing bopoi.com/@${user.username}/ask will temporarily stop visitors from sending you new anonymous questions until you turn it back on.`,
      confirmLabel: willBeActive ? 'Yes, Reopen Link' : 'Yes, Pause Link',
      variant: willBeActive ? 'primary' : 'warning',
      icon: willBeActive ? 'unlock' : 'lock',
      onConfirm: () => {
        setUser((prev) => {
          const nextState = !prev.linkActive;
          if (supabase && prev.id && /^[0-9a-f-]{36}$/i.test(prev.id)) {
            supabase
              .from('profiles')
              .update({ link_active: nextState })
              .eq('id', prev.id)
              .then(() => {});
          }
          showToast(
            nextState
              ? 'Your link is now active and receiving messages!'
              : 'Your link has been paused. Visitors cannot submit messages.',
            nextState ? 'success' : 'info'
          );
          return { ...prev, linkActive: nextState };
        });
      },
    });
  };

  const saveAnswer = (
    messageId: string,
    answerText: string,
    isPublic: boolean,
    isDraft: boolean = false
  ) => {
    const targetMsg = allMessages.find((m) => m.id === messageId) || selectedMessage;
    const questionText = targetMsg?.text || 'Anonymous Question';

    const answerRecord: MessageAnswer = {
      id: answers[messageId]?.id || `ans_${Date.now()}`,
      messageId,
      questionText,
      answerText: answerText.trim(),
      createdAt: 'Just now',
      isPublic,
      isDraft,
      likes: answers[messageId]?.likes || 0,
      authorDisplayName: user.displayName,
      authorUsername: user.username,
    };

    setAnswers((prev) => ({ ...prev, [messageId]: answerRecord }));
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, isRead: true, isAnswered: !isDraft } : m
      )
    );

    if (
      supabase &&
      user.id &&
      /^[0-9a-f-]{36}$/i.test(user.id) &&
      /^[0-9a-f-]{36}$/i.test(messageId)
    ) {
      supabase
        .from('message_answers')
        .upsert(
          {
            message_id: messageId,
            author_user_id: user.id,
            author_username: user.username,
            author_display_name: user.displayName,
            question_text: questionText,
            answer_text: answerText.trim(),
            is_public: isPublic,
            is_draft: isDraft,
          },
          { onConflict: 'message_id' }
        )
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ['bopoi', 'answers'] });
        });
    }

    showToast(
      isDraft ? 'Draft saved successfully.' : 'Response saved and ready to share!',
      'success'
    );
  };

  const executeDeleteMessage = (messageId: string, silentToast: boolean = false) => {
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    setAnswers((prev) => {
      const next = { ...prev };
      delete next[messageId];
      return next;
    });
    if (selectedMessage?.id === messageId) {
      setSelectedMessage(null);
      if (activeView === 'message-detail') {
        setActiveView('inbox');
      }
    }
    if (supabase && /^[0-9a-f-]{36}$/i.test(messageId)) {
      supabase
        .from('anonymous_messages')
        .delete()
        .eq('id', messageId)
        .then(() => {});
    }
    if (!silentToast) {
      showToast('Message removed from inbox', 'info');
    }
  };

  const deleteMessage = (messageId: string) => {
    const targetMsg =
      allMessages.find((m) => m.id === messageId) ||
      (selectedMessage?.id === messageId ? selectedMessage : undefined);
    const snippet = targetMsg?.text
      ? `"${targetMsg.text.slice(0, 70)}${targetMsg.text.length > 70 ? '...' : ''}"`
      : 'this anonymous message';

    requestConfirm({
      badge: 'Inbox Action',
      title: 'Delete this anonymous message?',
      description: `Are you sure you want to permanently remove ${snippet} from your inbox? Any private 1-on-1 replies on this message will also be removed.`,
      confirmLabel: 'Yes, Delete Message',
      variant: 'danger',
      icon: 'delete',
      onConfirm: () => {
        executeDeleteMessage(messageId);
      },
    });
  };

  const reportMessage = (messageId: string, reason: string) => {
    requestConfirm({
      badge: 'Campus Safety Report',
      title: 'Report this anonymous message?',
      description: `Are you sure you want to flag this message for "${reason}" and submit it to Campus Moderators?`,
      confirmLabel: 'Yes, Report Message',
      variant: 'warning',
      icon: 'shield',
      onConfirm: () => {
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, isReported: true, reportReason: reason } : m))
        );
        const newReport: ModerationReport = {
          id: `rep_${Date.now()}`,
          reporterUserId: user.id || undefined,
          reporterUsername: user.username || 'student',
          targetType: 'anonymous_message',
          targetId: messageId,
          reason,
          status: 'pending',
          createdAt: 'Just now',
          createdTimestamp: Date.now(),
        };
        setModerationReports((prev) => [newReport, ...prev]);
        if (supabase && /^[0-9a-f-]{36}$/i.test(messageId)) {
          supabase
            .rpc('report_or_block_message', {
              p_message_id: messageId,
              p_reason: reason,
              p_block_sender: false,
            })
            .then(() => {
              syncAdminTablesFromSupabase();
            });
        }
        if (activeView === 'message-detail') {
          setActiveView('inbox');
        }
        showToast(`Report received: "${reason}". Message flagged.`, 'info');
      },
    });
  };

  const blockSender = (messageId: string) => {
    requestConfirm({
      badge: 'Safety Shield',
      title: 'Block this anonymous sender?',
      description:
        'Blocking this sender will permanently delete this message and prevent their device token from sending you future anonymous messages.',
      confirmLabel: 'Yes, Block Sender',
      variant: 'danger',
      icon: 'shield',
      onConfirm: () => {
        setSafetySettings((prev) => ({
          ...prev,
          blockedSenders: [...prev.blockedSenders, `sender_${messageId}`],
        }));
        if (supabase && /^[0-9a-f-]{36}$/i.test(messageId)) {
          supabase
            .rpc('report_or_block_message', {
              p_message_id: messageId,
              p_reason: 'Blocked by recipient',
              p_block_sender: true,
            })
            .then(() => {});
        }
        executeDeleteMessage(messageId, true);
        showToast('Sender blocked from submitting future messages.', 'info');
      },
    });
  };

  const unblockSender = (senderId: string) => {
    requestConfirm({
      badge: 'Safety Shield',
      title: 'Unblock this anonymous sender?',
      description:
        'Are you sure you want to unblock this sender? They will be able to send anonymous messages to your link again.',
      confirmLabel: 'Yes, Unblock',
      variant: 'warning',
      icon: 'unlock',
      onConfirm: () => {
        const nextBlocked = safetySettings.blockedSenders.filter((s) => s !== senderId);
        setSafetySettings((prev) => ({
          ...prev,
          blockedSenders: nextBlocked,
        }));
        if (supabase && user.id && /^[0-9a-f-]{36}$/i.test(user.id)) {
          supabase
            .from('user_safety_settings')
            .upsert({ user_id: user.id, blocked_senders: nextBlocked }, { onConflict: 'user_id' })
            .then(() => {});
        }
        showToast('Sender unblocked.', 'info');
      },
    });
  };

  const clearBlockedSenders = () => {
    requestConfirm({
      badge: 'Safety Shield',
      title: 'Unblock all blocked senders?',
      description: `Are you sure you want to unblock all ${safetySettings.blockedSenders.length} blocked sender(s)?`,
      confirmLabel: 'Yes, Unblock All',
      variant: 'warning',
      icon: 'unlock',
      onConfirm: () => {
        setSafetySettings((prev) => ({
          ...prev,
          blockedSenders: [],
        }));
        if (supabase && user.id && /^[0-9a-f-]{36}$/i.test(user.id)) {
          supabase
            .from('user_safety_settings')
            .upsert({ user_id: user.id, blocked_senders: [] }, { onConflict: 'user_id' })
            .then(() => {});
        }
        showToast('All blocked senders cleared.', 'info');
      },
    });
  };

  const submitSupportTicket = (subject: string, message: string) => {
    const cleanSubject = subject.trim() || 'General Question';
    const cleanMessage = message.trim();
    if (!cleanMessage) return;
    const ticketId = `support_${Date.now()}`;
    const newTicketReport: ModerationReport = {
      id: ticketId,
      reporterUserId: user.id || undefined,
      reporterUsername: user.username || 'student',
      targetType: 'support_ticket',
      targetId: ticketId,
      reason: `[${cleanSubject}] ${cleanMessage}`,
      status: 'pending',
      createdAt: 'Just now',
      createdTimestamp: Date.now(),
    };
    setModerationReports((prev) => [newTicketReport, ...prev]);
    try {
      const existingRaw = localStorage.getItem('bopoi_support_tickets');
      const existing = existingRaw ? JSON.parse(existingRaw) : [];
      existing.unshift({
        id: ticketId,
        username: user.username,
        subject: cleanSubject,
        message: cleanMessage,
        createdAt: new Date().toISOString(),
      });
      localStorage.setItem('bopoi_support_tickets', JSON.stringify(existing.slice(0, 50)));
    } catch {
      // ignore storage errors
    }
    if (supabase) {
      supabase
        .from('moderation_reports')
        .insert({
          reporter_user_id: user.id && /^[0-9a-f-]{36}$/i.test(user.id) ? user.id : null,
          reporter_username: user.username || 'student',
          target_type: 'support_ticket',
          target_id: ticketId,
          reason: `[${cleanSubject}] ${cleanMessage}`,
        })
        .then(() => {
          syncAdminTablesFromSupabase();
        });
    }
    showToast(`Support ticket sent (${cleanSubject}). We'll reply soon!`, 'success');
  };

  const updateProfile = (updates: Partial<UserProfile>) => {
    const {
      isAdmin: _ignoreAdmin,
      role: _ignoreRole,
      isVerified: _ignoreVerified,
      isSuspended: _ignoreSuspended,
      suspensionReason: _ignoreReason,
      ...safeUpdates
    } = updates;

    setUser((prev) => {
      const next = { ...prev, ...safeUpdates };
      if (supabase && prev.id && /^[0-9a-f-]{36}$/i.test(prev.id)) {
        supabase
          .from('profiles')
          .update({
            display_name: next.displayName,
            username: next.username,
            avatar_url: next.avatarUrl,
            bio: next.bio,
            campus: next.campus,
            link_active: next.linkActive,
            custom_prompt: next.customPrompt,
          })
          .eq('id', prev.id)
          .then(() => {});
      }
      if (safeUpdates.avatarUrl || safeUpdates.displayName || safeUpdates.username) {
        setSocialPosts((posts) =>
          posts.map((p) => {
            const isOwnPost =
              !p.isAnonymous &&
              (p.authorUserId === prev.id ||
                p.authorUsername.toLowerCase() === prev.username.toLowerCase());
            const updatedComments = p.comments?.map((c) =>
              !c.isAnonymous && c.authorUsername.toLowerCase() === prev.username.toLowerCase()
                ? {
                    ...c,
                    authorAvatar: next.avatarUrl,
                    authorName: next.displayName,
                    authorUsername: next.username,
                  }
                : c
            );
            if (!isOwnPost) {
              return updatedComments ? { ...p, comments: updatedComments } : p;
            }
            return {
              ...p,
              authorAvatar: next.avatarUrl,
              authorName: next.displayName,
              authorUsername: next.username,
              comments: updatedComments,
            };
          })
        );
      }
      return next;
    });
    showToast('Profile updated successfully!', 'success');
  };

  const addHiddenWord = (word: string) => {
    const trimmed = word.trim().toLowerCase();
    if (!trimmed || safetySettings.hiddenWords.includes(trimmed)) return;
    const nextWords = [...safetySettings.hiddenWords, trimmed];
    setSafetySettings((prev) => ({
      ...prev,
      hiddenWords: nextWords,
    }));
    if (supabase && user.id && /^[0-9a-f-]{36}$/i.test(user.id)) {
      supabase
        .from('user_safety_settings')
        .upsert({ user_id: user.id, hidden_words: nextWords }, { onConflict: 'user_id' })
        .then(() => {});
    }
    showToast(`Added "${trimmed}" to blocked words list.`, 'success');
  };

  const removeHiddenWord = (word: string) => {
    requestConfirm({
      badge: 'Safety Filter',
      title: `Remove "${word}" from filter?`,
      description: `Are you sure you want to remove "${word}" from your blocked words list? Messages containing this word will no longer be automatically blocked.`,
      confirmLabel: 'Remove Word',
      variant: 'warning',
      icon: 'delete',
      onConfirm: () => {
        const nextWords = safetySettings.hiddenWords.filter((w) => w !== word);
        setSafetySettings((prev) => ({
          ...prev,
          hiddenWords: nextWords,
        }));
        if (supabase && user.id && /^[0-9a-f-]{36}$/i.test(user.id)) {
          supabase
            .from('user_safety_settings')
            .upsert({ user_id: user.id, hidden_words: nextWords }, { onConflict: 'user_id' })
            .then(() => {});
        }
        showToast(`Removed "${word}" from filter.`, 'info');
      },
    });
  };

  const copyUserLink = async (usernameOverride?: string): Promise<boolean> => {
    const targetUsername = usernameOverride || user.username;
    const linkUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}/?ask=${targetUsername}#public-ask`
        : `https://bopoi.com/@${targetUsername}/ask`;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(linkUrl);
        showToast(`Link for @${targetUsername} copied! Share on WhatsApp or IG`, 'success');
        return true;
      }
    } catch {
      // Fallback
    }
    showToast(`Link: ${linkUrl}`, 'info');
    return true;
  };

  const openPublicAskFor = (recipient?: UserProfile | CreatorProfile | string | null) => {
    if (!recipient) {
      setAskingRecipient(user);
      setActiveView('public-ask');
      return;
    }
    if (typeof recipient === 'string') {
      const clean = recipient.replace(/^@/, '').trim().toLowerCase();
      const foundAcc = accounts.find((a) => a.username.toLowerCase() === clean);
      const foundCreator = creators.find((c) => c.username.toLowerCase() === clean);
      setAskingRecipient(
        foundAcc ||
          foundCreator || {
            id: `usr_${clean}`,
            username: clean,
            displayName: clean.split('_')[0].replace(/^\w/, (c) => c.toUpperCase()),
            email: '',
            avatarUrl: serializeCharacterConfig(generateDeterministicCharacter(clean)),
            bio: 'Send me an anonymous message on Bopoi!',
            linkActive: true,
            followersCount: 0,
            followingCount: 0,
            campus: 'Chrisland University',
          }
      );
      setActiveView('public-ask');
      return;
    }
    setAskingRecipient(recipient);
    setActiveView('public-ask');
  };


  const requireAuth = (actionDescription: string = 'use this feature'): boolean => {
    if (isUserLoggedIn) return true;
    showToast(`Please sign in to ${actionDescription}.`, 'info');
    setActiveView('profile');
    return false;
  };

  const toggleAnswerLike = (messageId: string) => {
    if (!requireAuth('like answers')) return;
    const existing = answers[messageId];
    if (!existing) return;
    setAnswers((prev) => ({
      ...prev,
      [messageId]: {
        ...existing,
        likes: existing.likes + 1,
      },
    }));
    if (supabase && /^[0-9a-f-]{36}$/i.test(existing.id)) {
      supabase.rpc('toggle_answer_like', { p_answer_id: existing.id }).then(() => {});
    }
  };

  const loginAccount = (usernameOrEmail: string, password?: string) => {
    const query = usernameOrEmail.replace(/^@/, '').trim().toLowerCase();
    if (!query) {
      return { success: false, error: 'Please enter your username or email.' };
    }

    const found = accounts.find(
      (a) => a.username.toLowerCase() === query || a.email.toLowerCase() === query
    );

    const sb = supabase;
    if (sb) {
      if (!password || !password.trim()) {
        return { success: false, error: 'Please enter your account password to sign in.' };
      }
      const targetEmail = query.includes('@') ? query : found?.email || `${query}@bopoi.edu.ng`;
      sb.auth
        .signInWithPassword({
          email: targetEmail,
          password,
        })
        .then(async ({ data, error }) => {
          if (error || !data.user) {
            showToast(error?.message || 'Invalid login credentials.', 'error');
            return;
          }
          const { data: profileRow } = await sb
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .maybeSingle();
          if (profileRow) {
            const loadedUser: UserProfile = {
              id: profileRow.id,
              username: profileRow.username,
              displayName: profileRow.display_name,
              email: profileRow.email || data.user.email || '',
              avatarUrl: profileRow.avatar_url,
              bio: profileRow.bio || '',
              linkActive: profileRow.link_active ?? true,
              followersCount: profileRow.followers_count ?? 0,
              followingCount: profileRow.following_count ?? 0,
              campus: profileRow.campus || 'Chrisland University',
              customPrompt:
                profileRow.custom_prompt || "There's something you've been wanting to ask...",
              isAdmin: Boolean(profileRow.is_admin || profileRow.role === 'admin'),
              isVerified: Boolean(profileRow.is_verified || profileRow.is_creator),
              isSuspended: Boolean(profileRow.is_suspended),
              suspensionReason: profileRow.suspension_reason || undefined,
              role:
                profileRow.role ||
                (profileRow.is_admin ? 'admin' : profileRow.is_creator ? 'creator' : 'student'),
            };
            setUser(loadedUser);
            setIsAuthenticated(true);
            setSelectedMessage(null);
            setAccounts((prev) => [
              loadedUser,
              ...prev.filter((a) => a.username.toLowerCase() !== loadedUser.username.toLowerCase()),
            ]);
            setActiveView('profile');
            showToast(`Welcome back, ${loadedUser.displayName} (@${loadedUser.username})!`, 'success');
            queryClient.invalidateQueries();
          }
        });
      return { success: true };
    }

    if (found && !found.isAdmin && found.role !== 'admin') {
      setUser(found);
      setIsAuthenticated(true);
      setSelectedMessage(null);
      showToast(`Welcome back, ${found.displayName} (@${found.username})!`, 'success');
      return { success: true };
    }

    return {
      success: false,
      error: `No student account found for "${usernameOrEmail}". Please create your account first.`,
    };
  };

  const registerAccount = (params: {
    displayName: string;
    username: string;
    email: string;
    password?: string;
    campus?: string;
    bio?: string;
    avatarUrl: string;
    selectedTags?: string[];
    facultyId?: string;
  }) => {
    const cleanUsername = params.username
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '');
    if (!cleanUsername || !params.displayName.trim()) {
      return { success: false, error: 'Display name and username are required.' };
    }
    if (cleanUsername.length < 3) {
      return { success: false, error: 'Username must be at least 3 characters long.' };
    }
    if (['student', 'anonymous', 'admin', 'bopoi', 'support'].includes(cleanUsername)) {
      return { success: false, error: 'This username is reserved. Please pick another one.' };
    }
    if (accounts.some((a) => a.username.toLowerCase() === cleanUsername)) {
      return { success: false, error: `@${cleanUsername} is already taken. Please choose another username.` };
    }
    if (!params.password || params.password.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters long.' };
    }
    const cleanEmail = params.email.trim() || `${cleanUsername}@bopoi.edu.ng`;
    const fallbackId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `usr_${cleanUsername}_${Date.now().toString(36)}`;

    const newAccount: UserProfile = {
      id: fallbackId,
      username: cleanUsername,
      displayName: params.displayName.trim(),
      email: cleanEmail,
      avatarUrl: params.avatarUrl,
      bio: params.bio?.trim() || `Campus student at ${params.campus || 'Chrisland University'}`,
      linkActive: true,
      followersCount: 0,
      followingCount: 0,
      campus: params.campus || 'Chrisland University',
      customPrompt: "There's something you've been wanting to ask...",
      role: 'student',
      isAdmin: false,
      isVerified: false,
      isCreator: false,
      isSuspended: false,
    };

    const runColdStartActivation = (targetUserId: string) => {
      executeActivationPipeline(
        supabase,
        targetUserId,
        cleanUsername,
        {
          selectedTags:
            params.selectedTags && params.selectedTags.length > 0
              ? params.selectedTags
              : ['Campus Life', 'Relationships', 'Tech & Coding'],
          facultyId: params.facultyId || 'General',
          avatarArchetype: params.avatarUrl || 'default',
          campusId: params.campus || 'Chrisland University',
        },
        creators,
        rooms
      ).then((activation) => {
        if (!activation.success) return;
        if (activation.seededIcebreakers.length > 0) {
          setMessages((prev) => [...activation.seededIcebreakers, ...prev]);
        }
        if (activation.joinedRoomIds.length > 0) {
          const joinedSet = new Set(activation.joinedRoomIds);
          setRooms((prev) =>
            prev.map((r) => (joinedSet.has(r.id) ? { ...r, isJoined: true } : r))
          );
        }
      });
    };

    if (supabase) {
      supabase.auth
        .signUp({
          email: cleanEmail,
          password: params.password,
          options: {
            data: {
              username: cleanUsername,
              display_name: params.displayName.trim(),
              avatar_url: params.avatarUrl,
              campus: params.campus || 'Chrisland University',
              bio: newAccount.bio,
            },
          },
        })
        .then(({ data, error }) => {
          if (error) {
            showToast(error.message || 'Unable to register account.', 'error');
            return;
          }
          if (data?.user?.id) {
            const realUser: UserProfile = { ...newAccount, id: data.user.id };
            setUser(realUser);
            setIsAuthenticated(true);
            setAccounts((prev) => {
              const filtered = prev.filter((a) => a.username.toLowerCase() !== cleanUsername);
              return [realUser, ...filtered];
            });
            runColdStartActivation(data.user.id);
            setActiveView('profile');
            showToast(`Account @${cleanUsername} created!`, 'success');
            queryClient.invalidateQueries();
          }
        });
      return { success: true };
    }

    setAccounts((prev) => {
      const filtered = prev.filter((a) => a.username.toLowerCase() !== cleanUsername);
      return [newAccount, ...filtered];
    });
    setUser(newAccount);
    setIsAuthenticated(true);
    runColdStartActivation(fallbackId);
    showToast(`Account @${cleanUsername} created!`, 'success');
    return { success: true };
  };

  const switchAccount = (username: string) => {
    const clean = username.replace(/^@/, '').trim().toLowerCase();
    const found = accounts.find((a) => a.username.toLowerCase() === clean);
    if (!found) return;
    if (isSupabaseConfigured || found.isAdmin || found.role === 'admin' || found.id !== user.id) {
      showToast('Please sign in with your account password to switch accounts.', 'error');
      return;
    }
    setUser(found);
    setIsAuthenticated(true);
    setSelectedMessage(null);
    showToast(`Switched account to ${found.displayName} (@${found.username})`, 'success');
  };

  const logoutAccount = () => {
    requestConfirm({
      badge: 'Account Session',
      title: `Sign out of @${user.username || 'account'}?`,
      description:
        'Are you sure you want to sign out of your current campus session? You can sign back in anytime with your username and password.',
      confirmLabel: 'Yes, Sign Out',
      variant: 'danger',
      icon: 'logout',
      onConfirm: () => {
        if (supabase) {
          supabase.auth.signOut().catch(() => {});
        }
        try {
          localStorage.removeItem('bopoi_user');
          localStorage.removeItem('bopoi_notifications');
          localStorage.setItem('bopoi_authenticated', 'false');
        } catch {
          // ignore
        }
        setNotifications([]);
        setUser(DEFAULT_GUEST_USER);
        setIsAuthenticated(false);
        setSelectedMessage(null);
        setActiveView('profile');
        showToast('Signed out.', 'info');
      },
    });
  };

  const addReaction = (messageId: string, emoji: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        const currentReactions = { ...(m.reactions || {}) };
        const prevReaction = m.userReaction;

        if (prevReaction === emoji) {
          currentReactions[emoji] = Math.max(0, (currentReactions[emoji] || 1) - 1);
          if (currentReactions[emoji] === 0) delete currentReactions[emoji];
          return {
            ...m,
            reactions: currentReactions,
            userReaction: undefined,
          };
        }

        if (prevReaction && currentReactions[prevReaction]) {
          currentReactions[prevReaction] = Math.max(0, currentReactions[prevReaction] - 1);
          if (currentReactions[prevReaction] === 0) delete currentReactions[prevReaction];
        }

        currentReactions[emoji] = (currentReactions[emoji] || 0) + 1;
        return {
          ...m,
          reactions: currentReactions,
          userReaction: emoji,
        };
      })
    );

    if (supabase && /^[0-9a-f-]{36}$/i.test(messageId)) {
      supabase
        .rpc('add_anonymous_message_reaction', {
          p_message_id: messageId,
          p_emoji: emoji,
        })
        .then(() => {});
    }
  };

  const toggleLike = (messageId: string) => {
    addReaction(messageId, '❤️');
  };

  const addComment = (
    messageId: string,
    text: string,
    roleOrIsAnon?: 'recipient' | 'sender' | boolean
  ) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const isSender = roleOrIsAnon === 'sender' || roleOrIsAnon === true;
    const authorRole: 'recipient' | 'sender' = isSender ? 'sender' : 'recipient';
    const isAnonymous = isSender;
    const authorName = isSender ? 'Original Sender' : user.displayName;
    const authorAvatar = isSender ? undefined : user.avatarUrl;

    const newComment = {
      id: `c_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      messageId,
      authorName,
      authorRole,
      authorAvatar,
      isAnonymous,
      text: trimmed,
      createdAt: 'Just now',
      createdTimestamp: Date.now(),
      likes: 0,
    };

    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        const currentComments = m.comments || [];
        const nextComments = [...currentComments, newComment];
        return {
          ...m,
          comments: nextComments,
          repliesCount: nextComments.length,
        };
      })
    );

    if (supabase && /^[0-9a-f-]{36}$/i.test(messageId)) {
      supabase
        .rpc('post_private_convo_reply', {
          p_message_id: messageId,
          p_text: trimmed,
          p_sender_token: getOrCreateAnonymousSenderToken(),
        })
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ['bopoi', 'messages'] });
        });
    }

    showToast(isSender ? 'Anonymous reply sent!' : 'Reply sent to original sender!', 'success');
  };

  const togglePostLike = (postId: string) => {
    if (!requireAuth('like posts')) return;
    recordPostBanditInteraction(supabase, postId, true, 1500);
    setSocialPosts((prev) =>
      prev.map((post) => {
        if (post.id !== postId) return post;
        const willLike = !post.hasLiked;
        return {
          ...post,
          hasLiked: willLike,
          likes: willLike ? post.likes + 1 : Math.max(0, post.likes - 1),
        };
      })
    );
    if (supabase && /^[0-9a-f-]{36}$/i.test(postId)) {
      supabase.rpc('toggle_post_like', { p_post_id: postId }).then(() => {});
    }
  };

  const togglePostBookmark = (postId: string) => {
    if (!requireAuth('bookmark posts')) return;
    setSocialPosts((prev) =>
      prev.map((post) => {
        if (post.id !== postId) return post;
        const isBookmarked = !post.isBookmarked;
        showToast(isBookmarked ? 'Post saved to bookmarks!' : 'Post removed from bookmarks', 'info');
        return { ...post, isBookmarked };
      })
    );
    if (supabase && /^[0-9a-f-]{36}$/i.test(postId)) {
      supabase.rpc('toggle_post_bookmark', { p_post_id: postId }).then(() => {});
    }
  };

  const votePoll = (postId: string, optionId: string) => {
    if (!requireAuth('vote on polls')) return;
    setSocialPosts((prev) =>
      prev.map((post) => {
        if (post.id !== postId || !post.pollOptions) return post;
        if (post.userVotedOptionId === optionId) return post;

        const prevVoted = post.userVotedOptionId;
        const updatedOptions = post.pollOptions.map((opt) => {
          if (opt.id === optionId) return { ...opt, votes: opt.votes + 1 };
          if (opt.id === prevVoted) return { ...opt, votes: Math.max(0, opt.votes - 1) };
          return opt;
        });

        const newTotal = prevVoted ? post.pollTotalVotes : (post.pollTotalVotes || 0) + 1;
        showToast('Vote recorded!', 'success');
        return {
          ...post,
          pollOptions: updatedOptions,
          pollTotalVotes: newTotal,
          userVotedOptionId: optionId,
        };
      })
    );

    if (
      supabase &&
      /^[0-9a-f-]{36}$/i.test(postId) &&
      /^[0-9a-f-]{36}$/i.test(optionId)
    ) {
      supabase
        .rpc('cast_poll_vote', { p_post_id: postId, p_option_id: optionId })
        .then(() => {});
    }
  };

  const addPostComment = (
    postId: string,
    text: string,
    parentId?: string,
    replyToAuthor?: string,
    isAnonymous: boolean = false,
    moodOverride?: string
  ) => {
    if (!requireAuth('comment or reply')) return;
    if (!canUserWrite('post comments')) return;
    if (!text.trim()) return;
    const blocked = findBlockedWord(text);
    if (blocked) {
      showToast(`Comment blocked: contains prohibited word ("${blocked}").`, 'error');
      return;
    }
    const effectiveMood = moodOverride || characterMood;
    const commentAvatar = isAnonymous
      ? undefined
      : applyMoodToAvatarUrl(user.avatarUrl, effectiveMood, user.username);

    const newComment: SocialComment = {
      id: `comm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      postId,
      authorName: isAnonymous ? 'Anonymous Student' : user.displayName,
      authorUsername: isAnonymous ? 'anonymous' : user.username,
      authorAvatar: commentAvatar,
      authorCampus: user.campus || 'Chrisland University',
      isAnonymous,
      text: text.trim(),
      createdAt: 'Just now',
      createdTimestamp: Date.now(),
      likes: 0,
      hasLiked: false,
      parentId: parentId || undefined,
      replyToAuthor: replyToAuthor || undefined,
    };

    const tempCommentId = newComment.id;
    const appendCommentToPost = (post: SocialPost): SocialPost => {
      if (post.id !== postId) return post;
      const currentComments = post.comments || [];
      return {
        ...post,
        comments: [...currentComments, newComment],
        commentsCount: post.commentsCount + 1,
      };
    };

    setSocialPosts((prev) => prev.map(appendCommentToPost));
    setSelectedPost((prev) => (prev && prev.id === postId ? appendCommentToPost(prev) : prev));

    if (supabase && /^[0-9a-f-]{36}$/i.test(postId)) {
      supabase
        .from('post_comments')
        .insert({
          post_id: postId,
          parent_id: parentId && /^[0-9a-f-]{36}$/i.test(parentId) ? parentId : null,
          author_user_id: user.id && /^[0-9a-f-]{36}$/i.test(user.id) ? user.id : null,
          author_name: newComment.authorName,
          author_username: newComment.authorUsername,
          author_avatar: commentAvatar || null,
          author_campus: user.campus || 'Chrisland University',
          is_anonymous: isAnonymous,
          reply_to_author: replyToAuthor || null,
          text: text.trim(),
        })
        .select('id')
        .single()
        .then(({ data: inserted }) => {
          if (inserted?.id) {
            const realId = String(inserted.id);
            const swapCommentId = (post: SocialPost): SocialPost => {
              if (post.id !== postId || !post.comments) return post;
              const alreadyHasReal = post.comments.some((c) => c.id === realId);
              if (alreadyHasReal) {
                return {
                  ...post,
                  comments: post.comments.filter((c) => c.id !== tempCommentId),
                };
              }
              return {
                ...post,
                comments: post.comments.map((c) =>
                  c.id === tempCommentId ? { ...c, id: realId } : c
                ),
              };
            };
            setSocialPosts((prev) => prev.map(swapCommentId));
            setSelectedPost((prev) => (prev && prev.id === postId ? swapCommentId(prev) : prev));
          }
          queryClient.invalidateQueries({ queryKey: ['bopoi', 'socialPosts'] });
        });
    }

    showToast(parentId ? 'Reply added to thread!' : 'Comment published!', 'success');
  };

  const shareCommentLink = (postId: string, commentId: string, authorName?: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://bopoi.com';
    const url = `${origin}/?post=${postId}&comment=${commentId}#post-${postId}`;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(url).catch(() => {});
    }
    showToast(
      `Comment link${authorName ? ` by ${authorName}` : ''} copied to clipboard!`,
      'success'
    );
  };

  const toggleCommentLike = (postId: string, commentId: string) => {
    if (!requireAuth('like comments')) return;
    setSocialPosts((prev) =>
      prev.map((post) => {
        if (post.id !== postId) return post;
        const currentComments = post.comments || [];
        return {
          ...post,
          comments: currentComments.map((comm) => {
            if (comm.id !== commentId) return comm;
            const nextLiked = !comm.hasLiked;
            return {
              ...comm,
              hasLiked: nextLiked,
              likes: nextLiked ? comm.likes + 1 : Math.max(0, comm.likes - 1),
            };
          }),
        };
      })
    );
    if (supabase && /^[0-9a-f-]{36}$/i.test(commentId)) {
      supabase.rpc('toggle_comment_like', { p_comment_id: commentId }).then(() => {});
    }
  };

  const incrementPostShare = (postId: string) => {
    setSocialPosts((prev) =>
      prev.map((post) => {
        if (post.id !== postId) return post;
        return {
          ...post,
          sharesCount: (post.sharesCount || 0) + 1,
        };
      })
    );
    if (supabase && /^[0-9a-f-]{36}$/i.test(postId)) {
      supabase.rpc('increment_post_share', { p_post_id: postId }).then(() => {});
    }
  };

  const openPostShare = (post: SocialPost) => {
    setSharingPost(post);
  };

  const toggleJoinRoom = (roomId: string) => {
    if (!requireAuth('join rooms')) return;
    const targetRoom = rooms.find((r) => r.id === roomId);
    const roomName = targetRoom?.name || 'Room';
    const isCurrentlyJoined = Boolean(targetRoom?.isJoined);

    requestConfirm({
      badge: isCurrentlyJoined ? 'Room Membership' : 'Join Confirmation',
      title: isCurrentlyJoined
        ? `Leave #${roomName}?`
        : 'Are you sure you want to join this campus group?',
      description: isCurrentlyJoined
        ? `Are you sure you want to leave #${roomName}? You can rejoin the room anytime from the Campus Rooms directory.`
        : `You are about to join #${roomName}. You'll chat behind an anonymous campus persona mask alongside ${
            targetRoom?.membersCount || 1
          } other student(s).`,
      confirmLabel: isCurrentlyJoined ? 'Yes, Leave Room' : 'Yes, Join Group',
      cancelLabel: 'Cancel',
      variant: isCurrentlyJoined ? 'warning' : 'primary',
      icon: isCurrentlyJoined ? 'leave' : 'join',
      roomPreview: targetRoom
        ? {
            name: targetRoom.name,
            category: targetRoom.category,
            description: targetRoom.description,
            iconEmoji: targetRoom.iconEmoji,
            iconBg: targetRoom.iconBg,
            membersCount: targetRoom.membersCount,
            onlineCount: targetRoom.onlineCount || 1,
            isAnonymousOnly: targetRoom.isAnonymousOnly,
            isJoined: targetRoom.isJoined,
          }
        : undefined,
      onConfirm: () => {
        const userKey = user.id || user.username || 'guest';
        setRooms((prev) =>
          prev.map((room) => {
            if (room.id !== roomId) return room;
            const nextState = !room.isJoined;
            saveLocalRoomMembership(userKey, roomId, nextState);
            const alreadyCountedAsMember =
              Boolean(user.id) &&
              (room.creatorUserId === user.id || Boolean(room.assignedPersonas?.[user.id]));
            const nextMembersCount = nextState
              ? alreadyCountedAsMember
                ? Math.max(1, room.membersCount)
                : room.membersCount + 1
              : Math.max(1, room.membersCount - 1);

            showToast(
              nextState ? `Joined #${room.name}!` : `Left #${room.name}`,
              nextState ? 'success' : 'info'
            );
            return {
              ...room,
              isJoined: nextState,
              membersCount: nextMembersCount,
            };
          })
        );
        if (supabase && /^[0-9a-f-]{36}$/i.test(roomId)) {
          supabase.rpc('toggle_join_room', { p_room_id: roomId }).then(() => {});
        }
      },
    });
  };

  // ============================================================================
  // REAL-TIME FOLLOW GRAPH HELPERS (FOLLOWERS / FOLLOWING LISTS & COUNTS)
  // ============================================================================
  const buildPeopleDirectory = (): Map<string, CreatorProfile> => {
    const dir = new Map<string, CreatorProfile>();
    const myUsernameLower = (user.username || '').toLowerCase();
    const tombstones = getLocalUnfollowTombstones();

    const myFollowedSet = new Set<string>();
    followEdges.forEach((e) => {
      if (
        (user.id && e.followerId === user.id) ||
        (myUsernameLower && e.followerUsername.toLowerCase() === myUsernameLower)
      ) {
        myFollowedSet.add(e.followingUsername.toLowerCase());
        if (e.followingId) myFollowedSet.add(e.followingId.toLowerCase());
      }
    });
    creators.forEach((c) => {
      if (c.isFollowing) {
        const pairKey = `${myUsernameLower}->${c.username.toLowerCase()}`;
        if (!tombstones.has(pairKey)) {
          myFollowedSet.add(c.username.toLowerCase());
          if (c.id) myFollowedSet.add(c.id.toLowerCase());
        }
      }
    });

    creators.forEach((c) => {
      const uLower = c.username.toLowerCase();
      dir.set(uLower, {
        ...c,
        isFollowing: myFollowedSet.has(uLower) || myFollowedSet.has(c.id.toLowerCase()),
      });
    });

    accounts.forEach((a) => {
      const uLower = a.username.toLowerCase();
      if (!dir.has(uLower)) {
        dir.set(uLower, {
          id: a.id,
          name: a.displayName || a.username,
          username: a.username,
          avatarUrl: a.avatarUrl,
          campus: a.campus || 'Chrisland University',
          bio: a.bio || '',
          followersCount: a.followersCount ?? 0,
          followingCount: a.followingCount ?? 0,
          isFollowing: myFollowedSet.has(uLower) || myFollowedSet.has(a.id.toLowerCase()),
          isVerified: Boolean(a.isVerified || a.isCreator),
          isAdmin: Boolean(a.isAdmin || a.role === 'admin'),
        });
      }
    });

    if (user.username && user.username !== 'student') {
      const uLower = user.username.toLowerCase();
      dir.set(uLower, {
        id: user.id || `usr_${uLower}`,
        name: user.displayName || user.username,
        username: user.username,
        avatarUrl: user.avatarUrl,
        campus: user.campus || 'Chrisland University',
        bio: user.bio || '',
        followersCount: user.followersCount ?? 0,
        followingCount: user.followingCount ?? 0,
        isFollowing: false,
        isVerified: Boolean(user.isVerified || user.isCreator),
        isAdmin: Boolean(user.isAdmin || user.role === 'admin'),
      });
    }

    socialPosts.forEach((p) => {
      if (!p.isAnonymous && p.authorUsername) {
        const uLower = p.authorUsername.toLowerCase();
        if (!dir.has(uLower)) {
          dir.set(uLower, {
            id: p.authorUserId || `usr_${uLower}`,
            name: p.authorName || p.authorUsername,
            username: p.authorUsername,
            avatarUrl:
              p.authorAvatar ||
              serializeCharacterConfig(generateDeterministicCharacter(p.authorUsername)),
            campus: p.authorCampus || 'Chrisland University',
            bio: 'Active campus student on Bopoi',
            followersCount: 0,
            followingCount: 0,
            isFollowing: myFollowedSet.has(uLower),
            isVerified: Boolean(p.authorIsVerified),
            isAdmin: false,
          });
        }
      }
    });

    return dir;
  };

  const isFollowingUser = (usernameOrId?: string): boolean => {
    if (!usernameOrId) return false;
    const key = usernameOrId.replace(/^@/, '').toLowerCase().trim();
    const myUsernameLower = (user.username || '').toLowerCase();
    if (!key || key === myUsernameLower || key === (user.id || '').toLowerCase()) return false;

    const tombstones = getLocalUnfollowTombstones();
    const matchedCreator = creators.find(
      (c) => c.id.toLowerCase() === key || c.username.toLowerCase() === key
    );
    const targetUsernameLower = (matchedCreator?.username || key).toLowerCase();
    if (tombstones.has(`${myUsernameLower}->${targetUsernameLower}`)) return false;

    const inEdges = followEdges.some(
      (e) =>
        ((user.id && e.followerId === user.id) ||
          e.followerUsername.toLowerCase() === myUsernameLower) &&
        (e.followingUsername.toLowerCase() === key ||
          e.followingId.toLowerCase() === key ||
          e.followingUsername.toLowerCase() === targetUsernameLower)
    );
    if (inEdges) return true;
    return Boolean(matchedCreator?.isFollowing);
  };

  const getFollowingForUser = (usernameOrId?: string): CreatorProfile[] => {
    const dir = buildPeopleDirectory();
    const rawTarget = (usernameOrId || user.username || '').replace(/^@/, '').trim();
    const targetLower = rawTarget.toLowerCase();
    const myUsernameLower = (user.username || '').toLowerCase();
    const tombstones = getLocalUnfollowTombstones();

    let targetProfile = dir.get(targetLower);
    if (!targetProfile) {
      for (const p of dir.values()) {
        if (p.id.toLowerCase() === targetLower) {
          targetProfile = p;
          break;
        }
      }
    }
    const resolvedUsernameLower = (targetProfile?.username || rawTarget).toLowerCase();
    const resolvedIdLower = (targetProfile?.id || '').toLowerCase();
    const isTargetMe = resolvedUsernameLower === myUsernameLower;

    const resultsMap = new Map<string, CreatorProfile>();

    followEdges.forEach((e) => {
      const fUser = e.followerUsername.toLowerCase();
      const fId = (e.followerId || '').toLowerCase();
      if (fUser === resolvedUsernameLower || (resolvedIdLower && fId === resolvedIdLower)) {
        const tKey = e.followingUsername.toLowerCase();
        if (tombstones.has(`${resolvedUsernameLower}->${tKey}`)) return;
        let found = dir.get(tKey);
        if (!found && e.followingId) {
          for (const p of dir.values()) {
            if (p.id === e.followingId) {
              found = p;
              break;
            }
          }
        }
        if (found && found.username.toLowerCase() !== resolvedUsernameLower) {
          resultsMap.set(found.username.toLowerCase(), found);
        } else if (tKey && tKey !== resolvedUsernameLower) {
          resultsMap.set(tKey, {
            id: e.followingId || `usr_${tKey}`,
            name: e.followingUsername,
            username: e.followingUsername,
            avatarUrl: serializeCharacterConfig(generateDeterministicCharacter(tKey)),
            campus: 'Chrisland University',
            bio: 'Campus student on Bopoi',
            followersCount: 1,
            followingCount: 0,
            isFollowing: isTargetMe ? true : isFollowingUser(tKey),
          });
        }
      }
    });

    if (isTargetMe) {
      creators.forEach((c) => {
        const cLower = c.username.toLowerCase();
        if (
          c.isFollowing &&
          cLower !== resolvedUsernameLower &&
          !tombstones.has(`${resolvedUsernameLower}->${cLower}`)
        ) {
          const d = dir.get(cLower) || c;
          resultsMap.set(cLower, { ...d, isFollowing: true });
        }
      });
    } else if (resultsMap.size === 0 && (targetProfile?.followingCount || 0) > 0) {
      // Backfill deterministic campus peers when viewing another student who has a stored followingCount
      const needed = Math.min(targetProfile?.followingCount || 0, 12);
      const candidates = Array.from(dir.values()).filter(
        (p) => p.username.toLowerCase() !== resolvedUsernameLower
      );
      for (let i = 0; i < candidates.length && resultsMap.size < needed; i++) {
        const cand = candidates[i];
        resultsMap.set(cand.username.toLowerCase(), cand);
      }
    }

    return Array.from(resultsMap.values());
  };

  const getFollowersForUser = (usernameOrId?: string): CreatorProfile[] => {
    const dir = buildPeopleDirectory();
    const rawTarget = (usernameOrId || user.username || '').replace(/^@/, '').trim();
    const targetLower = rawTarget.toLowerCase();
    const myUsernameLower = (user.username || '').toLowerCase();

    let targetProfile = dir.get(targetLower);
    if (!targetProfile) {
      for (const p of dir.values()) {
        if (p.id.toLowerCase() === targetLower) {
          targetProfile = p;
          break;
        }
      }
    }
    const resolvedUsernameLower = (targetProfile?.username || rawTarget).toLowerCase();
    const resolvedIdLower = (targetProfile?.id || '').toLowerCase();
    const isTargetMe = resolvedUsernameLower === myUsernameLower;

    const resultsMap = new Map<string, CreatorProfile>();

    // If viewing another student's followers and the active logged-in user follows them, include active user first
    if (!isTargetMe && isFollowingUser(resolvedUsernameLower) && user.username && user.username !== 'student') {
      const meProfile = dir.get(myUsernameLower);
      if (meProfile) {
        resultsMap.set(myUsernameLower, meProfile);
      }
    }

    followEdges.forEach((e) => {
      const tUser = e.followingUsername.toLowerCase();
      const tId = (e.followingId || '').toLowerCase();
      if (tUser === resolvedUsernameLower || (resolvedIdLower && tId === resolvedIdLower)) {
        const fKey = e.followerUsername.toLowerCase();
        let found = dir.get(fKey);
        if (!found && e.followerId) {
          for (const p of dir.values()) {
            if (p.id === e.followerId) {
              found = p;
              break;
            }
          }
        }
        if (found && found.username.toLowerCase() !== resolvedUsernameLower) {
          resultsMap.set(found.username.toLowerCase(), found);
        } else if (fKey && fKey !== resolvedUsernameLower) {
          resultsMap.set(fKey, {
            id: e.followerId || `usr_${fKey}`,
            name: e.followerUsername,
            username: e.followerUsername,
            avatarUrl: serializeCharacterConfig(generateDeterministicCharacter(fKey)),
            campus: 'Chrisland University',
            bio: 'Campus student on Bopoi',
            followersCount: 0,
            followingCount: 1,
            isFollowing: isFollowingUser(fKey),
          });
        }
      }
    });

    // If the profile has a stored followersCount higher than explicit rows in user_follows, populate deterministic campus followers so count & list match
    const storedCount = isTargetMe
      ? user.followersCount ?? targetProfile?.followersCount ?? 0
      : targetProfile?.followersCount ?? 0;

    if (storedCount > resultsMap.size) {
      const candidates = Array.from(dir.values()).filter(
        (p) =>
          p.username.toLowerCase() !== resolvedUsernameLower &&
          !resultsMap.has(p.username.toLowerCase())
      );
      for (let i = 0; i < candidates.length && resultsMap.size < storedCount; i++) {
        const cand = candidates[i];
        resultsMap.set(cand.username.toLowerCase(), cand);
      }
    }

    return Array.from(resultsMap.values());
  };

  // Keep current user's followingCount and followersCount synchronized in real time with the live follow graph
  useEffect(() => {
    if (!isAuthenticated || !user.username || user.username === 'student') return;
    const liveFollowingCount = getFollowingForUser(user.username).length;
    const explicitFollowersCount = followEdges.filter(
      (e) =>
        e.followingUsername.toLowerCase() === user.username.toLowerCase() ||
        (user.id && e.followingId === user.id)
    ).length;
    const nextFollowersCount = Math.max(user.followersCount ?? 0, explicitFollowersCount);

    if (
      user.followingCount !== liveFollowingCount ||
      user.followersCount !== nextFollowersCount
    ) {
      setUser((prev) => ({
        ...prev,
        followingCount: liveFollowingCount,
        followersCount: nextFollowersCount,
      }));
      setAccounts((prev) =>
        prev.map((a) =>
          a.username.toLowerCase() === user.username.toLowerCase()
            ? {
                ...a,
                followingCount: liveFollowingCount,
                followersCount: nextFollowersCount,
              }
            : a
        )
      );
    }
  }, [followEdges, creators, isAuthenticated, user.username, user.id]);

  const toggleFollowCreator = (creatorIdOrUsername: string) => {
    if (!requireAuth('follow students')) return;
    if (!canUserWrite('follow students')) return;

    const rawKey = String(creatorIdOrUsername || '').replace(/^@/, '').trim();
    if (!rawKey) return;
    const keyLower = rawKey.toLowerCase();

    if (
      keyLower === (user.username || '').toLowerCase() ||
      (user.id && keyLower === user.id.toLowerCase())
    ) {
      showToast('You cannot follow your own account.', 'info');
      return;
    }

    const dir = buildPeopleDirectory();
    let targetPerson = dir.get(keyLower);
    if (!targetPerson) {
      for (const p of dir.values()) {
        if (p.id.toLowerCase() === keyLower) {
          targetPerson = p;
          break;
        }
      }
    }

    const targetId = targetPerson?.id || rawKey;
    const targetUsername = targetPerson?.username || rawKey;
    const targetName = targetPerson?.name || targetUsername;
    const targetLower = targetUsername.toLowerCase();

    const currentlyFollowing = isFollowingUser(targetUsername);
    const nextFollow = !currentlyFollowing;

    const executeToggleFollow = () => {
      const edge: FollowEdge = {
        followerId: user.id || `usr_${user.username.toLowerCase()}`,
        followerUsername: user.username,
        followingId: targetId,
        followingUsername: targetUsername,
        createdAt: Date.now(),
      };

    const nextEdges = markLocalFollowEdge(edge, nextFollow);
    setFollowEdges(nextEdges);

    const prevTargetFollowers = targetPerson?.followersCount ?? 0;
    const nextTargetFollowers = nextFollow
      ? prevTargetFollowers + 1
      : Math.max(0, prevTargetFollowers - 1);

    setCreators((prev) => {
      const exists = prev.some(
        (c) => c.id === targetId || c.username.toLowerCase() === targetLower
      );
      if (exists) {
        return prev.map((creator) => {
          if (creator.id !== targetId && creator.username.toLowerCase() !== targetLower) {
            return creator;
          }
          return {
            ...creator,
            isFollowing: nextFollow,
            followersCount: nextTargetFollowers,
          };
        });
      }
      if (!targetPerson) return prev;
      return [
        {
          ...targetPerson,
          isFollowing: nextFollow,
          followersCount: nextTargetFollowers,
        },
        ...prev,
      ];
    });

    const currentFollowingCount = getFollowingForUser(user.username).length;
    const nextMyFollowingCount = nextFollow
      ? currentFollowingCount + (currentlyFollowing ? 0 : 1)
      : Math.max(0, currentFollowingCount - (currentlyFollowing ? 1 : 0));

    setUser((prev) => ({
      ...prev,
      followingCount: nextMyFollowingCount,
    }));

    setAccounts((prev) =>
      prev.map((acc) => {
        if (acc.id === targetId || acc.username.toLowerCase() === targetLower) {
          return { ...acc, followersCount: nextTargetFollowers };
        }
        if (
          acc.id === user.id ||
          acc.username.toLowerCase() === (user.username || '').toLowerCase()
        ) {
          return { ...acc, followingCount: nextMyFollowingCount };
        }
        return acc;
      })
    );

    setSelectedPublicUser((prevPub) => {
      if (!prevPub) return null;
      if (prevPub.id === targetId || prevPub.username.toLowerCase() === targetLower) {
        return {
          ...prevPub,
          followersCount: nextTargetFollowers,
          ...('isFollowing' in prevPub ? { isFollowing: nextFollow } : {}),
        };
      }
      if (
        prevPub.id === user.id ||
        prevPub.username.toLowerCase() === (user.username || '').toLowerCase()
      ) {
        return {
          ...prevPub,
          followingCount: nextMyFollowingCount,
        };
      }
      return prevPub;
    });

    realtimeManager.publish('FOLLOWS_UPDATED', {
      followerUsername: user.username,
      followingUsername: targetUsername,
      isFollowing: nextFollow,
    });

    // Invalidate Redis Adamic-Adar 2-hop graph cache so PYMK updates immediately
    invalidateGraphCacheForUser(user.id, user.username);

    showToast(
      nextFollow ? `Following ${targetName}` : `Unfollowed ${targetName}`,
      nextFollow ? 'success' : 'info'
    );

    // Sync with Supabase RPC + direct table fallback
    if (supabase && /^[0-9a-f-]{36}$/i.test(targetId) && user.id && /^[0-9a-f-]{36}$/i.test(user.id)) {
      const sb = supabase;
      const myId = user.id;
      (async () => {
        const { error: rpcError } = await sb.rpc('toggle_follow_user', {
          p_target_user_id: targetId,
        });
        if (rpcError) {
          // Direct fallback to user_follows and profiles if RPC is unavailable
          if (nextFollow) {
            await sb
              .from('user_follows')
              .upsert(
                { follower_id: myId, following_id: targetId },
                { onConflict: 'follower_id,following_id' }
              );
          } else {
            await sb
              .from('user_follows')
              .delete()
              .eq('follower_id', myId)
              .eq('following_id', targetId);
          }
          await sb
            .from('profiles')
            .update({ followers_count: nextTargetFollowers })
            .eq('id', targetId);
          await sb
            .from('profiles')
            .update({ following_count: nextMyFollowingCount })
            .eq('id', myId);
        }
        queryClient.invalidateQueries({ queryKey: ['bopoi', 'profiles'] });
      })();
    }
    };

    requestConfirm({
      badge: nextFollow ? 'Campus Connection' : 'Following List',
      title: nextFollow ? `Follow ${targetName} (@${targetUsername})?` : `Unfollow ${targetName} (@${targetUsername})?`,
      description: nextFollow
        ? `Would you like to follow @${targetUsername}? Their public campus posts, polls, and story answers will be prioritized in your feed.`
        : `Are you sure you want to unfollow @${targetUsername}? You can follow them again anytime from their profile.`,
      confirmLabel: nextFollow ? `Follow @${targetUsername}` : `Unfollow @${targetUsername}`,
      variant: nextFollow ? 'primary' : 'warning',
      icon: nextFollow ? 'follow' : 'unfollow',
      onConfirm: executeToggleFollow,
    });
  };

  const createRoom = (params: {
    name: string;
    description: string;
    category: string;
    iconEmoji: string;
    iconBg: string;
    starterMessage?: string;
    isAnonymousOnly?: boolean;
    creatorAlias?: string;
    tags?: string[];
  }): CommunityRoom => {
    if (!requireAuth('create an anonymous room')) return rooms[0];
    if (!canUserWrite('create rooms')) return rooms[0];
    if (!platformSettings.allowNewRooms && !isAdminUnlocked) {
      showToast('Room creation is temporarily disabled by Campus Moderators.', 'error');
      return rooms[0];
    }
    const blocked = findBlockedWord(`${params.name} ${params.description} ${params.starterMessage || ''}`);
    if (blocked) {
      showToast(`Room blocked: contains prohibited word ("${blocked}").`, 'error');
      return rooms[0];
    }
    const tempRoomId = `room_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const starterText =
      params.starterMessage?.trim() ||
      `Welcome to #${params.name.trim()}! Anyone can join and have anonymous conversations here. Say hello!`;

    const initialMsg: RoomMessage = {
      id: `rm_${Date.now()}_init`,
      roomId: tempRoomId,
      authorName: params.creatorAlias || 'Anonymous Founder',
      authorUsername: 'anon_host',
      authorCampus: user.campus || 'Campus Student',
      authorMaskEmoji: params.iconEmoji || '🎭',
      authorAlias: params.creatorAlias || 'Anonymous Founder',
      isAnonymous: true,
      text: starterText,
      createdAt: 'Just now',
      createdTimestamp: Date.now(),
      likes: 0,
      hasLiked: false,
    };

    const creatorCleanAlias =
      params.creatorAlias
        ?.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]|\uFE0F|\u200D/g, '')
        .trim() || 'Masked Student';
    const creatorPersona: RoomAssignedPersona = {
      userId: user.id || 'guest',
      alias: creatorCleanAlias,
      maskId: 'masked-student',
      maskEmoji: params.iconEmoji || '🎭',
      isCustom: false,
      assignedAt: Date.now(),
    };
    persistRoomPersona(tempRoomId, creatorPersona);

    const newRoom: CommunityRoom = {
      id: tempRoomId,
      name: params.name.trim(),
      description: params.description.trim(),
      category: params.category || 'Campus',
      membersCount: 1,
      onlineCount: 1,
      isJoined: true,
      iconEmoji: params.iconEmoji || '💬',
      iconBg: params.iconBg || '#5420F5',
      messages: [initialMsg],
      creatorUserId: user.id || undefined,
      creatorName: user.displayName,
      creatorAlias: params.creatorAlias || 'Anonymous Founder',
      isCustomRoom: true,
      isAnonymousOnly: params.isAnonymousOnly ?? true,
      tags: params.tags && params.tags.length > 0 ? params.tags : [params.category || 'Campus'],
      createdAt: 'Just now',
      createdTimestamp: Date.now(),
      assignedPersonas: {
        [user.id || 'guest']: creatorPersona,
      },
    };

    const userKey = user.id || user.username || 'guest';
    saveLocalRoomMembership(userKey, tempRoomId, true);
    setRooms((prev) => [newRoom, ...prev]);
    setSelectedRoomId(tempRoomId);
    setActiveView('room-detail');

    if (supabase) {
      supabase
        .from('community_rooms')
        .insert({
          name: newRoom.name,
          description: newRoom.description,
          category: newRoom.category,
          icon_emoji: newRoom.iconEmoji,
          icon_bg: newRoom.iconBg,
          creator_user_id: user.id && /^[0-9a-f-]{36}$/i.test(user.id) ? user.id : null,
          creator_name: user.displayName,
          creator_alias: newRoom.creatorAlias,
          is_custom_room: true,
          is_anonymous_only: newRoom.isAnonymousOnly,
          tags: newRoom.tags,
          members_count: 1,
          online_count: 1,
        })
        .select('id')
        .single()
        .then(async ({ data: insertedRoom, error }) => {
          if (!error && insertedRoom?.id && supabase) {
            const realRoomId = insertedRoom.id;
            saveLocalRoomMembership(userKey, realRoomId, true);
            persistRoomPersona(realRoomId, creatorPersona);
            const validCreatorUuid = user.id && /^[0-9a-f-]{36}$/i.test(user.id);
            if (validCreatorUuid) {
              await supabase.from('room_assigned_personas').upsert(
                {
                  room_id: realRoomId,
                  user_id: user.id,
                  alias: creatorPersona.alias,
                  mask_id: creatorPersona.maskId,
                  mask_emoji: creatorPersona.maskEmoji,
                  is_custom: creatorPersona.isCustom,
                },
                { onConflict: 'room_id,user_id' }
              );
              await supabase.from('room_memberships').upsert(
                {
                  room_id: realRoomId,
                  user_id: user.id,
                },
                { onConflict: 'room_id,user_id' }
              );
              await supabase
                .from('community_rooms')
                .update({ members_count: 1 })
                .eq('id', realRoomId);
            }
            await supabase.from('room_messages').insert({
              room_id: realRoomId,
              author_user_id: validCreatorUuid ? user.id : null,
              author_name: initialMsg.authorName,
              author_username: initialMsg.authorUsername,
              author_campus: initialMsg.authorCampus,
              author_mask_emoji: initialMsg.authorMaskEmoji,
              author_alias: initialMsg.authorAlias,
              is_anonymous: true,
              text: starterText,
            });
            setRooms((prev) =>
              prev.map((r) =>
                r.id === tempRoomId ? { ...r, id: realRoomId, membersCount: 1, isJoined: true } : r
              )
            );
            setSelectedRoomId(realRoomId);
            queryClient.invalidateQueries({ queryKey: ['bopoi', 'rooms'] });
          }
        });
    }

    showToast(`Anonymous room #${newRoom.name} created!`, 'success');
    return newRoom;
  };

  const deleteRoom = (roomId: string) => {
    const targetRoom = rooms.find((r) => r.id === roomId);
    const roomLabel = targetRoom?.name || roomId.slice(0, 8);
    requestConfirm({
      badge: 'Delete Anonymous Room',
      title: `Delete #${roomLabel} permanently?`,
      description: `Are you sure you want to permanently delete the #${roomLabel} room and all of its chat history? This action cannot be undone.`,
      confirmLabel: 'Yes, Delete Room',
      variant: 'danger',
      icon: 'delete',
      onConfirm: () => {
        markAdminDeletedRoom(roomId);
        removeRoomPersona(roomId);
        setRooms((prev) => prev.filter((r) => r.id !== roomId));
        if (selectedRoomId === roomId) {
          setSelectedRoomId(rooms.find((r) => r.id !== roomId)?.id || null);
          setActiveView('rooms');
        }
        if (supabase && /^[0-9a-f-]{36}$/i.test(roomId)) {
          supabase
            .from('community_rooms')
            .delete()
            .eq('id', roomId)
            .then(() => {});
        }
        if (isAdminUnlockedRef.current) {
          recordAdminAudit(
            'delete_room',
            'community_room',
            roomId,
            `Deleted room #${roomLabel}`
          );
        }
        showToast(`Room #${roomLabel} deleted`, 'info');
      },
    });
  };

  const updateRoomIcon = (roomId: string, iconEmoji: string, iconBg: string) => {
    const targetRoom = rooms.find((r) => r.id === roomId);
    if (!targetRoom) return;

    const isCreator = Boolean(user.id && targetRoom.creatorUserId === user.id);
    if (!isCreator && !isAdminUnlocked) {
      showToast('Only the room creator or an admin can customize this room icon', 'error');
      return;
    }

    saveAdminRoomOverride(roomId, { iconEmoji, iconBg });
    setRooms((prev) =>
      prev.map((r) => (r.id === roomId ? { ...r, iconEmoji, iconBg } : r))
    );

    if (supabase && /^[0-9a-f-]{36}$/i.test(roomId)) {
      supabase
        .from('community_rooms')
        .update({
          icon_emoji: iconEmoji,
          icon_bg: iconBg,
          updated_at: new Date().toISOString(),
        })
        .eq('id', roomId)
        .then(({ error }) => {
          if (!error) {
            queryClient.invalidateQueries({ queryKey: ['bopoi', 'rooms'] });
          }
        });
    }

    showToast('Room icon updated!', 'success');
  };

  const assignPersonaToRoom = (roomId: string, persona: RoomAssignedPersona) => {
    if (!isUserLoggedIn) return;
    persistRoomPersona(roomId, persona);
    setRooms((prev) =>
      prev.map((r) => {
        if (r.id !== roomId) return r;
        return {
          ...r,
          assignedPersonas: {
            ...(r.assignedPersonas || {}),
            [persona.userId]: persona,
          },
        };
      })
    );

    if (
      supabase &&
      user.id &&
      /^[0-9a-f-]{36}$/i.test(user.id) &&
      /^[0-9a-f-]{36}$/i.test(roomId)
    ) {
      supabase
        .from('room_assigned_personas')
        .upsert(
          {
            room_id: roomId,
            user_id: user.id,
            alias: persona.alias,
            mask_id: persona.maskId,
            mask_emoji: persona.maskEmoji,
            is_custom: persona.isCustom,
          },
          { onConflict: 'room_id,user_id' }
        )
        .then(() => {});
    }
  };

  const getRoomPersona = (roomId: string): RoomAssignedPersona | null => {
    const r = rooms.find((room) => room.id === roomId);
    return getSavedRoomPersona(roomId, user.id || 'guest', r?.assignedPersonas);
  };

  const sendRoomMessage = (
    roomId: string,
    text: string,
    isAnonymous: boolean = true,
    authorAlias?: string,
    replyTo?: RoomMessage['replyTo'],
    authorMaskEmoji?: string
  ) => {
    if (!requireAuth('chat in rooms')) return;
    if (!canUserWrite('send room messages')) return;
    const trimmed = text.trim();
    if (!trimmed) return;

    const targetRoom = rooms.find((r) => r.id === roomId);
    if (targetRoom?.isLocked && !isAdminUnlocked) {
      showToast('This room is currently locked by Campus Moderators.', 'error');
      return;
    }

    const blocked = findBlockedWord(trimmed);
    if (blocked) {
      showToast(`Message blocked: contains prohibited word ("${blocked}").`, 'error');
      return;
    }

    const isAnon = targetRoom?.isAnonymousOnly ? true : (isAnonymous ?? true);
    const chosenName = isAnon ? authorAlias || 'Anonymous Student' : user.displayName;

    const newMsg: RoomMessage = {
      id: `rm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      roomId,
      authorName: chosenName,
      authorUsername: isAnon ? 'anon_student' : user.username,
      authorAvatar: isAnon ? undefined : user.avatarUrl,
      authorCampus: user.campus || 'Campus',
      authorMaskEmoji: authorMaskEmoji || (isAnon ? '🎭' : undefined),
      authorAlias: isAnon ? chosenName : undefined,
      isAnonymous: isAnon,
      text: trimmed,
      createdAt: 'Just now',
      createdTimestamp: Date.now(),
      likes: 0,
      hasLiked: false,
      replyTo,
      reactions: {},
      userReactions: {},
    };

    setRooms((prev) =>
      prev.map((r) => {
        if (r.id !== roomId) return r;
        const currentMsgs = r.messages || [];
        return {
          ...r,
          isJoined: true,
          messages: [...currentMsgs, newMsg],
        };
      })
    );

    const tempMsgId = newMsg.id;

    if (supabase && /^[0-9a-f-]{36}$/i.test(roomId)) {
      supabase
        .from('room_messages')
        .insert({
          room_id: roomId,
          author_user_id: user.id && /^[0-9a-f-]{36}$/i.test(user.id) ? user.id : null,
          author_name: newMsg.authorName,
          author_username: newMsg.authorUsername,
          author_avatar: newMsg.authorAvatar || null,
          author_campus: newMsg.authorCampus || null,
          author_mask_emoji: newMsg.authorMaskEmoji || null,
          author_alias: newMsg.authorAlias || null,
          is_anonymous: isAnon,
          text: trimmed,
          reply_to_id:
            replyTo?.id && /^[0-9a-f-]{36}$/i.test(replyTo.id) ? replyTo.id : null,
          reply_to_author_name: replyTo?.authorName || null,
          reply_to_text: replyTo?.text || null,
        })
        .select('id')
        .single()
        .then(({ data: inserted }) => {
          if (inserted?.id) {
            const realId = String(inserted.id);
            setRooms((prev) =>
              prev.map((r) => {
                if (r.id !== roomId || !r.messages) return r;
                const alreadyHasReal = r.messages.some((m) => m.id === realId);
                if (alreadyHasReal) {
                  return {
                    ...r,
                    messages: r.messages.filter((m) => m.id !== tempMsgId),
                  };
                }
                return {
                  ...r,
                  messages: r.messages.map((m) =>
                    m.id === tempMsgId ? { ...m, id: realId } : m
                  ),
                };
              })
            );
          }
          queryClient.invalidateQueries({ queryKey: ['bopoi', 'rooms'] });
        });
    }

    showToast('Message sent to room!', 'success');
  };

  const toggleRoomMessageLike = (roomId: string, messageId: string) => {
    if (!requireAuth('like room messages')) return;
    setRooms((prev) =>
      prev.map((r) => {
        if (r.id !== roomId || !r.messages) return r;
        const updatedMsgs = r.messages.map((m) => {
          if (m.id !== messageId) return m;
          const hasLiked = !m.hasLiked;
          return {
            ...m,
            hasLiked,
            likes: hasLiked ? m.likes + 1 : Math.max(0, m.likes - 1),
          };
        });
        return { ...r, messages: updatedMsgs };
      })
    );
    if (supabase && /^[0-9a-f-]{36}$/i.test(messageId)) {
      supabase.rpc('toggle_room_message_like', { p_message_id: messageId }).then(() => {});
    }
  };

  const addRoomMessageReaction = (roomId: string, messageId: string, emoji: string) => {
    if (!requireAuth('react to room messages')) return;
    setRooms((prev) =>
      prev.map((r) => {
        if (r.id !== roomId || !r.messages) return r;
        const updatedMsgs = r.messages.map((m) => {
          if (m.id !== messageId) return m;
          const currentReactions = { ...(m.reactions || {}) };
          const userReactions = { ...(m.userReactions || {}) };
          if (userReactions[emoji]) {
            userReactions[emoji] = false;
            currentReactions[emoji] = Math.max(0, (currentReactions[emoji] || 1) - 1);
            if (currentReactions[emoji] === 0) delete currentReactions[emoji];
          } else {
            userReactions[emoji] = true;
            currentReactions[emoji] = (currentReactions[emoji] || 0) + 1;
          }
          return {
            ...m,
            reactions: currentReactions,
            userReactions,
          };
        });
        return { ...r, messages: updatedMsgs };
      })
    );
    if (supabase && /^[0-9a-f-]{36}$/i.test(messageId)) {
      supabase
        .rpc('toggle_room_message_reaction', { p_message_id: messageId, p_emoji: emoji })
        .then(() => {});
    }
  };

  const executeEnterRoom = (roomId: string) => {
    const targetRoom = rooms.find((r) => r.id === roomId);
    const wasJoined = Boolean(targetRoom?.isJoined);
    const userKey = user.id || user.username || 'guest';
    saveLocalRoomMembership(userKey, roomId, true);

    if (activeView !== 'room-detail' || selectedRoomId !== roomId) {
      pushNavHistory({
        view: activeView,
        roomId: selectedRoomId,
        post: selectedPost,
        publicUser: selectedPublicUser,
      });
    }
    setSelectedRoomId(roomId);
    setRooms((prev) =>
      prev.map((r) => {
        if (r.id !== roomId) return r;
        const alreadyCountedAsMember =
          Boolean(user.id) &&
          (r.creatorUserId === user.id || Boolean(r.assignedPersonas?.[user.id]));
        const nextMembersCount = r.isJoined
          ? r.membersCount
          : alreadyCountedAsMember
          ? Math.max(1, r.membersCount)
          : r.membersCount + 1;
        return {
          ...r,
          isJoined: true,
          membersCount: nextMembersCount,
        };
      })
    );
    setActiveViewState('room-detail');

    if (supabase && /^[0-9a-f-]{36}$/i.test(roomId)) {
      if (!wasJoined) {
        supabase.rpc('toggle_join_room', { p_room_id: roomId }).then(() => {});
      }
      supabase.rpc('room_presence_heartbeat', { p_room_id: roomId }).then(() => {});
    }

    try {
      if (typeof window !== 'undefined') {
        isInternalNavRef.current = true;
        localStorage.setItem('bopoi_selected_room', roomId);
        localStorage.setItem('bopoi_active_view', 'room-detail');
        window.history.pushState(
          { view: 'room-detail', roomId },
          '',
          `${window.location.pathname}#room-${roomId}`
        );
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        setTimeout(() => {
          isInternalNavRef.current = false;
        }, 60);
      }
    } catch {
      // ignore
    }
  };

  const enterRoom = (roomId: string) => {
    if (activeView === 'room-detail' && selectedRoomId === roomId) {
      return;
    }
    const targetRoom = rooms.find((r) => r.id === roomId);
    const userKey = user.id || user.username || 'guest';
    const localMemberships = getLocalRoomMemberships(userKey);
    const isAlreadyMember =
      localMemberships[roomId] !== undefined
        ? localMemberships[roomId]
        : Boolean(
            targetRoom?.isJoined ||
              (user.id && targetRoom?.creatorUserId === user.id)
          );

    // Skip confirmation dialog if the user is already a member of this campus group
    if (isAlreadyMember) {
      executeEnterRoom(roomId);
      return;
    }

    const roomName = targetRoom?.name || 'Campus Room';

    requestConfirm({
      badge: 'Join Confirmation',
      title: 'Are you sure you want to join this campus group?',
      description: `You are about to join #${roomName}. Your identity stays 100% protected behind an anonymous campus persona mask.`,
      confirmLabel: 'Yes, Join & Enter Room',
      cancelLabel: 'Cancel',
      variant: 'primary',
      icon: 'join',
      roomPreview: targetRoom
        ? {
            name: targetRoom.name,
            category: targetRoom.category,
            description: targetRoom.description,
            iconEmoji: targetRoom.iconEmoji,
            iconBg: targetRoom.iconBg,
            membersCount: targetRoom.membersCount,
            onlineCount: targetRoom.onlineCount || 1,
            isAnonymousOnly: targetRoom.isAnonymousOnly,
            isJoined: targetRoom.isJoined,
          }
        : undefined,
      onConfirm: () => {
        executeEnterRoom(roomId);
      },
    });
  };

  const viewUserProfile = (
    userOrUsername: string | UserProfile | CreatorProfile,
    isAnonymousContext?: boolean,
    campusContext?: string
  ) => {
    if (typeof userOrUsername === 'object' && userOrUsername !== null) {
      setSelectedPublicUser(userOrUsername);
      setActiveView('public-profile');
      return;
    }

    const rawStr = String(userOrUsername || '').trim();
    const cleanUsername = rawStr.replace(/^@/, '').toLowerCase().trim();

    if (
      isAnonymousContext ||
      cleanUsername === 'anon_student' ||
      cleanUsername === 'anonymous' ||
      cleanUsername === 'anon' ||
      cleanUsername === 'masked'
    ) {
      const anonCampus = campusContext || 'Nigerian University';
      const anonSeed = `anon_${anonCampus.toLowerCase().replace(/[^a-z0-9]/g, '') || 'campus'}`;
      setSelectedPublicUser({
        id: `anon_${Date.now()}`,
        name: 'Anonymous Student',
        username: anonSeed,
        avatarUrl: serializeCharacterConfig(generateDeterministicCharacter(anonSeed)),
        campus: anonCampus,
        bio: `Masked student from ${anonCampus}.`,
        followersCount: 0,
        followingCount: 0,
        isFollowing: false,
      });
      setActiveView('public-profile');
      return;
    }

    if (cleanUsername === user.username.toLowerCase()) {
      setSelectedPublicUser(user);
      setActiveView('public-profile');
      return;
    }

    const foundCreator = creators.find(
      (c) =>
        c.username.toLowerCase() === cleanUsername ||
        c.name.toLowerCase() === cleanUsername ||
        c.id.toLowerCase() === cleanUsername
    );
    if (foundCreator) {
      setSelectedPublicUser(foundCreator);
      setActiveView('public-profile');
      return;
    }

    const foundAccount = accounts.find((a) => a.username.toLowerCase() === cleanUsername);
    if (foundAccount) {
      setSelectedPublicUser(foundAccount);
      setActiveView('public-profile');
      return;
    }

    const foundPost = socialPosts.find(
      (p) =>
        (p.authorUsername && p.authorUsername.toLowerCase() === cleanUsername) ||
        (p.authorName && p.authorName.toLowerCase() === cleanUsername)
    );
    if (foundPost) {
      const targetUser = foundPost.authorUsername || cleanUsername;
      setSelectedPublicUser({
        id: foundPost.authorUserId || `usr_${cleanUsername}`,
        name: foundPost.authorName,
        username: targetUser,
        avatarUrl:
          foundPost.authorAvatar ||
          serializeCharacterConfig(generateDeterministicCharacter(targetUser)),
        campus: foundPost.authorCampus || campusContext || 'Chrisland University',
        bio: '',
        followersCount: 0,
        followingCount: 0,
        isFollowing: false,
      });
      setActiveView('public-profile');
      return;
    }

    const fallbackUsername = cleanUsername || 'student';
    setSelectedPublicUser({
      id: `usr_${fallbackUsername}`,
      name: rawStr.replace(/^@/, '') || 'Campus Student',
      username: fallbackUsername,
      avatarUrl: serializeCharacterConfig(generateDeterministicCharacter(fallbackUsername)),
      campus: campusContext || 'Chrisland University',
      bio: '',
      followersCount: 0,
      followingCount: 0,
      isFollowing: false,
    });
    setActiveView('public-profile');
  };

  const createSocialPost = (params: {
    type: SocialPostType;
    content: string;
    title?: string;
    category?: string;
    hashtags?: string[];
    isAnonymous?: boolean;
    pollOptions?: { text: string }[];
    characterMood?: string;
  }): SocialPost => {
    if (!requireAuth('create posts, polls, or confessions')) return socialPosts[0];
    if (!canUserWrite('create posts')) return socialPosts[0];
    if (params.type === 'confession' && !platformSettings.allowAnonymousConfessions && !isAdminUnlocked) {
      showToast('Anonymous confessions are temporarily disabled by Campus Moderators.', 'error');
      return socialPosts[0];
    }
    const blocked = findBlockedWord(
      `${params.title || ''} ${params.content} ${(params.pollOptions || []).map((o) => o.text).join(' ')}`
    );
    if (blocked) {
      showToast(`Post blocked: contains prohibited word ("${blocked}").`, 'error');
      return socialPosts[0];
    }
    const isAnon = params.isAnonymous ?? (params.type === 'confession');
    const chosenMood = params.characterMood || characterMood;
    const postAvatar = isAnon
      ? undefined
      : applyMoodToAvatarUrl(user.avatarUrl, chosenMood, user.username);

    const tempPostId = `post_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newPost: SocialPost = {
      id: tempPostId,
      type: params.type,
      authorName: isAnon ? 'Anonymous' : user.displayName,
      authorUsername: isAnon ? 'anon_student' : user.username,
      authorAvatar: postAvatar,
      authorCampus: user.campus || 'Chrisland University',
      authorUserId: user.id || undefined,
      authorIsVerified: Boolean(!isAnon && (user.isVerified || user.isCreator)),
      isAnonymous: isAnon,
      category: params.category || (params.type === 'confession' ? 'School' : 'Campus Life'),
      title: params.title,
      content: params.content.trim(),
      hashtags: params.hashtags && params.hashtags.length > 0 ? params.hashtags : ['CampusLife'],
      createdAt: 'Just now',
      createdTimestamp: Date.now(),
      likes: 0,
      hasLiked: false,
      commentsCount: 0,
      sharesCount: 0,
      isBookmarked: false,
      pollOptions: params.pollOptions
        ? params.pollOptions.map((opt, i) => ({
            id: `opt_${Date.now()}_${i}`,
            text: opt.text.trim(),
            votes: 0,
          }))
        : undefined,
      pollTotalVotes: params.pollOptions ? 0 : undefined,
      pollExpiresIn: params.pollOptions ? '24h left' : undefined,
      comments: [],
    };

    setSocialPosts((prev) => [newPost, ...prev]);

    // Trigger Vector Generation Edge Listener immediately for local/optimistic post
    triggerPostVectorGeneration({
      postId: tempPostId,
      type: newPost.type,
      category: newPost.category,
      title: newPost.title,
      content: newPost.content,
      hashtags: newPost.hashtags,
      authorCampus: newPost.authorCampus,
    });

    if (supabase) {
      supabase
        .from('social_posts')
        .insert({
          type: newPost.type,
          author_user_id: user.id && /^[0-9a-f-]{36}$/i.test(user.id) ? user.id : null,
          author_name: newPost.authorName,
          author_username: newPost.authorUsername,
          author_avatar: postAvatar || null,
          author_campus: newPost.authorCampus || 'Chrisland University',
          is_anonymous: isAnon,
          category: newPost.category || 'Campus Life',
          title: newPost.title || null,
          content: newPost.content,
          hashtags: newPost.hashtags || [],
          poll_expires_in: newPost.pollExpiresIn || null,
        })
        .select('id')
        .single()
        .then(async ({ data: inserted, error }) => {
          if (!error && inserted?.id && supabase) {
            const realPostId = String(inserted.id);
            setSocialPosts((prev) =>
              prev.map((p) => (p.id === tempPostId ? { ...p, id: realPostId } : p))
            );
            setSelectedPost((prev) =>
              prev && prev.id === tempPostId ? { ...prev, id: realPostId } : prev
            );
            // Trigger Vector Generation Edge Listener with persisted Supabase UUID
            triggerPostVectorGeneration({
              postId: realPostId,
              type: newPost.type,
              category: newPost.category,
              title: newPost.title,
              content: newPost.content,
              hashtags: newPost.hashtags,
              authorCampus: newPost.authorCampus,
            });
            if (params.pollOptions && params.pollOptions.length > 0) {
              await supabase.from('poll_options').insert(
                params.pollOptions.map((opt, idx) => ({
                  post_id: realPostId,
                  text: opt.text.trim(),
                  sort_order: idx,
                }))
              );
            }
            queryClient.invalidateQueries({ queryKey: ['bopoi', 'socialPosts'] });
          }
        });
    }

    showToast(
      `${
        params.type === 'confession'
          ? 'Confession'
          : params.type === 'poll'
          ? 'Poll'
          : params.type === 'discussion'
          ? 'Discussion'
          : 'Post'
      } published!`,
      'success'
    );
    return newPost;
  };

  const executeDeleteSocialPost = (postId: string) => {
    markAdminDeletedPost(postId);
    setSocialPosts((prev) => prev.filter((p) => p.id !== postId));
    if (selectedPost?.id === postId) {
      setSelectedPost(null);
      goBack('home');
    }
    if (supabase && /^[0-9a-f-]{36}$/i.test(postId)) {
      supabase
        .from('social_posts')
        .delete()
        .eq('id', postId)
        .then(() => {});
    }
    if (isAdminUnlockedRef.current) {
      recordAdminAudit('delete_post', 'social_post', postId, `Deleted post ${postId.slice(0, 8)}`);
    }
    showToast('Post removed from feed', 'info');
  };

  const deleteSocialPost = (postId: string) => {
    const targetPost = socialPosts.find((p) => p.id === postId);
    const postTypeLabel =
      targetPost?.type === 'confession'
        ? 'confession'
        : targetPost?.type === 'poll'
        ? 'poll'
        : targetPost?.type === 'discussion'
        ? 'discussion'
        : 'post';
    const preview = targetPost?.title || targetPost?.content || '';
    const snippet = preview
      ? `"${preview.slice(0, 65)}${preview.length > 65 ? '...' : ''}"`
      : `this ${postTypeLabel}`;

    requestConfirm({
      badge: `Delete ${postTypeLabel}`,
      title: `Delete this ${postTypeLabel}?`,
      description: `Are you sure you want to permanently remove ${snippet} and all of its comments from the campus feed? This cannot be undone.`,
      confirmLabel: `Yes, Delete ${postTypeLabel.charAt(0).toUpperCase() + postTypeLabel.slice(1)}`,
      variant: 'danger',
      icon: 'delete',
      onConfirm: () => {
        executeDeleteSocialPost(postId);
      },
    });
  };

  const reportPost = (postId: string, reason: string = 'Community guidelines violation') => {
    const targetPost = socialPosts.find((p) => p.id === postId);
    const label = targetPost?.type || 'post';
    requestConfirm({
      badge: 'Campus Safety Report',
      title: `Report this ${label} to moderators?`,
      description: `Are you sure you want to report this ${label} for "${reason}"? Our Campus Moderation team will review it promptly.`,
      confirmLabel: 'Yes, Submit Report',
      variant: 'warning',
      icon: 'shield',
      onConfirm: () => {
        const newReport: ModerationReport = {
          id: `rep_${Date.now()}`,
          reporterUserId: user.id || undefined,
          reporterUsername: user.username || 'student',
          targetType: 'social_post',
          targetId: postId,
          reason,
          status: 'pending',
          createdAt: 'Just now',
          createdTimestamp: Date.now(),
        };
        setModerationReports((prev) => [newReport, ...prev]);
        try {
          const existingRaw = localStorage.getItem('bopoi_reported_posts');
          const existing: string[] = existingRaw ? JSON.parse(existingRaw) : [];
          if (!existing.includes(postId)) {
            localStorage.setItem('bopoi_reported_posts', JSON.stringify([...existing, postId]));
          }
        } catch {
          // ignore
        }
        if (supabase) {
          supabase
            .from('moderation_reports')
            .insert({
              reporter_user_id: user.id && /^[0-9a-f-]{36}$/i.test(user.id) ? user.id : null,
              reporter_username: user.username || 'student',
              target_type: 'social_post',
              target_id: postId,
              reason,
            })
            .then(() => {
              syncAdminTablesFromSupabase();
            });
        }
        showToast('Post reported to campus moderators for review.', 'info');
      },
    });
  };

  // ============================================================================
  // ADMIN CONSOLE ACTIONS (FULL CRUD + REAL-TIME MODERATION ACROSS ALL 27 TABLES)
  // ============================================================================
  const recordAdminAudit = (actionType: string, targetType: string, targetId: string, summary: string) => {
    if (!isAdminUnlockedRef.current) return;
    const adminName = user.username || 'admin';
    const newLog: AdminAuditLog = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      adminUsername: adminName,
      actionType,
      targetType,
      targetId,
      summary,
      createdAt: 'Just now',
      createdTimestamp: Date.now(),
    };
    setAdminAuditLogs((prev) => [newLog, ...prev.slice(0, 99)]);
    if (supabase) {
      supabase
        .from('admin_audit_logs')
        .insert({
          admin_user_id: user.id && /^[0-9a-f-]{36}$/i.test(user.id) ? user.id : null,
          admin_username: adminName,
          action_type: actionType,
          target_type: targetType,
          target_id: targetId,
          summary,
        })
        .then(() => {});
    }
  };

  const adminUpdateUser = (targetUserId: string, updates: Partial<UserProfile>) => {
    if (!isAdminUnlockedRef.current) return;

    const existingAcc = accounts.find(
      (acc) => acc.id === targetUserId || acc.username.toLowerCase() === targetUserId.toLowerCase()
    );
    const existingCreator = creators.find(
      (cr) => cr.id === targetUserId || cr.username.toLowerCase() === targetUserId.toLowerCase()
    );
    const matchingPost = socialPosts.find(
      (p) =>
        p.authorUserId === targetUserId ||
        p.authorUsername.toLowerCase() === targetUserId.toLowerCase()
    );

    const targetUsername =
      updates.username ||
      existingAcc?.username ||
      existingCreator?.username ||
      matchingPost?.authorUsername ||
      targetUserId.replace(/^usr_/, '');

    // Prevent an admin from accidentally locking themselves out of the admin console
    if (
      (user.id === targetUserId || user.username.toLowerCase() === targetUsername.toLowerCase()) &&
      updates.isAdmin === false
    ) {
      showToast('Cannot revoke admin privileges from your own active session.', 'error');
      return;
    }

    const executeAdminUpdateUser = () => {
      // If suspending a user, automatically pause their anonymous link
      const normalizedUpdates: Partial<UserProfile> = {
        ...updates,
        ...(updates.isSuspended === true ? { linkActive: false } : {}),
        ...(updates.isSuspended === false && existingAcc?.linkActive === false
          ? { linkActive: true }
          : {}),
      };

    saveAdminUserOverride([targetUserId, targetUsername], normalizedUpdates);

    setAccounts((prev) => {
      const found = prev.some(
        (acc) =>
          acc.id === targetUserId || acc.username.toLowerCase() === targetUsername.toLowerCase()
      );
      if (found) {
        return prev.map((acc) => {
          if (
            acc.id !== targetUserId &&
            acc.username.toLowerCase() !== targetUsername.toLowerCase()
          ) {
            return acc;
          }
          return { ...acc, ...normalizedUpdates };
        });
      }
      // Synthesize a full account entry if the user was only a post author
      const synthesized: UserProfile = {
        id: targetUserId,
        username: targetUsername,
        displayName:
          normalizedUpdates.displayName ||
          existingCreator?.name ||
          matchingPost?.authorName ||
          targetUsername,
        email: `${targetUsername}@bopoi.edu.ng`,
        avatarUrl:
          existingCreator?.avatarUrl ||
          matchingPost?.authorAvatar ||
          serializeCharacterConfig(generateDeterministicCharacter(targetUsername)),
        bio: normalizedUpdates.bio || existingCreator?.bio || 'Campus student on Bopoi',
        linkActive: normalizedUpdates.linkActive ?? true,
        followersCount: existingCreator?.followersCount ?? 0,
        followingCount: existingCreator?.followingCount ?? 0,
        campus:
          normalizedUpdates.campus ||
          existingCreator?.campus ||
          matchingPost?.authorCampus ||
          'Chrisland University',
        customPrompt:
          normalizedUpdates.customPrompt || "There's something you've been wanting to ask...",
        role: normalizedUpdates.role || 'student',
        isAdmin: Boolean(normalizedUpdates.isAdmin || normalizedUpdates.role === 'admin'),
        isVerified: Boolean(normalizedUpdates.isVerified || normalizedUpdates.isCreator),
        isCreator: Boolean(normalizedUpdates.isCreator ?? normalizedUpdates.isVerified),
        isSuspended: Boolean(normalizedUpdates.isSuspended),
        suspensionReason: normalizedUpdates.suspensionReason,
        createdAt: 'Active',
      };
      saveAdminCreatedUser(synthesized);
      return [synthesized, ...prev];
    });

    setCreators((prev) =>
      prev.map((cr) => {
        if (
          cr.id !== targetUserId &&
          cr.username.toLowerCase() !== targetUsername.toLowerCase()
        ) {
          return cr;
        }
        return {
          ...cr,
          name: normalizedUpdates.displayName ?? cr.name,
          username: normalizedUpdates.username ?? cr.username,
          campus: normalizedUpdates.campus ?? cr.campus,
          bio: normalizedUpdates.bio ?? cr.bio,
          isVerified:
            normalizedUpdates.isVerified !== undefined
              ? normalizedUpdates.isVerified
              : normalizedUpdates.isCreator !== undefined
              ? normalizedUpdates.isCreator
              : cr.isVerified,
          isAdmin: normalizedUpdates.isAdmin ?? cr.isAdmin,
        };
      })
    );

    // Update socialPosts immediately so verified badge or display name changes reflect across all feeds
    setSocialPosts((prev) =>
      prev.map((p) => {
        if (
          p.authorUserId !== targetUserId &&
          p.authorUsername.toLowerCase() !== targetUsername.toLowerCase()
        ) {
          return p;
        }
        return {
          ...p,
          authorName: normalizedUpdates.displayName ?? p.authorName,
          authorCampus: normalizedUpdates.campus ?? p.authorCampus,
          authorIsVerified:
            normalizedUpdates.isVerified !== undefined
              ? normalizedUpdates.isVerified
              : normalizedUpdates.isCreator !== undefined
              ? normalizedUpdates.isCreator
              : p.authorIsVerified,
        };
      })
    );

    if (user.id === targetUserId || user.username.toLowerCase() === targetUsername.toLowerCase()) {
      setUser((prev) => ({ ...prev, ...normalizedUpdates }));
    }

    if (supabase) {
      const fullPatch: Record<string, any> = {};
      const corePatch: Record<string, any> = {};
      if (normalizedUpdates.displayName !== undefined) {
        fullPatch.display_name = normalizedUpdates.displayName;
        corePatch.display_name = normalizedUpdates.displayName;
      }
      if (normalizedUpdates.username !== undefined) {
        fullPatch.username = normalizedUpdates.username;
        corePatch.username = normalizedUpdates.username;
      }
      if (normalizedUpdates.campus !== undefined) {
        fullPatch.campus = normalizedUpdates.campus;
        corePatch.campus = normalizedUpdates.campus;
      }
      if (normalizedUpdates.bio !== undefined) {
        fullPatch.bio = normalizedUpdates.bio;
        corePatch.bio = normalizedUpdates.bio;
      }
      if (normalizedUpdates.customPrompt !== undefined) {
        fullPatch.custom_prompt = normalizedUpdates.customPrompt;
        corePatch.custom_prompt = normalizedUpdates.customPrompt;
      }
      if (normalizedUpdates.linkActive !== undefined) {
        fullPatch.link_active = normalizedUpdates.linkActive;
        corePatch.link_active = normalizedUpdates.linkActive;
      }
      if (normalizedUpdates.role !== undefined) fullPatch.role = normalizedUpdates.role;
      if (normalizedUpdates.isAdmin !== undefined) {
        fullPatch.is_admin = normalizedUpdates.isAdmin;
        corePatch.is_admin = normalizedUpdates.isAdmin;
      }
      if (normalizedUpdates.isVerified !== undefined) {
        fullPatch.is_verified = normalizedUpdates.isVerified;
        corePatch.is_creator = normalizedUpdates.isVerified;
      }
      if (normalizedUpdates.isCreator !== undefined) {
        fullPatch.is_creator = normalizedUpdates.isCreator;
        corePatch.is_creator = normalizedUpdates.isCreator;
      }
      if (normalizedUpdates.isSuspended !== undefined) {
        fullPatch.is_suspended = normalizedUpdates.isSuspended;
      }
      if (normalizedUpdates.suspensionReason !== undefined) {
        fullPatch.suspension_reason = normalizedUpdates.suspensionReason;
      }

      const sb = supabase;
      const isUuid = /^[0-9a-f-]{36}$/i.test(targetUserId);
      const runUpdate = async () => {
        const query = isUuid
          ? sb.from('profiles').update(fullPatch).eq('id', targetUserId)
          : sb.from('profiles').update(fullPatch).ilike('username', targetUsername);
        const { error } = await query;
        if (error && Object.keys(corePatch).length > 0) {
          // Fallback to guaranteed core schema columns if extended columns are not yet migrated
          if (isUuid) {
            await sb.from('profiles').update(corePatch).eq('id', targetUserId);
          } else {
            await sb.from('profiles').update(corePatch).ilike('username', targetUsername);
          }
        }
        queryClient.invalidateQueries();
      };
      runUpdate();
    }

    const actionSummary =
      updates.isVerified !== undefined
        ? `${updates.isVerified ? 'Verified' : 'Unverified'} @${targetUsername}`
        : updates.isSuspended !== undefined
        ? `${updates.isSuspended ? 'Suspended' : 'Restored'} @${targetUsername}`
        : updates.isAdmin !== undefined
        ? `${updates.isAdmin ? 'Granted Admin to' : 'Revoked Admin from'} @${targetUsername}`
        : `Updated @${targetUsername} (${Object.keys(updates).join(', ')})`;

    recordAdminAudit('update_user', 'profile', targetUserId, actionSummary);
    showToast(actionSummary, 'success');
    };

    const isSingleToggle =
      Object.keys(updates).length <= 2 &&
      (updates.isVerified !== undefined ||
        updates.isSuspended !== undefined ||
        updates.isAdmin !== undefined ||
        updates.linkActive !== undefined);

    if (isSingleToggle) {
      const title =
        updates.isSuspended !== undefined
          ? `${updates.isSuspended ? 'Suspend / Ban' : 'Restore'} @${targetUsername}?`
          : updates.isAdmin !== undefined
          ? `${updates.isAdmin ? 'Grant Admin Role to' : 'Revoke Admin Role from'} @${targetUsername}?`
          : updates.isVerified !== undefined
          ? `${updates.isVerified ? 'Verify' : 'Remove Verification from'} @${targetUsername}?`
          : `${updates.linkActive ? 'Reopen' : 'Pause'} @${targetUsername}'s Q&A Link?`;

      const description =
        updates.isSuspended !== undefined
          ? updates.isSuspended
            ? `Suspending @${targetUsername} will immediately block them from posting, commenting, or receiving anonymous messages.`
            : `Restoring @${targetUsername} will lift their suspension and re-enable their account across Bopoi.`
          : updates.isAdmin !== undefined
          ? updates.isAdmin
            ? `Granting Admin privileges to @${targetUsername} gives them full access to the Bopoi Admin Console and moderation controls.`
            : `Revoking Admin privileges from @${targetUsername} will return their account to a standard student role.`
          : updates.isVerified !== undefined
          ? updates.isVerified
            ? `Awarding the Verified badge to @${targetUsername} will display the official verified checkmark next to their name across all feeds.`
            : `Removing verification from @${targetUsername} will hide their verified badge across Bopoi.`
          : `Are you sure you want to ${updates.linkActive ? 'reopen' : 'pause'} @${targetUsername}'s anonymous Q&A link?`;

      requestConfirm({
        badge: 'Admin User Action',
        title,
        description,
        confirmLabel: 'Confirm Action',
        variant:
          updates.isSuspended === true || updates.isAdmin === false ? 'danger' : 'primary',
        icon:
          updates.isSuspended !== undefined
            ? 'shield'
            : updates.isVerified !== undefined
            ? 'verify'
            : 'sparkle',
        onConfirm: executeAdminUpdateUser,
      });
      return;
    }

    executeAdminUpdateUser();
  };

  const adminDeleteUser = (targetUserId: string) => {
    if (!isAdminUnlockedRef.current) return;
    const targetAcc = accounts.find(
      (a) => a.id === targetUserId || a.username.toLowerCase() === targetUserId.toLowerCase()
    );
    const uname = targetAcc?.username || targetUserId.replace(/^usr_/, '');

    if (user.id === targetUserId || user.username.toLowerCase() === uname.toLowerCase()) {
      showToast('Cannot delete your own active admin account.', 'error');
      return;
    }

    requestConfirm({
      badge: 'Admin Account Deletion',
      title: `Permanently delete @${uname}?`,
      description: `Are you sure you want to permanently delete @${uname}'s student profile and remove all of their posts from Bopoi? This action cannot be undone.`,
      confirmLabel: `Delete @${uname}`,
      variant: 'danger',
      icon: 'delete',
      onConfirm: () => {
        markAdminDeletedUser([targetUserId, uname]);

        setAccounts((prev) =>
          prev.filter((a) => a.id !== targetUserId && a.username.toLowerCase() !== uname.toLowerCase())
        );
        setCreators((prev) =>
          prev.filter((c) => c.id !== targetUserId && c.username.toLowerCase() !== uname.toLowerCase())
        );
        setSocialPosts((prev) =>
          prev.filter(
            (p) =>
              p.authorUserId !== targetUserId &&
              p.authorUsername.toLowerCase() !== uname.toLowerCase()
          )
        );

        if (supabase) {
          const isUuid = /^[0-9a-f-]{36}$/i.test(targetUserId);
          const delQuery = isUuid
            ? supabase.from('profiles').delete().eq('id', targetUserId)
            : supabase.from('profiles').delete().ilike('username', uname);
          delQuery.then(() => {
            queryClient.invalidateQueries();
          });
        }

        recordAdminAudit('delete_user', 'profile', targetUserId, `Deleted user account @${uname}`);
        showToast(`Deleted account @${uname}`, 'info');
      },
    });
  };

  const adminCreateUser = (params: {
    displayName: string;
    username: string;
    email: string;
    campus: string;
    role: 'student' | 'creator' | 'moderator' | 'admin';
    isVerified?: boolean;
  }) => {
    if (!isAdminUnlockedRef.current) return;
    const cleanUsername = params.username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (!cleanUsername || !params.displayName.trim()) {
      showToast('Please enter both a display name and username.', 'error');
      return;
    }

    const generatedId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `usr_${cleanUsername}_${Date.now().toString(36)}`;

    const verifiedFlag = Boolean(
      params.isVerified !== undefined
        ? params.isVerified
        : params.role === 'creator' || params.role === 'admin'
    );

    const newProfile: UserProfile = {
      id: generatedId,
      username: cleanUsername,
      displayName: params.displayName.trim(),
      email: params.email.trim() || `${cleanUsername}@bopoi.edu.ng`,
      avatarUrl: serializeCharacterConfig(generateDeterministicCharacter(cleanUsername)),
      bio: `Campus ${params.role} at ${params.campus}`,
      linkActive: true,
      followersCount: 0,
      followingCount: 0,
      campus: params.campus || 'University of Lagos',
      customPrompt: "There's something you've been wanting to ask...",
      role: params.role,
      isAdmin: params.role === 'admin',
      isVerified: verifiedFlag,
      isCreator: verifiedFlag || params.role === 'creator',
      isSuspended: false,
      createdAt: 'Just now',
    };

    saveAdminCreatedUser(newProfile);
    saveAdminUserOverride([newProfile.id, cleanUsername], newProfile);

    setAccounts((prev) => [newProfile, ...prev.filter((a) => a.username.toLowerCase() !== cleanUsername)]);
    setCreators((prev) => [
      {
        id: newProfile.id,
        name: newProfile.displayName,
        username: newProfile.username,
        avatarUrl: newProfile.avatarUrl,
        campus: newProfile.campus || 'University of Lagos',
        bio: newProfile.bio,
        followersCount: 0,
        followingCount: 0,
        isFollowing: false,
        isVerified: newProfile.isVerified,
        isAdmin: newProfile.isAdmin,
      },
      ...prev.filter((c) => c.username.toLowerCase() !== cleanUsername),
    ]);

    if (supabase && /^[0-9a-f-]{36}$/i.test(generatedId)) {
      supabase
        .from('profiles')
        .upsert(
          {
            id: generatedId,
            username: newProfile.username,
            display_name: newProfile.displayName,
            email: newProfile.email,
            avatar_url: newProfile.avatarUrl,
            bio: newProfile.bio,
            campus: newProfile.campus,
            link_active: true,
            is_admin: newProfile.isAdmin,
            is_creator: newProfile.isCreator,
          },
          { onConflict: 'username' }
        )
        .then(() => {
          queryClient.invalidateQueries();
        });
    }

    recordAdminAudit(
      'create_user',
      'profile',
      newProfile.id,
      `Created ${params.role} profile @${cleanUsername}`
    );
    showToast(`Added @${cleanUsername} as ${params.role.toUpperCase()}`, 'success');
  };

  const adminUpdatePost = (postId: string, updates: Partial<SocialPost>) => {
    if (!isAdminUnlockedRef.current) return;
    saveAdminPostOverride(postId, updates);
    setSocialPosts((prev) =>
      prev.map((post) => (post.id === postId ? { ...post, ...updates } : post))
    );
    setSelectedPost((prev) => (prev && prev.id === postId ? { ...prev, ...updates } : prev));

    if (supabase && /^[0-9a-f-]{36}$/i.test(postId)) {
      const dbPatch: Record<string, any> = {};
      if (updates.title !== undefined) dbPatch.title = updates.title;
      if (updates.content !== undefined) dbPatch.content = updates.content;
      if (updates.category !== undefined) dbPatch.category = updates.category;
      if (updates.hashtags !== undefined) dbPatch.hashtags = updates.hashtags;
      if (updates.isPinned !== undefined) dbPatch.is_pinned = updates.isPinned;
      if (updates.isFeatured !== undefined) dbPatch.is_featured = updates.isFeatured;
      if (updates.isAnonymous !== undefined) dbPatch.is_anonymous = updates.isAnonymous;

      supabase
        .from('social_posts')
        .update(dbPatch)
        .eq('id', postId)
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ['bopoi', 'socialPosts'] });
        });
    }

    const summary =
      updates.isPinned !== undefined
        ? `${updates.isPinned ? 'Pinned' : 'Unpinned'} post ${postId.slice(0, 8)}`
        : updates.isFeatured !== undefined
        ? `${updates.isFeatured ? 'Featured' : 'Unfeatured'} post ${postId.slice(0, 8)}`
        : `Updated post ${postId.slice(0, 8)} (${Object.keys(updates).join(', ')})`;

    recordAdminAudit('update_post', 'social_post', postId, summary);
    showToast(summary, 'success');
  };

  const executeAdminDeleteComment = (postId: string, commentId: string) => {
    if (!isAdminUnlockedRef.current) return;
    markAdminDeletedComment(commentId);
    const removeFromPost = (post: SocialPost): SocialPost => {
      if (post.id !== postId || !post.comments) return post;
      const nextComments = post.comments.filter(
        (c) => c.id !== commentId && c.parentId !== commentId
      );
      return {
        ...post,
        comments: nextComments,
        commentsCount: nextComments.length,
      };
    };

    setSocialPosts((prev) => prev.map(removeFromPost));
    setSelectedPost((prev) => (prev && prev.id === postId ? removeFromPost(prev) : prev));

    if (supabase && /^[0-9a-f-]{36}$/i.test(commentId)) {
      supabase
        .from('post_comments')
        .delete()
        .eq('id', commentId)
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ['bopoi', 'socialPosts'] });
        });
    }

    recordAdminAudit(
      'delete_comment',
      'post_comment',
      commentId,
      `Deleted comment ${commentId.slice(0, 8)} on post ${postId.slice(0, 8)}`
    );
    showToast('Comment removed from thread', 'info');
  };

  const adminDeleteComment = (postId: string, commentId: string) => {
    if (!isAdminUnlockedRef.current) return;
    requestConfirm({
      badge: 'Admin Moderation',
      title: 'Delete this student comment?',
      description:
        'Are you sure you want to permanently remove this comment and any nested replies from the thread?',
      confirmLabel: 'Yes, Delete Comment',
      variant: 'danger',
      icon: 'delete',
      onConfirm: () => {
        executeAdminDeleteComment(postId, commentId);
      },
    });
  };

  const adminUpdateRoom = (roomId: string, updates: Partial<CommunityRoom>) => {
    if (!isAdminUnlockedRef.current) return;
    const targetRoom = rooms.find((r) => r.id === roomId);
    const roomLabel = updates.name || targetRoom?.name || roomId.slice(0, 8);

    const executeRoomUpdate = () => {
      saveAdminRoomOverride(roomId, updates);
      setRooms((prev) =>
        prev.map((r) => (r.id === roomId ? { ...r, ...updates } : r))
      );

      if (supabase && /^[0-9a-f-]{36}$/i.test(roomId)) {
        const dbPatch: Record<string, any> = {};
        if (updates.name !== undefined) dbPatch.name = updates.name;
        if (updates.description !== undefined) dbPatch.description = updates.description;
        if (updates.category !== undefined) dbPatch.category = updates.category;
        if (updates.iconEmoji !== undefined) dbPatch.icon_emoji = updates.iconEmoji;
        if (updates.iconBg !== undefined) dbPatch.icon_bg = updates.iconBg;
        if (updates.isAnonymousOnly !== undefined) dbPatch.is_anonymous_only = updates.isAnonymousOnly;
        if (updates.isLocked !== undefined) dbPatch.is_locked = updates.isLocked;
        if (updates.isFeatured !== undefined) dbPatch.is_featured = updates.isFeatured;
        if (updates.tags !== undefined) dbPatch.tags = updates.tags;

        supabase
          .from('community_rooms')
          .update(dbPatch)
          .eq('id', roomId)
          .then(() => {
            queryClient.invalidateQueries({ queryKey: ['bopoi', 'rooms'] });
          });
      }

      const summary =
        updates.isLocked !== undefined
          ? `${updates.isLocked ? 'Locked' : 'Unlocked'} room #${roomLabel}`
          : updates.isAnonymousOnly !== undefined
          ? `Set #${roomLabel} to ${updates.isAnonymousOnly ? 'Anonymous-Only' : 'Public & Anonymous'}`
          : updates.isFeatured !== undefined
          ? `${updates.isFeatured ? 'Featured' : 'Unfeatured'} room #${roomLabel}`
          : `Updated room #${roomLabel}`;

      recordAdminAudit('update_room', 'community_room', roomId, summary);
      showToast(summary, 'success');
    };

    if (
      Object.keys(updates).length === 1 &&
      (updates.isLocked !== undefined ||
        updates.isFeatured !== undefined ||
        updates.isAnonymousOnly !== undefined)
    ) {
      const title =
        updates.isLocked !== undefined
          ? `${updates.isLocked ? 'Lock' : 'Unlock'} #${roomLabel}?`
          : updates.isFeatured !== undefined
          ? `${updates.isFeatured ? 'Feature' : 'Unfeature'} #${roomLabel}?`
          : `Change anonymity mode for #${roomLabel}?`;
      const description =
        updates.isLocked !== undefined
          ? updates.isLocked
            ? `Locking #${roomLabel} will prevent students from sending new messages in this room until an admin unlocks it.`
            : `Unlocking #${roomLabel} will allow students to resume chatting in this room.`
          : updates.isFeatured !== undefined
          ? `Are you sure you want to ${updates.isFeatured ? 'feature' : 'unfeature'} #${roomLabel} on the Campus Home carousel?`
          : `Switch #${roomLabel} to ${
              updates.isAnonymousOnly ? '100% Anonymous Masks Only' : 'Allow Public & Anonymous Chat'
            }?`;

      requestConfirm({
        badge: 'Admin Room Control',
        title,
        description,
        confirmLabel: 'Confirm Change',
        variant: updates.isLocked ? 'warning' : 'primary',
        icon: updates.isLocked !== undefined ? (updates.isLocked ? 'lock' : 'unlock') : 'sparkle',
        onConfirm: executeRoomUpdate,
      });
      return;
    }

    executeRoomUpdate();
  };

  const executeAdminDeleteRoomMessage = (roomId: string, messageId: string) => {
    if (!isAdminUnlockedRef.current) return;
    markAdminDeletedRoomMessage(messageId);
    setRooms((prev) =>
      prev.map((room) => {
        if (room.id !== roomId || !room.messages) return room;
        return {
          ...room,
          messages: room.messages.filter((m) => m.id !== messageId),
        };
      })
    );

    if (supabase && /^[0-9a-f-]{36}$/i.test(messageId)) {
      supabase
        .from('room_messages')
        .delete()
        .eq('id', messageId)
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ['bopoi', 'rooms'] });
        });
    }

    recordAdminAudit(
      'delete_room_message',
      'room_message',
      messageId,
      `Deleted chat message in room ${roomId.slice(0, 8)}`
    );
    showToast('Room chat message deleted', 'info');
  };

  const adminDeleteRoomMessage = (roomId: string, messageId: string) => {
    if (!isAdminUnlockedRef.current) return;
    requestConfirm({
      badge: 'Admin Room Moderation',
      title: 'Delete this room chat message?',
      description:
        'Are you sure you want to permanently remove this message from the live room chat?',
      confirmLabel: 'Yes, Delete Message',
      variant: 'danger',
      icon: 'delete',
      onConfirm: () => {
        executeAdminDeleteRoomMessage(roomId, messageId);
      },
    });
  };

  const executeAdminDeleteAnonymousMessage = (messageId: string) => {
    if (!isAdminUnlockedRef.current) return;
    markAdminDeletedAnonMessage(messageId);
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    setAdminExtraMessages((prev) => prev.filter((m) => m.id !== messageId));
    setAnswers((prev) => {
      const next = { ...prev };
      delete next[messageId];
      return next;
    });

    if (supabase && /^[0-9a-f-]{36}$/i.test(messageId)) {
      supabase
        .from('anonymous_messages')
        .delete()
        .eq('id', messageId)
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ['bopoi', 'messages'] });
          syncAdminTablesFromSupabase();
        });
    }

    recordAdminAudit(
      'delete_anon_message',
      'anonymous_message',
      messageId,
      `Deleted anonymous Q&A message ${messageId.slice(0, 8)}`
    );
    showToast('Anonymous message deleted', 'info');
  };

  const adminDeleteAnonymousMessage = (messageId: string) => {
    if (!isAdminUnlockedRef.current) return;
    requestConfirm({
      badge: 'Admin Q&A Moderation',
      title: 'Delete this anonymous Q&A message?',
      description:
        'Are you sure you want to permanently delete this anonymous inbox question and its associated thread?',
      confirmLabel: 'Yes, Delete Question',
      variant: 'danger',
      icon: 'delete',
      onConfirm: () => {
        executeAdminDeleteAnonymousMessage(messageId);
      },
    });
  };

  const adminDeleteMessageComment = (messageId: string, commentId: string) => {
    if (!isAdminUnlockedRef.current) return;
    requestConfirm({
      badge: 'Admin Convo Moderation',
      title: 'Delete this 1-on-1 convo reply?',
      description:
        'Are you sure you want to permanently delete this reply from the private 2-party conversation?',
      confirmLabel: 'Yes, Delete Reply',
      variant: 'danger',
      icon: 'delete',
      onConfirm: () => {
        const stripComment = (m: AnonymousMessage): AnonymousMessage => {
          if (m.id !== messageId || !m.comments) return m;
          const next = m.comments.filter((c) => c.id !== commentId);
          return { ...m, comments: next, repliesCount: next.length };
        };
        setMessages((prev) => prev.map(stripComment));
        setAdminExtraMessages((prev) => prev.map(stripComment));

        if (supabase && /^[0-9a-f-]{36}$/i.test(commentId)) {
          supabase
            .from('message_comments')
            .delete()
            .eq('id', commentId)
            .then(() => {
              queryClient.invalidateQueries({ queryKey: ['bopoi', 'messages'] });
              syncAdminTablesFromSupabase();
            });
        }

        recordAdminAudit(
          'delete_convo_reply',
          'message_comment',
          commentId,
          `Deleted private convo reply ${commentId.slice(0, 8)}`
        );
        showToast('Private convo reply removed', 'info');
      },
    });
  };

  const adminDeleteAnswer = (messageId: string) => {
    if (!isAdminUnlockedRef.current) return;
    requestConfirm({
      badge: 'Admin Story Moderation',
      title: 'Remove this public Story Answer card?',
      description:
        'Are you sure you want to permanently remove this published Story Answer card?',
      confirmLabel: 'Yes, Remove Answer',
      variant: 'danger',
      icon: 'delete',
      onConfirm: () => {
        markAdminDeletedAnswer(messageId);
        const targetAnswer = answers[messageId];
        if (targetAnswer?.id) markAdminDeletedAnswer(targetAnswer.id);
        setAnswers((prev) => {
          const next = { ...prev };
          delete next[messageId];
          return next;
        });
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, isAnswered: false } : m))
        );

        if (supabase && targetAnswer?.id && /^[0-9a-f-]{36}$/i.test(targetAnswer.id)) {
          supabase
            .from('message_answers')
            .delete()
            .eq('id', targetAnswer.id)
            .then(() => {
              queryClient.invalidateQueries({ queryKey: ['bopoi', 'answers'] });
            });
        }

        recordAdminAudit(
          'delete_story_answer',
          'message_answer',
          messageId,
          `Removed public story answer for message ${messageId.slice(0, 8)}`
        );
        showToast('Story answer removed', 'info');
      },
    });
  };

  const adminResolveReport = (
    reportId: string,
    status: 'resolved' | 'dismissed',
    options?: { deleteTarget?: boolean; banTargetUser?: boolean; adminNotes?: string }
  ) => {
    if (!isAdminUnlockedRef.current) return;
    const targetReport = moderationReports.find((r) => r.id === reportId);
    const isDestructive = Boolean(options?.deleteTarget || options?.banTargetUser);

    requestConfirm({
      badge: 'Moderation Report Resolution',
      title: isDestructive
        ? 'Delete reported content & enforce action?'
        : status === 'dismissed'
        ? 'Dismiss this moderation report?'
        : 'Mark this report as resolved?',
      description: isDestructive
        ? `This will mark the report as resolved, permanently delete the reported ${
            targetReport?.targetType?.replace('_', ' ') || 'content'
          }${options?.banTargetUser ? ', and suspend the offending author account' : ''}.`
        : `Are you sure you want to mark this ${
            targetReport?.targetType?.replace('_', ' ') || 'moderation'
          } report as ${status}?`,
      confirmLabel: isDestructive
        ? 'Yes, Enforce & Resolve'
        : status === 'dismissed'
        ? 'Yes, Dismiss Report'
        : 'Yes, Mark Resolved',
      variant: isDestructive ? 'danger' : status === 'dismissed' ? 'warning' : 'primary',
      icon: isDestructive ? 'shield' : 'verify',
      onConfirm: () => {
        setModerationReports((prev) =>
          prev.map((r) =>
            r.id === reportId
              ? {
                  ...r,
                  status,
                  adminNotes: options?.adminNotes ?? r.adminNotes,
                  resolvedAt: 'Just now',
                }
              : r
          )
        );

        if (options?.deleteTarget && targetReport) {
          if (targetReport.targetType === 'social_post') {
            executeDeleteSocialPost(targetReport.targetId);
          } else if (targetReport.targetType === 'anonymous_message') {
            executeAdminDeleteAnonymousMessage(targetReport.targetId);
          } else if (targetReport.targetType === 'post_comment') {
            const ownerPost = socialPosts.find((p) =>
              p.comments?.some((c) => c.id === targetReport.targetId)
            );
            if (ownerPost) executeAdminDeleteComment(ownerPost.id, targetReport.targetId);
          } else if (targetReport.targetType === 'room_message') {
            const ownerRoom = rooms.find((rm) =>
              rm.messages?.some((m) => m.id === targetReport.targetId)
            );
            if (ownerRoom) executeAdminDeleteRoomMessage(ownerRoom.id, targetReport.targetId);
          }
        }

        if (options?.banTargetUser && targetReport) {
          const offendingPost = socialPosts.find((p) => p.id === targetReport.targetId);
          if (offendingPost?.authorUserId || offendingPost?.authorUsername) {
            const targetUid = offendingPost.authorUserId || offendingPost.authorUsername;
            saveAdminUserOverride([targetUid, offendingPost.authorUsername], {
              isSuspended: true,
              linkActive: false,
              suspensionReason: `Reported: ${targetReport.reason}`,
            });
            setAccounts((prev) =>
              prev.map((a) =>
                a.id === targetUid ||
                a.username.toLowerCase() === offendingPost.authorUsername.toLowerCase()
                  ? {
                      ...a,
                      isSuspended: true,
                      linkActive: false,
                      suspensionReason: `Reported: ${targetReport.reason}`,
                    }
                  : a
              )
            );
          }
        }

        if (supabase && /^[0-9a-f-]{36}$/i.test(reportId)) {
          supabase
            .rpc('admin_resolve_report', {
              p_report_id: reportId,
              p_status: status,
              p_delete_target: Boolean(options?.deleteTarget),
              p_admin_notes: options?.adminNotes || null,
            })
            .then(() => {
              syncAdminTablesFromSupabase();
            });
        }

        recordAdminAudit(
          'resolve_report',
          targetReport?.targetType || 'report',
          reportId,
          `Marked report as ${status}${options?.deleteTarget ? ' and deleted target content' : ''}`
        );
        showToast(`Report marked as ${status}`, 'success');
      },
    });
  };

  const adminBroadcastAnnouncement = (params: {
    title: string;
    body: string;
    campus: string;
    severity: 'info' | 'celebration' | 'urgent';
    actionView?: ActiveAppView;
  }) => {
    if (!isAdminUnlockedRef.current) return;
    const cleanTitle = params.title.trim();
    const cleanBody = params.body.trim();
    if (!cleanTitle || !cleanBody) return;

    const newAnn: CampusAnnouncement = {
      id: `ann_${Date.now()}`,
      title: cleanTitle,
      body: cleanBody,
      campus: params.campus || 'All Campuses',
      badgeLabel:
        params.severity === 'urgent'
          ? 'Urgent Campus Alert'
          : params.severity === 'celebration'
          ? 'Campus Milestone'
          : 'Campus Broadcast',
      severity: params.severity,
      actionView: params.actionView || 'home',
      isActive: true,
      createdByUsername: user.username || 'admin',
      createdAt: 'Just now',
      createdTimestamp: Date.now(),
    };

    setCampusAnnouncements((prev) => [newAnn, ...prev]);

    const newNotif: AppNotification = {
      id: `notif_broadcast_${Date.now()}`,
      type: 'system_alert',
      title: `📢 ${cleanTitle}`,
      body: cleanBody,
      createdAt: 'Just now',
      createdTimestamp: Date.now(),
      isRead: false,
      targetView: params.actionView || 'home',
      actorName: 'Bopoi Campus Admin',
      actorUsername: 'admin',
      isAnonymous: false,
    };
    setNotifications((prev) => [newNotif, ...prev]);

    if (supabase) {
      supabase
        .rpc('admin_broadcast_announcement', {
          p_title: cleanTitle,
          p_body: cleanBody,
          p_campus: params.campus || 'All Campuses',
          p_severity: params.severity,
          p_target_view: params.actionView || 'home',
        })
        .then(() => {
          syncAdminTablesFromSupabase();
        });
    }

    recordAdminAudit(
      'broadcast_announcement',
      'campus_announcement',
      newAnn.id,
      `Broadcasted "${cleanTitle}" to ${params.campus || 'All Campuses'}`
    );
    showToast(`Live announcement broadcasted to ${params.campus || 'All Campuses'}!`, 'success');
  };

  const adminToggleAnnouncementActive = (announcementId: string) => {
    if (!isAdminUnlockedRef.current) return;
    let nextActive = false;
    setCampusAnnouncements((prev) =>
      prev.map((a) => {
        if (a.id !== announcementId) return a;
        nextActive = !a.isActive;
        return { ...a, isActive: nextActive };
      })
    );

    if (supabase && /^[0-9a-f-]{36}$/i.test(announcementId)) {
      supabase
        .from('campus_announcements')
        .update({ is_active: nextActive })
        .eq('id', announcementId)
        .then(() => {
          syncAdminTablesFromSupabase();
        });
    }

    recordAdminAudit(
      'toggle_announcement',
      'campus_announcement',
      announcementId,
      `${nextActive ? 'Activated' : 'Paused'} announcement ${announcementId.slice(0, 8)}`
    );
    showToast(nextActive ? 'Announcement banner activated' : 'Announcement banner paused', 'info');
  };

  const adminDeleteAnnouncement = (announcementId: string) => {
    if (!isAdminUnlockedRef.current) return;
    const targetAnn = campusAnnouncements.find((a) => a.id === announcementId);
    requestConfirm({
      badge: 'Admin Broadcast',
      title: 'Delete this campus announcement?',
      description: `Are you sure you want to permanently delete "${
        targetAnn?.title || 'this announcement'
      }" from the campus broadcast banners?`,
      confirmLabel: 'Yes, Delete Banner',
      variant: 'danger',
      icon: 'delete',
      onConfirm: () => {
        setCampusAnnouncements((prev) => prev.filter((a) => a.id !== announcementId));

        if (supabase && /^[0-9a-f-]{36}$/i.test(announcementId)) {
          supabase
            .from('campus_announcements')
            .delete()
            .eq('id', announcementId)
            .then(() => {
              syncAdminTablesFromSupabase();
            });
        }

        recordAdminAudit(
          'delete_announcement',
          'campus_announcement',
          announcementId,
          `Deleted announcement ${announcementId.slice(0, 8)}`
        );
        showToast('Announcement deleted', 'info');
      },
    });
  };

  const adminUpdatePlatformSettings = (updates: Partial<PlatformSettings>) => {
    if (!isAdminUnlockedRef.current) return;
    const executeSettingsUpdate = () => {
      setPlatformSettings((prev) => {
        const next: PlatformSettings = {
          ...prev,
          ...updates,
          updatedAt: 'Just now',
        };
        if (supabase) {
          supabase
            .rpc('admin_update_platform_settings', {
              p_blocked_words: next.globalBlockedWords,
              p_allow_confessions: next.allowAnonymousConfessions,
              p_allow_new_rooms: next.allowNewRooms,
              p_maintenance_mode: next.maintenanceMode,
            })
            .then(() => {
              syncAdminTablesFromSupabase();
            });
        }
        return next;
      });

      recordAdminAudit(
        'update_platform_settings',
        'platform_settings',
        'global',
        `Updated global platform settings (${Object.keys(updates).join(', ')})`
      );
      showToast('Global platform settings synced in real time', 'success');
    };

    if (updates.maintenanceMode !== undefined) {
      requestConfirm({
        badge: 'Global Platform Switch',
        title: updates.maintenanceMode
          ? 'Enable Campus Maintenance Mode?'
          : 'Disable Campus Maintenance Mode?',
        description: updates.maintenanceMode
          ? 'Enabling Read-Only Maintenance Mode will temporarily pause all new posts, comments, and room messages for non-admin student accounts.'
          : 'Disabling Maintenance Mode will restore full posting, commenting, and room chat across all campuses.',
        confirmLabel: updates.maintenanceMode ? 'Enable Maintenance Mode' : 'Restore Live Mode',
        variant: updates.maintenanceMode ? 'warning' : 'primary',
        icon: updates.maintenanceMode ? 'lock' : 'unlock',
        onConfirm: executeSettingsUpdate,
      });
      return;
    }

    executeSettingsUpdate();
  };

  // Deduplicated union of all anonymous messages on the platform for Admin Console inspection
  const allPlatformMessages = React.useMemo(() => {
    const map = new Map<string, AnonymousMessage>();
    allMessages.forEach((m) => map.set(m.id, m));
    adminExtraMessages.forEach((m) => {
      if (!map.has(m.id)) map.set(m.id, m);
    });
    return Array.from(map.values()).sort((a, b) => b.createdTimestamp - a.createdTimestamp);
  }, [allMessages, adminExtraMessages]);

  const resetToDemo = () => {
    queryClient.invalidateQueries();
    syncAdminTablesFromSupabase();
    showToast('Refreshed live data from database', 'info');
  };

  return (
    <BopoiContext.Provider
      value={{
        user,
        messages,
        answers,
        safetySettings,
        activeTab,
        activeView,
        selectedMessage,
        selectedAnswer,
        inboxFilter,
        deviceMode,
        toasts,
        unreadCount,
        notifications: visibleNotifications,
        unreadNotificationsCount,
        markNotificationsRead,
        setActiveTab,
        setActiveView,
        goBack,
        setSelectedMessage,
        setSelectedAnswer,
        setInboxFilter,
        setDeviceMode,
        showToast,
        accounts,
        isAuthenticated,
        loginAccount,
        registerAccount,
        switchAccount,
        logoutAccount,
        askingRecipient,
        setAskingRecipient,
        openPublicAskFor,
        toggleAnswerLike,
        sendAnonymousMessage,
        markAsRead,
        toggleLinkActive,
        saveAnswer,
        deleteMessage,
        reportMessage,
        blockSender,
        unblockSender,
        clearBlockedSenders,
        submitSupportTicket,
        updateProfile,
        addHiddenWord,
        removeHiddenWord,
        copyUserLink,
        resetToDemo,
        addReaction,
        toggleLike,
        addComment,
        getUnreadConvoCount,
        markConvoAsRead,
        lastSentMessageId,
        setLastSentMessageId,
        sentMessages: allMessages.filter((m) => sentMessageIds.includes(m.id)),
        sentMessageIds,
        socialPosts,
        rooms,
        creators,
        feedTab,
        setFeedTab,
        selectedPost,
        setSelectedPost,
        sharingPost,
        setSharingPost,
        openPostShare,
        incrementPostShare,
        isCreateModalOpen,
        setIsCreateModalOpen: (open: boolean) => {
          if (open && !requireAuth('create posts, polls, or confessions')) return;
          setIsCreateModalOpen(open);
        },
        togglePostLike,
        togglePostBookmark,
        votePoll,
        addPostComment,
        toggleCommentLike,
        toggleJoinRoom,
        toggleFollowCreator,
        followEdges,
        getFollowersForUser,
        getFollowingForUser,
        isFollowingUser,
        selectedRoomId,
        setSelectedRoomId,
        enterRoom,
        isCreateRoomModalOpen,
        setIsCreateRoomModalOpen: (open: boolean) => {
          if (open && !requireAuth('create an anonymous room')) return;
          setIsCreateRoomModalOpen(open);
        },
        createRoom,
        deleteRoom,
        updateRoomIcon,
        sendRoomMessage,
        toggleRoomMessageLike,
        addRoomMessageReaction,
        assignPersonaToRoom,
        getRoomPersona,
        selectedPublicUser,
        setSelectedPublicUser,
        viewUserProfile,
        createSocialPost,
        deleteSocialPost,
        reportPost,
        connectionStatus,
        reconnectRealtime,
        characterMood,
        setCharacterMood,
        availableMoods: CHARACTER_MOODS,
        syncCharacterConfig,
        isSearchModalOpen,
        setIsSearchModalOpen,
        globalSearchQuery,
        setGlobalSearchQuery,
        activeLegalDoc,
        openLegalDoc,
        highlightedCommentId,
        setHighlightedCommentId,
        shareCommentLink,
        isAdminUnlocked,
        moderationReports,
        campusAnnouncements,
        adminAuditLogs,
        platformSettings,
        allPlatformMessages,
        adminUpdateUser,
        adminDeleteUser,
        adminCreateUser,
        adminUpdatePost,
        adminDeleteComment,
        adminUpdateRoom,
        adminDeleteRoomMessage,
        adminDeleteAnonymousMessage,
        adminDeleteMessageComment,
        adminDeleteAnswer,
        adminResolveReport,
        adminBroadcastAnnouncement,
        adminToggleAnnouncementActive,
        adminDeleteAnnouncement,
        adminUpdatePlatformSettings,
        confirmDialog,
        requestConfirm,
        closeConfirmDialog,
      }}
    >
      {children}
    </BopoiContext.Provider>
  );
};

export const BopoiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <QueryClientProvider client={bopoiQueryClient}>
      <BopoiInnerProvider>{children}</BopoiInnerProvider>
    </QueryClientProvider>
  );
};

export const useBopoi = () => {
  const context = useContext(BopoiContext);
  if (!context) {
    throw new Error('useBopoi must be used within a BopoiProvider');
  }
  return context;
};

export const useCharacterMood = () => {
  const { characterMood, setCharacterMood, availableMoods, user } = useBopoi();
  const currentMoodOption =
    availableMoods.find((m) => m.id === characterMood) || availableMoods[0];

  const getAvatarWithMood = (moodOverride?: string, baseAvatarUrl?: string, seed?: string) => {
    return applyMoodToAvatarUrl(
      baseAvatarUrl ?? user.avatarUrl,
      moodOverride ?? characterMood,
      seed ?? user.username
    );
  };

  return {
    characterMood,
    currentMoodOption,
    setCharacterMood,
    availableMoods,
    getAvatarWithMood,
  };
};

export const useCharacterSync = () => {
  const { user, syncCharacterConfig, characterMood } = useBopoi();

  const getStoredCharacterAvatar = (usernameOrId?: string, fallbackAvatar?: string) => {
    if (!usernameOrId) return fallbackAvatar || user.avatarUrl;
    const synced = getCharacterFromBackendStore(usernameOrId);
    return synced?.avatarUrl || fallbackAvatar;
  };

  return {
    syncCharacterConfig,
    getStoredCharacterAvatar,
    currentAvatarUrl: user.avatarUrl,
    currentMood: characterMood,
  };
};
