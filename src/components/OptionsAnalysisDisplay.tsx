import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, TrendingUp, AlertTriangle, Activity } from "lucide-react";
import type { TechnicalIndicators } from "@/types/uniswap";

interface OptionsAnalysisDisplayProps {
  technicalIndicators?: TechnicalIndicators;
  currentPrice: number;
  minPrice: number;
  maxPrice: number;
}

export const OptionsAnalysisDisplay = ({ 
  technicalIndicators, 
  currentPrice, 
  minPrice, 
  maxPrice 
}: OptionsAnalysisDisplayProps) => {
  const optionsMetrics = technicalIndicators?.optionsMetrics;
  
  if (!optionsMetrics) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm text-muted-foreground">Options Analysis</h3>
        </div>
        <p className="text-sm text-muted-foreground">Options data not available for this pair</p>
      </Card>
    );
  }

  const getRegimeColor = (regime: string) => {
    switch (regime) {
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  const getFlowColor = (sentiment: string) => {
    switch (sentiment) {
      case 'bullish': return 'text-green-600';
      case 'bearish': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const formatProbability = (value: number) => {
    return `${(value * 100).toFixed(0)}%`;
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center gap-2 mb-3">
        <Target className="w-4 h-4 text-accent" />
        <h3 className="font-semibold text-sm">Options Market Analysis</h3>
        <Badge variant="secondary" className="text-xs">LIVE</Badge>
      </div>

      {/* Implied Volatility Overview */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-1">
            <Activity className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Implied Volatility</span>
          </div>
          <div className="text-lg font-semibold">
            {formatPercentage(optionsMetrics.impliedVolatility.atm)}
          </div>
          <div className="text-xs text-muted-foreground">
            Rank: {optionsMetrics.impliedVolatility.ivRank}th percentile
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Volatility Regime</span>
          </div>
          <Badge 
            variant="outline" 
            className={`text-xs ${getRegimeColor(optionsMetrics.impliedVolatility.regime)}`}
          >
            {optionsMetrics.impliedVolatility.regime.toUpperCase()}
          </Badge>
          <div className="text-xs text-muted-foreground">Market environment</div>
        </div>
      </div>

      {/* Volatility Calibration */}
      <div className="border-t pt-3">
        <h4 className="text-xs font-medium text-muted-foreground mb-2">Volatility Calibration</h4>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-2 bg-muted/30 rounded">
            <div className="text-xs text-muted-foreground">Market Vol</div>
            <div className="text-sm font-medium">
              {formatPercentage(optionsMetrics.volatilityCalibration.marketVolatility)}
            </div>
          </div>
          <div className="text-center p-2 bg-muted/30 rounded">
            <div className="text-xs text-muted-foreground">Calibrated</div>
            <div className="text-sm font-medium">
              {formatPercentage(optionsMetrics.volatilityCalibration.calibratedVolatility)}
            </div>
          </div>
          <div className="text-center p-2 bg-muted/30 rounded">
            <div className="text-xs text-muted-foreground">Confidence</div>
            <div className="text-sm font-medium">
              {formatProbability(optionsMetrics.volatilityCalibration.confidence)}
            </div>
          </div>
        </div>
      </div>

      {/* Options Flow & Sentiment */}
      <div className="border-t pt-3">
        <h4 className="text-xs font-medium text-muted-foreground mb-2">Market Sentiment</h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Options Flow</div>
            <div className={`text-sm font-medium ${getFlowColor(optionsMetrics.optionsFlow.sentiment)}`}>
              {optionsMetrics.optionsFlow.sentiment.toUpperCase()}
            </div>
            <div className="text-xs text-muted-foreground">
              {formatProbability(optionsMetrics.optionsFlow.confidence)} confidence
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Put/Call Ratio</div>
            <div className="text-sm font-medium">
              {optionsMetrics.putCallRatio.toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground">
              {optionsMetrics.putCallRatio > 1 ? 'Put heavy' : 'Call heavy'}
            </div>
          </div>
        </div>
      </div>

      {/* Risk-Neutral Probabilities */}
      {optionsMetrics.riskNeutralProbabilities && (
        <div className="border-t pt-3">
          <h4 className="text-xs font-medium text-muted-foreground mb-2">Risk-Neutral Probabilities</h4>
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-2 bg-green-50 border border-green-200 rounded">
              <div className="text-xs text-green-600">Within Range</div>
              <div className="text-sm font-semibold text-green-700">
                {formatProbability(optionsMetrics.riskNeutralProbabilities.withinRange)}
              </div>
            </div>
            <div className="text-center p-2 bg-red-50 border border-red-200 rounded">
              <div className="text-xs text-red-600">Upside Risk</div>
              <div className="text-sm font-semibold text-red-700">
                {formatProbability(optionsMetrics.riskNeutralProbabilities.tailRiskUp)}
              </div>
            </div>
            <div className="text-center p-2 bg-red-50 border border-red-200 rounded">
              <div className="text-xs text-red-600">Downside Risk</div>
              <div className="text-sm font-semibold text-red-700">
                {formatProbability(optionsMetrics.riskNeutralProbabilities.tailRiskDown)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhancement Notice */}
      <div className="border-t pt-3">
        <div className="flex items-start gap-2 text-xs text-muted-foreground bg-accent/5 p-2 rounded">
          <AlertTriangle className="w-3 h-3 mt-0.5 text-accent" />
          <div>
            <span className="font-medium text-accent">Options Enhanced:</span> Forecasting now uses forward-looking 
            implied volatility and risk-neutral probabilities from options markets for improved accuracy.
          </div>
        </div>
      </div>
    </Card>
  );
};