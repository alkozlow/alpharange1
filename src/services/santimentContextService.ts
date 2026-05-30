export interface SantimentContextDetail {
  socialVolumeLast: number;
  socialZ: number;
  socialTrend: 'elevated' | 'normal' | 'quiet' | string;
  mvrv: number;
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
  /** Fractional shift of the range center. */
  centerBias: number;
  reason?: string;
  /** Window end the metrics are as-of (PRO tier lags ~30 days). */
  asOf?: string;
  context?: SantimentContextDetail;
}

const UNAVAILABLE: SantimentContext = {
  available: false,
  volMultiplier: 1,
  centerBias: 0,
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
