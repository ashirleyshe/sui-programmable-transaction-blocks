import {
  TransactionBlock,
  Inputs,
  RawSigner,
  Ed25519Keypair,
  JsonRpcProvider,
} from "@mysten/sui.js";
import getExecStuff from "../utils";
import * as dotenv from "dotenv";
dotenv.config();

type Target = `${string}::${string}::${string}`;

const bucket_leverage = async (
  address: string,
  signer: RawSigner,
  input_coll: number,
  leverage: number
) => {

  const DECIMALS = 10 ** 9;

  // Mainnet
  const MAINNET_PROTOCOL_ID =
    "0x9e3dab13212b27f5434416939db5dec6a319d15b89a84fd074d03ece6350d3df";
  const MAINNET_PACKAGE_ID =
    "0x1f2ec04660d4d28593cdfd245e6e0d26c4c1127ee47dd313ff297efa0ccadf59";
  const BUCK_TYPE =
    "0xce7ff77a83ea0cb6fd39bd8748e2ec89a3f41e8efdc3f4eb123e0ca37b184db2::buck::BUCK";

  const MODULES = {
    BORROW: "buck::borrow",
    FLASH_BORROW: "buck::flash_borrow",
    FLASH_REPAY: "buck::flash_repay",
    FLASH_BORROW_BUCK: "buck::flash_borrow_buck",
    FLASH_REPAY_BUCK: "buck::flash_repay_buck",
  };

  const PROTOCOL_OBJECT = Inputs.SharedObjectRef({
    objectId: MAINNET_PROTOCOL_ID,
    mutable: true,
    initialSharedVersion: 6365975,
  });

  const ORACLE_OBJECT = Inputs.SharedObjectRef({
    objectId:
      "0xf578d73f54b3068166d73c1a1edd5a105ce82f97f5a8ea1ac17d53e0132a1078",
    mutable: true,
    initialSharedVersion: 5174506,
  });

  const CLOCK_OBJECT = Inputs.SharedObjectRef({
    objectId:
      "0x0000000000000000000000000000000000000000000000000000000000000006",
    mutable: false,
    initialSharedVersion: 1,
  });

  const SWITCHBOARD_UPDATE_TARGET =
    "0xe2077d678de929d64d3fcd79c1adfbd23d97324e9bae3a60102d44367fbe008c::bucket_oracle::update_price_from_switchboard";

  const SWITCHBOARD_SUI_AGGREGATOR =
    "0xbca474133638352ba83ccf7b5c931d50f764b09550e16612c9f70f1e21f3f594";

  const ORACLE_GET_PRICE_TARGET =
    "0xe2077d678de929d64d3fcd79c1adfbd23d97324e9bae3a60102d44367fbe008c::bucket_oracle::get_price";

  const MUL_FACTOR_TARGET =
    "0x00db9a10bb9536ab367b7d1ffa404c1d6c55f009076df1139dc108dd86608bbe::bucket_framework::mul_factor";

  // Cetus
  const CETUS_SWAP_TARGET =
    "0x886b3ff4623c7a9d101e0470012e0612621fbc67fa4cedddd3b17b273e35a50e::pool_script::swap_a2b";
  const CETUS_GLOBAL_CONFIG =
    "0xdaa46292632c3c4d8f31f23ea0f9b36a28ff3677e9684980e4438403a67a3d8f";
  const CETUS_BUCK_SUI_POOL =
    "0x9379d2d3f221dcea70f7f7d4a7bf30bab0128bcfda0d13a85267e51f7e6e15c0";


  const tx = new TransactionBlock();
  tx.setSender(address);

  // update oracle
  tx.moveCall({
    target: SWITCHBOARD_UPDATE_TARGET,
    typeArguments: ["0x2::sui::SUI"],
    arguments: [
      tx.object(ORACLE_OBJECT),
      tx.object(CLOCK_OBJECT),
      tx.object(SWITCHBOARD_SUI_AGGREGATOR),
    ],
  });

  // get sui price from oracle
  const [sui_oracle_price, oracle_precision] = tx.moveCall({
    target: ORACLE_GET_PRICE_TARGET,
    typeArguments: ["0x2::sui::SUI"],
    arguments: [tx.object(ORACLE_OBJECT), tx.object(CLOCK_OBJECT)],
  });

  // leverage 3x, init 10 sui
  // calculate buck amount by sui price
  const buck_amount = tx.moveCall({
    target: MUL_FACTOR_TARGET,
    arguments: [
      tx.pure(2 * input_coll * DECIMALS, "u64"),
      sui_oracle_price,
      oracle_precision,
    ],
  });

  // flash borrow buck from tank
  const FLASH_BORROW_BUCK_TARGET =
    `${MAINNET_PACKAGE_ID}::${MODULES.FLASH_BORROW_BUCK}` as Target;
  const [buck_balance, flash_receipt] = tx.moveCall({
    target: FLASH_BORROW_BUCK_TARGET,
    arguments: [tx.object(PROTOCOL_OBJECT), buck_amount],
  });

  // warp balance to coin
  const buck_coin = tx.moveCall({
    target: "0x2::coin::from_balance",
    typeArguments: [BUCK_TYPE],
    arguments: [buck_balance],
  });

  const vec = tx.makeMoveVec({
    objects: [buck_coin],
  });

  // --- CETUS ---
  // swap buck to sui
  tx.moveCall({
    target: CETUS_SWAP_TARGET,
    typeArguments: [BUCK_TYPE, "0x2::sui::SUI"],
    arguments: [
      tx.object(CETUS_GLOBAL_CONFIG),
      tx.object(CETUS_BUCK_SUI_POOL),
      vec,
      tx.pure(true),
      tx.pure(input_coll * DECIMALS),
      tx.pure(0),
      tx.pure(4295048016),
      tx.object("0x6"),
    ],
  });

  const [sui_coin] = tx.splitCoins(tx.gas, [
    tx.pure(leverage * input_coll * DECIMALS),
  ]);
  // unwrap sui coin to balance
  const sui_balance = tx.moveCall({
    target: "0x2::coin::into_balance",
    typeArguments: ["0x2::sui::SUI"],
    arguments: [sui_coin],
  });

  // open position: borrow
  const BORROW_TARGET = `${MAINNET_PACKAGE_ID}::${MODULES.BORROW}` as Target;
  const buck_output_balance = tx.moveCall({
    target: BORROW_TARGET,
    typeArguments: ["0x2::sui::SUI"],
    arguments: [
      tx.object(PROTOCOL_OBJECT),
      tx.object(ORACLE_OBJECT),
      tx.object(CLOCK_OBJECT),
      sui_balance,
      tx.pure(leverage * input_coll * DECIMALS, "u64"),
      tx.pure([]),
    ],
  });

  // repay flashloan
  const REPAY_FLASH_BORROW_TARGET =
    `${MAINNET_PACKAGE_ID}::${MODULES.FLASH_REPAY_BUCK}` as Target;
  tx.moveCall({
    target: REPAY_FLASH_BORROW_TARGET,
    typeArguments: ["0x2::sui::SUI"],
    arguments: [tx.object(PROTOCOL_OBJECT), buck_output_balance, flash_receipt],
  });

  const response = await signer.dryRunTransactionBlock({
    transactionBlock: tx,
  });
  // const response = await signer.signAndExecuteTransactionBlock({
  //   transactionBlock: tx,
  //   options: {
  //     showEffects: true,
  //   },
  // });
  return response;
};

const main = async () => {
  const { address, provider, signer } = getExecStuff();
  let result = await bucket_leverage(address, signer, 1, 3);
  console.log(result);
};

main();
