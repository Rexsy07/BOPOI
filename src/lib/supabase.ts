import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import {
  SocialPost,
  CommunityRoom,
  AnonymousMessage,
  MessageAnswer,
  CreatorProfile,
  UserProfile,
  AppNotification,
  RoomMessage,
  RoomAssignedPersona,
  SocialComment,
  ActiveAppView,
  ModerationReport,
  CampusAnnouncement,
  AdminAuditLog,
  PlatformSettings,
} from '../types/index.ts';
import {
  fetchPersonalizedSocialFeed,
  fetchPeopleYouMayKnow,
  executeActivationPipeline,
  rankSocialPostsWithBandit,
  recordPostBanditInteraction,
  triggerPostVectorGeneration,
  invalidateGraphCacheForUser,
  computeLocalAdamicAdarRecommendations,
} from './retentionEngine.ts';

export {
  fetchPersonalizedSocialFeed,
  fetchPeopleYouMayKnow,
  executeActivationPipeline,
  rankSocialPostsWithBandit,
  recordPostBanditInteraction,
  triggerPostVectorGeneration,
  invalidateGraphCacheForUser,
  computeLocalAdamicAdarRecommendations,
};

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || '';
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('http') &&
    !supabaseUrl.includes('your-project-ref')
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 20,
        },
      },
    })
  : null;

const SENDER_TOKEN_STORAGE_KEY = 'bopoi_anon_sender_token';

/**
 * Formats an ISO timestamp into a human-readable relative string ('Just now', '5m ago', '2h ago', '3d ago')
 */
export function formatRelativeTime(isoOrDate?: string | number | null): string {
  if (!isoOrDate) return 'Just now';
  const ts = typeof isoOrDate === 'number' ? isoOrDate : new Date(isoOrDate).getTime();
  if (Number.isNaN(ts)) return String(isoOrDate);
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diffSec < 45) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
  return new Date(ts).toLocaleDateString();
}

/**
 * Generates or retrieves a persistent anonymous client token so unauthenticated
 * senders can view and reply to their 1-on-1 private convos via RPC.
 */
export function getOrCreateAnonymousSenderToken(): string {
  if (typeof window === 'undefined') return 'server_anon_token';
  try {
    const existing = localStorage.getItem(SENDER_TOKEN_STORAGE_KEY);
    if (existing && existing.length >= 20) return existing;
    let secureRandom = '';
    if (typeof window.crypto !== 'undefined' && typeof window.crypto.randomUUID === 'function') {
      secureRandom = window.crypto.randomUUID().replace(/-/g, '');
    } else if (typeof window.crypto !== 'undefined' && typeof window.crypto.getRandomValues === 'function') {
      const bytes = new Uint8Array(16);
      window.crypto.getRandomValues(bytes);
      secureRandom = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    } else {
      throw new Error('Web Crypto API unavailable');
    }
    const token = `anon_${secureRandom}`;
    localStorage.setItem(SENDER_TOKEN_STORAGE_KEY, token);
    return token;
  } catch {
    return `anon_${Date.now().toString(36)}`;
  }
}

const ADMIN_USER_OVERRIDES_KEY = 'bopoi_admin_user_overrides';
const ADMIN_CREATED_USERS_KEY = 'bopoi_admin_created_users';
const ADMIN_DELETED_USERS_KEY = 'bopoi_admin_deleted_users';
const ADMIN_ROOM_OVERRIDES_KEY = 'bopoi_admin_room_overrides';
const ADMIN_DELETED_ROOMS_KEY = 'bopoi_admin_deleted_rooms';
const ADMIN_DELETED_ROOM_MSGS_KEY = 'bopoi_admin_deleted_room_msgs';
const ADMIN_POST_OVERRIDES_KEY = 'bopoi_admin_post_overrides';
const ADMIN_DELETED_POSTS_KEY = 'bopoi_admin_deleted_posts';
const ADMIN_DELETED_COMMENTS_KEY = 'bopoi_admin_deleted_comments';
const ADMIN_DELETED_ANON_MSGS_KEY = 'bopoi_admin_deleted_anon_msgs';
const ADMIN_DELETED_ANSWERS_KEY = 'bopoi_admin_deleted_answers';

function readJsonMap<T>(key: string): Record<string, T> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeJsonMap<T>(key: string, map: Record<string, T>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(map));
  } catch {
    // ignore
  }
}

function readStringSet(key: string): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(key);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function addToStringSet(key: string, values: string[]): void {
  if (typeof window === 'undefined') return;
  const set = readStringSet(key);
  values.forEach((v) => {
    if (v) set.add(v);
  });
  try {
    localStorage.setItem(key, JSON.stringify(Array.from(set)));
  } catch {
    // ignore
  }
}

function removeFromStringSet(key: string, values: string[]): void {
  if (typeof window === 'undefined') return;
  const set = readStringSet(key);
  values.forEach((v) => set.delete(v));
  try {
    localStorage.setItem(key, JSON.stringify(Array.from(set)));
  } catch {
    // ignore
  }
}

export function getAdminUserOverrides(): Record<string, Partial<UserProfile>> {
  return readJsonMap<Partial<UserProfile>>(ADMIN_USER_OVERRIDES_KEY);
}

export function saveAdminUserOverride(keys: string[], patch: Partial<UserProfile>): void {
  const map = getAdminUserOverrides();
  keys.forEach((rawKey) => {
    const k = rawKey?.trim();
    if (!k) return;
    map[k] = { ...(map[k] || {}), ...patch };
    map[k.toLowerCase()] = { ...(map[k.toLowerCase()] || {}), ...patch };
  });
  writeJsonMap(ADMIN_USER_OVERRIDES_KEY, map);
}

