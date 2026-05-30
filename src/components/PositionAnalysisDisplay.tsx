import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { ExtendedAnalysisResult } from "@/types/uniswap";
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2, 
  Target,
  DollarSign,
  Calendar,
  Lightbulb,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from "lucide-react";

interface PositionAnalysisDisplayProps {
  result: ExtendedAnalysisResult;
}

export const PositionAnalysisDisplay = ({ result }: PositionAnalysisDisplayProps) => {
  const { positionAnalysis, currentPosition } = result;
  
  if (!positionAnalysis || !currentPosition) {
    return null;
  }

  const formatPrice = (price: number): string => {
    if (price >= 1000) {
      return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } else if (price >= 1) {
      return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
    } else if (price >= 0.001) {
      return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 });
    } else {
      return price.toExponential(2);
    }
  };

  const formatPercentage = (value: number): string => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'optimal': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'needs_attention': return 'text-yellow-600';
      case 'out_of_range': return 'text-red-600';
      default: return 'text-muted-foreground';
    }
  };

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'optimal': return <CheckCircle2 className="w-4 h-4" />;
      case 'good': return <TrendingUp className="w-4 h-4" />;
      case 'needs_attention': return <AlertTriangle className="w-4 h-4" />;
      case 'out_of_range': return <TrendingDown className="w-4 h-4" />;
      default: return <Minus className="w-4 h-4" />;
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'narrow_range': return <ArrowUpRight className="w-4 h-4" />;
      case 'widen_range': return <ArrowDownRight className="w-4 h-4" />;
      case 'rebalance': return <Target className="w-4 h-4" />;
      case 'hold': return <CheckCircle2 className="w-4 h-4" />;
      default: return <Lightbulb className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Position Overview */}
      <Card className="p-4 bg-gradient-card border border-border shadow-card">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">Position Analysis</h3>
            <Badge variant="outline" className="text-xs">
              NFT #{currentPosition.tokenId}
            </Badge>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center space-y-1">
              <p className="text-xs text-muted-foreground">Health Status</p>
              <div className={`flex items-center justify-center gap-1 ${getHealthColor(positionAnalysis.positionHealth)}`}>
                {getHealthIcon(positionAnalysis.positionHealth)}
                <span className="text-sm font-medium capitalize">
                  {positionAnalysis.positionHealth.replace('_', ' ')}
                </span>
              </div>
            </div>

            <div className="text-center space-y-1">
              <p className="text-xs text-muted-foreground">Capital Efficiency</p>
              <div className="space-y-1">
                <p className="text-sm font-bold">{positionAnalysis.capitalEfficiency}%</p>
                <Progress value={positionAnalysis.capitalEfficiency} className="h-1" />
              </div>
            </div>

            <div className="text-center space-y-1">
              <p className="text-xs text-muted-foreground">In Range</p>
              <p className="text-sm font-bold text-green-600">
                {currentPosition.inRange ? 'Yes' : 'No'}
              </p>
            </div>

            <div className="text-center space-y-1">
              <p className="text-xs text-muted-foreground">IL Risk</p>
              <p className="text-sm font-bold">
                {formatPercentage(positionAnalysis.impermanentLoss.percentage)}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Current vs Suggested Range Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4 bg-gradient-card border border-border shadow-card">
          <div className="space-y-3">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <Target className="w-4 h-4" />
              Your Current Range
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Min Price:</span>
                <span className="font-mono">{formatPrice(currentPosition.minPrice)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Max Price:</span>
                <span className="font-mono">{formatPrice(currentPosition.maxPrice)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Current Price:</span>
                <span className="font-mono font-bold">{formatPrice(currentPosition.currentPrice)}</span>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-card border border-border shadow-card">
          <div className="space-y-3">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <Lightbulb className="w-4 h-4" />
              AI Suggested Range
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Min Price:</span>
                <span className="font-mono">{formatPrice(result.suggestedMinPrice)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Max Price:</span>
                <span className="font-mono">{formatPrice(result.suggestedMaxPrice)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Confidence:</span>
                <span className="font-bold">{result.confidence}%</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Performance Metrics */}
      <Card className="p-4 bg-gradient-card border border-border shadow-card">
        <div className="space-y-4">
          <h4 className="font-semibold text-sm flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Performance Metrics
          </h4>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Total Fees Earned */}
            <div className="space-y-3">
              <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Total Fees Earned (Since Creation)
              </h5>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center space-y-1 p-2 bg-muted/30 rounded">
                  <p className="text-xs text-muted-foreground">
                    {result.currentPosition?.token0Symbol || 'Token 0'}
                  </p>
                  <p className="text-sm font-bold">
                    {positionAnalysis.feesEarned.totalToken0.toFixed(6)}
                  </p>
                </div>
                <div className="text-center space-y-1 p-2 bg-muted/30 rounded">
                  <p className="text-xs text-muted-foreground">
                    {result.currentPosition?.token1Symbol || 'Token 1'}
                  </p>
                  <p className="text-sm font-bold">
                    {positionAnalysis.feesEarned.totalToken1.toFixed(6)}
                  </p>
                </div>
              </div>
              <div className="text-center space-y-1">
                <p className="text-xs text-muted-foreground">Total USD Value</p>
                <p className="text-lg font-bold text-green-600">
                  ${positionAnalysis.feesEarned.totalEarnedUSD.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Unclaimed Fees */}
            <div className="space-y-3">
              <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Unclaimed Fees (Available to Collect)
              </h5>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center space-y-1 p-2 bg-muted/30 rounded">
                  <p className="text-xs text-muted-foreground">
                    {result.currentPosition?.token0Symbol || 'Token 0'}
                  </p>
                  <p className="text-sm font-bold">
                    {positionAnalysis.feesEarned.unclaimedToken0.toFixed(6)}
                  </p>
                  <p className="text-xs text-emerald-600">
                    ${positionAnalysis.feesEarned.token0USD.toFixed(2)}
                  </p>
                </div>
                <div className="text-center space-y-1 p-2 bg-muted/30 rounded">
                  <p className="text-xs text-muted-foreground">
                    {result.currentPosition?.token1Symbol || 'Token 1'}
                  </p>
                  <p className="text-sm font-bold">
                    {positionAnalysis.feesEarned.unclaimedToken1.toFixed(6)}
                  </p>
                  <p className="text-xs text-emerald-600">
                    ${positionAnalysis.feesEarned.token1USD.toFixed(2)}
                  </p>
                </div>
              </div>
              <div className="text-center space-y-1">
                <p className="text-xs text-muted-foreground">Total Unclaimed USD</p>
                <p className="text-lg font-bold text-blue-600">
                  ${positionAnalysis.feesEarned.unclaimedUSD.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-border">
            <div className="text-center space-y-1">
              <p className="text-xs text-muted-foreground">Est. Days In Range</p>
              <p className="text-sm font-bold text-green-600">
                ~{positionAnalysis.daysInRange}
              </p>
            </div>

            <div className="text-center space-y-1">
              <p className="text-xs text-muted-foreground">Est. Days Out of Range</p>
              <p className="text-sm font-bold text-red-600">
                ~{positionAnalysis.daysOutOfRange}
              </p>
            </div>

            <div className="text-center space-y-1">
              <p className="text-xs text-muted-foreground">Capital Efficiency</p>
              <p className="text-sm font-bold">
                {positionAnalysis.capitalEfficiency}%
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Improvement Recommendations */}
      <Card className="p-4 bg-gradient-card border border-border shadow-card">
        <div className="space-y-4">
          <h4 className="font-semibold text-sm flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            Improvement Recommendations
          </h4>
          
          <div className="space-y-3">
            {positionAnalysis.recommendations.map((rec, index) => (
              <div key={index} className="border border-border rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  {getActionIcon(rec.action)}
                  <span className="font-medium text-sm capitalize">
                    {rec.action.replace('_', ' ')}
                  </span>
                  {rec.gasCostEstimate && (
                    <Badge variant="outline" className="text-xs ml-auto">
                      ~${rec.gasCostEstimate} gas
                    </Badge>
                  )}
                </div>
                
                <p className="text-sm text-muted-foreground">
                  {rec.reasoning}
                </p>
                
                <p className="text-sm font-medium text-primary">
                  Expected: {rec.expectedImprovement}
                </p>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
};