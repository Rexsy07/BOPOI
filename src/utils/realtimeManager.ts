import {
  SocialPost,
  CommunityRoom,
  AnonymousMessage,
  MessageAnswer,
} from '../types/index.ts';
import {
  isSupabaseConfigured,
  fetchSupabaseSocialPosts,
  fetchSupabaseRooms,
  fetchSupabaseMessages,
  fetchSupabaseAnswers,
} from '../lib/supabase.ts';

export type ConnectionStatus = 'connected' | 'reconnecting' | 'connecting';

export type RealtimeEventType =
  | 'POSTS_UPDATED'
  | 'ROOMS_UPDATED'
  | 'ROOM_MESSAGE_NEW'
  | 'ROOM_CREATED'
  | 'ROOM_JOINED'
  | 'ROOM_PERSONA_ASSIGNED'
  | 'MESSAGES_UPDATED'
  | 'ANSWERS_UPDATED'
  | 'NOTIFICATIONS_UPDATED'
  | 'CHARACTER_SYNCED'
  | 'CHARACTER_MOOD_UPDATED'
  | 'FOLLOWS_UPDATED'
  | 'HEARTBEAT_ACK';

export interface RealtimePacket<T = any> {
  type: RealtimeEventType;
  payload: T;
  senderTabId: string;
  timestamp: number;
}

export interface CharacterBackendRecord {
  userId: string;
  username: string;
  avatarUrl: string;
  moodId: string;
  updatedAt: number;
}

const CHARACTER_BACKEND_STORAGE_KEY = 'bopoi_character_backend_store';
const REALTIME_CHANNEL_NAME = 'bopoi_realtime_bus_v2';
const LEGACY_ROOMS_CHANNEL_NAME = 'bopoi_realtime_rooms';
const REAL_DB_CLEANUP_VERSION_KEY = 'bopoi_real_data_only_v4';

/**
 * Purges any legacy demo/mock data ('tolu_ade', 'post_conf_1', 'msg_1', etc.)
 * or placeholder 'student' profile that was previously stored in browser localStorage.
 */
export function purgeLegacyMockStorageOnce(): void {
  if (typeof window === 'undefined') return;
  try {
    const rawUser = localStorage.getItem('bopoi_user');
    if (rawUser) {
      try {
        const parsed = JSON.parse(rawUser);
        if (!parsed?.username || parsed.username === 'student' || !parsed.id) {
          localStorage.removeItem('bopoi_user');
          localStorage.setItem('bopoi_authenticated', 'false');
        }
      } catch {
        localStorage.removeItem('bopoi_user');
        localStorage.setItem('bopoi_authenticated', 'false');
      }
    }

    if (localStorage.getItem(REAL_DB_CLEANUP_VERSION_KEY) === 'true') return;
    const keysToClear = [
      'bopoi_user',
      'bopoi_accounts',
      'bopoi_authenticated',
      'bopoi_messages',
      'bopoi_answers',
      'bopoi_social_posts',
      'bopoi_rooms',
      'bopoi_creators',
      'bopoi_selected_post',
      'bopoi_selected_message',
      'bopoi_selected_answer',
      'bopoi_selected_public_user',
      'bopoi_asking_recipient',
      'bopoi_sent_message_ids',
      'bopoi_character_backend_store',
      'bopoi_safety',
    ];
    keysToClear.forEach((k) => localStorage.removeItem(k));
    localStorage.setItem(REAL_DB_CLEANUP_VERSION_KEY, 'true');
  } catch {
    // ignore
  }
}

// Run immediately on module load before any state initializes
purgeLegacyMockStorageOnce();

let memoryCharacterStore: Record<string, CharacterBackendRecord> = {};

function loadCharacterStoreFromStorage(): Record<string, CharacterBackendRecord> {
  if (typeof window === 'undefined') return memoryCharacterStore;
  try {
    const raw = localStorage.getItem(CHARACTER_BACKEND_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        memoryCharacterStore = parsed;
      }
    }
  } catch {
    // ignore
  }
  return memoryCharacterStore;
}

loadCharacterStoreFromStorage();

