import { CommunityRoom, SocialPost, SocialPostType } from '../types/index.ts';

export interface TrendingHashtagItem {
  tag: string; // Always normalized with leading '#' e.g. '#CampusLife'
  bare: string; // Without '#' e.g. 'CampusLife'
  count: number;
  score: number;
}

const VALID_TAG_BODY = /^[a-zA-Z0-9_]{2,28}$/;

/**
 * Normalizes any raw tag input into canonical '#Tag' format, or returns '' if invalid.
 * Keeps PascalCase/camelCase casing for readability (e.g. '#ExamWeek').
 */
export function normalizeHashtag(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';
  const cleaned = raw
    .trim()
    .replace(/^#+/, '')
    .replace(/[^a-zA-Z0-9_]/g, '')
    .slice(0, 28);
  if (!VALID_TAG_BODY.test(cleaned)) return '';
  // Require at least one letter so pure numeric tokens like '#1' or '#2026' don't clutter
  if (!/[a-zA-Z]/.test(cleaned)) return '';
  return `#${cleaned}`;
}

/**
 * Strips leading '#' from a tag string.
 */
export function stripHashtagPrefix(raw: string): string {
  return raw.trim().replace(/^#+/, '');
}

/**
 * Parses a comma-, space-, or hash-delimited string (or array) into deduplicated '#Tag' items.
 */
export function parseHashtagList(input: string | string[], maxTags = 6): string[] {
  const rawTokens = Array.isArray(input)
    ? input
    : input.split(/[\s,;]+/);

  const seen = new Set<string>();
  const result: string[] = [];

  for (const token of rawTokens) {
    // Handle chained tags without spaces like '#Exams#NightClass'
    const subTokens = token.includes('#')
      ? token.split('#').filter(Boolean)
      : [token];

    for (const sub of subTokens) {
      const normalized = normalizeHashtag(sub);
      if (!normalized) continue;
      const lower = normalized.toLowerCase();
      if (seen.has(lower)) continue;
      seen.add(lower);
      result.push(normalized);
      if (result.length >= maxTags) return result;
    }
  }

  return result;
}

/**
 * Extracts inline '#hashtags' written naturally inside post titles, bodies, or room messages.
 */
export function extractHashtagsFromText(text?: string | null, maxTags = 8): string[] {
  if (!text || typeof text !== 'string') return [];
  const regex = /(?:^|[\s([{"'])#([a-zA-Z][a-zA-Z0-9_]{1,27})\b/g;
  const seen = new Set<string>();
  const result: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const normalized = normalizeHashtag(match[1]);
    if (!normalized) continue;
    const lower = normalized.toLowerCase();
    if (seen.has(lower)) continue;
    seen.add(lower);
    result.push(normalized);
    if (result.length >= maxTags) break;
  }

  return result;
}

/**
 * Merges explicitly picked hashtags with inline hashtags found in post title/content.
 */
export function mergePostHashtags(
  explicitTags: string[],
  ...texts: Array<string | undefined | null>
): string[] {
  const combined: string[] = [];
  const seen = new Set<string>();

  const pushTag = (raw: string) => {
    const normalized = normalizeHashtag(raw);
    if (!normalized) return;
    const lower = normalized.toLowerCase();
    if (seen.has(lower)) return;
    seen.add(lower);
    combined.push(normalized);
  };

  explicitTags.forEach(pushTag);
  texts.forEach((t) => {
    extractHashtagsFromText(t).forEach(pushTag);
  });

  return combined.slice(0, 8);
}

/**
 * Checks whether a SocialPost matches a given hashtag (either in `post.hashtags`
 * or mentioned inline in its title/content).
 */
export function postMatchesHashtag(post: SocialPost, targetTag: string): boolean {
  const targetNorm = normalizeHashtag(targetTag).toLowerCase();
  if (!targetNorm) return false;
  const targetBare = targetNorm.slice(1);

  const explicitMatch = (post.hashtags || []).some((h) => {
    const norm = normalizeHashtag(h).toLowerCase();
    return norm === targetNorm || stripHashtagPrefix(h).toLowerCase() === targetBare;
  });
  if (explicitMatch) return true;

  const inlineTags = extractHashtagsFromText(`${post.title || ''} ${post.content || ''}`, 12);
  return inlineTags.some((t) => t.toLowerCase() === targetNorm);
}

/**
 * Checks whether a CommunityRoom matches a given hashtag.
 */
export function roomMatchesHashtag(room: CommunityRoom, targetTag: string): boolean {
  const targetNorm = normalizeHashtag(targetTag).toLowerCase();
  if (!targetNorm) return false;
  const targetBare = targetNorm.slice(1);

  const tagMatch = (room.tags || []).some((t) => {
    const norm = normalizeHashtag(t).toLowerCase();
    return norm === targetNorm || stripHashtagPrefix(t).toLowerCase() === targetBare;
  });
  if (tagMatch) return true;

  const catSlug = (room.category || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  if (catSlug && catSlug === targetBare) return true;

  const inlineTags = extractHashtagsFromText(`${room.name || ''} ${room.description || ''}`, 8);
  return inlineTags.some((t) => t.toLowerCase() === targetNorm);
}

const CATEGORY_HASHTAG_PRESETS: Record<string, string[]> = {
  'campus life': [
    '#CampusLife',
    '#HostelGist',
    '#NightClass',
    '#ExamWeek',
    '#FinalYear',
    '#Freshers',
    '#Cafeteria',
    '#CampusGist',
  ],
  love: [
    '#CampusCrush',
    '#AnonymousConfession',
    '#Situationship',
    '#TalkingStage',
    '#SecretAdmirer',
    '#RelationshipAdvice',
  ],
  relationships: [
    '#Relationships',
    '#TalkingStage',
    '#Situationship',
    '#GreenFlag',
    '#RedFlag',
    '#CampusCrush',
    '#Heartbreak',
  ],
  school: [
    '#ExamWeek',
    '#CGPA',
    '#Assignment',
    '#LibraryVibes',
    '#NightClass',
    '#CourseRep',
    '#Carryover',
  ],
  'tech & gadgets': [
    '#CampusTech',
    '#StudentDev',
    '#AI',
    '#Coding',
    '#LaptopSetup',
    '#Hackathon',
    '#Gadgets',
  ],
  'tech & coding': [
    '#CampusTech',
    '#StudentDev',
    '#Coding',
    '#AI',
    '#Hackathon',
    '#WebDev',
  ],
  music: [
    '#Afrobeats',
    '#Amapiano',
    '#CampusPlaylist',
    '#NewMusic',
    '#Freestyle',
    '#Podcast',
  ],
  money: [
    '#SideHustle',
    '#StudentFinance',
    '#Sapa',
    '#CampusBusiness',
    '#RemoteWork',
    '#Savings',
  ],
  fashion: [
    '#FitCheck',
    '#CampusDrip',
    '#ThriftFinds',
    '#Streetwear',
    '#Ankara',
    '#OOTD',
  ],
  'study & exam survival': [
    '#ExamWeek',
    '#NightClass',
    '#CGPA',
    '#StudyGroup',
    '#LibraryVibes',
  ],
  'hostel & dorm (food)': [
    '#HostelGist',
    '#HostelFood',
    '#Roommate',
    '#Indomie',
    '#Cafeteria',
  ],
};

/**
 * Returns tailored, easy-to-tap Nigerian campus hashtag suggestions based on category & post type.
 */
export function getCategorySuggestedHashtags(
  category: string,
  postType?: SocialPostType
): string[] {
  const catLower = (category || '').trim().toLowerCase();
  const base =
    CATEGORY_HASHTAG_PRESETS[catLower] ||
    Object.entries(CATEGORY_HASHTAG_PRESETS).find(([k]) =>
      catLower.includes(k) || k.includes(catLower)
    )?.[1] ||
    CATEGORY_HASHTAG_PRESETS['campus life'];

  const typeTags: string[] =
    postType === 'confession'
      ? ['#Confession', '#Anonymous']
      : postType === 'poll'
      ? ['#CampusPoll', '#VoteNow']
      : postType === 'discussion'
      ? ['#CampusDebate', '#UnpopularOpinion']
      : [];

  return parseHashtagList([...typeTags, ...base], 10);
}

/**
 * Aggregates live velocity-ranked trending hashtags across posts, inline text tags, and rooms.
 */
export function computeTrendingHashtags(
  posts: SocialPost[],
  rooms: CommunityRoom[],
  limit = 12
): TrendingHashtagItem[] {
  const now = Date.now();
  const map = new Map<string, { tag: string; count: number; score: number }>();

  const record = (raw: string, weight: number) => {
    const normalized = normalizeHashtag(raw);
    if (!normalized) return;
    // Skip generic internal room marker tag
    if (normalized.toLowerCase() === '#anonymousroom') return;
    const key = normalized.toLowerCase();
    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
      existing.score += weight;
    } else {
      map.set(key, { tag: normalized, count: 1, score: weight });
    }
  };

  for (const post of posts) {
    const ageHours = Math.max(
      0.5,
      (now - (post.createdTimestamp || now)) / (1000 * 60 * 60)
    );
    const engagement =
      1 +
      (post.likes || 0) * 0.4 +
      (post.commentsCount || 0) * 0.8 +
      (post.sharesCount || 0) * 1.1;
    const velocity = engagement / Math.pow(ageHours + 2, 0.75);

    const tagsForPost = mergePostHashtags(post.hashtags || [], post.title, post.content);
    for (const tag of tagsForPost) {
      record(tag, velocity + 1);
    }
  }

  for (const room of rooms) {
    const weight = (room.onlineCount || 1) * 0.35 + (room.membersCount || 0) * 0.05 + 0.5;
    for (const raw of room.tags || []) {
      record(raw, weight);
    }
  }

  return Array.from(map.values())
    .sort((a, b) => b.score - a.score || b.count - a.count)
    .slice(0, limit)
    .map((item) => ({
      tag: item.tag,
      bare: item.tag.slice(1),
      count: item.count,
      score: Number(item.score.toFixed(2)),
    }));
}
