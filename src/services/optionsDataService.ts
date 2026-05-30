import { PriceData } from '@/types/uniswap';

export interface OptionsData {
  symbol: string;
  spotPrice: number;
  impliedVolatility: {
    atm: number; // At-the-money 30-day IV
    termStructure: {
      '7d': number;
      '14d': number;
      '30d': number;
      '90d': number;
    };
    skew: {
      put25Delta: number;
      call25Delta: number;
      skewRatio: number; // put IV / call IV
    };
  };
  volatilityMetrics: {
    historicalVol: number;
    ivRank: number; // Current IV percentile vs 30-day range
    ivPercentile: number; // Current IV percentile vs 90-day range
    regime: 'low' | 'normal' | 'high';
  };
  putCallRatio: number;
  vixIndex?: number; // DVOL for Bitcoin when available
  openInterest: {
    totalPuts: number;
    totalCalls: number;
    putCallOIRatio: number;
  };
  optionsFlow: {
    sentiment: 'bullish' | 'bearish' | 'neutral';
    confidence: number;
    netFlow: number; // Positive = more call buying
  };
}

export interface VolatilitySurface {
  strikes: number[];
  expirations: string[];
  impliedVolatilities: number[][];
  delta: number[][];
  gamma: number[][];
}

export interface RiskNeutralProbabilities {
  strikePrice: number;
  probability: number;
  isInRange: boolean;
}

