import { Block } from "./types/transactions";

export const PEERS_DB_PATH = "./peers.list";
export const OBJECT_DB_PATH = "./objects.list";
export const UTXO_DB_PATH = "./utxo.list";
export const BLOCK_HEIGHT_DB_PATH = "./Dblock_height_db.list";
export const MEMPOOL_DB_PATH = "./mempooldb.list"
export const CURRENT_VERSION = "0.8.0";
export const AGENT = "<Kachachan + Schwinn> Marabu Client 0.8";
export const ACCEPTABLE_VERSIONS = "0.8.x";
export const BOOTSTRAP_PEERS = [
  "149.28.220.241:18018",
  "149.28.204.235:18018",
  "139.162.130.195:18018",
];
export const TIMEOUT = 1000;
export const TARGET =
  "00000002af000000000000000000000000000000000000000000000000000000";
export const BLOCK_REWARD = 50e12;
export const GENESIS_BLOCKID =
  "00000000a420b7cefa2b7730243316921ed59ffe836e111ca3801f82a4f5360e";
export const GENESIS: Block = {
  T: TARGET,
  created: 1624219079,
  miner: "dionyziz",
  nonce: "0000000000000000000000000000000000000000000000000000002634878840",
  note: "The Economist 2021-06-20: Crypto-miners are probably to blame for the graphics-chip shortage",
  previd: null,
  txids: [],
  type: "block",
};
