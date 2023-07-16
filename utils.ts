import {
  Ed25519Keypair,
  JsonRpcProvider,
  testnetConnection,
  mainnetConnection,
  TransactionBlock,
  fromB64,
  RawSigner,
} from "@mysten/sui.js";
import * as dotenv from "dotenv";
dotenv.config();

const getExecStuff = () => {
  const b64PrivateKey = process.env.PK_B64 as string;
  const privkey: number[] = Array.from(fromB64(b64PrivateKey));
  privkey.shift(); // this will be needed to form a signature
  const privateKey = Uint8Array.from(privkey);
  const keypair = Ed25519Keypair.fromSecretKey(privateKey);

  const address = `${keypair.getPublicKey().toSuiAddress()}`;
  const provider = new JsonRpcProvider(mainnetConnection);
  const signer = new RawSigner(keypair, provider);

  return { address, provider, signer };
};

export default getExecStuff;
