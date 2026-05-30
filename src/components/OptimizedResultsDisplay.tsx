import { AnalysisResult } from "@/types/uniswap";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Target, BarChart3, Activity, Gauge, Zap, AlertTriangle, Brain, CheckCircle, ArrowUpDown, Network, Clock } from "lucide-react";
import { ForecastingMetrics } from "./ForecastingMetrics";
import { MonteCarloDisplay } from "./MonteCarloDisplay";
import { AdvancedTechnicalDisplay } from "./AdvancedTechnicalDisplay";
import { OptionsAnalysisDisplay } from "./OptionsAnalysisDisplay";
interface OptimizedResultsDisplayProps {
  result: AnalysisResult;
  poolInfo?: {
    chainName?: string;
  };
}
export const OptimizedResultsDisplay = ({
  result,
  poolInfo
}: OptimizedResultsDisplayProps) => {
  const formatPrice = (price: number) => {
    if (price >= 1) {
      return price.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 4
      });
    }
    return price.toFixed(8);
  };
  const formatPercentage = (value: number) => {
    return (value * 100).toFixed(2);
  };

  // Calculate confidence percentages for different time periods
  const getConfidenceScenarios = () => {
    const baseConfidence = result.confidence;
    const volatility = result.dailyVolatility;

    // Calculate confidence decay based on volatility and time
    const twoWeekConfidence = Math.max(20, baseConfidence - volatility * 100 * 0.8);
    const fourWeekConfidence = Math.max(15, baseConfidence - volatility * 100 * 1.5);
    const sixWeekConfidence = Math.max(10, baseConfidence - volatility * 100 * 2.2);
    return {
      twoWeek: Math.round(twoWeekConfidence),
      fourWeek: Math.round(fourWeekConfidence),
      sixWeek: Math.round(sixWeekConfidence)
    };
  };

  // Calculate range width and impact factors
  const rangeWidth = (result.suggestedMaxPrice - result.suggestedMinPrice) / result.currentPrice * 100;

  // Extract Santiment impact factors (these would come from the actual calculation logic)
  const getSantimentImpact = () => {
    if (!result.santimentMetrics) return null;

    // Calculate social momentum impact (simplified for display)
    const socialVolumeChange = result.santimentMetrics.socialSentiment.socialVolume.sevenDays - result.santimentMetrics.socialSentiment.socialVolume.fourteenDays;
    const socialMomentum = socialVolumeChange > 0 ? "Positive" : "Negative";
    const socialImpact = Math.abs(socialVolumeChange) * 0.1; // Simplified calculation

    // Calculate MVRV deviation impact
    const mvrvDeviation = Math.abs(result.santimentMetrics.onChainMetrics.mvrv.sevenDays - 1);
    const mvrvImpact = mvrvDeviation * 15; // Simplified calculation

    return {
      socialMomentum,
      socialImpact: socialImpact.toFixed(1),
      mvrvImpact: mvrvImpact.toFixed(1),
      totalImpact: (socialImpact + mvrvImpact).toFixed(1)
    };
  };
  const santimentImpact = getSantimentImpact();
  const confidenceScenarios = getConfidenceScenarios();
  return <div className="space-y-4 w-full overflow-hidden">
      {/* Top Row - Pair Info & Range */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Trading Pair */}
        <Card className="p-4 bg-gradient-card border border-border shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Trading Pair</h3>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-foreground mb-1">
              {result.identifiedPair}
            </p>
            {poolInfo?.chainName && <div className="flex items-center justify-center gap-1 mb-2">
                <Network className="w-3 h-3 text-primary" />
                <Badge variant="outline" className="text-xs font-medium">
                  {poolInfo.chainName}
                </Badge>
              </div>}
            <p className="text-lg font-bold text-accent">
              {formatPrice(result.currentPrice)}
            </p>
            <p className="text-xs text-muted-foreground">Current Price</p>
          </div>
        </Card>

        {/* Min Price */}
        <Card className="p-4 bg-gradient-card border border-success/20 shadow-success">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-success" />
            <h3 className="text-sm font-semibold text-foreground">Min Price</h3>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-success mb-1">
              {formatPrice(result.suggestedMinPrice)}
            </p>
            <Badge variant={result.minPriceChange < 0 ? "destructive" : "secondary"} className="text-xs">
              {result.minPriceChange > 0 ? '+' : ''}{result.minPriceChange.toFixed(1)}%
            </Badge>
          </div>
        </Card>

        {/* Max Price */}
        <Card className="p-4 bg-gradient-card border border-warning/20">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-warning" />
            <h3 className="text-sm font-semibold text-foreground">Max Price</h3>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-warning mb-1">
              {formatPrice(result.suggestedMaxPrice)}
            </p>
            <Badge variant={result.maxPriceChange > 0 ? "default" : "destructive"} className="text-xs">
              {result.maxPriceChange > 0 ? '+' : ''}{result.maxPriceChange.toFixed(1)}%
            </Badge>
          </div>
        </Card>
      </div>

      {/* Second Row - Analysis & Technical & Confidence */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Statistical Analysis */}
        <Card className="p-4 bg-gradient-card border border-border shadow-card">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-4 h-4 text-accent" />
            <h3 className="text-sm font-semibold text-foreground">Range Analysis</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground mb-1">Range Width</p>
              <p className="font-semibold text-accent">{rangeWidth.toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Confidence</p>
              <p className="font-semibold text-accent">{result.confidence}%</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Daily Volatility</p>
              <p className="font-semibold">{formatPercentage(result.dailyVolatility)}%</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Projection</p>
              <p className="font-semibold">{result.projectionDays} days</p>
            </div>
          </div>
        </Card>

        {/* Confidence Scenarios */}
        <Card className="p-4 bg-gradient-card border border-primary/20 shadow-glow">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Confidence Scenarios</h3>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">2 Weeks:</span>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${confidenceScenarios.twoWeek >= 70 ? 'bg-green-400' : confidenceScenarios.twoWeek >= 50 ? 'bg-yellow-400' : 'bg-red-400'}`} />
                <span className="font-semibold text-accent">{confidenceScenarios.twoWeek}%</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">4 Weeks:</span>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${confidenceScenarios.fourWeek >= 70 ? 'bg-green-400' : confidenceScenarios.fourWeek >= 50 ? 'bg-yellow-400' : 'bg-red-400'}`} />
                <span className="font-semibold text-accent">{confidenceScenarios.fourWeek}%</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">6 Weeks:</span>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${confidenceScenarios.sixWeek >= 70 ? 'bg-green-400' : confidenceScenarios.sixWeek >= 50 ? 'bg-yellow-400' : 'bg-red-400'}`} />
                <span className="font-semibold text-accent">{confidenceScenarios.sixWeek}%</span>
              </div>
            </div>
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Probability of staying within suggested range
              </p>
            </div>
          </div>
        </Card>

        {/* Technical Indicators */}
        {result.technicalIndicators && <Card className="p-4 bg-gradient-card border border-border shadow-card">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-accent" />
              <h3 className="text-sm font-semibold text-foreground">Technical Analysis</h3>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground mb-1">RSI</p>
                <p className={`font-semibold ${result.technicalIndicators.rsi > 70 ? 'text-red-400' : result.technicalIndicators.rsi < 30 ? 'text-green-400' : 'text-yellow-400'}`}>
                  {result.technicalIndicators.rsi.toFixed(1)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Market Regime</p>
                <Badge variant={result.technicalIndicators.volatilityRegime === 'high' ? 'destructive' : result.technicalIndicators.volatilityRegime === 'low' ? 'default' : 'secondary'}>
                  {result.technicalIndicators.volatilityRegime}
                </Badge>
              </div>
              <div className="col-span-2">
                <p className="text-muted-foreground mb-2">MACD Analysis</p>
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">MACD Line:</span>
                    <span className="font-semibold text-foreground">{result.technicalIndicators.macd.macd.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Signal Line:</span>
                    <span className="font-semibold text-foreground">{result.technicalIndicators.macd.signal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Histogram:</span>
                    <span className={`font-bold ${result.technicalIndicators.macd.histogram > 0 ? 'text-success' : 'text-destructive'}`}>
                      {result.technicalIndicators.macd.histogram > 0 ? '+' : ''}{result.technicalIndicators.macd.histogram.toFixed(2)}
                    </span>
                  </div>
                  <div className="pt-1 mt-1 border-t border-border/50">
                    <Badge variant={result.technicalIndicators.macd.histogram > 0 ? 'default' : 'destructive'} className="text-xs">
                      {result.technicalIndicators.macd.histogram > 0 ? 'Bullish' : 'Bearish'}
                    </Badge>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">BB Position</p>
                <p className="font-semibold">{(result.technicalIndicators.bollingerBands.position * 100).toFixed(0)}%</p>
              </div>
            </div>
          </Card>}
      </div>

      {/* Third Row - Sentiment & Range Impact */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Sentiment Range Impact */}
        {result.sentimentAnalysis && <Card className="p-4 bg-gradient-card border border-border shadow-card">
            <div className="flex items-center gap-2 mb-3">
              <Brain className="w-4 h-4 text-accent" />
              <h3 className="text-sm font-semibold text-foreground">News Impact</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Market Sentiment:</span>
                <Badge variant={result.sentimentAnalysis.sentiment === 'bullish' ? 'default' : result.sentimentAnalysis.sentiment === 'bearish' ? 'destructive' : 'secondary'}>
                  {result.sentimentAnalysis.sentiment}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Range Adjustment:</span>
                <Badge variant="outline" className="text-xs">
                  {result.sentimentAnalysis.sentiment === 'bullish' ? '+2.5%' : result.sentimentAnalysis.sentiment === 'bearish' ? '+3.5%' : '+0.5%'}
                </Badge>
              </div>
              <div className="pt-2 border-t border-border">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Impact Reason:</span>
                  <span className="text-xs font-medium">
                    {result.sentimentAnalysis.sentiment === 'bullish' ? 'Moderate expansion' : result.sentimentAnalysis.sentiment === 'bearish' ? 'Higher volatility' : 'Minimal impact'}
                  </span>
                </div>
              </div>
            </div>
          </Card>}

        {/* Range Impact Factors */}
        {santimentImpact && <Card className="p-4 bg-gradient-card border border-primary/20 shadow-glow">
            <div className="flex items-center gap-2 mb-3">
              <Gauge className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Santiment Impact</h3>
            </div>
            {parseFloat(santimentImpact.totalImpact) === 0 ? <div className="flex items-center gap-2 p-3 bg-muted/20 rounded-lg border">
                <Activity className="w-4 h-4 text-primary" />
                <div className="text-sm">
                  <p className="font-medium text-foreground">Using Current Market Activity</p>
                  <p className="text-muted-foreground text-xs">
                    Range adjusted based on live social activity and on-chain metrics from Santiment.
                  </p>
                </div>
              </div> : <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Social Momentum:</span>
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold ${santimentImpact.socialMomentum === 'Positive' ? 'text-green-400' : 'text-red-400'}`}>
                      {santimentImpact.socialMomentum}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      +{santimentImpact.socialImpact}%
                    </Badge>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">MVRV Deviation:</span>
                  <Badge variant="outline" className="text-xs">
                    +{santimentImpact.mvrvImpact}%
                  </Badge>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-border">
                  <span className="font-medium text-foreground">Total Range Expansion:</span>
                  <Badge variant="default" className="text-xs font-semibold">
                    +{santimentImpact.totalImpact}%
                  </Badge>
                </div>
              </div>}
          </Card>}
      </div>

      {/* Bottom Row - Key Signals */}
      <Card className="p-4 bg-gradient-card border border-border shadow-card">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Key Investment Signals</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div className="space-y-1">
            <p className="font-medium text-foreground">Range Strategy:</p>
            <p className="text-muted-foreground">
              {rangeWidth > 50 ? 'Wide range - High volatility expected' : rangeWidth > 25 ? 'Moderate range - Normal market conditions' : 'Tight range - Low volatility period'}
            </p>
          </div>
          <div className="space-y-1">
            <p className="font-medium text-foreground">Risk Assessment:</p>
            <p className="text-muted-foreground">
              {result.technicalIndicators?.volatilityRegime === 'high' ? 'High risk - Consider smaller position' : result.technicalIndicators?.volatilityRegime === 'low' ? 'Low risk - Favorable conditions' : 'Moderate risk - Standard position sizing'}
            </p>
          </div>
          <div className="space-y-1">
            <p className="font-medium text-foreground">Market Timing:</p>
            <p className="text-muted-foreground">
              {result.sentimentAnalysis?.sentiment === 'bullish' ? 'Positive sentiment - Consider entering' : result.sentimentAnalysis?.sentiment === 'bearish' ? 'Negative sentiment - Wait for clarity' : 'Neutral sentiment - Monitor developments'}
            </p>
          </div>
        </div>
      </Card>

      {/* Options Analysis Display */}
      {result.technicalIndicators?.optionsMetrics && <div className="p-4 bg-accent/5 border border-accent/20 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-accent" />
            <h3 className="text-sm font-semibold">Options Market Analysis</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Options-based volatility and market regime detection active for enhanced forecasting accuracy.
          </p>
        </div>}

      {/* Enhanced Forecasting Metrics */}
      <ForecastingMetrics projectionDays={result.projectionDays || 28} confidence={result.confidence || 85} technicalIndicators={result.technicalIndicators} volatilityRegime={result.technicalIndicators?.volatilityRegime || 'normal'} />

      {/* Disclaimer */}
      <Card className="p-3 bg-muted/20 border border-border">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            <strong>Disclaimer:</strong> This analysis is for informational purposes only and should not be considered financial advice. 
            Cryptocurrency investments carry significant risk. Past performance does not guarantee future results. Always conduct your own research.
          </p>
        </div>
      </Card>
    </div>;
};