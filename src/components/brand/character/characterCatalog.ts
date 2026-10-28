import { getCharacterFromBackendStore } from '../../../utils/realtimeManager.ts';

export interface CharacterConfig {
  auraId: string;
  skinId: string;
  hairId: string;
  hairColorId: string;
  eyesId: string;
  eyewearId: string;
  outfitId: string;
  moodId?: string;
}

export interface CharacterMoodOption {
  id: string;
  name: string;
  label: string;
  emoji: string;
  tagline: string;
  eyesId: string;
}

export interface CharacterPresetOption {
  id: string;
  name: string;
  label: string;
  badge: string;
  config: CharacterConfig;
}

export interface AuraOption {
  id: string;
  name: string;
  stops: [string, string, string];
  glowColor: string;
}

export interface SkinOption {
  id: string;
  name: string;
  highlight: string;
  base: string;
  shadow: string;
  deepShadow: string;
  blush: string;
}

export interface HairOption {
  id: string;
  name: string;
  category: 'hair' | 'headgear';
}

export interface HairColorOption {
  id: string;
  name: string;
  highlight: string;
  base: string;
  shadow: string;
}

export interface EyesExpressionOption {
  id: string;
  name: string;
}

export interface EyewearOption {
  id: string;
  name: string;
}

export interface OutfitOption {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  style: 'hoodie' | 'varsity' | 'crewneck' | 'techwear';
}

export const AURA_OPTIONS: AuraOption[] = [
  {
    id: 'royal-violet',
    name: 'Royal Violet',
    stops: ['#7B4DFF', '#5420F5', '#2A0896'],
    glowColor: '#A480FF',
  },
  {
    id: 'sunset-amber',
    name: 'Sunset Amber',
    stops: ['#FFB347', '#FF7733', '#C82864'],
    glowColor: '#FFD27D',
  },
  {
    id: 'cyber-mint',
    name: 'Cyber Mint',
    stops: ['#2AF598', '#08AEEA', '#1B4F9C'],
    glowColor: '#72FFCA',
  },
  {
    id: 'rose-berry',
    name: 'Rose Berry',
    stops: ['#FF6B9D', '#E82574', '#6E0D53'],
    glowColor: '#FFA3C4',
  },
  {
    id: 'electric-indigo',
    name: 'Electric Blue',
    stops: ['#4FACFE', '#2B59FF', '#141E78'],
    glowColor: '#8FD3FE',
  },
  {
    id: 'emerald-campus',
    name: 'Emerald Glow',
    stops: ['#38EF7D', '#11998E', '#084B44'],
    glowColor: '#88F9B3',
  },
  {
    id: 'lavender-dream',
    name: 'Lavender Haze',
    stops: ['#E0C3FC', '#8EC5FC', '#5B42F3'],
    glowColor: '#F2E2FF',
  },
  {
    id: 'midnight-neon',
    name: 'Midnight Slate',
    stops: ['#3B4371', '#24243E', '#0F0C29'],
    glowColor: '#8B5CF6',
  },
  {
    id: 'coral-peach',
    name: 'Coral Breeze',
    stops: ['#FF9A8B', '#FF6A88', '#D13B6B'],
    glowColor: '#FFC4BA',
  },
  {
    id: 'gold-spark',
    name: 'Golden Hour',
    stops: ['#FDEB71', '#F8D800', '#D97706'],
    glowColor: '#FFF5A5',
  },
];

export const SKIN_OPTIONS: SkinOption[] = [
  {
    id: 'espresso',
    name: 'Rich Espresso',
    highlight: '#704432',
    base: '#543022',
    shadow: '#3B1E14',
    deepShadow: '#26110A',
    blush: '#8F3B3B',
  },
  {
    id: 'mahogany',
    name: 'Warm Mahogany',
    highlight: '#8D583E',
    base: '#6E412B',
    shadow: '#4F2B1B',
    deepShadow: '#361A0E',
    blush: '#A8443E',
  },
  {
    id: 'amber',
    name: 'Deep Amber',
    highlight: '#AA6E4B',
    base: '#8B5334',
    shadow: '#683A21',
    deepShadow: '#492513',
    blush: '#C25248',
  },
  {
    id: 'bronze',
    name: 'Golden Bronze',
    highlight: '#C6885E',
    base: '#A56A43',
    shadow: '#804E2E',
    deepShadow: '#5C341C',
    blush: '#D46255',
  },
  {
    id: 'caramel',
    name: 'Caramel Glow',
    highlight: '#DDA072',
    base: '#BF8154',
    shadow: '#99623B',
    deepShadow: '#704324',
    blush: '#E06E62',
  },
  {
    id: 'honey',
    name: 'Honey Tan',
    highlight: '#EBB990',
    base: '#D1996E',
    shadow: '#AD7750',
    deepShadow: '#825434',
    blush: '#E87B72',
  },
  {
    id: 'sand',
    name: 'Soft Sand',
    highlight: '#F6CFB0',
    base: '#E2B18C',
    shadow: '#BE8B67',
    deepShadow: '#946546',
    blush: '#F08A84',
  },
  {
    id: 'ivory',
    name: 'Warm Ivory',
    highlight: '#FFE4CE',
    base: '#F1C9AC',
    shadow: '#CCA082',
    deepShadow: '#A3775B',
    blush: '#F49795',
  },
];

