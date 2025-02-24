import { RefundManagerSingleton } from "../../src";
import { keypair, provider, signAndExecuteTransaction, suiProviderUrl, user } from "../common";

// yarn ts-node examples/refund/claim-boosted-refund.ts
(async () => {
  const refundManager = RefundManagerSingleton.getInstance(suiProviderUrl);

  const amount = await refundManager.getClaimAmount({
    poolObjectId: RefundManagerSingleton.REFUND_POOL_OBJECT_ID,
    affectedAddress: user,
  });
  console.debug("amount: ", amount);

  const { boostedClaimCapObjectId } = await refundManager.getBoostedClaimCap({ ownerAddress: user, newAddress: "" });
  console.debug("boostedClaimCapObjectId: ", boostedClaimCapObjectId);

  if (!boostedClaimCapObjectId) {
    throw new Error("Boosted claim cap obj is null");
  }

  const txData = RefundManagerSingleton.getClaimRefundBoostedTransaction({
    poolObjectId: RefundManagerSingleton.REFUND_POOL_OBJECT_ID,
    boostedClaimCap: boostedClaimCapObjectId,
    // TODO:
    userRinbotRefundDestinationAddress: "",
  });

  // const res = await provider.devInspectTransactionBlock({
  //   sender: user,
  //   transactionBlock: txData.tx,
  // });

  const res = await signAndExecuteTransaction(txData.tx, keypair);

  console.debug("res: ", res);
})();
