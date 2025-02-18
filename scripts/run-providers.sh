#!/bin/bash

# Create logs directory if it doesn't exist
mkdir -p logs

# Run all provider cache update scripts in parallel
echo "Starting all provider cache updates..."

yarn ts-node examples/background-jobs/by-providers/updateAftermathCachesIntervally.ts > logs/update-aftermath-caches.log 2>&1 &
yarn ts-node examples/background-jobs/by-providers/updateCetusCachesIntervally.ts > logs/update-cetus-caches.log 2>&1 &
yarn ts-node examples/background-jobs/by-providers/updateFlowxCachesIntervally.ts > logs/update-flowx-caches.log 2>&1 &
yarn ts-node examples/background-jobs/by-providers/updateTurbosCachesIntervally.ts > logs/update-turbos-caches.log 2>&1 &

echo "All provider cache updates are running. Check logs/ directory for output."
echo "Use 'tail -f logs/*.log' to monitor all logs."

# Wait for all background processes
wait 