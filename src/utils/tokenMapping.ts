// Symbol normalization for malformed tokens
export function normalizeTokenSymbol(symbol: string): string {
  // Handle Unicode character issues and common malformations
  const normalized = symbol
    .replace(/₮/g, 'T') // Replace Unicode Tether symbol with T
    .replace(/\s+/g, '') // Remove whitespace
    .replace(/[^\w.-]/g, '') // Remove special characters except . and -
    .toUpperCase();
  
  // Common symbol mappings for malformed variants
  const symbolMappings: Record<string, string> = {
    'USD₮0': 'USDT',
    'USD₮': 'USDT',
    'USDT0': 'USDT',
    'WETH9': 'WETH',
    'WBTC8': 'WBTC',
  };
  
  return symbolMappings[symbol] || symbolMappings[normalized] || normalized;
}

// Token symbol to CoinGecko ID mapping
export const TOKEN_MAPPING: Record<string, string> = {
  // === Layer 1 Tokens ===
  'ETH': 'ethereum',
  'WETH': 'ethereum',
  'BTC': 'bitcoin',
  'WBTC': 'wrapped-bitcoin',
  
  // === USD Stablecoins ===
  'USDC': 'usd-coin',
  'USDT': 'tether',
  'DAI': 'dai',
  'FRAX': 'frax',
  'LUSD': 'liquity-usd',
  'MAI': 'mimatic',
  'USDC.E': 'usd-coin', // Bridged USDC on Arbitrum
  'USDT.E': 'tether', // Bridged USDT on Arbitrum
  'BUSD': 'binance-usd',
  'TUSD': 'true-usd',
  'USDP': 'paxos-standard',
  'GUSD': 'gemini-dollar',
  'FEI': 'fei-usd',
  'UST': 'terrausd',
  'USTC': 'terraclassicusd',
  
  // === Malformed Token Variants ===
  'USD₮0': 'tether',
  'USD₮': 'tether',
  'USDT0': 'tether',
  'WETH9': 'ethereum',
  'WBTC8': 'wrapped-bitcoin',
  
  // === Regional Stablecoins ===
  'EURE': 'monerium-eur-money',
  'EURT': 'tether-eurt',
  'AGEUR': 'ageur',
  'XSGD': 'xsgd',
  'CADC': 'cad-coin',
  
  // === DeFi Blue Chips ===
  'UNI': 'uniswap',
  'AAVE': 'aave',
  'COMP': 'compound-governance-token',
  'MKR': 'maker',
  'SNX': 'havven',
  'CRV': 'curve-dao-token',
  'BAL': 'balancer',
  'SUSHI': 'sushi',
  'LINK': 'chainlink',
  
  // === Yield Farming & Liquid Staking ===
  'LDO': 'lido-dao',
  'RPL': 'rocket-pool',
  'PENDLE': 'pendle',
  'CVX': 'convex-finance',
  'FXS': 'frax-share',
  
  // === DEX & Trading ===
  '1INCH': '1inch',
  
  // === Polygon Ecosystem ===
  'MATIC': 'matic-network',
  'WMATIC': 'matic-network',
  'QUICK': 'quickswap',
  
  // === Arbitrum Ecosystem ===
  'ARB': 'arbitrum',
  'GMX': 'gmx',
  'MAGIC': 'magic',
  'DPX': 'dopex',
  'JONES': 'jones-dao',
  'RDNT': 'radiant-capital',
  'GRAIL': 'camelot-token',
  'VELA': 'vela-token',
  'UMAMI': 'umami-finance',
  'PREMIA': 'premia',
  'PLUTUS': 'plutus-dao',
  
  // === Meme Coins ===
  'PEPE': 'pepe',
  'SHIB': 'shiba-inu',
  
  // === Gaming & Metaverse ===
  'AXS': 'axie-infinity',
  'SAND': 'the-sandbox',
  'MANA': 'decentraland',
  'APE': 'apecoin',
  
  // === Commodity-Backed Tokens ===
  'PAXG': 'pax-gold',
};