export const HAIR_OPTIONS: HairOption[] = [
  { id: 'taper-fade', name: 'Taper Fade & Waves', category: 'hair' },
  { id: 'high-locs', name: 'High-Top Locs', category: 'hair' },
  { id: 'afro-puffs', name: 'Double Afro Puffs', category: 'hair' },
  { id: 'braids-twists', name: 'Box Braids & Beads', category: 'hair' },
  { id: 'curly-fro', name: 'Sculpted Curly Fro', category: 'hair' },
  { id: 'sleek-bob', name: 'Side-Part Silk Bob', category: 'hair' },
  { id: 'varsity-cap', name: 'Varsity Snapback', category: 'headgear' },
  { id: 'studio-headphones', name: 'Fade + Headphones', category: 'headgear' },
  { id: 'street-beanie', name: 'Ribbed Knit Beanie', category: 'headgear' },
  { id: 'royal-crown', name: 'Campus Royalty Crown', category: 'headgear' },
  { id: 'bucket-hat', name: 'Festival Bucket Hat', category: 'headgear' },
  { id: 'cyber-hood', name: 'Streetwear Hoodie Up', category: 'headgear' },
];

export const HAIR_COLOR_OPTIONS: HairColorOption[] = [
  {
    id: 'jet-black',
    name: 'Jet Black',
    highlight: '#3E3A4B',
    base: '#1D1A26',
    shadow: '#0D0B12',
  },
  {
    id: 'espresso-brown',
    name: 'Dark Espresso',
    highlight: '#5A3D31',
    base: '#332018',
    shadow: '#1B100B',
  },
  {
    id: 'royal-purple',
    name: 'Royal Violet',
    highlight: '#8E62FF',
    base: '#5420F5',
    shadow: '#2D0B9E',
  },
  {
    id: 'crimson-flame',
    name: 'Crimson Copper',
    highlight: '#FF6B6B',
    base: '#C81E45',
    shadow: '#7C0D26',
  },
  {
    id: 'golden-blonde',
    name: 'Honey Gold',
    highlight: '#FFE082',
    base: '#E69F17',
    shadow: '#9E6306',
  },
  {
    id: 'cyber-cyan',
    name: 'Electric Teal',
    highlight: '#64FFDA',
    base: '#00B4D8',
    shadow: '#006480',
  },
  {
    id: 'platinum-ice',
    name: 'Platinum Silver',
    highlight: '#FFFFFF',
    base: '#CBD5E1',
    shadow: '#64748B',
  },
  {
    id: 'emerald-vibe',
    name: 'Emerald Mint',
    highlight: '#6EE7B7',
    base: '#10B981',
    shadow: '#065F46',
  },
];

export const EYES_EXPRESSION_OPTIONS: EyesExpressionOption[] = [
  { id: 'confident-smile', name: 'Confident Smile' },
  { id: 'chill-grin', name: 'Chill Grin' },
  { id: 'winking-vibe', name: 'Playful Wink' },
  { id: 'starstruck', name: 'Starstruck Hype' },
  { id: 'cool-smirk', name: 'Unbothered Smirk' },
  { id: 'laughing-joy', name: 'Big Campus Laugh' },
  { id: 'focused-scholar', name: 'Focused Vibe' },
  { id: 'tongue-out', name: 'Cheeky Vibe' },
];

