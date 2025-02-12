import { CoinNode, PathLink, SdkOptions } from "@cetusprotocol/cetus-sui-clmm-sdk";
import { ProviderOptions } from "../types";

export interface CoinInfo {
  name: string;
  symbol: string;
  decimals: number;
  address: string;
  balance: string;
  logo_url: string;
  coingecko_id: string;
  project_url: string;
  labels: string[] | null;
}

export interface LPList {
  symbol: string;
  name: string;
  decimals: number;
  fee: string;
  tick_spacing: string;
  pool_type: string;
  address: string;
  coin_a_address: string;
  coin_b_address: string;
  project_url: string;
  is_display_rewarder: boolean;
  is_closed: boolean;
  rewarder_display1: boolean;
  rewarder_display2: boolean;
  rewarder_display3: boolean;
  labels: string[];
  coin_a: CoinInfo;
  coin_b: CoinInfo;
  price: string;
  rewarder_usd: unknown[];
  is_forward: boolean;
  price_range_config: null;
  object: {
    coin_a: number;
    coin_b: number;
    tick_spacing: number;
    fee_rate: number;
    liquidity: string;
    current_sqrt_price: string;
    current_tick_index: { fields: { bits: string } };
    fee_growth_global_a: string;
    fee_growth_global_b: string;
    fee_protocol_coin_a: number;
    fee_protocol_coin_b: number;
    tick_manager: { fields: { ticks: { fields: { id: { id: string } } } } };
    rewarder_manager: {
      fields: {
        rewarders: unknown[];
        points_released: string;
        points_growth_global: string;
        last_updated_time: number;
      };
    };
    position_manager: { fields: { positions: { fields: { id: { id: string } } } } };
    is_pause: boolean;
    index: number;
    url: string;
  };
  category: string;
  is_vaults: boolean;
  stable_farming: null;
}

export interface APIResponse {
  code: number;
  msg: string;
  data?: { lp_list: LPList[] };
}

export type CoinNodeWithSymbol = CoinNode & { symbol?: string; type: string };
export type CoinMap = Map<string, CoinNodeWithSymbol>;
export type PathMap = Map<string, PathLink>;

export type CetusOptions = ProviderOptions & {
  sdkOptions: Omit<SdkOptions, "fullRpcUrl" | "simulationAccount">;
  suiProviderUrl: string;
  proxy?: string;
  simulationAccount?: string;
};

export type CetusCreatePoolEventParsedJson = {
  coin_type_a: string;
  coin_type_b: string;
  pool_id: string;
  tick_spacing: number;
};

export type CetusOwnedPool = {
  name: string;
  poolAddress: string;
  coinTypeA: string;
  coinTypeB: string;
  coinSymbolA?: string;
  coinSymbolB?: string;
  amountA: string;
  amountB: string;
  feeRate: string;
  amountAIsRaw: boolean;
  amountBIsRaw: boolean;
};

export type CetusPathForStorage = {
  base: string;
  quote: string;
  addressMap: [number, string][];
};

export interface PoolsQueryParams {
  is_vaults?: boolean;
  display_all_pools?: boolean;
  has_mining?: boolean;
  has_farming?: boolean;
  no_incentives?: boolean;
  order_by?: string;
  limit?: number;
  offset?: number;
}
