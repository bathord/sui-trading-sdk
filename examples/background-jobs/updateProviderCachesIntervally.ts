/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable require-jsdoc */

/**
 * It's not recommended to use this script, because it's not scalable.
 * It's better to use scripts/update-providers-caches.sh to update caches for each provider individually.
 */

import { AftermathSingleton } from "../../src/providers/aftermath/aftermath";
import { CetusSingleton } from "../../src/providers/cetus/cetus";
import { clmmMainnet } from "../../src/providers/cetus/config";
import { FlowxSingleton } from "../../src/providers/flowx/flowx";
import { TurbosSingleton } from "../../src/providers/turbos/turbos";
import { cacheOptions, suiProviderUrl } from "../common";
import { getCurrentDateTime } from "../utils";
import { redis, startProcess } from "./utils";

require("log-timestamp")(getCurrentDateTime);

const UPDATE_INTERVAL_IN_MS = 1000 * 10; // 10 seconds
const MAX_CACHES_UPDATE_TIME_IN_MS = 1000 * 9; // 9 seconds

let isUpdateInProgress = false;

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
        cacheOptions: {
          storage: redis,
          updateIntervalInMs: 0,
          updateIntervally: false,
          initCacheFromStorage: false,
          maxCachesUpdateTimeInMs: MAX_CACHES_UPDATE_TIME_IN_MS,
        },
        lazyLoading: false,
      }),
      CetusSingleton.getInstance({
        sdkOptions: clmmMainnet,
        cacheOptions: {
          storage: redis,
          updateIntervalInMs: 0,
          updateIntervally: false,
          initCacheFromStorage: false,
          maxCachesUpdateTimeInMs: MAX_CACHES_UPDATE_TIME_IN_MS,
        },
        suiProviderUrl,
        lazyLoading: false,
      }),
      AftermathSingleton.getInstance({
        cacheOptions: {
          storage: redis,
          updateIntervally: false,
          forceInitialUpdate: true,
          ...cacheOptions,
          maxCachesUpdateTimeInMs: MAX_CACHES_UPDATE_TIME_IN_MS,
        },
        lazyLoading: false,
      }),
      FlowxSingleton.getInstance({
        cacheOptions: {
          storage: redis,
          updateIntervalInMs: 0,
          updateIntervally: false,
          initCacheFromStorage: false,
          maxCachesUpdateTimeInMs: MAX_CACHES_UPDATE_TIME_IN_MS,
        },
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

// Start the updates
startProcess(updateProviderCaches, UPDATE_INTERVAL_IN_MS).catch((error) => {
  console.error("Failed to start updates:", error);
  process.exit(1);
});
