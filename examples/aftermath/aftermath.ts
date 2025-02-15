import { Transaction } from "@mysten/sui/transactions";
import { AftermathSingleton } from "../../src/providers/aftermath/aftermath";
import { SmartOutputAmountData } from "../../src/providers/aftermath/types";
import { LONG_SUI_COIN_TYPE } from "../../src/providers/common";
import { USDC_COIN_TYPE } from "../coin-types";
import { cacheOptions, initAndGetRedisStorage, newProvider, user } from "../common";

// yarn ts-node examples/aftermath/aftermath.ts
(async () => {
  const coinTypeFrom = LONG_SUI_COIN_TYPE;
  const coinTypeTo = USDC_COIN_TYPE;
  const inputAmount = "0.1";
  const slippagePercentage = 10;

  const storage = await initAndGetRedisStorage();
  const aftermath: AftermathSingleton = await AftermathSingleton.getInstance({
    cacheOptions: { storage, ...cacheOptions },
    lazyLoading: false,
  });

  const smartOutputAmountData: SmartOutputAmountData = await aftermath.getRouteData({
    coinTypeFrom,
    coinTypeTo,
    inputAmount,
    publicKey: user,
    slippagePercentage,
  });
  console.log("smartOutputAmount:", smartOutputAmountData.outputAmount);

  const transaction: Transaction = await aftermath.getSwapTransaction({
    publicKey: user,
    route: smartOutputAmountData.route,
    slippagePercentage,
  });

  const res = await newProvider.devInspectTransactionBlock({ sender: user, transactionBlock: transaction });
  console.debug("res:", res);
})();
