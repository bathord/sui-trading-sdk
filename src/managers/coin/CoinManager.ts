import { CoinMetadata, SuiClient } from "@mysten/sui.js/client";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import { isValidSuiAddress, normalizeSuiAddress } from "@mysten/sui.js/utils";
import {
  InvalidCoinDecimalsError,
  InvalidCoinDescriptionError,
  InvalidCoinImageError,
  InvalidCoinNameError,
  InvalidCoinSymbolError,
  InvalidCoinTotalSupplyError,
  InvalidSignerAddressError,
  NameEqualsToDescriptionError,
  SymbolEqualsToDescriptionError,
} from "../../errors/create-coin/invalid-param-errors";
import { LONG_SUI_COIN_TYPE, SHORT_SUI_COIN_TYPE } from "../../providers/common";
import { CommonCoinData, CreateCoinTransactionParams, ICoinManager, Providers, UpdatedCoinsCache } from "../types";
import initMoveByteCodeTemplate from "./create-coin/utils/move-bytecode-template";
import { getBytecode } from "./create-coin/utils/template";
import {
  validateCoinDecimals,
  validateCoinDescription,
  validateCoinImage,
  validateCoinName,
  validateCoinSymbol,
  validateTotalSupply,
} from "./create-coin/utils/validation";

/**
 * @class CoinManagerSingleton
 * @implements {ICoinManager}
 * @description Singleton class for managing coins.
 */
export class CoinManagerSingleton implements ICoinManager {
  private static _instance: CoinManagerSingleton | undefined;
  private allCoinsCache: Map<string, CommonCoinData> = new Map();
  private coinsByProviderNameCache: Map<string, Map<string, CommonCoinData>> = new Map();
  private provider: SuiClient;
  private static COIN_CREATION_BYTECODE_TEMPLATE_URL = "https://www.suicoins.com/move_bytecode_template_bg.wasm";

  /**
   * Constructs a new instance of the SuiProvider class with the provided SUI provider URL.
   *
   * @private
   * @constructor
   * @param {string} suiProviderUrl - The URL of the SUI provider.
   */
  private constructor(suiProviderUrl: string) {
    this.provider = new SuiClient({ url: suiProviderUrl });
  }

  /**
   * @public
   * @method getInstance
   * @description Gets the singleton instance of CoinManagerSingleton.
   * @param {Providers} [providers] - The list of providers.
   * @param {string} [suiProviderUrl] - Url of SUI provider.
   * @return {CoinManagerSingleton} The singleton instance of CoinManagerSingleton.
   */
  public static getInstance(providers?: Providers, suiProviderUrl?: string): CoinManagerSingleton {
    if (!CoinManagerSingleton._instance) {
      if (providers === undefined) {
        throw new Error("[Coin] Providers are required in arguments to create CoinManager instance.");
      }
      if (suiProviderUrl === undefined) {
        throw new Error("[Coin] SUI provider url is required in arguments to create CoinManager instance.");
      }

      const instance = new CoinManagerSingleton(suiProviderUrl);
      instance.init(providers);
      CoinManagerSingleton._instance = instance;
    }

    return CoinManagerSingleton._instance;
  }

  /**
   * @private
   * @method init
   * @description Initializes the CoinManagerSingleton instance.
   * @param {Providers} providers - The list of providers.
   * @return {void}
   */
  private init(providers: Providers) {
    providers.forEach((provider) => {
      provider.on("cachesUpdate", this.handleCacheUpdate.bind(this));
      provider.flushBuffer();
    });
  }

