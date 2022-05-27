import level from "level-ts";
import { PeerManager } from "./peermanager";
import { BLOCK_HEIGHT_DB_PATH, OBJECT_DB_PATH, PEERS_DB_PATH, UTXO_DB_PATH, MEMPOOL_DB_PATH, BASE_DB_PATH } from "./config";
import fs from "fs";

const args = process.argv.slice(2);
const myHostname = args[0];
const myPort = args[1];

if (fs.existsSync(BASE_DB_PATH)) {
  fs.rmSync(BASE_DB_PATH, { recursive: true, force: true });
}
fs.mkdirSync(BASE_DB_PATH);

const runNode = async () => {
  const peersDB = new level(PEERS_DB_PATH);
  const objectDB = new level(OBJECT_DB_PATH);
  const utxoDB = new level(UTXO_DB_PATH);
  const blockHeightDB = new level(BLOCK_HEIGHT_DB_PATH);
  const mempoolDB = new level(MEMPOOL_DB_PATH);
  const peerManager = new PeerManager(myHostname, myPort, peersDB, objectDB, utxoDB, blockHeightDB, mempoolDB);
  await peerManager.load();
};

runNode();
