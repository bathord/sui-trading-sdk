import BigNumber from "bignumber.js";
import { CoinManagerSingleton } from "../../managers/coin/CoinManager";
import { CommonCoinData } from "../../managers/types";
import { LONG_SUI_COIN_TYPE, SHORT_SUI_COIN_TYPE } from "../common";
import { CoinsCache, CommonPoolData, PathsCache } from "../types";
import { TurbosSingleton } from "./turbos";
import { CoinData, PoolData, ShortPoolData, TurbosCreatePoolEventParsedJson } from "./types";

/* eslint-disable require-jsdoc */
export function isPoolsApiResponseValid(response: unknown): response is { code: 0; message: "OK"; data: PoolData[] } {
  return (
    typeof response === "object" &&
    response !== null &&
    "code" in response &&
    "message" in response &&
    "data" in response &&
    response.code === 0 &&
    response.message === "OK" &&
    response.data !== undefined &&
    Array.isArray(response.data) &&
    response.data.every(isPoolDataValid)
  );
}

export function isCoinsApiResponseValid(response: unknown): response is { code: 0; message: "OK"; data: CoinData[] } {
  return (
    typeof response === "object" &&
    response !== null &&
    "code" in response &&
    "message" in response &&
    "data" in response &&
    response.code === 0 &&
    response.message === "OK" &&
    response.data !== undefined &&
    Array.isArray(response.data) &&
    response.data.every(isCoinDataValid)
  );
}

export function isPoolDataValid(poolData: PoolData): boolean {
  return (
    typeof poolData.id === "number" &&
    typeof poolData.coin_a === "string" &&
    typeof poolData.coin_b === "string" &&
    typeof poolData.deploy_time_ms === "string" &&
    typeof poolData.fee === "string" &&
    typeof poolData.fee_growth_global_a === "string" &&
    typeof poolData.fee_growth_global_b === "string" &&
    typeof poolData.fee_protocol === "string" &&
    typeof poolData.liquidity === "string" &&
    typeof poolData.max_liquidity_per_tick === "string" &&
    typeof poolData.protocol_fees_a === "string" &&
    typeof poolData.protocol_fees_b === "string" &&
    typeof poolData.sqrt_price === "string" &&
    typeof poolData.tick_current_index === "number" &&
    typeof poolData.tick_spacing === "string" &&
    typeof poolData.unlocked === "boolean" &&
    typeof poolData.pool_id === "string" &&
    typeof poolData.type === "string" &&
    typeof poolData.coin_symbol_a === "string" &&
    typeof poolData.coin_symbol_b === "string" &&
    typeof poolData.coin_type_a === "string" &&
    typeof poolData.coin_type_b === "string" &&
    typeof poolData.fee_type === "string" &&
    typeof poolData.add_2_percent_depth === "string" &&
    typeof poolData.reduce_2_percent_depth === "string" &&
    Array.isArray(poolData.reward_infos) &&
    poolData.reward_infos.every(isRewardInfoValid) &&
    typeof poolData.reward_last_updated_time_ms === "string" &&
    (typeof poolData.category === "string" || poolData.category === null) &&
    typeof poolData.apr === "number" &&
    typeof poolData.apr_percent === "number" &&
    typeof poolData.fee_apr === "number" &&
    typeof poolData.reward_apr === "number" &&
    typeof poolData.volume_24h_usd === "number" &&
    typeof poolData.liquidity_usd === "number" &&
    typeof poolData.coin_a_liquidity_usd === "number" &&
    typeof poolData.coin_b_liquidity_usd === "number" &&
    typeof poolData.fee_24h_usd === "number" &&
    typeof poolData.flag === "number" &&
    typeof poolData.created_at === "string" &&
    typeof poolData.updated_at === "string"
  );
}

export function isRewardInfoValid(rewardInfo: { type: string; fields: Record<string, unknown> }): boolean {
  return (
    typeof rewardInfo.type === "string" && typeof rewardInfo.fields === "object" && !Array.isArray(rewardInfo.fields)
  );
}

export function isCategoryValid(category: { id: number; name: string; badge_url: string }): boolean {
  return typeof category.id === "number" && typeof category.name === "string" && typeof category.badge_url === "string";
}

export function isCoinDataValid(coinData: CoinData): boolean {
  const isValid =
    typeof coinData.id === "number" &&
    typeof coinData.name === "string" &&
    typeof coinData.type === "string" &&
    typeof coinData.symbol === "string" &&
    typeof coinData.decimals === "number" &&
    typeof coinData.logo_url === "string" &&
    typeof coinData.coingecko_id === "string" &&
    (typeof coinData.pyth_id === "string" || coinData.pyth_id === null) &&
    typeof coinData.in_quote_list === "boolean" &&
    typeof coinData.is_stable === "boolean" &&
    typeof coinData.is_popular === "boolean" &&
    typeof coinData.in_pool === "boolean" &&
    typeof coinData.faucet_amount === "string" &&
    typeof coinData.flag === "number" &&
    (typeof coinData.cross_chain === "string" || coinData.cross_chain === null);

  if (!isValid) {
    console.debug("[Turbos] Coin data shape is not valid: ", JSON.stringify(coinData, null, 2));
  }

  return isValid;
}

