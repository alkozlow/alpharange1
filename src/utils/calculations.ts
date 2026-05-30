import { PriceData } from '@/types/uniswap';
import { supabase } from '@/integrations/supabase/client';
import { AdvancedTechnicalAnalysis } from './advancedTechnicalAnalysis';

import type { TechnicalIndicators } from '@/types/uniswap';

// Phase 2: Monte Carlo Simulation and Risk Analysis interfaces
export interface MonteCarloResult {
  pricePaths: number[][];
  finalPrices: number[];
  successProbability: number;
  expectedReturn: number;
  worstCase: number;
  bestCase: number;
  confidenceIntervals: {
    p80: { min: number; max: number };
    p90: { min: number; max: number };
    p95: { min: number; max: number };
  };
}

export interface RiskMetrics {
  valueAtRisk: {
    p80: number;
    p90: number;
    p95: number;
  };
  expectedShortfall: {
    p80: number;
    p90: number;
    p95: number;
  };
  maxDrawdown: number;
  tailRisk: {
    severe: number;    // >10% loss
    extreme: number;   // >20% loss
    catastrophic: number; // >50% loss
  };
  volatilityOfVolatility: number;
}

export interface ScenarioAnalysis {
  bullCase: {
    probability: number;
    minPrice: number;
    maxPrice: number;
    expectedReturn: number;
  };
  baseCase: {
    probability: number;
    minPrice: number;
    maxPrice: number;
    expectedReturn: number;
  };
  bearCase: {
    probability: number;
    minPrice: number;
    maxPrice: number;
    expectedReturn: number;
  };
}

export class PriceAnalyzer {
  static calculateEMA(prices: number[], period: number): number {
    if (prices.length === 0) return 0;
    if (prices.length === 1) return prices[0];
    
    const multiplier = 2 / (period + 1);
    let ema = prices[0];
    
    for (let i = 1; i < prices.length; i++) {
      ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
    }
    
    return ema;
  }
  
