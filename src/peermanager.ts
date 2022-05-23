import { logger } from "./logger";
import isValidHostname from "is-valid-hostname";
import level from "level-ts";
import { BOOTSTRAP_PEERS } from "./config";
import { Message } from "./types/messages";
import { ConnectedSocketIO } from "./socketio";
import isReachable from "is-reachable";

export class PeerManager {
  knownPeers: Set<string> = new Set();
  connectedPeers: Map<string, ConnectedSocketIO> = new Map();
  db: level;

  constructor(db: level) {
    this.db = db;
  }

  async load() {
    try {
      this.knownPeers = new Set(await this.db.get("peers"));
      logger.debug(`Loaded known peers: ${[...this.knownPeers]}`);
    } catch {
      logger.info(`Initializing peers database`);
      this.knownPeers = new Set(BOOTSTRAP_PEERS);
      await this.store();
    }
  }

  async store() {
    await this.db.put("peers", [...this.knownPeers]);
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
      await this.store();
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
}
