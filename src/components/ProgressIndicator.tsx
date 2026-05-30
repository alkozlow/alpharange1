import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { CalculationProgress } from "@/types/uniswap";
import { Loader2, Database, TrendingUp, Calculator, AlertTriangle, CheckCircle2, RefreshCcw } from "lucide-react";
interface ProgressIndicatorProps {
  progress: CalculationProgress;
  onRetry?: () => void;
}

export const ProgressIndicator = ({ progress, onRetry }: ProgressIndicatorProps) => {
  const getPhaseIcon = () => {
    switch (progress.phase) {
      case 'identifying':
        return <Database className="w-5 h-5 text-primary animate-pulse" />;
      case 'fetching':
        return <TrendingUp className="w-5 h-5 text-accent animate-pulse" />;
      case 'analyzing':
        return <Calculator className="w-5 h-5 text-success animate-pulse" />;
      case 'complete':
        return <CheckCircle2 className="w-5 h-5 text-success" />;
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-destructive" />;
      default:
        return <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />;
    }
  };

  if (progress.phase === 'idle') {
    return null;
  }

  return (
    <div className="space-y-4 p-6 bg-gradient-card rounded-xl border border-border shadow-card">
      <div className="flex items-center gap-3" role="status" aria-live="polite">
        {getPhaseIcon()}
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">
            {progress.message}
          </p>
        </div>
        {progress.phase === 'error' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => (onRetry ? onRetry() : window.location.reload())}
            className="shrink-0"
            aria-label="Retry calculation"
            title="Retry"
          >
            <RefreshCcw className="w-4 h-4" />
          </Button>
        )}
      </div>
      
      {progress.phase !== 'error' && progress.phase !== 'complete' && (
        <div className="space-y-2">
          <Progress value={progress.progress} className="h-2" />
          <p className="text-xs text-muted-foreground text-center">
            {Math.max(0, Math.min(100, progress.progress))}% complete
          </p>
        </div>
      )}

      {progress.phase === 'error' && (
        <div className="text-xs bg-destructive/10 border border-destructive/20 p-3 rounded-md space-y-2">
          <p className="text-destructive font-medium">Connection Failed</p>
          <p className="text-muted-foreground">
            Unable to fetch pool data. This could be due to:
          </p>
          <ul className="text-muted-foreground space-y-1 ml-3">
            <li>• Invalid pool address</li>
            <li>• Network connectivity issues</li>
            <li>• Pool not found on Polygon network</li>
          </ul>
          <p className="text-muted-foreground">
            Click the retry button above or verify the pool address and try again.
          </p>
        </div>
      )}
    </div>
  );
};