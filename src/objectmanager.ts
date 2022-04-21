import { canonicalize } from "json-canonicalize";
import level from "level-ts";
import sha256 from "fast-sha256";
import * as ed from "@noble/ed25519";
import { SignalDispatcher } from "strongly-typed-events";
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
  TransactionRecord,
  TxInput,
  TxOutpoint,
} from "./types/transactions";
import { hexTou8 } from "./util";
import { BLOCK_REWARD, GENESIS, GENESIS_BLOCKID, TARGET, TIMEOUT } from "./config";
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

export class ObjectFetcher {
  private peerManager: PeerManager;
  private onReceiveObject: Map<string, SignalDispatcher> = new Map();

  constructor(peerManager: PeerManager) {
    this.peerManager = peerManager;
  }

  async notifyObjectArrived(obj: Object) {
    const id = getObjectID(obj);
    if (this.onReceiveObject.has(id)) {
      await this.onReceiveObject.get(id).dispatch();
      logger.debug(`Requested object ${id} arrived`)
    }
  }

  signalFetch(objectid: string) {
    logger.debug(`Requesting object ${objectid}`);
    this.peerManager.broadcastMessage({type: "getobject", objectid: objectid} as GetObjectMsg);
  }

  createListener(objectid: string): SignalDispatcher {
    const signalDispatcher = new SignalDispatcher();
    this.onReceiveObject.set(objectid, signalDispatcher);
    return signalDispatcher;
  }

  destroyListener(objectid: string) {
    const signalDispatcher = this.onReceiveObject.get(objectid);
    signalDispatcher.clear();
    this.onReceiveObject.delete(objectid);
  }
}

export class ObjectManager {
  private db: level;
  private dbUTXO: level;
  private objectFetcher: ObjectFetcher;
  private cache: Map<string, Object> = new Map();
  private cacheUTXO: Map<string, Map<string, TxOutpoint> > = new Map();

  constructor(db: level, dbUTXO: level, objectFetcher: ObjectFetcher) {
    this.db = db;
    this.dbUTXO = dbUTXO;
    this.objectFetcher = objectFetcher;
  }

  async initWithGenesisBlock() {
    if (getObjectID(GENESIS) !== GENESIS_BLOCKID) {
      console.log(getObjectID(GENESIS));
      console.log(GENESIS_BLOCKID);
      throw Error("Get Object ID is invalid: Genesis block id inconsistent");
    }
    if (!await this.objectExists(GENESIS_BLOCKID)) {
      await this.storeObject(GENESIS);
    }
    this.storeUTXOSet(GENESIS_BLOCKID, new Map());
  }

  async UTXOExists(blockid: string): Promise<boolean> {
    return this.cacheUTXO.has(blockid) || await this.dbUTXO.exists(blockid);
  }

  async getUTXOSet(blockid: string): Promise<Map<string, TxOutpoint>> {
    if (this.cacheUTXO.has(blockid)) {
      return this.cacheUTXO.get(blockid);
    }
    let result = new Map();
    for (const outpoint of await this.dbUTXO.get(blockid)) {
      result.set(getObjectID(outpoint), outpoint);
    }
    return result;
  }

  async storeUTXOSet(blockid: string, utxoSet: Map<string, TxOutpoint>) {
    this.cacheUTXO.set(blockid, utxoSet);
    await this.dbUTXO.put(blockid, Array.from(utxoSet));
    this.cacheUTXO.delete(blockid);
  }

  async objectExists(objID: string): Promise<boolean> {
    return this.cache.has(objID) || await this.db.exists(objID);
  }

  async getObject(objID: string): Promise<Object> {
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
    await this.objectFetcher.notifyObjectArrived(obj);
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
      } else if (getObjectID(obj) === GENESIS_BLOCKID) {
        return true;
      } else {
        // not a valid transaction format; need to return error to node that sent it to us
        return false;
      }

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
      const outpointTx: Transaction = await this.getObject(input.outpoint.txid) as Transaction;
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
    // if (block.T !== TARGET) {
    //   return false;
    // }

