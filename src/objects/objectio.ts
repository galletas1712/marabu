import level from "level-ts";
import { PeerManager } from "../peermanager";
import { Hex32, Hex64 } from "../types/primitives";
import { logger } from "../logger";
import { SignalDispatcher } from "strongly-typed-events";
import { getObjectID } from "./util";
import { GetObjectMsg } from "../types/messages";
import { TIMEOUT } from "../config";
import { Block } from "../types/transactions";

export class ObjectIO {
  private db: level;
  private peerManager: PeerManager;
  private cache: Map<Hex32, Object> = new Map();
  private onReceiveObject: Map<Hex32, SignalDispatcher> = new Map();

  constructor(db: level, peerManager: PeerManager) {
    this.db = db;
    this.peerManager = peerManager;
  }

  async objectExists(objID: Hex32): Promise<boolean> {
    return this.cache.has(objID) || (await this.db.exists(objID));
  }

  async getObject(objID: Hex32): Promise<Object> {
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
    await this.notifyObjectArrived(obj);
  }

  async fetchObject(id: Hex32): Promise<Object> {
    this.signalFetch(id);
    return new Promise<Object>((resolve, reject) => {
      this.createListener(id).subscribe(async () => {
        // Can simply use objectExists because we validate the transaction before storage
        if (await this.objectExists(id)) {
          this.destroyListener(id);
          return resolve((await this.getObject(id)) as Object);
        }
      });
      setTimeout(async () => {
        if (!(await this.objectExists(id))) {
          return reject();
        }
      }, TIMEOUT);
    });
  }

  async notifyObjectArrived(obj: Object) {
    const id = getObjectID(obj);
    if (this.onReceiveObject.has(id)) {
      await this.onReceiveObject.get(id).dispatch();
      logger.debug(`Requested object ${id} arrived`);
    }
  }

  signalFetch(objectid: Hex32) {
    logger.debug(`Requesting object ${objectid}`);
    this.peerManager.broadcastMessage({
      type: "getobject",
      objectid: objectid,
    } as GetObjectMsg);
  }

  createListener(objectid: Hex32): SignalDispatcher {
    const signalDispatcher = new SignalDispatcher();
    this.onReceiveObject.set(objectid, signalDispatcher);
    return signalDispatcher;
  }

  destroyListener(objectid: Hex32) {
    if (this.onReceiveObject.has(objectid)) {
      const signalDispatcher = this.onReceiveObject.get(objectid);
      signalDispatcher.clear();
      this.onReceiveObject.delete(objectid);
    } else {
      logger.warn("Dispatcher does not exist for", objectid);
    }
  }

  async fetchBlockBody(block: Block): Promise<void> {
    for (const txid of block.txids) {
      if (!(await this.objectExists(txid))) {
        try {
          await this.fetchObject(txid);
        } catch {
          throw Error(`Could not fetch valid transaction ${txid}`);
        }
      }
    }
  }
}
