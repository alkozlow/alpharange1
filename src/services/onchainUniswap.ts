import { createPublicClient, http, type Address } from 'viem';
import { PoolInfo } from '@/types/uniswap';
import { ChainConfig } from '@/config/chains';
import { detectPoolChain } from './chainDetection';

const UNISWAP_V3_POOL_ABI = [
  {
    type: 'function',
    name: 'token0',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    type: 'function',
    name: 'token1',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    type: 'function',
    name: 'fee',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint24' }],
  },
] as const;

const ERC20_ABI = [
  {
    type: 'function',
    name: 'symbol',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    type: 'function',
    name: 'name',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    type: 'function',
    name: 'decimals',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
] as const;

function makeClient(chainConfig: ChainConfig, rpcIndex: number = 0) {
  const rpcUrl = chainConfig.rpcUrls[rpcIndex] || chainConfig.rpcUrls[0];
  return createPublicClient({
    chain: chainConfig.viemChain,
    transport: http(rpcUrl),
  });
}

export async function getPoolInfoOnchain(poolAddress: string): Promise<PoolInfo> {
  // First, detect which chain this pool is on
  const chainConfig = await detectPoolChain(poolAddress);
  if (!chainConfig) {
    throw new Error(`Pool not found on any supported network (Polygon, Arbitrum). Please verify the address: ${poolAddress}`);
  }

  // Try each RPC endpoint for the detected chain
  for (let rpcIndex = 0; rpcIndex < chainConfig.rpcUrls.length; rpcIndex++) {
    try {
      const client = makeClient(chainConfig, rpcIndex);
      const address = poolAddress as Address;
      const rc = (p: any) => (client as any).readContract(p) as Promise<any>;

      const [token0Address, token1Address, feeRaw] = await Promise.all([
        rc({ address, abi: UNISWAP_V3_POOL_ABI, functionName: 'token0' }) as Promise<Address>,
        rc({ address, abi: UNISWAP_V3_POOL_ABI, functionName: 'token1' }) as Promise<Address>,
        rc({ address, abi: UNISWAP_V3_POOL_ABI, functionName: 'fee' }) as Promise<number>,
      ]);

      const [token0Symbol, token0Name, token0Decimals] = await Promise.all([
        rc({ address: token0Address, abi: ERC20_ABI, functionName: 'symbol' }) as Promise<string>,
        rc({ address: token0Address, abi: ERC20_ABI, functionName: 'name' }) as Promise<string>,
        rc({ address: token0Address, abi: ERC20_ABI, functionName: 'decimals' }) as Promise<number>,
      ]);

      const [token1Symbol, token1Name, token1Decimals] = await Promise.all([
        rc({ address: token1Address, abi: ERC20_ABI, functionName: 'symbol' }) as Promise<string>,
        rc({ address: token1Address, abi: ERC20_ABI, functionName: 'name' }) as Promise<string>,
        rc({ address: token1Address, abi: ERC20_ABI, functionName: 'decimals' }) as Promise<number>,
      ]);

      return {
        id: poolAddress,
        token0: {
          id: token0Address,
          symbol: token0Symbol,
          name: token0Name,
          decimals: Number(token0Decimals),
        },
        token1: {
          id: token1Address,
          symbol: token1Symbol,
          name: token1Name,
          decimals: Number(token1Decimals),
        },
        feeTier: Number(feeRaw),
        chainName: chainConfig.name,
      };
    } catch (err) {
      console.error(`RPC ${rpcIndex + 1} failed for ${chainConfig.name}:`, err);
      // If this was the last RPC, throw the error
      if (rpcIndex === chainConfig.rpcUrls.length - 1) {
        throw new Error(`All RPC endpoints failed for ${chainConfig.name}. Pool: ${poolAddress}`);
      }
      // Otherwise, continue to next RPC
    }
  }

  throw new Error(`Failed to fetch pool info from ${chainConfig.name} network`);
}
