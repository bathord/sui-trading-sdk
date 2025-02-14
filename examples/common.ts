import "dotenv/config";

import { ExecuteTransactionBlockParams, SuiClient, SuiTransactionBlockResponse } from "@mysten/sui.js/client";
import { Ed25519Keypair } from "@mysten/sui.js/keypairs/ed25519";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import { SuiClient as NewSuiClient } from "@mysten/sui/client";
import { Ed25519Keypair as NewEd25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { createClient } from "redis";
import { Providers } from "../src/managers/types";
import { normalizeMnemonic } from "../src/managers/utils";
import { AftermathSingleton } from "../src/providers/aftermath/aftermath";
import { CetusSingleton } from "../src/providers/cetus/cetus";
import { clmmMainnet } from "../src/providers/cetus/config";
import { SWAP_GAS_BUDGET } from "../src/providers/common";
import { FlowxSingleton } from "../src/providers/flowx/flowx";
import { TurbosSingleton } from "../src/providers/turbos/turbos";
import { CacheOptions } from "../src/providers/types";
import { RedisStorageSingleton } from "../src/storages/RedisStorage";
import { Storage } from "../src/storages/types";
import { hexStringToUint8Array } from "./utils";

if (!process.env.SUI_WALLET_SEED_PHRASE?.length && !process.env.SUI_WALLET_PRIVATE_KEY_ARRAY?.length) {
  throw new Error("Empty mnemonic or private key");
}

export const mnemonic = normalizeMnemonic(process.env.SUI_WALLET_SEED_PHRASE ?? "");

export const keypair = process.env.SUI_WALLET_PRIVATE_KEY_ARRAY
  ? Ed25519Keypair.fromSecretKey(hexStringToUint8Array(process.env.SUI_WALLET_PRIVATE_KEY_ARRAY))
  : Ed25519Keypair.deriveKeypair(mnemonic);
export const newKeypair = process.env.SUI_WALLET_PRIVATE_KEY_ARRAY
  ? NewEd25519Keypair.fromSecretKey(hexStringToUint8Array(process.env.SUI_WALLET_PRIVATE_KEY_ARRAY))
  : NewEd25519Keypair.deriveKeypair(mnemonic);

export const suiProviderUrl = "https://sui-rpc.publicnode.com";
export const provider = new SuiClient({ url: suiProviderUrl });
export const newProvider = new NewSuiClient({ url: suiProviderUrl });
export const user = keypair.getPublicKey().toSuiAddress();

export const signAndExecuteTransaction = async (
  transactionBlock: TransactionBlock,
  signer: Ed25519Keypair,
  input: Omit<ExecuteTransactionBlockParams, "transactionBlock" | "signature"> = { options: { showEffects: true } },
  gasBudget: number = SWAP_GAS_BUDGET,
): Promise<SuiTransactionBlockResponse> => {
  transactionBlock.setGasBudget(gasBudget);

  const transactionResponse: SuiTransactionBlockResponse = await provider.signAndExecuteTransactionBlock({
    transactionBlock,
    signer,
    ...input,
  });

  return transactionResponse;
};

export const cacheOptions: CacheOptions = {
  updateIntervalInMs: 60_000 * 30, // 30 min
};

export const initAndGetRedisStorage = async (
  { tls = false }: { tls: boolean } = { tls: false },
): Promise<RedisStorageSingleton> => {
  console.time("redis init");

  const redisClient = createClient({
    url: process.env.REDIS_URL,
    socket: { tls: tls },
  });
  redisClient.on("error", (error) => {
    console.error("[Redis Client] error event occured:", error);
  });
  await redisClient.connect();
  const redis = RedisStorageSingleton.getInstance(redisClient);

  console.timeEnd("redis init");

  return redis;
};

export const initAndGetProviders = async (storage?: Storage): Promise<Providers> => {
  const turbos: TurbosSingleton = await TurbosSingleton.getInstance({
    suiProviderUrl,
    cacheOptions: { storage, ...cacheOptions },
    lazyLoading: false,
  });
  const cetus: CetusSingleton = await CetusSingleton.getInstance({
    sdkOptions: clmmMainnet,
    cacheOptions: { storage, ...cacheOptions },
    lazyLoading: false,
    suiProviderUrl,
  });
  const aftermath: AftermathSingleton = await AftermathSingleton.getInstance({
    cacheOptions: { storage, ...cacheOptions },
    lazyLoading: false,
  });
  const flowx: FlowxSingleton = await FlowxSingleton.getInstance({
    cacheOptions: { storage, ...cacheOptions },
    lazyLoading: false,
    suiProviderUrl,
  });
  // const interest: InterestProtocolSingleton = await InterestProtocolSingleton.getInstance({
  //   suiProviderUrl,
  //   cacheOptions: { storage, ...cacheOptions },
  //   lazyLoading: false,
  // });

  const providers: Providers = [turbos, cetus, aftermath, flowx];

  return providers;
};
