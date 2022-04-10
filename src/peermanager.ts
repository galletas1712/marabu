import { logger } from "./logger";
import isValidHostname from "is-valid-hostname";
import Level from "level-ts";
import { BOOTSTRAP_PEERS } from "./config";

export class PeerManager {
  knownPeers: Set<string> = new Set();
  db: Level;

  constructor(db: Level) {
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

  peerDiscovered(peer: string) {
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

    this.knownPeers.add(peer);
    this.store(); // intentionally delayed await
  }
}