import type { TechnicalIndicators } from '@/types/uniswap';

export class AdvancedTechnicalAnalysis {
  // Phase 1: Rate of Change calculations for multiple periods
  static calculateRateOfChange(prices: number[], period: number): number {
    if (prices.length < period + 1) return 0;
    
    const current = prices[prices.length - 1];
    const past = prices[prices.length - 1 - period];
    
    return past !== 0 ? ((current - past) / past) * 100 : 0;
  }

  // Commodity Channel Index calculation
  static calculateCommodityChannelIndex(prices: number[], period: number = 20): number {
    if (prices.length < period) return 0;
    
    const recentPrices = prices.slice(-period);
    const typicalPrices = recentPrices; // Simplified - using closing prices
    
    // Simple Moving Average of typical prices
    const sma = typicalPrices.reduce((sum, price) => sum + price, 0) / period;
    
    // Mean Deviation
    const meanDeviation = typicalPrices.reduce((sum, price) => sum + Math.abs(price - sma), 0) / period;
    
    if (meanDeviation === 0) return 0;
    
    const currentTypicalPrice = prices[prices.length - 1];
    const cci = (currentTypicalPrice - sma) / (0.015 * meanDeviation);
    
    return cci;
  }

  // Support and Resistance level detection using local extrema
  static detectSupportResistance(prices: number[], windowSize: number = 10): {
    support: number[];
    resistance: number[];
    currentLevel: 'support' | 'resistance' | 'between';
  } {
    if (prices.length < windowSize * 2) {
      return { support: [], resistance: [], currentLevel: 'between' };
    }
    
    const support: number[] = [];
    const resistance: number[] = [];
    const currentPrice = prices[prices.length - 1];
    
    // Find local minima (support) and maxima (resistance)
    for (let i = windowSize; i < prices.length - windowSize; i++) {
      const window = prices.slice(i - windowSize, i + windowSize + 1);
      const centerPrice = prices[i];
      
      const isLocalMin = window.every(price => price >= centerPrice);
      const isLocalMax = window.every(price => price <= centerPrice);
      
      if (isLocalMin && centerPrice < currentPrice * 1.05) {
        support.push(centerPrice);
      }
      
      if (isLocalMax && centerPrice > currentPrice * 0.95) {
        resistance.push(centerPrice);
      }
    }
    
    // Remove duplicates and sort
    const uniqueSupport = [...new Set(support)].sort((a, b) => b - a).slice(0, 3);
    const uniqueResistance = [...new Set(resistance)].sort((a, b) => a - b).slice(0, 3);
    
    // Determine current level
    let currentLevel: 'support' | 'resistance' | 'between' = 'between';
    
    const nearestSupport = uniqueSupport.find(s => Math.abs(s - currentPrice) / currentPrice < 0.02);
    const nearestResistance = uniqueResistance.find(r => Math.abs(r - currentPrice) / currentPrice < 0.02);
    
    if (nearestSupport) currentLevel = 'support';
    else if (nearestResistance) currentLevel = 'resistance';
    
    return {
      support: uniqueSupport,
      resistance: uniqueResistance,
      currentLevel
    };
  }

