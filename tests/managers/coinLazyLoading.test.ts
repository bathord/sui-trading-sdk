import { cacheOptions, suiProviderUrl } from "../constants";
import { CoinManagerSingleton } from "../../src/managers/coin/CoinManager";
import { Provider, Providers } from "../../src/managers/types";
import { AftermathSingleton } from "../../src/providers/aftermath/aftermath";
import { CetusSingleton } from "../../src/providers/cetus/cetus";
import { clmmMainnet } from "../../src/providers/cetus/config";
import { FlowxSingleton } from "../../src/providers/flowx/flowx";
import { TurbosSingleton } from "../../src/providers/turbos/turbos";

jest.setTimeout(60000);

describe("CoinManager & Event Emitter & lazy loading", () => {
  it("should fill coin manager cache asynchronously", async () => {
    const turbos: TurbosSingleton = await TurbosSingleton.getInstance({ suiProviderUrl, cacheOptions });
    const cetus: CetusSingleton = await CetusSingleton.getInstance({
      sdkOptions: clmmMainnet,
      cacheOptions,
      suiProviderUrl,
    });
    const aftermath: AftermathSingleton = await AftermathSingleton.getInstance({ cacheOptions });
    const flowx: FlowxSingleton = await FlowxSingleton.getInstance({ cacheOptions, suiProviderUrl });
    const providers: Providers = [turbos, cetus, aftermath, flowx];
    const coinManager: CoinManagerSingleton = CoinManagerSingleton.getInstance(providers, suiProviderUrl);

    providers.forEach((provider: Provider) => {
      const events = provider.getEvents();
      const buffer = provider.getBuffer();

      expect(buffer.length).toStrictEqual(0);
      expect(Object.keys(events).length).toStrictEqual(1);
    });

    const allCoinsCacheBefore = coinManager.getAllCoins();
    const coinsByProviderNameCacheBefore = coinManager.getCoinsByProviderMap();

    expect(allCoinsCacheBefore.size).toStrictEqual(0);
    expect(coinsByProviderNameCacheBefore.size).toStrictEqual(0);

    const maxWaitingAttemps = 10;
    let currentAttemp = 0;

    while (currentAttemp < maxWaitingAttemps) {
      const allProvidersAreInited: boolean = providers.every((provider) => provider.getCoins().data.length !== 0);

      if (!allProvidersAreInited) {
        await new Promise((r) => setTimeout(r, 5000));
        currentAttemp++;
      } else {
        break;
      }
    }

    if (currentAttemp === 10) {
      throw new Error(
        "Not all providers were inited. Find out the reason " +
          "or try to increase maxWaitingAttemps or waiting time in setTimeout",
      );
    }

    providers.forEach((provider: Provider) => {
      const events = provider.getEvents();
      const buffer = provider.getBuffer();

      expect(buffer.length).toStrictEqual(1);
      expect(Object.keys(events).length).toStrictEqual(1);
    });

    const allCoinsCacheAfter = coinManager.getAllCoins();
    const coinsByProviderNameCacheAfter = coinManager.getCoinsByProviderMap();

    expect(allCoinsCacheAfter.size).toBeGreaterThan(0);
    expect(coinsByProviderNameCacheAfter.size).toStrictEqual(providers.length);
  });
});