export const CHARACTER_MOODS: CharacterMoodOption[] = [
  {
    id: 'confident-smile',
    name: 'Confident',
    label: 'Confident',
    emoji: '😎',
    tagline: 'Main character energy',
    eyesId: 'confident-smile',
  },
  {
    id: 'chill-grin',
    name: 'Hyped',
    label: 'Hyped',
    emoji: '🔥',
    tagline: 'Pure campus excitement',
    eyesId: 'chill-grin',
  },
  {
    id: 'winking-vibe',
    name: 'Playful Wink',
    label: 'Playful Wink',
    emoji: '😉',
    tagline: 'Flirty & Mysterious',
    eyesId: 'winking-vibe',
  },
  {
    id: 'starstruck',
    name: 'Starstruck',
    label: 'Starstruck',
    emoji: '🤩',
    tagline: 'Mind blown on campus',
    eyesId: 'starstruck',
  },
  {
    id: 'cool-smirk',
    name: 'Unbothered',
    label: 'Unbothered',
    emoji: '😏',
    tagline: 'Too cool for 8am lectures',
    eyesId: 'cool-smirk',
  },
  {
    id: 'laughing-joy',
    name: 'Laughing',
    label: 'Laughing',
    emoji: '😂',
    tagline: 'Crying from campus gist',
    eyesId: 'laughing-joy',
  },
  {
    id: 'focused-scholar',
    name: 'Locked In',
    label: 'Locked In',
    emoji: '🤓',
    tagline: 'First-class scholar mode',
    eyesId: 'focused-scholar',
  },
  {
    id: 'tongue-out',
    name: 'Cheeky',
    label: 'Cheeky',
    emoji: '😛',
    tagline: 'Unfiltered & chaotic',
    eyesId: 'tongue-out',
  },
];

export const EYEWEAR_OPTIONS: EyewearOption[] = [
  { id: 'none', name: 'No Eyewear' },
  { id: 'wayfarer-shades', name: 'Dark Stunner Shades' },
  { id: 'cyber-visor', name: 'Neon Cyber Visor' },
  { id: 'scholar-frames', name: 'Clear Scholar Frames' },
  { id: 'gold-aviators', name: 'Gold Rim Aviators' },
  { id: 'clout-goggles', name: 'Retro Oval Clout' },
  { id: 'rose-tint', name: 'Sunset Tint Lenses' },
];

export const OUTFIT_OPTIONS: OutfitOption[] = [
  {
    id: 'purple-hoodie',
    name: 'Bopoi Royal Hoodie',
    primary: '#5420F5',
    secondary: '#3710B3',
    accent: '#FF922E',
    style: 'hoodie',
  },
  {
    id: 'varsity-jacket',
    name: 'Campus Varsity Jacket',
    primary: '#1E1B2E',
    secondary: '#F8FAFC',
    accent: '#FF922E',
    style: 'varsity',
  },
  {
    id: 'emerald-crew',
    name: 'Emerald Club Crew',
    primary: '#0D9488',
    secondary: '#115E59',
    accent: '#5EEAD4',
    style: 'crewneck',
  },
  {
    id: 'sunset-hoodie',
    name: 'Sunset Coral Hoodie',
    primary: '#F43F5E',
    secondary: '#BE123C',
    accent: '#FDE047',
    style: 'hoodie',
  },
  {
    id: 'stealth-tech',
    name: 'Stealth Cyber Collar',
    primary: '#18181B',
    secondary: '#09090B',
    accent: '#38BDF8',
    style: 'techwear',
  },
  {
    id: 'gold-varsity',
    name: 'Golden Champ Varsity',
    primary: '#D97706',
    secondary: '#FEF3C7',
    accent: '#5420F5',
    style: 'varsity',
  },
  {
    id: 'cobalt-hoodie',
    name: 'Electric Cobalt Hoodie',
    primary: '#2563EB',
    secondary: '#1E40AF',
    accent: '#67E8F9',
    style: 'hoodie',
  },
  {
    id: 'lavender-crew',
    name: 'Soft Lilac Crewneck',
    primary: '#9333EA',
    secondary: '#6B21A8',
    accent: '#F472B6',
    style: 'crewneck',
  },
];

export const DEFAULT_CHARACTER_CONFIG: CharacterConfig = {
  auraId: 'royal-violet',
  skinId: 'amber',
  hairId: 'afro-puffs',
  hairColorId: 'jet-black',
  eyesId: 'confident-smile',
  eyewearId: 'scholar-frames',
  outfitId: 'purple-hoodie',
  moodId: 'confident-smile',
};

