import level from 'level-ts';
import * as semver from 'semver';
import { ACCEPTABLE_VERSIONS } from './config';
import {
  HelloMsg,
  ErrorMsg,
  GetPeersMsg,
  Message,
  MessageRecord,
  PeersMsg,
} from "./messages";
import { ConnectedSocketIO } from "./socketio";

export class PeerHandler {
    connIO: ConnectedSocketIO;
    finishedHandshake: boolean;
    peersDB: level;
    selfHostWithPort: string;

    constructor(connIO: ConnectedSocketIO, peersDB: level, selfHostWithPort: string) {
        this.connIO = connIO;
        this.finishedHandshake = false;
        this.peersDB = peersDB;
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
            this.connIO.disconnectWithError(`Invalid message format: ${e}`)
            return undefined;
        }
        
        if (!this.finishedHandshake && message.type !== "hello") {
            this.connIO.disconnectWithError("Other message sent before hello message");
            return undefined;
        }

        return message;
    }

    handleMessage(msg: Message) {
      console.log(`Received message: ${JSON.stringify(msg)}`);
      if (msg.type == "hello") {
        this.onHelloMessage(msg);
      } else if (msg.type == "getpeers") {
        this.onGetPeersMessage(msg);
      } else if (msg.type == "peers") {
        this.onPeersMessage(msg);
      } else {
        this.echo(msg);
      }
    }

    onHelloMessage(msg: HelloMsg) {
      if(!semver.satisfies(msg.version, ACCEPTABLE_VERSIONS)){
        this.connIO.disconnectWithError("version not acceptable");
        return;
      }
      this.finishedHandshake = true;
      console.log("Completed handshake");
      this.connIO.writeToSocket({type: "getpeers"} as GetPeersMsg);
    }

    async onGetPeersMessage(msg: GetPeersMsg) {
        let knownPeers: string[] = await this.peersDB.all();
        if (!knownPeers.includes(this.selfHostWithPort)) {
            knownPeers.push(this.selfHostWithPort);
        }
        this.connIO.writeToSocket({ type: "peers", peers: knownPeers });
    }

    async onPeersMessage (msg: PeersMsg) {
        await Promise.all(msg.peers.map(async (peer: string) => {
            if (peer.length > 0) {
                await this.peersDB.put(peer, peer);
            }
        }));
    }
    
    echo(msg: Message) {
        console.log(`Received ${msg.type} message but not doing anything.`);
    }
}