/* eslint-disable require-jsdoc */
import BigNumber from "bignumber.js";
import { createClient } from "redis";
import { CoinManagerSingleton } from "../../src/managers/coin/CoinManager";
import { Providers } from "../../src/managers/types";
import { AftermathSingleton } from "../../src/providers/aftermath/aftermath";
import { getLpCoinDecimals } from "../../src/providers/aftermath/create-pool-utils";
import { CetusSingleton } from "../../src/providers/cetus/cetus";
import { clmmMainnet } from "../../src/providers/cetus/config";
import { FlowxSingleton } from "../../src/providers/flowx/flowx";
import { TurbosSingleton } from "../../src/providers/turbos/turbos";
import { RedisStorageSingleton } from "../../src/storages/RedisStorage";
import { cacheOptions, keypair, signAndExecuteTransaction, suiProviderUrl, user } from "../common";

const USDC_COIN_TYPE = "0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN";
const USDT_COIN_TYPE = "0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c::coin::COIN";
const FUD_COIN_TYPE = "0x76cb819b01abed502bee8a702b4c2d547532c12f25001c9dea795a5e631c26f1::fud::FUD";
const TEST1_COIN_TYPE = "0x2b4f7b435746239df29c4c0c16f27e49e866c59abd0cef6c4e189274b3c14589::testcnone::TESTCNONE";
const TEST2_COIN_TYPE = "0x24d1055074f58ac5f6d50335d64c1997a45cd49c8a0cb8f8c2b03bda5b6d6d57::testcntwo::TESTCNTWO";

// yarn ts-node examples/create-pool/create-pool.ts
async function createPool({
  amountA,
  amountB,
  coinTypeA,
  coinTypeB,
  tradeFeeIn,
  poolName,
  lpCoinName,
  lpCoinSymbol,
}: {
  amountA: string;
  amountB: string;
  coinTypeA: string;
  coinTypeB: string;
  tradeFeeIn: number;
  poolName: string;
  lpCoinName: string;
  lpCoinSymbol: string;
}) {
  // Init code
  const redisClient = createClient({
    url: process.env.REDIS_URL,
    socket: { tls: true },
  });
  redisClient.on("error", (error) => {
    console.error("[Redis Client] error event occured:", error);
  });
  await redisClient.connect();
  const redis = RedisStorageSingleton.getInstance(redisClient);
  const turbos: TurbosSingleton = await TurbosSingleton.getInstance({
    suiProviderUrl,
    cacheOptions: { storage: redis, ...cacheOptions },
    lazyLoading: false,
  });
  const cetus: CetusSingleton = await CetusSingleton.getInstance({
    sdkOptions: clmmMainnet,
    cacheOptions: { storage: redis, ...cacheOptions },
    lazyLoading: false,
    suiProviderUrl,
  });
  const aftermath: AftermathSingleton = await AftermathSingleton.getInstance({
    cacheOptions: { storage: redis, ...cacheOptions },
    lazyLoading: false,
  });
  const flowx: FlowxSingleton = await FlowxSingleton.getInstance({
    cacheOptions: { storage: redis, ...cacheOptions },
    lazyLoading: false,
    suiProviderUrl,
  });
  const providers: Providers = [turbos, cetus, aftermath, flowx];
  const coinManager: CoinManagerSingleton = CoinManagerSingleton.getInstance(providers, suiProviderUrl);

  // Create pool code
  const lpCoinMetadata = { name: lpCoinName, symbol: lpCoinSymbol };
  const coinADecimals: number | undefined = (await coinManager.getCoinByType2(coinTypeA))?.decimals;
  const coinBDecimals: number | undefined = (await coinManager.getCoinByType2(coinTypeB))?.decimals;

  if (coinADecimals === undefined) {
    throw new Error(`Fetched metadata for ${coinTypeA} is null`);
  }
  if (coinBDecimals === undefined) {
    throw new Error(`Fetched metadata for ${coinTypeB} is null`);
  }

  const rawAmountA: string = new BigNumber(amountA).multipliedBy(10 ** coinADecimals).toString();
  const rawAmountB: string = new BigNumber(amountB).multipliedBy(10 ** coinBDecimals).toString();
  const amountABigInt = BigInt(rawAmountA);
  const amountBBigInt = BigInt(rawAmountB);

  const { weightA, weightB } = await AftermathSingleton.getWeights({
    coinA: { type: coinTypeA, amount: amountA },
    coinB: { type: coinTypeB, amount: amountB },
  });

  const coinsInfo = {
    coinA: { coinType: coinTypeA, weight: weightA, decimals: coinADecimals, tradeFeeIn, initialDeposit: amountABigInt },
    coinB: {
      coinType: coinTypeB,
      weight: weightB,
      decimals: coinBDecimals,
      tradeFeeIn,
      initialDeposit: amountBBigInt,
    },
  };
  const lpCoinDecimals = getLpCoinDecimals(coinsInfo);
  console.debug("lpCoinDecimals:", lpCoinDecimals);
  console.debug("coinsInfo:", coinsInfo);

  // Create LP coin
  const createLpCoinTransaction = await AftermathSingleton.getCreateLpCoinTransaction({
    publicKey: user,
    lpCoinDecimals,
  });
  const createLpCoinResult = await signAndExecuteTransaction(createLpCoinTransaction, keypair, {
    options: { showEvents: true, showBalanceChanges: true, showEffects: true, showObjectChanges: true },
    requestType: "WaitForLocalExecution",
  });

  // Wait to register created LP coin in blockchain
  await new Promise((r) => setTimeout(r, 10000));

  // Create pool
  const createPoolTransaction = await AftermathSingleton.getCreatePoolTransaction({
    publicKey: user,
    createLpCoinTransactionResult: createLpCoinResult,
    poolName,
    coinsInfo,
    lpCoinMetadata,
  });

  const createPoolResult = await signAndExecuteTransaction(createPoolTransaction, keypair, {
    options: { showEvents: true, showBalanceChanges: true, showEffects: true, showObjectChanges: true },
    requestType: "WaitForLocalExecution",
  });

  const poolUrl = AftermathSingleton.getPoolUrl(createPoolResult);
  console.debug("poolUrl:", poolUrl);
}

createPool({
  amountA: "0.8",
  coinTypeA: USDT_COIN_TYPE,
  amountB: "0.6",
  coinTypeB: USDC_COIN_TYPE,
  lpCoinName: "My new coin",
  lpCoinSymbol: "MY_NEW_COIN",
  poolName: "My new pool",
  tradeFeeIn: 0.0025,
});
