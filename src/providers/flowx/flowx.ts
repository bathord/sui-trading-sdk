import { CoinProvider } from "@flowx-finance/sdk";
import { swapExactInput } from "@flowx-pkg/ts-sdk";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import { EventEmitter } from "../../emitters/EventEmitter";
import { swapExactInputDoctored } from "../../managers/dca/adapterUtils/flowxUtils";
import { buildDcaTxBlock } from "../../managers/dca/adapters/flowxAdapter";
import { CommonCoinData, UpdatedCoinsCache } from "../../managers/types";
import { InMemoryStorageSingleton } from "../../storages/InMemoryStorage";
import { Storage } from "../../storages/types";
import { getCoinsCache } from "../../storages/utils/getCoinsCache";
import { getCoinsMetadataCache } from "../../storages/utils/getCoinsMetadataCache";
import { storeCaches } from "../../storages/utils/storeCaches";
import { exitHandlerWrapper } from "../common";
import { CacheOptions, CoinsCache, IPoolProviderWithSmartRouting } from "../types";
import { convertSlippage } from "../utils/convertSlippage";
import { getCoinInfoFromCache } from "../utils/getCoinInfoFromCache";
import { calculateAmountOutInternal } from "./calculateAmountOutInternal";
import { CoinNode, ExtendedSwapCalculatedOutputDataType, FlowxOptions, ShortCoinMetadata } from "./types";
import { getCoinsMap, isCoinListValid } from "./utils";

/**
 * @class FlowxSingleton
 * @extends EventEmitter
 * @implements {IPoolProviderWithSmartRouting<FlowxSingleton>}
 * @description Singleton class for Flowx.
 *
 * Note: If using `lazyLoading: true` with any storage configuration in a serverless/cloud functions environment,
 * be aware that each invocation of your cloud function will start cache population from scratch.
 * This may lead to unexpected behavior when using different SDK methods. To avoid this and minimize the time
 * for cache population, consider using `lazyLoading: false` along with passing a persistent
 * storage adapter (external, e.g., Redis or any kind of DB) to the ProviderSingleton.
 */
export class FlowxSingleton extends EventEmitter implements IPoolProviderWithSmartRouting<FlowxSingleton> {
  private static _instance: FlowxSingleton | undefined;
  public providerName = "Flowx";
  public isSmartRoutingAvailable = true as const;
  public coinsCache: CoinsCache = new Map();
  public coinsMetadataCache: ShortCoinMetadata[] = [];
  public coinProvider = new CoinProvider("mainnet");
  private cacheOptions: CacheOptions;
  private intervalId: NodeJS.Timeout | undefined;
  private storage: Storage;

  /**
   * @constructor
   * @param {Omit<FlowxOptions, "lazyLoading">} options - The options for FlowxSingleton.
   */
  private constructor(options: Omit<FlowxOptions, "lazyLoading">) {
    super();
    const { updateIntervally = true, ...restCacheOptions } = options.cacheOptions;
    this.cacheOptions = { updateIntervally, ...restCacheOptions };
    this.storage = options.cacheOptions.storage ?? InMemoryStorageSingleton.getInstance();
  }

  /**
   * @public
   * @method getInstance
   * @description Gets the singleton instance of FlowxSingleton.
   * @param {FlowxOptions} [options] - Options for FlowxSingleton.
   * @return {Promise<FlowxSingleton>} The singleton instance of FlowxSingleton.
   */
  public static async getInstance(options?: FlowxOptions): Promise<FlowxSingleton> {
    if (!FlowxSingleton._instance) {
      if (options === undefined) {
        throw new Error("[Flowx] Options are required in arguments to create instance.");
      }

      const { cacheOptions, lazyLoading = true } = options;

      const instance = new FlowxSingleton({ cacheOptions });
      lazyLoading ? instance.init() : await instance.init();
      FlowxSingleton._instance = instance;
    }

    return FlowxSingleton._instance;
  }