  /**
   * @private
   * @method handleCacheUpdate
   * @description Handles cache updates.
   * @param {UpdatedCoinsCache} updateData - The update data.
   * @return {void}
   */
  private handleCacheUpdate(updateData: UpdatedCoinsCache): void {
    console.log("[COIN MANAGER] Update data received:", updateData.provider);
    const { provider, data: coins } = updateData;

    const coinsByProviderMap: Map<string, CommonCoinData> = new Map();

    coins.forEach((coin: CommonCoinData) => {
      const coinType = coin.type;

      // set coins to allCoinsMap
      const coinInAllCoinsMap = this.allCoinsCache.get(coinType);
      if (coinInAllCoinsMap) {
        // TODO: Refactor this logic
        if (coinType === LONG_SUI_COIN_TYPE) {
          this.allCoinsCache.set(SHORT_SUI_COIN_TYPE, coin);
        } else if (coinType === SHORT_SUI_COIN_TYPE) {
          this.allCoinsCache.set(LONG_SUI_COIN_TYPE, coin);
        }

        const symbolExists = !!coinInAllCoinsMap.symbol;

        if (!symbolExists) {
          this.allCoinsCache.set(coinType, coin);
        }
      } else {
        // TODO: Refactor this logic
        if (coinType === LONG_SUI_COIN_TYPE) {
          this.allCoinsCache.set(SHORT_SUI_COIN_TYPE, coin);
        } else if (coinType === SHORT_SUI_COIN_TYPE) {
          this.allCoinsCache.set(LONG_SUI_COIN_TYPE, coin);
        }

        this.allCoinsCache.set(coinType, coin);
      }

      // set coins to coinsByProviderMap
      const coinInCoinsByProviderMap = coinsByProviderMap.get(coinType);
      if (!coinInCoinsByProviderMap) {
        coinsByProviderMap.set(coinType, coin);
      }
    });

    this.coinsByProviderNameCache.set(provider, coinsByProviderMap);
  }

  /**
   * @public
   * @method getCoinByType
   * @deprecated
   * @description Gets coin data by coin type.
   * @param {string} coinType - The coin type.
   * @return {CommonCoinData} The coin data.
   * @throws {Error} Throws an error if the coin is not found.
   */
  public getCoinByType(coinType: string): CommonCoinData {
    const coinData = this.allCoinsCache.get(coinType);

    if (coinData === undefined) {
      throw new Error(`[CoinManager] Cannot find coin by type "${coinType}".`);
    }

    return coinData;
  }

  /**
   * @public
   * @method getCoinByType2
   * @description Retrieves coin data by its type from the cache or asynchronously.
   * @param {string} coinType - The type of the coin to retrieve.
   * @return {Promise<CommonCoinData | null>} The coin data if found or fetched, otherwise null.
   */
  public async getCoinByType2(coinType: string): Promise<CommonCoinData | null> {
    const coinData = this.allCoinsCache.get(coinType);

    if (coinData === undefined) {
      // TODO: Add storing into cache the `coinData` afterwards, in case we are fetched it
      console.warn(`[getCoinByType2] No decimals for coin ${coinType}, so fetching...`);
      const fetchedCoinMetadata: CoinMetadata | null = await this.fetchCoinMetadata(coinType);

      return fetchedCoinMetadata === null
        ? null
        : { decimals: fetchedCoinMetadata.decimals, type: coinType, symbol: fetchedCoinMetadata.symbol };
    }

    return coinData;
  }

  /**
   * @public
   * @method getCoinsByProviderMap
   * @description Gets coins by provider map.
   * @return {Map<string, Map<string, CommonCoinData>>} Coins by provider map.
   */
  public getCoinsByProviderMap() {
    return this.coinsByProviderNameCache;
  }

  /**
   * @public
   * @method getAllCoins
   * @description Gets all coins.
   * @return {Map<string, CommonCoinData>} All coins.
   */
  public getAllCoins() {
    return this.allCoinsCache;
  }

  /**
   * Fetches metadata for a specific coin asynchronously.
   *
   * @public
   * @param {string} coinType - The type of the coin for which to fetch metadata.
   * @return {Promise<CoinMetadata | null>} A promise that resolves to the metadata of the specified coin,
   * or null if no metadata is available.
   */
  public async fetchCoinMetadata(coinType: string): Promise<CoinMetadata | null> {
    try {
      const coinMetadata = await this.provider.getCoinMetadata({ coinType });

      return coinMetadata;
    } catch (e) {
      console.warn(
        `[CoinManager.fetchCoinMetadata] error occured while fetching metadata for ${coinType} from RPC: `,
        e,
      );

      return null;
    }
  }

