import { WalletManagerSingleton } from "../../src";

// yarn ts-node examples/wallet/generate.ts
export const generate = () => {
  const { publicKey, privateKey } = WalletManagerSingleton.generateWallet();

  console.debug("publicKey: ", publicKey);
  console.debug("privateKey: ", privateKey);
};

generate();
