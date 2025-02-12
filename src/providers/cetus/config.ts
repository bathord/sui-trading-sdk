import { PoolsQueryParams } from "./types";

const SDKConfig = {
  clmmConfig: {
    pools_id: "0xf699e7f2276f5c9a75944b37a0c5b5d9ddfd2471bf6242483b03ab2887d198d0",
    global_config_id: "0xdaa46292632c3c4d8f31f23ea0f9b36a28ff3677e9684980e4438403a67a3d8f",
    global_vault_id: "0xce7bceef26d3ad1f6d9b6f13a953f053e6ed3ca77907516481ce99ae8e588f2b",
    admin_cap_id: "0x89c1a321291d15ddae5a086c9abc533dff697fde3d89e0ca836c41af73e36a75",
  },
  cetusConfig: {
    coin_list_id: "0x8cbc11d9e10140db3d230f50b4d30e9b721201c0083615441707ffec1ef77b23",
    launchpad_pools_id: "0x1098fac992eab3a0ab7acf15bb654fc1cf29b5a6142c4ef1058e6c408dd15115",
    clmm_pools_id: "0x15b6a27dd9ae03eb455aba03b39e29aad74abd3757b8e18c0755651b2ae5b71e",
    admin_cap_id: "0x39d78781750e193ce35c45ff32c6c0c3f2941fa3ddaf8595c90c555589ddb113",
    global_config_id: "0x0408fa4e4a4c03cc0de8f23d0c2bbfe8913d178713c9a271ed4080973fe42d8f",
    coin_list_handle: "0x49136005e90e28c4695419ed4194cc240603f1ea8eb84e62275eaff088a71063",
    launchpad_pools_handle: "0x5e194a8efcf653830daf85a85b52e3ae8f65dc39481d54b2382acda25068375c",
    clmm_pools_handle: "0x37f60eb2d9d227949b95da8fea810db3c32d1e1fa8ed87434fc51664f87d83cb",
  },
};

// mainnet
export const clmmMainnet = {
  cetus_config: {
    package_id: "0x95b8d278b876cae22206131fb9724f701c9444515813042f54f0a426c9a3bc2f",
    published_at: "0x95b8d278b876cae22206131fb9724f701c9444515813042f54f0a426c9a3bc2f",
    config: SDKConfig.cetusConfig,
  },
  clmm_pool: {
    package_id: "0x1eabed72c53feb3805120a081dc15963c204dc8d091542592abaf7a35689b2fb",
    published_at: "0xc33c3e937e5aa2009cc0c3fdb3f345a0c3193d4ee663ffc601fe8b894fbc4ba6",
    version: 4,
    config: SDKConfig.clmmConfig,
  },
  integrate: {
    package_id: "0x996c4d9480708fb8b92aa7acf819fb0497b5ec8e65ba06601cae2fb6db3312c3",
    published_at: "0x3a5aa90ffa33d09100d7b6941ea1c0ffe6ab66e77062ddd26320c1b073aabb10",
    version: 2,
  },
  deepbook: {
    package_id: "0x000000000000000000000000000000000000000000000000000000000000dee9",
    published_at: "0x000000000000000000000000000000000000000000000000000000000000dee9",
  },
  deepbook_endpoint_v2: {
    package_id: "0x10b5eea7a286091241b69102a5e63ae444a27363ebe4ee7261fa6b688ae3daf5",
    published_at: "0x10b5eea7a286091241b69102a5e63ae444a27363ebe4ee7261fa6b688ae3daf5",
  },
  aggregatorUrl: "https://api-sui.cetus.zone/router",
  swapCountUrl: "https://api-sui.cetus.zone/v2/sui/swap/count",
};

export const CETUS_API_BASE_URL = "https://api-sui.cetus.zone";
export const STATS_POOLS_ENDPOINT = "/v2/sui/stats_pools";

export const DEFAULT_POOLS_PARAMS: Required<PoolsQueryParams> = {
  is_vaults: false,
  display_all_pools: false,
  has_mining: true,
  has_farming: true,
  no_incentives: true,
  order_by: "-vol",
  limit: 100,
  offset: 0,
};

export const getCentralizedPoolsInfoEndpoint = (customParams: PoolsQueryParams = {}): string => {
  const mergedParams = { ...DEFAULT_POOLS_PARAMS, ...customParams };
  return `${CETUS_API_BASE_URL}${STATS_POOLS_ENDPOINT}?${new URLSearchParams(
    Object.entries(mergedParams).reduce(
      (acc, [key, value]) => ({
        ...acc,
        [key]: String(value),
      }),
      {},
    ),
  ).toString()}`;
};

export const MIN_FETCH_BEST_ROUTE_TIMEOUT_DURATION = 4_000;
export const MAX_FETCH_BEST_ROUTE_TIMEOUT_DURATION = 5_500;
export const FETCH_BEST_ROUTE_ATTEMPTS_COUNT = 1;
