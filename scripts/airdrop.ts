import { TransactionBlock, RawSigner } from "@mysten/sui.js";
import getExecStuff from "../utils";
import * as dotenv from "dotenv";
dotenv.config();

const airdrop = async (
  recipients: string[],
  amounts: number[],
  address: string,
  signer: RawSigner
) => {
  if (recipients.length !== amounts.length) {
    throw new Error("recipients and amounts must be the same length");
  }

  const tx = new TransactionBlock();
  tx.setSender(address);

  const coins = tx.splitCoins(
    tx.gas,
    amounts.map((amount) => tx.pure(amount))
  );

  recipients.forEach((recipient, index) => {
    tx.transferObjects([coins[index]], tx.pure(recipient));
  });

  const response = await signer.signAndExecuteTransactionBlock({
    transactionBlock: tx,
    options: {
      showEffects: true,
    },
  });

  return response;
};

const main = async () => {
  const { address, provider, signer } = getExecStuff();
  let result;
  let recipients = [
    "0xa0ef9511b68daddc7bf0e0a808fd51e520de472f408f20143b0b728ee0303032",
    "0x0ccfdbdd0660c046dea50953357ef70e611fc1f9a2feb952e9b1f4aa997cfd45",
  ];
  let amounts = [100000000, 100000000];
  result = await airdrop(recipients, amounts, address, signer);
  console.log(JSON.stringify(result));
};

main();
