/* eslint-disable max-len */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable require-jsdoc */

import { FlowxSingleton } from "../../../src/providers/flowx/flowx";
import { suiProviderUrl } from "../../common";
import { getCurrentDateTime } from "../../utils";
import { redis, startProcess } from "../utils";

require("log-timestamp")(getCurrentDateTime);

const UPDATE_INTERVAL_IN_MS = 1000 * 3; // 3 seconds
const MAX_CACHES_UPDATE_TIME_IN_MS = 1000 * 4; // 4 seconds

let isUpdateInProgress = false;

// yarn ts-node examples/background-jobs/by-providers/updateFlowxCachesIntervally.ts > update-flowx-caches.log 2>&1
async function updateFlowxCaches() {
  if (isUpdateInProgress) {
    console.log("[Cache Update] Previous update is still in progress, skipping...");
    return;
  }

  isUpdateInProgress = true;
  console.time("Caches are updated for");

  try {
    await FlowxSingleton.getInstance({
      cacheOptions: {
        storage: redis,
        updateIntervalInMs: 0,
        updateIntervally: false,
        initCacheFromStorage: false,
        maxCachesUpdateTimeInMs: MAX_CACHES_UPDATE_TIME_IN_MS,
      },
      suiProviderUrl,
      lazyLoading: false,
    });

    // Cleanup instances only
    FlowxSingleton.removeInstance();
  } catch (error) {
    console.error("[Cache Update] Error during update:", error);
  } finally {
    console.timeEnd("Caches are updated for");
    isUpdateInProgress = false;
  }
}

// Start the updates
startProcess(updateFlowxCaches, UPDATE_INTERVAL_IN_MS).catch((error) => {
  console.error("Failed to start updates:", error);
  process.exit(1);
});
