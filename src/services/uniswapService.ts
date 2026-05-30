import { PoolInfo } from '@/types/uniswap';
import { getPoolInfoOnchain } from './onchainUniswap';
import { detectPoolChain } from './chainDetection';

export class UniswapService {
  static async getPoolInfo(poolAddress: string): Promise<PoolInfo> {
    const query = `
      query GetPool($poolAddress: String!) {
        pool(id: $poolAddress) {
          id
          feeTier
          token0 {
            id
            symbol
            name
            decimals
          }
          token1 {
            id
            symbol
            name
            decimals
          }
        }
      }
    `;

    // Prefer on-chain read to avoid subgraph/CORS issues
    try {
      return await getPoolInfoOnchain(poolAddress);
    } catch (onchainErr) {
      console.warn('On-chain fetch failed, falling back to subgraph...', onchainErr);
    }

    // Detect chain and get appropriate subgraph URL
    const chainConfig = await detectPoolChain(poolAddress);
    if (!chainConfig) {
      throw new Error(`Pool not found on any supported network (Polygon, Arbitrum). Please verify the address: ${poolAddress}`);
    }

    try {
      const response = await fetch(chainConfig.subgraphUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          variables: {
            poolAddress: poolAddress.toLowerCase(),
          },
        }),
      });

      const data = await response.json();
      
      if (data.errors) {
        throw new Error(`Subgraph query failed: ${data.errors[0]?.message || 'Unknown error'}`);
      }

      if (!data.data?.pool) {
        throw new Error(`Pool not found: ${poolAddress}. Please verify the address is a valid Uniswap v3 pool on ${chainConfig.name}.`);
      }

      const pool = data.data.pool;
      
      return {
        id: pool.id,
        token0: {
          id: pool.token0.id,
          symbol: pool.token0.symbol,
          name: pool.token0.name,
          decimals: parseInt(pool.token0.decimals),
        },
        token1: {
          id: pool.token1.id,
          symbol: pool.token1.symbol,
          name: pool.token1.name,
          decimals: parseInt(pool.token1.decimals),
        },
        feeTier: parseInt(pool.feeTier),
        chainName: chainConfig.name,
      };
    } catch (error) {
      console.error(`Error fetching pool info via ${chainConfig.name} subgraph:`, error);
      throw error;
    }
  }

  static async getHistoricalPoolData(poolAddress: string, days: number = 50): Promise<any[]> {
    const query = `
      query GetPoolDayData($poolAddress: String!, $skip: Int!, $first: Int!) {
        poolDayDatas(
          where: { pool: $poolAddress }
          orderBy: date
          orderDirection: desc
          first: $first
          skip: $skip
        ) {
          date
          token0Price
          token1Price
          volumeUSD
          tvlUSD
          feesUSD
        }
      }
    `;

    // Detect chain and get appropriate subgraph URL
    const chainConfig = await detectPoolChain(poolAddress);
    if (!chainConfig) {
      throw new Error(`Pool not found on any supported network. Cannot fetch historical data.`);
    }

    try {
      const response = await fetch(chainConfig.subgraphUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          variables: {
            poolAddress: poolAddress.toLowerCase(),
            skip: 0,
            first: days,
          },
        }),
      });

      const data = await response.json();
      
      if (data.errors) {
        throw new Error(`Historical data query failed on ${chainConfig.name}: ${data.errors[0]?.message || 'Unknown error'}`);
      }

      return data.data?.poolDayDatas || [];
    } catch (error) {
      console.error(`Error fetching historical pool data from ${chainConfig?.name}:`, error);
      throw error;
    }
  }
}