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

  const apiKey = process.env.SANTIMENT_API_KEY;
  if (!apiKey) {
    res.status(200).json(unavailable('SANTIMENT_API_KEY not configured'));
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

    const [sv, mv, fr, sent, rv] = await Promise.all([
      fetchSeries(apiKey, 'social_volume_total', slug, from, to),
      fetchSeries(apiKey, 'mvrv_usd', slug, from, to),
      fetchSeries(apiKey, 'funding_rate', slug, from, to),
      fetchSeries(apiKey, 'sentiment_balance_total', slug, from, to),
      fetchSeries(apiKey, 'price_volatility_2w', slug, from, to),
    ]);

    if (sv.length < 10) {
      res.status(200).json(unavailable('Insufficient Santiment history for slug'));
      return;
    }

    const last = (a: number[]) => a[a.length - 1];
    const socialZ = std(sv) > 0 ? clamp((last(sv) - mean(sv)) / std(sv), -3, 3) : 0;
    const fundingZ = fr.length > 1 && std(fr) > 0 ? clamp((last(fr) - mean(fr)) / std(fr), -3, 3) : 0;
    const mvrvLast = mv.length ? last(mv) : 1;
    const sentLast = sent.length ? last(sent) : 0;
    const rvLast = rv.length ? last(rv) : 0;

    // Volatility multiplier: social-volume spikes and extreme funding widen ranges.
    const socialComponent = 0.08 * clamp(socialZ, -1.5, 2.5);
    const fundingComponent = clamp(0.04 * Math.abs(fundingZ), 0, 0.1);
    const volMultiplier = clamp(1 + socialComponent + fundingComponent, 0.85, 1.4);

    // Center bias: weighted sentiment tilt + MVRV mean-reversion (overvalued → down).
    const sentimentPart = 0.02 * Math.tanh(sentLast / 200);
    const mvrvPart = -0.04 * Math.tanh((mvrvLast - 1.2) / 1.0);
    const centerBias = clamp(sentimentPart + mvrvPart, -0.06, 0.06);

    const socialTrend = socialZ > 1 ? 'elevated' : socialZ < -1 ? 'quiet' : 'normal';
    const valuation = mvrvLast > 2 ? 'overvalued' : mvrvLast < 1 ? 'undervalued' : 'fair';

    res.status(200).json({
      available: true,
      volMultiplier,
      centerBias,
      asOf: to,
      context: {
        socialVolumeLast: last(sv),
        socialZ,
        socialTrend,
        mvrv: mvrvLast,
        valuation,
        sentimentBalance: sentLast,
        fundingRate: fr.length ? last(fr) : null,
        fundingZ,
        santimentRealizedVol2w: rvLast,
      },
    });
  } catch (error) {
    console.error('santiment-analysis error:', error);
    res.status(200).json(unavailable('Santiment request failed'));
  }
}
