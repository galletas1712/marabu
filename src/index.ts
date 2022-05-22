import * as net from "net";
import level from "level-ts";
import { ConnectedSocketIO } from "./socketio";
import { PeerHandler } from "./peerhandler";
import { PeerManager } from "./peermanager";
import { logger } from "./logger";
import { ObjectManager } from "./objects/objectManager";
import { ObjectIO } from "./objects/objectio";
import { UTXOIO } from "./objects/utxoio";
import { BLOCK_HEIGHT_DB_PATH, OBJECT_DB_PATH, PEERS_DB_PATH, UTXO_DB_PATH, MEMPOOL_DB_PATH } from "./config";
import { ChainManager } from "./objects/chainManager";

const args = process.argv.slice(2);
const serverHostname = args[0];
const serverPort = args[1];

const peersDBPath = PEERS_DB_PATH;
const objectDBPath = OBJECT_DB_PATH;
const utxoDBPath = UTXO_DB_PATH;
const blockHeightDBPath = BLOCK_HEIGHT_DB_PATH;
const mempoolDBPath = MEMPOOL_DB_PATH;

const handleConnection = async (
  socket: net.Socket,
  peerManager: PeerManager,
  objectManager: ObjectManager,
  chainManager: ChainManager,
) => {
  const peerID = Math.floor(Math.random() * 1e9).toString();

  const connIO = new ConnectedSocketIO(socket);
  const peerHandler = new PeerHandler(
    connIO,
    peerManager,
    objectManager,
    chainManager,
    serverHostname + ":" + serverPort
  );
  connIO.onConnect();
  peerManager.peerConnected(peerID, connIO);
  socket.on("data", (data: string) => connIO.onData(data, peerHandler.onMessage.bind(peerHandler)));
  socket.on("close", () => peerManager.peerDisconnected(peerID));
};

const runNode = async () => {
  
  const peersDB = new level(peersDBPath);
  const objectDB = new level(objectDBPath);
  const utxoDB = new level(utxoDBPath);
  const blockHeightDB = new level(blockHeightDBPath);
  const mempoolDB = new level(mempoolDBPath)
  const peerManager = new PeerManager(peersDB);
  await peerManager.load();
  const objectIO = new ObjectIO(objectDB, peerManager);
  const utxoIO = new UTXOIO(utxoDB);
  const chainManager = new ChainManager(objectIO, utxoIO, blockHeightDB, mempoolDB);
  await chainManager.initLongestChain();
  await chainManager.resetMempool();
  const objectManager = new ObjectManager(objectIO, chainManager);
  await objectManager.initWithGenesisBlock();

  // Run Server
  logger.debug("Server starting");
  const server = net.createServer((socket: net.Socket) => {
    socket.on("error", (err) => logger.warn(`${err}`));
    handleConnection(socket, peerManager, objectManager, chainManager);
  });
  server.listen(serverPort);

  // Run client
  for (const peer of await peerManager.knownPeers) {
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
      continue;
    }

    logger.debug("Connecting to", peer);

    const client = new net.Socket();
    client.connect(port, host);
    client.on("connect", () => handleConnection(client, peerManager, objectManager, chainManager));
    client.on("error", (err) => logger.warn(`${err}`));
  }
};

runNode();
