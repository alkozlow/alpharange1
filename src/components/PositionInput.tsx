import { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, FileText } from "lucide-react";

interface PositionInputProps {
  onPositionSubmit: (tokenId: string, userAddress?: string) => void;
  isLoading: boolean;
}

export const PositionInput = ({ onPositionSubmit, isLoading }: PositionInputProps) => {
  const [tokenId, setTokenId] = useState('');
  const [userAddress, setUserAddress] = useState('');
  const [errors, setErrors] = useState<{ tokenId?: string; userAddress?: string }>({});

  const validateInputs = () => {
    const newErrors: { tokenId?: string; userAddress?: string } = {};

    if (!tokenId.trim()) {
      newErrors.tokenId = 'Position NFT ID is required';
    } else if (!/^\d+$/.test(tokenId.trim())) {
      newErrors.tokenId = 'Position ID must be a number';
    }

    if (userAddress && !/^0x[a-fA-F0-9]{40}$/.test(userAddress.trim())) {
      newErrors.userAddress = 'Invalid Ethereum address format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateInputs()) {
      onPositionSubmit(tokenId.trim(), userAddress.trim() || undefined);
    }
  };

  return (
    <Card className="p-4 bg-gradient-card border border-border shadow-card">
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">Analyze Existing Position</h3>
        </div>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="position-id" className="text-xs font-medium text-foreground">
              Position NFT ID *
            </Label>
            <Input
              id="position-id"
              type="text"
              value={tokenId}
              onChange={(e) => {
                setTokenId(e.target.value);
                if (errors.tokenId) setErrors(prev => ({ ...prev, tokenId: undefined }));
              }}
              placeholder="123456"
              className="h-9 text-sm"
            />
            {errors.tokenId && (
              <div className="flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="w-3 h-3" />
                {errors.tokenId}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="user-address" className="text-xs font-medium text-foreground">
              Your Address (Optional)
            </Label>
            <Input
              id="user-address"
              type="text"
              value={userAddress}
              onChange={(e) => {
                setUserAddress(e.target.value);
                if (errors.userAddress) setErrors(prev => ({ ...prev, userAddress: undefined }));
              }}
              placeholder="0x..."
              className="h-9 text-sm"
            />
            {errors.userAddress && (
              <div className="flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="w-3 h-3" />
                {errors.userAddress}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Verify ownership and get detailed analysis
            </p>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={isLoading || !tokenId.trim()}
            variant="secondary"
            size="sm"
            className="w-full h-9 text-sm"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                Analyzing Position...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <CheckCircle className="w-3 h-3" />
                Analyze Position
              </div>
            )}
          </Button>
        </div>

        <div className="pt-2 border-t border-border">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              Tip
            </Badge>
            <p className="text-xs text-muted-foreground">
              Find your Position NFT ID in your wallet or on Uniswap app
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
};