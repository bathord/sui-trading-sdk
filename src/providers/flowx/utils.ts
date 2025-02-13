/* eslint-disable require-jsdoc */

import { Coin } from "@flowx-finance/sdk";
import { CoinsCache, CommonPoolData } from "../types";
import { ExtractedPairSettingsType } from "./types";

export function getCoinsMap({ coinList }: { coinList: Coin[] }) {
  const coinMap: CoinsCache = coinList.reduce((acc, el) => {
    if (el.coinType === undefined || el.decimals === undefined) {
      console.debug("flowx [getPoolsMap] no decimals or type for coin: ", el);
    }

    acc.set(el.coinType, { type: el.coinType, decimals: el.decimals, symbol: el.name });

    return acc;
  }, new Map());

  const coins = {
    coins: Array.from(coinMap.values()),
  };

  return { coins, coinMap };
}

export function getPathsMap(pairs: ExtractedPairSettingsType[]): Map<string, CommonPoolData> {
  return pairs.reduce((map: Map<string, CommonPoolData>, pair: ExtractedPairSettingsType) => {
    const base: string = pair.coinXType;
    const quote: string = pair.coinYType;

    const commonPoolData: CommonPoolData = {
      base,
      quote,
    };
    const poolKey = `${base}-${quote}`;

    map.set(poolKey, commonPoolData);
    return map;
  }, new Map());
}

export function isCoinListValid(coinList: Coin[]): boolean {
  return Array.isArray(coinList) && coinList.every(isCoinMetadataValid);
}

export function isCoinMetadataValid(coinMetadata: Coin): boolean {
  return (
    typeof coinMetadata.decimals === "number" &&
    typeof coinMetadata.coinType === "string" &&
    (typeof coinMetadata.symbol === "string" || coinMetadata.symbol === undefined)
  );
}

export function isPairSettingValid(pairSetting: ExtractedPairSettingsType): boolean {
  return typeof pairSetting.coinXType === "string" && typeof pairSetting.coinYType === "string";
}

export function isPairListValid(pairList: ExtractedPairSettingsType[]): boolean {
  return Array.isArray(pairList) && pairList.every(isPairSettingValid);
}
