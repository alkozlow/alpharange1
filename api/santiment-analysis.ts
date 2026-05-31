// AlphaRange v2 — Santiment context proxy (Vercel serverless function).
//
// Runs server-side so the Santiment API key (SANTIMENT_API_KEY, a Vercel env var)
// is never exposed to the browser. Returns a slow-moving regime modifier
// (volatility multiplier + center bias) for the multi-horizon range grid, plus a
// context snapshot for display. SANBASE PRO has a ~30-day data holdback, so we
// query a window ending ~31 days ago; the frontend weights this toward longer
// horizons (6w/3m) for that reason.
//
// For BTC: fetch current MVRV (STH/LTH) from bitcoin-data.com (free, ~2-day lag)
// to avoid Santiment's 30-day holdback. Cache aggressively to stay within the
// 10 req/hour free tier limit.

const SANTIMENT_URL = 'https://api.santiment.net/graphql';
const BITCOIN_DATA_URL = 'https://bitcoin-data.com/v1';
const SLUG_RE = /^[a-z0-9-]{1,40}$/;

const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length;
const std = (a: number[]) => {
  const m = mean(a);
  return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / a.length);
};
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

// Simple in-memory cache for bitcoin-data.com (10 req/hour limit). Each entry
// stores the fetched value + timestamp. Purge stale entries after 30 minutes.
type CacheEntry = { value: number; timestamp: number; asOf?: string };
const mvrvCache: Record<string, CacheEntry> = {};
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

function getCached(key: string): CacheEntry | null {
  const entry = mvrvCache[key];
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    delete mvrvCache[key];
    return null;
  }
  return entry;
}

function setCached(key: string, value: number, asOf?: string) {
  mvrvCache[key] = { value, timestamp: Date.now(), asOf };
}

