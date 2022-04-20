import * as net from "net";
import level from "level-ts";
import { ConnectedSocketIO } from "./socketio";
import { PeerHandler } from "./peerhandler";
import { BOOTSTRAP_PEERS } from "./config";
import { PeerManager } from "./peermanager";
import { logger } from "./logger";
import { ObjectManager } from "./objectmanager";

const args = process.argv.slice(2);
const peersDBPath = args[0];
const objectDBPath = args[1];
const utxoDBPath = args[2]
const serverHostname = args[3];
const serverPort = args[4];

const handleConnection = async (
  socket: net.Socket,
  peerManager: PeerManager,
  objectManager: ObjectManager
) => {
  const peerID = Math.floor(Math.random() * 1e9).toString();

  const connIO = new ConnectedSocketIO(socket);
  const peerHandler = new PeerHandler(
    connIO,
    peerManager,
    objectManager,
    serverHostname + ":" + serverPort
  );
  connIO.onConnect();
  peerManager.peerConnected(peerID, connIO);
  socket.on("data", (data: string) => connIO.onData(data, peerHandler));
  socket.on("close", () => peerManager.peerDisconnected(peerID));
};

const runNode = async () => {
  const peersDB = new level(peersDBPath);
  const objectDB = new level(objectDBPath);
  const utxoDB = new level(utxoDBPath); 
  const peerManager = new PeerManager(peersDB);
  await peerManager.load();
  const objectManager = new ObjectManager(objectDB, utxoDB, peerManager);

  // Run Server
  logger.debug("Server starting");
  const server = net.createServer((socket: net.Socket) => {
    socket.on("error", (err) => logger.warn(`${err}`));
    handleConnection(socket, peerManager, objectManager);
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
    client.on("connect", () => handleConnection(client, peerManager, objectManager));
    client.on("error", (err) => logger.warn(`${err}`));
  }
};

runNode();
