import { CLAMM, InterestPool, MoveObjectArgument, SwapRouteArgs } from "@interest-protocol/clamm-sdk";
import { SuiClient } from "@mysten/sui.js-0.51.2/client";
import { TransactionBlock as UpdatedTransactionBlock } from "@mysten/sui.js-0.51.2/transactions";
import { CoinMetadata } from "@mysten/sui.js/client";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import BigNumber from "bignumber.js";
import { EventEmitter } from "../../emitters/EventEmitter";
import { WalletManagerSingleton } from "../../managers/WalletManager";
import { CommonCoinData, UpdatedCoinsCache } from "../../managers/types";
import { InMemoryStorageSingleton } from "../../storages/InMemoryStorage";
import { Storage } from "../../storages/types";
import { getCoinsAndPathsCaches } from "../../storages/utils/getCoinsAndPathsCaches";
import { storeCaches } from "../../storages/utils/storeCaches";
import { LONG_SUI_COIN_TYPE, exitHandlerWrapper } from "../common";
import { CacheOptions, CoinsCache, CommonPoolData, IPoolProviderWithSmartRouting, PathsCache } from "../types";
import { getUserCoinObjects } from "../utils/getUserCoinObjects";
import { isSuiCoinType } from "../utils/isSuiCoinType";
import { isApiResponseValid } from "./type-guards";
import { InterestOptions, InterestRouteData } from "./types";
import { getAmountWithSlippage, getBestInterestRoute, getPathMapAndCoinTypesSet } from "./utils";

/**
 * @class InterestProtocolSingleton
 * @extends EventEmitter
 * @implements {IPoolProviderWithSmartRouting<InterestProtocolSingleton>}
 * @description Singleton class for Interest Protocol.
 *
 * Note: If using `lazyLoading: true` with any storage configuration in a serverless/cloud functions environment,
 * be aware that each invocation of your cloud function will start cache population from scratch.
 * This may lead to unexpected behavior when using different SDK methods. To avoid this and minimize the time
 * for cache population, consider using `lazyLoading: false` along with passing a persistent
 * storage adapter (external, e.g., Redis or any kind of DB) to the ProviderSingleton.
 */
