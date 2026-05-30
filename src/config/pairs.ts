// AlphaRange v2 — hardcoded reference pairs.
//
// The app v2 focuses on three pairs only: BTC/USD, ETH/USD, EUR/USD.
// Each pair forecasts price/volatility once (per-pair, from CoinGecko), but can
// hold several real Uniswap v3 pools. Fee APY backtesting is per-pool because
// fee tiers differ (0.05% vs 0.30% earn very differently for the same range).
//
// Pool token/fee/chain values were decoded on-chain via RPC (token0/token1/fee).

import type { ChainKey } from './chains';

export interface PairPool {
  /** Uniswap v3 pool contract address (lowercase). */
  address: string;
  /** Chain key — must exist in SUPPORTED_CHAINS in chains.ts. */
  chain: ChainKey;
  token0Symbol: string;
  token1Symbol: string;
  /** Uniswap raw fee units: 500 = 0.05%, 3000 = 0.30%, 10000 = 1%. */
  feeTier: number;
  /** Human label, e.g. "Polygon · WBTC/USDC.e · 0.05%". */
  label: string;
}

export type PairId = 'BTC_USD' | 'ETH_USD' | 'EUR_USD';

export interface ReferencePair {
  id: PairId;
  /** Display label, e.g. "BTC / USD". */
  label: string;
  baseSymbol: string;
  quoteSymbol: string;
  /** CoinGecko id used to fetch the base asset price in USD. */
  baseCoinGeckoId: string;
  /**
   * CoinGecko id of the quote. For USD-quoted pairs this is a USD stablecoin so
   * coinGeckoService fetches base-in-USD directly (see getHistoricalPrices).
   */
  quoteCoinGeckoId: string;
  /** Fallback base id if the primary returns thin/empty history (EUR especially). */
  fallbackBaseCoinGeckoId?: string;
  /** Santiment context layer availability (crypto only — false for EUR FX). */
  hasSantiment: boolean;
  /** Santiment project slug when hasSantiment is true. */
  santimentSlug?: string;
  /** Deribit options IV availability (BTC/ETH only). */
  hasOptions: boolean;
  /** The user's real pools backing this pair. */
  pools: PairPool[];
}

export const REFERENCE_PAIRS: Record<PairId, ReferencePair> = {
  BTC_USD: {
    id: 'BTC_USD',
    label: 'BTC / USD',
    baseSymbol: 'BTC',
    quoteSymbol: 'USD',
    baseCoinGeckoId: 'bitcoin',
    quoteCoinGeckoId: 'usd-coin',
    hasSantiment: true,
    santimentSlug: 'bitcoin',
    hasOptions: true,
    pools: [
      {
        address: '0xeef1a9507b3d505f0062f2be9453981255b503c8',
        chain: 'polygon',
        token0Symbol: 'WBTC',
        token1Symbol: 'USDC.e',
        feeTier: 500,
        label: 'Polygon · WBTC/USDC.e · 0.05%',
      },
      {
        address: '0x33016df701b323c33cc027146c6a9e0997b2a923',
        chain: 'polygon',
        token0Symbol: 'WBTC',
        token1Symbol: 'USDT',
        feeTier: 3000,
        label: 'Polygon · WBTC/USDT · 0.30%',
      },
      {
        address: '0x5969efdde3cf5c0d9a88ae51e47d721096a97203',
        chain: 'arbitrum',
        token0Symbol: 'WBTC',
        token1Symbol: 'USDT',
        feeTier: 500,
        label: 'Arbitrum · WBTC/USDT · 0.05%',
      },
    ],
  },
  ETH_USD: {
    id: 'ETH_USD',
    label: 'ETH / USD',
    baseSymbol: 'ETH',
    quoteSymbol: 'USD',
    baseCoinGeckoId: 'ethereum',
    quoteCoinGeckoId: 'usd-coin',
    hasSantiment: true,
    santimentSlug: 'ethereum',
    hasOptions: true,
    pools: [
      {
        address: '0xc6962004f452be9203591991d15f6b388e09e8d0',
        chain: 'arbitrum',
        token0Symbol: 'WETH',
        token1Symbol: 'USDC',
        feeTier: 500,
        label: 'Arbitrum · WETH/USDC · 0.05%',
      },
    ],
  },
  EUR_USD: {
    id: 'EUR_USD',
    label: 'EUR / USD',
    baseSymbol: 'EUR',
    quoteSymbol: 'USD',
    // EURe (Monerium) tracks EUR; its USD price is the EUR/USD rate.
    baseCoinGeckoId: 'monerium-eur-money',
    // EURC (Circle Euro) is a deeper-liquidity fallback that also tracks EUR.
    fallbackBaseCoinGeckoId: 'euro-coin',
    quoteCoinGeckoId: 'usd-coin',
    hasSantiment: false, // Santiment is crypto-only — no FX coverage.
    hasOptions: false, // No EUR/USD options on Deribit.
    pools: [
      {
        address: '0x7d4324293304797cb662c6ea1b904b6af2b485f5',
        chain: 'polygon',
        token0Symbol: 'EURe',
        token1Symbol: 'USDC.e',
        feeTier: 3000,
        label: 'Polygon · EURe/USDC.e · 0.30%',
      },
    ],
  },
};

export const PAIR_IDS = Object.keys(REFERENCE_PAIRS) as PairId[];

export function getPair(id: PairId): ReferencePair {
  return REFERENCE_PAIRS[id];
}

/** Format a Uniswap raw fee tier as a percentage string, e.g. 500 -> "0.05%". */
export function formatFeeTier(feeTier: number): string {
  return `${(feeTier / 10000).toFixed(2)}%`;
}
