/* eslint-disable require-jsdoc */

import { createClient } from "redis";
import { suiProviderUrl } from "../common";
import { AftermathSingleton } from "../../src/providers/aftermath/aftermath";
import { CetusSingleton } from "../../src/providers/cetus/cetus";
import { clmmMainnet } from "../../src/providers/cetus/config";
import { FlowxSingleton } from "../../src/providers/flowx/flowx";
import { TurbosSingleton } from "../../src/providers/turbos/turbos";
import { RedisStorageSingleton } from "../../src/storages/RedisStorage";

async function updateProviderCaches() {
  console.time("Caches are updated for");
  console.time("redis init");
  const redisClient = createClient({
    url: process.env.REDIS_URL,
    socket: { tls: true },
  });
  redisClient.on("error", (error) => {
    console.error("[Redis Client] error event occured:", error);
  });
  await redisClient.connect();
  const redis = RedisStorageSingleton.getInstance(redisClient);
  console.timeEnd("redis init");

  await TurbosSingleton.getInstance({
    suiProviderUrl,
    cacheOptions: { storage: redis, updateIntervalInMs: 0, updateIntervally: false },
    lazyLoading: false,
  });
  await CetusSingleton.getInstance({
    sdkOptions: clmmMainnet,
    cacheOptions: { storage: redis, updateIntervalInMs: 0, updateIntervally: false },
    suiProviderUrl,
    lazyLoading: false,
  });
  await AftermathSingleton.getInstance({
    cacheOptions: { storage: redis, updateIntervalInMs: 0, updateIntervally: false },
    lazyLoading: false,
  });
  await FlowxSingleton.getInstance({
    cacheOptions: { storage: redis, updateIntervalInMs: 0, updateIntervally: false },
    suiProviderUrl,
    lazyLoading: false,
  });

  await redisClient.disconnect();
  console.timeEnd("Caches are updated for");
}

updateProviderCaches();
