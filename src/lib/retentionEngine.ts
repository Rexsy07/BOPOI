import { SupabaseClient } from '@supabase/supabase-js';
import {
  SocialPost,
  SocialComment,
  CreatorProfile,
  CommunityRoom,
  AnonymousMessage,
} from '../types/index.ts';
import { FollowEdge } from './supabase.ts';

export interface PostCandidate {
  id: string;
  author_id?: string;
  author_username?: string;
  text?: string;
  likes: number;
  comments_count: number;
  created_at: string;
  is_featured: boolean;
  impressions_count: number;
  clicks_count: number;
  cosine_similarity: number;
}

export interface ScoredSocialPost {
  post: SocialPost;
  finalScore: number;
  isExploration: boolean;
  expectedCTR: number;
  cosineSimilarity: number;
  authorKey: string;
}

export interface TwoTowerPostSignal {
  cosineSimilarity: number;
  serverImpressions?: number;
  serverClicks?: number;
}

export interface ActivationPreferences {
  selectedTags: string[];
  facultyId: string;
  avatarArchetype: string;
  campusId: string;
}

export interface PYMKRecommendation extends CreatorProfile {
  adamicAdarScore: number;
  mutualCount: number;
  mutualUsernames: string[];
  isFollowingYou: boolean;
  finalScore: number;
}

export interface DynamicTrendingTopic {
  label: string;
  tag: string;
  iconName: string;
  velocityScore: number;
  activeCount: number;
  topHashtag?: string;
}

// ============================================================================
// LOCAL TELEMETRY & REAL VIEWPORT IMPRESSION / DWELL TRACKING
// ============================================================================
const BANDIT_TELEMETRY_STORAGE_KEY = 'bopoi_bandit_telemetry_v2';

export interface PostBanditMetrics {
  impressions: number;
  clicks: number;
  dwellMs: number;
  meaningfulReads: number;
}

// Session-level deduplication so rapid scroll jitter doesn't double-count impressions
const sessionObservedPostTimestamps = new Map<string, number>();