  /**
   * @private
   * @method init
   * @description Initializes the FlowxSingleton instance.
   * @return {Promise<void>} A Promise that resolves when initialization is complete.
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
      const coinsCache = await getCoinsCache({
        storage: this.storage,
        provider: this.providerName,
        updateCacheInterval: this.cacheOptions.updateIntervalInMs,
      });
      const coinsMetadataCache = await getCoinsMetadataCache({
        storage: this.storage,
        provider: this.providerName,
        updateCacheInterval: this.cacheOptions.updateIntervalInMs,
      });

      this.coinsCache = coinsCache;
      this.coinsMetadataCache = coinsMetadataCache;
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
    const isCacheEmpty = this.coinsCache.size === 0 || this.coinsMetadataCache.length === 0;

    return isCacheEmpty;
  }

  /**
   * @private
   * @method updateCaches
   * @description Updates the caches for paths and coins.
   * @return {Promise<void>} A Promise that resolves when caches are updated.
   */
  private async updateCaches({ force }: { force: boolean } = { force: false }): Promise<void> {
    const isCacheEmpty = this.isStorageCacheEmpty();

    if (isCacheEmpty || force) {
      try {
        await this.updateCoinsCache();
        this.emit("cachesUpdate", this.getCoins());

        await storeCaches({
          provider: this.providerName,
          storage: this.storage,
          coinsCache: this.getCoins(),
          coinsMetadataCache: this.coinsMetadataCache,
        });

        console.debug("[FlowX] Caches are updated and stored.");
      } catch (error) {
        console.error("[Flowx] Caches update failed:", error);
      }
    }
  }

  /**
   * @private
   * @method updateCachesIntervally
   * @description Updates the caches at regular intervals.
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
   * @method updateCoinsCache
   * @description Updates the coins cache.
   * @return {Promise<void>} A Promise that resolves when the coins cache is updated.
   */
  private async updateCoinsCache(): Promise<void> {
    const COINS_PER_PAGE_LIMIT = 50;
    const FETCH_VERIFIED_ONLY = true;
    const allCoins = [];
    let page = 1;
    let hasMorePages = true;

    do {
      try {
        const coins = await this.coinProvider.getCoins({
          limit: COINS_PER_PAGE_LIMIT,
          page,
          isVerified: FETCH_VERIFIED_ONLY,
        });

        // Check if we've reached the end
        if (!coins || coins.length === 0) {
          hasMorePages = false;
          continue;
        }

        // Validate each batch of coins
        const isValidResponse = isCoinListValid(coins);
        if (!isValidResponse) {
          console.error(`[Flowx] Coins response for page ${page}:`, coins);
          throw new Error("Coins response from API is not valid");
        }

        allCoins.push(...coins);

        // If we received fewer coins than the limit, we've reached the end
        if (coins.length < COINS_PER_PAGE_LIMIT) {
          hasMorePages = false;
        } else {
          page++;
        }
      } catch (error) {
        console.error(`[Flowx] Failed to fetch coins for page ${page}:`, error);
        throw error;
      }
    } while (hasMorePages);

    const { coinMap } = getCoinsMap({ coinList: allCoins.map((coin) => ({ ...coin, type: coin.coinType })) });
    this.coinsMetadataCache = allCoins.map(({ coinType, decimals }) => ({ coinType, decimals }));
    this.coinsCache = coinMap;
  }

  /**
   * @public
   * @method getCoins
   * @description Gets the updated coins cache.
   * @return {UpdatedCoinsCache} Updated coins cache.
   */
  public getCoins(): UpdatedCoinsCache {
    const data = Array.from(this.coinsCache.values());

    return { provider: this.providerName, data };
  }

  /**
   * @public
   * @method getRouteData
   * @description Gets route data for a given pair of coins.
   * @param {Object} options - Options for getting route data.
   * @param {string} options.coinTypeFrom - The coin type to swap from.
   * @param {string} options.coinTypeTo - The coin type to swap to.
   * @param {string} options.inputAmount - The input amount for the swap.
   * @param {number} options.slippagePercentage - The slippage percentage.
   * @param {string} options.publicKey - The public key for the swap.
   * @return {Promise<{ outputAmount: bigint, route: ExtendedSwapCalculatedOutputDataType }>} Route data.
   */
  public async getRouteData({
    coinTypeFrom,
    coinTypeTo,
    inputAmount,
  }: {
    coinTypeFrom: string;
    coinTypeTo: string;
    inputAmount: string;
    slippagePercentage: number;
    publicKey: string;
  }): Promise<{ outputAmount: bigint; route: ExtendedSwapCalculatedOutputDataType }> {
    const tokenFromCoinNode: CommonCoinData | undefined = getCoinInfoFromCache(coinTypeFrom, this.coinsCache);
    const tokenToCoinNode: CommonCoinData | undefined = getCoinInfoFromCache(coinTypeTo, this.coinsCache);

    if (!tokenFromCoinNode) {
      throw new Error(`Coin ${coinTypeFrom} does not exist.`);
    }

    if (!tokenToCoinNode) {
      throw new Error(`Coin ${coinTypeTo} does not exist.`);
    }

    const { outputAmount, route } = await this.getSmartOutputAmountData({
      amountIn: inputAmount,
      tokenFrom: { address: tokenFromCoinNode.type, ...tokenFromCoinNode },
      tokenTo: { address: tokenToCoinNode.type, ...tokenToCoinNode },
    });

    return { outputAmount, route };
  }

