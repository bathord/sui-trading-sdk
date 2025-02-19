/* eslint-disable require-jsdoc */

import { createClient } from "redis";
import { RedisStorageSingleton } from "../../src/storages/RedisStorage";

export let redisClient: ReturnType<typeof createClient>;
export let redis: RedisStorageSingleton;
let updateInterval: NodeJS.Timeout;

export async function initRedis() {
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

export async function cleanupRedis() {
  if (redisClient) {
    await redisClient.disconnect();
    RedisStorageSingleton.removeInstance();
  }
}

export async function stopProcess() {
  if (updateInterval) {
    clearInterval(updateInterval);
  }
  await cleanupRedis();
}

// Start interval updates
export async function startProcess(method: () => Promise<void>, updateIntervalInMs: number) {
  await initRedis();
  updateInterval = setInterval(method, updateIntervalInMs);
  await method(); // Initial update
}

// Handle process termination
const handleProcessSignal = async (signal: string) => {
  console.log(`\nReceived ${signal} signal. Stopping updates...`);
  await stopProcess();
  process.exit(0);
};

process.on("SIGINT", () => handleProcessSignal("SIGINT"));
process.on("SIGTERM", () => handleProcessSignal("SIGTERM"));
process.on("SIGUSR1", () => handleProcessSignal("SIGUSR1"));
process.on("SIGUSR2", () => handleProcessSignal("SIGUSR2"));
process.on("exit", () => handleProcessSignal("exit"));
