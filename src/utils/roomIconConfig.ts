export type RoomIconMode = 'svg' | 'monogram' | 'emoji';
export type RoomBadgeShape = 'squircle' | 'hexagon' | 'shield' | 'circle' | 'diamond';
export type RoomBadgeGlow = 'none' | 'soft' | 'neon' | 'crest';

export interface RoomIconConfig {
  mode: RoomIconMode;
  value: string;
  fillType: 'gradient' | 'solid';
  fillValue: string;
  shape: RoomBadgeShape;
  glow: RoomBadgeGlow;
}

export interface RoomGradientPreset {
  id: string;
  name: string;
  stops: [string, string, string];
  css: string;
  primaryHex: string;
}

export interface RoomSolidColorPreset {
  id: string;
  name: string;
  hex: string;
}

export interface RoomSvgEmblemMeta {
  id: string;
  label: string;
  group: 'Campus' | 'Night & Secrets' | 'Culture & Vibe' | 'Tech & Play' | 'Prestige';
  recommendedGradient: string;
}

export const ROOM_GRADIENT_PRESETS: RoomGradientPreset[] = [
  {
    id: 'electric-violet',
    name: 'Electric Violet',
    stops: ['#6D28D9', '#5420F5', '#EC4899'],
    css: 'linear-gradient(135deg, #6D28D9 0%, #5420F5 55%, #EC4899 100%)',
    primaryHex: '#5420F5',
  },
  {
    id: 'midnight-cyber',
    name: 'Midnight Cyber',
    stops: ['#0F172A', '#1E1B4B', '#4F46E5'],
    css: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 55%, #4F46E5 100%)',
    primaryHex: '#4F46E5',
  },
  {
    id: 'sunset-blaze',
    name: 'Sunset Blaze',
    stops: ['#EA580C', '#F97316', '#E11D48'],
    css: 'linear-gradient(135deg, #EA580C 0%, #F97316 50%, #E11D48 100%)',
    primaryHex: '#F97316',
  },
  {
    id: 'emerald-aurora',
    name: 'Emerald Aurora',
    stops: ['#064E3B', '#059669', '#10B981'],
    css: 'linear-gradient(135deg, #064E3B 0%, #059669 55%, #10B981 100%)',
    primaryHex: '#059669',
  },
  {
    id: 'crimson-crush',
    name: 'Crimson Crush',
    stops: ['#881337', '#E11D48', '#FB7185'],
    css: 'linear-gradient(135deg, #881337 0%, #E11D48 55%, #FB7185 100%)',
    primaryHex: '#E11D48',
  },
  {
    id: 'oceanic-pulse',
    name: 'Oceanic Pulse',
    stops: ['#0C4A6E', '#0284C7', '#06B6D4'],
    css: 'linear-gradient(135deg, #0C4A6E 0%, #0284C7 55%, #06B6D4 100%)',
    primaryHex: '#0284C7',
  },
  {
    id: 'royal-gold',
    name: 'Royal Gold',
    stops: ['#78350F', '#D97706', '#F59E0B'],
    css: 'linear-gradient(135deg, #78350F 0%, #D97706 55%, #F59E0B 100%)',
    primaryHex: '#D97706',
  },
  {
    id: 'obsidian-velvet',
    name: 'Obsidian Velvet',
    stops: ['#14111D', '#2A1F4A', '#7C3AED'],
    css: 'linear-gradient(135deg, #14111D 0%, #2A1F4A 60%, #7C3AED 100%)',
    primaryHex: '#5420F5',
  },
  {
    id: 'neon-mint',
    name: 'Neon Lagoon',
    stops: ['#0F766E', '#0D9488', '#2DD4BF'],
    css: 'linear-gradient(135deg, #0F766E 0%, #0D9488 55%, #2DD4BF 100%)',
    primaryHex: '#0D9488',
  },
  {
    id: 'berry-mirage',
    name: 'Berry Mirage',
    stops: ['#4A044E', '#A21CAF', '#F43F5E'],
    css: 'linear-gradient(135deg, #4A044E 0%, #A21CAF 55%, #F43F5E 100%)',
    primaryHex: '#A21CAF',
  },
  {
    id: 'indigo-storm',
    name: 'Indigo Storm',
    stops: ['#1E1B4B', '#3730A3', '#6366F1'],
    css: 'linear-gradient(135deg, #1E1B4B 0%, #3730A3 55%, #6366F1 100%)',
    primaryHex: '#4F46E5',
  },
  {
    id: 'frost-crystal',
    name: 'Frost Crystal',
    stops: ['#F8FAFC', '#EDE9FE', '#DDD6FE'],
    css: 'linear-gradient(135deg, #FFFFFF 0%, #F3E8FF 55%, #E0E7FF 100%)',
    primaryHex: '#5420F5',
  },
];