export function getAdminCreatedUsers(): UserProfile[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ADMIN_CREATED_USERS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveAdminCreatedUser(newUser: UserProfile): void {
  if (typeof window === 'undefined') return;
  const existing = getAdminCreatedUsers().filter(
    (u) => u.id !== newUser.id && u.username.toLowerCase() !== newUser.username.toLowerCase()
  );
  try {
    localStorage.setItem(ADMIN_CREATED_USERS_KEY, JSON.stringify([newUser, ...existing]));
  } catch {
    // ignore
  }
  removeFromStringSet(ADMIN_DELETED_USERS_KEY, [
    newUser.id,
    newUser.username,
    newUser.username.toLowerCase(),
  ]);
}

export function markAdminDeletedUser(keys: string[]): void {
  const normalized = keys.flatMap((k) => (k ? [k, k.toLowerCase()] : []));
  addToStringSet(ADMIN_DELETED_USERS_KEY, normalized);
  if (typeof window !== 'undefined') {
    const remaining = getAdminCreatedUsers().filter(
      (u) => !normalized.includes(u.id) && !normalized.includes(u.username.toLowerCase())
    );
    try {
      localStorage.setItem(ADMIN_CREATED_USERS_KEY, JSON.stringify(remaining));
    } catch {
      // ignore
    }
  }
}

export function getAdminRoomOverrides(): Record<string, Partial<CommunityRoom>> {
  return readJsonMap<Partial<CommunityRoom>>(ADMIN_ROOM_OVERRIDES_KEY);
}

export function saveAdminRoomOverride(
  roomId: string,
  patch: Partial<CommunityRoom>,
  roomName?: string
): void {
  if (!roomId) return;
  const map = getAdminRoomOverrides();
  map[roomId] = { ...(map[roomId] || {}), ...patch };
  const cleanName = (roomName || patch.name || '').trim().toLowerCase();
  if (cleanName) {
    const nameKey = `name:${cleanName}`;
    map[nameKey] = { ...(map[nameKey] || {}), ...patch };
  }
  writeJsonMap(ADMIN_ROOM_OVERRIDES_KEY, map);
}

/**
 * Uploads a base64 room icon (`img:data:image/...` or `data:image/...`) to Supabase Storage
 * (`avatars` bucket under `room-icons/`) if possible, returning `img:<publicUrl>`.
 * Gracefully falls back to the compact data URL if Storage is unavailable or blocked by RLS.
 */
export async function uploadRoomIconToSupabaseStorage(
  iconEmoji: string,
  roomKey?: string
): Promise<string> {
  const raw = (iconEmoji || '').trim();
  const cleanUrl = raw.startsWith('img:') ? raw.slice(4) : raw;
  if (!cleanUrl.startsWith('data:image/')) {
    return raw;
  }
  if (!supabase) {
    return raw.startsWith('img:') ? raw : `img:${raw}`;
  }

  try {
    const parts = cleanUrl.split(',');
    if (parts.length < 2) return raw.startsWith('img:') ? raw : `img:${raw}`;
    const meta = parts[0];
    const base64 = parts[1];
    const mimeMatch = meta.match(/data:(image\/[a-zA-Z0-9+.-]+);base64/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/webp';
    const ext = mimeType.includes('png')
      ? 'png'
      : mimeType.includes('jpeg') || mimeType.includes('jpg')
      ? 'jpg'
      : 'webp';

    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: mimeType });

    const safeRoomKey = (roomKey || 'room')
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .slice(0, 36);
    const filePath = `room-icons/${safeRoomKey}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 7)}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from('avatars')
      .upload(filePath, blob, {
        contentType: mimeType,
        upsert: true,
      });

    if (!uploadErr) {
      const { data: pubData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      if (pubData?.publicUrl) {
        return `img:${pubData.publicUrl}`;
      }
    }
  } catch {
    // Fallback to compact data URL below
  }

  return raw.startsWith('img:') ? raw : `img:${raw}`;
}

/**
 * Reliably persists a room's profile icon (`icon_emoji` & `icon_bg`) to Supabase `public.community_rooms`
 * using RPC -> direct table update by ID -> direct table update by room name -> server fallback.
 */
export async function persistRoomIconToDatabase(params: {
  roomId: string;
  roomName?: string;
  iconEmoji: string;
  iconBg: string;
}): Promise<{ finalIconEmoji: string; persistedToDb: boolean }> {
  const finalIconEmoji = await uploadRoomIconToSupabaseStorage(
    params.iconEmoji,
    params.roomId
  );

  saveAdminRoomOverride(
    params.roomId,
    { iconEmoji: finalIconEmoji, iconBg: params.iconBg },
    params.roomName
  );

  let persistedToDb = false;
  const isUuid = /^[0-9a-f-]{36}$/i.test(params.roomId);

  if (supabase) {
    // 1. Try SECURITY DEFINER RPC first if available
    if (isUuid) {
      try {
        const { data: rpcOk, error: rpcErr } = await supabase.rpc(
          'update_community_room_icon',
          {
            p_room_id: params.roomId,
            p_icon_emoji: finalIconEmoji,
            p_icon_bg: params.iconBg,
          }
        );
        if (!rpcErr && rpcOk !== false) {
          persistedToDb = true;
        }
      } catch {
        // RPC may not be installed yet; continue to direct update
      }
    }

    // 2. Direct update on public.community_rooms by UUID (no updated_at column!)
    if (!persistedToDb && isUuid) {
      try {
        const { data: updatedRows, error: updateErr } = await supabase
          .from('community_rooms')
          .update({
            icon_emoji: finalIconEmoji,
            icon_bg: params.iconBg,
          })
          .eq('id', params.roomId)
          .select('id');

        if (!updateErr && Array.isArray(updatedRows) && updatedRows.length > 0) {
          persistedToDb = true;
        }
      } catch {
        // continue
      }
    }

    // 3. Fallback: match by room name if roomId was temporary or 0 rows matched by ID
    if (!persistedToDb && params.roomName?.trim()) {
      try {
        const { data: byNameRows, error: byNameErr } = await supabase
          .from('community_rooms')
          .update({
            icon_emoji: finalIconEmoji,
            icon_bg: params.iconBg,
          })
          .ilike('name', params.roomName.trim())
          .select('id');

        if (!byNameErr && Array.isArray(byNameRows) && byNameRows.length > 0) {
          persistedToDb = true;
        }
      } catch {
        // continue
      }
    }
  }

  // 4. Server-side fallback route (uses SUPABASE_SERVICE_ROLE_KEY when configured)
  if (!persistedToDb && typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/rooms/sync-icon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: params.roomId,
          roomName: params.roomName,
          iconEmoji: finalIconEmoji,
          iconBg: params.iconBg,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json?.persisted) {
          persistedToDb = true;
        }
      }
    } catch {
      // ignore network error
    }
  }

  return { finalIconEmoji, persistedToDb };
}

export function markAdminDeletedRoom(roomId: string): void {
  addToStringSet(ADMIN_DELETED_ROOMS_KEY, [roomId]);
}

export function markAdminDeletedRoomMessage(messageId: string): void {
  addToStringSet(ADMIN_DELETED_ROOM_MSGS_KEY, [messageId]);
}

export function getAdminPostOverrides(): Record<string, Partial<SocialPost>> {
  return readJsonMap<Partial<SocialPost>>(ADMIN_POST_OVERRIDES_KEY);
}

export function saveAdminPostOverride(postId: string, patch: Partial<SocialPost>): void {
  if (!postId) return;
  const map = getAdminPostOverrides();
  map[postId] = { ...(map[postId] || {}), ...patch };
  writeJsonMap(ADMIN_POST_OVERRIDES_KEY, map);
}

export function markAdminDeletedPost(postId: string): void {
  addToStringSet(ADMIN_DELETED_POSTS_KEY, [postId]);
}

export function unmarkAdminDeletedPost(postId: string): void {
  removeFromStringSet(ADMIN_DELETED_POSTS_KEY, [postId]);
}

export function markAdminDeletedComment(commentId: string): void {
  addToStringSet(ADMIN_DELETED_COMMENTS_KEY, [commentId]);
}

export function markAdminDeletedAnonMessage(messageId: string): void {
  addToStringSet(ADMIN_DELETED_ANON_MSGS_KEY, [messageId]);
}

export function markAdminDeletedAnswer(messageIdOrAnswerId: string): void {
  addToStringSet(ADMIN_DELETED_ANSWERS_KEY, [messageIdOrAnswerId]);
}

/**
 * Fetch real Social Posts (with Poll Options, Comments, Likes, Bookmarks, and User Votes) from Supabase
 */
export async function fetchSupabaseSocialPosts(currentUserId?: string): Promise<SocialPost[] | null> {
  if (!supabase) return null;
  try {
    const { data: postsRows, error } = await supabase
      .from('social_posts')
      .select(
        `
        *,
        poll_options (*),
        post_comments (*)
      `
      )
      .order('created_at', { ascending: false })
      .limit(100);

    if (error || !postsRows) return null;

    let likedPostIds = new Set<string>();
    let bookmarkedPostIds = new Set<string>();
    let likedCommentIds = new Set<string>();
    let userPollVotes = new Map<string, string>();

    const validUuid = currentUserId && /^[0-9a-f-]{36}$/i.test(currentUserId);
    if (validUuid) {
      const [likesRes, bookmarksRes, commentLikesRes, pollVotesRes] = await Promise.all([
        supabase.from('post_likes').select('post_id').eq('user_id', currentUserId),
        supabase.from('post_bookmarks').select('post_id').eq('user_id', currentUserId),
        supabase.from('post_comment_likes').select('comment_id').eq('user_id', currentUserId),
        supabase.from('poll_votes').select('post_id, option_id').eq('user_id', currentUserId),
      ]);

      likesRes.data?.forEach((r: any) => likedPostIds.add(r.post_id));
      bookmarksRes.data?.forEach((r: any) => bookmarkedPostIds.add(r.post_id));
      commentLikesRes.data?.forEach((r: any) => likedCommentIds.add(r.comment_id));
      pollVotesRes.data?.forEach((r: any) => userPollVotes.set(r.post_id, r.option_id));
    }

    const deletedPosts = readStringSet(ADMIN_DELETED_POSTS_KEY);
    const deletedComments = readStringSet(ADMIN_DELETED_COMMENTS_KEY);
    const postOverrides = getAdminPostOverrides();
    const userOverrides = getAdminUserOverrides();

    return postsRows
      .filter((row: any) => !deletedPosts.has(row.id))
      .map((row: any): SocialPost => {
        const createdTs = new Date(row.created_at).getTime() || Date.now();
        const rawOptions = Array.isArray(row.poll_options) ? row.poll_options : [];
        const sortedOptions = [...rawOptions]
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
          .map((o: any) => ({
            id: o.id,
            text: o.text,
            votes: o.votes ?? 0,
          }));

        const rawComments = Array.isArray(row.post_comments) ? row.post_comments : [];
        const mappedComments: SocialComment[] = [...rawComments]
          .filter((c: any) => !deletedComments.has(c.id))
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
          .map((c: any) => ({
            id: c.id,
            postId: c.post_id,
            authorName: c.author_name,
            authorUsername: c.author_username,
            authorAvatar: c.author_avatar || undefined,
            authorCampus: c.author_campus || undefined,
            isAnonymous: Boolean(c.is_anonymous),
            text: c.text,
            createdAt: formatRelativeTime(c.created_at),
            createdTimestamp: new Date(c.created_at).getTime() || Date.now(),
            likes: c.likes_count ?? 0,
            hasLiked: likedCommentIds.has(c.id),
            parentId: c.parent_id || undefined,
            replyToAuthor: c.reply_to_author || undefined,
            replyToUsername: c.reply_to_username || undefined,
          }));

        const pOverride = postOverrides[row.id] || {};
        const uOverride =
          (row.author_user_id && userOverrides[row.author_user_id]) ||
          (row.author_username && userOverrides[String(row.author_username).toLowerCase()]) ||
          {};

        return {
          id: row.id,
          type: row.type,
          authorName: uOverride.displayName || row.author_name,
          authorUsername: row.author_username,
          authorAvatar: uOverride.avatarUrl || row.author_avatar || undefined,
          authorCampus: uOverride.campus || row.author_campus || undefined,
          authorUserId: row.author_user_id || undefined,
          authorIsVerified:
            uOverride.isVerified !== undefined
              ? uOverride.isVerified
              : Boolean(row.author_is_verified),
          isAnonymous: Boolean(row.is_anonymous),
          category: pOverride.category ?? (row.category || 'Campus Life'),
          title: pOverride.title !== undefined ? pOverride.title : row.title || undefined,
          content: pOverride.content ?? row.content,
          hashtags: Array.isArray(row.hashtags) ? row.hashtags : [],
          createdAt: formatRelativeTime(row.created_at),
          createdTimestamp: createdTs,
          likes: row.likes_count ?? 0,
          hasLiked: likedPostIds.has(row.id),
          commentsCount: mappedComments.length,
          sharesCount: row.shares_count ?? 0,
          isBookmarked: bookmarkedPostIds.has(row.id),
          isPinned: pOverride.isPinned !== undefined ? pOverride.isPinned : Boolean(row.is_pinned),
          isFeatured:
            pOverride.isFeatured !== undefined ? pOverride.isFeatured : Boolean(row.is_featured),
          pollOptions: sortedOptions.length > 0 ? sortedOptions : undefined,
          pollTotalVotes: row.poll_total_votes ?? 0,
          userVotedOptionId: userPollVotes.get(row.id),
          pollExpiresIn: row.poll_expires_in || undefined,
          comments: mappedComments,
        };
      });
  } catch {
    return null;
  }
}

/**
 * Fetch real Community Rooms (with Messages, Assigned Personas, and Memberships) from Supabase
 */
export async function fetchSupabaseRooms(currentUserId?: string): Promise<CommunityRoom[] | null> {
  if (!supabase) return null;
  try {
    const { data: roomRows, error } = await supabase
      .from('community_rooms')
      .select(
        `
        *,
        room_messages (*),
        room_assigned_personas (*),
        room_memberships (user_id),
        room_presence (user_id, last_seen_at)
      `
      )
      .order('created_at', { ascending: false });

    if (error || !roomRows) return null;

    let joinedRoomIds = new Set<string>();
    let likedRoomMsgIds = new Set<string>();
    const validUuid = currentUserId && /^[0-9a-f-]{36}$/i.test(currentUserId);
    if (validUuid) {
      const [membersRes, msgLikesRes] = await Promise.all([
        supabase.from('room_memberships').select('room_id').eq('user_id', currentUserId),
        supabase.from('room_message_likes').select('message_id').eq('user_id', currentUserId),
      ]);
      membersRes.data?.forEach((r: any) => joinedRoomIds.add(r.room_id));
      msgLikesRes.data?.forEach((r: any) => likedRoomMsgIds.add(r.message_id));
    }

    const nowMs = Date.now();
    const deletedRooms = readStringSet(ADMIN_DELETED_ROOMS_KEY);
    const deletedRoomMsgs = readStringSet(ADMIN_DELETED_ROOM_MSGS_KEY);
    const roomOverrides = getAdminRoomOverrides();

    return roomRows
      .filter((row: any) => !deletedRooms.has(row.id))
      .map((row: any): CommunityRoom => {
        const rawMsgs = Array.isArray(row.room_messages) ? row.room_messages : [];
        const mappedMsgs: RoomMessage[] = [...rawMsgs]
          .filter((m: any) => !deletedRoomMsgs.has(m.id))
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
          .map((m: any) => ({
            id: m.id,
            roomId: m.room_id,
            authorName: m.author_name,
            authorUsername: m.author_username,
            authorAvatar: m.author_avatar || undefined,
            authorCampus: m.author_campus || undefined,
            authorMaskEmoji: m.author_mask_emoji || undefined,
            authorAlias: m.author_alias || undefined,
            isAnonymous: Boolean(m.is_anonymous),
            text: m.text,
            createdAt: formatRelativeTime(m.created_at),
            createdTimestamp: new Date(m.created_at).getTime() || Date.now(),
            likes: m.likes_count ?? 0,
            hasLiked: likedRoomMsgIds.has(m.id),
            reactions: m.reactions && typeof m.reactions === 'object' ? m.reactions : {},
            replyTo: m.reply_to_id
              ? {
                  id: m.reply_to_id,
                  authorName: m.reply_to_author_name || 'Student',
                  text: m.reply_to_text || '',
                }
              : undefined,
          }));

        const personasMap: Record<string, RoomAssignedPersona> = {};
        const rawPersonas = Array.isArray(row.room_assigned_personas)
          ? row.room_assigned_personas
          : [];
        rawPersonas.forEach((p: any) => {
          personasMap[p.user_id] = {
            userId: p.user_id,
            alias: p.alias,
            maskId: p.mask_id,
            maskEmoji: p.mask_emoji,
            isCustom: Boolean(p.is_custom),
            assignedAt: new Date(p.assigned_at).getTime() || Date.now(),
          };
        });

        const uniqueMemberIds = new Set<string>();
        if (row.creator_user_id) {
          uniqueMemberIds.add(String(row.creator_user_id));
        }
        if (Array.isArray(row.room_memberships)) {
          row.room_memberships.forEach((rm: any) => {
            if (rm?.user_id) uniqueMemberIds.add(String(rm.user_id));
          });
        }
        rawPersonas.forEach((p: any) => {
          if (p?.user_id) uniqueMemberIds.add(String(p.user_id));
        });
        rawMsgs.forEach((m: any) => {
          if (m?.author_user_id) uniqueMemberIds.add(String(m.author_user_id));
        });

        const exactMembersCount = Math.max(1, uniqueMemberIds.size);

        const activeOnlineIds = new Set<string>();
        if (Array.isArray(row.room_presence)) {
          row.room_presence.forEach((rp: any) => {
            if (rp?.user_id) {
              const seenTs = rp.last_seen_at ? new Date(rp.last_seen_at).getTime() : 0;
              if (!seenTs || nowMs - seenTs < 10 * 60 * 1000) {
                activeOnlineIds.add(String(rp.user_id));
              }
            }
          });
        }
        const exactOnlineCount = Math.min(exactMembersCount, Math.max(1, activeOnlineIds.size));

        const isUserJoined =
          joinedRoomIds.has(row.id) ||
          Boolean(
            currentUserId &&
              (row.creator_user_id === currentUserId || Boolean(personasMap[currentUserId]))
          );

        const normNameKey = row.name ? `name:${String(row.name).trim().toLowerCase()}` : '';
        const rOverride = {
          ...(normNameKey ? roomOverrides[normNameKey] || {} : {}),
          ...(roomOverrides[row.id] || {}),
        };

        const dbHasUploadedImg =
          typeof row.icon_emoji === 'string' &&
          (row.icon_emoji.startsWith('img:') ||
            row.icon_emoji.startsWith('data:image/') ||
            row.icon_emoji.startsWith('http://') ||
            row.icon_emoji.startsWith('https://'));
        const overrideHasUploadedImg =
          typeof rOverride.iconEmoji === 'string' &&
          (rOverride.iconEmoji.startsWith('img:') ||
            rOverride.iconEmoji.startsWith('data:image/') ||
            rOverride.iconEmoji.startsWith('http://') ||
            rOverride.iconEmoji.startsWith('https://'));

        const resolvedIconEmoji =
          dbHasUploadedImg && !overrideHasUploadedImg
            ? row.icon_emoji
            : rOverride.iconEmoji ?? (row.icon_emoji || '💬');

        return {
          id: row.id,
          name: rOverride.name ?? row.name,
          description: rOverride.description ?? row.description,
          category: rOverride.category ?? (row.category || 'Campus'),
          membersCount: exactMembersCount,
          onlineCount: exactOnlineCount,
          isJoined: isUserJoined,
          iconEmoji: resolvedIconEmoji,
          iconBg: rOverride.iconBg ?? (row.icon_bg || '#5420F5'),
          messages: mappedMsgs,
          creatorUserId: row.creator_user_id || undefined,
          creatorName: row.creator_name || undefined,
          creatorAlias: row.creator_alias || undefined,
          isCustomRoom: Boolean(row.is_custom_room),
          isAnonymousOnly:
            rOverride.isAnonymousOnly !== undefined
              ? rOverride.isAnonymousOnly
              : Boolean(row.is_anonymous_only),
          isLocked: rOverride.isLocked !== undefined ? rOverride.isLocked : Boolean(row.is_locked),
          isFeatured:
            rOverride.isFeatured !== undefined ? rOverride.isFeatured : Boolean(row.is_featured),
          tags: Array.isArray(row.tags) ? row.tags : [],
          createdAt: formatRelativeTime(row.created_at),
          createdTimestamp: new Date(row.created_at).getTime() || Date.now(),
          assignedPersonas: personasMap,
        };
      });
  } catch {
    return null;
  }
}

/**
 * Fetch real Anonymous Messages & 1-on-1 Convo Replies from Supabase
 */
export async function fetchSupabaseMessages(currentUserId?: string): Promise<AnonymousMessage[] | null> {
  if (!supabase) return null;
  try {
    const senderToken = getOrCreateAnonymousSenderToken();
    const resultsMap = new Map<string, AnonymousMessage>();
    const deletedAnonMsgs = readStringSet(ADMIN_DELETED_ANON_MSGS_KEY);

    const validUuid = currentUserId && /^[0-9a-f-]{36}$/i.test(currentUserId);
    if (validUuid) {
      const { data: inboxRows } = await supabase
        .from('anonymous_messages')
        .select(
          'id, recipient_user_id, recipient_username, text, is_read, read_at, is_answered, is_reported, report_reason, likes_count, replies_count, reactions, created_at, message_comments (id, message_id, author_name, author_role, author_avatar, is_anonymous, text, likes_count, created_at)'
        )
        .or(`recipient_user_id.eq.${currentUserId},sender_user_id.eq.${currentUserId}`)
        .order('created_at', { ascending: false });

      if (Array.isArray(inboxRows)) {
        inboxRows.forEach((row: any) => {
          if (deletedAnonMsgs.has(row.id)) return;
          const rawComments = Array.isArray(row.message_comments) ? row.message_comments : [];
          resultsMap.set(row.id, {
            id: row.id,
            recipientUsername: row.recipient_username,
            text: row.text,
            createdAt: formatRelativeTime(row.created_at),
            createdTimestamp: new Date(row.created_at).getTime() || Date.now(),
            isRead: Boolean(row.is_read),
            readAt: row.read_at ? formatRelativeTime(row.read_at) : undefined,
            isAnswered: Boolean(row.is_answered),
            isReported: Boolean(row.is_reported),
            reportReason: row.report_reason || undefined,
            likes: row.likes_count ?? 0,
            repliesCount: row.replies_count ?? rawComments.length,
            reactions: row.reactions && typeof row.reactions === 'object' ? row.reactions : {},
            comments: [...rawComments]
              .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
              .map((c: any) => ({
                id: c.id,
                messageId: c.message_id,
                authorName: c.author_name,
                authorRole: c.author_role,
                authorAvatar: c.author_avatar || undefined,
                isAnonymous: Boolean(c.is_anonymous),
                text: c.text,
                createdAt: formatRelativeTime(c.created_at),
                createdTimestamp: new Date(c.created_at).getTime() || Date.now(),
                likes: c.likes_count ?? 0,
              })),
          });
        });
      }
    }

    const { data: senderRows } = await supabase.rpc('get_sender_convo_threads', {
      p_sender_token: senderToken,
    });

    if (Array.isArray(senderRows)) {
      senderRows.forEach((row: any) => {
        if (resultsMap.has(row.id) || deletedAnonMsgs.has(row.id)) return;
        const rawComments = Array.isArray(row.comments) ? row.comments : [];
        resultsMap.set(row.id, {
          id: row.id,
          recipientUsername: row.recipient_username,
          text: row.text,
          createdAt: formatRelativeTime(row.created_at),
          createdTimestamp: new Date(row.created_at).getTime() || Date.now(),
          isRead: Boolean(row.is_read),
          readAt: row.read_at ? formatRelativeTime(row.read_at) : undefined,
          isAnswered: Boolean(row.is_answered),
          likes: row.likes_count ?? 0,
          repliesCount: row.replies_count ?? rawComments.length,
          reactions: row.reactions && typeof row.reactions === 'object' ? row.reactions : {},
          comments: rawComments.map((c: any) => ({
            id: c.id,
            messageId: c.message_id,
            authorName: c.author_name,
            authorRole: c.author_role,
            authorAvatar: c.author_avatar || undefined,
            isAnonymous: Boolean(c.is_anonymous),
            text: c.text,
            createdAt: formatRelativeTime(c.created_at),
            createdTimestamp: new Date(c.created_at).getTime() || Date.now(),
            likes: c.likes_count ?? 0,
          })),
        });
      });
    }

    return Array.from(resultsMap.values()).sort(
      (a, b) => b.createdTimestamp - a.createdTimestamp
    );
  } catch {
    return null;
  }
}

/**
 * Fetch real Story Answers from Supabase
 */
export async function fetchSupabaseAnswers(): Promise<Record<string, MessageAnswer> | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('message_answers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) return null;

    const deletedAnswers = readStringSet(ADMIN_DELETED_ANSWERS_KEY);
    const map: Record<string, MessageAnswer> = {};
    data.forEach((row: any) => {
      if (deletedAnswers.has(row.message_id) || deletedAnswers.has(row.id)) return;
      map[row.message_id] = {
        id: row.id,
        messageId: row.message_id,
        questionText: row.question_text,
        answerText: row.answer_text,
        createdAt: formatRelativeTime(row.created_at),
        isPublic: Boolean(row.is_public),
        isDraft: Boolean(row.is_draft),
        likes: row.likes_count ?? 0,
        authorDisplayName: row.author_display_name,
        authorUsername: row.author_username,
      };
    });
    return map;
  } catch {
    return null;
  }
}

/**
 * Fetch real Registered Student Profiles / Creators from Supabase
 */
export interface FollowEdge {
  followerId: string;
  followerUsername: string;
  followingId: string;
  followingUsername: string;
  createdAt: number;
}

const LOCAL_FOLLOW_EDGES_KEY = 'bopoi_follow_edges';
const LOCAL_UNFOLLOW_TOMBSTONES_KEY = 'bopoi_unfollow_tombstones';

export function getLocalFollowEdges(): FollowEdge[] {
  try {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(LOCAL_FOLLOW_EDGES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalFollowEdges(edges: FollowEdge[]): void {
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem(LOCAL_FOLLOW_EDGES_KEY, JSON.stringify(edges));
  } catch {
    // ignore
  }
}

export function getLocalUnfollowTombstones(): Set<string> {
  return readStringSet(LOCAL_UNFOLLOW_TOMBSTONES_KEY);
}

export function markLocalFollowEdge(edge: FollowEdge, isFollowing: boolean): FollowEdge[] {
  const fUser = edge.followerUsername.toLowerCase();
  const tUser = edge.followingUsername.toLowerCase();
  const pairKeyUser = `${fUser}->${tUser}`;
  const pairKeyId = `${edge.followerId}->${edge.followingId}`;

  if (isFollowing) {
    removeFromStringSet(LOCAL_UNFOLLOW_TOMBSTONES_KEY, [pairKeyUser, pairKeyId]);
  } else {
    addToStringSet(LOCAL_UNFOLLOW_TOMBSTONES_KEY, [pairKeyUser, pairKeyId]);
  }

  const current = getLocalFollowEdges().filter(
    (e) =>
      !(
        (e.followerUsername.toLowerCase() === fUser &&
          e.followingUsername.toLowerCase() === tUser) ||
        (e.followerId === edge.followerId && e.followingId === edge.followingId)
      )
  );
  const next = isFollowing ? [edge, ...current] : current;
  saveLocalFollowEdges(next);
  return next;
}

export async function fetchSupabaseProfiles(
  currentUserId?: string,
  currentUsername?: string
): Promise<{
  profiles: UserProfile[];
  creators: CreatorProfile[];
  followEdges: FollowEdge[];
} | null> {
  if (!supabase) return null;
  try {
    const { data: rows, error } = await supabase
      .from('profiles')
      .select('*')
      .order('followers_count', { ascending: false })
      .limit(200);

    if (error || !rows) return null;

    const deletedUsers = readStringSet(ADMIN_DELETED_USERS_KEY);
    const userOverrides = getAdminUserOverrides();
    const adminCreated = getAdminCreatedUsers();

    const applyOverride = (base: UserProfile): UserProfile => {
      const ov =
        userOverrides[base.id] ||
        (base.username ? userOverrides[base.username.toLowerCase()] : undefined) ||
        {};
      return {
        ...base,
        ...ov,
      };
    };

    const dbProfilesRaw: UserProfile[] = rows
      .filter(
        (r: any) =>
          !deletedUsers.has(r.id) &&
          !(r.username && deletedUsers.has(String(r.username).toLowerCase()))
      )
      .map((r: any) => {
        const base: UserProfile = {
          id: r.id,
          username: r.username,
          displayName: r.display_name,
          email: r.id === currentUserId ? r.email || '' : '',
          avatarUrl: r.avatar_url,
          bio: r.bio || '',
          linkActive: r.link_active ?? true,
          followersCount: r.followers_count ?? 0,
          followingCount: r.following_count ?? 0,
          campus: r.campus || 'Chrisland University',
          customPrompt: r.custom_prompt || "There's something you've been wanting to ask...",
          role: r.role || (r.is_admin ? 'admin' : r.is_creator ? 'creator' : 'student'),
          isAdmin: Boolean(r.is_admin || r.role === 'admin'),
          isVerified: Boolean(
            r.is_verified !== undefined && r.is_verified !== null ? r.is_verified : r.is_creator
          ),
          isCreator: Boolean(r.is_creator ?? r.is_verified),
          isSuspended: Boolean(r.is_suspended),
          suspensionReason: r.suspension_reason || undefined,
          onboardingCompleted: Boolean(r.onboarding_completed ?? true),
          createdAt: formatRelativeTime(r.created_at),
        };
        return applyOverride(base);
      });

    const existingUsernames = new Set(dbProfilesRaw.map((p) => p.username.toLowerCase()));
    const extraAdminUsers = adminCreated
      .filter(
        (u) =>
          !deletedUsers.has(u.id) &&
          !deletedUsers.has(u.username.toLowerCase()) &&
          !existingUsernames.has(u.username.toLowerCase())
      )
      .map(applyOverride);

    const initialProfiles = [...dbProfilesRaw, ...extraAdminUsers];
    const idToUsername = new Map<string, string>();
    initialProfiles.forEach((p) => {
      if (p.id && p.username) {
        idToUsername.set(p.id, p.username);
      }
    });

    // Fetch all follow relationships from Supabase user_follows
    const { data: followRows } = await supabase
      .from('user_follows')
      .select('follower_id, following_id, created_at')
      .limit(2000);

    const tombstones = getLocalUnfollowTombstones();
    const localEdges = getLocalFollowEdges();
    const mergedMap = new Map<string, FollowEdge>();
    const existingUsernameSet = new Set(
      initialProfiles.map((p) => p.username.toLowerCase())
    );

    if (followRows) {
      followRows.forEach((r: any) => {
        const fId = String(r.follower_id || '');
        const tId = String(r.following_id || '');
        if (!fId || !tId || fId === tId) return;
        const fUser = idToUsername.get(fId);
        const tUser = idToUsername.get(tId);
        if (!fUser || !tUser) return;
        if (fUser.toLowerCase() === tUser.toLowerCase()) return;
        const keyUser = `${fUser.toLowerCase()}->${tUser.toLowerCase()}`;
        const keyId = `${fId}->${tId}`;
        if (tombstones.has(keyUser) || tombstones.has(keyId)) return;
        mergedMap.set(keyUser, {
          followerId: fId,
          followerUsername: fUser,
          followingId: tId,
          followingUsername: tUser,
          createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
        });
      });
    }

    const nowMs = Date.now();
    localEdges.forEach((edge) => {
      const fLower = (edge.followerUsername || '').toLowerCase();
      const tLower = (edge.followingUsername || '').toLowerCase();
      if (!fLower || !tLower || fLower === tLower) return;
      if (!existingUsernameSet.has(fLower) || !existingUsernameSet.has(tLower)) return;
      // When Supabase followRows succeeded, only keep very recent in-flight optimistic edges
      if (followRows && nowMs - (edge.createdAt || 0) > 8000) return;
      const keyUser = `${fLower}->${tLower}`;
      const keyId = `${edge.followerId}->${edge.followingId}`;
      if (tombstones.has(keyUser) || tombstones.has(keyId)) return;
      if (!mergedMap.has(keyUser)) {
        mergedMap.set(keyUser, edge);
      }
    });

    const followEdges = Array.from(mergedMap.values());
    saveLocalFollowEdges(followEdges);

    const normCurrUser = (currentUsername || '').toLowerCase();
    const myFollowingTargetKeys = new Set<string>();
    const followerEdgeCounts = new Map<string, number>();
    const followingEdgeCounts = new Map<string, number>();

    followEdges.forEach((e) => {
      const fUser = e.followerUsername.toLowerCase();
      const tUser = e.followingUsername.toLowerCase();
      followerEdgeCounts.set(tUser, (followerEdgeCounts.get(tUser) || 0) + 1);
      if (e.followingId) {
        followerEdgeCounts.set(e.followingId, (followerEdgeCounts.get(e.followingId) || 0) + 1);
      }
      followingEdgeCounts.set(fUser, (followingEdgeCounts.get(fUser) || 0) + 1);
      if (e.followerId) {
        followingEdgeCounts.set(e.followerId, (followingEdgeCounts.get(e.followerId) || 0) + 1);
      }
      if (
        (currentUserId && e.followerId === currentUserId) ||
        (normCurrUser && fUser === normCurrUser)
      ) {
        myFollowingTargetKeys.add(tUser);
        if (e.followingId) myFollowingTargetKeys.add(e.followingId);
      }
    });

    const profiles: UserProfile[] = initialProfiles.map((p) => {
      const uLower = p.username.toLowerCase();
      const edgeFollowers = Math.max(
        followerEdgeCounts.get(uLower) || 0,
        followerEdgeCounts.get(p.id) || 0
      );
      const edgeFollowing = Math.max(
        followingEdgeCounts.get(uLower) || 0,
        followingEdgeCounts.get(p.id) || 0
      );
      const isMe =
        (currentUserId && p.id === currentUserId) ||
        (normCurrUser && uLower === normCurrUser);

      if (
        isMe &&
        supabase &&
        /^[0-9a-f-]{36}$/i.test(p.id) &&
        (p.followersCount !== edgeFollowers || p.followingCount !== edgeFollowing)
      ) {
        supabase
          .from('profiles')
          .update({
            followers_count: edgeFollowers,
            following_count: edgeFollowing,
          })
          .eq('id', p.id)
          .then(() => {});
      }

      return {
        ...p,
        followersCount: edgeFollowers,
        followingCount: edgeFollowing,
      };
    });

    const rawCreators: CreatorProfile[] = profiles
      .filter(
        (p) =>
          p.id !== currentUserId &&
          (!normCurrUser || p.username.toLowerCase() !== normCurrUser) &&
          !p.isSuspended
      )
      .map((p) => {
        const isFollowing =
          myFollowingTargetKeys.has(p.id) ||
          myFollowingTargetKeys.has(p.username.toLowerCase());
        return {
          id: p.id,
          name: p.displayName,
          username: p.username,
          avatarUrl: p.avatarUrl,
          campus: p.campus || 'Chrisland University',
          bio: p.bio || '',
          followersCount: p.followersCount ?? 0,
          followingCount: p.followingCount ?? 0,
          isFollowing,
          isVerified: Boolean(p.isVerified || p.isCreator),
          isAdmin: Boolean(p.isAdmin || p.role === 'admin'),
        };
      });

    // Apply 2-hop Adamic-Adar triadic closure + reciprocal follow boost to unfollowed recommendations
    const myCampus =
      profiles.find(
        (p) =>
          (currentUserId && p.id === currentUserId) ||
          (normCurrUser && p.username.toLowerCase() === normCurrUser)
      )?.campus || 'Chrisland University';

    const pymkScored = computeLocalAdamicAdarRecommendations(
      currentUserId || '',
      currentUsername || '',
      myCampus,
      followEdges,
      rawCreators
    );
    const pymkRankMap = new Map<string, number>();
    pymkScored.forEach((item, idx) => {
      pymkRankMap.set(item.username.toLowerCase(), pymkScored.length - idx);
    });

    const creators: CreatorProfile[] = [...rawCreators].sort((a, b) => {
      const scoreA = pymkRankMap.get(a.username.toLowerCase()) ?? 0;
      const scoreB = pymkRankMap.get(b.username.toLowerCase()) ?? 0;
      if (scoreB !== scoreA) return scoreB - scoreA;
      return (b.followersCount ?? 0) - (a.followersCount ?? 0);
    });

    return { profiles, creators, followEdges };
  } catch {
    return null;
  }
}

/**
 * Fetch real Notifications for the logged-in user from Supabase
 */
export async function fetchSupabaseNotifications(currentUserId?: string): Promise<AppNotification[] | null> {
  if (!supabase || !currentUserId || !/^[0-9a-f-]{36}$/i.test(currentUserId)) return null;
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('recipient_user_id', currentUserId)
      .order('created_at', { ascending: false })
      .limit(40);

    if (error || !data) return null;

    return data.map((n: any): AppNotification => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      createdAt: formatRelativeTime(n.created_at),
      createdTimestamp: new Date(n.created_at).getTime() || Date.now(),
      isRead: Boolean(n.is_read),
      targetView: (n.target_view || 'home') as ActiveAppView,
      targetId: n.target_id || undefined,
      actorName: n.actor_name || undefined,
      actorUsername: n.actor_username || undefined,
      actorAvatar: n.actor_avatar || undefined,
      isAnonymous: Boolean(n.is_anonymous),
    }));
  } catch {
    return null;
  }
}

/**
 * Fetch real-time Admin Console data (Moderation Reports, Campus Announcements, Audit Logs, Platform Settings, All Anon Messages)
 */
export async function fetchSupabaseAdminData(isAdmin: boolean = false): Promise<{
  reports: ModerationReport[];
  announcements: CampusAnnouncement[];
  auditLogs: AdminAuditLog[];
  platformSettings: PlatformSettings | null;
  allAnonMessages: AnonymousMessage[];
} | null> {
  if (!supabase) return null;
  try {
    const emptyRes = Promise.resolve({ data: [] as any[] });
    const [reportsRes, annRes, logsRes, settingsRes, anonMsgsRes] = await Promise.all([
      isAdmin
        ? supabase.from('moderation_reports').select('*').order('created_at', { ascending: false }).limit(100)
        : emptyRes,
      supabase.from('campus_announcements').select('*').order('created_at', { ascending: false }).limit(50),
      isAdmin
        ? supabase.from('admin_audit_logs').select('*').order('created_at', { ascending: false }).limit(100)
        : emptyRes,
      supabase.from('platform_settings').select('*').eq('id', 'global').maybeSingle(),
      isAdmin
        ? supabase
            .from('anonymous_messages')
            .select(
              'id, recipient_user_id, recipient_username, text, is_read, read_at, is_answered, is_reported, report_reason, likes_count, replies_count, reactions, created_at, message_comments (id, message_id, author_name, author_role, author_avatar, is_anonymous, text, likes_count, created_at)'
            )
            .order('created_at', { ascending: false })
            .limit(100)
        : emptyRes,
    ]);

    const reports: ModerationReport[] = (reportsRes.data || []).map((r: any) => ({
      id: r.id,
      reporterUserId: r.reporter_user_id || undefined,
      reporterUsername: r.reporter_username || undefined,
      targetType: r.target_type || 'social_post',
      targetId: r.target_id || '',
      reason: r.reason || '',
      status: (r.status || 'pending') as 'pending' | 'resolved' | 'dismissed',
      adminNotes: r.admin_notes || undefined,
      createdAt: formatRelativeTime(r.created_at),
      createdTimestamp: new Date(r.created_at).getTime() || Date.now(),
      resolvedAt: r.resolved_at ? formatRelativeTime(r.resolved_at) : undefined,
    }));

    const announcements: CampusAnnouncement[] = (annRes.data || []).map((a: any) => ({
      id: a.id,
      title: a.title,
      body: a.body,
      campus: a.campus || 'All Campuses',
      badgeLabel: a.badge_label || 'Campus Broadcast',
      severity: (a.severity || 'info') as 'info' | 'celebration' | 'urgent',
      actionView: (a.action_view || 'home') as ActiveAppView,
      isActive: Boolean(a.is_active ?? true),
      createdByUsername: a.created_by_username || 'admin',
      createdAt: formatRelativeTime(a.created_at),
      createdTimestamp: new Date(a.created_at).getTime() || Date.now(),
    }));

    const auditLogs: AdminAuditLog[] = (logsRes.data || []).map((l: any) => ({
      id: l.id,
      adminUsername: l.admin_username || 'admin',
      actionType: l.action_type || 'admin_action',
      targetType: l.target_type || 'system',
      targetId: l.target_id || '',
      summary: l.summary || '',
      createdAt: formatRelativeTime(l.created_at),
      createdTimestamp: new Date(l.created_at).getTime() || Date.now(),
    }));

    const platformSettings: PlatformSettings | null = settingsRes.data
      ? {
          globalBlockedWords: Array.isArray(settingsRes.data.global_blocked_words)
            ? settingsRes.data.global_blocked_words
            : ['scam', 'phishing', 'doxx'],
          allowAnonymousConfessions: Boolean(settingsRes.data.allow_anonymous_confessions ?? true),
          allowNewRooms: Boolean(settingsRes.data.allow_new_rooms ?? true),
          maintenanceMode: Boolean(settingsRes.data.maintenance_mode ?? false),
          updatedAt: formatRelativeTime(settingsRes.data.updated_at),
        }
      : null;

    const allAnonMessages: AnonymousMessage[] = (anonMsgsRes.data || []).map((row: any) => {
      const rawComments = Array.isArray(row.message_comments) ? row.message_comments : [];
      return {
        id: row.id,
        recipientUsername: row.recipient_username,
        text: row.text,
        createdAt: formatRelativeTime(row.created_at),
        createdTimestamp: new Date(row.created_at).getTime() || Date.now(),
        isRead: Boolean(row.is_read),
        readAt: row.read_at ? formatRelativeTime(row.read_at) : undefined,
        isAnswered: Boolean(row.is_answered),
        isReported: Boolean(row.is_reported),
        reportReason: row.report_reason || undefined,
        likes: row.likes_count ?? 0,
        repliesCount: row.replies_count ?? rawComments.length,
        reactions: row.reactions && typeof row.reactions === 'object' ? row.reactions : {},
        comments: [...rawComments]
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
          .map((c: any) => ({
            id: c.id,
            messageId: c.message_id,
            authorName: c.author_name,
            authorRole: c.author_role,
            authorAvatar: c.author_avatar || undefined,
            isAnonymous: Boolean(c.is_anonymous),
            text: c.text,
            createdAt: formatRelativeTime(c.created_at),
            createdTimestamp: new Date(c.created_at).getTime() || Date.now(),
            likes: c.likes_count ?? 0,
          })),
      };
    });

    return {
      reports,
      announcements,
      auditLogs,
      platformSettings,
      allAnonMessages,
    };
  } catch {
    return null;
  }
}

let activeRealtimeChannel: RealtimeChannel | null = null;

/**
 * Subscribes to live Supabase Postgres Changes across all 27 Bopoi tables
 * and invokes onChange callback immediately when any table updates.
 */
export function subscribeToSupabaseRealtime(
  currentUserId: string | undefined,
  onTableEvent: (table: string, payload: any) => void
): () => void {
  if (!supabase) return () => {};

  if (activeRealtimeChannel) {
    supabase.removeChannel(activeRealtimeChannel);
    activeRealtimeChannel = null;
  }

  const watchedTables = [
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
    'room_presence',
    'moderation_reports',
    'push_subscriptions',
    'platform_settings',
    'campus_announcements',
    'admin_audit_logs',
  ];

  const channel = supabase.channel('bopoi_live_postgres_changes');

  watchedTables.forEach((tbl) => {
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: tbl },
      (payload) => onTableEvent(tbl, payload)
    );
  });

  if (currentUserId && /^[0-9a-f-]{36}$/i.test(currentUserId)) {
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `recipient_user_id=eq.${currentUserId}`,
      },
      (payload) => onTableEvent('notifications', payload)
    );
  }

  channel.subscribe();
  activeRealtimeChannel = channel;

  return () => {
    if (activeRealtimeChannel && supabase) {
      supabase.removeChannel(activeRealtimeChannel);
      activeRealtimeChannel = null;
    }
  };
}

