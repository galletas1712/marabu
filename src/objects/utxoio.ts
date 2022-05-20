import level from "level-ts";
import { Hex32 } from "../types/primitives";

export class UTXOIO {
  private db: level;
  private cache: Map<Hex32, Set<Hex32>> = new Map();
  
  constructor(db: level) {
    this.db = db;
  }

  async UTXOExists(blockid: Hex32): Promise<boolean> {
    return this.cache.has(blockid) || (await this.db.exists(blockid));
  }

  async getUTXOSet(blockid: Hex32): Promise<Set<Hex32> > {
    if (this.cache.has(blockid)) {
      return this.cache.get(blockid);
    }
    let blockArray = await this.db.get(blockid);
    return new Set(blockArray);
  }

  async storeUTXOSet(blockid: Hex32, utxoSet: Set<Hex32>) {
    this.cache.set(blockid, utxoSet);
    await this.db.put(blockid, Array.from(utxoSet));
    this.cache.delete(blockid);
  }
}