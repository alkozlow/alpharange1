// AlphaRange v2 — historical coverage backtest for a candidate range.
//
// Honest, cheap metric: over a trailing lookback window, what fraction of daily
// closes fell inside [minPrice, maxPrice]? This is "how often would this band
// have contained the price recently", not a path-dependent fee simulation.
//
// The lookback scales with the forecast horizon (longer forecasts are judged
// against more history) but is bounded by the data available.

export function backtestCoverage(
  prices: number[],
  minPrice: number,
  maxPrice: number,
  horizonDays: number
): number {
  if (prices.length === 0 || maxPrice <= minPrice) return 0;

  // Judge against roughly 2× the horizon, with sensible floor/ceiling.
  const lookback = Math.min(prices.length, Math.max(60, horizonDays * 2));
  const window = prices.slice(-lookback);

  let inRange = 0;
  for (const p of window) {
    if (p >= minPrice && p <= maxPrice) inRange++;
  }
  return (inRange / window.length) * 100;
}
