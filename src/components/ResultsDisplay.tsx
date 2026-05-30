import { AnalysisResult } from "@/types/uniswap";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Target, BarChart3, Activity, Gauge, Zap, AlertTriangle, Brain, ArrowUpDown, Code, CheckCircle } from "lucide-react";

interface ResultsDisplayProps {
  result: AnalysisResult;
}

export const ResultsDisplay = ({ result }: ResultsDisplayProps) => {
  const formatPrice = (price: number) => {
    if (price >= 1) {
      return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
    }
    return price.toFixed(8);
  };

  const formatPercentage = (value: number) => {
    return (value * 100).toFixed(2);
  };

  return (
    <div className="space-y-6">
      {/* Identified Pair */}
      <Card className="p-6 bg-gradient-card border border-border shadow-card">
        <div className="flex items-center gap-3 mb-4">
          <Target className="w-6 h-6 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Identified Trading Pair</h3>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold text-foreground mb-2">
            {result.identifiedPair}
          </p>
          <div className="flex justify-center gap-2 mb-4">
            <Badge variant="secondary">Base: {result.baseAsset}</Badge>
            <Badge variant="outline">Quote: {result.quoteAsset}</Badge>
          </div>
          {/* Current Price */}
          <div className="p-4 bg-muted/30 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Current Price</p>
            <p className="text-2xl font-bold text-accent">
              {formatPrice(result.currentPrice)}
            </p>
            <p className="text-xs text-muted-foreground">
              {result.quoteAsset} per {result.baseAsset}
            </p>
          </div>
        </div>
      </Card>

      {/* Price Range Recommendations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 bg-gradient-card border border-success/20 shadow-success">
          <div className="flex items-center gap-3 mb-4">
            <TrendingDown className="w-6 h-6 text-success" />
            <h3 className="text-lg font-semibold text-foreground">Suggested Min Price</h3>
          </div>
          <div className="text-center">
            <p className="text-4xl font-bold text-success mb-2">
              {formatPrice(result.suggestedMinPrice)}
            </p>
            <p className="text-sm text-muted-foreground mb-2">
              {result.quoteAsset} per {result.baseAsset}
            </p>
            <Badge 
              variant={result.minPriceChange < 0 ? "destructive" : "secondary"}
              className="text-sm"
            >
              {result.minPriceChange > 0 ? '+' : ''}{result.minPriceChange.toFixed(1)}% vs current
            </Badge>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-card border border-warning/20">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="w-6 h-6 text-warning" />
            <h3 className="text-lg font-semibold text-foreground">Suggested Max Price</h3>
          </div>
          <div className="text-center">
            <p className="text-4xl font-bold text-warning mb-2">
              {formatPrice(result.suggestedMaxPrice)}
            </p>
            <p className="text-sm text-muted-foreground mb-2">
              {result.quoteAsset} per {result.baseAsset}
            </p>
            <Badge 
              variant={result.maxPriceChange > 0 ? "default" : "destructive"}
              className="text-sm"
            >
              {result.maxPriceChange > 0 ? '+' : ''}{result.maxPriceChange.toFixed(1)}% vs current
            </Badge>
          </div>
        </Card>
      </div>

      {/* Statistical Details */}
      <Card className="p-6 bg-gradient-card border border-border shadow-card">
        <div className="flex items-center gap-3 mb-6">
          <BarChart3 className="w-6 h-6 text-accent" />
          <h3 className="text-lg font-semibold text-foreground">Statistical Analysis</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center p-4 bg-muted/30 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Central Trend (50-day EMA)</p>
            <p className="text-xl font-bold text-foreground">
              {formatPrice(result.centralTrend)}
            </p>
          </div>
          
          <div className="text-center p-4 bg-muted/30 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Daily Volatility</p>
            <p className="text-xl font-bold text-accent">
              {formatPercentage(result.dailyVolatility)}%
            </p>
          </div>
          
          <div className="text-center p-4 bg-muted/30 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">{result.projectionDays}-Day Projection</p>
            <p className="text-xl font-bold text-primary">
              {formatPercentage(result.projectedVolatility)}%
            </p>
          </div>
          
          <div className="text-center p-4 bg-muted/30 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Confidence Level</p>
            <p className="text-xl font-bold text-success">
              {result.confidence}%
            </p>
          </div>
        </div>
      </Card>

      {/* Technical Indicators */}
      {result.technicalIndicators && (
        <Card className="p-6 bg-gradient-card border border-border shadow-card">
          <div className="flex items-center gap-3 mb-6">
            <Activity className="w-6 h-6 text-accent" />
            <h3 className="text-lg font-semibold text-foreground">Technical Analysis</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* RSI */}
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Gauge className="w-4 h-4 text-accent" />
                <p className="text-sm text-muted-foreground">RSI (14-day)</p>
              </div>
              <p className="text-xl font-bold text-foreground">
                {result.technicalIndicators.rsi.toFixed(1)}
              </p>
              <Badge 
                variant={
                  result.technicalIndicators.rsi > 70 ? "destructive" :
                  result.technicalIndicators.rsi < 30 ? "destructive" : "secondary"
                }
                className="text-xs mt-1"
              >
                {result.technicalIndicators.rsi > 70 ? "Overbought" :
                 result.technicalIndicators.rsi < 30 ? "Oversold" : "Neutral"}
              </Badge>
            </div>
            
            {/* Bollinger Bands */}
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-primary" />
                <p className="text-sm text-muted-foreground">Bollinger Bands</p>
              </div>
              <p className="text-xl font-bold text-foreground">
                {(result.technicalIndicators.bollingerBands.position * 100).toFixed(0)}%
              </p>
              <p className="text-xs text-muted-foreground">
                {result.technicalIndicators.bollingerBands.position < 0.2 ? "Near Lower Band" :
                 result.technicalIndicators.bollingerBands.position > 0.8 ? "Near Upper Band" : "Within Bands"}
              </p>
              
              <div className="grid grid-cols-3 gap-2 mt-3 pt-2 border-t border-border/50">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Upper</p>
                  <p className="text-sm font-medium">{Math.round(result.technicalIndicators.bollingerBands.upper)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Middle</p>
                  <p className="text-sm font-medium">{Math.round(result.technicalIndicators.bollingerBands.middle)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Lower</p>
                  <p className="text-sm font-medium">{Math.round(result.technicalIndicators.bollingerBands.lower)}</p>
                </div>
              </div>
              
              <p className="text-xs text-muted-foreground mt-2">
                Bandwidth: {(result.technicalIndicators.bollingerBands.bandwidth * 100).toFixed(1)}%
              </p>
            </div>
            
            {/* Market Regime */}
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <BarChart3 className="w-4 h-4 text-warning" />
                <p className="text-sm text-muted-foreground">Market Regime</p>
              </div>
              <Badge 
                variant={
                  result.technicalIndicators.volatilityRegime === 'high' ? "destructive" :
                  result.technicalIndicators.volatilityRegime === 'low' ? "secondary" : "default"
                }
                className="text-sm"
              >
                {result.technicalIndicators.volatilityRegime.toUpperCase()} VOLATILITY
              </Badge>
              <p className="text-xs text-muted-foreground mt-2">
                {result.projectionDays}-day projection window
              </p>
            </div>
          </div>
          
          {/* MACD Details */}
          <div className="mt-6 p-4 bg-muted/20 rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">MACD Analysis</p>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-muted-foreground">MACD</p>
                <p className="text-sm font-medium">{result.technicalIndicators.macd.macd.toFixed(4)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Signal</p>
                <p className="text-sm font-medium">{result.technicalIndicators.macd.signal.toFixed(4)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Histogram</p>
                <p className={`text-sm font-medium ${result.technicalIndicators.macd.histogram > 0 ? 'text-success' : 'text-destructive'}`}>
                  {result.technicalIndicators.macd.histogram.toFixed(4)}
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Sentiment Analysis */}
      {result.sentimentAnalysis && (
        <Card className="p-6 bg-gradient-card border border-border shadow-card">
          <div className="flex items-center gap-3 mb-6">
            <TrendingUp className="w-6 h-6 text-accent" />
            <h3 className="text-lg font-semibold text-foreground">Social Sentiment Analysis</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Market Sentiment</p>
              <Badge 
                variant={
                  result.sentimentAnalysis.sentiment === 'bullish' ? "default" :
                  result.sentimentAnalysis.sentiment === 'bearish' ? "destructive" : "secondary"
                }
                className="text-sm mb-2"
              >
                {result.sentimentAnalysis.sentiment.toUpperCase()}
              </Badge>
            </div>
            
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Sentiment Score</p>
              <p className={`text-xl font-bold ${
                result.sentimentAnalysis.score > 0.2 ? 'text-success' :
                result.sentimentAnalysis.score < -0.2 ? 'text-destructive' : 'text-foreground'
              }`}>
                {result.sentimentAnalysis.score > 0 ? '+' : ''}{(result.sentimentAnalysis.score * 100).toFixed(1)}%
              </p>
            </div>
            
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Confidence</p>
              <p className="text-xl font-bold text-accent">
                {formatPercentage(result.sentimentAnalysis.confidence)}%
              </p>
            </div>
            
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">News Articles</p>
              <p className="text-xl font-bold text-primary">
                {result.sentimentAnalysis.newsCount}
              </p>
            </div>
          </div>
          
          <div className="mt-4 p-4 bg-muted/20 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Interpretation:</strong> {
                result.sentimentAnalysis.sentiment === 'bullish'
                  ? 'Recent news sentiment suggests positive market perception, which may support price stability or growth.'
                  : result.sentimentAnalysis.sentiment === 'bearish'
                  ? 'Recent news sentiment indicates negative market perception, suggesting increased volatility or downward pressure.'
                  : 'News sentiment appears neutral, indicating balanced market perception with no strong directional bias.'
              } Sentiment confidence of {formatPercentage(result.sentimentAnalysis.confidence)}% based on {result.sentimentAnalysis.newsCount} relevant articles.
            </p>
          </div>
        </Card>
      )}

      {/* Santiment Key Decision Factors */}
      {result.santimentMetrics && (
        <Card className="p-6 bg-gradient-card border border-border shadow-card">
          <div className="flex items-center gap-3 mb-6">
            <Zap className="w-6 h-6 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Santiment Key Decision Factors</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* MVRV Analysis */}
            <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
              <h4 className="font-semibold text-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Market Value to Realized Value (MVRV)
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">7 Days:</span>
                  <span className={`text-sm font-medium ${
                    result.santimentMetrics.onChainMetrics.mvrv.sevenDays > 1.2 ? 'text-red-400' :
                    result.santimentMetrics.onChainMetrics.mvrv.sevenDays < 0.8 ? 'text-green-400' : 'text-yellow-400'
                  }`}>
                    {((result.santimentMetrics.onChainMetrics.mvrv.sevenDays - 1) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">14 Days:</span>
                  <span className={`text-sm font-medium ${
                    result.santimentMetrics.onChainMetrics.mvrv.fourteenDays > 1.2 ? 'text-red-400' :
                    result.santimentMetrics.onChainMetrics.mvrv.fourteenDays < 0.8 ? 'text-green-400' : 'text-yellow-400'
                  }`}>
                    {((result.santimentMetrics.onChainMetrics.mvrv.fourteenDays - 1) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">1 Month:</span>
                  <span className={`text-sm font-medium ${
                    result.santimentMetrics.onChainMetrics.mvrv.oneMonth > 1.2 ? 'text-red-400' :
                    result.santimentMetrics.onChainMetrics.mvrv.oneMonth < 0.8 ? 'text-green-400' : 'text-yellow-400'
                  }`}>
                    {((result.santimentMetrics.onChainMetrics.mvrv.oneMonth - 1) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Social Volume */}
            <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
              <h4 className="font-semibold text-foreground flex items-center gap-2">
                <Brain className="w-4 h-4" />
                Social Volume
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">7 Days:</span>
                  <span className="text-sm font-medium text-foreground">
                    {result.santimentMetrics.socialSentiment.socialVolume.sevenDays.toFixed(0)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">14 Days:</span>
                  <span className="text-sm font-medium text-foreground">
                    {result.santimentMetrics.socialSentiment.socialVolume.fourteenDays.toFixed(0)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">1 Month:</span>
                  <span className="text-sm font-medium text-foreground">
                    {result.santimentMetrics.socialSentiment.socialVolume.oneMonth.toFixed(0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Social Dominance */}
            <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
              <h4 className="font-semibold text-foreground flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4" />
                Social Dominance
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">7 Days:</span>
                  <span className="text-sm font-medium text-foreground">
                    {result.santimentMetrics.socialSentiment.socialDominance.sevenDays.toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">14 Days:</span>
                  <span className="text-sm font-medium text-foreground">
                    {result.santimentMetrics.socialSentiment.socialDominance.fourteenDays.toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">1 Month:</span>
                  <span className="text-sm font-medium text-foreground">
                    {result.santimentMetrics.socialSentiment.socialDominance.oneMonth.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Overall Sentiment */}
            <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
              <h4 className="font-semibold text-foreground flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Overall Sentiment
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Sentiment:</span>
                  <Badge variant={
                    result.santimentMetrics.socialSentiment.sentiment === 'bullish' ? "default" :
                    result.santimentMetrics.socialSentiment.sentiment === 'bearish' ? "destructive" : "secondary"
                  }>
                    {result.santimentMetrics.socialSentiment.sentiment.toUpperCase()}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Score:</span>
                  <span className="text-sm font-medium text-foreground">
                    {result.santimentMetrics.socialSentiment.score.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Confidence:</span>
                  <span className="text-sm font-medium text-foreground">
                    {(result.santimentMetrics.socialSentiment.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Key Investment Signals */}
          <div className="mt-6 p-4 bg-primary/10 border border-primary/20 rounded-lg">
            <h4 className="font-semibold text-primary mb-3 flex items-center gap-2">
              <Target className="w-4 h-4" />
              Key Investment Signals
            </h4>
            <div className="space-y-2 text-sm">
              {result.santimentMetrics.onChainMetrics.mvrv.sevenDays > 1.5 && (
                <div className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="w-3 h-3" />
                  <span>High MVRV (7d) suggests potential overvaluation - consider tighter ranges</span>
                </div>
              )}
              {result.santimentMetrics.onChainMetrics.mvrv.sevenDays < 0.8 && (
                <div className="flex items-center gap-2 text-success">
                  <CheckCircle className="w-3 h-3" />
                  <span>Low MVRV (7d) indicates potential accumulation zone - favorable for entry</span>
                </div>
              )}
              {result.santimentMetrics.socialSentiment.socialVolume.sevenDays > result.santimentMetrics.socialSentiment.socialVolume.fourteenDays * 1.2 && (
                <div className="flex items-center gap-2 text-blue-400">
                  <TrendingUp className="w-3 h-3" />
                  <span>Increased social volume (7d vs 14d) - heightened market interest</span>
                </div>
              )}
              {result.santimentMetrics.socialSentiment.socialDominance.sevenDays > result.santimentMetrics.socialSentiment.socialDominance.fourteenDays * 1.1 && (
                <div className="flex items-center gap-2 text-orange-600">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Rising social dominance - market attention focused, expect volatility</span>
                </div>
              )}
              {result.santimentMetrics.socialSentiment.sentiment === 'bullish' && (
                <div className="flex items-center gap-2 text-success">
                  <CheckCircle className="w-3 h-3" />
                  <span>Bullish sentiment detected - positive market outlook</span>
                </div>
              )}
              {result.santimentMetrics.socialSentiment.sentiment === 'bearish' && (
                <div className="flex items-center gap-2 text-destructive">
                  <TrendingDown className="w-3 h-3" />
                  <span>Bearish sentiment detected - cautious market outlook</span>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Disclaimer */}
      <Card className="p-6 bg-muted/50 rounded-lg border-l-4 border-yellow-500">
        <div className="flex items-start space-x-2">
          <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Important Disclaimer</p>
            <p>
              This analysis is for educational purposes only and should not be considered as financial advice. 
              Cryptocurrency markets are highly volatile and unpredictable. Past performance does not guarantee future results.
              Always conduct your own research and consider consulting with a financial advisor before making investment decisions.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};