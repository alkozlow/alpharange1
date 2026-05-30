import { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { ProgressIndicator } from "./ProgressIndicator";
import { OptimizedResultsDisplay } from "./OptimizedResultsDisplay";
import { AdvancedSettings } from "./AdvancedSettings";
import { ErrorBoundary } from "./ErrorBoundary";
import { NetworkStatus } from "./NetworkStatus";
import { AddressValidator } from "./AddressValidator";
import { ExampleAddresses } from "./ExampleAddresses";
import { AnalysisResult, CalculationProgress, PoolInfo, ExtendedAnalysisResult, PositionData } from "@/types/uniswap";
import { getTokenId, determineBaseQuote, getSantimentSlug } from "@/utils/tokenMapping";
import { PriceAnalyzer } from "@/utils/calculations";
import { UniswapService } from "@/services/uniswapService";
import { CoinGeckoService } from "@/services/coinGeckoService";
import { Calculator, Zap, HelpCircle, ToggleLeft, ToggleRight } from "lucide-react";
import { PositionService } from "@/services/positionService";
import { PositionAnalyzer } from "@/utils/positionAnalyzer";
import { PositionInput } from "./PositionInput";
import { PositionAnalysisDisplay } from "./PositionAnalysisDisplay";

export const UniswapCalculator = () => {
  const { toast } = useToast();
  const [poolAddress, setPoolAddress] = useState('');
  const [progress, setProgress] = useState<CalculationProgress>({
    phase: 'idle',
    message: '',
    progress: 0
  });
  const [result, setResult] = useState<ExtendedAnalysisResult | null>(null);
  const [analysisMode, setAnalysisMode] = useState<'new_position' | 'existing_position'>('new_position');
  const [currentPosition, setCurrentPosition] = useState<PositionData | null>(null);
  const [poolInfo, setPoolInfo] = useState<PoolInfo | null>(null);
  const [enableTechnicalIndicators, setEnableTechnicalIndicators] = useState(true);
  const [enableSentimentAnalysis, setEnableSentimentAnalysis] = useState(false);
  const [enableSantimentAnalysis, setEnableSantimentAnalysis] = useState(false);
  const [enableOptionsAnalysis, setEnableOptionsAnalysis] = useState(false);
  const [enableMonteCarloAnalysis, setEnableMonteCarloAnalysis] = useState(true);
  const [showExamples, setShowExamples] = useState(false);
  const [isAddressValid, setIsAddressValid] = useState(false);
  const [detectedNetwork, setDetectedNetwork] = useState<string>('');
  const [retryCount, setRetryCount] = useState(0);
  
  // Store fetched data for real-time analysis
  const [storedData, setStoredData] = useState<{
    priceData: any[];
    currentPrice: number;
    identifiedPair: string;
    baseAsset: string;
    quoteAsset: string;
  } | null>(null);

  const handleAddressValidationChange = useCallback((isValid: boolean, network?: string) => {
    setIsAddressValid(isValid);
    setDetectedNetwork(network || '');
  }, []);

  const isValidAddress = (address: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  const updateProgress = (phase: CalculationProgress['phase'], message: string, progress: number) => {
    setProgress({ phase, message, progress });
  };

  // Real-time analysis when toggles change
  useEffect(() => {
    if (storedData) {
      performAnalysis(storedData, true);
    }
  }, [enableTechnicalIndicators, enableSentimentAnalysis, enableSantimentAnalysis, enableOptionsAnalysis]);

  const performAnalysis = async (data: typeof storedData, isRealTime = false) => {
    if (!data) return;

    try {
      if (!isRealTime) {
        updateProgress('analyzing', 'Calculating enhanced volatility models and regime detection...', 70);
        await new Promise(resolve => setTimeout(resolve, 800));
      } else {
        updateProgress('analyzing', 'Updating analysis with new settings...', 85);
      }

      const analysis = await PriceAnalyzer.analyzePriceData(
        data.priceData, 
        enableTechnicalIndicators,
        enableSentimentAnalysis,
        enableSantimentAnalysis,
        enableMonteCarloAnalysis,
        data.baseAsset,
        data.quoteAsset,
        enableOptionsAnalysis
      );

      if (!isRealTime) {
        updateProgress('analyzing', 'Applying enhanced 4-week forecasting models...', 85);
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Calculate percentage changes from current price
      const minPriceChange = ((analysis.suggestedMinPrice - data.currentPrice) / data.currentPrice) * 100;
      const maxPriceChange = ((analysis.suggestedMaxPrice - data.currentPrice) / data.currentPrice) * 100;

      let analysisResult: ExtendedAnalysisResult = {
        identifiedPair: data.identifiedPair,
        baseAsset: data.baseAsset,
        quoteAsset: data.quoteAsset,
        currentPrice: data.currentPrice,
        suggestedMinPrice: analysis.suggestedMinPrice,
        suggestedMaxPrice: analysis.suggestedMaxPrice,
        minPriceChange,
        maxPriceChange,
        centralTrend: analysis.centralTrend,
        dailyVolatility: analysis.dailyVolatility,
        projectedVolatility: analysis.projectedVolatility,
        marginOfError: analysis.marginOfError,
        confidence: 85, // 1.5 standard deviations ≈ 85% confidence
        technicalIndicators: analysis.technicalIndicators,
        sentimentAnalysis: analysis.sentimentAnalysis,
        santimentMetrics: analysis.santimentMetrics,
        projectionDays: analysis.technicalIndicators ? 
          PriceAnalyzer.getExtendedTimeHorizon(analysis.technicalIndicators.volatilityRegime) : 28
      };

      // Add position analysis if we have a current position
      if (currentPosition) {
        console.log('Position Data:', {
          tokenId: currentPosition.tokenId,
          currentPriceRaw: currentPosition.currentPrice,
          currentPriceUSD: currentPosition.currentPriceUSD,
          minPriceRaw: currentPosition.minPrice,
          minPriceUSD: currentPosition.minPriceUSD,
          maxPriceRaw: currentPosition.maxPrice,
          maxPriceUSD: currentPosition.maxPriceUSD,
          baseAsset: currentPosition.baseAsset,
          quoteAsset: currentPosition.quoteAsset,
          token0: { symbol: currentPosition.token0Symbol, decimals: currentPosition.token0Decimals },
          token1: { symbol: currentPosition.token1Symbol, decimals: currentPosition.token1Decimals },
          fees: {
            token0Raw: currentPosition.tokensOwed0,
            token1Raw: currentPosition.tokensOwed1,
          }
        });

        const positionAnalysis = await PositionAnalyzer.analyzePosition(currentPosition, analysisResult);
        analysisResult.positionAnalysis = positionAnalysis;
        analysisResult.currentPosition = currentPosition;
        
        console.log('Position Analysis:', {
          health: positionAnalysis.positionHealth,
          efficiency: positionAnalysis.capitalEfficiency,
          feesEarned: positionAnalysis.feesEarned,
          impermanentLoss: positionAnalysis.impermanentLoss,
        });
      }

      setResult(analysisResult);
      
      if (!isRealTime) {
        updateProgress('complete', 'Analysis complete!', 100);
        toast({
          title: "Analysis Complete",
          description: `Calculated optimal range for ${data.identifiedPair}`,
        });
      }
      
    } catch (error) {
      console.error('Analysis error:', error);
      if (!isRealTime) {
        updateProgress('error', 'Error occurred during analysis', 0);
        toast({
          title: "Analysis Failed",
          description: error instanceof Error ? error.message : "An unexpected error occurred",
          variant: "destructive",
        });
      }
    }
  };

  const handleCalculate = async () => {
    if (!poolAddress.trim()) {
      toast({
        title: "Error",
        description: "Please enter a pool address",
        variant: "destructive",
      });
      return;
    }

    if (!isValidAddress(poolAddress.trim())) {
      toast({
        title: "Invalid Address",
        description: "Please enter a valid Ethereum address",
        variant: "destructive",
      });
      return;
    }

    setResult(null);
    
    try {
      // Phase 1: Asset Identification
      updateProgress('identifying', 'Connecting to Uniswap subgraph...', 5);
      
      const poolInfo = await UniswapService.getPoolInfo(poolAddress.trim());
      setPoolInfo(poolInfo);
      
      updateProgress('identifying', 'Pool found! Analyzing token pair...', 15);
      
      const { baseAsset, quoteAsset } = determineBaseQuote(
        poolInfo.token0.symbol, 
        poolInfo.token1.symbol
      );
      const identifiedPair = `${baseAsset} / ${quoteAsset}`;
      
      updateProgress('identifying', `Identified pair: ${identifiedPair}`, 25);
      
      // Phase 2: Price Data Fetching
      updateProgress('fetching', 'Getting token IDs for price data...', 30);
      
      const baseTokenId = getTokenId(baseAsset);
      const quoteTokenId = getTokenId(quoteAsset);
      
      if (!baseTokenId) {
        throw new Error(`Price data not available for ${baseAsset}. Token not supported in our price feed.`);
      }
      
      if (!quoteTokenId) {
        throw new Error(`Price data not available for ${quoteAsset}. Token not supported in our price feed.`);
      }
      
      updateProgress('fetching', 'Fetching 365 days of historical price data for enhanced forecasting...', 45);
      
      // Fetch current price and historical data in parallel
      const [priceData, currentPriceInfo] = await Promise.all([
        CoinGeckoService.getHistoricalPrices(baseTokenId, quoteTokenId, 365),
        quoteAsset === 'USD' ? 
          CoinGeckoService.getCurrentPrice(baseTokenId) :
          Promise.all([
            CoinGeckoService.getCurrentPrice(baseTokenId),
            CoinGeckoService.getCurrentPrice(quoteTokenId)
          ])
      ]);
      
      // Calculate current price ratio
      let currentPrice: number;
      if (quoteAsset === 'USD') {
        currentPrice = currentPriceInfo as number;
      } else {
        const [basePrice, quotePrice] = currentPriceInfo as [number, number];
        currentPrice = basePrice / quotePrice;
      }
      
      if (priceData.length < 10) {
        throw new Error('Insufficient historical price data available for analysis');
      }
      
      updateProgress('fetching', `Retrieved ${priceData.length} days of price data`, 60);
      
      // Store data for real-time analysis
      const dataToStore = {
        priceData,
        currentPrice,
        identifiedPair,
        baseAsset,
        quoteAsset
      };
      setStoredData(dataToStore);
      
      // Phase 3: Statistical Analysis
      await performAnalysis(dataToStore);
      
    } catch (error) {
      console.error('Calculation error:', error);
      setRetryCount(prev => prev + 1);
      
      let errorMessage = "An unexpected error occurred";
      let shouldRetry = false;
      
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Network-related errors suggest retry
        if (error.message.includes('fetch') || 
            error.message.includes('network') || 
            error.message.includes('timeout') ||
            error.message.includes('CoinGecko API error')) {
          shouldRetry = retryCount < 2;
          errorMessage += shouldRetry ? " - Click retry to try again." : " - Please check your connection.";
        }
        
        // API rate limit errors
        if (error.message.includes('429') || error.message.includes('rate limit')) {
          errorMessage = "API rate limit reached. Please wait a moment and try again.";
          shouldRetry = true;
        }
      }
      
      updateProgress('error', errorMessage, 0);
      
      toast({
        title: "Calculation Failed",
        description: errorMessage,
        variant: "destructive",
        action: shouldRetry ? (
          <Button variant="outline" size="sm" onClick={handleCalculate}>
            Retry
          </Button>
        ) : undefined
      });
    }
  };

  const handlePositionAnalysis = async (tokenId: string, userAddress?: string) => {
    setResult(null);
    setCurrentPosition(null);
    
    try {
      updateProgress('position_fetching', 'Fetching position data from blockchain...', 10);
      
      const positionData = await PositionService.getPositionData(tokenId, userAddress);
      setCurrentPosition(positionData);
      
      updateProgress('position_fetching', 'Position found! Analyzing pool...', 30);
      
      // Get pool info from position
      const poolInfo = await UniswapService.getPoolInfo(positionData.poolAddress);
      setPoolInfo(poolInfo);
      
      // Continue with normal analysis but include position data
      const { baseAsset, quoteAsset } = determineBaseQuote(
        poolInfo.token0.symbol, 
        poolInfo.token1.symbol
      );
      const identifiedPair = `${baseAsset} / ${quoteAsset}`;
      
      updateProgress('fetching', 'Getting historical price data...', 50);
      
      const baseTokenId = getTokenId(baseAsset);
      const quoteTokenId = getTokenId(quoteAsset);
      
      if (!baseTokenId || !quoteTokenId) {
        throw new Error(`Price data not available for ${baseAsset}/${quoteAsset}`);
      }
      
      const [priceData, currentPriceInfo] = await Promise.all([
        CoinGeckoService.getHistoricalPrices(baseTokenId, quoteTokenId, 365),
        quoteAsset === 'USD' ? 
          CoinGeckoService.getCurrentPrice(baseTokenId) :
          Promise.all([
            CoinGeckoService.getCurrentPrice(baseTokenId),
            CoinGeckoService.getCurrentPrice(quoteTokenId)
          ])
      ]);
      
      let currentPrice: number;
      if (quoteAsset === 'USD') {
        currentPrice = currentPriceInfo as number;
      } else {
        const [basePrice, quotePrice] = currentPriceInfo as [number, number];
        currentPrice = basePrice / quotePrice;
      }
      
      const dataToStore = {
        priceData,
        currentPrice,
        identifiedPair,
        baseAsset,
        quoteAsset
      };
      setStoredData(dataToStore);
      
      updateProgress('position_analyzing', 'Analyzing position vs optimal range...', 80);
      
      await performAnalysis(dataToStore);
      
    } catch (error) {
      console.error('Position analysis error:', error);
      updateProgress('error', error instanceof Error ? error.message : 'Position analysis failed', 0);
      
      toast({
        title: "Position Analysis Failed",
        description: error instanceof Error ? error.message : "Failed to analyze position",
        variant: "destructive",
      });
    }
  };

  return (
    <ErrorBoundary>
      <div className="w-full max-w-7xl mx-auto space-y-4 px-4 sm:px-6 lg:px-8">
        <NetworkStatus />
        
        {/* Header */}
        <div className="text-center space-y-3 mb-6">
          <div className="flex items-center justify-center gap-3">
            <div className="p-2 bg-gradient-primary rounded-lg">
              <Zap className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-hero bg-clip-text text-transparent">
              Uniswap Range Optimizer
            </h1>
          </div>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">
            AI-Powered Tool for Optimizing Uniswap v3 Liquidity Ranges
          </p>
        </div>

        {/* Analysis Mode Toggle */}
        <div className="flex justify-center mb-4">
          <Card className="p-2">
            <div className="flex items-center gap-2">
              <Button
                variant={analysisMode === 'new_position' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => {
                  setAnalysisMode('new_position');
                  setCurrentPosition(null);
                  setResult(null);
                }}
                className="text-xs h-8"
              >
                New Position
              </Button>
              <Button
                variant={analysisMode === 'existing_position' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => {
                  setAnalysisMode('existing_position');
                  setResult(null);
                }}
                className="text-xs h-8"
              >
                Analyze Position
              </Button>
            </div>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Left Column - Input & Settings */}
          <div className="lg:col-span-1 space-y-4">
            {analysisMode === 'new_position' ? (
              <Card className="p-4 bg-gradient-card border border-border shadow-card">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="pool-address" className="text-sm font-medium text-foreground">
                        Pool Address
                      </Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowExamples(!showExamples)}
                        className="text-xs p-1 h-auto"
                      >
                        <HelpCircle className="w-3 h-3 mr-1" />
                        Examples
                      </Button>
                    </div>
                    <Input
                      id="pool-address"
                      type="text"
                      value={poolAddress}
                      onChange={(e) => {
                        const next = e.target.value;
                        setPoolAddress(next);
                        setRetryCount(0);
                        // Reset validity when address changes to avoid stale states
                        setIsAddressValid(false);
                        setDetectedNetwork('');
                      }}
                      placeholder="0x..."
                      className="h-10 text-sm"
                    />
                    <AddressValidator 
                      address={poolAddress} 
                      onValidationChange={handleAddressValidationChange}
                    />
                  </div>
                  
                  <Button
                    onClick={handleCalculate}
                    disabled={!isAddressValid || (progress.phase !== 'idle' && progress.phase !== 'complete' && progress.phase !== 'error')}
                    variant="calculate"
                    size="sm"
                    className="w-full h-10 text-sm"
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Optimize Range
                  </Button>
                </div>
              </Card>
            ) : (
              <PositionInput 
                onPositionSubmit={handlePositionAnalysis}
                isLoading={progress.phase === 'position_fetching' || progress.phase === 'position_analyzing'}
              />
            )}

            {showExamples && (
              <ExampleAddresses 
                onSelectAddress={(address) => {
                  setPoolAddress(address);
                  setShowExamples(false);
                  setIsAddressValid(false);
                  setDetectedNetwork('');
                }} 
              />
            )}

            <AdvancedSettings
              enableTechnicalIndicators={enableTechnicalIndicators}
              enableSentimentAnalysis={enableSentimentAnalysis}
              enableSantimentAnalysis={enableSantimentAnalysis}
              enableOptionsAnalysis={enableOptionsAnalysis}
              onTechnicalIndicatorsChange={setEnableTechnicalIndicators}
              onSentimentAnalysisChange={setEnableSentimentAnalysis}
              onSantimentAnalysisChange={setEnableSantimentAnalysis}
              onOptionsAnalysisChange={setEnableOptionsAnalysis}
            />

          <ProgressIndicator progress={progress} onRetry={() => handleCalculate()} />
        </div>

          {/* Right Column - Results */}
          <div className="lg:col-span-3">
            {result && analysisMode === 'existing_position' && result.positionAnalysis ? (
              <PositionAnalysisDisplay result={result} />
            ) : result && analysisMode === 'new_position' ? (
              <OptimizedResultsDisplay result={result} poolInfo={poolInfo} />
            ) : null}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};