import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Settings, TrendingUp, Brain, Zap, Target } from "lucide-react";
interface AdvancedSettingsProps {
  enableTechnicalIndicators: boolean;
  enableSentimentAnalysis: boolean;
  enableSantimentAnalysis: boolean;
  enableOptionsAnalysis: boolean;
  onTechnicalIndicatorsChange: (enabled: boolean) => void;
  onSentimentAnalysisChange: (enabled: boolean) => void;
  onSantimentAnalysisChange: (enabled: boolean) => void;
  onOptionsAnalysisChange: (enabled: boolean) => void;
}
export const AdvancedSettings = ({
  enableTechnicalIndicators,
  enableSentimentAnalysis,
  enableSantimentAnalysis,
  enableOptionsAnalysis,
  onTechnicalIndicatorsChange,
  onSentimentAnalysisChange,
  onSantimentAnalysisChange,
  onOptionsAnalysisChange
}: AdvancedSettingsProps) => {
  return <Card className="p-6 bg-gradient-card border border-border shadow-card">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="w-6 h-6 text-accent" />
        <h3 className="text-lg font-semibold text-foreground">Advanced Analysis Settings</h3>
      </div>
      
      <div className="space-y-6">
        {/* Technical Indicators */}
        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-primary" />
            <div>
              <Label htmlFor="technical-indicators" className="text-base font-medium">
                Technical Indicators
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                RSI, MACD, Bollinger Bands, and market regime detection
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">ACTIVE</Badge>
            <Switch id="technical-indicators" checked={enableTechnicalIndicators} onCheckedChange={onTechnicalIndicatorsChange} />
          </div>
        </div>

        {/* Sentiment Analysis */}
        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-3">
            <Brain className="w-5 h-5 text-accent" />
            <div>
              <Label htmlFor="sentiment-analysis" className="text-base font-medium">
                Social Sentiment Analysis
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Real-time news and social media sentiment scoring
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              ACTIVE
            </Badge>
            <Switch id="sentiment-analysis" checked={enableSentimentAnalysis} onCheckedChange={onSentimentAnalysisChange} />
          </div>
        </div>

        {/* Options Market Analysis */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-accent/10 to-secondary/10 rounded-lg border border-accent/20">
          <div className="flex items-center gap-3">
            <Target className="w-5 h-5 text-accent" />
            <div>
              <Label htmlFor="options-analysis" className="text-base font-medium">
                Options Market Analysis
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Implied volatility, risk-neutral probabilities, and market regime detection
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              ACTIVE
            </Badge>
            <Switch id="options-analysis" checked={enableOptionsAnalysis} onCheckedChange={onOptionsAnalysisChange} />
          </div>
        </div>

        {/* Santiment Analysis */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg border border-primary/20">
          <div className="flex items-center gap-3">
            <Zap className="w-5 h-5 text-primary" />
            <div>
              <Label htmlFor="santiment-analysis" className="text-base font-medium">
                Santiment Analytics
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Advanced on-chain metrics, MVRV zones, and development activity
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="default" className="text-xs">
              PREMIUM
            </Badge>
            <Switch id="santiment-analysis" checked={enableSantimentAnalysis} onCheckedChange={onSantimentAnalysisChange} />
          </div>
        </div>

        {enableTechnicalIndicators && <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-primary" />
              <p className="text-sm font-medium text-primary">Enhanced Analysis Active</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Using adaptive time horizons, volatility regime detection, and momentum-based range adjustments.
            </p>
          </div>}

        {enableOptionsAnalysis && <div className="p-4 bg-accent/10 border border-accent/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-accent" />
              <p className="text-sm font-medium text-accent">Options Market Integration Active</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Using implied volatility, risk-neutral probabilities, and forward-looking market expectations for enhanced forecasting.
            </p>
          </div>}
      </div>
    </Card>;
};