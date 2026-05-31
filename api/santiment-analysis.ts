// AlphaRange v2 — Santiment context proxy (Vercel serverless function).
//
// Runs server-side so the Santiment API key (SANTIMENT_API_KEY, a Vercel env var)
// is never exposed to the browser. Returns a slow-moving regime modifier
// (volatility multiplier + center bias) for the multi-horizon range grid, plus a
// context snapshot for display. SANBASE PRO has a ~30-day data holdback, so we
// query a window ending ~31 days ago; the frontend weights this toward longer
// horizons (6w/3m) for that reason.

const SANTIMENT_URL = 'https://api.santiment.net/graphql';
const SLUG_RE = /^[a-z0-9-]{1,40}$/;

const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length;
const std = (a: number[]) => {
  const m = mean(a);
  return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / a.length);
};
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

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

    const [sv, mv30, mv180, fr, sent, rv] = await Promise.all([
      fetchSeries(apiKey, 'social_volume_total', slug, from, to),
      fetchSeries(apiKey, 'mvrv_usd_30d', slug, from, to),
      fetchSeries(apiKey, 'mvrv_usd_180d', slug, from, to),
      fetchSeries(apiKey, 'funding_rate', slug, from, to),
      fetchSeries(apiKey, 'sentiment_balance_total', slug, from, to),
      fetchSeries(apiKey, 'price_volatility_2w', slug, from, to),
    ]);

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
      asOf: to,
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
