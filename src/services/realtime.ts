import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import {
  supabase,
  isSupabaseConfigured,
  formatRelativeTime,
  parseRoomMessageMedia,
} from '../lib/supabase.ts';
import {
  RoomMessage,
  SocialComment,
  AnonymousMessage,
  MessageComment,
  MessageAnswer,
  AppNotification,
  ActiveAppView,
} from '../types/index.ts';

export interface RawRoomMessageRow {
  id: string;
  room_id: string;
  author_user_id?: string | null;
  author_name: string;
  author_username: string;
  author_avatar?: string | null;
  author_campus?: string | null;
  author_mask_emoji?: string | null;
  author_alias?: string | null;
  is_anonymous?: boolean;
  text: string;
  media_url?: string | null;
  media_type?: string | null;
  reply_to_id?: string | null;
  reply_to_author_name?: string | null;
  reply_to_text?: string | null;
  likes_count?: number;
  reactions?: Record<string, number> | null;
  created_at: string;
}

export interface RawPostCommentRow {
  id: string;
  post_id: string;
  parent_id?: string | null;
  author_user_id?: string | null;
  author_name: string;
  author_username: string;
  author_avatar?: string | null;
  author_campus?: string | null;
  is_anonymous?: boolean;
  reply_to_author?: string | null;
  reply_to_username?: string | null;
  text: string;
  likes_count?: number;
  created_at: string;
}

export interface RawAnonymousMessageRow {
  id: string;
  recipient_user_id?: string | null;
  recipient_username: string;
  sender_user_id?: string | null;
  text: string;
  is_read?: boolean;
  read_at?: string | null;
  is_answered?: boolean;
  is_reported?: boolean;
  report_reason?: string | null;
  likes_count?: number;
  replies_count?: number;
  reactions?: Record<string, number> | null;
  created_at: string;
}

export interface RawMessageCommentRow {
  id: string;
  message_id: string;
  author_name?: string | null;
  author_role?: 'recipient' | 'sender' | string | null;
  author_avatar?: string | null;
  is_anonymous?: boolean;
  text: string;
  likes_count?: number;
  created_at: string;
}

export interface RawMessageAnswerRow {
  id: string;
  message_id: string;
  question_text: string;
  answer_text: string;
  created_at: string;
  is_public?: boolean;
  is_draft?: boolean;
  likes_count?: number;
  author_display_name: string;
  author_username: string;
}

export interface RawNotificationRow {
  id: string;
  recipient_user_id?: string;
  type: AppNotification['type'];
  title: string;
  body: string;
  created_at: string;
  is_read?: boolean;
  target_view?: string | null;
  target_id?: string | null;
  actor_name?: string | null;
  actor_username?: string | null;
  actor_avatar?: string | null;
  is_anonymous?: boolean;
}

export interface RawRoomPresenceRow {
  id?: string;
  room_id?: string | null;
  user_id?: string | null;
  last_seen_at?: string | null;
}

export interface RawCommunityRoomRow {
  id: string;
  name?: string;
  description?: string;
  category?: string;
  icon_emoji?: string;
  icon_bg?: string;
  creator_user_id?: string | null;
  creator_name?: string | null;
  creator_alias?: string | null;
  is_custom_room?: boolean;
  is_anonymous_only?: boolean;
  is_locked?: boolean;
  is_featured?: boolean;
  tags?: string[] | null;
  created_at?: string;
}

