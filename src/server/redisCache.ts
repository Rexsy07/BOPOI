/**
 * Enterprise Redis Caching Layer for Adamic-Adar Graph Scores,
 * Two-Tower User/Post Embeddings, and Multi-Armed Bandit Feed Pools.
 *
 * Automatically connects to Upstash/Redis REST endpoints if configured
 * (`UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`), and falls back
 * seamlessly to a bounded in-memory LRU + TTL cache store with sub-millisecond
 * read latency to minimize real-time Supabase RPC/query load.
 */

interface CacheEntry<T = unknown> {
  value: T;
  expiresAt: number;
  lastAccessedAt: number;
}

export interface RedisCacheTelemetry {
  hits: number;
  misses: number;
  writes: number;
  invalidations: number;
  activeKeys: number;
  hitRate: number;
}

class TieredRedisCache {
  private memoryStore = new Map<string, CacheEntry>();
  private readonly maxEntries: number;
  private hits = 0;
  private misses = 0;
  private writes = 0;
  private invalidations = 0;

  private readonly restUrl = process.env.UPSTASH_REDIS_REST_URL || '';
  private readonly restToken = process.env.UPSTASH_REDIS_REST_TOKEN || '';

  constructor(maxEntries = 2500) {
    this.maxEntries = maxEntries;
  }

  private get isRemoteConfigured(): boolean {
    return Boolean(this.restUrl && this.restToken);
  }

  private evictIfNeeded(): void {
    const now = Date.now();
    for (const [k, entry] of this.memoryStore.entries()) {
      if (entry.expiresAt <= now) {
        this.memoryStore.delete(k);
      }
    }
    if (this.memoryStore.size < this.maxEntries) return;

    // Evict least-recently accessed key (LRU)
    let oldestKey: string | null = null;
    let oldestTs = Infinity;
    for (const [k, entry] of this.memoryStore.entries()) {
      if (entry.lastAccessedAt < oldestTs) {
        oldestTs = entry.lastAccessedAt;
        oldestKey = k;
      }
    }
    if (oldestKey) {
      this.memoryStore.delete(oldestKey);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const now = Date.now();
    const local = this.memoryStore.get(key);
    if (local) {
      if (local.expiresAt > now) {
        local.lastAccessedAt = now;
        this.hits++;
        return local.value as T;
      }
      this.memoryStore.delete(key);
    }

    if (this.isRemoteConfigured) {
      try {
        const res = await fetch(`${this.restUrl}/get/${encodeURIComponent(key)}`, {
          headers: { Authorization: `Bearer ${this.restToken}` },
        });
        if (res.ok) {
          const body = (await res.json()) as { result?: string | null };
          if (body.result) {
            const parsed = JSON.parse(body.result) as T;
            this.memoryStore.set(key, {
              value: parsed,
              expiresAt: now + 60_000,
              lastAccessedAt: now,
            });
            this.hits++;
            return parsed;
          }
        }
      } catch {
        // Fallback to miss on network error
      }
    }

    this.misses++;
    return null;
  }

  async setex<T>(key: string, ttlSeconds: number, value: T): Promise<void> {
    this.evictIfNeeded();
    const now = Date.now();
    this.memoryStore.set(key, {
      value,
      expiresAt: now + ttlSeconds * 1000,
      lastAccessedAt: now,
    });
    this.writes++;

    if (this.isRemoteConfigured) {
      try {
        await fetch(
          `${this.restUrl}/setex/${encodeURIComponent(key)}/${Math.max(1, Math.floor(ttlSeconds))}`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${this.restToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(value),
          }
        );
      } catch {
        // Local L1 cache already updated
      }
    }
  }

  async del(key: string): Promise<void> {
    if (this.memoryStore.delete(key)) {
      this.invalidations++;
    }
    if (this.isRemoteConfigured) {
      try {
        await fetch(`${this.restUrl}/del/${encodeURIComponent(key)}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${this.restToken}` },
        });
      } catch {
        // ignore
      }
    }
  }

  async invalidatePrefix(prefix: string): Promise<number> {
    let removed = 0;
    for (const key of Array.from(this.memoryStore.keys())) {
      if (key.startsWith(prefix)) {
        this.memoryStore.delete(key);
        removed++;
      }
    }
    this.invalidations += removed;
    return removed;
  }

  getTelemetry(): RedisCacheTelemetry {
    const now = Date.now();
    for (const [k, entry] of this.memoryStore.entries()) {
      if (entry.expiresAt <= now) {
        this.memoryStore.delete(k);
      }
    }
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      writes: this.writes,
      invalidations: this.invalidations,
      activeKeys: this.memoryStore.size,
      hitRate: total > 0 ? Number(((this.hits / total) * 100).toFixed(2)) : 0,
    };
  }
}

export const redisCache = new TieredRedisCache(3000);

// Domain-specific Redis Cache Keys & TTLs
export const REDIS_TTL = {
  ADAMIC_ADAR_GRAPH_SECONDS: 180, // 3 minutes TTL for PYMK Adamic-Adar scores
  POST_EMBEDDING_SECONDS: 86_400, // 24 hours TTL for 768-d post vectors
  USER_EMBEDDING_SECONDS: 600, // 10 minutes TTL for user interest vectors
};

export function getAdamicAdarCacheKey(userId: string, campusId: string): string {
  const normUser = (userId || 'guest').trim().toLowerCase();
  const normCampus = (campusId || 'all').trim().toLowerCase();
  return `pymk:adamic_adar:${normUser}:${normCampus}`;
}

export function getPostEmbeddingCacheKey(postId: string): string {
  return `vec:post768:${postId}`;
}

export function getUserEmbeddingCacheKey(userId: string): string {
  return `vec:user768:${userId}`;
}

/**
 * Invalidates cached Adamic-Adar graph scores when a user follows or unfollows someone
 * so the 2-hop triadic closure matrix reflects the new edge immediately.
 */
export async function invalidateAdamicAdarGraphCache(userId?: string): Promise<number> {
  if (userId) {
    return redisCache.invalidatePrefix(`pymk:adamic_adar:${userId.trim().toLowerCase()}:`);
  }
  return redisCache.invalidatePrefix('pymk:adamic_adar:');
}
