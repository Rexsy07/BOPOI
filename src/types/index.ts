export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  email: string;
  avatarUrl: string;
  bio: string;
  linkActive: boolean;
  followersCount: number;
  followingCount: number;
  campus?: string;
  customPrompt?: string;
  role?: 'student' | 'creator' | 'moderator' | 'admin';
  isAdmin?: boolean;
  isVerified?: boolean;
  isCreator?: boolean;
  isSuspended?: boolean;
  suspensionReason?: string;
  onboardingCompleted?: boolean;
  createdAt?: string;
}

export interface MessageComment {
  id: string;
  messageId: string;
  authorName: string;
  authorRole?: 'recipient' | 'sender'; // 'recipient' is Link Owner, 'sender' is the Original Anonymous Sender
  authorAvatar?: string;
  isAnonymous: boolean;
  text: string;
  createdAt: string;
  createdTimestamp: number;
  likes?: number;
  isRead?: boolean;
}

export interface AnonymousMessage {
  id: string;
  recipientUsername: string;
  text: string;
  createdAt: string; // e.g., '2h ago' or ISO
  createdTimestamp: number;
  isRead: boolean;
  readAt?: string;
  isAnswered: boolean;
  likes: number;
  repliesCount: number;
  isReported?: boolean;
  reportReason?: string;
  reactions?: Record<string, number>;
  userReaction?: string;
  comments?: MessageComment[];
}

export interface MessageAnswer {
  id: string;
  messageId: string;
  questionText: string;
  answerText: string;
  createdAt: string;
  isPublic: boolean;
  isDraft: boolean;
  likes: number;
  authorDisplayName: string;
  authorUsername: string;
}

export interface SafetySettings {
  hiddenWords: string[];
  blockedSenders: string[];
  allowPublicSharing: boolean;
}

export type InboxFilter = 'all' | 'unread' | 'answered' | 'sent';

// Social Post Models
export type SocialPostType = 'post' | 'confession' | 'poll' | 'discussion';

export interface PollOption {
  id: string;
  text: string;
  votes: number;
}

export interface SocialComment {
  id: string;
  postId: string;
  authorName: string;
  authorUsername: string;
  authorAvatar?: string;
  authorCampus?: string;
  isAnonymous?: boolean;
  text: string;
  createdAt: string;
  createdTimestamp: number;
  likes: number;
  hasLiked?: boolean;
  parentId?: string;
  replyToAuthor?: string;
  replyToUsername?: string;
}

export interface SocialPost {
  id: string;
  type: SocialPostType;
  authorName: string;
  authorUsername: string;
  authorAvatar?: string;
  authorCampus?: string;
  authorUserId?: string;
  authorIsVerified?: boolean;
  isAnonymous: boolean;
  category?: string; // 'Love' | 'School' | 'Life' | 'Fun' | 'Relationships' | 'Tech' | 'Campus Life'
  title?: string;
  content: string;
  hashtags?: string[];
  createdAt: string;
  createdTimestamp: number;
  likes: number;
  hasLiked?: boolean;
  commentsCount: number;
  sharesCount: number;
  isBookmarked?: boolean;
  isPinned?: boolean;
  isFeatured?: boolean;
  // Poll-specific fields:
  pollOptions?: PollOption[];
  pollTotalVotes?: number;
  userVotedOptionId?: string;
  pollExpiresIn?: string;
  // Comments list:
  comments?: SocialComment[];
}

export interface RoomAssignedPersona {
  userId: string;
  alias: string;
  maskId: string;
  maskEmoji: string;
  isCustom: boolean;
  assignedAt: number;
}

export interface CommunityRoom {
  id: string;
  name: string;
  description: string;
  category: 'Campus' | 'Entertainment' | 'Lifestyle' | 'Confessions' | 'Dating' | 'Study' | string;
  membersCount: number;
  isJoined: boolean;
  iconEmoji: string;
  iconBg: string;
  avatarMembers?: string[];
  onlineCount?: number;
  messages?: RoomMessage[];
  creatorUserId?: string;
  creatorName?: string;
  creatorAlias?: string;
  isCustomRoom?: boolean;
  isAnonymousOnly?: boolean;
  isLocked?: boolean;
  isFeatured?: boolean;
  tags?: string[];
  createdAt?: string;
  createdTimestamp?: number;
  assignedPersonas?: Record<string, RoomAssignedPersona>;
}

