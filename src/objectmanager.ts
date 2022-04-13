import { canonicalize } from "json-canonicalize";
import level from "level-ts";
import sha256 from "fast-sha256";
import * as ed from "@noble/ed25519";
import { logger } from "./logger";
import {
  BlockRecord,
  CoinbaseTransactionRecord,
  NonCoinbaseTransaction,
  NonCoinbaseTransactionRecord,
  NulledNonCoinbaseTransaction,
  NulledTxInput,
  Transaction,
  TransactionRecord,
  TxInput,
} from "./types/transactions";
import { hexTou8 } from "./util";

export const getObjectID = (obj: Object): string => {
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
  sig: string,
  msg: string,
  pubkey: string
): Promise<boolean> => {
  const sig_u8 = hexTou8(sig);
  const pubkey_u8 = hexTou8(pubkey);

  const encoder = new TextEncoder();
  const msg_u8 = encoder.encode(msg);
  return ed.verify(sig_u8, msg_u8, pubkey_u8);
};

export const isValidHex = (
  hexString: string,
  expectedLength: number
): boolean => {
  for (let i = 0; i < hexString.length; i++) {
    if (
      !(
        (hexString[i] >= "0" && hexString[i] <= "9") ||
        (hexString[i] >= "a" && hexString[i] <= "f")
      )
    ) {
      return false;
    }
  }
  return (
    hexString.length === expectedLength && hexString.toLowerCase() === hexString
  );
};

export class ObjectManager {
  private db: level;
  private cache: Map<string, Object>;

  constructor(db: level) {
    this.db = db;
    this.cache = new Map();
  }

  async objectExists(objID: string) {
    return this.cache.has(objID) || this.db.exists(objID);
  }

  async getObject(objID: string) {
    if (this.cache.has(objID)) {
      return this.cache.get(objID);
    }
    return this.db.get(objID);
  }

  async storeObject(obj: Object) {
    this.cache.set(getObjectID(obj), obj);
    await this.db.put(getObjectID(obj), obj);
    this.cache.delete(getObjectID(obj));
  }

  async validateObject(obj: Object): Promise<boolean> {
    try {
      if (NonCoinbaseTransactionRecord.guard(obj)) {
        const nulledTx = genSignatureNulledTransaction(obj);

        let sumInputs = 0;
        let sumOutputs = 0;

        // Check inputs
        for (const input of obj.inputs) {
          // Check outpoint
          if (!(await this.objectExists(input.outpoint.txid))) {
            return false;
          }
          const outpointTx: Transaction = await this.getObject(
            input.outpoint.txid
          );
          if (input.outpoint.index >= outpointTx.outputs.length) {
            return false;
          }

          // Check signature
          if (!isValidHex(input.sig, 128)) {
            return false;
          }
          const pubkey = outpointTx.outputs[input.outpoint.index].pubkey;
          if (!isValidHex(pubkey, 64)) {
            throw Error("Outpoint public key is invalid");
          }

          const sigVerified = await verifySig(
            input.sig,
            canonicalize(nulledTx),
            pubkey
          );
          if (!sigVerified) {
            return false;
          }

          sumInputs += outpointTx.outputs[input.outpoint.index].value;
        }

        // Check outputs: pubkey is valid format and value is non-negative
        for (const output of obj.outputs) {
          if (!isValidHex(output.pubkey, 64) || output.value < 0) {
            return false;
          }
          sumOutputs += output.value;
        }

        // Check conservation of UTXOs
        if (sumInputs != sumOutputs) {
          return false;
        }

        return true;
      } else if (CoinbaseTransactionRecord.guard(obj)) {
        return true;
      } else if (BlockRecord.guard(obj)) {
        return true;
      }

      //not a valid transaction format; need to return error to node that sent it to us
      return false;
    } catch (err) {
      console.log("Validation failed" + err);
      return false;
    }
  }
}