export interface RealtimeSubscriptionHandlers {
  onRoomMessageInsert?: (roomId: string, message: RoomMessage) => void;
  onRoomMessageUpdate?: (roomId: string, message: RoomMessage) => void;
  onRoomMessageDelete?: (roomId: string, messageId: string) => void;
  onPostCommentInsert?: (postId: string, comment: SocialComment) => void;
  onPostCommentUpdate?: (postId: string, comment: SocialComment) => void;
  onPostCommentDelete?: (postId: string, commentId: string) => void;
  onAnonymousMessageInsert?: (
    message: AnonymousMessage,
    meta: { recipientUserId?: string; senderUserId?: string }
  ) => void;
  onAnonymousMessageUpdate?: (
    message: AnonymousMessage,
    meta: { recipientUserId?: string; senderUserId?: string }
  ) => void;
  onAnonymousMessageDelete?: (messageId: string) => void;
  onMessageCommentInsert?: (messageId: string, comment: MessageComment) => void;
  onMessageCommentUpdate?: (messageId: string, comment: MessageComment) => void;
  onMessageCommentDelete?: (messageId: string, commentId: string) => void;
  onMessageAnswerUpsert?: (answer: MessageAnswer) => void;
  onMessageAnswerDelete?: (messageId: string, answerId?: string) => void;
  onNotificationInsert?: (notification: AppNotification) => void;
  onNotificationUpdate?: (notification: AppNotification) => void;
  onRoomPresenceUpsert?: (roomId: string, userId: string, lastSeenAt: number) => void;
  onRoomPresenceDelete?: (roomId: string, userId: string) => void;
  onRoomUpdate?: (roomPatch: {
    id: string;
    name?: string;
    description?: string;
    category?: string;
    iconEmoji?: string;
    iconBg?: string;
    isLocked?: boolean;
    isAnonymousOnly?: boolean;
    isFeatured?: boolean;
  }) => void;
  onRoomDelete?: (roomId: string) => void;
  onReconnected?: () => void;
  onStatusChange?: (status: 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' | 'CHANNEL_ERROR') => void;
}

/**
 * Maps a raw PostgreSQL `room_messages` row into a frontend `RoomMessage` model.
 */
export function mapRoomMessageRow(row: RawRoomMessageRow): RoomMessage {
  const createdTs = row.created_at ? new Date(row.created_at).getTime() : Date.now();
  const parsedMedia = parseRoomMessageMedia(row.text, row.media_url, row.media_type);
  return {
    id: row.id,
    roomId: row.room_id,
    authorName: row.author_name || 'Anonymous Student',
    authorUsername: row.author_username || 'anon_student',
    authorAvatar: row.author_avatar || undefined,
    authorCampus: row.author_campus || undefined,
    authorMaskEmoji: row.author_mask_emoji || undefined,
    authorAlias: row.author_alias || undefined,
    isAnonymous: Boolean(row.is_anonymous ?? true),
    text: parsedMedia.text,
    mediaUrl: parsedMedia.mediaUrl,
    mediaType: parsedMedia.mediaType,
    createdAt: formatRelativeTime(row.created_at),
    createdTimestamp: Number.isNaN(createdTs) ? Date.now() : createdTs,
    likes: row.likes_count ?? 0,
    hasLiked: false,
    reactions: row.reactions && typeof row.reactions === 'object' ? row.reactions : {},
    replyTo: row.reply_to_id
      ? {
          id: row.reply_to_id,
          authorName: row.reply_to_author_name || 'Student',
          text: row.reply_to_text || '',
        }
      : undefined,
  };
}

/**
 * Maps a raw PostgreSQL `post_comments` row into a frontend `SocialComment` model.
 */
export function mapPostCommentRow(row: RawPostCommentRow): SocialComment {
  const createdTs = row.created_at ? new Date(row.created_at).getTime() : Date.now();
  const parsedMedia = parseRoomMessageMedia(row.text);
  return {
    id: row.id,
    postId: row.post_id,
    authorName: row.author_name || 'Anonymous Student',
    authorUsername: row.author_username || 'anonymous',
    authorAvatar: row.author_avatar || undefined,
    authorCampus: row.author_campus || undefined,
    isAnonymous: Boolean(row.is_anonymous),
    text: parsedMedia.text,
    mediaUrl: parsedMedia.mediaUrl,
    mediaType: parsedMedia.mediaType,
    createdAt: formatRelativeTime(row.created_at),
    createdTimestamp: Number.isNaN(createdTs) ? Date.now() : createdTs,
    likes: row.likes_count ?? 0,
    hasLiked: false,
    parentId: row.parent_id || undefined,
    replyToAuthor: row.reply_to_author || undefined,
    replyToUsername: row.reply_to_username || undefined,
  };
}

/**
 * Maps a raw PostgreSQL `anonymous_messages` row into a frontend `AnonymousMessage` model.
 */
export function mapAnonymousMessageRow(row: RawAnonymousMessageRow): AnonymousMessage {
  const createdTs = row.created_at ? new Date(row.created_at).getTime() : Date.now();
  return {
    id: row.id,
    recipientUsername: row.recipient_username || '',
    text: row.text || '',
    createdAt: formatRelativeTime(row.created_at),
    createdTimestamp: Number.isNaN(createdTs) ? Date.now() : createdTs,
    isRead: Boolean(row.is_read),
    readAt: row.read_at ? formatRelativeTime(row.read_at) : undefined,
    isAnswered: Boolean(row.is_answered),
    isReported: Boolean(row.is_reported),
    reportReason: row.report_reason || undefined,
    likes: row.likes_count ?? 0,
    repliesCount: row.replies_count ?? 0,
    reactions: row.reactions && typeof row.reactions === 'object' ? row.reactions : {},
    comments: [],
  };
}

/**
 * Maps a raw PostgreSQL `message_comments` row into a frontend `MessageComment` model.
 */
export function mapMessageCommentRow(row: RawMessageCommentRow): MessageComment {
  const createdTs = row.created_at ? new Date(row.created_at).getTime() : Date.now();
  const parsedMedia = parseRoomMessageMedia(row.text);
  const role: 'recipient' | 'sender' = row.author_role === 'sender' ? 'sender' : 'recipient';
  return {
    id: row.id,
    messageId: row.message_id,
    authorName: row.author_name || (role === 'sender' ? 'Original Sender' : 'Student'),
    authorRole: role,
    authorAvatar: row.author_avatar || undefined,
    isAnonymous: Boolean(row.is_anonymous),
    text: parsedMedia.text,
    mediaUrl: parsedMedia.mediaUrl,
    mediaType: parsedMedia.mediaType,
    createdAt: formatRelativeTime(row.created_at),
    createdTimestamp: Number.isNaN(createdTs) ? Date.now() : createdTs,
    likes: row.likes_count ?? 0,
  };
}

/**
 * Maps a raw PostgreSQL `message_answers` row into a frontend `MessageAnswer` model.
 */
export function mapMessageAnswerRow(row: RawMessageAnswerRow): MessageAnswer {
  return {
    id: row.id,
    messageId: row.message_id,
    questionText: row.question_text || '',
    answerText: row.answer_text || '',
    createdAt: formatRelativeTime(row.created_at),
    isPublic: Boolean(row.is_public),
    isDraft: Boolean(row.is_draft),
    likes: row.likes_count ?? 0,
    authorDisplayName: row.author_display_name || 'Student',
    authorUsername: row.author_username || '',
  };
}

/**
 * Maps a raw PostgreSQL `notifications` row into a frontend `AppNotification` model.
 */
export function mapNotificationRow(row: RawNotificationRow): AppNotification {
  const createdTs = row.created_at ? new Date(row.created_at).getTime() : Date.now();
  return {
    id: row.id,
    type: row.type,
    title: row.title || '',
    body: row.body || '',
    createdAt: formatRelativeTime(row.created_at),
    createdTimestamp: Number.isNaN(createdTs) ? Date.now() : createdTs,
    isRead: Boolean(row.is_read),
    targetView: (row.target_view || 'home') as ActiveAppView,
    targetId: row.target_id || undefined,
    actorName: row.actor_name || undefined,
    actorUsername: row.actor_username || undefined,
    actorAvatar: row.actor_avatar || undefined,
    isAnonymous: Boolean(row.is_anonymous),
  };
}

let activeStreamChannel: RealtimeChannel | null = null;

/**
 * Initializes dedicated Supabase Realtime subscriptions for `room_messages`, `post_comments`,
 * `anonymous_messages`, `message_comments`, `message_answers`, and user `notifications`
 * with automatic exponential-backoff reconnect for instant, zero-lag UI updates.
 */
export function initRealtimeSubscriptions(
  handlers: RealtimeSubscriptionHandlers,
  options?: { authUserId?: string }
): () => void {
  if (!isSupabaseConfigured || !supabase) {
    return () => {};
  }

  let disposed = false;
  let retryAttempt = 0;
  let hasEverSubscribed = false;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  const authUserId =
    options?.authUserId && /^[0-9a-f-]{36}$/i.test(options.authUserId)
      ? options.authUserId
      : undefined;

  const connect = () => {
    if (disposed || !supabase) return;

    if (activeStreamChannel) {
      supabase.removeChannel(activeStreamChannel);
      activeStreamChannel = null;
    }

    const channel = supabase
      .channel(`bopoi_instant_stream_${authUserId || 'anon'}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_messages',
        },
        (payload: RealtimePostgresChangesPayload<RawRoomMessageRow>) => {
          if (payload.eventType === 'INSERT' && payload.new) {
            const mapped = mapRoomMessageRow(payload.new);
            handlers.onRoomMessageInsert?.(mapped.roomId, mapped);
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            const mapped = mapRoomMessageRow(payload.new);
            handlers.onRoomMessageUpdate?.(mapped.roomId, mapped);
          } else if (payload.eventType === 'DELETE' && payload.old) {
            const oldRow = payload.old as Partial<RawRoomMessageRow>;
            if (oldRow.id) {
              handlers.onRoomMessageDelete?.(oldRow.room_id || '', oldRow.id);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'post_comments',
        },
        (payload: RealtimePostgresChangesPayload<RawPostCommentRow>) => {
          if (payload.eventType === 'INSERT' && payload.new) {
            const mapped = mapPostCommentRow(payload.new);
            handlers.onPostCommentInsert?.(mapped.postId, mapped);
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            const mapped = mapPostCommentRow(payload.new);
            handlers.onPostCommentUpdate?.(mapped.postId, mapped);
          } else if (payload.eventType === 'DELETE' && payload.old) {
            const oldRow = payload.old as Partial<RawPostCommentRow>;
            if (oldRow.id) {
              handlers.onPostCommentDelete?.(oldRow.post_id || '', oldRow.id);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'anonymous_messages',
        },
        (payload: RealtimePostgresChangesPayload<RawAnonymousMessageRow>) => {
          if (payload.eventType === 'INSERT' && payload.new) {
            const raw = payload.new;
            handlers.onAnonymousMessageInsert?.(mapAnonymousMessageRow(raw), {
              recipientUserId: raw.recipient_user_id || undefined,
              senderUserId: raw.sender_user_id || undefined,
            });
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            const raw = payload.new;
            handlers.onAnonymousMessageUpdate?.(mapAnonymousMessageRow(raw), {
              recipientUserId: raw.recipient_user_id || undefined,
              senderUserId: raw.sender_user_id || undefined,
            });
          } else if (payload.eventType === 'DELETE' && payload.old) {
            const oldRow = payload.old as Partial<RawAnonymousMessageRow>;
            if (oldRow.id) {
              handlers.onAnonymousMessageDelete?.(oldRow.id);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_comments',
        },
        (payload: RealtimePostgresChangesPayload<RawMessageCommentRow>) => {
          if (payload.eventType === 'INSERT' && payload.new) {
            const mapped = mapMessageCommentRow(payload.new);
            handlers.onMessageCommentInsert?.(mapped.messageId, mapped);
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            const mapped = mapMessageCommentRow(payload.new);
            handlers.onMessageCommentUpdate?.(mapped.messageId, mapped);
          } else if (payload.eventType === 'DELETE' && payload.old) {
            const oldRow = payload.old as Partial<RawMessageCommentRow>;
            if (oldRow.id) {
              handlers.onMessageCommentDelete?.(oldRow.message_id || '', oldRow.id);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_answers',
        },
        (payload: RealtimePostgresChangesPayload<RawMessageAnswerRow>) => {
          if (
            (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') &&
            payload.new
          ) {
            handlers.onMessageAnswerUpsert?.(mapMessageAnswerRow(payload.new));
          } else if (payload.eventType === 'DELETE' && payload.old) {
            const oldRow = payload.old as Partial<RawMessageAnswerRow>;
            if (oldRow.message_id || oldRow.id) {
              handlers.onMessageAnswerDelete?.(oldRow.message_id || '', oldRow.id);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_presence',
        },
        (payload: RealtimePostgresChangesPayload<RawRoomPresenceRow>) => {
          if (
            (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') &&
            payload.new
          ) {
            const raw = payload.new;
            if (raw.room_id && raw.user_id && raw.last_seen_at) {
              const seenTs = new Date(raw.last_seen_at).getTime();
              if (!Number.isNaN(seenTs)) {
                handlers.onRoomPresenceUpsert?.(
                  String(raw.room_id),
                  String(raw.user_id),
                  seenTs
                );
              }
            }
          } else if (payload.eventType === 'DELETE' && payload.old) {
            const oldRow = payload.old as Partial<RawRoomPresenceRow>;
            if (oldRow.room_id && oldRow.user_id) {
              handlers.onRoomPresenceDelete?.(
                String(oldRow.room_id),
                String(oldRow.user_id)
              );
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'community_rooms',
        },
        (payload: RealtimePostgresChangesPayload<RawCommunityRoomRow>) => {
          if (payload.eventType === 'UPDATE' && payload.new) {
            const r = payload.new;
            handlers.onRoomUpdate?.({
              id: r.id,
              name: r.name,
              description: r.description,
              category: r.category,
              iconEmoji: r.icon_emoji,
              iconBg: r.icon_bg,
              isLocked: r.is_locked,
              isAnonymousOnly: r.is_anonymous_only,
              isFeatured: r.is_featured,
            });
          } else if (payload.eventType === 'DELETE' && payload.old) {
            const oldRow = payload.old as Partial<RawCommunityRoomRow>;
            if (oldRow.id) handlers.onRoomDelete?.(oldRow.id);
          }
        }
      );

    if (authUserId) {
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_user_id=eq.${authUserId}`,
        },
        (payload: RealtimePostgresChangesPayload<RawNotificationRow>) => {
          if (payload.eventType === 'INSERT' && payload.new) {
            handlers.onNotificationInsert?.(mapNotificationRow(payload.new));
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            handlers.onNotificationUpdate?.(mapNotificationRow(payload.new));
          }
        }
      );
    }

