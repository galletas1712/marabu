import { canonicalize } from "json-canonicalize";
import sha256 from "fast-sha256";
import * as ed from "@noble/ed25519";
import { Hex32, Hex64 } from "../types/primitives";
import { hexTou8 } from "../util";
import {
  NonCoinbaseTransaction,
  NulledNonCoinbaseTransaction,
  NulledTxInput,
  TxInput,
} from "../types/transactions";

export const getObjectID = (obj: Object): Hex32 => {
  const encoder = new TextEncoder();
  return Buffer.from(sha256(encoder.encode(canonicalize(obj)))).toString("hex");
};

export const genSignatureNulledTransaction = (
  tx: NonCoinbaseTransaction
): NulledNonCoinbaseTransaction => {
  return {
    type: "transaction",
    inputs: tx.inputs.map((input: TxInput): NulledTxInput => {
      return {
        outpoint: input.outpoint,
        sig: null,
      };
    }),
    outputs: tx.outputs,
  };
};

export const verifySig = async (
  sig: Hex64,
  msg: string,
  pubkey: Hex32
): Promise<boolean> => {
  const sig_u8 = hexTou8(sig);
  const pubkey_u8 = hexTou8(pubkey);

  const encoder = new TextEncoder();
  const msg_u8 = encoder.encode(msg);
  return ed.verify(sig_u8, msg_u8, pubkey_u8);
};
