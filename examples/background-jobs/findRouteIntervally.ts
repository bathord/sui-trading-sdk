/* eslint-disable require-jsdoc */

import { Transaction } from "@mysten/sui/transactions";
import { createClient } from "redis";
import { AftermathSingleton, CetusSingleton, FlowxSingleton, TurbosSingleton } from "../../src";
import { NoRoutesError } from "../../src/errors/NoRoutesError";
import { CoinManagerSingleton } from "../../src/managers/coin/CoinManager";
import { RouteManager } from "../../src/managers/RouteManager";
import { clmmMainnet } from "../../src/providers/cetus/config";
import { SHORT_SUI_COIN_TYPE } from "../../src/providers/common";
import { RedisStorageSingleton } from "../../src/storages/RedisStorage";
import { USDC_COIN_TYPE } from "../coin-types";
import { cacheOptions, newKeypair, newProvider, suiProviderUrl, user } from "../common";

const FIND_ROUTE_INTERVAL_MS = 1000 * 10; // 10 seconds

const ROUTE_PARAMS = {
  tokenFrom: SHORT_SUI_COIN_TYPE,
  tokenTo: USDC_COIN_TYPE,
  amount: "0.01",
  slippagePercentage: 10,
  signerAddress: user,
};

const SHOULD_EXECUTE_SWAP = false;

let isRouteSearchInProgress = false;
let redisClient: ReturnType<typeof createClient>;
let redis: RedisStorageSingleton;

// yarn ts-node examples/background-jobs/findRouteIntervally.ts > find-route-intervally.log 2>&1
async function findRoute() {
  if (isRouteSearchInProgress) {
    console.log("[Route Search] Previous search is still in progress, skipping...");
    return;
  }

  isRouteSearchInProgress = true;
  console.time("Route search completed in");

  try {
    console.time("All Singletons initiating");
    const providers = await Promise.all([
      TurbosSingleton.getInstance({
        suiProviderUrl,
        cacheOptions: { storage: redis, updateIntervally: false, ...cacheOptions },
        lazyLoading: false,
      }),
      CetusSingleton.getInstance({
        sdkOptions: clmmMainnet,
        cacheOptions: { storage: redis, updateIntervally: false, ...cacheOptions },
        suiProviderUrl,
        lazyLoading: false,
      }),
      AftermathSingleton.getInstance({
        cacheOptions: { storage: redis, updateIntervally: false, ...cacheOptions },
        lazyLoading: false,
      }),
      FlowxSingleton.getInstance({
        cacheOptions: { storage: redis, updateIntervally: false, ...cacheOptions },
        suiProviderUrl,
        lazyLoading: false,
      }),
    ]);
    console.timeEnd("All Singletons initiating");

    const coinManager = CoinManagerSingleton.getInstance(providers, suiProviderUrl);
    const routerManager = RouteManager.getInstance(providers, coinManager);

    const { maxOutputProvider, maxOutputAmount, route } = await routerManager.getBestRouteData(ROUTE_PARAMS);

    if (route) {
      console.log("\n[Route Search] Successfully found route!");
      console.log(`Provider: ${maxOutputProvider.providerName}`);
      console.log(`Input Amount: ${ROUTE_PARAMS.amount} ${ROUTE_PARAMS.tokenFrom}`);
      console.log(`Output Amount: ${maxOutputAmount} ${ROUTE_PARAMS.tokenTo}`);

      if (SHOULD_EXECUTE_SWAP) {
        console.time("Swap execution");
        const tx = await routerManager.getBestRouteTransactionByRouteData({
          route,
          maxOutputProvider,
          signerAddress: ROUTE_PARAMS.signerAddress,
          slippagePercentage: ROUTE_PARAMS.slippagePercentage,
        });

        const transaction = Transaction.from(tx.serialize());

        console.time("signAndExecuteTransaction");
        const res = await newProvider.signAndExecuteTransaction({
          transaction,
          signer: newKeypair,
        });
        console.timeEnd("signAndExecuteTransaction");

        console.debug("[Swap] Transaction result:", res);
        console.timeEnd("Swap execution");
      }

      // Cleanup and stop when route is found
      await stopSearches();
      process.exit(0);
    } else {
      console.log("[Route Search] No route found, will try again in the next interval");
    }
  } catch (error) {
    if (error instanceof NoRoutesError) {
      console.log("[Route Search] No route found, will try again in the next interval");
    } else {
      console.error("[Route Search] Error during search:", error);
    }
  } finally {
    // Cleanup instances
    RouteManager.removeInstance();
    CoinManagerSingleton.removeInstance();
    AftermathSingleton.removeInstance();
    CetusSingleton.removeInstance();
    TurbosSingleton.removeInstance();
    FlowxSingleton.removeInstance();

    isRouteSearchInProgress = false;

    console.timeEnd("Route search completed in");
  }
}

async function initRedis() {
  console.time("redis init");
  redisClient = createClient({
    url: process.env.REDIS_URL,
    socket: { tls: false },
  });
  redisClient.on("error", (error) => {
    console.error("[Redis Client] error event occured:", error);
  });
  await redisClient.connect();
  redis = RedisStorageSingleton.getInstance(redisClient);
  console.timeEnd("redis init");
}

async function cleanupRedis() {
  if (redisClient) {
    await redisClient.disconnect();
    RedisStorageSingleton.removeInstance();
  }
}

// Start interval updates
let searchInterval: NodeJS.Timeout;

async function startSearches() {
  await initRedis();
  searchInterval = setInterval(findRoute, FIND_ROUTE_INTERVAL_MS);
  await findRoute(); // Initial search
}

async function stopSearches() {
  if (searchInterval) {
    clearInterval(searchInterval);
  }
  await cleanupRedis();
}

// Handle process termination
const handleProcessSignal = async (signal: string) => {
  console.log(`\nReceived ${signal} signal. Stopping route searches...`);
  await stopSearches();
  process.exit(0);
};

process.on("SIGINT", () => handleProcessSignal("SIGINT"));
process.on("SIGTERM", () => handleProcessSignal("SIGTERM"));
process.on("SIGUSR1", () => handleProcessSignal("SIGUSR1"));
process.on("SIGUSR2", () => handleProcessSignal("SIGUSR2"));
process.on("exit", () => handleProcessSignal("exit"));

// Start the searches
startSearches().catch((error) => {
  console.error("Failed to start route searches:", error);
  process.exit(1);
});
