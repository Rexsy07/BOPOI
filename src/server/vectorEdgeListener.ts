import { GoogleGenAI } from '@google/genai';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  redisCache,
  REDIS_TTL,
  getPostEmbeddingCacheKey,
  getUserEmbeddingCacheKey,
} from './redisCache.ts';

const EMBEDDING_DIMENSION = 768;

let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

let serverSupabase: SupabaseClient | null = null;

export function getServerSupabase(): SupabaseClient | null {
  if (serverSupabase) return serverSupabase;
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    '';
  if (!url || !key) return null;
  serverSupabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return serverSupabase;
}

/**
 * Normalizes any vector to unit L2 length and fits it to exactly 768 dimensions
 * for pgvector `vector(768)` compatibility.
 */
export function normalizeTo768Dim(rawValues: number[]): number[] {
  const vec = new Array<number>(EMBEDDING_DIMENSION).fill(0);
  if (rawValues.length > 0) {
    for (let i = 0; i < EMBEDDING_DIMENSION; i++) {
      vec[i] = rawValues[i % rawValues.length] || 0;
    }
  }
  let normSq = 0;
  for (let i = 0; i < EMBEDDING_DIMENSION; i++) {
    normSq += vec[i] * vec[i];
  }
  const norm = Math.sqrt(normSq) || 1;
  for (let i = 0; i < EMBEDDING_DIMENSION; i++) {
    vec[i] = Number((vec[i] / norm).toFixed(6));
  }
  return vec;
}

/**
 * Deterministic semantic feature hashing fallback (768-dim) used when
 * GEMINI_API_KEY is not provisioned in local dev, ensuring pgvector pipelines
 * and cosine similarity always receive unit-normalized 768-d vectors.
 */
