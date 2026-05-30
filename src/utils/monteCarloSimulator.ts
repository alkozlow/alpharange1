import type { TechnicalIndicators } from '@/types/uniswap';
import type { MonteCarloResult, RiskMetrics, ScenarioAnalysis } from './calculations';

export class MonteCarloSimulator {
  private static normalRandom(): number {
    // Box-Muller transformation for normal distribution
    let u = 0, v = 0;
    while(u === 0) u = Math.random(); // Converting [0,1) to (0,1)
    while(v === 0) v = Math.random();
    return Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
  }

  // Calculate dynamic drift based on recent momentum and technical indicators
  static calculateDynamicDrift(
    prices: number[],
    technicalIndicators?: TechnicalIndicators
  ): number {
    if (prices.length < 10) return 0;
    
    // 1. Calculate recent momentum (5-20 day returns)
    const recentPrices = prices.slice(-20);
    const shortTermReturn = (recentPrices[recentPrices.length - 1] - recentPrices[Math.max(0, recentPrices.length - 5)]) / 
                           recentPrices[Math.max(0, recentPrices.length - 5)];
    const mediumTermReturn = (recentPrices[recentPrices.length - 1] - recentPrices[0]) / recentPrices[0];
    
    // 2. Weight recent momentum more heavily
    let drift = (shortTermReturn * 0.6 + mediumTermReturn * 0.4) * 365; // Annualized
    
    // 3. Adjust based on technical indicators if available
    if (technicalIndicators) {
      const { rsi, macd } = technicalIndicators;
      
      // RSI momentum adjustment
      const rsiMomentum = (rsi - 50) / 100; // -0.5 to +0.5
      drift += rsiMomentum * 0.1;
      
      // MACD direction adjustment
      if (macd.histogram > 0) {
        drift += 0.05; // Positive momentum
      } else if (macd.histogram < 0) {
        drift -= 0.05; // Negative momentum
      }
    }
    
    // 4. Clamp drift to reasonable bounds (-0.2 to +0.2 annualized)
    return Math.max(-0.2, Math.min(0.2, drift));
  }

  static generatePricePaths(
    currentPrice: number,
    volatility: number,
    drift: number,
    timeHorizon: number,
    numSimulations: number = 10000,
    numSteps: number = 28,
    enableJumpDiffusion: boolean = false
  ): MonteCarloResult {
    // Jump diffusion parameters (for sudden price moves)
    const jumpIntensity = 0.1; // ~10% chance of jump per day
    const jumpMean = 0; // Average jump size (neutral)
    const jumpStdDev = 0.15; // Jump volatility (15%)
    const pricePaths: number[][] = [];
    const finalPrices: number[] = [];
    const dt = timeHorizon / numSteps;
    
    for (let sim = 0; sim < numSimulations; sim++) {
      const path: number[] = [currentPrice];
      let price = currentPrice;
      
      for (let step = 0; step < numSteps; step++) {
        const randomShock = this.normalRandom();
        const driftTerm = drift * dt;
        const diffusionTerm = volatility * Math.sqrt(dt) * randomShock;
        
        // Jump diffusion component (sudden price moves)
        let jumpComponent = 0;
        if (enableJumpDiffusion) {
          const hasJump = Math.random() < (jumpIntensity * dt);
          if (hasJump) {
            jumpComponent = jumpMean + jumpStdDev * this.normalRandom();
          }
        }
        
        // Geometric Brownian Motion with jump diffusion
        price = price * Math.exp(driftTerm + diffusionTerm + jumpComponent);
        path.push(price);
      }
      
      pricePaths.push(path);
      finalPrices.push(price);
    }
    
    // Calculate statistics
    finalPrices.sort((a, b) => a - b);
    const returns = finalPrices.map(p => (p - currentPrice) / currentPrice);
    
    const successProbability = finalPrices.filter(p => p >= currentPrice * 0.95 && p <= currentPrice * 1.05).length / numSimulations;
    const expectedReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const worstCase = Math.min(...finalPrices);
    const bestCase = Math.max(...finalPrices);
    
    // Confidence intervals
    const p80Index = Math.floor(numSimulations * 0.1);
    const p90Index = Math.floor(numSimulations * 0.05);
    const p95Index = Math.floor(numSimulations * 0.025);
    
    const confidenceIntervals = {
      p80: {
        min: finalPrices[p80Index],
        max: finalPrices[numSimulations - 1 - p80Index]
      },
      p90: {
        min: finalPrices[p90Index],
        max: finalPrices[numSimulations - 1 - p90Index]
      },
      p95: {
        min: finalPrices[p95Index],
        max: finalPrices[numSimulations - 1 - p95Index]
      }
    };
    
    return {
      pricePaths: pricePaths.slice(0, 100), // Return subset for visualization
      finalPrices,
      successProbability,
      expectedReturn,
      worstCase,
      bestCase,
      confidenceIntervals
    };
  }