export const ROOM_SOLID_COLORS: RoomSolidColorPreset[] = [
  { id: 'bopoi-violet', name: 'Bopoi Violet', hex: '#5420F5' },
  { id: 'obsidian', name: 'Obsidian Night', hex: '#191525' },
  { id: 'crimson', name: 'Crimson Rose', hex: '#E11D48' },
  { id: 'sunset', name: 'Sunset Orange', hex: '#EA580C' },
  { id: 'emerald', name: 'Emerald Green', hex: '#059669' },
  { id: 'indigo', name: 'Royal Indigo', hex: '#4F46E5' },
  { id: 'teal', name: 'Lagoon Teal', hex: '#0D9488' },
  { id: 'sky', name: 'Electric Sky', hex: '#0284C7' },
  { id: 'amber', name: 'Campus Gold', hex: '#D97706' },
  { id: 'fuchsia', name: 'Neon Berry', hex: '#C026D3' },
  { id: 'slate', name: 'Stealth Slate', hex: '#334155' },
  { id: 'pure-light', name: 'Crisp Ivory', hex: '#FFFFFF' },
];

export const ROOM_BADGE_SHAPES: {
  id: RoomBadgeShape;
  label: string;
  shortLabel: string;
}[] = [
  { id: 'squircle', label: 'Squircle', shortLabel: 'Squircle' },
  { id: 'hexagon', label: 'Hexagon Crest', shortLabel: 'Hexagon' },
  { id: 'shield', label: 'Varsity Shield', shortLabel: 'Shield' },
  { id: 'circle', label: 'Circle Medallion', shortLabel: 'Circle' },
  { id: 'diamond', label: 'Diamond Prism', shortLabel: 'Diamond' },
];

export const ROOM_GLOW_STYLES: {
  id: RoomBadgeGlow;
  label: string;
  description: string;
}[] = [
  { id: 'none', label: 'Clean Edge', description: 'Crisp studio border' },
  { id: 'soft', label: 'Soft Aura', description: 'Subtle ambient glow' },
  { id: 'neon', label: 'Neon Pulse', description: 'Vibrant luminous ring' },
  { id: 'crest', label: 'Double Crest', description: 'Metallic inner + outer rim' },
];

