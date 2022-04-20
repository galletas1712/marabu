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
import { BLOCK_REWARD, TARGET, TIMEOUT } from "./config";
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
  private dbUTXO: level;
  private cache: Map<string, Object>;
  private cacheUTXO: Map<string, Array<[String, Number]>>;
  private peerManager: PeerManager;
  private onReceiveObject: SignalDispatcher;

  constructor(db: level, dbUTXO: level, peerManager: PeerManager) {
    this.db = db;
    this.dbUTXO = db;
    this.cache = new Map();
    this.cacheUTXO = new Map();
    this.peerManager = peerManager;
  }

  async UTXOExists(blockid: string){
    return this.cacheUTXO.has(blockid) || this.dbUTXO.exists(blockid);
  }

  async getUTXO(blockid: string){
    if (this.cacheUTXO.has(blockid)) {
      return this.cacheUTXO.get(blockid);
    }
    return this.dbUTXO.get(blockid);
  }

  async storeUTXO(previd: string, utxoSet: Array<[String, Number]>){
    this.cacheUTXO.set(previd, utxoSet);
    await this.dbUTXO.put(previd,utxoSet);
    this.cacheUTXO.delete(previd);
    await this.onReceiveObject.dispatch();
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
        // NOTE: we will validate with the block in a later assignment
        return true;
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

    let coinbaseTx: CoinbaseTransaction = undefined;
    let fees = 0;
    for (let i = 0; i < block.txids.length; i++) {
      const tx = await this.getObject(block.txids[i]);
      if (NonCoinbaseTransactionRecord.guard(tx)) {
        if (!await this.validateNonCoinbaseTransaction(tx)) {
          return false;
        }
        
        // Accumulate fees
        for (const input of tx.inputs) {
          const outpointTx: Transaction = await this.getObject(input.outpoint.txid);
          fees += outpointTx.outputs[input.outpoint.index].value;
        }
        for (const output of tx.outputs) {
          fees -= output.value;
        }
      } else if (CoinbaseTransactionRecord.guard(tx)) {
        if (i != 0) {
          return false;
        }
      } else {
        return false;
      }
    }
    
    // Conservation of coinbase transaction
    if (coinbaseTx !== undefined && coinbaseTx.outputs[0].value > fees + BLOCK_REWARD) {
      return false;
    }

    // TODO: Update UTXO set and check for consistency

    //block is invalid if we don't have the previous UTXO, per piazza post
    if(!(await this.UTXOExists(block.previd))){
      return false;
    }

    // let UTXO set be previous UTXO set
    let currentUTXO = await this.getUTXO(block.previd);

    for (let i = 0; i < block.txids.length; i++) {
      const tx = await this.getObject(block.txids[i]); //should be validated based on previous code; Schwinn pls confirm

      //verifying that all outpoints are unspent
      for(const input of tx.input){
        const outpointTuple = input["outpoint"];        
        if(!currentUTXO.contains(outpointTuple)){
          return false;
        } else{
          //remove outpoint from UTXO set
          currentUTXO.remove(outpointTuple);
        }
      }
      
      //add one output tuple per each item in outputs
      for(let j = 0; j < tx.output.length; j++){
        //do we need to perform any outpoint value checks here?
        currentUTXO.add([block.txids[i], j]); //adds a tuple of the form (txid, index); don't need to keep track of value because that's covered during next txn validation anyway
      }
    }
    
    await this.storeUTXO(getObjectID(block), currentUTXO)
    return true;
  }

}
