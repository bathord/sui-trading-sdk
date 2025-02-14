/* eslint-disable require-jsdoc */
import { TransactionBlock } from "@mysten/sui.js/transactions";
import { publicKey, cacheOptions, suiProviderUrl } from "../constants";
import { FlowxSingleton } from "../../src/providers/flowx/flowx";
import { getCoinsMap, getPathsMap } from "../../src/providers/flowx/utils";
import { getPairs } from "@flowx-pkg/ts-sdk";

jest.setTimeout(60000);

const SUI_COIN_TYPE = "0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI";
const USDC_COIN_TYPE = "0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN";

describe("FlowxSingleton", () => {
  let flowxSingleton: FlowxSingleton;

  beforeAll(async () => {
    flowxSingleton = await FlowxSingleton.getInstance({
      lazyLoading: false,
      suiProviderUrl,
      cacheOptions,
    });
  });

  describe("getCoins", () => {
    it("should return updated coins cache", () => {
      const coins = flowxSingleton.getCoins();

      expect(coins.provider).toBe("Flowx");
      expect(coins.data.length).toBeGreaterThan(0);
    });
  });

  describe("getRouteData", () => {
    it("should return outputAmount and route", async () => {
      const { outputAmount, route } = await flowxSingleton.getRouteData({
        coinTypeFrom: SUI_COIN_TYPE,
        coinTypeTo: USDC_COIN_TYPE,
        inputAmount: "0.001",
        slippagePercentage: 10,
        publicKey,
      });

      expect(outputAmount > 0).toStrictEqual(true);
      expect(route).toBeDefined();
    });
  });

  describe("getSwapTransaction", () => {
    it("should return swap transaction", async () => {
      const { route } = await flowxSingleton.getRouteData({
        coinTypeFrom: SUI_COIN_TYPE,
        coinTypeTo: USDC_COIN_TYPE,
        inputAmount: "0.001",
        slippagePercentage: 10,
        publicKey,
      });

      const transaction = await flowxSingleton.getSwapTransaction({
        route,
        publicKey,
        slippagePercentage: 10,
      });

      expect(transaction).toBeInstanceOf(TransactionBlock);
    });
  });

  describe("getCoinsMap", () => {
    it("should return coins and coinMap", () => {
      const coinList = Array.from(flowxSingleton.coinsCache.values());
      const { coins, coinMap } = getCoinsMap({ coinList });

      expect(coinMap.size).toBeGreaterThan(0);
      coinMap.forEach((coinData, coinType) => {
        const { type, decimals, symbol } = coinData;
        expect(typeof type).toStrictEqual("string");
        expect(typeof decimals).toStrictEqual("number");
        expect(typeof symbol === "string" || typeof symbol === "undefined").toStrictEqual(true);
        expect(coinType).toStrictEqual(type);
      });

      expect(coins.coins.length).toBeGreaterThan(0);
    });
  });

  describe("getPathsMap", () => {
    it("should return paths map", async () => {
      const pairs = await getPairs();
      const pathsMap = getPathsMap(pairs);

      pathsMap.forEach((poolData, poolKey) => {
        const { base, quote } = poolData;
        expect(poolKey).toStrictEqual(`${base}-${quote}`);
      });
    });
  });
});
