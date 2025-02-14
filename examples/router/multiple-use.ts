import { CoinManagerSingleton } from "../../src/managers/coin/CoinManager";
import { RouteManager } from "../../src/managers/RouteManager";
import { SHORT_SUI_COIN_TYPE } from "../../src/providers/common";
import { USDC_COIN_TYPE } from "../coin-types";
import { initAndGetProviders, initAndGetRedisStorage, keypair, provider, suiProviderUrl, user } from "../common";

// yarn ts-node examples/router/multiple-use.ts
export const router = async ({
  tokenFrom,
  tokenTo,
  amount,
  slippagePercentage,
  signerAddress,
}: {
  tokenFrom: string;
  tokenTo: string;
  amount: string;
  slippagePercentage: number;
  signerAddress: string;
}) => {
  const storage = await initAndGetRedisStorage();

  console.time("All init");
  const providers = await initAndGetProviders(storage);
  const coinManager: CoinManagerSingleton = CoinManagerSingleton.getInstance(providers, suiProviderUrl);
  const routerManager = RouteManager.getInstance(providers, coinManager);
  console.timeEnd("All init");

  let isUpdatingCurrently = false;
  setInterval(async () => {
    if (isUpdatingCurrently) {
      return;
    }
    isUpdatingCurrently = true;

    console.time("getBestRouteTransaction");
    const { tx: trx } = await routerManager.getBestRouteTransaction({
      tokenFrom,
      tokenTo,
      amount,
      slippagePercentage,
      signerAddress,
    });
    console.timeEnd("getBestRouteTransaction");

    // const res = await provider.devInspectTransactionBlock({ sender: user, transactionBlock: trx });
    // console.debug("res:", res);

    isUpdatingCurrently = false;
  }, 5_000); // 5 sec
};

router({
  tokenFrom: SHORT_SUI_COIN_TYPE,
  tokenTo: USDC_COIN_TYPE,
  amount: "0.1",
  slippagePercentage: 10,
  signerAddress: keypair.toSuiAddress(),
});
