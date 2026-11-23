import 'dotenv/config';
import express from 'express';
import fs from 'fs';
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
import { fetchKlipyCatalog } from './server/klipy.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOM_MEDIA_DIR = '/tmp/bopoi-room-media';

try {
  if (!fs.existsSync(ROOM_MEDIA_DIR)) {
    fs.mkdirSync(ROOM_MEDIA_DIR, { recursive: true });
  }
} catch {
  // Ignore if read-only fs
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '35mb' }));

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

  // ==========================================================================
  // 7. ROOM IMAGE & VIDEO UPLOAD + STREAMING ENDPOINTS
  // ==========================================================================
  app.post('/api/rooms/upload-media', async (req, res) => {
    try {
      const { dataUrl, mimeType, mediaType, roomId } = req.body || {};
      if (!dataUrl || typeof dataUrl !== 'string') {
        res.status(400).json({ ok: false, error: 'dataUrl is required' });
        return;
      }

      const base64MarkerIdx = dataUrl.indexOf(';base64,');
      if (!dataUrl.startsWith('data:') || base64MarkerIdx === -1) {
        res.status(400).json({ ok: false, error: 'Invalid base64 dataUrl format' });
        return;
      }

      const headerMime = dataUrl.slice(5, base64MarkerIdx).split(';')[0].trim();
      const detectedMime = String(mimeType || headerMime || 'application/octet-stream')
        .split(';')[0]
        .trim()
        .toLowerCase();
      const base64Payload = dataUrl.slice(base64MarkerIdx + 8);
      const buffer = Buffer.from(base64Payload, 'base64');

      const resolvedType: 'image' | 'video' =
        mediaType === 'video' || detectedMime.startsWith('video/') ? 'video' : 'image';

      const extMap: Record<string, string> = {
        'image/jpeg': 'jpg',
        'image/jpg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp',
        'image/gif': 'gif',
        'image/avif': 'avif',
        'image/heic': 'jpg',
        'image/heif': 'jpg',
        'video/mp4': 'mp4',
        'video/webm': 'webm',
        'video/quicktime': 'mov',
        'video/x-m4v': 'mp4',
        'video/ogg': 'ogv',
        'video/3gpp': 'mp4',
      };
      const ext = extMap[detectedMime] || (resolvedType === 'video' ? 'mp4' : 'jpg');
      const cleanRoom = String(roomId || 'room')
        .replace(/[^a-zA-Z0-9_-]/g, '')
        .slice(0, 24);
      const fileName = `${cleanRoom}_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 8)}.${ext}`;

      // 1. Try uploading to Supabase Storage (`avatars` or `room-media` bucket) if configured
      const sb = getServerSupabase();
      if (sb) {
        for (const bucketName of ['avatars', 'room-media']) {
          try {
            const storagePath = `room-media/${fileName}`;
            const { error: upErr } = await sb.storage
              .from(bucketName)
              .upload(storagePath, buffer, {
                contentType: detectedMime,
                upsert: true,
              });
            if (!upErr) {
              const { data: pubData } = sb.storage.from(bucketName).getPublicUrl(storagePath);
              if (pubData?.publicUrl) {
                res.json({
                  ok: true,
                  mediaUrl: pubData.publicUrl,
                  mediaType: resolvedType,
                  source: `supabase-storage:${bucketName}`,
                });
                return;
              }
            }
          } catch {
            // Try next bucket or fallback to local server media streaming below
          }
        }
      }

      // 2. Save to local server media directory and serve via `/api/rooms/media/:fileName`
      const filePath = path.join(ROOM_MEDIA_DIR, fileName);
      fs.writeFileSync(filePath, buffer);

      res.json({
        ok: true,
        mediaUrl: `/api/rooms/media/${fileName}`,
        mediaType: resolvedType,
        source: 'server-media-store',
      });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err?.message || 'Media upload failed' });
    }
  });

  app.post('/api/rooms/send-message', async (req, res) => {
    try {
      const {
        roomId,
        authorUserId,
        authorName,
        authorUsername,
        authorAvatar,
        authorCampus,
        authorMaskEmoji,
        authorAlias,
        isAnonymous,
        text,
        replyToId,
        replyToAuthorName,
        replyToText,
      } = req.body || {};

      if (!roomId || typeof text !== 'string') {
        res.status(400).json({ ok: false, error: 'roomId and text are required' });
        return;
      }

      const sb = getServerSupabase();
      if (!sb || !/^[0-9a-f-]{36}$/i.test(String(roomId))) {
        res.json({ ok: true, persisted: false });
        return;
      }

      const validUserUuid =
        authorUserId && /^[0-9a-f-]{36}$/i.test(String(authorUserId))
          ? String(authorUserId)
          : null;
      const validReplyUuid =
        replyToId && /^[0-9a-f-]{36}$/i.test(String(replyToId)) ? String(replyToId) : null;

      let { data: inserted, error } = await sb
        .from('room_messages')
        .insert({
          room_id: String(roomId),
          author_user_id: validUserUuid,
          author_name: String(authorName || 'Anonymous Student'),
          author_username: String(authorUsername || 'anon_student'),
          author_avatar: authorAvatar || null,
          author_campus: authorCampus || null,
          author_mask_emoji: authorMaskEmoji || null,
          author_alias: authorAlias || null,
          is_anonymous: Boolean(isAnonymous ?? true),
          text,
          reply_to_id: validReplyUuid,
          reply_to_author_name: replyToAuthorName || null,
          reply_to_text: replyToText || null,
        })
        .select('id')
        .single();

      if (error && validUserUuid) {
        const retry = await sb
          .from('room_messages')
          .insert({
            room_id: String(roomId),
            author_user_id: null,
            author_name: String(authorName || 'Anonymous Student'),
            author_username: String(authorUsername || 'anon_student'),
            author_avatar: authorAvatar || null,
            author_campus: authorCampus || null,
            author_mask_emoji: authorMaskEmoji || null,
            author_alias: authorAlias || null,
            is_anonymous: Boolean(isAnonymous ?? true),
            text,
            reply_to_id: validReplyUuid,
            reply_to_author_name: replyToAuthorName || null,
            reply_to_text: replyToText || null,
          })
          .select('id')
          .single();
        inserted = retry.data;
        error = retry.error;
      }

      res.json({
        ok: !error && Boolean(inserted?.id),
        persisted: !error && Boolean(inserted?.id),
        id: inserted?.id || null,
      });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err?.message || 'Room message persist failed' });
    }
  });

  app.get('/api/rooms/media/:fileName', (req, res) => {
    try {
      const safeName = path.basename(String(req.params.fileName || ''));
      const filePath = path.join(ROOM_MEDIA_DIR, safeName);
      if (!safeName || !fs.existsSync(filePath)) {
        res.status(404).end();
        return;
      }

      const ext = path.extname(safeName).toLowerCase().replace('.', '');
      const mimeMap: Record<string, string> = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        webp: 'image/webp',
        gif: 'image/gif',
        mp4: 'video/mp4',
        webm: 'video/webm',
        mov: 'video/quicktime',
        ogv: 'video/ogg',
      };
      const contentType = mimeMap[ext] || 'application/octet-stream';
      const stat = fs.statSync(filePath);
      const fileSize = stat.size;
      const range = req.headers.range;

      // Support HTTP byte-range requests for smooth HTML5 <video> scrubbing & playback
      if (range && contentType.startsWith('video/')) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = end - start + 1;
        const fileStream = fs.createReadStream(filePath, { start, end });
        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=86400',
        });
        fileStream.pipe(res);
        return;
      }

      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=86400',
      });
      fs.createReadStream(filePath).pipe(res);
    } catch {
      res.status(500).end();
    }
  });

  // ==========================================================================
  // 8. MODERATION REPORTS & LIVE TWO-WAY TICKET CHAT ENDPOINTS
  // ==========================================================================
  const REPORTS_STORE_FILE = '/tmp/bopoi-reports-store.json';

  const readServerReportsStore = (): any[] => {
    try {
      if (!fs.existsSync(REPORTS_STORE_FILE)) return [];
      const raw = fs.readFileSync(REPORTS_STORE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const writeServerReportsStore = (items: any[]) => {
    try {
      fs.writeFileSync(REPORTS_STORE_FILE, JSON.stringify(items.slice(0, 500)), 'utf-8');
    } catch {
      // Ignore read-only fs errors
    }
  };

  const formatRelTs = (ts: number) => {
    const mins = Math.floor(Math.max(0, Date.now() - ts) / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const serializeEnvelope = (rep: any) =>
    `__BOPOI_CASE_V1__:${JSON.stringify({
      __v: 1,
      notes: rep.adminNotes || undefined,
      targetPreview: rep.targetPreview || undefined,
      reporterLastReadAt: rep.reporterLastReadAt || undefined,
      moderatorLastReadAt: rep.moderatorLastReadAt || undefined,
      messages: Array.isArray(rep.ticketMessages) ? rep.ticketMessages : [],
    })}`;

  const parseEnvelope = (raw?: string | null) => {
    if (!raw || typeof raw !== 'string') return { ticketMessages: [] as any[] };
    if (raw.startsWith('__BOPOI_CASE_V1__:')) {
      try {
        const parsed = JSON.parse(raw.slice('__BOPOI_CASE_V1__:'.length));
        return {
          adminNotes: typeof parsed.notes === 'string' ? parsed.notes : undefined,
          targetPreview: typeof parsed.targetPreview === 'string' ? parsed.targetPreview : undefined,
          reporterLastReadAt:
            typeof parsed.reporterLastReadAt === 'number' ? parsed.reporterLastReadAt : undefined,
          moderatorLastReadAt:
            typeof parsed.moderatorLastReadAt === 'number' ? parsed.moderatorLastReadAt : undefined,
          ticketMessages: Array.isArray(parsed.messages) ? parsed.messages : [],
        };
      } catch {
        return { adminNotes: raw, ticketMessages: [] as any[] };
      }
    }
    return { adminNotes: raw, ticketMessages: [] as any[] };
  };

  const mapSupabaseReportRow = (r: any) => {
    const parsed = parseEnvelope(r.admin_notes);
    const createdTs = r.created_at ? new Date(r.created_at).getTime() : Date.now();
    return {
      id: r.id,
      reporterUserId: r.reporter_user_id || undefined,
      reporterUsername: r.reporter_username || undefined,
      targetType: r.target_type || 'social_post',
      targetId: r.target_id || '',
      targetPreview: parsed.targetPreview,
      reason: r.reason || '',
      status: r.status || 'pending',
      adminNotes: parsed.adminNotes,
      ticketMessages: parsed.ticketMessages,
      reporterLastReadAt: parsed.reporterLastReadAt,
      moderatorLastReadAt: parsed.moderatorLastReadAt,
      createdAt: formatRelTs(createdTs),
      createdTimestamp: createdTs,
      resolvedAt: r.resolved_at ? formatRelTs(new Date(r.resolved_at).getTime()) : undefined,
    };
  };

  app.get('/api/reports', async (req, res) => {
    try {
      const isAdmin = req.query.isAdmin === 'true';
      const userId = String(req.query.userId || '').trim();
      const username = String(req.query.username || '').trim().toLowerCase();

      const localStore = readServerReportsStore();
      let remoteRows: any[] = [];
      const sb = getServerSupabase();

      if (sb) {
        try {
          if (isAdmin) {
            const { data } = await sb
              .from('moderation_reports')
              .select('*')
              .order('created_at', { ascending: false })
              .limit(150);
            if (Array.isArray(data)) remoteRows = data.map(mapSupabaseReportRow);
          } else if (userId || username) {
            let query = sb
              .from('moderation_reports')
              .select('*')
              .order('created_at', { ascending: false })
              .limit(100);
            if (userId && /^[0-9a-f-]{36}$/i.test(userId) && username) {
              query = query.or(`reporter_user_id.eq.${userId},reporter_username.ilike.${username}`);
            } else if (userId && /^[0-9a-f-]{36}$/i.test(userId)) {
              query = query.eq('reporter_user_id', userId);
            } else if (username) {
              query = query.ilike('reporter_username', username);
            }
            const { data } = await query;
            if (Array.isArray(data)) remoteRows = data.map(mapSupabaseReportRow);
          }
        } catch {
          // Fall back cleanly to local server store
        }
      }

      const filteredLocal = isAdmin
        ? localStore
        : localStore.filter((r) => {
            if (userId && r.reporterUserId === userId) return true;
            if (username && String(r.reporterUsername || '').toLowerCase() === username) return true;
            return false;
          });

      const mergedMap = new Map<string, any>();
      [...filteredLocal, ...remoteRows].forEach((r) => {
        const prev = mergedMap.get(r.id);
        if (!prev) {
          mergedMap.set(r.id, r);
          return;
        }
        const msgMap = new Map<string, any>();
        [...(prev.ticketMessages || []), ...(r.ticketMessages || [])].forEach((m: any) =>
          msgMap.set(m.id, m)
        );
        mergedMap.set(r.id, {
          ...prev,
          ...r,
          status: r.status !== 'pending' ? r.status : prev.status,
          targetPreview: r.targetPreview || prev.targetPreview,
          adminNotes: r.adminNotes || prev.adminNotes,
          reporterLastReadAt:
            Math.max(prev.reporterLastReadAt || 0, r.reporterLastReadAt || 0) || undefined,
          moderatorLastReadAt:
            Math.max(prev.moderatorLastReadAt || 0, r.moderatorLastReadAt || 0) || undefined,
          ticketMessages: Array.from(msgMap.values()).sort(
            (a: any, b: any) => (a.createdTimestamp || 0) - (b.createdTimestamp || 0)
          ),
        });
      });

      const reports = Array.from(mergedMap.values()).sort(
        (a, b) => (b.createdTimestamp || 0) - (a.createdTimestamp || 0)
      );
      res.json({ ok: true, reports });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err?.message || 'Failed to fetch reports' });
    }
  });

  app.post('/api/reports/create', async (req, res) => {
    try {
      const report = req.body?.report;
      if (!report || !report.id) {
        res.status(400).json({ ok: false, error: 'report payload is required' });
        return;
      }

      const store = readServerReportsStore();
      const idx = store.findIndex((r) => r.id === report.id);
      if (idx >= 0) {
        store[idx] = { ...store[idx], ...report };
      } else {
        store.unshift(report);
      }
      writeServerReportsStore(store);

      const sb = getServerSupabase();
      let canonicalId = report.id;
      if (sb) {
        try {
          const validReporterUuid =
            report.reporterUserId && /^[0-9a-f-]{36}$/i.test(String(report.reporterUserId))
              ? String(report.reporterUserId)
              : null;
          const envelope = serializeEnvelope(report);
          const { data: inserted } = await sb
            .from('moderation_reports')
            .insert({
              ...( /^[0-9a-f-]{36}$/i.test(String(report.id)) ? { id: String(report.id) } : {}),
              reporter_user_id: validReporterUuid,
              reporter_username: report.reporterUsername || 'student',
              target_type: report.targetType || 'social_post',
              target_id: String(report.targetId || report.id),
              reason: String(report.reason || 'Reported content'),
              status: report.status || 'pending',
              admin_notes: envelope,
            })
            .select('id')
            .maybeSingle();

          if (inserted?.id) {
            canonicalId = inserted.id;
          }
        } catch {
          // Local server store already saved it
        }
      }

      res.json({ ok: true, id: canonicalId });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err?.message || 'Failed to create report' });
    }
  });

  app.post('/api/reports/message', async (req, res) => {
    try {
      const { reportId, message, fullReport } = req.body || {};
      if (!reportId || !message || typeof message.text !== 'string') {
        res.status(400).json({ ok: false, error: 'reportId and message are required' });
        return;
      }

      const store = readServerReportsStore();
      const idx = store.findIndex((r) => r.id === reportId);
      const baseReport =
        idx >= 0
          ? store[idx]
          : fullReport || {
              id: reportId,
              targetType: 'support_ticket',
              targetId: reportId,
              reason: message.text,
              status: 'pending',
              createdAt: 'Just now',
              createdTimestamp: Date.now(),
              ticketMessages: [],
            };

      const existingMsgs = Array.isArray(baseReport.ticketMessages)
        ? baseReport.ticketMessages
        : [];
      const hasMsg = existingMsgs.some((m: any) => m.id === message.id);
      const nextMessages = hasMsg ? existingMsgs : [...existingMsgs, message];
      const updatedReport = {
        ...baseReport,
        ticketMessages: nextMessages,
        reporterLastReadAt:
          message.senderRole === 'reporter'
            ? message.createdTimestamp || Date.now()
            : baseReport.reporterLastReadAt,
        moderatorLastReadAt:
          message.senderRole === 'moderator'
            ? message.createdTimestamp || Date.now()
            : baseReport.moderatorLastReadAt,
      };

      if (idx >= 0) {
        store[idx] = updatedReport;
      } else {
        store.unshift(updatedReport);
      }
      writeServerReportsStore(store);

      const sb = getServerSupabase();
      if (sb && /^[0-9a-f-]{36}$/i.test(String(reportId))) {
        try {
          const envelope = serializeEnvelope(updatedReport);
          await sb
            .from('moderation_reports')
            .update({ admin_notes: envelope })
            .eq('id', String(reportId));

          if (
            message.senderRole === 'moderator' &&
            updatedReport.reporterUserId &&
            /^[0-9a-f-]{36}$/i.test(String(updatedReport.reporterUserId))
          ) {
            await sb.from('notifications').insert({
              recipient_user_id: String(updatedReport.reporterUserId),
              type: 'report_reply',
              title: 'Moderator replied to your ticket',
              body: String(message.text).slice(0, 120),
              target_view: 'inbox',
              target_id: String(reportId),
              actor_name: String(message.senderName || 'Campus Moderator'),
              actor_username: String(message.senderUsername || 'moderator'),
              is_anonymous: false,
            });
          }
        } catch {
          // Local store still synced
        }
      }

      res.json({ ok: true, report: updatedReport });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err?.message || 'Failed to save report message' });
    }
  });

  app.post('/api/reports/read', async (req, res) => {
    try {
      const { reportId, viewerRole, timestamp } = req.body || {};
      if (!reportId || !viewerRole) {
        res.status(400).json({ ok: false, error: 'reportId and viewerRole are required' });
        return;
      }
      const ts = Number(timestamp) || Date.now();
      const store = readServerReportsStore();
      const idx = store.findIndex((r) => r.id === reportId);
      if (idx >= 0) {
        store[idx] = {
          ...store[idx],
          ...(viewerRole === 'reporter' ? { reporterLastReadAt: ts } : { moderatorLastReadAt: ts }),
        };
        writeServerReportsStore(store);
      }
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err?.message || 'Failed to mark report read' });
    }
  });

  app.post('/api/reports/resolve', async (req, res) => {
    try {
      const { reportId, status, systemMessage, adminNotes, fullReport } = req.body || {};
      if (!reportId || !status) {
        res.status(400).json({ ok: false, error: 'reportId and status are required' });
        return;
      }

      const store = readServerReportsStore();
      const idx = store.findIndex((r) => r.id === reportId);
      const baseReport = idx >= 0 ? store[idx] : fullReport || { id: reportId, ticketMessages: [] };
      const existingMsgs = Array.isArray(baseReport.ticketMessages)
        ? baseReport.ticketMessages
        : [];
      const nextMessages =
        systemMessage && !existingMsgs.some((m: any) => m.id === systemMessage.id)
          ? [...existingMsgs, systemMessage]
          : existingMsgs;

      const updatedReport = {
        ...baseReport,
        status,
        adminNotes: adminNotes ?? baseReport.adminNotes,
        resolvedAt: 'Just now',
        ticketMessages: nextMessages,
      };

      if (idx >= 0) {
        store[idx] = updatedReport;
      } else {
        store.unshift(updatedReport);
      }
      writeServerReportsStore(store);

      const sb = getServerSupabase();
      if (sb && /^[0-9a-f-]{36}$/i.test(String(reportId))) {
        try {
          const envelope = serializeEnvelope(updatedReport);
          await sb
            .from('moderation_reports')
            .update({
              status,
              admin_notes: envelope,
              resolved_at: new Date().toISOString(),
            })
            .eq('id', String(reportId));

          if (
            updatedReport.reporterUserId &&
            /^[0-9a-f-]{36}$/i.test(String(updatedReport.reporterUserId))
          ) {
            await sb.from('notifications').insert({
              recipient_user_id: String(updatedReport.reporterUserId),
              type: 'report_status_updated',
              title: `Ticket marked as ${status}`,
              body:
                systemMessage?.text ||
                `Campus Moderation updated your report status to ${status}.`,
              target_view: 'inbox',
              target_id: String(reportId),
              actor_name: 'Campus Moderation',
              actor_username: 'moderator',
              is_anonymous: false,
            });
          }
        } catch {
          // Local store synced
        }
      }

      res.json({ ok: true, report: updatedReport });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err?.message || 'Failed to resolve report' });
    }
  });

  // ==========================================================================
  // 9. KLIPY GIF SEARCH & TRENDING PROXY ENDPOINTS (Cached, Key Protected)
  // ==========================================================================
  app.get('/api/gifs/trending', async (req, res) => {
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const perPage = Math.min(36, Math.max(6, Number(req.query.per_page) || 24));
      const customerId = String(req.query.customer_id || 'bopoi_campus_student').slice(0, 64);

      const result = await fetchKlipyCatalog({
        mode: 'trending',
        page,
        perPage,
        customerId,
      });
      res.status(result.status).json(result);
    } catch (err: any) {
      res.status(500).json({
        ok: false,
        configured: Boolean((process.env.KLIPY_API_KEY || '').trim()),
        error: err?.message || 'Failed to fetch trending GIFs',
        items: [],
      });
    }
  });

  app.get('/api/gifs/search', async (req, res) => {
    try {
      const q = String(req.query.q || '').trim();
      const page = Math.max(1, Number(req.query.page) || 1);
      const perPage = Math.min(36, Math.max(6, Number(req.query.per_page) || 24));
      const customerId = String(req.query.customer_id || 'bopoi_campus_student').slice(0, 64);

      const result = await fetchKlipyCatalog({
        mode: q ? 'search' : 'trending',
        q,
        page,
        perPage,
        customerId,
      });
      res.status(result.status).json(result);
    } catch (err: any) {
      res.status(500).json({
        ok: false,
        configured: Boolean((process.env.KLIPY_API_KEY || '').trim()),
        error: err?.message || 'Failed to search GIFs',
        items: [],
      });
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