async function fetchSeries(
  apiKey: string,
  metric: string,
  slug: string,
  from: string,
  to: string
): Promise<number[]> {
  const query = `{ getMetric(metric:"${metric}"){ timeseriesData(slug:"${slug}" from:"${from}" to:"${to}" interval:"1d"){ value } } }`;
  const res = await fetch(SANTIMENT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Apikey ${apiKey}` },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`Santiment HTTP ${res.status}`);
  const json = await res.json();
  const data = json?.data?.getMetric?.timeseriesData;
  if (!Array.isArray(data)) return [];
  return data.map((d: { value: number | null }) => d.value).filter((v: number | null): v is number => v != null);
}

// Fetch current MVRV from bitcoin-data.com. Returns { value, asOf } where asOf
// is the date of the latest data point. Cache aggressively due to 10 req/hour limit.
async function fetchBitcoinDataMVRV(type: 'sth' | 'lth'): Promise<{ value: number; asOf: string } | null> {
  const cacheKey = `btc-${type}-mvrv`;
  const cached = getCached(cacheKey);
  if (cached) {
    return { value: cached.value, asOf: cached.asOf || new Date().toISOString().split('T')[0] };
  }

  try {
    const endpoint = type === 'sth' ? 'sth-mvrv/last' : 'lth-mvrv/last';
    const res = await fetch(`${BITCOIN_DATA_URL}/${endpoint}`);
    if (!res.ok) return null;
    const data = await res.json();

    // Expect: { data: { value: number, date: string } } or { value: number, date: string }
    const value = data?.data?.value ?? data?.value;
    const date = data?.data?.date ?? data?.date;

    if (typeof value === 'number' && date) {
      setCached(cacheKey, value, date);
      return { value, asOf: date };
    }
    return null;
  } catch (error) {
    console.error(`bitcoin-data.com ${type} MVRV fetch failed:`, error);
    return null;
  }
}

const unavailable = (reason: string) => ({ available: false, volMultiplier: 1, centerBias: 0, reason });

// Vercel Node serverless handler. req/res are typed loosely to avoid a build-time
// dependency on @vercel/node types.
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Accept the canonical name plus the common "sentiment" misspelling.
  const apiKey = process.env.SANTIMENT_API_KEY || process.env.SENTIMENT_API_KEY;
  if (!apiKey) {
    res.status(200).json(
      unavailable('API key not configured (looked for SANTIMENT_API_KEY / SENTIMENT_API_KEY)')
    );
    return;
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body ?? {};
  const slug: string = (body.slug ?? '').trim();
  if (!SLUG_RE.test(slug)) {
    res.status(400).json({ error: 'Invalid slug' });
    return;
  }

  try {
    // PRO tier: query a 90-day window ending ~31 days ago (inside the holdback).
    const from = 'utc_now-121d';
    const to = 'utc_now-31d';

    // For BTC, fetch current MVRV from bitcoin-data.com (free, ~2-day lag) instead
    // of Santiment's ~30-day lagged data. STH ≈ short-term (30d), LTH ≈ long-term (180d).
    let btcAsOfDate: string | null = null;
    let mv30: number[] = [];
    let mv180: number[] = [];

    if (slug === 'bitcoin') {
      const [sthData, lthData] = await Promise.all([
        fetchBitcoinDataMVRV('sth'),
        fetchBitcoinDataMVRV('lth'),
      ]);

      if (sthData) {
        // Treat STH ratio as a proxy for short-term (30d-ish)
        mv30 = [sthData.value];
        btcAsOfDate = sthData.asOf;
      }
      if (lthData) {
        // Treat LTH ratio as a proxy for long-term (180d-ish)
        mv180 = [lthData.value];
        if (!btcAsOfDate) btcAsOfDate = lthData.asOf;
      }
    }

    // Fetch all other metrics from Santiment (social_volume, funding_rate, sentiment, realized_vol).
    const [sv, fr, sent, rv] = await Promise.all([
      fetchSeries(apiKey, 'social_volume_total', slug, from, to),
      fetchSeries(apiKey, 'funding_rate', slug, from, to),
      fetchSeries(apiKey, 'sentiment_balance_total', slug, from, to),
      fetchSeries(apiKey, 'price_volatility_2w', slug, from, to),
    ]);

    // For non-BTC or if bitcoin-data.com failed, fall back to Santiment MVRV.
    if (mv30.length === 0 || mv180.length === 0) {
      const [santMv30, santMv180] = await Promise.all([
        fetchSeries(apiKey, 'mvrv_usd_30d', slug, from, to),
        fetchSeries(apiKey, 'mvrv_usd_180d', slug, from, to),
      ]);
      if (mv30.length === 0) mv30 = santMv30;
      if (mv180.length === 0) mv180 = santMv180;
    }

    if (sv.length < 10) {
      res.status(200).json(unavailable('Insufficient Santiment history for slug'));
      return;
    }

    // Use the median of the last several days as the "current level" rather than a
    // single boundary point — the final daily bucket at `to` is often partial and
    // would otherwise produce garbage z-scores. Also suits a slow-moving signal.
    const recent = (a: number[], k = 7): number => {
      if (a.length === 0) return 0;
      const s = a.slice(-k).sort((x, y) => x - y);
      return s[Math.floor(s.length / 2)];
    };
    const socialLevel = recent(sv);
    const socialZ = std(sv) > 0 ? clamp((socialLevel - mean(sv)) / std(sv), -3, 3) : 0;
    const fundingLevel = recent(fr);
    const fundingZ = fr.length > 1 && std(fr) > 0 ? clamp((fundingLevel - mean(fr)) / std(fr), -3, 3) : 0;
    // Period-bound MVRV ratios (coins moved in the last 30 / 180 days). Centered at
    // 1.0 (= cost basis). The grid period-matches these to each horizon column.
    // For BTC, these come from bitcoin-data.com (current); for others, from Santiment (lagged).
    const mvrv30 = mv30.length ? recent(mv30) : 1;
    const mvrv180 = mv180.length ? recent(mv180) : 1;
    const sentLast = sent.length ? recent(sent) : 0;
    const rvLast = rv.length ? recent(rv) : 0;

    // Volatility multiplier (range width): social-volume spikes and extreme funding widen.
    const socialComponent = 0.08 * clamp(socialZ, -1.5, 2.5);
    const fundingComponent = clamp(0.04 * Math.abs(fundingZ), 0, 0.1);
    const volMultiplier = clamp(1 + socialComponent + fundingComponent, 0.85, 1.4);

    const socialTrend = socialZ > 1 ? 'elevated' : socialZ < -1 ? 'quiet' : 'normal';
    const valuation = mvrv30 > 1.05 ? 'overvalued' : mvrv30 < 0.95 ? 'undervalued' : 'fair';

    res.status(200).json({
      available: true,
      volMultiplier,
      // Raw center-bias ingredients — grid period-matches MVRV per horizon.
      mvrv30,
      mvrv180,
      sentimentBalance: sentLast,
      asOf: btcAsOfDate || to, // Use bitcoin-data.com date for BTC, Santiment date otherwise.
      mvrvSource: btcAsOfDate ? 'bitcoin-data' : 'santiment', // Indicate data source.
      context: {
        socialVolumeLast: socialLevel,
        socialZ,
        socialTrend,
        mvrv30,
        mvrv180,
        mvrv30Pct: (mvrv30 - 1) * 100,
        mvrv180Pct: (mvrv180 - 1) * 100,
        valuation,
        sentimentBalance: sentLast,
        fundingRate: fundingLevel || null,
        fundingZ,
        santimentRealizedVol2w: rvLast,
      },
    });
  } catch (error) {
    console.error('santiment-analysis error:', error);
    res.status(200).json(unavailable('Santiment request failed'));
  }
}
