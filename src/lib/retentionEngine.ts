import { SupabaseClient } from '@supabase/supabase-js';
import {
  SocialPost,
  CreatorProfile,
  UserProfile,
  CommunityRoom,
  AnonymousMessage,
} from '../types/index.ts';
import { FollowEdge } from './supabase.ts';

export interface PostCandidate {
  id: string;
  author_id?: string;
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

// ============================================================================
// LOCAL TELEMETRY & L1 REDIS MIRROR CACHE
// ============================================================================
const BANDIT_TELEMETRY_STORAGE_KEY = 'bopoi_bandit_telemetry_v1';

interface PostBanditMetrics {
  impressions: number;
  clicks: number;
  dwellMs: number;
}

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

export function getPostBanditStats(postId: string, baseLikes = 0, baseComments = 0): PostBanditMetrics {
  const map = readLocalBanditMap();
  const saved = map[postId];
  // Derive realistic baseline impressions from existing engagement if not yet tracked
  const baselineImpressions = Math.max(8, baseLikes * 4 + baseComments * 7);
  const baselineClicks = Math.max(1, baseLikes + baseComments * 2);
  if (!saved) {
    return {
      impressions: baselineImpressions,
      clicks: baselineClicks,
      dwellMs: 0,
    };
  }
  return {
    impressions: Math.max(baselineImpressions, saved.impressions),
    clicks: Math.max(baselineClicks, saved.clicks),
    dwellMs: saved.dwellMs || 0,
  };
}

export function recordPostBanditInteraction(
  supabaseClient: SupabaseClient | null,
  postId: string,
  isClick: boolean,
  dwellMs = 0
): void {
  if (!postId) return;
  const map = readLocalBanditMap();
  const current = map[postId] || { impressions: 10, clicks: 1, dwellMs: 0 };
  map[postId] = {
    impressions: current.impressions + 1,
    clicks: current.clicks + (isClick ? 1 : 0),
    dwellMs: current.dwellMs + Math.max(0, dwellMs),
  };
  writeLocalBanditMap(map);

  if (supabaseClient && /^[0-9a-f-]{36}$/i.test(postId)) {
    supabaseClient
      .rpc('record_post_bandit_telemetry', {
        p_post_id: postId,
        p_is_click: isClick,
        p_dwell_ms: Math.round(dwellMs),
      })
      .then(() => {});
  }
}

// ============================================================================
// 1. HYPER-PERSONALIZED FEED ENGINE & MULTI-ARMED BANDIT (THOMPSON SAMPLING)
// ============================================================================

/**
 * Replaces the static fetchSupabaseSocialPosts query with an
 * exploration/exploitation Multi-Armed Bandit ranking engine.
 */
export async function fetchPersonalizedSocialFeed(
  supabaseClient: SupabaseClient,
  _userId: string,
  userEmbedding: number[]
): Promise<PostCandidate[]> {
  // 1. Fetch Candidate Pool using Two-Tower pgvector Matcher
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
  }[] = [];

  // 2. Compute Multi-Task Optimization Score with Thompson Sampling Bounds
  for (const item of candidates as PostCandidate[]) {
    const postAgeHours = Math.max(
      0,
      (now - new Date(item.created_at).getTime()) / (1000 * 60 * 60)
    );

    // Explicit & Implicit Interaction Signal Multipliers
    const rawPopularity = (item.likes || 0) + (item.comments_count || 0) * 2;
    const contextScore = (item.cosine_similarity || 0.5) * (item.is_featured ? 1.5 : 1.0);

    // Contextual Thompson Sampling distribution parameter derivation
    const alpha = Math.max(1, item.clicks_count || 1);
    const beta = Math.max(1, (item.impressions_count || 10) - (item.clicks_count || 1));

    // Beta distribution estimation proxy
    const expectedCTR = alpha / (alpha + beta);
    const variance = (alpha * beta) / (Math.pow(alpha + beta, 2) * (alpha + beta + 1));
    const thompsonSample = expectedCTR + (Math.random() - 0.5) * Math.sqrt(variance);

    // Gravity-based time-decay mechanics (HackerNews/Reddit Hybrid Formula)
    const timeDecay = Math.pow(postAgeHours + 2, 1.8);
    const exploitScore = (rawPopularity * contextScore + expectedCTR * 100) / timeDecay;
    const exploreScore = (thompsonSample * contextScore * 10) / Math.sqrt(postAgeHours + 1);

    // Identify if the candidate qualifies for Exploration Category (Low-exposure nodes)
    const isExplorationCandidate = (item.impressions_count || 0) < 50;
    const finalScore = isExplorationCandidate ? exploreScore : exploitScore;

    scoredPool.push({
      candidate: item,
      finalScore,
      isExploration: isExplorationCandidate,
    });
  }

