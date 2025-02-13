import { Ed25519Keypair } from "@mysten/sui.js/keypairs/ed25519";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import { cacheOptions, provider, suiProviderUrl, publicKey } from "../constants";
import { isValidTokenAddress } from "../../src";
import { CoinManagerSingleton } from "../../src/managers/coin/CoinManager";
import { WalletManagerSingleton } from "../../src/managers/WalletManager";
import { CoinAssetData, Providers } from "../../src/managers/types";
import { AftermathSingleton } from "../../src/providers/aftermath/aftermath";
import { CetusSingleton } from "../../src/providers/cetus/cetus";
import { clmmMainnet } from "../../src/providers/cetus/config";
import { FlowxSingleton } from "../../src/providers/flowx/flowx";
import { TurbosSingleton } from "../../src/providers/turbos/turbos";
import { getCoinsAssetsFromCoinObjects } from "../../src/managers/utils";

jest.setTimeout(60000);

describe("WalletManager", () => {
  let walletManager: WalletManagerSingleton;
  let coinManager: CoinManagerSingleton;

  beforeAll(async () => {
    const turbos: TurbosSingleton = await TurbosSingleton.getInstance({
      suiProviderUrl,
      cacheOptions,
      lazyLoading: false,
    });
    const cetus: CetusSingleton = await CetusSingleton.getInstance({
      sdkOptions: clmmMainnet,
      cacheOptions,
      suiProviderUrl,
      lazyLoading: false,
    });
    const aftermath: AftermathSingleton = await AftermathSingleton.getInstance({ cacheOptions, lazyLoading: false });
    const flowx: FlowxSingleton = await FlowxSingleton.getInstance({
      cacheOptions,
      suiProviderUrl,
      lazyLoading: false,
    });
    const providers: Providers = [turbos, cetus, aftermath, flowx];
    coinManager = CoinManagerSingleton.getInstance(providers, suiProviderUrl);
    walletManager = WalletManagerSingleton.getInstance(provider, coinManager);
  });

  describe("generateWallet", () => {
    it("should return public & private key of newly generated wallet", () => {
      const { publicKey, privateKey } = WalletManagerSingleton.generateWallet();

      expect(publicKey.length).toBeGreaterThan(0);
      expect(publicKey).toMatch(/^0x[0-9a-fA-F]{64}$/);
      expect(privateKey.length).toBeGreaterThan(0);
    });
  });

  describe("getSuiBalance", () => {
    it("should return sui balance", async () => {
      const mySuiBalance: string = await walletManager.getSuiBalance(publicKey);
      expect(parseFloat(mySuiBalance)).toBeGreaterThanOrEqual(0);
    });
  });

  describe("getAllCoinAssets", () => {
    it("should return all assets", async () => {
      const allAssets: CoinAssetData[] = await walletManager.getAllCoinAssets(publicKey);

      allAssets.forEach((asset: CoinAssetData) => {
        expect(isValidTokenAddress(asset.type)).toStrictEqual(true);
        expect(typeof asset.decimals === "number" || asset.decimals === null).toStrictEqual(true);
        if (typeof asset.decimals === "number") {
          expect(asset.decimals).toBeGreaterThanOrEqual(0);
        }
        expect(parseFloat(asset.balance)).toBeGreaterThanOrEqual(0);
        expect(typeof asset.noDecimals).toStrictEqual("boolean");
      });
    });
  });

  describe("getAvailableSuiBalance", () => {
    it("should return available sui balance", async () => {
      const availableSuiBalance: string = await walletManager.getAvailableSuiBalance(publicKey);
      const mySuiBalance: string = await walletManager.getSuiBalance(publicKey);

      expect(parseFloat(availableSuiBalance)).toBeGreaterThanOrEqual(0);
      expect(parseFloat(availableSuiBalance) < parseFloat(mySuiBalance)).toStrictEqual(true);
    });
  });

  describe("getAvailableWithdrawSuiAmount", () => {
    it("should return available withdraw sui balance", async () => {
      const { availableAmount, totalGasFee } = await walletManager.getAvailableWithdrawSuiAmount(publicKey);
      const mySuiBalance: string = await walletManager.getSuiBalance(publicKey);

      expect(parseFloat(availableAmount)).toBeGreaterThanOrEqual(0);
      expect(parseFloat(totalGasFee)).toBeGreaterThanOrEqual(0);
      expect(parseFloat(availableAmount) < parseFloat(mySuiBalance)).toStrictEqual(true);
    });
  });

  describe("getWithdrawSuiTransaction", () => {
    it("should return withdraw sui transaction", async () => {
      const { availableAmount } = await walletManager.getAvailableWithdrawSuiAmount(publicKey);

      const withdrawalTx = await WalletManagerSingleton.getWithdrawSuiTransaction({
        address: "0x7434c5da3faa3ba417228c27fbfee2cae5b3927e2676389a265fad7cd7686a73",
        amount: availableAmount,
      });

      expect(withdrawalTx).toBeInstanceOf(TransactionBlock);
    });
  });

  describe("getKeyPairFromPrivateKey", () => {
    it("should return keypair", async () => {
      const { privateKey } = WalletManagerSingleton.generateWallet();
      const keypair = WalletManagerSingleton.getKeyPairFromPrivateKey(privateKey);

      expect(keypair).toBeInstanceOf(Ed25519Keypair);
    });
  });

  describe("getCoinsAssetsFromCoinObjects", () => {
    let originalWarn = console.warn;

    beforeEach(() => {
      originalWarn = console.warn;
      console.warn = jest.fn();
    });

    afterEach(() => {
      console.warn = originalWarn;
    });

    it("should return an empty array if no coin objects are provided", async () => {
      const result = await getCoinsAssetsFromCoinObjects([], coinManager);
      expect(result).toEqual([]);
    });

    it("should aggregate coin assets correctly", async () => {
      const coinObjects = [
        {
          balance: "1000000",
          coinObjectId: "1",
          coinType: "0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c::coin::COIN",
          digest: "digest1",
          previousTransaction: "previous1",
          version: "1",
        },
        {
          balance: "2000000",
          coinObjectId: "2",
          coinType: "0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c::coin::COIN",
          digest: "digest2",
          previousTransaction: "previous2",
          version: "2",
        },
        {
          balance: "150",
          coinObjectId: "3",
          coinType: "0x0000000000000000000000000000000000000000000000000000000testtoken::coin:COIN",
          digest: "digest3",
          previousTransaction: "previous3",
          version: "3",
        },
      ];

      const result = await getCoinsAssetsFromCoinObjects(coinObjects, coinManager);
      expect(result).toEqual([
        {
          symbol: "USDT",
          balance: "3000000",
          type: "0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c::coin::COIN",
          decimals: 6,
          noDecimals: false,
        },
        {
          symbol: undefined,
          balance: "150",
          type: "0x0000000000000000000000000000000000000000000000000000000testtoken::coin:COIN",
          decimals: null,
          noDecimals: true,
        },
      ]);

      expect(console.warn).toHaveBeenCalledWith(
        "[getCoinsAssetsFromCoinObjects] no symbol found for coin " +
          "0x0000000000000000000000000000000000000000000000000000000testtoken::coin:COIN",
      );
      expect(console.warn).toHaveBeenCalledWith(
        "[getCoinsAssetsFromCoinObjects] no decimals found for coin " +
          "0x0000000000000000000000000000000000000000000000000000000testtoken::coin:COIN",
      );
    });

    it("should handle missing symbol or decimals", async () => {
      const coinObjects = [
        {
          balance: "100",
          coinObjectId: "1",
          coinType: "0x0000000000000000000000000000000000000000000000000000000testtoken::coin:COIN",
          digest: "digest1",
          previousTransaction: "previous1",
          version: "1",
        },
      ];

      const result = await getCoinsAssetsFromCoinObjects(coinObjects, coinManager);
      expect(result).toEqual([
        {
          symbol: undefined,
          balance: "100",
          type: "0x0000000000000000000000000000000000000000000000000000000testtoken::coin:COIN",
          decimals: null,
          noDecimals: true,
        },
      ]);

      expect(console.warn).toHaveBeenCalledWith(
        "[getCoinsAssetsFromCoinObjects] no symbol found for coin " +
          "0x0000000000000000000000000000000000000000000000000000000testtoken::coin:COIN",
      );
      expect(console.warn).toHaveBeenCalledWith(
        "[getCoinsAssetsFromCoinObjects] no decimals found for coin " +
          "0x0000000000000000000000000000000000000000000000000000000testtoken::coin:COIN",
      );
    });
  });
});