  /**
   * Gets a transaction for creating a coin on SUI blockchain.
   *
   * @param {CreateCoinTransactionParams} params - Parameters for creating the coin.
   * @param {string} params.name - The name of the coin.
   * @param {string} params.symbol - The symbol of the coin.
   * @param {string} params.decimals - The number of decimals for the coin.
   * @param {boolean} params.fixedSupply - Indicates if the coin has a fixed supply.
   * @param {string} params.mintAmount - The initial mint amount for the coin.
   * @param {string} params.url - The URL associated with the coin.
   * @param {string} params.description - The description of the coin.
   * @param {string} params.signerAddress - The address of the signer.
   * @param {TransactionBlock} [params.transaction] - The optional transaction block.
   * @return {Promise<TransactionBlock>} - A promise resolving to the created transaction block.
   * @throws {Error} If the request to create the coin or params validation fails.
   */
  public static async getCreateCoinTransaction(params: CreateCoinTransactionParams): Promise<TransactionBlock> {
    try {
      CoinManagerSingleton.validateCreateCoinParams(params);

      const { name, symbol, decimals, fixedSupply, mintAmount, url, description, signerAddress, transaction } = params;
      const tx = transaction ?? new TransactionBlock();

      await initMoveByteCodeTemplate(CoinManagerSingleton.COIN_CREATION_BYTECODE_TEMPLATE_URL);

      const [upgradeCap] = tx.publish({
        modules: [
          [
            ...getBytecode({
              name,
              symbol,
              totalSupply: mintAmount,
              description,
              fixedSupply,
              decimals: +decimals,
              imageUrl: url,
              recipient: signerAddress,
            }),
          ],
        ],
        dependencies: [normalizeSuiAddress("0x1"), normalizeSuiAddress("0x2")],
      });

      tx.transferObjects([upgradeCap], tx.pure(signerAddress));

      return tx;
    } catch (error) {
      console.error("[CoinManager.getCreateCoinTransaction] error: ", error);
      throw error;
    }
  }

  /**
   * Validates parameters for creating the coin.
   *
   * @param {CreateCoinTransactionParams} params - Parameters for creating the coin.
   * @throws {Error} If the validation fails.
   */
  public static validateCreateCoinParams({
    name,
    symbol,
    decimals,
    mintAmount,
    url,
    description,
    signerAddress,
  }: CreateCoinTransactionParams): void {
    if (!validateCoinName(name)) {
      throw new InvalidCoinNameError(`[validateCreateCoinParams] Coin name ${name} is invalid`);
    }

    if (!validateCoinSymbol(symbol)) {
      throw new InvalidCoinSymbolError(`[validateCreateCoinParams] Coin symbol ${symbol} is invalid`);
    }

    if (!validateCoinDecimals(decimals)) {
      throw new InvalidCoinDecimalsError(`[validateCreateCoinParams] Coin decimals ${decimals} are invalid`);
    }

    if (!validateTotalSupply(mintAmount, decimals)) {
      throw new InvalidCoinTotalSupplyError(`[validateCreateCoinParams] Total supply ${mintAmount} is invalid`);
    }

    if (!validateCoinDescription(description)) {
      throw new InvalidCoinDescriptionError(`[validateCreateCoinParams] Coin description ${description} is invalid`);
    }

    if (!validateCoinImage(url)) {
      throw new InvalidCoinImageError(`[validateCreateCoinParams] Coin image ${url} is invalid`);
    }

    if (!isValidSuiAddress(signerAddress)) {
      throw new InvalidSignerAddressError(`[validateCreateCoinParams] Signer address ${signerAddress} is invalid`);
    }

    if (name.trim() === description.trim()) {
      throw new NameEqualsToDescriptionError(
        `[validateCreateCoinParams] Coin name ${name} and coin description ${description} are equal`,
      );
    }

    if (symbol.trim() === description.trim()) {
      throw new SymbolEqualsToDescriptionError(
        `[validateCreateCoinParams] Coin symbol ${symbol} and coin description ${description} are equal`,
      );
    }
  }

  /**
   * Removes the current instance of CoinManagerSingleton.
   *
   * Disclaimer: While this method in this class is marked as public, it is strongly discouraged
   * to use it directly unless you are certain about the behavior.
   */
  public static removeInstance() {
    CoinManagerSingleton._instance = undefined;
  }
}
