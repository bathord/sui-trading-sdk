import { Transaction } from "@mysten/sui/transactions";
import { CoinManagerSingleton } from "../../src/managers/coin/CoinManager";
import { RouteManager } from "../../src/managers/RouteManager";
import { SHORT_SUI_COIN_TYPE } from "../../src/providers/common";
import { USDC_COIN_TYPE } from "../coin-types";
import { initAndGetProviders, initAndGetRedisStorage, newKeypair, newProvider, suiProviderUrl, user } from "../common";

// yarn ts-node examples/router/router.ts > router.log 2>&1
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

  console.time("getBestRouteTransaction");
  const { tx } = await routerManager.getBestRouteTransaction({
    tokenFrom,
    tokenTo,
    amount,
    slippagePercentage,
    signerAddress,
  });
  console.timeEnd("getBestRouteTransaction");

  const newTx = Transaction.from(tx.serialize());

  // const res = await newProvider.devInspectTransactionBlock({ sender: user, transactionBlock: newTx });
  // const res = await provider.devInspectTransactionBlock({ sender: user, transactionBlock: tx });
  // const res = await provider.signAndExecuteTransactionBlock({ transactionBlock: tx, signer: keypair });
  const res = await newProvider.signAndExecuteTransaction({ transaction: newTx, signer: newKeypair });

  console.debug("res:", res);
};

router({
  tokenFrom: SHORT_SUI_COIN_TYPE,
  tokenTo: USDC_COIN_TYPE,
  amount: "0.01",
  slippagePercentage: 10,
  signerAddress: user,
});
