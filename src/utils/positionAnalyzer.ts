import { PositionData, PositionAnalysisResult, AnalysisResult } from '@/types/uniswap';
import { CoinGeckoService } from '@/services/coinGeckoService';
import { getTokenId } from '@/utils/tokenMapping';

export class PositionAnalyzer {
  /**
   * Analyzes a user's current position against the suggested optimal range
   */
  static async analyzePosition(
    position: PositionData,
    optimalAnalysis: AnalysisResult
  ): Promise<PositionAnalysisResult> {
    const capitalEfficiency = this.calculateCapitalEfficiency(position);
    const positionHealth = this.assessPositionHealth(position, optimalAnalysis);
    const recommendations = this.generateRecommendations(position, optimalAnalysis);
    
    // Calculate fees with proper decimal adjustments
    const feesEarned = await this.calculateFeesEarned(position);

    // Calculate impermanent loss with USD values when available
    const impermanentLoss = await this.calculateImpermanentLoss(position);

    return {
      positionHealth,
      capitalEfficiency,
      feesEarned,
      impermanentLoss,
      daysInRange: await this.estimateDaysInRange(position),
      daysOutOfRange: await this.estimateDaysOutOfRange(position),
      recommendations,
    };
  }

  /**
   * Calculate capital efficiency based on current price vs position range
   */
  private static calculateCapitalEfficiency(position: PositionData): number {
    if (!position.inRange) {
      return 0;
    }

    // Calculate how centered the current price is within the range
    const rangeWidth = position.maxPrice - position.minPrice;
    const priceFromMin = position.currentPrice - position.minPrice;
    const centeredness = 1 - Math.abs((priceFromMin / rangeWidth) - 0.5) * 2;

    // Efficiency is higher when price is closer to center of range
    return Math.round(centeredness * 100);
  }

  /**
   * Assess overall position health
   */
  private static assessPositionHealth(
    position: PositionData,
    optimalAnalysis: AnalysisResult
  ): 'optimal' | 'good' | 'needs_attention' | 'out_of_range' {
    if (!position.inRange) {
      return 'out_of_range';
    }

    const efficiency = position.efficiency;
    const isCloseToOptimal = this.isCloseToOptimalRange(position, optimalAnalysis);

    if (efficiency >= 80 && isCloseToOptimal) {
      return 'optimal';
    } else if (efficiency >= 60) {
      return 'good';
    } else {
      return 'needs_attention';
    }
  }

  /**
   * Check if position range is close to the suggested optimal range
   */
  private static isCloseToOptimalRange(
    position: PositionData,
    optimalAnalysis: AnalysisResult
  ): boolean {
    const currentRangeWidth = position.maxPrice - position.minPrice;
    const optimalRangeWidth = optimalAnalysis.suggestedMaxPrice - optimalAnalysis.suggestedMinPrice;
    
    // Check if ranges are similar in width (within 20%)
    const widthDifference = Math.abs(currentRangeWidth - optimalRangeWidth) / optimalRangeWidth;
    
    return widthDifference < 0.2;
  }

  /**
   * Generate actionable recommendations for position improvement
   */
  private static generateRecommendations(
    position: PositionData,
    optimalAnalysis: AnalysisResult
  ): PositionAnalysisResult['recommendations'] {
    const recommendations: PositionAnalysisResult['recommendations'] = [];

    if (!position.inRange) {
      recommendations.push({
        action: 'rebalance',
        reasoning: 'Your position is completely out of range and not earning fees',
        expectedImprovement: 'Rebalancing to the suggested range could restore fee generation',
        gasCostEstimate: 100, // USD estimate
      });
    } else {
      const efficiency = position.efficiency;
      const currentRangeWidth = position.maxPrice - position.minPrice;
      const optimalRangeWidth = optimalAnalysis.suggestedMaxPrice - optimalAnalysis.suggestedMinPrice;

      if (currentRangeWidth > optimalRangeWidth * 1.5) {
        recommendations.push({
          action: 'narrow_range',
          reasoning: 'Your range is wider than optimal, reducing capital efficiency',
          expectedImprovement: `Narrowing range could increase fees by ${Math.round((1.5 - currentRangeWidth/optimalRangeWidth) * 100)}%`,
          gasCostEstimate: 80,
        });
      } else if (currentRangeWidth < optimalRangeWidth * 0.7) {
        recommendations.push({
          action: 'widen_range',
          reasoning: 'Your range is narrower than recommended, increasing impermanent loss risk',
          expectedImprovement: 'Widening range could reduce IL risk while maintaining good returns',
          gasCostEstimate: 80,
        });
      }

      if (efficiency >= 80) {
        recommendations.push({
          action: 'hold',
          reasoning: 'Your position is performing well within the optimal range',
          expectedImprovement: 'Continue monitoring for potential adjustments',
        });
      }
    }

    // Add general market-based recommendations
    if (optimalAnalysis.technicalIndicators) {
      const volatilityRegime = optimalAnalysis.technicalIndicators.volatilityRegime;
      
      if (volatilityRegime === 'high') {
        recommendations.push({
          action: 'widen_range',
          reasoning: 'High volatility detected - consider widening range for safety',
          expectedImprovement: 'Reduced risk of going out of range during volatile periods',
        });
      }
    }

    return recommendations;
  }

