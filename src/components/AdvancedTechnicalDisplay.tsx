import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, BarChart3, Zap, Shield, AlertCircle } from "lucide-react";
import { TechnicalIndicators } from "@/types/uniswap";

interface AdvancedTechnicalDisplayProps {
  indicators: TechnicalIndicators;
  currentPrice: number;
}

export const AdvancedTechnicalDisplay = ({ indicators, currentPrice }: AdvancedTechnicalDisplayProps) => {
  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;
  const formatPrice = (price: number) => {
    if (price >= 1000) return `$${(price / 1000).toFixed(2)}K`;
    if (price >= 1) return `$${price.toFixed(2)}`;
    if (price >= 0.01) return `$${price.toFixed(4)}`;
    return `$${price.toFixed(6)}`;
  };

  const getRocBadgeColor = (roc: number) => {
    if (Math.abs(roc) < 2) return "bg-muted";
    if (roc > 0) return "bg-success";
    return "bg-destructive";
  };

  const getCciBadgeColor = (cci: number) => {
    if (cci > 100) return "bg-destructive"; // Overbought
    if (cci < -100) return "bg-success"; // Oversold
    return "bg-accent"; // Normal
  };

  const getPhaseBadgeColor = (phase: string) => {
    switch (phase) {
      case 'accumulation': return "bg-accent";
      case 'markup': return "bg-success";
      case 'distribution': return "bg-warning";
      case 'markdown': return "bg-destructive";
      default: return "bg-muted";
    }
  };

  const getGarchQualityColor = (persistence: number) => {
    if (persistence < 0.8) return "bg-success";
    if (persistence < 0.95) return "bg-warning";
    return "bg-destructive";
  };

  return (
    <div className="space-y-6">
      {/* Rate of Change Analysis */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <TrendingUp className="w-5 h-5 text-primary" />
            Momentum Analysis (Rate of Change)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {[
              { period: '5-Day', value: indicators.rateOfChange?.short || 0, label: 'Short-term' },
              { period: '10-Day', value: indicators.rateOfChange?.medium || 0, label: 'Medium-term' },
              { period: '20-Day', value: indicators.rateOfChange?.long || 0, label: 'Long-term' }
            ].map(({ period, value, label }) => (
              <div key={period} className="text-center">
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="text-xs text-muted-foreground">{period}</p>
                <Badge className={getRocBadgeColor(value)}>
                  {value >= 0 ? '+' : ''}{formatPercentage(value)}
                </Badge>
              </div>
            ))}
          </div>
          
          <div className="mt-4 p-3 rounded-lg bg-muted/30">
            <p className="text-sm text-muted-foreground">
              <strong>Momentum Interpretation:</strong> Positive ROC indicates upward momentum, 
              negative indicates downward momentum. Values above ±5% suggest strong momentum.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* CCI and Market Position */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <BarChart3 className="w-5 h-5 text-accent" />
            Market Position Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Commodity Channel Index (CCI)</span>
            <Badge className={getCciBadgeColor(indicators.commodityChannelIndex || 0)}>
              {(indicators.commodityChannelIndex || 0).toFixed(0)}
            </Badge>
          </div>
          
          <Progress 
            value={Math.min(Math.max(((indicators.commodityChannelIndex || 0) + 200) / 4, 0), 100)}
            className="h-3"
          />
          
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Oversold (-200)</span>
            <span>Normal (0)</span>
            <span>Overbought (+200)</span>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <p className="text-sm font-medium text-foreground mb-2">Support Levels</p>
              <div className="space-y-1">
                {(indicators.supportResistance?.support || []).slice(0, 3).map((level, i) => (
                  <div key={i} className="text-sm flex justify-between">
                    <span className="text-muted-foreground">S{i + 1}:</span>
                    <span className="font-medium text-success">{formatPrice(level)}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <p className="text-sm font-medium text-foreground mb-2">Resistance Levels</p>
              <div className="space-y-1">
                {(indicators.supportResistance?.resistance || []).slice(0, 3).map((level, i) => (
                  <div key={i} className="text-sm flex justify-between">
                    <span className="text-muted-foreground">R{i + 1}:</span>
                    <span className="font-medium text-destructive">{formatPrice(level)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 mt-4">
            <span className="text-sm text-muted-foreground">Current Position:</span>
            <Badge variant="outline">
              {indicators.supportResistance?.currentLevel || 'between'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Cycle Analysis */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Zap className="w-5 h-5 text-warning" />
            Market Cycle Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Dominant Cycle</p>
              <p className="text-xl font-bold text-foreground">
                {indicators.cycleAnalysis?.dominantCycle || 0} days
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Cycle Strength</p>
              <div className="flex items-center gap-2">
                <Progress 
                  value={(indicators.cycleAnalysis?.cycleStrength || 0) * 100} 
                  className="h-2 flex-1"
                />
                <span className="text-sm font-medium text-foreground">
                  {formatPercentage((indicators.cycleAnalysis?.cycleStrength || 0) * 100)}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Current Phase:</span>
            <Badge className={getPhaseBadgeColor(indicators.cycleAnalysis?.currentPhase || 'accumulation')}>
              {indicators.cycleAnalysis?.currentPhase || 'accumulation'}
            </Badge>
          </div>
          
          <div className="p-3 rounded-lg bg-muted/30">
            <p className="text-sm text-muted-foreground">
              <strong>Cycle Phases:</strong> Accumulation (buying opportunity), 
              Markup (uptrend), Distribution (selling pressure), Markdown (downtrend)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* GARCH Volatility Model */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Shield className="w-5 h-5 text-accent" />
            GARCH Volatility Forecast
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Forecasted Volatility</p>
              <p className="text-2xl font-bold text-primary">
                {formatPercentage((indicators.garchVolatility?.forecast || 0) * 100)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Model Quality</p>
              <Badge className={getGarchQualityColor(indicators.garchVolatility?.persistence || 0)}>
                {indicators.garchVolatility?.persistence ? 
                  (indicators.garchVolatility.persistence < 0.8 ? 'Excellent' : 
                   indicators.garchVolatility.persistence < 0.95 ? 'Good' : 'Unstable') : 'N/A'}
              </Badge>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground">Alpha (α)</p>
              <p className="font-medium text-foreground">{(indicators.garchVolatility?.alpha || 0).toFixed(3)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Beta (β)</p>
              <p className="font-medium text-foreground">{(indicators.garchVolatility?.beta || 0).toFixed(3)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Persistence</p>
              <p className="font-medium text-foreground">{(indicators.garchVolatility?.persistence || 0).toFixed(3)}</p>
            </div>
          </div>
          
          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/30">
            <AlertCircle className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
            <p className="text-sm text-muted-foreground">
              <strong>GARCH Model:</strong> Captures volatility clustering and persistence. 
              Higher persistence (α + β) indicates more predictable volatility patterns.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};