export const CHARACTER_PRESETS: CharacterPresetOption[] = [
  {
    id: 'unilag-scholar',
    name: 'Campus Scholar',
    label: 'Scholar',
    badge: 'Popular',
    config: {
      auraId: 'royal-violet',
      skinId: 'amber',
      hairId: 'afro-puffs',
      hairColorId: 'jet-black',
      eyesId: 'confident-smile',
      eyewearId: 'scholar-frames',
      outfitId: 'purple-hoodie',
      moodId: 'confident-smile',
    },
  },
  {
    id: 'tech-bro',
    name: 'Tech Founder',
    label: 'Tech Bro',
    badge: 'Dev Vibe',
    config: {
      auraId: 'cyber-mint',
      skinId: 'mahogany',
      hairId: 'studio-headphones',
      hairColorId: 'jet-black',
      eyesId: 'cool-smirk',
      eyewearId: 'cyber-visor',
      outfitId: 'stealth-tech',
      moodId: 'cool-smirk',
    },
  },
  {
    id: 'afro-queen',
    name: 'Braids & Gold',
    label: 'Braids',
    badge: 'Iconic',
    config: {
      auraId: 'sunset-amber',
      skinId: 'bronze',
      hairId: 'braids-twists',
      hairColorId: 'espresso-brown',
      eyesId: 'winking-vibe',
      eyewearId: 'gold-aviators',
      outfitId: 'sunset-hoodie',
      moodId: 'winking-vibe',
    },
  },
  {
    id: 'campus-royalty',
    name: 'Campus Royalty',
    label: 'Royalty',
    badge: 'VIP',
    config: {
      auraId: 'gold-spark',
      skinId: 'espresso',
      hairId: 'royal-crown',
      hairColorId: 'jet-black',
      eyesId: 'starstruck',
      eyewearId: 'wayfarer-shades',
      outfitId: 'gold-varsity',
      moodId: 'starstruck',
    },
  },
  {
    id: 'streetwear-drip',
    name: 'Varsity Drip',
    label: 'Varsity',
    badge: 'Fresh',
    config: {
      auraId: 'electric-indigo',
      skinId: 'caramel',
      hairId: 'high-locs',
      hairColorId: 'crimson-flame',
      eyesId: 'chill-grin',
      eyewearId: 'clout-goggles',
      outfitId: 'varsity-jacket',
      moodId: 'chill-grin',
    },
  },
  {
    id: 'alte-creative',
    name: 'Alté Creative',
    label: 'Alté',
    badge: 'Artsy',
    config: {
      auraId: 'rose-berry',
      skinId: 'honey',
      hairId: 'bucket-hat',
      hairColorId: 'royal-purple',
      eyesId: 'tongue-out',
      eyewearId: 'rose-tint',
      outfitId: 'lavender-crew',
      moodId: 'tongue-out',
    },
  },
];

function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h >>> 0);
}

export function serializeCharacterConfig(config: CharacterConfig): string {
  const effectiveEyes = config.moodId || config.eyesId || DEFAULT_CHARACTER_CONFIG.eyesId;
  const params = new URLSearchParams({
    aura: config.auraId,
    skin: config.skinId,
    hair: config.hairId,
    hc: config.hairColorId,
    eyes: effectiveEyes,
    ew: config.eyewearId,
    fit: config.outfitId,
    mood: config.moodId || effectiveEyes,
  });
  return `bopoi-char://v1?${params.toString()}`;
}

export function applyMoodToAvatarUrl(
  avatarUrl?: string | null,
  moodId?: string | null,
  fallbackSeed?: string
): string {
  const parsed = parseCharacterConfig(avatarUrl, fallbackSeed);
  const validMood = CHARACTER_MOODS.find((m) => m.id === moodId);
  const nextEyes = validMood ? validMood.eyesId : parsed.eyesId;
  return serializeCharacterConfig({
    ...parsed,
    eyesId: nextEyes,
    moodId: validMood ? validMood.id : parsed.moodId || nextEyes,
  });
}