  static calculateReturns(prices: number[]): number[] {
    const returns: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      if (prices[i-1] !== 0) {
        returns.push((prices[i] - prices[i-1]) / prices[i-1]);
      }
    }
    return returns;
  }
  
  static calculateStandardDeviation(values: number[]): number {
    if (values.length <= 1) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDifferences = values.map(val => Math.pow(val - mean, 2));
    const variance = squaredDifferences.reduce((sum, val) => sum + val, 0) / (values.length - 1); // Sample standard deviation
    
    return Math.sqrt(variance);
  }
  
  static calculateSMA(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1] || 0;
    const relevantPrices = prices.slice(-period);
    return relevantPrices.reduce((sum, price) => sum + price, 0) / period;
  }
  
  static calculateRSI(prices: number[], period: number = 14): number {
    if (prices.length < period + 1) return 50; // neutral RSI
    
    const changes = this.calculateReturns(prices);
    if (changes.length < period) return 50;
    
    // Calculate initial average gain/loss using SMA for first period
    const initialPeriod = changes.slice(0, period);
    let avgGain = initialPeriod.filter(c => c > 0).reduce((sum, c) => sum + c, 0) / period;
    let avgLoss = Math.abs(initialPeriod.filter(c => c < 0).reduce((sum, c) => sum + c, 0)) / period;
    
    // Use smoothed moving average (Wilder's smoothing) for subsequent periods
    for (let i = period; i < changes.length; i++) {
      const gain = Math.max(changes[i], 0);
      const loss = Math.abs(Math.min(changes[i], 0));
      
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
    }
    
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }
  
  static calculateEMASeries(values: number[], period: number): number[] {
    if (values.length < period) return [];
    
    const emaValues: number[] = [];
    const multiplier = 2 / (period + 1);
    
    // Start with SMA for the first EMA value
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += values[i];
    }
    emaValues.push(sum / period);
    
    // Calculate subsequent EMA values
    for (let i = period; i < values.length; i++) {
      const ema = (values[i] * multiplier) + (emaValues[emaValues.length - 1] * (1 - multiplier));
      emaValues.push(ema);
    }
    
    return emaValues;
  }

  static calculateMACD(prices: number[]): { macd: number; signal: number; histogram: number } {
    if (prices.length < 26) {
      return { macd: 0, signal: 0, histogram: 0 };
    }

    // Calculate EMA series for proper MACD computation
    const ema12Series = this.calculateEMASeries(prices, 12);
    const ema26Series = this.calculateEMASeries(prices, 26);
    
    if (ema12Series.length === 0 || ema26Series.length === 0) {
      return { macd: 0, signal: 0, histogram: 0 };
    }
    
    // Calculate MACD series (align EMA12 to EMA26 start)
    const macdSeries: number[] = [];
    const alignmentOffset = 26 - 12; // align to same original time index
    const ema12Aligned = ema12Series.slice(alignmentOffset);
    const minLength = Math.min(ema12Aligned.length, ema26Series.length);
    
    for (let i = 0; i < minLength; i++) {
      macdSeries.push(ema12Aligned[i] - ema26Series[i]);
    }
    
    // Calculate signal line (9-period EMA of MACD)
    const signalSeries = this.calculateEMASeries(macdSeries, 9);
    
    // Get the latest values
    const macd = macdSeries[macdSeries.length - 1];
    const signal = signalSeries.length > 0 ? signalSeries[signalSeries.length - 1] : macd;
    const histogram = macd - signal;

    console.log('MACD Debug (aligned):', {
      dataPoints: prices.length,
      lastPrice: prices[prices.length - 1],
      ema12_last: ema12Series[ema12Series.length - 1],
      ema26_last: ema26Series[ema26Series.length - 1],
      ema12Aligned_last: ema12Aligned[ema12Aligned.length - 1],
      lengths: { ema12: ema12Series.length, ema26: ema26Series.length, ema12Aligned: ema12Aligned.length, macdSeries: macdSeries.length },
      alignmentOffset,
      macd,
      signal,
      histogram,
      diffCheck: ema12Aligned[ema12Aligned.length - 1] - ema26Series[ema26Series.length - 1]
    });

    return { macd, signal, histogram };
  }
  
  static calculateBollingerBands(prices: number[], period: number = 20, multiplier: number = 2): {
    upper: number;
    middle: number;
    lower: number;
    bandwidth: number;
    position: number;
  } {
    const middle = this.calculateSMA(prices, period);
    const recentPrices = prices.slice(-period);
    const stdDev = this.calculateStandardDeviation(recentPrices);
    
    const upper = middle + (multiplier * stdDev);
    const lower = middle - (multiplier * stdDev);
    const bandwidth = (upper - lower) / middle;
    
    const currentPrice = prices[prices.length - 1];
    const position = (currentPrice - lower) / (upper - lower); // 0 to 1 scale (0% to 100%)
    
    return { upper, middle, lower, bandwidth, position };
  }
  
  static detectVolatilityRegime(returns: number[]): 'low' | 'normal' | 'high' {
    const volatility = this.calculateStandardDeviation(returns);
    const annualizedVol = volatility * Math.sqrt(365);
    
    // Thresholds based on typical crypto volatility ranges
    if (annualizedVol < 0.3) return 'low';
    if (annualizedVol > 0.8) return 'high';
    return 'normal';
  }
  
  static calculateTechnicalIndicators(prices: number[]): TechnicalIndicators {
    const rsi = this.calculateRSI(prices);
    const macd = this.calculateMACD(prices);
    const bollingerBands = this.calculateBollingerBands(prices);
    const returns = this.calculateReturns(prices);
    const volatilityRegime = this.detectVolatilityRegime(returns);
    
    // Import and use advanced technical analysis
    const advancedIndicators = AdvancedTechnicalAnalysis.calculateAdvancedTechnicalIndicators(prices);
    
    return {
      rsi,
      macd,
      bollingerBands,
      volatilityRegime,
      ...advancedIndicators,
    };
  }

  static async calculateTechnicalIndicatorsWithOptions(
    prices: number[], 
    enableOptionsAnalysis: boolean = false,
    baseAsset?: string
  ): Promise<TechnicalIndicators> {
    const basicIndicators = this.calculateTechnicalIndicators(prices);
    
    // Add options market data if enabled
    let optionsMetrics;
    if (enableOptionsAnalysis && baseAsset) {
      try {
        const { optionsDataService } = await import('@/services/optionsDataService');
        const optionsData = await optionsDataService.getOptionsData(baseAsset);
        
        if (optionsData) {
          const volatilityCalibration = await optionsDataService.getVolatilityCalibration(baseAsset, 28);
          optionsMetrics = {
            impliedVolatility: {
              atm: optionsData.impliedVolatility.atm,
              ivRank: optionsData.volatilityMetrics.ivRank,
              ivPercentile: optionsData.volatilityMetrics.ivPercentile,
              regime: optionsData.volatilityMetrics.regime,
            },
            volatilityCalibration: {
              calibratedVolatility: volatilityCalibration.calibratedVolatility,
              confidence: volatilityCalibration.confidence,
              marketVolatility: optionsData.impliedVolatility.atm,
            },
            putCallRatio: optionsData.putCallRatio,
            optionsFlow: optionsData.optionsFlow,
          };
        }
      } catch (error) {
        console.warn('Options analysis failed:', error);
      }
    }
    
    return {
      ...basicIndicators,
      optionsMetrics,
    };
  }

  static extractBaseAsset(baseAsset?: string): string {
    // Extract base asset from provided parameter or default to BTC
    return baseAsset || 'BTC';
  }
  
  static async analyzePriceData(
    priceData: PriceData[], 
    enableTechnicalAdjustments: boolean = true,
    enableSentimentAnalysis: boolean = false,
    enableSantimentAnalysis: boolean = false,
    enableMonteCarloAnalysis: boolean = false,
    baseAsset?: string,
    quoteAsset?: string,
    enableOptionsAnalysis: boolean = false
  ): Promise<{
    centralTrend: number;
    dailyVolatility: number;
    projectedVolatility: number;
    marginOfError: number;
    suggestedMinPrice: number;
    suggestedMaxPrice: number;
    technicalIndicators?: TechnicalIndicators;
    sentimentAnalysis?: {
      sentiment: 'bullish' | 'bearish' | 'neutral';
      score: number;
      confidence: number;
      newsCount: number;
    };
    santimentMetrics?: {
      socialSentiment: {
        sentiment: 'bullish' | 'bearish' | 'neutral';
        score: number;
        confidence: number;
        socialVolume: {
          sevenDays: number;
          fourteenDays: number;
          oneMonth: number;
        };
        socialDominance: {
          sevenDays: number;
          fourteenDays: number;
          oneMonth: number;
        };
      };
      onChainMetrics: {
        mvrv: {
          sevenDays: number;
          fourteenDays: number;
          oneMonth: number;
        };
      };
    };
    monteCarloAnalysis?: MonteCarloResult;
    riskMetrics?: RiskMetrics;
    scenarioAnalysis?: ScenarioAnalysis;
  }> {
    // Extract closing prices
    const prices = priceData.map(d => d.price).filter(p => p > 0);
    
    if (prices.length < 10) {
      throw new Error('Insufficient price data for analysis');
    }
    
    // Calculate technical indicators with options if enabled
    const technicalIndicators = enableTechnicalAdjustments ? 
      await this.calculateTechnicalIndicatorsWithOptions(prices, enableOptionsAnalysis, baseAsset) : undefined;
    let sentimentAnalysis: { sentiment: 'bullish' | 'bearish' | 'neutral'; score: number; confidence: number; newsCount: number; } | undefined;
    let santimentMetrics: any;
    
    // Calculate current price and 14-day EMA as central trend (more responsive)
    const currentPrice = prices[prices.length - 1];
    const centralTrend = this.calculateEMA(prices, Math.min(14, prices.length));
    
    // Calculate daily returns for volatility with recent weighting
    const returns = this.calculateReturns(prices);
    
  // Enhanced volatility calculation with GARCH-like approach
  const enhancedVolatility = this.calculateEnhancedVolatility(returns, prices);
  let dailyVolatility = enhancedVolatility;
    
    // Calculate historical range for validation (last 30 days actual range)
    const recentPrices = prices.slice(-30);
    const historicalRange = (Math.max(...recentPrices) - Math.min(...recentPrices)) / currentPrice;
    
    // Fetch sentiment analysis if enabled
    if (enableSentimentAnalysis && baseAsset && quoteAsset) {
      try {
        const { data, error } = await supabase.functions.invoke('sentiment-analysis', {
          body: { baseAsset, quoteAsset }
        });
        
        if (!error && data) {
          sentimentAnalysis = data;
          
          // Apply sentiment adjustment to volatility
          if (sentimentAnalysis.confidence > 0.3) {
            const sentimentMultiplier = 1 + (Math.abs(sentimentAnalysis.score) * sentimentAnalysis.confidence * 0.2);
            dailyVolatility *= sentimentMultiplier;
          }
        }
      } catch (error) {
        console.warn('Failed to fetch sentiment analysis:', error);
      }
    }

    // Fetch Santiment analysis if enabled
    if (enableSantimentAnalysis && baseAsset && quoteAsset) {
      try {
        const { data, error } = await supabase.functions.invoke('santiment-analysis', {
          body: { baseAsset, quoteAsset }
        });
        
        if (!error && data) {
          santimentMetrics = data;
          
          // Apply multi-factor Santiment adjustments (weighted scoring)
          const beforeSantiment = dailyVolatility;
          dailyVolatility = this.applySantimentAdjustments(dailyVolatility, data, currentPrice);
          if (!Number.isFinite(dailyVolatility) || dailyVolatility <= 0) {
            console.warn('Invalid volatility after Santiment adjustment, reverting to base.');
            dailyVolatility = beforeSantiment;
          }
        }
      } catch (error) {
        console.warn('Failed to fetch Santiment analysis:', error);
      }
    }

    // Apply smart technical adjustments if enabled
    if (enableTechnicalAdjustments && technicalIndicators) {
      dailyVolatility = this.applySmartTechnicalAdjustments(dailyVolatility, technicalIndicators, currentPrice);
    }
    
    // Calculate liquidity score and momentum for adaptive time horizons
    const liquidityScore = returns.length > 30 ? this.calculateMarketStability(returns) : 0.5;
    const momentumStrength = this.calculateMomentumPersistence(prices);
    
    // Extended time horizons for 4-week forecasting (28 days)
    const projectionDays = enableTechnicalAdjustments && technicalIndicators ? 
      this.getExtendedTimeHorizon(technicalIndicators.volatilityRegime, liquidityScore, momentumStrength) : 28;
    const projectedVolatility = dailyVolatility * Math.sqrt(projectionDays);
    
    // Reduced confidence multiplier for tighter ranges (1.0-1.2σ instead of 1.5-2.5σ)
    const confidenceMultiplier = enableTechnicalAdjustments && technicalIndicators ?
      this.getPracticalConfidenceMultiplier(technicalIndicators) : 1.0;
    let marginOfError = projectedVolatility * confidenceMultiplier * centralTrend;
    
    // Historical range validation - cap at 1.5x recent actual range
    const maxAllowedRange = historicalRange * 1.5 * currentPrice;
    if (marginOfError > maxAllowedRange) {
      marginOfError = maxAllowedRange;
    }
    
    // Apply options skew adjustment if available
    const optionsSkew = this.getOptionsSkewData(technicalIndicators);
    
    // Determine suggested range
    let suggestedMinPrice = Math.max(0, centralTrend - marginOfError);
    let suggestedMaxPrice = centralTrend + marginOfError;
    
    // Adjust range based on options skew (directional bias)
    if (optionsSkew !== null) {
      const skewAdjustment = this.applyOptionsSkewAdjustment(
        suggestedMinPrice,
        suggestedMaxPrice,
        optionsSkew,
        currentPrice
      );
      suggestedMinPrice = skewAdjustment.minPrice;
      suggestedMaxPrice = skewAdjustment.maxPrice;
    }
    
    // Phase 2: Monte Carlo Analysis (if enabled)  
    let monteCarloAnalysis: MonteCarloResult | undefined;
    let riskMetrics: RiskMetrics | undefined;
    let scenarioAnalysis: ScenarioAnalysis | undefined;
    if (enableMonteCarloAnalysis) {
      const { MonteCarloSimulator } = await import('./monteCarloSimulator');
      
      // Calculate dynamic drift based on momentum and technical indicators
      const drift = MonteCarloSimulator.calculateDynamicDrift(prices, technicalIndicators);
      const timeHorizon = projectionDays / 365; // Convert to years
      
      // Run Monte Carlo simulation with jump diffusion
      monteCarloAnalysis = MonteCarloSimulator.generatePricePaths(
        currentPrice,
        dailyVolatility,
        drift,
        timeHorizon,
        50000, // Increased to 50k simulations for better tail risk estimation
        projectionDays, // Dynamic steps based on projection days
        true // Enable jump diffusion
      );
      
      // Calculate risk metrics
      riskMetrics = MonteCarloSimulator.calculateRiskMetrics(
        monteCarloAnalysis.finalPrices,
        currentPrice
      );
      
      // Generate scenario analysis
      scenarioAnalysis = MonteCarloSimulator.generateScenarioAnalysis(
        currentPrice,
        technicalIndicators,
        sentimentAnalysis?.score
      );
      
      // Estimate range success probability
      const rangeSuccessProbability = MonteCarloSimulator.estimateRangeSuccess(
        currentPrice,
        suggestedMinPrice,
        suggestedMaxPrice,
        dailyVolatility,
        timeHorizon
      );
      
      // Update Monte Carlo analysis with range success
      monteCarloAnalysis.successProbability = rangeSuccessProbability;
    }
    
    return {
      centralTrend,
      dailyVolatility,
      projectedVolatility,
      marginOfError,
      suggestedMinPrice,
      suggestedMaxPrice,
      technicalIndicators,
      sentimentAnalysis,
      santimentMetrics,
      monteCarloAnalysis,
      riskMetrics,
      scenarioAnalysis,
    };
  }
  
  // Enhanced volatility calculation with GARCH-like approach and regime detection
  static calculateEnhancedVolatility(returns: number[], prices: number[]): number {
    if (returns.length <= 1) return 0;
    
    // 1. Multi-timeframe volatility calculation
    const shortTermVolatility = this.calculateWeightedVolatility(returns.slice(-30)); // Last 30 days
    const mediumTermVolatility = this.calculateWeightedVolatility(returns.slice(-90)); // Last 90 days
    const longTermVolatility = this.calculateWeightedVolatility(returns.slice(-180)); // Last 180 days
    
    // 2. Volatility clustering detection (GARCH-like)
    const volClustering = this.detectVolatilityClustering(returns);
    
    // 3. Regime change detection
    const currentRegime = this.detectVolatilityRegime(returns.slice(-30));
    const priorRegime = returns.length > 60 ? this.detectVolatilityRegime(returns.slice(-60, -30)) : currentRegime;
    
    // 4. Momentum and trend persistence
    const momentumFactor = this.calculateMomentumPersistence(prices);
    
    // 5. Adaptive weighting based on market conditions
    let baseVolatility = shortTermVolatility;
    
    // Regime adjustment
    if (currentRegime !== priorRegime) {
      // Regime change detected - increase uncertainty
      baseVolatility *= 1.15;
    }
    
    // Volatility clustering adjustment
    if (volClustering > 0.6) {
      // High clustering suggests volatility persistence
      baseVolatility *= (1 + volClustering * 0.2);
    }
    
    // Momentum adjustment
    baseVolatility *= (1 + Math.abs(momentumFactor) * 0.1);
    
    // Blend different timeframes based on stability
    const stabilityScore = this.calculateMarketStability(returns);
    const timeframeWeight = Math.max(0.4, Math.min(0.8, stabilityScore));
    
    return (
      baseVolatility * timeframeWeight +
      mediumTermVolatility * (1 - timeframeWeight) * 0.6 +
      longTermVolatility * (1 - timeframeWeight) * 0.4
    );
  }

  // New method for weighted volatility calculation
  static calculateWeightedVolatility(returns: number[]): number {
    if (returns.length <= 1) return 0;
    
    // Give more weight to recent returns (last 14 days = 70%, older = 30%)
    const recentPeriod = Math.min(14, Math.floor(returns.length * 0.3));
    const recentReturns = returns.slice(-recentPeriod);
    const olderReturns = returns.slice(0, -recentPeriod);
    
    const recentVolatility = this.calculateStandardDeviation(recentReturns);
    const olderVolatility = olderReturns.length > 0 ? this.calculateStandardDeviation(olderReturns) : recentVolatility;
    
    return recentVolatility * 0.7 + olderVolatility * 0.3;
  }

  // Detect volatility clustering (consecutive high volatility periods)
  static detectVolatilityClustering(returns: number[]): number {
    if (returns.length < 10) return 0;
    
    // Calculate rolling volatility windows
    const windowSize = 5;
    const rollingVols: number[] = [];
    
    for (let i = windowSize; i < returns.length; i++) {
      const window = returns.slice(i - windowSize, i);
      rollingVols.push(this.calculateStandardDeviation(window));
    }
    
    if (rollingVols.length < 2) return 0;
    
    // Calculate correlation between consecutive volatility periods
    let correlation = 0;
    for (let i = 1; i < rollingVols.length; i++) {
      correlation += rollingVols[i] * rollingVols[i - 1];
    }
    
    return Math.min(1, correlation / rollingVols.length);
  }

  // Calculate momentum persistence factor
  static calculateMomentumPersistence(prices: number[]): number {
    if (prices.length < 20) return 0;
    
    // Calculate short and long term trends
    const shortTrend = (prices[prices.length - 1] - prices[prices.length - 10]) / prices[prices.length - 10];
    const longTrend = (prices[prices.length - 1] - prices[prices.length - 20]) / prices[prices.length - 20];
    
    // Momentum persistence = trend consistency
    const persistence = shortTrend * longTrend > 0 ? Math.abs(shortTrend + longTrend) / 2 : 0;
    
    return Math.min(1, persistence);
  }

  // Calculate market stability score
  static calculateMarketStability(returns: number[]): number {
    if (returns.length < 30) return 0.5;
    
    // Recent volatility vs longer-term average
    const recentVol = this.calculateStandardDeviation(returns.slice(-14));
    const longerVol = this.calculateStandardDeviation(returns.slice(-30));
    
    if (longerVol === 0) return 0.5;
    
    const volRatio = recentVol / longerVol;
    
    // Stability is higher when current volatility is close to average
    return Math.max(0, Math.min(1, 2 - Math.abs(volRatio - 1)));
  }

  // Smart technical adjustments that reduce volatility when markets are stable
  static applySmartTechnicalAdjustments(baseVolatility: number, indicators: TechnicalIndicators, currentPrice: number): number {
    let adjustedVolatility = baseVolatility;
    
    // RSI stability adjustments - reduce volatility when RSI is neutral
    if (indicators.rsi >= 30 && indicators.rsi <= 70) {
      // Neutral RSI suggests stable conditions
      adjustedVolatility *= 0.9;
    } else if (indicators.rsi > 80 || indicators.rsi < 20) {
      // Extreme RSI - expect volatility
      adjustedVolatility *= 1.1;
    }
    
    // Bollinger Band stability adjustments
    if (indicators.bollingerBands.bandwidth > 0.15 && indicators.bollingerBands.bandwidth < 0.25) {
      // Normal bandwidth suggests stable volatility
      adjustedVolatility *= 0.95;
    } else if (indicators.bollingerBands.bandwidth < 0.1) {
      // Bollinger squeeze - expect volatility expansion
      adjustedVolatility *= 1.15;
    }
    
    // MACD trend strength - reduce volatility when trend is clear and stable
    if (Math.abs(indicators.macd.histogram) < Math.abs(indicators.macd.macd) * 0.2) {
      // Stable trend
      adjustedVolatility *= 0.92;
    }
    
    // Price position within Bollinger Bands - reduce volatility when price is centered
    if (Math.abs(indicators.bollingerBands.position) < 0.3) {
      // Price near middle band suggests stability
      adjustedVolatility *= 0.9;
    }
    
    return adjustedVolatility;
  }
  
  // Adaptive time horizons based on regime, liquidity, and momentum (14-42 days)
  static getExtendedTimeHorizon(
    regime: 'low' | 'normal' | 'high',
    liquidityScore: number = 0.5,
    momentumStrength: number = 0
  ): number {
    let baseHorizon = 28; // Default 4-week horizon
    
    // Adjust based on volatility regime
    switch (regime) {
      case 'low':
        baseHorizon = 35; // Longer in stable markets
        break;
      case 'high':
        baseHorizon = 21; // Shorter in volatile markets
        break;
    }
    
    // Liquidity adjustment: high liquidity allows longer horizons
    if (liquidityScore > 0.7) {
      baseHorizon += 7; // Add 1 week for high liquidity
    } else if (liquidityScore < 0.3) {
      baseHorizon -= 7; // Reduce 1 week for low liquidity
    }
    
    // Momentum adjustment: high momentum suggests medium-term ranges
    if (momentumStrength > 0.6) {
      baseHorizon = Math.min(baseHorizon, 28); // Cap at 4 weeks for trending
    }
    
    // Clamp to reasonable bounds
    return Math.max(14, Math.min(42, baseHorizon));
  }

  // Legacy method for backward compatibility
  static getPracticalTimeHorizon(regime: 'low' | 'normal' | 'high'): number {
    return this.getExtendedTimeHorizon(regime);
  }
  
  // Expanded confidence multiplier for crypto markets (1.2-2.0σ)
  static getPracticalConfidenceMultiplier(indicators: TechnicalIndicators): number {
    let multiplier = 1.5; // Higher base for crypto volatility
    
    // Stronger adjustments for extreme conditions
    if (indicators.rsi > 85 || indicators.rsi < 15) {
      multiplier += 0.3; // Increased from 0.15
    }
    
    // Adjust for stability (but keep wider ranges)
    if (Math.abs(indicators.bollingerBands.position) < 0.3 && 
        indicators.rsi >= 40 && indicators.rsi <= 60) {
      multiplier -= 0.1; // Slight reduction when stable
    }
    
    // Stronger adjustments based on volatility regime
    switch (indicators.volatilityRegime) {
      case 'high':
        multiplier += 0.4; // Increased from 0.2
        break;
      case 'low':
        multiplier -= 0.2; // More reduction in low volatility
        break;
    }
    
    return Math.max(1.2, Math.min(2.0, multiplier)); // Expanded range: 1.2-2.0σ
  }

  // Extract options skew data from technical indicators
  static getOptionsSkewData(indicators?: TechnicalIndicators): number | null {
    if (!indicators?.optionsMetrics) return null;
    
    // Calculate skew ratio from put/call ratio
    const putCallRatio = indicators.optionsMetrics.putCallRatio;
    if (!putCallRatio || typeof putCallRatio !== 'number') return null;
    
    return putCallRatio;
  }

  // Apply options skew adjustment to price ranges
  static applyOptionsSkewAdjustment(
    minPrice: number,
    maxPrice: number,
    skewRatio: number,
    currentPrice: number
  ): { minPrice: number; maxPrice: number } {
    const rangeSize = maxPrice - minPrice;
    
    // Skew ratio > 1.15 = put-heavy (bearish bias, shift range down)
    // Skew ratio < 0.85 = call-heavy (bullish bias, shift range up)
    let shiftPercentage = 0;
    
    if (skewRatio > 1.15) {
      // Put-heavy: shift down 5-10%
      shiftPercentage = -Math.min(0.1, (skewRatio - 1) * 0.15);
    } else if (skewRatio < 0.85) {
      // Call-heavy: shift up 5-10%
      shiftPercentage = Math.min(0.1, (1 - skewRatio) * 0.15);
    }
    
    const shiftAmount = rangeSize * shiftPercentage;
    
    return {
      minPrice: Math.max(0, minPrice + shiftAmount),
      maxPrice: maxPrice + shiftAmount
    };
  }

  // Apply Santiment adjustments using current market activity data
  static applySantimentAdjustments(
    baseVolatility: number,
    santimentData: {
      socialSentiment?: {
        score?: number;
        confidence?: number;
        socialVolume?: { sevenDays?: number; fourteenDays?: number; oneMonth?: number; };
        socialDominance?: { sevenDays?: number; fourteenDays?: number; oneMonth?: number; };
      };
      onChainMetrics?: {
        mvrv?: { sevenDays?: number; fourteenDays?: number; oneMonth?: number; };
      };
    },
    currentPrice: number
  ): number {
    // Safety helpers
    const safeNum = (n: unknown, fallback = 0) => {
      const v = typeof n === 'number' ? n : Number(n);
      return Number.isFinite(v) ? v : fallback;
    };
    const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

    try {
      if (!santimentData) return baseVolatility;

      const marginOfError = safeNum(baseVolatility * currentPrice, 0);

      // Social inputs - focus on current activity levels
      const ss = santimentData.socialSentiment ?? {};
      const score = clamp(safeNum(ss.score, 0), -1, 1);      // sentiment direction: -1..1
      const conf = clamp(safeNum(ss.confidence, 0.4), 0, 1); // confidence level: 0..1
      const vol7 = safeNum(ss.socialVolume?.sevenDays, 0);
      const dom7 = safeNum(ss.socialDominance?.sevenDays, 0);

      // Current activity level (normalized)
      const activityLevel = Math.min(1, (vol7 / 1000 + dom7 / 5) / 2); // 0..1 scale
      
      // Social impact based on current activity and sentiment strength
      const socialImpact = Math.abs(score) * conf * activityLevel;

      // On-chain MVRV inputs - focus on current deviation from fair value
      const mvrv = santimentData.onChainMetrics?.mvrv ?? {};
      const currentMVRV = safeNum(mvrv.sevenDays, 1);
      
      // MVRV deviation from fair value (1.0)
      const mvrvDeviation = Math.abs(currentMVRV - 1.0);
      const mvrvImpact = Math.min(0.3, mvrvDeviation); // Cap at 30% impact

      // Calculate volatility adjustments based on current market conditions
      // Higher activity and stronger deviations = wider ranges
      const socialWidth = socialImpact * 0.25 * marginOfError; // Up to 25% width from social
      const mvrvWidth = mvrvImpact * 0.20 * marginOfError;     // Up to 20% width from MVRV

      const totalWidth = safeNum(socialWidth + mvrvWidth, 0);
      const volatilityAdj = safeNum(totalWidth / Math.max(currentPrice, 1e-12), 0);

      // Apply the adjustment
      const adjusted = baseVolatility + volatilityAdj;
      if (!Number.isFinite(adjusted) || adjusted <= 0) return baseVolatility;

      // Reasonable bounds: 50% to 150% of base volatility
      return clamp(adjusted, baseVolatility * 0.5, baseVolatility * 1.5);
    } catch {
      return baseVolatility;
    }
  }
}