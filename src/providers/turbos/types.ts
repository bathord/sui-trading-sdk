import { ProviderOptions } from "../types";

export type PoolData = {
  id: number;
  coin_a: string;
  coin_b: string;
  deploy_time_ms: string;
  fee: string;
  fee_growth_global_a: string;
  fee_growth_global_b: string;
  fee_protocol: string;
  liquidity: string;
  max_liquidity_per_tick: string;
  protocol_fees_a: string;
  protocol_fees_b: string;
  sqrt_price: string;
  tick_current_index: number;
  tick_spacing: string;
  unlocked: boolean;
  pool_id: string;
  type: string;
  coin_symbol_a: string;
  coin_symbol_b: string;
  coin_type_a: string;
  coin_type_b: string;
  fee_type: string;
  add_2_percent_depth: string;
  reduce_2_percent_depth: string;
  reward_infos: {
    type: string;
    fields: Record<string, unknown>;
  }[];
  reward_last_updated_time_ms: string;
  category: null | string;
  apr: number;
  apr_percent: number;
  fee_apr: number;
  reward_apr: number;
  volume_24h_usd: number;
  liquidity_usd: number;
  coin_a_liquidity_usd: number;
  coin_b_liquidity_usd: number;
  fee_24h_usd: number;
  flag: number;
  created_at: string;
  updated_at: string;
};

export type ShortPoolData = {
  poolId: string;
  coinTypeA: string;
  coinTypeB: string;
};

export type CoinData = {
  id: number;
  name: string;
  type: string;
  symbol: string;
  decimals: number;
  logo_url: string;
  coingecko_id: string;
  pyth_id: string | null;
  in_quote_list: boolean;
  is_stable: boolean;
  is_popular: boolean;
  in_pool: boolean;
  faucet_amount: string;
  cross_chain: string | null;
  flag: number;
};

export type SwapRequiredData = {
  outputAmount: bigint;
  nextTickIndex: number;
  pool: ShortPoolData;
  inputAmountWithDecimals: string;
  tokenFromIsTokenA: boolean;
};

export interface PoolsAPIResponse {
  code: number;
  message: string;
  data?: PoolData[];
}

export interface CoinsAPIResponse {
  code: number;
  message: string;
  data?: CoinData[];
}

export type TurbosOptions = ProviderOptions & { suiProviderUrl: string; proxy?: string };

export type TurbosCreatePoolEventParsedJson = {
  pool: string;
};

export type TurbosOwnedPool = {
  poolName: string;
  poolId: string;
  coinTypeA: string;
  coinTypeB: string;
  coinSymbolA: string;
  coinSymbolB: string;
  amountA: string;
  amountB: string;
  tickSpacing: number;
  feePercentage: string;
  amountAIsRaw: boolean;
  amountBIsRaw: boolean;
};

export type DetailedTurbosOwnedPoolInfo = TurbosOwnedPool & {
  apr: number;
  aprPercent: number;
  feeApr: number;
  rewardApr: number;
  volumeFor24hUsd: number;
  liquidityUsd: number;
  coinLiquidityUsdA: number;
  coinLiquidityUsdB: number;
  feeFor24hUsd: number;
};