export class OptionsDataService {
  private cache = new Map<string, { data: OptionsData; timestamp: number }>();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  async getOptionsData(symbol: string): Promise<OptionsData | null> {
    const cacheKey = symbol.toUpperCase();
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      // Try Deribit first (main crypto options exchange)
      const deribitData = await this.fetchFromDeribit(symbol);
      if (deribitData) {
        this.cache.set(cacheKey, { data: deribitData, timestamp: Date.now() });
        return deribitData;
      }

      // Fallback to Delta Exchange
      const deltaData = await this.fetchFromDelta(symbol);
      if (deltaData) {
        this.cache.set(cacheKey, { data: deltaData, timestamp: Date.now() });
        return deltaData;
      }

      return null;
    } catch (error) {
      console.error('Error fetching options data:', error);
      return null;
    }
  }

  private async fetchFromDeribit(symbol: string): Promise<OptionsData | null> {
    try {
      const instrument = `${symbol.toUpperCase()}-PERPETUAL`;
      
      // Get current spot price
      const tickerResponse = await fetch(`https://www.deribit.com/api/v2/public/get_ticker?instrument_name=${instrument}`);
      const tickerData = await tickerResponse.json();
      
      if (!tickerData.result) return null;
      
      const spotPrice = tickerData.result.last_price;

      // Get options instruments
      const instrumentsResponse = await fetch(`https://www.deribit.com/api/v2/public/get_instruments?currency=${symbol.toUpperCase()}&kind=option&expired=false`);
      const instrumentsData = await instrumentsResponse.json();
      
      if (!instrumentsData.result) return null;

      // Process options data to calculate IV metrics
      const options = instrumentsData.result;
      const ivData = this.processOptionsForIV(options, spotPrice);
      
      return {
        symbol: symbol.toUpperCase(),
        spotPrice,
        impliedVolatility: ivData.impliedVolatility,
        volatilityMetrics: ivData.volatilityMetrics,
        putCallRatio: ivData.putCallRatio,
        openInterest: ivData.openInterest,
        optionsFlow: ivData.optionsFlow,
      };
    } catch (error) {
      console.error('Deribit API error:', error);
      return null;
    }
  }

  private async fetchFromDelta(symbol: string): Promise<OptionsData | null> {
    try {
      // Delta Exchange implementation would go here
      // For now, return null as fallback
      console.log('Delta Exchange fallback not yet implemented for', symbol);
      return null;
    } catch (error) {
      console.error('Delta Exchange API error:', error);
      return null;
    }
  }

  private processOptionsForIV(options: any[], spotPrice: number) {
    // Filter for 30-day options near ATM
    const atmOptions = options.filter(opt => {
      const strike = parseFloat(opt.strike);
      const daysToExpiry = this.getDaysToExpiry(opt.expiration_timestamp);
      return Math.abs(strike - spotPrice) / spotPrice < 0.1 && daysToExpiry >= 25 && daysToExpiry <= 35;
    });

    // Calculate ATM IV (average of call and put)
    const atmIV = atmOptions.reduce((sum, opt) => {
      return sum + (opt.mark_iv || 0);
    }, 0) / Math.max(atmOptions.length, 1);

    // Build term structure
    const termStructure = this.buildTermStructure(options, spotPrice);
    
    // Calculate skew
    const skew = this.calculateSkew(options, spotPrice);
    
    // Calculate put/call ratio
    const putCallRatio = this.calculatePutCallRatio(options);
    
    // Calculate IV rank and regime
    const volatilityMetrics = this.calculateVolatilityMetrics(atmIV, options);
    
    // Calculate options flow sentiment
    const optionsFlow = this.calculateOptionsFlow(options);

    return {
      impliedVolatility: {
        atm: atmIV,
        termStructure,
        skew,
      },
      volatilityMetrics,
      putCallRatio: putCallRatio.ratio,
      openInterest: putCallRatio.openInterest,
      optionsFlow,
    };
  }

  private getDaysToExpiry(timestamp: number): number {
    return Math.ceil((timestamp - Date.now()) / (1000 * 60 * 60 * 24));
  }

  private buildTermStructure(options: any[], spotPrice: number) {
    const terms = ['7d', '14d', '30d', '90d'];
    const ranges = { '7d': [5, 10], '14d': [10, 20], '30d': [25, 35], '90d': [80, 100] };
    
    const termStructure: any = {};
    
    terms.forEach(term => {
      const [minDays, maxDays] = ranges[term as keyof typeof ranges];
      const termOptions = options.filter(opt => {
        const days = this.getDaysToExpiry(opt.expiration_timestamp);
        const strike = parseFloat(opt.strike);
        return days >= minDays && days <= maxDays && Math.abs(strike - spotPrice) / spotPrice < 0.05;
      });
      
      termStructure[term] = termOptions.reduce((sum, opt) => sum + (opt.mark_iv || 0), 0) / Math.max(termOptions.length, 1);
    });
    
    return termStructure;
  }

  private calculateSkew(options: any[], spotPrice: number) {
    // Get 25-delta puts and calls for skew calculation
    const puts25d = options.filter(opt => opt.option_type === 'put' && Math.abs(parseFloat(opt.strike) - spotPrice * 0.9) / spotPrice < 0.05);
    const calls25d = options.filter(opt => opt.option_type === 'call' && Math.abs(parseFloat(opt.strike) - spotPrice * 1.1) / spotPrice < 0.05);
    
    const put25Delta = puts25d.reduce((sum, opt) => sum + (opt.mark_iv || 0), 0) / Math.max(puts25d.length, 1);
    const call25Delta = calls25d.reduce((sum, opt) => sum + (opt.mark_iv || 0), 0) / Math.max(calls25d.length, 1);
    
    return {
      put25Delta,
      call25Delta,
      skewRatio: put25Delta / Math.max(call25Delta, 0.01),
    };
  }

  private calculatePutCallRatio(options: any[]) {
    const puts = options.filter(opt => opt.option_type === 'put');
    const calls = options.filter(opt => opt.option_type === 'call');
    
    const totalPuts = puts.reduce((sum, opt) => sum + (opt.open_interest || 0), 0);
    const totalCalls = calls.reduce((sum, opt) => sum + (opt.open_interest || 0), 0);
    
    return {
      ratio: totalPuts / Math.max(totalCalls, 1),
      openInterest: {
        totalPuts,
        totalCalls,
        putCallOIRatio: totalPuts / Math.max(totalCalls, 1),
      },
    };
  }

  private calculateVolatilityMetrics(atmIV: number, options: any[]) {
    // Calculate historical 30-day realized volatility for comparison
    const historicalVol = 0.6; // Placeholder - would need historical price data
    
    // IV rank - current IV percentile vs recent range
    const recentIVs = options.map(opt => opt.mark_iv || 0).filter(iv => iv > 0);
    const ivRank = this.calculatePercentile(atmIV, recentIVs);
    
    // Determine volatility regime
    let regime: 'low' | 'normal' | 'high' = 'normal';
    if (ivRank < 30) regime = 'low';
    else if (ivRank > 70) regime = 'high';
    
    return {
      historicalVol,
      ivRank,
      ivPercentile: ivRank,
      regime,
    };
  }

  private calculateOptionsFlow(options: any[]) {
    // Simplified flow analysis based on volume and open interest changes
    const totalVolume = options.reduce((sum, opt) => sum + (opt.stats?.volume || 0), 0);
    const callVolume = options.filter(opt => opt.option_type === 'call').reduce((sum, opt) => sum + (opt.stats?.volume || 0), 0);
    const putVolume = options.filter(opt => opt.option_type === 'put').reduce((sum, opt) => sum + (opt.stats?.volume || 0), 0);
    
    const netFlow = callVolume - putVolume;
    const flowRatio = netFlow / Math.max(totalVolume, 1);
    
    let sentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    if (flowRatio > 0.2) sentiment = 'bullish';
    else if (flowRatio < -0.2) sentiment = 'bearish';
    
    return {
      sentiment,
      confidence: Math.min(Math.abs(flowRatio) * 5, 1), // 0-1 confidence based on flow magnitude
      netFlow,
    };
  }

  private calculatePercentile(value: number, dataset: number[]): number {
    const sorted = dataset.sort((a, b) => a - b);
    const index = sorted.findIndex(v => v >= value);
    return (index / sorted.length) * 100;
  }

  // Calculate risk-neutral probabilities from options prices
  async getRiskNeutralProbabilities(symbol: string, minPrice: number, maxPrice: number): Promise<RiskNeutralProbabilities[]> {
    const optionsData = await this.getOptionsData(symbol);
    if (!optionsData) return [];

    // Simplified risk-neutral probability calculation
    // In practice, this would use the full volatility surface
    const spotPrice = optionsData.spotPrice;
    const iv = optionsData.impliedVolatility.atm;
    
    const probabilities: RiskNeutralProbabilities[] = [];
    const strikes = this.generateStrikes(spotPrice, minPrice, maxPrice);
    
    strikes.forEach(strike => {
      // Black-Scholes-based probability density
      const d = Math.log(strike / spotPrice) / (iv * Math.sqrt(30 / 365));
      const probability = Math.exp(-0.5 * d * d) / (iv * Math.sqrt(2 * Math.PI * 30 / 365));
      
      probabilities.push({
        strikePrice: strike,
        probability: probability * 0.1, // Normalize
        isInRange: strike >= minPrice && strike <= maxPrice,
      });
    });
    
    return probabilities;
  }

  private generateStrikes(spotPrice: number, minPrice: number, maxPrice: number): number[] {
    const strikes: number[] = [];
    const range = Math.max(maxPrice - minPrice, spotPrice * 0.2);
    const step = range / 20;
    
    for (let strike = Math.max(minPrice - range * 0.1, spotPrice * 0.5); strike <= maxPrice + range * 0.1; strike += step) {
      strikes.push(strike);
    }
    
    return strikes;
  }

  // Enhanced volatility calibration for Monte Carlo
  async getVolatilityCalibration(symbol: string, timeHorizon: number): Promise<{
    calibratedVolatility: number;
    confidence: number;
    regime: string;
  }> {
    const optionsData = await this.getOptionsData(symbol);
    if (!optionsData) {
      return {
        calibratedVolatility: 0.6, // Default fallback
        confidence: 0.5,
        regime: 'normal',
      };
    }

    // Use appropriate term structure based on time horizon
    let targetIV = optionsData.impliedVolatility.atm;
    if (timeHorizon <= 10) targetIV = optionsData.impliedVolatility.termStructure['7d'];
    else if (timeHorizon <= 20) targetIV = optionsData.impliedVolatility.termStructure['14d'];
    else if (timeHorizon <= 40) targetIV = optionsData.impliedVolatility.termStructure['30d'];
    else targetIV = optionsData.impliedVolatility.termStructure['90d'];

    // Adjust for volatility regime
    const regimeMultiplier = optionsData.volatilityMetrics.regime === 'high' ? 1.2 : 
                           optionsData.volatilityMetrics.regime === 'low' ? 0.8 : 1.0;
    
    const calibratedVolatility = targetIV * regimeMultiplier;
    const confidence = 1 - Math.abs(targetIV - optionsData.volatilityMetrics.historicalVol) / targetIV;

    return {
      calibratedVolatility,
      confidence: Math.max(confidence, 0.6),
      regime: optionsData.volatilityMetrics.regime,
    };
  }
}

export const optionsDataService = new OptionsDataService();