  // 3. Structural Re-Ranking and Slot Allocation (80% Exploit / 20% Explore)
  const exploitSorted = scoredPool
    .filter((p) => !p.isExploration)
    .sort((a, b) => b.finalScore - a.finalScore);
  const exploreSorted = scoredPool
    .filter((p) => p.isExploration)
    .sort((a, b) => b.finalScore - a.finalScore);

  const finalFeed: PostCandidate[] = [];
  const targetFeedSize = Math.min(120, scoredPool.length);

  for (let i = 0; i < targetFeedSize; i++) {
    // Inject exploration nodes every 5 slots to break filter-bubbles
    if (i % 5 === 0 && exploreSorted.length > 0) {
      finalFeed.push(exploreSorted.shift()!.candidate);
    } else if (exploitSorted.length > 0) {
      finalFeed.push(exploitSorted.shift()!.candidate);
    } else if (exploreSorted.length > 0) {
      finalFeed.push(exploreSorted.shift()!.candidate);
    }
  }

  return finalFeed;
}

/**
 * Computes fast semantic cosine similarity between a post and the active user's
 * Two-Tower profile context (campus, followed creators, bookmarked categories, and tags).
 */
export function computePostUserSimilarity(
  post: SocialPost,
  userContext: {
    campus?: string;
    followedUsernames?: Set<string>;
    preferredCategories?: Set<string>;
    interestTags?: string[];
  }
): number {
  let sim = 0.45; // Baseline semantic prior

  if (
    userContext.campus &&
    post.authorCampus &&
    post.authorCampus.toLowerCase() === userContext.campus.toLowerCase()
  ) {
    sim += 0.22;
  }

  if (
    !post.isAnonymous &&
    post.authorUsername &&
    userContext.followedUsernames?.has(post.authorUsername.toLowerCase())
  ) {
    sim += 0.2;
  }

  if (
    post.category &&
    userContext.preferredCategories?.has(post.category.toLowerCase())
  ) {
    sim += 0.12;
  }

  if (userContext.interestTags && userContext.interestTags.length > 0) {
    const blob = `${post.title || ''} ${post.content} ${post.category || ''} ${(
      post.hashtags || []
    ).join(' ')}`.toLowerCase();
    for (const tag of userContext.interestTags) {
      if (tag && blob.includes(tag.toLowerCase())) {
        sim += 0.08;
      }
    }
  }

  if (post.isBookmarked || post.hasLiked) {
    sim += 0.05;
  }

  return Math.min(0.99, Math.max(0.15, sim));
}

/**
 * Re-ranks live SocialPost[] items using the Contextual Thompson Sampling
 * Multi-Armed Bandit (80% Exploit / 20% Explore) and gravity time-decay.
 */
export function rankSocialPostsWithBandit(
  posts: SocialPost[],
  userContext: {
    campus?: string;
    followedUsernames?: Set<string>;
    preferredCategories?: Set<string>;
    interestTags?: string[];
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
    const stats = getPostBanditStats(post.id, post.likes, post.commentsCount);

    const cosineSim = computePostUserSimilarity(post, userContext);
    const rawPopularity =
      post.likes +
      post.commentsCount * 2 +
      (post.pollTotalVotes || 0) * 1.5 +
      (post.sharesCount || 0) * 2;
    const contextScore = cosineSim * (post.isFeatured ? 1.5 : 1.0);

    const alpha = Math.max(1, stats.clicks);
    const beta = Math.max(1, stats.impressions - stats.clicks);
    const expectedCTR = alpha / (alpha + beta);
    const variance = (alpha * beta) / (Math.pow(alpha + beta, 2) * (alpha + beta + 1));

    // Deterministic pseudo-random jitter seeded by post ID + 5-minute window so UI doesn't flicker on re-render
    const timeBucket = Math.floor(now / (5 * 60 * 1000));
    let hash = timeBucket;
    for (let i = 0; i < post.id.length; i++) {
      hash = Math.imul(31, hash) + post.id.charCodeAt(i);
    }
    const pseudoRand = ((Math.abs(hash) % 1000) / 1000) - 0.5;
    const thompsonSample = expectedCTR + pseudoRand * Math.sqrt(variance);

    const timeDecay = Math.pow(postAgeHours + 2, 1.8);
    const exploitScore = (rawPopularity * contextScore + expectedCTR * 100) / timeDecay;
    const exploreScore = (thompsonSample * contextScore * 10) / Math.sqrt(postAgeHours + 1);

    const isExploration = stats.impressions < 50 || postAgeHours < 1.5;
    const finalScore = isExploration ? exploreScore : exploitScore;

    scoredPool.push({
      post,
      finalScore,
      isExploration,
      expectedCTR,
      cosineSimilarity: cosineSim,
    });
  }

  const exploitSorted = scoredPool
    .filter((p) => !p.isExploration)
    .sort((a, b) => b.finalScore - a.finalScore);
  const exploreSorted = scoredPool
    .filter((p) => p.isExploration)
    .sort((a, b) => b.finalScore - a.finalScore);

  const interleaved: SocialPost[] = [];
  const total = scoredPool.length;

  for (let i = 0; i < total; i++) {
    if (i % 5 === 0 && exploreSorted.length > 0) {
      interleaved.push(exploreSorted.shift()!.post);
    } else if (exploitSorted.length > 0) {
      interleaved.push(exploitSorted.shift()!.post);
    } else if (exploreSorted.length > 0) {
      interleaved.push(exploreSorted.shift()!.post);
    }
  }

  return [...pinned, ...interleaved];
}

