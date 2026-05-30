import { createPublicClient, http, type Address } from 'viem';
import { SUPPORTED_CHAINS, ChainConfig } from '@/config/chains';

const UNISWAP_V3_POOL_ABI = [
  {
    type: 'function',
    name: 'token0',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
] as const;

// Cache for detected chains to avoid repeated calls
const chainCache = new Map<string, string>();

export async function detectPoolChain(poolAddress: string): Promise<ChainConfig | null> {
  // Check cache first
  const cached = chainCache.get(poolAddress.toLowerCase());
  if (cached && SUPPORTED_CHAINS[cached]) {
    return SUPPORTED_CHAINS[cached];
  }

  // Try each chain to see which one has the pool
  for (const [chainKey, config] of Object.entries(SUPPORTED_CHAINS)) {
    try {
      const client = createPublicClient({
        chain: config.viemChain,
        transport: http(config.rpcUrls[0]),
      });

      // Try to call a simple view function to check if the contract exists
      await (client as any).readContract({
        address: poolAddress as Address,
        abi: UNISWAP_V3_POOL_ABI,
        functionName: 'token0',
      });

      // If we get here, the contract exists on this chain
      chainCache.set(poolAddress.toLowerCase(), chainKey);
      return config;
    } catch (error) {
      // Contract doesn't exist on this chain, try next
      continue;
    }
  }

  return null;
}

export function clearChainCache(): void {
  chainCache.clear();
}