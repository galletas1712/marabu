import * as semver from "semver";
import { ACCEPTABLE_VERSIONS } from "./config";
import { logger } from "./logger";
import {
  HelloMsg,
  GetPeersMsg,
  Message,
  MessageRecord,
  PeersMsg,
  IHaveObjectMsg,
  GetObjectMsg,
  ObjectMsg,
  GetChainTipMessage,
  ChainTipMessage,
} from "./types/messages";
import { ObjectManager, ObjectValidationResult } from "./objects/objectmanager";
import { getObjectID } from "./objects/util";
import { PeerManager } from "./peermanager";
import { ConnectedSocketIO } from "./socketio";
import { maxHeaderSize } from "http";

export class PeerHandler {
  connIO: ConnectedSocketIO;
  finishedHandshake: boolean;
  peerManager: PeerManager;
  objectManager: ObjectManager;
  selfHostWithPort: string;

  constructor(
    connIO: ConnectedSocketIO,
    peerManager: PeerManager,
    objectManager: ObjectManager,
    selfHostWithPort: string
  ) {
    this.connIO = connIO;
    this.finishedHandshake = false;
    this.peerManager = peerManager;
    this.objectManager = objectManager;
    this.selfHostWithPort = selfHostWithPort;
  }

  onMessage(msgStr: string) {
    const message: Message | undefined = this.validateMessage(msgStr);
    if (MessageRecord.guard(message)) {
      this.handleMessage(message);
    }
  }

  validateMessage(msgStr: string) {
    let deserialized: unknown;
    try {
      deserialized = JSON.parse(msgStr);
    } catch (e) {
      this.connIO.disconnectWithError(`Unable to parse message JSON: ${e}`);
      return undefined;
    }

    let message: Message;
    try {
      message = MessageRecord.check(deserialized);
    } catch (e) {
      this.connIO.disconnectWithError(`Invalid message format: ${e}`);
      return undefined;
    }

    if (!this.finishedHandshake && message.type !== "hello") {
      this.connIO.disconnectWithError(
        "Other message sent before hello message"
      );
      return undefined;
    }

    return message;
  }

  handleMessage(msg: Message) {
    if (msg.type == "hello") {
      this.onHelloMessage(msg);
    } else if (msg.type == "getpeers") {
      this.onGetPeersMessage(msg);
    } else if (msg.type == "peers") {
      this.onPeersMessage(msg);
    } else if (msg.type == "object") {
      this.onObjectMessage(msg);
    } else if (msg.type == "ihaveobject") {
      this.onIHaveObjectMessage(msg);
    } else if (msg.type == "getobject") {
      this.onGetObjectMessage(msg);
    } else if (msg.type == "getchaintip") {
      this.onGetChainTipMessage();
    } else if (msg.type == "chaintip") {
      this.onChainTipMessage(msg);
    } else if (msg.type == "getmempool"){
      this.onGetMempoolMessage(msg);
    } else if (msg.type == "mempool"){
      this.onMempoolMessage(msg);
    } else {
      this.echo(msg);
    }
  }

  onHelloMessage(msg: HelloMsg) {
    if (!semver.satisfies(msg.version, ACCEPTABLE_VERSIONS)) {
      this.connIO.disconnectWithError("version not acceptable");
      return;
    }
    this.finishedHandshake = true;
    logger.debug("Completed handshake");
  }

  async onGetPeersMessage(msg: GetPeersMsg) {
    this.connIO.writeToSocket({
      type: "peers",
      peers: Array.from(this.peerManager.knownPeers),
    });
  }

  async onPeersMessage(msg: PeersMsg) {
    msg.peers.forEach((peer: string) => this.peerManager.peerDiscovered(peer));
  }

  async onGetObjectMessage(msg: GetObjectMsg) {
    try{
      if (await this.objectManager.objectIO.objectExists(msg.objectid)) {
        this.connIO.writeToSocket({
          type: "object",
          object: await this.objectManager.objectIO.getObject(msg.objectid),
        });
      }
    } catch (err){
      logger.debug("getting object failed...");
    }
  }

  async onIHaveObjectMessage(msg: IHaveObjectMsg) {
    if (!(await this.objectManager.objectIO.objectExists(msg.objectid))) {
      this.connIO.writeToSocket({
        type: "getobject",
        objectid: msg.objectid,
      } as GetObjectMsg);
    }
  }

  async onObjectMessage(msg: ObjectMsg) {
    const tryStoreObjectResult = await this.objectManager.tryStoreObject(msg.object);
    if (tryStoreObjectResult === ObjectValidationResult.NewAndValid) {
        this.peerManager.broadcastMessage({
          type: "ihaveobject",
          objectid: getObjectID(msg.object),
        });
    } else if (tryStoreObjectResult === ObjectValidationResult.Rejected) {
      this.connIO.disconnectWithError("Invalid object");
    }
  }

  onGetChainTipMessage() {
    if (this.objectManager.longestChainTipID !== null) {
      this.connIO.writeToSocket({ type: "chaintip", blockid: this.objectManager.longestChainTipID });
    }
    return this.objectManager.longestChainTipID;
  }

  async onChainTipMessage(msg: ChainTipMessage) {
    if (!await this.objectManager.objectIO.objectExists(msg.blockid)) {
      try {
        await this.objectManager.objectIO.fetchObject(msg.blockid);
      } catch {
        logger.warn(`Could not fetch chain tip with block id ${msg.blockid}`);
      }
    }
  }

  onMempoolMessage(){
    return;
  }

  onGetMempoolMessage(){
    return;
  }

  echo(msg: Message) {
    logger.debug(`Received ${msg.type} message but not doing anything.`);
  }
}
