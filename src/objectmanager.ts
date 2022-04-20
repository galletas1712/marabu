import { canonicalize } from "json-canonicalize";
import level from "level-ts";
import sha256 from "fast-sha256";
import * as ed from "@noble/ed25519";
import { EventDispatcher, SignalDispatcher } from "strongly-typed-events";
import { logger } from "./logger";
import {
  Block,
  BlockRecord,
  CoinbaseTransaction,
  CoinbaseTransactionRecord,
  NonCoinbaseTransaction,
  NonCoinbaseTransactionRecord,
  NulledNonCoinbaseTransaction,
  NulledTxInput,
  Transaction,
  TxInput,
} from "./types/transactions";
import { hexTou8 } from "./util";
import { TARGET, TIMEOUT } from "./config";
import { PeerManager } from "./peermanager";
import { GetObjectMsg } from "./types/messages";

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

export class ObjectManager {
  private db: level;
  private cache: Map<string, Object>;
  private peerManager: PeerManager;
  private onReceiveObject: SignalDispatcher;

  constructor(db: level, peerManager: PeerManager) {
    this.db = db;
    this.cache = new Map();
    this.peerManager = peerManager;
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
    const id = getObjectID(obj);
    this.cache.set(id, obj);
    await this.db.put(id, obj);
    this.cache.delete(id);
    await this.onReceiveObject.dispatch();
  }

  async validateObject(obj: Object): Promise<boolean> {
    try {
      if (NonCoinbaseTransactionRecord.guard(obj)) {
        return this.validateNonCoinbaseTransaction(obj);
      } else if (CoinbaseTransactionRecord.guard(obj)) {
        return this.validateCoinbaseTransaction(obj);
      } else if (BlockRecord.guard(obj)) {
        return this.validateBlock(obj);
      }

      // not a valid transaction format; need to return error to node that sent it to us
      return false;
    } catch (err) {
      logger.warn("Validation failed -", err);
      return false;
    }
  }

  async validateNonCoinbaseTransaction(
    tx: NonCoinbaseTransaction
  ): Promise<boolean> {
    const nulledTx = genSignatureNulledTransaction(tx);

    let sumInputs = 0;
    let sumOutputs = 0;

    // Check inputs
    for (const input of tx.inputs) {
      // Check outpoint
      if (!(await this.objectExists(input.outpoint.txid))) {
        return false;
      }
      const outpointTx: Transaction = await this.getObject(input.outpoint.txid);
      if (input.outpoint.index >= outpointTx.outputs.length) {
        return false;
      }

      const pubkey = outpointTx.outputs[input.outpoint.index].pubkey;
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

    for (const output of tx.outputs) {
      sumOutputs += output.value;
    }

    // Check conservation of UTXOs
    if (sumInputs < sumOutputs) {
      return false;
    }

    return true;
  }

  async validateCoinbaseTransaction(tx: CoinbaseTransaction): Promise<boolean> {
    return true;
    // TODO: implement
  }

  async validateBlock(block: Block): Promise<boolean> {
    if (block.T !== TARGET) {
      return false;
    }

    if (getObjectID(block) >= block.T) {
      return false;
    }

    // Fetch transactions if valid
    let fetchTxJobPromises = [];
    for (const txid of block.txids) {
      if (!this.objectExists(txid)) {
        this.peerManager.broadcastMessage({type: "getobject", objectid: txid} as GetObjectMsg);
        fetchTxJobPromises.push(new Promise<Transaction>((resolve, reject) => {
          this.onReceiveObject.subscribe(async () => {
            // Can simply use objectExists because we validate the transaction before storage
            if (this.objectExists(txid)) {
              return resolve(await this.getObject(txid));
            }
          });
          setTimeout(() => {
            if (!this.objectExists(txid)) {
              logger.warn("Could not fetch valid transaction", txid);
              return reject();
            }
          }, TIMEOUT);
        }));
      }
    }
    try {
      await Promise.all(fetchTxJobPromises);
    } catch {
      logger.warn("Could not verify transactions because fetching failed or transactions are invalid");
      return false;
    }

    // TODO: Update UTXO set and check for consistency

    return true;
  }
}
