# How to buy a coin fast

## Part 1: Start processes for intervally updating providers caches

1. Run `./scripts/update-providers-caches.sh`
2. Open logs for each provider and make sure there is no errors, there is no constant update rejections by timeout. You can try to find these rejections in log files by searching the `timed out` words.

## Part 2: Configure a find-route-script

1. You need to know the coin type you want to buy, so copy it.
2. Go to `examples/background-jobs/findRouteIntervally.ts`.
3. Paste the coin type into the `ROUTE_PARAMS` object as `tokenTo`.
4. Make sure `tokenFrom` in `ROUTE_PARAMS` fits your needs. You can change it as well.
5. Adjust an `amount` you want to spend. If you want to spend 5 SUI, write `5`. If 0.05 SUI - write `0.05`.
6. Decide whether you want to buy coin immediately once the route is found or not. If you want to buy it immediately, set `SHOULD_EXECUTE_SWAP` to `true`. If you just want to find the best route without buying, set it to `false`.
7. Make sure `slippagePercentage` also fits your needs.

## Part 3: Run the find-route-script

1. Run the `examples/background-jobs/findRouteIntervally.ts` script. You can find a command to run it in the script file.
2. Look at the logs and wait for the first found route.

Good luck!