    channel.subscribe((status) => {
      if (disposed) return;
      handlers.onStatusChange?.(status);

      if (status === 'SUBSCRIBED') {
        const wasReconnect = hasEverSubscribed;
        hasEverSubscribed = true;
        retryAttempt = 0;
        if (wasReconnect) {
          handlers.onReconnected?.();
        }
      } else if (
        status === 'CHANNEL_ERROR' ||
        status === 'TIMED_OUT' ||
        status === 'CLOSED'
      ) {
        if (reconnectTimer) clearTimeout(reconnectTimer);
        const delayMs = Math.min(8000, 1200 * Math.pow(1.6, retryAttempt));
        retryAttempt += 1;
        reconnectTimer = setTimeout(() => {
          if (!disposed) connect();
        }, delayMs);
      }
    });

    activeStreamChannel = channel;
  };

  connect();

  return () => {
    disposed = true;
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (activeStreamChannel && supabase) {
      supabase.removeChannel(activeStreamChannel);
      activeStreamChannel = null;
    }
  };
}

/**
 * Scoped subscription helper for a single community room's `room_messages` stream.
 */
export function subscribeToRoomMessages(
  roomId: string,
  onMessageChange: (
    event: 'INSERT' | 'UPDATE' | 'DELETE',
    message: RoomMessage | null,
    deletedId?: string
  ) => void
): () => void {
  if (!isSupabaseConfigured || !supabase || !roomId) {
    return () => {};
  }

  const channel = supabase
    .channel(`room_messages:${roomId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'room_messages',
        filter: `room_id=eq.${roomId}`,
      },
      (payload: RealtimePostgresChangesPayload<RawRoomMessageRow>) => {
        if (payload.eventType === 'INSERT' && payload.new) {
          onMessageChange('INSERT', mapRoomMessageRow(payload.new));
        } else if (payload.eventType === 'UPDATE' && payload.new) {
          onMessageChange('UPDATE', mapRoomMessageRow(payload.new));
        } else if (payload.eventType === 'DELETE' && payload.old) {
          const oldRow = payload.old as Partial<RawRoomMessageRow>;
          onMessageChange('DELETE', null, oldRow.id);
        }
      }
    )
    .subscribe();

  return () => {
    if (supabase) {
      supabase.removeChannel(channel);
    }
  };
}

/**
 * Scoped subscription helper for a single post's `post_comments` thread.
 */
export function subscribeToPostComments(
  postId: string,
  onCommentChange: (
    event: 'INSERT' | 'UPDATE' | 'DELETE',
    comment: SocialComment | null,
    deletedId?: string
  ) => void
): () => void {
  if (!isSupabaseConfigured || !supabase || !postId) {
    return () => {};
  }

  const channel = supabase
    .channel(`post_comments:${postId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'post_comments',
        filter: `post_id=eq.${postId}`,
      },
      (payload: RealtimePostgresChangesPayload<RawPostCommentRow>) => {
        if (payload.eventType === 'INSERT' && payload.new) {
          onCommentChange('INSERT', mapPostCommentRow(payload.new));
        } else if (payload.eventType === 'UPDATE' && payload.new) {
          onCommentChange('UPDATE', mapPostCommentRow(payload.new));
        } else if (payload.eventType === 'DELETE' && payload.old) {
          const oldRow = payload.old as Partial<RawPostCommentRow>;
          onCommentChange('DELETE', null, oldRow.id);
        }
      }
    )
    .subscribe();

  return () => {
    if (supabase) {
      supabase.removeChannel(channel);
    }
  };
}