export interface RoomMessage {
  id: string;
  roomId: string;
  authorName: string;
  authorUsername: string;
  authorAvatar?: string;
  authorCampus?: string;
  authorMaskEmoji?: string;
  authorAlias?: string;
  isAnonymous?: boolean;
  text: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  createdAt: string;
  createdTimestamp: number;
  likes: number;
  hasLiked?: boolean;
  reactions?: Record<string, number>;
  userReactions?: Record<string, boolean>;
  replyTo?: {
    id: string;
    authorName: string;
    text: string;
  };
}

export interface CreatorProfile {
  id: string;
  name: string;
  username: string;
  avatarUrl: string;
  campus: string;
  bio?: string;
  followersCount?: number;
  followingCount?: number;
  isFollowing: boolean;
  isVerified?: boolean;
  isAdmin?: boolean;
}

export interface ModerationReport {
  id: string;
  reporterUserId?: string;
  reporterUsername?: string;
  targetType: 'social_post' | 'post_comment' | 'room_message' | 'anonymous_message' | 'user_profile' | 'support_ticket' | string;
  targetId: string;
  reason: string;
  status: 'pending' | 'resolved' | 'dismissed';
  adminNotes?: string;
  createdAt: string;
  createdTimestamp: number;
  resolvedAt?: string;
}

export interface CampusAnnouncement {
  id: string;
  title: string;
  body: string;
  campus: string;
  badgeLabel: string;
  severity: 'info' | 'celebration' | 'urgent';
  actionView: ActiveAppView;
  isActive: boolean;
  createdByUsername: string;
  createdAt: string;
  createdTimestamp: number;
}

export interface AdminAuditLog {
  id: string;
  adminUsername: string;
  actionType: string;
  targetType: string;
  targetId: string;
  summary: string;
  createdAt: string;
  createdTimestamp: number;
}

export interface PlatformSettings {
  globalBlockedWords: string[];
  allowAnonymousConfessions: boolean;
  allowNewRooms: boolean;
  maintenanceMode: boolean;
  updatedAt: string;
}

export interface AppNotification {
  id: string;
  type:
    | 'anon_message_received'
    | 'anon_convo_reply'
    | 'anon_message_reaction'
    | 'answer_published'
    | 'answer_liked'
    | 'post_liked'
    | 'post_milestone'
    | 'post_bookmarked'
    | 'post_commented'
    | 'comment_replied'
    | 'comment_liked'
    | 'user_mentioned'
    | 'new_post_from_following'
    | 'poll_voted'
    | 'poll_milestone'
    | 'user_followed'
    | 'new_follower'
    | 'room_joined'
    | 'room_activity'
    | 'room_mention'
    | 'room_message_reply'
    | 'room_message_liked'
    | 'room_message_reaction'
    | 'welcome_notification'
    | 'system_alert';
  title: string;
  body: string;
  createdAt: string;
  createdTimestamp: number;
  isRead: boolean;
  targetView: ActiveAppView;
  targetId?: string;
  actorName?: string;
  actorUsername?: string;
  actorAvatar?: string;
  isAnonymous?: boolean;
}

export type StudentAppTab = 'home' | 'discover' | 'create' | 'inbox' | 'profile';

export type ActiveAppView = 
  | 'splash'
  | 'onboarding'
  | 'landing'
  | 'register'
  | 'link-ready'
  | 'home'
  | 'discover'
  | 'confessions'
  | 'polls'
  | 'poll-detail'
  | 'discussions'
  | 'rooms'
  | 'room-detail'
  | 'post-detail'
  | 'inbox'
  | 'message-detail'
  | 'answer-studio'
  | 'profile'
  | 'saved'
  | 'public-profile'
  | 'public-ask'
  | 'message-sent'
  | 'admin';


