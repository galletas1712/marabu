import * as net from "net";
import { logger } from "./logger";
import isValidHostname from "is-valid-hostname";
import level from "level-ts";
import { BOOTSTRAP_PEERS, MAX_CONNECTED_PEERS } from "./config";
import { Message } from "./types/messages";
import { ConnectedSocketIO } from "./socketio";
import isReachable from "is-reachable";
import { ObjectManager } from "./objects/objectManager";
import { ChainManager } from "./objects/chainmanager";
import { PeerHandler } from "./peerhandler";
import { ObjectIO } from "./objects/objectio";
import { UTXOIO } from "./objects/utxoio";

export class PeerManager {
  myHostname: string;
  myPort: string;
  peersDB: level;
  objectManager: ObjectManager;
  chainManager: ChainManager;

  knownPeers: Set<string> = new Set();
  connectedPeers: Map<string, ConnectedSocketIO> = new Map();

  constructor(
    myHostname: string,
    myPort: string,
    peersDB: level,
    objectDB: level,
    utxoDB: level,
    blockHeightDB: level,
    mempoolDB: level
  ) {
    this.myHostname = myHostname;
    this.myPort = myPort;
    this.peersDB = peersDB;

    const objectIO = new ObjectIO(objectDB, this);
    const utxoIO = new UTXOIO(utxoDB);

    this.chainManager = new ChainManager(
      objectIO,
      utxoIO,
      blockHeightDB,
      mempoolDB
    );
    this.objectManager = new ObjectManager(objectIO, this.chainManager);
  }

  async load() {
    await this.loadPeers();
    await this.chainManager.initLongestChain();
    await this.chainManager.resetMempool();
    await this.objectManager.initWithGenesisBlock();

    // Start server
    logger.debug("Server starting");
    const server = net.createServer((socket: net.Socket) => {
      socket.on("error", (err) => logger.warn(`${err}`));
      this.handleConnection(socket);
    });
    server.listen(this.myPort);

    // Start clients
    for (const peer of this.knownPeers) {
      this.createClientConnection(peer);
    }
  }

  async loadPeers() {
    try {
      this.knownPeers = new Set(await this.peersDB.get("peers"));
      logger.debug(`Loaded known peers: ${[...this.knownPeers]}`);
    } catch {
      logger.info(`Initializing peers database`);
      this.knownPeers = new Set(BOOTSTRAP_PEERS);
      await this.storePeers();
    }
  }

  async storePeers() {
    await this.peersDB.put("peers", [...this.knownPeers]);
  }

  async peerDiscovered(peer: string) {
    const peerParts = peer.split(":");
    if (peerParts.length != 2) {
      logger.warn(
        `Remote party reported knowledge of invalid peer ${peer}, which is not in the host:port format; skipping`
      );
      return;
    }
    const [host, portStr] = peerParts;
    const port = +portStr;

    if (!(port >= 0 && port <= 65535)) {
      logger.warn(
        `Remote party reported knowledge of peer ${peer} with invalid port number ${port}`
      );
      return;
    }
    if (!isValidHostname(host)) {
      logger.warn(
        `Remote party reported knowledge of invalid peer ${peer}; skipping`
      );
      return;
    }

    if (await isReachable(peer)) {
      logger.info(`Peer ${peer} is reachable, adding to peers list...`);
      this.knownPeers.add(peer);
      await this.storePeers();

      if (this.connectedPeers.size < MAX_CONNECTED_PEERS && !this.connectedPeers.has(peer)) {
        this.createClientConnection(peer);
      }
    }
  }

  peerConnected(peer: string, socketIOObj: ConnectedSocketIO) {
    logger.debug(`Peer ${peer} connected`);
    this.connectedPeers.set(peer, socketIOObj);
  }

  peerDisconnected(peer: string) {
    logger.debug(`Peer ${peer} disconnected`);
    this.connectedPeers.delete(peer);
  }

  broadcastMessage(msg: Message) {
    for (const peerSocket of this.connectedPeers.values()) {
      peerSocket.writeToSocket(msg);
    }
  }

  handleConnection(socket: net.Socket) {
    const peerID = Math.floor(Math.random() * 1e9).toString();

    const connIO = new ConnectedSocketIO(socket);
    const peerHandler = new PeerHandler(
      connIO,
      this,
      this.objectManager,
      this.chainManager,
      this.myHostname + ":" + this.myPort
    );
    connIO.onConnect();
    this.peerConnected(peerID, connIO);
    socket.on("data", (data: string) =>
      connIO.onData(data, peerHandler.onMessage.bind(peerHandler))
    );
    socket.on("close", () => this.peerDisconnected(peerID));
  }

  createClientConnection(peer: string) {
    let host: string;
    let port: number;

    try {
      const lastColon = peer.lastIndexOf(":");
      host = peer.slice(0, lastColon).trim();
      port = Number.parseInt(peer.slice(lastColon + 1));
      if (isNaN(port) || port < 0 || port >= 65536) {
        throw Error(`invalid port ${peer.slice(lastColon + 1)}`);
      }
    } catch (err) {
      logger.warn(`${err}`);
      return;
    }

    logger.debug(`Connecting to ${peer}`);

    const client = new net.Socket();
    client.connect(port, host);
    client.on("connect", () => this.handleConnection(client));
    client.on("error", (err) => logger.warn(`${err}`));
  }
}