export const ROOM_SVG_EMBLEMS: RoomSvgEmblemMeta[] = [
  // Campus
  { id: 'campus-life', label: 'Academic Cap', group: 'Campus', recommendedGradient: 'electric-violet' },
  { id: 'study-exam', label: 'Study & Books', group: 'Campus', recommendedGradient: 'indigo-storm' },
  { id: 'your-campus', label: 'Campus Hall', group: 'Campus', recommendedGradient: 'royal-gold' },
  { id: 'ideas-hacks', label: 'Spark Idea', group: 'Campus', recommendedGradient: 'sunset-blaze' },
  { id: 'megaphone-voice', label: 'Campus Megaphone', group: 'Campus', recommendedGradient: 'crimson-crush' },
  { id: 'compass-quest', label: 'Explorer Compass', group: 'Campus', recommendedGradient: 'oceanic-pulse' },

  // Night & Secrets
  { id: 'midnight-chat', label: 'Midnight Moon', group: 'Night & Secrets', recommendedGradient: 'midnight-cyber' },
  { id: 'mask-secret', label: 'Secret Mask', group: 'Night & Secrets', recommendedGradient: 'obsidian-velvet' },
  { id: 'mask-owl', label: 'Night Owl', group: 'Night & Secrets', recommendedGradient: 'indigo-storm' },
  { id: 'mask-phantom', label: 'Hostel Phantom', group: 'Night & Secrets', recommendedGradient: 'electric-violet' },
  { id: 'vault-lock', label: 'Classified Vault', group: 'Night & Secrets', recommendedGradient: 'obsidian-velvet' },
  { id: 'eye-radar', label: 'All-Seeing Eye', group: 'Night & Secrets', recommendedGradient: 'berry-mirage' },

  // Culture & Vibe
  { id: 'dating-romance', label: 'Crush & Heart', group: 'Culture & Vibe', recommendedGradient: 'crimson-crush' },
  { id: 'coffee-chill', label: 'Coffee Lounge', group: 'Culture & Vibe', recommendedGradient: 'royal-gold' },
  { id: 'hostel-dorm', label: 'Hostel & Food', group: 'Culture & Vibe', recommendedGradient: 'sunset-blaze' },
  { id: 'music-podcasts', label: 'Headphones', group: 'Culture & Vibe', recommendedGradient: 'berry-mirage' },
  { id: 'fashion-style', label: 'Style & Drip', group: 'Culture & Vibe', recommendedGradient: 'electric-violet' },
  { id: 'vinyl-wave', label: 'Vinyl Studio', group: 'Culture & Vibe', recommendedGradient: 'obsidian-velvet' },
  { id: 'mic-stage', label: 'Open Mic', group: 'Culture & Vibe', recommendedGradient: 'crimson-crush' },

  // Tech & Play
  { id: 'tech-coding', label: 'Code & Tech', group: 'Tech & Play', recommendedGradient: 'oceanic-pulse' },
  { id: 'gaming', label: 'Pro Controller', group: 'Tech & Play', recommendedGradient: 'electric-violet' },
  { id: 'launch-trending', label: 'Rocket Launch', group: 'Tech & Play', recommendedGradient: 'sunset-blaze' },
  { id: 'money-finances', label: 'Hustle & Finance', group: 'Tech & Play', recommendedGradient: 'emerald-aurora' },
  { id: 'cyber-bolt', label: 'High Voltage', group: 'Tech & Play', recommendedGradient: 'midnight-cyber' },

  // Prestige
  { id: 'campus-sports', label: 'Varsity Sports', group: 'Prestige', recommendedGradient: 'emerald-aurora' },
  { id: 'crown-royale', label: 'Varsity Crown', group: 'Prestige', recommendedGradient: 'royal-gold' },
  { id: 'flame-blaze', label: 'Hot Takes Flame', group: 'Prestige', recommendedGradient: 'sunset-blaze' },
  { id: 'trophy-cup', label: 'Champions Cup', group: 'Prestige', recommendedGradient: 'royal-gold' },
  { id: 'diamond-gem', label: 'VIP Diamond', group: 'Prestige', recommendedGradient: 'neon-mint' },
  { id: 'shield-guardian', label: 'Safe Haven Shield', group: 'Prestige', recommendedGradient: 'indigo-storm' },
];

export const ROOM_EMOJI_LIBRARY: { category: string; emojis: string[] }[] = [
  {
    category: 'Vibe & Secrets',
    emojis: ['🎭', '🤫', '👀', '🌙', '🔥', '💀', '💎', '⚡', '🕯️', '🔮', '🕶️', '👻'],
  },
  {
    category: 'Campus & Study',
    emojis: ['🎓', '📚', '💡', '🧠', '🏛️', '✍️', '🔬', '📐', '📣', '🏆', '🎯', '🚀'],
  },
  {
    category: 'Social & Lounge',
    emojis: ['💬', '💖', '💘', '🍕', '☕', '🎧', '🎮', '⚽', '🏀', '🎬', '🎤', '💸'],
  },
];

const CATEGORY_TO_EMBLEM_ID: Record<string, string> = {
  'campus life': 'campus-life',
  'campus life & academics': 'campus-life',
  academics: 'campus-life',
  study: 'study-exam',
  'study & exam survival': 'study-exam',
  hostel: 'hostel-dorm',
  'hostel & dorm (food)': 'hostel-dorm',
  lifestyle: 'hostel-dorm',
  coffee: 'coffee-chill',
  'coffee & chill': 'coffee-chill',
  gaming: 'gaming',
  'gaming & entertainment': 'gaming',
  music: 'music-podcasts',
  'music & podcasts': 'music-podcasts',
  tech: 'tech-coding',
  'tech & coding': 'tech-coding',
  sports: 'campus-sports',
  'campus sports': 'campus-sports',
  midnight: 'midnight-chat',
  'midnight chat / late night': 'midnight-chat',
  confessions: 'mask-secret',
  ideas: 'ideas-hacks',
  'ideas & life hacks': 'ideas-hacks',
  dating: 'dating-romance',
  'dating & romance': 'dating-romance',
  launch: 'launch-trending',
  'launch & trending': 'launch-trending',
};

