import { polygon, arbitrum, mainnet, optimism } from 'viem/chains';
import type { Chain } from 'viem/chains';

export interface ChainConfig {
  id: number;
  name: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: string[];
  subgraphUrl: string;
  viemChain: Chain;
}

export const SUPPORTED_CHAINS: Record<string, ChainConfig> = {
  polygon: {
    id: 137,
    name: 'Polygon',
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18,
    },
    rpcUrls: [
      'https://polygon-bor.publicnode.com',
      'https://1rpc.io/matic',
      'https://polygon-rpc.com',
    ],
    subgraphUrl: 'https://api.thegraph.com/subgraphs/name/ianlapham/uniswap-v3-polygon',
    viemChain: polygon,
  },
  arbitrum: {
    id: 42161,
    name: 'Arbitrum',
    nativeCurrency: {
      name: 'ETH',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: [
      'https://arbitrum.publicnode.com',
      'https://1rpc.io/arb',
      'https://arb1.arbitrum.io/rpc',
    ],
    subgraphUrl: 'https://api.thegraph.com/subgraphs/name/ianlapham/arbitrum-minimal',
    viemChain: arbitrum,
  },
  ethereum: {
    id: 1,
    name: 'Ethereum',
    nativeCurrency: {
      name: 'ETH',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: [
      'https://ethereum.publicnode.com',
      'https://1rpc.io/eth',
      'https://cloudflare-eth.com',
    ],
    subgraphUrl: 'https://api.thegraph.com/subgraphs/name/ianlapham/uniswap-v3-subgraph',
    viemChain: mainnet,
  },
  optimism: {
    id: 10,
    name: 'Optimism',
    nativeCurrency: {
      name: 'ETH',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: [
      'https://optimism.publicnode.com',
      'https://1rpc.io/op',
      'https://mainnet.optimism.io',
    ],
    subgraphUrl: 'https://api.thegraph.com/subgraphs/name/ianlapham/uniswap-v3-optimism',
    viemChain: optimism,
  },
};

export type ChainKey = keyof typeof SUPPORTED_CHAINS;

export const CHAIN_KEYS = Object.keys(SUPPORTED_CHAINS) as Array<ChainKey>;

export function getChainConfig(chainKey: string): ChainConfig | null {
  return SUPPORTED_CHAINS[chainKey] || null;
}

export function getAllChainConfigs(): ChainConfig[] {
  return Object.values(SUPPORTED_CHAINS);
}