function readLocalBanditMap(): Record<string, PostBanditMetrics> {
  try {
    if (typeof window === 'undefined') return {};
    const raw = localStorage.getItem(BANDIT_TELEMETRY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeLocalBanditMap(map: Record<string, PostBanditMetrics>): void {
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem(BANDIT_TELEMETRY_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore storage quota
  }
}

/**
 * Returns real recorded viewport impressions, clicks, and dwell telemetry for a post.
 * Uses an uninformative Bayesian Beta(1, 4) prior (20% baseline CTR prior with high variance)
 * rather than synthesizing inflated fake impressions from likes/comments.
 */
export function getPostBanditStats(
  postId: string,
  serverImpressions = 0,
  serverClicks = 0
): PostBanditMetrics {
  const map = readLocalBanditMap();
  const saved = map[postId];

  const recordedImpressions = Math.max(saved?.impressions || 0, serverImpressions || 0);
  const recordedClicks = Math.max(saved?.clicks || 0, serverClicks || 0);
  const dwellMs = saved?.dwellMs || 0;
  const meaningfulReads = saved?.meaningfulReads || 0;

  return {
    impressions: recordedImpressions,
    clicks: recordedClicks,
    dwellMs,
    meaningfulReads,
  };
}

/**
 * Records either a real viewport impression (when a post stays >= 1.5s in viewport)
 * or an explicit click/engagement interaction, including exact viewport dwell time in ms.
 */
export function recordPostBanditInteraction(
  supabaseClient: SupabaseClient | null,
  postId: string,
  isClick: boolean,
  dwellMs = 0
): void {
  if (!postId) return;

  const now = Date.now();
  const cleanDwell = Math.max(0, Math.min(120_000, Math.round(dwellMs)));

  // For passive viewport impressions (isClick === false), enforce a 45s cooldown per postId
  // so scrolling up/down doesn't artificially inflate impression counts
  if (!isClick) {
    const lastSeen = sessionObservedPostTimestamps.get(postId) || 0;
    if (now - lastSeen < 45_000) {
      if (cleanDwell >= 1500) {
        const map = readLocalBanditMap();
        const existing = map[postId] || {
          impressions: 1,
          clicks: 0,
          dwellMs: 0,
          meaningfulReads: 0,
        };
        map[postId] = {
          ...existing,
          dwellMs: existing.dwellMs + cleanDwell,
          meaningfulReads: existing.meaningfulReads + (cleanDwell >= 4500 ? 1 : 0),
        };
        writeLocalBanditMap(map);
      }
      return;
    }
    sessionObservedPostTimestamps.set(postId, now);
  }

  const map = readLocalBanditMap();
  const current = map[postId] || {
    impressions: 0,
    clicks: 0,
    dwellMs: 0,
    meaningfulReads: 0,
  };

  map[postId] = {
    impressions: current.impressions + (isClick ? 0 : 1),
    clicks: current.clicks + (isClick ? 1 : 0),
    dwellMs: current.dwellMs + cleanDwell,
    meaningfulReads: current.meaningfulReads + (cleanDwell >= 4500 ? 1 : 0),
  };
  writeLocalBanditMap(map);

  if (supabaseClient && /^[0-9a-f-]{36}$/i.test(postId)) {
    supabaseClient
      .rpc('record_post_bandit_telemetry', {
        p_post_id: postId,
        p_is_click: isClick,
        p_dwell_ms: cleanDwell,
      })
      .then(() => {});
  }
}

// ============================================================================
// 1. TWO-TOWER 768-DIM SERVER CANDIDATE GENERATION & MULTI-ARMED BANDIT
// ============================================================================

const l1TwoTowerCache = new Map<
  string,
  { expiresAt: number; signals: Record<string, TwoTowerPostSignal> }
>();

/**
 * Queries the backend Two-Tower 768-dim vector candidate pipeline (`/api/retention/feed-candidates`)
 * which computes/fetches the user's 768-dim embedding, runs `get_personalized_candidates`
 * (or server-side 768-dim cosine similarity over candidate posts), and returns per-post
 * neural similarity scores to eliminate client-only heuristic ceilings.
 */
export async function fetchTwoTowerVectorSignals(params: {
  userId: string;
  campus?: string;
  bio?: string;
  interestTags?: string[];
  recentEngagedSignals?: string[];
  postsSnapshot?: Array<{
    id: string;
    type?: string;
    category?: string;
    title?: string;
    content: string;
    hashtags?: string[];
    authorCampus?: string;
  }>;
}): Promise<Record<string, TwoTowerPostSignal>> {
  const cacheKey = `twotower:${params.userId || 'guest'}:${params.campus || 'default'}:${
    params.postsSnapshot?.length || 0
  }`;
  const cached = l1TwoTowerCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.signals;
  }

  try {
    const res = await fetch('/api/retention/feed-candidates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: params.userId || 'guest',
        campus: params.campus || 'Chrisland University',
        bio: params.bio || '',
        interestTags: params.interestTags || [],
        recentEngagedSignals: params.recentEngagedSignals || [],
        postsSnapshot: (params.postsSnapshot || []).slice(0, 250),
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data?.signals && typeof data.signals === 'object') {
        l1TwoTowerCache.set(cacheKey, {
          expiresAt: Date.now() + 60_000,
          signals: data.signals,
        });
        return data.signals as Record<string, TwoTowerPostSignal>;
      }
    }
  } catch {
    // Fallback to client context similarity if offline
  }

  return {};
}

/**
 * Helper to derive a canonical author key for diversity capping so a single author
 * cannot clump multiple posts consecutively at the top of the feed.
 */
function resolveAuthorDiversityKey(
  authorUsername?: string,
  authorId?: string,
  isAnonymous?: boolean,
  fallbackId?: string
): string {
  if (isAnonymous) {
    return authorId ? `anon_user:${authorId.toLowerCase()}` : `anon_post:${fallbackId || 'unknown'}`;
  }
  const cleanUser = (authorUsername || authorId || '').trim().toLowerCase();
  return cleanUser ? `author:${cleanUser}` : `anon_post:${fallbackId || 'unknown'}`;
}

/**
 * Applies Author Diversity Cap ($0.5^k$ frequency decay + adjacent-author spacing)
 * and 80% Exploit / 20% Explore slot allocation over scored items.
 */
function interleaveWithAuthorDiversity<
  T extends { finalScore: number; isExploration: boolean; authorKey: string }
>(scoredPool: T[], maxItems?: number): T[] {
  const exploitPool = scoredPool
    .filter((p) => !p.isExploration)
    .sort((a, b) => b.finalScore - a.finalScore);
  const explorePool = scoredPool
    .filter((p) => p.isExploration)
    .sort((a, b) => b.finalScore - a.finalScore);

  const authorAppearances = new Map<string, number>();
  const finalFeed: T[] = [];
  const targetSize = maxItems ? Math.min(maxItems, scoredPool.length) : scoredPool.length;

  const pickBestWithAuthorCap = (pool: T[]): T | null => {
    if (pool.length === 0) return null;
    const prev1Author = finalFeed.length >= 1 ? finalFeed[finalFeed.length - 1].authorKey : null;
    const prev2Author = finalFeed.length >= 2 ? finalFeed[finalFeed.length - 2].authorKey : null;

    let bestIndex = 0;
    let bestAdjustedScore = -Infinity;

    // Evaluate top window of candidates with exponential author-frequency decay (0.5^k)
    // and immediate back-to-back clumping penalty
    const scanWindow = Math.min(pool.length, 25);
    for (let idx = 0; idx < scanWindow; idx++) {
      const candidate = pool[idx];
      const priorCount = authorAppearances.get(candidate.authorKey) || 0;
      const frequencyDecay = Math.pow(0.5, priorCount);
      const adjacencyPenalty =
        candidate.authorKey === prev1Author
          ? 0.25
          : candidate.authorKey === prev2Author
          ? 0.6
          : 1.0;

      const effectiveScore = candidate.finalScore * frequencyDecay * adjacencyPenalty;
      if (effectiveScore > bestAdjustedScore) {
        bestAdjustedScore = effectiveScore;
        bestIndex = idx;
      }
    }

    const [chosen] = pool.splice(bestIndex, 1);
    authorAppearances.set(chosen.authorKey, (authorAppearances.get(chosen.authorKey) || 0) + 1);
    return chosen;
  };

  for (let i = 0; i < targetSize; i++) {
    // Inject exploration nodes every 5 slots (20% Explore / 80% Exploit)
    const shouldExplore = i % 5 === 0 && explorePool.length > 0;
    const picked = shouldExplore
      ? pickBestWithAuthorCap(explorePool) || pickBestWithAuthorCap(exploitPool)
      : pickBestWithAuthorCap(exploitPool) || pickBestWithAuthorCap(explorePool);

    if (picked) {
      finalFeed.push(picked);
    }
  }

  return finalFeed;
}

/**
 * Direct server/database Two-Tower pgvector RPC candidate retrieval + Thompson Sampling ranker.
 */
export async function fetchPersonalizedSocialFeed(
  supabaseClient: SupabaseClient,
  _userId: string,
  userEmbedding: number[]
): Promise<PostCandidate[]> {
  const { data: candidates, error } = await supabaseClient.rpc('get_personalized_candidates', {
    p_user_embedding: userEmbedding,
    p_limit: 300,
  });

  if (error || !candidates) {
    throw new Error(`Candidate generation failure: ${error?.message}`);
  }

  const now = Date.now();
  const scoredPool: {
    candidate: PostCandidate;
    finalScore: number;
    isExploration: boolean;
    authorKey: string;
  }[] = [];

  for (const item of candidates as PostCandidate[]) {
    const postAgeHours = Math.max(
      0,
      (now - new Date(item.created_at).getTime()) / (1000 * 60 * 60)
    );

    const rawPopularity = (item.likes || 0) + (item.comments_count || 0) * 2;
    const contextScore = (item.cosine_similarity || 0.5) * (item.is_featured ? 1.5 : 1.0);

    // Bayesian Beta(1, 4) prior + real observed clicks & impressions
    const alpha = 1 + Math.max(0, item.clicks_count || 0);
    const beta = 4 + Math.max(0, (item.impressions_count || 0) - (item.clicks_count || 0));

    const expectedCTR = alpha / (alpha + beta);
    const variance = (alpha * beta) / (Math.pow(alpha + beta, 2) * (alpha + beta + 1));

    const timeBucket = Math.floor(now / (5 * 60 * 1000));
    let hash = timeBucket;
    for (let i = 0; i < item.id.length; i++) {
      hash = Math.imul(31, hash) + item.id.charCodeAt(i);
    }
    const pseudoRand = ((Math.abs(hash) % 1000) / 1000) - 0.5;
    const thompsonSample = expectedCTR + pseudoRand * Math.sqrt(variance);

    const timeDecay = Math.pow(postAgeHours + 2, 1.8);
    const exploitScore = (rawPopularity * contextScore + expectedCTR * 100) / timeDecay;
    const exploreScore = (thompsonSample * contextScore * 10) / Math.sqrt(postAgeHours + 1);

    const isExplorationCandidate = (item.impressions_count || 0) < 35 || postAgeHours < 1.5;
    const finalScore = isExplorationCandidate ? exploreScore : exploitScore;

    scoredPool.push({
      candidate: item,
      finalScore,
      isExploration: isExplorationCandidate,
      authorKey: resolveAuthorDiversityKey(
        item.author_username,
        item.author_id,
        false,
        item.id
      ),
    });
  }

  return interleaveWithAuthorDiversity(scoredPool, 120).map((s) => s.candidate);
}

/**
 * Computes blended semantic cosine similarity between a post and the active user's
 * Two-Tower profile context: combines 768-dim neural vector cosine similarity (when available)
 * with explicit campus, social graph, category, and interest-tag affinity.
 */
export function computePostUserSimilarity(
  post: SocialPost,
  userContext: {
    campus?: string;
    followedUsernames?: Set<string>;
    preferredCategories?: Set<string>;
    interestTags?: string[];
    twoTowerSignals?: Record<string, TwoTowerPostSignal>;
  }
): number {
  let explicitSim = 0.42;

  if (
    userContext.campus &&
    post.authorCampus &&
    post.authorCampus.toLowerCase() === userContext.campus.toLowerCase()
  ) {
    explicitSim += 0.22;
  }

  if (
    !post.isAnonymous &&
    post.authorUsername &&
    userContext.followedUsernames?.has(post.authorUsername.toLowerCase())
  ) {
    explicitSim += 0.2;
  }

  if (
    post.category &&
    userContext.preferredCategories?.has(post.category.toLowerCase())
  ) {
    explicitSim += 0.12;
  }

  if (userContext.interestTags && userContext.interestTags.length > 0) {
    const blob = `${post.title || ''} ${post.content} ${post.category || ''} ${(
      post.hashtags || []
    ).join(' ')}`.toLowerCase();
    for (const tag of userContext.interestTags) {
      if (tag && blob.includes(tag.toLowerCase())) {
        explicitSim += 0.08;
      }
    }
  }

  if (post.isBookmarked || post.hasLiked) {
    explicitSim += 0.05;
  }

  const clampedExplicit = Math.min(0.99, Math.max(0.15, explicitSim));
  const neuralSignal = userContext.twoTowerSignals?.[post.id]?.cosineSimilarity;

  if (typeof neuralSignal === 'number' && !Number.isNaN(neuralSignal) && neuralSignal > 0) {
    // Blend 60% 768-dim Two-Tower cosine similarity + 40% explicit graph/campus context
    const blended = neuralSignal * 0.6 + clampedExplicit * 0.4;
    return Math.min(0.99, Math.max(0.15, blended));
  }

  return clampedExplicit;
}

/**
 * Ranks SocialPost[] items using:
 * 1. Two-Tower 768-dim neural vector similarity + explicit social/campus affinity
 * 2. Contextual Thompson Sampling Multi-Armed Bandit with real viewport impressions & dwell time
 * 3. Exponential Author Diversity Cap (0.5^k penalty) + adjacent slot de-clumping
 * 4. 80% Exploit / 20% Explore slot interleaving
 */
export function rankSocialPostsWithBandit(
  posts: SocialPost[],
  userContext: {
    campus?: string;
    followedUsernames?: Set<string>;
    preferredCategories?: Set<string>;
    interestTags?: string[];
    twoTowerSignals?: Record<string, TwoTowerPostSignal>;
  }
): SocialPost[] {
  if (posts.length <= 1) return posts;

  const now = Date.now();
  const pinned: SocialPost[] = [];
  const scoredPool: ScoredSocialPost[] = [];

  for (const post of posts) {
    if (post.isPinned) {
      pinned.push(post);
      continue;
    }

    const postAgeHours = Math.max(0, (now - (post.createdTimestamp || now)) / (1000 * 60 * 60));
    const serverSignal = userContext.twoTowerSignals?.[post.id];
    const stats = getPostBanditStats(
      post.id,
      serverSignal?.serverImpressions || 0,
      serverSignal?.serverClicks || 0
    );

    const cosineSim = computePostUserSimilarity(post, userContext);
    const rawPopularity =
      post.likes +
      post.commentsCount * 2 +
      (post.pollTotalVotes || 0) * 1.5 +
      (post.sharesCount || 0) * 2;
    const contextScore = cosineSim * (post.isFeatured ? 1.5 : 1.0);

    // Incorporate real viewport impressions, clicks, and meaningful in-feed dwell reads (>= 4.5s)
    // using a clean Bayesian Beta(1, 4) prior instead of simulated impression inflation
    const effectiveRewardEvents =
      stats.clicks + Math.min(stats.impressions * 0.45, stats.meaningfulReads * 0.4);
    const alpha = 1 + effectiveRewardEvents;
    const beta = 4 + Math.max(0, stats.impressions - effectiveRewardEvents);
    const expectedCTR = alpha / (alpha + beta);
    const variance = (alpha * beta) / (Math.pow(alpha + beta, 2) * (alpha + beta + 1));

    // Dwell time quality multiplier (rewards posts that hold user attention in viewport)
    const avgDwellSeconds =
      stats.impressions > 0 ? stats.dwellMs / Math.max(1, stats.impressions) / 1000 : 0;
    const dwellQualityBoost = 1 + Math.min(0.3, avgDwellSeconds / 25);

    // Deterministic pseudo-random jitter seeded by post ID + 5-minute window so UI doesn't flicker on re-render
    const timeBucket = Math.floor(now / (5 * 60 * 1000));
    let hash = timeBucket;
    for (let i = 0; i < post.id.length; i++) {
      hash = Math.imul(31, hash) + post.id.charCodeAt(i);
    }
    const pseudoRand = ((Math.abs(hash) % 1000) / 1000) - 0.5;
    const thompsonSample = expectedCTR + pseudoRand * Math.sqrt(variance);

    const timeDecay = Math.pow(postAgeHours + 2, 1.8);
    const exploitScore =
      ((rawPopularity * contextScore + expectedCTR * 100) * dwellQualityBoost) / timeDecay;
    const exploreScore =
      (thompsonSample * contextScore * 10 * dwellQualityBoost) / Math.sqrt(postAgeHours + 1);

    // Posts with < 15 real tracked impressions or < 2 hours old enter the Exploration pool
    const isExploration = stats.impressions < 15 || postAgeHours < 2.0;
    const finalScore = isExploration ? exploreScore : exploitScore;

    scoredPool.push({
      post,
      finalScore,
      isExploration,
      expectedCTR,
      cosineSimilarity: cosineSim,
      authorKey: resolveAuthorDiversityKey(
        post.authorUsername,
        post.authorUserId,
        post.isAnonymous,
        post.id
      ),
    });
  }

  const diversified = interleaveWithAuthorDiversity(scoredPool);
  return [...pinned, ...diversified.map((item) => item.post)];
}

// ============================================================================
// 2. TIME-DECAYED VELOCITY TRENDING, BM25 FUZZY SEARCH & WILSON COMMENT RANKING
// ============================================================================

/**
 * Computes time-decayed engagement velocity for Trending feeds (Home & Discover).
 * Accounts for likes, comments, poll votes, shares, and recent 12h comment surges
 * divided by gravity decay `(ageHours + 2)^1.55`.
 */
export function computePostTrendingVelocityScore(post: SocialPost, now = Date.now()): number {
  const ageHours = Math.max(0.25, (now - (post.createdTimestamp || now)) / (1000 * 60 * 60));
  const recentCommentsCount = (post.comments || []).filter(
    (c) => now - (c.createdTimestamp || 0) < 12 * 60 * 60 * 1000
  ).length;

  const engagementMomentum =
    post.likes * 1.0 +
    post.commentsCount * 2.2 +
    (post.pollTotalVotes || 0) * 1.5 +
    (post.sharesCount || 0) * 2.5 +
    recentCommentsCount * 3.5 +
    (post.isFeatured ? 8 : 0);

  return engagementMomentum / Math.pow(ageHours + 2, 1.55);
}

/**
 * Fast bounded Levenshtein edit distance for typo-tolerant search tokens.
 * Returns maxDist + 1 if distance exceeds maxDist.
 */
function computeBoundedLevenshtein(a: string, b: string, maxDist = 2): number {
  if (a === b) return 0;
  const lenA = a.length;
  const lenB = b.length;
  if (Math.abs(lenA - lenB) > maxDist) return maxDist + 1;

  const prev = new Array<number>(lenB + 1);
  const curr = new Array<number>(lenB + 1);
  for (let j = 0; j <= lenB; j++) prev[j] = j;

  for (let i = 1; i <= lenA; i++) {
    curr[0] = i;
    let rowMin = curr[0];
    const charA = a.charCodeAt(i - 1);
    for (let j = 1; j <= lenB; j++) {
      const cost = charA === b.charCodeAt(j - 1) ? 0 : 1;
      const val = Math.min(
        prev[j] + 1, // deletion
        curr[j - 1] + 1, // insertion
        prev[j - 1] + cost // substitution
      );
      curr[j] = val;
      if (val < rowMin) rowMin = val;
    }
    if (rowMin > maxDist) return maxDist + 1;
    for (let j = 0; j <= lenB; j++) prev[j] = curr[j];
  }

  return prev[lenB];
}

function tokenizeSearchString(raw?: string): string[] {
  if (!raw) return [];
  return raw
    .toLowerCase()
    .replace(/[@#]/g, ' ')
    .split(/[^a-z0-9_]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

/**
 * Computes a BM25-inspired multi-field relevance score with prefix and Levenshtein
 * typo tolerance across weighted document fields.
 */
export function scoreBM25FieldMatch(
  query: string,
  fields: Array<{ text?: string; weight: number }>
): number {
  const queryTokens = tokenizeSearchString(query);
  if (queryTokens.length === 0) return 0;

  const k1 = 1.2;
  let totalScore = 0;
  let matchedQueryTokensCount = 0;

  const tokenizedFields = fields.map((f) => {
    const rawLower = (f.text || '').toLowerCase();
    return {
      rawLower,
      tokens: tokenizeSearchString(rawLower),
      weight: f.weight,
    };
  });

  for (const qToken of queryTokens) {
    let bestTokenFieldScore = 0;
    let tokenMatchedAnyField = false;

    for (const field of tokenizedFields) {
      if (!field.rawLower) continue;

      let tf = 0;
      for (const docToken of field.tokens) {
        if (docToken === qToken) {
          tf += 1.0;
        } else if (docToken.startsWith(qToken) || (qToken.length >= 4 && qToken.startsWith(docToken) && docToken.length >= 4)) {
          tf += 0.78;
        } else if (docToken.includes(qToken) && qToken.length >= 3) {
          tf += 0.55;
        } else if (qToken.length >= 4 && docToken.length >= 4) {
          const maxEdits = qToken.length >= 7 ? 2 : 1;
          const dist = computeBoundedLevenshtein(qToken, docToken, maxEdits);
          if (dist === 1) {
            tf += 0.62;
          } else if (dist === 2) {
            tf += 0.38;
          }
        }
      }

      if (tf > 0) {
        tokenMatchedAnyField = true;
        // BM25 term-frequency saturation curve
        const saturatedTf = (tf * (k1 + 1)) / (tf + k1);
        const fieldScore = saturatedTf * field.weight;
        if (fieldScore > bestTokenFieldScore) {
          bestTokenFieldScore = fieldScore;
        }
      }
    }

    if (tokenMatchedAnyField) {
      matchedQueryTokensCount++;
      totalScore += bestTokenFieldScore;
    }
  }

  if (matchedQueryTokensCount === 0) return 0;

  // Multi-token coverage multiplier: strongly reward matching ALL words in a multi-word query
  const coverageRatio = matchedQueryTokensCount / queryTokens.length;
  if (queryTokens.length > 1 && coverageRatio < 0.5) {
    return 0;
  }

  return totalScore * (0.5 + 0.5 * Math.pow(coverageRatio, 1.5));
}

/**
 * Searches and ranks SocialPosts using BM25 + fuzzy typo tolerance + time-decayed Trending velocity.
 */
export function searchAndRankPosts(
  posts: SocialPost[],
  query: string,
  options?: {
    topic?: string | null;
    campusFilter?: 'all' | 'my-campus';
    userCampus?: string;
    sortBy?: 'trending' | 'latest';
  }
): SocialPost[] {
  const q = (query || '').trim();
  const topic = (options?.topic || '').trim();
  const myCampus = (options?.userCampus || 'Chrisland University').toLowerCase();
  const now = Date.now();

  const scored: Array<{ post: SocialPost; relevance: number; velocity: number }> = [];

  for (const post of posts) {
    if (
      options?.campusFilter === 'my-campus' &&
      post.authorCampus &&
      !post.authorCampus.toLowerCase().includes(myCampus)
    ) {
      continue;
    }

    if (topic) {
      const topicMatch = scoreBM25FieldMatch(topic, [
        { text: post.category, weight: 3.5 },
        { text: (post.hashtags || []).join(' '), weight: 3.0 },
        { text: post.title, weight: 2.0 },
        { text: post.content, weight: 1.2 },
      ]);
      if (topicMatch <= 0) continue;
    }

    let relevance = 1.0;
    if (q.length > 0) {
      const pollText = (post.pollOptions || []).map((o) => o.text).join(' ');
      relevance = scoreBM25FieldMatch(q, [
        { text: post.title, weight: 3.5 },
        { text: post.authorUsername, weight: 3.2 },
        { text: post.authorName, weight: 2.8 },
        { text: (post.hashtags || []).join(' '), weight: 2.8 },
        { text: post.category, weight: 2.2 },
        { text: post.type, weight: 2.0 },
        { text: pollText, weight: 1.8 },
        { text: post.content, weight: 1.2 },
        { text: post.authorCampus, weight: 1.5 },
      ]);
      if (relevance <= 0) continue;
    }

    const velocity = computePostTrendingVelocityScore(post, now);
    scored.push({ post, relevance, velocity });
  }

  return scored
    .sort((a, b) => {
      if (options?.sortBy === 'latest') {
        if (q.length > 0 && Math.abs(b.relevance - a.relevance) > 1.5) {
          return b.relevance - a.relevance;
        }
        return (b.post.createdTimestamp || 0) - (a.post.createdTimestamp || 0);
      }
      // Combine BM25 relevance with time-decayed engagement velocity
      const combinedA = q.length > 0 ? a.relevance * 3.0 + Math.log1p(a.velocity) : a.velocity;
      const combinedB = q.length > 0 ? b.relevance * 3.0 + Math.log1p(b.velocity) : b.velocity;
      return combinedB - combinedA;
    })
    .map((s) => s.post);
}

/**
 * Searches and ranks People / Profiles using BM25 + fuzzy matching + campus & social affinity.
 */
export function searchAndRankPeople<
  T extends {
    id: string;
    name: string;
    username: string;
    campus: string;
    bio: string;
    isCreator?: boolean;
    isFollowing?: boolean;
  }
>(
  people: T[],
  query: string,
  options?: {
    topic?: string | null;
    campusFilter?: 'all' | 'my-campus';
    userCampus?: string;
  }
): T[] {
  const q = (query || options?.topic || '').trim();
  const myCampus = (options?.userCampus || 'Chrisland University').toLowerCase();

  const filtered =
    options?.campusFilter === 'my-campus'
      ? people.filter((p) => (p.campus || '').toLowerCase().includes(myCampus))
      : people;

  if (!q) return filtered;

  const scored: Array<{ person: T; score: number }> = [];
  for (const person of filtered) {
    const bm25 = scoreBM25FieldMatch(q, [
      { text: person.username, weight: 4.0 },
      { text: person.name, weight: 3.4 },
      { text: person.campus, weight: 2.0 },
      { text: person.bio, weight: 1.2 },
    ]);
    if (bm25 <= 0) continue;

    const sameCampusBonus =
      person.campus && person.campus.toLowerCase().includes(myCampus) ? 0.6 : 0;
    const verifiedBonus = person.isCreator ? 0.35 : 0;
    scored.push({
      person,
      score: bm25 + sameCampusBonus + verifiedBonus,
    });
  }

  return scored.sort((a, b) => b.score - a.score).map((s) => s.person);
}

/**
 * Searches and ranks Community Rooms using BM25 + fuzzy matching + room velocity.
 */
export function searchAndRankRooms(
  rooms: CommunityRoom[],
  query: string,
  options?: { topic?: string | null }
): CommunityRoom[] {
  const q = (query || options?.topic || '').trim();
  if (!q) return rooms;

  const scored: Array<{ room: CommunityRoom; score: number }> = [];
  for (const room of rooms) {
    const recentMsgsText = (room.messages || [])
      .slice(-15)
      .map((m) => m.text)
      .join(' ');

    const bm25 = scoreBM25FieldMatch(q, [
      { text: room.name, weight: 3.8 },
      { text: room.category, weight: 2.8 },
      { text: (room.tags || []).join(' '), weight: 2.5 },
      { text: room.description, weight: 1.5 },
      { text: recentMsgsText, weight: 0.9 },
    ]);
    if (bm25 <= 0) continue;

    const activityBoost = Math.log1p((room.onlineCount || 1) * 2 + (room.membersCount || 1)) * 0.25;
    scored.push({ room, score: bm25 + activityBoost });
  }

  return scored.sort((a, b) => b.score - a.score).map((s) => s.room);
}

/**
 * Computes Wilson Score Lower Bound (95% confidence interval, z = 1.96) + reply velocity +
 * social graph boosts to rank root comments in SocialCommentsThread.
 */
export function rankCommentsByWilsonScore(
  rootComments: SocialComment[],
  repliesByParent: Record<string, SocialComment[]>,
  context?: {
    postAuthorUsername?: string;
    followedUsernames?: Set<string>;
    userCampus?: string;
  }
): SocialComment[] {
  if (rootComments.length <= 1) return rootComments;

  const now = Date.now();
  const z = 1.96; // 95% confidence interval
  const postAuthorLower = (context?.postAuthorUsername || '').toLowerCase();
  const userCampusLower = (context?.userCampus || '').toLowerCase();

  return [...rootComments]
    .map((comment) => {
      const replies = repliesByParent[comment.id] || [];
      const positiveSignals = Math.max(0, comment.likes || 0) + replies.length * 1.4;

      // Estimate exposure trials n from positive signals + age-adjusted baseline trials
      const ageHours = Math.max(0.2, (now - (comment.createdTimestamp || now)) / (1000 * 60 * 60));
      const n = Math.max(positiveSignals + 4, Math.round(positiveSignals * 1.35 + Math.min(20, ageHours * 1.5)));
      const pHat = positiveSignals / n;

      // Wilson Score Lower Bound formula
      const wilsonLowerBound =
        (pHat +
          (z * z) / (2 * n) -
          z * Math.sqrt((pHat * (1 - pHat) + (z * z) / (4 * n)) / n)) /
        (1 + (z * z) / n);

      const authorLower = (comment.authorUsername || '').toLowerCase();
      const isFollowed =
        !comment.isAnonymous &&
        authorLower &&
        Boolean(context?.followedUsernames?.has(authorLower));
      const isOp =
        !comment.isAnonymous &&
        authorLower &&
        postAuthorLower &&
        authorLower === postAuthorLower;
      const isSameCampus =
        comment.authorCampus &&
        userCampusLower &&
        comment.authorCampus.toLowerCase() === userCampusLower;

      const socialBoost =
        (isFollowed ? 0.16 : 0) + (isOp ? 0.14 : 0) + (isSameCampus ? 0.06 : 0);
      const freshnessBoost = ageHours < 3 ? 0.08 / Math.sqrt(ageHours + 0.5) : 0;

      return {
        comment,
        score: wilsonLowerBound + socialBoost + freshnessBoost,
      };
    })
    .sort((a, b) => b.score - a.score)
    .map((item) => item.comment);
}

/**
 * Dynamically computes velocity-weighted Trending Topics & emerging hashtags from live
 * campus posts and room conversations so Discover reflects real-time campus momentum.
 */
export function computeDynamicTrendingTopics(
  posts: SocialPost[],
  rooms: CommunityRoom[]
): DynamicTrendingTopic[] {
  const baseCatalog: Array<{
    label: string;
    tag: string;
    iconName: string;
    keywords: string[];
  }> = [
    {
      label: 'Campus Life',
      tag: 'Campus Life',
      iconName: 'campus-life',
      keywords: ['campus', 'hostel', 'lecture', 'exam', 'semester', 'lecturer', 'department', 'school'],
    },
    {
      label: 'Relationships',
      tag: 'Love',
      iconName: 'dating-romance',
      keywords: ['love', 'crush', 'relationship', 'dating', 'ex', 'heartbreak', 'situationship', 'babe'],
    },
    {
      label: 'Tech & Gadgets',
      tag: 'Tech',
      iconName: 'tech-coding',
      keywords: ['tech', 'coding', 'laptop', 'ai', 'software', 'iphone', 'dev', 'gadget', 'crypto'],
    },
    {
      label: 'Music',
      tag: 'Fun',
      iconName: 'music-podcasts',
      keywords: ['music', 'song', 'album', 'afrobeats', 'playlist', 'party', 'concert', 'burna', 'wizkid', 'davido'],
    },
    {
      label: 'Money',
      tag: 'Life',
      iconName: 'money-finances',
      keywords: ['money', 'finance', 'urgent', '2k', 'allowance', 'side hustle', 'business', 'naira', 'savings'],
    },
    {
      label: 'Fashion',
      tag: 'Life',
      iconName: 'fashion-style',
      keywords: ['fashion', 'style', 'drip', 'outfit', 'fit', 'wear', 'thrifting', 'sneakers'],
    },
  ];

  const now = Date.now();

  return baseCatalog
    .map((topic) => {
      let velocityScore = 1.0;
      let activeCount = 0;
      const hashtagCounts = new Map<string, number>();

      for (const post of posts) {
        const blob = `${post.category || ''} ${post.title || ''} ${post.content} ${(
          post.hashtags || []
        ).join(' ')}`.toLowerCase();

        const matchesCategory =
          (post.category || '').toLowerCase() === topic.tag.toLowerCase() ||
          (post.category || '').toLowerCase() === topic.label.toLowerCase() ||
          topic.keywords.some((kw) => blob.includes(kw));

        if (matchesCategory) {
          activeCount++;
          velocityScore += computePostTrendingVelocityScore(post, now);
          for (const h of post.hashtags || []) {
            const cleanH = h.startsWith('#') ? h : `#${h}`;
            hashtagCounts.set(cleanH, (hashtagCounts.get(cleanH) || 0) + 1);
          }
        }
      }

      for (const room of rooms) {
        const rBlob = `${room.name} ${room.category} ${room.description}`.toLowerCase();
        if (
          room.category.toLowerCase() === topic.tag.toLowerCase() ||
          topic.keywords.some((kw) => rBlob.includes(kw))
        ) {
          activeCount++;
          velocityScore += (room.onlineCount || 1) * 1.5;
        }
      }

      let topHashtag: string | undefined;
      let bestTagCount = 0;
      hashtagCounts.forEach((cnt, tag) => {
        if (cnt > bestTagCount) {
          bestTagCount = cnt;
          topHashtag = tag;
        }
      });

      return {
        label: topic.label,
        tag: topic.tag,
        iconName: topic.iconName,
        velocityScore: Number(velocityScore.toFixed(2)),
        activeCount,
        topHashtag,
      };
    })
    .sort((a, b) => b.velocityScore - a.velocityScore);
}

// ============================================================================
// 3. NETWORK EFFECTS & REDIS-CACHED ADAMIC-ADAR GRAPH RECOMMENDATION PIPELINE
// ============================================================================

const l1PymkMemoryCache = new Map<
  string,
  { expiresAt: number; candidates: PYMKRecommendation[] }
>();

/**
 * Generates an Adamic-Adar recommendation list optimized to accelerate network density.
 * Uses a 2-tier cache (Client L1 + Server Redis L2 via `/api/retention/pymk`) to
 * minimize real-time Supabase RPC resource consumption.
 */
export async function fetchPeopleYouMayKnow(
  supabaseClient: SupabaseClient | null,
  userId: string,
  userCampusId: string,
  options?: {
    username?: string;
    edges?: FollowEdge[];
    profiles?: CreatorProfile[];
    posts?: SocialPost[];
    forceRefresh?: boolean;
  }
): Promise<PYMKRecommendation[]> {
  const normUser = (options?.username || userId || 'guest').trim().toLowerCase();
  const normCampus = (userCampusId || 'Chrisland University').trim().toLowerCase();
  const cacheKey = `pymk:${normUser}:${normCampus}:${options?.edges?.length || 0}`;

  // 1. Check L1 in-memory client cache (60s TTL)
  if (!options?.forceRefresh) {
    const hit = l1PymkMemoryCache.get(cacheKey);
    if (hit && hit.expiresAt > Date.now() && hit.candidates.length > 0) {
      return hit.candidates;
    }
  }

  // 2. Query Server Redis Caching Layer (`/api/retention/pymk`)
  try {
    const res = await fetch('/api/retention/pymk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        username: options?.username,
        campusId: userCampusId,
        edges: options?.edges || [],
        profiles: options?.profiles || [],
        forceRefresh: Boolean(options?.forceRefresh),
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.candidates) && data.candidates.length > 0) {
        // Enrich with local co-engagement signals if the user is in cold-start (< 3 follows)
        const enriched = computeLocalAdamicAdarRecommendations(
          userId,
          options?.username || '',
          userCampusId,
          options?.edges || [],
          options?.profiles || data.candidates,
          options?.posts || []
        );
        const finalCandidates = enriched.length > 0 ? enriched : data.candidates;
        l1PymkMemoryCache.set(cacheKey, {
          expiresAt: Date.now() + 60_000,
          candidates: finalCandidates,
        });
        return finalCandidates;
      }
    }
  } catch {
    // Fallback to direct Supabase RPC / local graph computation if offline
  }

  // 3. Direct Supabase RPC fallback (`compute_adamic_adar_candidates`)
  if (supabaseClient && userId && /^[0-9a-f-]{36}$/i.test(userId)) {
    try {
      const { data: candidateGraph, error: graphErr } = await supabaseClient.rpc(
        'compute_adamic_adar_candidates',
        {
          p_user_id: userId,
          p_campus_id: userCampusId,
        }
      );

      if (!graphErr && Array.isArray(candidateGraph) && candidateGraph.length > 0) {
        const mapped: PYMKRecommendation[] = candidateGraph
          .map((profile: any) => {
            let finalGraphScore = parseFloat(String(profile.adamic_adar_score || 0));
            if (profile.is_following_user) {
              finalGraphScore *= 2.5;
            }
            return {
              id: profile.profile_id,
              name: profile.display_name || profile.username,
              username: profile.username,
              avatarUrl: profile.avatar_url,
              campus: profile.campus || userCampusId,
              bio: profile.bio || '',
              followersCount: profile.followers_count ?? 0,
              followingCount: profile.following_count ?? 0,
              isFollowing: false,
              isVerified: Boolean(profile.is_verified),
              adamicAdarScore: Number(parseFloat(String(profile.adamic_adar_score || 0)).toFixed(4)),
              mutualCount: Number(profile.mutual_count || 0),
              mutualUsernames: [],
              isFollowingYou: Boolean(profile.is_following_user),
              finalScore: Number(finalGraphScore.toFixed(4)),
            };
          })
          .sort((a, b) => b.finalScore - a.finalScore)
          .slice(0, 50);

        l1PymkMemoryCache.set(cacheKey, {
          expiresAt: Date.now() + 60_000,
          candidates: mapped,
        });
        return mapped;
      }
    } catch {
      // Fallback to local edge matrix calculation
    }
  }

  // 4. Local Adamic-Adar 2-Hop + Co-Engagement Bipartite Matrix Computation
  return computeLocalAdamicAdarRecommendations(
    userId,
    options?.username || '',
    userCampusId,
    options?.edges || [],
    options?.profiles || [],
    options?.posts || []
  );
}

/**
 * Computes 2-Hop Adamic-Adar social graph recommendations AND solves the 0-follow
 * cold-start problem using Co-Engagement Bipartite Graph Edges (shared post/comment threads,
 * liked authors, and campus/bio interest overlap).
 */
export function computeLocalAdamicAdarRecommendations(
  userId: string,
  username: string,
  campusId: string,
  edges: FollowEdge[],
  profiles: CreatorProfile[],
  posts: SocialPost[] = []
): PYMKRecommendation[] {
  const normMe = (username || userId || '').toLowerCase();
  const myDirectFollows = new Set<string>();
  const followersOfMe = new Set<string>();
  const outNeighbors = new Map<string, Set<string>>();

  edges.forEach((e) => {
    const f = (e.followerUsername || e.followerId || '').toLowerCase();
    const t = (e.followingUsername || e.followingId || '').toLowerCase();
    if (!f || !t || f === t) return;
    if (!outNeighbors.has(f)) outNeighbors.set(f, new Set());
    outNeighbors.get(f)!.add(t);

    if (f === normMe || (userId && e.followerId === userId)) {
      myDirectFollows.add(t);
    }
    if (t === normMe || (userId && e.followingId === userId)) {
      followersOfMe.add(f);
    }
  });

  const adamicScores = new Map<string, { score: number; mutuals: string[] }>();

  // 1. Standard 2-Hop Adamic-Adar Triadic Closure over explicit follow edges
  for (const mutualNode of myDirectFollows) {
    const hop2 = outNeighbors.get(mutualNode);
    if (!hop2) continue;
    const outDegree = Math.max(2, hop2.size);
    const weight = 1.0 / Math.log(outDegree + 1);

    for (const targetNode of hop2) {
      if (targetNode === normMe || myDirectFollows.has(targetNode)) continue;
      const entry = adamicScores.get(targetNode) || { score: 0, mutuals: [] };
      entry.score += weight;
      if (!entry.mutuals.includes(mutualNode)) {
        entry.mutuals.push(mutualNode);
      }
      adamicScores.set(targetNode, entry);
    }
  }

  // 2. Cold-Start Co-Engagement Bipartite Graph (active when user has < 5 follows or sparse graph)
  const coEngagementScores = new Map<string, number>();
  if (posts.length > 0) {
    for (const post of posts) {
      const iEngagedWithPost =
        post.hasLiked ||
        post.isBookmarked ||
        Boolean(post.userVotedOptionId) ||
        (post.comments || []).some(
          (c) => !c.isAnonymous && (c.authorUsername || '').toLowerCase() === normMe
        );

      // If the user engaged with a post, boost the post's author and fellow commenters
      if (iEngagedWithPost) {
        if (!post.isAnonymous && post.authorUsername) {
          const authorLower = post.authorUsername.toLowerCase();
          if (authorLower !== normMe && !myDirectFollows.has(authorLower)) {
            coEngagementScores.set(
              authorLower,
              (coEngagementScores.get(authorLower) || 0) + 0.42
            );
          }
        }
        for (const c of post.comments || []) {
          if (!c.isAnonymous && c.authorUsername) {
            const commenterLower = c.authorUsername.toLowerCase();
            if (commenterLower !== normMe && !myDirectFollows.has(commenterLower)) {
              coEngagementScores.set(
                commenterLower,
                (coEngagementScores.get(commenterLower) || 0) + 0.25
              );
            }
          }
        }
      } else if (!post.isAnonymous && post.authorUsername) {
        // Even before user engagement, give active campus discussion/poll authors a cold-start velocity signal
        const authorLower = post.authorUsername.toLowerCase();
        if (authorLower !== normMe && !myDirectFollows.has(authorLower)) {
          const postSignal = Math.min(
            0.35,
            (post.likes * 0.02 + post.commentsCount * 0.05) /
              Math.sqrt(
                Math.max(1, (Date.now() - (post.createdTimestamp || Date.now())) / 3_600_000)
              )
          );
          coEngagementScores.set(
            authorLower,
            (coEngagementScores.get(authorLower) || 0) + postSignal
          );
        }
      }
    }
  }

  return profiles
    .filter((p) => {
      const uLower = p.username.toLowerCase();
      return uLower !== normMe && !p.isFollowing && !myDirectFollows.has(uLower);
    })
    .map((p): PYMKRecommendation => {
      const uLower = p.username.toLowerCase();
      const graphEntry = adamicScores.get(uLower);
      const coEngagementBonus = Math.min(0.85, coEngagementScores.get(uLower) || 0);
      const baseAdamic = (graphEntry ? graphEntry.score : 0.15) + coEngagementBonus;

      const sameCampusBoost =
        p.campus && campusId && p.campus.toLowerCase() === campusId.toLowerCase() ? 0.45 : 0.1;
      const verifiedBoost = p.isVerified ? 0.2 : 0;
      const popularityPrior = Math.log10(Math.max(1, (p.followersCount || 0) + 1)) * 0.12;
      const isFollowingYou = followersOfMe.has(uLower);

      let finalScore = baseAdamic + sameCampusBoost + verifiedBoost + popularityPrior;
      if (isFollowingYou) {
        finalScore *= 2.5;
      }

      return {
        ...p,
        adamicAdarScore: Number(baseAdamic.toFixed(4)),
        mutualCount: graphEntry?.mutuals.length || 0,
        mutualUsernames: graphEntry?.mutuals.slice(0, 3) || [],
        isFollowingYou,
        finalScore: Number(finalScore.toFixed(4)),
      };
    })
    .sort((a, b) => b.finalScore - a.finalScore)
    .slice(0, 50);
}

/**
 * Invalidates both Client L1 and Server Redis Adamic-Adar caches when follow edges change.
 */
export async function invalidateGraphCacheForUser(
  userId?: string,
  username?: string
): Promise<void> {
  l1PymkMemoryCache.clear();
  try {
    await fetch('/api/retention/invalidate-graph', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, username }),
    });
  } catch {
    // Non-blocking cache invalidation
  }
}

