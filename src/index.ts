import * as net from "net";
import * as fs from "fs";
import {
  HelloMsg,
  ErrorMsg,
  GetPeersMsg,
  Message,
  MessageRecord,
  PeersMsg,
} from "./messages";
import { canonicalize } from "json-canonicalize";

import level from 'level-ts';
import * as semver from 'semver';

const PORT = 18018;
const MYSELF = "45.77.189.193:" + PORT.toString();
const BOOTSTRAP_PEERS = [
    MYSELF
//   "149.28.220.241:18018",
//   "149.28.204.235:18018",
//   "139.162.130.195:18018",
];
const PEERS_DB = "../peers.list";
const CURRENT_VERSION = "0.8.0";
const ACCEPTABLE_VERSIONS = "0.8.x";

class ConnectedSocketIO {
    socket: net.Socket;
    buffer: string;

    constructor(socket: net.Socket) {
        this.socket = socket;
        this.buffer = "";
    }

    onConnect() {
        this.socket.setEncoding("utf8");
        this.writeToSocket({type: "hello", version: CURRENT_VERSION, agent: "Marabu-Core Client 0.8"} as HelloMsg);
    }

    onData(data: string, peerHandler: PeerHandler) {
        console.log("Received raw:", data);
        const tokens: Array<String> = data.split(/(?=[\n])|(?<=[\n])/g);
        for (const token of tokens) {
            this.buffer += token;

            if (token === "\n") {
                peerHandler.onMessage(this.buffer);
                this.buffer = "";
            }
        }
    }

    writeToSocket(msg: Message) {
        console.log("Writing:", msg);
        this.socket.write(canonicalize(msg) + "\n");
    }

    disconnectWithError(err: string) {
        console.log("Disconnecting from:", this.socket.address); // TODO: why is this an anonymous function?
        this.writeToSocket({ type: "error", error: err } as ErrorMsg);
        this.socket.destroy();
    }
}

class PeerHandler {
    connIO: ConnectedSocketIO;
    finishedHandshake: boolean;
    peersDB: level;

    constructor(connIO: ConnectedSocketIO, peersDB: level) {
        this.connIO = connIO;
        this.finishedHandshake = false;
        this.peersDB = peersDB;
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
        let knownPeers: string[] = [MYSELF];
        const iterator = this.peersDB.iterate({ });
        for await (const {key,} of iterator) {
            console.log("pushing...", key);
            knownPeers.push(key);
        }
        await iterator.end();
        this.connIO.writeToSocket({ type: "peers", peers: knownPeers });
    }

    async onPeersMessage (msg: PeersMsg) {
        await Promise.all(msg.peers.map(async (peer: string) => {
            if (!(await this.peersDB.exists(peer))) {
                await this.peersDB.put(peer, false);  // Peer is not connected because it's not known
            }
        }));
    }
    
    echo(msg: Message) {
        console.log(`Received ${msg.type} message but not doing anything.`);
    }
}

const handleConnectedSocket = (socket: net.Socket, peersDB: level) => {
    const connIO = new ConnectedSocketIO(socket);
    const peerHandler = new PeerHandler(connIO, peersDB);
    connIO.onConnect();
    socket.on("data", (data: string) => connIO.onData(data, peerHandler));
}

const runNode = () => {
    const peersDB = new level(PEERS_DB);

    // Run Server
    console.log("Server starting");
    const server = net.createServer();
    server.listen(PORT);
    server.on("connection", (socket: net.Socket) => handleConnectedSocket(socket, peersDB));

    // Run client
    // TODO: read from database and connect to peers
    for (const peer of BOOTSTRAP_PEERS) {
        console.log("Connecting to", peer);

        const lastColon = peer.lastIndexOf(":");
        const host = peer.slice(0, lastColon);
        const port = Number(peer.slice(lastColon + 1));

        const client = new net.Socket();
        client.connect(port, host);
        client.on("connect", () => handleConnectedSocket(client, peersDB));
        client.on("error", (err) => {
            console.log(`${err}`);
        })
    }
}

runNode();