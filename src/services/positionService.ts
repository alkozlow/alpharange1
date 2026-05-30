import { createPublicClient, http, type Address } from 'viem';
import { SUPPORTED_CHAINS } from '@/config/chains';
import { PositionData } from '@/types/uniswap';
import { determineBaseQuote, getTokenId } from '@/utils/tokenMapping';
import { CoinGeckoService } from './coinGeckoService';

// ERC20 ABI for token metadata
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
    name: 'decimals',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
] as const;

// Uniswap V3 NonfungiblePositionManager ABI (positions function)
const POSITION_MANAGER_ABI = [
  {
    type: 'function',
    name: 'positions',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [
      { name: 'nonce', type: 'uint96' },
      { name: 'operator', type: 'address' },
      { name: 'token0', type: 'address' },
      { name: 'token1', type: 'address' },
      { name: 'fee', type: 'uint24' },
      { name: 'tickLower', type: 'int24' },
      { name: 'tickUpper', type: 'int24' },
      { name: 'liquidity', type: 'uint128' },
      { name: 'feeGrowthInside0LastX128', type: 'uint256' },
      { name: 'feeGrowthInside1LastX128', type: 'uint256' },
      { name: 'tokensOwed0', type: 'uint128' },
      { name: 'tokensOwed1', type: 'uint128' },
    ],
  },
  {
    type: 'function',
    name: 'ownerOf',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    type: 'function',
    name: 'collect',
    stateMutability: 'payable',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'tokenId', type: 'uint256' },
          { name: 'recipient', type: 'address' },
          { name: 'amount0Max', type: 'uint128' },
          { name: 'amount1Max', type: 'uint128' },
        ],
      },
    ],
    outputs: [
      { name: 'amount0', type: 'uint256' },
      { name: 'amount1', type: 'uint256' },
    ],
  },
] as const;

// Uniswap V3 Pool ABI for getting current tick
const POOL_ABI = [
  {
    type: 'function',
    name: 'slot0',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'sqrtPriceX96', type: 'uint160' },
      { name: 'tick', type: 'int24' },
      { name: 'observationIndex', type: 'uint16' },
      { name: 'observationCardinality', type: 'uint16' },
      { name: 'observationCardinalityNext', type: 'uint16' },
      { name: 'feeProtocol', type: 'uint8' },
      { name: 'unlocked', type: 'bool' },
    ],
  },
] as const;
// Uniswap V3 Factory ABI for getting pool address
const FACTORY_ABI = [
  {
    type: 'function',
    name: 'getPool',
    stateMutability: 'view',
    inputs: [
      { name: 'token0', type: 'address' },
      { name: 'token1', type: 'address' },
      { name: 'fee', type: 'uint24' },
    ],
    outputs: [{ name: 'pool', type: 'address' }],
  },
] as const;

const FACTORY_ADDRESSES: { [chainName: string]: string } = {
  ethereum: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
  polygon: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
  arbitrum: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
  optimism: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
  base: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
};

// Known Uniswap V3 NonfungiblePositionManager addresses
const POSITION_MANAGER_ADDRESSES: { [chainName: string]: string } = {
  ethereum: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
  polygon: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
  arbitrum: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
  optimism: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
  base: '0x03a520b32C04BF3bEEf7BF5d4e5f3AEd84f0d3b7',
};

