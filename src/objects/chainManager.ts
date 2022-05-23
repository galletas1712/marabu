import assert from "assert";
import Level from "level-ts";
import { GENESIS, GENESIS_BLOCKID } from "../config";
import { logger } from "../logger";
import { Hex32 } from "../types/primitives";
import { Block, NonCoinbaseTransactionRecord, Transaction, TxOutpoint } from "../types/transactions";
import { ObjectIO } from "./objectio";
import { getObjectID } from "./util";
import { UTXOIO } from "./utxoio";

export const deriveNewUTXOSet = async (txs: Array<Transaction>, utxoSet: Set<Hex32>): Promise<Set<Hex32> | null> => {
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

export class ChainManager {
  longestChainTipID: Hex32 | null;
  objectIO: ObjectIO;
  utxoIO: UTXOIO;
  blockHeightDB: Level;
  mempoolDB: Level;
  mempoolUTXOSet: Set<Hex32> = new Set();

  constructor (objectIO: ObjectIO, utxoIO: UTXOIO, blockHeightDB: Level, mempoolDB: Level) {
    this.longestChainTipID = null;
    this.objectIO = objectIO;
    this.utxoIO = utxoIO;
    this.blockHeightDB = blockHeightDB;
    this.mempoolDB = mempoolDB;
  }

  async initLongestChain() {
    const blockHeights = await this.blockHeightDB.stream({});
    for (const { key, value } of blockHeights) {
      if (this.longestChainTipID === null || value > await this.blockHeightDB.get(this.longestChainTipID) ) {
        this.longestChainTipID = key;
      }
    }
  }

  async resetMempool(prefixID?: Hex32, prependTxs?: Array<Transaction>) {
    this.mempoolUTXOSet = prefixID === undefined ? new Set<Hex32>() : await this.utxoIO.getUTXOSet(prefixID);
    const prevMempool = await this.getMempool();
    for (const [txid, _] of prevMempool) {
      this.mempoolDB.del(txid);
    }
    if (prependTxs !== undefined) {
      for (const tx of prependTxs) {
        await this.addTxToMempool(tx);
      }
    }
    for (const [_, tx] of prevMempool) {
      await this.addTxToMempool(tx);
    }
  }

  async newBlock(block: Block) {
    // NOTE: Assumes block has already been validated

    // Store block height
    const blockHeight = (await this.blockHeightDB.get(block.previd)) + 1;
    await this.blockHeightDB.put(getObjectID(block), blockHeight);

    // Set chain tip if needed
    if (this.longestChainTipID === null || blockHeight > await this.blockHeightDB.get(this.longestChainTipID)) {
      if (this.longestChainTipID !== null) { // Reorg/append
        const [oldTxIDs, newBlocks] = await this.getReorgData(this.longestChainTipID, getObjectID(block));
        const oldTxs = await Promise.all(oldTxIDs.map(async (txid) => await this.objectIO.getObject(txid) as Transaction));

        // Remove mempool txs present in new chain
        for (const predBlock of newBlocks) {
          for (const txid of predBlock.txids) {
            if (this.mempoolDB.exists(txid)) {
              await this.mempoolDB.del(txid);
            }
          }
        }

        // Reset mempool UTXO state and filter mempool txs to that of the new chain tip and add in other chain's txs
        await this.resetMempool(getObjectID(block), oldTxs);
      } else {
        // Remove mempool txs present in the chain
        let tmpBlock = block;
        while (getObjectID(tmpBlock) !== GENESIS_BLOCKID) {
          for (const txid of tmpBlock.txids) {
            if (this.mempoolDB.exists(txid)) {
              await this.mempoolDB.del(txid);
            }
          }
          tmpBlock = await this.objectIO.getObject(tmpBlock.previd) as Block;
        }

        await this.resetMempool(getObjectID(block));
      }
      this.longestChainTipID = getObjectID(block);
    }
  }

  async addTxToMempool(tx: Transaction): Promise<boolean> {
    const newUTXOSet = await deriveNewUTXOSet([tx], await this.mempoolUTXOSet);
    if (newUTXOSet !== null) {
      this.mempoolDB.put(getObjectID(tx), tx);
      return true;
    }
    return false;
  }

  async getNewUTXOSet(block: Block): Promise<Set<Hex32> | null> {
      const prevUTXOSet = await this.utxoIO.getUTXOSet(block.previd);
      const blockTxs = await Promise.all(block.txids.map(async (txid) => (await this.objectIO.getObject(txid)) as Transaction));
      const newUTXOSet = await deriveNewUTXOSet(blockTxs, prevUTXOSet);
      return newUTXOSet;
  }

  async getMempool(): Promise<Array<[Hex32, Transaction]>> {
    const entries = await this.mempoolDB.stream({});
    let result = [];
    for (const { key, value } of entries) {
      result.push([key, value])
    }
    return result;
  }

  async getReorgData(oldBlockID: Hex32, newBlockID: Hex32): Promise<[Array<Hex32>, Array<Block>]> {
    // TODO: remove or else crash!
    assert(await this.blockHeightDB.get(oldBlockID) <= await this.blockHeightDB.get(newBlockID));
    let seenBlocks = new Set<Hex32>();
    let newBlocks: Array<Block> = [];

    let commonPrefix = null;
    let block1 = await this.objectIO.getObject(oldBlockID) as Block;
    let block2 = await this.objectIO.getObject(newBlockID) as Block;
    while (getObjectID(block1) !== GENESIS_BLOCKID || getObjectID(block2) !== GENESIS_BLOCKID) {
      seenBlocks.add(getObjectID(block1));
      if (seenBlocks.has(getObjectID(block2))) {
        commonPrefix = block2;
        break;
      }
      newBlocks.push(block2);
      if (getObjectID(block1) !== GENESIS_BLOCKID) {
        block1 = await this.objectIO.getObject(block1.previd) as Block;
      }
      block2 = await this.objectIO.getObject(block2.previd) as Block;
    }
    newBlocks.reverse();
    if (commonPrefix === null) {
      commonPrefix = GENESIS;
    }

    let oldBlocks: Array<Block> = [];
    let oldTxs: Array<Hex32> = [];
    let block = await this.objectIO.getObject(oldBlockID) as Block;
    while (getObjectID(block) !== getObjectID(commonPrefix)) {
      oldBlocks.push(block);
      block = await this.objectIO.getObject(block.previd) as Block;
    }
    oldBlocks.reverse();
    for (const block of oldBlocks) {
      for (const txid of block.txids) {
        oldTxs.push(txid);
      }
    }

    return [oldTxs, newBlocks];
  }
}