import { RoomAssignedPersona } from '../types/index.ts';

export interface PresetPersona {
  id: string; // mask id matching PersonaMaskIcon, e.g. 'masked-student'
  name: string; // e.g. 'Masked Student'
  tagline: string;
  emoji: string;
}

export const ROOM_PRESET_ALIASES: PresetPersona[] = [
  { id: 'masked-student', name: 'Masked Student', tagline: 'Anonymous Founder', emoji: '🎭' },
  { id: 'night-owl', name: 'Night Owl', tagline: 'Late Night Chatter', emoji: '🦉' },
  { id: 'secret-confession', name: 'Secret Confession', tagline: 'Silent Brain', emoji: '🤫' },
  { id: 'midnight-scholar', name: 'Midnight Scholar', tagline: 'Deep Thinker', emoji: '🧠' },
  { id: 'hostel-phantom', name: 'Hostel Phantom', tagline: 'Ghost Student', emoji: '👻' },
  { id: 'campus-rebel', name: 'Campus Rebel', tagline: 'Hot Takes', emoji: '⚡' },
  { id: 'secret-admirer', name: 'Secret Admirer', tagline: 'Love & Match', emoji: '💘' },
  { id: 'phantom-chatter', name: 'Phantom Chatter', tagline: 'Incognito', emoji: '🕶️' },
  { id: 'neon-panther', name: 'Neon Panther', tagline: 'Campus Insider', emoji: '🐾' },
  { id: 'public-profile', name: 'Secret Sleuth', tagline: 'Silent Observer', emoji: '👤' },
];

/**
 * Storage key helper for a room's assigned persona for the current client
 */
export const getRoomPersonaStorageKey = (roomId: string) => `bopoi_room_assigned_persona_${roomId}`;

/**
 * Retrieves the persisted persona for a user in a room
 */
export function getSavedRoomPersona(
  roomId: string,
  userId: string,
  roomAssignedMap?: Record<string, RoomAssignedPersona>
): RoomAssignedPersona | null {
  // 1. Check in-memory room assignedPersonas map first
  if (roomAssignedMap && roomAssignedMap[userId]) {
    return roomAssignedMap[userId];
  }

  // 2. Check local client storage for persistent session recall
  try {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(getRoomPersonaStorageKey(roomId));
      if (stored) {
        const parsed: RoomAssignedPersona = JSON.parse(stored);
        if (parsed && (parsed.userId === userId || !parsed.userId)) {
          return parsed;
        }
      }
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Saves the persona for a user in a room to local client storage
 */
export function persistRoomPersona(roomId: string, persona: RoomAssignedPersona): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(getRoomPersonaStorageKey(roomId), JSON.stringify(persona));
    }
  } catch {
    // ignore
  }
}

/**
 * Clears saved persona when a room is deleted
 */
export function removeRoomPersona(roomId: string): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(getRoomPersonaStorageKey(roomId));
    }
  } catch {
    // ignore
  }
}

/**
 * Finds all taken preset aliases in this room (among the 10 preset aliases).
 */
export function getTakenPresetAliasIds(
  assignedMap: Record<string, RoomAssignedPersona> = {},
  creatorAlias?: string
): Set<string> {
  const taken = new Set<string>();

  Object.values(assignedMap).forEach((item) => {
    if (!item.isCustom) {
      const match = ROOM_PRESET_ALIASES.find(
        (p) =>
          p.id === item.maskId ||
          p.name.toLowerCase() === item.alias.toLowerCase()
      );
      if (match) {
        taken.add(match.id);
      }
    }
  });

  if (creatorAlias) {
    const creatorLower = creatorAlias.toLowerCase();
    const match = ROOM_PRESET_ALIASES.find(
      (p) =>
        creatorLower.includes(p.name.toLowerCase()) ||
        creatorLower.includes(p.emoji) ||
        creatorLower.includes(p.id)
    );
    if (match) {
      taken.add(match.id);
    }
  }

  return taken;
}

/**
 * Checks which preset aliases from the 10 are still available for automatic assignment
 */
export function getAvailablePresetAliases(
  assignedMap: Record<string, RoomAssignedPersona> = {},
  creatorAlias?: string
): PresetPersona[] {
  const taken = getTakenPresetAliasIds(assignedMap, creatorAlias);
  return ROOM_PRESET_ALIASES.filter((p) => !taken.has(p.id));
}
