import { PathLink } from "@cetusprotocol/cetus-sui-clmm-sdk";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import { CommonCoinData, Provider, UpdatedCoinsCache } from "../managers/types";
import { Storage } from "../storages/types";
import { tryCatchWrapper } from "./utils/tryCatchWrapper";

export type CommonPoolData = {
  base: string;
  quote: string;
};

export type CoinsCache = Map<string, CommonCoinData>;
export type PathsCache = Map<string, CommonPoolData>;

export type CacheOptions = {
  storage?: Storage;
  updateIntervalInMs: number;
  updateIntervally?: boolean;
};

export type GetRouteDataInput<T extends Provider> = Parameters<T["getRouteData"]>[0];

export type GetRouteDataOutput<T extends Provider> = ReturnType<T["getRouteData"]>;

export type GetSwapTransactionInput<T extends Provider> = Parameters<T["getSwapTransaction"]>[0];

// TODO: Add comments about using `storage` & use-cases, as well as conflicts with `lazyLoading` option
export interface IBasePoolProvider<T extends Provider> {
  isSmartRoutingAvailable: boolean;
  getCoins(): UpdatedCoinsCache;
  getRouteData(arg: GetRouteDataInput<T>): GetRouteDataOutput<T>;
  getSwapTransaction(arg: GetSwapTransactionInput<T>): Promise<TransactionBlock>;
}

export interface IPoolProviderWithoutSmartRouting<T extends Provider> extends IBasePoolProvider<T> {
  isSmartRoutingAvailable: false;
  getPaths(): Map<string, CommonPoolData | PathLink>;
}

export interface IPoolProviderWithSmartRouting<T extends Provider> extends IBasePoolProvider<T> {
  isSmartRoutingAvailable: true;
  getPaths?(): Map<string, CommonPoolData | PathLink>;
}

export type ProviderOptions = {
  cacheOptions: CacheOptions;
  lazyLoading?: boolean;
};

export type ExitHandlerOptions = {
  cleanup?: boolean;
  intervalId?: NodeJS.Timeout | undefined;
  exit?: boolean;
  providerName?: string;
};

export type TryCatchWrapperResult = Awaited<ReturnType<typeof tryCatchWrapper>>;