export function generateDeterministicCharacter(seed: string): CharacterConfig {
  const cleanSeed = String(seed || 'bopoi_student').trim().toLowerCase();
  const h1 = hashSeed(cleanSeed);
  const h2 = hashSeed(cleanSeed + '_layer2');
  const h3 = hashSeed(cleanSeed + '_layer3');

  const eyewearRoll = h3 % 11;
  const eyewearId =
    eyewearRoll < 5
      ? 'none'
      : EYEWEAR_OPTIONS[1 + (eyewearRoll % (EYEWEAR_OPTIONS.length - 1))].id;

  const hairColorRoll = h2 % 10;
  const hairColorId =
    hairColorRoll < 4
      ? HAIR_COLOR_OPTIONS[0].id
      : hairColorRoll < 6
      ? HAIR_COLOR_OPTIONS[1].id
      : HAIR_COLOR_OPTIONS[hairColorRoll % HAIR_COLOR_OPTIONS.length].id;

  const eyesId = EYES_EXPRESSION_OPTIONS[(h1 >>> 5) % EYES_EXPRESSION_OPTIONS.length].id;

  return {
    auraId: AURA_OPTIONS[h1 % AURA_OPTIONS.length].id,
    skinId: SKIN_OPTIONS[(h1 >>> 3) % SKIN_OPTIONS.length].id,
    hairId: HAIR_OPTIONS[(h2 >>> 2) % HAIR_OPTIONS.length].id,
    hairColorId,
    eyesId,
    eyewearId,
    outfitId: OUTFIT_OPTIONS[(h3 >>> 3) % OUTFIT_OPTIONS.length].id,
    moodId: eyesId,
  };
}

export function parseCharacterConfig(
  value?: string | null,
  fallbackSeed?: string
): CharacterConfig {
  // Check if value is a direct bopoi-char:// URI
  let resolvedValue = value;
  if (
    (!resolvedValue || !resolvedValue.startsWith('bopoi-char://')) &&
    fallbackSeed
  ) {
    const synced = getCharacterFromBackendStore(fallbackSeed);
    if (synced && synced.avatarUrl?.startsWith('bopoi-char://')) {
      resolvedValue = synced.avatarUrl;
    }
  }

  if (typeof resolvedValue === 'string' && resolvedValue.startsWith('bopoi-char://')) {
    try {
      const queryPart = resolvedValue.split('?')[1] || '';
      const params = new URLSearchParams(queryPart);
      const auraId = params.get('aura') || DEFAULT_CHARACTER_CONFIG.auraId;
      const skinId = params.get('skin') || DEFAULT_CHARACTER_CONFIG.skinId;
      const hairId = params.get('hair') || DEFAULT_CHARACTER_CONFIG.hairId;
      const hairColorId = params.get('hc') || DEFAULT_CHARACTER_CONFIG.hairColorId;
      const moodParam = params.get('mood');
      const eyesId = moodParam || params.get('eyes') || DEFAULT_CHARACTER_CONFIG.eyesId;
      const eyewearId = params.get('ew') || DEFAULT_CHARACTER_CONFIG.eyewearId;
      const outfitId = params.get('fit') || DEFAULT_CHARACTER_CONFIG.outfitId;

      const validEyes = EYES_EXPRESSION_OPTIONS.some((e) => e.id === eyesId)
        ? eyesId
        : DEFAULT_CHARACTER_CONFIG.eyesId;

      return {
        auraId: AURA_OPTIONS.some((a) => a.id === auraId) ? auraId : DEFAULT_CHARACTER_CONFIG.auraId,
        skinId: SKIN_OPTIONS.some((s) => s.id === skinId) ? skinId : DEFAULT_CHARACTER_CONFIG.skinId,
        hairId: HAIR_OPTIONS.some((h) => h.id === hairId) ? hairId : DEFAULT_CHARACTER_CONFIG.hairId,
        hairColorId: HAIR_COLOR_OPTIONS.some((c) => c.id === hairColorId)
          ? hairColorId
          : DEFAULT_CHARACTER_CONFIG.hairColorId,
        eyesId: validEyes,
        eyewearId: EYEWEAR_OPTIONS.some((w) => w.id === eyewearId)
          ? eyewearId
          : DEFAULT_CHARACTER_CONFIG.eyewearId,
        outfitId: OUTFIT_OPTIONS.some((o) => o.id === outfitId)
          ? outfitId
          : DEFAULT_CHARACTER_CONFIG.outfitId,
        moodId: validEyes,
      };
    } catch {
      // Fallback to deterministic seed
    }
  }

  return generateDeterministicCharacter(fallbackSeed || value || 'bopoi_student');
}

export function randomizeCharacterConfig(): CharacterConfig {
  const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
  const eyesId = pick(EYES_EXPRESSION_OPTIONS).id;
  return {
    auraId: pick(AURA_OPTIONS).id,
    skinId: pick(SKIN_OPTIONS).id,
    hairId: pick(HAIR_OPTIONS).id,
    hairColorId: pick(HAIR_COLOR_OPTIONS).id,
    eyesId,
    eyewearId: Math.random() < 0.3 ? 'none' : pick(EYEWEAR_OPTIONS.slice(1)).id,
    outfitId: pick(OUTFIT_OPTIONS).id,
    moodId: eyesId,
  };
}
