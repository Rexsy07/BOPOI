import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import {
  redisCache,
  REDIS_TTL,
  getAdamicAdarCacheKey,
  invalidateAdamicAdarGraphCache,
} from './src/server/redisCache.ts';
import {
  processNewPostVectorEmbedding,
  getOrCreateUserTowerEmbedding,
  startSupabaseVectorEdgeSubscription,
  getVectorListenerStatus,
  getServerSupabase,
} from './src/server/vectorEdgeListener.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '2mb' }));

  // Start background Supabase Realtime Edge Listener for automatic post vectorization
  startSupabaseVectorEdgeSubscription();

  // ==========================================================================
  // 1. VECTOR GENERATION EDGE LISTENER ENDPOINT (Google Gemini API)
  // Triggered automatically whenever a user creates a new social post/poll/confession
  // ==========================================================================
  app.post('/api/edge/vector-listener', async (req, res) => {
    try {
      const { postId, type, category, title, content, hashtags, authorCampus } = req.body || {};
      if (!postId || !content) {
        res.status(400).json({ error: 'postId and content are required' });
        return;
      }

      const result = await processNewPostVectorEmbedding({
        postId: String(postId),
        type,
        category,
        title,
        content: String(content),
        hashtags: Array.isArray(hashtags) ? hashtags : [],
        authorCampus,
      });

      res.json({
        ok: true,
        postId: result.postId,
        dimensions: result.dimensions,
        model: result.model,
        persistedToSupabase: result.persistedToSupabase,
        cachedInRedis: result.cachedInRedis,
        embedding: result.embedding,
      });
    } catch (err: any) {
      res.status(500).json({
        error: err?.message || 'Vector generation listener failed',
      });
    }
  });

  // ==========================================================================
  // 2. REDIS-CACHED ADAMIC-ADAR 2-HOP GRAPH RECOMMENDATION ENDPOINT
  // Minimizes real-time Supabase RPC/query consumption via L1/Redis caching
  // ==========================================================================
  app.post('/api/retention/pymk', async (req, res) => {
    try {
      const {
        userId,
        username,
        campusId = 'Chrisland University',
        edges = [],
        profiles = [],
        forceRefresh = false,
      } = req.body || {};

      const cacheKey = getAdamicAdarCacheKey(userId || username || 'guest', campusId);

      if (!forceRefresh) {
        const cached = await redisCache.get<any[]>(cacheKey);
        if (cached) {
          res.json({
            ok: true,
            source: 'redis-cache',
            cacheKey,
            candidates: cached,
            telemetry: redisCache.getTelemetry(),
          });
          return;
        }
      }

      const sb = getServerSupabase();
      let scoredCandidates: any[] = [];

      // Attempt Supabase RPC first if valid UUID
      if (sb && userId && /^[0-9a-f-]{36}$/i.test(String(userId))) {
        const { data: rpcRows, error: rpcErr } = await sb.rpc('compute_adamic_adar_candidates', {
          p_user_id: userId,
          p_campus_id: campusId,
        });

        if (!rpcErr && Array.isArray(rpcRows) && rpcRows.length > 0) {
          scoredCandidates = rpcRows.map((profile: any) => {
            let finalGraphScore = parseFloat(String(profile.adamic_adar_score || 0));
            if (profile.is_following_user) {
              finalGraphScore *= 2.5;
            }
            return {
              ...profile,
              finalScore: Number(finalGraphScore.toFixed(4)),
            };
          });
        }
      }

      // Compute Adamic-Adar 2-hop closure over the live edge matrix if RPC returned empty
      if (scoredCandidates.length === 0 && Array.isArray(profiles) && profiles.length > 0) {
        const normMe = String(username || userId || '').toLowerCase();
        const myDirectFollows = new Set<string>();
        const followersOfMe = new Set<string>();
        const outNeighbors = new Map<string, Set<string>>();

        for (const e of edges) {
          const f = String(e.followerUsername || e.followerId || '').toLowerCase();
          const t = String(e.followingUsername || e.followingId || '').toLowerCase();
          if (!f || !t || f === t) continue;

          if (!outNeighbors.has(f)) outNeighbors.set(f, new Set());
          outNeighbors.get(f)!.add(t);

          if (f === normMe || (userId && e.followerId === userId)) {
            myDirectFollows.add(t);
          }
          if (t === normMe || (userId && e.followingId === userId)) {
            followersOfMe.add(f);
          }
        }

        const adamicScores = new Map<string, { score: number; mutuals: string[] }>();

        for (const mutualNode of myDirectFollows) {
          const secondHopSet = outNeighbors.get(mutualNode);
          if (!secondHopSet) continue;
          const outDegree = Math.max(2, secondHopSet.size);
          const weight = 1.0 / Math.log(outDegree + 1);

          for (const targetNode of secondHopSet) {
            if (targetNode === normMe || myDirectFollows.has(targetNode)) continue;
            const current = adamicScores.get(targetNode) || { score: 0, mutuals: [] };
            current.score += weight;
            if (!current.mutuals.includes(mutualNode)) {
              current.mutuals.push(mutualNode);
            }
            adamicScores.set(targetNode, current);
          }
        }

        scoredCandidates = profiles
          .filter((p: any) => {
            const uLower = String(p.username || '').toLowerCase();
            return uLower && uLower !== normMe && !myDirectFollows.has(uLower);
          })
          .map((p: any) => {
            const uLower = String(p.username || '').toLowerCase();
            const graphEntry = adamicScores.get(uLower);
            const baseAdamic = graphEntry ? graphEntry.score : 0.15;
            const sameCampusBoost =
              p.campus &&
              campusId &&
              String(p.campus).toLowerCase() === String(campusId).toLowerCase()
                ? 0.45
                : 0.1;
            const verifiedBoost = p.isVerified ? 0.2 : 0;
            const popularityPrior = Math.log10(Math.max(1, (p.followersCount || 0) + 1)) * 0.12;
            const isFollowingUser = followersOfMe.has(uLower);

            let finalScore = baseAdamic + sameCampusBoost + verifiedBoost + popularityPrior;
            if (isFollowingUser) {
              finalScore *= 2.5;
            }

            return {
              ...p,
              adamicAdarScore: Number(baseAdamic.toFixed(4)),
              mutualCount: graphEntry?.mutuals.length || 0,
              mutualUsernames: graphEntry?.mutuals.slice(0, 3) || [],
              isFollowingYou: isFollowingUser,
              finalScore: Number(finalScore.toFixed(4)),
            };
          })
          .sort((a: any, b: any) => b.finalScore - a.finalScore)
          .slice(0, 50);
      }

      // Store in Redis Cache with TTL (180 seconds)
      await redisCache.setex(cacheKey, REDIS_TTL.ADAMIC_ADAR_GRAPH_SECONDS, scoredCandidates);

      res.json({
        ok: true,
        source: 'computed-and-cached',
        cacheKey,
        candidates: scoredCandidates,
        telemetry: redisCache.getTelemetry(),
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'PYMK graph computation failed' });
    }
  });

  // ==========================================================================
  // 3. REDIS GRAPH CACHE INVALIDATION ENDPOINT
  // ==========================================================================
  app.post('/api/retention/invalidate-graph', async (req, res) => {
    const { userId, username } = req.body || {};
    const removedById = userId ? await invalidateAdamicAdarGraphCache(String(userId)) : 0;
    const removedByUser = username ? await invalidateAdamicAdarGraphCache(String(username)) : 0;
    res.json({
      ok: true,
      invalidatedKeys: removedById + removedByUser,
      telemetry: redisCache.getTelemetry(),
    });
  });

  // ==========================================================================
  // 4. USER TOWER EMBEDDING & 768-DIM TWO-TOWER CANDIDATE RETRIEVAL ENDPOINTS
  // ==========================================================================
  app.post('/api/retention/user-embedding', async (req, res) => {
    try {
      const { userId, campus, bio, interestTags, recentEngagedSignals } = req.body || {};
      const embedding = await getOrCreateUserTowerEmbedding({
        userId: String(userId || 'guest'),
        campus,
        bio,
        interestTags,
        recentEngagedSignals,
      });
      res.json({ ok: true, dimensions: embedding.length, embedding });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to compute user embedding' });
    }
  });

  app.post('/api/retention/feed-candidates', async (req, res) => {
    try {
      const {
        userId = 'guest',
        campus = 'Chrisland University',
        bio = '',
        interestTags = [],
        recentEngagedSignals = [],
        postsSnapshot = [],
      } = req.body || {};

      // 1. Compute or fetch 768-dim User Tower vector from Redis / Gemini
      const userEmbedding = await getOrCreateUserTowerEmbedding({
        userId: String(userId),
        campus: String(campus),
        bio: String(bio),
        interestTags: Array.isArray(interestTags) ? interestTags : [],
        recentEngagedSignals: Array.isArray(recentEngagedSignals) ? recentEngagedSignals : [],
      });

      const signals: Record<
        string,
        { cosineSimilarity: number; serverImpressions?: number; serverClicks?: number }
      > = {};

      // 2. Query Supabase pgvector Two-Tower RPC (`get_personalized_candidates`) first
      const sb = getServerSupabase();
      if (sb) {
        try {
          const { data: rpcCandidates, error: rpcError } = await sb.rpc(
            'get_personalized_candidates',
            {
              p_user_embedding: userEmbedding,
              p_limit: 300,
            }
          );

          if (!rpcError && Array.isArray(rpcCandidates)) {
            for (const row of rpcCandidates) {
              if (!row?.id) continue;
              const rawSim = Number(row.cosine_similarity ?? 0.5);
              signals[String(row.id)] = {
                cosineSimilarity: Number(Math.min(0.99, Math.max(0.15, rawSim)).toFixed(4)),
                serverImpressions: Number(row.impressions_count || 0),
                serverClicks: Number(row.clicks_count || 0),
              };
            }
          }
        } catch {
          // Fallback to server-side 768-dim vector dot product below
        }
      }

      // 3. Compute exact 768-dim cosine similarity for any candidate posts not yet scored by RPC
      if (Array.isArray(postsSnapshot) && postsSnapshot.length > 0) {
        const { buildSemanticHashEmbedding768 } = await import(
          './src/server/vectorEdgeListener.ts'
        );
        const { getPostEmbeddingCacheKey } = await import('./src/server/redisCache.ts');

        for (const item of postsSnapshot.slice(0, 300)) {
          if (!item?.id || signals[item.id]) continue;
          const postId = String(item.id);
          let postVec = await redisCache.get<number[]>(getPostEmbeddingCacheKey(postId));

          if (!postVec || postVec.length !== userEmbedding.length) {
            const compositeText = [
              item.type ? `Type: ${item.type}` : '',
              item.category ? `Category: ${item.category}` : '',
              item.authorCampus ? `Campus: ${item.authorCampus}` : '',
              item.title ? `Title: ${item.title}` : '',
              `Content: ${item.content || ''}`,
              Array.isArray(item.hashtags) && item.hashtags.length > 0
                ? `Tags: ${item.hashtags.join(' ')}`
                : '',
            ]
              .filter(Boolean)
              .join(' | ');
            postVec = buildSemanticHashEmbedding768(compositeText);
          }

          // Both userEmbedding and postVec are unit L2-normalized 768-dim vectors
          let dot = 0;
          const len = Math.min(userEmbedding.length, postVec.length);
          for (let i = 0; i < len; i++) {
            dot += userEmbedding[i] * postVec[i];
          }
          // Map [-1, 1] cosine similarity into [0.15, 0.99] positive ranking affinity
          const normalizedSim = Math.min(0.99, Math.max(0.15, (dot + 1) / 2));
          signals[postId] = {
            cosineSimilarity: Number(normalizedSim.toFixed(4)),
          };
        }
      }

      res.json({
        ok: true,
        dimensions: userEmbedding.length,
        scoredCount: Object.keys(signals).length,
        signals,
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Two-Tower candidate scoring failed' });
    }
  });

  // ==========================================================================
  // 5. CACHE & VECTOR EDGE LISTENER TELEMETRY ENDPOINT
  // ==========================================================================
  app.get('/api/retention/telemetry', (_req, res) => {
    res.json({
      ok: true,
      redis: redisCache.getTelemetry(),
      vectorEdgeListener: getVectorListenerStatus(),
    });
  });

  // ==========================================================================
  // 6. ROOM PROFILE ICON DATABASE SYNC ENDPOINT
  // ==========================================================================
  app.post('/api/rooms/sync-icon', async (req, res) => {
    try {
      const { roomId, roomName, iconEmoji, iconBg } = req.body || {};
      if (!iconEmoji) {
        res.status(400).json({ ok: false, error: 'iconEmoji is required' });
        return;
      }
      const sb = getServerSupabase();
      if (!sb) {
        res.json({ ok: true, persisted: false });
        return;
      }

      let persisted = false;
      const isUuid = Boolean(roomId && /^[0-9a-f-]{36}$/i.test(String(roomId)));

      if (isUuid) {
        const { data: rows, error } = await sb
          .from('community_rooms')
          .update({
            icon_emoji: String(iconEmoji),
            icon_bg: String(iconBg || '#5420F5'),
          })
          .eq('id', String(roomId))
          .select('id');
        if (!error && Array.isArray(rows) && rows.length > 0) {
          persisted = true;
        }
      }

      if (!persisted && roomName && String(roomName).trim()) {
        const { data: byNameRows, error: byNameErr } = await sb
          .from('community_rooms')
          .update({
            icon_emoji: String(iconEmoji),
            icon_bg: String(iconBg || '#5420F5'),
          })
          .ilike('name', String(roomName).trim())
          .select('id');
        if (!byNameErr && Array.isArray(byNameRows) && byNameRows.length > 0) {
          persisted = true;
        }
      }

      res.json({ ok: true, persisted });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err?.message || 'Room icon sync failed' });
    }
  });

  // Mount Vite dev server middleware or static production build
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Bopoi Argon Engine] Full-stack server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