export class InterestProtocolSingleton
  extends EventEmitter
  implements IPoolProviderWithSmartRouting<InterestProtocolSingleton>
{
  private static _instance: InterestProtocolSingleton | undefined;
  public static INTEREST_PROTOCOL_PACKAGE_ADDRESS =
    "0x429dbf2fc849c0b4146db09af38c104ae7a3ed746baf835fa57fee27fa5ff382";
  public static INTEREST_PROTOCOL_SUI_TEARS = "0xf7334947a5037552a94cee15fc471dbda71bf24d46c97ee24e1fdac38e26644c";

  private provider: SuiClient;
  private cacheOptions: CacheOptions;
  private intervalId: NodeJS.Timeout | undefined;
  private storage: Storage;

  public interestSdk: CLAMM;
  public providerName = "Interest";
  public isSmartRoutingAvailable = true as const;
  public pathsCache: PathsCache = new Map();
  public coinsCache: CoinsCache = new Map();
  public poolsCache: InterestPool[] = [];

  /**
   * @constructor
   * @param {Omit<InterestOptions, "lazyLoading">} options - Options for InterestProtocolSingleton.
   */
  private constructor(options: Omit<InterestOptions, "lazyLoading">) {
    super();

    this.provider = new SuiClient({ url: options.suiProviderUrl });

    this.interestSdk = new CLAMM({
      suiClient: this.provider,
      packageAddress: InterestProtocolSingleton.INTEREST_PROTOCOL_PACKAGE_ADDRESS,
      network: "mainnet",
      suiTearsAddress: InterestProtocolSingleton.INTEREST_PROTOCOL_SUI_TEARS,
    });

    const { updateIntervally = true, ...restCacheOptions } = options.cacheOptions;
    this.cacheOptions = { updateIntervally, ...restCacheOptions };
    this.storage = options.cacheOptions.storage ?? InMemoryStorageSingleton.getInstance();
  }

  /**
   * @static
   * @method getInstance
   * @async
   * @param {InterestOptions} [options] - Options for InterestProtocolSingleton instance.
   * @return {Promise<InterestProtocolSingleton>}
   * @throws Error if options are not provided.
   */
  public static async getInstance(options?: InterestOptions): Promise<InterestProtocolSingleton> {
    if (!InterestProtocolSingleton._instance) {
      if (options === undefined) {
        throw new Error("[InterestProtocolSingleton] Options are required in arguments to create instance.");
      }
      const { suiProviderUrl, cacheOptions, lazyLoading = true } = options;

      const instance = new InterestProtocolSingleton({ suiProviderUrl, cacheOptions });
      lazyLoading ? instance.init() : await instance.init();

      InterestProtocolSingleton._instance = instance;
    }

    return InterestProtocolSingleton._instance;
  }

  /**
   * @private
   * @method init
   * @description Initializes the InterestProtocolSingleton instance.
   * @return {Promise<void>}
   */
  private async init() {
    console.debug(`[${this.providerName}] Singleton initiating.`);
    await this.fillCacheFromStorage();
    await this.updateCaches();
    this.cacheOptions.updateIntervally && this.updateCachesIntervally();

    this.bufferEvent("cachesUpdate", this.getCoins());
  }

  /**
   * Fills the cache from storage asynchronously.
   *
   * @private
   * @return {Promise<void>} A promise that resolves when the cache is filled from storage.
   */
  private async fillCacheFromStorage(): Promise<void> {
    try {
      const { coinsCache, pathsCache } = await getCoinsAndPathsCaches({
        storage: this.storage,
        provider: this.providerName,
        updateCacheInterval: this.cacheOptions.updateIntervalInMs,
      });

      this.coinsCache = coinsCache;
      this.pathsCache = pathsCache;
    } catch (error) {
      console.error(`[${this.providerName}] fillCacheFromStorage failed:`, error);
    }
  }

  /**
   * Checks if the storage cache is empty.
   *
   * @private
   * @return {boolean} True if the storage cache is empty, false otherwise.
   */
  private isStorageCacheEmpty() {
    const isCacheEmpty = this.coinsCache.size === 0 || this.pathsCache.size === 0;

    return isCacheEmpty;
  }

  /**
   * @private
   * @method updateCaches
   * @description Updates caches.
   * @return {Promise<void>}
   */
  private async updateCaches({ force }: { force: boolean } = { force: false }): Promise<void> {
    const isCacheEmpty = this.isStorageCacheEmpty();

    if (isCacheEmpty || force) {
      try {
        await this.updatePoolsCache();
        await this.updatePathsAndCoinsCache();
        this.emit("cachesUpdate", this.getCoins());

        await storeCaches({
          provider: this.providerName,
          storage: this.storage,
          coinsCache: this.getCoins(),
          pathsCache: this.getPaths(),
        });

        console.debug("[Interest] Caches are updated and stored.");
      } catch (error) {
        console.error("[Interest] Caches update failed:", error);
      }
    }
  }

  /**
   * @private
   * @method updateCachesIntervally
   * @description Updates caches periodically.
   * @return {void}
   */
  private updateCachesIntervally(): void {
    let isUpdatingCurrently = false;
    this.intervalId = setInterval(async () => {
      try {
        if (isUpdatingCurrently) {
          return;
        }
        isUpdatingCurrently = true;
        await this.updateCaches({ force: true });
      } finally {
        isUpdatingCurrently = false;
      }
    }, this.cacheOptions.updateIntervalInMs);

    exitHandlerWrapper({ intervalId: this.intervalId, providerName: this.providerName });
  }

  /**
   * @private
   * @method updatePoolsCache
   * @description Updates pools cache.
   * @return {Promise<void>}
   */
  private async updatePoolsCache(): Promise<void> {
    try {
      const { pools }: { pools: readonly InterestPool[] } = await this.interestSdk.getPools();
      const isValidPoolsResponse = isApiResponseValid(pools);

      if (!isValidPoolsResponse) {
        console.error("[Interest] Pools response:", pools);
        throw new Error("Pools response from API is not valid");
      }

      this.poolsCache = pools;
    } catch (error) {
      console.error("[Interest.updatePoolsCache]:", error);
    }
  }

  /**
   * @private
   * @method updatePathsAndCoinsCache
   * @description Updates paths and coins cache.
   * @return {Promise<void>}
   */
  private async updatePathsAndCoinsCache(): Promise<void> {
    const { pathMap, coinTypesSet } = getPathMapAndCoinTypesSet(this.poolsCache);
    this.pathsCache = pathMap;

    await Promise.all(
      Array.from(coinTypesSet.values()).map(async (coinType: string) => {
        try {
          const metadata: CoinMetadata | null = await this.provider.getCoinMetadata({ coinType });

          if (metadata !== null) {
            this.coinsCache.set(coinType, { symbol: metadata.symbol, type: coinType, decimals: metadata.decimals });
          }
        } catch (error) {
          console.error(`[Interest] Error while fetching metadata about coin ${coinType}:`, error);
        }
      }),
    );
  }

  /**
   * @public
   * @method getPool
   * @description Gets the pool with the specified coin types.
   * @param {string} coinTypeA - Coin type A.
   * @param {string} coinTypeB - Coin type B.
   * @return {Pool} The pool object.
   */
  public getPool(coinTypeA: string, coinTypeB: string): InterestPool {
    const pool: InterestPool | undefined = this.poolsCache.find(
      (pool: InterestPool) => pool.coinTypes.includes(coinTypeA) && pool.coinTypes.includes(coinTypeB),
    );

    if (!pool) {
      throw new Error(`[Interest] Cannot find pool with coinTypeA "${coinTypeA}" and coinTypeB "${coinTypeB}".`);
    }

    return pool;
  }

  /**
   * @public
   * @method getPools
   * @description Gets all pools.
   * @return {InterestPool[]} Array of pools.
   */
  public getPools(): InterestPool[] {
    return this.poolsCache;
  }

  /**
   * @public
   * @method getCoins
   * @description Gets the updated coins cache.
   * @return {UpdatedCoinsCache} Updated coins cache.
   */
  public getCoins(): UpdatedCoinsCache {
    const allCoins: CommonCoinData[] = Array.from(this.coinsCache.values());
    return { provider: this.providerName, data: allCoins };
  }

  /**
   * @public
   * @method getPaths
   * @description Gets the paths cache.
   * @return {Map<string, CommonPoolData>} Paths cache.
   */
  public getPaths(): Map<string, CommonPoolData> {
    return this.pathsCache;
  }

  /**
   * @public
   * @method getRouteData
   * @description Gets route data.
   * @param {Object} params - Parameters for route data.
   * @param {string} params.coinTypeFrom - Coin type from.
   * @param {string} params.coinTypeTo - Coin type to.
   * @param {string} params.inputAmount - Input amount.
   * @return {Promise<{ outputAmount: bigint, route: InterestRouteData }>} Route data.
   */
  public async getRouteData({
    coinTypeFrom,
    coinTypeTo,
    inputAmount,
    slippagePercentage,
  }: {
    coinTypeFrom: string;
    coinTypeTo: string;
    inputAmount: string;
    slippagePercentage: number;
    publicKey: string;
  }): Promise<{ outputAmount: bigint; route: InterestRouteData }> {
    // Interest Protocol Routing crashes, when using SHORT_SUI_COIN_TYPE
    if (isSuiCoinType(coinTypeFrom)) {
      coinTypeFrom = LONG_SUI_COIN_TYPE;
    } else if (isSuiCoinType(coinTypeTo)) {
      coinTypeTo = LONG_SUI_COIN_TYPE;
    }

    const inputCoinData = await this.provider.getCoinMetadata({ coinType: coinTypeFrom });

    if (inputCoinData === null) {
      throw new Error(`[Interest] Cannot get coin metadata for "${coinTypeFrom}".`);
    }

    const inputCoinDecimals = inputCoinData.decimals;
    const formattedInputAmount = new BigNumber(inputAmount).multipliedBy(10 ** inputCoinDecimals).toString();

    const { routes, poolsMap } = await this.interestSdk.getRoutesQuotes({
      coinIn: coinTypeFrom,
      coinOut: coinTypeTo,
      amount: BigInt(formattedInputAmount),
    });

    const [coinPath, poolObjectIdPath, amountObject] = getBestInterestRoute(routes);
    const bestRoute: SwapRouteArgs["route"] = [coinPath, poolObjectIdPath];
    const amountWithSlippage = getAmountWithSlippage(amountObject.amount.toString(), slippagePercentage);

    return {
      outputAmount: BigInt(amountWithSlippage),
      route: {
        bestRoute,
        poolsMap,
        inputCoinType: coinTypeFrom,
        minAmount: BigInt(amountWithSlippage),
        formattedInputAmount,
      },
    };
  }

  /**
   * @public
   * @method getSwapTransaction
   * @description Retrieves the swap transaction for the given route and public key.
   * @param {InterestRouteData} route - The complete trade route.
   * @param {string} publicKey - The public key.
   * @return {Promise<TransactionBlock>} A Promise that resolves to the swap transaction.
   */
  public async getSwapTransaction({
    route,
    publicKey,
  }: {
    route: InterestRouteData;
    publicKey: string;
    slippagePercentage: number;
  }): Promise<TransactionBlock> {
    const tx = new UpdatedTransactionBlock();
    const { bestRoute, poolsMap, inputCoinType, minAmount, formattedInputAmount } = route;

    const inputCoinObjects = await getUserCoinObjects({ coinType: inputCoinType, provider: this.provider, publicKey });
    let destinationObjectId: MoveObjectArgument;

    // If SUI is an input coin, just split a needed for a swap input amount from gas object.
    if (isSuiCoinType(inputCoinType)) {
      const [coin] = tx.splitCoins(tx.gas, [tx.pure(formattedInputAmount)]);
      destinationObjectId = coin;
    } else {
      // If the input coin is not SUI, merge all its objects into one and split the needed for the swap input amount
      // from the merge-result object.
      const { destinationObjectId: mergeDestination } = WalletManagerSingleton.mergeAllCoinObjects({
        coinObjects: inputCoinObjects,
        txb: tx,
      });

      const [coin] = tx.splitCoins(tx.object(mergeDestination), [tx.pure(formattedInputAmount)]);
      destinationObjectId = coin;
    }

    const { coinOut, txb } = this.interestSdk.swapRoute({
      txb: tx,
      coinIn: destinationObjectId,
      route: bestRoute,
      poolsMap,
      minAmount,
    });

    txb.transferObjects([coinOut], txb.pure(publicKey));

    const txBlock = new TransactionBlock(TransactionBlock.from(txb.serialize()));

    return txBlock;
  }

  /**
   * Gets a transaction block for swapping tokens based on provided swap data.
   *
   * Note: This method is not implemented yet.
   *
   * @public
   * @async
   * @param {SwapRequiredData} route - The required data for the swap.
   * @param {string} publicKey - The public key of the user.
   * @param {number} [slippagePercentage=10] - The slippage percentage.
   * @return {Promise<TransactionBlock>} A Promise that resolves to a TransactionBlock.
   */
  public async getSwapTransactionDoctored({
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    route,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    publicKey,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    slippagePercentage = 10,
  }: {
    route: InterestRouteData;
    publicKey: string;
    slippagePercentage: number;
  }): Promise<TransactionBlock> {
    throw new Error(`[${this.providerName}] getSwapTransactionDoctored method not implemented`);
  }

  /**
   * Removes the current instance of AftermathSingleton.
   *
   * Disclaimer: While this method in this class is marked as public, it is strongly discouraged
   * to use it directly unless you are certain about the behavior.
   */
  public static removeInstance() {
    InterestProtocolSingleton._instance = undefined;
  }

  public buildDcaTxBlockAdapter = () => {
    throw new Error("Not implemented");
  };
}
