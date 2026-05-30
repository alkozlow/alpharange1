import { useState, useEffect } from 'react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff } from "lucide-react";

export const NetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showStatus, setShowStatus] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowStatus(true);
      setTimeout(() => setShowStatus(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowStatus(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!showStatus && isOnline) return null;

  return (
    <div className="fixed top-4 right-4 z-50">
      {!isOnline ? (
        <Alert className="bg-destructive/10 border-destructive/20">
          <WifiOff className="h-4 w-4" />
          <AlertDescription className="text-destructive-foreground">
            No internet connection. Some features may not work.
          </AlertDescription>
        </Alert>
      ) : showStatus ? (
        <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
          <Wifi className="h-3 w-3 mr-1" />
          Connected
        </Badge>
      ) : null}
    </div>
  );
};