export function syncCharacterToBackendStore(record: {
  userId: string;
  username: string;
  avatarUrl: string;
  moodId?: string;
}): CharacterBackendRecord {
  const store = loadCharacterStoreFromStorage();
  const cleanUsername = (record.username || '').replace(/^@/, '').trim().toLowerCase();
  const cleanUserId = (record.userId || '').trim();
  const existing = store[cleanUsername] || (cleanUserId ? store[cleanUserId] : undefined);

  const entry: CharacterBackendRecord = {
    userId: cleanUserId || existing?.userId || `usr_${cleanUsername}`,
    username: cleanUsername,
    avatarUrl: record.avatarUrl,
    moodId: record.moodId || existing?.moodId || 'confident-smile',
    updatedAt: Date.now(),
  };

  if (cleanUsername) {
    store[cleanUsername] = entry;
  }
  if (cleanUserId) {
    store[cleanUserId] = entry;
  }

  memoryCharacterStore = { ...store };

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(CHARACTER_BACKEND_STORAGE_KEY, JSON.stringify(memoryCharacterStore));
    } catch {
      // ignore
    }
  }

  realtimeManager.publish('CHARACTER_SYNCED', entry);
  return entry;
}

export function getCharacterFromBackendStore(
  usernameOrUserId?: string | null
): CharacterBackendRecord | null {
  if (!usernameOrUserId) return null;
  const clean = String(usernameOrUserId).replace(/^@/, '').trim().toLowerCase();
  if (!clean) return null;
  if (memoryCharacterStore[clean]) {
    return memoryCharacterStore[clean];
  }
  const store = loadCharacterStoreFromStorage();
  return store[clean] || null;
}

export function getAllCharactersFromBackendStore(): Record<string, CharacterBackendRecord> {
  return loadCharacterStoreFromStorage();
}

