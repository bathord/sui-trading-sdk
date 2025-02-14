import { isValidTokenAddress } from "../../src/providers/utils/isValidTokenAddress";
import { CoinManagerSingleton } from "../../src/managers/coin/CoinManager";
import { Providers } from "../../src/managers/types";
import { AftermathSingleton } from "../../src/providers/aftermath/aftermath";
import { CetusSingleton } from "../../src/providers/cetus/cetus";
import { clmmMainnet } from "../../src/providers/cetus/config";
import { FlowxSingleton } from "../../src/providers/flowx/flowx";
import { TurbosSingleton } from "../../src/providers/turbos/turbos";
import { cacheOptions, suiProviderUrl } from "../common";
import { convertMyMapTypeToRecord, mapToObject, saveDataToJsonFile } from "../utils";

// yarn ts-node examples/coin/find-min-max-decimals-across-all-coins.ts
(async () => {
  console.time("All init");

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
  const flowx: FlowxSingleton = await FlowxSingleton.getInstance({ cacheOptions, suiProviderUrl, lazyLoading: false });
  const providers: Providers = [turbos, cetus, aftermath, flowx];
  const coinManager: CoinManagerSingleton = CoinManagerSingleton.getInstance(providers, suiProviderUrl);

  const allCoins = coinManager.getAllCoins();

  const coinsArray = Array.from(allCoins.values());

  const validCoins = coinsArray.filter((el) => {
    const match = isValidTokenAddress(el.type);

    if (!match) {
      console.warn(`${el.type} is not matched with coin validation regexp`);
      return false;
    }

    return true;
  });

  // Output results
  console.log(`Coin allCoins.length ${coinsArray.length}`);
  console.log(`Coin validCoins.length ${validCoins.length}`);

  console.timeEnd("All init");
})();
