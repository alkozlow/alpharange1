// AlphaRange v2 — multi-horizon range grid engine.
//
// Generalizes the single-range formula in calculations.ts
//   range = centralTrend ± (dailyVol × √days × SDmultiplier × centralTrend)
// into a 2D grid: rows = SD width, columns = time horizon (2w/4w/6w/3m).
//
// Two forecasting refinements over naive √t scaling:
//  1. GARCH term-structure damping — variance mean-reverts toward the long-run
//     level, so 3-month bands don't balloon the way √t would predict when
//     current volatility sits above its long-run average.
//  2. Drift-aware centering — longer-horizon columns shift their center by the
//     momentum/technical drift, so 6w/3m reflect trend, not just a flat EMA.

import { PriceAnalyzer } from './calculations';
import { MonteCarloSimulator } from './monteCarloSimulator';
import { backtestCoverage } from './backtestRange';
import type { TechnicalIndicators } from '@/types/uniswap';

export interface HorizonDef {
  key: '2w' | '4w' | '6w' | '3m';
  label: string;
  days: number;
}

export const HORIZONS: HorizonDef[] = [
  { key: '2w', label: '2 weeks', days: 14 },
  { key: '4w', label: '4 weeks', days: 28 },
  { key: '6w', label: '6 weeks', days: 42 },
  { key: '3m', label: '3 months', days: 90 },
];

export const SD_WIDTHS = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0];

export interface RangeCell {
  sdWidth: number;
  horizon: HorizonDef;
  minPrice: number;
  maxPrice: number;
  /** Half-width as a ± percentage of the cell center. */
  widthPct: number;
  /** % of trailing daily closes that fell inside [min,max] (historical coverage). */
  inRangeHistPct: number;
  /** Analytic probability the price stays in range over the horizon (forward). */
  successProb: number;
}

export interface RangeGrid {
  centralTrend: number;
  currentPrice: number;
  /** Daily volatility used as the base (recent, GARCH-enhanced). */
  dailyVolatility: number;
  /** Long-run daily volatility (full-sample) — the mean-reversion target. */
  longRunVolatility: number;
  /** Annualized drift applied to longer-horizon centers. */
  drift: number;
  horizons: HorizonDef[];
  sdWidths: number[];
  /** cells[horizonIndex][sdIndex] */
  cells: RangeCell[][];
}

/**
 * Cumulative volatility over `days` under a mean-reverting (GARCH-like) term
 * structure. With φ the daily variance persistence, the k-day-ahead variance
 * forecast reverts from the current level toward the long-run level:
 *   var(t+k) = longRunVar + φ^k · (currentVar − longRunVar)
 * and the horizon volatility is √(Σ var(t+k)). Reduces to currentVol·√days when
 * current and long-run variance coincide.
 */
function projectedVolatility(
  currentDailyVol: number,
  longRunDailyVol: number,
  persistence: number,
  days: number
): number {
  const currentVar = currentDailyVol * currentDailyVol;
  const longRunVar = longRunDailyVol * longRunDailyVol;
  const phi = Math.min(0.999, Math.max(0, persistence));

  let cumulativeVar = 0;
  for (let k = 1; k <= days; k++) {
    cumulativeVar += longRunVar + Math.pow(phi, k) * (currentVar - longRunVar);
  }
  return Math.sqrt(Math.max(0, cumulativeVar));
}

/**
 * External regime context (e.g. Santiment). Because Santiment PRO data lags ~30
 * days, this is a slow-moving modifier weighted toward longer horizons — applied
 * almost fully at 3 months, only lightly at 2 weeks. MVRV is period-matched: the
 * 30-day metric drives short horizons, the 180-day metric the 3-month column.
 */
export interface ContextModifier {
  /** Multiplier on projected volatility (range width). 1 = no change. */
  volMultiplier: number;
  /** Period-bound MVRV ratios (centered at 1.0 = cost basis). */
  mvrv30: number;
  mvrv180: number;
  /** Weighted-sentiment balance (drives a small center tilt). */
  sentimentBalance: number;
}

const clampN = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

/**
 * Gentler horizon weight for the directional (center) bias than for width: a
 * valuation/MVRV regime persists longer than a volatility spike, so we keep a
 * meaningful directional tilt even on the near-term columns (floor 0.4 vs 0.15).
 */
function centerWeight(days: number): number {
  return clampN(0.4 + 0.6 * (days / 90), 0.4, 1);
}

/**
 * MVRV + sentiment center bias (fractional), before center weighting.
 *
 * MVRV mean-reversion: below cost basis (negative %) biases the center UP, above
 * biases it DOWN. The long-term (180d) MVRV sets the dominant direction; the
 * short-term (30d) reinforces that direction and dominates the near-term columns.
 * When both periods agree in sign (both under- or both over-valued) the signal is
 * amplified — e.g. both negative → stronger up, both positive → stronger crash risk.
 * When they diverge (long negative, short positive) the near-term columns express a
 * short-term uptrend riding the long-term undervaluation.
 */
