/* eslint-disable max-len */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable require-jsdoc */

import { TurbosSingleton } from "../../../src/providers/turbos/turbos";
import { suiProviderUrl } from "../../common";
import { getCurrentDateTime } from "../../utils";
import { redis, startUpdates } from "../utils";

require("log-timestamp")(getCurrentDateTime);

const UPDATE_INTERVAL_IN_MS = 1000 * 6; // 6 seconds
const MAX_CACHES_UPDATE_TIME_IN_MS = 1000 * 10; // 10 seconds

let isUpdateInProgress = false;

// yarn ts-node examples/background-jobs/by-providers/updateTurbosCachesIntervally.ts > update-turbos-caches.log 2>&1
async function updateTurbosCaches() {
  if (isUpdateInProgress) {
    console.log("[Cache Update] Previous update is still in progress, skipping...");
    return;
  }

  isUpdateInProgress = true;
  console.time("Caches are updated for");

  try {
    await TurbosSingleton.getInstance({
      suiProviderUrl,
      cacheOptions: {
        storage: redis,
        updateIntervalInMs: 0,
        updateIntervally: false,
        initCacheFromStorage: false,
        maxCachesUpdateTimeInMs: MAX_CACHES_UPDATE_TIME_IN_MS,
      },
      lazyLoading: false,
    });

    // Cleanup instances only
    TurbosSingleton.removeInstance();
  } catch (error) {
    console.error("[Cache Update] Error during update:", error);
  } finally {
    console.timeEnd("Caches are updated for");
    isUpdateInProgress = false;
  }
}

// Start the updates
startUpdates(updateTurbosCaches, UPDATE_INTERVAL_IN_MS).catch((error) => {
  console.error("Failed to start updates:", error);
  process.exit(1);
});
