/* eslint-disable require-jsdoc */

import { createClient } from "redis";
import { AftermathSingleton } from "../../src/providers/aftermath/aftermath";
import { CetusSingleton } from "../../src/providers/cetus/cetus";
import { clmmMainnet } from "../../src/providers/cetus/config";
import { FlowxSingleton } from "../../src/providers/flowx/flowx";
import { TurbosSingleton } from "../../src/providers/turbos/turbos";
import { RedisStorageSingleton } from "../../src/storages/RedisStorage";
import { cacheOptions, suiProviderUrl } from "../common";

const UPDATE_INTERVAL_IN_MS = 1000 * 7; // 7 seconds

let isUpdateInProgress = false;
let redisClient: ReturnType<typeof createClient>;
let redis: RedisStorageSingleton;

// yarn ts-node examples/background-jobs/updateProviderCachesIntervally.ts > update-caches-intervally.log 2>&1
async function updateProviderCaches() {
  if (isUpdateInProgress) {
    console.log("[Cache Update] Previous update is still in progress, skipping...");
    return;
  }

  isUpdateInProgress = true;
  console.time("Caches are updated for");

  try {
    await Promise.all([
      TurbosSingleton.getInstance({
        suiProviderUrl,
        cacheOptions: { storage: redis, updateIntervalInMs: 0, updateIntervally: false, initCacheFromStorage: false },
        lazyLoading: false,
      }),
      CetusSingleton.getInstance({
        sdkOptions: clmmMainnet,
        cacheOptions: { storage: redis, updateIntervalInMs: 0, updateIntervally: false, initCacheFromStorage: false },
        suiProviderUrl,
        lazyLoading: false,
      }),
      AftermathSingleton.getInstance({
        cacheOptions: { storage: redis, updateIntervally: false, forceInitialUpdate: true, ...cacheOptions },
        lazyLoading: false,
      }),
      FlowxSingleton.getInstance({
        cacheOptions: { storage: redis, updateIntervalInMs: 0, updateIntervally: false },
        suiProviderUrl,
        lazyLoading: false,
      }),
    ]);

    // Cleanup instances only
    TurbosSingleton.removeInstance();
    CetusSingleton.removeInstance();
    AftermathSingleton.removeInstance();
    FlowxSingleton.removeInstance();
  } catch (error) {
    console.error("[Cache Update] Error during update:", error);
  } finally {
    console.timeEnd("Caches are updated for");
    isUpdateInProgress = false;
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
let updateInterval: NodeJS.Timeout;

async function startUpdates() {
  await initRedis();
  updateInterval = setInterval(updateProviderCaches, UPDATE_INTERVAL_IN_MS);
  await updateProviderCaches(); // Initial update
}

async function stopUpdates() {
  if (updateInterval) {
    clearInterval(updateInterval);
  }
  await cleanupRedis();
}

// Handle process termination
const handleProcessSignal = async (signal: string) => {
  console.log(`\nReceived ${signal} signal. Stopping updates...`);
  await stopUpdates();
  process.exit(0);
};

process.on("SIGINT", () => handleProcessSignal("SIGINT"));
process.on("SIGTERM", () => handleProcessSignal("SIGTERM"));
process.on("SIGUSR1", () => handleProcessSignal("SIGUSR1"));
process.on("SIGUSR2", () => handleProcessSignal("SIGUSR2"));
process.on("exit", () => handleProcessSignal("exit"));

// Start the updates
startUpdates().catch((error) => {
  console.error("Failed to start updates:", error);
  process.exit(1);
});
