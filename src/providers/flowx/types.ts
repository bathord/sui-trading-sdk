import { Coin, GetRoutesResult } from "@flowx-finance/sdk";
import { calculateAmountOut, getPoolInfos, getPools } from "@flowx-pkg/ts-sdk";
import { ProviderOptions } from "../types";

export type ExtractedIPoolsListType = Awaited<ReturnType<typeof getPools>>["poolInfos"];
export type ExtractedIPoolsType = ExtractedIPoolsListType[0];
export type ExtractedReserveType = ExtractedIPoolsType["reserveX"];
export type ExtractedPairSettingsListType = Awaited<ReturnType<typeof getPools>>["pairs"];
export type ExtractedPairSettingsType = ExtractedPairSettingsListType[0];
export type ExtractedPairStatsType = ExtractedPairSettingsType["stats"];
export type ExtractedSwapCalculatedOutputDataType = Awaited<ReturnType<typeof calculateAmountOut>>;
export type ExtractedAmountType = ExtendedSwapCalculatedOutputDataType["amountIn"];
export type ExtractedSmartRouteType = ExtendedSwapCalculatedOutputDataType["smartRoute"];
export type ExtendedSwapCalculatedOutputDataType = ExtractedSwapCalculatedOutputDataType & {
  tokenFrom: CoinNode;
  tokenTo: CoinNode;
};
export type ExtractedIPoolsInfoType = Awaited<ReturnType<typeof getPoolInfos>>[0];

export type PathLink = { base: string; quote: string };
export type CoinNode = { address: string; type: string; decimals: number; symbol?: string };
export type PathMap = Map<string, PathLink>;
export type CoinMap = Map<string, CoinNode>;

export type FlowxOptions = ProviderOptions & { suiProviderUrl: string };
export type ShortCoinMetadata = Pick<Coin, "coinType" | "decimals">;

export interface FlowXRouteData {
  outputAmount: bigint;
  route: GetRoutesResult<Coin, Coin>;
}