function rawCenterBias(ctx: ContextModifier, days: number): number {
  const sShort = ctx.mvrv30 - 1; // deviation from cost basis (e.g. +0.016 = +1.6%)
  const sLong = ctx.mvrv180 - 1;
  const SCALE = 0.15;

  const longSignedMag = -Math.tanh(sLong / SCALE); // negative long MVRV → +up
  const shortDir = Math.sign(-sLong) || 0; // short reinforces the long-term direction
  const shortMag = Math.tanh(Math.abs(sShort) / SCALE);
  const agree = (sShort < 0 && sLong < 0) || (sShort > 0 && sLong > 0);
  const amp = agree ? 1.3 : 1.0;

  // Blend short→long across horizons: near-term weights the 30d signal, 3-month the 180d.
  const t = clampN((days - 30) / (180 - 30), 0, 1);
  const mvrvBias = amp * (0.04 * longSignedMag * t + 0.04 * shortDir * shortMag * (1 - t));

  const sentimentPart = 0.02 * Math.tanh(ctx.sentimentBalance / 200);
  return clampN(sentimentPart + mvrvBias, -0.06, 0.06);
}

/** Final horizon-weighted center bias from external context (e.g. Santiment). */
export function contextCenterBias(ctx: ContextModifier, days: number): number {
  return rawCenterBias(ctx, days) * centerWeight(days);
}

export interface BuildGridOptions {
  technicalIndicators?: TechnicalIndicators;
  contextModifier?: ContextModifier;
}

/** How strongly the context modifier applies at a given horizon (light short, full long). */
function horizonWeight(days: number): number {
  return Math.max(0.15, Math.min(1, days / 90));
}

export function buildRangeGrid(prices: number[], options: BuildGridOptions = {}): RangeGrid {
  if (prices.length < 30) {
    throw new Error('Insufficient price data for multi-horizon analysis (need ≥30 days)');
  }

  const { technicalIndicators, contextModifier } = options;

  const currentPrice = prices[prices.length - 1];
  const centralTrend = PriceAnalyzer.calculateEMA(prices, Math.min(14, prices.length));

  const returns = PriceAnalyzer.calculateReturns(prices);
  const currentDailyVol = PriceAnalyzer.calculateEnhancedVolatility(returns, prices);
  const longRunDailyVol = PriceAnalyzer.calculateStandardDeviation(returns);

  // Daily variance persistence: prefer the fitted GARCH value, else a typical 0.94.
  const persistence = technicalIndicators?.garchVolatility?.persistence ?? 0.94;

  // Annualized drift from momentum + technical indicators, clamped ±0.2 by the simulator.
  const drift = MonteCarloSimulator.calculateDynamicDrift(prices, technicalIndicators);

  // estimateRangeSuccess scales diffusion as vol×√(dt) with dt in years, so it
  // needs annualized volatility for consistent units.
  const annualizedVol = currentDailyVol * Math.sqrt(365);
  // Leaner sim count keeps the 24-cell grid responsive (cell count × sims × 28 steps).
  const SUCCESS_SIMS = 2000;

  const cells: RangeCell[][] = HORIZONS.map((horizon) => {
    // Width (social/funding) is damped hard near-term (volatility spikes go stale fast);
    // the directional MVRV/sentiment center bias persists longer, so it uses a gentler weight.
    const wVol = horizonWeight(horizon.days);
    const volMult = contextModifier ? 1 + (contextModifier.volMultiplier - 1) * wVol : 1;
    const centerBias = contextModifier ? contextCenterBias(contextModifier, horizon.days) : 0;

    const projVol =
      projectedVolatility(currentDailyVol, longRunDailyVol, persistence, horizon.days) * volMult;
    // Drift shifts the center; effect grows with horizon length. Context biases it further.
    const center = centralTrend * (1 + drift * (horizon.days / 365)) * (1 + centerBias);
    const timeHorizonYears = horizon.days / 365;
    const horizonAnnualVol = annualizedVol * volMult;

    return SD_WIDTHS.map((sdWidth) => {
      const halfWidth = projVol * sdWidth * center;
      const minPrice = Math.max(0, center - halfWidth);
      const maxPrice = center + halfWidth;
      const widthPct = center > 0 ? (halfWidth / center) * 100 : 0;

      const inRangeHistPct = backtestCoverage(prices, minPrice, maxPrice, horizon.days);
      const successProb = MonteCarloSimulator.estimateRangeSuccess(
        currentPrice,
        minPrice,
        maxPrice,
        horizonAnnualVol,
        timeHorizonYears,
        SUCCESS_SIMS
      );

      return {
        sdWidth,
        horizon,
        minPrice,
        maxPrice,
        widthPct,
        inRangeHistPct,
        successProb,
      };
    });
  });

  return {
    centralTrend,
    currentPrice,
    dailyVolatility: currentDailyVol,
    longRunVolatility: longRunDailyVol,
    drift,
    horizons: HORIZONS,
    sdWidths: SD_WIDTHS,
    cells,
  };
}