export function inferEmblemFromCategory(category?: string, emojiFallback?: string): string {
  if (category) {
    const clean = category.toLowerCase().trim();
    if (CATEGORY_TO_EMBLEM_ID[clean]) {
      return CATEGORY_TO_EMBLEM_ID[clean];
    }
    for (const [key, val] of Object.entries(CATEGORY_TO_EMBLEM_ID)) {
      if (clean.includes(key)) return val;
    }
  }
  if (emojiFallback) {
    if (emojiFallback.includes('🤫')) return 'mask-secret';
    if (emojiFallback.includes('💘') || emojiFallback.includes('💖')) return 'dating-romance';
    if (emojiFallback.includes('📚')) return 'study-exam';
    if (emojiFallback.includes('🍕')) return 'hostel-dorm';
    if (emojiFallback.includes('☕')) return 'coffee-chill';
    if (emojiFallback.includes('🎮')) return 'gaming';
    if (emojiFallback.includes('🎧')) return 'music-podcasts';
    if (emojiFallback.includes('🌙')) return 'midnight-chat';
    if (emojiFallback.includes('🔥')) return 'flame-blaze';
    if (emojiFallback.includes('🚀')) return 'launch-trending';
    if (emojiFallback.includes('🎭')) return 'mask-secret';
  }
  return 'campus-life';
}

export function deriveMonogramFromName(name?: string): string {
  if (!name || !name.trim()) return 'RM';
  const words = name
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return 'RM';
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return (words[0][0] + words[1][0]).toUpperCase();
}

export function getRoomAccentHex(iconBg?: string): string {
  if (!iconBg) return '#5420F5';
  const trimmed = iconBg.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) {
    return trimmed === '#FFFFFF' ? '#5420F5' : trimmed;
  }
  if (trimmed.startsWith('badge:v1|')) {
    const parts = trimmed.split('|');
    const primaryHex = parts[5];
    if (primaryHex && /^#[0-9a-fA-F]{6}$/.test(primaryHex)) {
      return primaryHex === '#FFFFFF' ? '#5420F5' : primaryHex;
    }
    const fillType = parts[1];
    const fillValue = parts[2];
    if (fillType === 'solid' && /^#[0-9a-fA-F]{6}$/.test(fillValue)) {
      return fillValue === '#FFFFFF' ? '#5420F5' : fillValue;
    }
    const preset = ROOM_GRADIENT_PRESETS.find((g) => g.id === fillValue);
    if (preset) return preset.primaryHex;
  }
  return '#5420F5';
}

export function serializeRoomIcon(config: RoomIconConfig): {
  iconEmoji: string;
  iconBg: string;
} {
  let iconEmoji = 'svg:campus-life';
  if (config.mode === 'svg') {
    iconEmoji = `svg:${config.value || 'campus-life'}`;
  } else if (config.mode === 'monogram') {
    const cleanMono = (config.value || 'RM').trim().toUpperCase().slice(0, 3);
    iconEmoji = `mono:${cleanMono || 'RM'}`;
  } else {
    iconEmoji = `emoji:${config.value || '🎭'}`;
  }

  let primaryHex = '#5420F5';
  if (config.fillType === 'solid') {
    primaryHex = /^#[0-9a-fA-F]{6}$/.test(config.fillValue) ? config.fillValue : '#5420F5';
  } else {
    const preset = ROOM_GRADIENT_PRESETS.find((g) => g.id === config.fillValue);
    primaryHex = preset ? preset.primaryHex : '#5420F5';
  }

  const iconBg = `badge:v1|${config.fillType}|${config.fillValue}|${config.shape}|${config.glow}|${primaryHex}`;
  return { iconEmoji, iconBg };
}

