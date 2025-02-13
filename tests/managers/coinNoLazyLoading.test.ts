import { cacheOptions, suiProviderUrl } from "../constants";
import { CoinManagerSingleton } from "../../src/managers/coin/CoinManager";
import { Provider, Providers } from "../../src/managers/types";
import { AftermathSingleton } from "../../src/providers/aftermath/aftermath";
import { CetusSingleton } from "../../src/providers/cetus/cetus";
import { clmmMainnet } from "../../src/providers/cetus/config";
import { FlowxSingleton } from "../../src/providers/flowx/flowx";
import { TurbosSingleton } from "../../src/providers/turbos/turbos";

jest.setTimeout(60000);

describe("CoinManager & Event Emitter & no lazy loading", () => {
  it("should fill coin manager cache synchronously from buffer", async () => {
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

    providers.forEach((provider: Provider) => {
      const events = provider.getEvents();
      const buffer = provider.getBuffer();

      expect(buffer.length).toBeGreaterThan(0);
      expect(Object.keys(events).length).toStrictEqual(0);
    });

    const coinManager: CoinManagerSingleton = CoinManagerSingleton.getInstance(providers, suiProviderUrl);

    const allCoinsCache = coinManager.getAllCoins();
    const coinsByProviderNameCache = coinManager.getCoinsByProviderMap();

    expect(allCoinsCache.size).toBeGreaterThan(0);
    expect(coinsByProviderNameCache.size).toStrictEqual(providers.length);

    providers.forEach((provider: Provider) => {
      const events = provider.getEvents();
      const buffer = provider.getBuffer();

      expect(buffer.length).toStrictEqual(0);
      expect(Object.keys(events).length).toStrictEqual(1);
    });
  });
});
