import { PriceData } from '@/types/uniswap';
import { apiCache, createCacheKey, CACHE_DURATIONS } from '@/utils/cache';

const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3';

export class CoinGeckoService {
  static async getHistoricalPrices(
    baseTokenId: string,
    quoteTokenId: string,
    days: number = 365
  ): Promise<PriceData[]> {
    const cacheKey = createCacheKey('historical', baseTokenId, quoteTokenId, days.toString());
    
    // Check cache first
    const cached = apiCache.get<PriceData[]>(cacheKey);
    if (cached) {
      console.log('Using cached historical price data');
      return cached;
    }

    try {
      // If quote is USD-based stablecoin, get base token price in USD
      if (quoteTokenId === 'usd-coin' || quoteTokenId === 'tether' || quoteTokenId === 'dai') {
        const response = await fetch(
          `${COINGECKO_API_URL}/coins/${baseTokenId}/market_chart?vs_currency=usd&days=${days}&interval=daily`
        );
        
        if (!response.ok) {
          throw new Error(`CoinGecko API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        const result = data.prices.map(([timestamp, price]: [number, number]) => ({
          date: new Date(timestamp).toISOString().split('T')[0],
          price: price
        }));
        
        // Cache the result
        apiCache.set(cacheKey, result, CACHE_DURATIONS.PRICE_DATA);
        return result;
      }
      
      // For non-USD pairs, we need to get both token prices and calculate the ratio
      const [baseResponse, quoteResponse] = await Promise.all([
        fetch(`${COINGECKO_API_URL}/coins/${baseTokenId}/market_chart?vs_currency=usd&days=${days}&interval=daily`),
        fetch(`${COINGECKO_API_URL}/coins/${quoteTokenId}/market_chart?vs_currency=usd&days=${days}&interval=daily`)
      ]);
      
      if (!baseResponse.ok || !quoteResponse.ok) {
        throw new Error('Failed to fetch price data from CoinGecko');
      }
      
      const [baseData, quoteData] = await Promise.all([
        baseResponse.json(),
        quoteResponse.json()
      ]);
      
      // Calculate price ratio (base/quote)
      const priceData: PriceData[] = [];
      const minLength = Math.min(baseData.prices.length, quoteData.prices.length);
      
      for (let i = 0; i < minLength; i++) {
        const basePrice = baseData.prices[i][1];
        const quotePrice = quoteData.prices[i][1];
        const timestamp = baseData.prices[i][0];
        
        if (quotePrice && quotePrice !== 0) {
          priceData.push({
            date: new Date(timestamp).toISOString().split('T')[0],
            price: basePrice / quotePrice
          });
        }
      }
      
      const result = priceData.reverse(); // Return chronological order
      
      // Cache the result
      apiCache.set(cacheKey, result, CACHE_DURATIONS.PRICE_DATA);
      return result;
      
    } catch (error) {
      console.error('Error fetching historical prices:', error);
      throw error;
    }
  }

  static async getCurrentPrice(tokenId: string): Promise<number> {
    const cacheKey = createCacheKey('current', tokenId);
    
    // Check cache first
    const cached = apiCache.get<number>(cacheKey);
    if (cached) {
      console.log('Using cached current price data');
      return cached;
    }

    try {
      const response = await fetch(
        `${COINGECKO_API_URL}/simple/price?ids=${tokenId}&vs_currencies=usd`
      );
      
      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
      }
      
      const data = await response.json();
      const result = data[tokenId]?.usd || 0;
      
      // Cache the result
      apiCache.set(cacheKey, result, CACHE_DURATIONS.CURRENT_PRICE);
      return result;
    } catch (error) {
      console.error('Error fetching current price:', error);
      throw error;
    }
  }
}