  static calculateRiskMetrics(finalPrices: number[], currentPrice: number): RiskMetrics {
    const returns = finalPrices.map(p => (p - currentPrice) / currentPrice);
    returns.sort((a, b) => a - b);
    
    const numSims = returns.length;
    
    // Value at Risk (negative returns)
    const var80 = -returns[Math.floor(numSims * 0.2)];
    const var90 = -returns[Math.floor(numSims * 0.1)];
    const var95 = -returns[Math.floor(numSims * 0.05)];
    
    // Expected Shortfall (conditional VaR)
    const tailReturns80 = returns.slice(0, Math.floor(numSims * 0.2));
    const tailReturns90 = returns.slice(0, Math.floor(numSims * 0.1));
    const tailReturns95 = returns.slice(0, Math.floor(numSims * 0.05));
    
    const es80 = -tailReturns80.reduce((sum, r) => sum + r, 0) / tailReturns80.length;
    const es90 = -tailReturns90.reduce((sum, r) => sum + r, 0) / tailReturns90.length;
    const es95 = -tailReturns95.reduce((sum, r) => sum + r, 0) / tailReturns95.length;
    
    // Maximum drawdown
    const maxDrawdown = Math.max(...returns.map(r => Math.max(0, -r)));
    
    // Multi-threshold tail risk metrics
    const tailRiskSevere = returns.filter(r => r < -0.1).length / numSims;       // >10% loss
    const tailRiskExtreme = returns.filter(r => r < -0.2).length / numSims;      // >20% loss
    const tailRiskCatastrophic = returns.filter(r => r < -0.5).length / numSims; // >50% loss
    
    // Volatility of volatility (exponentially weighted rolling vol changes)
    const rollingVols: number[] = [];
    const windowSize = 10;
    for (let i = windowSize; i < returns.length; i += windowSize) {
      const window = returns.slice(i - windowSize, i);
      // Apply exponential weighting to recent data
      let weightedSum = 0;
      let weightSum = 0;
      for (let j = 0; j < window.length; j++) {
        const weight = Math.exp(j / window.length); // More weight to recent
        weightedSum += weight * window[j] * window[j];
        weightSum += weight;
      }
      const vol = Math.sqrt(weightedSum / weightSum);
      rollingVols.push(vol);
    }
    const volOfVol = rollingVols.length > 1 ? 
      Math.sqrt(rollingVols.reduce((sum, v, i) => {
        if (i === 0) return 0;
        const change = v - rollingVols[i-1];
        return sum + change * change;
      }, 0) / (rollingVols.length - 1)) : 0;
    
    return {
      valueAtRisk: { p80: var80, p90: var90, p95: var95 },
      expectedShortfall: { p80: es80, p90: es90, p95: es95 },
      maxDrawdown,
      tailRisk: {
        severe: tailRiskSevere,
        extreme: tailRiskExtreme,
        catastrophic: tailRiskCatastrophic
      },
      volatilityOfVolatility: volOfVol
    };
  }

  static generateScenarioAnalysis(
    currentPrice: number,
    technicalIndicators?: TechnicalIndicators,
    sentimentScore?: number
  ): ScenarioAnalysis {
    // Base probabilities
    let bullProb = 0.25;
    let baseProb = 0.5;
    let bearProb = 0.25;
    
    // Adjust probabilities based on technical indicators
    if (technicalIndicators) {
      const { rsi, bollingerBands, volatilityRegime } = technicalIndicators;
      
      // RSI adjustment
      if (rsi > 70) {
        bearProb += 0.1;
        bullProb -= 0.05;
      } else if (rsi < 30) {
        bullProb += 0.1;
        bearProb -= 0.05;
      }
      
      // Bollinger Bands adjustment
      if (bollingerBands.position > 0.8) {
        bearProb += 0.05;
      } else if (bollingerBands.position < 0.2) {
        bullProb += 0.05;
      }
      
      // Volatility regime adjustment
      if (volatilityRegime === 'high') {
        baseProb -= 0.1;
        bullProb += 0.05;
        bearProb += 0.05;
      }
    }
    
    // Sentiment adjustment
    if (sentimentScore !== undefined) {
      const sentimentAdjustment = sentimentScore * 0.1;
      bullProb += sentimentAdjustment;
      bearProb -= sentimentAdjustment;
    }
    
    // Normalize probabilities
    const total = bullProb + baseProb + bearProb;
    bullProb /= total;
    baseProb /= total;
    bearProb /= total;
    
    return {
      bullCase: {
        probability: bullProb,
        minPrice: currentPrice * 1.05,
        maxPrice: currentPrice * 1.35,
        expectedReturn: 0.2
      },
      baseCase: {
        probability: baseProb,
        minPrice: currentPrice * 0.92,
        maxPrice: currentPrice * 1.08,
        expectedReturn: 0.0
      },
      bearCase: {
        probability: bearProb,
        minPrice: currentPrice * 0.65,
        maxPrice: currentPrice * 0.95,
        expectedReturn: -0.2
      }
    };
  }

  static estimateRangeSuccess(
    currentPrice: number,
    minPrice: number,
    maxPrice: number,
    volatility: number,
    timeHorizon: number,
    numSimulations: number = 5000
  ): number {
    let successCount = 0;
    const numSteps = 28;
    const dt = timeHorizon / numSteps;
    const drift = 0; // Assume neutral drift for range success estimation
    
    for (let sim = 0; sim < numSimulations; sim++) {
      let price = currentPrice;
      let inRange = true;
      
      for (let step = 0; step < numSteps && inRange; step++) {
        const randomShock = this.normalRandom();
        const driftTerm = drift * dt;
        const diffusionTerm = volatility * Math.sqrt(dt) * randomShock;
        
        price = price * Math.exp(driftTerm + diffusionTerm);
        
        if (price < minPrice || price > maxPrice) {
          inRange = false;
        }
      }
      
      if (inRange) {
        successCount++;
      }
    }
    
    return successCount / numSimulations;
  }
}