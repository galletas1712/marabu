import { canonicalize } from "json-canonicalize";
import { logger } from "../logger";
import {
  Block,
  BlockRecord,
  CoinbaseTransaction,
  CoinbaseTransactionRecord,
  NonCoinbaseTransaction,
  NonCoinbaseTransactionRecord,
  Transaction,
  TxOutpoint,
} from "../types/transactions";
import {
  BLOCK_REWARD,
  GENESIS,
  GENESIS_BLOCKID,
  TARGET,
} from "../config";
import { getObjectID, genSignatureNulledTransaction, verifySig } from "./util";
import { ObjectIO } from "./objectio";
import { UTXOIO } from "./utxoio";
import Level from "level-ts";
import { Hex32 } from "../types/primitives";

export enum ObjectValidationResult {
  Rejected,
  ObjectExists,
  NewAndValid
}

export const deriveNewUTXOSet = async (txs: Array<Transaction>, utxoSet: Set<string>): Promise<Set<string> | null> => {
  let currentUTXOSet = new Set(utxoSet);
  for (const tx of txs) {
     if (NonCoinbaseTransactionRecord.guard(tx)) {
       // Verify that all outpoints are unspent
       for (const input of tx.inputs) {
         const outpointHash = getObjectID(input.outpoint);
         if (!currentUTXOSet.has(outpointHash)) {
           logger.warn(`Transaction ${getObjectID(tx)} refers to UTXO not in set/double spend`);
           return null;
         }
         // Remove outpoint from UTXO set
         currentUTXOSet.delete(outpointHash);
       }
     }
     for (let j = 0; j < tx.outputs.length; j++) {
       const outpoint = { txid: getObjectID(tx), index: j } as TxOutpoint
       const outpointHash = getObjectID(outpoint);
       currentUTXOSet.add(outpointHash);
     }
  }
  return currentUTXOSet;
}

export class ObjectManager {
  objectIO: ObjectIO;
  utxoIO: UTXOIO;
  blockHeightDB: Level;
  longestChainTipID: Hex32 | null;

  constructor(objectIO: ObjectIO, utxoIO: UTXOIO, blockHeightDB: Level) {
    this.objectIO = objectIO;
    this.utxoIO = utxoIO;
    this.blockHeightDB = blockHeightDB;
    this.longestChainTipID = null;
  }

  async initWithGenesisBlock() {
    if (getObjectID(GENESIS) !== GENESIS_BLOCKID) {
      throw Error("Get Object ID is invalid: Genesis block id inconsistent");
    }
    if (!(await this.objectIO.objectExists(GENESIS_BLOCKID))) {
      await this.objectIO.storeObject(GENESIS);
    }
    this.utxoIO.storeUTXOSet(GENESIS_BLOCKID, new Set());
    this.blockHeightDB.put(GENESIS_BLOCKID, 0);
  }

  async initLongestChain() {
    const blockHeights = await this.blockHeightDB.stream({});
    for (const { key, value } of blockHeights) {
      if (this.longestChainTipID === null || value > await this.blockHeightDB.get(this.longestChainTipID) ) {
        this.longestChainTipID = key;
      }
    }
  }

  async tryStoreObject(obj: Object): Promise<ObjectValidationResult> {
    if (!(await this.validateObject(obj))) {
      return ObjectValidationResult.Rejected;
    }
    if (await this.objectIO.objectExists(getObjectID(obj))) {
      return ObjectValidationResult.ObjectExists;
    }

    if (BlockRecord.guard(obj)) {
      // Store UTXOs
      const prevUTXOSet = await this.utxoIO.getUTXOSet(obj.previd);
      const blockTxs = await Promise.all(obj.txids.map(async (txid) => (await this.objectIO.getObject(txid)) as Transaction));
      const newUTXOSet = await deriveNewUTXOSet(blockTxs, prevUTXOSet);
      this.utxoIO.storeUTXOSet(getObjectID(obj), newUTXOSet);

      // Store block height
      const blockHeight = (await this.blockHeightDB.get(obj.previd)) + 1;
      this.blockHeightDB.put(getObjectID(obj), blockHeight);

      // Set chain tip if needed
      if (blockHeight > await this.blockHeightDB.get(this.longestChainTipID)) {
        this.longestChainTipID = getObjectID(obj);
      }
    }
    this.objectIO.storeObject(obj);

    return ObjectValidationResult.NewAndValid;
  }

