import { TransactionBlock } from "@mysten/sui.js/transactions";
import { cacheOptions, suiProviderUrl, publicKey } from "../constants";
import { RouteManager } from "../../src/managers/RouteManager";
import { CoinManagerSingleton } from "../../src/managers/coin/CoinManager";
import { Providers } from "../../src/managers/types";
import { AftermathSingleton } from "../../src/providers/aftermath/aftermath";
import { CetusSingleton } from "../../src/providers/cetus/cetus";
import { clmmMainnet } from "../../src/providers/cetus/config";
import { FlowxSingleton } from "../../src/providers/flowx/flowx";
import { TurbosSingleton } from "../../src/providers/turbos/turbos";
import { getFiltredProviders } from "./mocked/getFiltredProviders.mock";
import { LONG_SUI_COIN_TYPE, SHORT_SUI_COIN_TYPE } from "../../src/providers/common";
import { getRouterMaps, tokenFromIsTokenTo } from "../../src/managers/utils";

jest.setTimeout(60000);

const SUI_COIN_TYPE = "0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI";
const USDC_COIN_TYPE = "0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN";
const INPUT_AMOUNT = "0.001";
const SLIPPAGE = 10;

describe("WalletManager", () => {
  let routeManager: RouteManager;
  let providers: Providers;
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
    // providers = [turbos, cetus, aftermath, flowx];
    providers = [turbos, cetus, aftermath];
    coinManager = CoinManagerSingleton.getInstance(providers, suiProviderUrl);
    routeManager = RouteManager.getInstance(providers, coinManager);
  });

  describe("getBestRouteTransaction", () => {
    it("should return best swap transaction", async () => {
      const { tx } = await routeManager.getBestRouteTransaction({
        tokenFrom: SUI_COIN_TYPE,
        tokenTo: USDC_COIN_TYPE,
        amount: INPUT_AMOUNT,
        slippagePercentage: SLIPPAGE,
        signerAddress: publicKey,
      });

      expect(tx).toBeInstanceOf(TransactionBlock);
    });
  });

  describe("getFiltredProviders", () => {
    // Mock data for testing
    const mockPoolProviders = [
      { providerName: "Provider1", isSmartRoutingAvailable: true, getPaths: jest.fn().mockReturnValue(new Map()) },
      { providerName: "Provider2", isSmartRoutingAvailable: false, getPaths: jest.fn().mockReturnValue(new Map()) },
    ];

    const mockCoinsByProviderMap = new Map([
      [
        "Provider1",
        new Map([
          [SHORT_SUI_COIN_TYPE, { type: SHORT_SUI_COIN_TYPE, decimals: 18 }],
          [LONG_SUI_COIN_TYPE, { type: LONG_SUI_COIN_TYPE, decimals: 18 }],
          ["Token1", { type: "Token1", decimals: 18 }],
          ["Token2", { type: "Token2", decimals: 18 }],
        ]),
      ],
      [
        "Provider2",
        new Map([
          ["Token1", { type: "Token1", decimals: 18 }],
          ["Token2", { type: "Token2", decimals: 18 }],
        ]),
      ],
    ]);

    it("should filter providers based on token types", () => {
      const filtredProviders = getFiltredProviders({
        poolProviders: mockPoolProviders,
        coinsByProviderMap: mockCoinsByProviderMap,
        tokenFrom: SHORT_SUI_COIN_TYPE,
        tokenTo: "Token2",
      });

      expect(filtredProviders).toHaveLength(1);
      expect(filtredProviders[0].providerName).toBe("Provider1");
    });

    it("should filter providers based on smart routing availability", () => {
      const filtredProviders = getFiltredProviders({
        poolProviders: mockPoolProviders,
        coinsByProviderMap: mockCoinsByProviderMap,
        tokenFrom: "Token1",
        tokenTo: "Token2",
      });

      expect(filtredProviders).toHaveLength(1);
      expect(filtredProviders[0].providerName).toBe("Provider1");
    });

    it("should filter providers when both tokens are SUI", () => {
      const filtredProviders = getFiltredProviders({
        poolProviders: mockPoolProviders,
        coinsByProviderMap: mockCoinsByProviderMap,
        tokenFrom: SHORT_SUI_COIN_TYPE,
        tokenTo: LONG_SUI_COIN_TYPE,
      });

      expect(filtredProviders).toHaveLength(1);
      expect(filtredProviders.map((provider) => provider.providerName)).toEqual(["Provider1"]);
    });

    it("should filter providers when tokenFrom is SUI and tokenTo is not SUI", () => {
      const filtredProviders = getFiltredProviders({
        poolProviders: mockPoolProviders,
        coinsByProviderMap: mockCoinsByProviderMap,
        tokenFrom: SHORT_SUI_COIN_TYPE,
        tokenTo: "Token2",
      });

      expect(filtredProviders).toHaveLength(1);
      expect(filtredProviders[0].providerName).toBe("Provider1");
    });

    it("should filter providers when tokenTo is SUI and tokenFrom is not SUI", () => {
      const filtredProviders = getFiltredProviders({
        poolProviders: mockPoolProviders,
        coinsByProviderMap: mockCoinsByProviderMap,
        tokenFrom: "Token1",
        tokenTo: LONG_SUI_COIN_TYPE,
      });

      expect(filtredProviders).toHaveLength(1);
      expect(filtredProviders[0].providerName).toBe("Provider1");
    });

    it("should filter providers when neither tokenFrom nor tokenTo is SUI", () => {
      const filtredProviders = getFiltredProviders({
        poolProviders: mockPoolProviders,
        coinsByProviderMap: mockCoinsByProviderMap,
        tokenFrom: "Token1",
        tokenTo: "Token2",
      });

      expect(filtredProviders).toHaveLength(1);
      expect(filtredProviders[0].providerName).toBe("Provider1");
    });

    it("should filter providers based on smart routing availability", () => {
      const filtredProviders = getFiltredProviders({
        poolProviders: mockPoolProviders,
        coinsByProviderMap: mockCoinsByProviderMap,
        tokenFrom: "Token1",
        tokenTo: "Token2",
      });

      expect(filtredProviders).toHaveLength(1);
      expect(filtredProviders[0].providerName).toBe("Provider1");
    });

    it("should return an empty array if no providers are available", () => {
      const filtredProviders = getFiltredProviders({
        poolProviders: [],
        coinsByProviderMap: new Map(),
        tokenFrom: "Token1",
        tokenTo: "Token2",
      });

      expect(filtredProviders).toHaveLength(0);
    });

    it("should handle cases where provider coins are missing", () => {
      const filtredProviders = getFiltredProviders({
        poolProviders: mockPoolProviders,
        coinsByProviderMap: new Map(),
        tokenFrom: "Token1",
        tokenTo: "Token2",
      });

      expect(filtredProviders).toHaveLength(0);
    });
  });

  describe("getRouterMaps", () => {
    it("should return valid maps", async () => {
      const { routesByProviderMap, providersByOutputAmountsMap } = await getRouterMaps({
        filtredProviders: providers,
        amount: INPUT_AMOUNT,
        signerAddress: publicKey,
        slippagePercentage: SLIPPAGE,
        tokenFrom: SUI_COIN_TYPE,
        tokenTo: USDC_COIN_TYPE,
      });

      routesByProviderMap.forEach((routeData, providerName) => {
        expect(routeData.provider.providerName).toStrictEqual(providerName);
        expect(routeData.route).toBeDefined();
      });

      providersByOutputAmountsMap.forEach((providerName, outputAmount) => {
        expect(outputAmount >= 0).toStrictEqual(true);
        expect(typeof providerName).toStrictEqual("string");
      });
    });
  });

  describe("tokenFromIsTokenTo", () => {
    it("should return true if tokenFrom equals tokenTo", () => {
      const result = tokenFromIsTokenTo("ETH", "ETH");
      expect(result).toBe(true);
    });

    it("should return true if both tokenFrom and tokenTo are SUI tokens", () => {
      const result = tokenFromIsTokenTo(SHORT_SUI_COIN_TYPE, LONG_SUI_COIN_TYPE);
      expect(result).toBe(true);
    });

    it("should return false if tokenFrom is SUI token and tokenTo is not", () => {
      const result = tokenFromIsTokenTo(SHORT_SUI_COIN_TYPE, "USDC");
      expect(result).toBe(false);
    });

    it("should return false if tokenTo is SUI token and tokenFrom is not", () => {
      const result = tokenFromIsTokenTo("USDC", SHORT_SUI_COIN_TYPE);
      expect(result).toBe(false);
    });

    it("should return false if both tokenFrom and tokenTo are not equal and not SUI tokens", () => {
      const result = tokenFromIsTokenTo("ETH", "USDC");
      expect(result).toBe(false);
    });
  });
});
