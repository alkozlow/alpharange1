import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CoinGeckoService } from '@/services/coinGeckoService';
import { PriceAnalyzer } from '@/utils/calculations';
import { buildRangeGrid, type RangeGrid, type RangeCell } from '@/utils/rangeGrid';
import { getSantimentContext, type SantimentContext } from '@/services/santimentContextService';
import { REFERENCE_PAIRS, PAIR_IDS, formatFeeTier, type PairId } from '@/config/pairs';
import type { TechnicalIndicators } from '@/types/uniswap';

function formatPrice(value: number): string {
  if (!Number.isFinite(value)) return '—';
  if (value >= 1000) return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (value >= 1) return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  return value.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 6 });
}

// Background tint by forward success probability (0..1) — green high, amber mid, red low.
function cellTint(successProb: number): string {
  if (successProb >= 0.85) return 'bg-emerald-500/15 hover:bg-emerald-500/25';
  if (successProb >= 0.65) return 'bg-lime-500/12 hover:bg-lime-500/22';
  if (successProb >= 0.45) return 'bg-amber-500/12 hover:bg-amber-500/22';
  return 'bg-rose-500/12 hover:bg-rose-500/22';
}

export function MultiHorizonForecast() {
  const [selectedPair, setSelectedPair] = useState<PairId | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [grid, setGrid] = useState<RangeGrid | null>(null);
  const [indicators, setIndicators] = useState<TechnicalIndicators | null>(null);
  const [santiment, setSantiment] = useState<SantimentContext | null>(null);
  const [selectedCell, setSelectedCell] = useState<{ h: number; s: number } | null>(null);

  const pair = selectedPair ? REFERENCE_PAIRS[selectedPair] : null;

  async function handleSelectPair(id: PairId) {
    setSelectedPair(id);
    setLoading(true);
    setError(null);
    setGrid(null);
    setSantiment(null);
    setSelectedCell(null);

    const p = REFERENCE_PAIRS[id];
    try {
      let prices = (await CoinGeckoService.getHistoricalPrices(p.baseCoinGeckoId, p.quoteCoinGeckoId, 365))
        .map((d) => d.price)
        .filter((v) => v > 0);

      // Fall back to a deeper-liquidity proxy id if the primary returned thin data.
      if (prices.length < 30 && p.fallbackBaseCoinGeckoId) {
        prices = (await CoinGeckoService.getHistoricalPrices(p.fallbackBaseCoinGeckoId, p.quoteCoinGeckoId, 365))
          .map((d) => d.price)
          .filter((v) => v > 0);
      }

      if (prices.length < 30) {
        throw new Error('Not enough price history returned for this pair.');
      }

      const ti = PriceAnalyzer.calculateTechnicalIndicators(prices);

      // Santiment context (crypto pairs only) — applied as a horizon-weighted modifier.
      let ctx: SantimentContext | null = null;
      if (p.hasSantiment && p.santimentSlug) {
        ctx = await getSantimentContext(p.santimentSlug);
      }

      const g = buildRangeGrid(prices, {
        technicalIndicators: ti,
        contextModifier: ctx?.available
          ? {
              volMultiplier: ctx.volMultiplier,
              mvrv30: ctx.mvrv30,
              mvrv180: ctx.mvrv180,
              sentimentBalance: ctx.sentimentBalance,
            }
          : undefined,
      });
      setIndicators(ti);
      setSantiment(ctx);
      setGrid(g);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to build forecast.');
    } finally {
      setLoading(false);
    }
  }

  const annualizedVolPct = grid ? (grid.dailyVolatility * Math.sqrt(365) * 100).toFixed(1) : null;
  const driftPct = grid ? (grid.drift * 100).toFixed(1) : null;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">Multi-Horizon Range Forecast</h1>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground underline">
            ← Pool / position analyzer
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">
          Forward-looking Uniswap v3 ranges across volatility widths (rows) and time horizons (columns).
          Each cell: suggested min–max, ± width, historical in-range %, and forward stay-in-range probability.
        </p>
      </header>

      {/* Pair selector */}
      <div className="flex flex-wrap gap-2">
        {PAIR_IDS.map((id) => (
          <Button
            key={id}
            variant={selectedPair === id ? 'default' : 'outline'}
            onClick={() => handleSelectPair(id)}
            disabled={loading}
          >
            {REFERENCE_PAIRS[id].label}
          </Button>
        ))}
      </div>

      {loading && <p className="text-sm text-muted-foreground">Fetching prices and simulating…</p>}
      {error && <p className="text-sm text-rose-500">{error}</p>}

      {pair && grid && !loading && (
        <>
          {/* Summary header */}
          <Card className="p-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
              <Stat label="Current price" value={`$${formatPrice(grid.currentPrice)}`} />
              <Stat label="Trend (14d EMA)" value={`$${formatPrice(grid.centralTrend)}`} />
              <Stat label="Volatility (ann.)" value={`${annualizedVolPct}%`} />
              <Stat label="Drift (ann.)" value={`${driftPct}%`} />
              <Stat label="Regime" value={indicators?.volatilityRegime ?? '—'} capitalize />
            </div>
          </Card>

          {pair.hasSantiment && <SantimentPanel ctx={santiment} />}

          {/* The 2D grid: rows = SD width, columns = horizon */}
          <Card className="p-4 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="p-2 text-left font-medium text-muted-foreground">Range width</th>
                  {grid.horizons.map((h) => (
                    <th key={h.key} className="p-2 text-center font-medium">{h.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grid.sdWidths.map((sd, sIdx) => (
                  <tr key={sd} className="border-t border-border">
                    <td className="p-2 align-top">
                      <div className="font-medium">{sd.toFixed(1)}σ</div>
                      <div className="text-xs text-muted-foreground">{sdLabel(sd)}</div>
                    </td>
                    {grid.horizons.map((h, hIdx) => {
                      const cell = grid.cells[hIdx][sIdx];
                      const isSel = selectedCell?.h === hIdx && selectedCell?.s === sIdx;
                      return (
                        <td
                          key={h.key}
                          onClick={() => setSelectedCell({ h: hIdx, s: sIdx })}
                          className={`p-2 cursor-pointer text-center transition-colors ${cellTint(cell.successProb)} ${isSel ? 'ring-2 ring-primary ring-inset' : ''}`}
                        >
                          <CellBody cell={cell} />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <Legend />
          </Card>

          {/* Pools backing this pair */}
          <Card className="p-4">
            <div className="mb-2 flex items-center gap-2">
              <h2 className="font-semibold">Your pools for {pair.label}</h2>
              {pair.hasSantiment ? (
                <Badge variant={santiment?.available ? 'secondary' : 'outline'}>
                  {santiment?.available ? 'Santiment context: applied' : 'Santiment: unavailable'}
                </Badge>
              ) : (
                <Badge variant="outline">Santiment: n/a (FX pair)</Badge>
              )}
              {pair.hasOptions && <Badge variant="secondary">Options IV: available</Badge>}
            </div>
            <ul className="space-y-1 text-sm">
              {pair.pools.map((pool) => (
                <li key={pool.address} className="flex flex-wrap items-center gap-2">
                  <span>{pool.label}</span>
                  <Badge variant="outline">{formatFeeTier(pool.feeTier)}</Badge>
                  <code className="text-xs text-muted-foreground">{pool.address}</code>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">
              Forecast is per-pair (shared across same-pair pools). Fee-APY backtesting per pool comes
              with the next phase, since the {pair.pools.length > 1 ? 'differing fee tiers' : 'fee tier'} change earnings for the same range.
            </p>
          </Card>
        </>
      )}

      {!selectedPair && !loading && (
        <Card className="p-8 text-center text-muted-foreground">
          Select a pair above to generate its multi-horizon forecast grid.
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value, capitalize }: { label: string; value: string; capitalize?: boolean }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-lg font-semibold ${capitalize ? 'capitalize' : ''}`}>{value}</div>
    </div>
  );
}

function CellBody({ cell }: { cell: RangeCell }) {
  return (
    <div className="space-y-0.5">
      <div className="font-medium whitespace-nowrap">
        {formatPrice(cell.minPrice)} – {formatPrice(cell.maxPrice)}
      </div>
      <div className="text-xs text-muted-foreground">±{cell.widthPct.toFixed(1)}%</div>
      <div className="text-xs">
        <span title="Historical in-range coverage">in {cell.inRangeHistPct.toFixed(0)}%</span>
        {'  ·  '}
        <span title="Forward stay-in-range probability">stay {(cell.successProb * 100).toFixed(0)}%</span>
      </div>
    </div>
  );
}

function Legend() {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <span><strong>±%</strong> half-width vs center</span>
      <span><strong>in</strong> = historical days inside range</span>
      <span><strong>stay</strong> = simulated probability price never exits over the horizon</span>
      <span className="ml-auto">tint = stay-probability (green high → red low)</span>
    </div>
  );
}

function SantimentPanel({ ctx }: { ctx: SantimentContext | null }) {
  if (!ctx) return null;

  if (!ctx.available) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold">Santiment context</h2>
          <Badge variant="outline">unavailable</Badge>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {ctx.reason ?? 'No data returned.'} The grid falls back to the price model only.
        </p>
      </Card>
    );
  }

  const c = ctx.context!;
  const fmtPct = (x: number) => `${x >= 0 ? '+' : ''}${x.toFixed(1)}%`;

  // Full-effect (3-month) center bias, using the 180-day MVRV + sentiment.
  const sentimentPart = 0.02 * Math.tanh(c.sentimentBalance / 200);
  const mvrvPart3m = -0.04 * Math.tanh((c.mvrv180 - 1) / 0.3);
  const biasFull = Math.max(-0.06, Math.min(0.06, sentimentPart + mvrvPart3m));

  return (
    <Card className="p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h2 className="font-semibold">Santiment context</h2>
        <Badge variant="secondary">social: {c.socialTrend}</Badge>
        <Badge variant="secondary">valuation: {c.valuation}</Badge>
        <span className="text-xs text-muted-foreground">as of {ctx.asOf}</span>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
        <Stat label="Social vol (z)" value={c.socialZ.toFixed(2)} />
        <Stat label="MVRV 30d" value={fmtPct(c.mvrv30Pct)} />
        <Stat label="MVRV 180d" value={fmtPct(c.mvrv180Pct)} />
        <Stat label="Sentiment bal." value={c.sentimentBalance.toFixed(0)} />
        <Stat label="Santiment RV (2w)" value={`${(c.santimentRealizedVol2w * 100).toFixed(1)}%`} />
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Applied as a regime modifier: range width up to {fmtPct((ctx.volMultiplier - 1) * 100)} and
        center bias up to {fmtPct(biasFull * 100)} at the 3-month horizon. MVRV is period-matched
        (30-day for near-term columns → 180-day for 3-month) and shown as % above/below cost basis.
        Effect is weighted toward longer horizons because Santiment data lags ~30 days, so the 2-week
        column is barely affected.
      </p>
    </Card>
  );
}

function sdLabel(sd: number): string {
  switch (sd) {
    case 0.5: return 'ultra tight';
    case 1.0: return 'tight';
    case 1.5: return 'moderate';
    case 2.0: return 'wide';
    case 2.5: return 'very wide';
    case 3.0: return 'full';
    default: return '';
  }
}