class RealtimeWebSocketManager {
  private tabId: string;
  private status: ConnectionStatus = 'connected';
  private channel: BroadcastChannel | null = null;
  private legacyRoomChannel: BroadcastChannel | null = null;
  private statusListeners: Set<(status: ConnectionStatus) => void> = new Set();
  private eventListeners: Set<(packet: RealtimePacket) => void> = new Set();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.tabId = `tab_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    if (typeof window !== 'undefined') {
      this.initChannels();
      this.initNetworkListeners();
      this.startHeartbeat();
    }
  }

  private initChannels() {
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        if (this.channel) this.channel.close();
        this.channel = new BroadcastChannel(REALTIME_CHANNEL_NAME);
        this.channel.onmessage = (e) => {
          const packet = e.data as RealtimePacket;
          if (!packet || packet.senderTabId === this.tabId) return;
          if (packet.type === 'CHARACTER_SYNCED' && packet.payload) {
            const rec = packet.payload as CharacterBackendRecord;
            if (rec.username) memoryCharacterStore[rec.username] = rec;
            if (rec.userId) memoryCharacterStore[rec.userId] = rec;
          }
          this.notifyEventListeners(packet);
        };

        if (this.legacyRoomChannel) this.legacyRoomChannel.close();
        this.legacyRoomChannel = new BroadcastChannel(LEGACY_ROOMS_CHANNEL_NAME);
        this.legacyRoomChannel.onmessage = (e) => {
          const data = e.data;
          if (!data || !data.type) return;
          this.notifyEventListeners({
            type: data.type as RealtimeEventType,
            payload: data.payload,
            senderTabId: 'legacy_tab',
            timestamp: Date.now(),
          });
        };
      }
      this.setStatus('connected');
    } catch {
      this.scheduleReconnect();
    }
  }

  private initNetworkListeners() {
    window.addEventListener('online', () => {
      this.setStatus('reconnecting');
      setTimeout(() => {
        this.initChannels();
        this.setStatus('connected');
      }, 450);
    });

    window.addEventListener('offline', () => {
      this.setStatus('reconnecting');
    });

    window.addEventListener('storage', (e: StorageEvent) => {
      if (!e.key || !e.newValue) return;
      if (e.key === 'bopoi_social_posts') {
        this.notifyEventListeners({
          type: 'POSTS_UPDATED',
          payload: null,
          senderTabId: 'storage_event',
          timestamp: Date.now(),
        });
      } else if (e.key === 'bopoi_rooms') {
        this.notifyEventListeners({
          type: 'ROOMS_UPDATED',
          payload: null,
          senderTabId: 'storage_event',
          timestamp: Date.now(),
        });
      } else if (e.key === 'bopoi_messages') {
        this.notifyEventListeners({
          type: 'MESSAGES_UPDATED',
          payload: null,
          senderTabId: 'storage_event',
          timestamp: Date.now(),
        });
      } else if (e.key === 'bopoi_answers') {
        this.notifyEventListeners({
          type: 'ANSWERS_UPDATED',
          payload: null,
          senderTabId: 'storage_event',
          timestamp: Date.now(),
        });
      } else if (e.key === CHARACTER_BACKEND_STORAGE_KEY) {
        loadCharacterStoreFromStorage();
        this.notifyEventListeners({
          type: 'CHARACTER_SYNCED',
          payload: memoryCharacterStore,
          senderTabId: 'storage_event',
          timestamp: Date.now(),
        });
      }
    });
  }

  private startHeartbeat() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval(() => {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        if (this.status !== 'reconnecting') {
          this.setStatus('reconnecting');
        }
        return;
      }
      if (this.status !== 'connected') {
        this.initChannels();
      }
    }, 8000);
  }

  private scheduleReconnect() {
    this.setStatus('reconnecting');
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.initChannels();
    }, 900);
  }

  private setStatus(next: ConnectionStatus) {
    if (this.status === next) return;
    this.status = next;
    this.statusListeners.forEach((cb) => cb(this.status));
  }

  private notifyEventListeners(packet: RealtimePacket) {
    this.eventListeners.forEach((cb) => cb(packet));
  }

  public getStatus(): ConnectionStatus {
    return this.status;
  }

  public reconnect(): void {
    this.setStatus('reconnecting');
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.initChannels();
      this.setStatus('connected');
      this.notifyEventListeners({
        type: 'HEARTBEAT_ACK',
        payload: { reconnectedAt: Date.now() },
        senderTabId: this.tabId,
        timestamp: Date.now(),
      });
    }, 650);
  }

  public publish<T = any>(type: RealtimeEventType, payload: T): void {
    const packet: RealtimePacket<T> = {
      type,
      payload,
      senderTabId: this.tabId,
      timestamp: Date.now(),
    };
    try {
      this.channel?.postMessage(packet);
    } catch {
      this.scheduleReconnect();
    }
  }

  public onStatusChange(cb: (status: ConnectionStatus) => void): () => void {
    this.statusListeners.add(cb);
    cb(this.status);
    return () => {
      this.statusListeners.delete(cb);
    };
  }

  public onEvent(cb: (packet: RealtimePacket) => void): () => void {
    this.eventListeners.add(cb);
    return () => {
      this.eventListeners.delete(cb);
    };
  }
}

export const realtimeManager = new RealtimeWebSocketManager();

// Query Fetchers for TanStack Query (Fetches from Supabase when configured, otherwise local real state)
export async function fetchSyncedSocialPosts(currentUserId?: string): Promise<SocialPost[]> {
  if (isSupabaseConfigured) {
    const remote = await fetchSupabaseSocialPosts(currentUserId);
    if (remote !== null) return remote;
  }
  try {
    const saved = localStorage.getItem('bopoi_social_posts');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

export async function fetchSyncedRooms(currentUserId?: string): Promise<CommunityRoom[]> {
  if (isSupabaseConfigured) {
    const remote = await fetchSupabaseRooms(currentUserId);
    if (remote !== null) return remote;
  }
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
}

export async function fetchSyncedMessages(currentUserId?: string): Promise<AnonymousMessage[]> {
  if (isSupabaseConfigured) {
    const remote = await fetchSupabaseMessages(currentUserId);
    if (remote !== null) return remote;
  }
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
}

export async function fetchSyncedAnswers(): Promise<Record<string, MessageAnswer>> {
  if (isSupabaseConfigured) {
    const remote = await fetchSupabaseAnswers();
    if (remote !== null) return remote;
  }
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
}
