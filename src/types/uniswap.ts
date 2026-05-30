export interface TechnicalIndicators {
  rsi: number;
  macd: {
    macd: number;
    signal: number;
    histogram: number;
  };
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
    bandwidth: number;
    position: number;
  };
  volatilityRegime: 'low' | 'normal' | 'high';
  // Phase 1: Advanced Technical Indicators
  rateOfChange?: {
    short: number;
    medium: number;
    long: number;
  };
  commodityChannelIndex?: number;
  supportResistance?: {
    support: number[];
    resistance: number[];
    currentLevel: 'support' | 'resistance' | 'between';
  };
  cycleAnalysis?: {
    dominantCycle: number;
    cycleStrength: number;
    currentPhase: 'accumulation' | 'markup' | 'distribution' | 'markdown';
  };
  garchVolatility?: {
    forecast: number;
    alpha: number;
    beta: number;
    omega: number;
    persistence: number;
  };
  // Options market data integration
  optionsMetrics?: {
    impliedVolatility: {
      atm: number;
      ivRank: number;
      ivPercentile: number;
      regime: 'low' | 'normal' | 'high';
    };
    volatilityCalibration: {
      calibratedVolatility: number;
      confidence: number;
      marketVolatility: number;
    };
    putCallRatio: number;
    optionsFlow: {
      sentiment: 'bullish' | 'bearish' | 'neutral';
      confidence: number;
    };
    riskNeutralProbabilities?: {
      withinRange: number;
      tailRiskUp: number;
      tailRiskDown: number;
    };
  };
}

export interface TokenInfo {
  id: string;
  symbol: string;
  name: string;
  decimals: number;
}

export interface PoolInfo {
  id: string;
  token0: TokenInfo;
  token1: TokenInfo;
  feeTier: number;
  chainName?: string;
}

export interface PriceData {
  date: string;
  price: number;
}

export interface AnalysisResult {
  identifiedPair: string;
  baseAsset: string;
  quoteAsset: string;
  currentPrice: number;
  suggestedMinPrice: number;
  suggestedMaxPrice: number;
  minPriceChange: number; // percentage change from current price
  maxPriceChange: number; // percentage change from current price
  centralTrend: number;
  dailyVolatility: number;
  projectedVolatility: number;
  marginOfError: number;
  confidence: number;
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
  projectionDays: number;
  // Enhanced with options market data
  optionsEnhanced?: {
    volatilityRegime: 'low' | 'normal' | 'high';
    marketVolatility: number;
    optionsConfidence: number;
    riskNeutralProbability: number;
  };
  // Phase 2: Monte Carlo & Risk Analysis
  monteCarloAnalysis?: {
    pricePaths: number[][];
    successProbability: number;
    expectedReturn: number;
    worstCase: number;
    bestCase: number;
    confidenceIntervals: {
      p80: { min: number; max: number };
      p90: { min: number; max: number };
      p95: { min: number; max: number };
    };
  };
  riskMetrics?: {
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
    tailRisk: number;
    volatilityOfVolatility: number;
  };
  scenarioAnalysis?: {
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
  };
}

export interface PositionData {
  tokenId: string;
  tickLower: number;
  tickUpper: number;
  liquidity: string;
  feeGrowthInside0LastX128: string;
  feeGrowthInside1LastX128: string;
  tokensOwed0: string;
  tokensOwed1: string;
  poolAddress: string;
  minPrice: number;
  maxPrice: number;
  currentPrice: number;
  inRange: boolean;
  efficiency: number;
  // Enhanced position data
  token0Address: string;
  token1Address: string;
  token0Symbol: string;
  token1Symbol: string;
  token0Decimals: number;
  token1Decimals: number;
  currentTick: number;
  chainName: string;
  // USD-oriented pricing (when applicable)
  minPriceUSD?: number;
  maxPriceUSD?: number;
  currentPriceUSD?: number;
  baseAsset: string;
  quoteAsset: string;
}

export interface PositionAnalysisResult {
  positionHealth: 'optimal' | 'good' | 'needs_attention' | 'out_of_range';
  capitalEfficiency: number;
  feesEarned: {
    token0: number;
    token1: number;
    totalUSD: number;
    totalToken0: number;
    totalToken1: number;
    totalEarnedUSD: number;
    unclaimedToken0: number;
    unclaimedToken1: number;
    unclaimedUSD: number;
    // Enhanced USD breakdowns
    token0USD: number; // Unclaimed token0 in USD
    token1USD: number; // Unclaimed token1 in USD
    totalToken0USD: number; // Total token0 fees in USD
    totalToken1USD: number; // Total token1 fees in USD
  };
  impermanentLoss: {
    percentage: number;
    dollarAmount: number;
  };
  daysInRange: number;
  daysOutOfRange: number;
  recommendations: {
    action: 'hold' | 'narrow_range' | 'widen_range' | 'rebalance' | 'close_position';
    reasoning: string;
    expectedImprovement: string;
    gasCostEstimate?: number;
  }[];
}

export interface ExtendedAnalysisResult extends AnalysisResult {
  positionAnalysis?: PositionAnalysisResult;
  currentPosition?: PositionData;
}

export interface CalculationProgress {
  phase: 'idle' | 'identifying' | 'fetching' | 'analyzing' | 'position_fetching' | 'position_analyzing' | 'complete' | 'error';
  message: string;
  progress: number;
}