export function buildSemanticHashEmbedding768(text: string): number[] {
  const vec = new Array<number>(EMBEDDING_DIMENSION).fill(0);
  const clean = (text || 'campus post').toLowerCase().trim();
  const tokens = clean.split(/[^a-z0-9#]+/).filter(Boolean);

  if (tokens.length === 0) {
    tokens.push('bopoi', 'campus');
  }

  for (let t = 0; t < tokens.length; t++) {
    const token = tokens[t];
    let h1 = 2166136261;
    let h2 = 16777619;
    for (let i = 0; i < token.length; i++) {
      const code = token.charCodeAt(i);
      h1 ^= code;
      h1 = Math.imul(h1, 16777619);
      h2 ^= code * (i + 1);
      h2 = Math.imul(h2, 1099511628211 & 0xffffffff);
    }
    const idx1 = Math.abs(h1) % EMBEDDING_DIMENSION;
    const idx2 = Math.abs(h2) % EMBEDDING_DIMENSION;
    const sign = (h1 & 1) === 0 ? 1 : -1;
    vec[idx1] += sign * 1.0;
    vec[idx2] += -sign * 0.5;
  }

  return normalizeTo768Dim(vec);
}

/**
 * Calls Google Gemini API (`gemini-embedding-2-preview`) to generate a 768-d
 * semantic vector for a post or user profile context.
 */
export async function generateGeminiEmbedding768(textPayload: string): Promise<{
  embedding: number[];
  model: string;
  fromCache: boolean;
}> {
  const ai = getGeminiClient();
  const normalizedInput = textPayload.trim().slice(0, 4000) || 'Bopoi campus post';

  if (ai) {
    try {
      const response = await ai.models.embedContent({
        model: 'gemini-embedding-2-preview',
        contents: [normalizedInput],
      });
      const rawValues = response.embeddings?.[0]?.values;
      if (Array.isArray(rawValues) && rawValues.length > 0) {
        return {
          embedding: normalizeTo768Dim(rawValues),
          model: 'gemini-embedding-2-preview',
          fromCache: false,
        };
      }
    } catch (err) {
      console.warn('[VectorEdgeListener] Gemini embedContent fallback triggered:', err);
    }
  }

  return {
    embedding: buildSemanticHashEmbedding768(normalizedInput),
    model: 'semantic-hash-768-fallback',
    fromCache: false,
  };
}

export interface PostEmbeddingEventPayload {
  postId: string;
  type?: string;
  category?: string;
  title?: string;
  content: string;
  hashtags?: string[];
  authorCampus?: string;
}

export interface VectorListenerStatus {
  processedPostsCount: number;
  lastProcessedPostId: string | null;
  lastProcessedAt: string | null;
  lastModelUsed: string | null;
  realtimeSubscribed: boolean;
}

const listenerStats: VectorListenerStatus = {
  processedPostsCount: 0,
  lastProcessedPostId: null,
  lastProcessedAt: null,
  lastModelUsed: null,
  realtimeSubscribed: false,
};

/**
 * Core Edge Listener Processor:
 * 1. Checks Redis cache to avoid duplicate embedding generation
 * 2. Synthesizes structured text representation of the post
 * 3. Calls Google Gemini API (`gemini-embedding-2-preview`)
 * 4. Caches the 768-dim vector in Redis (`vec:post768:${postId}`)
 * 5. Writes `post_embedding` into `public.social_posts` in Supabase
 */
export async function processNewPostVectorEmbedding(
  payload: PostEmbeddingEventPayload
): Promise<{
  postId: string;
  dimensions: number;
  model: string;
  persistedToSupabase: boolean;
  cachedInRedis: boolean;
  embedding: number[];
}> {
  const postId = String(payload.postId || '').trim();
  const cacheKey = getPostEmbeddingCacheKey(postId);

  const cached = await redisCache.get<number[]>(cacheKey);
  if (cached && cached.length === EMBEDDING_DIMENSION) {
    return {
      postId,
      dimensions: cached.length,
      model: 'redis-cache-hit',
      persistedToSupabase: true,
      cachedInRedis: true,
      embedding: cached,
    };
  }

  const compositeText = [
    payload.type ? `Type: ${payload.type}` : '',
    payload.category ? `Category: ${payload.category}` : '',
    payload.authorCampus ? `Campus: ${payload.authorCampus}` : '',
    payload.title ? `Title: ${payload.title}` : '',
    `Content: ${payload.content || ''}`,
    Array.isArray(payload.hashtags) && payload.hashtags.length > 0
      ? `Tags: ${payload.hashtags.join(' ')}`
      : '',
  ]
    .filter(Boolean)
    .join(' | ');

  const { embedding, model } = await generateGeminiEmbedding768(compositeText);

  // Cache in Redis for 24h
  await redisCache.setex(cacheKey, REDIS_TTL.POST_EMBEDDING_SECONDS, embedding);

  // Persist into Supabase social_posts.post_embedding if postId is a valid UUID
  let persistedToSupabase = false;
  const sb = getServerSupabase();
  if (sb && /^[0-9a-f-]{36}$/i.test(postId)) {
    try {
      const vectorLiteral = `[${embedding.join(',')}]`;
      const { error } = await sb
        .from('social_posts')
        .update({ post_embedding: vectorLiteral })
        .eq('id', postId);
      persistedToSupabase = !error;
    } catch {
      persistedToSupabase = false;
    }
  }

  listenerStats.processedPostsCount++;
  listenerStats.lastProcessedPostId = postId;
  listenerStats.lastProcessedAt = new Date().toISOString();
  listenerStats.lastModelUsed = model;

  return {
    postId,
    dimensions: embedding.length,
    model,
    persistedToSupabase,
    cachedInRedis: true,
    embedding,
  };
}

/**
 * Generates or retrieves a cached 768-dim User Tower embedding vector based on
 * the user's campus, bio, interest tags, and recently engaged post text.
 */
export async function getOrCreateUserTowerEmbedding(params: {
  userId: string;
  campus?: string;
  bio?: string;
  interestTags?: string[];
  recentEngagedSignals?: string[];
}): Promise<number[]> {
  const cacheKey = getUserEmbeddingCacheKey(params.userId || 'guest');
  const cached = await redisCache.get<number[]>(cacheKey);
  if (cached && cached.length === EMBEDDING_DIMENSION) {
    return cached;
  }

  const userContextText = [
    params.campus ? `Campus: ${params.campus}` : 'Campus: Chrisland University',
    params.bio ? `Bio: ${params.bio}` : '',
    params.interestTags?.length ? `Interests: ${params.interestTags.join(', ')}` : '',
    params.recentEngagedSignals?.length
      ? `Recent Activity: ${params.recentEngagedSignals.slice(0, 8).join(' | ')}`
      : '',
  ]
    .filter(Boolean)
    .join(' | ');

  const { embedding } = await generateGeminiEmbedding768(userContextText);
  await redisCache.setex(cacheKey, REDIS_TTL.USER_EMBEDDING_SECONDS, embedding);
  return embedding;
}

/**
 * Starts a background Supabase Realtime listener on the server that automatically
 * intercepts any new row inserted into `public.social_posts` without an embedding
 * and generates + persists its 768-dim Gemini embedding vector.
 */
export function startSupabaseVectorEdgeSubscription(): void {
  const sb = getServerSupabase();
  if (!sb || listenerStats.realtimeSubscribed) return;

  try {
    sb.channel('server_vector_edge_listener')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'social_posts' },
        async (eventPayload) => {
          const row = eventPayload.new as Record<string, any> | undefined;
          if (!row || !row.id || row.post_embedding) return;
          await processNewPostVectorEmbedding({
            postId: String(row.id),
            type: row.type,
            category: row.category,
            title: row.title,
            content: row.content || '',
            hashtags: Array.isArray(row.hashtags) ? row.hashtags : [],
            authorCampus: row.author_campus,
          });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          listenerStats.realtimeSubscribed = true;
        }
      });
  } catch {
    // Non-fatal if Realtime isn't enabled on the instance
  }
}

export function getVectorListenerStatus(): VectorListenerStatus {
  return { ...listenerStats };
}