  /**
   * Calculate days the position has been in range using historical data
   */
  private static async estimateDaysInRange(position: PositionData): Promise<number> {
    try {
      // Get historical price data for the past 30 days
      const token0Id = getTokenId(position.token0Symbol);
      const token1Id = getTokenId(position.token1Symbol);
      
      if (!token0Id || !token1Id) {
        return this.fallbackDaysInRange(position);
      }

      const historicalPrices = await CoinGeckoService.getHistoricalPrices(token0Id, token1Id, 30);
      
      let daysInRange = 0;
      let daysOutOfRange = 0;
      
      for (const priceData of historicalPrices) {
        if (priceData.price >= position.minPrice && priceData.price <= position.maxPrice) {
          daysInRange++;
        } else {
          daysOutOfRange++;
        }
      }
      
      console.log('Historical Days Analysis:', {
        totalDays: historicalPrices.length,
        daysInRange,
        daysOutOfRange,
        percentageInRange: ((daysInRange / historicalPrices.length) * 100).toFixed(1),
        currentlyInRange: position.inRange,
        minPrice: position.minPrice,
        maxPrice: position.maxPrice,
        currentPrice: position.currentPrice
      });
      
      return daysInRange;
    } catch (error) {
      console.warn('Could not fetch historical data for days calculation:', error);
      return this.fallbackDaysInRange(position);
    }
  }

  /**
   * Fallback estimation when historical data is unavailable
   */
  private static fallbackDaysInRange(position: PositionData): number {
    if (!position.inRange) {
      return 0; // Currently out of range
    }
    
    // More realistic estimation based on Uniswap v3 behavior
    const rangeWidth = position.maxPrice - position.minPrice;
    const relativeRangeWidth = rangeWidth / position.currentPrice;
    
    // Position within range (0 to 1, where 0.5 is center)
    const positionWithinRange = (position.currentPrice - position.minPrice) / rangeWidth;
    const centeredness = 1 - Math.abs(positionWithinRange - 0.5) * 2;
    
    // Base estimate: wider ranges stay in range longer
    let baseEstimate: number;
    if (relativeRangeWidth < 0.1) { // ±5% range
      baseEstimate = 3 + (centeredness * 4);
    } else if (relativeRangeWidth < 0.4) { // ±5-20% range
      baseEstimate = 7 + (centeredness * 14);
    } else { // Wide range ±20%+
      baseEstimate = 21 + (centeredness * 14);
    }
    
    return Math.round(baseEstimate);
  }

  /**
   * Calculate days the position has been out of range using historical data
   */
  private static async estimateDaysOutOfRange(position: PositionData): Promise<number> {
    try {
      // Get historical price data for the past 30 days
      const token0Id = getTokenId(position.token0Symbol);
      const token1Id = getTokenId(position.token1Symbol);
      
      if (!token0Id || !token1Id) {
        return this.fallbackDaysOutOfRange(position);
      }

      const historicalPrices = await CoinGeckoService.getHistoricalPrices(token0Id, token1Id, 30);
      
      let daysOutOfRange = 0;
      
      for (const priceData of historicalPrices) {
        if (priceData.price < position.minPrice || priceData.price > position.maxPrice) {
          daysOutOfRange++;
        }
      }
      
      return daysOutOfRange;
    } catch (error) {
      console.warn('Could not fetch historical data for days calculation:', error);
      return this.fallbackDaysOutOfRange(position);
    }
  }

  /**
   * Fallback estimation when historical data is unavailable
   */
  private static fallbackDaysOutOfRange(position: PositionData): number {
    if (position.inRange) {
      // If currently in range, estimate recent out-of-range periods
      const rangeWidth = position.maxPrice - position.minPrice;
      const positionWithinRange = (position.currentPrice - position.minPrice) / rangeWidth;
      
      // Closer to edges = more likely to have been out recently
      const edgeProximity = Math.min(positionWithinRange, 1 - positionWithinRange) * 2;
      return Math.round((1 - edgeProximity) * 2);
    } else {
      // Currently out of range - estimate duration based on distance
      const lowerDistance = Math.abs(position.currentPrice - position.minPrice) / position.minPrice;
      const upperDistance = Math.abs(position.currentPrice - position.maxPrice) / position.maxPrice;
      const minDistance = Math.min(lowerDistance, upperDistance);
      
      // Further from range = longer out of range
      return Math.round(2 + (minDistance * 20));
    }
  }