  // Simplified cycle analysis using autocorrelation
  static analyzePriceCycles(prices: number[]): {
    dominantCycle: number;
    cycleStrength: number;
    currentPhase: 'accumulation' | 'markup' | 'distribution' | 'markdown';
  } {
    if (prices.length < 40) {
      return { dominantCycle: 0, cycleStrength: 0, currentPhase: 'accumulation' };
    }
    
    const returns = prices.slice(1).map((price, i) => (price - prices[i]) / prices[i]);
    const maxLag = Math.min(30, Math.floor(prices.length / 3));
    
    let bestLag = 0;
    let maxCorrelation = 0;
    
    // Calculate autocorrelation for different lags
    for (let lag = 5; lag <= maxLag; lag++) {
      let correlation = 0;
      let count = 0;
      
      for (let i = lag; i < returns.length; i++) {
        correlation += returns[i] * returns[i - lag];
        count++;
      }
      
      correlation = Math.abs(correlation / count);
      
      if (correlation > maxCorrelation) {
        maxCorrelation = correlation;
        bestLag = lag;
      }
    }
    
    // Determine current phase based on recent price action
    const recentPrices = prices.slice(-20);
    const priceChange = (recentPrices[recentPrices.length - 1] - recentPrices[0]) / recentPrices[0];
    const volatility = this.calculateVolatility(recentPrices);
    
    let currentPhase: 'accumulation' | 'markup' | 'distribution' | 'markdown';
    
    if (priceChange > 0.05 && volatility < 0.03) {
      currentPhase = 'markup';
    } else if (priceChange < -0.05 && volatility < 0.03) {
      currentPhase = 'markdown';
    } else if (priceChange > -0.02 && priceChange < 0.02 && volatility > 0.04) {
      currentPhase = 'distribution';
    } else {
      currentPhase = 'accumulation';
    }
    
    return {
      dominantCycle: bestLag,
      cycleStrength: maxCorrelation,
      currentPhase
    };
  }

  // True GARCH(1,1) volatility forecasting
  static calculateGARCHVolatility(returns: number[]): {
    forecast: number;
    alpha: number;
    beta: number;
    omega: number;
    persistence: number;
  } {
    if (returns.length < 50) {
      const simpleVol = this.calculateVolatility(returns.map((r, i) => returns.length > i ? r * 100 + 100 : 100));
      return {
        forecast: simpleVol,
        alpha: 0.1,
        beta: 0.85,
        omega: 0.05,
        persistence: 0.95
      };
    }
    
    // Initialize GARCH parameters (simplified estimation)
    const alpha = 0.1; // Short-term volatility weight
    const beta = 0.85;  // Long-term volatility weight
    const omega = 0.05; // Long-term average variance
    
    // Calculate conditional variances
    const variances: number[] = [];
    const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    
    // Initial variance
    let variance = returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / returns.length;
    variances.push(variance);
    
    // GARCH(1,1) recursion: σ²ₜ = ω + α·ε²ₜ₋₁ + β·σ²ₜ₋₁
    for (let i = 1; i < returns.length; i++) {
      const prevReturn = returns[i - 1] - meanReturn;
      const prevVariance = variances[i - 1];
      
      variance = omega + alpha * Math.pow(prevReturn, 2) + beta * prevVariance;
      variances.push(variance);
    }
    
    // One-step-ahead forecast
    const lastReturn = returns[returns.length - 1] - meanReturn;
    const lastVariance = variances[variances.length - 1];
    const forecastVariance = omega + alpha * Math.pow(lastReturn, 2) + beta * lastVariance;
    
    const persistence = alpha + beta; // Measure of volatility persistence
    
    return {
      forecast: Math.sqrt(forecastVariance * 252), // Annualized volatility
      alpha,
      beta,
      omega,
      persistence
    };
  }

  // Helper method for volatility calculation
  private static calculateVolatility(prices: number[]): number {
    if (prices.length < 2) return 0;
    
    const returns = prices.slice(1).map((price, i) => (price - prices[i]) / prices[i]);
    const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / (returns.length - 1);
    
    return Math.sqrt(variance);
  }

  // Enhanced technical indicators calculation
  static calculateAdvancedTechnicalIndicators(prices: number[]): Partial<TechnicalIndicators> {
    const rateOfChange = {
      short: this.calculateRateOfChange(prices, 5),
      medium: this.calculateRateOfChange(prices, 10),
      long: this.calculateRateOfChange(prices, 20)
    };
    
    const commodityChannelIndex = this.calculateCommodityChannelIndex(prices);
    const supportResistance = this.detectSupportResistance(prices);
    const cycleAnalysis = this.analyzePriceCycles(prices);
    
    // Calculate returns for GARCH
    const returns = prices.slice(1).map((price, i) => (price - prices[i]) / prices[i]);
    const garchVolatility = this.calculateGARCHVolatility(returns);
    
    return {
      rateOfChange,
      commodityChannelIndex,
      supportResistance,
      cycleAnalysis,
      garchVolatility
    };
  }
}