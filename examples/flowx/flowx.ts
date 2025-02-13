import { LONG_SUI_COIN_TYPE } from "../../src/providers/common";
import { FlowxSingleton } from "../../src/providers/flowx/flowx";
import { FUD_COIN_TYPE } from "../coin-types";
import { cacheOptions, initAndGetRedisStorage, provider, suiProviderUrl, user } from "../common";

// yarn ts-node examples/flowx/flowx.ts
export const flowx = async ({
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

  const flowx: FlowxSingleton = await FlowxSingleton.getInstance({
    cacheOptions: { storage, ...cacheOptions },
    suiProviderUrl,
    lazyLoading: false,
  });

  const calculatedData = await flowx.getRouteData({
    coinTypeFrom: tokenFrom,
    coinTypeTo: tokenTo,
    inputAmount: amount,
    publicKey: signerAddress,
    slippagePercentage,
  });
  console.debug("calc: ", calculatedData);

  const txBlock = await flowx.getSwapTransaction({
    publicKey: user,
    slippagePercentage,
    route: calculatedData.route,
  });

  // const res = await provider.devInspectTransactionBlock({
  //   transactionBlock: txBlock,
  //   sender: user,
  // });
  // console.debug("res: ", res);
};

flowx({
  tokenFrom: LONG_SUI_COIN_TYPE,
  tokenTo: FUD_COIN_TYPE,
  amount: "0.001",
  slippagePercentage: 10,
  signerAddress: user,
});
