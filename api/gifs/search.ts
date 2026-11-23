import { fetchKlipyCatalog } from '../../server/klipy.js';

interface VercelReq {
  method?: string;
  query?: Record<string, string | string[] | undefined>;
}

interface VercelRes {
  status: (code: number) => { json: (body: unknown) => void };
  setHeader: (name: string, value: string) => void;
}

const getQueryString = (val: string | string[] | undefined, fallback = ''): string => {
  if (Array.isArray(val)) return val[0] ?? fallback;
  return val ?? fallback;
};

export default async function handler(req: VercelReq, res: VercelRes) {
  if (req.method && req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ ok: false, error: 'Method not allowed', items: [] });
    return;
  }

  try {
    const q = getQueryString(req.query?.q, '').trim();
    const page = Math.max(1, Number(getQueryString(req.query?.page, '1')) || 1);
    const perPage = Math.min(36, Math.max(6, Number(getQueryString(req.query?.per_page, '24')) || 24));
    const customerId = getQueryString(req.query?.customer_id, 'bopoi_campus_student').slice(0, 64);

    const result = await fetchKlipyCatalog({
      mode: q ? 'search' : 'trending',
      q,
      page,
      perPage,
      customerId,
    });

    res.setHeader(
      'Cache-Control',
      result.ok ? 'public, s-maxage=120, stale-while-revalidate=240' : 'no-store'
    );
    res.status(result.status).json(result);
  } catch (err: any) {
    res.setHeader('Cache-Control', 'no-store');
    res.status(500).json({
      ok: false,
      configured: Boolean((process.env.KLIPY_API_KEY || '').trim()),
      error: err?.message || 'Failed to search GIFs',
      items: [],
    });
  }
}