// ============================================================================
// 2. NETWORK EFFECTS & REDIS-CACHED ADAMIC-ADAR GRAPH RECOMMENDATION PIPELINE
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
    forceRefresh?: boolean;
  }
): Promise<PYMKRecommendation[]> {
  const normUser = (options?.username || userId || 'guest').trim().toLowerCase();
  const normCampus = (userCampusId || 'Chrisland University').trim().toLowerCase();
  const cacheKey = `pymk:${normUser}:${normCampus}`;

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
        l1PymkMemoryCache.set(cacheKey, {
          expiresAt: Date.now() + 60_000,
          candidates: data.candidates,
        });
        return data.candidates;
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

  // 4. Local Adamic-Adar 2-Hop Matrix Computation
  return computeLocalAdamicAdarRecommendations(
    userId,
    options?.username || '',
    userCampusId,
    options?.edges || [],
    options?.profiles || []
  );
}

export function computeLocalAdamicAdarRecommendations(
  userId: string,
  username: string,
  campusId: string,
  edges: FollowEdge[],
  profiles: CreatorProfile[]
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

  return profiles
    .filter((p) => {
      const uLower = p.username.toLowerCase();
      return uLower !== normMe && !p.isFollowing && !myDirectFollows.has(uLower);
    })
    .map((p): PYMKRecommendation => {
      const uLower = p.username.toLowerCase();
      const graphEntry = adamicScores.get(uLower);
      const baseAdamic = graphEntry ? graphEntry.score : 0.15;
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
// 3. AUTOMATED "AHA! MOMENT" ONBOARDING ACTIVATION PIPELINE
// ============================================================================

/**
 * Automates the onboarding completion lifecycle by assigning lookalike clusters
 * and instantly executing targeted batch-follows, room memberships, and
 * contextual campus icebreaker seeding.
 */
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

    // 1. Resolve Lookalike Cluster Matches using the onboarding preferences
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

    // Fallback: Select top high-velocity campus creators & rooms matching selected tags
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

    // 2. Construct Contextual Dynamic Campus Icebreakers for New User Inbox
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

    // 3. Perform Atomic Multi-Table Batch Seeding Pipeline in Supabase if connected
    const validUserUuid = /^[0-9a-f-]{36}$/i.test(userId);
    if (supabaseClient && validUserUuid) {
      const mutations: Promise<any>[] = [];

      creatorsToFollowIds
        .filter((id) => /^[0-9a-f-]{36}$/i.test(id))
        .forEach((creatorId) => {
          mutations.push(
            Promise.resolve(
              supabaseClient.from('user_follows').upsert(
                {
                  follower_id: userId,
                  following_id: creatorId,
                  created_at: new Date().toISOString(),
                },
                { onConflict: 'follower_id,following_id' }
              )
            )
          );
        });

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
// 4. AUTOMATIC VECTOR GENERATION EDGE LISTENER CLIENT TRIGGER
// ============================================================================

/**
 * Triggers the Server-Side Vector Generation Edge Listener (`/api/edge/vector-listener`)
 * whenever a user creates a new post so a 768-dim Gemini embedding is generated,
 * cached in Redis, and persisted to `public.social_posts.post_embedding`.
 */
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