  async validateObject(obj: Object): Promise<boolean> {
    try {
      if (NonCoinbaseTransactionRecord.guard(obj)) {
        return await this.validateNonCoinbaseTransaction(obj);
      } else if (CoinbaseTransactionRecord.guard(obj)) {
        // TODO: validate PoW
        return true;
      } else if (getObjectID(obj) === GENESIS_BLOCKID) {
        return true;
      } else if (BlockRecord.guard(obj)) {
        return await this.validateBlock(obj);
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
    // This function validates without knowledge of whether the outpoints are actually unspent (whether actually UTXOs)
    const nulledTx = genSignatureNulledTransaction(tx);

    let sumInputs = 0;
    let sumOutputs = 0;

    // Check inputs
    for (const input of tx.inputs) {
      // Check outpoint
      if (!(await this.objectIO.objectExists(input.outpoint.txid))) {
        try {
          await this.objectIO.fetchObject(input.outpoint.txid);
        } catch {
          logger.warn(
            `Outpoint's transaction ${input.outpoint.txid} does not exist`
          );
          return false;
        }
      }
      const outpointTx: Transaction = (await this.objectIO.getObject(
        input.outpoint.txid
      )) as Transaction;
      if (input.outpoint.index >= outpointTx.outputs.length) {
        logger.warn(`Outpoint's index ${input.outpoint.index} does not exist`);
        return false;
      }

      const pubkey = outpointTx.outputs[input.outpoint.index].pubkey;
      const sigVerified = await verifySig(
        input.sig,
        canonicalize(nulledTx),
        pubkey
      );
      if (!sigVerified) {
        logger.warn("Invalid signature");
        return false;
      }

      sumInputs += outpointTx.outputs[input.outpoint.index].value;
    }

    for (const output of tx.outputs) {
      sumOutputs += output.value;
    }

    // Check conservation of UTXOs
    if (sumInputs < sumOutputs) {
      logger.warn("UTXO conservation not satisfied");
      return false;
    }

    return true;
  }

  async validateBlock(block: Block): Promise<boolean> {
    // NOTE: Assumes block is not a genesis block
    if (block.T !== TARGET) {
      logger.warn("Wrong target");
      return false;
    }

    if (getObjectID(block).localeCompare(block.T) >= 0) {
      logger.warn("Invalid PoW");
      return false;
    }

    // Fetch transactions if valid
    try {
      await this.objectIO.fetchBlockBody(block);
    } catch (e) {
      logger.warn(e.message);
    }

    let coinbaseTx: CoinbaseTransaction = undefined;
    let fees = 0;
    for (let i = 0; i < block.txids.length; i++) {
      const tx = await this.objectIO.getObject(block.txids[i]);
      if (NonCoinbaseTransactionRecord.guard(tx)) {
        if (!(await this.validateNonCoinbaseTransaction(tx))) {
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
          const outpointTx: Transaction = (await this.objectIO.getObject(
            input.outpoint.txid
          )) as Transaction;
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
        coinbaseTx = tx;
      } else {
        logger.warn("Found invalid transaction in block");
        return false;
      }
    }

    // Conservation of coinbase transaction
    if (
      coinbaseTx !== undefined &&
      coinbaseTx.outputs[0].value > fees + BLOCK_REWARD
    ) {
      logger.warn("Coinbase transaction does not satify conservation");
      return false;
    }

    // Fetch preceding block (implicitly recursively validates)
    if (block.previd === null) {
      logger.warn("Block stops at wrong genesis");
      return false;
    }
    if (block.previd !== GENESIS_BLOCKID && !(await this.objectIO.objectExists(block.previd))) {
      try {
        await this.objectIO.fetchObject(block.previd);
      } catch {
        logger.warn(`Could not fetch preceding block with previd ${block.previd}`);
        return false;
      }
    }

    // Validate block timestamp
    const prevBlock = await this.objectIO.getObject(block.previd) as Block;
    if (block.created >= Date.now() || block.created <= prevBlock.created) {
      logger.warn("Invalid block timestamp");
      return false;
    }

    // Sanity check that the UTXO for the previd exists
    if (!await this.utxoIO.UTXOExists(block.previd)) {
      logger.warn(`Internal error!!! UTXO set does not exist for previd ${block.previd}`);
      return false;
    }

    // Sanity check that the block height for the previd exists
    if (!await this.blockHeightDB.exists(block.previd)) {
      logger.warn(`Internal error!!! Block height does not exist for previd ${block.previd}`);
      return false;
    }

    if (coinbaseTx !== undefined && coinbaseTx.height !== (await this.blockHeightDB.get(block.previd)) + 1) {
      logger.warn("Coinbase transaction has invalid height");
      return false;
    }

    // Let currentUTXOSet be the previous UTXO set (starting from the last unfetched block)
    const prevUTXOSet = await this.utxoIO.getUTXOSet(block.previd);
    const blockTxs = await Promise.all(block.txids.map(async (txid) => (await this.objectIO.getObject(txid)) as Transaction));
    const newUTXOSet = await deriveNewUTXOSet(blockTxs, prevUTXOSet);
    if (newUTXOSet === null) {
      logger.warn("Block has txs inconsistent with UTXO set");
      return false;
    }
    return true;
  }
}