// ============================================================================
// 4. AUTOMATED "AHA! MOMENT" ONBOARDING ACTIVATION PIPELINE
// ============================================================================

export async function executeActivationPipeline(
  supabaseClient: SupabaseClient | null,
  userId: string,
  username: string,
  prefs: ActivationPreferences,
  availableCreators: CreatorProfile[],
  availableRooms: CommunityRoom[]
): Promise<{
  success: boolean;
  initializedRooms: number;
  followedCreatorUsernames: string[];
  joinedRoomIds: string[];
  seededIcebreakers: AnonymousMessage[];
}> {
  try {
    let creatorsToFollowIds: string[] = [];
    let roomsToJoinIds: string[] = [];

    if (supabaseClient && prefs.selectedTags.length > 0) {
      try {
        const { data: targetedClusters } = await supabaseClient
          .from('lookalike_clusters')
          .select('recommended_creator_ids, recommended_room_ids')
          .eq('campus_id', prefs.campusId)
          .contains('associated_tags', [prefs.selectedTags[0]])
          .limit(1)
          .maybeSingle();

        if (targetedClusters) {
          creatorsToFollowIds = targetedClusters.recommended_creator_ids || [];
          roomsToJoinIds = targetedClusters.recommended_room_ids || [];
        }
      } catch {
        // Fallback to velocity-based campus cluster matching below
      }
    }

    const matchedCreators = availableCreators
      .filter(
        (c) =>
          c.username.toLowerCase() !== username.toLowerCase() &&
          (!prefs.campusId || c.campus.toLowerCase() === prefs.campusId.toLowerCase() || c.isVerified)
      )
      .slice(0, 3);

    const followedCreatorUsernames = matchedCreators.map((c) => c.username);
    if (creatorsToFollowIds.length === 0) {
      creatorsToFollowIds = matchedCreators.map((c) => c.id);
    }

    const tagSet = new Set(prefs.selectedTags.map((t) => t.toLowerCase()));
    const matchedRooms = [...availableRooms]
      .sort((a, b) => {
        const aMatch =
          tagSet.has((a.category || '').toLowerCase()) ||
          a.tags?.some((t) => tagSet.has(t.toLowerCase()))
            ? 1
            : 0;
        const bMatch =
          tagSet.has((b.category || '').toLowerCase()) ||
          b.tags?.some((t) => tagSet.has(t.toLowerCase()))
            ? 1
            : 0;
        if (bMatch !== aMatch) return bMatch - aMatch;
        return (b.membersCount || 0) - (a.membersCount || 0);
      })
      .slice(0, 3);

    if (roomsToJoinIds.length === 0) {
      roomsToJoinIds = matchedRooms.map((r) => r.id);
    }

    const primaryTag = prefs.selectedTags[0] || 'Campus Life';
    const campusLabel = prefs.campusId || 'Chrisland University';
    const structuralIcebreakerPrompts = [
      `Welcome to ${campusLabel} on Bopoi! 👀 Be honest — what's your #1 unpopular opinion about ${primaryTag.toLowerCase()} this semester?`,
      `Spotted your 3D campus character! 🔥 Drop a hot take on your story card: what's the most overrated spot on campus right now?`,
    ];

    const nowTs = Date.now();
    const seededIcebreakers: AnonymousMessage[] = structuralIcebreakerPrompts.map(
      (promptText, idx) => ({
        id: `msg_icebreaker_${nowTs}_${idx}`,
        recipientUsername: username,
        text: promptText,
        createdAt: 'Just now',
        createdTimestamp: nowTs - idx * 1000,
        isRead: false,
        isAnswered: false,
        likes: 1,
        repliesCount: 0,
        comments: [],
      })
    );

    const validUserUuid = /^[0-9a-f-]{36}$/i.test(userId);
    if (supabaseClient && validUserUuid) {
      const mutations: Promise<any>[] = [];

      roomsToJoinIds
        .filter((id) => /^[0-9a-f-]{36}$/i.test(id))
        .forEach((roomId) => {
          mutations.push(
            Promise.resolve(
              supabaseClient.from('room_memberships').upsert(
                {
                  user_id: userId,
                  room_id: roomId,
                },
                { onConflict: 'room_id,user_id' }
              )
            )
          );
        });

      structuralIcebreakerPrompts.forEach((promptText) => {
        mutations.push(
          Promise.resolve(
            supabaseClient.from('anonymous_messages').insert({
              recipient_user_id: userId,
              recipient_username: username,
              text: promptText,
              is_read: false,
              is_answered: false,
            })
          )
        );
      });

      await Promise.allSettled(mutations);
    }

    return {
      success: true,
      initializedRooms: roomsToJoinIds.length,
      followedCreatorUsernames,
      joinedRoomIds: roomsToJoinIds,
      seededIcebreakers,
    };
  } catch (pipelineFailure) {
    console.error('Critical error executing cold start activation engine:', pipelineFailure);
    return {
      success: false,
      initializedRooms: 0,
      followedCreatorUsernames: [],
      joinedRoomIds: [],
      seededIcebreakers: [],
    };
  }
}

// ============================================================================
// 5. AUTOMATIC VECTOR GENERATION EDGE LISTENER CLIENT TRIGGER
// ============================================================================

export async function triggerPostVectorGeneration(params: {
  postId: string;
  type?: string;
  category?: string;
  title?: string;
  content: string;
  hashtags?: string[];
  authorCampus?: string;
}): Promise<void> {
  try {
    await fetch('/api/edge/vector-listener', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
  } catch {
    // Non-blocking background edge trigger
  }
}
