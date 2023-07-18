import { Inputs } from "@mysten/sui.js";

export const DECIMALS = 10 ** 9;

// Mainnet
export const MAINNET_PROTOCOL_ID =
  "0x9e3dab13212b27f5434416939db5dec6a319d15b89a84fd074d03ece6350d3df";
export const MAINNET_PACKAGE_ID =
  "0x1f2ec04660d4d28593cdfd245e6e0d26c4c1127ee47dd313ff297efa0ccadf59";
export const BUCK_TYPE =
  "0xce7ff77a83ea0cb6fd39bd8748e2ec89a3f41e8efdc3f4eb123e0ca37b184db2::buck::BUCK";

export const MODULES = {
  BORROW: "buck::borrow",
  FLASH_BORROW: "buck::flash_borrow",
  FLASH_REPAY: "buck::flash_repay",
  FLASH_BORROW_BUCK: "buck::flash_borrow_buck",
  FLASH_REPAY_BUCK: "buck::flash_repay_buck",
};

export const PROTOCOL_OBJECT = Inputs.SharedObjectRef({
  objectId: MAINNET_PROTOCOL_ID,
  mutable: true,
  initialSharedVersion: 6365975,
});

export const ORACLE_OBJECT = Inputs.SharedObjectRef({
  objectId:
    "0xf578d73f54b3068166d73c1a1edd5a105ce82f97f5a8ea1ac17d53e0132a1078",
  mutable: true,
  initialSharedVersion: 5174506,
});

export const CLOCK_OBJECT = Inputs.SharedObjectRef({
  objectId:
    "0x0000000000000000000000000000000000000000000000000000000000000006",
  mutable: false,
  initialSharedVersion: 1,
});

export const SWITCHBOARD_UPDATE_TARGET =
  "0xe2077d678de929d64d3fcd79c1adfbd23d97324e9bae3a60102d44367fbe008c::bucket_oracle::update_price_from_switchboard";

export const SWITCHBOARD_SUI_AGGREGATOR =
  "0xbca474133638352ba83ccf7b5c931d50f764b09550e16612c9f70f1e21f3f594";

export const ORACLE_GET_PRICE_TARGET =
  "0xe2077d678de929d64d3fcd79c1adfbd23d97324e9bae3a60102d44367fbe008c::bucket_oracle::get_price";

export const MUL_FACTOR_TARGET =
  "0x00db9a10bb9536ab367b7d1ffa404c1d6c55f009076df1139dc108dd86608bbe::math::mul_factor";

// Cetus
export const CETUS_SWAP_TARGET =
  "0x886b3ff4623c7a9d101e0470012e0612621fbc67fa4cedddd3b17b273e35a50e::pool_script::swap_a2b";
export const CETUS_GLOBAL_CONFIG =
  "0xdaa46292632c3c4d8f31f23ea0f9b36a28ff3677e9684980e4438403a67a3d8f";
export const CETUS_BUCK_SUI_POOL =
  "0x9379d2d3f221dcea70f7f7d4a7bf30bab0128bcfda0d13a85267e51f7e6e15c0";
export const CETUS_ROUTER_SWAP_TARGET =
  "0x886b3ff4623c7a9d101e0470012e0612621fbc67fa4cedddd3b17b273e35a50e::router::swap"