// Major stablecoins for determining base/quote assets
export const STABLECOINS = new Set([
  // USD Stablecoins
  'USDC', 'USDT', 'DAI', 'FRAX', 'LUSD', 'MAI', 'USDC.E', 'USDT.E',
  'BUSD', 'TUSD', 'USDP', 'GUSD', 'FEI', 'UST', 'USTC',
  // Regional Stablecoins
  'EURE', 'EURT', 'AGEUR', 'XSGD', 'CADC',
  // Malformed variants
  'USD₮0', 'USD₮', 'USDT0'
]);

export function getTokenId(symbol: string): string | null {
  const normalizedSymbol = normalizeTokenSymbol(symbol);
  const tokenId = TOKEN_MAPPING[normalizedSymbol.toUpperCase()];
  
  if (!tokenId) {
    console.warn(`Token not found in mapping: "${symbol}" (normalized: "${normalizedSymbol}")`);
  }
  
  return tokenId || null;
}

export function isStablecoin(symbol: string): boolean {
  const normalizedSymbol = normalizeTokenSymbol(symbol);
  return STABLECOINS.has(normalizedSymbol.toUpperCase());
}

// Santiment project slug mapping (using native tickers for wrapped tokens)
export const SANTIMENT_MAPPING: Record<string, string> = {
  // === Layer 1 Tokens ===
  'ETH': 'ethereum',
  'WETH': 'ethereum', // Use native ETH for wrapped ETH
  'BTC': 'bitcoin',
  'WBTC': 'bitcoin', // Use native BTC for wrapped BTC
  
  // === USD Stablecoins ===
  'USDC': 'usd-coin',
  'USDT': 'tether',
  'DAI': 'dai',
  'FRAX': 'frax',
  'USDC.E': 'usd-coin',
  'USDT.E': 'tether',
  'BUSD': 'binance-usd',
  'TUSD': 'true-usd',
  'USDP': 'paxos-standard',
  
  // === DeFi Blue Chips ===
  'UNI': 'uniswap',
  'AAVE': 'aave',
  'COMP': 'compound',
  'MKR': 'maker',
  'SNX': 'synthetix-network-token',
  'CRV': 'curve-dao-token',
  'BAL': 'balancer',
  'SUSHI': 'sushi',
  'LINK': 'chainlink',
  
  // === Yield Farming & Liquid Staking ===
  'LDO': 'lido-dao',
  'RPL': 'rocket-pool',
  'PENDLE': 'pendle',
  'CVX': 'convex-finance',
  
  // === Polygon Ecosystem ===
  'MATIC': 'polygon',
  'WMATIC': 'polygon', // Use native MATIC for wrapped MATIC
  
  // === Arbitrum Ecosystem ===
  'ARB': 'arbitrum',
  'GMX': 'gmx',
  'MAGIC': 'magic',
  
  // === Meme Coins ===
  'PEPE': 'pepe',
  'SHIB': 'shiba-inu',
  
  // === Gaming & Metaverse ===
  'AXS': 'axie-infinity',
  'SAND': 'the-sandbox',
  'MANA': 'decentraland',
  'APE': 'apecoin',
  
  // === Commodity-Backed Tokens ===
  'PAXG': 'pax-gold',
};

export function getSantimentSlug(symbol: string): string | null {
  const normalizedSymbol = normalizeTokenSymbol(symbol);
  return SANTIMENT_MAPPING[normalizedSymbol.toUpperCase()] || null;
}

export function determineBaseQuote(token0Symbol: string, token1Symbol: string): {
  baseAsset: string;
  quoteAsset: string;
} {
  const token0IsStable = isStablecoin(token0Symbol);
  const token1IsStable = isStablecoin(token1Symbol);
  
  if (token1IsStable && !token0IsStable) {
    return { baseAsset: token0Symbol, quoteAsset: token1Symbol };
  } else if (token0IsStable && !token1IsStable) {
    return { baseAsset: token1Symbol, quoteAsset: token0Symbol };
  } else {
    // Neither or both are stablecoins, use token0 as base
    return { baseAsset: token0Symbol, quoteAsset: token1Symbol };
  }
}
