import { CoinManagerSingleton } from "../../src/managers/coin/CoinManager";
import { Providers } from "../../src/managers/types";
import { AftermathSingleton } from "../../src/providers/aftermath/aftermath";
import { CetusSingleton } from "../../src/providers/cetus/cetus";
import { clmmMainnet } from "../../src/providers/cetus/config";
import { FlowxSingleton } from "../../src/providers/flowx/flowx";
import { TurbosSingleton } from "../../src/providers/turbos/turbos";
import { cacheOptions, suiProviderUrl } from "../common";
import { convertMyMapTypeToRecord, mapToObject, saveDataToJsonFile } from "../utils";

// yarn ts-node examples/coin/coin.ts
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
  const coinManager: CoinManagerSingleton = CoinManagerSingleton.getInstance(providers);

  const jsonData = coinManager.getAllCoins();

  // Step 2: Check if there are instances where different coin types share the same address
  const addressMap: Map<string, Set<string>> = new Map();

  jsonData.forEach((item) => {
    const typeParts = item.type.split("::");
    const address = typeParts[0];

    if (!addressMap.has(address)) {
      addressMap.set(address, new Set());
    }

    addressMap.get(address)?.add(typeParts[typeParts.length - 1]);
  });

  // Log results
  addressMap.forEach((coinTypes, address) => {
    if (coinTypes.size > 1) {
      console.log(`Address ${address} is shared by different coin types: ${Array.from(coinTypes).join(", ")}`);
    }
  });

  // saveDataToJsonFile(
  //   Array.from(coinManager.getCoinsByProviderMap().values())
  //     .flat()
  //     .map((el) => mapToObject(el)),
  //   "coins-by-providers",
  // );

  console.timeEnd("All init");
})();
