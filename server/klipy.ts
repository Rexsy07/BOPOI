export interface NormalizedKlipyGifItem {
  id: string;
  title: string;
  previewUrl: string;
  url: string;
  mp4Url?: string;
  width?: number;
  height?: number;
}

export interface KlipyCatalogResult {
  ok: boolean;
  configured: boolean;
  status: number;
  source?: 'cache' | 'klipy';
  error?: string;
  items: NormalizedKlipyGifItem[];
  hasNext: boolean;
}

const memoryCache = new Map<string, { value: { items: NormalizedKlipyGifItem[]; hasNext: boolean }; expiresAt: number }>();

async function cacheGet(key: string): Promise<{ items: NormalizedKlipyGifItem[]; hasNext: boolean } | null> {
  const local = memoryCache.get(key);
  if (local && local.expiresAt > Date.now()) {
    return local.value;
  }
  memoryCache.delete(key);

  const url = (process.env.UPSTASH_REDIS_REST_URL || '').trim();
  const token = (process.env.UPSTASH_REDIS_REST_TOKEN || '').trim();
  if (!url || !token) return null;

  try {
    const res = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const json: any = await res.json();
    if (!json?.result) return null;
    const parsed = typeof json.result === 'string' ? JSON.parse(json.result) : json.result;
    if (parsed && Array.isArray(parsed.items)) {
      memoryCache.set(key, { value: parsed, expiresAt: Date.now() + 120_000 });
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

async function cacheSetEx(
  key: string,
  ttlSeconds: number,
  value: { items: NormalizedKlipyGifItem[]; hasNext: boolean }
): Promise<void> {
  memoryCache.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });

  const url = (process.env.UPSTASH_REDIS_REST_URL || '').trim();
  const token = (process.env.UPSTASH_REDIS_REST_TOKEN || '').trim();
  if (!url || !token) return;

  try {
    await fetch(`${url}/set/${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ value: JSON.stringify(value), ex: ttlSeconds }),
    });
  } catch {
    // ignore transient Redis cache errors
  }
}

function normalizeUrl(rawUrl?: unknown): string | undefined {
  if (typeof rawUrl !== 'string') return undefined;
  const trimmed = rawUrl.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith('//')) return `https:${trimmed}`;
  return trimmed;
}

export function normalizeKlipyGifItem(raw: any): NormalizedKlipyGifItem | null {
  if (!raw || typeof raw !== 'object') return null;

  const filesObj = raw.file || raw.files || null;
  const legacyFormats = raw.media_formats || null;

  const pickTierUrl = (tier: any) => {
    if (!tier || typeof tier !== 'object') return undefined;
    return (
      normalizeUrl(tier.gif?.url) ||
      normalizeUrl(tier.webp?.url) ||
      normalizeUrl(tier.jpg?.url) ||
      normalizeUrl(tier.mp4?.url) ||
      normalizeUrl(tier.webm?.url) ||
      undefined
    );
  };

  let url: string | undefined;
  let previewUrl: string | undefined;
  let mp4Url: string | undefined;
  let width: number | undefined;
  let height: number | undefined;

  if (filesObj && typeof filesObj === 'object') {
    const gifGroup = filesObj.gif;
    const webpGroup = filesObj.webp;
    const mp4Group = filesObj.mp4;

    if (gifGroup || webpGroup || mp4Group) {
      const bestGif = gifGroup?.md || gifGroup?.sm || gifGroup?.hd || gifGroup?.xs;
      const smallPreview =
        webpGroup?.sm ||
        gifGroup?.sm ||
        webpGroup?.md ||
        gifGroup?.md ||
        bestGif;
      const bestMp4 = mp4Group?.sm || mp4Group?.md || mp4Group?.hd;

      url =
        normalizeUrl(bestGif?.url) ||
        normalizeUrl(webpGroup?.md?.url) ||
        normalizeUrl(webpGroup?.sm?.url) ||
        normalizeUrl(webpGroup?.hd?.url) ||
        normalizeUrl(bestMp4?.url);
      previewUrl = normalizeUrl(smallPreview?.url) || url;
      mp4Url = normalizeUrl(bestMp4?.url);
      width = Number(bestGif?.width || smallPreview?.width) || undefined;
      height = Number(bestGif?.height || smallPreview?.height) || undefined;
    } else {
      url =
        pickTierUrl(filesObj.md) ||
        pickTierUrl(filesObj.sm) ||
        pickTierUrl(filesObj.hd) ||
        pickTierUrl(filesObj.xs);
      previewUrl =
        normalizeUrl(filesObj.sm?.webp?.url) ||
        normalizeUrl(filesObj.sm?.gif?.url) ||
        normalizeUrl(filesObj.xs?.webp?.url) ||
        normalizeUrl(filesObj.xs?.gif?.url) ||
        normalizeUrl(filesObj.md?.webp?.url) ||
        normalizeUrl(filesObj.md?.gif?.url) ||
        url;
      mp4Url =
        normalizeUrl(filesObj.sm?.mp4?.url) ||
        normalizeUrl(filesObj.md?.mp4?.url) ||
        normalizeUrl(filesObj.xs?.mp4?.url) ||
        normalizeUrl(filesObj.hd?.mp4?.url);
      const dimsSource = filesObj.md?.gif || filesObj.sm?.gif || filesObj.hd?.gif;
      width = Number(dimsSource?.width) || undefined;
      height = Number(dimsSource?.height) || undefined;
    }
  } else if (legacyFormats && typeof legacyFormats === 'object') {
    const mainFmt = legacyFormats.mediumgif || legacyFormats.gif || legacyFormats.tinygif;
    const tinyFmt = legacyFormats.tinygif || legacyFormats.nanogif || mainFmt;
    const mp4Fmt = legacyFormats.tinymp4 || legacyFormats.mp4;
    url = normalizeUrl(mainFmt?.url) || normalizeUrl(mp4Fmt?.url);
    previewUrl = normalizeUrl(tinyFmt?.url) || url;
    mp4Url = normalizeUrl(mp4Fmt?.url);
    const dims = Array.isArray(mainFmt?.dims) ? mainFmt.dims : [];
    width = Number(mainFmt?.width || dims[0]) || undefined;
    height = Number(mainFmt?.height || dims[1]) || undefined;
  }

  if (!url) return null;

  return {
    id: String(raw.id || raw.slug || `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`),
    title: String(raw.title || 'GIF').trim() || 'GIF',
    previewUrl: String(previewUrl || url),
    url: String(url),
    mp4Url: mp4Url ? String(mp4Url) : undefined,
    width,
    height,
  };
}

export async function fetchKlipyCatalog(params: {
  mode: 'trending' | 'search';
  q?: string;
  page: number;
  perPage: number;
  customerId: string;
}): Promise<KlipyCatalogResult> {
  const apiKey = (process.env.KLIPY_API_KEY || '').trim();
  if (!apiKey) {
    return {
      ok: false,
      configured: false,
      status: 503,
      error: 'KLIPY_API_KEY is not configured yet on the server.',
      items: [],
      hasNext: false,
    };
  }

  const { mode, q = '', page, perPage, customerId } = params;
  const normalizedQuery = q.trim().toLowerCase();
  const cacheKey =
    mode === 'trending'
      ? `klipy:trending:p${page}:n${perPage}`
      : `klipy:search:${normalizedQuery}:p${page}:n${perPage}`;

  const cached = await cacheGet(cacheKey);
  if (cached && Array.isArray(cached.items)) {
    return {
      ok: true,
      configured: true,
      status: 200,
      source: 'cache',
      items: cached.items,
      hasNext: cached.hasNext,
    };
  }

  const qs = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
    customer_id: customerId,
  });
  if (mode === 'search' && q.trim()) {
    qs.set('q', q.trim());
  }

  const endpoint =
    mode === 'trending'
      ? `https://api.klipy.com/api/v1/${encodeURIComponent(apiKey)}/gifs/trending?${qs.toString()}`
      : `https://api.klipy.com/api/v1/${encodeURIComponent(apiKey)}/gifs/search?${qs.toString()}`;

  const upstream = await fetch(endpoint, {
    headers: { Accept: 'application/json' },
  });

  if (!upstream.ok) {
    const errText = await upstream.text().catch(() => '');
    return {
      ok: false,
      configured: true,
      status: upstream.status,
      error: errText || `Klipy API responded with status ${upstream.status}`,
      items: [],
      hasNext: false,
    };
  }

  const json: any = await upstream.json();
  const rawList = Array.isArray(json?.data?.data)
    ? json.data.data
    : Array.isArray(json?.data)
    ? json.data
    : Array.isArray(json?.results)
    ? json.results
    : [];

  const items = rawList.map(normalizeKlipyGifItem).filter(Boolean) as NormalizedKlipyGifItem[];
  const hasNext = Boolean(json?.data?.has_next);

  await cacheSetEx(cacheKey, mode === 'trending' ? 300 : 180, {
    items,
    hasNext,
  });

  return {
    ok: true,
    configured: true,
    status: 200,
    source: 'klipy',
    items,
    hasNext,
  };
}
