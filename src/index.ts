import level from "level-ts";
import { PeerManager } from "./peermanager";
import { BLOCK_HEIGHT_DB_PATH, OBJECT_DB_PATH, PEERS_DB_PATH, UTXO_DB_PATH, MEMPOOL_DB_PATH } from "./config";

const args = process.argv.slice(2);
const myHostname = args[0];
const myPort = args[1];

const peersDBPath = PEERS_DB_PATH;
const objectDBPath = OBJECT_DB_PATH;
const utxoDBPath = UTXO_DB_PATH;
const blockHeightDBPath = BLOCK_HEIGHT_DB_PATH;
const mempoolDBPath = MEMPOOL_DB_PATH;

const runNode = async () => {
  const peersDB = new level(peersDBPath);
  const objectDB = new level(objectDBPath);
  const utxoDB = new level(utxoDBPath);
  const blockHeightDB = new level(blockHeightDBPath);
  const mempoolDB = new level(mempoolDBPath)
  const peerManager = new PeerManager(myHostname, myPort, peersDB, objectDB, utxoDB, blockHeightDB, mempoolDB);
  await peerManager.load();
};

runNode();
