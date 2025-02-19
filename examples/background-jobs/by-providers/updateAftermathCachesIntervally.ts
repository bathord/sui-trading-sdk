/* eslint-disable max-len */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable require-jsdoc */

import { AftermathSingleton } from "../../../src/providers/aftermath/aftermath";
import { cacheOptions } from "../../common";
import { getCurrentDateTime } from "../../utils";
import { redis, startUpdates } from "../utils";

require("log-timestamp")(getCurrentDateTime);

const UPDATE_INTERVAL_IN_MS = 1000 * 4; // 4 seconds
const MAX_CACHES_UPDATE_TIME_IN_MS = 1000 * 6; // 6 seconds

let isUpdateInProgress = false;

// yarn ts-node examples/background-jobs/by-providers/updateAftermathCachesIntervally.ts > update-aftermath-caches.log 2>&1
async function updateAftermathCaches() {
  if (isUpdateInProgress) {
    console.log("[Cache Update] Previous update is still in progress, skipping...");
    return;
  }

  isUpdateInProgress = true;
  console.time("Caches are updated for");

  try {
    await AftermathSingleton.getInstance({
      cacheOptions: {
        storage: redis,
        updateIntervally: false,
        forceInitialUpdate: true,
        ...cacheOptions,
        maxCachesUpdateTimeInMs: MAX_CACHES_UPDATE_TIME_IN_MS,
      },
      lazyLoading: false,
    });

    // Cleanup instances only
    AftermathSingleton.removeInstance();
  } catch (error) {
    console.error("[Cache Update] Error during update:", error);
  } finally {
    console.timeEnd("Caches are updated for");
    isUpdateInProgress = false;
  }
}

// Start the updates
startUpdates(updateAftermathCaches, UPDATE_INTERVAL_IN_MS).catch((error) => {
  console.error("Failed to start updates:", error);
  process.exit(1);
});
