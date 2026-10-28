import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured, formatRelativeTime } from '../lib/supabase.ts';
import { RoomMessage, SocialComment } from '../types/index.ts';

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

export interface RealtimeSubscriptionHandlers {
  onRoomMessageInsert?: (roomId: string, message: RoomMessage) => void;
  onRoomMessageUpdate?: (roomId: string, message: RoomMessage) => void;
  onRoomMessageDelete?: (roomId: string, messageId: string) => void;
  onPostCommentInsert?: (postId: string, comment: SocialComment) => void;
  onPostCommentUpdate?: (postId: string, comment: SocialComment) => void;
  onPostCommentDelete?: (postId: string, commentId: string) => void;
  onStatusChange?: (status: 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' | 'CHANNEL_ERROR') => void;
}

/**
 * Maps a raw PostgreSQL `room_messages` row into a frontend `RoomMessage` model.
 */
export function mapRoomMessageRow(row: RawRoomMessageRow): RoomMessage {
  const createdTs = row.created_at ? new Date(row.created_at).getTime() : Date.now();
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
    text: row.text || '',
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
  return {
    id: row.id,
    postId: row.post_id,
    authorName: row.author_name || 'Anonymous Student',
    authorUsername: row.author_username || 'anonymous',
    authorAvatar: row.author_avatar || undefined,
    authorCampus: row.author_campus || undefined,
    isAnonymous: Boolean(row.is_anonymous),
    text: row.text || '',
    createdAt: formatRelativeTime(row.created_at),
    createdTimestamp: Number.isNaN(createdTs) ? Date.now() : createdTs,
    likes: row.likes_count ?? 0,
    hasLiked: false,
    parentId: row.parent_id || undefined,
    replyToAuthor: row.reply_to_author || undefined,
    replyToUsername: row.reply_to_username || undefined,
  };
}

let activeStreamChannel: RealtimeChannel | null = null;

/**
 * Initializes dedicated Supabase Realtime subscriptions for `room_messages` and `post_comments`
 * to deliver instant, zero-lag UI updates across all connected clients.
 */
export function initRealtimeSubscriptions(handlers: RealtimeSubscriptionHandlers): () => void {
  if (!isSupabaseConfigured || !supabase) {
    return () => {};
  }

  if (activeStreamChannel) {
    supabase.removeChannel(activeStreamChannel);
    activeStreamChannel = null;
  }

  const channel = supabase
    .channel('bopoi_instant_messages_and_comments')
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
    );

  channel.subscribe((status) => {
    handlers.onStatusChange?.(status);
  });

  activeStreamChannel = channel;

  return () => {
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