export class PositionService {
  /**
   * Fetches position data for a given NFT token ID
   */
  static async getPositionData(tokenId: string, userAddress?: string): Promise<PositionData> {
    try {
      // Validate input
      if (!/^\d+$/.test(tokenId)) {
        throw new Error('Invalid Position NFT ID');
      }

      // Try all supported chains in parallel
      const chainEntries = Object.entries(SUPPORTED_CHAINS);

      const attempts = await Promise.allSettled(
        chainEntries.map(async ([chainName, chainConfig]) => {
          const client = createPublicClient({
            chain: chainConfig.viemChain,
            transport: http(chainConfig.rpcUrls[0]),
          });

          const positionManagerAddress = POSITION_MANAGER_ADDRESSES[chainName];
          if (!positionManagerAddress) throw new Error('No position manager for ' + chainName);

          // If userAddress provided, verify ownership first
          if (userAddress) {
            const owner = await (client as any).readContract({
              address: positionManagerAddress as Address,
              abi: POSITION_MANAGER_ABI,
              functionName: 'ownerOf',
              args: [BigInt(tokenId)],
            });
            if ((owner as string).toLowerCase() !== userAddress.toLowerCase()) {
              throw new Error('Ownership mismatch');
            }
          }

          // Get position data
          const positionData = await (client as any).readContract({
            address: positionManagerAddress as Address,
            abi: POSITION_MANAGER_ABI,
            functionName: 'positions',
            args: [BigInt(tokenId)],
          });

          const [
            nonce,
            operator,
            token0,
            token1,
            fee,
            tickLower,
            tickUpper,
            liquidity,
            feeGrowthInside0LastX128,
            feeGrowthInside1LastX128,
            tokensOwed0,
            tokensOwed1,
          ] = positionData;

          // Resolve pool address via factory
          const poolAddress = await this.getPoolAddress(token0, token1, Number(fee), chainConfig);
          if (
            !poolAddress ||
            poolAddress.toLowerCase() === '0x0000000000000000000000000000000000000000'
          ) {
            throw new Error('Pool not found');
          }

          // Get current pool state
          const slot0 = await (client as any).readContract({
            address: poolAddress as Address,
            abi: POOL_ABI,
            functionName: 'slot0',
          });

          const currentTick = Number(slot0[1]);

          // Get actual unclaimed fees using collect simulation
          const unclaimedFees = await this.getUnclaimedFees(
            client,
            positionManagerAddress,
            tokenId
          );

          // Get token metadata in parallel
          const [token0Symbol, token0Decimals, token1Symbol, token1Decimals] = await Promise.all([
            (client as any).readContract({
              address: token0 as Address,
              abi: ERC20_ABI,
              functionName: 'symbol',
            }),
            (client as any).readContract({
              address: token0 as Address,
              abi: ERC20_ABI,
              functionName: 'decimals',
            }),
            (client as any).readContract({
              address: token1 as Address,
              abi: ERC20_ABI,
              functionName: 'symbol',
            }),
            (client as any).readContract({
              address: token1 as Address,
              abi: ERC20_ABI,
              functionName: 'decimals',
            }),
          ]);

          // Determine base/quote orientation
          const { baseAsset, quoteAsset } = determineBaseQuote(token0Symbol, token1Symbol);
          
          // Calculate prices with correct decimal adjustment
          const minPrice = this.tickToPriceWithDecimals(Number(tickLower), Number(token0Decimals), Number(token1Decimals));
          const maxPrice = this.tickToPriceWithDecimals(Number(tickUpper), Number(token0Decimals), Number(token1Decimals));
          const currentPrice = this.tickToPriceWithDecimals(currentTick, Number(token0Decimals), Number(token1Decimals));

          // Calculate USD-oriented prices if possible
          let minPriceUSD: number | undefined;
          let maxPriceUSD: number | undefined;
          let currentPriceUSD: number | undefined;

          try {
            const baseTokenId = getTokenId(baseAsset);
            const quoteTokenId = getTokenId(quoteAsset);
            
            if (baseTokenId && quoteTokenId) {
              // Determine if we need to flip prices based on base/quote orientation
              const isToken0Base = (baseAsset === token0Symbol);
              
              if (quoteAsset === 'USD' || quoteTokenId === 'usd-coin' || quoteTokenId === 'tether') {
                // Quote is USD, base price is what we want
                const basePrice = await CoinGeckoService.getCurrentPrice(baseTokenId);
                
                if (isToken0Base) {
                  // token0 is base, token1 is quote - prices are correct
                  currentPriceUSD = basePrice;
                  minPriceUSD = minPrice * basePrice / currentPrice;
                  maxPriceUSD = maxPrice * basePrice / currentPrice;
                } else {
                  // token1 is base, token0 is quote - need to flip
                  currentPriceUSD = basePrice;
                  minPriceUSD = basePrice / maxPrice;
                  maxPriceUSD = basePrice / minPrice;
                }
              } else {
                // Both tokens have market prices, calculate ratio-based USD prices
                const [basePrice, quotePrice] = await Promise.all([
                  CoinGeckoService.getCurrentPrice(baseTokenId),
                  CoinGeckoService.getCurrentPrice(quoteTokenId),
                ]);
                
                const ratioToUSD = basePrice / quotePrice;
                
                if (isToken0Base) {
                  currentPriceUSD = currentPrice * ratioToUSD;
                  minPriceUSD = minPrice * ratioToUSD;
                  maxPriceUSD = maxPrice * ratioToUSD;
                } else {
                  currentPriceUSD = ratioToUSD / currentPrice;
                  minPriceUSD = ratioToUSD / maxPrice;
                  maxPriceUSD = ratioToUSD / minPrice;
                }
              }
            }
          } catch (error) {
            console.warn('Could not fetch USD prices:', error);
          }

          // Calculate if position is in range
          const inRange = currentTick >= Number(tickLower) && currentTick <= Number(tickUpper);

          // Calculate capital efficiency (simplified)
          const efficiency = inRange ? 100 : 0;

          const result: PositionData = {
            tokenId,
            tickLower: Number(tickLower),
            tickUpper: Number(tickUpper),
            liquidity: liquidity.toString(),
            feeGrowthInside0LastX128: feeGrowthInside0LastX128.toString(),
            feeGrowthInside1LastX128: feeGrowthInside1LastX128.toString(),
            tokensOwed0: unclaimedFees.amount0.toString(),
            tokensOwed1: unclaimedFees.amount1.toString(),
            poolAddress,
            minPrice,
            maxPrice,
            currentPrice,
            inRange,
            efficiency,
            // Enhanced data
            token0Address: token0,
            token1Address: token1,
            token0Symbol,
            token1Symbol,
            token0Decimals: Number(token0Decimals),
            token1Decimals: Number(token1Decimals),
            currentTick,
            chainName,
            minPriceUSD,
            maxPriceUSD,
            currentPriceUSD,
            baseAsset,
            quoteAsset,
          };

          return result;
        })
      );

      for (const res of attempts) {
        if (res.status === 'fulfilled') {
          return res.value as PositionData;
        }
      }

      throw new Error('Position not found on any supported chain');
    } catch (error) {
      console.error('Error fetching position data:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to fetch position data');
    }
  }