export function parseRoomIcon(
  iconEmoji?: string,
  iconBg?: string,
  fallbackCategory?: string,
  fallbackRoomName?: string
): RoomIconConfig {
  let mode: RoomIconMode = 'svg';
  let value = inferEmblemFromCategory(fallbackCategory, iconEmoji);

  const rawIcon = (iconEmoji || '').trim();
  if (rawIcon.startsWith('svg:')) {
    mode = 'svg';
    value = rawIcon.slice(4) || 'campus-life';
  } else if (rawIcon.startsWith('mono:')) {
    mode = 'monogram';
    value = rawIcon.slice(5).toUpperCase().slice(0, 3) || deriveMonogramFromName(fallbackRoomName);
  } else if (rawIcon.startsWith('emoji:')) {
    mode = 'emoji';
    value = rawIcon.slice(6) || '🎭';
  } else if (rawIcon) {
    mode = 'svg';
    value = inferEmblemFromCategory(fallbackCategory, rawIcon);
  }

  let fillType: 'gradient' | 'solid' = 'gradient';
  let fillValue = 'frost-crystal';
  let shape: RoomBadgeShape = 'squircle';
  let glow: RoomBadgeGlow = 'soft';

  const rawBg = (iconBg || '').trim();
  if (rawBg.startsWith('badge:v1|')) {
    const parts = rawBg.split('|');
    if (parts[1] === 'solid' || parts[1] === 'gradient') {
      fillType = parts[1];
    }
    if (parts[2]) {
      fillValue = parts[2];
    }
    if (
      parts[3] === 'squircle' ||
      parts[3] === 'hexagon' ||
      parts[3] === 'shield' ||
      parts[3] === 'circle' ||
      parts[3] === 'diamond'
    ) {
      shape = parts[3];
    }
    if (
      parts[4] === 'none' ||
      parts[4] === 'soft' ||
      parts[4] === 'neon' ||
      parts[4] === 'crest'
    ) {
      glow = parts[4];
    }
  } else if (/^#[0-9a-fA-F]{6}$/.test(rawBg)) {
    fillType = 'solid';
    fillValue = rawBg;
    shape = 'squircle';
    glow = 'soft';
  }

  return {
    mode,
    value,
    fillType,
    fillValue,
    shape,
    glow,
  };
}

export function generateRandomRoomIcon(roomName?: string, category?: string): RoomIconConfig {
  const modes: RoomIconMode[] = ['svg', 'svg', 'svg', 'monogram', 'emoji'];
  const pickedMode = modes[Math.floor(Math.random() * modes.length)];

  const shapes: RoomBadgeShape[] = ['squircle', 'hexagon', 'shield', 'circle', 'diamond'];
  const pickedShape = shapes[Math.floor(Math.random() * shapes.length)];

  const glows: RoomBadgeGlow[] = ['soft', 'neon', 'crest'];
  const pickedGlow = glows[Math.floor(Math.random() * glows.length)];

  const gradient =
    ROOM_GRADIENT_PRESETS[Math.floor(Math.random() * (ROOM_GRADIENT_PRESETS.length - 1))];

  if (pickedMode === 'monogram') {
    return {
      mode: 'monogram',
      value: deriveMonogramFromName(roomName || category || 'VIP'),
      fillType: 'gradient',
      fillValue: gradient.id,
      shape: pickedShape,
      glow: pickedGlow,
    };
  }

  if (pickedMode === 'emoji') {
    const allEmojis = ROOM_EMOJI_LIBRARY.flatMap((c) => c.emojis);
    const randomEmoji = allEmojis[Math.floor(Math.random() * allEmojis.length)] || '🔥';
    return {
      mode: 'emoji',
      value: randomEmoji,
      fillType: 'gradient',
      fillValue: gradient.id,
      shape: pickedShape,
      glow: pickedGlow,
    };
  }

  const randomEmblem =
    ROOM_SVG_EMBLEMS[Math.floor(Math.random() * ROOM_SVG_EMBLEMS.length)] || ROOM_SVG_EMBLEMS[0];
  return {
    mode: 'svg',
    value: randomEmblem.id,
    fillType: 'gradient',
    fillValue: randomEmblem.recommendedGradient || gradient.id,
    shape: pickedShape,
    glow: pickedGlow,
  };
}