  /**
   * @private
   * @method getSmartOutputAmountData
   * @description Gets the smart output amount data for a swap.
   * @param {Object} options - Options for getting smart output amount data.
   * @param {string} options.amountIn - The input amount for the swap.
   * @param {CoinNode} options.tokenFrom - The coin node to swap from.
   * @param {CoinNode} options.tokenTo - The coin node to swap to.
   * @return {Promise<{ outputAmount: bigint, route: ExtendedSwapCalculatedOutputDataType }>} Smart output amount data.
   */
  private async getSmartOutputAmountData({
    amountIn,
    tokenFrom,
    tokenTo,
  }: {
    amountIn: string;
    tokenFrom: CoinNode;
    tokenTo: CoinNode;
  }) {
    const swapData = await calculateAmountOutInternal(amountIn, tokenFrom, tokenTo, this.coinsMetadataCache);

    return { outputAmount: BigInt(swapData.amountOut.decimalAmount), route: { ...swapData, tokenFrom, tokenTo } };
  }

  /**
   * @public
   * @method getSwapTransaction
   * @description Gets the swap transaction data.
   * @param {Object} options - Options for getting swap transaction data.
   * @param {ExtendedSwapCalculatedOutputDataType} options.route - The route for the swap.
   * @param {string} options.publicKey - The public key for the swap.
   * @param {number} options.slippagePercentage - The slippage percentage.
   * @return {Promise<TransactionBlock>} Swap transaction data.
   */
  public async getSwapTransaction({
    route,
    publicKey,
    slippagePercentage,
  }: {
    route: ExtendedSwapCalculatedOutputDataType;
    publicKey: string;
    slippagePercentage: number;
  }) {
    const absoluteSlippage = convertSlippage(slippagePercentage);

    const legacyTxBlock = await swapExactInput(
      false, // it should be false for now
      route.amountIn, // amount want to swap
      route.amountOut, // amount want to receive
      route.trades, // trades from calculate amount
      route.tokenFrom, // coin In data
      route.tokenTo, // coin Out data
      publicKey,
      absoluteSlippage, // slippage (0.05%)
    );

    const txBlock = new TransactionBlock(TransactionBlock.from(legacyTxBlock.serialize()));

    return txBlock;
  }

  /**
   * @public
   * @method getSwapTransaction
   * @description Gets the swap transaction data.
   * @param {Object} options - Options for getting swap transaction data.
   * @param {ExtendedSwapCalculatedOutputDataType} options.route - The route for the swap.
   * @param {string} options.publicKey - The public key for the swap.
   * @param {number} options.slippagePercentage - The slippage percentage.
   * @return {Promise<TransactionBlock>} Swap transaction data.
   */
  public async getSwapTransactionDoctored({
    route,
    publicKey,
    slippagePercentage,
  }: {
    route: ExtendedSwapCalculatedOutputDataType;
    publicKey: string;
    slippagePercentage: number;
  }) {
    const absoluteSlippage = convertSlippage(slippagePercentage);

    const legacyTxBlock = await swapExactInputDoctored(
      false, // it should be false for now
      route.amountIn, // amount want to swap
      route.amountOut, // amount want to receive
      route.trades, // trades from calculate amount
      route.tokenFrom, // coin In data
      route.tokenTo, // coin Out data
      publicKey,
      absoluteSlippage, // slippage (0.05%)
    );

    const txBlock = new TransactionBlock(TransactionBlock.from(legacyTxBlock.serialize()));

    return txBlock;
  }

  /**
   * Removes the current instance of FlowxSingleton.
   *
   * Disclaimer: While this method in this class is marked as public, it is strongly discouraged
   * to use it directly unless you are certain about the behavior.
   */
  public static removeInstance() {
    FlowxSingleton._instance = undefined;
  }

  public buildDcaTxBlockAdapter = buildDcaTxBlock;
}
