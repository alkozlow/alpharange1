export interface SantimentContextDetail {
  socialVolumeLast: number;
  socialZ: number;
  socialTrend: 'elevated' | 'normal' | 'quiet' | string;
  /** Period-bound MVRV ratios (coins moved in last 30 / 180 days). */
  mvrv30: number;
  mvrv180: number;
  /** Same MVRVs as signed % deviation from cost basis (ratio − 1). */
  mvrv30Pct: number;
  mvrv180Pct: number;
  valuation: 'overvalued' | 'fair' | 'undervalued' | string;
  sentimentBalance: number;
  fundingRate: number | null;
  fundingZ: number;
  santimentRealizedVol2w: number;
}

export interface SantimentContext {
  available: boolean;
  /** Multiplier on projected volatility (range width). */
  volMultiplier: number;
  /** Period-bound MVRV ratios — grid period-matches these to each horizon. */
  mvrv30: number;
  mvrv180: number;
  /** Raw weighted-sentiment balance (drives a small center tilt). */
  sentimentBalance: number;
  reason?: string;
  /** Window end the metrics are as-of (PRO tier lags ~30 days). */
  asOf?: string;
  /** Source of MVRV data: 'bitcoin-data' (current, BTC only) or 'santiment' (lagged). */
  mvrvSource?: 'bitcoin-data' | 'santiment';
  context?: SantimentContextDetail;
}

const UNAVAILABLE: SantimentContext = {
  available: false,
  volMultiplier: 1,
  mvrv30: 1,
  mvrv180: 1,
  sentimentBalance: 0,
  reason: 'Santiment unavailable',
};

/**
 * Fetch the Santiment regime context for a project slug via the Vercel serverless
 * function at /api/santiment-analysis (which holds the key server-side). On local
 * dev there is no /api route, so this returns the graceful "unavailable" fallback.
 */
export async function getSantimentContext(slug: string): Promise<SantimentContext> {
  try {
    const res = await fetch('/api/santiment-analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug }),
    });
    if (!res.ok) {
      return { ...UNAVAILABLE, reason: `Santiment proxy HTTP ${res.status}` };
    }
    return (await res.json()) as SantimentContext;
  } catch (e) {
    return { ...UNAVAILABLE, reason: e instanceof Error ? e.message : 'Santiment request failed' };
  }
}
