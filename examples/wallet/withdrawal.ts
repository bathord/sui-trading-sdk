import { CoinManagerSingleton } from "../../src/managers/coin/CoinManager";
import { AftermathSingleton } from "../../src/providers/aftermath/aftermath";
import { CetusSingleton } from "../../src/providers/cetus/cetus";
import { clmmMainnet } from "../../src/providers/cetus/config";
import { TurbosSingleton } from "../../src/providers/turbos/turbos";
import { Providers } from "../../src/managers/types";
import { WalletManagerSingleton } from "../../src/managers/WalletManager";
import { cacheOptions, suiProviderUrl, provider, user } from "../common";
import { FlowxSingleton } from "../../src/providers/flowx/flowx";

// yarn ts-node examples/wallet/withdrawal.ts
export const withdrawal = async () => {
  const turbos: TurbosSingleton = await TurbosSingleton.getInstance({ suiProviderUrl, cacheOptions });
  const cetus: CetusSingleton = await CetusSingleton.getInstance({
    sdkOptions: clmmMainnet,
    cacheOptions,
    suiProviderUrl,
  });
  const aftermath: AftermathSingleton = await AftermathSingleton.getInstance({ cacheOptions });
  const flowx: FlowxSingleton = await FlowxSingleton.getInstance({ cacheOptions, suiProviderUrl });
  const providers: Providers = [turbos, cetus, aftermath, flowx];
  const coinManager: CoinManagerSingleton = CoinManagerSingleton.getInstance(providers);
  const walletManager: WalletManagerSingleton = WalletManagerSingleton.getInstance(provider, coinManager);

  const { availableAmount, totalGasFee } = await walletManager.getAvailableWithdrawSuiAmount(user);
  console.log("availableWithdrawalSuiBalance:", availableAmount);

  const withdrawalTx = await WalletManagerSingleton.getWithdrawSuiTransaction({
    address: "0x7434c5da3faa3ba417228c27fbfee2cae5b3927e2676389a265fad7cd7686a73",
    amount: availableAmount,
  });
  console.debug("withdrawalTx: ", withdrawalTx);

  withdrawalTx.setGasBudget(Number(totalGasFee));

  //   const res = await provider.devInspectTransactionBlock({
  //     sender: keypair.toSuiAddress(),
  //     transactionBlock: withdrawalTx,
  //   });

  //   const res = await provider.signAndExecuteTransactionBlock({
  //     signer: keypair,
  //     transactionBlock: withdrawalTx,
  //     options: { showEffects: true },
  //   });

  //   console.debug("res: ", res);
};

withdrawal();
