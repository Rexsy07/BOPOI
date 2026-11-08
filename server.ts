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
  // 4. USER TOWER EMBEDDING GENERATION ENDPOINT
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
