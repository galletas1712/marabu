import assert from "assert";
import Level from "level-ts";
import { GENESIS_BLOCKID } from "../config";
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

  // TODO: mempool cache and operations
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

  async newBlock(block: Block) {
      const newUTXOSet = await this.getNewUTXOSet(block);
      if (newUTXOSet !== null) {
        this.utxoIO.storeUTXOSet(getObjectID(block), newUTXOSet);
      } else {
        logger.warn(`Block ${getObjectID(block)} has txs inconsistent with previous UTXO set`);
      }

      // Store block height
      const blockHeight = (await this.blockHeightDB.get(block.previd)) + 1;
      this.blockHeightDB.put(getObjectID(block), blockHeight);

      // Set chain tip if needed
      if (blockHeight > await this.blockHeightDB.get(this.longestChainTipID)) {
        this.longestChainTipID = getObjectID(block);
      }
  }

  async getNewUTXOSet(block: Block): Promise<Set<Hex32> | null> {
      const prevUTXOSet = await this.utxoIO.getUTXOSet(block.previd);
      const blockTxs = await Promise.all(block.txids.map(async (txid) => (await this.objectIO.getObject(txid)) as Transaction));
      const newUTXOSet = await deriveNewUTXOSet(blockTxs, prevUTXOSet);
      return newUTXOSet;
  }

  async getMempool(): Promise<Array<Hex32>> {
    // TODO: fill
    return [];
  }

  async getReorgData(oldBlockID: Hex32, newBlockID: Hex32): Promise<Array<Block>> {
    // TODO: remove or else crash!
    assert(await this.blockHeightDB.get(oldBlockID) > await this.blockHeightDB.get(newBlockID));
    let seenBlocks = new Set<Hex32>();
    let newBlocks: Array<Block> = [];

    let commonPrefix = null;
    let block1 = await this.objectIO.getObject(oldBlockID) as Block;
    let block2 = await this.objectIO.getObject(newBlockID) as Block;
    while (getObjectID(block1) !== GENESIS_BLOCKID || getObjectID(block2) !== GENESIS_BLOCKID) {
      seenBlocks.add(getObjectID(block1));
      if (seenBlocks.has(getObjectID(block2))) {
        commonPrefix = getObjectID(block2);
        break;
      }
      newBlocks.push(block2);
      block1 = await this.objectIO.getObject(block1.previd) as Block;
      block2 = await this.objectIO.getObject(block2.previd) as Block;
    }

    let oldTxs = [];
    let block = await this.objectIO.getObject(oldBlockID) as Block;
    while (getObjectID(block) !== commonPrefix) {
      for (const txid of block.txids) {
        oldTxs.push(txid);
      }
      block = await this.objectIO.getObject(block.previd) as Block;
    }

    return newBlocks.reverse();
  }
}