  /**
   * Convert tick to price (raw)
   */
  private static tickToPrice(tick: number): number {
    return Math.pow(1.0001, tick);
  }

  /**
   * Convert tick to price with proper decimal adjustment
   */
  private static tickToPriceWithDecimals(tick: number, token0Decimals: number, token1Decimals: number): number {
    const rawPrice = Math.pow(1.0001, tick);
    // Adjust for token decimals: price is token1/token0, so we need to adjust by the decimal difference
    const decimalAdjustment = Math.pow(10, token0Decimals - token1Decimals);
    return rawPrice * decimalAdjustment;
  }

  /**
   * Get pool address for given tokens and fee
   */
  private static async getPoolAddress(
    token0: string,
    token1: string,
    fee: number,
    chainConfig: any
  ): Promise<string> {
    try {
      const client = createPublicClient({
        chain: chainConfig.viemChain,
        transport: http(chainConfig.rpcUrls[0]),
      });
      const factoryAddress = FACTORY_ADDRESSES[(chainConfig.name as string).toLowerCase()];
      if (!factoryAddress) return '0x0000000000000000000000000000000000000000';
      const pool = await (client as any).readContract({
        address: factoryAddress as Address,
        abi: FACTORY_ABI,
        functionName: 'getPool',
        args: [token0 as Address, token1 as Address, Number(fee)],
      });
      return pool as string;
    } catch (e) {
      return '0x0000000000000000000000000000000000000000';
    }
  }

  /**
   * Get actual unclaimed fees using collect simulation
   */
  private static async getUnclaimedFees(
    client: any,
    positionManagerAddress: string,
    tokenId: string
  ): Promise<{ amount0: bigint; amount1: bigint }> {
    try {
      // Simulate collect call with maximum amounts to get actual unclaimed fees
      const result = await client.simulateContract({
        address: positionManagerAddress as Address,
        abi: POSITION_MANAGER_ABI,
        functionName: 'collect',
        args: [
          {
            tokenId: BigInt(tokenId),
            recipient: '0x0000000000000000000000000000000000000000', // Zero address for simulation
            amount0Max: BigInt('0xffffffffffffffffffffffffffffffff'), // type(uint128).max
            amount1Max: BigInt('0xffffffffffffffffffffffffffffffff'), // type(uint128).max
          },
        ],
      });

      const [amount0, amount1] = result.result;
      console.log('Actual unclaimed fees from collect simulation:', {
        tokenId,
        amount0: amount0.toString(),
        amount1: amount1.toString(),
      });

      return { amount0: amount0 as bigint, amount1: amount1 as bigint };
    } catch (error) {
      console.warn('Collect simulation failed, falling back to tokensOwed:', error);
      // Fallback to zero if simulation fails
      return { amount0: 0n, amount1: 0n };
    }
  }
}