    if (getObjectID(block).localeCompare(block.T) >= 0) {
      return false;
    }

    // Fetch transactions if valid
    for (const txid of block.txids) {
      if (!await this.objectExists(txid)) {
        try {
          await this.fetchObject(txid);
          logger.debug("SUCCESS!!!\n");
        } catch {
          logger.warn("Could not fetch valid transaction", txid);
          return false;
        }
      }
    }

    let coinbaseTx: CoinbaseTransaction = undefined;
    let fees = 0;
    for (let i = 0; i < block.txids.length; i++) {
      const tx = await this.getObject(block.txids[i]);
      if (NonCoinbaseTransactionRecord.guard(tx)) {
        if (!await this.validateNonCoinbaseTransaction(tx)) {
          logger.warn("Found invalid non coinbase transaction in block");
          return false;
        }

        // Check if coinbase transaction is used in the same block
        if (coinbaseTx !== undefined) {
          for (const input of tx.inputs) {
            if (input.outpoint.txid == getObjectID(coinbaseTx)) {
              logger.warn("Coinbase transaction used in same block");
              return false;
            }
          }
        }
        
        // Accumulate fees
        for (const input of tx.inputs) {
          const outpointTx: Transaction = await this.getObject(input.outpoint.txid) as Transaction;
          fees += outpointTx.outputs[input.outpoint.index].value;
        }
        for (const output of tx.outputs) {
          fees -= output.value;
        }
      } else if (CoinbaseTransactionRecord.guard(tx)) {
        if (i != 0) {
          logger.warn("Coinbase transaction appears outside of index 0");
          return false;
        }
      } else {
        logger.warn("Found invalid transaction in block");
        return false;
      }
    }
    
    // Conservation of coinbase transaction
    if (coinbaseTx !== undefined && coinbaseTx.outputs[0].value > fees + BLOCK_REWARD) {
      logger.warn("Coinbase transaction does not satify conservation");
      return false;
    }

    //block is invalid if we don't have the previous UTXO, per piazza post
    if(!(await this.UTXOExists(block.previd))){
      logger.warn("Could not find UTXO set corresponding to previd in database");
      return false;
    }

    // let UTXO set be previous UTXO set
    let currentUTXOSet = await this.getUTXOSet(block.previd);

    for (const txid of block.txids) {
      const tx: Transaction = await this.getObject(txid) as Transaction; //should be validated based on previous code; Schwinn pls confirm

      if (NonCoinbaseTransactionRecord.guard(tx)) {
        //verifying that all outpoints are unspent
        for(const input of tx.inputs){
          if (!currentUTXOSet.has(getObjectID(input.outpoint))) {
            logger.warn("Transaction refers to UTXO not in set/double spend");
            return false;
          }
            //remove outpoint from UTXO set
          currentUTXOSet.delete(getObjectID(input.outpoint));
        }
      }

      //add one output tuple per each item in outputs
      for(let j = 0; j < tx.outputs.length; j++){
        //do we need to perform any outpoint value checks here?
        const outpoint = { txid: txid, index: j};
        currentUTXOSet.set(getObjectID(outpoint), outpoint);
      }
    }
    
    this.storeUTXOSet(getObjectID(block), currentUTXOSet);
    return true;
  }

  async fetchObject(id: string): Promise<Object> {
    this.objectFetcher.signalFetch(id);
    return new Promise<Transaction>((resolve, reject) => {
      this.objectFetcher.createListener(id).subscribe(async () => {
        // Can simply use objectExists because we validate the transaction before storage
        if (await this.objectExists(id)) {
          this.objectFetcher.destroyListener(id);
          return resolve(await this.getObject(id) as Transaction);
        }
      });
      setTimeout(async () => {
        if (!await this.objectExists(id)) {
          return reject();
        }
      }, TIMEOUT);
    });
  }
}
