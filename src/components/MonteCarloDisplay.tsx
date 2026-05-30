import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Target, AlertTriangle } from "lucide-react";

interface MonteCarloDisplayProps {
  result: {
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
  riskMetrics: {
    valueAtRisk: { p80: number; p90: number; p95: number };
    expectedShortfall: { p80: number; p90: number; p95: number };
    maxDrawdown: number;
    tailRisk: {
      severe: number;
      extreme: number;
      catastrophic: number;
    };
    volatilityOfVolatility: number;
  };
  scenarioAnalysis: {
    bullCase: { probability: number; minPrice: number; maxPrice: number; expectedReturn: number };
    baseCase: { probability: number; minPrice: number; maxPrice: number; expectedReturn: number };
    bearCase: { probability: number; minPrice: number; maxPrice: number; expectedReturn: number };
  };
  currentPrice: number;
  minPrice: number;
  maxPrice: number;
}

export const MonteCarloDisplay = ({ 
  result, 
  riskMetrics, 
  scenarioAnalysis, 
  currentPrice,
  minPrice,
  maxPrice 
}: MonteCarloDisplayProps) => {
  const formatPrice = (price: number) => {
    if (price >= 1000) return `$${(price / 1000).toFixed(2)}K`;
    if (price >= 1) return `$${price.toFixed(2)}`;
    if (price >= 0.01) return `$${price.toFixed(4)}`;
    return `$${price.toFixed(6)}`;
  };

  const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`;

  const getRiskBadgeColor = (risk: number) => {
    if (risk < 0.1) return "bg-success";
    if (risk < 0.2) return "bg-warning";
    return "bg-destructive";
  };

  const getScenarioBadgeColor = (scenario: string) => {
    switch (scenario) {
      case 'bull': return "bg-success";
      case 'base': return "bg-accent";
      case 'bear': return "bg-destructive";
      default: return "bg-muted";
    }
  };

  return (
    <div className="space-y-6">
      {/* Monte Carlo Overview */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Target className="w-5 h-5 text-primary" />
            Monte Carlo Analysis (10,000 Simulations)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Range Success</p>
              <p className="text-2xl font-bold text-primary">
                {formatPercentage(result.successProbability)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Expected Return</p>
              <p className={`text-2xl font-bold ${result.expectedReturn >= 0 ? 'text-success' : 'text-destructive'}`}>
                {formatPercentage(result.expectedReturn)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Best Case</p>
              <p className="text-lg font-semibold text-success">
                {formatPrice(result.bestCase)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Worst Case</p>
              <p className="text-lg font-semibold text-destructive">
                {formatPrice(result.worstCase)}
              </p>
            </div>
          </div>
          
          {/* Confidence Intervals */}
          <div className="space-y-3">
            <h4 className="font-semibold text-foreground">Price Confidence Intervals</h4>
            {Object.entries(result.confidenceIntervals).map(([level, interval]) => (
              <div key={level} className="flex items-center gap-4">
                <Badge variant="outline" className="w-12 justify-center">
                  {level.toUpperCase()}
                </Badge>
                <div className="flex-1">
                  <div className="flex justify-between text-sm">
                    <span>{formatPrice(interval.min)}</span>
                    <span>{formatPrice(interval.max)}</span>
                  </div>
                  <Progress 
                    value={((interval.max - interval.min) / currentPrice) * 100} 
                    className="h-2"
                  />
                </div>
                <span className="text-sm text-muted-foreground">
                  ±{formatPercentage((interval.max - interval.min) / (2 * currentPrice))}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Risk Metrics */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <AlertTriangle className="w-5 h-5 text-warning" />
            Risk Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-foreground mb-3">Value at Risk (VaR)</h4>
              <div className="space-y-2">
                {Object.entries(riskMetrics.valueAtRisk).map(([level, var_value]) => (
                  <div key={level} className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{level.toUpperCase()}:</span>
                    <Badge className={getRiskBadgeColor(var_value)}>
                      {formatPercentage(var_value)}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold text-foreground mb-3">Expected Shortfall</h4>
              <div className="space-y-2">
                {Object.entries(riskMetrics.expectedShortfall).map(([level, es_value]) => (
                  <div key={level} className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{level.toUpperCase()}:</span>
                    <Badge className={getRiskBadgeColor(es_value)}>
                      {formatPercentage(es_value)}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="space-y-4 pt-4 border-t border-border">
            <div>
              <h4 className="font-semibold text-foreground mb-3">Tail Risk Thresholds</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Severe (&gt;10% loss):</span>
                  <Badge className="bg-warning/20 text-warning border-warning">
                    {formatPercentage(riskMetrics.tailRisk.severe)}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Extreme (&gt;20% loss):</span>
                  <Badge className="bg-destructive/30 text-destructive border-destructive">
                    {formatPercentage(riskMetrics.tailRisk.extreme)}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Catastrophic (&gt;50% loss):</span>
                  <Badge className="bg-destructive text-destructive-foreground">
                    {formatPercentage(riskMetrics.tailRisk.catastrophic)}
                  </Badge>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Max Drawdown</p>
                <p className="text-lg font-semibold text-destructive">
                  {formatPercentage(riskMetrics.maxDrawdown)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Vol of Vol</p>
                <p className="text-lg font-semibold text-muted-foreground">
                  {formatPercentage(riskMetrics.volatilityOfVolatility)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scenario Analysis */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <TrendingUp className="w-5 h-5 text-success" />
            Market Scenarios
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { name: 'Bull Case', data: scenarioAnalysis.bullCase, icon: TrendingUp, type: 'bull' },
              { name: 'Base Case', data: scenarioAnalysis.baseCase, icon: Target, type: 'base' },
              { name: 'Bear Case', data: scenarioAnalysis.bearCase, icon: TrendingDown, type: 'bear' }
            ].map(({ name, data, icon: Icon, type }) => (
              <div key={name} className="p-4 rounded-lg border border-border bg-card/50">
                <div className="flex items-center gap-2 mb-3">
                  <Icon className="w-4 h-4" />
                  <span className="font-semibold text-foreground">{name}</span>
                  <Badge className={getScenarioBadgeColor(type)}>
                    {formatPercentage(data.probability)}
                  </Badge>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Range:</span>
                    <span className="font-medium text-foreground">
                      {formatPrice(data.minPrice)} - {formatPrice(data.maxPrice)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Expected:</span>
                    <span className={`font-medium ${data.expectedReturn >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {formatPercentage(data.expectedReturn)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};