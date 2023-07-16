import {
  TransactionBlock,
  Inputs,
  RawSigner,
  Ed25519Keypair,
  JsonRpcProvider,
} from "@mysten/sui.js";
import getExecStuff from "../utils";
import * as dotenv from "dotenv";
import {
  MAINNET_PROTOCOL_ID,
  MAINNET_PACKAGE_ID,
  BUCK_TYPE,
  MODULES,
  PROTOCOL_OBJECT,
  SWITCHBOARD_UPDATE_TARGET,
  ORACLE_OBJECT,
  CLOCK_OBJECT,
  SWITCHBOARD_SUI_AGGREGATOR,
  ORACLE_GET_PRICE_TARGET,
  MUL_FACTOR_TARGET,
  DECIMALS,
  CETUS_BUCK_SUI_POOL,
  CETUS_GLOBAL_CONFIG,
  CETUS_SWAP_TARGET,
} from "../constants";
dotenv.config();

type Target = `${string}::${string}::${string}`;

const bucket_leverage = async (
  address: string,
  signer: RawSigner,
  input_coll: number,
  leverage: number
) => {

  const tx = new TransactionBlock();
  tx.setSender(address);

  // 0: update oracle
  tx.moveCall({
    target: SWITCHBOARD_UPDATE_TARGET,
    typeArguments: ["0x2::sui::SUI"],
    arguments: [
      tx.object(ORACLE_OBJECT),
      tx.object(CLOCK_OBJECT),
      tx.object(SWITCHBOARD_SUI_AGGREGATOR),
    ],
  });

  // 1: get sui price from oracle
  const [sui_oracle_price, oracle_precision] = tx.moveCall({
    target: ORACLE_GET_PRICE_TARGET,
    typeArguments: ["0x2::sui::SUI"],
    arguments: [tx.object(ORACLE_OBJECT), tx.object(CLOCK_OBJECT)],
  });

  // leverage 3x, init 10 sui
  // 2: calculate buck amount by sui price
  const buck_amount = tx.moveCall({
    target: MUL_FACTOR_TARGET,
    arguments: [
      tx.pure(2 * input_coll * DECIMALS, "u64"),
      sui_oracle_price,
      oracle_precision,
    ],
  });

  // 3: flash borrow buck from tank
  const FLASH_BORROW_BUCK_TARGET = `${MAINNET_PACKAGE_ID}::${MODULES.FLASH_BORROW_BUCK}` as Target;
  const [buck_balance, flash_receipt] = tx.moveCall({
    target: FLASH_BORROW_BUCK_TARGET,
    typeArguments: ["0x2::sui::SUI"],
    arguments: [tx.object(PROTOCOL_OBJECT), buck_amount],
  });
  
  // 4: get buck balance value
  const buck_balance_value = tx.moveCall({
    target: "0x2::balance::value",
    typeArguments: [BUCK_TYPE],
    arguments: [buck_balance],
  });
  
  // /*
  // 4: warp balance to coin
  const buck_coin = tx.moveCall({
    target: "0x2::coin::from_balance",
    typeArguments: [BUCK_TYPE],
    arguments: [buck_balance],
  });

  const vec = tx.makeMoveVec({
    objects: [buck_coin],
  });

  // --- CETUS ---
  // 5: swap buck to sui
  tx.moveCall({
    target: CETUS_SWAP_TARGET,
    typeArguments: [BUCK_TYPE, "0x2::sui::SUI"],
    arguments: [
      tx.object(CETUS_GLOBAL_CONFIG),
      tx.object(CETUS_BUCK_SUI_POOL),
      vec,
      tx.pure(true),
      buck_balance_value,
      tx.pure(0),
      tx.pure(4295048016),
      tx.object("0x6"),
    ],
  });

  const [sui_coin] = tx.splitCoins(tx.gas, [
    tx.pure(leverage * input_coll * DECIMALS),
  ]);
  // 6: unwrap sui coin to balance
  const sui_balance = tx.moveCall({
    target: "0x2::coin::into_balance",
    typeArguments: ["0x2::sui::SUI"],
    arguments: [sui_coin],
  });

  // calculate buck borrow amount
  // console.log(Math.floor(leverage * input_coll * DECIMALS / 1.8));
  const borrow_buck_amount = tx.moveCall({
    target: MUL_FACTOR_TARGET,
    arguments: [
      tx.pure(Math.floor(leverage * input_coll * DECIMALS / 1.2), "u64"),
      sui_oracle_price,
      oracle_precision,
    ],
  });
  
  // 7: open position: borrow
  const BORROW_TARGET = `${MAINNET_PACKAGE_ID}::${MODULES.BORROW}` as Target;
  const buck_output_balance = tx.moveCall({
    target: BORROW_TARGET,
    typeArguments: ["0x2::sui::SUI"],
    arguments: [
      tx.object(PROTOCOL_OBJECT),
      tx.object(ORACLE_OBJECT),
      tx.object(CLOCK_OBJECT),
      sui_balance,
      borrow_buck_amount,
      tx.pure([]),
    ],
  });

  // 8: repay flashloan
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
  let result = await bucket_leverage(address, signer, 10, 3);
  console.log(result);
};

main().then(console.log).catch(console.error);
