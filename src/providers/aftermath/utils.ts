/* eslint-disable require-jsdoc */

import { CoinMetadata } from "@mysten/sui.js/client";
import { CoinMetadaWithInfo, Pool, PoolCoin, PoolCoins, PoolObject, PoolStats, SuiNetwork } from "aftermath-ts-sdk";
import BigNumber from "bignumber.js";
import { CoinManagerSingleton } from "../../managers/coin/CoinManager";
import { CommonPoolData } from "../types";
import { OwnedPoolCoinInfo, OwnedPoolInfo } from "./types";

export const getPathMapAndCoinTypesSet = (
  pools: Pool[],
): {
  pathMap: Map<string, CommonPoolData>;
  coinTypesSet: Set<string>;
} => {
  const pathMap: Map<string, CommonPoolData> = new Map();
  const coinTypesSet: Set<string> = new Set();

  pools.forEach((pool: Pool) => {
    const coinTypes: string[] = Object.keys(pool.pool.coins);
    const base: string = coinTypes[0];
    const quote: string = coinTypes[1];

    // Fill pathMap
    const commonPoolData: CommonPoolData = {
      base,
      quote,
    };
    const poolKey = `${base}-${quote}`;
    pathMap.set(poolKey, commonPoolData);

    // Fill coinTypeSet
    coinTypesSet.add(base);
    coinTypesSet.add(quote);
  });

  return { pathMap, coinTypesSet };
};

export async function getOwnedPoolInfosFromPools(
  pools: Pool[],
  coinManager: CoinManagerSingleton,
): Promise<OwnedPoolInfo[]> {
  return await Promise.all(
    pools.map(async (pool) => {
      const coinTypes: string[] = Object.keys(pool.pool.coins);
      const coins: OwnedPoolCoinInfo[] = await Promise.all(
        coinTypes.map(async (type) => {
          const coinInfo = pool.pool.coins[type];
          const coinInfoFromStorage = await coinManager.getCoinByType2(type);
          const decimals = coinInfo.decimals ?? coinInfoFromStorage?.decimals ?? 0;
          const balance = new BigNumber(coinInfo.balance.toString()).dividedBy(10 ** decimals).toString();

          return {
            type,
            balance,
            symbol: coinInfoFromStorage?.symbol,
          };
        }),
      );

      return {
        name: pool.pool.name,
        apr: pool.stats?.apr.toString() ?? "0",
        fees: pool.stats?.fees.toString() ?? "0",
        tvl: pool.stats?.tvl.toString() ?? "0",
        volume: pool.stats?.volume.toString() ?? "0",
        poolObjectId: pool.pool.objectId,
        coins,
      };
    }),
  );
}

export function isApiResponseValid(pools: Pool[]): pools is Pool[] {
  return pools !== undefined && Array.isArray(pools) && pools.length > 0 && pools.every(isPoolValid);
}

export function isPoolObjectValid(poolObject: PoolObject): boolean {
  return (
    typeof poolObject.name === "string" &&
    typeof poolObject.creator === "string" &&
    typeof poolObject.lpCoinType === "string" &&
    typeof poolObject.lpCoinSupply === "bigint" &&
    typeof poolObject.illiquidLpCoinSupply === "bigint" &&
    typeof poolObject.flatness === "bigint" &&
    isPoolCoinsValid(poolObject.coins) &&
    typeof poolObject.lpCoinDecimals === "number"
  );
}

export function isPoolCoinsValid(poolCoins: PoolCoins): boolean {
  const isCoinsValid = Object.values(poolCoins).every(isPoolCoinValid);

  if (!isCoinsValid) {
    console.debug("[Aftermath] [isPoolCoinsValid] invalid poolCoins: ", JSON.stringify(poolCoins, null, 2));
  }

  return isCoinsValid;
}

export function isPoolCoinValid(poolCoin: PoolCoin): boolean {
  return (
    typeof poolCoin.weight === "bigint" &&
    typeof poolCoin.balance === "bigint" &&
    typeof poolCoin.tradeFeeIn === "bigint" &&
    typeof poolCoin.tradeFeeOut === "bigint" &&
    typeof poolCoin.depositFee === "bigint" &&
    typeof poolCoin.withdrawFee === "bigint" &&
    typeof poolCoin.decimalsScalar === "bigint" &&
    typeof poolCoin.normalizedBalance === "bigint" &&
    (typeof poolCoin.decimals === "number" || poolCoin.decimals === undefined || poolCoin.decimals === null)
  );
}

export function isPoolValid(pool: Pool): boolean {
  return isPoolObjectValid(pool.pool) && (pool.stats === undefined || isPoolStatsValid(pool.stats));
}

export function isSuiNetworkValid(suiNetwork: SuiNetwork): boolean {
  return ["DEVNET", "TESTNET", "LOCAL", "MAINNET"].includes(suiNetwork);
}

export function isPoolStatsValid(poolStats: PoolStats): boolean {
  return (
    typeof poolStats.volume === "number" &&
    typeof poolStats.tvl === "number" &&
    Array.isArray(poolStats.supplyPerLps) &&
    poolStats.supplyPerLps.every((supply) => typeof supply === "number") &&
    typeof poolStats.lpPrice === "number" &&
    typeof poolStats.fees === "number" &&
    typeof poolStats.apr === "number"
  );
}

export function isCoinMetadaWithInfoApiResponseValid(metadata: CoinMetadaWithInfo): metadata is CoinMetadaWithInfo {
  return metadata !== undefined && isCoinMetadaWithInfoValid(metadata);
}

export function isCoinMetadataValid(coinMetadata: CoinMetadata): boolean {
  return (
    typeof coinMetadata.decimals === "number" &&
    typeof coinMetadata.description === "string" &&
    (typeof coinMetadata.iconUrl === "string" || coinMetadata.iconUrl === null) &&
    (typeof coinMetadata.id === "string" || coinMetadata.id === null) &&
    typeof coinMetadata.name === "string" &&
    typeof coinMetadata.symbol === "string"
  );
}

export function isCoinMetadaWithInfoValid(coinMetadaWithInfo: CoinMetadaWithInfo): boolean {
  return (
    isCoinMetadataValid(coinMetadaWithInfo) &&
    (typeof coinMetadaWithInfo.isGenerated === "boolean" || coinMetadaWithInfo.isGenerated === undefined)
  );
}
