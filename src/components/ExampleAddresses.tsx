import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Copy, ExternalLink } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface ExampleAddress {
  address: string;
  pair: string;
  network: string;
  description: string;
}

const EXAMPLE_ADDRESSES: ExampleAddress[] = [
  {
    address: "0x45dDa9cb7c25131DF268515131f647d726f50608",
    pair: "USDC/WETH",
    network: "Polygon",
    description: "Highest TVL Uniswap V3 pool on Polygon - 0.05% fee tier"
  },
  {
    address: "0x052C9b8f41f3855225495E78532aaAD0f22a925C",
    pair: "USDC/WETH", 
    network: "Polygon",
    description: "Major USDC/WETH pool on Polygon with high liquidity"
  },
  {
    address: "0xb52781c275431bd48d290a4318e338fe0df89eb9",
    pair: "USDC/WETH",
    network: "Arbitrum",
    description: "Highest TVL Uniswap V3 pool on Arbitrum - optimal for range analysis"
  }
];

interface ExampleAddressesProps {
  onSelectAddress: (address: string) => void;
}

export const ExampleAddresses = ({ onSelectAddress }: ExampleAddressesProps) => {
  const { toast } = useToast();

  const handleCopyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    toast({
      title: "Address Copied",
      description: "Pool address copied to clipboard",
    });
  };

  return (
    <Card className="p-4 bg-gradient-card border border-border shadow-card">
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <ExternalLink className="w-4 h-4 text-primary" />
          Example Pool Addresses
        </h3>
        
        <div className="space-y-2">
          {EXAMPLE_ADDRESSES.map((example, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {example.pair}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {example.network}
                  </Badge>
                </div>
              </div>
              
              <p className="text-xs text-muted-foreground">
                {example.description}
              </p>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onSelectAddress(example.address)}
                  className="text-xs h-8 flex-1"
                >
                  Use This Pool
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopyAddress(example.address)}
                  className="h-8 w-8 p-0"
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
              
              {index < EXAMPLE_ADDRESSES.length - 1 && (
                <div className="border-b border-border/50" />
              )}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};