  /**
   * Calculate fees earned with proper scaling and USD conversion
   */
  private static async calculateFeesEarned(position: PositionData): Promise<{
    token0: number;
    token1: number;
    totalUSD: number;
    totalToken0: number;
    totalToken1: number;
    totalEarnedUSD: number;
    unclaimedToken0: number;
    unclaimedToken1: number;
    unclaimedUSD: number;
    token0USD: number;
    token1USD: number;
    totalToken0USD: number;
    totalToken1USD: number;
  }> {
    // Actual unclaimed fees from collect simulation (already correctly fetched)
    const unclaimedToken0 = parseFloat(position.tokensOwed0) / Math.pow(10, position.token0Decimals);
    const unclaimedToken1 = parseFloat(position.tokensOwed1) / Math.pow(10, position.token1Decimals);

    // Since we now have real unclaimed fees, use them as the base
    // Estimate total fees conservatively (unclaimed typically represents 10-30% of total)
    const estimatedTotalToken0 = unclaimedToken0 > 0 ? unclaimedToken0 * 3 : 0;
    const estimatedTotalToken1 = unclaimedToken1 > 0 ? unclaimedToken1 * 3 : 0;

    console.log('Actual Fee Data from Collect Simulation:', {
      token0Raw: position.tokensOwed0,
      token1Raw: position.tokensOwed1,
      token0Decimals: position.token0Decimals,
      token1Decimals: position.token1Decimals,
      unclaimedToken0,
      unclaimedToken1,
      note: 'Using actual unclaimed fees from collect() simulation'
    });

    let totalUSD = 0;
    let totalEarnedUSD = 0;
    let unclaimedUSD = 0;
    let token0USD = 0;
    let token1USD = 0;
    let totalToken0USD = 0;
    let totalToken1USD = 0;

    try {
      // Get USD prices for fee calculation
      const token0Id = getTokenId(position.token0Symbol);
      const token1Id = getTokenId(position.token1Symbol);

      if (token0Id && token1Id) {
        const [token0Price, token1Price] = await Promise.all([
          CoinGeckoService.getCurrentPrice(token0Id),
          CoinGeckoService.getCurrentPrice(token1Id),
        ]);

        // Calculate individual token USD values
        token0USD = unclaimedToken0 * token0Price;
        token1USD = unclaimedToken1 * token1Price;
        totalToken0USD = estimatedTotalToken0 * token0Price;
        totalToken1USD = estimatedTotalToken1 * token1Price;

        // Calculate totals
        unclaimedUSD = token0USD + token1USD;
        totalEarnedUSD = totalToken0USD + totalToken1USD;
        totalUSD = unclaimedUSD; // For backward compatibility

        console.log('Real Unclaimed Fees USD Calculation:', {
          token0Symbol: position.token0Symbol,
          token1Symbol: position.token1Symbol,
          actualUnclaimedAmounts: {
            unclaimedToken0,
            unclaimedToken1,
          },
          pricesUSD: {
            token0Price,
            token1Price,
          },
          unclaimedUSDValues: {
            token0USD,
            token1USD,
            totalUnclaimedUSD: unclaimedUSD,
          },
          estimatedTotalUSDValues: {
            totalToken0USD,
            totalToken1USD,
            totalEarnedUSD,
          }
        });
      }
    } catch (error) {
      console.warn('Could not calculate USD value of fees:', error);
    }

    return {
      token0: unclaimedToken0, // For backward compatibility
      token1: unclaimedToken1, // For backward compatibility
      totalUSD: unclaimedUSD, // For backward compatibility
      totalToken0: estimatedTotalToken0,
      totalToken1: estimatedTotalToken1,
      totalEarnedUSD,
      unclaimedToken0,
      unclaimedToken1,
      unclaimedUSD,
      token0USD,
      token1USD,
      totalToken0USD,
      totalToken1USD,
    };
  }

  /**
   * Calculate impermanent loss with USD values when available
   */
  private static async calculateImpermanentLoss(position: PositionData): Promise<{
    percentage: number;
    dollarAmount: number;
  }> {
    // Use USD prices if available, otherwise fall back to raw prices
    const currentPrice = position.currentPriceUSD || position.currentPrice;
    const rangeCenter = position.minPriceUSD && position.maxPriceUSD 
      ? (position.maxPriceUSD + position.minPriceUSD) / 2
      : (position.maxPrice + position.minPrice) / 2;
    
    const priceDeviation = Math.abs(currentPrice - rangeCenter) / rangeCenter;
    
    // IL increases quadratically with price deviation
    const percentage = Math.round(priceDeviation * priceDeviation * 100 * 100) / 100;

    // Estimate dollar amount (simplified - would need liquidity value calculation)
    let dollarAmount = 0;
    if (position.currentPriceUSD) {
      // Very simplified estimate based on liquidity and price deviation
      dollarAmount = percentage * 10; // Placeholder calculation
    }

    return {
      percentage,
      dollarAmount,
    };
  }
}