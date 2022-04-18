import level from "level-ts";
import * as semver from "semver";
import { ACCEPTABLE_VERSIONS } from "./config";
import { logger } from "./logger";
import {
  HelloMsg,
  ErrorMsg,
  GetPeersMsg,
  Message,
  MessageRecord,
  PeersMsg,
  IHaveObjectMsg,
  GetObjectMsg,
  ObjectMsg,
} from "./types/messages";
import { getObjectID, ObjectManager } from "./objectmanager";
import { PeerManager } from "./peermanager";
import { ConnectedSocketIO } from "./socketio";

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
    logger.debug(`Received: ${msgStr}`);
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
    } else if (msg.type == "object"){
      this.onObjectMessage(msg);
    } else if (msg.type == "ihaveobject"){
      this.onIHaveObjectMessage(msg);
    } else if (msg.type == "getobject"){
      this.onGetObjectMessage(msg);
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
      if (await this.objectManager.objectExists(msg.objectid)) {
        this.connIO.writeToSocket({
          type: "object",
          object: await this.objectManager.getObject(msg.objectid),
        });
      }
    } catch (err){
      logger.debug("getting object failed...");
    }
  }

  async onIHaveObjectMessage(msg: IHaveObjectMsg) {
    if (!(await this.objectManager.objectExists(msg.objectid))) {
      this.connIO.writeToSocket({
        type: "getobject",
        objectid: msg.objectid,
      } as GetObjectMsg);
    }
  }

  async onObjectMessage(msg: ObjectMsg) {
    logger.debug("On object message:", msg);
    if (await this.objectManager.validateObject(msg.object)) {
      if (!await this.objectManager.objectExists(getObjectID(msg.object))) {
        this.objectManager.storeObject(msg.object);
        this.peerManager.broadcastMessage({
          type: "ihaveobject",
          objectid: getObjectID(msg.object),
        });
      }
    } else {
      this.connIO.disconnectWithError("Invalid object"); // TODO: do we actually disconnect?
    }
  }

  echo(msg: Message) {
    logger.debug(`Received ${msg.type} message but not doing anything.`);
  }
}
