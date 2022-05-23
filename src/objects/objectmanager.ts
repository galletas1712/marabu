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
  TransactionRecord,
} from "../types/transactions";
import {
  BLOCK_REWARD,
  GENESIS,
  GENESIS_BLOCKID,
  TARGET,
} from "../config";
import { getObjectID, genSignatureNulledTransaction, verifySig } from "./util";
import { ObjectIO } from "./objectio";
import { ChainManager } from "./chainManager";

export enum ObjectValidationResult {
  Rejected,
  ObjectExists,
  NewAndValid
}

export class ObjectManager {
  objectIO: ObjectIO;
  chainManager: ChainManager;

  constructor(objectIO: ObjectIO, chainManager: ChainManager) {
    this.objectIO = objectIO;
    this.chainManager = chainManager;
  }

  async initWithGenesisBlock() {
    if (getObjectID(GENESIS) !== GENESIS_BLOCKID) {
      throw Error("Get Object ID is invalid: Genesis block id inconsistent");
    }
    if (!(await this.objectIO.objectExists(GENESIS_BLOCKID))) {
      await this.objectIO.storeObject(GENESIS);
    }
    this.chainManager.utxoIO.storeUTXOSet(GENESIS_BLOCKID, new Set());
    this.chainManager.blockHeightDB.put(GENESIS_BLOCKID, 0);
  }

  async tryStoreObject(obj: Object): Promise<ObjectValidationResult> {
    if (!(await this.validateObject(obj))) {
      return ObjectValidationResult.Rejected;
    }
    if (await this.objectIO.objectExists(getObjectID(obj))) {
      return ObjectValidationResult.ObjectExists;
    }

    if (BlockRecord.guard(obj)) {
      // Update block height, UTXOs, and chain tip
      const newUTXOSet = await this.chainManager.getNewUTXOSet(obj);
      if (newUTXOSet !== null) {
        await this.chainManager.utxoIO.storeUTXOSet(getObjectID(obj), newUTXOSet);
      } else {
        logger.warn(`Block ${getObjectID(obj)} has txs inconsistent with previous UTXO set`);
        return ObjectValidationResult.Rejected;
      }
      this.objectIO.storeObject(obj);
      await this.chainManager.newBlock(obj);
    } else {
      if (NonCoinbaseTransactionRecord.guard(obj)) {
        if (!this.objectIO.objectPending(getObjectID(obj))) {
          const addTxResult = this.chainManager.addTxToMempool(obj);
          if (!addTxResult) {
            logger.warn("Failed to add transaction to mempool");
            return ObjectValidationResult.Rejected;
          }
        }
      }
      this.objectIO.storeObject(obj);
    }

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

    let outpointSet = new Set();

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

      //check that transaction does not have multiple input with the same outpoint
      if(outpointSet.has(input.outpoint.txid)){
        return false;
      }
      outpointSet.add(input.outpoint.txid);

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
    if (block.created >= Date.now() / 1000 || block.created <= prevBlock.created) {
      logger.warn("Invalid block timestamp");
      return false;
    }

    // Sanity check that the UTXO for the previd exists
    if (!await this.chainManager.utxoIO.UTXOExists(block.previd)) {
      logger.warn(`Internal error!!! UTXO set does not exist for previd ${block.previd}`);
      return false;
    }

    // Sanity check that the block height for the previd exists
    if (!await this.chainManager.blockHeightDB.exists(block.previd)) {
      logger.warn(`Internal error!!! Block height does not exist for previd ${block.previd}`);
      return false;
    }

    if (coinbaseTx !== undefined && coinbaseTx.height !== (await this.chainManager.blockHeightDB.get(block.previd)) + 1) {
      logger.warn("Coinbase transaction has invalid height");
      return false;
    }

    //Validate that note and miner are ASCII-printable
    function isASCIIPrintable(str){
      //accepts ASCII 20 - 126
      return /^[\x20-\x7E]*$/.test(str);
    }

    if(block.miner !== undefined){ 
      if(!isASCIIPrintable(block.miner) || block.miner.length > 128){
        return false;
      }
    }
    if(block.note !== undefined){
      if(!isASCIIPrintable(block.note) || block.note.length > 128){
        return false;
      }
    }

    // Check UTXO consistency
    if (await this.chainManager.getNewUTXOSet(block) === null) {
      return false;
    }
    return true;
  }
}