export function getPathsMap(pools: ShortPoolData[]): PathsCache {
  return pools.reduce((map: PathsCache, pool: ShortPoolData) => {
    const coinTypeA: string = pool.coinTypeA;
    const coinTypeB: string = pool.coinTypeB;

    const commonPoolData: CommonPoolData = {
      base: coinTypeA,
      quote: coinTypeB,
    };
    const poolKey = `${coinTypeA}-${coinTypeB}`;

    map.set(poolKey, commonPoolData);
    return map;
  }, new Map());
}

export const getCoinsMap = (coins: CoinData[]): CoinsCache => {
  return coins.reduce((map: Map<string, CommonCoinData>, coin: CoinData) => {
    map.set(coin.type, { symbol: coin.symbol, type: coin.type, decimals: coin.decimals });
    return map;
  }, new Map());
};

export const getPoolByCoins = (
  tokenFrom: string,
  tokenTo: string,
  pools: ShortPoolData[],
): ShortPoolData | undefined => {
  const tokenFromIsSui: boolean = tokenFrom === SHORT_SUI_COIN_TYPE || tokenFrom === LONG_SUI_COIN_TYPE;
  const tokenToIsSui: boolean = tokenTo === SHORT_SUI_COIN_TYPE || tokenTo === LONG_SUI_COIN_TYPE;

  return pools.find((pool: ShortPoolData) => {
    const coinAInPoolIsSui: boolean = pool.coinTypeA === SHORT_SUI_COIN_TYPE || pool.coinTypeA === LONG_SUI_COIN_TYPE;
    const coinBInPoolIsSui: boolean = pool.coinTypeB === SHORT_SUI_COIN_TYPE || pool.coinTypeB === LONG_SUI_COIN_TYPE;
    const notSuiToken: string = tokenFromIsSui ? tokenTo : tokenFrom;
    const poolHasBothTokens: boolean =
      (pool.coinTypeA === tokenFrom && pool.coinTypeB === tokenTo) ||
      (pool.coinTypeA === tokenTo && pool.coinTypeB === tokenFrom);

    return tokenFromIsSui || tokenToIsSui
      ? (coinAInPoolIsSui && pool.coinTypeB === notSuiToken) || (coinBInPoolIsSui && pool.coinTypeA === notSuiToken)
      : poolHasBothTokens;
  });
};

export function isTurbosCreatePoolEventParsedJson(data: unknown): data is TurbosCreatePoolEventParsedJson {
  return typeof data === "object" && data !== null && "pool" in data && typeof data.pool === "string";
}

export async function getCoinsDataForPool({
  coinManager,
  coinTypeA,
  coinTypeB,
  rawCoinAmountA,
  rawCoinAmountB,
  fee,
}: {
  coinTypeA: string;
  coinTypeB: string;
  rawCoinAmountA: string;
  rawCoinAmountB: string;
  fee: number;
  coinManager: CoinManagerSingleton;
}) {
  const coinDataA = await coinManager.getCoinByType2(coinTypeA);
  const coinDataB = await coinManager.getCoinByType2(coinTypeB);

  let coinSymbolA: string = coinTypeA;
  let coinSymbolB: string = coinTypeB;

  let coinDecimalsA = 0;
  let coinDecimalsB = 0;

  let amountAIsRaw = true;
  let amountBIsRaw = true;

  if (coinDataA !== null) {
    coinSymbolA = coinDataA.symbol ?? coinDataA.type;
    coinDecimalsA = coinDataA.decimals;
    amountAIsRaw = false;
  }

  if (coinDataB !== null) {
    coinSymbolB = coinDataB.symbol ?? coinDataB.type;
    coinDecimalsB = coinDataB.decimals;
    amountBIsRaw = false;
  }

  const amountA = new BigNumber(rawCoinAmountA).dividedBy(10 ** coinDecimalsA).toString();
  const amountB = new BigNumber(rawCoinAmountB).dividedBy(10 ** coinDecimalsB).toString();

  const poolName = `${coinSymbolA}-${coinSymbolB}`;
  const feePercentage = new BigNumber(fee).div(TurbosSingleton.FEE_DIVIDER).toString();

  return {
    poolName,
    amountA,
    amountB,
    coinSymbolA,
    coinSymbolB,
    amountAIsRaw,
    amountBIsRaw,
    feePercentage,
  };
}

export function getResponseShapeDebugInfo(responseJson: unknown): string {
  return typeof responseJson === "object" &&
    responseJson !== null &&
    "data" in responseJson &&
    Array.isArray(responseJson.data)
    ? JSON.stringify(responseJson.data[0], null, 2)
    : "Invalid response format";
}
